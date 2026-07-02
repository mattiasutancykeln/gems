# crewAI

| | |
|---|---|
| Source | https://github.com/crewAIInc/crewAI |
| Repo | https://github.com/crewAIInc/crewAI @ `da8fe8c7157bf93db67be70357c214047adb6c10` |
| Kind | repo |
| Topics | agent |
| License | MIT (permissive) |
| Verdict | - |
| Findings | 72 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/16 |

## Implementation decisions

<a id="g16-f001"></a>
### Parallel batch tool execution via ThreadPoolExecutor

`crew_agent_executor.py:647-765` @ da8fe8c

`crew_agent_executor.py:647-765` — Parallel batch tool execution via `ThreadPoolExecutor`: executes first tool call sequentially with reflection, batches subsequent calls (max_workers = min(8, batch_size)), preserves `contextvars.copy_context().run()` for async-local state, falls back to sequential on `result_as_answer` or `max_usage_count` constraints, injects a reasoning-reflection prompt after batch completes.

<a id="g16-f002"></a>
### Dual execution path selection

`crew_agent_executor.py:315-325` @ da8fe8c

`crew_agent_executor.py:315-325` — Dual execution path selection: checks LLM's `supports_function_calling()` to branch to native tools or ReAct; allows graceful fallback when native tool APIs are unavailable.

<a id="g16-f003"></a>
### Task execution interleaves async and sync tasks

`crew.py:1508-1577` @ da8fe8c

`crew.py:1508-1577` — Task execution interleaves async and sync tasks: async tasks accumulate into a `futures` list as `(task, asyncio.Task, task_index)` triples; each sync task flushes prior futures before executing, enabling tail parallelism while preserving context propagation order.

<a id="g16-f004"></a>
### Checkpoint restoration

`crew.py:371-388` @ da8fe8c

`crew.py:371-388` / `base_agent.py:362-403` — Checkpoint restoration: `from_checkpoint()` loads `RuntimeState`, re-applies `ExecutionContext` (task IDs, flow scopes, event stack, emission counters) via `apply_execution_context()`; `base_agent.py` rebuilds event-scope stack from checkpoint record and rebinds memory views; enables mid-run resume without losing trace continuity.

<a id="g16-f005"></a>
### Per-guardrail retry state via _guardrail_retry_counts

`task.py:269-275` @ da8fe8c

`task.py:269-275` — Per-guardrail retry state via `_guardrail_retry_counts: dict[int, int]` (keyed by guardrail index), allowing independent retry budgets for each validator in a parallel guardrail array rather than a shared counter.

<a id="g16-f006"></a>
### Guardrail invocation in separate sync/async branches ( _invoke_guardrail_function / _ainvoke_guardrail_function ), ea…

`task.py:1246-1353` @ da8fe8c

`task.py:1246-1353` — Guardrail invocation in separate sync/async branches (`_invoke_guardrail_function` / `_ainvoke_guardrail_function`), each looping up to `guardrail_max_retries`, re-executing the agent task on validation failure with error context injected as a new conversation turn.

<a id="g16-f007"></a>
### Tool injection pipeline chains delegation, platform, MCP, memory, and file sources via _merge_tools() deduplication, …

`crew.py:1595-1662` @ da8fe8c

`crew.py:1595-1662` — Tool injection pipeline chains delegation, platform, MCP, memory, and file sources via `_merge_tools()` deduplication, composing agent capabilities without order-sensitive merging.

<a id="g16-f008"></a>
### A2A delegation adapter

`lite_agent.py:108-180` @ da8fe8c

`lite_agent.py:108-180` — A2A delegation adapter: converts kickoff messages to a fake `Task`, delegates via `_execute_task_with_a2a()`, unwraps result back to `LiteAgentOutput`, isolating A2A plumbing from the core agent loop.

<a id="g16-f009"></a>
### Condition evaluation occurs in parent, not child

`conditional_task.py:41-55` @ da8fe8c

`conditional_task.py:41-55` — Condition evaluation occurs in parent, not child: parent calls `should_execute(context)` with previous `TaskOutput`, enabling synchronous workflow branching without spawning conditional sub-agents.

<a id="g16-f010"></a>
### Thread pool injection of coroutines into sync contexts

`llm_guardrail.py:24-36` @ da8fe8c

