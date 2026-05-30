import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildCorrelations,
  buildWorkFile,
  buildMatchPrompt,
  buildNarrativePrompt,
  buildDeconstructionPrompt,
  matchCategory,
  generateNarrative,
  deconstruct,
  getCategory,
  verifyPullQuotes,
} from "../engine.js";
import { CATEGORIES } from "../data.js";

const provider = { baseUrl: "x", model: "m", apiKey: "k" };
const subject = { id: "tesla", name: "Nikola Tesla", wikipedia: "Nikola_Tesla", died: "1943" };
const dataSheet = {
  name: "Nikola Tesla",
  extract: "Nikola Tesla clashed with Thomas Edison in New York.",
  url: "https://en.wikipedia.org/wiki/Nikola_Tesla",
  associations: ["Thomas Edison", "New York"],
};
const workFile = { subject, dataSheet, correlations: buildCorrelations(dataSheet) };

test("buildCorrelations makes one sourced correlation per association", () => {
  const cors = buildCorrelations(dataSheet);
  assert.equal(cors.length, 2);
  assert.deepEqual(cors[0], {
    fact: "Nikola Tesla is documented in connection with Thomas Edison.",
    source: "Wikipedia",
    url: dataSheet.url,
  });
});

test("buildCorrelations merges related pages and news, each with its own source/url", () => {
  const related = [{ title: "War of the currents", summary: "", url: "https://en.wikipedia.org/wiki/War_of_the_currents", source: "Wikipedia (related)" }];
  const news = [{ title: "Tesla coil demonstrated", summary: "", url: "https://en.wikinews.org/wiki/Tesla_coil_demonstrated", source: "Wikinews" }];
  const cors = buildCorrelations(dataSheet, related, news);
  assert.equal(cors.length, 4);
  const sources = new Set(cors.map((c) => c.source));
  assert.ok(sources.has("Wikipedia") && sources.has("Wikipedia (related)") && sources.has("Wikinews"));
  const newsCor = cors.find((c) => c.source === "Wikinews");
  assert.match(newsCor.fact, /news coverage titled/);
  assert.equal(newsCor.url, "https://en.wikinews.org/wiki/Tesla_coil_demonstrated");
});

test("buildCorrelations dedupes identical facts", () => {
  const dup = [{ title: "Thomas Edison", summary: "", url: "u", source: "Wikipedia (related)" }];
  // A related item titled the same as an association produces a different
  // sentence ("linked to" vs "documented in connection with"), so both stay;
  // but a true duplicate fact (same related item twice) collapses to one.
  const cors = buildCorrelations(dataSheet, [...dup, ...dup], []);
  const linked = cors.filter((c) => c.fact.includes("encyclopedically linked to Thomas Edison"));
  assert.equal(linked.length, 1);
});

test("buildWorkFile assembles from a fetched data sheet", async () => {
  const fakeFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      extract: "Nikola Tesla clashed with Thomas Edison.",
      content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Nikola_Tesla" } },
    }),
  });
  const wf = await buildWorkFile(subject, fakeFetch);
  assert.equal(wf.subject, subject);
  assert.ok(wf.correlations.length > 0);
  assert.ok(wf.correlations.every((c) => c.url.includes("wikipedia.org")));
});

test("match prompt lists every category id", () => {
  const { user } = buildMatchPrompt(workFile, CATEGORIES);
  for (const c of CATEGORIES) assert.ok(user.includes(c.id));
});

test("narrative prompt forbids inventing facts and tags claims", () => {
  const { system } = buildNarrativePrompt(workFile, CATEGORIES[0]);
  assert.match(system, /Do NOT invent/);
  assert.match(system, /basedOn/);
});

test("deconstruction prompt asks for moves + fallacies", () => {
  const { system } = buildDeconstructionPrompt(
    { headline: "H", subhead: "S", body: "B", claims: [] },
    workFile,
  );
  assert.match(system, /fallacy/i);
  assert.match(system, /moves/);
});

test("matchCategory returns the model's valid category", async () => {
  const fake = async () => '{"categoryId":"hidden_network","reasoning":"ties"}';
  const m = await matchCategory(provider, workFile, CATEGORIES, fake);
  assert.equal(m.categoryId, "hidden_network");
  assert.ok(getCategory(CATEGORIES, m.categoryId));
});

test("matchCategory falls back on an unknown id", async () => {
  const fake = async () => '{"categoryId":"does_not_exist"}';
  const m = await matchCategory(provider, workFile, CATEGORIES, fake);
  assert.equal(m.categoryId, CATEGORIES[0].id);
});

test("matchCategory falls back on garbage output", async () => {
  const fake = async () => "the answer is probably the network one";
  const m = await matchCategory(provider, workFile, CATEGORIES, fake);
  assert.equal(m.categoryId, CATEGORIES[0].id);
});

