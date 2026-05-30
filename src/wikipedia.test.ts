import { describe, it, expect, vi } from "vitest";
import { extractAssociations, fetchDataSheet } from "./wikipedia";
import type { Subject } from "./types";

describe("extractAssociations", () => {
  it("pulls multi-word proper nouns from an extract", () => {
    const text =
      "Nikola Tesla worked with George Westinghouse and clashed with Thomas Edison in New York.";
    const out = extractAssociations(text, "Nikola Tesla");
    expect(out).toContain("George Westinghouse");
    expect(out).toContain("Thomas Edison");
    expect(out).toContain("New York");
  });

  it("drops the subject's own name", () => {
    const out = extractAssociations("Marie Curie discovered Radium with Marie Curie.", "Marie Curie");
    expect(out).not.toContain("Marie Curie");
    expect(out).toContain("Radium");
  });

  it("does not start an association with a sentence-initial stopword", () => {
    const out = extractAssociations("The Royal Society honored him. After that, fame.", "X");
    expect(out).toContain("Royal Society");
    expect(out).not.toContain("The Royal Society");
    expect(out).not.toContain("After");
  });

  it("deduplicates repeated terms", () => {
    const out = extractAssociations("Paris and Paris and Paris.", "X");
    expect(out.filter((t) => t === "Paris")).toHaveLength(1);
  });

  it("returns an empty array for empty input", () => {
    expect(extractAssociations("", "X")).toEqual([]);
  });
});

describe("fetchDataSheet", () => {
  const subject: Subject = {
    id: "tesla",
    name: "Nikola Tesla",
    wikipedia: "Nikola_Tesla",
    died: "1943",
  };

  it("builds a data sheet from the REST summary", async () => {
    const fakeFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        extract: "Nikola Tesla worked with George Westinghouse.",
        content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Nikola_Tesla" } },
      }),
    })) as unknown as typeof fetch;

    const sheet = await fetchDataSheet(subject, fakeFetch);
    expect(sheet.name).toBe("Nikola Tesla");
    expect(sheet.extract).toMatch(/Westinghouse/);
    expect(sheet.url).toBe("https://en.wikipedia.org/wiki/Nikola_Tesla");
    expect(sheet.associations).toContain("George Westinghouse");
  });

  it("falls back to a constructed URL when content_urls is missing", async () => {
    const fakeFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ extract: "Some text." }),
    })) as unknown as typeof fetch;
    const sheet = await fetchDataSheet(subject, fakeFetch);
    expect(sheet.url).toBe("https://en.wikipedia.org/wiki/Nikola_Tesla");
  });

  it("throws a clear error on a non-OK response", async () => {
    const fakeFetch = vi.fn(async () => ({
      ok: false,
      status: 404,
      json: async () => ({}),
    })) as unknown as typeof fetch;
    await expect(fetchDataSheet(subject, fakeFetch)).rejects.toThrow(/Could not load/);
  });
});
