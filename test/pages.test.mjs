import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify, gemPageName, renderGemPage, renderCatalog, renderIndexPages, oversizedPages, injectStats, setGemTitles } from "../lib/pages.mjs";

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

test("renderIndexPages: returns hub pages plus per-value shard files under by-topic/, by-source/, by-category/", () => {
  setGemTitles(idxGems);
  const pages = renderIndexPages(idxGems, idxFindings);
  const keys = Object.keys(pages).sort();
  // hubs
  for (const hub of ["INDEX.md", "by-category.md", "by-cluster.md", "by-source.md", "by-topic.md"])
    assert.ok(keys.includes(hub), `missing hub ${hub}`);
  // topic shards: idxFindings carry topics "eval" and "agent"
  assert.ok(keys.includes("by-topic/eval.md"));
  assert.ok(keys.includes("by-topic/agent.md"));
  // the untagged finding (topic: []) gets its own shard
  assert.ok(keys.includes("by-topic/untagged.md"));
  // source shards: one per repo
  assert.ok(keys.includes("by-source/hellowworldlty-sciagentarena.md") ||
    keys.some((k) => k.startsWith("by-source/") && k.toLowerCase().includes("sciagentarena")));
  assert.ok(keys.some((k) => k.startsWith("by-category/") && k.endsWith(".md")));
});

test("by-topic hub: multi-topic finding counted in each topic shard, links to shard files, untagged listed last", () => {
  setGemTitles(idxGems);
  const pages = renderIndexPages(idxGems, idxFindings);
  const hub = pages["by-topic.md"];
  assert.match(hub, /\[agent\]\(by-topic\/agent\.md\) \(2\)/);
  assert.match(hub, /\[eval\]\(by-topic\/eval\.md\) \(1\)/);
  assert.match(hub, /\[\(untagged\)\]\(by-topic\/untagged\.md\) \(1\)/);
  const agentIdx = hub.indexOf("[agent]");
  const evalIdx = hub.indexOf("[eval]");
  const untaggedIdx = hub.indexOf("[(untagged)]");
  assert.ok(agentIdx < evalIdx && evalIdx < untaggedIdx, "topics sorted alpha, untagged last");

  // "Budget check" carries topic ["eval", "agent"] -> appears in both shards
  assert.match(pages["by-topic/agent.md"], /Budget check/);
  assert.match(pages["by-topic/agent.md"], /Noise gate/);
  assert.match(pages["by-topic/eval.md"], /Budget check/);
  assert.match(pages["by-topic/untagged.md"], /Untagged finding/);
});

test("by-topic hub/shards: case-variant topic labels merge into one shard instead of overwriting", () => {
  setGemTitles(idxGems);
  const caseVariantFindings = [
    { id: "g21-f010", gem: 21, repo: "HelloWorldLTY/SciAgentArena", sha: "s", citation: "a.py:1-2",
      category: "pattern", topic: ["Agent"], license: "none", codeReuse: "forbidden",
      quality: "high", clusterId: "c010", clusterLabel: "case a", title: "Upper-case topic finding", text: "t" },
    { id: "g20-f010", gem: 20, repo: "mims-harvard/AutoScientists", sha: "s", citation: null,
      category: "pattern", topic: ["agent"], license: "none", codeReuse: "forbidden",
      quality: "high", clusterId: "c011", clusterLabel: "case b", title: "Lower-case topic finding", text: "t" },
  ];
  const pages = renderIndexPages(idxGems, caseVariantFindings);
  const keys = Object.keys(pages);

  // (a) exactly one by-topic/agent.md shard - no case-collision file
  const agentShardKeys = keys.filter((k) => k.startsWith("by-topic/") && k.toLowerCase() === "by-topic/agent.md");
  assert.equal(agentShardKeys.length, 1, "expected exactly one merged agent shard");
  assert.ok(keys.includes("by-topic/agent.md"));

  // (b) the shard contains findings from BOTH labels - neither dropped
  const shard = pages["by-topic/agent.md"];
  assert.match(shard, /Upper-case topic finding/);
  assert.match(shard, /Lower-case topic finding/);

  // (c) the hub has a single entry linking to it with the merged count
  const hub = pages["by-topic.md"];
  const hubMatches = [...hub.matchAll(/\(by-topic\/agent\.md\)/g)];
  assert.equal(hubMatches.length, 1, "expected a single hub entry for the merged shard");
  assert.match(hub, /\(by-topic\/agent\.md\) \(2\)/);
});

