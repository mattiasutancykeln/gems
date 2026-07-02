# autogen

| | |
|---|---|
| Source | https://github.com/microsoft/autogen |
| Repo | https://github.com/microsoft/autogen @ `027ecf0a379bcc1d09956d46d12d44a3ad9cee14` |
| Kind | repo |
| Topics | agent |
| License | CC-BY-4.0 (ideas-only) |
| Verdict | - |
| Findings | 72 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/10 |

## Implementation decisions

<a id="g10-f001"></a>
### Four distinct topic types are created per team

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:114-128` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:114-128` — Four distinct topic types are created per team: (a) broadcast group communication, (b) direct manager communication, (c) per-participant direct comms, and (d) output relay. This multi-topic pub/sub architecture fully isolates message flow domains — participants publish to the group topic, the manager selects the next speaker, responses flow back to the manager, and output queues to the user — keeping orchestration decoupled from individual agent runtimes.

<a id="g10-f002"></a>
### Progress ledger is the core orchestration contract

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_magentic_one_orchestrator.py:300-450` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_magentic_one_orchestrator.py:300-450` — Progress ledger is the core orchestration contract: the model generates JSON with `is_request_satisfied`, `is_progress_being_made`, `is_in_loop`, `next_speaker`, and `instruction_or_question`. Structure is validated with a retry loop (L318-384). This is the most load-bearing decision schema in the codebase — the orchestrator cannot proceed without a valid ledger.

<a id="g10-f003"></a>
### Active speakers list tracks which agents are currently processing

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat_manager.py:152-156` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat_manager.py:152-156` — Active speakers list tracks which agents are currently processing. Responses (agent or team) remove the respondent from the list; if any speakers remain, the handler returns early. Only when all active speakers have responded does the manager select next speakers — implicit synchronization without explicit barriers, supporting parallel agent turns.

<a id="g10-f004"></a>
### AgentTool and TeamTool wrap agents/teams as callable tools for other agents

`python/packages/autogen-agentchat/src/autogen_agentchat/tools/_agent.py:20-83` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/tools/_agent.py:20-83` — `AgentTool` and `TeamTool` wrap agents/teams as callable tools for other agents. This inversion — child tasks as callable interfaces rather than direct invocation — enables composition without modification. Both enforce `parallel_tool_calls=False` (lines 25-30) due to agent state non-concurrency.

<a id="g10-f005"></a>
### Message buffering in containers decouples reception (event handlers, async) from execution (RPC)

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_chat_agent_container.py:53` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_chat_agent_container.py:53,161-165` — Message buffering in containers decouples reception (event handlers, async) from execution (RPC). Messages arrive asynchronously via event subscriptions but are held in a buffer until an explicit `GroupChatRequestPublish` RPC triggers the agent to consume and respond — enabling backpressure and ordered execution.

<a id="g10-f006"></a>
### pause() and resume() are separate from reset()

`python/packages/autogen-agentchat/src/autogen_agentchat/base/_team.py:28-44` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/base/_team.py:28-44` — `pause()` and `resume()` are separate from `reset()`. `reset()` clears accumulated history; pause/resume are lifecycle signals that do not modify history, allowing transient pauses without snapshot overhead. Both are decoupled from `run()` cancellation.

<a id="g10-f007"></a>
### Streaming and blocking modes share a single underlying run_stream() coroutine

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:247-564` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:247-564` — Streaming and blocking modes share a single underlying `run_stream()` coroutine; `run()` collects all outputs. The interface is composable without duplicating orchestration logic.

<a id="g10-f008"></a>
### Outer loop (facts+plan ledger) is re-entered via _reenter_outer_loop , which resets all agents (L265-270), clears the message thread, broadcasts the ledger, then re-enters the inner orchestration loop

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_magentic_one_orchestrator.py:262-298` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_magentic_one_orchestrator.py:262-298` — Outer loop (facts+plan ledger) is re-entered via `_reenter_outer_loop`, which resets all agents (L265-270), clears the message thread, broadcasts the ledger, then re-enters the inner orchestration loop. Enables replanning on stall rather than terminal failure.

