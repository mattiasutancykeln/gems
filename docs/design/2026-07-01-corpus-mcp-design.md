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
2. Ship an **MCP server** exposing three agent verbs: `gems_inspire`, `gems_ground`, `gems_query`.
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
  "title":"Budget-before-validity check", "text":"…", "quality":"high" }
```

- `category` ∈ `impl-decision | skill-prompt-tool | pattern | weak-spot` (maps to the four report sections).
- `codeReuse` ∈ `permissive | ideas-only | forbidden`, derived from `license` (see §4).

**`gems/NNNN-slug.md`** — the materialized issue (summary + full extraction report) for human browsing and deep-linking.

### 2. `scripts/sync-corpus.mjs` (issues → corpus)

Idempotent Node script, the only writer of `corpus/`:

1. `gh issue list/view` all issues + comments (works read-only on the public repo).
2. **Parse** each `[ext]` report deterministically: split on the four `###` section headers, split each into bullet findings, extract `path:line-range` citation + title + text per bullet. `[sum]`-only gems contribute a gem record + coarse findings from their Highlights.
3. **License audit**: `gh api repos/{owner}/{repo}/license` per distinct source repo → `license`; derive `codeReuse`. Cache results in `corpus/.licenses.json` to avoid rate limits.
4. Write `gems.json`, `findings.jsonl`, `gems/*.md`, `CATALOG.md`. Correct stage-label/title mismatches (e.g. `[sum]`-titled but `stage:extracted`) as a warning in output.

Deterministic output (stable ordering, no timestamps in body) so CI diffs are clean.

### 3. `mcp/server.mjs` (MCP server)

Node stdio server on `@modelcontextprotocol/sdk`. On start, loads `findings.jsonl` + `gems.json` into memory and builds a hand-rolled BM25 index over `title + text`. Corpus path resolves from `GEMS_CORPUS` env, else `../corpus` relative to the server file.

Retriever is behind a small interface (`search(query, filters) → Hit[]`) so an embeddings backend could be added later without changing tool code.

**Tools:**

- `gems_query({ q, topic?, category?, license?, codeReuse?, quality?, k=10 })`
  → ranked findings: `{ id, title, gem, repo, citation, category, topic, license, codeReuse, snippet, score }`.
  Plain BM25 + metadata filter.

- `gems_ground({ claim, topic?, k=6 })`
  → precision-ranked findings that inform `claim`, each with citation `path:line @ sha` **and a `reuseNote`** derived from `codeReuse` (e.g. *"ideas-only — do not copy code verbatim"*). Convergent: fewer, higher-confidence, license-aware.

- `gems_inspire({ topic?, k=5 })`
  → quality-weighted, **gem-diverse** sample (prefer one finding per distinct gem) for divergent ideation. Breadth over precision.

Ships with a Claude Code plugin manifest (`.mcp.json` + `.claude-plugin/`) so install is one line:
`claude mcp add gems -- node /path/to/gems/mcp/server.mjs`.

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

### 6. Presentation

- **README** rewritten for three audiences: scout (add a link), human (Highlights + `CATALOG.md`), agent (install MCP, three verbs).
- **`CATALOG.md`** generated from `gems.json`: table of gems with topic, source, license/codeReuse, finding count, verdict.
- Highlights = top `quality:high` findings, generated.
- CONTRIBUTING keeps the pipeline reference + the new "help extract" path.

## Deliverables

`LICENSE` · `corpus/` · `scripts/sync-corpus.mjs` · `mcp/server.mjs` + plugin manifest · `.github/workflows/sync-corpus.yml` · rewritten `README.md` · generated `CATALOG.md` · CONTRIBUTING "help extract" + queue labels.

Runtime: Node, one runtime dep (`@modelcontextprotocol/sdk`). No API keys, offline, deterministic.

## Risks / open threads

- **Report-format drift:** the parser depends on the four `###` section headers and `path:line` bullet shape. Mitigate with a strict parser that logs (does not silently drop) unparseable bullets, plus a `corpus/PARSE_WARNINGS.md` artifact.
- **License API rate limits / missing license files:** cache in `.licenses.json`; treat missing/unknown as `forbidden` (fail safe).
- **CI commit perms:** the Action commits with `GITHUB_TOKEN` to the same repo (standard, no SSH/PAT needed). Concurrency guard so overlapping label events don't race.
- **BM25 lexical-only:** synonyms missed; acceptable now, retriever interface leaves an embeddings backend as a later drop-in.
