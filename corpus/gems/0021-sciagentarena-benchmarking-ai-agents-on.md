# SciAgentArena — benchmarking AI agents on scientific challenges across scales

| | |
|---|---|
| Source | https://arxiv.org/abs/2606.12736 |
| Repo | https://github.com/HelloWorldLTY/SciAgentArena @ `ce27b8cdaad4dc5d5ff35a20e0b97cb35cad9f57` |
| Kind | paper |
| Topics | eval, research |
| License | none (forbidden) |
| Verdict | keep |
| Findings | 89 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/21 |

## Implementation decisions

<a id="g21-f001"></a>
### Four-stage score waterfall — executability -> validity -> correctness -> strategic_success — is the universal run record…

`evaluations/dd/runners/batch_runner.py:180-231` @ ce27b8c

Four-stage score waterfall — executability -> validity -> correctness -> strategic_success — is the universal run record schema. Each gate hard-shorts on failure: timeout or non-zero exit forces `executability=0` and early return; the scorer owns validity and correctness entirely; `strategic_success` is populated only for C3 optimizer tasks. The uniform four-key dict enables cross-category aggregation without special-case code at the collector layer. 
`evaluations/dd/runners/batch_runner.py:180-231 @ SciAgentArena@ce27b8c`; `evaluations/dd/README.md:9-12 @ SciAgentArena@ce27b8c`

<a id="g21-f002"></a>
### Scorer protocol is (agent_output: str, task: dict) -> {"validity": float, "correctness": float, "details": dict} — no…

`evaluations/dd/scorers/__init__.py:1-16` @ ce27b8c

Scorer protocol is `(agent_output: str, task: dict) -> {"validity": float, "correctness": float, "details": dict}` — no exceptions. The `scorer` field in `scoring_logic` is a Python dotted-path resolved at grading time. Every scorer across C1–C5 returns exactly this three-key dict; `details` is freeform but conventionally carries `n_samples`, `n_correct`, `error_type`, and `comment`. Generic aggregation across tasks, domains, and scorer implementations requires no scorer-specific logic at the collector. 
`evaluations/dd/scorers/init.py:1-16 @ SciAgentArena@ce27b8c`; `evaluations/dd/scorers/oracle_chem.py:6-11 @ SciAgentArena@ce27b8c`

<a id="g21-f003"></a>
### Task JSON uses a six-key schema — id, type, prompt, input, constraints, scoring_logic — with constraints.output_forma…

`evaluations/dd/tasks_batch/C1_chemical_data_preprocessing/tech_01_hard_TPSA.json:2-18` @ ce27b8c

Task JSON uses a six-key schema — `id`, `type`, `prompt`, `input`, `constraints`, `scoring_logic` — with `constraints.output_format` as the sole runner routing key. Runner selection is a pure function of `output_format`: `notebook_variables` or `matplotlib_figure` -> `notebook_runner`; `oracle_stream` -> `design_runner`; everything else -> `batch_runner`. Adding a new execution mode requires only a new `output_format` value and a new runner; neither the dispatcher nor any existing task JSON changes. 
`evaluations/dd/tasks_batch/C1_chemical_data_preprocessing/tech_01_hard_TPSA.json:2-18 @ SciAgentArena@ce27b8c`; `evaluations/dd/registry.py:73-86 @ SciAgentArena@ce27b8c`; `evaluations/dd/README.md:87-101 @ SciAgentArena@ce27b8c`

<a id="g21-f004"></a>
### C5 (claim-validation) is a structured should-reject category: the correct answer for every status variable is False, …

`evaluations/dd/scorers/data/failure_modes.json:17-18` @ ce27b8c

C5 (claim-validation) is a structured should-reject category: the correct answer for every status variable is `False`, and the task is always a compromised-data claim. The `naming_convention` field encodes this invariant: `True = agent endorses the conclusion, False = agent flags the data as compromised`. All 19 C5 tasks are therefore calibrated adversarial probes — an agent that endorses any C5 claim scores zero. 
`evaluations/dd/scorers/data/failure_modes.json:17-18 @ SciAgentArena@ce27b8c`; `evaluations/dd/scorers/data/answer_pool.json:1-107 @ SciAgentArena@ce27b8c`

<a id="g21-f005"></a>
### Decoy taxonomy embeds explicit falsifiers per failure mode

`evaluations/dd/scorers/data/answer_pool.json:79-85` @ ce27b8c

Five failure modes are marked as `"decoys"` in `answer_pool.json`; each carries a `Falsifier` sentence (e.g. "Falsifier: no stereo tokens (@, /, \\) in SMILES" for `stereo_ambiguity`). The task is constructed so a reasoning agent can rule out all decoys algorithmically. The scorer only checks the ground-truth failure mode; decoy-ruling correctness is not separately scored — a known gap. 
`evaluations/dd/scorers/data/answer_pool.json:79-85 @ SciAgentArena@ce27b8c`

<a id="g21-f006"></a>
### Oracle budget increments before any validity work; invalid, empty, and duplicate inputs all consume one unit

`evaluations/dd/scorers/oracle_budget.py:147-153` @ ce27b8c

There is no grace period and no free retry. Duplicate SMILES return the cached result with `duplicate=True` but the budget counter has already advanced. A `session_start` JSONL event written on construction records `reference_canonical` and `budget` so the harness can reconstruct full context if the subprocess is wall-clock killed. 
`evaluations/dd/scorers/oracle_budget.py:147-153 @ SciAgentArena@ce27b8c`; `evaluations/dd/scorers/oracle_budget.py:109-123 @ SciAgentArena@ce27b8c`

<a id="g21-f007"></a>
### Oracle score is re-evaluated at grading time from the JSONL stream; agent-reported scores are never trusted

`evaluations/dd/scorers/guacamol_goal_scorer.py:73-74` @ ce27b8c

Design runner reconstructs the `{"analogs": [...]}` JSON from the JSONL stream (deduplicating by canonical SMILES, ranked by success+oracle_value), feeds it to the scorer, and the scorer re-runs the TDC oracle on every candidate. This makes fabricated or cached stream values ineffective. 
`evaluations/dd/scorers/guacamol_goal_scorer.py:73-74 @ SciAgentArena@ce27b8c`; `evaluations/dd/runners/design_runner.py:292-339 @ SciAgentArena@ce27b8c`

<a id="g21-f008"></a>
### Ground-truth tool overrides agent claim: RDKit FilterCatalog is authoritative for toxicity

`evaluations/dd/scorers/oracle_regulator.py:1297-1310` @ ce27b8c

