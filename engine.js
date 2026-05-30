// Work-file assembly, category match, narrative generation, and the
// deconstruction reveal. Pure functions with an injectable chat fn, so the
// whole pipeline tests under Node with fakes — no network, no DOM, no deps.

import { chat, parseJson } from "./llm.js";
import { fetchDataSheet } from "./wikipedia.js";

/**
 * @typedef {import("./data.js").Category} Category
 * @typedef {import("./data.js").Subject} Subject
 * @typedef {import("./wikipedia.js").DataSheet} DataSheet
 * @typedef {import("./llm.js").Provider} Provider
 * @typedef {{ fact: string, source: string, url: string }} Correlation
 * @typedef {{ categoryId: string, reasoning: string }} CategoryMatch
 * @typedef {{ subject: Subject, dataSheet: DataSheet, correlations: Correlation[], match?: CategoryMatch }} WorkFile
 * @typedef {{ text: string, basedOn: string }} Claim
 * @typedef {{ headline: string, subhead: string, body: string, claims: Claim[] }} Narrative
 * @typedef {{ move: string, fallacy: string }} DeconstructionMove
 * @typedef {{ summary: string, moves: DeconstructionMove[] }} Deconstruction
 */

/** @param {Category[]} categories @param {string} id */
export function getCategory(categories, id) {
  return categories.find((c) => c.id === id);
}

/**
 * Turn a real data sheet's associations into sourced correlations.
 * @param {DataSheet} dataSheet
 * @returns {Correlation[]}
 */
export function buildCorrelations(dataSheet) {
  return dataSheet.associations.map((assoc) => ({
    fact: `${dataSheet.name} is documented in connection with ${assoc}.`,
    source: "Wikipedia",
    url: dataSheet.url,
  }));
}

/**
 * Assemble the full work-file from real, sourced material only.
 * @param {Subject} subject
 * @param {typeof fetch} [fetchFn]
 * @returns {Promise<WorkFile>}
 */
export async function buildWorkFile(subject, fetchFn = fetch) {
  const dataSheet = await fetchDataSheet(subject, fetchFn);
  return { subject, dataSheet, correlations: buildCorrelations(dataSheet) };
}

// --- Category match --------------------------------------------------------

/** @param {WorkFile} workFile @param {Category[]} categories */
export function buildMatchPrompt(workFile, categories) {
  const system = [
    "You are a pattern-matcher for a media-literacy demonstration.",
    "Given real facts about a long-deceased historical figure and a list of conspiracy",
    "narrative archetypes, pick the single archetype whose pattern best fits the facts.",
    'Respond ONLY with JSON: {"categoryId": string, "reasoning": string}.',
  ].join("\n");

  const catalogue = categories
    .map((c) => `- id: ${c.id}\n  name: ${c.name}\n  patterns: ${c.correlation_patterns.join("; ")}`)
    .join("\n");

  const facts = workFile.correlations.map((c) => `- ${c.fact}`).join("\n") ||
    "- (no notable associations found)";

  const user = [
    `Subject: ${workFile.subject.name}`,
    `\nReal facts / correlations:\n${facts}`,
    `\nExtract:\n${workFile.dataSheet.extract}`,
    `\nArchetypes:\n${catalogue}`,
    `\nReturn the best-fitting categoryId and a one-sentence reasoning.`,
  ].join("\n");

  return { system, user };
}

/**
 * Ask the LLM for the best category; always returns a valid, known id.
 * @param {Provider} provider
 * @param {WorkFile} workFile
 * @param {Category[]} categories
 * @param {typeof chat} [chatFn]
 * @returns {Promise<CategoryMatch>}
 */
export async function matchCategory(provider, workFile, categories, chatFn = chat) {
  const { system, user } = buildMatchPrompt(workFile, categories);
  const raw = await chatFn(provider, system, user);
  const parsed = parseJson(raw);

  if (parsed?.categoryId && getCategory(categories, parsed.categoryId)) {
    return {
      categoryId: parsed.categoryId,
      reasoning: parsed.reasoning || "Best structural fit for the available facts.",
    };
  }
  return {
    categoryId: categories[0].id,
    reasoning: "Defaulted to the first archetype (model did not return a valid match).",
  };
}

// --- Narrative generation --------------------------------------------------

/** @param {WorkFile} workFile @param {Category} category */
export function buildNarrativePrompt(workFile, category) {
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

/**
 * @param {Provider} provider
 * @param {WorkFile} workFile
 * @param {Category} category
 * @param {typeof chat} [chatFn]
 * @returns {Promise<Narrative>}
 */
export async function generateNarrative(provider, workFile, category, chatFn = chat) {
  const { system, user } = buildNarrativePrompt(workFile, category);
  const raw = await chatFn(provider, system, user);
  const parsed = parseJson(raw);
  if (!parsed || typeof parsed.body !== "string") {
    throw new Error("The model did not return a usable article. Try regenerating.");
  }
  return {
    headline: parsed.headline || "An Untold Pattern Emerges",
    subhead: parsed.subhead || "",
    body: parsed.body,
    claims: Array.isArray(parsed.claims)
      ? parsed.claims.filter((c) => c && typeof c.text === "string" && typeof c.basedOn === "string")
      : [],
  };
}

// --- Deconstruction (the reveal) -------------------------------------------

/** @param {Narrative} narrative @param {WorkFile} workFile */
export function buildDeconstructionPrompt(narrative, workFile) {
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

/**
 * @param {Provider} provider
 * @param {Narrative} narrative
 * @param {WorkFile} workFile
 * @param {typeof chat} [chatFn]
 * @returns {Promise<Deconstruction>}
 */
export async function deconstruct(provider, narrative, workFile, chatFn = chat) {
  const { system, user } = buildDeconstructionPrompt(narrative, workFile);
  const raw = await chatFn(provider, system, user);
  const parsed = parseJson(raw);
  if (!parsed) {
    throw new Error("The model did not return a usable deconstruction. Try again.");
  }
  return {
    summary: parsed.summary || "This article arranges true facts to imply a causation that the facts do not support.",
    moves: Array.isArray(parsed.moves)
      ? parsed.moves.filter((m) => m && typeof m.move === "string" && typeof m.fallacy === "string")
      : [],
  };
}
