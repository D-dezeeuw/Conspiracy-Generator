import { describe, it, expect, vi } from "vitest";
import {
  buildCorrelations,
  buildWorkFile,
  buildMatchPrompt,
  buildNarrativePrompt,
  buildDeconstructionPrompt,
  matchCategory,
  generateNarrative,
  deconstruct,
  categories,
  getCategory,
} from "./engine";
import type { DataSheet, Provider, Subject, WorkFile } from "./types";

const provider: Provider = { baseUrl: "x", model: "m", apiKey: "k" };

const subject: Subject = {
  id: "tesla",
  name: "Nikola Tesla",
  wikipedia: "Nikola_Tesla",
  died: "1943",
};

const dataSheet: DataSheet = {
  name: "Nikola Tesla",
  extract: "Nikola Tesla clashed with Thomas Edison in New York.",
  url: "https://en.wikipedia.org/wiki/Nikola_Tesla",
  associations: ["Thomas Edison", "New York"],
};

const workFile: WorkFile = {
  subject,
  dataSheet,
  correlations: buildCorrelations(dataSheet),
};

describe("buildCorrelations", () => {
  it("creates one sourced correlation per association", () => {
    const cors = buildCorrelations(dataSheet);
    expect(cors).toHaveLength(2);
    expect(cors[0]).toEqual({
      fact: "Nikola Tesla is documented in connection with Thomas Edison.",
      source: "Wikipedia",
      url: dataSheet.url,
    });
  });
});

describe("buildWorkFile", () => {
  it("assembles a work-file from a fetched data sheet", async () => {
    const fakeFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        extract: "Nikola Tesla clashed with Thomas Edison.",
        content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Nikola_Tesla" } },
      }),
    })) as unknown as typeof fetch;

    const wf = await buildWorkFile(subject, fakeFetch);
    expect(wf.subject).toBe(subject);
    expect(wf.correlations.length).toBeGreaterThan(0);
    expect(wf.correlations.every((c) => c.url.includes("wikipedia.org"))).toBe(true);
  });
});

describe("prompts", () => {
  it("match prompt lists every category id", () => {
    const { user } = buildMatchPrompt(workFile);
    for (const c of categories) expect(user).toContain(c.id);
  });

  it("narrative prompt forbids inventing facts and tags claims", () => {
    const { system } = buildNarrativePrompt(workFile, categories[0]);
    expect(system).toMatch(/Do NOT invent/);
    expect(system).toMatch(/basedOn/);
  });

  it("deconstruction prompt asks for moves + fallacies", () => {
    const { system } = buildDeconstructionPrompt(
      { headline: "H", subhead: "S", body: "B", claims: [] },
      workFile,
    );
    expect(system).toMatch(/fallacy/i);
    expect(system).toMatch(/moves/);
  });
});

describe("matchCategory", () => {
  it("returns the model's valid category", async () => {
    const fake = vi.fn(async () => '{"categoryId":"hidden_network","reasoning":"ties"}');
    const m = await matchCategory(provider, workFile, fake);
    expect(m.categoryId).toBe("hidden_network");
    expect(getCategory(m.categoryId)).toBeDefined();
  });

  it("falls back to the first category on an unknown id", async () => {
    const fake = vi.fn(async () => '{"categoryId":"does_not_exist"}');
    const m = await matchCategory(provider, workFile, fake);
    expect(m.categoryId).toBe(categories[0].id);
  });

  it("falls back when the model returns garbage", async () => {
    const fake = vi.fn(async () => "the answer is probably the network one");
    const m = await matchCategory(provider, workFile, fake);
    expect(m.categoryId).toBe(categories[0].id);
  });
});

describe("generateNarrative", () => {
  it("normalizes a valid narrative and keeps only well-formed claims", async () => {
    const fake = vi.fn(async () =>
      JSON.stringify({
        headline: "The Pattern",
        subhead: "sub",
        body: "long body",
        claims: [
          { text: "claim a", basedOn: "F1" },
          { text: "missing basedOn" },
          "garbage",
        ],
      }),
    );
    const n = await generateNarrative(provider, workFile, categories[0], fake);
    expect(n.headline).toBe("The Pattern");
    expect(n.claims).toEqual([{ text: "claim a", basedOn: "F1" }]);
  });

  it("throws when no usable body comes back", async () => {
    const fake = vi.fn(async () => "no json at all");
    await expect(
      generateNarrative(provider, workFile, categories[0], fake),
    ).rejects.toThrow(/usable article/);
  });
});

describe("deconstruct", () => {
  it("normalizes a valid deconstruction", async () => {
    const fake = vi.fn(async () =>
      '{"summary":"s","moves":[{"move":"m1","fallacy":"post hoc"},{"bad":true}]}',
    );
    const d = await deconstruct(
      provider,
      { headline: "H", subhead: "S", body: "B", claims: [] },
      workFile,
      fake,
    );
    expect(d.summary).toBe("s");
    expect(d.moves).toEqual([{ move: "m1", fallacy: "post hoc" }]);
  });
});