`llm_guardrail.py:24-36` — Thread pool injection of coroutines into sync contexts: when an async agent is called from synchronous orchestrator code, spawns a single-worker `ThreadPoolExecutor` and submits `asyncio.run()` inside, avoiding event-loop conflicts.

<a id="g16-f011"></a>
### , 598-607

`base_agent.py:587-596` @ da8fe8c

`base_agent.py:587-596, 598-607` — Multi-pass post-validation via three stacked `@model_validator(mode="after")` calls that construct RPM controller, token processor, and memory resolution in order, each idempotent.

<a id="g16-f012"></a>
### Plan tracking via dependency DAG

`lite_agent_output.py:50-81` @ da8fe8c

`lite_agent_output.py:50-81` — Plan tracking via dependency DAG: `TodoExecutionResult` captures `step_number` and explicit `depends_on` list, enabling parent orchestrators to track execution order and detect blocked steps without querying child state.

<a id="g16-f013"></a>
### Replan instrumentation

`lite_agent_output.py:54-59` @ da8fe8c

`lite_agent_output.py:54-59` — Replan instrumentation: `replan_count` and `last_replan_reason` fields allow orchestrators to decide whether to escalate a replanning failure or fall back to alternative strategies without re-executing the agent.

<a id="g16-f014"></a>
### Plugin hook for output validation

`tasks/hallucination_guardrail.py:95-96` @ da8fe8c

`tasks/hallucination_guardrail.py:95-96` — Plugin hook for output validation: module-level `_validate_output_hook` callable is a no-op in open-source; premium backend injects validation at import time without subclassing.

<a id="g16-f015"></a>
### Template variable interpolation with snapshot

`base_agent.py:704-721` @ da8fe8c

`base_agent.py:704-721` — Template variable interpolation with snapshot: saves original role/goal/backstory in private attrs before variable substitution, enabling re-parameterization across task runs.

## Skills, prompts, tools

<a id="g16-f016"></a>
### Polymorphic tool-call parsing

`crew_agent_executor.py:789-821` @ da8fe8c

`crew_agent_executor.py:789-821` — Polymorphic tool-call parsing: handles OpenAI `function`, Anthropic `tool_use`, and generic `name`+`input` dict/object formats with a fallback chain, extracting call ID, function name, and arguments uniformly.

<a id="g16-f017"></a>
### Tool execution with hooks and caching

`crew_agent_executor.py:848-1044` @ da8fe8c

`crew_agent_executor.py:848-1044` — Tool execution with hooks and caching: wraps execution in before/after hook context, checks `result_as_answer` and `max_usage_count`, conditionally caches results via `cache_function()` callback, emits `ToolUsageStartedEvent` / `ToolUsageFinishedEvent` / `ToolUsageErrorEvent`.

<a id="g16-f018"></a>
### Cache breakpoint placement

`crew_agent_executor.py:179-201` @ da8fe8c

`crew_agent_executor.py:179-201` — Cache breakpoint placement: system prompt marked with `mark_cache_breakpoint()` (stable per agent), user prompt marked separately (stable per task across ReAct loop), enabling LLM context caching at semantic boundaries.

<a id="g16-f019"></a>
### Prompt composition via slice stacking

`prompts.py:74-115` @ da8fe8c

`prompts.py:74-115` — Prompt composition via slice stacking: selects task component (`task` | `native_task` | `task_no_tools`) based on tool availability and function-calling mode, then renders system+user templates or standard flat prompt depending on `use_system_prompt` flag.

<a id="g16-f020"></a>
### Skill context block injected as stable XML block in system prompt where cache prefixes survive ReAct loops, formatted…

`prompts.py:117-133` @ da8fe8c

`prompts.py:117-133` — Skill context block injected as stable XML block in system prompt where cache prefixes survive ReAct loops, formatted via `format_skill_context()`.

<a id="g16-f021"></a>
### System prompt template with conditional tool inclusion

`lite_agent.py:787-823` @ da8fe8c

`lite_agent.py:787-823` — System prompt template with conditional tool inclusion: `lite_agent_system_prompt_with_tools` includes tool schema and names; `lite_agent_system_prompt_without_tools` for tool-free agents; response format schema appended as JSON schema block.

<a id="g16-f022"></a>
### Agent loop ( _invoke_loop )

`lite_agent.py:857-969` @ da8fe8c

