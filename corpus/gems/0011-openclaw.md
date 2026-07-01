# openclaw

| | |
|---|---|
| Source | https://github.com/openclaw/openclaw |
| Repo | https://github.com/openclaw/openclaw @ `c84e52192063f598a3ec8864181941043e17223a` |
| Kind | repo |
| Topics | agent |
| License | none (forbidden) |
| Verdict | - |
| Findings | 91 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/11 |

## Implementation decisions

<a id="g11-f001"></a>
### Spawn delivery routing checks thread-binding readiness ( deliverInitialChildRunDirectly ) before calling agent method…

`src/agents/subagent-spawn.ts:1546-1590` @ c84e521

`src/agents/subagent-spawn.ts:1546-1590` — Spawn delivery routing checks thread-binding readiness (`deliverInitialChildRunDirectly`) before calling `agent` method. Thread-bound children receive their initial run directly to the channel/thread; otherwise the parent polls via `sessions_list`. Eliminates artificial latency on thread-bound spawns.

<a id="g11-f002"></a>
### Context preparation (fork vs. isolated) is a separate state machine returning a discriminated PreparedSpawnContext un…

`src/agents/subagent-spawn.ts:482-589` @ c84e521

`src/agents/subagent-spawn.ts:482-589` — Context preparation (fork vs. isolated) is a separate state machine returning a discriminated `PreparedSpawnContext` union (`ok` + mode + forked metadata, or error). Fork fallback to isolated is explicit, making context-inheritance decisions auditable at spawn time.

<a id="g11-f003"></a>
### Child session patching is factored into buildDirectChildSessionPatch() , which validates each field (spawnDepth, suba…

`src/agents/subagent-spawn.ts:313-358` @ c84e521

`src/agents/subagent-spawn.ts:313-358` — Child session patching is factored into `buildDirectChildSessionPatch()`, which validates each field (spawnDepth, subagentRole, controlScope, tool deny/allow lists, thinking level, model) individually rather than blind-merging. Gates invalid config before it reaches the store.

<a id="g11-f004"></a>
### Timeout decoupling

`src/agents/subagent-spawn.ts:163-165` @ c84e521

`src/agents/subagent-spawn.ts:163-165` — Timeout decoupling: `SUBAGENT_CONTROL_GATEWAY_TIMEOUT_MS` (60 s) is fixed for control-plane ops while `resolveSubagentAgentGatewayTimeoutMs()` scales per-run timeout dynamically, preventing control-plane saturation under long-running children.

<a id="g11-f005"></a>
### Role/scope derived from depth

`src/agents/subagent-capabilities.ts:161-175` @ c84e521

`src/agents/subagent-capabilities.ts:161-175` — Role/scope derived from depth: `resolveSubagentRoleForDepth()` maps depth ≤0 "main", depth <maxSpawnDepth "orchestrator", else "leaf"; `controlScope` is "children" for non-leaf roles. Explicit stored overrides replace fallback behavior; no separate role table needed.

<a id="g11-f006"></a>
### (also )

`src/agents/subagent-registry.ts:200-228` @ c84e521

`src/agents/subagent-registry.ts:200-228` (also `src/agents/subagent-registry.ts:304-315`) — Graceful terminal-event deferral: 15 s grace timers buffer premature error/timeout events; a new `start` phase arriving before grace expiry clears the pending terminal, letting the runtime retry without parent interference. `resumedRuns` and `endedHookInFlightRunIds` sets dedupe in-flight state.

<a id="g11-f007"></a>
### Lazy delivery-payload capture

`src/agents/subagent-registry-lifecycle.ts:547-558` @ c84e521

`src/agents/subagent-registry-lifecycle.ts:547-558` — Lazy delivery-payload capture: `markPendingFinalDelivery()` records the completion snapshot once, preserving the immutable final result across retry cycles until announce succeeds or give-up suspends. Prevents mutated mid-retry payloads.

<a id="g11-f008"></a>
### Cleanup decision tree

`src/agents/subagent-registry-lifecycle.ts:881-890` @ c84e521

`src/agents/subagent-registry-lifecycle.ts:881-890` — Cleanup decision tree: branches on active-descendant count, expiry age, and retry budget defer (wait for descendants), retry (with backoff), or give-up (suspend or fail). Defer sets `wakeOnDescendantSettle = true`; sweep checks this flag when descendant count drops.

<a id="g11-f009"></a>
### Resume retry backoff

`src/agents/subagent-registry.ts:615-708` @ c84e521

`src/agents/subagent-registry.ts:615-708` — Resume retry backoff: `resumeSubagentRun()` skips retries if delivery is suspended, expiry passed, or retry limit exhausted; schedules exponential backoff via `resolveAnnounceRetryDelayMs()` and stores the timer to dedupe simultaneous resume calls.

<a id="g11-f010"></a>
### Outcome equality respects timing optionality

`src/agents/subagent-registry-completion.ts:22-63` @ c84e521

