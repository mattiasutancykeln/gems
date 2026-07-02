# langgraph

| | |
|---|---|
| Source | https://github.com/langchain-ai/langgraph |
| Repo | https://github.com/langchain-ai/langgraph @ `d57a74f950b87bfb9cb51240cc8dccf34b5edfaa` |
| Kind | repo |
| Topics | agent |
| License | MIT (permissive) |
| Verdict | - |
| Findings | 66 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/15 |

## Implementation decisions

<a id="g15-f001"></a>
### Resume detection requires both a prior checkpoint AND an input signal (None, Command, or matching run_id)

`libs/langgraph/langgraph/pregel/_loop.py:836-962` @ d57a74f

`libs/langgraph/langgraph/pregel/_loop.py:836-962` — Resume detection requires both a prior checkpoint AND an input signal (None, Command, or matching run_id). Time-travel is distinguished from resume via checkpoint_map presence, used to manage interrupt tombstone writes correctly. This is the most load-bearing correctness invariant in the loop: wrong resume classification corrupts interrupt state.

<a id="g15-f002"></a>
### PUSH task acceptance creates a new executable task from a write packet and re-applies…

`libs/langgraph/langgraph/pregel/_loop.py:543-580` @ d57a74f

`libs/langgraph/langgraph/pregel/_loop.py:543-580` — PUSH task acceptance creates a new executable task from a write packet and re-applies prior writes via `_reapply_writes_to_succeeded_nodes` on non-replay paths, preventing loss of side-effects when a Send originates from a previously-succeeded node.

<a id="g15-f003"></a>
### Checkpoint persistence uses object identity ( metadata is self.checkpoint_metadata ) to…

`libs/langgraph/langgraph/pregel/_loop.py:1064-1200` @ d57a74f

`libs/langgraph/langgraph/pregel/_loop.py:1064-1200` — Checkpoint persistence uses object identity (`metadata is self.checkpoint_metadata`) to distinguish exit-mode saves from intermediate saves, avoiding double-counting delta-channel supersteps and preserving atomic visibility of both stub and delta writes.

<a id="g15-f004"></a>
### TimeoutPolicy decouples hard wall-clock run_timeout (never refreshed) from idle_timeout (refreshed on progress signals or explicit heartbeat() calls)

`libs/langgraph/langgraph/types.py:449-512` @ d57a74f

`libs/langgraph/langgraph/types.py:449-512` — `TimeoutPolicy` decouples hard wall-clock `run_timeout` (never refreshed) from `idle_timeout` (refreshed on progress signals or explicit `heartbeat()` calls). The `refresh_on` field selects auto-refreshing ("auto") vs. heartbeat-only ("heartbeat"), enabling long-running tasks to signal progress without blocking.

<a id="g15-f005"></a>
### apply_writes applies a two-phase channel versioning model

`libs/langgraph/langgraph/pregel/_algo.py:232-345` @ d57a74f

`libs/langgraph/langgraph/pregel/_algo.py:232-345` — `apply_writes` applies a two-phase channel versioning model: consumes read-tracked channels (marking them "seen"), then updates channels and bumps versions. Implicit termination: if no triggered node is satisfied after writes, the graph quiesces without explicit sentinel channels.

<a id="g15-f006"></a>
### prepare_single_task (PULL path) injects three context layers via PregelExecutableTask.config.configurable : (1) CONFIG_KEY_SEND for buffered writes (thread-safe deque), (2) CONFIG_KEY_READ for local state with task writes overlaid, (3) CONFIG_KEY_SCRATCHPAD for call counters and resume values

`libs/langgraph/langgraph/pregel/_algo.py:654-759` @ d57a74f

`libs/langgraph/langgraph/pregel/_algo.py:654-759` — `prepare_single_task` (PULL path) injects three context layers via `PregelExecutableTask.config.configurable`: (1) CONFIG_KEY_SEND for buffered writes (thread-safe deque), (2) CONFIG_KEY_READ for local state with task writes overlaid, (3) CONFIG_KEY_SCRATCHPAD for call counters and resume values. Task receives no upfront state snapshot; local_read is called on demand, ensuring reads reflect only the task's own prior writes.

