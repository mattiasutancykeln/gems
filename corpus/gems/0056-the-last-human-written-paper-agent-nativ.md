# The Last Human-Written Paper — Agent-Native Research Artifacts (ARA)

| | |
|---|---|
| Source | https://arxiv.org/abs/2604.24658 |
| Kind | paper |
| Topics | agent, research |
| License | none (forbidden) |
| Verdict | - |
| Findings | 34 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/56 |

## Implementation decisions

<a id="g56-f001"></a>
### Four-layer artifact replaces the narrative paper

`README.md:118-123`

`§2.2`, `README.md:118-123`, `packages/ara-viewer/build_manifest.py:45-49` — Four-layer artifact replaces the narrative paper. A research object is split into `logic/` (cognitive: problem, claims, experiments), `src/` (physical: code + specs), `evidence/` (raw outputs only), and `trace/` (the exploration graph). Four design principles sit over it — progressive disclosure, cross-layer binding, dead-ends-preserved, provenance tags. The reframing motive is two "taxes" the narrative format imposes (`Abstract`/`§1`): the Storytelling Tax (systematic erasure of process knowledge on compression to prose) and the Engineering Tax (gap between reviewer-sufficient and agent-sufficient documentation).

<a id="g56-f002"></a>
### The exploration graph is "git log for research," and dead_end is declared the single most valuable node type

`skills/compiler/references/exploration-tree-spec.md:1-102`

`skills/compiler/references/exploration-tree-spec.md:1-102`, `examples/resnet-ara-example/trace/exploration_tree.yaml:43-56`, `§2.2` — The exploration graph is "git log for research," and `dead_end` is declared the single most valuable node type. A nested YAML DAG with five node types (`question`/`experiment`/`dead_end`/`decision`/`pivot`), type-specific required fields, `also_depends_on` for multi-parent convergence, and `evidence:` links to claim IDs. `dead_end` nodes are childless leaves carrying `hypothesis`/`failure_mode`/`lesson` (`why_failed`), so rejected approaches are first-class, not dropped. Paper motivation: on RE-Bench, ~90.2% of compute went to dead ends (`§7.4`) — exactly what narrative papers discard.

<a id="g56-f003"></a>
### Per-node epistemic honesty via support_level

`skills/compiler/SKILL.md:201-212`

`skills/compiler/SKILL.md:201-212`, `examples/resnet-ara-example/trace/exploration_tree.yaml:1-6` — Per-node epistemic honesty via `support_level`. Every trace node is tagged `explicit` (with `source_refs`) vs `inferred` (reconstructed), and `node.thinking` may hold only *verbatim* grounded journal text, never composed prose — so a reconstructed history is never presented as observed.

<a id="g56-f004"></a>
### src/ has two granularity modes matched to contribution type

`§2.2 (Physical Layer)` — `src/` has two granularity modes matched to contribution type: *kernel* (core modules with typed I/O only, 1–2 orders of magnitude smaller, coding agent regenerates boilerplate) vs *repository* (full impl + `index.md` mapping each file to its ARA component). Both ship `configs/` with every hyperparameter annotated with rationale + search range, plus `environment.md` (pinned deps, hardware, seeds) — aimed at the ~45% of reproduction requirements papers leave unspecified.

<a id="g56-f005"></a>
### src/ is split by content KIND, judged by content not extension

`skills/compiler/SKILL.md:168-186`

`skills/compiler/SKILL.md:168-186`, `:178-185` — `src/` is split by content KIND, judged by content not extension (`.c`/`.cu`/`.rs`/`.jl`/notebooks all count as code); run records/logs go to `evidence/`, prose-only methods stay in `logic/`. `src/artifacts.md` is a *pointer index* to an externally-persisted codebase; transcription into `src/execution/` is the fallback used only when code would otherwise be lost.

<a id="g56-f006"></a>
### Two mutability regimes + closure-gated promotion

