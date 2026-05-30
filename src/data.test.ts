import { describe, it, expect } from "vitest";
import subjects from "../data/subjects.json";
import categories from "../data/categories.json";
import type { Category, Subject } from "./types";

const subjectList = subjects as Subject[];
const categoryList = categories as Category[];

describe("subjects dataset (the safety gate)", () => {
  it("has a curated, non-empty list", () => {
    expect(subjectList.length).toBeGreaterThanOrEqual(10);
  });

  it("every subject has the required fields", () => {
    for (const s of subjectList) {
      expect(s.id, `id for ${s.name}`).toBeTruthy();
      expect(s.name, `name for ${s.id}`).toBeTruthy();
      expect(s.wikipedia, `wikipedia for ${s.id}`).toBeTruthy();
      expect(s.died, `died for ${s.id}`).toBeTruthy();
    }
  });

  it("has unique ids and wikipedia titles", () => {
    const ids = new Set(subjectList.map((s) => s.id));
    const wikis = new Set(subjectList.map((s) => s.wikipedia));
    expect(ids.size).toBe(subjectList.length);
    expect(wikis.size).toBe(subjectList.length);
  });

  it("uses underscored wikipedia titles with no spaces", () => {
    for (const s of subjectList) expect(s.wikipedia).not.toMatch(/\s/);
  });
});

describe("categories dataset", () => {
  it("defines exactly the seven archetypes", () => {
    expect(categoryList).toHaveLength(7);
  });

  it("every category is fully formed", () => {
    for (const c of categoryList) {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.description).toBeTruthy();
      expect(c.fallacy_illustrated).toBeTruthy();
      expect(Array.isArray(c.tags) && c.tags.length).toBeTruthy();
      expect(
        Array.isArray(c.correlation_patterns) && c.correlation_patterns.length,
      ).toBeTruthy();
    }
  });

  it("has unique category ids", () => {
    const ids = new Set(categoryList.map((c) => c.id));
    expect(ids.size).toBe(categoryList.length);
  });
});
