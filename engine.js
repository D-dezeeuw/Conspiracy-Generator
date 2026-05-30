// Work-file assembly, category match, narrative generation, and the
// deconstruction reveal. Pure functions with an injectable chat fn, so the
// whole pipeline tests under Node with fakes — no network, no DOM, no deps.

import { chat, parseJson } from "./llm.js";
import { gatherSources } from "./wikipedia.js";

/**
 * @typedef {import("./data.js").Category} Category
 * @typedef {import("./data.js").Subject} Subject
 * @typedef {import("./wikipedia.js").DataSheet} DataSheet
 * @typedef {import("./llm.js").Provider} Provider
 * @typedef {{ fact: string, source: string, url: string }} Correlation
 * @typedef {{ categoryId: string, reasoning: string }} CategoryMatch
 * @typedef {{ subject: Subject, dataSheet: DataSheet, correlations: Correlation[], match?: CategoryMatch }} WorkFile
 * @typedef {{ text: string, basedOn: string }} Claim
 * @typedef {{ quote: string, attributedTo: string, spin: string }} PullQuote
 * @typedef {{ headline: string, subhead: string, body: string, claims: Claim[], pullQuotes: PullQuote[], closer: string }} Narrative
 * @typedef {{ move: string, fallacy: string }} DeconstructionMove
 * @typedef {{ summary: string, moves: DeconstructionMove[] }} Deconstruction
 */

/** @param {Category[]} categories @param {string} id */
export function getCategory(categories, id) {
  return categories.find((c) => c.id === id);
}

/**
 * Build sourced correlations from the full real-source pool: the Wikipedia
 * data-sheet associations, related encyclopedia pages, and Wikinews coverage.
 * Each correlation keeps a checkable source label + URL. Deduped by fact text.
 * @param {DataSheet} dataSheet
 * @param {import("./wikipedia.js").SourceItem[]} [related]
 * @param {import("./wikipedia.js").SourceItem[]} [news]
 * @returns {Correlation[]}
 */
export function buildCorrelations(dataSheet, related = [], news = []) {
  const out = [];
  const seen = new Set();
  const push = (fact, source, url) => {
    const key = fact.toLowerCase();
    if (!fact || seen.has(key)) return;
    seen.add(key);
    out.push({ fact, source, url });
  };

  for (const assoc of dataSheet.associations) {
    push(`${dataSheet.name} is documented in connection with ${assoc}.`, "Wikipedia", dataSheet.url);
  }
  for (const r of related) {
    push(`${dataSheet.name} is encyclopedically linked to ${r.title}.`, r.source, r.url);
  }
  for (const n of news) {
    push(`${dataSheet.name} appears in news coverage titled “${n.title}”.`, n.source, n.url);
  }
  return out;
}

/**
 * Assemble the full work-file from real, sourced material only, gathered from
 * several keyless public sources concurrently.
 * @param {Subject} subject
 * @param {typeof fetch} [fetchFn]
 * @returns {Promise<WorkFile>}
 */
