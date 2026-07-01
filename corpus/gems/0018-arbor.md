# Arbor

| | |
|---|---|
| Source | https://github.com/RUC-NLPIR/Arbor |
| Repo | https://github.com/RUC-NLPIR/Arbor @ `964b8466f226225e9cf23174d96e0349c105b02a` |
| Kind | repo |
| Topics | agent, research |
| License | Apache-2.0 (permissive) |
| Verdict | - |
| Findings | 73 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/18 |

## Implementation decisions

<a id="g18-f001"></a>
### Hard "load receipt" gate

`src/coordinator/prompts.py:186-204` @ 964b846

`src/coordinator/prompts.py:186-204` — Hard "load receipt" gate: after `LoadSkill("idea_drafting")` returns, the agent must paste the literal first non-blank line of the skill body as `LOAD_RECEIPT: <line>` in its reasoning trace before taking any other action. Missing or fabricated receipt auto-rejects all candidates from that round.

<a id="g18-f002"></a>
### Protected-path tamper detection

`src/coordinator/tools/executor_run.py:584-596` @ 964b846

`src/coordinator/tools/executor_run.py:584-596` — Protected-path tamper detection: if an executor modifies guarded files, `score` is immediately set to `None` and `eval_status="tampered"` before any tree update, making the node permanently un-mergeable. Score discard is pre-write, not post-write.

<a id="g18-f003"></a>
### Skills are static markdown documents loaded on-demand rather than pre-injected into the system prompt, keeping the co…

`src/core/tools/skill.py:12-19` @ 964b846

`src/core/tools/skill.py:12-19` — Skills are static markdown documents loaded on-demand rather than pre-injected into the system prompt, keeping the context window lean and deferring domain material to the exact decision point that needs it.

<a id="g18-f004"></a>
### When skills are registered the tool injects their names as an enum constraint on the skill_name parameter, narrowing …

`src/core/tools/skill.py:48-60` @ 964b846

`src/core/tools/skill.py:48-60` — When skills are registered the tool injects their names as an `enum` constraint on the `skill_name` parameter, narrowing the model's action space to valid values and preventing hallucinated skill names.

<a id="g18-f005"></a>
### Dual-source skill registry

`src/core/tools/skill.py:24` @ 964b846

`src/core/tools/skill.py:24` — Dual-source skill registry: package-level `<package>/skills/*.md` merged with per-project `.arbor/skills/*.md`, with the project directory taking precedence on name collision. Allows project-specific overrides without forking the package.

<a id="g18-f006"></a>
### drain_notifications() is a pull-based push model

`src/core/tools/base.py:37-45` @ 964b846

`src/core/tools/base.py:37-45` — `drain_notifications()` is a pull-based push model: background work accumulates notifications, and the agent drains them once per turn instead of polling a status endpoint, eliminating runaway poll loops.

<a id="g18-f007"></a>
### process_result persists large tool outputs to disk and returns a head+tail preview plus a Read -able path rather than…

`src/core/tools/base.py:63-97` @ 964b846

`src/core/tools/base.py:63-97` — `process_result` persists large tool outputs to disk and returns a head+tail preview plus a `Read`-able path rather than silently truncating, keeping context manageable while preserving all data for on-demand recovery.

<a id="g18-f008"></a>
### ExecutorTool is added to the tool list only when a parent_agent is explicitly passed, preventing child agents from ga…

`src/core/tools/__init__.py:58-59` @ 964b846

`src/core/tools/__init__.py:58-59` — `ExecutorTool` is added to the tool list only when a `parent_agent` is explicitly passed, preventing child agents from gaining sub-agent spawning capability unless the orchestrator intentionally grants it.

<a id="g18-f009"></a>
### Child config deep-copies the parent's llm / timeout / context subgroups wholesale but hard-overrides auto_git=False ,…

`src/core/tools/executor_tool.py:96-104` @ 964b846

`src/core/tools/executor_tool.py:96-104` — Child config deep-copies the parent's `llm`/`timeout`/`context` subgroups wholesale but hard-overrides `auto_git=False`, preventing sub-agents from committing on behalf of the parent run.

<a id="g18-f010"></a>
### Child agents strip Executor from their tool list by name to prevent recursive spawning; the guard is a simple list co…

