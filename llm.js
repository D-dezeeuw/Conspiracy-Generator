// Direct browser -> provider client for any OpenAI-compatible
// /chat/completions endpoint, plus a tolerant JSON extractor. No imports,
// no DOM — runnable under Node's test runner.

/**
 * @typedef {Object} Provider
 * @property {string} baseUrl
 * @property {string} model
 * @property {string} apiKey
 */

/**
 * Chat against an OpenAI-compatible endpoint. The key is sent only to the
 * provider the user configured; it never touches a server we control.
 * @param {Provider} provider
 * @param {string} system
 * @param {string} user
 * @param {typeof fetch} [fetchFn]
 * @returns {Promise<string>}
 */
export async function chat(provider, system, user, fetchFn = fetch) {
  let res;
  try {
    res = await fetchFn(`${provider.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.8,
      }),
    });
  } catch {
    throw new Error("Network error reaching the provider. Check the base URL and your connection.");
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error("Authentication failed — check your API key.");
  }
  if (res.status === 429) {
    throw new Error("Rate limited by the provider — slow down or check your plan.");
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Provider error (${res.status}). ${detail}`.trim());
  }

  const data = await res.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new Error("The provider returned an empty or unexpected response.");
  }
  return content;
}

/**
 * Parse JSON out of an LLM response that may be wrapped in prose or ```fences```.
 * @template T
 * @param {string} raw
 * @returns {T|null}
 */
export function parseJson(raw) {
  if (typeof raw !== "string") return null;

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : raw).trim();

  const direct = tryParse(candidate);
  if (direct !== null) return direct;

  const span = firstJsonSpan(candidate);
  if (span) return tryParse(span);

  return null;
}

function tryParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Find the first balanced JSON object/array span, respecting strings/escapes. */
function firstJsonSpan(text) {
  const start = text.search(/[{[]/);
  if (start === -1) return null;

  const open = text[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}
