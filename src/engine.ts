import categoriesData from "../data/categories.json";
import type {
  Category,
  CategoryMatch,
  Correlation,
  DataSheet,
  Deconstruction,
  Narrative,
  Provider,
  Subject,
  WorkFile,
} from "./types";
import { chat, parseJson, type ChatFn } from "./llm";
import { fetchDataSheet } from "./wikipedia";

export const categories = categoriesData as Category[];

export function getCategory(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}

/** Turn a real data sheet's associations into sourced correlations. */
export function buildCorrelations(dataSheet: DataSheet): Correlation[] {
  return dataSheet.associations.map((assoc) => ({
    fact: `${dataSheet.name} is documented in connection with ${assoc}.`,
    source: "Wikipedia",
    url: dataSheet.url,
  }));
}

/** Assemble the full work-file from real, sourced material only. */
export async function buildWorkFile(
  subject: Subject,
  fetchFn: typeof fetch = fetch,
): Promise<WorkFile> {
  const dataSheet = await fetchDataSheet(subject, fetchFn);
  return { subject, dataSheet, correlations: buildCorrelations(dataSheet) };
}

// ---------------------------------------------------------------------------
// Category match
// ---------------------------------------------------------------------------

export function buildMatchPrompt(workFile: WorkFile): { system: string; user: string } {
  const system = [
    "You are a pattern-matcher for a media-literacy demonstration.",
    "Given real facts about a long-deceased historical figure and a list of conspiracy",
    "narrative archetypes, pick the single archetype whose pattern best fits the facts.",
    'Respond ONLY with JSON: {"categoryId": string, "reasoning": string}.',
  ].join("\n");

  const catalogue = categories
    .map(
      (c) =>
        `- id: ${c.id}\n  name: ${c.name}\n  patterns: ${c.correlation_patterns.join("; ")}`,
    )
    .join("\n");

  const facts = workFile.correlations.map((c) => `- ${c.fact}`).join("\n") || "- (no notable associations found)";

  const user = [
    `Subject: ${workFile.subject.name}`,
    `\nReal facts / correlations:\n${facts}`,
    `\nExtract:\n${workFile.dataSheet.extract}`,
    `\nArchetypes:\n${catalogue}`,
    `\nReturn the best-fitting categoryId and a one-sentence reasoning.`,
  ].join("\n");

  return { system, user };
}

/** Ask the LLM for the best category; always returns a valid, known category id. */
export async function matchCategory(
  provider: Provider,
  workFile: WorkFile,
  chatFn: ChatFn = chat,
): Promise<CategoryMatch> {
  const { system, user } = buildMatchPrompt(workFile);
  const raw = await chatFn(provider, system, user);
  const parsed = parseJson<Partial<CategoryMatch>>(raw);

  const valid = parsed?.categoryId && getCategory(parsed.categoryId);
  if (valid) {
    return {
      categoryId: parsed!.categoryId!,
      reasoning: parsed?.reasoning || "Best structural fit for the available facts.",
    };
  }
  // Safe fallback to the first category if the model misbehaves.
  return {
    categoryId: categories[0].id,
    reasoning: "Defaulted to the first archetype (model did not return a valid match).",
  };
}

// ---------------------------------------------------------------------------
// Narrative generation
// ---------------------------------------------------------------------------

export function buildNarrativePrompt(
  workFile: WorkFile,
  category: Category,
): { system: string; user: string } {
  const system = [
    "You write a single sensationalized news-style article that frames real, sourced facts",
    "as if they prove a hidden causal conspiracy. This is a media-literacy exercise.",
    "STRICT RULES:",
    "1. You may ONLY use the facts provided. Do NOT invent events, dates, names, quotes, or documents.",
    "2. You amplify INTERPRETATION and insinuation, not facts.",
    "3. Every entry in `claims` must reference, in `basedOn`, which provided fact it is built on.",
    "4. The subject is a long-deceased historical figure; treat this purely as a study in rhetoric.",
    'Respond ONLY with JSON: {"headline": string, "subhead": string, "body": string, "claims": [{"text": string, "basedOn": string}]}.',
  ].join("\n");

  const facts = workFile.correlations.map((c, i) => `[F${i + 1}] ${c.fact}`).join("\n") ||
    "[F1] (no notable associations were found; rely only on the extract)";

  const user = [
    `Archetype to apply: ${category.name} — ${category.description}`,
    `Fallacy it illustrates: ${category.fallacy_illustrated}`,
    `\nSubject: ${workFile.subject.name}`,
    `\nProvided facts:\n${facts}`,
    `\nSource extract (do not exceed these facts):\n${workFile.dataSheet.extract}`,
    `\nWrite the article now. Make the framing maximally convincing while inventing nothing.`,
  ].join("\n");

  return { system, user };
}

export async function generateNarrative(
  provider: Provider,
  workFile: WorkFile,
  category: Category,
  chatFn: ChatFn = chat,
): Promise<Narrative> {
  const { system, user } = buildNarrativePrompt(workFile, category);
  const raw = await chatFn(provider, system, user);
  const parsed = parseJson<Partial<Narrative>>(raw);
  if (!parsed || typeof parsed.body !== "string") {
    throw new Error("The model did not return a usable article. Try regenerating.");
  }
  return {
    headline: parsed.headline || "An Untold Pattern Emerges",
    subhead: parsed.subhead || "",
    body: parsed.body,
    claims: Array.isArray(parsed.claims)
      ? parsed.claims.filter(
          (c): c is { text: string; basedOn: string } =>
            !!c && typeof c.text === "string" && typeof c.basedOn === "string",
        )
      : [],
  };
}

// ---------------------------------------------------------------------------
// Deconstruction (the reveal)
// ---------------------------------------------------------------------------

export function buildDeconstructionPrompt(
  narrative: Narrative,
  workFile: WorkFile,
): { system: string; user: string } {
  const system = [
    "You are a media-literacy analyst. Given a conspiracy-style article and the real facts",
    "behind it, explain how it manufactured the impression of causation from mere correlation.",
    'Respond ONLY with JSON: {"summary": string, "moves": [{"move": string, "fallacy": string}]}.',
  ].join("\n");

  const facts = workFile.correlations.map((c) => `- ${c.fact}`).join("\n") || "- (none)";

  const user = [
    `Article headline: ${narrative.headline}`,
    `Subhead: ${narrative.subhead}`,
    `\nArticle body:\n${narrative.body}`,
    `\nThe real facts it was built from:\n${facts}`,
    `\nName each persuasive move and the specific fallacy it relies on.`,
  ].join("\n");

  return { system, user };
}

export async function deconstruct(
  provider: Provider,
  narrative: Narrative,
  workFile: WorkFile,
  chatFn: ChatFn = chat,
): Promise<Deconstruction> {
  const { system, user } = buildDeconstructionPrompt(narrative, workFile);
  const raw = await chatFn(provider, system, user);
  const parsed = parseJson<Partial<Deconstruction>>(raw);
  if (!parsed) {
    throw new Error("The model did not return a usable deconstruction. Try again.");
  }
  return {
    summary: parsed.summary || "This article arranges true facts to imply a causation that the facts do not support.",
    moves: Array.isArray(parsed.moves)
      ? parsed.moves.filter(
          (m): m is { move: string; fallacy: string } =>
            !!m && typeof m.move === "string" && typeof m.fallacy === "string",
        )
      : [],
  };
}
