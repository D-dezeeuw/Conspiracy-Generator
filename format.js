// Tiny pure formatting helpers. spektrum's {{ }} bindings write textContent,
// which escapes for us, so no HTML escaping is needed here — we only split a
// body into paragraph strings for a data-each.

/**
 * Split a plain-text body (blank-line separated) into trimmed paragraphs.
 * @param {string} body
 * @returns {string[]}
 */
export function toParagraphs(body) {
  return String(body)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}