<a id="g10-f009"></a>
### _init() is called lazily on first run_stream() (line 493) and also on reset() if not yet initialized

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:191-245` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:191-245` — `_init()` is called lazily on first `run_stream()` (line 493) and also on `reset()` if not yet initialized. Defers agent registration to the runtime until first use, allowing the user to pass a custom runtime or embed one without upfront async setup.

<a id="g10-f010"></a>
### GroupChatStart message is sent as a single RPC to the manager with all task messages and…

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:534-538` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:534-538` — `GroupChatStart` message is sent as a single RPC to the manager with all task messages and a boolean flag (`output_task_messages`), ensuring all messages are received atomically before orchestration begins, avoiding partial-start races.

<a id="g10-f011"></a>
### Handoff.target is a string (agent name), not a reference

`python/packages/autogen-agentchat/src/autogen_agentchat/base/_handoff.py:12-28` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/base/_handoff.py:12-28` — `Handoff.target` is a string (agent name), not a reference. Downstream orchestrator must resolve name to agent instance, decoupling handoff from agent registry coupling at definition time.

<a id="g10-f012"></a>
### Participant names are stored alongside topic types in a name-to-topic-type mapping dict, decoupling agent identity (name) from their addressable transport layer (topic type)

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat_manager.py:73-75` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat_manager.py:73-75` — Participant names are stored alongside topic types in a name-to-topic-type mapping dict, decoupling agent identity (name) from their addressable transport layer (topic type). Enables state save/load by name instead of ephemeral agent IDs.

<a id="g10-f013"></a>
### FIFOLock enforces strict ordering of message processing by type using an event queue +…

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_sequential_routed_agent.py:7-73` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_sequential_routed_agent.py:7-73` — `FIFOLock` enforces strict ordering of message processing by type using an event queue + flag, preventing message interleaving for critical sequential types (e.g., group chat turns).

<a id="g10-f014"></a>
### Agents are declared stateful

`python/packages/autogen-agentchat/src/autogen_agentchat/agents/_base_chat_agent.py:73-86` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/agents/_base_chat_agent.py:73-86` — Agents are declared stateful; only new messages since last call should be passed and agents maintain internal state across calls. No history resubmission. This enables efficient multi-turn orchestration without conversation bloat.

<a id="g10-f015"></a>
### Introduces output_task_messages parameter to avoid fragile count-based logic when…

`python/packages/autogen-agentchat/src/autogen_agentchat/agents/_society_of_mind_agent.py:194-196` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/agents/_society_of_mind_agent.py:194-196` — Introduces `output_task_messages` parameter to avoid fragile count-based logic when filtering task messages from inner team runs, decoupling caller control over output visibility from internal recursion depth.

<a id="g10-f016"></a>
### Swarm selection is declarative

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_swarm_group_chat.py:82-98` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_swarm_group_chat.py:82-98` — Swarm selection is declarative — it looks only for `HandoffMessage.target`, not a computed choice. Returns current speaker if no handoff found (L98). Cleanest delegation schema in the repo.

<a id="g10-f017"></a>
### TaskRunner.run() uses stateful continuation: if no task is provided, it resumes from…

`python/packages/autogen-agentchat/src/autogen_agentchat/base/_task.py:22-42` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/base/_task.py:22-42` — `TaskRunner.run()` uses stateful continuation: if no task is provided, it resumes from prior state rather than erroring, enabling mid-run pause/resume patterns without respecifying intent.

<a id="g10-f018"></a>
### Team ID is bound to the group chat object instance, not regenerated per run, making team…

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:105-109` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:105-109` — Team ID is bound to the group chat object instance, not regenerated per run, making team participants always have stable addressable identities within a single team object's lifetime.

<a id="g10-f019"></a>
### ChatAgent.on_messages() returns Response with inner_messages as optional, bifurcating public output ( chat_message ) from observability ( inner_messages )

`python/packages/autogen-agentchat/src/autogen_agentchat/base/_chat_agent.py:52-62` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/base/_chat_agent.py:52-62` — `ChatAgent.on_messages()` returns `Response` with `inner_messages` as optional, bifurcating public output (`chat_message`) from observability (`inner_messages`). Agents can emit events without forcing them into the main conversation.

<a id="g10-f020"></a>
### TerminationCondition combines via operator overload ( __and__ , __or__ ), not factory…

`python/packages/autogen-agentchat/src/autogen_agentchat/base/_termination.py:79-85` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/base/_termination.py:79-85` — `TerminationCondition` combines via operator overload (`and`, `or`), not factory methods, embedding composition into the condition type itself and enabling chaining.

