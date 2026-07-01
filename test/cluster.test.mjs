import { test } from "node:test";
import assert from "node:assert/strict";
import { clusterFindings } from "../lib/cluster.mjs";

const mk = (id, gem, title, text, quality = "normal") => ({ id, gem, title, text, quality });

test("near-duplicate findings across gems share a cluster", () => {
  const a = mk("g1-f001", 1, "Optimistic file-lock claim queue",
    "workers claim queued experiments via optimistic file locks atomic rename to avoid duplicate parallel work", "high");
  const b = mk("g2-f001", 2, "Queue-and-claim via optimistic file locks",
    "experiment workers claim queued jobs with optimistic file locks and atomic rename avoiding duplicate parallel work");
  const c = mk("g3-f001", 3, "Champion promotion record",
    "champion record stores best model hyperparameters and reproducible training instructions promotion gated");
  const out = clusterFindings([a, b, c]);
  assert.equal(out[0].clusterId, out[1].clusterId);
  assert.notEqual(out[0].clusterId, out[2].clusterId);
});

test("label prefers quality high member", () => {
  const a = mk("g1-f001", 1, "Optimistic file-lock claim queue",
    "workers claim queued experiments via optimistic file locks atomic rename to avoid duplicate parallel work", "high");
  const b = mk("g2-f001", 2, "Queue-and-claim via optimistic file locks",
    "experiment workers claim queued jobs with optimistic file locks and atomic rename avoiding duplicate parallel work");
  const out = clusterFindings([a, b]);
  assert.equal(out[0].clusterLabel, "Optimistic file-lock claim queue");
});

test("deterministic across runs and order-stable output", () => {
  const items = [
    mk("g1-f001", 1, "A pattern", "alpha beta gamma delta epsilon zeta"),
    mk("g2-f001", 2, "B pattern", "one two three four five six"),
  ];
  const r1 = clusterFindings(items);
  const r2 = clusterFindings(items);
  assert.deepEqual(r1, r2);
  assert.deepEqual(r1.map((f) => f.id), ["g1-f001", "g2-f001"]);
});

test("singletons get their own cluster", () => {
  const out = clusterFindings([
    mk("g1-f001", 1, "X", "completely unrelated text about sandboxes and bubblewrap"),
    mk("g2-f001", 2, "Y", "totally different content about citation freshness and dags"),
  ]);
  assert.notEqual(out[0].clusterId, out[1].clusterId);
});

test("short texts do not crash (fewer tokens than shingle size)", () => {
  const out = clusterFindings([mk("g1-f001", 1, "Tiny", "one two")]);
  assert.equal(out.length, 1);
  assert.ok(out[0].clusterId);
});