`src/agents/subagent-registry-completion.ts:22-63` — Outcome equality respects timing optionality: `runOutcomesEqual()` returns true when status and error match even if one outcome lacks timing; `shouldUpdateRunOutcome()` replaces current state only if status differs OR current lacks timing but next has it.

<a id="g11-f011"></a>
### 500 ms read-cache TTL for cross-process registry visibility

`src/agents/subagent-registry-state.ts:12-50` @ c84e521

`src/agents/subagent-registry-state.ts:12-50` — 500 ms read-cache TTL for cross-process registry visibility: persisted state merges with in-memory runs; writes refresh cache immediately so callers get consistent state without DB round-trips on every read.

<a id="g11-f012"></a>
### Three-way cleanup decision matrix

`src/agents/subagent-registry-cleanup.ts:13-79` @ c84e521

`src/agents/subagent-registry-cleanup.ts:13-79` — Three-way cleanup decision matrix: defer-descendants, retry, give-up. Retry limits and expiry times are parameterized, enabling per-deployment tuning and isolated test fast-mode without code changes.

<a id="g11-f013"></a>
### Phased delivery strategy

`src/agents/subagent-announce-dispatch.ts:62-132` @ c84e521

`src/agents/subagent-announce-dispatch.ts:62-132` — Phased delivery strategy: steer-primary direct-primary steer-fallback. Prioritizes external direct delivery over orchestrator steering for completed tasks, with phase-evidence recording for observability.

<a id="g11-f014"></a>
### Wake continuation

`src/agents/subagent-announce.ts:167-231` @ c84e521

`src/agents/subagent-announce.ts:167-231` — Wake continuation: when a parent finishes waiting for descendants it can be re-awakened via a new run (suffix `:wake`) with findings, enabling stateless continue-from-descendants workflows without storing child state between runs.

<a id="g11-f015"></a>
### Cascade kill recursion with cycle-detection

`src/agents/subagent-control.ts:214-276` @ c84e521

`src/agents/subagent-control.ts:214-276` — Cascade kill recursion with cycle-detection: killing a parent enumerates latest runs by child-session-key, marks each in a `seenChildSessionKeys` set to prevent infinite loops, and recurses into each descendant. Only the latest run per child session is killed to avoid race-condition noise.

<a id="g11-f016"></a>
### Controller-ownership enforcement

`src/agents/subagent-control.ts:150-159` @ c84e521

`src/agents/subagent-control.ts:150-159` — Controller-ownership enforcement: subagent runs track `controllerSessionKey`; kill/steer/message operations verify caller owns the run before mutation. Leaf subagents (controlScope "none") cannot control children at all.

<a id="g11-f017"></a>
### Timer-safe deadline calculation

`src/agents/subagent-run-timeout.ts:13-28` @ c84e521

`src/agents/subagent-run-timeout.ts:13-28` — Timer-safe deadline calculation: setTimeout bounds (32-bit signed int) checked separately from ms durations; Finite, Safe-Integer, and positive conditions validated independently. Deadline = `startedAt + durationMs`, falling back to `createdAt` if `startedAt` is absent.

<a id="g11-f018"></a>
### Output capture outcome delivery cleanup pipeline with signal-aware cancellation

`src/agents/subagent-announce.ts:233-260` @ c84e521

`src/agents/subagent-announce.ts:233-260` — Output capture outcome delivery cleanup pipeline with signal-aware cancellation: each stage is best-effort; errors are caught to prevent stage failures from blocking downstream cleanup. Silent-token filtering allows child to signal "no update needed" without orphaning session state.

<a id="g11-f019"></a>
### Exponential backoff retry strategy (3 max retries, 2× multiplier) for orphan recovery, with fallback to finalizeInter…

`src/agents/subagent-orphan-recovery.ts:395-399` @ c84e521

`src/agents/subagent-orphan-recovery.ts:395-399` — Exponential backoff retry strategy (3 max retries, 2× multiplier) for orphan recovery, with fallback to `finalizeInterruptedSubagentRun` when retries exhaust.

<a id="g11-f020"></a>
### Legacy timeout-interruption reclassification

`src/agents/subagent-orphan-recovery.ts:55-68` @ c84e521

`src/agents/subagent-orphan-recovery.ts:55-68` — Legacy timeout-interruption reclassification: mutates execution state (`status: "interrupted"`, clears `endedAt`/`outcome`) so downstream code treats interrupted runs as still-live without separate type branches.

<a id="g11-f021"></a>
### Liveness policy

`src/agents/subagent-run-liveness.ts:10-12` @ c84e521

`src/agents/subagent-run-liveness.ts:10-12` — Liveness policy: three distinct time windows (2 h for stale unended runs, 30 min for recent ended child links, +60 s grace for explicit timeouts) balance visibility of active work against GC of dead sessions.

<a id="g11-f022"></a>
### Thinking-level cascade

`src/agents/subagent-spawn.ts:408-462` @ c84e521

`src/agents/subagent-spawn.ts:408-462` — Thinking-level cascade: explicit override requester's persistent setting requester's agent config default model thinking. Prevents deep-reasoning regressions in spawned children.

<a id="g11-f023"></a>
### Mode resolution enforces thread-binding

