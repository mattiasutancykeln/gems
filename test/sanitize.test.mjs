import { test } from "node:test";
import assert from "node:assert/strict";
import { stripEmoji } from "../lib/sanitize.mjs";

test("strips pictographs and variation selectors, collapses doubled spaces", () => {
  assert.equal(stripEmoji("Debug \u{1F527} print ⚠️ left"), "Debug print left");
});

test("strips a bare star and trims the leftover space", () => {
  assert.equal(stripEmoji("★ Priority"), "Priority");
});

test("leaves citations unchanged", () => {
  assert.equal(stripEmoji("path/x.py:1-2"), "path/x.py:1-2");
});

test("leaves math glyphs and ordinary punctuation unchanged", () => {
  assert.equal(stripEmoji("∎ mark — a · b … c"), "∎ mark — a · b … c");
});

test("passes through non-string input unchanged", () => {
  assert.equal(stripEmoji(null), null);
  assert.equal(stripEmoji(undefined), undefined);
  assert.equal(stripEmoji(42), 42);
});