<a id="g15-f007"></a>
### Node defaults are materialized at compile time and applied per-node with explicit exclusions: error handlers are excluded from cache_policy and error_handler routing to prevent circular handler chains and unsafe caching of recovery paths

`libs/langgraph/langgraph/graph/state.py:271-334` @ d57a74f

`libs/langgraph/langgraph/graph/state.py:271-334` — Node defaults are materialized at compile time and applied per-node with explicit exclusions: error handlers are excluded from cache_policy and error_handler routing to prevent circular handler chains and unsafe caching of recovery paths. Three-phase default application: error_handler only for regular nodes, retry/timeout for all, cache only for regular nodes.

<a id="g15-f008"></a>
### Command class is the parent-visible completion/handoff contract: carries optional state delta (update), resume values for interrupts, and goto directives (node name, sequence, or Send objects)

`libs/langgraph/langgraph/types.py:758-808` @ d57a74f

`libs/langgraph/langgraph/types.py:758-808` — `Command` class is the parent-visible completion/handoff contract: carries optional state delta (update), resume values for interrupts, and goto directives (node name, sequence, or Send objects). Supports cross-graph communication via `Command.PARENT`. `Command._update_as_tuples()` handles dict, list-of-tuples, and Pydantic/dataclass formats via `get_cached_annotated_keys()`.

<a id="g15-f009"></a>
### Send class is the primitive for fan-out child task creation

`libs/langgraph/langgraph/types.py:664-709` @ d57a74f

`libs/langgraph/langgraph/types.py:664-709` — `Send` class is the primitive for fan-out child task creation: each Send specifies target node, input arg, and optional timeout policy override. All Sends emitted in a step are collected and run in parallel at the superstep boundary. There is no explicit task group or fleet primitive; parallelism is emergent from the Send set.

<a id="g15-f010"></a>
### RetryPolicy is a named tuple with exponential backoff, jitter, and a pluggable retry_on callable predicate

`libs/langgraph/langgraph/types.py:416-436` @ d57a74f

`libs/langgraph/langgraph/types.py:416-436` — `RetryPolicy` is a named tuple with exponential backoff, jitter, and a pluggable `retry_on` callable predicate. Allows tasks to automatically recover from transient failures without explicit parent orchestration.

<a id="g15-f011"></a>
### Error handler resumption

`libs/langgraph/langgraph/pregel/_loop.py:582-804` @ d57a74f

`libs/langgraph/langgraph/pregel/_loop.py:582-804` — Error handler resumption: scan pending writes for ERROR_SOURCE_NODE markers from prior commits, mark original tasks with (ERROR, exception) writes to skip re-execution, then schedule fresh error-handler tasks. No redundant re-run of the failed node.

<a id="g15-f012"></a>
### Scratchpad captures task-scoped state (step counter, call counter, resume writes, interrupt counter, subgraph counter) and delegates to parent scratchpad via get_null_resume , forming a scope chain for nested execution contexts

`libs/langgraph/langgraph/pregel/_algo.py:1334-1345` @ d57a74f

`libs/langgraph/langgraph/pregel/_algo.py:1334-1345` — Scratchpad captures task-scoped state (step counter, call counter, resume writes, interrupt counter, subgraph counter) and delegates to parent scratchpad via `get_null_resume`, forming a scope chain for nested execution contexts. `call_counter` is a LazyAtomicCounter (itertools.count + lock).

<a id="g15-f013"></a>
### LastValueAfterFinish channel defers visibility until explicit finish() call, then clears on consume

`libs/langgraph/langgraph/channels/last_value.py:81-151` @ d57a74f

`libs/langgraph/langgraph/channels/last_value.py:81-151` — `LastValueAfterFinish` channel defers visibility until explicit `finish()` call, then clears on consume. Enables handoff sequencing: parent writes, child reads after finish signal, state clears for next step.

<a id="g15-f014"></a>
### Binary operator aggregation gates multiple Overwrite directives per superstep: only one allowed, others raise InvalidUpdateError

`libs/langgraph/langgraph/channels/binop.py:115-130` @ d57a74f

`libs/langgraph/langgraph/channels/binop.py:115-130` — Binary operator aggregation gates multiple `Overwrite` directives per superstep: only one allowed, others raise `InvalidUpdateError`. Enforces deterministic state merges when multiple parallel children write concurrently.

