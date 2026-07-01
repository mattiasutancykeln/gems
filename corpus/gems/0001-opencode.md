# opencode

| | |
|---|---|
| Source | https://github.com/sst/opencode |
| Repo | https://github.com/sst/opencode @ `97e713e8aac75a0254c34d134f0608af5cb4935c` |
| Kind | - |
| Topics | - |
| License | MIT (permissive) |
| Verdict | keep |
| Findings | 91 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/1 |

## Implementation decisions

<a id="g1-f001"></a>
### Transitive parent-child session cancellation via metadata-driven job traversal

`packages/opencode/src/session/run-state.ts:116-148` @ 97e713e

**Transitive parent-child session cancellation via metadata-driven job traversal**: `packages/opencode/src/session/run-state.ts:116-148` — When cancelling a session, the system iteratively walks background job trees by inspecting `sessionId` and `parentSessionId` fields in job metadata, re-filtering the job list until no new matches are found. No explicit parent-child registry is maintained; the tree is reconstructed lazily from job metadata at cancel time.

<a id="g1-f002"></a>
### Session parent-child hierarchy as the core delegation model

`packages/opencode/src/session/session.ts:213-233` @ 97e713e

**Session parent-child hierarchy as the core delegation model**: `packages/opencode/src/session/session.ts:213-233` — Every session embeds an optional `parentID`. Child sessions inherit workspace context but maintain separate permission rulesets, allowing the parent to observe but not directly control child execution.

<a id="g1-f003"></a>
### Permission ruleset as the enforcement boundary between parent and child

`packages/opencode/src/agent/agent.ts:133-145` @ 97e713e

**Permission ruleset as the enforcement boundary between parent and child** (merged with subagent permission layering): `packages/opencode/src/agent/agent.ts:133-145` and `packages/opencode/src/agent/subagent-permissions.ts:18-34` — Three denial layers are applied to subagents in order: the subagent's own denies, the parent agent's edit-class denies, and config `primary_tools` denies. This prevents a subagent spawned via task tool from bypassing Plan Mode restrictions on the parent agent config. Additionally, `todowrite` and `task` (self-spawning) are explicitly denied to subagents: `packages/opencode/src/tool/task.ts:133-145`.

<a id="g1-f004"></a>
### Task resumption via task_id instead of fresh spawn

`packages/opencode/src/tool/task.ts:47-50` @ 97e713e

**Task resumption via `task_id` instead of fresh spawn**: `packages/opencode/src/tool/task.ts:47-50` — A prior subagent session can be resumed by passing `task_id`, continuing with previous messages and tool outputs. This avoids redundant state rebuilds for multi-turn subagent work.

<a id="g1-f005"></a>
### Background vs. foreground task execution as a permissioned choice

`packages/opencode/src/tool/task.ts:97-102` @ 97e713e

**Background vs. foreground task execution as a permissioned choice**: `packages/opencode/src/tool/task.ts:97-102` — Background mode is gated behind `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS`, treating it as an opt-in feature rather than automatic. The trade-off between immediate continuation (foreground) and parallel work (background) is an explicit parameter.

<a id="g1-f006"></a>
### Handle interface encapsulates agent stream lifecycle

`packages/opencode/src/session/processor.ts:38-54` @ 97e713e

**Handle interface encapsulates agent stream lifecycle**: `packages/opencode/src/session/processor.ts:38-54` — The `Handle` provides a stable contract over mutable context for tool call completion and stream processing. Callers invoke `process()` and get back a discriminated `Result` ("compact", "stop", "continue") that drives loop control, avoiding external polling.

<a id="g1-f007"></a>
### Snapshot pre-capture before LLM stream

`packages/opencode/src/session/processor.ts:110-128` @ 97e713e

**Snapshot pre-capture before LLM stream**: `packages/opencode/src/session/processor.ts:110-128` — The initial snapshot is taken before streaming starts because "The AI SDK may execute tools internally before emitting start-step events," guaranteeing capture of file system state before any provider-side tool execution.

<a id="g1-f008"></a>
### Subtask dispatch via compound tool execution

`packages/opencode/src/session/prompt.ts:239-433` @ 97e713e

**Subtask dispatch via compound tool execution**: `packages/opencode/src/session/prompt.ts:239-433` — Subtasks are wrapped as tool calls (`TaskTool.id`). The tool `execute()` signature takes `messages`, `sessionID`, `agent`, `abort` signal, and metadata callbacks, allowing the parent to retain visibility and interrupt capability while the child runs.

<a id="g1-f009"></a>
### Loop as generator resumption over state

`packages/opencode/src/session/prompt.ts:1134-1389` @ 97e713e

**Loop as generator resumption over state**: `packages/opencode/src/session/prompt.ts:1134-1389` — The `runLoop` function is a single `while(true)` generator calling `processor.create()` and `handle.process()` per step. Loop control (break/continue) is driven by the result discriminator, not exception throwing, allowing the loop to survive interruptions and retry policies without unwinding the call stack.

<a id="g1-f010"></a>
### Per-session lazy-instantiated Runner instances with shared scope management

`packages/opencode/src/session/run-state.ts:52-69` @ 97e713e