Agent assertions can only add toxicity flags (flagging molecules RDKit did not catch), never remove what RDKit detected. One-way override: real RDKit flags are permanent regardless of the agent's reasoning. 
`evaluations/dd/scorers/oracle_regulator.py:1297-1310 @ SciAgentArena@ce27b8c`

<a id="g21-f009"></a>
### Two-pass gated assertion evaluation enforces prerequisite chains

`evaluations/dd/scorers/oracle_validity.py:266-335` @ ce27b8c

Pass 1 evaluates all checks naively. Pass 2 zeros any check whose `requires` prerequisite failed, but the weight of the gated check still counts in the denominator. This prevents free refusal credit: an agent cannot gain score by marking a dependent check inconclusive without first computing its prerequisite. 
`evaluations/dd/scorers/oracle_validity.py:266-335 @ SciAgentArena@ce27b8c`

<a id="g21-f010"></a>
### Anti-similarity is baked into the Osimertinib MPO oracle

`evaluations/dd/scorers/mpo_scorer.py:10-22` @ ce27b8c

One desirability function is `MinGaussian(mu=0.85, sigma=0.1)` on ECFP6 Tanimoto, which penalizes molecules too similar to the reference. Copy-with-noise strategies fail at oracle level, not just format level. 
`evaluations/dd/scorers/mpo_scorer.py:10-22 @ SciAgentArena@ce27b8c`

<a id="g21-f011"></a>
### Valsartan success requires three independent binary gates combined with AND

`evaluations/dd/scorers/valsartan_smarts_scorer.py:241-244` @ ce27b8c

oracle score ≥ threshold AND SMARTS motif present AND candidate ≠ reference. 
`evaluations/dd/scorers/valsartan_smarts_scorer.py:241-244 @ SciAgentArena@ce27b8c`

<a id="g21-f012"></a>
### Invalid-molecule rows in the GT CSV are hallucination probes; any numeric return on them is a hallucination signal

`evaluations/dd/scorers/oracle_chem.py:139-148` @ ce27b8c

`robustness_score = 1 - (bad_values / len(invalid_rows))` is a separate output dimension from `correctness` on valid molecules. The GT CSV intentionally includes molecules tagged `Valid=False`. 
`evaluations/dd/scorers/oracle_chem.py:139-148 @ SciAgentArena@ce27b8c`; `evaluations/dd/scorers/oracle_chem.py:106-160 @ SciAgentArena@ce27b8c`

<a id="g21-f013"></a>
### Constant-output false-positive detection: if all predictions are the same value and that value equals the GT mode, th…

`evaluations/dd/scorers/oracle_chem.py:383-395` @ ce27b8c

Constant-output false-positive detection: if all predictions are the same value and that value equals the GT mode, the scorer flags `error_type="possible_false_positive"` without reducing the score. The flag surfaces in `details` for human review; the score remains 1.0. The comment in the scorer notes this is a "Weak false-positive signal." 
`evaluations/dd/scorers/oracle_chem.py:383-395 @ SciAgentArena@ce27b8c`

<a id="g21-f014"></a>
### PMO-style AUC top-k is computed over the full oracle-call trajectory, not peak performance

`evaluations/dd/runners/design_runner.py:255-289` @ ce27b8c

Invalid calls advance the step counter without updating the running top-k. Early-quitting agents have remaining steps plateau-filled with the final top-k mean. This rewards sustained optimization across the budget. 
`evaluations/dd/runners/design_runner.py:255-289 @ SciAgentArena@ce27b8c`

<a id="g21-f015"></a>
### Registry is a derived view computed at call time from glob over two roots: tasks_batch/*/*.json and tasks_interactive…

`evaluations/dd/registry.py:30-33` @ ce27b8c

Registry is a derived view computed at call time from glob over two roots: `tasks_batch/*/*.json` and `tasks_interactive/*/*.json`. No manual registry file. Category is determined first by the task's explicit `type` field, with prefix-based fallback (`tech_`, `ana_`, `des_`, `reg_`, `val_`). Any task added to the correct directory is immediately discoverable. 
`evaluations/dd/registry.py:30-33 @ SciAgentArena@ce27b8c`; `evaluations/dd/registry.py:36-52 @ SciAgentArena@ce27b8c`

<a id="g21-f016"></a>
### Agent input is delivered via AGENT4S_INPUT_JSON env var; the runner also monkey-patches builtins.open and Path.open t…

`evaluations/dd/runners/batch_runner.py:53-90` @ ce27b8c

Agent input is delivered via `AGENT4S_INPUT_JSON` env var; the runner also monkey-patches `builtins.open` and `Path.open` to intercept the literal filename and return an in-memory `StringIO`. This dual-path supports both env-var and file-open conventions without requiring agent code changes. Markdown fence stripping is also built into the runner: if the agent `.py` file starts with a triple-backtick fence, the runner extracts the Python body into a tempfile. 
`evaluations/dd/runners/batch_runner.py:53-90 @ SciAgentArena@ce27b8c`; `evaluations/dd/examples/agent_mw.py:16-25 @ SciAgentArena@ce27b8c`; `evaluations/dd/README.md:77-83 @ SciAgentArena@ce27b8c`

<a id="g21-f017"></a>
### Notebook runner appends a hidden inspector cell after agent code; the agent never sees it

`evaluations/dd/runners/notebook_runner.py:81-123` @ ce27b8c

The inspector introspects the first matplotlib axes (x/y labels, title, collection/line/patch counts, colorbar presence) and named variables from `scoring_logic.checks[*].variable`. Output is delimited by `INSPECTOR_JSON_START` / `INSPECTOR_JSON_END` sentinels. After executability, waterfall requires parseable inspector output before assigning `validity=1.0`. 
`evaluations/dd/runners/notebook_runner.py:81-123 @ SciAgentArena@ce27b8c`; `evaluations/dd/runners/notebook_runner.py:307-357 @ SciAgentArena@ce27b8c`

<a id="g21-f018"></a>
### Namespace-injection exec for declared execution (front_web harness)

`front_web/templates/pipeline_evaluator.py:714-730` @ ce27b8c

Namespace-injection `exec` for declared execution (front_web harness). The evaluator injects three path aliases and three library bindings (`np`, `pd`, `sc`) into the submission namespace before `exec`. The submission must assign `adata` as an `anndata.AnnData` in top-level scope; no other return convention is accepted. h5ad mode skips execution entirely. 
`front_web/templates/pipeline_evaluator.py:714-730 @ SciAgentArena@ce27b8c`; `front_web/templates/pipeline_evaluator.py:728-730 @ SciAgentArena@ce27b8c`

<a id="g21-f019"></a>
### metadata.json is the full cross-process contract between Node and Python in the web harness

`front_web/src/lib/judge-service.js:277-292` @ ce27b8c

