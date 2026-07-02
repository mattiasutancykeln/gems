# claude-agent-sdk-python

| | |
|---|---|
| Source | https://github.com/anthropics/claude-agent-sdk-python |
| Repo | https://github.com/anthropics/claude-agent-sdk-python @ `7c37e3478448f9166493581cbd9e5a53b39a3a89` |
| Kind | repo |
| Topics | agent |
| License | MIT (permissive) |
| Verdict | - |
| Findings | 57 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/14 |

## Implementation decisions

<a id="g14-f001"></a>
### AgentDefinition dataclass is the compact delegation contract

`src/claude_agent_sdk/types.py:83-102` @ 7c37e34

`src/claude_agent_sdk/types.py:83-102` — `AgentDefinition` dataclass is the compact delegation contract: agent prompt, description, optional tools/skills allowlist, model alias/ID, memory scope ("user"/"project"/"local"), MCP servers, initial prompt, max turns, background mode, effort level, and permission mode. Agent definitions are passed as a dict mapping names to `AgentDefinition` objects, allowing dynamic subagent declaration without external files.

<a id="g14-f002"></a>
### SubagentStartHookInput and SubagentStopHookInput both carry agent_id (unique per sub-agent) and agent_type (human-readable name)

`src/claude_agent_sdk/types.py:379-385` @ 7c37e34

`src/claude_agent_sdk/types.py:379-385` — `SubagentStartHookInput` and `SubagentStopHookInput` both carry `agent_id` (unique per sub-agent) and `agent_type` (human-readable name). This is the sole fleet-tracking primitive: parent processes attribute interleaved tool calls to the correct child via the `agent_id` discriminator on each event, with no explicit fleet registry.

<a id="g14-f003"></a>
### concurrently

`src/claude_agent_sdk/types.py:1760-1771` @ 7c37e34

`src/claude_agent_sdk/types.py:1760-1771` — Hooks dispatch concurrently for the same event; multiple matchers fire in parallel with no sequential ordering guarantee. Hook callbacks must be designed as independent functions.

<a id="g14-f004"></a>
### Task control is minimal

`src/claude_agent_sdk/types.py:2007-2010` @ 7c37e34

`src/claude_agent_sdk/types.py:2007-2010` — Task control is minimal: a single `SDKControlStopTaskRequest` with a task_id string. No fleet-level cancellation primitives; cancellation is single-task-focused. `SDKControlRequest` is a large discriminated union (11+ variants) with no `cancel_all_children` or `get_fleet_status` operations.

<a id="g14-f005"></a>
### Skills use context-filtering, not sandboxing

`src/claude_agent_sdk/types.py:1812-1830` @ 7c37e34

`src/claude_agent_sdk/types.py:1812-1830` — Skills use context-filtering, not sandboxing: unlisted skills are hidden from model context and rejected by the Skill tool, but files remain accessible via Read/Bash. Secrets must not be stored in skill files.

<a id="g14-f006"></a>
### Session store mirroring decouples local-disk durability from external storage: entries are appended locally first, then mirrored asynchronously in batched (~100ms cadence, 500 entries/1 MiB) or eager (background-flush per frame) mode

`src/claude_agent_sdk/types.py:1905-1921` @ 7c37e34

`src/claude_agent_sdk/types.py:1905-1921` — Session store mirroring decouples local-disk durability from external storage: entries are appended locally first, then mirrored asynchronously in batched (~100ms cadence, 500 entries/1 MiB) or eager (background-flush per frame) mode. Slow adapters do not stall the read loop.

<a id="g14-f007"></a>
### SessionStore protocol is duck-typed

`src/claude_agent_sdk/types.py:1370-1390` @ 7c37e34

`src/claude_agent_sdk/types.py:1370-1390` — `SessionStore` protocol is duck-typed: only `append` and `load` are required; `delete`, `list_subkeys`, etc. are optional and probed at runtime. Adapters are free to use any backend (S3, Postgres, Redis).

