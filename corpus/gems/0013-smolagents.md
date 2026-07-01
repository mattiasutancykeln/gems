# smolagents

| | |
|---|---|
| Source | https://github.com/huggingface/smolagents |
| Repo | https://github.com/huggingface/smolagents @ `e8b988d0a33ae2f0ca6e53a111fd21bc1aed42f3` |
| Kind | repo |
| Topics | agent |
| License | Apache-2.0 (permissive) |
| Verdict | - |
| Findings | 64 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/13 |

## Implementation decisions

<a id="g13-f001"></a>
### ToolCallingAgent uses ThreadPoolExecutor with configurable max_tool_threads for parallel tool invocation. Each thread…

`src/smolagents/agents.py:1215-1259` @ e8b988d

`src/smolagents/agents.py:1215-1259` / `src/smolagents/agents.py:1415-1443` — ToolCallingAgent uses `ThreadPoolExecutor` with configurable `max_tool_threads` for parallel tool invocation. Each thread receives a copy of the current context via `copy_context()` to preserve request-local state (contextvars); results are collected via `as_completed` and merged into a shared memory step's observations.

<a id="g13-f002"></a>
### MultiStepAgent orchestration contract

`src/smolagents/agents.py:268-292` @ e8b988d

`src/smolagents/agents.py:268-292` — `MultiStepAgent` orchestration contract: `managed_agents` list, `step_callbacks` registry keyed by `MemoryStep` class type, `planning_interval` for phased re-planning, and `final_answer_checks` validation gates. All four concerns are declared at construction time as distinct parameters, not mode flags.

<a id="g13-f003"></a>
### Managed agents are configured at parent init time with standardized input/output schemas

`src/smolagents/agents.py:369-388` @ e8b988d

`src/smolagents/agents.py:369-388` — Managed agents are configured at parent init time with standardized input/output schemas: `inputs = {task: string, additional_args: nullable object}`, `output_type: string`. Interface is stamped onto the child from the parent's perspective, decoupling child construction from parent calling conventions.

<a id="g13-f004"></a>
### Managed agent __call__ wraps agent.run() output with a prompt template; the provide_run_summary flag controls whether…

`src/smolagents/agents.py:868-890` @ e8b988d

`src/smolagents/agents.py:868-890` — Managed agent `__call__` wraps `agent.run()` output with a prompt template; the `provide_run_summary` flag controls whether the full work log (raw memory messages) is appended. No pagination or size guard exists on the appended log.

<a id="g13-f005"></a>
### State variable substitution at tool call time

`src/smolagents/agents.py:1444-1502` @ e8b988d

`src/smolagents/agents.py:1444-1502` — State variable substitution at tool call time: string-valued arguments matching state keys are replaced before validation and execution. Managed agents and tools share the same call path but are dispatched by membership in `managed_agents` dict.

<a id="g13-f006"></a>
### CodeAgent supports local and remote executors (Blaxel, E2B, Modal, Docker) via a factory that routes on executor_type…

`src/smolagents/agents.py:1505-1545` @ e8b988d

`src/smolagents/agents.py:1505-1545` / `src/smolagents/agents.py:1598-1618` — `CodeAgent` supports local and remote executors (Blaxel, E2B, Modal, Docker) via a factory that routes on `executor_type` enum. Remote executors explicitly forbid `managed_agents` (raises `Exception` at init); no fallback or queuing is defined.

<a id="g13-f007"></a>
### ActionStep.to_messages() reconstructs a full conversation thread from a single step's state, including model output, …

`src/smolagents/memory.py:46-90` @ e8b988d

`src/smolagents/memory.py:46-90` — `ActionStep.to_messages()` reconstructs a full conversation thread from a single step's state, including model output, tool calls, images, observations, and error recovery, preserving message role semantics (ASSISTANT, TOOL_CALL, TOOL_RESPONSE, USER) for context reinjection.

<a id="g13-f008"></a>
### Callback registry uses type-based dispatch; callbacks stored in _callbacks[step_cls] keyed by MemoryStep subclass. in…

`src/smolagents/memory.py:280-317` @ e8b988d

