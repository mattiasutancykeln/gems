# gems corpus + MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Materialize the gems issue backlog into a committed finding-level corpus, serve it to agents via a 3-verb stdio MCP server, and open the repo to community contribution.

**Architecture:** GitHub issues stay the capture source of truth. `scripts/sync-corpus.mjs` parses issue comments into `corpus/` (gems.json + findings.jsonl + gem pages + CATALOG.md), auditing licenses and clustering near-duplicate findings lexically. `mcp/server.mjs` loads the corpus in-memory, ranks with hand-rolled BM25 + metadata filters, and renders Markdown results. CI regenerates the corpus when a gem is labeled `stage:extracted`.

**Tech Stack:** Node ≥18 plain ESM `.mjs` (no build step), `@modelcontextprotocol/sdk@^1.29.0` + `zod` (only runtime deps), `node --test` + `node:assert/strict` (no test deps), `gh` CLI for GitHub access.

**Spec:** `docs/design/2026-07-01-corpus-mcp-design.md` — read it before starting any task.

## Global Constraints

- **Working directory is `/home/mattiasutancykeln/gems`** — a standalone git repo on branch `main`. EVERY task: `cd /home/mattiasutancykeln/gems` first and verify with `pwd`. Never work in the sheperd repo.
- Commit to `main` locally. **NEVER `git push`.**
- Node ≥18 (dev machine runs v22.19.0). Plain ESM `.mjs`, `"type": "module"`, no TypeScript, no build step.
- Runtime deps: exactly `@modelcontextprotocol/sdk@^1.29.0` and `zod@^3.25`. No other npm deps, no devDeps.
- Tests: `node --test test/` via `npm test`, `node:assert/strict`. Test files: `test/<unit>.test.mjs`.
- **No emojis in any GitHub-facing text** (README, CATALOG, gem pages, issue templates, MCP output, code comments). ASCII markers only (`[high]`, `(permissive)`, `->`). Use `…` not `...` in prose.
- MCP server: **stdout is protocol-only**; all logging via `console.error`.
- All generated output deterministic: stable sort orders, fixed hash seeds, no timestamps in generated bodies.
- License → codeReuse mapping (verbatim from spec): MIT/Apache-2.0/BSD/ISC/Unlicense → `permissive`; GPL/LGPL/MPL/CC-BY/CC-BY-SA → `ideas-only`; CC-BY-NC*/proprietary/none → `forbidden`. Unknown → `forbidden` (fail safe).
- Retrieval invariant: **never dedup** — every hit surfaces; clusters group, never remove.
- Conventional commit messages (`feat:`, `fix:`, `test:`, `docs:`, `chore:`), no Co-Authored-By attribution.

## Data Shapes (shared by all tasks)

```js
// Gem record (corpus/gems.json is a sorted-by-number array of these)
{ number: 21, title: "SciAgentArena — benchmarking AI agents…", url: "https://arxiv.org/…",
  repo: "HelloWorldLTY/SciAgentArena",  // owner/repo or null
  sha: "ce27b8cdaad4dc5d5ff35a20e0b97cb35cad9f57", // full or short or null
  source: "paper",                       // from source:* label, or null
  topics: ["eval","infra"],              // from topic:* labels
  verdict: "keep",                       // keep|promote|discard|null (from summary comment)
  quality: "high",                       // "high" iff label quality:high, else "normal"
  stage: "extracted",                    // from stage:* label
  license: "none",                       // SPDX id, or "none"
  codeReuse: "forbidden",                // permissive|ideas-only|forbidden
  findingCount: 24 }

// Finding record (corpus/findings.jsonl — one JSON object per line, ordered by gem number then finding index)
{ id: "g21-f007",                        // g<gem>-f<3-digit index, document order>
  gem: 21, repo: "HelloWorldLTY/SciAgentArena", sha: "ce27b8c",  // sha shortened to 7
  citation: "evaluations/dd/scorers/oracle_budget.py:147-153",   // first citation or null
  citations: ["…py:147-153"],            // all path:line citations in the bullet
  category: "pattern",                   // impl-decision|skill-prompt-tool|pattern|weak-spot|highlight
  topic: ["eval","infra"],               // inherited from gem
  license: "none", codeReuse: "forbidden", quality: "high",      // inherited from gem
  clusterId: "c042", clusterLabel: "budget-gated verification",
  title: "Budget-before-validity check", // ≤120 chars
  text: "full bullet text, citations stripped of markdown emphasis" }
```

---

### Task 1: Scaffolding — LICENSE, package.json, deps, test harness

**Files:**
- Create: `LICENSE`
- Create: `package.json`
- Create: `.gitignore`
- Create: `test/smoke.test.mjs`

**Interfaces:**
- Produces: installed `node_modules` with `@modelcontextprotocol/sdk` + `zod`; `npm test` running `node --test test/`.

- [ ] **Step 1: Write files**

`LICENSE` — standard MIT text, `Copyright (c) 2026 mattiasutancykeln`.

`package.json`:
```json
{
  "name": "gems",
  "version": "1.0.0",
  "description": "A mined, cited, searchable corpus of implementation patterns from open-source agent/research repos - queryable over MCP",
  "type": "module",
  "license": "MIT",
  "private": true,
  "engines": { "node": ">=18" },
  "scripts": {
    "test": "node --test test/",
    "sync": "node scripts/sync-corpus.mjs"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.29.0",
    "zod": "^3.25.0"
  }
}
```

`.gitignore`:
```
node_modules/
```

`test/smoke.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";

test("deps resolve", async () => {
  const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
  const { z } = await import("zod");
  assert.equal(typeof McpServer, "function");
  assert.equal(typeof z.string, "function");
});
```

- [ ] **Step 2: Install and run**

Run: `cd /home/mattiasutancykeln/gems && npm install && npm test`
Expected: `npm install` adds 2 deps + transitive; `npm test` reports `pass 1`.

- [ ] **Step 3: Commit**

```bash
git add LICENSE package.json package-lock.json .gitignore test/smoke.test.mjs
git commit -m "chore: MIT license, package scaffolding, node --test harness"
```

---

### Task 2: `lib/license-map.mjs` — SPDX → codeReuse

**Files:**
- Create: `lib/license-map.mjs`
- Test: `test/license-map.test.mjs`

**Interfaces:**
- Produces: `codeReuseFor(spdxId: string|null) -> "permissive"|"ideas-only"|"forbidden"` and `reuseNote(codeReuse: string, license: string) -> string`.

- [ ] **Step 1: Write the failing test**

`test/license-map.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { codeReuseFor, reuseNote } from "../lib/license-map.mjs";

test("permissive licenses", () => {
  for (const id of ["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "Unlicense", "0BSD", "CC0-1.0"])
    assert.equal(codeReuseFor(id), "permissive", id);
});

test("ideas-only licenses", () => {
  for (const id of ["GPL-3.0", "GPL-2.0", "AGPL-3.0", "LGPL-2.1", "MPL-2.0", "CC-BY-4.0", "CC-BY-SA-4.0", "EPL-2.0"])
    assert.equal(codeReuseFor(id), "ideas-only", id);
});

test("forbidden: none, unknown, NC", () => {
  for (const id of [null, "", "none", "NOASSERTION", "CC-BY-NC-SA-4.0", "LicenseRef-proprietary", "SomethingNew-1.0"])
    assert.equal(codeReuseFor(id), "forbidden", String(id));
});

test("case-insensitive", () => {
  assert.equal(codeReuseFor("mit"), "permissive");
});

test("reuseNote wording", () => {
  assert.equal(reuseNote("permissive", "MIT"), "License: MIT (permissive) - code may be copied with attribution");
  assert.equal(reuseNote("ideas-only", "GPL-3.0"), "License: GPL-3.0 - IDEAS ONLY, do not copy code verbatim");
  assert.equal(reuseNote("forbidden", "none"), "License: none - FORBIDDEN to copy code, adopt the idea only");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --test-name-pattern=license 2>&1 | tail -5` — actually `node --test test/license-map.test.mjs`
Expected: FAIL, `Cannot find module '../lib/license-map.mjs'`.

- [ ] **Step 3: Implement**

`lib/license-map.mjs`:
```js
const PERMISSIVE = ["MIT", "APACHE-2.0", "BSD-2-CLAUSE", "BSD-3-CLAUSE", "ISC", "UNLICENSE", "0BSD", "CC0-1.0"];
const IDEAS_PREFIX = ["GPL-", "AGPL-", "LGPL-", "MPL-", "EPL-", "CC-BY-4", "CC-BY-SA"];

export function codeReuseFor(spdxId) {
  if (!spdxId) return "forbidden";
  const id = String(spdxId).toUpperCase();
  if (id.startsWith("CC-BY-NC")) return "forbidden";
  if (PERMISSIVE.includes(id)) return "permissive";
  if (IDEAS_PREFIX.some((p) => id.startsWith(p))) return "ideas-only";
  return "forbidden";
}

export function reuseNote(codeReuse, license) {
  const lic = license || "none";
  if (codeReuse === "permissive") return `License: ${lic} (permissive) - code may be copied with attribution`;
  if (codeReuse === "ideas-only") return `License: ${lic} - IDEAS ONLY, do not copy code verbatim`;
  return `License: ${lic} - FORBIDDEN to copy code, adopt the idea only`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/license-map.test.mjs`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/license-map.mjs test/license-map.test.mjs