<a id="g14-f008"></a>
### Active subprocess children are tracked in a module-level set with atexit cleanup (mirrors…

`src/claude_agent_sdk/_internal/transport/subprocess_cli.py:35-47` @ 7c37e34

`src/claude_agent_sdk/_internal/transport/subprocess_cli.py:35-47` — Active subprocess children are tracked in a module-level set with atexit cleanup (mirrors TypeScript SDK) to prevent orphaned `claude` processes when callers crash before awaiting close().

<a id="g14-f009"></a>
### Graceful subprocess shutdown uses a 5-second grace period after stdin EOF for session…

`src/claude_agent_sdk/_internal/transport/subprocess_cli.py:573-593` @ 7c37e34

`src/claude_agent_sdk/_internal/transport/subprocess_cli.py:573-593` — Graceful subprocess shutdown uses a 5-second grace period after stdin EOF for session file flushing, then SIGTERM, then SIGKILL after another 5 seconds.

<a id="g14-f010"></a>
### Error message tracking resets _last_error_result_text only after non-error message types, distinguishing fresh crashes from expected exits following error results

`src/claude_agent_sdk/_internal/query.py:319-320` @ 7c37e34

`src/claude_agent_sdk/_internal/query.py:319-320` — Error message tracking resets `_last_error_result_text` only after non-error message types, distinguishing fresh crashes from expected exits following error results; structured error text replaces generic "exit code 1" ProcessError.

<a id="g14-f011"></a>
### Stdin closure is deferred until after the first result when SDK MCP servers or hooks are…

`src/claude_agent_sdk/_internal/query.py:809-827` @ 7c37e34

`src/claude_agent_sdk/_internal/query.py:809-827` — Stdin closure is deferred until after the first result when SDK MCP servers or hooks are present, ensuring bidirectional control protocol communication completes before the subprocess loses stdin.

<a id="g14-f012"></a>
### Session resume/materialize path uses a temp CLAUDE_CONFIG_DIR for the subprocess

`src/claude_agent_sdk/_internal/client.py:69-89` @ 7c37e34

`src/claude_agent_sdk/_internal/client.py:69-89` — Session resume/materialize path uses a temp `CLAUDE_CONFIG_DIR` for the subprocess; cleanup happens in a shielded finally block before transport teardown to prevent the subprocess from accessing deleted files. Skipped when a custom transport is supplied.

<a id="g14-f013"></a>
### _STORE_LIST_LOAD_CONCURRENCY = 16 caps concurrent store.load() calls during listing to…

`src/claude_agent_sdk/_internal/sessions.py:38` @ 7c37e34

`src/claude_agent_sdk/_internal/sessions.py:38` — `_STORE_LIST_LOAD_CONCURRENCY = 16` caps concurrent `store.load()` calls during listing to prevent adapter connection pool exhaustion and backend rate limits.

<a id="g14-f014"></a>
### _build_conversation_chain indexes entries by uuid, finds terminals (no children pointing to them), picks the best leaf by type + position tie-break, walks parentUuid backward to root, then reverses to chronological order

`src/claude_agent_sdk/_internal/sessions.py:931-1020` @ 7c37e34

`src/claude_agent_sdk/_internal/sessions.py:931-1020` — `_build_conversation_chain` indexes entries by uuid, finds terminals (no children pointing to them), picks the best leaf by type + position tie-break, walks `parentUuid` backward to root, then reverses to chronological order. Intentionally skips `logicalParentUuid` (post-compaction synthesis link) to avoid duplicating summarized content.

<a id="g14-f015"></a>
### SessionStore.append() folds fold_session_summary() incrementally on every write and…

`src/claude_agent_sdk/_internal/session_store.py:64-81` @ 7c37e34

`src/claude_agent_sdk/_internal/session_store.py:64-81` — `SessionStore.append()` folds `fold_session_summary()` incrementally on every write and stamps mtime with storage write time (not entry timestamp), enabling staleness check: `summary.mtime < list_sessions.mtime` without re-reading source entries.

