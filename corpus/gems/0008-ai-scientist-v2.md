# AI-Scientist-v2

| | |
|---|---|
| Source | https://github.com/SakanaAI/AI-Scientist-v2 |
| Repo | https://github.com/SakanaAI/AI-Scientist-v2 @ `96bd51617cfdbb494a9fc283af00fe090edfae48` |
| Kind | - |
| Topics | - |
| License | none (forbidden) |
| Verdict | promote |
| Findings | 86 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/8 |

## Implementation decisions

<a id="g8-f001"></a>
### Two-level stage loop with hard-wired goals

`ai_scientist/treesearch/agent_manager.py:L143-L167` @ 96bd516

**Two-level stage loop with hard-wired goals.** `ai_scientist/treesearch/agent_manager.py:L143-L167` — Four named main stages (`initial_implementation -> baseline_tuning -> creative_research -> ablation_studies`) with pre-written goal strings injected into the LLM context; outer loop drives stage transitions, inner loop drives sub-stage goals. Stage-1 failure is treated as fatal (`self.current_stage = None`, `L419-L429`) rather than advancing a broken baseline. Stage-3 uses execution time as a proxy for experiment scale: if the best node runs in less than half the timeout budget, it injects a feedback string pushing the agent to scale up (`L512-L530`).

<a id="g8-f002"></a>
### Per-stage iteration budgets + single wall-clock hard kill

`bfts_config.yaml:L39-L44` @ 96bd516

**Per-stage iteration budgets + single wall-clock hard kill.** `bfts_config.yaml:L39-L44` — `stage1_max_iters: 20 / 12 / 12 / 18` override a global `steps: 5`. `bfts_config.yaml:L18-L20` — A separate `exec.timeout: 3600` provides a physical governor independent of the logical iteration count; two independent resource ceilings.

<a id="g8-f003"></a>
### o1/o3 model constraints handled silently at call sites (three independent implementations, all consistent)

`ai_scientist/treesearch/backend/__init__.py:L51-L65` @ 96bd516

**o1/o3 model constraints handled silently at call sites (three independent implementations, all consistent).** `ai_scientist/treesearch/backend/__init__.py:L51-L65` — o1 merges system+user into a single user message, forces `reasoning_effort="high"`, caps at `max_completion_tokens=100000`, strips `temperature`. `ai_scientist/llm.py:L242-L252` — same swap with `temperature=1`. `ai_scientist/vlm.py:L80-L90` — same pattern with no `max_tokens`. Callers are fully shielded from API constraints.

<a id="g8-f004"></a>
### Dual-LLM split: generation vs. evaluation at different temperatures

`bfts_config.yaml:L55-L71` @ 96bd516

**Dual-LLM split: generation vs. evaluation at different temperatures.** `bfts_config.yaml:L55-L71` — Coding model (`claude-3-5-sonnet`, `temp: 1.0`, `max_tokens: 12000`) vs. feedback model (`gpt-4o`, `temp: 0.5`, `max_tokens: 8192`). Separates creative generation from judgment in one config.

<a id="g8-f005"></a>
### Pickle checkpoint after every main-stage completion

`ai_scientist/treesearch/agent_manager.py:L249-L272` @ 96bd516

**Pickle checkpoint after every main-stage completion.** `ai_scientist/treesearch/agent_manager.py:L249-L272` — Saved to `logs/<run_name>/stage_<name>/checkpoint.pkl`; resumability is first-class. Best node deep-copied with `parent`/`children` reset (`L544-L549`) before forwarding to the next stage, preventing cross-stage tree contamination.

<a id="g8-f006"></a>
### Anthropic backend silently swaps system<->user when only a system message is provided

`ai_scientist/treesearch/backend/backend_anthropic.py:L39-L41` @ 96bd516

**Anthropic backend silently swaps system<->user when only a system message is provided.** `ai_scientist/treesearch/backend/backend_anthropic.py:L39-L41` — Satisfies Anthropic's requirement for at least one user message without requiring callers to know.

<a id="g8-f007"></a>
### Circular-reference serialization handled in two places with the same technique

`ai_scientist/treesearch/utils/serialize.py:L14-L29` @ 96bd516

**Circular-reference serialization handled in two places with the same technique.** `ai_scientist/treesearch/utils/serialize.py:L14-L29` — Before JSON serialization, deep-copies the journal, nulls `parent`/`children`, stores topology in a flat `node2parent` dict. `ai_scientist/treesearch/journal.py:L128-L143` — `__deepcopy__` manually skips `parent` and `children` while retaining a shallow parent pointer.

<a id="g8-f008"></a>
### GPU count queried via nvidia-smi subprocess, not import torch

`ai_scientist/treesearch/parallel_agent.py:L1120-L1139` @ 96bd516

**GPU count queried via `nvidia-smi` subprocess, not `import torch`.** `ai_scientist/treesearch/parallel_agent.py:L1120-L1139` — Prevents CUDA context initialization in the main process before `ProcessPoolExecutor` forks. Worker GPU assignment via `os.environ["CUDA_VISIBLE_DEVICES"]` inside the worker process (`L1443-L1448`).

<a id="g8-f009"></a>
### Data copied (not symlinked) to workspace by default