`src/smolagents/memory.py:280-317` — Callback registry uses type-based dispatch; callbacks stored in `_callbacks[step_cls]` keyed by `MemoryStep` subclass. `inspect.signature(cb).parameters` inspection allows handlers to opt into additional kwargs (e.g., agent context), enabling backwards-compatible multi-argument callbacks.

<a id="g13-f009"></a>
### Parameter override hierarchy

`src/smolagents/models.py:502-551` @ e8b988d

`src/smolagents/models.py:502-551` — Parameter override hierarchy: `self.kwargs` (defaults) > explicitly passed kwargs > specific parameters (`stop_sequences`, `response_format`, `tools`). A sentinel `REMOVE_PARAMETER` value allows callers to explicitly delete inherited params (L547).

<a id="g13-f010"></a>
### Retry policy

`src/smolagents/models.py:1174-1183` @ e8b988d

`src/smolagents/models.py:1174-1183` — Retry policy: `RateLimiter` throttles before call; `Retrying` handles post-call retries with exponential backoff, jitter, and predicate-based conditions (`is_rate_limit_error` matching "429", "rate limit", "too many requests"). Both concerns are separate objects composed at `ApiModel.__init__`.

<a id="g13-f011"></a>
### Final answer serialization uses explicit prefix-based format ( "safe:" or "pickle:" ) to distinguish modes at deseria…

`src/smolagents/remote_executors.py:143-304` @ e8b988d

`src/smolagents/remote_executors.py:143-304` — Final answer serialization uses explicit prefix-based format (`"safe:"` or `"pickle:"`) to distinguish modes at deserialization time, preventing silent downgrade attacks. `allow_pickle=False` raises rather than falls back.

<a id="g13-f012"></a>
### Timeout decorator uses ThreadPoolExecutor instead of signals, enabling cross-platform (Windows) and any-thread execut…

`src/smolagents/local_python_executor.py:285-320` @ e8b988d

`src/smolagents/local_python_executor.py:285-320` — Timeout decorator uses `ThreadPoolExecutor` instead of signals, enabling cross-platform (Windows) and any-thread execution. Timed-out threads are not forcibly killed; caller receives the error but thread continues in background.

<a id="g13-f013"></a>
### fix_final_answer_code surgically rewrites variable assignments to final_answer (renaming to final_answer_variable ) o…

`src/smolagents/local_python_executor.py:332-357` @ e8b988d

`src/smolagents/local_python_executor.py:332-357` — `fix_final_answer_code` surgically rewrites variable assignments to `final_answer` (renaming to `final_answer_variable`) only when `final_answer()` is called in the same code block, preserving LLM variable memory across subsequent steps.

<a id="g13-f014"></a>
### Safe module import filtering recursively copies imported module attributes while blocking import objects themselves; …

`src/smolagents/local_python_executor.py:1270-1306` @ e8b988d

`src/smolagents/local_python_executor.py:1270-1306` — Safe module import filtering recursively copies imported module attributes while blocking import objects themselves; circular references are detected and returned as-is to prevent infinite loops.

<a id="g13-f015"></a>
### get_safe_serializer_code() and get_deserializer_code() generate standalone serializer functions as strings for inject…

`src/smolagents/serialization.py:376-449` @ e8b988d

`src/smolagents/serialization.py:376-449` — `get_safe_serializer_code()` and `get_deserializer_code()` generate standalone serializer functions as strings for injection into remote sandboxes, avoiding import/module dependency issues on child workers.

<a id="g13-f016"></a>
### Tool validation enforces class-level immutability

`src/smolagents/tool_validation.py:157-263` @ e8b988d

`src/smolagents/tool_validation.py:157-263` — Tool validation enforces class-level immutability: class attributes must be literals/dicts, `__init__` parameters must have defaults, all methods self-contained referencing only declared names. Prevents tool state from hiding in init args, ensuring reproducibility across orchestrator boundaries.

<a id="g13-f017"></a>
### Stream delta agglomeration collects partial tool-call state across index keys, concatenating arguments incrementally …

`src/smolagents/models.py:220-279` @ e8b988d