`src/core/tools/executor_tool.py:108-109` @ 964b846

`src/core/tools/executor_tool.py:108-109` — Child agents strip `Executor` from their tool list by name to prevent recursive spawning; the guard is a simple list comprehension with no depth counter threaded through configs.

<a id="g18-f011"></a>
### _classify_executor_outcome distinguishes done (real metric produced or eval intentionally skipped) from needs_retry (…

`src/coordinator/tools/executor_run.py:62-85` @ 964b846

`src/coordinator/tools/executor_run.py:62-85` — `_classify_executor_outcome` distinguishes `done` (real metric produced or eval intentionally skipped) from `needs_retry` (timeout / max_turns / eval-crash), preventing partial work from being treated as a completed experiment and excluding `needs_retry` nodes from best-node selection.

<a id="g18-f012"></a>
### The IDEATE body switches at runtime between a strict skill-driven Stage A-E flow and a free-form propose-and-self-che…

`src/coordinator/prompts.py:302-311` @ 964b846

`src/coordinator/prompts.py:302-311` — The IDEATE body switches at runtime between a strict skill-driven Stage A-E flow and a free-form propose-and-self-check flow based on `config.skills_enabled` and `disabled_skills`, allowing performance-first tasks to use parameter tweaks without violating novelty gates.

<a id="g18-f013"></a>
### coerce_str_list tries json.loads , then ast.literal_eval , then URL regex extraction in order, so LLM callers can pas…

`src/core/tools/web/_coerce.py:17-72` @ 964b846

`src/core/tools/web/_coerce.py:17-72` — `coerce_str_list` tries `json.loads`, then `ast.literal_eval`, then URL regex extraction in order, so LLM callers can pass raw strings, JSON arrays, or informal comma-lists interchangeably. Strips wrapping quotes and `url:` prefixes as a final normalization step.

<a id="g18-f014"></a>
### eval_cmd uses {cwd} and {node_id} template variables substituted at dispatch time so each executor gets its own workt…

`src/coordinator/tools/executor_io.py:44-51` @ 964b846

`src/coordinator/tools/executor_io.py:44-51` — `eval_cmd` uses `{cwd}` and `{node_id}` template variables substituted at dispatch time so each executor gets its own worktree path and a unique result directory prefix. Hardcoding absolute paths is explicitly called a critical failure mode in the coordinator prompt.

<a id="g18-f015"></a>
### Path guard blocks mlebench/data/.../private at both the file-path level (via os.path.realpath ) and the shell-command…

`src/core/tools/path_guard.py:8-25` @ 964b846

`src/core/tools/path_guard.py:8-25` — Path guard blocks `mlebench/data/.../private` at both the file-path level (via `os.path.realpath`) and the shell-command level (via regex over the raw command string), catching symlink traversal and shell-escaped paths.

<a id="g18-f016"></a>
### Transcript-scan recovery

`src/coordinator/tools/_agent_recover.py:1-16` @ 964b846

`src/coordinator/tools/_agent_recover.py:1-16` — Transcript-scan recovery: the `Agent` records a normalized provider-agnostic transcript (`assistant_texts`, `tool_uses`) so that a valid final JSON nudged past by the premature-stop detector, or lost to a `max_turns` placeholder, can be recovered by scanning backward.

<a id="g18-f017"></a>
### asyncio.wait_for with a configurable nested_executor_timeout bounds child execution; both TimeoutError and all other …

`src/core/tools/executor_tool.py:117-123` @ 964b846

`src/core/tools/executor_tool.py:117-123` — `asyncio.wait_for` with a configurable `nested_executor_timeout` bounds child execution; both `TimeoutError` and all other exceptions return string sentinels so the parent loop can continue without raising.

<a id="g18-f018"></a>
### Glob results drop hidden/VCS directories ( {".git", ".svn", ".hg", "node_modules", "__pycache__", ".venv", "venv"} ),…

`src/core/tools/glob_tool.py:63-74` @ 964b846

`src/core/tools/glob_tool.py:63-74` — Glob results drop hidden/VCS directories (`{".git", ".svn", ".hg", "node_modules", "__pycache__", ".venv", "venv"}`), filter to files-only, then sort newest-first before capping at 100, reducing noise for LLM consumers without configuration.

