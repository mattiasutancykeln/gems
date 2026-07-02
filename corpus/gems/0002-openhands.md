# OpenHands

| | |
|---|---|
| Source | https://github.com/OpenHands/OpenHands |
| Repo | https://github.com/OpenHands/OpenHands |
| Kind | - |
| Topics | agent |
| License | none (forbidden) |
| Verdict | promote |
| Findings | 10 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/2 |

## Open threads / weak spots

<a id="g2-f001"></a>
### Context-window error loop detection is a stub

`stuck_detector.py:264-273`

Context-window error loop detection is a stub (`stuck_detector.py:264-273`): pattern 5 of stuck detection is not yet implemented. An agent hitting a context-window error in a loop will not be classified as `STUCK` via this path.

<a id="g2-f002"></a>
### DelegateTool deprecated since v1.16.0, removed in v1.23.0

`impl.py:121-252`

`DelegateTool` deprecated since v1.16.0, removed in v1.23.0 (`impl.py:121-252`): multi-agent delegation is being redesigned; any harness port should not depend on `DelegateTool`'s two-phase pattern as the canonical approach.

<a id="g2-f003"></a>
### Non-native function calling relies on in-context examples with model-specific exclusions

`non_native_fc.py:39-63`

Non-native function calling relies on in-context examples with model-specific exclusions (`non_native_fc.py:39-63`): the exclusion list (`openhands-lm`, `devstral`, `nemotron`) is hard-coded. New models that handle tool prompting differently require manual additions.

<a id="g2-f004"></a>
### Tool argument repair is LLM-provider-specific and brittle

`utils.py:68-174`

Tool argument repair is LLM-provider-specific and brittle (`utils.py:68-174`): `fix_malformed_tool_arguments` has explicit branches for GLM 4.6, kimi, and minimax. Each new broken provider requires a new branch.

<a id="g2-f005"></a>
### Hard context reset loses the entire conversation history

`llm_summarizing_condenser.py:263-306`

Hard context reset loses the entire conversation history (`llm_summarizing_condenser.py:263-306`): the fallback is last-resort and intentionally lossy; if the summarizer LLM also fails (e.g., rate limit), the agent may be unable to recover from a HARD condensation requirement.

<a id="g2-f006"></a>
### RouterLLM.__getattr__ silent fallback to first LLM

`router/base.py:107-111`

`RouterLLM.getattr` silent fallback to first LLM (`router/base.py:107-111`): attribute lookup failures fall through to the first LLM in the routing dict without warning. Misconfigured routing (e.g., wrong model key) fails silently.

<a id="g2-f007"></a>
### Jinja2 template cache is per-process, not distributed

`tmp/oh-sdk/openhands/sdk/context/prompts/prompt.py:64-70`

Jinja2 template cache is per-process, not distributed (`/tmp/oh-sdk/openhands/sdk/context/prompts/prompt.py:64-70`): in horizontally scaled deployments, each process warms its own cache independently. Not a correctness issue but a cold-start latency concern.

<a id="g2-f008"></a>
### ObservationUniquenessProperty registration order is a silent invariant

`observation_uniqueness.py:18-74`

`ObservationUniquenessProperty` registration order is a silent invariant (`observation_uniqueness.py:18-74`): must run before `ToolCallMatchingProperty` to avoid matched-but-duplicate observations causing pairing failures. This ordering is not enforced by type system.

<a id="g2-f009"></a>
### minimum_progress guard fixed at 10%

`llm_summarizing_condenser.py:55-60`

`minimum_progress` guard fixed at 10% (`llm_summarizing_condenser.py:55-60`): no configuration surface. In conversations with slow event growth, this threshold may cause repeated condensation failures before the window is actually full.

<a id="g2-f010"></a>
### streaming deltas not persisted

`event_service.py:576-600`

`streaming deltas not persisted` (`event_service.py:576-600`): streaming delta events are published to pub/sub but never written to `ConversationState.events`. If a subscriber crashes mid-stream, the partial LLM output is unrecoverable from the event log.

