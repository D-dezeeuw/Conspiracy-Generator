import { test } from "node:test";
import assert from "node:assert/strict";
import { SUBJECTS, CATEGORIES } from "../data.js";

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

test("categories: every entry is fully formed", () => {
  for (const c of CATEGORIES) {
    assert.ok(c.id);
    assert.ok(c.name);
    assert.ok(c.description);
    assert.ok(c.fallacy_illustrated);
    assert.ok(Array.isArray(c.tags) && c.tags.length);
    assert.ok(Array.isArray(c.correlation_patterns) && c.correlation_patterns.length);
  }
});

test("categories: unique ids", () => {
  assert.equal(new Set(CATEGORIES.map((c) => c.id)).size, CATEGORIES.length);
});