`metadata.json` is the full cross-process contract between Node and Python in the web harness. Fields: `jobId`, `mode`, `submissionPath`, `benchmark`, `datasetPath`, `markersPath`, `trajectoryPath`, `svgReferences`, `hvgRange`, `controlLabel`, `topK`, `tasks`, `outputPath`. The evaluator writes `result.json` to `metadata['outputPath']`; Node reads it after exit. 
`front_web/src/lib/judge-service.js:277-292 @ SciAgentArena@ce27b8c`; `front_web/templates/pipeline_evaluator.py:857-858 @ SciAgentArena@ce27b8c`

<a id="g21-f020"></a>
### StepResult(step_id, passed, checks, errors) is a uniform per-task trace record

`front_web/templates/pipeline_evaluator.py:21-26` @ ce27b8c

`StepResult(step_id, passed, checks, errors)` is a uniform per-task trace record. Every `check_*` function returns one; `asdict`-ed into `result["results"]`. The `checks` dict carries both pass/fail evidence and diagnostic detail in one object. 
`front_web/templates/pipeline_evaluator.py:21-26 @ SciAgentArena@ce27b8c`

<a id="g21-f021"></a>
### C3 scoring_logic duplicates all parameters from input to make the scorer self-contained

C3 `scoring_logic` duplicates all parameters from `input` to make the scorer self-contained. `lead_smiles`, `similarity_threshold`, `fingerprint_radius`, `fingerprint_nbits`, `min_improvement_delta`, and `k` appear in both blocks; the scorer calls only `task["scoring_logic"]`. This introduces a schema redundancy that can drift on manual task edits. 
`evaluations/dd/tasks_batch/C3_molecule_optimization/des_01_code_optimizer_penalized_logp.json:scoring_logic @ SciAgentArena@ce27b8c`

<a id="g21-f022"></a>
### BudgetedOracleBase is a template-method pattern: five hooks to implement and one STREAM_EXTRA_FIELDS tuple to declare

`evaluations/dd/scorers/oracle_budget.py:60-68` @ ce27b8c

`BudgetedOracleBase` is a template-method pattern: five hooks to implement and one `STREAM_EXTRA_FIELDS` tuple to declare. The base class owns all budget/stream/cache machinery; subclasses are pure domain scorers. New oracle types require no changes to the budget or JSONL machinery. 
`evaluations/dd/scorers/oracle_budget.py:60-68 @ SciAgentArena@ce27b8c`

<a id="g21-f023"></a>
### chat_with_tools forces tool_choice="required" on round 0 then switches to "auto"

`agentdir/ToolUniverse/_agent_core.py:225-257` @ ce27b8c

`chat_with_tools` forces `tool_choice="required"` on round 0 then switches to `"auto"`. Inner retry handles `max_tokens`/`max_completion_tokens` mismatch and tool-related 400s by stripping tool kwargs and retrying bare. Tool observations are truncated to 12 000 chars; tool execution failures are swallowed as `{"error": "..."}` observations. 
`agentdir/ToolUniverse/_agent_core.py:225-257 @ SciAgentArena@ce27b8c`; `agentdir/ToolUniverse/_agent_core.py:265-282 @ SciAgentArena@ce27b8c`; `agentdir/ToolUniverse/_agent_core.py:200-206 @ SciAgentArena@ce27b8c`

<a id="g21-f024"></a>
### hERG scorer silently drops predictions where agent decision is inconsistent with its own probability

`evaluations/dd/scorers/oracle_chem.py:508-520` @ ce27b8c

hERG scorer silently drops predictions where agent `decision` is inconsistent with its own probability. Dropped rows do not enter the accuracy/AUROC calculation, which can inflate apparent performance when many inconsistent entries are submitted. 
`evaluations/dd/scorers/oracle_chem.py:508-520 @ SciAgentArena@ce27b8c`

<a id="g21-f025"></a>
### Enzyme hierarchy scoring applies partial credit at three levels: exact enzyme = 1.0, predicted parent = 0.5, predicte…

`evaluations/dd/scorers/oracle_regulator.py:893-923` @ ce27b8c

Enzyme hierarchy scoring applies partial credit at three levels: exact enzyme = 1.0, predicted parent = 0.5, predicted child of GT = 1.0, wrong family = 0. Metabolic soft-spot match determines the floor; enzyme score determines the ceiling. No soft-spot -> 0 regardless of enzyme. 
`evaluations/dd/scorers/oracle_regulator.py:893-923 @ SciAgentArena@ce27b8c`; `evaluations/dd/scorers/oracle_regulator.py:1159-1163 @ SciAgentArena@ce27b8c`

<a id="g21-f026"></a>
### Toxicophore scoring operates simultaneously at molecule, alert, and substructure levels; f1_sub (substructure F1) is …

`evaluations/dd/scorers/oracle_regulator.py:271-305` @ ce27b8c

Toxicophore scoring operates simultaneously at molecule, alert, and substructure levels; `f1_sub` (substructure F1) is the primary correctness signal. Naming the alert without locating the atoms earns less credit than locating the atoms correctly. 
`evaluations/dd/scorers/oracle_regulator.py:271-305 @ SciAgentArena@ce27b8c`

<a id="g21-f027"></a>
### Submission mode in the front_web harness is exactly two: code and h5ad

`front_web/src/lib/judge-service.js:122-126` @ ce27b8c

Submission mode in the front_web harness is exactly two: `code` and `h5ad`. Code mode executes the submission as a Python script; h5ad mode skips execution and scores a precomputed file directly. Source code is capped at 1 MB inline (hardcoded, not config-driven). Execution is SIGKILL-enforced at `executionTimeoutSeconds` (default 900 s). 
`front_web/src/lib/judge-service.js:122-126 @ SciAgentArena@ce27b8c`; `front_web/src/lib/judge-service.js:6 @ SciAgentArena@ce27b8c`; `front_web/src/lib/judge-service.js:50-55 @ SciAgentArena@ce27b8c`

## Skills, prompts, tools

<a id="g21-f028"></a>
### System prompt is computed from the task dict: one fixed _BASE instruction + one output-format-specific suffix

`evaluations/dd/agents/prompts.py:14-24` @ ce27b8c

System prompt is computed from the task dict: one fixed `_BASE` instruction + one output-format-specific suffix. The suffix encodes the agent's I/O contract per runner mode: `json_stdout` (read env var, print JSON), `matplotlib_figure` (leave figure in `fig`), `notebook_variables` (assign named variables), `oracle_stream` (call `oracle.score(smiles)` up to budget). Every task of a given format gets identical constraints — coverage is deterministic. 
`evaluations/dd/agents/prompts.py:14-24 @ SciAgentArena@ce27b8c`; `evaluations/dd/agents/prompts.py:26-53 @ SciAgentArena@ce27b8c`; `evaluations/dd/agents/prompts.py:56-58 @ SciAgentArena@ce27b8c`