`lite_agent.py:857-969` — Agent loop (`_invoke_loop`): runs LLM, parses action/finish via `process_llm_response()`, executes tool via `execute_tool_and_check_finality()`, handles errors (context length, parser, max iterations) with recovery paths, increments iteration counter in finally block.

<a id="g16-f023"></a>
### Guardrail prompt contract

`llm_guardrail.py:77-91` @ da8fe8c

`llm_guardrail.py:77-91` — Guardrail prompt contract: explicit instruction set (`Confirm if`, `If not, provide clear feedback`, `Focus only on identifying issues`) prevents the validator agent from proposing corrections, narrowing its action space to a boolean + feedback tuple.

<a id="g16-f024"></a>
### Task prompt assembly

`task.py:890-980` @ da8fe8c

`task.py:890-980` — Task prompt assembly: injects trigger payload, auto-detected multimodal files, tool-gated vs. auto-injected file list, and markdown formatting instructions as conditional prompt slices.

<a id="g16-f025"></a>
### Delegation tools with dynamically formatted descriptions listing available coworker roles, surfacing agent roster to …

`tools/agent_tools/agent_tools.py:22-36` @ da8fe8c

`tools/agent_tools/agent_tools.py:22-36` — Delegation tools with dynamically formatted descriptions listing available coworker roles, surfacing agent roster to the LLM at invocation time to improve targeting accuracy.

<a id="g16-f026"></a>
### DelegateWorkToolSchema with three required fields

`tools/agent_tools/delegate_work_tool.py:8-13` @ da8fe8c

`tools/agent_tools/delegate_work_tool.py:8-13` — `DelegateWorkToolSchema` with three required fields: `task`, `context`, `coworker`; separates work description from agent selection and execution context.

<a id="g16-f027"></a>
### Mirrors delegation schema with question , context , coworker ; parallel structure ensures consistent inter-agent comm…

`tools/agent_tools/ask_question_tool.py:8-11` @ da8fe8c

`tools/agent_tools/ask_question_tool.py:8-11` — Mirrors delegation schema with `question`, `context`, `coworker`; parallel structure ensures consistent inter-agent communication patterns.

<a id="g16-f028"></a>
### Memory recall and injection

`lite_agent.py:553-597` @ da8fe8c

`lite_agent.py:553-597` — Memory recall and injection: emits `MemoryRetrievalStartedEvent`, recalls 10 matches on user content, formats as i18n block, injects into first system message.

<a id="g16-f029"></a>
### Crew planning injects per-task plans via i18n lookup, building plan_map[task_number] = step.plan and appending to des…

`crew.py:1406-1432` @ da8fe8c

`crew.py:1406-1432` — Crew planning injects per-task plans via i18n lookup, building `plan_map[task_number] = step.plan` and appending to description before execution.

<a id="g16-f030"></a>
### Response model injection

`crew_agent_executor.py:357-367` @ da8fe8c

`crew_agent_executor.py:357-367` — Response model injection: when no tools available, accepts `response_model` from executor and passes to LLM; falls back to string parsing when tools present.

<a id="g16-f031"></a>
### Todo result schema flattens plan step into discrete fields ( step_number , description , tool_used , status , result …

`lite_agent_output.py:13-28` @ da8fe8c

`lite_agent_output.py:13-28` — Todo result schema flattens plan step into discrete fields (`step_number`, `description`, `tool_used`, `status`, `result`, `depends_on`) for downstream orchestrator parsing without prose.

<a id="g16-f032"></a>
### Polymorphic output accessor

`task_output.py:85-97` @ da8fe8c

`task_output.py:85-97` — Polymorphic output accessor: `to_dict()` prioritizes `json_dict` over `pydantic.model_dump()`, letting tasks declare preferred serialization while orchestrators always see a dict interface.

<a id="g16-f033"></a>
### , 255-257

`base_agent.py:251-254` @ da8fe8c

`base_agent.py:251-254, 255-257` — Agent delegation and tool access declaration: `allow_delegation` bool and abstract `get_delegation_tools()` / `get_mcp_tools()` / `get_platform_tools()` define how agents acquire tools for inter-agent communication and enterprise integrations.

<a id="g16-f034"></a>
### Memory scope binding via discriminator

`base_agent.py:338-352` @ da8fe8c

`base_agent.py:338-352` — Memory scope binding via discriminator: memory field accepts `True` (default), `False` (none), or discriminated union of `Memory | MemoryScope | MemorySlice` with automatic resolution in post-validator.