<a id="g15-f015"></a>
### Channel update validates single-value-per-step constraint at channel level, rejecting…

`libs/langgraph/langgraph/channels/last_value.py:56-67` @ d57a74f

`libs/langgraph/langgraph/channels/last_value.py:56-67` — Channel update validates single-value-per-step constraint at channel level, rejecting concurrent updates with explicit error code `INVALID_CONCURRENT_GRAPH_UPDATE`.

<a id="g15-f016"></a>
### interrupt() is a resumable pause: raises GraphInterrupt on first call, returns the provided value on resume

`libs/langgraph/langgraph/types.py:811-934` @ d57a74f

`libs/langgraph/langgraph/types.py:811-934` — `interrupt()` is a resumable pause: raises `GraphInterrupt` on first call, returns the provided value on resume. Scratchpad tracks interrupt index and resume list per task, allowing multiple ordered interrupts per node. Resume values are scoped to the executing task, not shared across parallel tasks.

<a id="g15-f017"></a>
### Topic channel update is destructive per superstep (zeroes values before extending) unless accumulate=True

`libs/langgraph/langgraph/channels/topic.py:77-85` @ d57a74f

`libs/langgraph/langgraph/channels/topic.py:77-85` — Topic channel update is destructive per superstep (zeroes values before extending) unless `accumulate=True`. This is the primary backpressure mechanism: Sends are enqueued, consumed as PUSH task candidates, and the channel is drained per superstep.

<a id="g15-f018"></a>
### RunControl is a single-write drain signal

`libs/langgraph/langgraph/runtime.py:79-104` @ d57a74f

`libs/langgraph/langgraph/runtime.py:79-104` — `RunControl` is a single-write drain signal: `request_drain()` sets `_drain_reason`, graph checks `drain_requested` at superstep boundaries to cooperatively shut down, raising `GraphDrained`. Not for task cancellation; for graceful run shutdown with checkpoint preservation.

<a id="g15-f019"></a>
### entrypoint decorator compiles a function into a Pregel graph with a single node

`libs/langgraph/langgraph/func/__init__.py:516-620` @ d57a74f

`libs/langgraph/langgraph/func/init.py:516-620` — `entrypoint` decorator compiles a function into a Pregel graph with a single node. Supports `checkpointer`, `store`, `context_schema`, `cache`, `retry_policy`, and `timeout`. `entrypoint.final` decouples return value from checkpointed state, enabling checkpoint to accumulate across runs while caller sees only current output.

<a id="g15-f020"></a>
### Checkpoint write delegation

`libs/langgraph/langgraph/pregel/_loop.py:408-501` @ d57a74f

`libs/langgraph/langgraph/pregel/_loop.py:408-501` — Checkpoint write delegation: partitions writes by task ID, deduplicates special channels (INTERRUPT, ERROR, RESUME), filters UntrackedValue writes, and stages async writes via optional `put_writes(task_path=...)` param if the saver supports it. Futures collected into `_delta_write_futs` and drained before next checkpoint.

<a id="g15-f021"></a>
### Exit-mode delta-write staging

`libs/langgraph/langgraph/pregel/_loop.py:1201-1293` @ d57a74f

`libs/langgraph/langgraph/pregel/_loop.py:1201-1293` — Exit-mode delta-write staging: accumulate all delta-channel writes in `_exit_delta_writes`, filter snapshot-bound channels, lazily create stub checkpoint if no persisted parent exists, then persist grouped writes with step-prefixed synthetic task IDs for chronological ordering.

## Skills, prompts, tools

<a id="g15-f022"></a>
### should_interrupt determines if the graph should pause based on interrupt_nodes list and whether channels have been updated since the last interrupt

`libs/langgraph/langgraph/pregel/_algo.py:155-185` @ d57a74f

`libs/langgraph/langgraph/pregel/_algo.py:155-185` — `should_interrupt` determines if the graph should pause based on `interrupt_nodes` list and whether channels have been updated since the last interrupt. Returns the subset of tasks that should trigger the pause. This is the hook for yield-at-node interrupts without baking pause logic into nodes.

