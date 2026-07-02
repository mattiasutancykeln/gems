# openai-agents-python

| | |
|---|---|
| Source | https://github.com/openai/openai-agents-python |
| Repo | https://github.com/openai/openai-agents-python @ `5a3028f37c74371606fd086c25ce05753d2b52de` |
| Kind | repo |
| Topics | agent |
| License | MIT (permissive) |
| Verdict | - |
| Findings | 113 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/12 |

## Implementation decisions

<a id="g12-f001"></a>
### Nested agent invocation via as_tool()

`src/agents/agent.py:599-912` @ 5a3028f

`src/agents/agent.py:599-912` — Nested agent invocation via `as_tool()`: Agents expose a formal tool interface enabling parent agents to invoke children. Fresh `ToolContext` isolates approval state per invocation; `tool_state_scope_id` tracks pending interruptions. Parent approval decisions mirror to nested runs when resuming, enforcing explicit parent-scoped validation before nested resume.

<a id="g12-f002"></a>
### Serializable pause/resume boundary

`src/agents/run_state.py:183-299` @ 5a3028f

`src/agents/run_state.py:183-299` — Serializable pause/resume boundary: `RunState` is a durable snapshot capturing context (with optional serializer/deserializer pair), usage, interruptions, model responses, generated items, and server-managed conversation state. Schema versioning (`CURRENT_SCHEMA_VERSION = "1.10"`) gates forward compatibility; older SDKs reject newer versions fail-fast.

<a id="g12-f003"></a>
### Approval inheritance bridge

`src/agents/agent.py:665-759` @ 5a3028f

`src/agents/agent.py:665-759` — Approval inheritance bridge: `_nested_approvals_status()` and `_apply_nested_approvals()` enforce unidirectional approval flow: parent approvals supersede nested decisions during resume. Uses a mirroring strategy matching approval records across tool name / namespace / lookup-key variants, avoiding duplicate prompts when parent already decided.

<a id="g12-f004"></a>
### Handoff input contract via HandoffInputData

`src/agents/handoffs/__init__.py:42-84` @ 5a3028f

`src/agents/handoffs/init.py:42-84` — Handoff input contract via `HandoffInputData`: Sealed data structure captures full transition context (input history, pre-handoff items, new items, optional filtered `input_items` for model feed) without mutation. The `clone()` method allows functional transforms. Separates session persistence (`new_items`) from model replay (`input_items`), enabling history filtering without losing audit trail.

<a id="g12-f005"></a>
### Streaming interruption semantics

`src/agents/result.py:445-606` @ 5a3028f

`src/agents/result.py:445-606` — Streaming interruption semantics: `RunResultStreaming` decouples run-loop background task from event consumption. `cancel(mode="after_turn")` signals graceful termination without immediate shutdown, allowing current turn to finish tool execution and session persistence. `_cancel_mode` instructs the loop to stop at turn boundary instead of aborting mid-execution.

<a id="g12-f006"></a>
### State reconstruction from result objects

`src/agents/result.py:71-124` @ 5a3028f

`src/agents/result.py:71-124` — State reconstruction from result objects: `_populate_state_from_result()` deterministically rebuilds `RunState` from `RunResult`, preserving turn counters, tool use snapshots, trace state, sandbox session state, and interruption state. Handles both `_generated_items` (model input) and `_model_input_items` (filtered replay input) when handoff filtering diverged history.

<a id="g12-f007"></a>
### Per-tool approval tracking

`src/agents/run_context.py:171-212` @ 5a3028f

`src/agents/run_context.py:171-212` — Per-tool approval tracking: `_ApprovalRecord` stores approval state as bool (global allow/deny) or list[str] (per-call-ID decisions), with rejection messages keyed by call_id. Permanent approvals take precedence over per-call granularity, avoiding repeated prompts for the same tool.

<a id="g12-f008"></a>
### Weak references for agent lifecycle

`src/agents/result.py:333-392` @ 5a3028f

`src/agents/result.py:333-392` — Weak references for agent lifecycle: `RunResult` stores agent via `weakref.ReferenceType` and falls back to weak lookup when strong reference is released, allowing memory reclamation without losing result usability.

<a id="g12-f009"></a>
### Input guardrails with parallel execution flag

`src/agents/guardrail.py:72-130` @ 5a3028f

`src/agents/guardrail.py:72-130` — Input guardrails with parallel execution flag: `run_in_parallel: bool` flag decouples execution timing from guardrail definition. Parallel guardrails run concurrently with agent; sequential ones block startup. Tripwire-triggered guardrails halt execution immediately.

<a id="g12-f010"></a>
### Output guardrails with agent identity capture

`src/agents/guardrail.py:145-185` @ 5a3028f

`src/agents/guardrail.py:145-185` — Output guardrails with agent identity capture: `OutputGuardrailResult` carries guardrail, agent, and output, enabling downstream handlers to correlate safety signals with agent identity and final state.

<a id="g12-f011"></a>
### Tool guardrail behaviors as explicit enums

`src/agents/tool_guardrails.py:40-117` @ 5a3028f

`src/agents/tool_guardrails.py:40-117` — Tool guardrail behaviors as explicit enums: Three closed discriminated unions (`AllowBehavior`, `RejectContentBehavior`, `RaiseExceptionBehavior`) with factory classmethods. No implicit retry or recovery; decision is final and transparent. Enables exhaustive pattern matching in downstream handlers.

<a id="g12-f012"></a>
### Tool-level specialized context

`src/agents/tool_guardrails.py:120-146` @ 5a3028f

`src/agents/tool_guardrails.py:120-146` — Tool-level specialized context: Tool guardrails receive `ToolContext` (exposing tool_call_id, tool_name, tool_arguments) rather than plain `RunContextWrapper`, decoupling tool-level checks from agent-level checks.