`src/smolagents/models.py:220-279` — Stream delta agglomeration collects partial tool-call state across index keys, concatenating arguments incrementally until completion (L237: `tool_call_delta.index is not None`), supporting streaming multi-step responses.

## Skills, prompts, tools

<a id="g13-f018"></a>
### Managed agent prompt template standardizes handoff

`src/smolagents/prompts/toolcalling_agent.yaml:97-107` @ e8b988d

`src/smolagents/prompts/toolcalling_agent.yaml:97-107` — Managed agent prompt template standardizes handoff: manager passes `task` and `additional_args` dict; agent returns structured outcome with short + detailed + context sections. Managed agents are declared in system prompt as "team members" with the same calling syntax as tools.

<a id="g13-f019"></a>
### Initial plan prompt performs a 3-phase fact survey

`src/smolagents/prompts/code_agent.yaml:120-144` @ e8b988d

`src/smolagents/prompts/code_agent.yaml:120-144` — Initial plan prompt performs a 3-phase fact survey: facts given → facts to lookup (with location hints) → facts to derive (logical reasoning). Prevents the agent from solving before gathering requirements.

<a id="g13-f020"></a>
### Update plan prompt annotates remaining_steps (L195) to constrain re-planning. However, no built-in mechanism enforces…

`src/smolagents/prompts/code_agent.yaml:169-197` @ e8b988d

`src/smolagents/prompts/code_agent.yaml:169-197` — Update plan prompt annotates `remaining_steps` (L195) to constrain re-planning. However, no built-in mechanism enforces that the agent respects the remaining budget during execution.

<a id="g13-f021"></a>
### Structured output mode wraps thought/code in JSON

`src/smolagents/prompts/structured_code_agent.yaml:4-27` @ e8b988d

`src/smolagents/prompts/structured_code_agent.yaml:4-27` — Structured output mode wraps thought/code in JSON: `{"thought": "...", "code": "..."}`. Enables deterministic parsing when code block tags embed in JSON strings.

<a id="g13-f022"></a>
### System prompt uses explicit final_answer tool as completion gate; examples show observation-driven next step selectio…

`src/smolagents/prompts/toolcalling_agent.yaml:1-25` @ e8b988d

`src/smolagents/prompts/toolcalling_agent.yaml:1-25` — System prompt uses explicit `final_answer` tool as completion gate; examples show observation-driven next step selection and variable reuse between steps.

<a id="g13-f023"></a>
### CODEAGENT_RESPONSE_FORMAT

`src/smolagents/models.py:43-67` @ e8b988d

`src/smolagents/models.py:43-67` — `CODEAGENT_RESPONSE_FORMAT`: JSON Schema strict mode requiring `thought` + `code` fields, used by providers that support structured generation (Cerebras, Fireworks). Not universally applicable.

<a id="g13-f024"></a>
### Tool JSON schema generation extracts tool.inputs properties, handles anyOf unions (nullable alternatives), populates …

`src/smolagents/models.py:288-329` @ e8b988d

`src/smolagents/models.py:288-329` — Tool JSON schema generation extracts `tool.inputs` properties, handles `anyOf` unions (nullable alternatives), populates `required` from non-nullable inputs. Tool choice defaults to `"required"` (L510).

<a id="g13-f025"></a>
### LLM-facing tool contract

`src/smolagents/tools.py:289-290` @ e8b988d

`src/smolagents/tools.py:289-290` — LLM-facing tool contract: `name: description\n    Takes inputs: {inputs}\n    Returns an output of type: {output_type}`. Minimal; no execution details exposed.

<a id="g13-f026"></a>
### Tool code prompt embeds docstring with args + returns documentation; if output_schema exists, JSON schema is included…

`src/smolagents/tools.py:258-287` @ e8b988d

`src/smolagents/tools.py:258-287` — Tool code prompt embeds docstring with args + returns documentation; if `output_schema` exists, JSON schema is included with note to use direct field access (L269).

<a id="g13-f027"></a>
### PythonInterpreterTool injects authorized imports list into the tool description at init time, making runtime constrai…