**Per-session lazy-instantiated Runner instances with shared scope management**: `packages/opencode/src/session/run-state.ts:52-69` — Each session gets at most one active Runner; the map-based registry prevents duplicate runners and ensures cleanup via Scope finalizers. The runner encapsulates the concurrency boundary and interrupt propagation for a single session's work.

<a id="g1-f011"></a>
### Explicit tool registry query per model/agent pair

`packages/opencode/src/session/tools.ts:74-115` @ 97e713e

**Explicit tool registry query per model/agent pair**: `packages/opencode/src/session/tools.ts:74-115` — The registry is queried with `modelID`, `providerID`, and `agent` info, enabling model-specific and agent-specific tool filtering without storing tool scope in the session state itself.

<a id="g1-f012"></a>
### Provider-aware media extraction and synthesis in model message construction

`packages/opencode/src/session/message-v2.ts:142-205` @ 97e713e

**Provider-aware media extraction and synthesis in model message construction**: `packages/opencode/src/session/message-v2.ts:142-205` — The code detects which providers support which media types in tool results (OpenAI supports only strings, Bedrock supports images but not PDFs), extracts unsupported media, and injects it as synthetic user messages, decoupling provider support from canonical message storage.

<a id="g1-f013"></a>
### Message-derived work extraction via temporal ordering

`packages/opencode/src/session/message-v2.ts:596-612` @ 97e713e

**Message-derived work extraction via temporal ordering**: `packages/opencode/src/session/message-v2.ts:596-612` — `latest()` identifies pending tasks by comparing message IDs (monotonic) to the most recent finished assistant turn; tasks are only unprocessed work if they attach to user messages newer than the latest finished assistant, avoiding double-processing across compaction boundaries.

<a id="g1-f014"></a>
### GitLab Workflow model hooks tool execution back to opencode's native tool system

`packages/opencode/src/session/llm.ts:105-206` @ 97e713e

**GitLab Workflow model hooks tool execution back to opencode's native tool system**: `packages/opencode/src/session/llm.ts:105-206` — The language model proxy injects a `toolExecutor` callback and `sessionPreapprovedTools`, allowing workflow-side tool calls to be validated against opencode's permission rules and executed via the same dispatcher.

<a id="g1-f015"></a>
### Runtime seam with native/AI-SDK fallback

`packages/opencode/src/session/llm.ts:224-269` @ 97e713e

**Runtime seam with native/AI-SDK fallback**: `packages/opencode/src/session/llm.ts:224-269` — The native LLMNativeRuntime is checked first; if unsupported (returned via structured `type` discriminant), the system falls back to AI SDK. Both expose the same LLMEvent stream interface, making the fallback transparent to the processor.

<a id="g1-f016"></a>
### First-match-wins hierarchical config scope

`packages/opencode/src/session/instruction.ts:122-133` @ 97e713e

**First-match-wins hierarchical config scope**: `packages/opencode/src/session/instruction.ts:122-133` — The instruction loader walks up directory ancestry and stops at the first AGENTS.md/CLAUDE.md found, preventing prompt stacking across nested projects and workspaces.

<a id="g1-f017"></a>
### Upward-walk deduplication via three layers

`packages/opencode/src/session/instruction.ts:193-218` @ 97e713e

**Upward-walk deduplication via three layers**: `packages/opencode/src/session/instruction.ts:193-218` — System paths (global + project top-level), already-extracted files from message history, and per-message claims prevent re-attaching the same instruction file multiple times in a single message.

<a id="g1-f018"></a>
### Atomic read-modify-write for mutable session state

`packages/opencode/src/acp/session.ts:119-128` @ 97e713e

**Atomic read-modify-write for mutable session state**: `packages/opencode/src/acp/session.ts:119-128` — Uses `Effect.Ref.modify` with a closure that returns both the computed result and the next state, ensuring no races on concurrent updates to the in-memory session map.

<a id="g1-f019"></a>
### Schedule-based retry policy with transient state injection

`packages/opencode/src/session/retry.ts:176-199` @ 97e713e

**Schedule-based retry policy with transient state injection**: `packages/opencode/src/session/retry.ts:176-199` — Rather than a simple backoff loop, the retry policy uses Effect.Schedule and injects attempt/message/action state via a side-effect callback (`opts.set`), allowing callers to track retry progress and expose user-facing actions without blocking the retry mechanism.

<a id="g1-f020"></a>
### Compaction selection by budget and turn preservation

`packages/opencode/src/session/compaction.ts:198-249` @ 97e713e

**Compaction selection by budget and turn preservation**: `packages/opencode/src/session/compaction.ts:198-249` — `select()` recursively splits conversation turns to fit a preserved token budget, keeping the most-recent full turns and truncating older turns at message granularity, preserving semantic continuity in the tail.

<a id="g1-f021"></a>
### Cost/token rollup and compaction trigger at step finish

`packages/opencode/src/session/processor.ts:694-756` @ 97e713e

**Cost/token rollup and compaction trigger at step finish**: `packages/opencode/src/session/processor.ts:694-756` — On `step-finish`, the processor reconciles usage metrics and updates the assistant message with aggregated cost and token counts. If usage exceeds the model's usable context (`isOverflow`), it sets `ctx.needsCompaction = true`, which the stream loop interprets as a "compact" result without throwing an error.