`bfts_config.yaml:L12-L13` @ 96bd516

**Data copied (not symlinked) to workspace by default.** `bfts_config.yaml:L12-L13` — Explicit sandboxing choice to prevent agent from mutating source data; `copy_data: True` with a comment explaining the rationale. (Contrast: `ai_scientist/treesearch/utils/__init__.py:L9-L37` uses symlinks by default — callers opt into copies via config.)

<a id="g8-f010"></a>
### Backoff covers both providers in a single decorator

`ai_scientist/llm.py:L77-L85` @ 96bd516

**Backoff covers both providers in a single decorator.** `ai_scientist/llm.py:L77-L85` — `@backoff.on_exception(backoff.expo, (openai.RateLimitError, openai.APITimeoutError, openai.InternalServerError, anthropic.RateLimitError, ...))` at the outer call layer; no per-provider retry logic in callers. Separately, `ai_scientist/tools/semantic_scholar.py:L52-L56` applies `@backoff.on_exception` with a human-readable `on_backoff` callback at the tool level.

<a id="g8-f011"></a>
### Three-tier PDF extraction cascade

`ai_scientist/perform_llm_review.py:L257-L288` @ 96bd516

**Three-tier PDF extraction cascade.** `ai_scientist/perform_llm_review.py:L257-L288` — `pymupdf4llm` (best markdown) -> `pymupdf` -> `pypdf`, each with a minimum-size guard; most capable extractor tried first.

<a id="g8-f012"></a>
### Citation deduplication is title-based, not key-based

`ai_scientist/perform_writeup.py:L571-L577` @ 96bd516

**Citation deduplication is title-based, not key-based.** `ai_scientist/perform_writeup.py:L571-L577` — Case-insensitive substring match in BibTeX avoids re-adding the same paper under different cite keys.

<a id="g8-f013"></a>
### Cached token pricing is billed separately

`ai_scientist/utils/token_tracker.py:L117-L122` @ 96bd516

**Cached token pricing is billed separately.** `ai_scientist/utils/token_tracker.py:L117-L122` — `prompt_cost = (tokens["prompt"] - tokens["cached"]) * prices["prompt"]` then `cached_cost = tokens["cached"] * prices["cached"]`, matching actual billing rather than naive full-prompt rate.

<a id="g8-f014"></a>
### stage_name property infers node phase from parent chain, not a stored field

`ai_scientist/treesearch/journal.py:L158-L168` @ 96bd516

**`stage_name` property infers node phase from parent chain, not a stored field.** `ai_scientist/treesearch/journal.py:L158-L168` — `parent is None` -> draft; `parent.is_buggy` -> debug; else -> improve. State machine transitions encoded in graph topology.

<a id="g8-f015"></a>
### Package list shuffled before prompt injection

`ai_scientist/treesearch/parallel_agent.py:L288-L290` @ 96bd516

**Package list shuffled before prompt injection.** `ai_scientist/treesearch/parallel_agent.py:L288-L290` — `random.shuffle(pkgs)` before assembling the dependency string reduces position bias in model responses.

<a id="g8-f016"></a>
### MinimalAgent strips full agent to fork-safe state

`ai_scientist/treesearch/parallel_agent.py:L254-L272` @ 96bd516

**`MinimalAgent` strips full agent to fork-safe state.** `ai_scientist/treesearch/parallel_agent.py:L254-L272` — Only serializable fields cross the fork boundary; `_process_node_wrapper` is `@staticmethod` and fully reconstructs `MinimalAgent + Interpreter` inside the worker (`L1409-L1457`), so nothing is referenced across the fork.

<a id="g8-f017"></a>
### Two-pass metric extraction

`ai_scientist/treesearch/parallel_agent.py:L1554-L1646` @ 96bd516

**Two-pass metric extraction.** `ai_scientist/treesearch/parallel_agent.py:L1554-L1646` — First generates + executes code that prints metrics as text, then runs a second structured LLM call to parse that printed output into a typed schema; decouples "know what to measure" from "structured output."

<a id="g8-f018"></a>
### WorstMetricValue sentinel subclass

`ai_scientist/treesearch/utils/metric.py:L327-L340` @ 96bd516

**`WorstMetricValue` sentinel subclass.** `ai_scientist/treesearch/utils/metric.py:L327-L340` — Pins `value=None`, inherits `__gt__` so it always compares worse; lets callers avoid `None`-checks for buggy-run placeholders. `@total_ordering` + single `__gt__` derives all comparators (`L10-L11`); optimization direction is self-describing inside the value (`_should_maximize()`, `L191-L204`).

<a id="g8-f019"></a>
### log_summarization processes all four stages in parallel with ThreadPoolExecutor

`ai_scientist/treesearch/log_summarization.py:L299-L351` @ 96bd516

**`log_summarization` processes all four stages in parallel with `ThreadPoolExecutor`.** `ai_scientist/treesearch/log_summarization.py:L299-L351` — Stage-indexed dispatch: `idx in [1,2]` -> multi-seed extraction, `idx==3` -> ablations, `idx==0` -> LLM summarization.

<a id="g8-f020"></a>
### torch.compile silently falls back to eager