<a id="g12-f013"></a>
### Weak references decouple agent lifecycle from item lifecycle

`src/agents/items.py:101-125` @ 5a3028f

`src/agents/items.py:101-125` — Weak references decouple agent lifecycle from item lifecycle: `release_agent()` converts strong refs to weak refs to allow agent garbage collection without losing item identity, preserving dataclass repr/asdict compatibility. Critical for fleet control where many child agents must be releasable independent of their output items.

<a id="g12-f014"></a>
### Handoff tracking via dual agent references

`src/agents/items.py:265-330` @ 5a3028f

`src/agents/items.py:265-330` — Handoff tracking via dual agent references: `HandoffOutputItem` stores both source and target agents with weak refs, released together. Enables tracing agent-to-agent delegation without holding both agents in memory indefinitely.

<a id="g12-f015"></a>
### ToolApprovalItem uses object identity for tracking

`src/agents/items.py:501-629` @ 5a3028f

`src/agents/items.py:501-629` — `ToolApprovalItem` uses object identity for tracking: `hash` and `eq` based on object identity ensure distinct approval instances are tracked separately even if they reference the same raw call. Metadata (name, namespace, lookup_key) lazily populated from raw_item.

<a id="g12-f016"></a>
### Output-to-input normalization strips tool-search metadata

`src/agents/items.py:144-223` @ 5a3028f

`src/agents/items.py:144-223` — Output-to-input normalization strips tool-search metadata: `_output_item_to_input_item` centralizes hygiene so tool-search items (intermediate spans/exploration, `created_by`) are properly sanitized before re-injection into the model loop.

<a id="g12-f017"></a>
### ToolCallOutputItem strips hosted-tool output-only fields on replay

`src/agents/items.py:389-442` @ 5a3028f

`src/agents/items.py:389-442` — `ToolCallOutputItem` strips hosted-tool output-only fields on replay: `to_input_item()` removes status, shell_output, provider_data before sending back to model. Hygiene maintained consistently during model re-injection.

<a id="g12-f018"></a>
### Compaction as first-class item type

`src/agents/items.py:485-492` @ 5a3028f

`src/agents/items.py:485-492` — Compaction as first-class item type: Compaction items carry verbatim raw input; `to_input_item()` returns unmodified, enabling clean separation between response compression and replay safety.

<a id="g12-f019"></a>
### Conditional output schema wrapping

`src/agents/agent_output.py:79-120` @ 5a3028f

`src/agents/agent_output.py:79-120` — Conditional output schema wrapping: Wrapping only applies to types that cannot be JSON Schema objects; non-wrapping for `BaseModel | dict` preserves flat structure. Wrapped types go into a synthetic `{"response": <output>}` dict. Errors attach span diagnostics (`SpanError`) before raising.

<a id="g12-f020"></a>
### Dual hook architecture at run and agent level

`src/agents/lifecycle.py:13-182` @ 5a3028f

`src/agents/lifecycle.py:13-182` — Dual hook architecture at run and agent level: `RunHooksBase` observes all agents in the run; `AgentHooksBase` fires only for the specific agent. Both support LLM and tool boundaries (`on_llm_start`, `on_llm_end`, `on_tool_start`, `on_tool_end`, `on_handoff`). Enables cross-agent telemetry and agent-specific subscriptions without tight coupling.

<a id="g12-f021"></a>
### Scoped tool call signatures for nested result isolation

`src/agents/agent_tool_state.py:52-70` @ 5a3028f

`src/agents/agent_tool_state.py:52-70` — Scoped tool call signatures for nested result isolation: Optional `scope_id` prevents collisions when the same tool call is replayed across independent execution contexts.

<a id="g12-f022"></a>
### Tool call lifetimes tracked via weak references with GC callbacks

`src/agents/agent_tool_state.py:119-129` @ 5a3028f

`src/agents/agent_tool_state.py:119-129` — Tool call lifetimes tracked via weak references with GC callbacks: Automatic cleanup of nested run result caches when tool call objects are no longer referenced, without explicit lease management.

<a id="g12-f023"></a>
### Computer instances cached per (ComputerTool, RunContext) pair

`src/agents/tool.py:650-701` @ 5a3028f

`src/agents/tool.py:650-701` — Computer instances cached per `(ComputerTool, RunContext)` pair: Nested weak dictionaries enable per-context resource caching with automatic cascading cleanup; optional `ComputerProvider` lifecycle hooks for per-run init and cleanup.

<a id="g12-f024"></a>
### Runtime type inspection for context parameter downgrade

`src/agents/tool.py:1649-1680` @ 5a3028f

`src/agents/tool.py:1649-1680` — Runtime type inspection for context parameter downgrade: Context parameter annotations inspected at runtime to transparently downgrade from rich `ToolContext` to base `RunContextWrapper` when tool code declares narrower contracts, preventing metadata leakage.

<a id="g12-f025"></a>
### Timeout enforcement via asyncio.wait_for with early recovery

`src/agents/tool.py:1683-1724` @ 5a3028f

`src/agents/tool.py:1683-1724` — Timeout enforcement via `asyncio.wait_for` with early recovery: Recovers before timeout fires if task completes, avoiding orphaned background tasks; timeout messages and exceptions routed through separate error handlers.

<a id="g12-f026"></a>
### Eager usage aggregation per request

`src/agents/usage.py:157-215` @ 5a3028f

`src/agents/usage.py:157-215` — Eager usage aggregation per request: Request usage entries appended per aggregation rather than reconstructed retroactively, preserving nested token details through multi-level rollup chains.

<a id="g12-f027"></a>
### Model input filtering hook via CallModelData

