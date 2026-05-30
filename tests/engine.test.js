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
  const n = await generateNarrative(provider, workFile, CATEGORIES[0], fake);
  assert.equal(n.headline, "The Pattern");
  assert.deepEqual(n.claims, [{ text: "claim a", basedOn: "F1" }]);
});

test("generateNarrative throws when no usable body comes back", async () => {
  const fake = async () => "no json at all";
  await assert.rejects(() => generateNarrative(provider, workFile, CATEGORIES[0], fake), /usable article/);
});

test("deconstruct normalizes a valid deconstruction", async () => {
  const fake = async () => '{"summary":"s","moves":[{"move":"m1","fallacy":"post hoc"},{"bad":true}]}';
  const d = await deconstruct(provider, { headline: "H", subhead: "S", body: "B", claims: [] }, workFile, fake);
  assert.equal(d.summary, "s");
  assert.deepEqual(d.moves, [{ move: "m1", fallacy: "post hoc" }]);
});