`ai_scientist/ideas/i_cant_believe_its_not_better.py:L195-L200` @ 96bd516

**`torch.compile` silently falls back to eager.** `ai_scientist/ideas/i_cant_believe_its_not_better.py:L195-L200` — Wrapped in `try/except` so GPU compilation errors never crash training.

<a id="g8-f021"></a>
### PDF page-limit check uses cleaned text line count

`ai_scientist/perform_icbinb_writeup.py:L238-L296` @ 96bd516

**PDF page-limit check uses cleaned text line count.** `ai_scientist/perform_icbinb_writeup.py:L238-L296` — Strips page numbers and "Under review" headers before counting; resilient to PDF layout variations.

## Skills, prompts, tools

<a id="g8-f022"></a>
### FunctionSpec validates JSON schema at construction

`ai_scientist/treesearch/backend/utils.py:L105-L130` @ 96bd516

**`FunctionSpec` validates JSON schema at construction.** `ai_scientist/treesearch/backend/utils.py:L105-L130` — `jsonschema.Draft7Validator.check_schema(self.json_schema)` in `__post_init__`; prevents malformed tool specs from reaching the API. Provides `.as_openai_tool_dict` and `.openai_tool_choice_dict` as ready-made payloads. Separate `stage_config_spec`, `stage_progress_eval_spec`, `stage_completion_eval_spec` in `ai_scientist/treesearch/agent_manager.py:L21-L100` use this pattern to decompose evaluation into narrow, independently-parseable schemas.

<a id="g8-f023"></a>
### compile_prompt_to_md is the single prompt-serialization surface

`ai_scientist/treesearch/backend/utils.py:L44-L102` @ 96bd516

**`compile_prompt_to_md` is the single prompt-serialization surface.** `ai_scientist/treesearch/backend/utils.py:L44-L102` — Dicts become recursive `#`-headed markdown sections, lists become bullets, multi-modal messages pass through unchanged. Every LLM call goes through this one conversion point.

<a id="g8-f024"></a>
### metric_parse_spec uses "strict": True and forbids vague dataset names by description

`ai_scientist/treesearch/parallel_agent.py:L135-L202` @ 96bd516

**`metric_parse_spec` uses `"strict": True` and forbids vague dataset names by description.** `ai_scientist/treesearch/parallel_agent.py:L135-L202` — Explicit prohibition in the field description: "Avoid vague terms like 'train,' 'val,' or 'test.' Instead, use precise labels…" Enforces `dataset_name`/`final_value`/`best_value` per entry.

<a id="g8-f025"></a>
### review_func_spec forces binary is_bug signal; vlm_feedback_spec adds valid_plots_received guard

`ai_scientist/treesearch/parallel_agent.py:L81-L101` @ 96bd516

**`review_func_spec` forces binary `is_bug` signal; `vlm_feedback_spec` adds `valid_plots_received` guard.** `ai_scientist/treesearch/parallel_agent.py:L81-L101`, `L103-L133` — Clean structured gates before acting on execution output or plot analysis.

<a id="g8-f026"></a>
### Sub-stage completion prompt fuses VLM plot analysis with textual goal criteria

`ai_scientist/treesearch/agent_manager.py:L352-L395` @ 96bd516

**Sub-stage completion prompt fuses VLM plot analysis with textual goal criteria.** `ai_scientist/treesearch/agent_manager.py:L352-L395` — `"1. Figure Analysis: {vlm_feedback}\n\nRequirements: {current_substage.goals}"` — visual signal combined with textual criteria in one evaluator call.

<a id="g8-f027"></a>
### _generate_substage_goal builds machine-serialized observation context

`ai_scientist/treesearch/agent_manager.py:L567-L591` @ 96bd516

**`_generate_substage_goal` builds machine-serialized observation context.** `ai_scientist/treesearch/agent_manager.py:L567-L591` — Feeds `total_nodes`, `good_nodes`, `best_metric`, `convergence_status`, `recent_changes` as JSON before asking for actionable sub-stage goals; structured observation rather than free prose.

<a id="g8-f028"></a>
### idea_to_markdown serializer

`ai_scientist/treesearch/bfts_utils.py:L7-L42` @ 96bd516

**`idea_to_markdown` serializer.** `ai_scientist/treesearch/bfts_utils.py:L7-L42` — Dict keys -> `##` headers, lists -> bullets, nested dicts -> `###` subsections, optional code file appended as fenced Python block under `## Code To Potentially Use`.

<a id="g8-f029"></a>
### preview_json uses genson.SchemaBuilder to infer JSON schema rather than dumping raw data

`ai_scientist/treesearch/utils/data_preview.py:L111-L118` @ 96bd516

**`preview_json` uses `genson.SchemaBuilder` to infer JSON schema rather than dumping raw data.** `ai_scientist/treesearch/utils/data_preview.py:L111-L118` — Gives the LLM a compact structural description. Two-pass preview generation (`L148-L151`): if output exceeds 6 000 characters, self-recurse with `simple=True`.

<a id="g8-f030"></a>
### plan_and_code_query retries up to 3× with explicit parse feedback injected

`ai_scientist/treesearch/parallel_agent.py:L658-L681` @ 96bd516

