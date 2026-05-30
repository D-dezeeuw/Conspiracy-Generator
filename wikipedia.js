// Real Wikipedia data-sheet fetch + deterministic association extraction.
// Pure logic + an injectable fetch, so it tests under Node with no deps.

/**
 * @typedef {import("./data.js").Subject} Subject
 * @typedef {{ name: string, extract: string, url: string, associations: string[] }} DataSheet
 */

/** Words that often start a sentence but are not proper nouns worth keeping. */
const STOPWORDS = new Set([
  "The", "A", "An", "He", "She", "It", "They", "His", "Her", "Their", "This",
  "That", "These", "Those", "In", "On", "At", "As", "By", "For", "From", "To",
  "After", "Before", "During", "While", "Although", "Though", "However", "When",
  "Where", "Who", "What", "Which", "There", "Then", "Both", "One", "Two", "Some",
  "Many", "Most", "Later", "Early", "Born", "Died", "Despite", "Among",
]);

/**
 * Pull notable proper-noun associations out of a Wikipedia extract.
 * Conservative and deterministic.
 * @param {string} extract
 * @param {string} [subjectName]
 * @returns {string[]}
 */
export function extractAssociations(extract, subjectName = "") {
  if (!extract) return [];

  const subjectTokens = new Set(
    subjectName.split(/\s+/).map((t) => t.replace(/[^\p{L}]/gu, "")).filter(Boolean),
  );

  const re = /\b([A-Z][\p{L}.'-]+(?:\s+(?:of|de|von|van|du|la|le|el|den|der)\s+[A-Z][\p{L}.'-]+|\s+[A-Z][\p{L}.'-]+)*)\b/gu;

  const seen = new Set();
  const out = [];

  for (const match of extract.matchAll(re)) {
    let term = match[1].trim().replace(/[.,;:'"]+$/, "");
    const words = term.split(/\s+/);

    if (words.length === 1 && STOPWORDS.has(words[0])) continue;
    if (words.length > 1 && STOPWORDS.has(words[0])) term = words.slice(1).join(" ");
    if (!term) continue;

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
 * @param {Subject} subject
 * @param {typeof fetch} [fetchFn]
 * @returns {Promise<DataSheet>}
 */
export async function fetchDataSheet(subject, fetchFn = fetch) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(subject.wikipedia)}`;

  let res;
  try {
    res = await fetchFn(url, { headers: { Accept: "application/json" } });
  } catch {
    throw new Error(`Network error loading the Wikipedia data sheet for ${subject.name}.`);
  }
  if (!res.ok) {
    throw new Error(`Could not load the Wikipedia summary for ${subject.name} (HTTP ${res.status}).`);
  }

  const data = await res.json();
  const extract = typeof data?.extract === "string" ? data.extract : "";

  return {
    name: subject.name,
    extract,
    url: data?.content_urls?.desktop?.page ||
      `https://en.wikipedia.org/wiki/${encodeURIComponent(subject.wikipedia)}`,
    associations: extractAssociations(extract, subject.name),
  };
}
