import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
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