<a id="g14-f016"></a>
### _is_safe_subpath rejects empty strings, absolute paths, .

`src/claude_agent_sdk/_internal/session_resume.py:504-536` @ 7c37e34

`src/claude_agent_sdk/_internal/session_resume.py:504-536` — `_is_safe_subpath` rejects empty strings, absolute paths, `..`, NUL bytes, drive prefixes, and validates resolved path stays under `session_dir` — prevents symlink escapes and path traversal when writing untrusted store keys to disk.

<a id="g14-f017"></a>
### max_thinking_tokens is deprecated in favor of a thinking TypedDict

`src/claude_agent_sdk/types.py:1851-1859` @ 7c37e34

`src/claude_agent_sdk/types.py:1851-1859` — `max_thinking_tokens` is deprecated in favor of a `thinking` TypedDict; on newer models, legacy field is treated as on/off (0 = disabled, other = adaptive). Callers passing both fields risk subtle migration bugs.

## Skills, prompts, tools

<a id="g14-f018"></a>
### CanUseTool callback receives tool name, input dict, and ToolPermissionContext with tool_use_id (unique per tool call in message), optional agent_id (sub-agent context), blocked_path , and decision_reason

`src/claude_agent_sdk/types.py:196-255` @ 7c37e34

`src/claude_agent_sdk/types.py:196-255` — `CanUseTool` callback receives tool name, input dict, and `ToolPermissionContext` with `tool_use_id` (unique per tool call in message), optional `agent_id` (sub-agent context), `blocked_path`, and `decision_reason`. Returns `PermissionResultAllow` (can specify `updated_input` and `updated_permissions`) or `PermissionResultDeny` (can interrupt). This is the fine-grained tool-gating boundary. (Also: `src/claude_agent_sdk/_internal/query.py:384-436`)

<a id="g14-f019"></a>
### Hook outputs support permissionDecision ("allow"/"deny"/"ask"/"defer"), additionalContext strings to inject into the model, and updatedToolOutput (tool result transformation)

`src/claude_agent_sdk/types.py:412-437` @ 7c37e34

`src/claude_agent_sdk/types.py:412-437` — Hook outputs support `permissionDecision` ("allow"/"deny"/"ask"/"defer"), `additionalContext` strings to inject into the model, and `updatedToolOutput` (tool result transformation). `defer` halts the run, surfacing a `DeferredToolUse` (id, name, input) so the caller can inspect and decide resumption.

<a id="g14-f020"></a>
### HookCallback signature

`src/claude_agent_sdk/types.py:573-580` @ 7c37e34

`src/claude_agent_sdk/types.py:573-580` — `HookCallback` signature: `Callable[[HookInput, str | None, HookContext], Awaitable[HookJSONOutput]]` — strongly-typed input, optional `tool_use_id`, and a context placeholder reserved for future abort signal support.

<a id="g14-f021"></a>
### SystemPromptPreset with exclude_dynamic_sections flag strips per-user dynamic content (cwd, auto-memory, git status) from the system prompt for cross-user prompt-caching hits

`src/claude_agent_sdk/types.py:36-53` @ 7c37e34

`src/claude_agent_sdk/types.py:36-53` — `SystemPromptPreset` with `exclude_dynamic_sections` flag strips per-user dynamic content (cwd, auto-memory, git status) from the system prompt for cross-user prompt-caching hits; content is re-injected into the first user message so the model retains access. (Also: `examples/system_prompt.py:62-68` — `{"type": "preset", "preset": "...", "append": "..."}` compose from baseline without full duplication.)

<a id="g14-f022"></a>
### SDK MCP tool decorator and create_sdk_mcp_server factory enable in-process tool registration with JSON schema generation from Python types

`src/claude_agent_sdk/types.py:166-232` @ 7c37e34