<a id="g15-f023"></a>
### StateNode union covers 9 callable signatures inferred from runtime type inspection: bare state, +config, +writer, +store, +writer+store, +config+writer, +config+store, +config+writer+store, and Runnable

`libs/langgraph/langgraph/graph/_node.py:70-81` @ d57a74f

`libs/langgraph/langgraph/graph/_node.py:70-81` — `StateNode` union covers 9 callable signatures inferred from runtime type inspection: bare state, +config, +writer, +store, +writer+store, +config+writer, +config+store, +config+writer+store, and Runnable. Clean LLM-facing contract without type checks in hot loops.

<a id="g15-f024"></a>
### Node input schema is inferred from the first parameter's type hint

`libs/langgraph/langgraph/graph/state.py:806-848` @ d57a74f

`libs/langgraph/langgraph/graph/state.py:806-848` — Node input schema is inferred from the first parameter's type hint; Command destinations extracted from `Literal` return type annotation of `Command[Literal["dest1", "dest2"]]`, enabling declarative routing without external config.

<a id="g15-f025"></a>
### BranchSpec.from_path auto-derives destination map from callable's Literal["dest1", "dest2"] return type

`libs/langgraph/langgraph/graph/_branch.py:88-120` @ d57a74f

`libs/langgraph/langgraph/graph/_branch.py:88-120` — `BranchSpec.from_path` auto-derives destination map from callable's `Literal["dest1", "dest2"]` return type; no explicit path_map required.

<a id="g15-f026"></a>
### get_store() and get_stream_writer() expose store and stream writer via context variable ( get_config() ), allowing any node to access shared memory or emit telemetry without explicit injection

`libs/langgraph/langgraph/config.py:32-123` @ d57a74f

`libs/langgraph/langgraph/config.py:32-123` — `get_store()` and `get_stream_writer()` expose store and stream writer via context variable (`get_config()`), allowing any node to access shared memory or emit telemetry without explicit injection. Both fail gracefully outside a graph context.

<a id="g15-f027"></a>
### get_runtime() retrieves the Runtime (context, store, stream_writer, execution_info, etc.) from config, optionally typed by context_schema

`libs/langgraph/langgraph/runtime.py:296-310` @ d57a74f

`libs/langgraph/langgraph/runtime.py:296-310` — `get_runtime()` retrieves the `Runtime` (context, store, stream_writer, execution_info, etc.) from config, optionally typed by `context_schema`. Primary injection point for nodes to access run-scoped data and control surfaces.

<a id="g15-f028"></a>
### _call/_acall pair schedules nested PUSH tasks (via task.call() inside a node) by invoking schedule_task callback, returning a PregelExecutableTask

`libs/langgraph/langgraph/pregel/_runner.py:700-782` @ d57a74f

`libs/langgraph/langgraph/pregel/_runner.py:700-782` — `_call/_acall` pair schedules nested PUSH tasks (via `task.call()` inside a node) by invoking `schedule_task` callback, returning a `PregelExecutableTask`. Task future is chained via `chain_future(fut, destination)`, allowing nodes to orchestrate sub-flows without explicit await syntax.

<a id="g15-f029"></a>
### BackgroundExecutor and AsyncBackgroundExecutor wrap task submission with done callbacks

`libs/langgraph/langgraph/pregel/_executor.py:47-91` @ d57a74f

`libs/langgraph/langgraph/pregel/_executor.py:47-91` — `BackgroundExecutor` and `AsyncBackgroundExecutor` wrap task submission with done callbacks. On `exit`, cancel tasks with `cancel_on_exit=True`, wait for all to finish, and re-raise first exception marked `reraise_on_exit=True`. Per-task escalation controlled by caller.

<a id="g15-f030"></a>
### StreamWriter is a no-op when stream_mode != "custom" but can be injected into nodes to…

`libs/langgraph/langgraph/types.py:136-139` @ d57a74f

`libs/langgraph/langgraph/types.py:136-139` — `StreamWriter` is a no-op when `stream_mode != "custom"` but can be injected into nodes to emit user-defined events, enabling progress signaling or structured observations without modifying graph schema.

<a id="g15-f031"></a>
### TaskPayload , TaskResultPayload , CheckpointTask encode task lifecycle: start/finish boundaries, error capture, interrupts, result mapping by channel