## Skills, prompts, tools

<a id="g18-f019"></a>
### SEARCH_AGENT_SYSTEM_PROMPT

`src/search_agent/prompts.py:6-99` @ 964b846

`src/search_agent/prompts.py:6-99` — `SEARCH_AGENT_SYSTEM_PROMPT`: complete ReAct novelty scout with hard caps (≤2 search rounds, ≤5 `web_visit` calls, ≤12 turns), a 6-step decompose/search/visit/decide/refine/synthesize loop, and a strict JSON schema. The schema enforces that `related_papers` URLs are only those actually visited.

<a id="g18-f020"></a>
### Experiment workflow section

`src/executor/prompts.py:248-401` @ 964b846

`src/executor/prompts.py:248-401` — Experiment workflow section: 7-step UNDERSTAND BASELINE PLAN IMPLEMENT VERIFY DEBUG/ADAPT REPORT workflow. Key separation: "The idea's direction is non-negotiable" vs "Implementation choices are yours." Executors report their implementation choices in a dedicated section.

<a id="g18-f021"></a>
### build_search_user_prompt

`src/search_agent/prompts.py:102-146` @ 964b846

`src/search_agent/prompts.py:102-146` — `build_search_user_prompt`: sections labeled (`## Hypothesis to investigate`, `## Parent / ancestor context`, `## Focus directive`, `## Task`, `## Report language`). The ancestor context block carries an explicit directive: "do NOT search for these — search for the hypothesis above." The `report_language` parameter decouples language of free-text fields from the enum values (which stay English).

<a id="g18-f022"></a>
### _grounded_ideation_section

`src/coordinator/prompts.py:631-677` @ 964b846

`src/coordinator/prompts.py:631-677` — `_grounded_ideation_section`: `ResearchSearch` is described as an isolated-context, blocking, on-demand tool returning a digest (not raw SERP). The digest is explicitly labeled "knowledge, not an idea" to prevent direct copying from papers. The `grounding` field on `TreeAddNode` is the correct write-back target.

<a id="g18-f023"></a>
### ExecutorTool.description is a structured LLM-facing briefing guide explaining semantics, use-case examples, and endin…

`src/core/tools/executor_tool.py:27-53` @ 964b846

`src/core/tools/executor_tool.py:27-53` — `ExecutorTool.description` is a structured LLM-facing briefing guide explaining semantics, use-case examples, and ending with an explicit anti-pattern warning: "Terse command-style prompts produce shallow, generic work."

<a id="g18-f024"></a>
### GlobTool.description includes an in-band routing hint directing the LLM toward Executor for open-ended multi-round se…

`src/core/tools/glob_tool.py:15-22` @ 964b846

`src/core/tools/glob_tool.py:15-22` — `GlobTool.description` includes an in-band routing hint directing the LLM toward `Executor` for open-ended multi-round searches, acting as a lightweight tool-selection guide embedded in the description itself.

<a id="g18-f025"></a>
### RunTraining vs Bash distinction is taught in-prompt

`src/executor/prompts.py:349-381` @ 964b846

`src/executor/prompts.py:349-381` — `RunTraining` vs `Bash` distinction is taught in-prompt: any single command >5 min should use `RunTraining` (blocks, extracts metrics, no polling); `Bash` is reserved for quick commands and parallel independent work. The prompt explicitly forbids `sleep && tail` polling loops as a turn waste.

<a id="g18-f026"></a>
### RESEARCH_AGENT_SYSTEM_PROMPT

`src/search_agent/prompts.py:169-266` @ 964b846

`src/search_agent/prompts.py:169-266` — `RESEARCH_AGENT_SYSTEM_PROMPT`: a parallel research-assistant lane with four named intents — `related_work`, `survey`, `lookup`, `explore` — that shape both the search strategy and the `details` field format in the JSON output.

<a id="g18-f027"></a>
### build_system_prompt builds from 9 named sections in a documented order; sections are filtered ( if s ) so optional se…

`src/executor/prompts.py:20-47` @ 964b846