`src/claude_agent_sdk/types.py:166-232` — SDK MCP tool decorator and `create_sdk_mcp_server` factory enable in-process tool registration with JSON schema generation from Python types; tools run in-application without subprocess/IPC overhead, providing direct state access.

<a id="g14-f023"></a>
### Task lifecycle messages ( TaskStarted , TaskProgress , TaskNotification ) carry task_id , description, usage breakdown ( total_tokens , tool_uses , duration_ms ), and tool_use_id (parent context)

`src/claude_agent_sdk/types.py:1047-1111` @ 7c37e34

`src/claude_agent_sdk/types.py:1047-1111` — Task lifecycle messages (`TaskStarted`, `TaskProgress`, `TaskNotification`) carry `task_id`, description, usage breakdown (`total_tokens`, `tool_uses`, `duration_ms`), and `tool_use_id` (parent context). Enables parent to track child resource consumption and completion status.

<a id="g14-f024"></a>
### Query initialization bundles agents dict, exclude_dynamic_sections , initialize_timeout , can_use_tool callback, sdk_mcp_servers , hooks, and skills into a single initialize request

`src/claude_agent_sdk/client.py:224-237` @ 7c37e34

`src/claude_agent_sdk/client.py:224-237` — Query initialization bundles `agents` dict, `exclude_dynamic_sections`, `initialize_timeout`, `can_use_tool` callback, `sdk_mcp_servers`, hooks, and skills into a single initialize request. The control protocol is stateful — follow-on requests (`set_permission_mode`, `set_model`, `stop_task`) are lightweight.

<a id="g14-f025"></a>
### query() is unidirectional (send all upfront, receive all responses)

`src/claude_agent_sdk/query.py:11-127` @ 7c37e34

`src/claude_agent_sdk/query.py:11-127` — `query()` is unidirectional (send all upfront, receive all responses); accepts a string prompt or `AsyncIterable[dict]` for streaming. Stateless, fire-and-forget, no interrupts. Contrasts with `ClaudeSDKClient` which is bidirectional and stateful.

<a id="g14-f026"></a>
### Hook callback responses convert Python-safe field names ( async_ , continue_ ) to…

`src/claude_agent_sdk/_internal/query.py:438-452` @ 7c37e34

`src/claude_agent_sdk/_internal/query.py:438-452` — Hook callback responses convert Python-safe field names (`async_`, `continue_`) to CLI-expected names (`async`, `continue`) before sending via control response.

<a id="g14-f027"></a>
### Skills option injection automatically appends bare "Skill" tool (for "all" mode) or Skill(name) patterns per skill

`src/claude_agent_sdk/_internal/transport/subprocess_cli.py:183-219` @ 7c37e34

`src/claude_agent_sdk/_internal/transport/subprocess_cli.py:183-219` — Skills option injection automatically appends bare "Skill" tool (for "all" mode) or `Skill(name)` patterns per skill; defaults `setting_sources` to `["user", "project"]` when skills are specified so the CLI discovers installed skills without explicit sourcing.

<a id="g14-f028"></a>
### _parse_session_info_from_lite extracts structured metadata (title, first prompt, git…

`src/claude_agent_sdk/_internal/sessions.py:420-511` @ 7c37e34

`src/claude_agent_sdk/_internal/sessions.py:420-511` — `_parse_session_info_from_lite` extracts structured metadata (title, first prompt, git branch, tag, created_at) from head/tail slices with fallback precedence: `customTitle` > `aiTitle` > `lastPrompt` > `summary` > `first_prompt` — designed for catalog display without full JSONL parse.

<a id="g14-f029"></a>
### setting_sources=["project"] defers agent discovery to a SystemMessage with "init" subtype, loading agents from .claude/agents/ markdown files

`examples/filesystem_agents.py:28-68` @ 7c37e34

`examples/filesystem_agents.py:28-68` — `setting_sources=["project"]` defers agent discovery to a `SystemMessage` with "init" subtype, loading agents from `.claude/agents/` markdown files. Agent extraction function handles both string names and dicts with a `name` field.