git commit -m "feat: license to codeReuse mapping with reuse notes"
```

---

### Task 3: `lib/parse-report.mjs` — issue comments → findings

The riskiest unit. The contract below is pinned to the REAL comment shapes on the live repo (verified 2026-07-02):

- Extraction comments start `## Extraction report` (optionally `— <Name>` suffix) and contain a line like:
  `**Source:** \`sst/opencode\` @ \`97e713e8aac75a0254c34d134f0608af5cb4935c\` (pinned 2026-06-10T09:56:19Z)`
- The four canonical sections are `### Implementation decisions`, `### Skills, prompts, tools`, `### Patterns worth porting`, `### Open threads / weak spots`. Extra sections (`### Files read by workers`, `### Highest-value ports…`) exist and must be ignored.
- Bullet style A (gem #1): `- **Title**: \`path/file.ts:116-148\` — text…` (citation inline).
- Bullet style B (gem #21): `- **Title.** text…` followed by an indented continuation line of citations: `  \`evaluations/dd/runners/batch_runner.py:180-231 @ SciAgentArena@ce27b8c\`; \`…\``.
- Some gems (#3) have NO `## Extraction report` comment but a deep-read comment containing canonical `###` sections — fall back to parsing canonical sections from the LAST comment that has any.
- Pure summary gems: parse `### Highlights` bullets from the last comment that has that section → category `highlight`.

**Files:**
- Create: `lib/parse-report.mjs`
- Create: `test/fixtures.mjs`
- Test: `test/parse-report.test.mjs`

**Interfaces:**
- Consumes: nothing (pure).
- Produces: `parseIssue(issue) -> { gem, findings, warnings }` where `issue = { number, title, body, labels: string[], url, comments: string[] }`, `gem` is the Gem record WITHOUT `license/codeReuse/findingCount` (added by sync), `findings` are Finding records WITHOUT `license/codeReuse/topic/quality/clusterId/clusterLabel` (added by sync). Also exports `SECTION_CATEGORIES` (heading-regex → category pairs).

- [ ] **Step 1: Write fixtures**

`test/fixtures.mjs`:
```js
export const EXT_COMMENT = `## Extraction report

**Source:** \`acme/widget\` @ \`abcdef0123456789abcdef0123456789abcdef01\` (pinned 2026-06-10T09:56:19Z)
**Workers:** 2 • **Files read:** 5

---

### Implementation decisions

- **Single-flight cache**: \`src/cache.ts:84-112\` — Dedupes concurrent fetches with a 30s grace window before re-fetch.

- **Budget check runs first.** Over-budget runs are zeroed before validity is evaluated, so budget violations short-circuit.
  \`scorers/oracle_budget.py:147-153 @ acme/widget@abcdef0\`; \`scorers/oracle_budget.py:200-210 @ acme/widget@abcdef0\`

### Skills, prompts, tools

- **Triage prompt guard**: \`prompts/triage.md:1-94\` — Refuses to proceed without explicit inputs.

### Patterns worth porting

- **Queue-and-claim via optimistic file locks**: \`src/queue.ts:10-40\` — Workers claim jobs by atomic rename.

### Open threads / weak spots

- Racy token refresh under concurrency: \`src/auth.ts:30-72\`.

### Files read by workers

- src/cache.ts
`;

export const SUM_COMMENT = `### TL;DR
One-liner about the project.

### Highlights
- Streaming tool-use loop with backpressure.
- Prompt cache keyed on content hash.

### Connections
Relates to our executor.

### Verdict
keep — solid patterns.
`;

export const DEEP_READ_COMMENT = `## Deep read — widget

### TL;DR
Stuff.

### Patterns worth porting
- **Report-first crash resilience**: \`daemon/loop.py:5-25\` — Writes report before state transitions.

### Verdict
promote — extract next.
`;

export function makeIssue(overrides = {}) {
  return {
    number: 42,
    title: "[ext] widget — the acme widget",
    body: "https://github.com/acme/widget\n\nlooks neat",
    labels: ["stage:extracted", "source:repo", "topic:agent", "topic:infra", "quality:high"],
    url: "https://github.com/mattiasutancykeln/gems/issues/42",
    comments: [SUM_COMMENT, EXT_COMMENT],
    ...overrides,
  };
}
```

- [ ] **Step 2: Write the failing test**

`test/parse-report.test.mjs`:
```js
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test test/parse-report.test.mjs`
Expected: FAIL, cannot find module.

- [ ] **Step 4: Implement**

`lib/parse-report.mjs`:
```js
export const SECTION_CATEGORIES = [
  [/^###\s+implementation decisions/i, "impl-decision"],
  [/^###\s+skills?,?\s*prompts?,?\s*(and\s+|&\s*)?tools?/i, "skill-prompt-tool"],
  [/^###\s+patterns worth porting/i, "pattern"],
  [/^###\s+open threads/i, "weak-spot"],
];
const HIGHLIGHTS_RE = /^###\s+highlights/i;
const CITATION_RE = /[A-Za-z0-9_][A-Za-z0-9_.\/-]*\.[A-Za-z0-9_]+:\d+(?:-\d+)?|[A-Za-z0-9_][A-Za-z0-9_.\/-]*:\d+-\d+/g;
const SOURCE_RE = /\*\*Source:\*\*\s*`([\w.-]+\/[\w.-]+)`\s*@\s*`([0-9a-f]{7,40})`/i;

function label(labels, prefix) {
  const hit = labels.find((l) => l.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

function splitSections(comment) {
  // -> [{ heading, lines[] }] for every ### section
  const lines = comment.split("\n");
  const sections = [];
  let cur = null;
  for (const line of lines) {
    if (/^###\s+/.test(line)) { cur = { heading: line, lines: [] }; sections.push(cur); }
    else if (/^##\s+/.test(line)) { cur = null; }
    else if (cur) cur.lines.push(line);
  }
  return sections;
}

function splitBullets(lines) {
  // top-level "- " bullets; continuation = any following line that is not a new bullet/heading,
  // stopping at a blank line followed by a non-indented, non-bullet line
  const bullets = [];
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^- /.test(line)) { cur = [line.slice(2)]; bullets.push(cur); }
    else if (cur && line.trim() === "") {
      const next = lines[i + 1] ?? "";
      if (/^(\s+\S|- )/.test(next)) cur.push(""); else cur = null;
    } else if (cur && /^\s+\S/.test(line)) cur.push(line.trim());
    else cur = null;
  }
  return bullets.map((b) => b.join("\n").trim()).filter(Boolean);
}

function bulletToFinding(bulletText, category) {
  const citations = [...new Set(bulletText.match(CITATION_RE) ?? [])]
    .filter((c) => !/^https?:/.test(c));
  const bold = bulletText.match(/\*\*(.+?)\*\*/);
  let title;
  if (bold) title = bold[1].replace(/[.:]\s*$/, "");
  else {
    const plain = bulletText.replace(/`/g, "").replace(/\*\*/g, "");
    title = plain.split(/\s+—\s+|:\s+/)[0];
  }
  if (title.length > 120) title = title.slice(0, 117) + "…";
  return { category, title: title.trim(), text: bulletText, citation: citations[0] ?? null, citations };
}

export function parseIssue(issue) {
  const warnings = [];
  const labels = issue.labels;
  const title = issue.title.replace(/^\[(raw|sum|ext)\]\s*/, "").replace(/^github\.com\s*—\s*/, "");
  const bodyUrl = (issue.body.match(/https?:\/\/\S+/) ?? [null])[0];

  // pick the source comment: last "## Extraction report", else last with a canonical section, else last with Highlights
  const isExt = (c) => /^##\s+Extraction report/m.test(c);
  const hasCanonical = (c) => splitSections(c).some((s) => SECTION_CATEGORIES.some(([re]) => re.test(s.heading)));
  const extComments = issue.comments.filter(isExt);
  const canonicalFallback = issue.comments.filter((c) => !isExt(c) && hasCanonical(c));
  const reportComment = extComments.at(-1) ?? canonicalFallback.at(-1) ?? null;

  // repo + sha: Source line first, then github URL in body
  let repo = null, sha = null;
  const src = (reportComment ?? "").match(SOURCE_RE);
  if (src) { repo = src[1]; sha = src[2]; }
  if (!repo && bodyUrl) {
    const gh = bodyUrl.match(/github\.com\/([\w.-]+\/[\w.-]+)/);
    if (gh) repo = gh[1].replace(/\.git$/, "");
  }

  // verdict: from any comment's "### Verdict" section, first keep/promote/discard word
  let verdict = null;
  for (const c of issue.comments) {
    for (const s of splitSections(c)) {
      if (/^###\s+verdict/i.test(s.heading)) {
        const m = s.lines.join(" ").match(/\b(keep|promote|discard)\b/i);
        if (m) verdict = m[1].toLowerCase();
      }
    }
  }

  const findings = [];
  const push = (bullet, category) => {
    const f = bulletToFinding(bullet, category);
    f.id = `g${issue.number}-f${String(findings.length + 1).padStart(3, "0")}`;
    f.gem = issue.number;
    f.repo = repo;
    f.sha = sha ? sha.slice(0, 7) : null;
    if (category !== "highlight" && !f.citation)
      warnings.push(`gem #${issue.number} ${f.id} ("${f.title}"): no citation in a code section`);
    findings.push(f);
  };

  if (reportComment) {
    for (const s of splitSections(reportComment)) {
      const cat = SECTION_CATEGORIES.find(([re]) => re.test(s.heading))?.[1];
      if (!cat) continue;
      for (const b of splitBullets(s.lines)) push(b, cat);
    }
  } else {
    const sumComment = [...issue.comments].reverse().find((c) => splitSections(c).some((s) => HIGHLIGHTS_RE.test(s.heading)));
    if (sumComment) {
      for (const s of splitSections(sumComment)) {
        if (!HIGHLIGHTS_RE.test(s.heading)) continue;
        for (const b of splitBullets(s.lines)) push(b, "highlight");
      }
    } else warnings.push(`gem #${issue.number}: no parseable report or highlights comment`);
  }

  const gem = {
    number: issue.number, title, url: bodyUrl, repo, sha,
    source: label(labels, "source:"), topics: labels.filter((l) => l.startsWith("topic:")).map((l) => l.slice(6)).sort(),
    verdict, quality: labels.includes("quality:high") ? "high" : "normal",
    stage: label(labels, "stage:"),
  };
  return { gem, findings, warnings };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test test/parse-report.test.mjs`
Expected: all PASS. If a test fails, fix the implementation, not the fixture (fixtures mirror live data).

- [ ] **Step 6: Commit**

```bash
git add lib/parse-report.mjs test/fixtures.mjs test/parse-report.test.mjs
git commit -m "feat: parse extraction/summary comments into finding records"
```

---

### Task 4: `lib/cluster.mjs` — lexical MinHash clustering

**Files:**
- Create: `lib/cluster.mjs`
- Test: `test/cluster.test.mjs`

**Interfaces:**
- Consumes: findings with `id`, `gem`, `title`, `text`, `quality`.
- Produces: `clusterFindings(findings, { shingleK=3, numHashes=64, threshold=0.5 }) -> findings.map(f => ({...f, clusterId, clusterLabel}))` — pure, input order preserved, deterministic. Cluster ids `c001…` numbered by first member's position; label = title of the best member (quality `high` first, then shortest title, then lowest id).

- [ ] **Step 1: Write the failing test**

`test/cluster.test.mjs`:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/cluster.test.mjs` — Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement**

`lib/cluster.mjs`:
```js
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

function tokens(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
}

function shingles(toks, k) {
  if (toks.length <= k) return new Set([toks.join(" ")]);
  const out = new Set();
  for (let i = 0; i + k <= toks.length; i++) out.add(toks.slice(i, i + k).join(" "));
  return out;
}

function minhashSig(sh, numHashes) {
  const sig = new Array(numHashes).fill(0xffffffff);
  for (const s of sh) for (let i = 0; i < numHashes; i++) {
    const h = fnv1a(i + ":" + s);
    if (h < sig[i]) sig[i] = h;
  }
  return sig;
}

class UnionFind {
  constructor(n) { this.p = Array.from({ length: n }, (_, i) => i); }
  find(x) { while (this.p[x] !== x) { this.p[x] = this.p[this.p[x]]; x = this.p[x]; } return x; }
  union(a, b) { const ra = this.find(a), rb = this.find(b); if (ra !== rb) this.p[Math.max(ra, rb)] = Math.min(ra, rb); }
}

export function clusterFindings(findings, { shingleK = 3, numHashes = 64, threshold = 0.5 } = {}) {
  const sigs = findings.map((f) => minhashSig(shingles(tokens(f.title + " " + f.text), shingleK), numHashes));
  const uf = new UnionFind(findings.length);
  for (let i = 0; i < findings.length; i++) for (let j = i + 1; j < findings.length; j++) {
    let same = 0;
    for (let h = 0; h < numHashes; h++) if (sigs[i][h] === sigs[j][h]) same++;
    if (same / numHashes >= threshold) uf.union(i, j);
  }
  const rootToCluster = new Map();
  const members = new Map();
  for (let i = 0; i < findings.length; i++) {
    const r = uf.find(i);
    if (!rootToCluster.has(r)) rootToCluster.set(r, `c${String(rootToCluster.size + 1).padStart(3, "0")}`);
    const cid = rootToCluster.get(r);
    if (!members.has(cid)) members.set(cid, []);
    members.get(cid).push(findings[i]);
  }
  const labels = new Map();
  for (const [cid, ms] of members) {
    const best = [...ms].sort((a, b) =>
      (a.quality === "high" ? 0 : 1) - (b.quality === "high" ? 0 : 1) ||
      a.title.length - b.title.length || a.id.localeCompare(b.id))[0];
    labels.set(cid, best.title);
  }
  return findings.map((f, i) => {
    const cid = rootToCluster.get(uf.find(i));
    return { ...f, clusterId: cid, clusterLabel: labels.get(cid) };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/cluster.test.mjs` — Expected: all PASS. If the near-duplicate test fails, lower `threshold` to 0.4 in the default AND in the spec's risk section — do not special-case the test.

- [ ] **Step 5: Commit**

```bash
git add lib/cluster.mjs test/cluster.test.mjs
git commit -m "feat: deterministic MinHash clustering of near-duplicate findings"
```

---

### Task 5: `lib/bm25.mjs` — index + search

**Files:**
- Create: `lib/bm25.mjs`
- Test: `test/bm25.test.mjs`

**Interfaces:**
- Produces: `tokenize(text) -> string[]`; `buildIndex(docs: [{id, text}]) -> Index`; `search(index, query: string, k = Infinity) -> [{id, score}]` sorted score desc then id asc; empty query → `[]`.

- [ ] **Step 1: Write the failing test**

`test/bm25.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { tokenize, buildIndex, search } from "../lib/bm25.mjs";

const docs = [
  { id: "a", text: "optimistic file lock claim queue for parallel workers" },
  { id: "b", text: "champion record stores hyperparameters and training instructions" },
  { id: "c", text: "file lock retry with exponential backoff" },
];

test("tokenize lowercases and strips punctuation", () => {
  assert.deepEqual(tokenize("File-lock, CLAIM queue!"), ["file", "lock", "claim", "queue"]);
});

test("relevant doc ranks first", () => {
  const idx = buildIndex(docs);
  const hits = search(idx, "file lock queue");
  assert.equal(hits[0].id, "a");
  assert.ok(hits[0].score > hits.at(-1).score);
});

test("k limits results; empty query returns none", () => {
  const idx = buildIndex(docs);
  assert.equal(search(idx, "file lock", 1).length, 1);
  assert.deepEqual(search(idx, ""), []);
  assert.deepEqual(search(idx, "zzz qqq"), []);
});

test("deterministic tie-break by id", () => {
  const idx = buildIndex([{ id: "b", text: "same words" }, { id: "a", text: "same words" }]);
  assert.deepEqual(search(idx, "same words").map((h) => h.id), ["a", "b"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/bm25.test.mjs` — Expected: FAIL.

- [ ] **Step 3: Implement**

`lib/bm25.mjs`:
```js
const K1 = 1.2, B = 0.75;

export function tokenize(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
}

export function buildIndex(docs) {
  const df = new Map();          // term -> doc count
  const tf = new Map();          // docId -> Map(term -> count)
  const len = new Map();         // docId -> token count
  for (const d of docs) {
    const toks = tokenize(d.text);
    len.set(d.id, toks.length);
    const counts = new Map();
    for (const t of toks) counts.set(t, (counts.get(t) ?? 0) + 1);
    tf.set(d.id, counts);
    for (const t of counts.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const avgLen = docs.length ? [...len.values()].reduce((a, b) => a + b, 0) / docs.length : 0;
  return { df, tf, len, avgLen, n: docs.length };
}

export function search(index, query, k = Infinity) {
  const qToks = [...new Set(tokenize(query))];
  if (!qToks.length) return [];
  const scores = new Map();
  for (const [docId, counts] of index.tf) {
    let s = 0;
    for (const t of qToks) {
      const f = counts.get(t);
      if (!f) continue;
      const dfT = index.df.get(t) ?? 0;
      const idf = Math.log(1 + (index.n - dfT + 0.5) / (dfT + 0.5));
      s += idf * (f * (K1 + 1)) / (f + K1 * (1 - B + B * (index.len.get(docId) / index.avgLen)));
    }
    if (s > 0) scores.set(docId, s);
  }
  return [...scores.entries()].map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, k === Infinity ? undefined : k);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/bm25.test.mjs` — Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/bm25.mjs test/bm25.test.mjs
git commit -m "feat: hand-rolled BM25 index and search"
```

---

### Task 6: `lib/retrieve.mjs` — query / ground / inspire

**Files:**
- Create: `lib/retrieve.mjs`
- Test: `test/retrieve.test.mjs`

**Interfaces:**
- Consumes: `buildIndex`/`search` from `../lib/bm25.mjs` (Task 5 signatures).
- Produces: `createRetriever({ findings }) -> { query(opts), ground(opts), inspire(opts) }`. All return `Hit[] = ({...finding, score?})`.
  - `query({ q, topic, category, license, codeReuse, quality, k = 10 })` — BM25 over `title title text` (title double-weighted), then metadata filter, top-k. Never dedups.
  - `ground({ claim, topic, k = 6 })` — same ranking with `claim` as query.
  - `inspire({ topic, k = 5, rng = Math.random })` — filter by topic; best finding per gem (quality high first, then id); order gems quality-first; rng-pick k from the top 2k candidates (deterministic when `rng = () => 0`).

- [ ] **Step 1: Write the failing test**

`test/retrieve.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRetriever } from "../lib/retrieve.mjs";

const F = (id, gem, title, text, extra = {}) => ({
  id, gem, title, text, citation: "x.py:1-2", citations: ["x.py:1-2"],
  category: "pattern", topic: ["agent"], license: "MIT", codeReuse: "permissive",
  quality: "normal", clusterId: id, clusterLabel: title, repo: "a/b", sha: "1234567", ...extra,
});

const findings = [
  F("g1-f001", 1, "Optimistic file-lock claim queue", "workers claim jobs via file locks", { quality: "high" }),
  F("g1-f002", 1, "Dead-end registry", "persist failed directions negative knowledge"),
  F("g2-f001", 2, "Queue-and-claim file locks", "claim queued experiments with file locks", { topic: ["eval"] }),
  F("g3-f001", 3, "Champion record", "best model hyperparameters reproducible", { codeReuse: "forbidden", license: "none" }),
];

test("query ranks lexical match first and respects k", () => {
  const r = createRetriever({ findings });
  const hits = r.query({ q: "file locks claim queue", k: 2 });
  assert.equal(hits.length, 2);
  assert.ok(["g1-f001", "g2-f001"].includes(hits[0].id));
  assert.ok(hits[0].score > 0);
});

test("query metadata filters compose", () => {
  const r = createRetriever({ findings });
  assert.deepEqual(r.query({ q: "file locks", topic: "eval" }).map((h) => h.id), ["g2-f001"]);
  assert.deepEqual(r.query({ q: "champion hyperparameters", codeReuse: "forbidden" }).map((h) => h.id), ["g3-f001"]);
  assert.deepEqual(r.query({ q: "file locks", quality: "high" }).map((h) => h.id), ["g1-f001"]);
});

test("query never dedups near-identical hits", () => {
  const r = createRetriever({ findings });
  const ids = r.query({ q: "file locks claim" }).map((h) => h.id);
  assert.ok(ids.includes("g1-f001") && ids.includes("g2-f001"));
});

test("ground defaults to k=6 and uses claim text", () => {
  const r = createRetriever({ findings });
  const hits = r.ground({ claim: "we should persist failed directions" });
  assert.equal(hits[0].id, "g1-f002");
});

test("inspire is gem-diverse and deterministic with rng=()=>0", () => {
  const r = createRetriever({ findings });
  const hits = r.inspire({ k: 3, rng: () => 0 });
  assert.equal(hits.length, 3);
  assert.equal(new Set(hits.map((h) => h.gem)).size, 3);       // one per gem
  assert.equal(hits[0].id, "g1-f001");                          // quality high gem first
  assert.deepEqual(hits, r.inspire({ k: 3, rng: () => 0 }));    // deterministic
});

test("inspire topic filter", () => {
  const r = createRetriever({ findings });
  const hits = r.inspire({ topic: "eval", k: 5, rng: () => 0 });
  assert.deepEqual(hits.map((h) => h.id), ["g2-f001"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/retrieve.test.mjs` — Expected: FAIL.

- [ ] **Step 3: Implement**

`lib/retrieve.mjs`:
```js
import { buildIndex, search } from "./bm25.mjs";

function applyFilters(findings, { topic, category, license, codeReuse, quality }) {
  return findings.filter((f) =>
    (!topic || f.topic.includes(topic)) &&
    (!category || f.category === category) &&
    (!license || (f.license ?? "none").toLowerCase() === license.toLowerCase()) &&
    (!codeReuse || f.codeReuse === codeReuse) &&
    (!quality || f.quality === quality));
}

export function createRetriever({ findings }) {
  const byId = new Map(findings.map((f) => [f.id, f]));
  const index = buildIndex(findings.map((f) => ({ id: f.id, text: `${f.title} ${f.title} ${f.text}` })));

  function ranked(q, filters, k) {
    const hits = search(index, q);
    const allowed = new Set(applyFilters(findings, filters).map((f) => f.id));
    return hits.filter((h) => allowed.has(h.id)).slice(0, k).map((h) => ({ ...byId.get(h.id), score: h.score }));
  }

  return {
    query({ q, k = 10, ...filters }) { return ranked(q, filters, k); },
    ground({ claim, topic, k = 6 }) { return ranked(claim, { topic }, k); },
    inspire({ topic, k = 5, rng = Math.random } = {}) {
      const pool = applyFilters(findings, { topic });
      const byGem = new Map();
      for (const f of pool) {
        const cur = byGem.get(f.gem);
        const better = !cur || (f.quality === "high" && cur.quality !== "high") ||
          (f.quality === cur.quality && f.id < cur.id);
        if (better) byGem.set(f.gem, f);
      }
      const candidates = [...byGem.values()].sort((a, b) =>
        (a.quality === "high" ? 0 : 1) - (b.quality === "high" ? 0 : 1) || a.gem - b.gem);
      const top = candidates.slice(0, 2 * k);
      const picked = [];
      while (picked.length < k && top.length) picked.push(top.splice(Math.floor(rng() * top.length), 1)[0]);
      return picked;
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/retrieve.test.mjs` — Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/retrieve.mjs test/retrieve.test.mjs
git commit -m "feat: query/ground/inspire retrieval over BM25 + metadata filters"
```

---

### Task 7: `lib/render.mjs` — Markdown result rendering

The exact block format is specified in the design doc §3 (no emojis; license spelled out; cluster variants nested under a compare header, never dropped).

**Files:**
- Create: `lib/render.mjs`
- Test: `test/render.test.mjs`

**Interfaces:**
- Consumes: `reuseNote` from `../lib/license-map.mjs` (Task 2).
- Produces:
  - `renderHits(hits, { gemsByNumber, heading }) -> string` — hits in rank order; clusters with ≥2 hits render best hit as a full block + `N takes on "<label>" - compare:` + compact sibling lines. Every full block ends with the gem issue link `https://github.com/mattiasutancykeln/gems/issues/<n>`.
  - `renderEmpty({ q, findings, issueFormUrl }) -> string` — actionable: lists available topics and the submit link.
  - `snippet(text, max = 300) -> string` — word-boundary truncation with `…`.

- [ ] **Step 1: Write the failing test**

`test/render.test.mjs`:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/render.test.mjs` — Expected: FAIL.

- [ ] **Step 3: Implement**

`lib/render.mjs`:
```js
import { reuseNote } from "./license-map.mjs";

const ISSUES = "https://github.com/mattiasutancykeln/gems/issues";

export function snippet(text, max = 300) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}

function fullBlock(f, rank, gemsByNumber) {
  const gemTitle = gemsByNumber.get(f.gem)?.title ?? `gem #${f.gem}`;
  const q = f.quality === "high" ? "[high] " : "";
  const cite = f.citation ? `\`${f.citation}\`${f.sha ? ` @ ${f.sha}` : ""}\n` : "";
  return `### ${rank}. ${f.title}   ${q}${f.category}\n` +
    `${gemTitle} (gem #${f.gem}) · topics: ${f.topic.join(", ")}\n` +
    cite +
    `${reuseNote(f.codeReuse, f.license)}\n` +
    `${snippet(f.text)}\n` +
    `-> ${ISSUES}/${f.gem}\n`;
}

function compactLine(f, rank) {
  const cite = f.citation ? ` · \`${f.citation}\`` : "";
  const lic = f.codeReuse === "permissive" ? ` · ${f.license} (permissive)` : ` · ${f.license ?? "none"} (${f.codeReuse})`;
  return `  ${rank}. ${f.title} — gem #${f.gem}${cite}${lic}`;
}

export function renderHits(hits, { gemsByNumber, heading }) {
  if (!hits.length) return heading ? `${heading}\n\n(no results)` : "(no results)";
  const parts = heading ? [heading, ""] : [];
  const rendered = new Set();
  let rank = 0;
  for (const h of hits) {
    if (rendered.has(h.id)) continue;
    rank += 1;
    parts.push(fullBlock(h, rank, gemsByNumber));
    rendered.add(h.id);
    const siblings = hits.filter((x) => x.clusterId === h.clusterId && !rendered.has(x.id));
    if (siblings.length) {
      parts.push(`${siblings.length + 1} takes on "${h.clusterLabel}" - compare:`);
      for (const s of siblings) { rank += 1; parts.push(compactLine(s, rank)); rendered.add(s.id); }
      parts.push("");
    }
  }
  return parts.join("\n").trim() + "\n";
}

export function renderEmpty({ q, findings, issueFormUrl }) {
  const topics = [...new Set(findings.flatMap((f) => f.topic))].sort().join(", ");
  return `No findings for "${q}".\n\n` +
    `Available topics: ${topics}\n` +
    `Try again without filters, broaden the query, or submit this as a new gem: ${issueFormUrl}\n`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/render.test.mjs` — Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/render.mjs test/render.test.mjs
git commit -m "feat: markdown rendering with cluster compare groups and actionable empty state"
```

---

### Task 8: `lib/pages.mjs` — gem pages, CATALOG, README stats

**Files:**
- Create: `lib/pages.mjs`
- Test: `test/pages.test.mjs`

**Interfaces:**
- Consumes: Gem + Finding records (Data Shapes).
- Produces:
  - `slugify(title) -> string` (lowercase, alnum+dash, ≤40 chars, no leading/trailing dash)
  - `gemPageName(gem) -> string` — `NNNN-slug.md` (number padded to 4)
  - `renderGemPage(gem, findings, allFindings) -> string` — metadata table, TL;DR omitted (lives on the issue), findings grouped by category with stable HTML anchors `<a id="g21-f007"></a>`, and for findings whose cluster spans other gems an `Other takes:` line linking sibling gem pages.
  - `renderCatalog(gems, findings) -> string` — Highlights section (clusters spanning ≥2 gems, quality-first, top 8) then the full table `# | gem | source | topics | findings | license | verdict` with gem column linking to the gem page and `#` linking to the issue.
  - `injectStats(readme, { gems, findings, clusters }) -> string` — replaces content between `<!-- stats:start -->` and `<!-- stats:end -->` markers.

- [ ] **Step 1: Write the failing test**

`test/pages.test.mjs`:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/pages.test.mjs` — Expected: FAIL.

- [ ] **Step 3: Implement**

`lib/pages.mjs`:
```js
const ISSUES = "https://github.com/mattiasutancykeln/gems/issues";
const CATEGORY_TITLES = [
  ["impl-decision", "Implementation decisions"],
  ["skill-prompt-tool", "Skills, prompts, tools"],
  ["pattern", "Patterns worth porting"],
  ["weak-spot", "Open threads / weak spots"],
  ["highlight", "Highlights"],
];

export function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");
}

export function gemPageName(gem) {
  return `${String(gem.number).padStart(4, "0")}-${slugify(gem.title)}.md`;
}

export function renderGemPage(gem, findings, allFindings) {
  const gemByNumber = new Map();
  for (const f of allFindings) gemByNumber.set(f.gem, f.gem);
  const lines = [
    `# ${gem.title}`,
    "",
    "| | |",
    "|---|---|",
    `| Source | ${gem.url ?? "-"} |`,
    ...(gem.repo ? [`| Repo | https://github.com/${gem.repo}${gem.sha ? ` @ \`${gem.sha}\`` : ""} |`] : []),
    `| Kind | ${gem.source ?? "-"} |`,
    `| Topics | ${gem.topics.join(", ") || "-"} |`,
    `| License | ${gem.license ?? "none"} (${gem.codeReuse}) |`,
    `| Verdict | ${gem.verdict ?? "-"} |`,
    `| Findings | ${findings.length} |`,
    `| Issue | ${ISSUES}/${gem.number} |`,
    "",
  ];
  for (const [cat, catTitle] of CATEGORY_TITLES) {
    const catFindings = findings.filter((f) => f.category === cat);
    if (!catFindings.length) continue;
    lines.push(`## ${catTitle}`, "");
    for (const f of catFindings) {
      const cite = f.citation ? ` \`${f.citation}\`${f.sha ? ` @ ${f.sha}` : ""}` : "";
      lines.push(`<a id="${f.id}"></a>`, `### ${f.title}`, "", cite ? cite.trim() : "", "", f.text, "");
      const siblings = allFindings.filter((x) => x.clusterId === f.clusterId && x.gem !== f.gem);
      if (siblings.length) {
        const links = [...new Map(siblings.map((s) => [s.gem, s])).values()]
          .map((s) => `[gem #${s.gem}](${gemPageName({ number: s.gem, title: guessTitle(s, allFindings) })}#${s.id})`);
        lines.push(`Other takes: ${links.join(", ")}`, "");
      }
    }
  }
  return lines.filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n") + "\n";
}

// gem page links need the sibling gem's title; pages are rendered with the gems array available,
// so sync passes gems into renderCatalog/renderGemPage — helper resolves from a gems map set below.
let GEM_TITLES = new Map();
export function setGemTitles(gems) { GEM_TITLES = new Map(gems.map((g) => [g.number, g.title])); }
function guessTitle(finding, _all) { return GEM_TITLES.get(finding.gem) ?? `gem-${finding.gem}`; }

export function renderCatalog(gems, findings) {
  setGemTitles(gems);
  const clusters = new Map();
  for (const f of findings) {
    if (!clusters.has(f.clusterId)) clusters.set(f.clusterId, []);
    clusters.get(f.clusterId).push(f);
  }
  const multi = [...clusters.values()].filter((ms) => new Set(ms.map((m) => m.gem)).size >= 2)
    .sort((a, b) => (a.some((m) => m.quality === "high") ? 0 : 1) - (b.some((m) => m.quality === "high") ? 0 : 1) || b.length - a.length)
    .slice(0, 8);
  const lines = ["# Catalog", "", "Generated by `scripts/sync-corpus.mjs` - do not edit by hand.", ""];
  if (multi.length) {
    lines.push("## Highlights", "", "Patterns with multiple independent implementations across gems:", "");
    for (const ms of multi) {
      const gemsIn = [...new Set(ms.map((m) => m.gem))].sort((a, b) => a - b);
      lines.push(`- ${ms.length} takes on "${ms[0].clusterLabel}" - ${gemsIn.map((g) => `[#${g}](${ISSUES}/${g})`).join(", ")}`);
    }
    lines.push("");
  }
  lines.push("## All gems", "", "| # | gem | source | topics | findings | license | verdict |", "|---|---|---|---|---|---|---|");
  const sorted = [...gems].sort((a, b) =>
    (a.quality === "high" ? 0 : 1) - (b.quality === "high" ? 0 : 1) || a.number - b.number);
  for (const g of sorted) {
    lines.push(`| [#${g.number}](${ISSUES}/${g.number}) | [${g.title}](gems/${gemPageName(g)}) | ${g.source ?? "-"} | ${g.topics.join(", ") || "-"} | ${g.findingCount} | ${g.license ?? "none"} (${g.codeReuse}) | ${g.verdict ?? "-"} |`);
  }
  return lines.join("\n") + "\n";
}

export function injectStats(readme, { gems, findings, clusters }) {
  const stats = `**${gems} gems · ${findings} findings · ${clusters} clusters** - MIT licensed`;
  return readme.replace(/<!-- stats:start -->[\s\S]*?<!-- stats:end -->/, `<!-- stats:start -->${stats}<!-- stats:end -->`);
}
```

Note: `renderCatalog` calls `setGemTitles`; `sync-corpus` (Task 9) must call `renderCatalog` BEFORE `renderGemPage` so cross-page links resolve titles, or call `setGemTitles(gems)` explicitly first. Task 9 calls `setGemTitles(gems)` explicitly — rely on that.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/pages.test.mjs` — Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/pages.mjs test/pages.test.mjs
git commit -m "feat: gem pages, catalog with cluster highlights, README stats injection"
```

---

### Task 9: `scripts/sync-corpus.mjs` — orchestration

**Files:**
- Create: `scripts/sync-corpus.mjs`
- Test: `test/sync-corpus.test.mjs`

**Interfaces:**
- Consumes: `parseIssue` (Task 3), `clusterFindings` (Task 4), `codeReuseFor` (Task 2), `renderGemPage`/`renderCatalog`/`gemPageName`/`setGemTitles`/`injectStats` (Task 8).
- Produces: `syncCorpus({ fetchIssues, fetchLicense, rootDir, log = console.error }) -> { gems, findings, warnings }` writing `corpus/gems.json`, `corpus/findings.jsonl`, `corpus/gems/*.md`, `corpus/.licenses.json`, `CATALOG.md`, `corpus/PARSE_WARNINGS.md` (only when warnings exist; deleted otherwise), README stats markers. CLI entry: `node scripts/sync-corpus.mjs [--dry-run]` using `gh`.
  - `fetchIssues() -> issue[]` (Task 3 issue shape).
  - `fetchLicense(repo) -> string` SPDX id or `"none"`.

- [ ] **Step 1: Write the failing test**

`test/sync-corpus.test.mjs`:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/sync-corpus.test.mjs` — Expected: FAIL.

- [ ] **Step 3: Implement**

`scripts/sync-corpus.mjs`:
```js
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseIssue } from "../lib/parse-report.mjs";
import { clusterFindings } from "../lib/cluster.mjs";
import { codeReuseFor } from "../lib/license-map.mjs";
import { renderGemPage, renderCatalog, gemPageName, setGemTitles, injectStats } from "../lib/pages.mjs";

const REPO = "mattiasutancykeln/gems";

export function syncCorpus({ fetchIssues, fetchLicense, rootDir, log = console.error }) {
  const corpusDir = join(rootDir, "corpus");
  const pagesDir = join(corpusDir, "gems");
  mkdirSync(pagesDir, { recursive: true });

  const cachePath = join(corpusDir, ".licenses.json");
  const licenseCache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, "utf8")) : {};

  const issues = fetchIssues();
  const gems = [];
  let findings = [];
  const warnings = [];

  for (const issue of [...issues].sort((a, b) => a.number - b.number)) {
    const parsed = parseIssue(issue);
    warnings.push(...parsed.warnings);
    const repo = parsed.gem.repo;
    let license = "none";
    if (repo) {
      if (!(repo in licenseCache)) { licenseCache[repo] = fetchLicense(repo); log(`license ${repo}: ${licenseCache[repo]}`); }
      license = licenseCache[repo] || "none";
    }
    if (license === "NOASSERTION") license = "none";
    const codeReuse = codeReuseFor(license === "none" ? null : license);
    const gem = { ...parsed.gem, license, codeReuse, findingCount: parsed.findings.length };
    gems.push(gem);
    for (const f of parsed.findings) findings.push({ ...f, topic: gem.topics, license, codeReuse, quality: gem.quality });
  }

  findings = clusterFindings(findings);
  const clusterCount = new Set(findings.map((f) => f.clusterId)).size;

  // write corpus
  writeFileSync(join(corpusDir, "gems.json"), JSON.stringify(gems, null, 2) + "\n");
  writeFileSync(join(corpusDir, "findings.jsonl"), findings.map((f) => JSON.stringify(f)).join("\n") + "\n");
  writeFileSync(cachePath, JSON.stringify(Object.fromEntries(Object.entries(licenseCache).sort()), null, 2) + "\n");

  setGemTitles(gems);
  for (const stale of readdirSync(pagesDir)) rmSync(join(pagesDir, stale));
  for (const gem of gems)
    writeFileSync(join(pagesDir, gemPageName(gem)), renderGemPage(gem, findings.filter((f) => f.gem === gem.number), findings));
  writeFileSync(join(rootDir, "CATALOG.md"), renderCatalog(gems, findings));

  const warnPath = join(corpusDir, "PARSE_WARNINGS.md");
  if (warnings.length)
    writeFileSync(warnPath, "# Parse warnings\n\nGenerated by sync-corpus. Fix the source comment or the parser.\n\n" + warnings.map((w) => `- ${w}`).join("\n") + "\n");
  else if (existsSync(warnPath)) rmSync(warnPath);

  const readmePath = join(rootDir, "README.md");
  if (existsSync(readmePath))
    writeFileSync(readmePath, injectStats(readFileSync(readmePath, "utf8"), { gems: gems.length, findings: findings.length, clusters: clusterCount }));

  log(`sync: ${gems.length} gems · ${findings.length} findings · ${clusterCount} clusters · ${warnings.length} warnings`);
  return { gems, findings, warnings };
}

// ---- CLI (gh-backed) ----
const EXEC_OPTS = { maxBuffer: 64 * 1024 * 1024, encoding: "utf8" };

function ghFetchIssues() {
  const list = JSON.parse(execFileSync("gh",
    ["issue", "list", "--repo", REPO, "--state", "all", "--limit", "500", "--json", "number,title,body,labels,url"], EXEC_OPTS));
  return list.map((i) => {
    const comments = JSON.parse(execFileSync("gh",
      ["issue", "view", String(i.number), "--repo", REPO, "--json", "comments", "--jq", "[.comments[].body]"], EXEC_OPTS));
    return { number: i.number, title: i.title, body: i.body ?? "", url: i.url,
      labels: i.labels.map((l) => l.name), comments };
  });
}

function ghFetchLicense(repo) {
  try {
    return execFileSync("gh", ["api", `repos/${repo}/license`, "--jq", ".license.spdx_id"], EXEC_OPTS).trim() || "none";
  } catch { return "none"; }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
  if (process.argv.includes("--dry-run")) {
    const issues = ghFetchIssues();
    console.error(`dry-run: ${issues.length} issues fetched, no files written`);
  } else {
    const { warnings } = syncCorpus({ fetchIssues: ghFetchIssues, fetchLicense: ghFetchLicense, rootDir });
    if (warnings.length) console.error(`NOTE: ${warnings.length} parse warnings -> corpus/PARSE_WARNINGS.md`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/sync-corpus.test.mjs && npm test`
Expected: all PASS (full suite green).

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-corpus.mjs test/sync-corpus.test.mjs
git commit -m "feat: sync-corpus orchestration - issues to corpus, licenses, pages, catalog"
```

---

### Task 10: `mcp/server.mjs` + `.mcp.json` + E2E test

**Files:**
- Create: `mcp/server.mjs`
- Create: `.mcp.json`
- Test: `test/server.e2e.test.mjs`

**Interfaces:**
- Consumes: `createRetriever` (Task 6), `renderHits`/`renderEmpty` (Task 7), corpus files (Task 9 formats).
- Produces: stdio MCP server with tools `gems_query`, `gems_ground`, `gems_inspire`. Corpus dir from `GEMS_CORPUS` env else `<repo>/corpus`.

- [ ] **Step 1: Write the failing E2E test**

`test/server.e2e.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const here = dirname(fileURLToPath(import.meta.url));

function makeCorpus() {
  const dir = mkdtempSync(join(tmpdir(), "gems-corpus-"));
  mkdirSync(join(dir, "gems"), { recursive: true });
  const gems = [{ number: 1, title: "widget", url: "u", repo: "acme/widget", sha: "1234567", source: "repo",
    topics: ["agent"], verdict: "keep", quality: "high", stage: "extracted", license: "MIT",
    codeReuse: "permissive", findingCount: 2 }];
  const findings = [
    { id: "g1-f001", gem: 1, repo: "acme/widget", sha: "1234567", citation: "src/q.ts:1-9", citations: ["src/q.ts:1-9"],
      category: "pattern", topic: ["agent"], license: "MIT", codeReuse: "permissive", quality: "high",
      clusterId: "c001", clusterLabel: "claim queue", title: "Optimistic claim queue", text: "workers claim jobs via file locks" },
    { id: "g1-f002", gem: 1, repo: "acme/widget", sha: "1234567", citation: "src/d.ts:2-5", citations: ["src/d.ts:2-5"],
      category: "weak-spot", topic: ["agent"], license: "MIT", codeReuse: "permissive", quality: "high",
      clusterId: "c002", clusterLabel: "dead ends", title: "Dead-end registry", text: "persist failed directions" },
  ];
  writeFileSync(join(dir, "gems.json"), JSON.stringify(gems));
  writeFileSync(join(dir, "findings.jsonl"), findings.map((f) => JSON.stringify(f)).join("\n") + "\n");
  return dir;
}

async function connect(corpusDir) {
  const transport = new StdioClientTransport({
    command: "node",
    args: [join(here, "..", "mcp", "server.mjs")],
    env: { ...process.env, GEMS_CORPUS: corpusDir },
  });
  const client = new Client({ name: "e2e", version: "1.0.0" });
  await client.connect(transport);
  return client;
}

test("server exposes 3 tools and answers a query", async () => {
  const client = await connect(makeCorpus());
  try {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), ["gems_ground", "gems_inspire", "gems_query"]);
    const res = await client.callTool({ name: "gems_query", arguments: { q: "claim queue file locks" } });
    const text = res.content[0].text;
    assert.match(text, /Optimistic claim queue/);
    assert.match(text, /`src\/q\.ts:1-9` @ 1234567/);
    assert.match(text, /License: MIT \(permissive\)/);
  } finally { await client.close(); }
});

test("ground and inspire respond; empty query is actionable", async () => {
  const client = await connect(makeCorpus());
  try {
    const g = await client.callTool({ name: "gems_ground", arguments: { claim: "persist failed directions" } });
    assert.match(g.content[0].text, /Dead-end registry/);
    const i = await client.callTool({ name: "gems_inspire", arguments: {} });
    assert.match(i.content[0].text, /gem #1/);
    const e = await client.callTool({ name: "gems_query", arguments: { q: "zzzz-nonexistent" } });
    assert.match(e.content[0].text, /No findings for/);
    assert.match(e.content[0].text, /Available topics: agent/);
  } finally { await client.close(); }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/server.e2e.test.mjs` — Expected: FAIL (server file missing).

- [ ] **Step 3: Implement server + `.mcp.json`**

`mcp/server.mjs`:
```js
#!/usr/bin/env node
// gems MCP server - stdio. stdout is protocol-only; all logging goes to stderr.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const corpusDir = process.env.GEMS_CORPUS ?? join(here, "..", "corpus");
const ISSUE_FORM = "https://github.com/mattiasutancykeln/gems/issues/new?template=gem.yml";

async function main() {
  let McpServer, StdioServerTransport, z;
  try {
    ({ McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js"));
    ({ StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js"));
    ({ z } = await import("zod"));
  } catch (err) {
    console.error("gems: dependencies missing. Run `npm install` in the gems repo root.");
    console.error(String(err?.message ?? err));
    process.exit(1);
  }
  const { createRetriever } = await import("../lib/retrieve.mjs");
  const { renderHits, renderEmpty } = await import("../lib/render.mjs");

  const gemsPath = join(corpusDir, "gems.json");
  const findingsPath = join(corpusDir, "findings.jsonl");
  if (!existsSync(gemsPath) || !existsSync(findingsPath)) {
    console.error(`gems: corpus not found at ${corpusDir}.`);
    console.error("Run `node scripts/sync-corpus.mjs` to generate it, or set GEMS_CORPUS to the corpus directory.");
    process.exit(1);
  }
  const gems = JSON.parse(readFileSync(gemsPath, "utf8"));
  const findings = readFileSync(findingsPath, "utf8").trim().split("\n").map(JSON.parse);
  const gemsByNumber = new Map(gems.map((g) => [g.number, g]));
  const retriever = createRetriever({ findings });
  const clusters = new Set(findings.map((f) => f.clusterId)).size;

  const asResult = (hits, q) => ({
    content: [{ type: "text", text: hits.length ? renderHits(hits, { gemsByNumber }) : renderEmpty({ q, findings, issueFormUrl: ISSUE_FORM }) }],
  });

  const server = new McpServer({ name: "gems", version: "1.0.0" });
  const topicEnum = z.enum(["agent", "eval", "infra", "ux", "research"]).optional()
    .describe("Filter by topic label");

  server.registerTool("gems_query", {
    title: "Search the gems corpus",
    description: "Search the gems corpus of mined implementation findings from open-source agent/research repos and papers. Every hit carries an exact file:line citation, its source gem, and a license/code-reuse flag. Use for targeted search over patterns, tools, prompts, and weak spots. For broad ideation use gems_inspire; to back a specific technical decision with cited evidence use gems_ground.",
    inputSchema: {
      q: z.string().describe("Search query (keywords)"),
      topic: topicEnum,
      category: z.enum(["impl-decision", "skill-prompt-tool", "pattern", "weak-spot", "highlight"]).optional(),
      codeReuse: z.enum(["permissive", "ideas-only", "forbidden"]).optional(),
      quality: z.enum(["high", "normal"]).optional(),
      k: z.number().int().min(1).max(25).optional().describe("Max results, default 10"),
    },
  }, async ({ q, k = 10, ...filters }) => asResult(retriever.query({ q, k, ...filters }), q));

  server.registerTool("gems_ground", {
    title: "Ground a claim in cited findings",
    description: "Find cited evidence from mined open-source repos and papers that supports or informs a specific technical claim or decision. Returns fewer, higher-confidence findings with exact file:line citations and a license-safety note stating whether code may be copied or only the idea adopted. Use when about to choose an approach. For broad ideation use gems_inspire; for plain search use gems_query.",
    inputSchema: {
      claim: z.string().describe("The technical claim or decision to ground"),
      topic: topicEnum,
      k: z.number().int().min(1).max(15).optional().describe("Max results, default 6"),
    },
  }, async ({ claim, topic, k = 6 }) => asResult(retriever.ground({ claim, topic, k }), claim));

  server.registerTool("gems_inspire", {
    title: "Get inspiration from standout findings",
    description: "Get a diverse, quality-weighted sample of standout implementation patterns from the gems corpus to spark ideas when starting new work. Returns at most one finding per source gem for maximum breadth. Optionally filter by topic. To back a specific decision use gems_ground; for targeted search use gems_query.",
    inputSchema: {
      topic: topicEnum,
      k: z.number().int().min(1).max(15).optional().describe("Sample size, default 5"),
    },
  }, async ({ topic, k = 5 }) => asResult(retriever.inspire({ topic, k }), topic ?? "inspiration"));

  await server.connect(new StdioServerTransport());
  console.error(`gems: ${gems.length} gems · ${findings.length} findings · ${clusters} clusters · corpus @ ${corpusDir}`);
}

main().catch((err) => { console.error("gems: fatal:", err); process.exit(1); });
```

`.mcp.json`:
```json
{
  "mcpServers": {
    "gems": {
      "type": "stdio",
      "command": "node",
      "args": ["${CLAUDE_PROJECT_DIR}/mcp/server.mjs"]
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/server.e2e.test.mjs && npm test`
Expected: all PASS, full suite green.

- [ ] **Step 5: Commit**

```bash
git add mcp/server.mjs .mcp.json test/server.e2e.test.mjs
git commit -m "feat: gems MCP server - query/ground/inspire over the corpus"
```

---

### Task 11: Real sync — generate and commit the live corpus

No new code. Run the real pipeline against the live repo, inspect the output like a reviewer, commit.

- [ ] **Step 1: Run sync against live issues**

Run: `cd /home/mattiasutancykeln/gems && node scripts/sync-corpus.mjs`
Expected stderr: `sync: 21 gems · <N> findings · <C> clusters · <W> warnings` where N is in the hundreds. `gh` must be authenticated (it is on this machine).

- [ ] **Step 2: Inspect output quality**

- `cat corpus/PARSE_WARNINGS.md` if present — read every warning. If >20% of extracted gems produce zero findings, the parser missed a real comment shape: STOP and report back with 2 example issue numbers rather than committing garbage.
- Spot-check 3 findings in `corpus/findings.jsonl` against their live issue comments (`gh issue view <n> --repo mattiasutancykeln/gems`): title, citation, category must match the source bullet.
- Check `corpus/gems.json`: every gem with a `repo` has a non-empty `license` (e.g. AutoScientists → MIT, SciAgentArena → none).
- Open `CATALOG.md`: Highlights section present, table complete, no emojis.
- Sanity: `node mcp/server.mjs < /dev/null` prints the stats banner to stderr (then exits when stdin closes).

- [ ] **Step 3: Commit the corpus**

```bash
git add corpus/ CATALOG.md README.md
git commit -m "feat: generated corpus from live issues - gems.json, findings.jsonl, gem pages, catalog"
```

---

### Task 12: Community surface — README, CONTRIBUTING, CI, labels, issue form

**Files:**
- Modify: `README.md` (full rewrite; keep the `<!-- stats:start/end -->` markers)
- Modify: `CONTRIBUTING.md` (add "Help extract" recipe near the top; keep existing pipeline reference below)
- Modify: `.github/ISSUE_TEMPLATE/gem.yml`
- Modify: `scripts/setup-labels.sh` (append two labels)
- Create: `.github/workflows/sync-corpus.yml`

**Interfaces:**
- Consumes: everything shipped in Tasks 1–11.
- Produces: the public face. After this task a stranger can use, browse, submit, and extract without asking anything.

- [ ] **Step 1: Rewrite `README.md`**

Follow the spec §6 order exactly (hero → 60 seconds → how it works → contribute → why). Full content:

````markdown
# gems

A mined, cited, searchable corpus of the best implementation patterns from open-source agent and research repos - queryable by your coding agent over MCP.

<!-- stats:start -->**21 gems · N findings · C clusters** - MIT licensed<!-- stats:end -->

Every finding is anchored to an exact `path:line-range @ sha` citation and carries a license flag so your agent knows whether it may copy code or only adopt the idea. Example hit, exactly as the MCP returns it:

```markdown
### 1. Budget-before-validity check   [high] pattern
SciAgentArena (gem #21) · topics: eval, infra
`evaluations/dd/scorers/oracle_budget.py:147-153` @ ce27b8c
License: none - FORBIDDEN to copy code, adopt the idea only
Budget check runs before validity so over-budget runs are zeroed …
-> https://github.com/mattiasutancykeln/gems/issues/21
```

## Use it in 60 seconds

**Agents (Claude Code):**

```bash
git clone https://github.com/mattiasutancykeln/gems.git
cd gems && npm install
claude   # approve the workspace trust prompt; tools connect automatically
```

Three tools appear: `gems_query` (targeted search), `gems_ground` (cited evidence for a decision, license-aware), `gems_inspire` (diverse high-quality sample to spark ideas). To make them available in every project instead:

```bash
claude mcp add --scope user gems -- node /path/to/gems/mcp/server.mjs
```

**Humans:** browse [CATALOG.md](CATALOG.md) - highlights first, full table below - or the per-gem pages in [corpus/gems/](corpus/gems/).

**Have a link?** [Submit a gem](https://github.com/mattiasutancykeln/gems/issues/new?template=gem.yml) - a URL and one sentence is all it takes. \(oOo)/

## How it works

```
add link -> stage:raw -> stage:summarized -> stage:extracted -> corpus/ -> MCP
            (issue)      (one LLM pass)      (parallel deep      (committed,
                                              extraction)         regenerated by CI)
```

Issues are the capture surface; `corpus/` is the derived, committed, searchable form (finding-level JSONL + gem pages). CI re-syncs whenever a gem reaches `stage:extracted`, so every clone ships a fresh corpus and the MCP works offline with no API keys.

## Contribute

Two rungs:

1. **Submit a gem** - zero setup, [issue form](https://github.com/mattiasutancykeln/gems/issues/new?template=gem.yml). The pipeline takes it from there.
2. **Help extract** - burn some tokens: pick a gem from the [extraction queue](https://github.com/mattiasutancykeln/gems/issues?q=is%3Aopen+label%3A%22help+wanted%22), claim it, run the extraction from your Claude Code session, post the report. Full recipe in [CONTRIBUTING.md](CONTRIBUTING.md#help-extract).

## Why

Ideas are cheap to lose and extraction is expensive to redo. gems keeps both: raw links cost nothing to capture, deep extractions are mined once at a pinned SHA and cited forever, and agents get to stand on that prior art instead of rediscovering it. Design rationale: [docs/design/2026-07-01-corpus-mcp-design.md](docs/design/2026-07-01-corpus-mcp-design.md).
````

Note: the stats line is regenerated by sync — put placeholder counts; then run `node scripts/sync-corpus.mjs` once after writing to refresh it.

- [ ] **Step 2: Add "Help extract" to `CONTRIBUTING.md`**

Insert this section right after the intro paragraph (keep everything else, but delete the now-redundant "Running with Claude Code" duplicate in README if it conflicts — README owns quickstart, CONTRIBUTING owns depth):

````markdown
## Help extract

The highest-value contribution: turn a summarized gem into a cited extraction report. You need the `gh` CLI and a Claude Code session (the tokens are yours to burn).

1. Pick a gem from the [extraction queue](https://github.com/mattiasutancykeln/gems/issues?q=is%3Aopen+label%3A%22help+wanted%22) (or any open `stage:summarized` gem).
2. Claim it so nobody double-spends: comment `claiming` on the issue and add the `status:claimed` label.
3. Prep (shell, no LLM calls): `bash scripts/extract.sh <issue#> --prep-only`
4. In a Claude Code session: *"pick up the extraction prep at <prep_dir> for gem #<issue#>"* - workers read the batches, the coordinator merges, and the session posts the report comment.
5. The report must follow the citation contract below (`path:LINE-LINE @ owner/repo@SHA`). The maintainer flips the label to `stage:extracted`; CI regenerates `corpus/` automatically - you never edit corpus files.
````

- [ ] **Step 3: Polish `.github/ISSUE_TEMPLATE/gem.yml`**

Replace with (two fields + dropdown, auto-label):

```yaml
name: Gem
description: Drop a link worth mining - a repo, paper, or article with substantive technique
title: "[raw] "
labels: ["stage:raw"]
body:
  - type: input
    id: url
    attributes:
      label: URL
      placeholder: "https://github.com/owner/repo…"
    validations:
      required: true
  - type: input
    id: note
    attributes:
      label: Why it caught your eye (optional)
      placeholder: "cleaner take on sandboxed exec…"
  - type: dropdown
    id: kind
    attributes:
      label: Kind
      options: [repo, paper, article, other]
      default: 0
```

- [ ] **Step 4: Append queue labels to `scripts/setup-labels.sh`**

Append (matching the script's existing `gh label create … --force` idiom — read the file first and reuse its exact function/pattern):

```bash
gh label create "help wanted"           --repo "$REPO" --color 008672 --description "Extraction queue: claim it, burn tokens, post the report" --force
gh label create "good first extraction" --repo "$REPO" --color 7057ff --description "Small repo, clean structure - good first extraction" --force
```

Run: `bash scripts/setup-labels.sh` — Expected: exits 0, labels visible via `gh label list --repo mattiasutancykeln/gems`.

- [ ] **Step 5: Create `.github/workflows/sync-corpus.yml`**

```yaml
name: sync-corpus
on:
  issues:
    types: [labeled]
  workflow_dispatch:

concurrency:
  group: sync-corpus
  cancel-in-progress: false

jobs:
  sync:
    if: github.event_name == 'workflow_dispatch' || github.event.label.name == 'stage:extracted'
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: node scripts/sync-corpus.mjs
        env:
          GH_TOKEN: ${{ github.token }}
      - name: Commit corpus if changed
        run: |
          git config user.name "gems-sync[bot]"
          git config user.email "gems-sync@users.noreply.github.com"
          git add corpus/ CATALOG.md README.md
          git diff --cached --quiet && echo "corpus unchanged" && exit 0
          git commit -m "chore: sync corpus from issues"
          git push
```

- [ ] **Step 6: Refresh stats and verify no emojis anywhere**

Run:
```bash
node scripts/sync-corpus.mjs
grep -rnP '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]' README.md CONTRIBUTING.md CATALOG.md corpus/gems/ .github/ || echo CLEAN
```
Expected: `CLEAN` on the grep. README stats line shows real counts.

- [ ] **Step 7: Commit**

```bash
git add README.md CONTRIBUTING.md .github/ISSUE_TEMPLATE/gem.yml scripts/setup-labels.sh .github/workflows/sync-corpus.yml corpus/ CATALOG.md
git commit -m "docs: community-facing README, help-extract recipe, CI corpus sync, queue labels"
```

---

### Task 13: Final verification — fresh-consumer walk-through

No new code. Simulate the stranger's path end-to-end.

- [ ] **Step 1: Full suite + fresh-install simulation**

```bash
cd /home/mattiasutancykeln/gems
npm test                                   # all green
rm -rf node_modules && npm ci && npm test  # fresh install works from lockfile
```
Expected: both `npm test` runs fully green.

- [ ] **Step 2: Server against the real corpus**

```bash
node mcp/server.mjs < /dev/null            # banner: gems: 21 gems · N findings · C clusters
GEMS_CORPUS=/nonexistent node mcp/server.mjs < /dev/null; echo "exit=$?"
```
Expected: first prints the stats banner to stderr; second prints the actionable corpus-not-found message and `exit=1`.

- [ ] **Step 3: Live tool call through a real MCP client**

Write a throwaway script `/tmp/gems-live-check.mjs` (do NOT commit) that connects like `test/server.e2e.test.mjs` but WITHOUT `GEMS_CORPUS` (real corpus), calls `gems_ground({ claim: "workers should claim jobs via optimistic file locks" })` and `gems_inspire({})`, and prints both texts. Run it; read the output like a reviewer:
- citations present and plausible, license notes present, no emojis, cluster compare groups render when they fire.
- If `gems_inspire` returns fewer than 5 gems' findings, that's fine (corpus breadth), but zero results is a bug — investigate before closing.

- [ ] **Step 4: Registration check**

```bash
cd /home/mattiasutancykeln/gems && claude mcp list 2>/dev/null || true
```
`.mcp.json` is picked up on interactive session start (trust prompt), which can't be fully verified headlessly — verify the file parses (`node -e "JSON.parse(require('fs').readFileSync('.mcp.json','utf8'))" && echo OK`) and note in the final report that the interactive trust flow needs one manual `claude` run by the user.

- [ ] **Step 5: Final commit if anything moved, then report**

```bash
git status --short   # should be clean; commit any stragglers with an appropriate message
git log --oneline -15
```
Report to the user: suite status, corpus counts, live-call output samples, and the one manual step left (run `claude` in ~/gems once + push when ready — pushing is the user's call).

---

## Task dependency notes (for the orchestrator)

- Tasks 2, 3, 4, 5 are independent of each other (all depend only on Task 1) — safe to dispatch in parallel.
- Task 6 needs 5; Task 7 needs 2; Task 8 is independent of 5-7 (needs only Data Shapes); Task 9 needs 2, 3, 4, 8; Task 10 needs 6, 7, 9 (corpus file formats); Tasks 11-13 are strictly sequential after 10.
- Suggested waves: [1] → [2, 3, 4, 5, 8] → [6, 7] → [9] → [10] → [11] → [12] → [13].