`src/agents/subagent-spawn.ts:1075-1116` @ c84e521

`src/agents/subagent-spawn.ts:1075-1116` — Mode resolution enforces thread-binding: session mode is valid only with thread binding enabled; run mode is default. Forces thread-persistence decisions to be explicit.

<a id="g11-f024"></a>
### Spawn depth and active-children count enforced at spawn time with clear error messages, not post-hoc, preventing runa…

`src/agents/subagent-spawn.ts:1161-1179` @ c84e521

`src/agents/subagent-spawn.ts:1161-1179` — Spawn depth and active-children count enforced at spawn time with clear error messages, not post-hoc, preventing runaway recursion and fan-out explosion.

<a id="g11-f025"></a>
### Reactivation of completed subagent sessions validates existing.endedAt before allowing the swap, preventing accidenta…

`src/gateway/session-subagent-reactivation.ts:13-32` @ c84e521

`src/gateway/session-subagent-reactivation.ts:13-32` — Reactivation of completed subagent sessions validates `existing.endedAt` before allowing the swap, preventing accidental resurrection of active children. Uses lazy runtime import.

## Skills, prompts, tools

<a id="g11-f026"></a>
### Subagent system prompt parameterizes spawn depth, max depth, role (main/orchestrator/leaf), ACP enablement, and nativ…

`src/agents/subagent-system-prompt.ts:36-111` @ c84e521

`src/agents/subagent-system-prompt.ts:36-111` — Subagent system prompt parameterizes spawn depth, max depth, role (main/orchestrator/leaf), ACP enablement, and native command guidance; generates depth-conditional help on `sessions_spawn`, `sessions_yield`, polling prohibition, and descendant-result handling.

<a id="g11-f027"></a>
### Push-based completion contract embedded in prompt

`src/agents/subagent-system-prompt.ts:53-90` @ c84e521

`src/agents/subagent-system-prompt.ts:53-90` — Push-based completion contract embedded in prompt: children auto-announce results to parent; parent MUST NOT poll `sessions_list` or busy-wait; instead call `sessions_yield` to pause and wait for completion events as user messages; descendant output is evidence to synthesize, not instructions.

<a id="g11-f028"></a>
### Depth-based spawn capability gating

`src/agents/subagent-system-prompt.ts:36-43` @ c84e521

`src/agents/subagent-system-prompt.ts:36-43` — Depth-based spawn capability gating: `canSpawn = childDepth < maxSpawnDepth`; `parentLabel` is "parent orchestrator" at depth ≥2, else "main agent", deriving capability from depth alone without a separate role table.

<a id="g11-f029"></a>
### sessions_yield is a signaling mechanism

`src/agents/tools/sessions-yield-tool.ts:14-38` @ c84e521

`src/agents/tools/sessions-yield-tool.ts:14-38` — `sessions_yield` is a signaling mechanism: ends the current turn, pauses the parent session via `onYield` callback. Runtime owns the pause/resume behavior; tool records intent only. Enables async spawn + wait without polling.

<a id="g11-f030"></a>
### Subagents list tool returns a 5-tuple

`src/agents/tools/subagents-tool.ts:28-76` @ c84e521

`src/agents/tools/subagents-tool.ts:28-76` — Subagents list tool returns a 5-tuple: `requesterSessionKey`, `callerSessionKey`, `callerIsSubagent`, `total`, and textual active/recent run representation. `callerIsSubagent` flag helps distinguish recursive spawn contexts.

<a id="g11-f031"></a>
### agents_list returns requester (requesting agent ID), allowAny (bool), and ordered AgentListEntry objects with id , na…

`src/agents/tools/agents-list-tool.ts:35-112` @ c84e521

`src/agents/tools/agents-list-tool.ts:35-112` — `agents_list` returns `requester` (requesting agent ID), `allowAny` (bool), and ordered `AgentListEntry` objects with `id`, `name`, `configured`, `model`, and `agentRuntime` metadata (including runtime source: env/agent/defaults/model/provider/implicit/session-key). Enables informed agent selection without hardcoding.

<a id="g11-f032"></a>
### Initial user message for a spawned subagent is a structured envelope

`src/agents/subagent-initial-user-message.ts:7-30` @ c84e521

`src/agents/subagent-initial-user-message.ts:7-30` — Initial user message for a spawned subagent is a structured envelope: `[Subagent Context]` block (depth/max depth/persistence mode) followed by `[Subagent Task]`. No system-prompt duplication.

<a id="g11-f033"></a>
### Subagent system prompt builder is injected with plugin guidance ( listRegisteredPluginAgentPromptGuidance ), depth in…

`src/agents/subagent-spawn.ts:1431-1446` @ c84e521

`src/agents/subagent-spawn.ts:1431-1446` — Subagent system prompt builder is injected with plugin guidance (`listRegisteredPluginAgentPromptGuidance`), depth info, ACP availability, and attachment metadata. Deterministic and auditable.

<a id="g11-f034"></a>
### Post-spawn notes are context-sensitive