`libs/langgraph/langgraph/types.py:142-251` @ d57a74f

`libs/langgraph/langgraph/types.py:142-251` — `TaskPayload`, `TaskResultPayload`, `CheckpointTask` encode task lifecycle: start/finish boundaries, error capture, interrupts, result mapping by channel. `CheckpointTask.state` can hold a `StateSnapshot` (subgraphs) or `RunnableConfig` (pointer to saved state). Metadata includes `lc_agent_name`, `langgraph_node`, `langgraph_triggers` for observability without node-level tracing code.

<a id="g15-f032"></a>
### add_messages implements UPSERT semantics by message ID with REMOVE_ALL_MESSAGES sentinel

`libs/langgraph/langgraph/graph/message.py:60-245` @ d57a74f

`libs/langgraph/langgraph/graph/message.py:60-245` — `add_messages` implements UPSERT semantics by message ID with REMOVE_ALL_MESSAGES sentinel. `_messages_delta_reducer` batches writes and deduplicates by ID in a single pass for DeltaChannel streaming efficiency.

<a id="g15-f033"></a>
### default_retry_on() predicate implements platform-aware HTTP retry logic: retries 5xx and ConnectionError , rejects application logic errors (ValueError, TypeError)

`libs/langgraph/langgraph/_internal/_retry.py:1-29` @ d57a74f

`libs/langgraph/langgraph/_internal/_retry.py:1-29` — `default_retry_on()` predicate implements platform-aware HTTP retry logic: retries 5xx and `ConnectionError`, rejects application logic errors (ValueError, TypeError). Splits transient from permanent failures cleanly.

<a id="g15-f034"></a>
### Runnable wrapping uses eager-caching on function identity

`libs/langgraph/langgraph/pregel/_call.py:200-242` @ d57a74f

`libs/langgraph/langgraph/pregel/_call.py:200-242` — Runnable wrapping uses eager-caching on function identity: first call wraps in `RunnableSeq(run, ChannelWrite([RETURN]))`, cached by `(func, is_task)`. ChannelWrite is inlined in the runnable, not deferred to orchestrator.

## Patterns worth porting

<a id="g15-f035"></a>
### Recursive task scheduling with future chaining

`libs/langgraph/langgraph/pregel/_runner.py:700-782` @ d57a74f

Recursive task scheduling with future chaining (`libs/langgraph/langgraph/pregel/_runner.py:700-782`): nodes invoke `call(func, *args)` which schedules a new task via callback; the task's future is chained via `chain_future(fut, destination)` so the node's caller waits for the child. Allows nodes to orchestrate sub-flows without explicit await syntax or loop unrolling.

<a id="g15-f036"></a>
### Deferred-state reads with write overlay

`libs/langgraph/langgraph/pregel/_algo.py:725-736` @ d57a74f

Deferred-state reads with write overlay (`libs/langgraph/langgraph/pregel/_algo.py:725-736`): inject a CONFIG_KEY_READ callback that reads committed state and overlays unsaved writes from the current task. Avoids pre-materializing state snapshots; conditional edges see their own writes without a snapshot copy.

<a id="g15-f037"></a>
### Deterministic task IDs for replay

`libs/langgraph/langgraph/pregel/_algo.py:524-605` @ d57a74f

Deterministic task IDs for replay (`libs/langgraph/langgraph/pregel/_algo.py:524-605`): task IDs are hashed from (checkpoint_id, namespace, step, node_name, channel_triggers, path_parts), not random UUIDs. Makes task IDs reproducible given a checkpoint, enabling replay-based debugging without explicit logs.

<a id="g15-f038"></a>
### Send-based fan-out delegation

`libs/langgraph/langgraph/types.py:664-709` @ d57a74f

Send-based fan-out delegation (`libs/langgraph/langgraph/types.py:664-709`): `Send` allows a node to emit multiple child tasks in a single step, each with independent timeout policy, and the graph collects results before proceeding. Simpler than explicit child process creation and fits a declarative model.

<a id="g15-f039"></a>
### Callback-driven write persistence ordering

`libs/langgraph/langgraph/pregel/_runner.py:114-133` @ d57a74f

