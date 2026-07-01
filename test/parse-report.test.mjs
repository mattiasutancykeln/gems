import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIssue } from "../lib/parse-report.mjs";
import { makeIssue, SUM_COMMENT, DEEP_READ_COMMENT } from "./fixtures.mjs";

test("gem record from labels, title, body, source line", () => {
  const { gem } = parseIssue(makeIssue());
  assert.equal(gem.number, 42);
  assert.equal(gem.title, "widget — the acme widget");        // [ext] prefix stripped
  assert.equal(gem.repo, "acme/widget");                      // from Source line
  assert.equal(gem.sha, "abcdef0123456789abcdef0123456789abcdef01");
  assert.equal(gem.source, "repo");
  assert.deepEqual(gem.topics, ["agent", "infra"]);
  assert.equal(gem.quality, "high");
  assert.equal(gem.stage, "extracted");
  assert.equal(gem.verdict, "keep");
  assert.equal(gem.url, "https://github.com/acme/widget");
});

test("extraction report parses all four sections, ignores extras", () => {
  const { findings, warnings } = parseIssue(makeIssue());
  assert.equal(findings.length, 5);
  assert.deepEqual(findings.map((f) => f.category),
    ["impl-decision", "impl-decision", "skill-prompt-tool", "pattern", "weak-spot"]);
  assert.equal(warnings.length, 0);
  // no finding from "Files read by workers"
  assert.ok(!findings.some((f) => f.text.includes("src/cache.ts\n")));
});

test("style A bullet: inline citation, bold title", () => {
  const { findings } = parseIssue(makeIssue());
  const f = findings[0];
  assert.equal(f.id, "g42-f001");
  assert.equal(f.title, "Single-flight cache");
  assert.equal(f.citation, "src/cache.ts:84-112");
  assert.match(f.text, /30s grace window/);
});

test("style B bullet: trailing citation lines, multiple citations", () => {
  const { findings } = parseIssue(makeIssue());
  const f = findings[1];
  assert.equal(f.title, "Budget check runs first");
  assert.equal(f.citation, "scorers/oracle_budget.py:147-153");
  assert.deepEqual(f.citations,
    ["scorers/oracle_budget.py:147-153", "scorers/oracle_budget.py:200-210"]);
});

test("fallback: canonical sections in a deep-read comment", () => {
  const { findings } = parseIssue(makeIssue({ comments: [DEEP_READ_COMMENT] }));
  assert.equal(findings.length, 1);
  assert.equal(findings[0].category, "pattern");
  assert.equal(findings[0].citation, "daemon/loop.py:5-25");
});

test("sum-only: Highlights become highlight findings, verdict extracted", () => {
  const { gem, findings } = parseIssue(makeIssue({
    comments: [SUM_COMMENT],
    labels: ["stage:summarized", "source:repo", "topic:agent"],
    title: "[sum] widget",
  }));
  assert.equal(findings.length, 2);
  assert.equal(findings[0].category, "highlight");
  assert.equal(findings[0].citation, null);
  assert.equal(gem.verdict, "keep");
  assert.equal(gem.quality, "normal");
  assert.equal(gem.repo, "acme/widget"); // falls back to github URL in body
});

test("warning on citation-less bullet in a code section", () => {
  const bad = "## Extraction report\n\n**Source:** `a/b` @ `1234567` (pinned x)\n\n### Patterns worth porting\n\n- A pattern with no citation at all.\n";
  const { warnings, findings } = parseIssue(makeIssue({ comments: [bad] }));
  assert.equal(findings.length, 1); // kept, not dropped
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /no citation/i);
});