`src/agents/subagent-spawn-accepted-note.ts:8-22` @ c84e521

`src/agents/subagent-spawn-accepted-note.ts:8-22` — Post-spawn notes are context-sensitive: "Auto-announce is push-based; do NOT poll" for runs, "thread-bound session stays active" for sessions; notes are suppressed for cron spawns.

<a id="g11-f035"></a>
### Three-branch reply instruction builder based on requester type

`src/agents/subagent-announce.ts:87-99` @ c84e521

`src/agents/subagent-announce.ts:87-99` — Three-branch reply instruction builder based on requester type: subagent requesters get "internal orchestration update"; user requesters with `expectsCompletionMessage` are instructed to verify and decide; fallback warns against copying internal event text verbatim. Silent-token is the only no-op reply.

<a id="g11-f036"></a>
### Descendant wake message template

`src/agents/subagent-announce.ts:116-126` @ c84e521

`src/agents/subagent-announce.ts:116-126` — Descendant wake message template: context frame + task label + findings. Prepares child to interpret findings as prior-run descendants' results, enabling stateless continue-from-descendants workflows without storing child state.

<a id="g11-f037"></a>
### Subagent output snapshot

`src/agents/subagent-announce-output.ts:137-184` @ c84e521

`src/agents/subagent-announce-output.ts:137-184` — Subagent output snapshot: assistant text, silent text, tool calls, yield state. Summarizer tracks yield-call pattern (`sessions_yield` tool + result) as "waiting for continuation"; filters silent replies; counts tool calls if no text output.

<a id="g11-f038"></a>
### Deduped child completion rows formatted with status + findings + title; sorted by createdAt then endedAt ; silent or …

`src/agents/subagent-announce-output.ts:373-414` @ c84e521

`src/agents/subagent-announce-output.ts:373-414` — Deduped child completion rows formatted with status + findings + title; sorted by `createdAt` then `endedAt`; silent or empty ok-status completions filtered; fallback "(no output)". Compact label avoids dumping raw UUIDs into parent prompts.

<a id="g11-f039"></a>
### Internal event format for task_completion

`src/agents/subagent-announce.ts:511-535` @ c84e521

`src/agents/subagent-announce.ts:511-535` — Internal event format for `task_completion`: carries `taskLabel`, `status`, `statusLabel`, `findings` (child results or output), `statsLine` (runtime/tokens). `replyInstruction` and `announceType` guide parent interpretation.

<a id="g11-f040"></a>
### Steering and completion lease API

`src/agents/subagent-registry.ts:1384-1432` @ c84e521

`src/agents/subagent-registry.ts:1384-1432` — Steering and completion lease API: `leasePendingAgentSteeringItems()`, `ackPendingAgentSteeringItems()`, `releasePendingAgentSteeringItems()` provide a three-phase handshake for requester to claim, execute, and release steering work; state changes persisted after each phase.

<a id="g11-f041"></a>
### Resume messages sent via callGateway with inputProvenance metadata ( kind

`src/agents/subagent-orphan-recovery.ts:131-150` @ c84e521

`src/agents/subagent-orphan-recovery.ts:131-150` — Resume messages sent via `callGateway` with `inputProvenance` metadata (`kind: "inter_session"`, `sourceSessionKey` from parent, `lane: "subagent"`) to preserve parent-child tracing across interruptions.

<a id="g11-f042"></a>
### Config-change detection pattern ( /openclaw\.json|openclaw gateway restart|config\.patch/i ) scans assistant messages…

`src/agents/subagent-orphan-recovery.ts:200` @ c84e521

`src/agents/subagent-orphan-recovery.ts:200` — Config-change detection pattern (`/openclaw\.json|openclaw gateway restart|config\.patch/i`) scans assistant messages to warn reactivated children about pre-applied config changes, preventing duplicate modifications.

<a id="g11-f043"></a>
### assistantCallsSessionsYield() detects the sessions_yield tool call across multiple provider-specific naming conventio…

`src/agents/subagent-yield-output.ts:37-45` @ c84e521

`src/agents/subagent-yield-output.ts:37-45` — `assistantCallsSessionsYield()` detects the `sessions_yield` tool call across multiple provider-specific naming conventions (toolCall/tool_use/toolUse/functionCall/function_call), making yield detection SDK-agnostic.

<a id="g11-f044"></a>
### readStructuredToolPayload() implements lenient parsing of tool payloads from nested content arrays, plain records, or…

`src/agents/subagent-yield-output.ts:59-85` @ c84e521

`src/agents/subagent-yield-output.ts:59-85` — `readStructuredToolPayload()` implements lenient parsing of tool payloads from nested content arrays, plain records, or JSON-in-text, covering common cases where provider SDKs nest structured data in `block.text` fields.

<a id="g11-f045"></a>
### isSessionsYieldToolResult() uses explicit tool-name matching and adjacency heuristics (yield status in details/payloa…

`src/agents/subagent-yield-output.ts:88-110` @ c84e521

