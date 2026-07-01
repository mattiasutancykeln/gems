import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syncCorpus } from "../scripts/sync-corpus.mjs";
import { makeIssue, SUM_COMMENT } from "./fixtures.mjs";

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
  assert.deepEqual(jsonl.map((f) => f.id), [...jsonl.map((f) => f.id)].sort());  // sorted by id

  assert.ok(existsSync(join(root, "corpus/gems.json")));
  assert.ok(existsSync(join(root, "CATALOG.md")));
  assert.ok(existsSync(join(root, "corpus/gems/0042-widget-the-acme-widget.md")));
  assert.match(readFileSync(join(root, "README.md"), "utf8"), /2 gems · \d+ findings/);
  assert.ok(existsSync(join(root, "corpus/.licenses.json")));
  assert.equal(warnings.length, 0);
  assert.ok(!existsSync(join(root, "corpus/PARSE_WARNINGS.md")));
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

test("deterministic: two runs produce byte-identical outputs", () => {
  const root = setup();
  const run = () => syncCorpus({ fetchIssues: () => [makeIssue()], fetchLicense, rootDir: root, log: () => {} });
  run();
  const first = readFileSync(join(root, "corpus/findings.jsonl"), "utf8");
  run();
  assert.equal(readFileSync(join(root, "corpus/findings.jsonl"), "utf8"), first);
});