<a id="g1-f022"></a>
### Metadata passthrough for orchestration tracing

`packages/opencode/src/tool/task.ts:175-180` @ 97e713e

**Metadata passthrough for orchestration tracing**: `packages/opencode/src/tool/task.ts:175-180` — `parentSessionId`, `sessionId`, and `model` are attached to task metadata, enabling the parent to correlate child runs and inspect execution context.

<a id="g1-f023"></a>
### Conditional prompt injection based on experimental plan mode flag

`packages/opencode/src/session/reminders.ts:26-49` @ 97e713e

**Conditional prompt injection based on experimental plan mode flag**: `packages/opencode/src/session/reminders.ts:26-49` — When disabled, synthetic text parts are pushed to the user message; when enabled, file system state (plan existence) is checked before injecting reminders.

## Skills, prompts, tools

<a id="g1-f024"></a>
### Task tool description guards against overuse

`packages/opencode/src/tool/task.txt:5-9` @ 97e713e

**Task tool description guards against overuse**: `packages/opencode/src/tool/task.txt:5-9` — Explicitly warns when NOT to use Task (direct file reads, grep, codebase search) to prevent delegation when direct tools are faster. This is a guardrail on the action space.

<a id="g1-f025"></a>
### Background task messaging as synthetic system feedback

`packages/opencode/src/tool/task.ts:25-41` @ 97e713e

**Background task messaging as synthetic system feedback**: `packages/opencode/src/tool/task.ts:25-41` — Three distinct messages (`BACKGROUND_DESCRIPTION`, `BACKGROUND_STARTED`, `BACKGROUND_UPDATED`) inform the parent agent of background job state, preventing polling/sleep loops.

<a id="g1-f026"></a>
### Agent Info schema with mode/permission/model as first-class fields

`packages/opencode/src/agent/agent.ts:35-56` @ 97e713e

**Agent Info schema with mode/permission/model as first-class fields**: `packages/opencode/src/agent/agent.ts:35-56` — Agents are defined with `mode` (subagent/primary/all), permission ruleset, model override, and optional custom prompt. Agent capabilities and constraints are declarative.

<a id="g1-f027"></a>
### Agent generation via LLM with name-collision check

`packages/opencode/src/agent/agent.ts:363-431` @ 97e713e

**Agent generation via LLM with name-collision check**: `packages/opencode/src/agent/agent.ts:363-431` — Uses Claude to generate agent config (identifier, whenToUse, systemPrompt) from a natural-language description, avoiding collisions with existing agents and rejecting OpenAI OAuth responses to system prompts.

<a id="g1-f028"></a>
### Structured output tool description and system prompt contract

`packages/opencode/src/session/prompt.ts:70-78` @ 97e713e

**Structured output tool description and system prompt contract**: `packages/opencode/src/session/prompt.ts:70-78` — `STRUCTURED_OUTPUT_DESCRIPTION` and `STRUCTURED_OUTPUT_SYSTEM_PROMPT` explicitly instruct the model to call the StructuredOutput tool exactly once at the end with valid JSON matching a required schema.

<a id="g1-f029"></a>
### Structured output tool captures and stops loop

`packages/opencode/src/session/prompt.ts:1642-1668` @ 97e713e

**Structured output tool captures and stops loop**: `packages/opencode/src/session/prompt.ts:1642-1668` — The `createStructuredOutputTool()` callback captures the parsed output via `onSuccess()` and returns a success response. The loop checks `if (structured !== undefined)` and breaks, bypassing further tool calls.

<a id="g1-f030"></a>
### Tool registry resolution with permission filtering

`packages/opencode/src/session/prompt.ts:1279-1347` @ 97e713e

**Tool registry resolution with permission filtering**: `packages/opencode/src/session/prompt.ts:1279-1347` — `SessionTools.resolve()` returns a tools map; when `lastUser.format?.type === "json_schema"`, the StructuredOutput tool is appended. If `isLastStep`, the system message includes `MAX_STEPS` text to prepare the model for step limits.

<a id="g1-f031"></a>
### System prompt composition from provider and skill list

`packages/opencode/src/session/system.ts:41-108` @ 97e713e

**System prompt composition from provider and skill list**: `packages/opencode/src/session/system.ts:41-108` — The `environment()` function builds model context (working directory, workspace root, git status, date) and provider-specific prompt. The `skills()` function appends available skill descriptions if skills are not disabled by permission.

<a id="g1-f032"></a>
### Tool context builder with structured metadata and permission interface

`packages/opencode/src/session/tools.ts:24-112` @ 97e713e

**Tool context builder with structured metadata and permission interface**: `packages/opencode/src/session/tools.ts:24-112` — The `context` function packages sessionID, messageID, callID, abort signal, agent name, and a structured `metadata` updater into a single Tool.Context. The `ask` function provides a permission-gating interface with merged agent+session rulesets.

<a id="g1-f033"></a>
### Tool metadata state machine via updateToolCall closure

`packages/opencode/src/session/tools.ts:41-62` @ 97e713e

