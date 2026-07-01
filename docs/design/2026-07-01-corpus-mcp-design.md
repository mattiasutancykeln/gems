# gems: corpus + MCP + community contribution — design

**Date:** 2026-07-01
**Status:** approved (brainstorm), pre-implementation
**Repo:** `mattiasutancykeln/gems`

## Problem

`~/gems` captures interesting repos/papers well (raw→summarized→extracted pipeline) but has no way to get content *out* intelligently:

- All gem content lives in **GitHub issue comments**. There is no local, queryable corpus — an agent can only `gh issue view` one at a time.
- Each `[ext]` report already decomposes into many discrete, individually-cited findings, so the real corpus is **hundreds–thousands of findings**, not 21 gems.
- The repo is becoming a public surface ("many people commenting") but is structured for a solo backlog, not for visitors, contributors, or agents.

## Goals

1. Materialize gem content into a **committed, versioned, searchable corpus** whose atomic unit is the *finding*.
2. Ship an **MCP server** exposing three agent verbs: `gems_inspire`, `gems_ground`, `gems_query`. Top-k retrieval that **never dedups** (both variants of a near-duplicate surface) and **groups cross-gem clusters** so alternative implementations of the same pattern show up together.
3. Make the repo **open and low-friction to contribute to**: anyone submits gems (zero setup); anyone with Claude Code helps extract (burn tokens) via a discoverable queue.
4. **Audit and flag** every source repo's license so agents know what code they may reuse.
5. Presentation: a README and catalog that serve scout, human browser, and agent.

## Non-goals