`src/agents/subagent-yield-output.ts:88-110` — `isSessionsYieldToolResult()` uses explicit tool-name matching and adjacency heuristics (yield status in details/payload) as fallback when providers omit tool names on result messages.

<a id="g11-f046"></a>
### Token count formatting uses k/m suffixes with rounding heuristics (999.5 k 1 m, not "1000k") to keep display compact.

`src/shared/subagents-format.ts:5-25` @ c84e521

`src/shared/subagents-format.ts:5-25` — Token count formatting uses k/m suffixes with rounding heuristics (999.5 k 1 m, not "1000k") to keep display compact.

## Patterns worth porting

<a id="g11-f047"></a>
### SpawnSubagentResult discriminated union

`src/agents/subagent-spawn.ts:211-230` @ c84e521

`src/agents/subagent-spawn.ts:211-230` — `SpawnSubagentResult` discriminated union: `status: "accepted" | "forbidden" | "error"` with payload fields conditional on status. Error cases include `error`, `childSessionKey`, and `runId` so callers can diagnose and clean up partially-created sessions.

<a id="g11-f048"></a>
### Spawn ownership resolved into a 4-tuple ( controllerSessionKey , threadBindingRequesterSessionKey , completionRequest…

`src/agents/subagent-spawn-ownership.ts:13-55` @ c84e521

`src/agents/subagent-spawn-ownership.ts:13-55` — Spawn ownership resolved into a 4-tuple (`controllerSessionKey`, `threadBindingRequesterSessionKey`, `completionRequesterSessionKey`, `completionRequesterDisplayKey`) decoupling control, thread binding, and completion delivery. A parent can spawn on behalf of another requester without losing the audit trail.

<a id="g11-f049"></a>
### (also )

`src/agents/subagent-spawn.ts:686-703` @ c84e521

`src/agents/subagent-spawn.ts:686-703` (also `src/agents/subagent-spawn.ts:1592-1653`) — Cascading cleanup on failure: context-engine rollback attachment directory optional lifecycle hooks session deletion. Each step is best-effort; a later cleanup failure does not hide the original error.

<a id="g11-f050"></a>
### Attachments validated and materialized to disk before calling the gateway; receipt persisted in the registry. Allows …

`src/agents/subagent-spawn.ts:1460-1483` @ c84e521

`src/agents/subagent-spawn.ts:1460-1483` — Attachments validated and materialized to disk before calling the gateway; receipt persisted in the registry. Allows the parent to know what the child received and audit it.

<a id="g11-f051"></a>
### Suspension-vs-failure hierarchy

`src/agents/subagent-registry-lifecycle.ts:615-670` @ c84e521

`src/agents/subagent-registry-lifecycle.ts:615-670` — Suspension-vs-failure hierarchy: `shouldSuspendPendingFinalDelivery()` routes completion delivery failures into a resumable suspended state when cleanup policy is "keep" and outcome is "ok"; otherwise terminal failure. Suspended entries survive sweeper pressure-pruning until TTL.

<a id="g11-f052"></a>
### TTL-based sweep with pressure backpressure

`src/agents/subagent-registry.ts:863-1058` @ c84e521

`src/agents/subagent-registry.ts:863-1058` — TTL-based sweep with pressure backpressure: runs once per minute; expires suspended entries by TTL; discards oldest suspended when queue exceeds hard cap; marks completed runs for archival or deletion. TTLs vary by requester type (cron 2 h > subagent 6 h > interactive 24 h).

<a id="g11-f053"></a>
### Recoverable wait/completion loop with deadline enforcement

`src/agents/subagent-registry-run-manager.ts:217-470` @ c84e521

`src/agents/subagent-registry-run-manager.ts:217-470` — Recoverable wait/completion loop with deadline enforcement: handles timeouts, yields, errors; if `wait.yielded`, marks run paused; if explicit run deadline exceeded, completes as timeout even if session shows ok; schedules retries on transient errors.

<a id="g11-f054"></a>
### Read index for fleet visibility

`src/agents/subagent-registry-queries.ts:96-196` @ c84e521

`src/agents/subagent-registry-queries.ts:96-196` — Read index for fleet visibility: `buildSubagentRunReadIndexFromRuns()` separates snapshot from in-memory runs, tracks latest active/ended per child session, groups by controller, counts active descendants; enables O(1) display and fleet queries.

<a id="g11-f055"></a>
### Tiered exponential backoff schedules

`src/agents/subagent-announce-delivery.ts:225-239` @ c84e521

`src/agents/subagent-announce-delivery.ts:225-239` — Tiered exponential backoff schedules: transient delivery (5 s/10 s/20 s) vs. compaction steer (1 s/2 s/4 s/8 s), with test-mode fast schedules (8/16/32 ms). Loops clamp to remaining delivery timeout so retries do not overrun the deadline.

<a id="g11-f056"></a>
### Error-pattern matchers for transient vs. permanent delivery failures. Transient

`src/agents/subagent-announce-delivery.ts:357-381` @ c84e521

`src/agents/subagent-announce-delivery.ts:357-381` — Error-pattern matchers for transient vs. permanent delivery failures. Transient: unavailable, overloaded, network errors, gateway closed. Permanent: unsupported channel, user not found, bot blocked/kicked. Unknown errors classified transient by default (safe fallback).