## Patterns worth porting

<a id="g16-f035"></a>
### Parallel tool execution scaffold with finality checks

`crew_agent_executor.py:706-764` @ da8fe8c

`crew_agent_executor.py:706-764` — Parallel tool execution scaffold with finality checks: `ThreadPoolExecutor` batch with `contextvars.copy_context().run()` preserving async-local state, fallback to sequential on first result with `result_as_answer`, post-batch reasoning-prompt injection for LLM reflection. Drop-in pattern for any multi-tool agent loop.

<a id="g16-f036"></a>
### Delegation execution contract

`tools/agent_tools/base_agent_tools.py:46-125` @ da8fe8c

`tools/agent_tools/base_agent_tools.py:46-125` — Delegation execution contract: accepts (agent_name, task description, context), performs case-insensitive role matching, catches agent-lookup and execution errors, returns string result or error message. Orchestration-agnostic; portable to other multi-agent frameworks.

<a id="g16-f037"></a>
### Catch-all validation wrapper returning (bool, Any) tuple

`llm_guardrail.py:98-119` @ da8fe8c

`llm_guardrail.py:98-119` — Catch-all validation wrapper returning `(bool, Any)` tuple: guardrails always succeed (never throw), returning `(False, error_string)` on exception; orchestrators can chain validations without try-catch nesting.

<a id="g16-f038"></a>
### Per-index retry tracking

`task.py:1257-1307` @ da8fe8c

`task.py:1257-1307` — Per-index retry tracking: guardrails in an array retain independent retry state via `dict[index] -> count`; on failure, re-execute agent with error context as conversation turn, not full restart.

<a id="g16-f039"></a>
### Checkpoint + context restoration

`crew.py:402-425` @ da8fe8c

`crew.py:402-425` — Checkpoint + context restoration: `from_checkpoint()` loads `RuntimeState`, re-applies `ExecutionContext` via `apply_execution_context()`, re-links agent executors to checkpoint state.

<a id="g16-f040"></a>
### Async/sync task interleaving

`crew.py:1335-1362` @ da8fe8c

`crew.py:1335-1362` — Async/sync task interleaving: collect async tasks, block on sync task, flush futures, repeat; enables tail-async while preserving context order with `(task, asyncio.Task, task_index)` triples.

<a id="g16-f041"></a>
### Tool deduplication on inject

`crew.py:1670-1688` @ da8fe8c

`crew.py:1670-1688` — Tool deduplication on inject: `_merge_tools()` maps by `sanitize_tool_name()`, filters existing by key membership, appends new; avoids duplicate tool names across delegation/platform/MCP/memory/file sources.

<a id="g16-f042"></a>
### A2A delegation adapter

`lite_agent.py:157-172` @ da8fe8c

`lite_agent.py:157-172` — A2A delegation adapter: wraps kickoff in fake `Task`, delegates via framework's task A2A machinery, returns result; isolates A2A protocol from core loop.

<a id="g16-f043"></a>
### Name sanitization pipeline

`tools/agent_tools/base_agent_tools.py:20-35` @ da8fe8c

`tools/agent_tools/base_agent_tools.py:20-35` — Name sanitization pipeline: normalizes whitespace, converts to lowercase, removes quotes in a single reusable method; apply to any schema field where LLM-produced identifiers need fuzzy matching.

<a id="g16-f044"></a>
### Skipped task placeholder

`conditional_task.py:57-68` @ da8fe8c

`conditional_task.py:57-68` — Skipped task placeholder: when a conditional branch is not taken, returns minimal `TaskOutput` with empty raw and matching agent/format rather than `None`; ensures downstream consumers see a uniform task result type.

<a id="g16-f045"></a>
### Coroutine executor dispatch pattern

`llm_guardrail.py:24-36` @ da8fe8c

`llm_guardrail.py:24-36` — Coroutine executor dispatch pattern: check for running loop, spawn thread pool with context vars copied, submit `asyncio.run()` inside; reusable for delegating async calls from sync orchestrator boundaries.

<a id="g16-f046"></a>
### Computed result properties for filtering

`lite_agent_output.py:89-102` @ da8fe8c

`lite_agent_output.py:89-102` — Computed result properties for filtering: `completed_todos`, `failed_todos`, and `had_plan` are properties rather than cached fields; orchestrators can inspect execution success without extra serialization fields.

