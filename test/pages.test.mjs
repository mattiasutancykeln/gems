import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify, gemPageName, renderGemPage, renderCatalog, renderIndexPages, injectStats, setGemTitles } from "../lib/pages.mjs";

const gem = { number: 21, title: "SciAgentArena — benchmarking AI agents", url: "https://arxiv.org/abs/2606.12736",
  repo: "HelloWorldLTY/SciAgentArena", sha: "ce27b8c", source: "paper", topics: ["eval"], verdict: "keep",
  quality: "high", stage: "extracted", license: "none", codeReuse: "forbidden", findingCount: 2 };
const gem20 = { ...gem, number: 20, title: "AutoScientists", repo: "mims-harvard/AutoScientists",
  license: "MIT", codeReuse: "permissive" };
const f = (id, gemNo, cluster, title) => ({ id, gem: gemNo, repo: "r", sha: "s", citation: "a.py:1-2",
  citations: [], category: "pattern", topic: ["eval"], license: "none", codeReuse: "forbidden",
  quality: "high", clusterId: cluster, clusterLabel: "budget gating", title, text: "text about " + title });
const all = [f("g21-f001", 21, "c001", "Budget check"), f("g20-f001", 20, "c001", "Noise gate"),
  f("g21-f002", 21, "c002", "Waterfall")];

test("slugify + page name", () => {
  assert.equal(slugify("SciAgentArena — benchmarking AI agents"), "sciagentarena-benchmarking-ai-agents");
  assert.equal(gemPageName(gem), "0021-sciagentarena-benchmarking-ai-agents.md");
});