`src/smolagents/default_tools.py:50-80` @ e8b988d

`src/smolagents/default_tools.py:50-80` — `PythonInterpreterTool` injects authorized imports list into the tool description at init time, making runtime constraints visible to the LLM at call time rather than using static defaults.

<a id="g13-f028"></a>
### DuckDuckGoSearchTool and ApiWebSearchTool implement client-side rate limiting with configurable sleep between request…

`src/smolagents/default_tools.py:140-160` @ e8b988d

`src/smolagents/default_tools.py:140-160` — `DuckDuckGoSearchTool` and `ApiWebSearchTool` implement client-side rate limiting with configurable sleep between requests, enabling backoff without server cooperation.

<a id="g13-f029"></a>
### WebSearchTool 's inline HTML parser validates completeness with set intersection before appending results, guarding a…

`src/smolagents/default_tools.py:374-431` @ e8b988d

`src/smolagents/default_tools.py:374-431` — `WebSearchTool`'s inline HTML parser validates completeness with set intersection before appending results, guarding against partial captures.

<a id="g13-f030"></a>
### PlanningStep embeds a role-change message ("Now proceed and carry out this plan.") after plan output to prevent model…

`src/smolagents/memory.py:153-183` @ e8b988d

`src/smolagents/memory.py:153-183` — `PlanningStep` embeds a role-change message ("Now proceed and carry out this plan.") after plan output to prevent models from continuing the plan narrative rather than executing it.

<a id="g13-f031"></a>
### Browser agent system prompt defines rich interaction primitives ( go_to , click , scroll , search_item_ctrl_f , close…

`src/smolagents/vision_web_browser.py:160-214` @ e8b988d

`src/smolagents/vision_web_browser.py:160-214` — Browser agent system prompt defines rich interaction primitives (`go_to`, `click`, `scroll`, `search_item_ctrl_f`, `close_popups`); explicitly warns against code-based element queries and mandates visual inspection of screenshots.

<a id="g13-f032"></a>
### get_json_schema() generates tool descriptions by parsing Google-format docstrings and Python type hints, producing JS…

`src/smolagents/_function_type_hints_utils.py:97-232` @ e8b988d

`src/smolagents/_function_type_hints_utils.py:97-232` — `get_json_schema()` generates tool descriptions by parsing Google-format docstrings and Python type hints, producing JSON schemas with `name`, `description`, `parameters`. Supports enum extraction via `(choices: [...])` blocks; handles union types, arrays, and tuples with `prefixItems`.

<a id="g13-f033"></a>
### MCPClient accepts either stdio parameters or dicts with "transport" key (streamable-http or sse). Issues FutureWarnin…

`src/smolagents/mcp_client.py:85-122` @ e8b988d

`src/smolagents/mcp_client.py:85-122` — `MCPClient` accepts either stdio parameters or dicts with `"transport"` key (streamable-http or sse). Issues `FutureWarning` that `structured_output` default will change from `False` to `True` in v1.25.

## Patterns worth porting

<a id="g13-f034"></a>
### Callback registry keyed by MemoryStep class type

`src/smolagents/agents.py:416-434` @ e8b988d

`src/smolagents/agents.py:416-434` — **Callback registry keyed by MemoryStep class type.** `step_callbacks[ActionStep]`, `step_callbacks[PlanningStep]`, etc. enable selective instrumentation per step kind without monolithic if/else dispatch. Combined with `inspect.signature` at `src/smolagents/memory.py:280-317` for backwards-compatible multi-argument callback contracts.

<a id="g13-f035"></a>
### MemoryStep polymorphism with to_messages() contract

`src/smolagents/memory.py:42-150` @ e8b988d

`src/smolagents/memory.py:42-150` — **MemoryStep polymorphism with `to_messages()` contract.** Each step type (`ActionStep`, `PlanningStep`, `TaskStep`, `SystemPromptStep`, `FinalAnswerStep`) implements `to_messages()` that reconstructs its own `ChatMessage` sequence for context reinjection. Agent replays history without storing raw model exchanges.

<a id="g13-f036"></a>
### SafeSerializer prefix pattern