<a id="g11-f057"></a>
### Best-effort cleanup finalization in finally block

`src/agents/subagent-announce.ts:591-612` @ c84e521

`src/agents/subagent-announce.ts:591-612` — Best-effort cleanup finalization in `finally` block: session patch, delete, and teardown run even if earlier stages throw. Errors logged but not re-raised; ensures child session is not orphaned if delivery fails.

<a id="g11-f058"></a>
### Masking for safe logging

`src/agents/subagent-registry-lifecycle.ts:172-196` @ c84e521

`src/agents/subagent-registry-lifecycle.ts:172-196` — Masking for safe logging: `maskRunId()` and `maskSessionKey()` elide session identifiers in logs after prefix, preventing accidental PII leakage in error reports or metrics.

<a id="g11-f059"></a>
### Payload immutability with fallback cascade

`src/agents/subagent-registry-lifecycle.ts:520-545` @ c84e521

`src/agents/subagent-registry-lifecycle.ts:520-545` — Payload immutability with fallback cascade: `loadPendingFinalDeliveryPayload()` prefers fields from `delivery.payload` (frozen at initial failure), then falls back to live entry fields. Single snapshot is never mutated mid-retry.

<a id="g11-f060"></a>
### Recovery gate evaluation

`src/agents/subagent-orphan-recovery.ts:256-292` @ c84e521

`src/agents/subagent-orphan-recovery.ts:256-292` — Recovery gate evaluation: marks sessions as "wedged" on persistent failures with separate storage updates and in-memory entry mutations, ensuring state persists across recovery retries.

<a id="g11-f061"></a>
### Atomic update pattern

`src/agents/subagent-orphan-recovery.ts:331-367` @ c84e521

`src/agents/subagent-orphan-recovery.ts:331-367` — Atomic update pattern: clears `abortedLastRun` flag only after confirmed successful resume, not before. Failed resumes can be retried on the next restart without losing state.

<a id="g11-f062"></a>
### Scheduled recovery with retry

`src/agents/subagent-orphan-recovery.ts:426-475` @ c84e521

`src/agents/subagent-orphan-recovery.ts:426-475` — Scheduled recovery with retry: closure over `resumedSessionKeys` avoids re-attempting already-recovered sessions; explicit `.unref?.()` prevents keeping the process alive on stale timeouts.

<a id="g11-f063"></a>
### Tri-state visibility predicate for child-session links

`src/agents/subagent-run-liveness.ts:74-91` @ c84e521

`src/agents/subagent-run-liveness.ts:74-91` — Tri-state visibility predicate for child-session links: keep if live, keep if has active descendants, keep if recently ended. Avoids premature GC of links to short-lived completions.

<a id="g11-f064"></a>
### Controller scope resolution from stored capabilities

`src/agents/subagent-control.ts:103-131` @ c84e521

`src/agents/subagent-control.ts:103-131` — Controller scope resolution from stored capabilities: non-subagent callers always get "children" scope; subagent callers load persisted capabilities to check if they can control children or are "leaf" (scope "none"). Blocks grandparent-to-grandchild escalation without a separate ACL table.

<a id="g11-f065"></a>
### Spawn target allowlist

`src/agents/subagent-target-policy.ts:51-82` @ c84e521

`src/agents/subagent-target-policy.ts:51-82` — Spawn target allowlist: `resolveSubagentAllowedTargetIds()` returns self-only (no config), allowAny ("*" token), or intersected allowlist. Requester can only spawn within this set.

<a id="g11-f066"></a>
### Multi-provider tool-name normalization across ≥5 naming conventions (name, toolName, tool_name, functionName, functio…

`src/agents/subagent-yield-output.ts:8-20` @ c84e521

`src/agents/subagent-yield-output.ts:8-20` — Multi-provider tool-name normalization across ≥5 naming conventions (name, toolName, tool_name, functionName, function_name). SDK-agnostic tool detection without a lookup table.

<a id="g11-f067"></a>
### Result freezing at completion

`src/agents/subagent-registry-lifecycle.ts:392-417` @ c84e521

`src/agents/subagent-registry-lifecycle.ts:392-417` — Result freezing at completion: `freezeRunResultAtCompletion()` captures child's final reply via `captureSubagentCompletionReply()` if completion is required, storing the snapshot in `delivery.payload`; error outcome immediately freezes as null.

<a id="g11-f068"></a>
### Explicit interruption

`src/agents/subagent-registry.ts:1295-1347` @ c84e521

`src/agents/subagent-registry.ts:1295-1347` — Explicit interruption: `finalizeInterruptedSubagentRun()` marks a run failed by runId or childSessionKey, completes with error outcome, and triggers cleanup. Used for gateway restarts or lost execution contexts.

<a id="g11-f069"></a>
### Steer intake logic

`src/agents/subagent-announce-delivery.ts:598-649` @ c84e521