## Patterns worth porting

<a id="g14-f030"></a>
### Subagent context mixin for fleet attribution

`src/claude_agent_sdk/types.py:289-306` @ 7c37e34

`_SubagentContextMixin` (optional `agent_id` and `agent_type` fields) mixed into tool-lifecycle hook inputs attributes interleaved parallel tool calls to the correct sub-agent — no explicit fleet registry needed (`src/claude_agent_sdk/types.py:289-306`).

<a id="g14-f031"></a>
### Task-level usage rollup

`src/claude_agent_sdk/types.py:1047-1111` @ 7c37e34

`TaskProgress` messages carry `total_tokens`, `tool_uses`, `duration_ms`, and `tool_use_id` — parent can aggregate child resource consumption without a separate accounting layer (`src/claude_agent_sdk/types.py:1047-1111`).

<a id="g14-f032"></a>
### Inflight request tracking with cancellation

`_internal/query.py:236-245` @ 7c37e34

`_internal/query.py:236-245` maps `request_id` to `TaskHandle`; done callback cleans up the mapping; cancellation propagates via `control_cancel_request` with `request_id`, allowing selective child cancellation by ID.

<a id="g14-f033"></a>
### Deferred tool use for human-in-the-loop

`src/claude_agent_sdk/types.py:1130-1142` @ 7c37e34

`DeferredToolUse` (id, name, input dict) surfaces when a PreToolUse hook returns `"defer"`, halting the run and allowing the caller to inspect and decide resumption (`src/claude_agent_sdk/types.py:1130-1142`).

<a id="g14-f034"></a>
### Session store append/load contract

`src/claude_agent_sdk/types.py:1392-1428` @ 7c37e34

`append` called after local write succeeds (durability guaranteed); entries carry `uuid` idempotency keys; `load` returns full session or `None`. Batched or eager flush — adapters decouple from flush timing (`src/claude_agent_sdk/types.py:1392-1428`).

<a id="g14-f035"></a>
### SessionKey struct with subpath for subagent transcripts

`src/claude_agent_sdk/types.py:1276-1296` @ 7c37e34

`project_key/session_id[/subpath]` mirrors on-disk structure; multi-tenant deployments override `project_key` with a tenant ID; long paths are hashed for portability (`src/claude_agent_sdk/types.py:1276-1296`).

<a id="g14-f036"></a>
### Store-to-filesystem materialization for subprocess CLI

`src/claude_agent_sdk/_internal/session_resume.py:123-193` @ 7c37e34

Load from store, write temp `CLAUDE_CONFIG_DIR`, copy auth files, conditionally materialize subagent transcripts (only if store implements `list_subkeys`), return cleanup coroutine — isolates store logic from file-only CLI path (`src/claude_agent_sdk/_internal/session_resume.py:123-193`).

<a id="g14-f037"></a>
### Subpath safety validation

`src/claude_agent_sdk/_internal/session_resume.py:504-536` @ 7c37e34

`_is_safe_subpath` rejects absolute, `..`, NUL bytes, drive prefixes, validates resolution under parent — applies to any store-to-filesystem materialization (`src/claude_agent_sdk/_internal/session_resume.py:504-536`).

<a id="g14-f038"></a>
### Bounded concurrency for store enumeration

`src/claude_agent_sdk/_internal/sessions.py:1539-1549` @ 7c37e34

`anyio.CapacityLimiter(16)` limits concurrent `load()` calls; per-entry exception handling degrades to empty summary (not whole-list failure) — prevents connection pool exhaustion with graceful degradation (`src/claude_agent_sdk/_internal/sessions.py:1539-1549`).

<a id="g14-f039"></a>
### Lite metadata from head/tail slices

`src/claude_agent_sdk/_internal/sessions.py:341-350` @ 7c37e34

65KB head + 65KB tail buffers + regex field extraction avoids full JSONL parse for catalog operations; field-search precedence models multi-source fallback (`src/claude_agent_sdk/_internal/sessions.py:341-350`).