<a id="g16-f047"></a>
### Event scope reconstruction after checkpoint restore

`base_agent.py:405-442` @ da8fe8c

`base_agent.py:405-442` — Event scope reconstruction after checkpoint restore: rebuilds stack of (event_id, event_type) tuples from checkpoint, re-establishes emission counter and `last_event_id` for tracing continuity.

<a id="g16-f048"></a>
### Three-mode prompt rendering

`prompts.py:150-181` @ da8fe8c

`prompts.py:150-181` — Three-mode prompt rendering: system-template mode (custom system+user templates), standard flat mode, or system-prompt mode (system/user split from slices) based on template presence.

<a id="g16-f049"></a>
### Fingerprint context injection

`crew_agent_executor.py:399-426` @ da8fe8c

`crew_agent_executor.py:399-426` — Fingerprint context injection: security config fingerprint bundled with tool execution for audit/compliance, passed through tool execution boundary.

<a id="g16-f050"></a>
### Post-execution summary injection via model validator

`task_output.py:50-59` @ da8fe8c

`task_output.py:50-59` — Post-execution summary injection via model validator: summary auto-derived from description on validation rather than computed at task definition, keeping output contract lightweight.

## Open threads / weak spots

<a id="g16-f051"></a>
### TODO

`task_output.py:72-73` @ da8fe8c

`task_output.py:72-73` — TODO: `json` property shadows Pydantic's `json()` method; requires refactor to `model_dump_json()` but unresolved due to API compatibility.

<a id="g16-f052"></a>
### TODO

`prompts.py:49` @ da8fe8c

`prompts.py:49` — TODO: "Need to refactor so that prompt is not tightly coupled to agent."

<a id="g16-f053"></a>
### TODO

`process.py:11` @ da8fe8c

`process.py:11` — TODO: `consensual = 'consensual'` process not implemented; only sequential and hierarchical supported.

<a id="g16-f054"></a>
### TODO in config validator

`crew.py:614` @ da8fe8c

`crew.py:614` — TODO in config validator: "Improve typing" for Json union; currently raw JSON string -> dict conversion.

<a id="g16-f055"></a>
### CrewAgentExecutor marked deprecated with migration warning to AgentExecutor ; unclear removal timeline or backward-co…

`crew_agent_executor.py:142-148` @ da8fe8c

`crew_agent_executor.py:142-148` — `CrewAgentExecutor` marked deprecated with migration warning to `AgentExecutor`; unclear removal timeline or backward-compat guarantees.

<a id="g16-f056"></a>
### Agent instantiation on every validation call

`llm_guardrail.py:69-96` @ da8fe8c

`llm_guardrail.py:69-96` — Agent instantiation on every validation call: creates a new `Agent` object inside `_validate_output()` instead of reusing a cached instance; tight-loop guardrail callers pay repeated initialization overhead.

<a id="g16-f057"></a>
### Task creation and execute_task are synchronous with no timeout, cancellation, or async backpressure; a delegated task…

`tools/agent_tools/base_agent_tools.py:112-120` @ da8fe8c

`tools/agent_tools/base_agent_tools.py:112-120` — Task creation and `execute_task` are synchronous with no timeout, cancellation, or async backpressure; a delegated task that runs indefinitely blocks the parent agent.

<a id="g16-f058"></a>
### _execute accepts context

`tools/agent_tools/base_agent_tools.py:46-48` @ da8fe8c

`tools/agent_tools/base_agent_tools.py:46-48` — `_execute` accepts `context: str | None` but passes it directly to `execute_task` without truncation; no safeguard against context strings exceeding model token limits.

<a id="g16-f059"></a>
### List-format coworker parsing ( [role1, role2, ...] ) assumes first element is the target; no error handling if list i…

`tools/agent_tools/base_agent_tools.py:38-44` @ da8fe8c

`tools/agent_tools/base_agent_tools.py:38-44` — List-format coworker parsing (`[role1, role2, ...]`) assumes first element is the target; no error handling if list is empty or malformed.

<a id="g16-f060"></a>
### Open-source version is a complete no-op for hallucination detection; no guidance on overriding _validate_output_hook …

`tasks/hallucination_guardrail.py:1-7` @ da8fe8c

`tasks/hallucination_guardrail.py:1-7` — Open-source version is a complete no-op for hallucination detection; no guidance on overriding `_validate_output_hook` for local validation strategies.