Callback-driven write persistence ordering (`libs/langgraph/langgraph/pregel/_runner.py:114-133`, `574-613`): futures register done_callback that calls `commit()`, which appends writes and invokes `put_writes`. Ordering: execution -> callback -> persistence -> stream notification. Avoids explicit queue polling.

<a id="g15-f040"></a>
### Semaphore-gated concurrency without queues

`libs/langgraph/langgraph/pregel/_executor.py:135-141` @ d57a74f

Semaphore-gated concurrency without queues (`libs/langgraph/langgraph/pregel/_executor.py:135-141`): semaphore stored in context manager, each submitted coroutine wrapped with `gated(semaphore, coro)`. Semaphore itself is the backpressure point; lighter than work-stealing queues for graph orchestration.

<a id="g15-f041"></a>
### Scope-chained scratchpad for nested contexts

`libs/langgraph/langgraph/pregel/_algo.py:1280-1345` @ d57a74f

Scope-chained scratchpad for nested contexts (`libs/langgraph/langgraph/pregel/_algo.py:1280-1345`): each task gets a `PregelScratchpad` that delegates `get_null_resume` to parent scratchpad, forming a scope chain. Nested tasks can read parent resume values while maintaining task-local call/interrupt counts.

<a id="g15-f042"></a>
### Topic channel as send buffer / backpressure

`libs/langgraph/langgraph/channels/topic.py:77-85` @ d57a74f

Topic channel as send buffer / backpressure (`libs/langgraph/langgraph/channels/topic.py:77-85`, `libs/langgraph/langgraph/pregel/_algo.py:442-466`): Send objects enqueued into a TASKS topic channel. Each superstep PUSH tasks consume the topic, create `PregelExecutableTask` per Send, and execute. Topic drains on non-accumulate, giving natural superstep-level backpressure.

<a id="g15-f043"></a>
### Two-phase visibility for handoff

`libs/langgraph/langgraph/channels/last_value.py:81-151` @ d57a74f

Two-phase visibility for handoff (`libs/langgraph/langgraph/channels/last_value.py:81-151`): write -> finish -> consume separates state mutation from child visibility, enabling structured parent-child handoff without race conditions.

<a id="g15-f044"></a>
### State snapshot as parent visibility window

`libs/langgraph/langgraph/types.py:643-661` @ d57a74f

State snapshot as parent visibility window (`libs/langgraph/langgraph/types.py:643-661`): `StateSnapshot` includes `next`, `tasks`, `parent_config`, and `interrupts`, giving a coordinator a full picture of pending child tasks without opening child internal state.

<a id="g15-f045"></a>
### Implicit graph termination via channel versioning

`libs/langgraph/langgraph/pregel/_algo.py:335-342` @ d57a74f

Implicit graph termination via channel versioning (`libs/langgraph/langgraph/pregel/_algo.py:335-342`): after each superstep, if no task triggered any channel, graph finishes all channels and considers execution complete. No explicit termination signals or final-node markers.

<a id="g15-f046"></a>
### Multi-node join via NamedBarrierValue

`libs/langgraph/langgraph/graph/state.py:1537-1611` @ d57a74f

Multi-node join via NamedBarrierValue (`libs/langgraph/langgraph/graph/state.py:1537-1611`): `NamedBarrierValue(Set[str], set_of_start_nodes)` triggers only when all named starts have written, preventing spurious triggers if one start completes multiple times per superstep.

<a id="g15-f047"></a>
### Error handler scheduling in-band

`libs/langgraph/langgraph/pregel/_runner.py:205-233` @ d57a74f

Error handler scheduling in-band (`libs/langgraph/langgraph/pregel/_runner.py:205-233`, `297-324`): when a task fails and has a mapped error handler node, `schedule_error_handler(task, exc)` is called to get a new handler task and add it to the same tick. Handler is scheduled dynamically, not pre-planned, enabling stack-like error recovery chains.

<a id="g15-f048"></a>
### Decoupled timeout policies

`libs/langgraph/langgraph/types.py:449-512` @ d57a74f

Decoupled timeout policies (`libs/langgraph/langgraph/types.py:449-512`): wall-clock and idle timeouts are separate with different refresh semantics. Heartbeat signaling allows long-running tasks to avoid premature idle timeout without blocking.

<a id="g15-f049"></a>
### Cooperative drain signaling