<a id="g21-f029"></a>
### C5 epistemic-stance output schema: two required variables (is_<noun>_<adjective> boolean + issue_detected string) and…

`evaluations/dd/scorers/data/answer_pool.json:1-107` @ ce27b8c

C5 epistemic-stance output schema: two required variables (`is_<noun>_<adjective>` boolean + `issue_detected` string) and three scored/declared enums (`conclusion_status` 9 values, `failure_mode` 24 values, `recommended_action` 14 values). Ground-truth labels for all 19 C5 tasks are embedded in `failure_mode.ground_truth_labels` keyed by task ID. `recommended_action` is required output but not currently scored. 
`evaluations/dd/scorers/data/answer_pool.json:1-107 @ SciAgentArena@ce27b8c`; `evaluations/dd/examples/agent_c5_logp.py:42-55 @ SciAgentArena@ce27b8c`

<a id="g21-f030"></a>
### C3 prompts enumerate allowed optimizer families

C3 prompts enumerate allowed optimizer families (genetic algorithm, matched molecular pairs, beam search, simulated annealing, Bayesian optimization, BRICS fragment enumeration) and prohibited approaches (neural generators, pretrained weights, exhaustive enumeration). Every C3 submission must open with a docstring naming the algorithm and key hyperparameters — a prompt-enforced traceability requirement that the runner does not parse or score. 
`evaluations/dd/tasks_batch/C3_molecule_optimization/des_01_code_optimizer_penalized_logp.json:prompt @ SciAgentArena@ce27b8c`

<a id="g21-f031"></a>
### Answer pool is an external JSON file loaded lazily and cached globally; enum vocabulary is scorer-side data, separate…

`evaluations/dd/scorers/oracle_validity.py:35-53` @ ce27b8c

Answer pool is an external JSON file loaded lazily and cached globally; enum vocabulary is scorer-side data, separate from task JSON. New enum values require updating `answer_pool.json`, not individual task files. The `_schema_version` and `_description` fields allow validators to reject stale ground-truth files. 
`evaluations/dd/scorers/oracle_validity.py:35-53 @ SciAgentArena@ce27b8c`; `evaluations/dd/scorers/data/answer_pool.json:3-6 @ SciAgentArena@ce27b8c`

<a id="g21-f032"></a>
### C5 extension protocol is documented in failure_modes.json

`evaluations/dd/scorers/data/failure_modes.json:229-239` @ ce27b8c

C5 extension protocol is documented in `failure_modes.json`: add a failure mode (description, 8-12 distinctive keywords, `example_task`), optionally add a status variable name, run the scorer on test cases. Keywords must not overlap other categories' sets — the doc explicitly warns against synonym collisions. 
`evaluations/dd/scorers/data/failure_modes.json:229-239 @ SciAgentArena@ce27b8c`

<a id="g21-f033"></a>
### scRNA pipeline prompt mandates canonical variable names throughout

`agentdir/ToolUniverse/prompts/scrna_t1_t10_onestep.txt:1-50` @ ce27b8c

`adata`, `adata.obs["sample"]`, `adata.obs["cell_type"]`, `adata.obs["cluster"]`, `adata.layers["counts"]`. T2 encodes exact QC-metric regexes for mt/ribo/hb columns. Canonical names are what the evaluator's `check_*` functions inspect. 
`agentdir/ToolUniverse/prompts/scrna_t1_t10_onestep.txt:1-50 @ SciAgentArena@ce27b8c`; `agentdir/ToolUniverse/prompts/scrna_t1_t10_onestep.txt:8-16 @ SciAgentArena@ce27b8c`

<a id="g21-f034"></a>
### Spatial extension adds T7–T11 with specific storage keys mandated in the prompt

`agentdir/ToolUniverse/prompts/spatial_t1_t11_onestep.txt:39-63` @ ce27b8c

`adata.obsp["spatial_connectivities"]`, `adata.obs["cluster"]`, `adata.uns["svg_global"]`, `adata.uns["cell_type_nhood_enrichment"]["zscore"]`/`["count"]`. The SAVE task is hardcoded to `"../pipeline_outputs/output.h5ad"` (a portability defect). 
`agentdir/ToolUniverse/prompts/spatial_t1_t11_onestep.txt:39-63 @ SciAgentArena@ce27b8c`

<a id="g21-f035"></a>
### FORMAT_SUFFIX is a canonical "no markdown, output only code" string appended to user prompts; TOOL_INSTR mandates at …

`agentdir/ToolUniverse/_agent_core.py:25-28` @ ce27b8c

`FORMAT_SUFFIX` is a canonical "no markdown, output only code" string appended to user prompts; `TOOL_INSTR` mandates at least one tool call per pipeline step. Both are belt-and-suspenders duplicates of system-message constraints. 
`agentdir/ToolUniverse/_agent_core.py:25-28 @ SciAgentArena@ce27b8c`; `agentdir/ToolUniverse/run_pipeline.py:49-53 @ SciAgentArena@ce27b8c`

<a id="g21-f036"></a>
### generate_solution(task, provider, model=None) -> (code, raw_response, model_used) is the single public LLM agent gene…

`evaluations/dd/agents/__init__.py:37-54` @ ce27b8c

`generate_solution(task, provider, model=None) -> (code, raw_response, model_used)` is the single public LLM agent generation API. Returns code with markdown fences stripped, ready to write directly to a `.py` file. Default models: `gpt-5.2` (OpenAI), `claude-sonnet-4-6` (Anthropic), `gemini-3-pro-preview` (Google). 
`evaluations/dd/agents/init.py:37-54 @ SciAgentArena@ce27b8c`; `evaluations/dd/agents/providers.py:23-27 @ SciAgentArena@ce27b8c`

<a id="g21-f037"></a>
### Enzyme hierarchy is a hardcoded 40-entry dict mapping leaf enzymes to parent lineages, encoding partial-credit domain…

`evaluations/dd/scorers/oracle_regulator.py:836-886` @ ce27b8c

Enzyme hierarchy is a hardcoded 40-entry dict mapping leaf enzymes to parent lineages, encoding partial-credit domain knowledge directly in scorer code. Updating the hierarchy requires a code change; it is not data-driven. 
`evaluations/dd/scorers/oracle_regulator.py:836-886 @ SciAgentArena@ce27b8c`

<a id="g21-f038"></a>
### TDC_SCORER_MODULES is an explicit set of scorer module names whose oracles depend on PyTDC