<a id="g16-f061"></a>
### _get_execution_start_index() returns first incomplete task or len(tasks) ; no gap detection for tasks with output but…

`crew.py:1503-1506` @ da8fe8c

`crew.py:1503-1506` — `_get_execution_start_index()` returns first incomplete task or `len(tasks)`; no gap detection for tasks with output but no event record.

<a id="g16-f062"></a>
### Memory rebinding in _rebind_memory_views() defers creating Memory() on first access if backing is None ; can lead to …

`crew.py:640-669` @ da8fe8c

`crew.py:640-669` — Memory rebinding in `_rebind_memory_views()` defers creating `Memory()` on first access if backing is `None`; can lead to late failures when `MemoryScope`/`MemorySlice` is accessed before `Memory` is created.

<a id="g16-f063"></a>
### output_file validation uses regex-based {var} template name checking; var.isidentifier() check insufficient for injec…

`task.py:507-531` @ da8fe8c

`task.py:507-531` — `output_file` validation uses regex-based `{var}` template name checking; `var.isidentifier()` check insufficient for injection (doesn't validate scope or reserved names).

<a id="g16-f064"></a>
### No fallback for missing condition

`conditional_task.py:24-26` @ da8fe8c

`conditional_task.py:24-26` — No fallback for missing condition: `should_execute()` raises `ValueError` if condition is `None`, but class definition allows `None` as default; parent must validate at task setup time.

<a id="g16-f065"></a>
### LiteAgent deprecated; split A2A setup and guardrail logic into two validators may cause order-of-operations issues du…

`lite_agent.py:183-186` @ da8fe8c

`lite_agent.py:183-186` — `LiteAgent` deprecated; split A2A setup and guardrail logic into two validators may cause order-of-operations issues during deprecation period.

<a id="g16-f066"></a>
### coerce_skill_strings validator converts non- @ -prefixed strings to Path objects silently; no error on missing paths,…

`base_agent.py:461-473` @ da8fe8c

`base_agent.py:461-473` — `coerce_skill_strings` validator converts non-`@`-prefixed strings to `Path` objects silently; no error on missing paths, no validation that files exist.

<a id="g16-f067"></a>
### Agent key property uses MD5 hash of role/goal/backstory for identity; no versioning or collision handling if agent de…

`base_agent.py:609-616` @ da8fe8c

`base_agent.py:609-616` — Agent `key` property uses MD5 hash of role/goal/backstory for identity; no versioning or collision handling if agent description changes mid-execution.

<a id="g16-f068"></a>
### set_skills() is a no-op stub; actual skill resolution likely happens in subclass or during prompt generation.

`base_agent.py:746-747` @ da8fe8c

`base_agent.py:746-747` — `set_skills()` is a no-op stub; actual skill resolution likely happens in subclass or during prompt generation.

<a id="g16-f069"></a>
### _is_tool_call_list() uses heuristic polymorphism checking multiple attribute patterns; no strict schema validation or…

`crew_agent_executor.py:614-645` @ da8fe8c

`crew_agent_executor.py:614-645` — `_is_tool_call_list()` uses heuristic polymorphism checking multiple attribute patterns; no strict schema validation or logging of unparseable tool calls.

<a id="g16-f070"></a>
### Training handler write path requires synchronous _train_iteration int on crew; no async variant or background flush.

`crew_agent_executor.py:1532-1580` @ da8fe8c

`crew_agent_executor.py:1532-1580` — Training handler write path requires synchronous `_train_iteration` int on crew; no async variant or background flush.

<a id="g16-f071"></a>
### last_replan_reason (singular) drops intermediate replan history; orchestrators cannot distinguish "agent oscillated t…

`lite_agent_output.py:54-59` @ da8fe8c

`lite_agent_output.py:54-59` — `last_replan_reason` (singular) drops intermediate replan history; orchestrators cannot distinguish "agent oscillated twice" from "agent replanned once" for budget/fallback decisions.

<a id="g16-f072"></a>
### query_knowledge() synchronous only; async variant aquery_knowledge() present but no integration into akickoff flow sh…

`crew.py:1937-1945` @ da8fe8c

`crew.py:1937-1945` — `query_knowledge()` synchronous only; async variant `aquery_knowledge()` present but no integration into `akickoff` flow shown.