**Tool metadata state machine via updateToolCall closure**: `packages/opencode/src/session/tools.ts:41-62` — Tools call `metadata(val)` to atomically update a running tool call's title, metadata, and status=running without rebuilding the entire tool call object. The closure guards against updating non-pending/non-running calls.

<a id="g1-f034"></a>
### Structured tool output transformer with multi-format support

`packages/opencode/src/session/message-v2.ts:172-204` @ 97e713e

**Structured tool output transformer with multi-format support**: `packages/opencode/src/session/message-v2.ts:172-204` — `toModelOutput` handles string outputs, object outputs with text+attachments, and JSON outputs, normalizing them to a union type that the AI SDK understands.

<a id="g1-f035"></a>
### User message part assembler with synthetic compaction/subtask text injection

`packages/opencode/src/session/message-v2.ts:209-251` @ 97e713e

**User message part assembler with synthetic compaction/subtask text injection**: `packages/opencode/src/session/message-v2.ts:209-251` — Converts file parts to model parts while respecting media stripping, injects text prompts for compaction and subtask markers, and filters empty parts.

<a id="g1-f036"></a>
### Assistant message part assembly with signed reasoning preservation

`packages/opencode/src/session/message-v2.ts:284-371` @ 97e713e

**Assistant message part assembly with signed reasoning preservation**: `packages/opencode/src/session/message-v2.ts:284-371` — Preserves Anthropic adaptive thinking structure (step-start, reasoning with metadata, text separators) and handles pending/running tool calls by injecting error states to satisfy API requirements that every tool_use has a tool_result.

<a id="g1-f037"></a>
### Retryable error classification with action payloads

`packages/opencode/src/session/retry.ts:68-152` @ 97e713e

**Retryable error classification with action payloads**: `packages/opencode/src/session/retry.ts:68-152` — `retryable()` returns a structured Retryable type with message, reason, provider, title, label, and optional link, allowing the UI to render provider-specific upsell dialogs without hard-coding UI logic in the session layer.

<a id="g1-f038"></a>
### StreamInput contract

`packages/opencode/src/session/llm.ts:35-48` @ 97e713e

**StreamInput contract**: `packages/opencode/src/session/llm.ts:35-48` — Captures user context (user, sessionID, parentSessionID), model selection, agent info, permission ruleset, system prompts, message history, tools, and optional small-model flag. `toolChoice` enum supports "auto", "required", "none".

<a id="g1-f039"></a>
### Permission-aware tool approval handler

`packages/opencode/src/session/llm.ts:156-205` @ 97e713e

**Permission-aware tool approval handler**: `packages/opencode/src/session/llm.ts:156-205` — Receives approval requests with tool name and args, deduplicates by name, auto-approves if all tools were already approved in session, else sends permission event and waits for reply via EventV2Bridge. Session-scoped `approvedToolsForSession` Set prevents approval loops for MCP tools.

<a id="g1-f040"></a>
### Three prompt files injected conditionally

`packages/opencode/src/session/reminders.ts:11-13` @ 97e713e

**Three prompt files injected conditionally**: `packages/opencode/src/session/reminders.ts:11-13` — PROMPT_PLAN (for plan agent, non-experimental mode), BUILD_SWITCH (after plan build agent transition), PLAN_MODE (experimental plan mode, with template string interpolation of file path state).

<a id="g1-f041"></a>
### Parallel concurrent file and HTTP fetch for system instructions

`packages/opencode/src/session/instruction.ts:155-169` @ 97e713e

**Parallel concurrent file and HTTP fetch for system instructions**: `packages/opencode/src/session/instruction.ts:155-169` — System instructions are read from disk (concurrency: 8) and remote URLs (concurrency: 4) in parallel using Effect.forEach, then concatenated with source headers for agent context.

<a id="g1-f042"></a>
### Provider capability matrix for media support

`packages/opencode/src/session/message-v2.ts:158-170` @ 97e713e

**Provider capability matrix for media support**: `packages/opencode/src/session/message-v2.ts:158-170` — `supportsMediaInToolResult` hardcodes per-provider/per-model support for specific media types (Bedrock images only, Anthropic all), enabling graceful degradation.

<a id="g1-f043"></a>
### Metadata recording callback

`packages/opencode/src/acp/session.ts:152-166` @ 97e713e

**Metadata recording callback**: `packages/opencode/src/acp/session.ts:152-166` — Receives part metadata (message/part/type/role/ignored/toolCallId/metadata), adds to session `knownParts` Map keyed by message:part compound key, and returns the recorded metadata. Enables tool result tracking and dedup without external state.

## Patterns worth porting

<a id="g1-f044"></a>
### Background job lifecycle with promotion and fork semantics

`packages/opencode/src/tool/task.ts:206-244` @ 97e713e

**Background job lifecycle with promotion and fork semantics**: `packages/opencode/src/tool/task.ts:206-244` — Complete background task pattern: `extend()` to append to running job, `start()` to spawn with `onPromote` hook, `wait()` to poll for completion, and `cancel()` to interrupt. Parent waits for completion and injects result back into parent session on finish.

<a id="g1-f045"></a>
### Metadata-driven transitive cascade cancellation

`packages/opencode/src/session/run-state.ts:116-148` @ 97e713e

