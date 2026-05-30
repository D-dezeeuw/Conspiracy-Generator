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

test("unlock=1 skips fuzzy resolution and passes raw values through as ids", () => {
  // A brand-new id not yet in the codebase still comes through verbatim.
  const out = resolveParams("?unlock=1&target=future_subject&angle=new_angle&pattern=new_pattern&lang=xx", data);
  assert.equal(out.unlocked, true);
  assert.equal(out.subjectId, "future_subject");
  assert.equal(out.angleId, "new_angle");
  assert.equal(out.categoryId, "new_pattern");
  assert.equal(out.langId, "xx");
});

test("unlock=1 takes values verbatim — no fuzzy correction", () => {
  // Locked mode would map "nicola tesla" -> "tesla"; unlocked keeps it raw.
  const locked = resolveParams("?target=nicola+tesla", data);
  assert.equal(locked.subjectId, "tesla");
  const unlocked = resolveParams("?unlock=1&target=nicola+tesla", data);
  assert.equal(unlocked.subjectId, "nicola tesla");
});

test("unlock is only triggered by exactly '1' (obscure by design)", () => {
  assert.ok(!resolveParams("?unlock=true&target=foo", data).unlocked);
  assert.ok(!resolveParams("?unlock=0&target=foo", data).unlocked);
  // Without unlock, an unknown raw target is dropped (gate holds).
  assert.ok(!("subjectId" in resolveParams("?unlock=true&target=future_subject", data)));
});

test("unlock=1 trims raw values but an empty target is still ignored", () => {
  assert.equal(resolveParams("?unlock=1&target=%20%20edison%20%20", data).subjectId, "edison");
  assert.ok(!("subjectId" in resolveParams("?unlock=1&target=", data)));
});