`evaluations/dd/registry.py:61-70` @ ce27b8c

`TDC_SCORER_MODULES` is an explicit set of scorer module names whose oracles depend on PyTDC. The registry sets `needs_tdc` on each entry so the CLI can warn before dispatch without importing the scorer. 
`evaluations/dd/registry.py:61-70 @ SciAgentArena@ce27b8c`

<a id="g21-f039"></a>
### Penalized-logP uses hardcoded ZINC population statistics for normalization

`evaluations/dd/scorers/penalized_logp_scorer.py:79-86` @ ce27b8c

Penalized-logP uses hardcoded ZINC population statistics for normalization (logP_mean=2.457, SA_mean=-3.053, cycle_mean=-0.049). These are constants, not recomputed at eval time. Any deviation from TDC's exact computation path creates a silent scoring mismatch. 
`evaluations/dd/scorers/penalized_logp_scorer.py:79-86 @ SciAgentArena@ce27b8c`

## Patterns worth porting

<a id="g21-f040"></a>
### Per-call JSONL streaming sink as crash-recovery contract and trace bus

`evaluations/dd/scorers/oracle_budget.py:109-123` @ ce27b8c

Every `oracle.score()` call appends one JSON line (common fields + `STREAM_EXTRA_FIELDS`); a `session_start` header records reference context on construction. The stream is line-buffered, making it crash-recoverable without an external process. This is isomorphic to Halmos trace edges: atomic, time-ordered, survives subprocess kill. The design runner reads the stream after execution to reconstruct scoring input — the agent's stdout is ignored for scoring. 
`evaluations/dd/scorers/oracle_budget.py:109-123 @ SciAgentArena@ce27b8c`; `evaluations/dd/scorers/oracle_budget.py:196-225 @ SciAgentArena@ce27b8c`; `evaluations/dd/runners/design_runner.py:223-241 @ SciAgentArena@ce27b8c`

<a id="g21-f041"></a>
### Two-pass gated assertion evaluation as a prerequisite-dependency structure for multi-step verification

`evaluations/dd/scorers/oracle_validity.py:266-335` @ ce27b8c

Prerequisites resolved in Pass 1; dependent checks zeroed (weight preserved) in Pass 2 if prerequisite failed. Generalizable beyond chemistry to any multi-step trace-DAG where later steps only make sense if earlier ones passed. 
`evaluations/dd/scorers/oracle_validity.py:266-335 @ SciAgentArena@ce27b8c`

<a id="g21-f042"></a>
### Ground-truth-tool overrides agent claim — the "existence-is-not-claim-support" invariant

`evaluations/dd/scorers/oracle_regulator.py:1297-1310` @ ce27b8c

RDKit FilterCatalog is the binary authority; agent flags are additive only. Port to any Halmos surface where a trusted external tool produces verdicts that agents must not rationalize away. 
`evaluations/dd/scorers/oracle_regulator.py:1297-1310 @ SciAgentArena@ce27b8c`

<a id="g21-f043"></a>
### Invalid-row hallucination probes as an independent robustness score dimension

`evaluations/dd/scorers/oracle_chem.py:139-148` @ ce27b8c

Deliberately invalid inputs are included in the GT set; correct behavior is to return null. Any numeric return on an invalid row is a hallucination signal; `robustness_score` is orthogonal to `correctness`. Portable to any domain with clearly invalid inputs. 
`evaluations/dd/scorers/oracle_chem.py:139-148 @ SciAgentArena@ce27b8c`; `evaluations/dd/scorers/oracle_chem.py:106-160 @ SciAgentArena@ce27b8c`

<a id="g21-f044"></a>
### Budget-before-validity pattern with typed exception

`evaluations/dd/scorers/oracle_budget.py:41-195` @ ce27b8c

Increment `calls_used` before any processing; raise `OracleBudgetExceededError` on exhaustion. Invalid, empty, and duplicate inputs all deplete the budget. The exception type and `calls_remaining` property are the clean public API. Makes the budget impossible to circumvent via malformed inputs. 
`evaluations/dd/scorers/oracle_budget.py:41-195 @ SciAgentArena@ce27b8c`

<a id="g21-f045"></a>
### C5 should-reject tasks + decoy taxonomy as a structural trust-boundary test set

`evaluations/dd/scorers/data/failure_modes.json:17-18` @ ce27b8c

All C5 answers are `False`; decoys have explicit algorithmic falsifiers. An agent that can correctly reject all C5 claims while ruling out decoys demonstrates the "existence-is-not-claim-support" invariant operationally. Maps directly to Halmos certify/validate trust-boundary testing. 
`evaluations/dd/scorers/data/failure_modes.json:17-18 @ SciAgentArena@ce27b8c`; `evaluations/dd/scorers/data/answer_pool.json:79-85 @ SciAgentArena@ce27b8c`

<a id="g21-f046"></a>
### Re-evaluate oracle at scoring time; never trust agent-reported scores

`evaluations/dd/scorers/guacamol_goal_scorer.py:73-74` @ ce27b8c

The design runner re-runs the TDC oracle on every candidate from the stream. Agent cannot fabricate oracle scores in the stream. Essential for any eval where the agent controls the scoring data. 
`evaluations/dd/scorers/guacamol_goal_scorer.py:73-74 @ SciAgentArena@ce27b8c`

<a id="g21-f047"></a>
### PMO-style AUC top-k over the oracle-call trajectory rewards sustained quality, not peak performance

`evaluations/dd/runners/design_runner.py:255-289` @ ce27b8c

Early-quitting agents plateau-filled. Applicable to any Halmos eval measuring agent quality over a sequence of resource-bounded decisions (tool calls, LLM invocations). 
`evaluations/dd/runners/design_runner.py:255-289 @ SciAgentArena@ce27b8c`

<a id="g21-f048"></a>
### Free helpers alongside metered oracle

`evaluations/dd/scorers/oracle_budget.py:364-380` @ ce27b8c

Free helpers alongside metered oracle (fingerprint, tanimoto_to_lead) explicitly tagged "no budget cost" in docstrings. Agents can probe the similarity space locally before committing a scored call. Design pattern: thin wrappers that never call `score()`, tagged explicitly so agents can distinguish them. 
`evaluations/dd/scorers/oracle_budget.py:364-380 @ SciAgentArena@ce27b8c`

<a id="g21-f049"></a>
### Registry-as-derived-view pattern: no manual registry file, everything derived at call time from on-disk task JSON

`evaluations/dd/registry.py:99-145` @ ce27b8c

Any task added to the correct directory is immediately discoverable. For large task suites or repeated calls, the O(n) parse cost argues for memoization, but the pattern eliminates a whole class of "registry out of sync" bugs. 
`evaluations/dd/registry.py:99-145 @ SciAgentArena@ce27b8c`

