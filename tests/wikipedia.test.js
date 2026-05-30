import { test } from "node:test";
import assert from "node:assert/strict";
import { extractAssociations, fetchDataSheet, fetchRelated, fetchWikinews, gatherSources } from "../wikipedia.js";

const subject = { id: "tesla", name: "Nikola Tesla", wikipedia: "Nikola_Tesla", died: "1943" };

test("extractAssociations pulls multi-word proper nouns", () => {
  const out = extractAssociations(
    "Nikola Tesla worked with George Westinghouse and clashed with Thomas Edison in New York.",
    "Nikola Tesla",
  );
  assert.ok(out.includes("George Westinghouse"));
  assert.ok(out.includes("Thomas Edison"));
  assert.ok(out.includes("New York"));
});

test("extractAssociations drops the subject's own name", () => {
  const out = extractAssociations("Marie Curie discovered Radium with Marie Curie.", "Marie Curie");
  assert.ok(!out.includes("Marie Curie"));
  assert.ok(out.includes("Radium"));
});

test("extractAssociations strips a sentence-initial stopword", () => {
  const out = extractAssociations("The Royal Society honored him. After that, fame.", "X");
  assert.ok(out.includes("Royal Society"));
  assert.ok(!out.includes("The Royal Society"));
  assert.ok(!out.includes("After"));
});

test("extractAssociations deduplicates", () => {
  const out = extractAssociations("Paris and Paris and Paris.", "X");
  assert.equal(out.filter((t) => t === "Paris").length, 1);
});

test("extractAssociations returns [] for empty input", () => {
  assert.deepEqual(extractAssociations("", "X"), []);
});

test("fetchDataSheet builds a data sheet from the REST summary", async () => {
  const fakeFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      extract: "Nikola Tesla worked with George Westinghouse.",
      content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Nikola_Tesla" } },
    }),
  });
  const sheet = await fetchDataSheet(subject, fakeFetch);
  assert.equal(sheet.name, "Nikola Tesla");
  assert.match(sheet.extract, /Westinghouse/);
  assert.equal(sheet.url, "https://en.wikipedia.org/wiki/Nikola_Tesla");
  assert.ok(sheet.associations.includes("George Westinghouse"));
});

test("fetchDataSheet falls back to a constructed URL", async () => {
  const fakeFetch = async () => ({ ok: true, status: 200, json: async () => ({ extract: "Some text." }) });
  const sheet = await fetchDataSheet(subject, fakeFetch);
  assert.equal(sheet.url, "https://en.wikipedia.org/wiki/Nikola_Tesla");
});

test("fetchDataSheet throws on a non-OK response", async () => {
  const fakeFetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
  await assert.rejects(() => fetchDataSheet(subject, fakeFetch), /Could not load/);
});

test("fetchRelated maps related pages to sourced items", async () => {
  const fakeFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      pages: [
        { titles: { normalized: "War of the currents" }, extract: "A rivalry…", content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/War_of_the_currents" } } },
        { title: "Alternating current", extract: "AC…" },
      ],
    }),
  });
  const items = await fetchRelated(subject, fakeFetch);
  assert.equal(items.length, 2);
  assert.equal(items[0].title, "War of the currents");
  assert.equal(items[0].source, "Wikipedia (related)");
  assert.match(items[1].url, /Alternating_current/);
});

test("fetchRelated returns [] on failure (never throws)", async () => {
  assert.deepEqual(await fetchRelated(subject, async () => ({ ok: false, status: 404, json: async () => ({}) })), []);
  assert.deepEqual(await fetchRelated(subject, async () => { throw new Error("net"); }), []);
});

test("fetchWikinews strips snippet markup and builds article URLs", async () => {
  const fakeFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ query: { search: [{ title: "Tesla coil demonstrated", snippet: 'A <span class="x">Tesla</span> coil&nbsp;event' }] } }),
  });
  const items = await fetchWikinews(subject, fakeFetch);
  assert.equal(items.length, 1);
  assert.ok(!items[0].summary.includes("<span"), "markup stripped");
  assert.equal(items[0].source, "Wikinews");
  assert.match(items[0].url, /en\.wikinews\.org\/wiki\/Tesla_coil_demonstrated/);
});

test("fetchWikinews returns [] on failure (never throws)", async () => {
  assert.deepEqual(await fetchWikinews(subject, async () => { throw new Error("net"); }), []);
});

test("gatherSources requires the data sheet but tolerates missing wideners", async () => {
  // Data sheet OK; related + news endpoints both fail → still resolves.
  const fakeFetch = async (url) => {
    if (url.includes("/summary/")) {
      return { ok: true, status: 200, json: async () => ({ extract: "Tesla and Edison.", content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Nikola_Tesla" } } }) };
    }
    return { ok: false, status: 500, json: async () => ({}) };
  };
  const { dataSheet, related, news } = await gatherSources(subject, fakeFetch);
  assert.match(dataSheet.extract, /Edison/);
  assert.deepEqual(related, []);
  assert.deepEqual(news, []);
});

test("gatherSources rejects when the data sheet fails", async () => {
  const fakeFetch = async (url) => url.includes("/summary/")
    ? { ok: false, status: 404, json: async () => ({}) }
    : { ok: true, status: 200, json: async () => ({}) };
  await assert.rejects(() => gatherSources(subject, fakeFetch), /Could not load/);
});
