import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveByNameOrId, resolveParams } from "../params.js";
import { SUBJECTS, ANGLES, CATEGORIES, LANGUAGES } from "../data.js";

const data = { SUBJECTS, ANGLES, CATEGORIES, LANGUAGES };

test("resolveByNameOrId matches an exact id", () => {
  assert.equal(resolveByNameOrId("tesla", SUBJECTS, (s) => s.name), "tesla");
});

test("resolveByNameOrId matches an exact name", () => {
  assert.equal(resolveByNameOrId("Nikola Tesla", SUBJECTS, (s) => s.name), "tesla");
});

test("resolveByNameOrId tolerates a misspelled first name via token overlap", () => {
  assert.equal(resolveByNameOrId("nicola tesla", SUBJECTS, (s) => s.name), "tesla");
});

test("resolveByNameOrId resolves punctuation-style angle ids", () => {
  assert.equal(resolveByNameOrId("religious/occult", ANGLES, (a) => a.name), "religious_occult");
});

test("resolveByNameOrId resolves a pattern by its display name", () => {
  assert.equal(resolveByNameOrId("the stolen legacy", CATEGORIES, (c) => c.name), "stolen_legacy");
});

test("resolveByNameOrId returns null for gibberish (no false positive)", () => {
  assert.equal(resolveByNameOrId("zzzqqq nonsense", SUBJECTS, (s) => s.name), null);
  assert.equal(resolveByNameOrId("", SUBJECTS, (s) => s.name), null);
});

test("resolveParams parses the example query into ids", () => {
  const out = resolveParams("?target=nicola+tesla&angle=religious/occult&pattern=the+stolen+legacy", data);
  assert.equal(out.subjectId, "tesla");
  assert.equal(out.angleId, "religious_occult");
  assert.equal(out.categoryId, "stolen_legacy");
});

test("resolveParams handles leading '?' or none, and url-encoding", () => {
  const a = resolveParams("target=Marie%20Curie&lang=Dutch", data);
  assert.equal(a.subjectId, "curie");
  assert.equal(a.langId, "nl");
  const b = resolveParams("?category=hidden+network", data);
  assert.equal(b.categoryId, "hidden_network");
});

test("resolveParams IGNORES an unresolved target (safety gate preserved)", () => {
  const out = resolveParams("?target=some+living+person+9000&angle=politics", data);
  assert.ok(!("subjectId" in out), "no subjectId for an unmatched target");
  assert.equal(out.angleId, "politics");
});

test("resolveParams returns an empty object when nothing is provided", () => {
  assert.deepEqual(resolveParams("", data), {});
  assert.deepEqual(resolveParams("?foo=bar", data), {});
});