`libs/langgraph/langgraph/runtime.py:79-104` @ d57a74f

Cooperative drain signaling (`libs/langgraph/langgraph/runtime.py:79-104`, `libs/langgraph/langgraph/errors.py:54-64`): `RunControl.request_drain()` sets a flag; graph checks at superstep boundaries and raises `GraphDrained`. Avoids forced cancellation, allows current checkpoint to be saved.

<a id="g15-f050"></a>
### entrypoint.final to decouple return/checkpoint

`libs/langgraph/langgraph/func/__init__.py:475-514` @ d57a74f

`entrypoint.final` to decouple return/checkpoint (`libs/langgraph/langgraph/func/init.py:475-514`): allows a workflow to return one value to the caller and save a different value to the checkpoint. Enables checkpoint to accumulate state (e.g., run summary) while the caller sees only current output.

## Open threads / weak spots

<a id="g15-f051"></a>
### schedule_error_handler and match_cached_writes raise NotImplementedError in PregelLoop base

`libs/langgraph/langgraph/pregel/_loop.py:585-590` @ d57a74f

`libs/langgraph/langgraph/pregel/_loop.py:585-590`, `1549`, `1803` — `schedule_error_handler` and `match_cached_writes` raise `NotImplementedError` in `PregelLoop` base; sync/async subclasses override. No static ABC enforcement — contract relies on runtime override failure.

<a id="g15-f052"></a>
### _put_checkpoint_fut submitted via submit(self._checkpointer_put_after_previous, ...) without explicit null check, despite _checkpointer_put_after_previous being conditionally set to None at line 1503

`libs/langgraph/langgraph/pregel/_loop.py:1116-1189` @ d57a74f

`libs/langgraph/langgraph/pregel/_loop.py:1116-1189` — `_put_checkpoint_fut` submitted via `submit(self._checkpointer_put_after_previous, ...)` without explicit null check, despite `_checkpointer_put_after_previous` being conditionally set to `None` at line 1503. Guard at line 1116 prevents the call, but there is no explicit type narrowing and the guard is implicit.

<a id="g15-f053"></a>
### Resume value matching in interrupt() relies on a linear counter ( scratchpad.interrupt_counter() )

`libs/langgraph/langgraph/types.py:915-934` @ d57a74f

`libs/langgraph/langgraph/types.py:915-934` — Resume value matching in `interrupt()` relies on a linear counter (`scratchpad.interrupt_counter()`). If node logic is reordered during a re-run (e.g., conditional branches), the counter may not match the old resume list, causing silent mismatches. Error message does not clarify this scenario.

<a id="g15-f054"></a>
### Topic.update() clears values before extending unless accumulate=True

`libs/langgraph/langgraph/channels/topic.py:77-85` @ d57a74f

`libs/langgraph/langgraph/channels/topic.py:77-85` — `Topic.update()` clears values before extending unless `accumulate=True`. If a consumer crashes between `get()` and step completion, Sends are lost with no delivery guarantee or dead-letter mechanism.

<a id="g15-f055"></a>
### Type hint inference for node input schema wrapped in broad try-except (NameError, TypeError, StopIteration) silently falls back to state schema

`libs/langgraph/langgraph/graph/state.py:806-848` @ d57a74f

`libs/langgraph/langgraph/graph/state.py:806-848` — Type hint inference for node input schema wrapped in broad `try-except` (NameError, TypeError, StopIteration) silently falls back to state schema. Malformed hints produce no diagnostic warning.

<a id="g15-f056"></a>
### Context schema handling deferred to compile time

`libs/langgraph/langgraph/graph/state.py:1668-1678` @ d57a74f

`libs/langgraph/langgraph/graph/state.py:1668-1678` — Context schema handling deferred to compile time; no validation that `Runtime[ContextT]` in node signatures matches supplied `context_schema`. Mismatches silently produce runtime `AttributeError` when nodes access `runtime.context` fields.

<a id="g15-f057"></a>
### SKIP_RERAISE_SET is a module-level WeakSet to suppress re-raise for recursive task scheduling ( call() tasks)

`libs/langgraph/langgraph/pregel/_runner.py:70-72` @ d57a74f