`src/agents/run_config.py:56-62` @ 5a3028f

`src/agents/run_config.py:56-62` — Model input filtering hook via `CallModelData`: Bundles agent, context, and prepared model input (instructions + items) for `call_model_input_filter`, allowing per-turn modification (e.g., token-budget truncation) without rebuilding the entire run pipeline.

<a id="g12-f028"></a>
### Pre-model-call filter for input optimization

`src/agents/run_config.py:290-298` @ 5a3028f

`src/agents/run_config.py:290-298` — Pre-model-call filter for input optimization: `call_model_input_filter: CallModelInputFilter` returns possibly modified `ModelInputData`. Enables token-budget enforcement, system-prompt injection, or input restructuring without altering core run loop.

<a id="g12-f029"></a>
### Tool error message customization

`src/agents/run_config.py:300-304` @ 5a3028f

`src/agents/run_config.py:300-304` — Tool error message customization: `tool_error_formatter: ToolErrorFormatter` formats "approval_rejected" or "tool_not_found" errors returned to the model, allowing operator-facing error messages to be context-aware.

<a id="g12-f030"></a>
### Lazy transcript summarization for nested agents

`src/agents/handoffs/history.py:71-112` @ 5a3028f

`src/agents/handoffs/history.py:71-112` — Lazy transcript summarization for nested agents: `nest_handoff_history()` collapses prior turns into a single assistant message when handoff history nesting is enabled, filtering summary-only items (tool calls/outputs/reasoning) from next-agent input while preserving them in session.

<a id="g12-f031"></a>
### Handoff as first-class streaming event

`src/agents/stream_events.py:29-42` @ 5a3028f

`src/agents/stream_events.py:29-42` — Handoff as first-class streaming event: `"handoff_requested"` and `"handoff_occured"` event pair tracks handoff lifecycle as a distinct control-flow primitive, not a tool side-effect.

<a id="g12-f032"></a>
### Error handlers accept MaybeAwaitable return types

`src/agents/run_error_handlers.py:44-47` @ 5a3028f

`src/agents/run_error_handlers.py:44-47` — Error handlers accept `MaybeAwaitable` return types: Allows flexible sync/async error recovery. Generic over context type `TContext`, decoupling error handling from run semantics.

<a id="g12-f033"></a>
### Immutable input filters via .clone()

`src/agents/extensions/handoff_filters.py:51-56` @ 5a3028f

`src/agents/extensions/handoff_filters.py:51-56` — Immutable input filters via `.clone()`: `HandoffInputData.clone()` used rather than mutation, preserving all upstream state and allowing chained filters to compose safely without side-effects.

<a id="g12-f034"></a>
### ToolContext extends RunContextWrapper with namespace-qualified tool identity

`src/agents/tool_context.py:36-171` @ 5a3028f

`src/agents/tool_context.py:36-171` — `ToolContext` extends `RunContextWrapper` with namespace-qualified tool identity: Optional agent/run_config references; `from_agent_context` factory preserves scope metadata and tool call state across context boundaries.

<a id="g12-f035"></a>
### tool_namespace() applies namespace metadata as a group

`src/agents/tool.py:1249-1272` @ 5a3028f

`src/agents/tool.py:1249-1272` — `tool_namespace()` applies namespace metadata as a group: Copies tools and binds `_tool_namespace` / `_tool_namespace_description` for Responses API tool search grouping without modifying originals.

<a id="g12-f036"></a>
### Responses-only validation gate

`src/agents/tool.py:1340-1366` @ 5a3028f

`src/agents/tool.py:1340-1366` — Responses-only validation gate: Ensures deferred tools, namespaced tools, and tool_search are declared together; rejects incomplete configurations upfront before allowing execution.

<a id="g12-f037"></a>
### Declarative structured tool input resolution

`src/agents/agent_tool_input.py:79-108` @ 5a3028f

`src/agents/agent_tool_input.py:79-108` — Declarative structured tool input resolution: Optional `StructuredInputSchemaInfo` (summary | json_schema) and optional async `input_builder`. Fallback chain guarantees success: custom builder -> default markdown builder -> JSON dump.

<a id="g12-f038"></a>
### Two-phase structured tool output validation

`src/agents/items.py:776-817` @ 5a3028f

`src/agents/items.py:776-817` — Two-phase structured tool output validation: `_maybe_get_output_as_structured_function_output` tests for structured types; `_convert_single_tool_output_pydantic_model` formalizes. Graceful fallback to stringification if unstructured.

## Skills, prompts, tools

<a id="g12-f039"></a>
### LLM alignment prompt for multi-agent transparency

`src/agents/extensions/handoff_prompt.py:3-12` @ 5a3028f

`src/agents/extensions/handoff_prompt.py:3-12` — LLM alignment prompt for multi-agent transparency: Recommended system prompt prefix explicitly frames the SDK as a "multi-agent system" with Agents and Handoffs abstractions, instructs the model not to mention transfers, keeping handoffs transparent to users. Domain-specific LLM alignment pattern.

<a id="g12-f040"></a>
### Handoff list as sub-agent surface

`src/agents/agent.py:305-309` @ 5a3028f

`src/agents/agent.py:305-309` — Handoff list as sub-agent surface: `handoffs: list[Agent | Handoff]` is a declarative delegation boundary. Handoff objects define `tool_name`, `input_json_schema`, `on_invoke_handoff`, and conditional `is_enabled` logic, presenting eligible handoff tools to the model without baking delegation logic into instructions.

<a id="g12-f041"></a>
### Tool-use behavior modes

`src/agents/agent.py:345-365` @ 5a3028f