**`plan_and_code_query` retries up to 3× with explicit parse feedback injected.** `ai_scientist/treesearch/parallel_agent.py:L658-L681` — `prompt["Parsing Feedback"] = "The code extraction failed. Make sure to use the format \`\`\`python ... \`\`\` for the code blocks."` on each failure round.

<a id="g8-f031"></a>
### VLM images sent as inline base64 data URIs with explicit anti-positional instruction

`ai_scientist/treesearch/parallel_agent.py:L982-L1005` @ 96bd516

**VLM images sent as inline base64 data URIs with explicit anti-positional instruction.** `ai_scientist/treesearch/parallel_agent.py:L982-L1005` — User message built as `[{type: text}, {type: image_url, ...}]` list; model explicitly told not to reference "first/second plot."

<a id="g8-f032"></a>
### Implementation checklist injected into every code-gen prompt

`ai_scientist/treesearch/parallel_agent.py:L298-L394` @ 96bd516

**Implementation checklist injected into every code-gen prompt.** `ai_scientist/treesearch/parallel_agent.py:L298-L394` — `_prompt_impl_guideline` covers GPU device boilerplate, `experiment_data.npy` save convention, evaluation metric tracking, explicit ban on `if __name__ == "__main__"`.

<a id="g8-f033"></a>
### _determine_datasets_successfully_tested uses keyword-prefix parsing with 5-retry loop

`ai_scientist/treesearch/parallel_agent.py:L835-L892` @ 96bd516

**`_determine_datasets_successfully_tested` uses keyword-prefix parsing with 5-retry loop.** `ai_scientist/treesearch/parallel_agent.py:L835-L892` — `REASONING:` + `SUCCESSFULLY_TESTED_DATASETS:` prefix protocol extracts dataset lists from VLM narrative without requiring JSON.

<a id="g8-f034"></a>
### Reflection prompt with early-exit signal (two implementations)

`ai_scientist/perform_llm_review.py:L236-L254` @ 96bd516

**Reflection prompt with early-exit signal (two implementations).** `ai_scientist/perform_llm_review.py:L236-L254` and `ai_scientist/perform_plotting.py:L204-L217` — Both inject an explicit "I am done" / live figure count signal to give the model a graceful termination path; `break` on detection prevents no-op refinement rounds.

<a id="g8-f035"></a>
### Dual-bias system prompts for review ensemble

`ai_scientist/perform_llm_review.py:L13-L24` @ 96bd516

**Dual-bias system prompts for review ensemble.** `ai_scientist/perform_llm_review.py:L13-L24` — `reviewer_system_prompt_neg` (reject when unsure) + `reviewer_system_prompt_pos` (accept when unsure); used together to bracket uncertainty in the ensemble.

<a id="g8-f036"></a>
### NeurIPS review rubric embedded verbatim as bounded action space

`ai_scientist/perform_llm_review.py:L64-L122` @ 96bd516

**NeurIPS review rubric embedded verbatim as bounded action space.** `ai_scientist/perform_llm_review.py:L64-L122` — Full scale anchors, decision labels, ethical guidelines; no free-form decision labels possible.

<a id="g8-f037"></a>
### Citation loop separated into two turns: intent then retrieval

`ai_scientist/perform_writeup.py:L176-L212` @ 96bd516

**Citation loop separated into two turns: intent then retrieval.** `ai_scientist/perform_writeup.py:L176-L212` — Turn 1 identifies missing citation + emits search query as JSON; turn 2 receives retrieved papers and selects indices; external API call lives cleanly in between.

<a id="g8-f038"></a>
### writeup_prompt injects aggregator Python script + VLM figure descriptions

`ai_scientist/perform_writeup.py:L410-L452` @ 96bd516

**`writeup_prompt` injects aggregator Python script + VLM figure descriptions.** `ai_scientist/perform_writeup.py:L410-L452` — LLM knows legend names/groupings before deciding on subfigure layouts; both code-level and visual grounding provided.

<a id="g8-f039"></a>
### ACTION: / ARGUMENTS: two-field format for ideation

`ai_scientist/perform_ideation_temp_free.py:L61-L96` @ 96bd516

**`ACTION: / ARGUMENTS:` two-field format for ideation.** `ai_scientist/perform_ideation_temp_free.py:L61-L96` — System prompt defines a small parseable action space (two named tools); at least one literature search must precede `FinalizeIdea`.

<a id="g8-f040"></a>
### Log summarizer opens with two hard prohibitions before task description

`ai_scientist/treesearch/log_summarization.py:L13-L21` @ 96bd516

**Log summarizer opens with two hard prohibitions before task description.** `ai_scientist/treesearch/log_summarization.py:L13-L21` — "Do NOT hallucinate" and "Do NOT introduce errors when repeating information." placed first.

<a id="g8-f041"></a>
### Anti-compression instruction in stage aggregate prompt

`ai_scientist/treesearch/log_summarization.py:L66-L106` @ 96bd516

**Anti-compression instruction in stage aggregate prompt.** `ai_scientist/treesearch/log_summarization.py:L66-L106` — "By default, you can keep most of it and append new text" — guards against LLM over-summarization of prior stages.

