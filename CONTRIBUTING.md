# Contributing to gems

This is an idea inbox, not a polished project. Friction kills it. The bar for adding a link is "I clicked on it and it looked interesting." Everything else gets triaged later.

## Help extract

The highest-value contribution: turn a summarized gem into a cited extraction report. You need the `gh` CLI and a Claude Code session (the tokens are yours to burn).

1. Pick a gem from the [extraction queue](https://github.com/mattiasutancykeln/gems/issues?q=is%3Aopen+label%3A%22help+wanted%22) (or any open `stage:summarized` gem).
2. Claim it so nobody double-spends: comment `claiming` on the issue and add the `status:claimed` label.
3. Prep (shell, no LLM calls): `bash scripts/extract.sh <issue#> --prep-only`
4. In a Claude Code session: *"pick up the extraction prep at <prep_dir> for gem #<issue#>"* - workers read the batches, the coordinator merges, and the session posts the report comment.
5. The report must follow the citation contract below (`path:LINE-LINE @ owner/repo@SHA`). The maintainer flips the label to `stage:extracted`; CI regenerates `corpus/` automatically - you never edit corpus files.

## Three workflows, three roles

| Role | When | What you do |
| --- | --- | --- |
| **Scout** | You see a link | Add it as `stage:raw`. Done. |
| **Synthesizer** | Inbox feels heavy | Run `mine.sh` to flip `raw -> summarized` |
| **Extractor** | A summarized item looks load-bearing | Run `extract.sh <#>` to flip `summarized -> extracted` (expensive) |

You can be all three. The roles are about *what you're doing right now*, not who you are.

---

## Scouting — adding a reference (cheap, no judgement required)

Pick one of:

```bash
# CLI one-liner
~/gems/scripts/add.sh https://example.com/cool-thing "looks like a cleaner take on X"

# Web/mobile
# https://github.com/mattiasutancykeln/gems -> New Issue -> "Gem"
```

### What belongs in the inbox

- Open-source repos with substantive code (`source:repo`)
- Articles, blog posts, or talks with a concrete technique (`source:article`)
- Papers (`source:paper`)
- Anything else (`source:` omitted is fine — Synthesizer will tag it)

### What does NOT belong

- Generic news posts ("Anthropic released X")
- Marketing pages with no technical content
- Things you'd just bookmark — gems is for things you'd want a future agent to *mine*

### Adding etiquette

- **One link per issue.** Multi-link issues fragment summaries.
- **One sentence is enough** in the note field. Don't summarize — that's the next stage's job.
- **Don't pre-label** beyond what the template applies. The Synthesizer will add `source:*` and `topic:*` after reading.
- **No dedup check needed.** The Synthesizer flags duplicates in its verdict.

---

## Synthesizing — `raw -> summarized`

Run anytime the inbox has fresh `stage:raw` items.

```bash
~/gems/scripts/mine.sh --dry-run         # see what would be processed
~/gems/scripts/mine.sh --limit 5         # cap for incremental work
~/gems/scripts/mine.sh                   # process everything
```

Each item gets one LLM pass and a four-section comment:

- **TL;DR** — one sentence
- **Highlights** — 3–6 bullets
- **Connections** — how it might plug into shepherd
- **Verdict** — `keep` / `promote` / `discard`

**After mining:**
- Skim the new summaries.
- Add `quality:high` to standouts.
- Add `topic:*` labels if missing.
- Close items where the verdict is `discard` *and you agree* (comment why).

The Synthesizer pass is cheap (≈1 LLM call per item). Don't be precious about it — re-run on items where the page has changed substantively.

---

## Extraction — `summarized -> extracted` (deep, expensive)

This is the load-bearing stage. The output is a structured technical report that a future agent (or a planner writing a shepherd implementation plan) can consume without going back to the source.

### When to extract

Extract an item only if **all** of these are true:
- The synthesis verdict was `keep` or `promote`, or you marked it `quality:high`.
- It's a `source:repo` (highest value), or a `source:article`/`source:paper` whose technique you want to port.
- You have a concrete reason: you're planning work that might adopt or adapt it, or it's sitting on a roadmap-adjacent EPIC.

Do **not** extract speculatively. The cost is real — every extraction is N parallel LLM workers reading full source files plus a coordinator pass.

### Running it — Claude Code workflow (preferred, no API credits)

**Step 1 — prep:**

```bash
bash ~/gems/scripts/extract.sh 42 --prep-only [--workers N] [--max-files N]
```

Clones, scores, and batches files; writes batch lists and prompt templates to `.prep/` inside the cache dir; prints `PREP_READY` output. No LLM calls.

**Step 2 — dispatch:**

Open a Claude Code session and ask:

> *"pick up the extraction prep at \<prep_dir\> for gem #42"*

CC dispatches workers as Agent calls (session-billed), runs the coordinator, and posts the comment. See README for full explanation.

### API credits path (advanced)

```bash
~/gems/scripts/extract.sh 42                       # default: 4 workers, ≤30 files
~/gems/scripts/extract.sh 42 --workers 8
~/gems/scripts/extract.sh 42 --max-files 50
~/gems/scripts/extract.sh 42 --include "src/agents/**,prompts/**"
~/gems/scripts/extract.sh 42 --rev v1.4.2          # pin to a tag/SHA instead of HEAD
```

What it does:

1. **Pins a version.** Resolves canonical owner/repo and the SHA of the default branch HEAD (or `--rev`). Records this in the report header so every citation is anchored.
2. **Shallow-clones** to `/tmp/gems-extract/<owner>-<repo>-<sha>/`. Cached across runs.
3. **Selects files** using ranked heuristics — agents, skills, tools, prompts, dispatchers, configs, key entry points. Capped by `--max-files`.
4. **Dispatches parallel subagents.** Each worker is a separate `claude -p` process that receives the **full contents** of its assigned files and the extraction prompt. Workers run concurrently, capped by `--workers`.
5. **Coordinator pass** merges, dedups, ranks, and produces the final comment.
6. **Relabels** `stage:summarized -> stage:extracted` (passing through `stage:extracting` while the script is running, so a parallel run won't double-process).

### Citation contract (strict)

Every finding in an extraction report MUST cite:

```
path/in/repo.ts:LINE_START-LINE_END  @  owner/repo@SHORT_SHA
```

The header records the full SHA + timestamp once; per-finding citations use the short SHA and rely on the header for disambiguation.

Workers are explicitly instructed:
- Read every assigned file end-to-end **before** writing anything.
- Do not cite a file you didn't read.
- Do not paraphrase across files — one citation = one location.
- If a finding spans multiple files, cite each one explicitly.
- Quote sparingly (≤ 3 lines per quote).

If you see an extraction comment with a citation that doesn't match the source, file an issue against the gem and add the `quality:` label `quality:high` only after verifying the rest.

### What workers are looking for

In priority order:

1. **Cool implementation decisions** — non-obvious choices that pay off. ("Single-flight cache with a 30s grace window before re-fetch.")
2. **Skills, prompts, and tools that look optimized for an LLM consumer** — well-bounded action spaces, observation formatting, prompt structure, retry/guard logic.
3. **Patterns worth porting** — reusable structures (orchestrator/worker splits, retry policies, sandboxing approaches, citation propagation, etc.).
4. **Open threads / weak spots** — things the project itself flags as TODO/HACK/FIXME or that obviously look fragile.

What workers should NOT do:
- Summarize the project. (Summary already exists on the issue.)
- Speculate about future direction.
- Make value judgements without a specific code citation backing them.

### Re-extracting

The version pin in the header tells you when the report goes stale. If a major release lands upstream and you want a fresh read:

```bash
~/gems/scripts/extract.sh 42 --rev main --force
```

The script appends a *new* extraction comment (it never edits the old one) so the history of what the upstream looked like at each extraction point is preserved.

---

## Tag conventions

Add labels as you learn things, even on raw items:

- `topic:agent` — agent design, harness, orchestration
- `topic:eval` — evaluation, benchmarks
- `topic:infra` — infrastructure, sandboxing, deployment
- `topic:ux` — user experience, interface
- `topic:research` — research methodology
- `quality:high` — promoted; surface first when ravaging
- `status:claimed` — you're actively building from this; add a comment with the shepherd issue/PR
- `status:built` — landed in shepherd; closing comment links the PR

## Closing issues

Close only when:
- `status:built` — link the merged PR in the closing comment.
- Explicitly discarded — comment with the reason (e.g. "superseded by gems#88", "license incompatible", "verdict: discard, no useful patterns").

Do not close `stage:raw` items just because the inbox is long. Run `mine.sh` instead.

## Setup

```bash
gh auth login                                # GitHub CLI
which claude                                 # Claude CLI for mine.sh and extract.sh
bash ~/gems/scripts/setup-labels.sh          # idempotent label setup
```

Optional: set `GEMS_WORKERS=8` in your shell to bump the default extractor concurrency.