**Metadata-driven transitive cascade cancellation**: `packages/opencode/src/session/run-state.ts:116-148` — Rather than maintaining an explicit parent-child registry, the code traverses background jobs by examining metadata (sessionId, parentSessionId) and iteratively re-filtering until no new jobs match. Decouples cancellation logic from the spawning mechanism.

<a id="g1-f046"></a>
### Effect-based scope acquisition for cleanup on cancellation

`packages/opencode/src/tool/task.ts:307-337` @ 97e713e

**Effect-based scope acquisition for cleanup on cancellation**: `packages/opencode/src/tool/task.ts:307-337` — Uses `acquireUseRelease` with abort listeners to ensure child session cancel is triggered on parent abort, even mid-flight. Cleanup fires regardless of exit status (success/interrupt/error).

<a id="g1-f047"></a>
### Session fork preserving message DAG with ID remapping

`packages/opencode/src/session/session.ts:733-774` @ 97e713e

**Session fork preserving message DAG with ID remapping**: `packages/opencode/src/session/session.ts:733-774` — Clones a session up to a given message ID, remapping all message/part IDs, preserving parentID links within the fork, and preserving metadata. Enables branching execution trees.

<a id="g1-f048"></a>
### Permission merge layering without duplication

`packages/opencode/src/agent/agent.ts:117-305` @ 97e713e

**Permission merge layering without duplication**: `packages/opencode/src/agent/agent.ts:117-305` — Merges permission configs in order (defaults, user config, agent overrides), filtering out duplicates and preserving specificity. Avoids conflicting rules in a single ruleset.

<a id="g1-f049"></a>
### Mutable context with side-effect registry

`packages/opencode/src/session/processor.ts:76-86` @ 97e713e

**Mutable context with side-effect registry**: `packages/opencode/src/session/processor.ts:76-86` — `ProcessorContext` holds toolcalls keyed by ID, currentText for delta accumulation, and reasoningMap for streaming reasoning parts. The processor mutates context in-place rather than threading immutable updates, allowing streaming event handlers to update state without allocating new structures per delta.

<a id="g1-f050"></a>
### Deferred settlement of pending work

`packages/opencode/src/session/processor.ts:138-142` @ 97e713e

**Deferred settlement of pending work**: `packages/opencode/src/session/processor.ts:138-142` — Tool calls use `Deferred<void>` to signal completion. When a tool result arrives, `completeToolCall()` resolves the deferred. On cleanup, the processor awaits all deferreds with a 250ms timeout, ensuring pending work doesn't block shutdown indefinitely.

<a id="g1-f051"></a>
### Permission merge for subtask dispatch

`packages/opencode/src/session/prompt.ts:307-333` @ 97e713e

**Permission merge for subtask dispatch**: `packages/opencode/src/session/prompt.ts:307-333` — When spawning a subtask agent via tool, permissions are merged from the parent session, the task agent's default permission, and the agent-specific ruleset: `Permission.merge(taskAgent.permission, session.permission ?? [])`.

<a id="g1-f052"></a>
### Retry policy with status update callback

`packages/opencode/src/session/processor.ts:959-1034` @ 97e713e

**Retry policy with status update callback**: `packages/opencode/src/session/processor.ts:959-1034` — The processor's `process()` function chains `Effect.retry(SessionRetry.policy(...))`, passing a `set` callback that publishes a retried event and updates status to `{ type: "retry", attempt, message, action, next }`.

<a id="g1-f053"></a>
### Processor reuse for compaction

`packages/opencode/src/session/compaction.ts:405-425` @ 97e713e

**Processor reuse for compaction**: `packages/opencode/src/session/compaction.ts:405-425` — A compaction step creates a new assistant message and calls `processors.create()` to get a processor handle, then `processor.process()` with empty tools and a synthetic prompt, reusing the streaming and tool-handling machinery for non-interactive summarization.

<a id="g1-f054"></a>
### Replay mechanism for overflow recovery

`packages/opencode/src/session/compaction.ts:445-471` @ 97e713e

**Replay mechanism for overflow recovery**: `packages/opencode/src/session/compaction.ts:445-471` — If compaction succeeds but overflow was set (media too large), the processor replays the prior user message (with media replaced by text placeholders) into a new user message so the loop can retry without losing the intent.

<a id="g1-f055"></a>
### Diff computation by snapshot pairing

`packages/opencode/src/session/summary.ts:82-100` @ 97e713e

**Diff computation by snapshot pairing**: `packages/opencode/src/session/summary.ts:82-100` — `computeDiff()` finds the first `step-start` snapshot and the last `step-finish` snapshot in a message range, then calls `snapshot.diffFull(from, to)`. Decouples diff calculation from tool output and allows summarization to happen asynchronously.

<a id="g1-f056"></a>
### Cost/token rollup using Decimal arithmetic

`packages/opencode/src/session/session.ts:384-452` @ 97e713e

**Cost/token rollup using Decimal arithmetic**: `packages/opencode/src/session/session.ts:384-452` — Normalizes usage across provider metadata formats (Anthropic, Bedrock, Vertex, Venice, Copilot), separates cache tokens from input tokens, and charges reasoning at output rate, all using Decimal to avoid floating-point drift.