`skills/research-manager/SKILL.md:31-47`

`skills/research-manager/SKILL.md:31-47`, `:98-123` — Two mutability regimes + closure-gated promotion. `logic/` is mutable current-best-understanding (overwritten in place, no internal history); `trace/`+`staging/` are append-only. Interpretive knowledge is buffered and promoted to typed structure only on an observable closure signal — topic abandonment (k=5 idle turns), first-person verbal affirmation, empirical resolution, or artifact commitment — "explicitly not a counter and not an LM judgment." Default is non-promotion.

<a id="g56-f007"></a>
### Grade = mean of six 1–5 dimensions gated by a floor rule

`skills/rigor-reviewer/SKILL.md:238-249`

`skills/rigor-reviewer/SKILL.md:238-249` — Grade = mean of six 1–5 dimensions gated by a floor rule: Strong Accept requires mean ≥4.5 AND no dimension <3; Reject triggers on mean <2.0 OR any dimension =1. A single dimension=1 forces Reject regardless of the mean.

## Skills, prompts, tools

<a id="g56-f008"></a>
### A 4-stage Epistemic Chain-of-Thought runs before any file is written

`skills/compiler/SKILL.md:76-166`

`skills/compiler/SKILL.md:76-166` — A 4-stage Epistemic Chain-of-Thought runs before any file is written: (1) Semantic Deconstruction + evidence ledger, (2) Cognitive Mapping into `/logic`, (3) Artifact layer, (4) Exploration Graph — reasoning-before-generation, enforced by a fixed 7-step workflow (READ -> REASON -> GENERATE -> COVERAGE loop max 3 rounds -> VALIDATE -> FIX -> REPORT) that exits the coverage loop early on a zero-fix round (`:53-62`).

<a id="g56-f009"></a>
### Number grounding ("ground every load-bearing number like code")

`skills/compiler/SKILL.md:142-149`

`skills/compiler/SKILL.md:142-149`, `skills/research-manager/SKILL.md:142-158` — Number grounding ("ground every load-bearing number like code"). Before writing a value, open its source and copy the matched line verbatim into a `Sources` entry as `<value> <- <source ref> «matched line» [input|result]`. A bare path with no «quote» is invalid; an unopenable source becomes `[pending: …]`. "No inheritance," and `[pending]` beats a guess — an unverified path is treated as fabrication.

<a id="g56-f010"></a>
### The name-deletion test (attribution vs mechanism)

`skills/compiler/references/ara-schema.md:203-209`

`skills/compiler/references/ara-schema.md:203-209`, `skills/rigor-reviewer/SKILL.md:151`, `validation-checklist.md:192-200` — The name-deletion test (attribution vs mechanism). Strike your system's component names from a claim's Statement; if nothing a stranger on a different stack could reuse survives, it's attribution ("league table"), not a claim — flag `major`. Used both as an authoring rule and a validation gate.

<a id="g56-f011"></a>
### Fixed claim schema

`skills/compiler/references/ara-schema.md:161-174`

`skills/compiler/references/ara-schema.md:161-174`, `examples/resnet-ara-example/logic/claims.md:3-11` — Fixed claim schema (`## C{NN}`: Statement / Conditions / Status / Falsification criteria / Proof / Evidence basis / Dependencies / Tags). `Proof` references *experiment IDs* (E01…), never file paths — a deliberate indirection binding claims to plans, not files. Statements must state a mechanism/relationship carrying no run numbers/scores (`skills/compiler/SKILL.md:120-141`); numbers demote to `Evidence basis`, and mandatory `Conditions` bound the regime ("a generalized Statement with no Conditions is an unbounded slogan").

<a id="g56-f012"></a>
### Bidirectional claim<->experiment binding

`examples/resnet-ara-example/logic/experiments.md:3-21`

