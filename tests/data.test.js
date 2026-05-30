import { test } from "node:test";
import assert from "node:assert/strict";
import { SUBJECTS, CATEGORIES, ANGLES, LANGUAGES } from "../data.js";

test("subjects: curated, non-empty list (the safety gate)", () => {
  assert.ok(SUBJECTS.length >= 10);
});

test("subjects: every entry has required fields", () => {
  for (const s of SUBJECTS) {
    assert.ok(s.id, `id for ${s.name}`);
    assert.ok(s.name, `name for ${s.id}`);
    assert.ok(s.wikipedia, `wikipedia for ${s.id}`);
    assert.ok(s.died, `died for ${s.id}`);
  }
});

test("subjects: unique ids and wikipedia titles", () => {
  assert.equal(new Set(SUBJECTS.map((s) => s.id)).size, SUBJECTS.length);
  assert.equal(new Set(SUBJECTS.map((s) => s.wikipedia)).size, SUBJECTS.length);
});

test("subjects: wikipedia titles have no spaces", () => {
  for (const s of SUBJECTS) assert.ok(!/\s/.test(s.wikipedia), s.wikipedia);
});

test("categories: exactly seven archetypes", () => {
  assert.equal(CATEGORIES.length, 7);
});

test("categories: every entry is fully formed (incl. context)", () => {
  for (const c of CATEGORIES) {
    assert.ok(c.id);
    assert.ok(c.name);
    assert.ok(c.description);
    assert.ok(c.fallacy_illustrated);
    assert.ok(c.context, `context for ${c.id}`);
    assert.ok(Array.isArray(c.tags) && c.tags.length);
    assert.ok(Array.isArray(c.correlation_patterns) && c.correlation_patterns.length);
  }
});

test("categories: unique ids", () => {
  assert.equal(new Set(CATEGORIES.map((c) => c.id)).size, CATEGORIES.length);
});

test("categories: overlap-with-angles patterns were removed", () => {
  const ids = CATEGORIES.map((c) => c.id);
  assert.ok(!ids.includes("suppressed_genius"), "suppressed_genius removed (overlaps Suppressed Technology angle)");
  assert.ok(!ids.includes("faked_or_engineered_death"), "engineered_death removed (overlaps Faked Death angle)");
});

test("angles: at least 20 plus the auto default, each fully formed with context", () => {
  const real = ANGLES.filter((a) => a.id !== "auto");
  assert.ok(real.length >= 20, `expected >= 20 real angles, got ${real.length}`);
  assert.equal(ANGLES[0].id, "auto", "auto is the default first option");
  for (const a of ANGLES) {
    assert.ok(a.id, "angle id");
    assert.ok(a.name, `name for ${a.id}`);
    assert.ok(a.description, `description for ${a.id}`);
    assert.ok(a.context, `context for ${a.id}`);
  }
});

test("angles: unique ids", () => {
  assert.equal(new Set(ANGLES.map((a) => a.id)).size, ANGLES.length);
});

test("languages: present and unique", () => {
  assert.ok(LANGUAGES.length >= 5);
  assert.equal(new Set(LANGUAGES.map((l) => l.id)).size, LANGUAGES.length);
});
