import { test } from "node:test";
import assert from "node:assert/strict";
import { stripEmoji } from "../lib/sanitize.mjs";

test("strips pictographs and variation selectors, collapses doubled spaces", () => {
  assert.equal(stripEmoji("Debug \u{1F527} print ⚠️ left"), "Debug print left");
});

test("transliterates a bare star instead of deleting it", () => {
  assert.equal(stripEmoji("★ Priority"), "* Priority");
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

// Regression: arrows and star ratings are load-bearing in finding prose —
// stripping them corrupts meaning (e.g. "PDF→PNG" -> "PDFPNG"). They must be
// transliterated to the project's existing ASCII conventions instead.
test("transliterates a bare arrow to the project's ASCII arrow with no added spaces", () => {
  assert.equal(stripEmoji("PDF→PNG"), "PDF->PNG");
});

test("transliterates a spaced arrow, preserving the surrounding spacing", () => {
  assert.equal(stripEmoji("File-type → skill mapping"), "File-type -> skill mapping");
});

test("transliterates a 3-tier star rating to filled/empty ASCII markers", () => {
  assert.equal(stripEmoji("grades ★★★/★★☆/★☆☆"), "grades ***/**o/*oo");
});

test("transliterates checklist check/cross marks to x/-", () => {
  assert.equal(stripEmoji("[✓] done [✗] failed"), "[x] done [-] failed");
});

test("pure decorative emoji still strip cleanly with single spaces left behind", () => {
  assert.equal(stripEmoji("Debug 🔧 print ⚠️ left"), "Debug print left");
});

test("pass-through: dot separator, em dash, ellipsis untouched", () => {
  assert.equal(stripEmoji("a · b — c … d"), "a · b — c … d");
});

test("pass-through: qed mark untouched", () => {
  assert.equal(stripEmoji("∎"), "∎");
});

test("pass-through: math operators untouched", () => {
  assert.equal(stripEmoji("∑ ∫ ≤ ≥"), "∑ ∫ ≤ ≥");
});

test("pass-through: file citation untouched", () => {
  assert.equal(stripEmoji("x/y.py:1-2"), "x/y.py:1-2");
});

test("pass-through: plain ASCII prose with ++/%/: untouched", () => {
  assert.equal(stripEmoji("C++ & Rust: 100% done"), "C++ & Rust: 100% done");
});
