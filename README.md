# gems

Inbox for interesting repos, articles, and papers. Three-stage pipeline so a future LLM session can ravage the backlog when we run out of ideas — without re-reading everything from scratch.

```
add ──▶  stage:raw  ──synthesize──▶  stage:summarized  ──extract──▶  stage:extracted
```

| Stage | What lives on the issue | How it got there |
| --- | --- | --- |
| `stage:raw` | Just the URL + an optional one-line note | Human drops a link (`add.sh` or issue template) |
| `stage:summarized` | + comment with TL;DR / Highlights / Connections / Verdict | `mine.sh` runs a single LLM over the page |
| `stage:extracted` | + a deep technical report citing specific files, line ranges, and a pinned version SHA — every claim is anchored | `extract.sh` dispatches **parallel subagents** that read the full source |

Items are never deleted. They only flip labels and accumulate comments. The raw URL stays in the issue body forever.

## Why three stages

- **Raw** is cheap to add — zero friction so nothing gets lost.
- **Summarized** is cheap to produce — one webfetch + one LLM pass — and lets a human triage hundreds of links by skimming.
- **Extracted** is expensive: parallel subagents clone the repo at a pinned SHA and read full scripts looking for non-obvious implementation decisions, well-engineered skills/tools, and reusable patterns. Every finding cites `path:line-range @ owner/repo@sha`. Run on demand for items that survived triage.

## The three workflows

### 1. Add a reference

```bash
# CLI
~/gems/scripts/add.sh <url> "optional note about why it caught your eye"

# Web/mobile
# → New Issue → "Gem" template → paste URL → submit
```

Lands as `stage:raw`. One link = one issue. No deduplication is performed — the synthesis step will flag duplicates.

### 2. Synthesize / summarize

```bash
~/gems/scripts/mine.sh                # process all stage:raw items
~/gems/scripts/mine.sh --limit 10
~/gems/scripts/mine.sh --dry-run
```

For each `stage:raw` issue, one LLM call:
- WebFetches the URL
- Posts a structured comment with four sections:
  - **TL;DR** — one sentence on what it is and why it might matter
  - **Highlights** — 3–6 bullets of the most reusable / surprising / load-bearing ideas
  - **Connections** — where this might plug into shepherd
  - **Verdict** — `keep` / `promote` / `discard` with reasoning
- Relabels `stage:raw → stage:summarized`, retitles `[raw]` → `[sum]`

Cost: ~1 LLM call per item. Run it after every batch of additions.

### 3. Extract (deep, expensive)

```bash
~/gems/scripts/extract.sh <issue#>                # default: 4 parallel subagents
~/gems/scripts/extract.sh <issue#> --workers 8
~/gems/scripts/extract.sh <issue#> --max-files 40
```

For a `stage:summarized` issue, the script:

1. **Pins a version.** Resolves the canonical default branch HEAD SHA. Every subsequent citation is anchored to this SHA. The SHA, repo URL, and timestamp go in the comment header.
2. **Shallow-clones** the repo to `/tmp/gems-extract/<owner>-<repo>-<sha>/` (cached if already present).
3. **Selects files.** Walks the tree and picks "interesting" files using ranked heuristics: agent/skill/tool/prompt directories, entry points, dispatcher/router/loop files, config schemas, READMEs. Caps at `--max-files` to keep cost bounded.
4. **Dispatches parallel subagents.** Splits the file list into `--workers` batches. Each batch is a separate `claude -p` process given the **full contents** of its files and a strict extraction prompt. Subagents are told to:
   - Read every file end-to-end before writing anything
   - Cite every finding as `path:line-start-line-end`
   - Flag cool **implementation decisions** (e.g. "uses a single-flight cache with a 30s grace window — see `cache.ts:84-112`")
   - Flag well-engineered **skills, prompts, or tools** that look optimized for an LLM consumer
   - Flag **non-obvious patterns** worth porting
   - Refuse to invent or hand-wave — if they didn't read the file, they don't cite it
5. **Aggregates.** A final coordinator pass merges subagent outputs, removes duplicates, ranks by load-bearingness, and produces one structured comment:

```markdown
## Extraction report

**Source:** `sst/opencode` @ `a3f4b2c…` (default branch HEAD at 2026-05-11T12:34:56Z)
**Workers:** 4 • **Files read:** 38 • **Findings:** 17

### Implementation decisions
- `src/agent/runner.ts:142-168` — Streaming tool-use loop with async-iterator backpressure …
- …

### Skills, prompts, tools
- `prompts/triage.md:1-94` — Triage prompt uses an explicit "refuse to proceed without X" guard …
- …

### Patterns worth porting
- `src/sandbox/exec.ts:51-89` — Bubblewrap invocation pattern …

### Open threads / weak spots
- `src/auth/oauth.ts:30-72` — Refresh token handling looks racy under concurrent calls
```

Relabels `stage:summarized → stage:extracted`, retitles `[sum]` → `[ext]`.

**Cost:** N+1 LLM calls (N workers + 1 coordinator), each reading up to ~10 files worth of source. Run only on items you actually want to mine deeply. Budget accordingly.

#### Non-repo gems

For article and paper gems where there's no code to clone, `extract.sh` falls back to a single deep-read pass: full page contents go to one extractor (no parallelism) and citations use stable anchors when available (DOI, section headings, page numbers).

## Running with Claude Code (no API credits)

`mine.sh` and `extract.sh` default to `claude -p`, which bills API credits per call. The Claude Code workflows below run inside a CC session — charged to your session, not the API.

### Synthesis (no credits)

Open a Claude Code session and ask:

> *"synthesize gem #42"*

CC will WebFetch the URL and post the structured four-section comment directly. No shell script needed.

### Extraction (no credits)

Two steps:

**Step 1 — prep (shell, no claude calls):**

```bash
bash scripts/extract.sh <issue#> --prep-only [--workers N] [--max-files N]
```

This clones the repo at a pinned SHA, scores and selects files, splits them into worker batches, writes all batch lists and prompt templates to `$cache_dir/.prep/`, restores `stage:summarized`, and prints `PREP_READY` output to stdout. No LLM calls are made.

**Step 2 — dispatch (Claude Code session):**

Ask a CC session:

> *"pick up the extraction prep at \<prep_dir\> for gem #\<N\>"*

CC reads the batch lists from the prep dir, dispatches worker Agent calls (session-billed), collects their outputs, runs the coordinator, and posts the final comment to the issue. For each worker batch, the prompt is the contents of `extract_prompt_header` (from the PREP_READY output) followed by the files listed in `batch_N`, each rendered with 1-indexed line numbers in a fenced code block — exactly the format that makes `path:LINE-LINE` citations possible.

**Note:** `--prep-only` always restores `stage:summarized` on exit. The CC session is responsible for flipping `stage:extracting` when it begins dispatching workers, and `stage:extracted` when it posts the final comment.

## Referencing extractions from shepherd

In any shepherd issue, PR, or implementation plan, link directly:

```
See mattiasutancykeln/gems#42 — extracted pattern at src/agent/runner.ts:142-168
```

Browse the inbox by stage:

```bash
gh issue list --repo mattiasutancykeln/gems --label stage:extracted --state open
gh issue list --repo mattiasutancykeln/gems --label stage:summarized --state open
gh issue list --repo mattiasutancykeln/gems --label stage:raw         --state open
```

Pinned in shepherd: linuslofgren/sheperd#1384.

## Labels

- **Stage** (exactly one): `stage:raw` → `stage:summarized` → `stage:extracting` → `stage:extracted`
- **Source kind**: `source:repo` / `source:article` / `source:paper`
- **Topic**: `topic:agent` / `topic:eval` / `topic:infra` / `topic:ux` / `topic:research`
- **Quality**: `quality:high` — promoted gems, surface first
- **Status**: `status:claimed` (someone is actively building from it) / `status:built` (landed in shepherd — closing comment links the PR)

Re-run `scripts/setup-labels.sh` to (re)create them — it's idempotent.

## See also

- [CONTRIBUTING.md](CONTRIBUTING.md) — how to add things, how to run each stage, conventions for citing extractions
- `scripts/` — `add.sh`, `mine.sh`, `extract.sh`, `setup-labels.sh`