<a id="g14-f040"></a>
### Incremental summary sidecar on append

`src/claude_agent_sdk/_internal/session_store.py:64-81` @ 7c37e34

`fold_session_summary()` called on every `append()`, stamped with storage write time; enables staleness check without re-reading source entries (`src/claude_agent_sdk/_internal/session_store.py:64-81`).

<a id="g14-f041"></a>
### Conversation chain from uuid/parentUuid links

`src/claude_agent_sdk/_internal/sessions.py:931-1020` @ 7c37e34

Index -> find terminals -> pick best leaf by type + position -> walk `parentUuid` backward -> reverse; `logicalParentUuid` skip prevents post-compaction duplication (`src/claude_agent_sdk/_internal/sessions.py:931-1020`).

<a id="g14-f042"></a>
### JSON message buffer with speculative parsing

`src/claude_agent_sdk/_internal/transport/subprocess_cli.py:636-694` @ 7c37e34

Non-JSON lines mid-parse are discarded; lines not starting with `{` when buffer is empty are skipped (preventing `[SandboxDebug]` prefix corruption); buffer size limit raises `SDKJSONDecodeError` with context (`src/claude_agent_sdk/_internal/transport/subprocess_cli.py:636-694`).

<a id="g14-f043"></a>
### Permission callback requires streaming mode

`src/claude_agent_sdk/client.py:159-178` @ 7c37e34

`can_use_tool` auto-sets permission mode to "stdio"; mutually exclusive with `permission_prompt_tool_name`; raises immediately if set with a string prompt — enforces bidirectional control protocol routing (`src/claude_agent_sdk/client.py:159-178`).

<a id="g14-f044"></a>
### Filesystem-backed agent loading via setting_sources

`examples/filesystem_agents.py:28-68` @ 7c37e34

`setting_sources=["project"]` triggers agent discovery from `.claude/agents/*.md`; agents surface in an "init" `SystemMessage` so orchestrator can inspect available agents without hardcoding (`examples/filesystem_agents.py:28-68`).

## Open threads / weak spots

<a id="g14-f045"></a>
### SDKControlRequest has 11+ variants with no fleet-level operations: no cancel_all_children , get_fleet_status , or parallel-spawn primitive

`src/claude_agent_sdk/types.py:2012-2027` @ 7c37e34

`src/claude_agent_sdk/types.py:2012-2027` — `SDKControlRequest` has 11+ variants with no fleet-level operations: no `cancel_all_children`, `get_fleet_status`, or parallel-spawn primitive. Fleet control is purely emergent from single-task stop + agent_id attribution.

<a id="g14-f046"></a>
### TODO

`src/claude_agent_sdk/_internal/query.py:391-398` @ 7c37e34

`src/claude_agent_sdk/_internal/query.py:391-398` — TODO: abort signal support in `ToolPermissionContext` and hook callbacks; signal field is currently `None`; intent is documented but not wired.

<a id="g14-f047"></a>
### TODO

`src/claude_agent_sdk/_internal/query.py:579-584` @ 7c37e34

`src/claude_agent_sdk/_internal/query.py:579-584` — TODO: Python MCP SDK lacks the Transport abstraction TypeScript SDK has; manual method routing required (`initialize`, `tools/list`, `tools/call`, `notifications/initialized`); refactoring deferred pending Python MCP SDK Transport support.

<a id="g14-f048"></a>
### Hook event detection uses three fallback fields ( hook_event , hook_name , hook_event_name ) because the wire format varies

`src/claude_agent_sdk/_internal/message_parser.py:54-66` @ 7c37e34

`src/claude_agent_sdk/_internal/message_parser.py:54-66` — Hook event detection uses three fallback fields (`hook_event`, `hook_name`, `hook_event_name`) because the wire format varies; no single canonical field name exists.

<a id="g14-f049"></a>
### Caveat on v0.0.20

