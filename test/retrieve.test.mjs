import { test } from "node:test";
import assert from "node:assert/strict";
import { createRetriever } from "../lib/retrieve.mjs";

const F = (id, gem, title, text, extra = {}) => ({
  id, gem, title, text, citation: "x.py:1-2", citations: ["x.py:1-2"],
  category: "pattern", topic: ["agent"], license: "MIT", codeReuse: "permissive",
  quality: "normal", clusterId: id, clusterLabel: title, repo: "a/b", sha: "1234567", ...extra,
});

const findings = [
  F("g1-f001", 1, "Optimistic file-lock claim queue", "workers claim jobs via file locks", { quality: "high" }),
  F("g1-f002", 1, "Dead-end registry", "persist failed directions negative knowledge"),
  F("g2-f001", 2, "Queue-and-claim file locks", "claim queued experiments with file locks", { topic: ["eval"] }),
  F("g3-f001", 3, "Champion record", "best model hyperparameters reproducible", { codeReuse: "forbidden", license: "none" }),
];

test("query ranks lexical match first and respects k", () => {
  const r = createRetriever({ findings });
  const hits = r.query({ q: "file locks claim queue", k: 2 });
  assert.equal(hits.length, 2);
  assert.ok(["g1-f001", "g2-f001"].includes(hits[0].id));
  assert.ok(hits[0].score > 0);
});

test("query metadata filters compose", () => {
  const r = createRetriever({ findings });
  assert.deepEqual(r.query({ q: "file locks", topic: "eval" }).map((h) => h.id), ["g2-f001"]);
  assert.deepEqual(r.query({ q: "champion hyperparameters", codeReuse: "forbidden" }).map((h) => h.id), ["g3-f001"]);
  assert.deepEqual(r.query({ q: "file locks", quality: "high" }).map((h) => h.id), ["g1-f001"]);
});

test("query never dedups near-identical hits", () => {
  const r = createRetriever({ findings });
  const ids = r.query({ q: "file locks claim" }).map((h) => h.id);
  assert.ok(ids.includes("g1-f001") && ids.includes("g2-f001"));
});

test("ground defaults to k=6 and uses claim text", () => {
  const r = createRetriever({ findings });
  const hits = r.ground({ claim: "we should persist failed directions" });
  assert.equal(hits[0].id, "g1-f002");
});

test("inspire is gem-diverse and deterministic with rng=()=>0", () => {
  const r = createRetriever({ findings });
  const hits = r.inspire({ k: 3, rng: () => 0 });
  assert.equal(hits.length, 3);
  assert.equal(new Set(hits.map((h) => h.gem)).size, 3);       // one per gem
  assert.equal(hits[0].id, "g1-f001");                          // quality high gem first
  assert.deepEqual(hits, r.inspire({ k: 3, rng: () => 0 }));    // deterministic
});

test("inspire topic filter", () => {
  const r = createRetriever({ findings });
  const hits = r.inspire({ topic: "eval", k: 5, rng: () => 0 });
  assert.deepEqual(hits.map((h) => h.id), ["g2-f001"]);
});
