import type { Provider } from "./types";

/**
 * Direct browser -> provider chat call against any OpenAI-compatible
 * `/chat/completions` endpoint. The key is sent only to the provider the user
 * configured; it never touches a server we control.
 */
export async function chat(
  provider: Provider,
  system: string,
  user: string,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${provider.baseUrl.replace(/\/$/, "")}/chat/completions`, {
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
    throw new Error(
      "Network error reaching the provider. Check the base URL and your connection.",
    );
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

/** A chat function shape, so engine functions can be tested without a network. */
export type ChatFn = (
  provider: Provider,
  system: string,
  user: string,
) => Promise<string>;

/**
 * Parse JSON out of an LLM response that may be wrapped in prose or ```fences```.
 * Returns the parsed value, or `null` if nothing parseable is found.
 */
export function parseJson<T>(raw: string): T | null {
  if (typeof raw !== "string") return null;

  // 1. Strip a fenced code block if present (```json ... ``` or ``` ... ```).
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : raw).trim();

  // 2. Try a direct parse first.
  const direct = tryParse<T>(candidate);
  if (direct !== null) return direct;

  // 3. Fall back to the first balanced { ... } or [ ... ] span.
  const span = firstJsonSpan(candidate);
  if (span) return tryParse<T>(span);

  return null;
}

function tryParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Find the first balanced JSON object/array span, respecting strings/escapes. */
function firstJsonSpan(text: string): string | null {
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
