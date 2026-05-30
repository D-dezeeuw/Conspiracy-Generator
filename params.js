// Resolve URL query parameters into prefilled selections. Pure + dependency-
// free so it tests under Node. Tolerant of human-readable names, ids, light
// misspellings, and punctuation (e.g. "religious/occult" -> religious_occult).
//
// SAFETY: a `target` that does not resolve to a curated subject is ignored.
// This preserves the gate — there is no free-text path to a living person.

/** Normalize a value for matching: lowercase, punctuation/underscores → spaces,
 *  collapse whitespace. */
function normalize(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokens(s) {
  return normalize(s).split(" ").filter(Boolean);
}

/**
 * Resolve a free-form query against a list of items by id or display name.
 * Returns the matched item's id, or null if nothing clears the threshold.
 * @template {{ id: string }} T
 * @param {string} query
 * @param {T[]} items
 * @param {(item: T) => string} nameOf
 * @returns {string|null}
 */
export function resolveByNameOrId(query, items, nameOf) {
  const q = normalize(query);
  if (!q) return null;
  const qTokens = tokens(query);

  let best = null;
  let bestScore = 0;

  for (const item of items) {
    const idN = normalize(item.id);
    const nameN = normalize(nameOf(item));

    let score = 0;
    if (q === idN || q === nameN) {
      score = 100; // exact id or name
    } else if (idN.includes(q) || nameN.includes(q) || q.includes(nameN)) {
      // substring either direction — weight by how much of the name is covered
      score = 70 + Math.min(20, q.length);
    } else {
      // token overlap (handles misspelled/extra words, e.g. "nicola tesla")
      const nameTokens = new Set([...tokens(nameOf(item)), ...tokens(item.id)]);
      const hits = qTokens.filter((t) => nameTokens.has(t)).length;
      if (hits) score = 30 + 20 * hits;
    }

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  // Require a real signal: at least one exact/substring/shared-token match.
  return bestScore >= 50 ? best.id : null;
}

/**
 * Parse a query string (e.g. "?target=nicola+tesla&angle=religious/occult")
 * into prefilled selections. Only keys that resolve are returned.
 *
 * @param {string} search  location.search (with or without leading "?").
 * @param {{ SUBJECTS: any[], ANGLES: any[], CATEGORIES: any[], LANGUAGES: any[] }} data
 * @returns {{ subjectId?: string, angleId?: string, categoryId?: string, langId?: string }}
 */
export function resolveParams(search, data) {
  const params = new URLSearchParams(search || "");
  const out = {};

  const target = params.get("target");
  if (target) {
    const id = resolveByNameOrId(target, data.SUBJECTS, (s) => s.name);
    if (id) out.subjectId = id; // unresolved target is ignored (safety gate)
  }

  const angle = params.get("angle");
  if (angle) {
    const id = resolveByNameOrId(angle, data.ANGLES, (a) => a.name);
    if (id) out.angleId = id;
  }

  // Accept both `pattern` and `category` as the pattern key.
  const pattern = params.get("pattern") || params.get("category");
  if (pattern) {
    const id = resolveByNameOrId(pattern, data.CATEGORIES, (c) => c.name);
    if (id) out.categoryId = id;
  }

  const lang = params.get("lang") || params.get("language");
  if (lang) {
    const id = resolveByNameOrId(lang, data.LANGUAGES, (l) => l.name);
    if (id) out.langId = id;
  }

  return out;
}