<a id="g8-f042"></a>
### Few-shot review set balanced across Accept/Reject with typed schema

`ai_scientist/fewshot_examples/attention.json:L1` @ 96bd516

**Few-shot review set balanced across Accept/Reject with typed schema.** `ai_scientist/fewshot_examples/attention.json:L1`, `ai_scientist/fewshot_examples/2_carpe_diem.json:L1` — 14 scored dimensions including booleans (`Ethical Concerns: false`) and free-text fields; `Overall: 4 / Soundness: 2` Reject example prevents over-acceptance calibration. Note: review is stored as a JSON-encoded string inside the outer JSON — consumers must double-parse.

<a id="g8-f043"></a>
### Idea template includes named metrics per sub-study

`ai_scientist/ideas/i_cant_believe_its_not_betterrealworld.json:L1-L16` @ 96bd516

**Idea template includes named metrics per sub-study.** `ai_scientist/ideas/i_cant_believe_its_not_betterrealworld.json:L1-L16` — `Experiments` field uses numbered, bold-headlined sub-studies each including a named metric; machine-parseable for downstream experiment scaffolding.

## Patterns worth porting

<a id="g8-f044"></a>
### _parse_keyword_prefix_response reusable keyword-prefix parser

`ai_scientist/treesearch/parallel_agent.py:L41-L78` @ 96bd516

**`_parse_keyword_prefix_response` reusable keyword-prefix parser.** `ai_scientist/treesearch/parallel_agent.py:L41-L78` — Handles multi-line continuation, returns `(None, None)` on failure (never raises), logs raw response at DEBUG. Used in dataset-success extraction, ablation/hyperparam generation, and node selection. After retry exhaustion, callers return a hardcoded sensible default (`"increase learning rate"`, `L1853-L1858`) — the pipeline never deadlocks on a parse failure.

<a id="g8-f045"></a>
### Pre-flight _safe_pickle_test before ProcessPoolExecutor submission

`ai_scientist/treesearch/parallel_agent.py:L31-L38` @ 96bd516

**Pre-flight `_safe_pickle_test` before `ProcessPoolExecutor` submission.** `ai_scientist/treesearch/parallel_agent.py:L31-L38` + `L2063-L2065` — Catches serialization failures early with a named diagnostic rather than a cryptic worker crash.

<a id="g8-f046"></a>
### Three-queue subprocess sandbox

`ai_scientist/treesearch/interpreter.py:L163-L174` @ 96bd516

**Three-queue subprocess sandbox.** `ai_scientist/treesearch/interpreter.py:L163-L174` — `code_inq` (send code), `result_outq` (stdout/stderr), `event_outq` (lifecycle events). Split allows interleaved output streaming and state signaling without mixing concerns. Two-stage timeout (`L257-L293`): SIGINT at `timeout` seconds, then SIGKILL at `timeout + 60`; graceful-then-forced termination avoids orphaned GPU processes. `KeyboardInterrupt` relabeled as `TimeoutError` in the event queue (`L153-L154`).

<a id="g8-f047"></a>
### add_interaction records full (system_message, prompt, response, timestamp) tuple alongside token counts

`ai_scientist/utils/token_tracker.py:L75-L91` @ 96bd516

**`add_interaction` records full (system_message, prompt, response, timestamp) tuple alongside token counts.** `ai_scientist/utils/token_tracker.py:L75-L91` — Enables post-hoc cost attribution *and* replay/audit of every LLM call from one object. `@track_token_usage` auto-detects sync vs. async (`L184-L222`).

<a id="g8-f048"></a>
### _select_parallel_nodes switches dispatch strategy by stage name prefix

`ai_scientist/treesearch/parallel_agent.py:L1931-L2051` @ 96bd516

**`_select_parallel_nodes` switches dispatch strategy by stage name prefix.** `ai_scientist/treesearch/parallel_agent.py:L1931-L2051` — `"2_"` -> one policy, `"4_"` -> another, else default; `processed_trees` set ensures parallel workers target different search trees. Clean extension point without subclassing. Tree-diversity tracking falls back to next-best node when best tree is already dispatched.

<a id="g8-f049"></a>
### Ensemble + meta-review: math aggregation then LLM synthesis

`ai_scientist/perform_llm_review.py:L150-L188` @ 96bd516

**Ensemble + meta-review: math aggregation then LLM synthesis.** `ai_scientist/perform_llm_review.py:L150-L188` — Run N reviewers in parallel (`get_batch_responses_from_llm`), average numeric scores within valid ranges, pass all JSON reviews to a meta-reviewer for prose synthesis. Score aggregation is math; prose aggregation is LLM.

<a id="g8-f050"></a>
### Two-stage code extraction with validate-then-format ordering

`ai_scientist/treesearch/utils/response.py:L55-L76` @ 96bd516

**Two-stage code extraction with validate-then-format ordering.** `ai_scientist/treesearch/utils/response.py:L55-L76` — Fenced blocks -> full-text fallback, syntax validation before Black formatting (`L86-L90`); prevents Black from mangling unparseable fragments.

<a id="g8-f051"></a>
### Filesystem-as-state for stage completion detection