`src/executor/prompts.py:20-47` — `build_system_prompt` builds from 9 named sections in a documented order; sections are filtered (`if s`) so optional sections (plugin preamble, budget policy) are cleanly omitted when absent.

<a id="g18-f028"></a>
### _related_work_annotation_section (executor mode)

`src/coordinator/prompts.py:680-785` @ 964b846

`src/coordinator/prompts.py:680-785` — `_related_work_annotation_section` (executor mode): two sub-modes — background (non-blocking, concurrent with next IDEATE) and foreground (blocking). The `require_validated` gate admits only `done/merged` nodes with `score > trunk_score`, tying novelty-check cost to ideas that proved out.

Other takes: [gem #9](0009-scienceclaw.md#g9-f007), [gem #10](0010-autogen.md#g10-f044)

<a id="g18-f029"></a>
### Tool description embeds LLM-facing behavioral contracts inline

`src/core/tools/file_write.py:14-29` @ 964b846

`src/core/tools/file_write.py:14-29` — Tool `description` embeds LLM-facing behavioral contracts inline: "MUST use the Read tool first", "NEVER create documentation files", "Prefer the Edit tool." These rules are part of the prompt surface the model receives at call time.

<a id="g18-f030"></a>
### Edit tool description encodes the read-before-edit contract, the uniqueness requirement ("edit will FAIL if old_strin…

`src/core/tools/file_edit.py:70-93` @ 964b846

`src/core/tools/file_edit.py:70-93` — Edit tool description encodes the read-before-edit contract, the uniqueness requirement ("edit will FAIL if old_string is not unique"), and the `replace_all` escape hatch, all within the description the model reads at call time.

<a id="g18-f031"></a>
### Execute returns the skill body prefixed with a rendered Markdown header ( # Skill

`src/core/tools/skill.py:62-78` @ 964b846

`src/core/tools/skill.py:62-78` — Execute returns the skill body prefixed with a rendered Markdown header (`# Skill: {name}` + `_When to apply: ..._`), contextualising the returned document for the consuming agent.

<a id="g18-f032"></a>
### Tool description inlines when_to_apply hints from skill metadata so the LLM knows at which decision point to call Loa…

`src/core/tools/skill.py:36-46` @ 964b846

`src/core/tools/skill.py:36-46` — Tool description inlines `when_to_apply` hints from skill metadata so the LLM knows at which decision point to call `LoadSkill` without needing separate documentation.

<a id="g18-f033"></a>
### A two-column table maps every native Arbor tree/eval/merge operation to a deterministic arbor_state.py CLI subcommand…

`skills/arbor-agent-tools/references/tool-mapping.md:3-26` @ 964b846

`skills/arbor-agent-tools/references/tool-mapping.md:3-26` — A two-column table maps every native Arbor tree/eval/merge operation to a deterministic `arbor_state.py` CLI subcommand, structured so an LLM can look up the fallback command by searching the left column.

<a id="g18-f034"></a>
### build_coordinator_system_prompt conditionally includes _grounded_ideation_section and _related_work_annotation_sectio…

`src/coordinator/prompts.py:15-32` @ 964b846

`src/coordinator/prompts.py:15-32` — `build_coordinator_system_prompt` conditionally includes `_grounded_ideation_section` and `_related_work_annotation_section` only when `config.search.enabled` and relevant flags are set, keeping the prompt lean for offline runs.

<a id="g18-f035"></a>
### Structured extraction prompt using {webpage_content} and {goal} template variables, returning JSON with rational / ev…

`src/core/tools/web/prompts.py:5-20` @ 964b846

`src/core/tools/web/prompts.py:5-20` — Structured extraction prompt using `{webpage_content}` and `{goal}` template variables, returning JSON with `rational`/`evidence`/`summary` fields. The `evidence` field is instructed to output "full original context … more than three paragraphs" to preserve traceability.

<a id="g18-f036"></a>
### Strips url: prefixes that LLMs emit when copying from tool descriptions, and trailing ,] characters from JSON arrays …

`src/core/tools/web/_coerce.py:61-64` @ 964b846

`src/core/tools/web/_coerce.py:61-64` — Strips `url:` prefixes that LLMs emit when copying from tool descriptions, and trailing `,]` characters from JSON arrays split across lines — both are defensive guards against common LLM formatting artifacts.

<a id="g18-f037"></a>
### to_api_schema() serializes tools to the Anthropic API {name, description, input_schema} format, acting as the single …

`src/core/tools/base.py:55-61` @ 964b846

`src/core/tools/base.py:55-61` — `to_api_schema()` serializes tools to the Anthropic API `{name, description, input_schema}` format, acting as the single bridge between Python tool objects and the model's tool registry.

## Patterns worth porting

<a id="g18-f038"></a>
### Full executor lifecycle as a single _run_single_executor coroutine

`src/coordinator/tools/executor_run.py:460-688` @ 964b846

`src/coordinator/tools/executor_run.py:460-688` — Full executor lifecycle as a single `_run_single_executor` coroutine: validate create worktree snapshot protected paths run agent under `asyncio.wait_for` tamper check finalize/remove worktree LLM-parse report update tree propagate insights emit events save artifacts format summary. Each step is isolated; failures in optional steps (hooks, propagation, artifact save) are caught and logged without aborting the rest.

<a id="g18-f039"></a>
### Per-experiment artifact persistence

`src/coordinator/tools/executor_run.py:100-165` @ 964b846

`src/coordinator/tools/executor_run.py:100-165` — Per-experiment artifact persistence: `report.md`, `metrics.json`, and `diff.patch` (via `git diff trunk...branch`) saved to `workspace/experiments/<node_id>/`. The diff is only written when `git diff --stat` is non-empty. Resume context reads these artifacts to re-ground a new agent without replaying the full message history.

<a id="g18-f040"></a>
### _build_resume_context

`src/coordinator/tools/executor_io.py:174-218` @ 964b846

`src/coordinator/tools/executor_io.py:174-218` — `_build_resume_context`: reconstructs executor context from saved artifacts (report.md, diff.patch) with a `_tail(text, N)` helper that truncates to the last N chars with a marker. Feeds prior `stop_reason`, `eval_status`, and whether `code_ref` exists into the prompt so the resumed agent knows whether to continue a branch or start fresh.

<a id="g18-f041"></a>
### _parse_executor_report

`src/coordinator/tools/executor_io.py:221-293` @ 964b846

`src/coordinator/tools/executor_io.py:221-293` — `_parse_executor_report`: LLM-backed structured extraction from free-form executor reports. System prompt defines a 5-field JSON schema with `eval_status` as a three-value enum (`scored | skipped | failed_to_run`). Falls back to a safe default dict on `JSONDecodeError`. Strips markdown fences before parsing.

<a id="g18-f042"></a>
### Orchestrator/worker config-inheritance pattern

`src/core/tools/executor_tool.py:93-115` @ 964b846

`src/core/tools/executor_tool.py:93-115` — Orchestrator/worker config-inheritance pattern: child receives a deep copy of parent's LLM/timeout/context, then resets only `auto_git` and `max_turns`. Cleanly separates shared policy (model, budget) from per-spawn policy (side-effects, turn limit).

<a id="g18-f043"></a>
### Sentinel-return error containment

`src/core/tools/executor_tool.py:117-125` @ 964b846

`src/core/tools/executor_tool.py:117-125` — Sentinel-return error containment: both timeout and exception paths return descriptive strings (`[Sub-agent timed out after Xs]`, `[Sub-agent error: ...]`) rather than raising, making the parent loop unconditionally resumable.

<a id="g18-f044"></a>
### Two-threshold result policy

`src/core/tools/base.py:25-27` @ 964b846

`src/core/tools/base.py:25-27` — Two-threshold result policy: `persist_threshold=30_000` triggers disk persistence with preview; `max_result_chars=50_000` is a hard-truncation fallback only used when persistence fails. Separating the two thresholds avoids silent data loss at the soft limit.

<a id="g18-f045"></a>
### _extract_json_block

`src/coordinator/tools/_agent_recover.py:26-75` @ 964b846

`src/coordinator/tools/_agent_recover.py:26-75` — `_extract_json_block`: two-strategy extractor — direct `json.loads` after stripping code fences, then balanced-brace scanning from every `{` position with proper string/escape state tracking.

<a id="g18-f046"></a>
### _normalize_url

`src/coordinator/tools/_agent_recover.py:96-111` @ 964b846

`src/coordinator/tools/_agent_recover.py:96-111` — `_normalize_url`: strips scheme, query string, trailing slashes, `www.`, and arxiv-style `v\d+` version suffixes for loose URL matching across citation and visit sets.

<a id="g18-f047"></a>
### HITL review gate ( _review_gate )

`src/coordinator/tools/executor_run.py:695-726` @ 964b846

`src/coordinator/tools/executor_run.py:695-726` — HITL review gate (`_review_gate`): in `review`/`collaborative` mode, pauses before spending compute; parses three response forms — approve-synonyms, skip-synonyms, and `"edit <note>"` (strips prefix, folds note into `additional_context`). Auto-approves on timeout with a log message.

<a id="g18-f048"></a>
### RoutingVisitTool composition

`src/core/tools/web/keyless_visit.py:149-195` @ 964b846

`src/core/tools/web/keyless_visit.py:149-195` — `RoutingVisitTool` composition: one `web_visit` surface dispatches paper URLs to the alphaXiv SDK (full text) and everything else to the keyless Jina fetcher, based on `_paper_id(url)` detection. The composed tool inherits name/description/schema from `WebVisitTool`, presenting a uniform interface.

<a id="g18-f049"></a>
### _fetch_page chains Jina then raw-requests fallback, returning a canned error string only when both fail. Callers neve…

`src/core/tools/web/keyless_visit.py:104-110` @ 964b846

`src/core/tools/web/keyless_visit.py:104-110` — `_fetch_page` chains Jina then raw-requests fallback, returning a canned error string only when both fail. Callers never see an exception — the tool returns a displayable string in every code path.

<a id="g18-f050"></a>
### Three-tier fuzzy match

`src/core/tools/file_edit.py:36-67` @ 964b846

`src/core/tools/file_edit.py:36-67` — Three-tier fuzzy match: (1) exact substring, (2) quote normalization (`_normalize_quotes` on both sides), (3) strip trailing whitespace per line. Cascades to more lenient match only on failure of the previous tier, minimizing false-positive matches.

<a id="g18-f051"></a>
### Two-factory pattern ( build_web_search_tool , build_web_visit_tool ) with getattr(sc, key, default) duck-typing. Both…

`src/core/tools/web/factory.py:27-92` @ 964b846

`src/core/tools/web/factory.py:27-92` — Two-factory pattern (`build_web_search_tool`, `build_web_visit_tool`) with `getattr(sc, key, default)` duck-typing. Both coordinator and per-agent builders share the same factory without importing the coordinator's config class.

<a id="g18-f052"></a>
### get_all_tools() factory reads all timeout/limit config from AgentConfig with inline numeric defaults. Callers that do…

`src/core/tools/__init__.py:19-59` @ 964b846

`src/core/tools/__init__.py:19-59` — `get_all_tools()` factory reads all timeout/limit config from `AgentConfig` with inline numeric defaults. Callers that don't pass a config get sensible defaults without constructing the full config object.

<a id="g18-f053"></a>
### Post-execution telemetry

`src/core/tools/executor_tool.py:127-134` @ 964b846

`src/core/tools/executor_tool.py:127-134` — Post-execution telemetry: child turn count plus input/output tokens are logged at INFO level after every spawn, providing per-subtask budget attribution without requiring instrumentation in the child itself.

<a id="g18-f054"></a>
### Consistent path-guard check before any I/O ( check_path_allowed(path) ) returning a "BLOCKED

`src/core/tools/glob_tool.py:44-50` @ 964b846

`src/core/tools/glob_tool.py:44-50` — Consistent path-guard check before any I/O (`check_path_allowed(path)`) returning a `"BLOCKED: ..."` string, composable with the sentinel-return pattern used throughout the tool layer.

<a id="g18-f055"></a>
### Eval-cmd template convention

`src/coordinator/prompts.py:356-378` @ 964b846

`src/coordinator/prompts.py:356-378` — Eval-cmd template convention: `{cwd}` and `{node_id}` placeholders substituted per-dispatch, with a "NEVER hardcode absolute paths" rule, "CORRECT vs WRONG" example pair, and the failure mode explained (evaluating the wrong code).

<a id="g18-f056"></a>
### skills/arbor-agent-*/agents/openai.yaml (all agent stubs, lines 1-5 each)

`skills/arbor-agent-*/agents/openai.yaml` (all agent stubs, lines 1-5 each) — Minimal skill-card YAML pattern: each agent role is a self-describing 4-line stub (`display_name`, `short_description`, `default_prompt` with `$skill-name` token) in its own directory, enabling discovery without a central registry file.

<a id="g18-f057"></a>
### Rational/Evidence/Summary extraction schema

`src/core/tools/web/prompts.py:5-20` @ 964b846

`src/core/tools/web/prompts.py:5-20` — Rational/Evidence/Summary extraction schema: reusable three-field JSON pattern grounding any document or web extraction with explicit reasoning (`rational`), verbatim source preservation (`evidence`), and synthesised output (`summary`).

## Open threads / weak spots

<a id="g18-f058"></a>
### Convergence signal in RunExecutorParallel iterates over all tasks but overwrites signal on each iteration without bre…

`src/coordinator/tools/executor_run.py:1132-1138` @ 964b846

`src/coordinator/tools/executor_run.py:1132-1138` — Convergence signal in `RunExecutorParallel` iterates over all tasks but overwrites `signal` on each iteration without breaking; only the LAST task's convergence signal is acted on. An earlier hard-stop signal is silently discarded.

<a id="g18-f059"></a>
### except Exception as e swallows all non-timeout child errors into a generic string. No error classification or re-rais…

`src/core/tools/executor_tool.py:124` @ 964b846

`src/core/tools/executor_tool.py:124` — `except Exception as e` swallows all non-timeout child errors into a generic string. No error classification or re-raise path exists, so silent failures (OOM, import errors, assertion failures) are invisible to the parent's reasoning.

<a id="g18-f060"></a>
### When disk persistence fails, process_result silently falls back to _truncate with no warning to caller or model. The …

`src/core/tools/base.py:83-86` @ 964b846

`src/core/tools/base.py:83-86` — When disk persistence fails, `process_result` silently falls back to `_truncate` with no warning to caller or model. The model receives truncated output with no indication that persistence failed or that data was lost.

<a id="g18-f061"></a>
### No length cap on the evidence field ("output the full original context … as far as possible, it can be more than thre…

`src/core/tools/web/prompts.py:17` @ 964b846

`src/core/tools/web/prompts.py:17` — No length cap on the `evidence` field ("output the full original context … as far as possible, it can be more than three paragraphs"). On large pages this risks blowing the context window of the downstream model with raw verbatim text.

<a id="g18-f062"></a>
### _BLOCKED_PATH_PATTERNS is hardcoded to the mlebench layout and is not configurable via constructor or config. Any non…

`src/core/tools/path_guard.py:8-10` @ 964b846

`src/core/tools/path_guard.py:8-10` — `_BLOCKED_PATH_PATTERNS` is hardcoded to the `mlebench` layout and is not configurable via constructor or config. Any non-mlebench benchmark with private test data requires a code change to protect.

<a id="g18-f063"></a>
### _ask_user_section has two independent conditions for inclusion ( allow_agent_questions OR interaction_mode in ("direc…

`src/coordinator/prompts.py:35-48` @ 964b846

`src/coordinator/prompts.py:35-48` — `_ask_user_section` has two independent conditions for inclusion (`allow_agent_questions` OR `interaction_mode in ("direction", "collaborative")`). These can diverge if one is set without the other, enabling the `AskUser` tool without the interaction-mode protocol or vice versa.

<a id="g18-f064"></a>
### Binary file detection is skipped when mimetypes.guess_type returns None (unknown extension

`src/core/tools/file_read.py:82-87` @ 964b846

`src/core/tools/file_read.py:82-87` — Binary file detection is skipped when `mimetypes.guess_type` returns `None` (unknown extension: `.go`, `.rs`, `.ts`, etc. all return `None`). Files with unknown extensions are read as text unconditionally, so binary files with unusual extensions produce garbled output without warning.

<a id="g18-f065"></a>
### The trailing-whitespace fuzzy match (tier 3) uses file_stripped.find(search_stripped) then slices file_content[idx

`src/core/tools/file_edit.py:56-65` @ 964b846

`src/core/tools/file_edit.py:56-65` — The trailing-whitespace fuzzy match (tier 3) uses `file_stripped.find(search_stripped)` then slices `file_content[idx: idx + len(search_stripped)]` using the stripped length. If the file content at that position has trailing whitespace on lines, the replacement leaves trailing whitespace residue.

<a id="g18-f066"></a>
### Recursion guard is name-based only ( t.name != "Executor" ). No depth counter is threaded through child configs, so a…

`src/core/tools/executor_tool.py:108-109` @ 964b846

`src/core/tools/executor_tool.py:108-109` — Recursion guard is name-based only (`t.name != "Executor"`). No depth counter is threaded through child configs, so a renamed tool or indirect recursion via a different spawn path is undetected.

<a id="g18-f067"></a>
### The truncation notice ( [Showing first 100 of more matches] ) is appended as a plain string to the path list. An LLM …

`src/core/tools/glob_tool.py:78-86` @ 964b846

`src/core/tools/glob_tool.py:78-86` — The truncation notice (`[Showing first 100 of more matches]`) is appended as a plain string to the path list. An LLM iterating over lines may parse it as a path rather than a status message.

<a id="g18-f068"></a>
### PDF reading depends solely on subprocess pdftotext (poppler-utils). If not installed, returns a hint string with no u…

`src/core/tools/file_read.py:129-147` @ 964b846

`src/core/tools/file_read.py:129-147` — PDF reading depends solely on subprocess `pdftotext` (poppler-utils). If not installed, returns a hint string with no usable content. `pypdf` is imported and used in `keyless_visit.py:64-76` but not tried here as a fallback.

<a id="g18-f069"></a>
### JinaVisitTool.__init__ calls Tool.__init__ directly, bypassing WebVisitTool.__init__ . Any initialization logic added…

`src/core/tools/web/keyless_visit.py:92-93` @ 964b846

`src/core/tools/web/keyless_visit.py:92-93` — `JinaVisitTool.__init__` calls `Tool.__init__` directly, bypassing `WebVisitTool.__init__`. Any initialization logic added to `WebVisitTool.__init__` in future (new attributes, resource setup) will silently not apply to `JinaVisitTool` instances.

<a id="g18-f070"></a>
### ResumeExecutor checks node.code_ref is None and returns an error, but a partially-committed branch (code_ref exists, …

`src/coordinator/tools/executor_run.py:906-910` @ 964b846

`src/coordinator/tools/executor_run.py:906-910` — `ResumeExecutor` checks `node.code_ref is None` and returns an error, but a partially-committed branch (code_ref exists, implementation incomplete) is resumed without any indication of how much work was committed.

<a id="g18-f071"></a>
### Worktree creation failure resets node to pending (not needs_retry ) on the grounds that no compute was spent, but the…

`src/coordinator/tools/executor_run.py:508-515` @ 964b846

`src/coordinator/tools/executor_run.py:508-515` — Worktree creation failure resets node to `pending` (not `needs_retry`) on the grounds that no compute was spent, but the failure reason is written to `node.result`, a non-obvious place for an operator to find setup errors distinct from experiment failures.

<a id="g18-f072"></a>
### The truncation policy tells the agent to treat a short snippet as sufficient evidence but provides no fallback if the…

`src/search_agent/prompts.py:24-29` @ 964b846

`src/search_agent/prompts.py:24-29` — The truncation policy tells the agent to treat a short snippet as sufficient evidence but provides no fallback if the snippet is genuinely empty (e.g., a visit returning a 0-byte body). The agent may incorrectly infer "nothing there" rather than "visit failed."

<a id="g18-f073"></a>
### through (all agent stub files)

`skills/arbor-agent-resume-report/agents/openai.yaml:1-5` @ 964b846

`skills/arbor-agent-resume-report/agents/openai.yaml:1-5` through `skills/arbor-agent-tools/agents/openai.yaml:1-4` (all agent stub files) — Every skill YAML contains only an `interface:` block with no `tools:`, `model:`, `system_prompt:`, or `temperature` fields. The files are entry-point stubs, not executable agent definitions; the actual agent logic must live elsewhere and is not present in these files.

