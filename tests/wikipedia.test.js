import { test } from "node:test";
import assert from "node:assert/strict";
import { extractAssociations, fetchDataSheet } from "../wikipedia.js";

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