test("by-topic shard: finding links use ../gems/ (one directory deeper than corpus root)", () => {
  setGemTitles(idxGems);
  const shard = renderIndexPages(idxGems, idxFindings)["by-topic/agent.md"];
  assert.match(shard, /\[Budget check\]\(\.\.\/gems\/0021-sciagentarena-benchmarking-ai-agents\.md#g21-f001\)/);
});

test("by-category hub: canonical category order, not source order; shards hold one-liners", () => {
  setGemTitles(idxGems);
  const pages = renderIndexPages(idxGems, idxFindings);
  const hub = pages["by-category.md"];
  const patternIdx = hub.indexOf("Patterns worth porting");
  const highlightIdx = hub.indexOf("Highlights");
  assert.ok(patternIdx >= 0 && highlightIdx >= 0 && patternIdx < highlightIdx);
  assert.match(hub, /\(by-category\/pattern\.md\)/);
  assert.match(hub, /\(by-category\/highlight\.md\)/);
  assert.match(pages["by-category/pattern.md"], /Budget check/);
  assert.match(pages["by-category/pattern.md"], /\.\.\/gems\//);
});

test("by-source hub: repos linked with count, github link, and shard link", () => {
  setGemTitles(idxGems);
  const hub = renderIndexPages(idxGems, idxFindings)["by-source.md"];
  assert.match(hub, /\[HelloWorldLTY\/SciAgentArena\]\(https:\/\/github\.com\/HelloWorldLTY\/SciAgentArena\) \(2\) -> \[findings\]\(by-source\//);
  assert.match(hub, /\[mims-harvard\/AutoScientists\]\(https:\/\/github\.com\/mims-harvard\/AutoScientists\) \(1\) -> \[findings\]\(by-source\//);
});

test("by-source hub: repos sorted by finding-count desc, then repo name asc", () => {
  setGemTitles(idxGems);
  const hub = renderIndexPages(idxGems, idxFindings)["by-source.md"];
  // HelloWorldLTY/SciAgentArena has 2 findings, mims-harvard/AutoScientists has 1 -
  // count-desc must win over alphabetical (mims-harvard sorts before HelloWorldLTY).
  const heavyIdx = hub.indexOf("HelloWorldLTY/SciAgentArena");
  const lightIdx = hub.indexOf("mims-harvard/AutoScientists");
  assert.ok(heavyIdx >= 0 && lightIdx >= 0 && heavyIdx < lightIdx,
    "higher finding-count repo must appear first even though its name sorts later");
});

test("by-source shard: one-liners for the repo, gem links use ../gems/", () => {
  setGemTitles(idxGems);
  const pages = renderIndexPages(idxGems, idxFindings);
  const repoShard = Object.entries(pages).find(([k]) => k.startsWith("by-source/") && k.toLowerCase().includes("sciagentarena"))[1];
  assert.match(repoShard, /Budget check/);
  assert.match(repoShard, /Untagged finding/);
  assert.match(repoShard, /\.\.\/gems\/0021-sciagentarena-benchmarking-ai-agents\.md/);
});

test("renderIndexPages: resolves gem links without requiring caller to pre-call setGemTitles", () => {
  setGemTitles([]); // simulate stale/empty global title map from an unrelated earlier call
  const shard = renderIndexPages(idxGems, idxFindings)["by-topic/agent.md"];
  assert.match(shard, /\[Budget check\]\(\.\.\/gems\/0021-sciagentarena-benchmarking-ai-agents\.md#g21-f001\)/);
});

test("by-cluster: unchanged single file, only clusters with size>=2, sorted size desc then clusterId asc", () => {
  setGemTitles(idxGems);
  const pages = renderIndexPages(idxGems, idxFindings);
  const md = pages["by-cluster.md"];
  assert.match(md, /## budget gating \(2 findings across gems #20, #21\)/);
  assert.doesNotMatch(md, /solo/); // clusterId c002 has only 1 member, excluded
  // by-cluster.md is never sharded - no by-cluster/ subdirectory entries
  assert.ok(!Object.keys(pages).some((k) => k.startsWith("by-cluster/")));
});

test("INDEX.md links to catalog and all four sibling index hub pages", () => {
  setGemTitles(idxGems);
  const md = renderIndexPages(idxGems, idxFindings)["INDEX.md"];
  assert.match(md, /\[Catalog\]\(\.\.\/CATALOG\.md\)/);
  assert.match(md, /\[By topic\]\(by-topic\.md\)/);
  assert.match(md, /\[By source repo\]\(by-source\.md\)/);
  assert.match(md, /\[By category\]\(by-category\.md\)/);
  assert.match(md, /\[Cross-gem clusters\]\(by-cluster\.md\)/);
  assert.match(md, /2 gems · 3 findings · 2 clusters/);
});

test("renderIndexPages: no emojis in any page (hubs and shards)", () => {
  setGemTitles(idxGems);
  const pages = renderIndexPages(idxGems, idxFindings);
  for (const [name, md] of Object.entries(pages))
    assert.doesNotMatch(md, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, `emoji found in ${name}`);
});

// ---- oversizedPages ----

test("oversizedPages: flags entries over the cap, passes small ones", () => {
  const small = { "by-topic.md": "small hub content" };
  const big = { "by-topic/agent.md": "x".repeat(500_000) };
  assert.deepEqual(oversizedPages(small), []);
  const flagged = oversizedPages(big);
  assert.equal(flagged.length, 1);
  assert.equal(flagged[0].path, "by-topic/agent.md");
  assert.equal(flagged[0].bytes, 500_000);
});

test("oversizedPages: default cap is 450_000 bytes, custom cap is honored", () => {
  const pages = { "a.md": "x".repeat(460_000), "b.md": "x".repeat(440_000) };
  assert.deepEqual(oversizedPages(pages).map((f) => f.path), ["a.md"]);
  assert.deepEqual(oversizedPages(pages, 400_000).map((f) => f.path).sort(), ["a.md", "b.md"]);
});

test("renderCatalog splits queued (0-finding) gems into a separate section, not the main table", () => {
  const raw = { number: 99, title: "queued-thing", url: "u", repo: "o/queued", sha: null,
    source: "repo", topics: [], verdict: null, quality: "normal", stage: "raw",
    license: "none", codeReuse: "forbidden", findingCount: 0 };
  const md = renderCatalog([gem, raw], all);
  assert.match(md, /## Queued for extraction \(1\)/);
  assert.match(md, /- \[#99\]\([^)]*issues\/99\) queued-thing - o\/queued \(raw\)/);
  assert.doesNotMatch(md, /\|\s*\[#99\]/);   // queued gem is NOT a main-table row
});