## Skills, prompts, tools

<a id="g10-f021"></a>
### Progress ledger prompt asks five structured questions

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_prompts.py:59-100` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_prompts.py:59-100` — Progress ledger prompt asks five structured questions: satisfaction, loop detection, progress, next speaker, instruction. Enforces JSON schema with field validation (reason + answer pairs). This is the canonical prompt-as-structured-contract pattern in the repo.

<a id="g10-f022"></a>
### Facts prompt solicits pre-survey of GIVEN/LOOKUP/DERIVE/EDUCATED facts

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_prompts.py:6-27` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_prompts.py:6-27` — Facts prompt solicits pre-survey of GIVEN/LOOKUP/DERIVE/EDUCATED facts. Separates known from unknown before planning, reducing plan hallucination.

<a id="g10-f023"></a>
### Plan prompt explicitly directs the model NOT to involve all team members

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_prompts.py:30-34` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_prompts.py:30-34` — Plan prompt explicitly directs the model NOT to involve all team members — only those needed. Surfaces role composition but leaves prioritization to the model.

<a id="g10-f024"></a>
### Facts update prompt is called on stall

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_prompts.py:121-130` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_prompts.py:121-130` — Facts update prompt is called on stall; re-prompts model to edit educated guesses in light of failure, moving guesses to verified facts if warranted.

<a id="g10-f025"></a>
### Plan update prompt asks model to identify root cause of stall, then devise a new plan

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_prompts.py:133-136` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_prompts.py:133-136` — Plan update prompt asks model to identify root cause of stall, then devise a new plan. Explicit replay prevention.

<a id="g10-f026"></a>
### Selector prompt is a template with three placeholders

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_selector_group_chat.py:236-238` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_selector_group_chat.py:236-238` — Selector prompt is a template with three placeholders: `{roles}` (newline-separated agent:description pairs), `{participants}` (JSON list of candidate names), `{history}` (formatted conversation).

<a id="g10-f027"></a>
### StructuredMessageFactory accepts either a Pydantic model or a JSON schema, generates a strongly-typed StructuredMessage subclass, and provides dump/load config serialization

`python/packages/autogen-agentchat/src/autogen_agentchat/messages.py:260-365` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/messages.py:260-365` — `StructuredMessageFactory` accepts either a Pydantic model or a JSON schema, generates a strongly-typed `StructuredMessage` subclass, and provides dump/load config serialization. Format strings allow text templates with content model fields.

<a id="g10-f028"></a>
### Handoff.handoff_tool() creates FunctionTool with name, description, and no input schema (strict=True, no-arg function)

`python/packages/autogen-agentchat/src/autogen_agentchat/base/_handoff.py:51-57` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/base/_handoff.py:51-57` — `Handoff.handoff_tool()` creates `FunctionTool` with name, description, and no input schema (strict=True, no-arg function). The message is the return value, not captured context; downstream handler must route based on tool invocation.

<a id="g10-f029"></a>
### tool_call_summary_formatter is a Pydantic-incompatible callable that customizes tool…

`python/packages/autogen-agentchat/src/autogen_agentchat/agents/_assistant_agent.py:228-232` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/agents/_assistant_agent.py:228-232` — `tool_call_summary_formatter` is a Pydantic-incompatible callable that customizes tool result presentation, allowing conditional logic (hide success, show all on error).

<a id="g10-f030"></a>
### Tool input schema is minimal

`python/packages/autogen-agentchat/src/autogen_agentchat/tools/_task_runner_tool.py:14-18` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/tools/_task_runner_tool.py:14-18` — Tool input schema is minimal: `TaskRunnerToolArgs` contains only a single `task: str` field. Enforces that child tasks are string-specified rather than structured; the child agent/team handles parsing and execution.

<a id="g10-f031"></a>
### Dual return-value modes via return_value_as_last_message

