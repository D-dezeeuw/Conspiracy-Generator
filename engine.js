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
 * @typedef {{ categoryId: string, angleId: string, reasoning: string }} CategoryMatch
 * @typedef {{ subject: Subject, dataSheet: DataSheet, correlations: Correlation[], match?: CategoryMatch }} WorkFile
 * @typedef {{ text: string, basedOn: string }} Claim
 * @typedef {{ quote: string, attributedTo: string, spin: string }} PullQuote
 * @typedef {{ intro: string, setup: string, deepDive: string, reveal: string, fingerPointing: string, nameAndShame: string }} Sections
 * @typedef {{ kicker: string, headline: string, subhead: string, sections: Sections, claims: Claim[], pullQuotes: PullQuote[], closer: string }} Narrative
 * @typedef {{ move: string, fallacy: string }} DeconstructionMove
 * @typedef {{ summary: string, moves: DeconstructionMove[] }} Deconstruction
 */

/**
 * The enforced tabloid article arc — ordered, named sections the report body
 * is always built from. Each carries a reader-facing `label` and the authoring
 * `guidance` injected into the generation prompt. The renderer walks this list
 * in order; the schema and the reveal both understand the same keys.
 * @type {{ key: keyof Sections, label: string, guidance: string }[]}
 */
export const SECTIONS = [
  { key: "intro", label: "The Hook", guidance: "Open mid-scandal with the single most sensational claim. No context yet — grab the reader first. One or two breathless paragraphs." },
  { key: "setup", label: "The Official Story", guidance: "Lay out the innocent, accepted version of events using the real facts. This calm baseline is what the rest will appear to shatter — make it sound reasonable so the twist lands." },
  { key: "deepDive", label: "The Evidence", guidance: "The body of the case. Walk through the real correlations one by one, each reframed as suspicious. 'But look closer…' This is where the buried-facts feel piles up." },
  { key: "reveal", label: "Connect the Dots", guidance: "The turn. Tie the scattered 'evidence' into one supposed hidden pattern. 'Put it all together, and a chilling picture emerges.' The fallacy does its work here." },
  { key: "fingerPointing", label: "Who Benefited?", guidance: "Name who supposedly gained and therefore must be behind it. Assign hidden motive and intent — insinuate, do not yet declare. 'And who profited from all this?'" },
  { key: "nameAndShame", label: "The Verdict", guidance: "Deliver the accusation as if settled fact. Name the culprit(s) or forces and pass judgment. The confident conclusion the whole article was built to earn." },
];

/** @param {Category[]} categories @param {string} id */
export function getCategory(categories, id) {
  return categories.find((c) => c.id === id);
}