`ai_scientist/treesearch/utils/tree_export.py:L43-L73` @ 96bd516

**Filesystem-as-state for stage completion detection.** `ai_scientist/treesearch/utils/tree_export.py:L43-L73` — Completion detected by checking for artifact files (`tree_data.json`, `journal.json`) rather than a separate state file; resilient to mid-run crashes.

<a id="g8-f052"></a>
### save_run as a complete atomic checkpoint routine

`ai_scientist/treesearch/utils/config.py:L219-L259` @ 96bd516

**`save_run` as a complete atomic checkpoint routine.** `ai_scientist/treesearch/utils/config.py:L219-L259` — Journal JSON, config YAML, HTML tree visualization, and best solution `.py` (named with node ID) all written under a `stage_name` subdirectory in one call.

<a id="g8-f053"></a>
### Recursive retry with decrement

`ai_scientist/treesearch/log_summarization.py:L198-L229` @ 96bd516

**Recursive retry with decrement.** `ai_scientist/treesearch/log_summarization.py:L198-L229` — `update_summary(..., max_retry=5)` calls itself with `max_retry-1` on any exception; clean recursive retry without explicit loop state.

<a id="g8-f054"></a>
### filter_experiment_summaries trims node data to only keys needed per pipeline step

`ai_scientist/perform_icbinb_writeup.py:L691-L742` @ 96bd516

**`filter_experiment_summaries` trims node data to only keys needed per pipeline step.** `ai_scientist/perform_icbinb_writeup.py:L691-L742` — Whitelists specific keys per step (`citation_gathering`, `writeup`, `plot_aggregation`); prevents context bloat when passing summaries to LLMs.

<a id="g8-f055"></a>
### extract_figure_screenshots extracts figure + caption + cross-refs in one pass

`ai_scientist/perform_vlm_review.py:L154-L308` @ 96bd516

**`extract_figure_screenshots` extracts figure + caption + cross-refs in one pass.** `ai_scientist/perform_vlm_review.py:L154-L308` — Uses pymupdf block geometry (horizontal overlap ratio + vertical gap as heuristics); produces a self-contained `{img_name, caption, images, main_text_figrefs}` tuple per figure for downstream VLM review.

<a id="g8-f056"></a>
### Two-pass writeup reflection loop with separated concerns

`ai_scientist/perform_icbinb_writeup.py:L1051-L1083` @ 96bd516

**Two-pass writeup reflection loop with separated concerns.** `ai_scientist/perform_icbinb_writeup.py:L1051-L1083`, `L1126-L1146` — Pass 1 fixes LaTeX errors, writing quality, VLM caption mismatches; pass 2 (with fresh `msg_history[-1:]`) handles figure placement and page budget exclusively.

<a id="g8-f057"></a>
### Regex-based stage name parser

`ai_scientist/treesearch/agent_manager.py:L927-L941` @ 96bd516

**Regex-based stage name parser.** `ai_scientist/treesearch/agent_manager.py:L927-L941` — `parse_stage_names` extracts `(main_stage_int, main_stage_str, substage_int, substage_str)` from strings like `"3_creative_research_2_novel_approach"`; structured metadata encoded in the name enables cheap routing without a registry.

<a id="g8-f058"></a>
### Per-node artifact directory with deterministic path

`ai_scientist/treesearch/parallel_agent.py:L1719-L1760` @ 96bd516

**Per-node artifact directory with deterministic path.** `ai_scientist/treesearch/parallel_agent.py:L1719-L1760` — `logs/<run>/experiment_results/experiment_<id>_proc_<pid>/`; enables per-node post-hoc inspection without conflicts between parallel workers.

<a id="g8-f059"></a>
### Zip-within-zip flattening + zip extraction path collision handling

`ai_scientist/treesearch/utils/__init__.py:L79-L93` @ 96bd516

**Zip-within-zip flattening + zip extraction path collision handling.** `ai_scientist/treesearch/utils/__init__.py:L79-L93` — If extracted zip contains exactly one child with same name as zip, child is hoisted; handles common `foo.zip -> foo/foo/` -> `foo/` pattern.

<a id="g8-f060"></a>
### ollama/ prefix transparently routes to localhost:11434

`ai_scientist/treesearch/backend/backend_openai.py:L21-L27` @ 96bd516

**`ollama/` prefix transparently routes to `localhost:11434`.** `ai_scientist/treesearch/backend/backend_openai.py:L21-L27` — Callers need no configuration change to use local models.

<a id="g8-f061"></a>
### Lazy stage data loading in the visualizer

`ai_scientist/treesearch/utils/viz_templates/template.js:L393-L461` @ 96bd516

**Lazy stage data loading in the visualizer.** `ai_scientist/treesearch/utils/viz_templates/template.js:L393-L461` — Data loaded via `fetch()` per `completed_stages` list; never requests data for incomplete stages, avoiding 404 noise in interactive exploration.

<a id="g8-f062"></a>
### Random seed injection as a pure code-level concern

`ai_scientist/treesearch/parallel_agent.py:L1285-L1288` @ 96bd516

**Random seed injection as a pure code-level concern.** `ai_scientist/treesearch/parallel_agent.py:L1285-L1288` — Prepends seed-setting code to the code string; independent of the experiment framework.