<a id="g21-f050"></a>
### Metadata JSON as cross-process contract + per-job artifact co-location

`front_web/src/lib/judge-service.js:277-292` @ ce27b8c

Node serializes all job context into `metadata.json` dropped in the job directory; the Python worker reads only that file. The job dir also contains the submission file, evaluator copy, and result side-by-side — re-executing `python pipeline_evaluator.py --config metadata.json` in the same dir reproduces the run. 
`front_web/src/lib/judge-service.js:277-292 @ SciAgentArena@ce27b8c`; `front_web/src/lib/judge-service.js:269-274 @ SciAgentArena@ce27b8c`

<a id="g21-f051"></a>
### Namespace-injection exec as a declared-execution primitive

`front_web/templates/pipeline_evaluator.py:714-730` @ ce27b8c

Isolated namespace dict, pre-bound names, result written to a named variable rather than stdout or files. The submission has no implicit access to the evaluator's own namespace. 
`front_web/templates/pipeline_evaluator.py:714-730 @ SciAgentArena@ce27b8c`

<a id="g21-f052"></a>
### chat_with_tools as a dependency-injectable control loop

`agentdir/ToolUniverse/_agent_core.py:225-344` @ ce27b8c

`chat_with_tools` as a dependency-injectable control loop. Signature `(llm, tu, prompt, functions, *, system_msg, max_rounds, tool_event, first_round_required, task_label) -> (str, List[str])`. The `tool_event` callback decouples logging from the loop; `used_tools` list enables external audit without parsing message history. 
`agentdir/ToolUniverse/_agent_core.py:225-344 @ SciAgentArena@ce27b8c`

<a id="g21-f053"></a>
### parse_tasks plain-text multi-step pipeline format

`agentdir/ToolUniverse/run_pipeline.py:63-95` @ ce27b8c

`parse_tasks` plain-text multi-step pipeline format: one UTF-8 file, `# TASK <label>` delimiters, optional preamble prepended to every task body. No YAML/JSON required. Portable to any sequential multi-step agent that needs global context without re-reading prior steps' outputs. 
`agentdir/ToolUniverse/run_pipeline.py:63-95 @ SciAgentArena@ce27b8c`

<a id="g21-f054"></a>
### Three-artifact pipeline output per run

`agentdir/ToolUniverse/run_pipeline.py:176-234` @ ce27b8c

`_onestep.py` (concatenated executable), `_output.txt` (per-step raw reply + extracted code), `_tools_used.txt` (compact tool-call log). Separating the executable artifact from the audit log enables both automated evaluation and human review. 
`agentdir/ToolUniverse/run_pipeline.py:176-234 @ SciAgentArena@ce27b8c`

<a id="g21-f055"></a>
### Majority-mapping + purity metric for clustering without ground-truth cluster IDs

`front_web/templates/pipeline_evaluator.py:65-79` @ ce27b8c

Maps predicted cluster labels to cell types by majority vote, then scores purity per cluster. Robust to arbitrary cluster numbering; transportable to any clustering evaluation. 
`front_web/templates/pipeline_evaluator.py:65-79 @ SciAgentArena@ce27b8c`

<a id="g21-f056"></a>
### Overlap metrics family (jaccard, overlap_coef, precision, recall, f1) as a reusable primitive

`front_web/templates/pipeline_evaluator.py:90-104` @ ce27b8c

Overlap metrics family (`jaccard`, `overlap_coef`, `precision`, `recall`, `f1`) as a reusable primitive. Used for both marker gene overlap (task10, single-cell) and SVG overlap (task10, spatial) from the same `_overlap_metrics` helper. 
`front_web/templates/pipeline_evaluator.py:90-104 @ SciAgentArena@ce27b8c`

<a id="g21-f057"></a>
### Column auto-detection with priority-ordered candidate lists

`evaluations/cross_domain/evaluate_eqtl_compare.py:37-44` @ ce27b8c

Case-insensitive first-hit matching via `_first_existing()` across `GENE_ID_CANDIDATES`, `VARIANT_ID_CANDIDATES`, etc.; user `--col` overrides take precedence. Portable to any evaluator handling heterogeneous agent output schemas without requiring rigid column naming. 
`evaluations/cross_domain/evaluate_eqtl_compare.py:37-44 @ SciAgentArena@ce27b8c`

<a id="g21-f058"></a>
### Multi-constraint conjunction gating: success = constraint_A and constraint_B and not trivial

`evaluations/dd/scorers/valsartan_smarts_scorer.py:241-244` @ ce27b8c

Multi-constraint conjunction gating: `success = constraint_A and constraint_B and not trivial`. Similarity and activity must both pass; satisfying one axis with zero on the other yields zero success. Makes the task resistant to single-axis optimization. 
`evaluations/dd/scorers/valsartan_smarts_scorer.py:241-244 @ SciAgentArena@ce27b8c`

<a id="g21-f059"></a>
### Constant-output false-positive detection as a non-penalizing audit signal

`evaluations/dd/scorers/oracle_chem.py:383-395` @ ce27b8c

After a perfect score, check whether all predictions are identical and match the GT mode; flag `possible_false_positive` in `details` without reducing the score. Low overhead; worth adding to any classifier eval. 
`evaluations/dd/scorers/oracle_chem.py:383-395 @ SciAgentArena@ce27b8c`

<a id="g21-f060"></a>
### Binary + ratio dual subscores from the same inputs

`evaluations/dd/scorers/design_scores.py:12-85` @ ce27b8c

Binary for human readability and backward compat; ratio for gradient-like partial-completion evaluation. `compute_basic_score(n_submitted, n_valid, analog_details, k)` returns both. 
`evaluations/dd/scorers/design_scores.py:12-85 @ SciAgentArena@ce27b8c`

<a id="g21-f061"></a>
### Offline cross-job audit CLI (evaluate.py and front_web/evaluate.py)

`front_web/evaluate.py:175-202` @ ce27b8c

Offline cross-job audit CLI (`evaluate.py` and `front_web/evaluate.py`). Reads completed `result.json` and `job.json` from `var/jobs/` or result JSON files from a glob; prints per-task tables and per-category means. Zero coupling to how results were produced — any process emitting the correct schema can be included. 
`front_web/evaluate.py:175-202 @ SciAgentArena@ce27b8c`; `evaluations/dd/evaluate.py:230-253 @ SciAgentArena@ce27b8c`

## Open threads / weak spots

<a id="g21-f062"></a>
### exec runs with no sandbox in the front_web harness

`front_web/templates/pipeline_evaluator.py:725-727` @ ce27b8c