`src/agents/agent.py:345-365` — Tool-use behavior modes: `tool_use_behavior` accepts "run_llm_again" (default), "stop_on_first_tool", `StopAtTools` dict, or a custom `ToolsToFinalOutputFunction` callback. Callback receives `RunContextWrapper` and tool results, deciding final-output candidacy without requiring instructions changes.

<a id="g12-f042"></a>
### Agent-as-tool parameters contract

`src/agents/agent.py:508-559` @ 5a3028f

`src/agents/agent.py:508-559` — Agent-as-tool parameters contract: `as_tool()` accepts optional structured `parameters` type (dataclass or Pydantic model) to enforce typed input validation. Optional `input_builder` function transforms validated input before passing to nested agent.

<a id="g12-f043"></a>
### Handoff input callback pattern

`src/agents/handoffs/__init__.py:222-273` @ 5a3028f

`src/agents/handoffs/init.py:222-273` — Handoff input callback pattern: `on_handoff(context, input)` receives validated JSON arguments as typed object and/or raw JSON string. Supports both typed (`OnHandoffWithInput[THandoffInput]`) and untyped (`OnHandoffWithoutInput`) signatures.

<a id="g12-f044"></a>
### Transcript formatting and recovery

`src/agents/handoffs/history.py:115-157` @ 5a3028f

`src/agents/handoffs/history.py:115-157` — Transcript formatting and recovery: `default_handoff_history_mapper()` emits a single assistant message wrapping prior turns in `<CONVERSATION HISTORY>…</CONVERSATION HISTORY>` markers. Nested handoff detection allows recursive flattening of multi-layer handoffs.

<a id="g12-f045"></a>
### ToolCallItem normalizes access across tool types

`src/agents/items.py:365-378` @ 5a3028f

`src/agents/items.py:365-378` — `ToolCallItem` normalizes access across tool types: `tool_name` and `call_id` properties unify access for function, computer, MCP, shell, image generation, and code interpreter tools. Unified accessors hide heterogeneous underlying shapes.

<a id="g12-f046"></a>
### ModelResponse.to_input_items() as centralized conversion point

`src/agents/items.py:668-673` @ 5a3028f

`src/agents/items.py:668-673` — `ModelResponse.to_input_items()` as centralized conversion point: Converts all outputs (including partial dict snapshots) to replay-safe inputs. Ensures consistent sanitization of tool-search items and output-only metadata before model re-injection.

<a id="g12-f047"></a>
### ToolApprovalItem normalizes approval metadata

`src/agents/items.py:570-612` @ 5a3028f

`src/agents/items.py:570-612` — `ToolApprovalItem` normalizes approval metadata: `name` (falls back to tool_name, raw_item.name, or tool_name field); `qualified_name` (includes namespace); `arguments` (extracted from arguments, params, or input fields, coerced to JSON string). Uniform interface despite heterogeneous tool shapes.

<a id="g12-f048"></a>
### Input guardrail function signature with explicit parameters

`src/agents/guardrail.py:86-93` @ 5a3028f

`src/agents/guardrail.py:86-93` — Input guardrail function signature with explicit parameters: `Callable[[RunContextWrapper[TContext], Agent[Any], str | list[TResponseInputItem]], MaybeAwaitable[GuardrailFunctionOutput]]`. Context, agent, and input explicit, enabling cross-checking of input topic, agent state, and execution context.

<a id="g12-f049"></a>
### Output guardrail function signature

`src/agents/guardrail.py:145-152` @ 5a3028f

`src/agents/guardrail.py:145-152` — Output guardrail function signature: `Callable[[RunContextWrapper[TContext], Agent[Any], Any], MaybeAwaitable[GuardrailFunctionOutput]]`. Final output passed as third parameter, enabling post-execution validation without introspection.

<a id="g12-f050"></a>
### Tool input guardrail receives minimal pre-execution data

`src/agents/tool_guardrails.py:155-177` @ 5a3028f

`src/agents/tool_guardrails.py:155-177` — Tool input guardrail receives minimal pre-execution data: `ToolInputGuardrailData` (context, agent, no output yet). Keeps pre-execution guardrails fast and focused. Async support via `inspect.isawaitable`.

<a id="g12-f051"></a>
### Tool output guardrail extends input data with output

`src/agents/tool_guardrails.py:184-206` @ 5a3028f

`src/agents/tool_guardrails.py:184-206` — Tool output guardrail extends input data with output: `ToolOutputGuardrailData` extends `ToolInputGuardrailData` with `output` field. Data class composition avoids parameter duplication.

<a id="g12-f052"></a>
### Structured input preamble as constant

`src/agents/agent_tool_input.py:13-16` @ 5a3028f

`src/agents/agent_tool_input.py:13-16` — Structured input preamble as constant: "You are being called as a tool..." primes the model for structured data mode before schema/params are shown.

<a id="g12-f053"></a>
### default_tool_input_builder constructs three-section markdown doc

`src/agents/agent_tool_input.py:50-76` @ 5a3028f

`src/agents/agent_tool_input.py:50-76` — `default_tool_input_builder` constructs three-section markdown doc: Preamble, structured data (JSON), and optional schema (JSON) or summary (text). Full separation supports long schemas without truncation.

<a id="g12-f054"></a>
### FunctionTool is data-only with separate orchestration metadata fields

`src/agents/tool.py:283-420` @ 5a3028f

`src/agents/tool.py:283-420` — `FunctionTool` is data-only with separate orchestration metadata fields: `_is_agent_tool`, `_agent_instance`, `_tool_namespace`, `_tool_origin`; invocation bound at construction via `on_invoke_tool` which can be dynamically rebound to handle failure formatting.

<a id="g12-f055"></a>
### Failure-handling wrappers implement __agents_bind_function_tool__

`src/agents/tool.py:467-492` @ 5a3028f