export async function buildWorkFile(subject, fetchFn = fetch) {
  const { dataSheet, related, news } = await gatherSources(subject, fetchFn);
  return { subject, dataSheet, correlations: buildCorrelations(dataSheet, related, news) };
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

/** @param {WorkFile} workFile @param {Category} category @param {string} [language] */
export function buildNarrativePrompt(workFile, category, language = "English") {
  const system = [
    "You write a single sensationalized news-style article that frames real, sourced facts",
    "as if they prove a hidden causal conspiracy. This is a media-literacy exercise.",
    "STRICT RULES:",
    "1. You may ONLY use the facts provided. Do NOT invent events, dates, names, quotes, or documents.",
    "2. You amplify INTERPRETATION and insinuation, not facts.",
    "3. Every entry in `claims` must reference, in `basedOn`, which provided fact it is built on.",
    "4. The subject is a long-deceased historical figure; treat this purely as a study in rhetoric.",
    `5. Write ALL output text in ${language}. The JSON keys stay in English; only the values are in ${language}. Proper names may keep their original spelling.`,
    "6. PULL QUOTES (manufactured authority): in `pullQuotes`, ONLY use phrases that appear VERBATIM in",
    "   the supplied source extract. Quote the words EXACTLY — never alter, paraphrase, translate, or",
    "   invent a quote. `attributedTo` must be the real person/source the extract attributes it to (or",
    "   the subject). `spin` is your ominous out-of-context gloss that makes the innocent quote sound",
    "   damning. The trick is FRAMING a real quote, never fabricating one. If the extract contains no",
    "   quotable phrase, return an empty `pullQuotes` array — do not manufacture one.",
    "7. CLOSER: `closer` is the article's final passage — an 'and it never really ended' hook that",
    "   implies the same hidden pattern persists to this day. It must insinuate continuation WITHOUT",
    "   asserting any new fact, date, or present-day event. Rhetoric only.",
    'Respond ONLY with JSON: {"headline": string, "subhead": string, "body": string, "claims": [{"text": string, "basedOn": string}], "pullQuotes": [{"quote": string, "attributedTo": string, "spin": string}], "closer": string}.',
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
 * @param {string} [language]
 * @param {typeof chat} [chatFn]
 * @returns {Promise<Narrative>}
 */
export async function generateNarrative(provider, workFile, category, language = "English", chatFn = chat) {
  const { system, user } = buildNarrativePrompt(workFile, category, language);
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
    pullQuotes: verifyPullQuotes(parsed.pullQuotes, workFile.dataSheet.extract),
    closer: typeof parsed.closer === "string" ? parsed.closer : "",
  };
}

/** Normalize a quoted phrase for substring matching: strip surrounding
 *  quotation marks, collapse whitespace, lowercase. Keeps the verbatim
 *  check tolerant of curly-quote / spacing differences without letting a
 *  fabricated quote through. */
function normalizeQuote(s) {
  return String(s)
    .replace(/[“”„‟"'‘’]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Enforce the no-fabrication rule on manufactured pull quotes: keep only
 * quotes whose text actually appears VERBATIM in the source extract. The
 * ominous `spin` is free interpretation, but the quoted words must be real.
 * @param {any} raw
 * @param {string} extract
 * @returns {PullQuote[]}
 */
export function verifyPullQuotes(raw, extract) {
  if (!Array.isArray(raw)) return [];
  const haystack = normalizeQuote(extract);
  return raw
    .filter((q) => q && typeof q.quote === "string" && typeof q.spin === "string")
    .filter((q) => {
      const needle = normalizeQuote(q.quote);
      return needle.length >= 3 && haystack.includes(needle);
    })
    .map((q) => ({
      // Strip surrounding quote marks and collapse internal whitespace for
      // clean display — the words stay verbatim, only spacing is tidied.
      quote: q.quote.replace(/^["“”'‘’\s]+|["“”'‘’\s]+$/g, "").replace(/\s+/g, " "),
      attributedTo: typeof q.attributedTo === "string" && q.attributedTo.trim() ? q.attributedTo : "",
      spin: q.spin,
    }));
}

// --- Deconstruction (the reveal) -------------------------------------------

/** @param {Narrative} narrative @param {WorkFile} workFile @param {string} [language] */
export function buildDeconstructionPrompt(narrative, workFile, language = "English") {
  const system = [
    "You are a media-literacy analyst. Given a conspiracy-style article and the real facts",
    "behind it, explain how it manufactured the impression of causation from mere correlation.",
    "If the article reframes real quotes out of context, or ends on an 'it never ended' hook,",
    "call those out explicitly as named techniques (e.g. quoting out of context; unfalsifiable",
    "continuation). Make sure every persuasive device the article used appears in `moves`.",
    `Write all output text (summary and every move/fallacy) in ${language}. JSON keys stay in English.`,
    'Respond ONLY with JSON: {"summary": string, "moves": [{"move": string, "fallacy": string}]}.',
  ].join("\n");

  const facts = workFile.correlations.map((c) => `- ${c.fact}`).join("\n") || "- (none)";
  const quotes = Array.isArray(narrative.pullQuotes) && narrative.pullQuotes.length
    ? narrative.pullQuotes.map((q) => `- "${q.quote}" — spun as: ${q.spin}`).join("\n")
    : "- (none)";

  const user = [
    `Article headline: ${narrative.headline}`,
    `Subhead: ${narrative.subhead}`,
    `\nArticle body:\n${narrative.body}`,
    narrative.closer ? `\nClosing 'it never ended' passage:\n${narrative.closer}` : "",
    `\nReframed real quotes used as authority:\n${quotes}`,
    `\nThe real facts it was built from:\n${facts}`,
    `\nName each persuasive move and the specific fallacy it relies on.`,
  ].filter(Boolean).join("\n");

  return { system, user };
}

/**
 * @param {Provider} provider
 * @param {Narrative} narrative
 * @param {WorkFile} workFile
 * @param {string} [language]
 * @param {typeof chat} [chatFn]
 * @returns {Promise<Deconstruction>}
 */
export async function deconstruct(provider, narrative, workFile, language = "English", chatFn = chat) {
  const { system, user } = buildDeconstructionPrompt(narrative, workFile, language);
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
