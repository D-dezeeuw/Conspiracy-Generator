// Real public-source gathering: Wikipedia data sheet + related pages +
// Wikinews coverage, plus deterministic association extraction. Every source
// is keyless, CORS-enabled, and carries a checkable URL — so the pool grows
// without ever inventing a fact. Pure logic + an injectable fetch, so it
// tests under Node with no deps.

/**
 * @typedef {import("./data.js").Subject} Subject
 * @typedef {{ name: string, extract: string, url: string, associations: string[] }} DataSheet
 * @typedef {{ title: string, summary: string, url: string, source: string }} SourceItem
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

/**
 * Fetch Wikipedia "related pages" — real topics the encyclopedia links as
 * adjacent to the subject. Each becomes a sourced item with its own URL.
 * Never throws: returns [] on any failure (it's an optional pool widener).
 * @param {Subject} subject
 * @param {typeof fetch} [fetchFn]
 * @param {number} [limit]
 * @returns {Promise<SourceItem[]>}
 */
export async function fetchRelated(subject, fetchFn = fetch, limit = 6) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/related/${encodeURIComponent(subject.wikipedia)}`;
  try {
    const res = await fetchFn(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const data = await res.json();
    const pages = Array.isArray(data?.pages) ? data.pages : [];
    return pages.slice(0, limit).map((p) => ({
      title: p.titles?.normalized || p.title || "",
      summary: typeof p.extract === "string" ? p.extract : "",
      url: p.content_urls?.desktop?.page ||
        `https://en.wikipedia.org/wiki/${encodeURIComponent((p.title || "").replace(/ /g, "_"))}`,
      source: "Wikipedia (related)",
    })).filter((p) => p.title);
  } catch {
    return [];
  }
}

/**
 * Search Wikinews for real news-style coverage mentioning the subject. Uses
 * the public MediaWiki API (keyless, CORS via origin=*). Each hit carries its
 * own article URL. Never throws: returns [] on any failure.
 * @param {Subject} subject
 * @param {typeof fetch} [fetchFn]
 * @param {number} [limit]
 * @returns {Promise<SourceItem[]>}
 */
export async function fetchWikinews(subject, fetchFn = fetch, limit = 5) {
  const q = encodeURIComponent(subject.name);
  const url = `https://en.wikinews.org/w/api.php?action=query&list=search&srsearch=${q}&srlimit=${limit}&format=json&origin=*`;
  try {
    const res = await fetchFn(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const data = await res.json();
    const hits = data?.query?.search;
    if (!Array.isArray(hits)) return [];
    return hits.map((h) => ({
      title: h.title || "",
      // The snippet is HTML with <span> highlight markup; strip tags to plain text.
      summary: typeof h.snippet === "string" ? h.snippet.replace(/<[^>]*>/g, "").replace(/&[a-z]+;/gi, " ").trim() : "",
      url: `https://en.wikinews.org/wiki/${encodeURIComponent((h.title || "").replace(/ /g, "_"))}`,
      source: "Wikinews",
    })).filter((h) => h.title);
  } catch {
    return [];
  }
}

/**
 * Gather the full real-source pool concurrently. The Wikipedia data sheet is
 * required (the run fails without it); related pages and Wikinews are
 * best-effort wideners — a failure in either is swallowed so the run proceeds.
 * @param {Subject} subject
 * @param {typeof fetch} [fetchFn]
 * @returns {Promise<{ dataSheet: DataSheet, related: SourceItem[], news: SourceItem[] }>}
 */
export async function gatherSources(subject, fetchFn = fetch) {
  const [sheetRes, relatedRes, newsRes] = await Promise.allSettled([
    fetchDataSheet(subject, fetchFn),
    fetchRelated(subject, fetchFn),
    fetchWikinews(subject, fetchFn),
  ]);

  if (sheetRes.status !== "fulfilled") throw sheetRes.reason;

  return {
    dataSheet: sheetRes.value,
    related: relatedRes.status === "fulfilled" ? relatedRes.value : [],
    news: newsRes.status === "fulfilled" ? newsRes.value : [],
  };
}