/** @param {import("./data.js").Angle[]} angles @param {string} id */
export function getAngle(angles, id) {
  return angles.find((a) => a.id === id);
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

/** @param {WorkFile} workFile @param {Category[]} categories @param {import("./data.js").Angle[]} angles */
export function buildMatchPrompt(workFile, categories, angles) {
  const system = [
    "You are a pattern-matcher for a media-literacy demonstration.",
    "Given real facts about a long-deceased historical figure, pick the best-fitting",
    "rhetorical PATTERN (the fallacy used) and the best-fitting thematic ANGLE (the",
    "worldview/lens the story is told through). Choose the ones the real facts most",
    "readily support.",
    'Respond ONLY with JSON: {"categoryId": string, "angleId": string, "reasoning": string}.',
  ].join("\n");

  const patternList = categories
    .map((c) => `- id: ${c.id}\n  name: ${c.name}\n  patterns: ${c.correlation_patterns.join("; ")}`)
    .join("\n");

  const angleList = (angles || [])
    .filter((a) => a.id !== "auto")
    .map((a) => `- id: ${a.id}\n  name: ${a.name} — ${a.description}`)
    .join("\n");

  const facts = workFile.correlations.map((c) => `- ${c.fact}`).join("\n") ||
    "- (no notable associations found)";

  const user = [
    `Subject: ${workFile.subject.name}`,
    `\nReal facts / correlations:\n${facts}`,
    `\nExtract:\n${workFile.dataSheet.extract}`,
    `\nPATTERNS (rhetorical fallacy):\n${patternList}`,
    `\nANGLES (thematic lens):\n${angleList}`,
    `\nReturn the best-fitting categoryId, angleId, and a one-sentence reasoning.`,
  ].join("\n");

  return { system, user };
}

/**
 * Ask the LLM for the best pattern + angle; always returns valid, known ids.
 * @param {Provider} provider
 * @param {WorkFile} workFile
 * @param {Category[]} categories
 * @param {import("./data.js").Angle[]} angles
 * @param {typeof chat} [chatFn]
 * @returns {Promise<CategoryMatch>}
 */
export async function matchCategory(provider, workFile, categories, angles, chatFn = chat) {
  const { system, user } = buildMatchPrompt(workFile, categories, angles);
  const raw = await chatFn(provider, system, user);
  const parsed = parseJson(raw);

  const angleList = angles || [];
  const validAngle = parsed?.angleId && getAngle(angleList, parsed.angleId) && parsed.angleId !== "auto";
  // First non-auto angle is the recommendation fallback.
  const fallbackAngle = angleList.find((a) => a.id !== "auto")?.id || (angleList[0]?.id ?? "");

  if (parsed?.categoryId && getCategory(categories, parsed.categoryId)) {
    return {
      categoryId: parsed.categoryId,
      angleId: validAngle ? parsed.angleId : fallbackAngle,
      reasoning: parsed.reasoning || "Best structural fit for the available facts.",
    };
  }
  return {
    categoryId: categories[0].id,
    angleId: fallbackAngle,
    reasoning: "Defaulted to the first archetype (model did not return a valid match).",
  };
}

// --- Narrative generation --------------------------------------------------

/**
 * Build the conspiracy-context block that steers generation. Exposed so the
 * caller (and tests) can confirm the chosen angle + pattern context is present.
 * @param {Category} category
 * @param {import("./data.js").Angle} [angle]
 * @returns {string}
 */
export function buildConspiracyContext(category, angle) {
  const lines = [
    `PATTERN to apply — ${category.name}: ${category.description}`,
    `Pattern guidance: ${category.context}`,
    `Fallacy it illustrates: ${category.fallacy_illustrated}`,
  ];
  if (angle && angle.id !== "auto") {
    lines.push(
      `ANGLE to tell it through — ${angle.name}: ${angle.description}`,
      `Angle guidance: ${angle.context}`,
    );
  }
  return lines.join("\n");
}

/** @param {WorkFile} workFile @param {Category} category @param {import("./data.js").Angle} [angle] @param {string} [language] */
export function buildNarrativePrompt(workFile, category, angle, language = "English") {
  const sectionSpec = SECTIONS.map((s) => `  - "${s.key}" (${s.label}): ${s.guidance}`).join("\n");
  const sectionKeys = SECTIONS.map((s) => `"${s.key}": string`).join(", ");

  const system = [
    "You write a TABLOID exposé that frames real, sourced facts as if they prove a hidden causal",
    "conspiracy. This is a media-literacy exercise.",
    "STRICT RULES:",
    "1. You may ONLY use the facts provided. Do NOT invent events, dates, names, quotes, or documents.",
    "2. You amplify INTERPRETATION and insinuation, not facts.",
    "3. Every entry in `claims` must reference, in `basedOn`, which provided fact it is built on.",
    "4. The subject is a long-deceased historical figure; treat this purely as a study in rhetoric.",
    "5. Apply the PATTERN (the fallacy/mechanism) and tell the story through the ANGLE (the thematic",
    "   lens) given in the CONSPIRACY CONTEXT below. Commit fully to that angle's worldview while still",
    "   inventing no facts — the angle steers interpretation, never evidence.",
    `6. Write ALL output text in ${language}. The JSON keys stay in English; only the values are in ${language}. Proper names may keep their original spelling.`,
    "7. TABLOID VOICE: breathless, urgent, emotionally loaded. Dramatic verbs (slammed, erupted, sent",
    "   shockwaves). Short punchy paragraphs. Rhetorical questions that imply guilt without asserting it.",
    "8. STRUCTURE: the article body is a fixed arc of named sections. Fill EVERY section, in this role:",
    sectionSpec,
    "   `kicker` is a short ALL-CAPS overline label (e.g. WORLD EXCLUSIVE, BOMBSHELL). `headline` is the",
    "   screaming title. `subhead` is one dramatic teaser line under it.",
    "9. PULL QUOTES (manufactured authority): in `pullQuotes`, ONLY use phrases that appear VERBATIM in",
    "   the supplied source extract. Quote the words EXACTLY — never alter, paraphrase, translate, or",
    "   invent a quote. `attributedTo` must be the real person/source the extract attributes it to (or",
    "   the subject). `spin` is your ominous out-of-context gloss that makes the innocent quote sound",
    "   damning. The trick is FRAMING a real quote, never fabricating one. If the extract contains no",
    "   quotable phrase, return an empty `pullQuotes` array — do not manufacture one.",
    "10. CLOSER: `closer` is the article's final sign-off — an 'and it never really ended' hook that",
    "    implies the pattern persists today. Insinuate continuation WITHOUT asserting any new fact. Rhetoric only.",
    `Respond ONLY with JSON: {"kicker": string, "headline": string, "subhead": string, "sections": {${sectionKeys}}, "claims": [{"text": string, "basedOn": string}], "pullQuotes": [{"quote": string, "attributedTo": string, "spin": string}], "closer": string}.`,
  ].join("\n");

  const facts = workFile.correlations.map((c, i) => `[F${i + 1}] ${c.fact}`).join("\n") ||
    "[F1] (no notable associations were found; rely only on the extract)";

  const user = [
    `=== CONSPIRACY CONTEXT ===\n${buildConspiracyContext(category, angle)}`,
    `\nSubject: ${workFile.subject.name}`,
    `\nProvided facts:\n${facts}`,
    `\nSource extract (do not exceed these facts):\n${workFile.dataSheet.extract}`,
    `\nWrite the tabloid article now, filling every section in order. Make the framing maximally convincing while inventing nothing.`,
  ].join("\n");

  return { system, user };
}

/**
 * @param {Provider} provider
 * @param {WorkFile} workFile
 * @param {Category} category
 * @param {import("./data.js").Angle} [angle]
 * @param {string} [language]
 * @param {typeof chat} [chatFn]
 * @returns {Promise<Narrative>}
 */
export async function generateNarrative(provider, workFile, category, angle, language = "English", chatFn = chat) {
  const { system, user } = buildNarrativePrompt(workFile, category, angle, language);
  // Guard: the chosen pattern + angle context MUST actually reach the model.
  if (!user.includes(category.context)) {
    throw new Error("Internal: pattern context missing from the generation prompt.");
  }
  if (angle && angle.id !== "auto" && !user.includes(angle.context)) {
    throw new Error("Internal: angle context missing from the generation prompt.");
  }
  const raw = await chatFn(provider, system, user);
  const parsed = parseJson(raw);
  const sections = normalizeSections(parsed);
  if (!parsed || !sections) {
    throw new Error("The model did not return a usable article. Try regenerating.");
  }
  return {
    kicker: typeof parsed.kicker === "string" ? parsed.kicker : "",
    headline: parsed.headline || "An Untold Pattern Emerges",
    subhead: parsed.subhead || "",
    sections,
    claims: Array.isArray(parsed.claims)
      ? parsed.claims.filter((c) => c && typeof c.text === "string" && typeof c.basedOn === "string")
      : [],
    pullQuotes: verifyPullQuotes(parsed.pullQuotes, workFile.dataSheet.extract),
    closer: typeof parsed.closer === "string" ? parsed.closer : "",
  };
}

/**
 * Coerce a model response into the fixed Sections shape. Returns null only when
 * there's nothing usable at all (no sections and no legacy body). If the model
 * returns the old single `body`, it lands in `deepDive` so nothing is lost.
 * @param {any} parsed
 * @returns {Sections|null}
 */
export function normalizeSections(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  const src = parsed.sections && typeof parsed.sections === "object" ? parsed.sections : {};
  /** @type {Sections} */
  const out = { intro: "", setup: "", deepDive: "", reveal: "", fingerPointing: "", nameAndShame: "" };
  let any = false;
  for (const { key } of SECTIONS) {
    if (typeof src[key] === "string" && src[key].trim()) {
      out[key] = src[key].trim();
      any = true;
    }
  }
  // Back-compat: a flat `body` (or an empty section set) falls into deepDive.
  if (!any && typeof parsed.body === "string" && parsed.body.trim()) {
    out.deepDive = parsed.body.trim();
    any = true;
  }
  return any ? out : null;
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

/** Flatten the narrative's ordered sections into labeled text. */
export function sectionsToText(sections) {
  if (!sections) return "";
  return SECTIONS
    .map((s) => (sections[s.key] ? `[${s.label}]\n${sections[s.key]}` : ""))
    .filter(Boolean)
    .join("\n\n");
}

/** @param {Narrative} narrative @param {WorkFile} workFile @param {string} [language] */
export function buildDeconstructionPrompt(narrative, workFile, language = "English") {
  const system = [
    "You are a media-literacy analyst. Given a tabloid conspiracy article and the real facts",
    "behind it, explain how it manufactured the impression of causation from mere correlation.",
    "The article is built from labeled tabloid sections. Walk them in order and, for each, name the",
    "trick it played — e.g. the Official Story builds false trust; the Evidence cherry-picks; Connect",
    "the Dots manufactures a pattern from coincidence; Who Benefited uses cui-bono as proof; the",
    "Verdict states as fact what was never shown. Also flag quoting out of context and the",
    "unfalsifiable 'it never ended' continuation. Every persuasive device used must appear in `moves`.",
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
    `\nArticle sections:\n${sectionsToText(narrative.sections)}`,
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