`src/smolagents/remote_executors.py:115-131` @ e8b988d

`src/smolagents/remote_executors.py:115-131` — **SafeSerializer prefix pattern.** Serialize variables as a prefixed string (`"safe:"` / `"pickle:"`), transmit and deserialize in a single code block sent to the remote executor, with `allow_pickle` baked into the generated deserializer code at generation time. Decouples serialization policy from deserialization discovery.

<a id="g13-f037"></a>
### Executor factory pattern

`src/smolagents/agents.py:1598-1618` @ e8b988d

`src/smolagents/agents.py:1598-1618` — **Executor factory pattern.** `create_python_executor()` routes to `LocalPythonExecutor` or remote variants (Blaxel/E2B/Modal/Docker) based on `executor_type` enum. `cleanup()` ensures resource release. Runtime selection without agent template changes.

<a id="g13-f038"></a>
### WebSocket Jupyter kernel protocol for async execution tracking

`src/smolagents/remote_executors.py:450-525` @ e8b988d

`src/smolagents/remote_executors.py:450-525` — **WebSocket Jupyter kernel protocol for async execution tracking.** Send UUID-stamped `execute_request`, loop filtering incoming messages by `parent_header.msg_id` until `status == "idle"`, handle stream/execute_result/error/status types with early exit on `FinalAnswerException`. Clean protocol implementation with explicit message-type dispatch.

<a id="g13-f039"></a>
### Operation counting for runaway detection

`src/smolagents/local_python_executor.py:1444-1449` @ e8b988d

`src/smolagents/local_python_executor.py:1444-1449` — **Operation counting for runaway detection.** Each AST node evaluation increments a counter in the state dict; exceeding `MAX_OPERATIONS` (10M) raises an error mentioning infinite loops. Simpler than instrumentation; catches loops and recursive calls at evaluation level.

<a id="g13-f040"></a>
### Managed agent bootstrapping from parent

`src/smolagents/agents.py:369-388` @ e8b988d

`src/smolagents/agents.py:369-388` — **Managed agent bootstrapping from parent.** `inputs`/`output_type` set at parent init time, not at child construction. Enables parent to standardize child interface without modifying child code.

<a id="g13-f041"></a>
### Centralized parameter preparation

`src/smolagents/models.py:452-551` @ e8b988d

`src/smolagents/models.py:452-551` — **Centralized parameter preparation.** Single method handles message conversion, role translation, tool schema generation, and kwarg merging. Callers pass minimal args; preparation normalizes for downstream APIs (OpenAI, Bedrock, vLLM, etc.).

<a id="g13-f042"></a>
### Composable retry/rate-limit pattern

`src/smolagents/utils.py:497-607` @ e8b988d

`src/smolagents/utils.py:497-607` — **Composable retry/rate-limit pattern.** `RateLimiter` (fixed interval or disabled) and `Retrying` (exponential backoff + predicate + logging hooks) are separate concerns combined at model init. Predicate-based retry enables provider-agnostic conditions.

<a id="g13-f043"></a>
### Augmented assignment via uniform set_value

`src/smolagents/local_python_executor.py:668-707` @ e8b988d

`src/smolagents/local_python_executor.py:668-707` — **Augmented assignment via uniform set_value.** Fetch current value (from state/subscript/attribute), apply operation, use `set_value` uniformly across names, tuples, subscripts, and attributes. Avoids code duplication across `+=` `-=` `*=` etc.

<a id="g13-f044"></a>
### Layered function lookup with close-match suggestions

`src/smolagents/local_python_executor.py:825-918` @ e8b988d

`src/smolagents/local_python_executor.py:825-918` — **Layered function lookup with close-match suggestions.** `evaluate_call` dispatch: state → static_tools → custom_tools → ERRORS, with `difflib` close-match suggestions for LLM debugging of typos.

<a id="g13-f045"></a>
### AST visitor with in_method context flag

`src/smolagents/tool_validation.py:172-224` @ e8b988d