`src/agents/subagent-announce-delivery.ts:598-649` — Steer intake logic: resolve session ID, check abandoned, build queue options, retry through compaction. Queue options include steering-mode "all", debounce, transcript-commit wait. Compaction retry loop waits through transient compacting states if deadline permits.

## Open threads / weak spots

<a id="g11-f070"></a>
### File truncated at line 1443 mid-function. sendSubagentAnnounceDirectly spans ~1 200 lines; remaining direct-agent cal…

`src/agents/subagent-announce-delivery.ts:1443` @ c84e521

`src/agents/subagent-announce-delivery.ts:1443` — File truncated at line 1443 mid-function. `sendSubagentAnnounceDirectly` spans ~1 200 lines; remaining direct-agent call, response handling, generated-media fallback, and cleanup are unread. Critical delivery edge cases may be unhandled.

<a id="g11-f071"></a>
### persistSubagentRunsToDisk swallows all exceptions silently. If SQLite is corrupted or disk full, runs are lost withou…

`src/agents/subagent-registry-cleanup.ts:52-63` @ c84e521

`src/agents/subagent-registry-cleanup.ts:52-63` — `persistSubagentRunsToDisk` swallows all exceptions silently. If SQLite is corrupted or disk full, runs are lost without logging. `persistSubagentRunsToDiskOrThrow` exists for critical paths but is not used in the cleanup loop (L59 uses the silent version).

<a id="g11-f072"></a>
### Deferred cleanup decision not persisted immediately

`src/agents/subagent-registry-lifecycle.ts:881-890` @ c84e521

`src/agents/subagent-registry-lifecycle.ts:881-890` — Deferred cleanup decision not persisted immediately: final `persist()` is deferred until finalize; a crash between decision and persist can orphan a run in "pending" state instead of "deferred".

<a id="g11-f073"></a>
### Explicit run timeout deadline can race with wait completion

`src/agents/subagent-registry-run-manager.ts:289-374` @ c84e521

`src/agents/subagent-registry-run-manager.ts:289-374` — Explicit run timeout deadline can race with wait completion: `resolveHardRunTimeoutEndedAt()` checks if now is within 250 ms of deadline; within that skew, a `session.end` arriving after the deadline may still be treated as ok instead of timeout.

<a id="g11-f074"></a>
### Fork context is currently restricted to same-agent spawns ("context=fork currently requires the same target agent as …

`src/agents/subagent-spawn.ts:513-515` @ c84e521

`src/agents/subagent-spawn.ts:513-515` — Fork context is currently restricted to same-agent spawns ("context=fork currently requires the same target agent as the requester"). Known limitation; may need expansion for cross-agent fork scenarios.

<a id="g11-f075"></a>
### Attachment receipt structure duplicates metadata ( count , totalBytes , files , relDir ) but is never validated again…

`src/agents/subagent-spawn.ts:1449-1456` @ c84e521

`src/agents/subagent-spawn.ts:1449-1456` — Attachment receipt structure duplicates metadata (`count`, `totalBytes`, `files`, `relDir`) but is never validated against materialized state. If materialization and receipt diverge, silent inconsistency can occur.

<a id="g11-f076"></a>
### subagent_spawned hook failures are silently swallowed ("Spawn should still return accepted if spawn lifecycle hooks f…

`src/agents/subagent-spawn.ts:1707-1733` @ c84e521

`src/agents/subagent-spawn.ts:1707-1733` — `subagent_spawned` hook failures are silently swallowed ("Spawn should still return accepted if spawn lifecycle hooks fail"). Hook failures are not reported to the parent.

<a id="g11-f077"></a>
### Context-engine rollback is best-effort only. If rollback fails, the error is silently dropped, potentially leaving da…

`src/agents/subagent-spawn.ts:631-638` @ c84e521

`src/agents/subagent-spawn.ts:631-638` — Context-engine rollback is best-effort only. If rollback fails, the error is silently dropped, potentially leaving dangling context state.

<a id="g11-f078"></a>
### Announce retry expiry logic branches

`src/agents/subagent-registry.ts:632-652` @ c84e521

`src/agents/subagent-registry.ts:632-652` — Announce retry expiry logic branches: if `expectsCompletionMessage` is false and `endedAt` age > `ANNOUNCE_EXPIRY_MS`, give up; if true, retry until `MAX_ANNOUNCE_RETRY_COUNT`. No consensus on expiry horizon when completion is required and queued for suspension.

<a id="g11-f079"></a>
### Suspended delivery expiry hardcoded

`src/agents/subagent-registry.ts:784-793` @ c84e521

`src/agents/subagent-registry.ts:784-793` — Suspended delivery expiry hardcoded: cron 2 h, subagent 6 h, interactive 24 h; no config override; pressure-pruning (soft cap 25, hard cap 50) may discard deliveries before TTL expires if backlog grows.

<a id="g11-f080"></a>
### Wake-on-descendant-settle detects :wake suffix to avoid re-waking, but if a wake run itself spawns descendants and tr…

`src/agents/subagent-announce.ts:366-388` @ c84e521