`python/packages/autogen-agentchat/src/autogen_agentchat/tools/_task_runner_tool.py:54-66` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/tools/_task_runner_tool.py:54-66` — Dual return-value modes via `return_value_as_last_message`. True: only the final message. False: all non-user messages prefixed by source. Allows calling agents to choose between concise final output or full dialogue capture.

<a id="g10-f032"></a>
### FunctionalTermination detects async callables via asyncio.iscoroutinefunction() at call-time (line 216), not at construction

`python/packages/autogen-agentchat/src/autogen_agentchat/base/_terminations.py:201-223` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/base/_terminations.py:201-223` — `FunctionalTermination` detects async callables via `asyncio.iscoroutinefunction()` at call-time (line 216), not at construction. Allows both sync and async predicates without lambda wrapping.

<a id="g10-f033"></a>
### TokenUsageTermination accumulates token deltas from message.models_usage across all messages, then checks thresholds

`python/packages/autogen-agentchat/src/autogen_agentchat/base/_terminations.py:275-286` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/base/_terminations.py:275-286` — `TokenUsageTermination` accumulates token deltas from `message.models_usage` across all messages, then checks thresholds. No per-child budget; only a flat aggregate.

<a id="g10-f034"></a>
### Task input accepts str , single BaseChatMessage , or list of BaseChatMessage

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:455-481` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:455-481` — Task input accepts `str`, single `BaseChatMessage`, or list of `BaseChatMessage`; all normalized to a message list and validated against the registered message factory before execution begins. Fail-fast upfront validation.

<a id="g10-f035"></a>
### Abstract select_speaker() returns a single speaker name ( str ) or list ( List[str] )

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat_manager.py:305-318` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat_manager.py:305-318` — Abstract `select_speaker()` returns a single speaker name (`str`) or list (`List[str]`); allows multi-speaker turns (parallel agents). Manager auto-converts `str` to `[str]` for downstream uniformity.

<a id="g10-f036"></a>
### Two distinct prompts

`python/packages/autogen-agentchat/src/autogen_agentchat/agents/_society_of_mind_agent.py:111-121` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/agents/_society_of_mind_agent.py:111-121` — Two distinct prompts: `DEFAULT_INSTRUCTION` (frames the inner team's discussion) and `DEFAULT_RESPONSE_PROMPT` (directs synthesis of a standalone response). Separates problem statement from synthesis instruction.

<a id="g10-f037"></a>
### Adaptive LLM message formatting based on model capability ( multiple_system_messages )

`python/packages/autogen-agentchat/src/autogen_agentchat/agents/_society_of_mind_agent.py:217-234` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/agents/_society_of_mind_agent.py:217-234` — Adaptive LLM message formatting based on model capability (`multiple_system_messages`). Falls back to `UserMessage` wrapping if the model lacks multiple system message support, avoiding hard failures on heterogeneous model backends.

<a id="g10-f038"></a>
### custom_message_types parameter allows injection of new message types at team creation time

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:75-77` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:75-77` — `custom_message_types` parameter allows injection of new message types at team creation time; custom types are registered in the message factory alongside built-in types (lines 90-103). Supports extensibility without forking the base library.

## Patterns worth porting

<a id="g10-f039"></a>
### Multi-topic pub/sub for agent coordination

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:114-128` @ 027ecf0

Multi-topic pub/sub for agent coordination (`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:114-128` + `_base_group_chat_manager.py:196-243`): Use separate topic types for broadcast, direct manager comms, per-agent responses, and output aggregation. Participants subscribe to both their direct topic and a shared group topic. The orchestrator's subscription grants visibility into all three domains without coupling to individual agent runtimes.

<a id="g10-f040"></a>
### Structured completion contract via ledger

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_magentic_one_orchestrator.py:318-384` @ 027ecf0

Structured completion contract via ledger (`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_magentic_one_orchestrator.py:318-384`): JSON ledger with retry loop and field validation is the canonical completion/handoff protocol. On any parse/validation failure, logs and retries up to `_max_json_retries` times before raising. This is the most portable structured-output harness in the repo.

<a id="g10-f041"></a>
### Stall detection and replanning

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_magentic_one_orchestrator.py:392-406` @ 027ecf0

Stall detection and replanning (`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_magentic_one_orchestrator.py:392-406`): Increments `_n_stalls` if progress not made or loop detected; decrements on progress. At threshold, triggers outer-loop re-entry (replanning) instead of terminal escalation. Enables recovery without human intervention.

<a id="g10-f042"></a>
### Active speaker tracking for multi-agent synchronization

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat_manager.py:152-156` @ 027ecf0

Active speaker tracking for multi-agent synchronization (`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat_manager.py:152-156`): Track in-flight agents in a list; each response removes the agent. Once empty, proceed to next speakers. Avoids explicit barriers while supporting parallel agent turns.

<a id="g10-f043"></a>
### Serializable exception protocol

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_events.py:10-36` @ 027ecf0

Serializable exception protocol (`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_events.py:10-36`): Convert remote agent errors to `SerializableException` carrying type, message, and traceback. Publish as `GroupChatError` event. Parent can inspect, log, or propagate with full debugging context. Traceback preserved across process boundaries.

<a id="g10-f044"></a>
### Buffered message queues in worker agents

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_chat_agent_container.py:53` @ 027ecf0

Buffered message queues in worker agents (`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_chat_agent_container.py:53,86-192`): Buffer incoming messages in event handlers (async, non-blocking), execute in RPC handler triggered by explicit request. Separates reception from execution, provides implicit backpressure, and allows the orchestrator to enforce ordering.

<a id="g10-f045"></a>
### Agents/teams as tools (inversion pattern)

`python/packages/autogen-agentchat/src/autogen_agentchat/tools/_agent.py:20-83` @ 027ecf0

Agents/teams as tools (inversion pattern) (`python/packages/autogen-agentchat/src/autogen_agentchat/tools/_agent.py:20-83` + `_task_runner_tool.py:42-52`): Wrap agents and teams as `FunctionTool`-compatible callables. `run_stream()` is a transparent passthrough preserving streaming events. The final `TaskResult` is the canonical completion signal. Enables hierarchical composition without special orchestration code.

<a id="g10-f046"></a>
### Cancellation token with fan-out callbacks

`python/packages/autogen-core/src/autogen_core/_cancellation_token.py:14-46` @ 027ecf0

Cancellation token with fan-out callbacks (`python/packages/autogen-core/src/autogen_core/_cancellation_token.py:14-46`): Single shared token with callback registration allows cancellation signals to fan-out to all linked futures. Callbacks invoked under lock; new callbacks can be added after cancellation (idempotency lines 30-31). No special message passing required for cascade.

<a id="g10-f047"></a>
### Name-based agent addressing in state

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:782-825` @ 027ecf0

Name-based agent addressing in state (`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:782-825`): Save agent state keyed by `agent.name` rather than ephemeral agent IDs. Makes state snapshots portable across runtime instances and team reincarnations without a mapping layer.

<a id="g10-f048"></a>
### Stateful agent reset boundary

`python/packages/autogen-agentchat/src/autogen_agentchat/agents/_society_of_mind_agent.py:243-250` @ 027ecf0

Stateful agent reset boundary (`python/packages/autogen-agentchat/src/autogen_agentchat/agents/_society_of_mind_agent.py:243-250` + `_base_chat_agent.py:215-216`): Orchestrators call `reset()` explicitly after orchestration, wiping agent state and model context. Makes state lifecycle explicit, prevents cross-turn pollution in nested orchestration.

<a id="g10-f049"></a>
### Lazy runtime initialization with custom injection

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:135-142` @ 027ecf0

Lazy runtime initialization with custom injection (`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:135-142,487-528,645-648`): Accept `runtime=None`, create `SingleThreadedAgentRuntime` on demand. Supports both embedded runs (default) and injected runtimes (fleet mode, shared execution). `_embedded_runtime` flag controls lifecycle.

<a id="g10-f050"></a>
### Retry loop for LLM-driven speaker selection

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_selector_group_chat.py:232-308` @ 027ecf0

Retry loop for LLM-driven speaker selection (`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_selector_group_chat.py:232-308`): If model returns 0 or >1 mentions, or selects previous speaker when disallowed, re-prompt with corrective feedback up to `max_selector_attempts`. Fallback to previous speaker or first participant.

<a id="g10-f051"></a>
### Component-based config serialization

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:794-834` @ 027ecf0

Component-based config serialization (`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:794-834` + `_society_of_mind_agent.py:282-302`): Agents, teams, termination conditions, and message factories implement `dump_component()` -> config and `load_component(config)` -> instance. Enables JSON persistence with full type safety across all orchestration primitives.

<a id="g10-f052"></a>
### Candidate filtering before LLM speaker selection

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_selector_group_chat.py:180-199` @ 027ecf0

Candidate filtering before LLM speaker selection (`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_selector_group_chat.py:180-199`): Optional custom candidate function runs before model-based selection. Fallback logic filters previous speaker unless `allow_repeated_speaker=True`. Ensures speaker pool is controlled before LLM sees it.

<a id="g10-f053"></a>
### State as flat agent-name -> state dict

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_magentic_one_orchestrator.py:225-245` @ 027ecf0

State as flat agent-name -> state dict (`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_magentic_one_orchestrator.py:225-245`): Orchestrator state captures message thread, turn count, task, facts, plan, round count, stall count. Flat structure simplifies restore logic and avoids index fragility when participant order changes.

<a id="g10-f054"></a>
### Explicit publish-message pattern for audit

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat_manager.py:104-129` @ 027ecf0

Explicit publish-message pattern for audit (`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat_manager.py:104-129`): Every internal message (agent response, speaker selection, termination) is published to the output topic before being acted upon. Real-time observers see orchestration decisions without modifying orchestrator code.

## Open threads / weak spots

<a id="g10-f055"></a>
### Output message queue consumer loop has no timeout or max-iteration count

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:540-562` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:540-562` — Output message queue consumer loop has no timeout or max-iteration count. If a bug in the manager causes infinite message publication, the consumer loop never returns. The shutdown task eventually stops the runtime, but `run_stream()` itself remains stuck in the `while True` loop.

<a id="g10-f056"></a>
### TokenUsageTermination has no per-child budget tracking

`python/packages/autogen-agentchat/src/autogen_agentchat/base/_terminations.py:275-286` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/base/_terminations.py:275-286` — `TokenUsageTermination` has no per-child budget tracking; total token consumption is flat across all messages. No way to constrain child spend or allocate budgets down the tree.

<a id="g10-f057"></a>
### _active_speakers is a simple list, not a set

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat_manager.py:84` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat_manager.py:84` — `_active_speakers` is a simple list, not a set. If `select_speaker` returns the same agent twice, duplicates are possible. Remove-by-name assumes no duplicates; a doubly-selected agent deadlocks subsequent turns when the second copy is never removed.

<a id="g10-f058"></a>
### Mutual exclusion check is a flag ( _is_running )

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:483-485` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:483-485` — Mutual exclusion check is a flag (`_is_running`); no lock guards against concurrent `run()` calls in multi-threaded scenarios — only re-entrant calls within a single event loop.

<a id="g10-f059"></a>
### _max_json_retries = 10 is hardcoded with no exposed configuration knob

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_magentic_one_orchestrator.py:94` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_magentic_one_orchestrator.py:94` — `_max_json_retries = 10` is hardcoded with no exposed configuration knob. If the model fails to produce valid ledger JSON 10 times in a row, raises with no recovery path.

<a id="g10-f060"></a>
### select_speaker is awaited as a future but there is no timeout or circuit breaker

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat_manager.py:172-193` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat_manager.py:172-193` — `select_speaker` is awaited as a future but there is no timeout or circuit breaker. If `select_speaker` hangs (e.g., waiting on user input), the entire group chat blocks with no recovery or escalation path documented.

<a id="g10-f061"></a>
### Swarm explicitly does NOT support inner teams as participants, only ChatAgent

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_swarm_group_chat.py:138` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_swarm_group_chat.py:138` — Swarm explicitly does NOT support inner teams as participants, only `ChatAgent`. Limits composition depth; no nested-team delegation in swarm mode.

<a id="g10-f062"></a>
### MagenticOne raises RuntimeError if it receives GroupChatTeamResponse instead of GroupChatAgentResponse

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_magentic_one_orchestrator.py:198` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_magentic_one/_magentic_one_orchestrator.py:198` — MagenticOne raises `RuntimeError` if it receives `GroupChatTeamResponse` instead of `GroupChatAgentResponse`. Does not support nested teams as participants.

<a id="g10-f063"></a>
### MessageFactory is a flat registry with no versioning or migration path

`python/packages/autogen-agentchat/src/autogen_agentchat/messages.py:583-644` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/messages.py:583-644` — `MessageFactory` is a flat registry with no versioning or migration path. If two agents are compiled with different message type sets, deserialization of unregistered types raises `ValueError` at runtime. No graceful fallback (e.g., treating unknown types as raw JSON).

<a id="g10-f064"></a>
### parallel_tool_calls=False is a hardcoded requirement for any model client driving an agent or team tool

`python/packages/autogen-agentchat/src/autogen_agentchat/tools/_agent.py:25-30` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/tools/_agent.py:25-30` — `parallel_tool_calls=False` is a hardcoded requirement for any model client driving an agent or team tool. No automatic enforcement; misconfiguration silently causes race conditions. No validation at tool instantiation.

<a id="g10-f065"></a>
### If reset() itself fails, the team is left in _is_running=True , preventing further runs

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:620-655` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:620-655` — If `reset()` itself fails, the team is left in `_is_running=True`, preventing further runs. Exception handling propagates but leaves cleanup incomplete.

<a id="g10-f066"></a>
### OrTerminationCondition raises RuntimeError , while AndTerminationCondition raises TerminatedException

`python/packages/autogen-agentchat/src/autogen_agentchat/base/_termination.py:59` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/base/_termination.py:59` — `OrTerminationCondition` raises `RuntimeError`, while `AndTerminationCondition` raises `TerminatedException`. Inconsistent exception types for the same invariant.

<a id="g10-f067"></a>
### If multiple handoffs are detected, only the first is executed

`python/packages/autogen-agentchat/src/autogen_agentchat/agents/_assistant_agent.py:170-172` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/agents/_assistant_agent.py:170-172` — If multiple handoffs are detected, only the first is executed. Parallel tool calls can trigger unintended handoffs unless parallel tool calls are disabled.

<a id="g10-f068"></a>
### Reset calls agent.on_reset(token) for ChatAgent or team.reset() for Team , but the reset protocols are not identical

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_chat_agent_container.py:79-83` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_chat_agent_container.py:79-83` — Reset calls `agent.on_reset(token)` for `ChatAgent` or `team.reset()` for `Team`, but the reset protocols are not identical. A custom `Team` subclass not implementing `reset()` will fail silently or raise `AttributeError`.

<a id="g10-f069"></a>
### assert result is not None will crash if the inner team yields only events and no TaskResult

`python/packages/autogen-agentchat/src/autogen_agentchat/agents/_society_of_mind_agent.py:206` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/agents/_society_of_mind_agent.py:206` — `assert result is not None` will crash if the inner team yields only events and no `TaskResult`. No explicit guard or timeout; if the team fails to emit `TaskResult`, the orchestrator hangs.

<a id="g10-f070"></a>
### NOTE in code

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_selector_group_chat.py:272` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_selector_group_chat.py:272` — NOTE in code: "we use all participant names to check for mentions, even if the previous speaker is not allowed... because the model may still select the previous speaker." Model hallucination is not fully guarded against in speaker selection.

<a id="g10-f071"></a>
### Output message queue is unbounded ( asyncio.Queue() with no maxsize )

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:129-132` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat.py:129-132` — Output message queue is unbounded (`asyncio.Queue()` with no `maxsize`). High-volume message production (e.g., streaming chunks) could cause memory bloat; no backpressure or shedding policy.

<a id="g10-f072"></a>
### Agent name must be a valid Python identifier ( isidentifier() )

`python/packages/autogen-agentchat/src/autogen_agentchat/agents/_base_chat_agent.py:48-49` @ 027ecf0

`python/packages/autogen-agentchat/src/autogen_agentchat/agents/_base_chat_agent.py:48-49` — Agent name must be a valid Python identifier (`isidentifier()`). Enforced at construction but not reflected in type hints or declarative schema validation, making it easy for config-driven systems to violate silently.