`examples/resnet-ara-example/logic/experiments.md:3-21` — Bidirectional claim<->experiment binding. Experiments declare `Verifies:[C##]` (the inverse of a claim's `Proof:[E##]`), plus Setup/Procedure/Metrics/Expected-outcome/Baselines; claims<->experiments are many-to-many, and experiment blocks carry NO exact numbers (directional `Expected outcome` only).

<a id="g56-f013"></a>
### Rigor Auditor: a pure semantic (L2) pass layered on structural (L1) validation

`skills/rigor-reviewer/SKILL.md:23-33`

`skills/rigor-reviewer/SKILL.md:23-33`, `:41-53`, `§5.2` — Rigor Auditor: a pure semantic (L2) pass layered on structural (L1) validation. It explicitly does *not* re-check field presence / reference resolution / YAML parse, and refuses to execute code or fetch URLs. Six anchored dimensions (D1 Evidence Relevance, D2 Falsifiability, D3 Scope Calibration, D4 Argument Coherence, D5 Exploration Integrity, D6 Methodological Rigor), each 1–5, with type-aware entailment (causal->ablation, generalization->heterogeneous, improvement->baseline) at `:112-118`.

<a id="g56-f014"></a>
### Understanding harness = fan-out sub-agents + separate-model judge

`§7.2`, `skills/research-visualizer/SKILL.md` — Understanding harness = fan-out sub-agents + separate-model judge. Each `(target, format, question)` triple is dispatched as an independent Claude Sonnet 4.6 sub-agent and graded ternary (1.0/0.5/0.0) by a Claude Opus 4.6 judge against a gold reference.

<a id="g56-f015"></a>
### Event routing dichotomy + provenance taxonomy

`skills/research-manager/references/event-taxonomy.md:19-54`

`skills/research-manager/references/event-taxonomy.md:19-54`, `:103-132` — Event routing dichotomy + provenance taxonomy. Journey facts go DIRECT to the exploration tree; interpretations are STAGED with a `potential_type` until closure; AI actions go only to the session record. Provenance tags (`user`/`ai-suggested`/`ai-executed`/`user-revised`) never auto-upgrade except via verbal affirmation, and the provenance *distribution* is itself a trust signal reviewers inspect.

<a id="g56-f016"></a>
### Quantitative-plot reading procedure with a confidence rubric

`skills/compiler/references/figure-extraction-guide.md:98-116`

`skills/compiler/references/figure-extraction-guide.md:98-116`, `:209-218` — Quantitative-plot reading procedure with a confidence rubric: axes+scale first (log-vs-linear tick check), prefer printed labels (`exact_from_labels`) else `≈` digitized estimate with high/medium/low confidence, always capture the trend even when points are unreadable — plus a per-figure pre-write honesty checklist.

<a id="g56-f017"></a>
### Safe template-slot HTML injection

`skills/research-visualizer/SKILL.md:124-135`

`skills/research-visualizer/SKILL.md:124-135`, `:36-44` — Safe template-slot HTML injection: parse the ARA to one `ARA_DATA` JSON, forbid literal `</script>`/marker strings, escape `<`, and replace only the bytes between two marker comments; output is one self-contained double-clickable HTML with base64-inlined figures (no server/CDN).

## Patterns worth porting

<a id="g56-f018"></a>
### Tiered evaluation, cheap gates before expensive ones

`skills/compiler/references/validation-checklist.md:1-222`

`skills/compiler/references/validation-checklist.md:1-222`, `:153-181`, `§5.2` — Tiered evaluation, cheap gates before expensive ones. L1 "Seal Level 1" is a machine-checkable structural validator (directory ontology, non-empty mandatory files, regex field checks like `## C\d+`, count targets, cross-layer binding resolution, self-consistency where declared counts must match files and derived numbers must recompute); L2 is argumentative rigor (minutes, no execution); L3 is execution reproducibility via scaled-down directional checks (hours–days). Every cross-layer reference (claim `Proof`->experiments, experiment `Verifies`->claims, tree `evidence:`->claim IDs) must resolve or FAIL.

<a id="g56-f019"></a>
### Source-bounded targets, not quotas

`skills/compiler/references/validation-checklist.md:85-99`

`skills/compiler/references/validation-checklist.md:85-99` — Source-bounded targets, not quotas. Counts (≥5 concepts, ≥3 experiments, ~8 tree nodes) are honest-content targets; padding with invented/borrowed items FAILS, but a genuinely small paper passes with fewer — a direct antidote to the LLM habit of hallucinating to hit a number.

<a id="g56-f020"></a>
### NL->graph extraction heuristics

`skills/compiler/references/exploration-tree-spec.md:104-124`

`skills/compiler/references/exploration-tree-spec.md:104-124` — NL->graph extraction heuristics: "We considered X but chose Y" -> `decision` with alternatives; "Ablation shows X hurts" -> `dead_end`; "We initially pursued X but found…" -> `pivot`. A reusable mapping from paper phrasings to typed nodes.

<a id="g56-f021"></a>
### Graph emerges from disciplined markdown fields, no separate edge file

`packages/ara-viewer/build_manifest.py:11-34`

`packages/ara-viewer/build_manifest.py:11-34`, `:312-323`, `:505-506` — Graph emerges from disciplined markdown fields, no separate edge file. A stdlib-only builder infers 10 edge kinds (`proves`/`verifies`/`depends_on`/`implements`/`references`/…) by pure cross-reference regex over claim/experiment/heuristic fields; dangling edges are dropped rather than creating phantom nodes.

<a id="g56-f022"></a>
### Code stubs isolate ONLY the novel contribution

`examples/resnet-ara-example/src/execution/residual_block.py:1-8`

`examples/resnet-ara-example/src/execution/residual_block.py:1-8,142-148`, `training_recipe.py:9-44` — Code stubs isolate ONLY the novel contribution (stems/heads deferred), and reproduction config is frozen dataclasses with every hyperparameter tagged to its paper section — so a footnote (110-layer warmup) becomes a testable branch, and Table 1 lives as data (`RESNET_LAYOUTS`).

<a id="g56-f023"></a>
### Concrete eval methodology + numbers worth citing

`§7.2-7.5`, Table 2 / Table 4 — Concrete eval methodology + numbers worth citing. Understanding QA 72.4%->93.7% (450 Q / 30 targets, 12% fewer tokens); Reproduction 57.4%->64.4% (150 subtasks / 15 papers; gap widens with difficulty, +4.9% easy / +8.5% hard). Corpus scale: PaperBench 23 ICML'24 papers / 8,921 rubric requirements; RE-Bench 24,008 runs / 46,303 failure episodes. A mutation benchmark injects five error types into passing artifacts to measure detector recall.

<a id="g56-f024"></a>
### GitHub is the data layer; the Hub only indexes

`skills/submit-ara/SKILL.md:8-9`

`skills/submit-ara/SKILL.md:8-9,55-63`, `references/upload-and-hub.md:56-98` — GitHub is the data layer; the Hub only indexes. Publish = clean staged copy (`cp -R` to scratch, strip `.git`, fresh `git init`, never in the user's tree) + register via API; the Hub renders `trajectory.html` over a jsDelivr CDN. Registration is verified — don't claim "on the Hub" unless the POST returned 2xx `ok:true`, and keep "published to GitHub" distinct from "listed on Hub."

<a id="g56-f025"></a>
### Cheap dependency-free structural CI

`github/workflows/validate.yml:15-54`

`.github/workflows/validate.yml:15-54`, `CONTRIBUTING.md:56-69` — Cheap dependency-free structural CI (validates each `SKILL.md`'s frontmatter presence + line-count with a shell error counter) plus auto-publish: landing under `skills/**` on `main` auto-bumps the patch version and publishes to npm via a repo secret, no contributor credentials.

<a id="g56-f026"></a>
### Non-destructive contradiction handling

`skills/research-manager/SKILL.md:160-168`

`skills/research-manager/SKILL.md:160-168` — Non-destructive contradiction handling: never overwrite; flag both entries, append an `unresolved` decision node, defer to a human. A clean conflict model for an append-only record.

## Open threads / weak spots

<a id="g56-f027"></a>
### The "Seal Level 1" validator is a prompt, not a program

`github/workflows/validate.yml:15-54`

`.github/workflows/validate.yml:15-54`, `skills/compiler/SKILL.md:249-284` — The "Seal Level 1" validator is a prompt, not a program. CI only checks SKILL.md frontmatter/line-count; the entire rich validation checklist is agent-self-enforced with no automated backstop, so pass/fail rigor depends on the model faithfully running each exhaustive pass on itself.

<a id="g56-f028"></a>
### Judge inflation

`skills/rigor-reviewer/SKILL.md:26`

`§7.2`, `skills/rigor-reviewer/SKILL.md:26,323` — Judge inflation. In 17/23 ARAs the Rigor Auditor mean is "rounded up just enough to clear Accept," undercutting L2 as a gate; the reviewer also takes evidence at face value (no execution/fetch), so fabricated-but-consistent evidence spans pass L2.

<a id="g56-f029"></a>
### Mutation detection is 100% on fabricated claims / rebutted-branch leaks / over-claims but only 22% on orphan experiments

`§7.5` (Table 4) — Mutation detection is 100% on fabricated claims / rebutted-branch leaks / over-claims but only 22% on orphan experiments — unreferenced-artifact detection is the weak spot.

<a id="g56-f030"></a>
### Latent edge bug

`packages/ara-viewer/build_manifest.py:382-386`

`packages/ara-viewer/build_manifest.py:382-386` vs `:428-429` — Latent edge bug: `implements` edges build `code_id = "Code:"+path` from a heuristic's `Code ref`, but code nodes are keyed *with* the `src/` prefix; the comment says "drop src/ prefix" but the code doesn't, so heuristic->code edges likely never match and are dropped.

<a id="g56-f031"></a>
### Schema drift between examples

`examples/minimal-artifact/trace/exploration_tree.yaml:19`

`examples/minimal-artifact/trace/exploration_tree.yaml:19,28` vs `resnet .../trace/exploration_tree.yaml` — Schema drift between examples: minimal uses `evidence:[C01,"Table 2"]` (->`trace_evidence` edges) while the richer resnet tree uses `source_refs`/`result` and never `evidence:`, so the better example produces NO `trace_evidence` edges; `Dependencies` also has two syntaxes (list vs prose).

<a id="g56-f032"></a>
### Benchmark coupling inside a field-agnostic compiler

`skills/compiler/SKILL.md:36-38`

`skills/compiler/SKILL.md:36-38`, `references/ara-schema.md:622-639` — Benchmark coupling inside a field-agnostic compiler: `--rubric` and a hardcoded `rubric/requirements.md` template carry PaperBench category/weight/uuid fields.

<a id="g56-f033"></a>
### v1 gaps

`skills/research-visualizer/SKILL.md:48-52`

`skills/research-visualizer/SKILL.md:48-52`, `submit-ara/references/upload-and-hub.md:104-111` — v1 gaps: external run-store pointers and `source_refs` render as chips but are never resolved; the update path force-pushes (`--force-with-lease`) to the user's repo guarded only by a "tell the user first" instruction; jsDelivr caches make freshly published `trajectory.html` render stale for minutes.

<a id="g56-f034"></a>
### Scope caveats the paper names

`§10` — Scope caveats the paper names: ML papers only (physical/experimental sciences untested); a "Fidelity Ceiling" (output is bounded by its supervision source — a lossy paper cannot be un-lost); no sandboxed execution, no content-level anomaly detection, no schema evolution; and benchmark annotators were familiar with the ARA format, an optimistic bias the authors flag.

