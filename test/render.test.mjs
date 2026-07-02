import { test } from "node:test";
import assert from "node:assert/strict";
import { renderHits, renderEmpty, renderFacets, snippet } from "../lib/render.mjs";

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

test("full block: rank, quality marker, category, id, breadcrumb, citation, license words, issue link", () => {
  const md = renderHits([hit("g21-f007", 21, "c042")], { gemsByNumber });
  assert.match(md, /### 1\. Budget-before-validity check\s+\[high\] pattern · g21-f007/);
  assert.match(md, /SciAgentArena \(gem #21\) · topics: eval/);
  assert.match(md, /`scorers\/oracle_budget\.py:147-153` @ ce27b8c/);
  assert.match(md, /License: none - FORBIDDEN to copy code/);
  assert.match(md, /issues\/21/);
  assert.doesNotMatch(md, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);  // no emojis
});

test("attribution footer recommends citing the single source repo", () => {
  const md = renderHits([hit("g21-f007", 21, "c042")], { gemsByNumber });
  assert.match(md, /Attribution: if you use this finding, credit the source repo: HelloWorldLTY\/SciAgentArena \(https:\/\/github\.com\/HelloWorldLTY\/SciAgentArena\)\./);
  assert.doesNotMatch(md, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
});

test("attribution lists distinct source repos, deduped and sorted, for multiple hits", () => {
  const md = renderHits([
    hit("g21-f007", 21, "c001"),
    hit("g21-f008", 21, "c002", { title: "Second SciAgentArena finding" }),
    hit("g20-f003", 20, "c003", { title: "AutoScientists finding" }),
  ], { gemsByNumber });
  assert.match(md, /credit the source repos: HelloWorldLTY\/SciAgentArena \([^)]+\), mims-harvard\/AutoScientists \([^)]+\)\./);
  // deduped: SciAgentArena appears once in the footer despite two hits
  assert.equal((md.match(/credit the source repos:[^\n]*HelloWorldLTY\/SciAgentArena/g) || []).length, 1);
});

test("attribution falls back to gem issue when a finding has no repo", () => {
  const md = renderHits([hit("g21-f007", 21, "c042", { repo: null })], { gemsByNumber });
  assert.match(md, /Attribution: if you use this finding, credit the source gem: #21 \(https:\/\/github\.com\/mattiasutancykeln\/gems\/issues\/21\)\./);
});

test("cluster with 2+ hits: compare header + compact siblings, nothing dropped", () => {
  const md = renderHits([
    hit("g21-f007", 21, "c042"),
    hit("g20-f003", 20, "c042", { title: "Multi-seed noise gate", citation: "ROLE-GPU.md:916-927" }),
    hit("g20-f009", 20, "c099", { title: "Dead-end registry", clusterLabel: "dead-end registry" }),
  ], { gemsByNumber });
  assert.match(md, /2 takes on "budget-gated verification" - compare:/);
  assert.match(md, /Multi-seed noise gate — g20-f003 · gem #20.*`ROLE-GPU\.md:916-927`/);
  assert.match(md, /Dead-end registry/);                       // singleton still fully rendered
  const full = md.match(/^### \d+\./gm);
  assert.equal(full.length, 2);                                 // 2 full blocks (cluster best + singleton)
});

test("full block shows term-match coverage for short keyword queries but omits it for long claims", () => {
  const shortHit = hit("g21-f007", 21, "c042", { matched: 2, queryTermCount: 4 });
  const mdShort = renderHits([shortHit], { gemsByNumber });
  assert.match(mdShort, /matched 2\/4 terms/);

  const longHit = hit("g21-f008", 21, "c043", { matched: 3, queryTermCount: 9 });
  const mdLong = renderHits([longHit], { gemsByNumber });
  assert.doesNotMatch(mdLong, /matched \d+\/\d+ terms/);
});

test("low-confidence banner fires when the top hit covers less than half the query terms", () => {
  const weakHit = hit("g21-f007", 21, "c042", { matched: 1, queryTermCount: 4 });
  const md = renderHits([weakHit], { gemsByNumber });
  assert.match(md, /^Note: weak matches - the top result covers only 1 of 4 query terms/);

  const strongHit = hit("g21-f009", 21, "c044", { matched: 3, queryTermCount: 4 });
  const mdStrong = renderHits([strongHit], { gemsByNumber });
  assert.doesNotMatch(mdStrong, /weak matches/);
});

test("no banner or term-match note when matched/queryTermCount are absent (gems_get, gems_inspire path)", () => {
  const plain = hit("g21-f007", 21, "c042");
  assert.equal(plain.matched, undefined);
  assert.equal(plain.queryTermCount, undefined);
  const md = renderHits([plain], { gemsByNumber });
  assert.doesNotMatch(md, /weak matches/);
  assert.doesNotMatch(md, /matched \d+\/\d+ terms/);
});

test("empty state leads with retry guidance, then topics, then the human submit link last", () => {
  const md = renderEmpty({ q: "quantum", findings: [hit("g21-f007", 21, "c042")], issueFormUrl: "https://github.com/mattiasutancykeln/gems/issues/new?template=gem.yml" });
  assert.match(md, /^No findings for "quantum"\. Try: remove filters, broaden the query, or call gems_facets for the exact topic\/category\/codeReuse vocabulary\./);
  assert.match(md, /Available topics: eval/);
  const lines = md.trim().split("\n");
  assert.match(lines.at(-1), /^If this is a real gap a human can add it: .*issues\/new\?template=gem\.yml$/);
  assert.doesNotMatch(md, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
});

test("empty state names a filter value with zero findings in the corpus", () => {
  const md = renderEmpty({
    q: "quantum",
    findings: [hit("g21-f007", 21, "c042")],
    issueFormUrl: "https://github.com/mattiasutancykeln/gems/issues/new?template=gem.yml",
    filters: { topic: "quantum-computing" },
  });
  assert.match(md, /No findings in the corpus match topic="quantum-computing"/);
});

test("empty state says nothing extra when the passed filter value exists in the corpus", () => {
  const md = renderEmpty({
    q: "quantum",
    findings: [hit("g21-f007", 21, "c042")],
    issueFormUrl: "https://github.com/mattiasutancykeln/gems/issues/new?template=gem.yml",
    filters: { topic: "eval" },
  });
  assert.doesNotMatch(md, /No findings in the corpus match/);
});

test("snippet truncates at word boundary with ellipsis", () => {
  const s = snippet("alpha beta gamma delta", 12);
  assert.ok(s.length <= 13);
  assert.match(s, /…$/);
  assert.equal(snippet("short", 300), "short");
});

test("renderFacets: compact card - totals, filter dimensions with counts, no cluster/license dump, no emojis", () => {
  const facets = {
    topics: [{ value: "agent", count: 3 }, { value: "eval", count: 1 }],
    categories: [{ value: "pattern", count: 4 }],
    codeReuse: [{ value: "permissive", count: 4 }],
    licenses: [{ value: "MIT", count: 4 }],
    repos: [{ value: "mims-harvard/AutoScientists", count: 2 }],
    clusters: [{ id: "c042", label: "budget-gated verification", size: 3, gems: [8, 20, 21] }],
    totals: { gems: 3, findings: 4, clusters: 2 },
  };
  const md = renderFacets(facets);
  assert.match(md, /3 gems · 4 findings · 2 clusters/);
  assert.match(md, /Filter gems_query \/ gems_ground/);
  assert.match(md, /topics: agent \(3\), eval \(1\)/);
  assert.match(md, /codeReuse: permissive \(4\)/);
  // decluttered: no per-cluster dump, no license section
  assert.doesNotMatch(md, /budget-gated verification/);
  assert.doesNotMatch(md, /Licenses/);
  assert.doesNotMatch(md, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  assert.ok(md.split("\n").length <= 12, `facets card should stay compact, got ${md.split("\n").length} lines`);
});

test("renderFacets: caps the top-source-repos line and notes how many more", () => {
  const repos = Array.from({ length: 25 }, (_, i) => ({ value: `org/repo${i}`, count: 25 - i }));
  const facets = {
    topics: [], categories: [], codeReuse: [], licenses: [],
    repos, clusters: [],
    totals: { gems: 10, findings: 100, clusters: 35 },
  };
  const md = renderFacets(facets);
  assert.match(md, /Top source repos: /);
  assert.match(md, /\.\.\. and 17 more/);   // 25 repos - top 8 shown
});