`src/smolagents/tool_validation.py:172-224` — **AST visitor with `in_method` context flag.** `ClassLevelChecker` uses a single visitor with a boolean flag to distinguish class-level vs method-level checks, separating concerns without duplication.

<a id="g13-f046"></a>
### Dual-mode serialization with explicit fallback

`src/smolagents/serialization.py:267-292` @ e8b988d

`src/smolagents/serialization.py:267-292` — **Dual-mode serialization with explicit fallback.** JSON-safe is primary; pickle is opt-in with `FutureWarning`. Prefix tagging enables router/deserializer to auto-detect format without guessing.

<a id="g13-f047"></a>
### Model factory with provider branching

`src/smolagents/cli.py:188-216` @ e8b988d

`src/smolagents/cli.py:188-216` — **Model factory with provider branching.** `load_model()` centralizes model instantiation across OpenAI, LiteLLM, Transformers, and `InferenceClient`, each with distinct configuration (api_key source, api_base, device_map). Swappable at runtime without agent template changes.

<a id="g13-f048"></a>
### Composable TokenUsage and Timing dataclasses

`src/smolagents/monitoring.py:36-79` @ e8b988d

`src/smolagents/monitoring.py:36-79` — **Composable `TokenUsage` and `Timing` dataclasses.** `TokenUsage` auto-computes `total_tokens` in `__post_init__`; `Timing.duration` is a lazy property. Both provide `.dict()` for JSON export, decoupling observation from representation.

<a id="g13-f049"></a>
### Model capability detection by regex name matching

`src/smolagents/models.py:418-438` @ e8b988d

`src/smolagents/models.py:418-438` — **Model capability detection by regex name matching.** `supports_stop_parameter()` regex-matches model names (`o3*`, `o4*`, `gpt-5*`, `grok-*`) to conditionally include/exclude stop sequences, enabling provider-agnostic capability queries without a registry.

## Open threads / weak spots

<a id="g13-f050"></a>
### Remote code execution and managed agents are mutually exclusive

`src/smolagents/agents.py:1608-1609` @ e8b988d

`src/smolagents/agents.py:1608-1609` — Remote code execution and managed agents are mutually exclusive: raises `Exception` if both present. No fallback, queuing, or graceful degradation is defined. Hard architectural constraint with no escape hatch.

<a id="g13-f051"></a>
### HACK in fix_final_answer_code

`src/smolagents/local_python_executor.py:340-344` @ e8b988d

`src/smolagents/local_python_executor.py:340-344` — HACK in `fix_final_answer_code`: if `final_answer()` is not called in the code block, the function skips rewriting to avoid breaking LLM memory, but leaves `"final_answer = ..."` assignments unfixed. Creates inconsistency if the LLM later calls `final_answer()`.

<a id="g13-f052"></a>
### provide_run_summary flag appends raw memory messages without pagination or size guard. For long traces, output may ex…

`src/smolagents/agents.py:867-890` @ e8b988d

`src/smolagents/agents.py:867-890` — `provide_run_summary` flag appends raw memory messages without pagination or size guard. For long traces, output may exceed context window with no truncation warning. (Also `src/smolagents/agents.py:976-979` — `step_callbacks` and `final_answer_checks` are not serialized in `to_dict()`; silently dropped on `agent.save()` round-trip.)

<a id="g13-f053"></a>
### step_callbacks and final_answer_checks are explicitly not serialized in to_dict() ; agent.save() silently drops these…

`src/smolagents/agents.py:976-979` @ e8b988d

`src/smolagents/agents.py:976-979` — `step_callbacks` and `final_answer_checks` are explicitly not serialized in `to_dict()`; `agent.save()` silently drops these, making serialized agents non-equivalent to in-memory ones.

<a id="g13-f054"></a>
### Tool validation requires __init__ parameters to have defaults but does not enforce that class attributes are initiali…

`src/smolagents/tool_validation.py:160-161` @ e8b988d

`src/smolagents/tool_validation.py:160-161` — Tool validation requires `__init__` parameters to have defaults but does not enforce that class attributes are initialized by those defaults; class attribute may be declared but never actually set, creating gotchas for tool reuse across sessions.