`src/agents/tool.py:467-492` — Failure-handling wrappers implement `agents_bind_function_tool`: Rebinds error formatters to copied tools, ensuring they stay synchronized across copy operations.

<a id="g12-f056"></a>
### call_model_input_filter for per-turn input optimization

`src/agents/run_config.py:56-62` @ 5a3028f

`src/agents/run_config.py:56-62` / `src/agents/run_config.py:290-298` — `call_model_input_filter` for per-turn input optimization: Bundles agent, context, and prepared model input; returns possibly modified `ModelInputData`. Enables token-budget enforcement and system-prompt injection without altering core run loop.

<a id="g12-f057"></a>
### Tool lifecycle hooks expose call-specific context

`src/agents/lifecycle.py:70-103` @ 5a3028f

`src/agents/lifecycle.py:70-103` — Tool lifecycle hooks expose call-specific context: `on_tool_start` / `on_tool_end` receive context (typically `ToolContext` for function tools, plain `RunContextWrapper` for others), enabling hook implementations to distinguish tool families and access call-specific metadata.

<a id="g12-f058"></a>
### remove_all_tools pre-built filter

`src/agents/extensions/handoff_filters.py:33-56` @ 5a3028f

`src/agents/extensions/handoff_filters.py:33-56` — `remove_all_tools` pre-built filter: Strips all tool calls, tool outputs, and control items (reasoning, MCP approvals, file/web search) from history before delegating. Reusable filter for agents that should not see prior implementation details.

<a id="g12-f059"></a>
### _convert_tool_output normalizes lists and single values

`src/agents/items.py:776-817` @ 5a3028f

`src/agents/items.py:776-817` — `_convert_tool_output` normalizes lists and single values: Returns `str | ResponseFunctionCallOutputItemListParam`; lists of structured outputs become arrays; unstructured outputs stringify.

<a id="g12-f060"></a>
### Union type Tool spans all tool families

`src/agents/tool.py:1232-1245` @ 5a3028f

`src/agents/tool.py:1232-1245` — Union type `Tool` spans all tool families: Function, file search, web search, computer, hosted MCP, custom, shell, apply_patch, local shell, image generation, code interpreter, tool_search. Narrow operations validate backend-specific features upfront.

<a id="g12-f061"></a>
### Error handler data snapshot

`src/agents/run_error_handlers.py:16-26` @ 5a3028f

`src/agents/run_error_handlers.py:16-26, 29-41` — Error handler data snapshot: Captures input, new_items, history, output, raw responses, and last_agent at the moment of failure. Generic over context type. Enables post-failure analysis and recovery without re-running.

<a id="g12-f062"></a>
### Three-channel stream event design

`src/agents/stream_events.py:10-62` @ 5a3028f

`src/agents/stream_events.py:10-62` — Three-channel stream event design: `RawResponsesStreamEvent` (raw LLM output), `RunItemStreamEvent` (parsed SDK items: handoffs, tool calls), and `AgentUpdatedStreamEvent` (new agent taking over) provide separate observation channels for logging, UI, and orchestration consumers.

<a id="g12-f063"></a>
### ItemHelpers static methods for safe extraction

`src/agents/items.py:698-774` @ 5a3028f

`src/agents/items.py:698-774` — `ItemHelpers` static methods for safe extraction: `extract_text`, `extract_refusal`, `text_message_outputs` coerce None to empty string, protecting callers from NoneType crashes when provider gateways surface unexpected nulls.

## Patterns worth porting

<a id="g12-f064"></a>
### Weak reference pattern for lifecycle decoupling

`src/agents/items.py:101-125` @ 5a3028f

`src/agents/items.py:101-125` + `src/agents/result.py:333-392` — Weak reference pattern for lifecycle decoupling: Store weak ref in `_agent_ref` at `post_init`; override `getattribute` to intercept `agent` access; provide `release_agent()` to drop strong ref while preserving dataclass fields. `del` auto-releases to prevent reference cycles. Applicable to any orchestrator decoupling parent/child lifecycle or enabling fleet-wide GC of completed agents.

<a id="g12-f065"></a>
### Sealed data transfer for orchestration

`src/agents/handoffs/__init__.py:1-91` @ 5a3028f

`src/agents/handoffs/init.py:1-91` — Sealed data transfer for orchestration: `HandoffInputData` captures full transition state immutably with `.clone()` for functional updates. Separates `new_items` (session persistence) from `input_items` (model feed), enabling filtering without audit loss. Clean contract between orchestrator and delegated agent.

<a id="g12-f066"></a>
### Versioned serialization contract for pause/resume

`src/agents/run_state.py:183-299` @ 5a3028f

`src/agents/run_state.py:183-299` — Versioned serialization contract for pause/resume: Schema version gates forward compatibility with fail-fast on version mismatch. Schema bump summaries are canonical. Enables safe schema evolution without breaking shipped SDK versions.

<a id="g12-f067"></a>
### Ephemeral global maps with signature-based fallback lookup

`src/agents/agent_tool_state.py:15-27` @ 5a3028f

`src/agents/agent_tool_state.py:15-27` — Ephemeral global maps with signature-based fallback lookup: Indexed by object identity; allow tool call results to survive GC within run scope while clearing automatically at run completion.

<a id="g12-f068"></a>
### Nested weak dictionaries for per-context caching

`src/agents/tool.py:640-649` @ 5a3028f

`src/agents/tool.py:640-649` — Nested weak dictionaries for per-context caching: `WeakKeyDictionary[ToolKey, WeakKeyDictionary[ContextKey, Result]]` enables cascading cleanup when either key is garbage-collected.

<a id="g12-f069"></a>
### Function tool decorator unifying bare and parameterized forms