<a id="g8-f063"></a>
### Deserialization calls __post_init__ after restoring parent links

`ai_scientist/treesearch/utils/serialize.py:L42-L52` @ 96bd516

**Deserialization calls `__post_init__` after restoring parent links.** `ai_scientist/treesearch/utils/serialize.py:L42-L52` — Ensures derived state (child-set membership) is rebuilt without manual reconstruction code.

<a id="g8-f064"></a>
### Model-routing by string prefix

`ai_scientist/treesearch/backend/__init__.py:L14` @ 96bd516

**Model-routing by string prefix.** `ai_scientist/treesearch/backend/__init__.py:L14`, `L69` — `"claude-" in model` selects Anthropic vs. OpenAI backend; adding a provider requires only one new `if` branch.

## Open threads / weak spots

<a id="g8-f065"></a>
### func_spec raises NotImplementedError for Anthropic

`ai_scientist/treesearch/backend/backend_anthropic.py:L33-L35` @ 96bd516

**`func_spec` raises `NotImplementedError` for Anthropic.** `ai_scientist/treesearch/backend/backend_anthropic.py:L33-L35` — Any structured-output call (review, VLM feedback, metric parsing) will crash at runtime if Anthropic is selected as the feedback model; the backend silently works for plain completions but fails hard for tool-calls.

<a id="g8-f066"></a>
### _aggregate_seed_eval_results hardcodes seed_nodes[0..2] direct index access

`ai_scientist/treesearch/parallel_agent.py:L2315-L2324` @ 96bd516

**`_aggregate_seed_eval_results` hardcodes `seed_nodes[0..2]` direct index access.** `ai_scientist/treesearch/parallel_agent.py:L2315-L2324` — Raises `IndexError` if `num_seeds != 3`; `bfts_config.yaml:L48-L49` documents the `num_seeds: 3` constraint but the code enforces nothing.

<a id="g8-f067"></a>
### NameError in _create_stage_analysis_prompt

`ai_scientist/treesearch/agent_manager.py:L881-L889` @ 96bd516

**NameError in `_create_stage_analysis_prompt`.** `ai_scientist/treesearch/agent_manager.py:L881-L889` — `stage_number` is used but never defined in that method scope; raises `NameError` at runtime whenever `previous_results` is populated.

<a id="g8-f068"></a>
### Infinite spin in _select_parallel_nodes

`ai_scientist/treesearch/parallel_agent.py:L1947-L2051` @ 96bd516

**Infinite spin in `_select_parallel_nodes`.** `ai_scientist/treesearch/parallel_agent.py:L1947-L2051` — `while len(nodes_to_process) < self.num_workers` has no iteration cap; if `draft_nodes` is full, `good_nodes` is empty, and all trees are buggy, the loop appends `None` indefinitely.

<a id="g8-f069"></a>
### Stage-1 regression guard uses identity comparison

`ai_scientist/treesearch/agent_manager.py:L444-L452` @ 96bd516

**Stage-1 regression guard uses identity comparison.** `ai_scientist/treesearch/agent_manager.py:L444-L452` — `best_node == journal.nodes[0]` is a Python identity check; fragile if the node is re-created or deserialized between calls, producing a false "improvement found" signal.

<a id="g8-f070"></a>
### GPU acquired and released with mismatched IDs

`ai_scientist/treesearch/parallel_agent.py:L2088-L2091` @ 96bd516

**GPU acquired and released with mismatched IDs.** `ai_scientist/treesearch/parallel_agent.py:L2088-L2091`, `L2183-L2184` — `process_id = f"worker_{len(futures)}"` at acquire vs. `f"worker_{i}"` at release; correct only because `len(futures) == i` at submit time — breaks silently if the submit loop is refactored.

<a id="g8-f071"></a>
### Dead AblationConfig.attempts counter

`ai_scientist/treesearch/parallel_agent.py:L226-L234` @ 96bd516

**Dead `AblationConfig.attempts` counter.** `ai_scientist/treesearch/parallel_agent.py:L226-L234` — `AblationConfig` tracks `attempts/max_attempts = 3` but is never used by `_process_node_wrapper`; retry logic falls through to the general debug loop.

<a id="g8-f072"></a>
### extract_jsons cannot handle nested JSON objects

`ai_scientist/treesearch/utils/response.py:L22` @ 96bd516

**`extract_jsons` cannot handle nested JSON objects.** `ai_scientist/treesearch/utils/response.py:L22` — Explicitly documented limitation; callers using it for nested structured responses silently receive empty results.

<a id="g8-f073"></a>
### Orphan-process cleanup matches by keyword substring across all processes

`launch_scientist_bfts.py:L348-L358` @ 96bd516

**Orphan-process cleanup matches by keyword substring across all processes.** `launch_scientist_bfts.py:L348-L358` — Matches `"python"`, `"torch"`, `"mp"` in any running process command line; risks terminating unrelated user processes.

<a id="g8-f074"></a>
### find_pdf_path_for_review has no else branch for empty reflection_pdfs

`launch_scientist_bfts.py:L140-L164` @ 96bd516