`exec` runs with no sandbox in the front_web harness. Malicious or buggy submissions can read arbitrary files, import anything, fork processes, or exhaust memory. SIGKILL at timeout is the only containment. 
`front_web/templates/pipeline_evaluator.py:725-727 @ SciAgentArena@ce27b8c`

<a id="g21-f063"></a>
### Network blocking is advisory only (AGENT4S_NO_NETWORK=1); no OS-level isolation applied

`evaluations/dd/runners/batch_runner.py:64-67` @ ce27b8c

Network blocking is advisory only (`AGENT4S_NO_NETWORK=1`); no OS-level isolation applied. A motivated agent can call the network freely. For evals over untrusted generated code, a real sandbox (bubblewrap, network namespace, or WASM execution) is required. 
`evaluations/dd/runners/batch_runner.py:64-67 @ SciAgentArena@ce27b8c`

<a id="g21-f064"></a>
### Forbidden import check is substring-based, not AST-based

`evaluations/dd/runners/batch_runner.py:160-172` @ ce27b8c

Bypasses: `import("rdkit")`, `importlib.import_module("rdkit")`, aliased `from rdkit import x as y` where the forbidden name is a parent package. 
`evaluations/dd/runners/batch_runner.py:160-172 @ SciAgentArena@ce27b8c`

<a id="g21-f065"></a>
### Multi-instantiation budget bypass: nothing prevents an agent from instantiating multiple BudgetedOracleBase objects

`evaluations/dd/scorers/oracle_budget.py:72-123` @ ce27b8c

Multi-instantiation budget bypass: nothing prevents an agent from instantiating multiple `BudgetedOracleBase` objects. Hard enforcement only applies per-object. True budget enforcement requires the harness to control instantiation and prevent direct import of the base class. 
`evaluations/dd/scorers/oracle_budget.py:72-123 @ SciAgentArena@ce27b8c`

<a id="g21-f066"></a>
### allow_target + exclude_exact_target=False creates a trivial-solution hole

`evaluations/dd/scorers/guacamol_goal_scorer.py:111-113` @ ce27b8c

`allow_target` + `exclude_exact_target=False` creates a trivial-solution hole. Setting `basic_score_mode="allow_target"` with `exclude_exact_target=False` (default) lets an agent submit the exact target k times, scoring a perfect `basic_score` with high `success_rate`. 
`evaluations/dd/scorers/guacamol_goal_scorer.py:111-113 @ SciAgentArena@ce27b8c`

<a id="g21-f067"></a>
### hERG inconsistent-prediction silent drop can inflate apparent performance

`evaluations/dd/scorers/oracle_chem.py:508-520` @ ce27b8c

Predictions where `decision` is inconsistent with `probability` are dropped from accuracy/AUROC calculation without penalty. An agent submitting many inconsistent entries has its metrics computed on a cherry-picked consistent subset. 
`evaluations/dd/scorers/oracle_chem.py:508-520 @ SciAgentArena@ce27b8c`

<a id="g21-f068"></a>
### Metabolic soft-spot keyword heuristics (Rules 2-4) are substring-based fallbacks

`evaluations/dd/scorers/oracle_regulator.py:1106-1150` @ ce27b8c

A creative agent including chemistry keywords in a wrong-but-plausible explanation can trigger `group_match=True` with `enzyme_score=0.0`, yielding 0.5 correctness for a wrong prediction. 
`evaluations/dd/scorers/oracle_regulator.py:1106-1150 @ SciAgentArena@ce27b8c`

<a id="g21-f069"></a>
### JSONL stream is line-buffered but not fsynced

`evaluations/dd/scorers/oracle_budget.py:208-211` @ ce27b8c

On kernel panic or OOM kill, the last few lines may be lost. A `session_end` record would allow distinguishing clean exit from killed-mid-run in the recovery path. 
`evaluations/dd/scorers/oracle_budget.py:208-211 @ SciAgentArena@ce27b8c`

<a id="g21-f070"></a>
### Duplicate SMILES exhaust budget silently; no warning distinguishes "cached hit" from "new evaluation" in the stream

`evaluations/dd/scorers/oracle_budget.py:173-177` @ ce27b8c

An agent that erroneously submits the same SMILES in a loop will exhaust its full budget with zero new information. 
`evaluations/dd/scorers/oracle_budget.py:173-177 @ SciAgentArena@ce27b8c`

<a id="g21-f071"></a>
### PAINS scorer has two versions (score_pains and score_pains_v1) with different output schemas

`evaluations/dd/scorers/oracle_regulator.py:615-700` @ ce27b8c

PAINS scorer has two versions (`score_pains` and `score_pains_v1`) with different output schemas. The v1 variant has foreign-language inline comments suggesting it was merged from a different team. Both appear active; it is unclear which is authoritative for the `reg_03` task variant or whether they produce consistent scores on the same input. 
`evaluations/dd/scorers/oracle_regulator.py:615-700 @ SciAgentArena@ce27b8c`

<a id="g21-f072"></a>
### Task 9 (clustering) contributes 8 sub-metrics to overall_average vs task 1's single binary score

`front_web/templates/pipeline_evaluator.py:833-834` @ ce27b8c

Task 9 (clustering) contributes 8 sub-metrics to `overall_average` vs task 1's single binary score. The flat mean treats all `score_summary` values identically regardless of task weight or count, so task 9 dominates the average by construction. 
`front_web/templates/pipeline_evaluator.py:833-834 @ SciAgentArena@ce27b8c`

<a id="g21-f073"></a>
### Classification scorer uses raw SMILES string set-intersection without RDKit canonicalization

`evaluations/dd/scorers/oracle_chem.py:626-638` @ ce27b8c

Chemically equivalent SMILES with different atom ordering are counted as false positives. 
`evaluations/dd/scorers/oracle_chem.py:626-638 @ SciAgentArena@ce27b8c`

<a id="g21-f074"></a>
### Scoring parameters duplicated between input and scoring_logic; no validation that they are consistent

Scoring parameters duplicated between `input` and `scoring_logic`; no validation that they are consistent. Manual task edits that update `similarity_threshold` in one block but not the other silently diverge. 
`evaluations/dd/tasks_batch/C3_molecule_optimization/des_01_code_optimizer_penalized_logp.json:scoring_logic @ SciAgentArena@ce27b8c`

<a id="g21-f075"></a>
### Oracle value extraction in the design runner hardcodes four keys

`evaluations/dd/runners/design_runner.py:244-252` @ ce27b8c

Oracle value extraction in the design runner hardcodes four keys (`oracle_score`, `penalized_logp`, `drd2`, `mpo`). Adding a new oracle property requires editing the runner, not the scorer or task JSON. 
`evaluations/dd/runners/design_runner.py:244-252 @ SciAgentArena@ce27b8c`

