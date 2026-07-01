import { test } from "node:test";
import assert from "node:assert/strict";
import { tokenize, buildIndex, search } from "../lib/bm25.mjs";

const docs = [
  { id: "a", text: "optimistic file lock claim queue for parallel workers" },
  { id: "b", text: "champion record stores hyperparameters and training instructions" },
  { id: "c", text: "file lock retry with exponential backoff" },
];

test("tokenize lowercases and strips punctuation", () => {
  assert.deepEqual(tokenize("File-lock, CLAIM queue!"), ["file", "lock", "claim", "queue"]);
});

test("relevant doc ranks first", () => {
  const idx = buildIndex(docs);
  const hits = search(idx, "file lock queue");
  assert.equal(hits[0].id, "a");
  assert.ok(hits[0].score > hits.at(-1).score);
});

test("k limits results; empty query returns none", () => {
  const idx = buildIndex(docs);
  assert.equal(search(idx, "file lock", 1).length, 1);
  assert.deepEqual(search(idx, ""), []);
  assert.deepEqual(search(idx, "zzz qqq"), []);
});

test("deterministic tie-break by id", () => {
  const idx = buildIndex([{ id: "b", text: "same words" }, { id: "a", text: "same words" }]);
  assert.deepEqual(search(idx, "same words").map((h) => h.id), ["a", "b"]);
});
