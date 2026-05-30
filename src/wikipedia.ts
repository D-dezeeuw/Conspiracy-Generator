import type { DataSheet, Subject } from "./types";

/** Words that often start a sentence but are not proper nouns worth keeping. */
const STOPWORDS = new Set([
  "The", "A", "An", "He", "She", "It", "They", "His", "Her", "Their", "This",
  "That", "These", "Those", "In", "On", "At", "As", "By", "For", "From", "To",
  "After", "Before", "During", "While", "Although", "Though", "However", "When",
  "Where", "Who", "What", "Which", "There", "Then", "Both", "One", "Two", "Some",
  "Many", "Most", "Later", "Early", "Born", "Died", "Despite", "Among", "Born",
]);

/**
 * Pull notable proper-noun associations out of a Wikipedia extract. Heuristic,
 * deterministic, and intentionally conservative: it keeps multi-word
 * Capitalized spans and well-known single Capitalized tokens, drops the
 * subject's own name, sentence-initial stopwords, and duplicates.
 */
export function extractAssociations(extract: string, subjectName = ""): string[] {
  if (!extract) return [];

  const subjectTokens = new Set(
    subjectName.split(/\s+/).map((t) => t.replace(/[^\p{L}]/gu, "")).filter(Boolean),
  );

  // Match runs of Capitalized words (allowing internal "of"/"the"/"and"/"de").
  const re = /\b([A-Z][\p{L}.'-]+(?:\s+(?:of|de|von|van|du|la|le|el|den|der)\s+[A-Z][\p{L}.'-]+|\s+[A-Z][\p{L}.'-]+)*)\b/gu;

  const seen = new Set<string>();
  const out: string[] = [];

  for (const match of extract.matchAll(re)) {
    let term = match[1].trim().replace(/[.,;:'"]+$/, "");
    const words = term.split(/\s+/);

    // Single-word candidate: drop if it's a stopword (likely sentence start).
    if (words.length === 1 && STOPWORDS.has(words[0])) continue;

    // Multi-word: strip a leading stopword (e.g. "The Edison Company" handling).
    if (words.length > 1 && STOPWORDS.has(words[0])) {
      term = words.slice(1).join(" ");
    }
    if (!term) continue;

    // Drop terms that are (or contain only) the subject's own name tokens.
    const termTokens = term.split(/\s+/).map((t) => t.replace(/[^\p{L}]/gu, ""));
    if (termTokens.every((t) => subjectTokens.has(t))) continue;

    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(term);
  }

  return out;
}

/**
 * Fetch a real data sheet from the public Wikipedia REST summary endpoint.
 * Client-side, CORS-enabled, no auth, nothing persisted.
 */
export async function fetchDataSheet(
  subject: Subject,
  fetchFn: typeof fetch = fetch,
): Promise<DataSheet> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
    subject.wikipedia,
  )}`;

  let res: Response;
  try {
    res = await fetchFn(url, { headers: { Accept: "application/json" } });
  } catch {
    throw new Error(`Network error loading the Wikipedia data sheet for ${subject.name}.`);
  }
  if (!res.ok) {
    throw new Error(
      `Could not load the Wikipedia summary for ${subject.name} (HTTP ${res.status}).`,
    );
  }

  const data = await res.json();
  const extract: string = typeof data?.extract === "string" ? data.extract : "";

  return {
    name: subject.name,
    extract,
    url: data?.content_urls?.desktop?.page ||
      `https://en.wikipedia.org/wiki/${encodeURIComponent(subject.wikipedia)}`,
    associations: extractAssociations(extract, subject.name),
  };
}