<a id="g1-f057"></a>
### Compaction-aware message reordering logic

`packages/opencode/src/session/message-v2.ts:532-583` @ 97e713e

**Compaction-aware message reordering logic**: `packages/opencode/src/session/message-v2.ts:532-583` — Finds the most recent compaction, the summary following it, and the tail start ID, then reorders the array to place compaction-summary-tail in model-consumable order. Derives indices by max-id rather than position to prevent off-by-one errors across compaction boundaries.

<a id="g1-f058"></a>
### Schedule-based retry with state injection callback

`packages/opencode/src/session/retry.ts:176-199` @ 97e713e

**Schedule-based retry with state injection callback**: `packages/opencode/src/session/retry.ts:176-199` — The `policy` function returns a Schedule that parses the error, determines if it's retryable, computes the next delay, and calls `opts.set` to record retry metadata (attempt, message, action, next time) without coupling the scheduler to a specific storage layer.

<a id="g1-f059"></a>
### Hierarchical config scope resolution

`packages/opencode/src/session/instruction.ts:70-89` @ 97e713e

**Hierarchical config scope resolution**: `packages/opencode/src/session/instruction.ts:70-89` — Define a set of candidate filenames (AGENTS.md, CLAUDE.md), use globUp/findUp with early exit on first match, and provide different fallback sources (global vs. project-scoped) with feature flags to control scope.

<a id="g1-f060"></a>
### Idempotent attachment of contextual docs

`packages/opencode/src/session/instruction.ts:179-221` @ 97e713e

**Idempotent attachment of contextual docs**: `packages/opencode/src/session/instruction.ts:179-221` — Track attached files per message in a `Map<messageID, Set<filepath>>`. For each file access, check three dedup layers (system paths, message history, per-message claims). Scales to avoid quadratic prompt injection.

<a id="g1-f061"></a>
### Dual-runtime LLM abstraction

`packages/opencode/src/session/llm.ts:85-269` @ 97e713e

**Dual-runtime LLM abstraction**: `packages/opencode/src/session/llm.ts:85-269` — Define a discriminated result type (`type: "native" | "ai-sdk"`), try native runtime first with a structured response, and fall back to AI SDK. Both normalize to the same LLMEvent stream.

<a id="g1-f062"></a>
### Middleware-based message transform

`packages/opencode/src/session/llm.ts:280-354` @ 97e713e

**Middleware-based message transform**: `packages/opencode/src/session/llm.ts:280-354` — Uses AI SDK's `wrapLanguageModel` with a `transformParams` middleware that runs before provider execution, converting opencode message representation to provider-specific format without coupling the `llm.run` function.

<a id="g1-f063"></a>
### In-memory session store with Effect.Ref

`packages/opencode/src/acp/session.ts:94-138` @ 97e713e

**In-memory session store with Effect.Ref**: `packages/opencode/src/acp/session.ts:94-138` — Immutable updates via `modify` (returns result + next state), functional updates via callbacks, and snapshot copies on read/write to prevent external mutation. Scales to multi-session concurrent access without locks.

<a id="g1-f064"></a>
### InstanceState wrapper for mutable session-level state

`packages/opencode/src/session/run-state.ts:35-49` @ 97e713e

**InstanceState wrapper for mutable session-level state**: `packages/opencode/src/session/run-state.ts:35-49` — Wraps runners and scope in an InstanceState, providing Effect-based lazy initialization and automatic finalizer management.

<a id="g1-f065"></a>
### Cursor-based pagination with monotonic ID fallback

`packages/opencode/src/session/message-v2.ts:74-89` @ 97e713e

**Cursor-based pagination with monotonic ID fallback**: `packages/opencode/src/session/message-v2.ts:74-89` — The cursor encodes messageID and time_created; decoding validates both to ensure correct ordering. Queries use `older()` to filter messages before the cursor, and `reverse()` after retrieval to serve chronological order.

<a id="g1-f066"></a>
### Batch hydration with lazy part loading

`packages/opencode/src/session/message-v2.ts:109-134` @ 97e713e

**Batch hydration with lazy part loading**: `packages/opencode/src/session/message-v2.ts:109-134` — Messages and parts are fetched in two separate queries; parts are grouped by messageID in memory. Avoids N+1 queries while keeping the in-memory index simple.

<a id="g1-f067"></a>
### Tool result normalization and image attachment handling

`packages/opencode/src/session/processor.ts:350-369` @ 97e713e

**Tool result normalization and image attachment handling**: `packages/opencode/src/session/processor.ts:350-369` — `toolResultOutput()` coerces tool results to a standard shape (`title`, `metadata`, `output`, `attachments`), extracts file parts, and validates attachment URIs are `data:` URLs before persisting.

## Open threads / weak spots

<a id="g1-f068"></a>
### No explicit rate limiting or fleet concurrency cap

`packages/opencode/src/tool/task.ts:92-338` @ 97e713e

**No explicit rate limiting or fleet concurrency cap**: `packages/opencode/src/tool/task.ts:92-338` — Subagents are spawned synchronously without concurrency checks. A parent could launch unbounded children, relying on external BackgroundJob.Service to enforce limits.