`libs/langgraph/langgraph/pregel/_runner.py:70-72` — `SKIP_RERAISE_SET` is a module-level `WeakSet` to suppress re-raise for recursive task scheduling (`call()` tasks). If the weak reference is collected before the future is checked, an exception may be re-raised unexpectedly.

<a id="g15-f058"></a>
### get_waiter() is called in a loop to re-add a waiter if inflight tasks remain

`libs/langgraph/langgraph/pregel/_runner.py:256-257` @ d57a74f

`libs/langgraph/langgraph/pregel/_runner.py:256-257` — `get_waiter()` is called in a loop to re-add a waiter if inflight tasks remain. If `get_waiter()` is slow or creates stale futures, the waiter may never complete, blocking `tick()` indefinitely. No timeout on waiter generation itself.

<a id="g15-f059"></a>
### prepare_single_task catches exceptions during _proc_input but adds __notes__ only on Python 3.11+

`libs/langgraph/langgraph/pregel/_algo.py:635-652` @ d57a74f

`libs/langgraph/langgraph/pregel/_algo.py:635-652` — `prepare_single_task` catches exceptions during `_proc_input` but adds `notes` only on Python 3.11+. Pre-3.11 failures produce no structured backtrace identifying the task or step.

<a id="g15-f060"></a>
### Implicit termination check updated_channels.isdisjoint(trigger_to_nodes) assumes trigger_to_nodes is complete

`libs/langgraph/langgraph/pregel/_algo.py:336-342` @ d57a74f

`libs/langgraph/langgraph/pregel/_algo.py:336-342` — Implicit termination check `updated_channels.isdisjoint(trigger_to_nodes)` assumes `trigger_to_nodes` is complete. Nodes added after graph construction but missing from `trigger_to_nodes` may cause premature termination with no validation error.

<a id="g15-f061"></a>
### Command._update_as_tuples() fallback to __root__ tuple if get_cached_annotated_keys()…

`libs/langgraph/langgraph/types.py:793-806` @ d57a74f

`libs/langgraph/langgraph/types.py:793-806` — `Command._update_as_tuples()` fallback to `root` tuple if `get_cached_annotated_keys()` returns `None` may silently mask user type errors when the update type is unexpected.

<a id="g15-f062"></a>
### TaskPayload.triggers is a flat list of channel name strings

`libs/langgraph/langgraph/types.py:151` @ d57a74f

`libs/langgraph/langgraph/types.py:151` — `TaskPayload.triggers` is a flat list of channel name strings. When a task is triggered by multiple channels, order may be non-deterministic and does not reflect causality, making it hard to reconstruct why a task ran.

<a id="g15-f063"></a>
### Timeout policy is only supported for async tasks

`libs/langgraph/langgraph/func/__init__.py:237-246` @ d57a74f

`libs/langgraph/langgraph/func/init.py:237-246` — Timeout policy is only supported for async tasks; sync tasks raise `sync_timeout_unsupported()`. No workaround documented for sync tasks that need idle timeout.

<a id="g15-f064"></a>
### No timeout or backoff strategy in the update loop

`libs/langgraph/langgraph/channels/binop.py:109-130` @ d57a74f

`libs/langgraph/langgraph/channels/binop.py:109-130` — No timeout or backoff strategy in the update loop; repeated failed operator applications (e.g., type mismatch) silently accumulate or raise unhandled exceptions rather than signal early.

<a id="g15-f065"></a>
### httpx.HTTPStatusError and requests.HTTPError retry logic assumes response.status_code…

`libs/langgraph/langgraph/_internal/_retry.py:8-10` @ d57a74f

`libs/langgraph/langgraph/_internal/_retry.py:8-10` — `httpx.HTTPStatusError` and `requests.HTTPError` retry logic assumes `response.status_code` presence but does not guard against `None` for requests (only for httpx).

<a id="g15-f066"></a>
### Runtime.merge() uses simple OR fallback: if the other runtime has a non-None field, use it

`libs/langgraph/langgraph/runtime.py:240-258` @ d57a74f

`libs/langgraph/langgraph/runtime.py:240-258` — `Runtime.merge()` uses simple OR fallback: if the other runtime has a non-None field, use it; else use self. No deep merging or conflict resolution for mutable fields like `store`. May lead to unexpected state clobbering in nested runs.