`src/agents/tool.py:1774-1919` @ 5a3028f

`src/agents/tool.py:1774-1919` — Function tool decorator unifying bare and parameterized forms: Overloads for `@function_tool` and `@function_tool(...)` syntax; internal `_create_function_tool` closure captures all parameters for one-pass construction.

<a id="g12-f070"></a>
### Factory that extracts init fields generically via dataclasses.fields()

`src/agents/tool_context.py:112-171` @ 5a3028f

`src/agents/tool_context.py:112-171` — Factory that extracts init fields generically via `dataclasses.fields()`: `ToolContext.from_agent_context` allows subclass evolution without hand-written field copies.

<a id="g12-f071"></a>
### Dual-mode input views for history

`src/agents/result.py:287-305` @ 5a3028f

`src/agents/result.py:287-305` — Dual-mode input views for history: `to_input_list()` offers `mode="preserve_all"` (full session history) and `mode="normalized"` (canonical continuation input after handoff filtering). Allows replays to branch on filtering divergence without losing audit data.

<a id="g12-f072"></a>
### Graceful shutdown modes for streaming

`src/agents/result.py:648-695` @ 5a3028f

`src/agents/result.py:648-695` — Graceful shutdown modes for streaming: `cancel(mode="after_turn")` signals intent without immediate cleanup, allowing the run loop to finish the turn, persist session items, and compute final usage before termination. Contrast with "immediate" (cancel all tasks, clear queues).

<a id="g12-f073"></a>
### Multi-key approval resolution

`src/agents/run_context.py:178-227` @ 5a3028f

`src/agents/run_context.py:178-227` — Multi-key approval resolution: Approval keys chain from lookup_key -> namespace-qualified name -> bare name, allowing approval to migrate as tool wiring evolves. Separate `approved` (bool or list[call_id]) and `rejected` (bool or list[call_id]) fields let permanent and per-call policies coexist. Precedence: permanent > per-call.

<a id="g12-f074"></a>
### Item type union as single source of truth

`src/agents/items.py:333-646` @ 5a3028f

`src/agents/items.py:333-646` — Item type union as single source of truth: 12 concrete types cover all LLM loop states (messages, tool calls, approvals, reasoning, MCP, compaction). Handlers iterate the union, pattern-match on `type: Literal[...]` fields. Prevents ad-hoc type checking and missing branches.

<a id="g12-f075"></a>
### Guardrail decorator pattern supporting bare and parameterized forms

`src/agents/guardrail.py:238-270` @ 5a3028f

`src/agents/guardrail.py:238-270` — Guardrail decorator pattern supporting bare and parameterized forms: `@input_guardrail` and `@input_guardrail(name="x", run_in_parallel=False)` both supported. Factory reduces boilerplate for guardrail registration.

<a id="g12-f076"></a>
### Behavior TypedDict enum with factory classmethods

`src/agents/tool_guardrails.py:40-117` @ 5a3028f

`src/agents/tool_guardrails.py:40-117` — Behavior TypedDict enum with factory classmethods: Three discriminated unions plus `allow()`, `reject_content()`, `raise_exception()` classmethods. No implicit state; intent always explicit on `behavior` field.

<a id="g12-f077"></a>
### Data-only guardrail parameters

`src/agents/tool_guardrails.py:120-146` @ 5a3028f

`src/agents/tool_guardrails.py:120-146` — Data-only guardrail parameters: Decouples guardrail spec (dataclass) from execution (async run method). Easy to log, serialize, audit.

<a id="g12-f078"></a>
### Handoff item with dual weak agent refs

`src/agents/items.py:265-330` @ 5a3028f

`src/agents/items.py:265-330` — Handoff item with dual weak agent refs: Source and target both tracked and released together. Enables tracing delegation without holding both agents post-completion.

<a id="g12-f079"></a>
### Conditional schema wrapping with trace attachment

`src/agents/agent_output.py:79-164` @ 5a3028f

`src/agents/agent_output.py:79-164` — Conditional schema wrapping with trace attachment: Wrap only non-BaseModel/dict; preserve flat structure otherwise. Attach `SpanError` diagnostics on error before raising, enabling trace-level debugging.

<a id="g12-f080"></a>
### _build_wrapped_function_tool builder captures all concerns in one place

`src/agents/tool.py:495-545` @ 5a3028f

`src/agents/tool.py:495-545` — `_build_wrapped_function_tool` builder captures all concerns in one place: Failure-handling, sync-marker metadata, and source origin captured once, avoiding repeated wrapper allocation across tool copies.

<a id="g12-f081"></a>
### Deserialization coerces token details to safe defaults

`src/agents/usage.py:13-57` @ 5a3028f

`src/agents/usage.py:13-57` — Deserialization coerces token details to safe defaults: When providers return None or bypass validation, aggregation operators remain safe against incomplete provider outputs.

<a id="g12-f082"></a>
### Type coercion functions for tool-search items

`src/agents/items.py:194-244` @ 5a3028f

`src/agents/items.py:194-244` — Type coercion functions for tool-search items: `coerce_tool_search_call_raw_item` and `coerce_tool_search_output_raw_item` normalize between Pydantic models and dicts, handling validation errors gracefully.

<a id="g12-f083"></a>
### Resilient transcript extraction from nested markers

`src/agents/handoffs/history.py:245-273` @ 5a3028f

`src/agents/handoffs/history.py:245-273` — Resilient transcript extraction from nested markers: `_extract_nested_history_transcript()` parses numbered or JSON items from within markers; fallback to JSON deserialization, then legacy "role: content" format ensures backward compatibility across nested handoff chains.

<a id="g12-f084"></a>
### Modular schema summary construction

`src/agents/agent_tool_input.py:110-206` @ 5a3028f

