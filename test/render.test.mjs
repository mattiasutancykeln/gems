import { test } from "node:test";
import assert from "node:assert/strict";
import { renderHits, renderEmpty, snippet } from "../lib/render.mjs";

const gemsByNumber = new Map([
  [20, { number: 20, title: "AutoScientists" }],
  [21, { number: 21, title: "SciAgentArena" }],
]);

const hit = (id, gem, cluster, over = {}) => ({
  id, gem, repo: gem === 20 ? "mims-harvard/AutoScientists" : "HelloWorldLTY/SciAgentArena",
  sha: "ce27b8c", citation: "scorers/oracle_budget.py:147-153", citations: [],
  category: "pattern", topic: ["eval"], license: gem === 20 ? "MIT" : "none",
  codeReuse: gem === 20 ? "permissive" : "forbidden", quality: "high",
  clusterId: cluster, clusterLabel: "budget-gated verification",
  title: "Budget-before-validity check", text: "Budget check runs before validity so over-budget runs are zeroed.",
  score: 3.2, ...over,
});

test("full block: rank, quality marker, category, breadcrumb, citation, license words, issue link", () => {
  const md = renderHits([hit("g21-f007", 21, "c042")], { gemsByNumber });
  assert.match(md, /### 1\. Budget-before-validity check\s+\[high\] pattern/);
  assert.match(md, /SciAgentArena \(gem #21\) · topics: eval/);
  assert.match(md, /`scorers\/oracle_budget\.py:147-153` @ ce27b8c/);
  assert.match(md, /License: none - FORBIDDEN to copy code/);
  assert.match(md, /issues\/21/);
  assert.doesNotMatch(md, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);  // no emojis
});

test("cluster with 2+ hits: compare header + compact siblings, nothing dropped", () => {
  const md = renderHits([
    hit("g21-f007", 21, "c042"),
    hit("g20-f003", 20, "c042", { title: "Multi-seed noise gate", citation: "ROLE-GPU.md:916-927" }),
    hit("g20-f009", 20, "c099", { title: "Dead-end registry", clusterLabel: "dead-end registry" }),
  ], { gemsByNumber });
  assert.match(md, /2 takes on "budget-gated verification" - compare:/);
  assert.match(md, /Multi-seed noise gate .* `ROLE-GPU\.md:916-927`/);
  assert.match(md, /Dead-end registry/);                       // singleton still fully rendered
  const full = md.match(/^### \d+\./gm);
  assert.equal(full.length, 2);                                 // 2 full blocks (cluster best + singleton)
});

test("empty state is actionable", () => {
  const md = renderEmpty({ q: "quantum", findings: [hit("g21-f007", 21, "c042")], issueFormUrl: "https://github.com/mattiasutancykeln/gems/issues/new?template=gem.yml" });
  assert.match(md, /No findings for "quantum"/);
  assert.match(md, /Available topics: eval/);
  assert.match(md, /issues\/new\?template=gem\.yml/);
});

test("snippet truncates at word boundary with ellipsis", () => {
  const s = snippet("alpha beta gamma delta", 12);
  assert.ok(s.length <= 13);
  assert.match(s, /…$/);
  assert.equal(snippet("short", 300), "short");
});
