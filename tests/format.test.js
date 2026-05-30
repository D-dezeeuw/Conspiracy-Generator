import { test } from "node:test";
import assert from "node:assert/strict";
import { toParagraphs } from "../format.js";

test("toParagraphs splits on blank lines", () => {
  assert.deepEqual(toParagraphs("one\n\ntwo"), ["one", "two"]);
});

test("toParagraphs trims and drops empties", () => {
  assert.deepEqual(toParagraphs("  a  \n\n\n\n  b  \n\n"), ["a", "b"]);
});

test("toParagraphs returns [] for whitespace-only input", () => {
  assert.deepEqual(toParagraphs("\n\n  \n"), []);
});

test("toParagraphs keeps a single paragraph intact", () => {
  assert.deepEqual(toParagraphs("just one line"), ["just one line"]);
});