`src/agents/subagent-announce.ts:366-388` — Wake-on-descendant-settle detects `:wake` suffix to avoid re-waking, but if a wake run itself spawns descendants and tries to wake again, the check may falsely reject a legitimate second wake. No test coverage seen.

<a id="g11-f081"></a>
### Token data wait loop with hardcoded 150 ms sleep and 3 attempts; no backoff or adaptive timeout. Fast-test mode uses …

`src/agents/subagent-announce-output.ts:539-554` @ c84e521

`src/agents/subagent-announce-output.ts:539-554` — Token data wait loop with hardcoded 150 ms sleep and 3 attempts; no backoff or adaptive timeout. Fast-test mode uses 1 attempt only, so production tests may not catch slow-path bugs.

<a id="g11-f082"></a>
### Kill operation calls abortEmbeddedAgentRun and clearSessionQueues in sequence but neither returns a boolean indicatin…

`src/agents/subagent-control.ts:165-212` @ c84e521

`src/agents/subagent-control.ts:165-212` — Kill operation calls `abortEmbeddedAgentRun` and `clearSessionQueues` in sequence but neither returns a boolean indicating success. If queue clear fails, `killed` flag may still be true, reporting false positive to caller.

<a id="g11-f083"></a>
### Wait outcome recheck only happens if output exists. If capture returns empty, outcome is not rechecked; race window e…

`src/agents/subagent-announce.ts:289-299` @ c84e521

`src/agents/subagent-announce.ts:289-299` — Wait outcome recheck only happens if output exists. If capture returns empty, outcome is not rechecked; race window exists where child finishes just after first wait, before final output read.

<a id="g11-f084"></a>
### No abort-signal check inside the active-wake compaction retry inner loop (L271–L327). If signal fires during a delay,…

`src/agents/subagent-announce-delivery.ts:1194` @ c84e521

`src/agents/subagent-announce-delivery.ts:1194` — No abort-signal check inside the active-wake compaction retry inner loop (L271–L327). If signal fires during a delay, loop may still issue another queue attempt.

<a id="g11-f085"></a>
### Legacy timeout reclassification happens before the endedAt > 0 check; reclassified runs will skip resume (likely inte…

`src/agents/subagent-orphan-recovery.ts:238-248` @ c84e521

`src/agents/subagent-orphan-recovery.ts:238-248` — Legacy timeout reclassification happens before the `endedAt > 0` check; reclassified runs will skip resume (likely intentional but semantics are subtle and undocumented).

<a id="g11-f086"></a>
### Session-store update after successful resume can fail silently (warn-level log only), leaving abortedLastRun true in …

`src/agents/subagent-orphan-recovery.ts:334-354` @ c84e521

`src/agents/subagent-orphan-recovery.ts:334-354` — Session-store update after successful resume can fail silently (warn-level log only), leaving `abortedLastRun` true in the persisted store even though resume succeeded and is tracked in memory.

<a id="g11-f087"></a>
### Exceptions during individual orphan processing increment result.failed only if it is 0 (L382–384), potentially maskin…

`src/agents/subagent-orphan-recovery.ts:369-377` @ c84e521

`src/agents/subagent-orphan-recovery.ts:369-377` — Exceptions during individual orphan processing increment `result.failed` only if it is 0 (L382–384), potentially masking multiple distinct failures under a single count.

<a id="g11-f088"></a>
### Reactivation checks only that existing.endedAt is a number; does not validate outcome status. A completed-but-failed …

`src/gateway/session-subagent-reactivation.ts:21-32` @ c84e521

`src/gateway/session-subagent-reactivation.ts:21-32` — Reactivation checks only that `existing.endedAt` is a number; does not validate outcome status. A completed-but-failed child could be reactivated without explicit outcome clearing.

<a id="g11-f089"></a>
### Spawn depth limit is advisory-only in prompt ("you CAN spawn..."); depth check happens at runtime registration, so a …

`src/agents/subagent-system-prompt.ts:76-91` @ c84e521

`src/agents/subagent-system-prompt.ts:76-91` — Spawn depth limit is advisory-only in prompt ("you CAN spawn..."); depth check happens at runtime registration, so a malformed spawn request is rejected after subagent code runs, not before.

<a id="g11-f090"></a>
### Scope-upgrade handshake on headless gateway clients

`src/agents/subagent-spawn.ts:248-276` @ c84e521

`src/agents/subagent-spawn.ts:248-276` — Scope-upgrade handshake on headless gateway clients: Admin-only methods are pinned to ADMIN_SCOPE to avoid mid-request pairing handshakes, but other methods may still trigger upgrades. Issue reference (#59428) is not visible in the codebase.

<a id="g11-f091"></a>
### onSubagentEnded context-engine hook is fire-and-forget best-effort

`src/agents/subagent-registry-lifecycle.ts:730-773` @ c84e521

`src/agents/subagent-registry-lifecycle.ts:730-773` — `onSubagentEnded` context-engine hook is fire-and-forget best-effort: timeout or failure silently logged but does not block cleanup, leaving hooks unreliable for context persistence or cross-session state.