`src/agents/agent_tool_input.py:110-206` — Modular schema summary construction: Separate extraction (`_read_schema_description`), field description (`_describe_json_schema_field`), and formatting (`_format_schema_summary`) steps. Field filtering rejects complex nested types (allOf, oneOf, properties), keeping summaries readable.

<a id="g12-f085"></a>
### Lazy initialization of tool metadata in __post_init__

`src/agents/items.py:531-560` @ 5a3028f

`src/agents/items.py:531-560` — Lazy initialization of tool metadata in `post_init`: Extract name, namespace, and lookup_key from raw_item only if not provided. Permits both pre-parsed and late-parsed tool calls to coexist.

## Open threads / weak spots

<a id="g12-f086"></a>
### HACK: Pending run result state scope collision risk

`src/agents/agent.py:760-782` @ 5a3028f

`src/agents/agent.py:760-782` — HACK: Pending run result state scope collision risk: `peek_agent_tool_run_result()` recovers interrupted nested runs via `tool_call` and `scope_id`, but relies on global agent-tool state scope store. Same agent-as-tool invoked multiple times concurrently with overlapping interruptions risks state key collisions. Scoping is per-`tool_call` identity, not per-execution-thread.

<a id="g12-f087"></a>
### MISSING: No concurrency guard on approval state mutations

`src/agents/run_context.py:171-177` @ 5a3028f

`src/agents/run_context.py:171-177` — MISSING: No concurrency guard on approval state mutations: `_get_or_create_approval_entry()` is not atomic. If two concurrent tool calls for the same tool name race to update approvals, one may be silently lost. No mutex or CAS loop.

<a id="g12-f088"></a>
### UNSUPPORTED: Schema version forward compatibility is fail-fast only

`src/agents/run_state.py:149` @ 5a3028f

`src/agents/run_state.py:149` — UNSUPPORTED: Schema version forward compatibility is fail-fast only: Older SDKs receiving a newer RunState snapshot raise immediately rather than attempting to load with warnings or defaults. Prevents graceful degradation; any schema bump breaks all prior SDK versions.

<a id="g12-f089"></a>
### WEAK: Interruption recovery without full state

`src/agents/result.py:765-782` @ 5a3028f

`src/agents/result.py:765-782` — WEAK: Interruption recovery without full state: `peek_agent_tool_run_result()` returns partial `RunResult`. If nested agent was interrupted mid-turn, returned result may lack `final_output` or have incomplete `new_items`. Edge case: nested agent fails before first model call, `resume_state` is None, crashes immediately on restart without replaying input.

<a id="g12-f090"></a>
### TODO: Input filters incompatible with server-managed conversations

`src/agents/handoffs/__init__.py:138-139` @ 5a3028f

`src/agents/handoffs/init.py:138-139` — TODO: Input filters incompatible with server-managed conversations: Input filters are incompatible with `conversation_id`, `previous_response_id`, or `auto_previous_response_id` because server-side history merging cannot be reordered client-side. Workaround is not documented in top-level run method signature.

<a id="g12-f091"></a>
### FRAGILE: Summary item filtering by hardcoded type set

`src/agents/handoffs/history.py:32-37` @ 5a3028f

`src/agents/handoffs/history.py:32-37` — FRAGILE: Summary item filtering by hardcoded type set: `_SUMMARY_ONLY_INPUT_TYPES = {"function_call", "function_call_output", "reasoning"}` hardcodes items to omit. Reasoning items can become orphaned if tool-call items are filtered but preceding reasoning is not. No validation that orphaned reasoning is stripped.

<a id="g12-f092"></a>
### TODO: Global handoff input filter + per-handoff override precedence not documented

`src/agents/run_config.py:220-226` @ 5a3028f

`src/agents/run_config.py:220-226` — TODO: Global handoff input filter + per-handoff override precedence not documented: `RunConfig.handoff_input_filter` is fallback when `Handoff.input_filter` is unset; if both are set, behavior is opaque. Expected: per-handoff always wins, but actual implementation is in the runner, not in config-level docstring.

<a id="g12-f093"></a>
### No timeout or cancellation signal for guardrail functions

`src/agents/guardrail.py:117-130` @ 5a3028f

`src/agents/guardrail.py:117-130` — No timeout or cancellation signal for guardrail functions: Long-running input guardrails can block agent startup if `run_in_parallel: False`. No deadline or fallback to allow forward progress if a guardrail hangs.

<a id="g12-f094"></a>
### No construction-time validation of guardrail callability

`src/agents/tool_guardrails.py:170-206` @ 5a3028f

`src/agents/tool_guardrails.py:170-206` — No construction-time validation of guardrail callability: `run()` methods check callability at runtime only; misconfigured guardrails discovered only when invoked.

<a id="g12-f095"></a>
### Strict JSON schema enforcement at construction time

`src/agents/agent_output.py:112-120` @ 5a3028f

`src/agents/agent_output.py:112-120` — Strict JSON schema enforcement at construction time: `UserError` raised during `init`. Failures surface at agent construction, not output validation. If output_type changes between definition and runtime, schema enforcement is stale.

<a id="g12-f096"></a>
### Wrapper key collision risk

`src/agents/agent_output.py:153-163` @ 5a3028f

`src/agents/agent_output.py:153-163` — Wrapper key collision risk: Wrapped output extraction relies on presence of `_WRAPPER_DICT_KEY` ("response"). If output dict has a "response" field, collision is possible (unlikely but not prevented).

<a id="g12-f097"></a>
### issubclass(origin, BaseModel | dict) raises TypeError if origin is not a class

`src/agents/agent_output.py:174-175` @ 5a3028f

