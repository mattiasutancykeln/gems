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

test("query hits carry matched and queryTermCount reflecting the tokenized query", () => {
  const r = createRetriever({ findings });
  const hits = r.query({ q: "file locks claim queue" });
  assert.ok(hits.length > 0);
  for (const h of hits) {
    assert.equal(typeof h.matched, "number");
    assert.equal(h.queryTermCount, 4); // file, locks, claim, queue - all distinct, none are stopwords
    assert.ok(h.matched <= h.queryTermCount);
  }
});

test("a gibberish token alongside one real term still surfaces a partial-coverage hit", () => {
  const r = createRetriever({ findings });
  const hits = r.query({ q: "zzzznotarealword claim" });
  assert.ok(hits.length > 0);
  assert.equal(hits[0].queryTermCount, 2);
  assert.equal(hits[0].matched, 1);
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

const facetFindings = [
  F("f1", 1, "A", "a", { topic: ["agent", "eval"], category: "pattern", codeReuse: "permissive", license: "MIT", repo: "a/b", clusterId: "shared", clusterLabel: "shared cluster" }),
  F("f2", 2, "B", "b", { topic: ["agent"], category: "pattern", codeReuse: "forbidden", license: "none", repo: "c/d", clusterId: "shared", clusterLabel: "shared cluster" }),
  F("f3", 1, "C", "c", { topic: ["eval"], category: "weak-spot", codeReuse: "permissive", license: "MIT", repo: "a/b", clusterId: "shared", clusterLabel: "shared cluster" }),
  F("f4", 3, "D", "d", { topic: ["infra"], category: "impl-decision", codeReuse: "ideas-only", license: null, repo: null, clusterId: "solo", clusterLabel: "solo" }),
];

test("facets: topics count once per topic on multi-topic findings, sorted count desc then value asc", () => {
  const r = createRetriever({ findings: facetFindings });
  const { topics } = r.facets();
  assert.deepEqual(topics, [
    { value: "agent", count: 2 },
    { value: "eval", count: 2 },
    { value: "infra", count: 1 },
  ]);
});

test("facets: categories, codeReuse, licenses, repos summarized with sorted counts", () => {
  const r = createRetriever({ findings: facetFindings });
  const facets = r.facets();
  assert.deepEqual(facets.categories, [
    { value: "pattern", count: 2 },
    { value: "impl-decision", count: 1 },
    { value: "weak-spot", count: 1 },
  ]);
  assert.deepEqual(facets.codeReuse, [
    { value: "permissive", count: 2 },
    { value: "forbidden", count: 1 },
    { value: "ideas-only", count: 1 },
  ]);
  assert.deepEqual(facets.licenses, [
    { value: "MIT", count: 2 },
    { value: "none", count: 2 },
  ]);
  assert.deepEqual(facets.repos, [
    { value: "a/b", count: 2 },
    { value: "c/d", count: 1 },
  ]);
});

test("facets: clusters only include size>=2, sorted by size desc then id asc, with distinct gem numbers", () => {
  const r = createRetriever({ findings: facetFindings });
  const { clusters, totals } = r.facets();
  assert.deepEqual(clusters, [
    { id: "shared", label: "shared cluster", size: 3, gems: [1, 2] },
  ]);
  assert.deepEqual(totals, { gems: 3, findings: 4, clusters: 2 });
});

test("get: returns finding with cluster siblings for a clustered id", () => {
  const r = createRetriever({ findings: facetFindings });
  const result = r.get("f1");
  assert.equal(result.finding.id, "f1");
  assert.deepEqual(result.siblings.map((s) => s.id).sort(), ["f2", "f3"]);
});

test("get: returns empty siblings for a singleton", () => {
  const r = createRetriever({ findings: facetFindings });
  const result = r.get("f4");
  assert.equal(result.finding.id, "f4");
  assert.deepEqual(result.siblings, []);
});

test("get: returns null for an unknown id", () => {
  const r = createRetriever({ findings: facetFindings });
  assert.equal(r.get("nope"), null);
});