test("gem page: metadata, anchors, cross-gem takes, no emojis", () => {
  setGemTitles([gem20, gem]);   // sync always sets titles before rendering pages
  const md = renderGemPage(gem, all.filter((x) => x.gem === 21), all);
  assert.match(md, /\| Source \| https:\/\/arxiv\.org/);
  assert.match(md, /\| License \| none \(forbidden\) \|/);
  assert.match(md, /<a id="g21-f001"><\/a>/);
  assert.match(md, /Other takes: \[gem #20\]\(0020-autoscientists\.md#g20-f001\)/);
  assert.match(md, /issues\/21/);
  assert.doesNotMatch(md, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
});

test("catalog: highlights lead with multi-gem clusters, then full table", () => {
  const md = renderCatalog([gem20, gem], all);
  assert.match(md, /## Highlights/);
  assert.match(md, /2 takes on "budget gating"/);
  assert.match(md, /\| \[#21\]\(https:.*issues\/21\) \| \[SciAgentArena/);
  assert.match(md, /\| none \(forbidden\) \|/);
  const highlightsIdx = md.indexOf("## Highlights"), tableIdx = md.indexOf("| # |");
  assert.ok(highlightsIdx < tableIdx);
});

test("injectStats replaces between markers only", () => {
  const readme = "# gems\n<!-- stats:start -->old<!-- stats:end -->\ntail";
  const out = injectStats(readme, { gems: 21, findings: 412, clusters: 37 });
  assert.match(out, /21 gems · 412 findings · 37 clusters/);
  assert.match(out, /tail$/);
  assert.doesNotMatch(out, /old/);
});

// ---- renderIndexPages ----

const idxGems = [gem20, gem];
const idxFindings = [
  { id: "g21-f001", gem: 21, repo: "HelloWorldLTY/SciAgentArena", sha: "s", citation: "a.py:1-2",
    category: "pattern", topic: ["eval", "agent"], license: "none", codeReuse: "forbidden",
    quality: "high", clusterId: "c001", clusterLabel: "budget gating", title: "Budget check", text: "t" },
  { id: "g20-f001", gem: 20, repo: "mims-harvard/AutoScientists", sha: "s", citation: null,
    category: "pattern", topic: ["agent"], license: "none", codeReuse: "forbidden",
    quality: "high", clusterId: "c001", clusterLabel: "budget gating", title: "Noise gate", text: "t" },
  { id: "g21-f002", gem: 21, repo: "HelloWorldLTY/SciAgentArena", sha: "s", citation: "b.py:1-2",
    category: "highlight", topic: [], license: "none", codeReuse: "forbidden",
    quality: "high", clusterId: "c002", clusterLabel: "solo", title: "Untagged finding", text: "t" },
];

test("renderIndexPages: returns exactly the five expected pages", () => {
  setGemTitles(idxGems);
  const pages = renderIndexPages(idxGems, idxFindings);
  assert.deepEqual(Object.keys(pages).sort(),
    ["INDEX.md", "by-category.md", "by-cluster.md", "by-source.md", "by-topic.md"]);
});

test("by-topic: multi-topic finding listed under both topics, untagged finding under (untagged)", () => {
  setGemTitles(idxGems);
  const md = renderIndexPages(idxGems, idxFindings)["by-topic.md"];
  assert.match(md, /## agent \(2\)/);
  assert.match(md, /## eval \(1\)/);
  assert.match(md, /## \(untagged\) \(1\)/);
  const agentIdx = md.indexOf("## agent");
  const evalIdx = md.indexOf("## eval");
  const untaggedIdx = md.indexOf("## (untagged)");
  assert.ok(agentIdx < evalIdx && evalIdx < untaggedIdx, "topics sorted alpha, untagged last");
  const agentSection = md.slice(agentIdx, evalIdx);
  assert.match(agentSection, /Budget check/);
  assert.match(agentSection, /Noise gate/);
  const evalSection = md.slice(evalIdx, untaggedIdx);
  assert.match(evalSection, /Budget check/);
  const untaggedSection = md.slice(untaggedIdx);
  assert.match(untaggedSection, /Untagged finding/);
});

test("by-category: canonical category order, not source order", () => {
  setGemTitles(idxGems);
  const md = renderIndexPages(idxGems, idxFindings)["by-category.md"];
  const patternIdx = md.indexOf("## Patterns worth porting");
  const highlightIdx = md.indexOf("## Highlights");
  assert.ok(patternIdx >= 0 && highlightIdx >= 0 && patternIdx < highlightIdx);
});

test("by-source: groups findings under owner/repo with gem links and counts", () => {
  setGemTitles(idxGems);
  const md = renderIndexPages(idxGems, idxFindings)["by-source.md"];
  assert.match(md, /## HelloWorldLTY\/SciAgentArena \(2\)/);
  assert.match(md, /## mims-harvard\/AutoScientists \(1\)/);
  assert.match(md, /\[gem #21\]\(gems\/0021-sciagentarena-benchmarking-ai-agents\.md\)/);
  assert.match(md, /https:\/\/github\.com\/HelloWorldLTY\/SciAgentArena/);
});

test("by-source: repos sorted by finding-count desc, then repo name asc", () => {
  setGemTitles(idxGems);
  const md = renderIndexPages(idxGems, idxFindings)["by-source.md"];
  // HelloWorldLTY/SciAgentArena has 2 findings, mims-harvard/AutoScientists has 1 -
  // count-desc must win over alphabetical (mims-harvard sorts before HelloWorldLTY).
  const heavyIdx = md.indexOf("## HelloWorldLTY/SciAgentArena");
  const lightIdx = md.indexOf("## mims-harvard/AutoScientists");
  assert.ok(heavyIdx >= 0 && lightIdx >= 0 && heavyIdx < lightIdx,
    "higher finding-count repo must appear first even though its name sorts later");
});

test("renderIndexPages: resolves gem links without requiring caller to pre-call setGemTitles", () => {
  setGemTitles([]); // simulate stale/empty global title map from an unrelated earlier call
  const md = renderIndexPages(idxGems, idxFindings)["by-topic.md"];
  assert.match(md, /\[Budget check\]\(gems\/0021-sciagentarena-benchmarking-ai-agents\.md#g21-f001\)/);
});

test("by-cluster: only clusters with size>=2, sorted size desc then clusterId asc", () => {
  setGemTitles(idxGems);
  const md = renderIndexPages(idxGems, idxFindings)["by-cluster.md"];
  assert.match(md, /## budget gating \(2 findings across gems #20, #21\)/);
  assert.doesNotMatch(md, /solo/); // clusterId c002 has only 1 member, excluded
});

test("INDEX.md links to catalog and all four sibling index pages", () => {
  setGemTitles(idxGems);
  const md = renderIndexPages(idxGems, idxFindings)["INDEX.md"];
  assert.match(md, /\[Catalog\]\(\.\.\/CATALOG\.md\)/);
  assert.match(md, /\[By topic\]\(by-topic\.md\)/);
  assert.match(md, /\[By source repo\]\(by-source\.md\)/);
  assert.match(md, /\[By category\]\(by-category\.md\)/);
  assert.match(md, /\[Cross-gem clusters\]\(by-cluster\.md\)/);
  assert.match(md, /2 gems · 3 findings · 2 clusters/);
});

test("renderIndexPages: no emojis in any page", () => {
  setGemTitles(idxGems);
  const pages = renderIndexPages(idxGems, idxFindings);
  for (const [name, md] of Object.entries(pages))
    assert.doesNotMatch(md, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, `emoji found in ${name}`);
});
