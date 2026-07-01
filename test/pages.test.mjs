import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify, gemPageName, renderGemPage, renderCatalog, injectStats, setGemTitles } from "../lib/pages.mjs";

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
  assert.match(md, /Other takes: \[gem #20\]\(0020-autoscientists\.md\)/);
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
