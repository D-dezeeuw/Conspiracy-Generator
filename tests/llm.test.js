import { test } from "node:test";
import assert from "node:assert/strict";
import { chat, parseJson } from "../llm.js";

const provider = { baseUrl: "https://example.test/api/v1", model: "test-model", apiKey: "secret" };

test("parseJson parses a bare object", () => {
  assert.deepEqual(parseJson('{"a": 1}'), { a: 1 });
});

test("parseJson parses a ```json fence wrapped in prose", () => {
  const raw = 'Here:\n```json\n{"categoryId":"x","reasoning":"y"}\n```\nthanks';
  assert.deepEqual(parseJson(raw), { categoryId: "x", reasoning: "y" });
});

test("parseJson parses a plain fence", () => {
  assert.deepEqual(parseJson("```\n{\"a\":[1,2]}\n```"), { a: [1, 2] });
});

test("parseJson extracts the first balanced object from prose", () => {
  const raw = 'Sure. {"headline":"H","claims":[{"text":"t","basedOn":"F1"}]} done.';
  assert.deepEqual(parseJson(raw), { headline: "H", claims: [{ text: "t", basedOn: "F1" }] });
});

test("parseJson is not confused by braces inside strings", () => {
  assert.deepEqual(parseJson('{"body":"a } brace { in text","n":2}'), { body: "a } brace { in text", n: 2 });
});

test("parseJson parses a top-level array", () => {
  assert.deepEqual(parseJson("[1,2,3]"), [1, 2, 3]);
});

test("parseJson returns null when there is no JSON", () => {
  assert.equal(parseJson("no json here"), null);
  assert.equal(parseJson(""), null);
});

function mockFetch(status, body) {
  return async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

test("chat returns the assistant message content on success", async () => {
  const f = mockFetch(200, { choices: [{ message: { content: "hello" } }] });
  assert.equal(await chat(provider, "sys", "usr", f), "hello");
});

test("chat calls the correct URL with auth header", async () => {
  let captured;
  const f = async (url, init) => {
    captured = { url, init };
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "ok" } }] }), text: async () => "" };
  };
  await chat(provider, "sys", "usr", f);
  assert.equal(captured.url, "https://example.test/api/v1/chat/completions");
  assert.equal(captured.init.headers.Authorization, "Bearer secret");
});

test("chat throws a clear auth error on 401", async () => {
  await assert.rejects(() => chat(provider, "s", "u", mockFetch(401, {})), /Authentication failed/);
});

test("chat throws a rate-limit error on 429", async () => {
  await assert.rejects(() => chat(provider, "s", "u", mockFetch(429, {})), /Rate limited/);
});

test("chat throws when the response shape is unexpected", async () => {
  await assert.rejects(() => chat(provider, "s", "u", mockFetch(200, { nope: true })), /unexpected response/);
});