`src/agents/agent_output.py:174-175` — `issubclass(origin, BaseModel | dict)` raises TypeError if origin is not a class: No defensive handling before the call.

<a id="g12-f098"></a>
### Silent fallback to JSON dump when builder and schema_info are both None

`src/agents/agent_tool_input.py:87-102` @ 5a3028f

`src/agents/agent_tool_input.py:87-102` — Silent fallback to JSON dump when builder and schema_info are both None: No warning if structured input was intended but builder is missing.

<a id="g12-f099"></a>
### Over-aggressive field filtering in schema summarization

`src/agents/agent_tool_input.py:215-245` @ 5a3028f

`src/agents/agent_tool_input.py:215-245` — Over-aggressive field filtering in schema summarization: Rejects any schema with `properties`, `items`, `oneOf`, `anyOf`, `allOf`, preventing summarization of optional fields or simple unions. Type arrays with extra types cause entire field rejection (e.g., `["string", "unknown", "null"]` returns None even though "string" is simple).

<a id="g12-f100"></a>
### No validation that raw_item matches declared item type

`src/agents/items.py:96-99` @ 5a3028f

`src/agents/items.py:96-99` — No validation that `raw_item` matches declared item type: Type narrowing happens at construction; mixups could propagate silently.

<a id="g12-f101"></a>
### ToolCallOutputItem.to_input_item() hardcodes shell tool field removal

`src/agents/items.py:427-429` @ 5a3028f

`src/agents/items.py:427-429` — `ToolCallOutputItem.to_input_item()` hardcodes shell tool field removal: No extension mechanism; other hosted tool types would require expanding the hardcoded list.

<a id="g12-f102"></a>
### _allow_bare_name_alias is undocumented and unused

`src/agents/items.py:511-512` @ 5a3028f

`src/agents/items.py:511-512` — `_allow_bare_name_alias` is undocumented and unused: Hidden field (repr=False, kw_only=True) with default False. No code checks its value. Latent feature with unclear semantics.

<a id="g12-f103"></a>
### Complex unexplained lookup key computation condition

`src/agents/items.py:556-560` @ 5a3028f

`src/agents/items.py:556-560` — Complex unexplained lookup key computation condition: raw_type == "function_call" AND name not None AND (tool_namespace is None or tool_namespace != tool_name). Namespace equality check is unusual and unexplained.

<a id="g12-f104"></a>
### Silent swallowing of dict validation errors

`src/agents/items.py:820-835` @ 5a3028f

`src/agents/items.py:820-835` — Silent swallowing of dict validation errors: `TypeAdapter.validate_python()` swallows `ValidationError` and returns dict as-is. Invalid dicts not caught; callers see dicts they may not expect.

<a id="g12-f105"></a>
### Fragile error detection via exception chain and string matching

`src/agents/tool.py:1379-1393` @ 5a3028f

`src/agents/tool.py:1379-1393` — Fragile error detection via exception chain and string matching: JSON decode error extraction stops on first match in chain; tool argument error detection relies on string matching ("Invalid JSON input for tool") against ModelBehaviorError message, brittle if message format changes.

<a id="g12-f106"></a>
### Timeout behavior validation uses hardcoded tuple

`src/agents/tool.py:1955-1959` @ 5a3028f

`src/agents/tool.py:1955-1959` — Timeout behavior validation uses hardcoded tuple: No enum or constant registry to keep in sync with `ToolTimeoutBehavior` Literal definition.

<a id="g12-f107"></a>
### Computer dispose loop silently continues on partial failure

`src/agents/tool.py:704-730` @ 5a3028f

`src/agents/tool.py:704-730` — Computer dispose loop silently continues on partial failure: Catches and logs exceptions but does not aggregate errors; partial dispose failure continues without reporting all failures to caller.

<a id="g12-f108"></a>
### _drop_agent_tool_run_result does not assert cleanup success

`src/agents/agent_tool_state.py:85-104` @ 5a3028f

`src/agents/agent_tool_state.py:85-104` — `_drop_agent_tool_run_result` does not assert cleanup success: Race condition or cache corruption could leave orphaned entries in `_agent_tool_run_results_by_signature`.

<a id="g12-f109"></a>
### Constructor uses sentinel _MISSING objects instead of keyword-only parameters

`src/agents/tool_context.py:60-106` @ 5a3028f

`src/agents/tool_context.py:60-106` — Constructor uses sentinel `_MISSING` objects instead of keyword-only parameters: Fragile to future positional argument additions; less clear at call sites.

<a id="g12-f110"></a>
### "handoff_occured" is misspelled but kept for backward compatibility

`src/agents/stream_events.py:32-33` @ 5a3028f

`src/agents/stream_events.py:32-33` — `"handoff_occured"` is misspelled but kept for backward compatibility: Creates brittleness debt; future migration path to correct spelling unclear.

<a id="g12-f111"></a>
### Tool hook context type is not statically enforced

`src/agents/lifecycle.py:70-103` @ 5a3028f

`src/agents/lifecycle.py:70-103` — Tool hook context type is not statically enforced: Docstring notes "typically a `ToolContext`" but does not enforce it. No static guarantee; callers must check isinstance to be safe.

<a id="g12-f112"></a>
### Nested handoff history described as "opt-in beta"

`docs/handoffs.md:115` @ 5a3028f

`docs/handoffs.md:115` — Nested handoff history described as "opt-in beta": Unclear stabilization criteria; risk of API churn if redesigned or disabled more broadly.

<a id="g12-f113"></a>
### No guidance on on_handoff callback error handling or timeouts

`docs/handoffs.md:38-40` @ 5a3028f

`docs/handoffs.md:38-40` — No guidance on `on_handoff` callback error handling or timeouts: Async errors in the callback may be silent; no documentation on what happens if the callback fails.

