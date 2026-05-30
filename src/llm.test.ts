import { describe, it, expect, vi } from "vitest";
import { chat, parseJson } from "./llm";
import type { Provider } from "./types";

const provider: Provider = {
  baseUrl: "https://example.test/api/v1",
  model: "test-model",
  apiKey: "secret",
};

describe("parseJson", () => {
  it("parses a bare JSON object", () => {
    expect(parseJson<{ a: number }>('{"a": 1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in a ```json fence", () => {
    const raw = 'Here you go:\n```json\n{"categoryId": "x", "reasoning": "y"}\n```\nthanks';
    expect(parseJson(raw)).toEqual({ categoryId: "x", reasoning: "y" });
  });

  it("parses JSON wrapped in a plain fence", () => {
    expect(parseJson('```\n{"a": [1, 2]}\n```')).toEqual({ a: [1, 2] });
  });

  it("extracts the first balanced object from surrounding prose", () => {
    const raw = 'Sure. {"headline": "H", "claims": [{"text": "t", "basedOn": "F1"}]} done.';
    expect(parseJson(raw)).toEqual({
      headline: "H",
      claims: [{ text: "t", basedOn: "F1" }],
    });
  });

  it("does not get confused by braces inside strings", () => {
    const raw = '{"body": "a } brace { in text", "n": 2}';
    expect(parseJson(raw)).toEqual({ body: "a } brace { in text", n: 2 });
  });

  it("parses a top-level array", () => {
    expect(parseJson("[1, 2, 3]")).toEqual([1, 2, 3]);
  });

  it("returns null when there is no JSON", () => {
    expect(parseJson("no json here")).toBeNull();
    expect(parseJson("")).toBeNull();
  });
});

describe("chat", () => {
  function mockFetch(status: number, body: unknown) {
    return vi.fn(async () => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    })) as unknown as typeof fetch;
  }

  it("returns the assistant message content on success", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(200, { choices: [{ message: { content: "hello" } }] }),
    );
    await expect(chat(provider, "sys", "usr")).resolves.toBe("hello");
    vi.unstubAllGlobals();
  });

  it("calls the correct /chat/completions URL with auth header", async () => {
    const f = mockFetch(200, { choices: [{ message: { content: "ok" } }] });
    vi.stubGlobal("fetch", f);
    await chat(provider, "sys", "usr");
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://example.test/api/v1/chat/completions");
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer secret",
    });
    vi.unstubAllGlobals();
  });

  it("throws a clear auth error on 401", async () => {
    vi.stubGlobal("fetch", mockFetch(401, {}));
    await expect(chat(provider, "s", "u")).rejects.toThrow(/Authentication failed/);
    vi.unstubAllGlobals();
  });

  it("throws a rate-limit error on 429", async () => {
    vi.stubGlobal("fetch", mockFetch(429, {}));
    await expect(chat(provider, "s", "u")).rejects.toThrow(/Rate limited/);
    vi.unstubAllGlobals();
  });

  it("throws when the response shape is unexpected", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { nope: true }));
    await expect(chat(provider, "s", "u")).rejects.toThrow(/unexpected response/);
    vi.unstubAllGlobals();
  });
});