<a id="g1-f069"></a>
### Metadata schema is untyped (Schema.Any)

`packages/opencode/src/session/session.ts:211` @ 97e713e

**Metadata schema is untyped (Schema.Any)**: `packages/opencode/src/session/session.ts:211` and `packages/opencode/src/tool/task.ts:175-185` — `metadata` is treated as `Record<string, any>`, allowing arbitrary keys. There is no validation that `parentSessionId` or `sessionId` are present in child metadata, enabling silent orchestration bugs.

<a id="g1-f070"></a>
### Doom loop detection with fuzzy threshold

`packages/opencode/src/session/processor.ts:522-546` @ 97e713e

**Doom loop detection with fuzzy threshold**: `packages/opencode/src/session/processor.ts:522-546` — If the last 3 recent tool parts are all for the same tool with the same input but different states (not pending), the processor asks permission before proceeding. This heuristic may not catch all infinite loops (e.g., different tools, or different inputs). No explicit loop depth limit exists beyond this check.

<a id="g1-f071"></a>
### Subtask and compaction task interleaving without concurrency limit

`packages/opencode/src/session/prompt.ts:1197-1200` @ 97e713e

**Subtask and compaction task interleaving without concurrency limit**: `packages/opencode/src/session/prompt.ts:1197-1200` — The loop pops a task from the task queue and branches on type (subtask vs compaction). No explicit concurrency limit or priority is enforced; high-latency subtasks will block the compaction queue.

<a id="g1-f072"></a>
### Instruction finalizer not guaranteed to run on exceptional exit

`packages/opencode/src/session/prompt.ts:1277-1347` @ 97e713e

**Instruction finalizer not guaranteed to run on exceptional exit**: `packages/opencode/src/session/prompt.ts:1277-1347` — `instruction.clear()` is added as a finalizer after `handle.process()` completes (line 1380). If the processor is interrupted before reaching the finalizer, the instruction may not be cleared, leaving stale data for the next step.

<a id="g1-f073"></a>
### Orphaned interrupted tool skip heuristic

`packages/opencode/src/session/prompt.ts:1156-1162` @ 97e713e

**Orphaned interrupted tool skip heuristic**: `packages/opencode/src/session/prompt.ts:1156-1162` — Tool calls marked as `error` with `metadata.interrupted === true` are skipped when determining if the loop should continue. This relies on the cleanup phase setting the interrupted flag consistently; partial cleanup may leave orphans improperly marked.

<a id="g1-f074"></a>
### TODO on provider-specific logic bleeding into agent generation

`packages/opencode/src/agent/agent.ts:379` @ 97e713e

**TODO on provider-specific logic bleeding into agent generation**: `packages/opencode/src/agent/agent.ts:379` — OpenAI OAuth handling in agent generation should be cleaned up; currently special-cases OAuth to avoid system prompt in the request.

<a id="g1-f075"></a>
### Background job extend() behavior is not fully documented

`packages/opencode/src/tool/task.ts:246-260` @ 97e713e

**Background job extend() behavior is not fully documented**: `packages/opencode/src/tool/task.ts:246-260` — `background.extend()` appends to a running job, but returns early if `extend()` succeeds, leaving the semantics of concurrent updates unclear (does it queue? merge? replace?).

<a id="g1-f076"></a>
### Session fork does not validate compaction link remapping

`packages/opencode/src/session/session.ts:767-769` @ 97e713e

**Session fork does not validate compaction link remapping**: `packages/opencode/src/session/session.ts:767-769` — Remaps `compaction.tail_start_id` if present but does not verify that the mapped ID exists in the forked messages, potentially leaving dangling references.

<a id="g1-f077"></a>
### Cost calculation heuristic for reasoning tokens

`packages/opencode/src/session/session.ts:447-448` @ 97e713e

**Cost calculation heuristic for reasoning tokens**: `packages/opencode/src/session/session.ts:447-448` — Charges reasoning tokens at the output rate; a TODO comment acknowledges this needs a better pricing model once models.dev is updated.

<a id="g1-f078"></a>
### Permission forwarding for external_directory does not validate path patterns

`packages/opencode/src/agent/subagent-permissions.ts:29-31` @ 97e713e

**Permission forwarding for external_directory does not validate path patterns**: `packages/opencode/src/agent/subagent-permissions.ts:29-31` — Forwards all parent `external_directory` and deny rules to the child without validating whether patterns are syntactically valid or still applicable in the child's execution context.

<a id="g1-f079"></a>
### Compaction filtering logic with unclear completion tracking

`packages/opencode/src/session/message-v2.ts:532-550` @ 97e713e

**Compaction filtering logic with unclear completion tracking**: `packages/opencode/src/session/message-v2.ts:532-550` — The `filterCompacted` function uses a `completed` set to track which user messages have received a finished assistant response, but the condition at line 550 is unreachable and the retain pointer semantics are implicit.

<a id="g1-f080"></a>
### Replay selection logic in overflow mode with terminal case

`packages/opencode/src/session/compaction.ts:320-336` @ 97e713e