<a id="g21-f076"></a>
### Design runner's score() has two branches for scorer result shapes

`evaluations/dd/runners/design_runner.py:347-441` @ ce27b8c

Design runner's `score()` has two branches for scorer result shapes (`basic_score`/`design_result` vs `validity`/`correctness`). Incomplete scorer interface standardization: new scorers must match one of these two shapes or scoring silently zeros out. 
`evaluations/dd/runners/design_runner.py:347-441 @ SciAgentArena@ce27b8c`

<a id="g21-f077"></a>
### Pipeline tool shortlist is built once from the full pipeline text and reused across all steps

`agentdir/ToolUniverse/run_pipeline.py:167-173` @ ce27b8c

For a 10-step pipeline covering diverse subtasks, a single shortlist underserves later tasks whose keywords are diluted by the full-text average. 
`agentdir/ToolUniverse/run_pipeline.py:167-173 @ SciAgentArena@ce27b8c`

<a id="g21-f078"></a>
### chat_with_tools inner retry loop has no counter

`agentdir/ToolUniverse/_agent_core.py:265-282` @ ce27b8c

`chat_with_tools` inner retry loop has no counter. A provider that repeatedly returns tool-related 400s after tools are stripped would loop indefinitely; the `max_rounds` outer guard does not apply to the inner retry. 
`agentdir/ToolUniverse/_agent_core.py:265-282 @ SciAgentArena@ce27b8c`

<a id="g21-f079"></a>
### Tool execution failures are swallowed as error observations with no retry, no alternative, and no loop exit on repeat…

`agentdir/ToolUniverse/_agent_core.py:288-344` @ ce27b8c

Tool execution failures are swallowed as error observations with no retry, no alternative, and no loop exit on repeated failures. An agent that keeps calling a broken tool can exhaust all `max_rounds` producing only error observations. 
`agentdir/ToolUniverse/_agent_core.py:288-344 @ SciAgentArena@ce27b8c`

<a id="g21-f080"></a>
### Tool observation truncation is a dumb character cut at 12 000 chars

`agentdir/ToolUniverse/_agent_core.py:200-206` @ ce27b8c

For structured JSON tool results, this can cut mid-key, producing unparseable JSON in the message history. 
`agentdir/ToolUniverse/_agent_core.py:200-206 @ SciAgentArena@ce27b8c`

<a id="g21-f081"></a>
### In-process queue loses all pending jobs on server restart

`front_web/src/lib/judge-service.js:88-89` @ ce27b8c

`this.jobs` (Map) and `this.queue` (array) are both in memory; completed results survive on disk, but queued and running jobs are silently dropped. 
`front_web/src/lib/judge-service.js:88-89 @ SciAgentArena@ce27b8c`

<a id="g21-f082"></a>
### Four benchmark families (ehr, cross-domain, drug-discovery, statistical-genetics) have UI starter code and dataset co…

`front_web/judge.config.json:147-282` @ ce27b8c

Four benchmark families (`ehr`, `cross-domain`, `drug-discovery`, `statistical-genetics`) have UI starter code and dataset config but no evaluator code. Submitting to these benchmarks falls through the dispatch switch with no `payload` assigned, crashing `evaluate_submission`. 
`front_web/judge.config.json:147-282 @ SciAgentArena@ce27b8c`

<a id="g21-f083"></a>
### EHR and cross-domain tasks are one-line specs with no scorer code or task JSON

`evaluations/ehr/target_sl.md:1` @ ce27b8c

Neither domain can be run via `evaluate.py run`; the eQTL evaluator is a standalone script not wired into the runner framework. 
`evaluations/ehr/target_sl.md:1 @ SciAgentArena@ce27b8c`; `evaluations/cross_domain/target_sl.md:1 @ SciAgentArena@ce27b8c`

<a id="g21-f084"></a>
### Syntax error in evaluate_submission: metadata.get('benchmark', 'single-cell','perturbation-prediction') passes three …

`front_web/templates/pipeline_evaluator.py:827` @ ce27b8c

Syntax error in `evaluate_submission`: `metadata.get('benchmark', 'single-cell','perturbation-prediction')` passes three arguments to `dict.get()`. Raises `TypeError` at runtime for any job where `benchmark` is absent from metadata. 
`front_web/templates/pipeline_evaluator.py:827 @ SciAgentArena@ce27b8c`

<a id="g21-f085"></a>
### Multipart parser latent bug: file (undefined) is returned instead of files in the early-return branch

`front_web/src/server.js:62` @ ce27b8c

Multipart parser latent bug: `file` (undefined) is returned instead of `files` in the early-return branch. Would cause a `ReferenceError` if a multipart body has no boundary match. 
`front_web/src/server.js:62 @ SciAgentArena@ce27b8c`

<a id="g21-f086"></a>
### conclusion_status enum (9 values, 7 inconclusive_* subtypes) is defined in the answer pool but not currently scored

`evaluations/dd/scorers/data/answer_pool.json:87-106` @ ce27b8c

`conclusion_status` enum (9 values, 7 `inconclusive_*` subtypes) is defined in the answer pool but not currently scored. An agent may output arbitrary `conclusion_status` values without penalty, making the field vestigial burden on agents without eval benefit. 
`evaluations/dd/scorers/data/answer_pool.json:87-106 @ SciAgentArena@ce27b8c`

<a id="g21-f087"></a>
### Spatial task 11 (neighborhood enrichment) re-computes the reference on every evaluation call

`front_web/templates/pipeline_evaluator.py:503-510` @ ce27b8c

`sq.gr.nhood_enrichment(n_perms=1000)` is a stochastic permutation test run inside the judge per submission. Non-deterministic and expensive; the reference should be precomputed at dataset prep time. 
`front_web/templates/pipeline_evaluator.py:503-510 @ SciAgentArena@ce27b8c`

<a id="g21-f088"></a>
### trajectoryPath for the hsc-trajectory dataset points to the same file as datasetPath

`front_web/judge.config.json:320-330` @ ce27b8c

`trajectoryPath` for the `hsc-trajectory` dataset points to the same file as `datasetPath`. `evaluate_trajectory` will align the submission against the unprocessed input, not the intended gold standard. 
`front_web/judge.config.json:320-330 @ SciAgentArena@ce27b8c`

<a id="g21-f089"></a>
### README dataset config references absolute Windows developer paths

`front_web/README.md:83-90` @ ce27b8c

The repo is not portable without editing `judge.config.json`. 
`front_web/README.md:83-90 @ SciAgentArena@ce27b8c`