test("generateNarrative normalizes and keeps only well-formed claims", async () => {
  const fake = async () =>
    JSON.stringify({
      headline: "The Pattern",
      subhead: "sub",
      body: "long body",
      claims: [{ text: "claim a", basedOn: "F1" }, { text: "missing basedOn" }, "garbage"],
    });
  const n = await generateNarrative(provider, workFile, CATEGORIES[0], "English", fake);
  assert.equal(n.headline, "The Pattern");
  assert.deepEqual(n.claims, [{ text: "claim a", basedOn: "F1" }]);
  // New fields default cleanly when the model omits them.
  assert.deepEqual(n.pullQuotes, []);
  assert.equal(n.closer, "");
});

test("verifyPullQuotes keeps only quotes verbatim in the extract", () => {
  const extract = 'Nikola Tesla clashed with Thomas Edison in New York.';
  const kept = verifyPullQuotes([
    { quote: "clashed with Thomas Edison", attributedTo: "Wikipedia", spin: "a war, not a rivalry" },
    { quote: "secretly plotted to destroy", attributedTo: "Anon", spin: "fabricated" },
    { quote: "in New York", spin: "the scene of it all" },
  ], extract);
  assert.equal(kept.length, 2);
  assert.equal(kept[0].quote, "clashed with Thomas Edison");
  assert.equal(kept[1].attributedTo, ""); // missing attribution coerced to ""
  assert.ok(!kept.some((q) => q.quote.includes("secretly plotted")), "fabricated quote dropped");
});

test("verifyPullQuotes tolerates curly quotes and whitespace but blocks fabrication", () => {
  const extract = "He said the work was unfinished.";
  const kept = verifyPullQuotes([
    { quote: "“the   work was unfinished”", attributedTo: "x", spin: "ominous" },
    { quote: "the work was buried", attributedTo: "x", spin: "made up" },
  ], extract);
  assert.equal(kept.length, 1);
  assert.match(kept[0].quote, /the work was unfinished/);
});

test("verifyPullQuotes returns [] for non-arrays and too-short quotes", () => {
  assert.deepEqual(verifyPullQuotes(undefined, "anything"), []);
  assert.deepEqual(verifyPullQuotes([{ quote: "a", spin: "s" }], "a b c"), []);
});

test("generateNarrative filters fabricated pull quotes and keeps the closer", async () => {
  const fake = async () =>
    JSON.stringify({
      body: "b",
      pullQuotes: [
        { quote: "clashed with Thomas Edison", attributedTo: "WP", spin: "war" },
        { quote: "ordered the assassination", attributedTo: "WP", spin: "invented" },
      ],
      closer: "And the pattern never truly ended.",
    });
  const n = await generateNarrative(provider, workFile, CATEGORIES[0], "English", fake);
  assert.equal(n.pullQuotes.length, 1, "only the verbatim quote survives");
  assert.equal(n.pullQuotes[0].quote, "clashed with Thomas Edison");
  assert.match(n.closer, /never truly ended/);
});

test("narrative prompt forbids fabricating quotes and demands a closer", () => {
  const { system } = buildNarrativePrompt(workFile, CATEGORIES[0]);
  assert.match(system, /VERBATIM/);
  assert.match(system, /never fabricating/i);
  assert.match(system, /closer/i);
});

test("deconstruction prompt is told about reframed quotes and the closer", () => {
  const narrative = {
    headline: "H", subhead: "S", body: "B", claims: [],
    pullQuotes: [{ quote: "clashed with Thomas Edison", attributedTo: "WP", spin: "war" }],
    closer: "It never ended.",
  };
  const { system, user } = buildDeconstructionPrompt(narrative, workFile);
  assert.match(system, /out of context|continuation/i);
  assert.match(user, /clashed with Thomas Edison/);
  assert.match(user, /never ended/);
});

test("generateNarrative throws when no usable body comes back", async () => {
  const fake = async () => "no json at all";
  await assert.rejects(() => generateNarrative(provider, workFile, CATEGORIES[0], "English", fake), /usable article/);
});

test("narrative prompt instructs the chosen language", () => {
  const { system } = buildNarrativePrompt(workFile, CATEGORIES[0], "Dutch (Nederlands)");
  assert.match(system, /Dutch \(Nederlands\)/);
});

test("generateNarrative passes the language into the prompt", async () => {
  let captured;
  const fake = async (_p, system) => { captured = system; return '{"body":"x"}'; };
  await generateNarrative(provider, workFile, CATEGORIES[0], "Spanish (Español)", fake);
  assert.match(captured, /Spanish \(Español\)/);
});

test("deconstruct normalizes a valid deconstruction", async () => {
  const fake = async () => '{"summary":"s","moves":[{"move":"m1","fallacy":"post hoc"},{"bad":true}]}';
  const d = await deconstruct(provider, { headline: "H", subhead: "S", body: "B", claims: [] }, workFile, "English", fake);
  assert.equal(d.summary, "s");
  assert.deepEqual(d.moves, [{ move: "m1", fallacy: "post hoc" }]);
});

test("deconstruction prompt instructs the chosen language", () => {
  const { system } = buildDeconstructionPrompt({ headline: "H", subhead: "S", body: "B", claims: [] }, workFile, "French (Français)");
  assert.match(system, /French \(Français\)/);
});