**Replay selection logic in overflow mode with terminal case**: `packages/opencode/src/session/compaction.ts:320-336` — If `input.overflow` is true, the processor tries to find a prior non-compaction user message and replays it. If no prior user message exists (first turn), replay is undefined and the compaction is treated as terminal. This assumes the first turn always fits; if it doesn't, the session is stuck.

<a id="g1-f081"></a>
### Hard-coded compaction buffer size

`packages/opencode/src/session/overflow.ts:8` @ 97e713e

**Hard-coded compaction buffer size**: `packages/opencode/src/session/overflow.ts:8` — The COMPACTION_BUFFER is 20k tokens and is only overrideable via config. If a provider changes token counting or the model's output max, this value may not adapt automatically.

<a id="g1-f082"></a>
### Adaptive thinking separator workaround with unclear origin

`packages/opencode/src/session/message-v2.ts:275-286` @ 97e713e

**Adaptive thinking separator workaround with unclear origin**: `packages/opencode/src/session/message-v2.ts:275-286` — Inserts a single space to preserve signed reasoning block positions when Anthropic adaptive thinking creates empty text parts, but the comment notes it's unclear whether the shape comes from the stream processor, a proxy, or a lower-level library.

<a id="g1-f083"></a>
### TypeScript error suppression for AI SDK type mismatch

`packages/opencode/src/session/message-v2.ts:421-422` @ 97e713e

**TypeScript error suppression for AI SDK type mismatch**: `packages/opencode/src/session/message-v2.ts:421-422` — Casts `tools` as a ToolSet but only provides `tools[name].toModelOutput`, suppressing a `@ts-expect-error`. This tight coupling to the AI SDK's internal interface may break on version upgrades.

<a id="g1-f084"></a>
### Tool execution wrapped in EffectBridge.promise with no explicit timeout

`packages/opencode/src/session/tools.ts:83-112` @ 97e713e

**Tool execution wrapped in EffectBridge.promise with no explicit timeout**: `packages/opencode/src/session/tools.ts:83-112` — The code awaits tool execution as a promise via the EffectBridge with no visible timeout or cancellation deadline, allowing a hung tool to block indefinitely.

<a id="g1-f085"></a>
### Dual-write migration in processor

`packages/opencode/src/session/processor.ts:250-266` @ 97e713e

**Dual-write migration in processor**: `packages/opencode/src/session/processor.ts:250-266` — Code is marked "Temporary dual-write while migrating session messages to v2 events." Both V1 session record and V2 events are written simultaneously. Once migration is complete, branches checking `mirrorAssistant` and event emission can be removed.

<a id="g1-f086"></a>
### Read tool execution inside prompt resolution

`packages/opencode/src/session/processor.ts:797-809` @ 97e713e

**Read tool execution inside prompt resolution**: `packages/opencode/src/session/processor.ts:797-809` — During `createUserMessage()`, if a file part is resolved, the `read` tool is executed synchronously via `execRead()` with `bypassCwdCheck: true`. This executes arbitrary reads inline during prompt setup, which could fail silently or buffer large outputs into memory before the stream starts.

<a id="g1-f087"></a>
### No transaction semantics across multiple updates

`packages/opencode/src/acp/session.ts:119-128` @ 97e713e

**No transaction semantics across multiple updates**: `packages/opencode/src/acp/session.ts:119-128` — If `recordPartMetadata` and `setModel` are called concurrently on the same session, they each see and write back an independent snapshot. Later writes overwrite earlier ones; no atomicity guarantee across multiple field updates.

<a id="g1-f088"></a>
### Unreachable condition in reminders

`packages/opencode/src/session/reminders.ts:70` @ 97e713e

**Unreachable condition in reminders**: `packages/opencode/src/session/reminders.ts:70` — Line 70 checks `input.agent.name !== "plan" || assistantMessage?.info.agent === "plan"` immediately after line 52's check for the inverse. If the prior block returned, this is dead code; if not, the condition logic appears inverted.

<a id="g1-f089"></a>
### Glob pattern handling without filter for instruction files

`packages/opencode/src/session/instruction.ts:81-89` @ 97e713e

**Glob pattern handling without filter for instruction files**: `packages/opencode/src/session/instruction.ts:81-89` — The globUp and findUp calls do not validate the result against the original file being read. If a user reads a file with the same name as AGENTS.md in an ancestor, it could be attached as an instruction.

<a id="g1-f090"></a>
### GitHub Copilot billing workaround

`packages/opencode/src/session/llm.ts:294-295` @ 97e713e

**GitHub Copilot billing workaround**: `packages/opencode/src/session/llm.ts:294-295` — Comment notes that Copilot returns billed amount only in provider-specific response fields, so `includeRawChunks` must be set only for Copilot. This is a provider-specific hack that could break silently if Copilot's response shape changes.

<a id="g1-f091"></a>
### Fallback tool name repair heuristic

`packages/opencode/src/session/llm.ts:296-311` @ 97e713e

**Fallback tool name repair heuristic**: `packages/opencode/src/session/llm.ts:296-311` — If a tool call fails, the system auto-repairs by lowercasing the tool name. If that matches a prepared tool, it's silently reused; if not, the call is redirected to an "invalid" tool. This masks provider-side tool name bugs and could hide real errors.