<a id="g13-f055"></a>
### _create_kernel_http logs error_details (including request body) without truncation on non-201 status. Large tool defi…

`src/smolagents/remote_executors.py:532-548` @ e8b988d

`src/smolagents/remote_executors.py:532-548` — `_create_kernel_http` logs `error_details` (including request body) without truncation on non-201 status. Large tool definitions in request bodies could flood logs.

<a id="g13-f056"></a>
### Safety check prevents assignment to names in static_tools but custom_tools can be overwritten silently; no protection…

`src/smolagents/local_python_executor.py:802-804` @ e8b988d

`src/smolagents/local_python_executor.py:802-804` — Safety check prevents assignment to names in `static_tools` but `custom_tools` can be overwritten silently; no protection if a tool name collides with a control flow variable.

<a id="g13-f057"></a>
### FutureWarning for structured_output default change fires only once per process at MCPClient.__init__ ; users who don'…

`src/smolagents/mcp_client.py:92-101` @ e8b988d

`src/smolagents/mcp_client.py:92-101` — `FutureWarning` for `structured_output` default change fires only once per process at `MCPClient.__init__`; users who don't see the first instantiation output may miss the version dependency for v1.25.

<a id="g13-f058"></a>
### return_full_code() concatenates all code actions with "\n\n" separator without verifying they form valid Python or de…

`src/smolagents/memory.py:273-277` @ e8b988d

`src/smolagents/memory.py:273-277` — `return_full_code()` concatenates all code actions with `"\n\n"` separator without verifying they form valid Python or detecting duplicate variable definitions across steps. May produce syntactically incorrect combined scripts.

<a id="g13-f059"></a>
### Gradio compatibility check uses gr.__version__.startswith("5") to toggle type="messages" kwarg. Brittle string-based …

`src/smolagents/gradio_ui.py:435-450` @ e8b988d

`src/smolagents/gradio_ui.py:435-450` — Gradio compatibility check uses `gr.__version__.startswith("5")` to toggle `type="messages"` kwarg. Brittle string-based version detection with no explicit version range or deprecation warning for breaking changes between Gradio 5 and 6.

<a id="g13-f060"></a>
### InferenceClientModel structured outputs silently fail or are rejected for providers other than Cerebras/Fireworks; no…

`src/smolagents/models.py:1561-1565` @ e8b988d

`src/smolagents/models.py:1561-1565` — `InferenceClientModel` structured outputs silently fail or are rejected for providers other than Cerebras/Fireworks; no graceful fallback.

<a id="g13-f061"></a>
### Deserialize logic duplicates JSON-to-Python conversion from SafeSerializer but lacks access to the full serializer mo…

`src/smolagents/remote_executors.py:306-332` @ e8b988d

`src/smolagents/remote_executors.py:306-332` — Deserialize logic duplicates JSON-to-Python conversion from `SafeSerializer` but lacks access to the full serializer module at remote sites; couples format to serializer API.

<a id="g13-f062"></a>
### check_safer_result validates evaluation results don't leak dangerous modules/functions, but shows the analogous assig…

`src/smolagents/local_python_executor.py:156-183` @ e8b988d

`src/smolagents/local_python_executor.py:156-183` — `check_safer_result` validates evaluation results don't leak dangerous modules/functions, but `src/smolagents/local_python_executor.py:802-804` shows the analogous assignment guard is incomplete for `custom_tools`.

<a id="g13-f063"></a>
### Dataclass deserialization returns a dict with __dataclass__ and __module__ keys instead of reconstructing the class; …

`src/smolagents/serialization.py:239-245` @ e8b988d

`src/smolagents/serialization.py:239-245` — Dataclass deserialization returns a dict with `__dataclass__` and `__module__` keys instead of reconstructing the class; class is not available in remote context, so round-trip fidelity is partial.

<a id="g13-f064"></a>
### TODO

`src/smolagents/_function_type_hints_utils.py:22` @ e8b988d

`src/smolagents/_function_type_hints_utils.py:22` — TODO: type hint utilities are duplicated from the `transformers` repository; centralization in `huggingface_hub` would reduce maintenance burden.

