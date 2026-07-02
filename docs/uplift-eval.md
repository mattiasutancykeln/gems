# Uplift eval

`npm run eval:uplift` - does the gems MCP make an agent's work *better*, not just
whether the right gem is retrievable.

This is distinct from the retrieval eval (`npm run eval`, `scripts/eval-retrieval.mjs`),
which measures recall@k / MRR: given a real need, does the right source gem surface near
the top? The uplift eval measures the downstream effect on produced work.

## What it measures

A blind A/B differential. For each task the **same agent** runs twice:

- **Condition A (gems):** the gems MCP tools are available, plus a one-line nudge that
  `gems_query` / `gems_ground` / `gems_inspire` exist.
- **Condition B (baseline):** no MCP, no nudge.

An independent judge scores the two outputs **blind**, with the order randomized per task,
on correctness, use of prior art, robustness/edge-cases, insight, and grounding. The
primary metric is the **pairwise win-rate of A over B** (ties count as half).

## Task set and the off-domain control

Tasks live in `eval/uplift-tasks.json`: `{ id, type, domain, prompt }`.

- **8 in-domain** tasks are agent/research-infra problems where mined prior art should
  help (crash-resilient run loops, bounding an infinite ingestion loop, claim queues,
  re-running an oracle at scoring time, dead-end registries, sandboxing untrusted code).
- **4 off-domain controls** are problems the corpus cannot help with (debounce in
  TypeScript, centering a div, a haiku, HTTP 429).

The off-domain control is the honesty check. The corpus holds nothing relevant, so the
expected gems win-rate there is **~50%**. If gems "wins" off-domain, the judge is
rewarding verbosity or citation-theater rather than real help. The scorecard prints the
off-domain win-rate prominently and emits a `WARNING: possible judge bias` line when it
falls outside the 30%-70% band.

## Running it

```bash
npm run eval:uplift                    # dry-run (default): deterministic stub, zero model calls
node scripts/eval-uplift.mjs --live    # real runners: spends model tokens
```

**Dry-run** (default, safe for CI) injects a deterministic stub `runAgent` and `judge`, so
the full pipeline runs and prints a scorecard with no model calls. It proves the harness
wiring - randomized blinding, win-rate aggregation, guardrail - without spending anything.

**Live** shells out to `claude -p` for both the agent runs and the judge, and prints a
one-line cost warning first (`tasks x (2 agent runs + 1 judge call)` model calls). The
gems condition is wired with `--mcp-config <tmp>` pointing at `mcp/server.mjs`, and
`usedTool` is detected best-effort by scanning the run for a `gems_` tool call.

Overrides:

- `GEMS_EVAL_AGENT_CMD` - base agent command (default `claude -p`).
- `GEMS_EVAL_JUDGE_CMD` - base judge command (default `claude -p`).
- `GEMS_UPLIFT_TASKS` - path to an alternative task file.

## Architecture

`scripts/eval-uplift.mjs` exports `runUpliftEval({ tasks, runAgent, judge, rng })`, which is
pure and dependency-injected. It returns `{ results, aggregates }`:

- `results[]`: `{ id, type, domain, winner: "gems"|"baseline"|"tie", usedTool }`.
- `aggregates`: `{ inDomainGemsWinRate, offDomainGemsWinRate, overallGemsWinRate, byType,
  counts, offDomainBiasWarning }`.

Because `runAgent`, `judge`, and `rng` are injected, `test/eval-uplift.test.mjs` exercises
the win-rate math, the blind order-mapping (a judge that always picks "first" must still
record `baseline` when `rng` puts gems in the second slot), `usedTool` threading, and the
guardrail warning - all without a single model call.