`src/claude_agent_sdk/client.py:64-65` @ 7c37e34

`src/claude_agent_sdk/client.py:64-65` — Caveat on v0.0.20: `ClaudeSDKClient` cannot be used across different async runtime contexts (e.g., different trio nurseries); internal anyio task group persists from `connect()` to `disconnect()`.

<a id="g14-f050"></a>
### JSON buffer line-splitting may not preserve complete objects across split boundaries

`src/claude_agent_sdk/_internal/transport/subprocess_cli.py:656-671` @ 7c37e34

`src/claude_agent_sdk/_internal/transport/subprocess_cli.py:656-671` — JSON buffer line-splitting may not preserve complete objects across split boundaries; if a single JSON object exceeds `MAX_BUFFER_SIZE`, raises error after accumulation, but the split logic lacks delimiter awareness.

<a id="g14-f051"></a>
### _rmtree_with_retry falls back to ignore_errors=True after exhausting retries

`src/claude_agent_sdk/_internal/session_resume.py:214-244` @ 7c37e34

`src/claude_agent_sdk/_internal/session_resume.py:214-244` — `_rmtree_with_retry` falls back to `ignore_errors=True` after exhausting retries; silent fallback could leak credentials in `.credentials.json` if temp dir is truly broken.

<a id="g14-f052"></a>
### _copy_auth_files has asymmetric source resolution

`src/claude_agent_sdk/_internal/session_resume.py:319-366` @ 7c37e34

`src/claude_agent_sdk/_internal/session_resume.py:319-366` — `_copy_auth_files` has asymmetric source resolution: `.credentials.json` under `config_dir`, `.claude.json` at `config_dir` (if set) or `~/.claude.json` (if not); documented but surprising.

<a id="g14-f053"></a>
### _SKIP_FIRST_PROMPT_PATTERN hard-codes IDE message types ( local-command-stdout , session-start-hook , ide_opened_file , ide_selection )

`src/claude_agent_sdk/_internal/sessions.py:52-57` @ 7c37e34

`src/claude_agent_sdk/_internal/sessions.py:52-57` — `_SKIP_FIRST_PROMPT_PATTERN` hard-codes IDE message types (`local-command-stdout`, `session-start-hook`, `ide_opened_file`, `ide_selection`); adding new types requires manual pattern updates.

<a id="g14-f054"></a>
### Hash mismatch tolerance for long paths (>200 chars) compensates for Bun vs

`src/claude_agent_sdk/_internal/sessions.py:162-164` @ 7c37e34

`src/claude_agent_sdk/_internal/sessions.py:162-164` — Hash mismatch tolerance for long paths (>200 chars) compensates for Bun vs. Node.js hash divergence; prefix-based fallback indicates fragile cross-platform path sanitization.

<a id="g14-f055"></a>
### InMemorySessionStore documented as test-only but no runtime guard prevents production…

`src/claude_agent_sdk/_internal/session_store.py:35-41` @ 7c37e34

`src/claude_agent_sdk/_internal/session_store.py:35-41` — `InMemorySessionStore` documented as test-only but no runtime guard prevents production misuse.

<a id="g14-f056"></a>
### get_session_info worktree fallback iterates all worktree_paths if canonical dir lookup fails

`src/claude_agent_sdk/_internal/sessions.py:1162-1174` @ 7c37e34

`src/claude_agent_sdk/_internal/sessions.py:1162-1174` — `get_session_info` worktree fallback iterates all `worktree_paths` if canonical dir lookup fails; O(n) per single-session lookup without caching for projects with many worktrees.

<a id="g14-f057"></a>
### Agent invocation relies on LLM parsing a natural-language request to select and invoke a named agent

`examples/agents.py:40-42` @ 7c37e34

`examples/agents.py:40-42` — Agent invocation relies on LLM parsing a natural-language request to select and invoke a named agent; no structured agent-spawn API is visible. No parallel agent execution, cancellation, or parent-child context isolation is demonstrated.

