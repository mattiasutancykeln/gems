import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syncCorpus } from "../scripts/sync-corpus.mjs";
import { makeIssue, SUM_COMMENT, EXT_COMMENT } from "./fixtures.mjs";

function setup() {
  const root = mkdtempSync(join(tmpdir(), "gems-"));
  writeFileSync(join(root, "README.md"), "# gems\n<!-- stats:start -->x<!-- stats:end -->\n");
  return root;
}

const licenses = { "acme/widget": "MIT", "acme/other": "none" };
const fetchLicense = (repo) => licenses[repo] ?? "none";

test("writes complete corpus from two issues", () => {
  const root = setup();
  const issues = [
    makeIssue(),
    makeIssue({ number: 43, title: "[sum] other", comments: [SUM_COMMENT],
      body: "https://github.com/acme/other", labels: ["stage:summarized", "source:repo", "topic:eval"] }),
  ];
  const { gems, findings, warnings } = syncCorpus({ fetchIssues: () => issues, fetchLicense, rootDir: root, log: () => {} });

  assert.equal(gems.length, 2);
  assert.equal(gems[0].license, "MIT");
  assert.equal(gems[0].codeReuse, "permissive");
  assert.equal(gems[1].codeReuse, "forbidden");
  assert.equal(gems[0].findingCount, 5);

  const jsonl = readFileSync(join(root, "corpus/findings.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(jsonl.length, findings.length);
  assert.ok(jsonl.every((f) => f.clusterId && f.topic && f.codeReuse && f.quality));
  // ordered by gem number then finding index (numeric, not lexicographic)
  const order = jsonl.map((f) => {
    const [, gem, idx] = f.id.match(/^g(\d+)-f(\d+)$/);
    return [Number(gem), Number(idx)];
  });
  const sortedOrder = [...order].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  assert.deepEqual(order, sortedOrder);

  assert.ok(existsSync(join(root, "corpus/gems.json")));
  assert.ok(existsSync(join(root, "CATALOG.md")));
  assert.ok(existsSync(join(root, "corpus/gems/0042-widget-the-acme-widget.md")));
  assert.match(readFileSync(join(root, "README.md"), "utf8"), /2 gems · \d+ findings/);
  assert.ok(existsSync(join(root, "corpus/.licenses.json")));
  assert.equal(warnings.length, 0);
  assert.ok(!existsSync(join(root, "corpus/PARSE_WARNINGS.md")));

  assert.ok(existsSync(join(root, "corpus/INDEX.md")));
  assert.ok(readFileSync(join(root, "corpus/INDEX.md"), "utf8").length > 0);
  assert.ok(existsSync(join(root, "corpus/by-topic.md")));
  assert.ok(readFileSync(join(root, "corpus/by-topic.md"), "utf8").length > 0);

  // the hub is now small; the per-value shards carry the finding one-liners
  assert.ok(existsSync(join(root, "corpus/by-topic")));
  const topicShards = readdirSync(join(root, "corpus/by-topic"));
  assert.ok(topicShards.length > 0, "expected at least one by-topic/ shard");
  const firstShard = readFileSync(join(root, "corpus/by-topic", topicShards[0]), "utf8");
  assert.ok(firstShard.length > 0);
  assert.match(firstShard, /\.\.\/gems\//); // shard finding links go up a directory

  assert.ok(existsSync(join(root, "corpus/by-source")));
  assert.ok(readdirSync(join(root, "corpus/by-source")).length > 0);
  assert.ok(existsSync(join(root, "corpus/by-category")));
  assert.ok(readdirSync(join(root, "corpus/by-category")).length > 0);
});

test("stale shard files from a removed axis value are cleaned up on the next sync", () => {
  const root = setup();
  const issueWithBoth = makeIssue({ labels: ["stage:extracted", "source:repo", "topic:agent", "topic:infra", "quality:high"] });
  syncCorpus({ fetchIssues: () => [issueWithBoth], fetchLicense, rootDir: root, log: () => {} });
  const firstRunShards = readdirSync(join(root, "corpus/by-topic")).sort();
  assert.ok(firstRunShards.includes("infra.md"), `expected infra.md among ${firstRunShards}`);

  const issueWithoutInfra = makeIssue({ labels: ["stage:extracted", "source:repo", "topic:agent", "quality:high"] });
  syncCorpus({ fetchIssues: () => [issueWithoutInfra], fetchLicense, rootDir: root, log: () => {} });
  const secondRunShards = readdirSync(join(root, "corpus/by-topic")).sort();
  assert.ok(!secondRunShards.includes("infra.md"), `infra.md should have been cleaned up, got ${secondRunShards}`);
  assert.ok(secondRunShards.includes("agent.md"));
});

test("size guard: WARN log and PARSE_WARNINGS.md entry when an index page approaches the render ceiling", () => {
  const root = setup();
  // Each finding carries a long, unique citation path so a moderate finding count (fast to
  // cluster) still inflates a single shard past the 450KB warn threshold.
  const pad = "x".repeat(1500);
  const manyFindings = Array.from({ length: 350 },
    (_, i) => `- **Finding number ${i}**: \`src/generated/${pad}/file${i}.ts:1-2\` — description.`,
  ).join("\n");
  const bigComment = `## Extraction report\n\n**Source:** \`acme/widget\` @ \`abcdef0123456789abcdef0123456789abcdef01\` (pinned 2026-06-10T09:56:19Z)\n**Workers:** 2 • **Files read:** 5\n\n---\n\n### Patterns worth porting\n\n${manyFindings}\n\n### Files read by workers\n\n- src/cache.ts\n`;
  const issue = makeIssue({ comments: [SUM_COMMENT, bigComment] });
  const logs = [];
  const { warnings } = syncCorpus({ fetchIssues: () => [issue], fetchLicense, rootDir: root, log: (m) => logs.push(m) });

  assert.ok(logs.some((l) => l.includes("WARN") && l.includes("approaching the 512KB GitHub render ceiling")),
    `expected a size-guard WARN log, got: ${logs.join("\n")}`);
  assert.ok(warnings.some((w) => w.includes("approaching the 512KB GitHub render ceiling")));
  assert.match(readFileSync(join(root, "corpus/PARSE_WARNINGS.md"), "utf8"), /approaching the 512KB GitHub render ceiling/);
});

test("license cache: cached repos are not re-fetched", () => {
  const root = setup();
  let calls = 0;
  syncCorpus({ fetchIssues: () => [makeIssue()], fetchLicense: (r) => { calls++; return "MIT"; }, rootDir: root, log: () => {} });
  syncCorpus({ fetchIssues: () => [makeIssue()], fetchLicense: (r) => { calls++; return "MIT"; }, rootDir: root, log: () => {} });
  assert.equal(calls, 1);
});

test("warnings produce PARSE_WARNINGS.md", () => {
  const root = setup();
  const bad = makeIssue({ comments: ["## Extraction report\n\n**Source:** `acme/widget` @ `1234567` (pinned x)\n\n### Patterns worth porting\n\n- No citation here.\n"] });
  const { warnings } = syncCorpus({ fetchIssues: () => [bad], fetchLicense, rootDir: root, log: () => {} });
  assert.equal(warnings.length, 1);
  assert.match(readFileSync(join(root, "corpus/PARSE_WARNINGS.md"), "utf8"), /no citation/);
});

test("digit boundary: gem 9 findings precede gem 10 findings (not lexicographic)", () => {
  const root = setup();
  const issues = [
    makeIssue({ number: 10, comments: [SUM_COMMENT, EXT_COMMENT] }),
    makeIssue({ number: 9, comments: [SUM_COMMENT, EXT_COMMENT] }),
  ];
  syncCorpus({ fetchIssues: () => issues, fetchLicense, rootDir: root, log: () => {} });

  const jsonl = readFileSync(join(root, "corpus/findings.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
  const ids = jsonl.map((f) => f.id);
  const lastNineIdx = ids.map((id, i) => (id.startsWith("g9-") ? i : -1)).filter((i) => i >= 0).at(-1);
  const firstTenIdx = ids.findIndex((id) => id.startsWith("g10-"));
  assert.ok(ids.some((id) => id.startsWith("g9-")));
  assert.ok(ids.some((id) => id.startsWith("g10-")));
  assert.ok(lastNineIdx < firstTenIdx, `expected all g9-* ids before g10-*, got order ${ids.join(",")}`);
});

test("deterministic: two runs produce byte-identical outputs", () => {
  const root = setup();
  const run = () => syncCorpus({ fetchIssues: () => [makeIssue()], fetchLicense, rootDir: root, log: () => {} });
  run();
  const first = readFileSync(join(root, "corpus/findings.jsonl"), "utf8");
  run();
  assert.equal(readFileSync(join(root, "corpus/findings.jsonl"), "utf8"), first);
});

test("strips upstream-quoted emoji from finding title/text before it reaches findings.jsonl", () => {
  const root = setup();
  const emojiExt = EXT_COMMENT.replace(
    "**Single-flight cache**: `src/cache.ts:84-112` — Dedupes concurrent fetches with a 30s grace window before re-fetch.",
    "**\u{1F527} Single-flight cache**: `src/cache.ts:84-112` — \u{1F527} Dedupes concurrent fetches with a 30s grace window before re-fetch.",
  );
  const issue = makeIssue({ comments: [SUM_COMMENT, emojiExt] });
  syncCorpus({ fetchIssues: () => [issue], fetchLicense, rootDir: root, log: () => {} });

  const raw = readFileSync(join(root, "corpus/findings.jsonl"), "utf8");
  const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{FE0F}\u{200D}\u{2139}]/gu;
  assert.equal(EMOJI_RE.test(raw), false, `expected no emoji codepoints in findings.jsonl, got: ${raw}`);

  const findings = raw.trim().split("\n").map(JSON.parse);
  const cache = findings.find((f) => f.id === "g42-f001");
  assert.equal(cache.title, "Single-flight cache");
  assert.match(cache.text, /src\/cache\.ts:84-112/); // leading duplicated title is stripped from text
  assert.match(cache.text, /Dedupes concurrent fetches with a 30s grace window before re-fetch\./);
  assert.equal(cache.text.includes("\u{1F527}"), false);
});

test("raw-stage gems with no report do not warn about a missing report", () => {
  const root = setup();
  const rawIssue = makeIssue({ number: 77, title: "[raw] newthing",
    comments: [], labels: ["stage:raw", "source:repo"], body: "https://github.com/acme/newthing" });
  const { warnings, gems } = syncCorpus({ fetchIssues: () => [rawIssue], fetchLicense: () => "MIT", rootDir: root, log: () => {} });
  assert.ok(!warnings.some((w) => /no parseable report/.test(w)), "raw gem should not warn about a missing report");
  assert.equal(gems.find((g) => g.number === 77).findingCount, 0);
});