- No vector/embedding RAG (BM25 + metadata is sufficient at this scale; interface leaves room to add later).
- No model execution in CI (token-burning extraction stays local to the contributor's Claude Code session).
- No `submit` MCP verb (submission stays on the GitHub issue surface).
- No change to the capture pipeline's core (raw→summarized→extracted stays; issues remain the capture source of truth).

## Architecture

```
issues (capture, source of truth)
        │  sync-corpus (parse + license audit)
        ▼
corpus/ (committed, regenerable)
   gems.json          gem-level records (21)
   findings.jsonl     THE rag unit (hundreds–thousands)
   gems/NNNN-slug.md  human-readable materialized gem
        │  reads
        ▼
mcp/server.mjs  →  gems_inspire | gems_ground | gems_query   (BM25 + metadata, in-memory)
        │
   README highlights + CATALOG.md (generated from gems.json)
```

Issues stay the source of truth. `corpus/` is **derived and committed** so it travels with the repo (the MCP works from any clone with no network). CI keeps it fresh.

## Components

### 1. Corpus (`corpus/`)

**`gems.json`** — one record per gem:
```json
{ "number":21, "title":"SciAgentArena", "url":"https://…", "repo":"HelloWorldLTY/SciAgentArena",
  "sha":"ce27b8c", "source":"paper", "topics":["eval","infra"], "verdict":"keep",
  "quality":"high", "stage":"extracted",
  "license":"none", "codeReuse":"forbidden", "findingCount":24 }
```

**`findings.jsonl`** — the retrieval unit, one JSON object per line:
```json
{ "id":"g21-f007", "gem":21, "repo":"HelloWorldLTY/SciAgentArena", "sha":"ce27b8c",
  "citation":"evaluations/dd/scorers/oracle_budget.py:147-153",
  "category":"pattern", "topic":["eval","infra"],
  "license":"none", "codeReuse":"forbidden",
  "clusterId":"c042", "clusterLabel":"budget-gated verification",
  "title":"Budget-before-validity check", "text":"…", "quality":"high" }
```

- `category` ∈ `impl-decision | skill-prompt-tool | pattern | weak-spot` (maps to the four report sections).
- `codeReuse` ∈ `permissive | ideas-only | forbidden`, derived from `license` (see §4).
- `clusterId` / `clusterLabel` — cross-gem cluster of "same pattern, different gem" (see §2, computed at sync).

**Retrieval invariant — never dedup.** Each finding is an independent hit. Two near-identical implementations from two gems both surface; the retriever never collapses them. Clustering *groups* variants for comparison; it never removes them.

**`gems/NNNN-slug.md`** — the materialized issue (summary + full extraction report) for human browsing and deep-linking.

### 2. `scripts/sync-corpus.mjs` (issues → corpus)

Idempotent Node script, the only writer of `corpus/`:

1. `gh issue list/view` all issues + comments (works read-only on the public repo).
2. **Parse** each `[ext]` report deterministically: split on the four `###` section headers, split each into bullet findings, extract `path:line-range` citation + title + text per bullet. `[sum]`-only gems contribute a gem record + coarse findings from their Highlights.
3. **License audit**: `gh api repos/{owner}/{repo}/license` per distinct source repo → `license`; derive `codeReuse`. Cache results in `corpus/.licenses.json` to avoid rate limits.
4. **Cluster** (lexical, zero-dep): shingle each finding's `title + text` (k-word shingles), MinHash → LSH/Jaccard-threshold union-find to group near-duplicate findings across gems. Assign `clusterId`; `clusterLabel` = the shortest/highest-`quality` title in the cluster. Singletons get their own id. Deterministic (fixed hash seed), no embeddings, no network. Catches "same implementation, slightly different" (variants share API names, file/function terms); misses pure paraphrases — acceptable, and upgradable to embedding-precomputed clusters later without touching the runtime.
5. Write `gems.json`, `findings.jsonl`, `gems/*.md`, `CATALOG.md`. Correct stage-label/title mismatches (e.g. `[sum]`-titled but `stage:extracted`) as a warning in output.

Deterministic output (stable ordering, no timestamps in body) so CI diffs are clean.

### 3. `mcp/server.mjs` (MCP server)

Plain-ESM `.mjs` (no build step) on `@modelcontextprotocol/sdk@^1.29.0` (verified current; Node ≥18, we run 22). On start, loads `findings.jsonl` + `gems.json` into memory and builds a hand-rolled BM25 index over `title + text`. Corpus path resolves from `GEMS_CORPUS` env, else `../corpus` relative to the server file.

Verified API shape (SDK 1.29.0):
```js
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "gems", version: "1.0.0" });
server.registerTool("gems_query",
  { title: "Search gems", description: "…",
    inputSchema: { q: z.string(), topic: z.string().optional(), k: z.number().int().min(1).optional() } },
  async ({ q, topic, k = 10 }) => ({ content: [{ type: "text", text: renderHits(hits) }] })  // Markdown, see below
);
await server.connect(new StdioServerTransport());
```
- **`inputSchema` is a Zod raw shape**, not JSON Schema (SDK requirement). `zod` is a peer dep → **two runtime deps total: `@modelcontextprotocol/sdk` + `zod`.** No API keys, no build.
- **stdout is protocol-only.** All logging via `console.error` (stderr). This is the primary stdio footgun.
- On startup, a one-line stderr banner with corpus stats: `gems: 21 gems · 412 findings · 37 clusters · corpus @ <path>`.

**Agent UX — the three surfaces that ARE the UI:**

1. **Tool descriptions** (how the model picks a verb). Each description states intent + when-to-use in the first sentence, e.g. `gems_ground`: *"Find cited evidence from mined open-source repos/papers that supports or informs a specific technical claim or decision. Use when about to choose an approach and you want prior art with exact file:line citations and license-safety. For broad ideation use gems_inspire; for plain search use gems_query."* All three cross-reference each other so the model never guesses.

2. **Result rendering** — formatted Markdown, not a raw JSON dump. The consumer is an LLM (and a human reading the transcript): compact, citation-first, license-visible blocks:

   ```markdown
   ### 1. Budget-before-validity check   [high] pattern
   SciAgentArena (gem #21) · topics: eval, infra
   `evaluations/dd/scorers/oracle_budget.py:147-153` @ ce27b8c
   License: none — **IDEAS ONLY, do not copy code**
   Budget check runs before validity so over-budget runs are zeroed …

   3 takes on "budget-gated verification" — compare:
     2. Oracle-budget PMO curve — SciAgentArena #21 · `…py:1297-1310`
     3. Multi-seed noise gate — AutoScientists #20 · `ROLE-GPU.md:916-927` · MIT (permissive)
   ```

   Cluster variants render *nested under a compare header* (never dropped); license appears **spelled out in words** on every hit; each block ends with the gem issue URL for drill-down. **No emojis anywhere** — plain text and ASCII markers only (`[high]`, `(permissive)`); an ASCII-moji like `\(oOo)/` is permitted sparingly where a human-facing page wants warmth.

3. **Empty & error states** — always actionable: no hits → *"No findings for 'X'. Available topics: agent, eval, infra, ux, research. Broaden with gems_query({q}) without filters, or submit this as a new gem: <issue-form URL>."* Missing corpus / missing deps → stderr explains the exact fix (`npm install`, or `GEMS_CORPUS=` path).

Retriever behind a small interface (`search(query, filters) → Hit[]`) so an embedding backend can drop in later without changing tool code.

**Tools:**

- `gems_query({ q, topic?, category?, license?, codeReuse?, quality?, k=10 })`
  → ranked findings: `{ id, title, gem, repo, citation, category, topic, license, codeReuse, clusterId, snippet, score }`. Plain BM25 + metadata filter. Never dedups.

- `gems_ground({ claim, topic?, k=6 })`
  → precision-ranked findings that inform `claim`, each with citation `path:line @ sha` **and a `reuseNote`** derived from `codeReuse` (e.g. *"ideas-only — do not copy code verbatim"*). Convergent: fewer, higher-confidence, license-aware.

- `gems_inspire({ topic?, k=5 })`
  → quality-weighted, **gem-diverse** sample (prefer one finding per distinct gem) for divergent ideation. Breadth over precision.

**Cluster grouping (all three tools):** results carry `clusterId`. When ≥2 returned findings share a `clusterId`, they're grouped under their `clusterLabel` with a one-line note ("N variants across gems — compare"), so the agent sees the alternative implementations side by side. Grouping reorders/annotates; it never removes a hit.

**Distribution** (verified against Claude Code 2.1.198):
- **Primary:** committed `.mcp.json` at repo root → `git clone && npm install && claude` → workspace-trust prompt → tools live. Uses `${CLAUDE_PROJECT_DIR}/mcp/server.mjs` so cwd-independent.
- **Alternative:** `claude mcp add gems -- node /path/to/gems/mcp/server.mjs` (`--scope user` to get it everywhere).
- **Optional:** `.claude-plugin/plugin.json` bundling the server via `${CLAUDE_PLUGIN_ROOT}` for `/plugin install` — nice-to-have, not the primary path.
- `npm install` (sdk + zod) is a real prerequisite; the README states it. (`node_modules/` not committed.)

### 4. License audit

- Add MIT `LICENSE` to the gems repo (covers scripts + MCP). Unambiguous, done outright.
- Per-source license recorded on every gem/finding. Derivation:
  | license | codeReuse |
  |---|---|
  | MIT, Apache-2.0, BSD, ISC, Unlicense | `permissive` |
  | GPL/LGPL/MPL, CC-BY, CC-BY-SA | `ideas-only` |
  | CC-BY-NC*, proprietary, **none/all-rights-reserved** | `forbidden` |
- `gems_ground` surfaces `reuseNote` so an agent porting a pattern knows whether it may copy code or only adopt the idea (e.g. SciAgentArena = no license → `forbidden`).

### 5. Community contribution

**Submit a gem (zero setup):** GitHub issue form (`gem.yml`), polished and linked prominently from the README. No clone, no tokens, no write access needed.

**Help extract (burn tokens):** reuse the existing `extract.sh --prep-only` → Claude Code dispatch flow. Add:
- Queue labels `help wanted` + `good first extraction` on `stage:summarized` gems.
- Claim coordination via `status:claimed` (comment + label before burning tokens).
- A CONTRIBUTING section: exact commands (prep → dispatch in a CC session → post the report comment).

**Corpus regeneration (CI, no contributor effort):** a GitHub Action runs `sync-corpus` whenever a gem is labeled `stage:extracted` (and on a manual dispatch), then commits the updated `corpus/` + `CATALOG.md` with the repo's `GITHUB_TOKEN`. Contributors never touch `corpus/` files — they post the extraction comment; the bot folds it in and the MCP stays fresh.

### 6. Presentation (the GitHub page IS the UI)

**Experience principles** (apply to README, CATALOG, gem pages, MCP output alike):
- **Show a real gem within the first screen** — the value prop is demonstrated by one rendered finding, not described.
- Every surface answers three questions in order: **use it → contribute → why it exists.**
- **Citations always visible** (`path:line @ sha`), **license always spelled out in words** (`permissive` / `ideas-only` / `FORBIDDEN`) — never conveyed by symbol or color alone.
- **No emojis on any GitHub-facing surface** (README, CATALOG, gem pages, issue templates, MCP output). ASCII markers (`[high]`, `(permissive)`, `->`) do the work; an ASCII-moji like `\(oOo)/` is allowed sparingly for warmth.
- Each audience gets a ≤3-step path; steps are copy-pasteable commands or single links.

**README** (rewritten top-to-bottom, in this order):
1. **Hero** — one line: *"A mined, cited, searchable corpus of the best implementation patterns from open-source agent/research repos — queryable by your coding agent over MCP."* Badges: gem count · finding count · MIT. Then **one real finding** rendered exactly as the MCP returns it (the §3 block) — instant "aha".
2. **Use it in 60 seconds** — three explicit doors:
   - **Agents:** `git clone … && npm install && claude` → approve trust prompt → `gems_inspire` / `gems_ground` / `gems_query` (one-line description each). Alt: the `claude mcp add --scope user` one-liner.
   - **Humans:** browse **[CATALOG.md]** or the per-gem pages in `corpus/gems/`.
   - **Have a link?** → **Submit a gem** (issue-form deep link). One sentence: a URL and a note is all it takes.
3. **How it works** — the pipeline diagram (`raw → summarized → extracted → corpus → MCP`), five lines max.
4. **Contribute** — the two-rung ladder: submit (zero setup) and **help extract** (Claude Code + tokens; link straight to the `help wanted` queue and the CONTRIBUTING recipe).
5. **Why** — three sentences: ideas are cheap to lose, extraction is expensive to redo, agents should stand on mined + cited prior art. Link the design doc.

**`CATALOG.md`** (generated): opens with **Highlights** — the top `quality:high` cross-gem clusters ("3 implementations of budget-gated verification: #20, #21, #8") — because clusters, not single gems, are the most interesting browse unit. Then the full table, quality-first: `# · gem · source · topics · findings · license (word) · verdict · issue link`.

**Gem pages** (`corpus/gems/NNNN-slug.md`, generated): metadata header table (source URL, pinned SHA, license/codeReuse, topics, finding count, issue backlink) → TL;DR → findings grouped by category with stable anchors (`#g21-f007`) so MCP hits deep-link. Findings in multi-gem clusters get a **"≈ other takes"** cross-link line to sibling variants in other gems — the corpus browses like a small wiki, not a pile of reports.

**Issue form (`gem.yml`)**: two fields only — URL (required) + "why it caught your eye" (optional, placeholder `cleaner take on sandboxed exec…`). Dropdown for source kind, `stage:raw` auto-applied. Zero-friction is the design goal; everything else is the pipeline's job.

**CONTRIBUTING**: keeps the pipeline reference; adds the "help extract" recipe as a numbered copy-paste block (claim → prep → dispatch in CC → post comment → CI folds it in). A contributor should succeed on first read without asking anything.

## Deliverables

`LICENSE` · `corpus/` · `scripts/sync-corpus.mjs` · `mcp/server.mjs` · `.mcp.json` (+ optional `.claude-plugin/plugin.json`) · `package.json` · `.github/workflows/sync-corpus.yml` · rewritten `README.md` · generated `CATALOG.md` · CONTRIBUTING "help extract" + queue labels.

Runtime: Node ≥18 (verified against 22.19.0), two runtime deps: `@modelcontextprotocol/sdk@^1.29.0` + `zod@^3.25 || ^4`. No API keys, no build step, offline, deterministic. Install prerequisite: `npm install`.

## Risks / open threads

- **Report-format drift:** the parser depends on the four `###` section headers and `path:line` bullet shape. Mitigate with a strict parser that logs (does not silently drop) unparseable bullets, plus a `corpus/PARSE_WARNINGS.md` artifact.
- **License API rate limits / missing license files:** cache in `.licenses.json`; treat missing/unknown as `forbidden` (fail safe).
- **CI commit perms:** the Action commits with `GITHUB_TOKEN` to the same repo (standard, no SSH/PAT needed). Concurrency guard so overlapping label events don't race.
- **BM25 lexical-only:** synonyms missed; acceptable now, retriever interface leaves an embeddings backend as a later drop-in.
- **Lexical clustering misses paraphrases:** MinHash groups findings that share terms, not pure "same idea, different words" pairs. Precomputed `clusterId` lets an embedding-based clustering pass replace the lexical one at sync time later, with no runtime change.
- **`npm install` prerequisite:** the committed `.mcp.json` runs `node mcp/server.mjs`, which needs `sdk` + `zod` installed. If a user skips `npm install` the server fails to start; README makes it step 1 and the server prints a clear stderr hint on missing-module.