**`find_pdf_path_for_review` has no `else` branch for empty `reflection_pdfs`.** `launch_scientist_bfts.py:L140-L164` — Calling it when only non-reflection PDFs exist produces `UnboundLocalError` on `pdf_path`.

<a id="g8-f075"></a>
### o1 system+user message merge mutates caller's dict in-place

`ai_scientist/treesearch/backend/__init__.py:L57-L59` @ 96bd516

**`o1` system+user message merge mutates caller's dict in-place.** `ai_scientist/treesearch/backend/__init__.py:L57-L59` — `system_message["Main Instructions"] |= user_message` before reassignment corrupts the caller's dict if reused across calls.

<a id="g8-f076"></a>
### goal: null / eval: null in default config with no validation guard

`bfts_config.yaml:L5-L6` @ 96bd516

**`goal: null` / `eval: null` in default config with no validation guard.** `bfts_config.yaml:L5-L6` — Silent misconfiguration risk; null-goal runs produce undefined evaluation criteria with no apparent runtime check.

<a id="g8-f077"></a>
### Debug print statements left in production paths

`ai_scientist/treesearch/utils/config.py:L121` @ 96bd516

**Debug `print` statements left in production paths.** `ai_scientist/treesearch/utils/config.py:L121` — `print("max_index: ", max_index)` not gated by logger level. `ai_scientist/treesearch/utils/tree_export.py:L79` — `print(f"[red]Edges: {edges}[/red]")` spams on every visualization generation.

Other takes: [gem #6](0006-biomni.md#g6-f098)

<a id="g8-f078"></a>
### logging.info("args: ", args) raises TypeError at runtime

`ai_scientist/utils/token_tracker.py:L153` @ 96bd516

**`logging.info("args: ", args)` raises `TypeError` at runtime.** `ai_scientist/utils/token_tracker.py:L153` — Second positional argument is interpreted as `%`-style format arg; will raise if `args` is not a valid format value.

<a id="g8-f079"></a>
### get_batch_responses_from_vlm bypasses token accounting

`ai_scientist/vlm.py:L251-L336` @ 96bd516

**`get_batch_responses_from_vlm` bypasses token accounting.** `ai_scientist/vlm.py:L251-L336` — No `@track_token_usage` decorator; batch VLM calls are invisible to cost tracking.

<a id="g8-f080"></a>
### prepare_vlm_prompt is a stub

`ai_scientist/vlm.py:L121-L122` @ 96bd516

**`prepare_vlm_prompt` is a stub.** `ai_scientist/vlm.py:L121-L122` — `pass` body; silently returns `None`, implying an unfinished multi-image prompt construction path.

<a id="g8-f081"></a>
### detect_duplicate_figures sends all images in one unbounded multi-image call

`ai_scientist/perform_vlm_review.py:L389-L445` @ 96bd516

**`detect_duplicate_figures` sends all images in one unbounded multi-image call.** `ai_scientist/perform_vlm_review.py:L389-L445` — No size/token limit guard; large papers could silently exceed context limits.

<a id="g8-f082"></a>
### _should_maximize silently falls back to wrong direction on schema errors

`ai_scientist/treesearch/utils/metric.py:L196-L203` @ 96bd516

**`_should_maximize` silently falls back to wrong direction on schema errors.** `ai_scientist/treesearch/utils/metric.py:L196-L203` — Catches all exceptions with a bare `print` and returns `bool(self.maximize)`, potentially optimizing in the wrong direction with no warning.

<a id="g8-f083"></a>
### chktex invoked via deprecated os.popen

`ai_scientist/perform_icbinb_writeup.py:L1047` @ 96bd516

**`chktex` invoked via deprecated `os.popen`.** `ai_scientist/perform_icbinb_writeup.py:L1047` — `# TODO: should prob use subprocess instead`; errors not surfaced cleanly.

<a id="g8-f084"></a>
### Hard-coded fallback model "gpt-4o-2024-08-06" in log summarizer

`ai_scientist/treesearch/log_summarization.py:L269-L273` @ 96bd516

**Hard-coded fallback model `"gpt-4o-2024-08-06"` in log summarizer.** `ai_scientist/treesearch/log_summarization.py:L269-L273`, `L341-L344` — Silent GPT-4o routing when `cfg.agent.summary` is absent; `L341` also calls `.get("model", "")` on the result of `cfg.agent.get("summary", None)` — raises `AttributeError` if `summary` is a non-dict.

<a id="g8-f085"></a>
### [TODO] handle nested zips unimplemented

`ai_scientist/treesearch/utils/__init__.py:L53` @ 96bd516

**`[TODO] handle nested zips` unimplemented.** `ai_scientist/treesearch/utils/__init__.py:L53` — Inner archives silently skipped. `L64` — When output path already exists, zip is removed without content verification, risking silent data loss.

<a id="g8-f086"></a>
### deepcoder-14b fallback is an untested bare except Exception

`ai_scientist/llm.py:L364-L405` @ 96bd516

**`deepcoder-14b` fallback is an untested bare `except Exception`.** `ai_scientist/llm.py:L364-L405` — Falls back to raw `requests.POST` with a hard-coded HuggingFace URL; fragile error path with no logging.

