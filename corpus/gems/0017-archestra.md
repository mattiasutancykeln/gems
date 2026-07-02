# archestra

| | |
|---|---|
| Source | https://github.com/archestra-ai/archestra |
| Repo | https://github.com/archestra-ai/archestra @ `0773240758a392152e5bccb538ccfb6762026b52` |
| Kind | - |
| Topics | - |
| License | none (forbidden) |
| Verdict | - |
| Findings | 18 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/17 |

## Implementation decisions

<a id="g17-f001"></a>
### Dual-LLM splits trust into two seeded built-in agents

`platform/backend/src/agents/subagents/dual-llm.ts:80-158` @ 0773240

a privileged "main" agent that never sees raw tool output and a "quarantine" agent that sees the untrusted result but can only emit an option index. The main agent drives a bounded multiple-choice Q&A loop, then writes a summary from the transcript alone. `platform/backend/src/agents/subagents/dual-llm.ts:80-158 `

<a id="g17-f002"></a>
### The quarantine agent's answer is coerced to a valid option index, defaulting to the last (catch-all) option on any ou…

`platform/backend/src/agents/subagents/dual-llm.ts:160-185` @ 0773240

The quarantine agent's answer is coerced to a valid option index, defaulting to the last (catch-all) option on any out-of-range/non-numeric response, so a malformed/adversarial reply cannot inject free text. `platform/backend/src/agents/subagents/dual-llm.ts:160-185 `

<a id="g17-f003"></a>
### Both dual-LLM agents run at temperature

`platform/backend/src/agents/subagents/dual-llm.ts:171-224` @ 0773240

Both dual-LLM agents run at `temperature: 0` and the quarantine side uses `generateObject` with a strict `z.object({answer: z.number().int()})` schema — untrusted output is squeezed through a single validated integer channel. `platform/backend/src/agents/subagents/dual-llm.ts:171-224 `

<a id="g17-f004"></a>
### Trust default is deny

`platform/backend/src/models/trusted-data-policy.ts:338-423` @ 0773240

under the "restrictive" global policy, tool output with no matching trusted-data policy is treated as untrusted (allowlist model); "permissive" is an explicit YOLO opt-in that trusts everything and skips evaluation. `platform/backend/src/models/trusted-data-policy.ts:338-423 `

<a id="g17-f005"></a>
### Trust is a per-tool-result verdict computed by re-scanning the whole message history's tool calls before each new too…

`platform/backend/src/guardrails/trusted-data.ts:86-275` @ 0773240

Trust is a per-tool-result verdict computed by re-scanning the whole message history's tool calls before each new tool call; a single untrusted/blocked result flips `contextIsTrusted=false` for the turn, and the first offending result is recorded as a stable `unsafeContextBoundary` for the UI. `platform/backend/src/guardrails/trusted-data.ts:86-275 `

## Skills, prompts, tools

<a id="g17-f006"></a>
### The privileged-agent system prompt hard-codes the information boundary ("You NEVER see raw tool output"), the exact Q…

`platform/shared/built-in-agents.ts:117-151` @ 0773240

The privileged-agent system prompt hard-codes the information boundary ("You NEVER see raw tool output"), the exact `QUESTION:/OPTIONS:` output grammar with a numbered option list, and a summary mode barred from inventing details or mentioning the protocol. `platform/shared/built-in-agents.ts:117-151 `

<a id="g17-f007"></a>
### The quarantine system prompt forbids quoting/summarizing raw data outside the chosen index, tells it to ignore embedd…

`platform/shared/built-in-agents.ts:153-171` @ 0773240

The quarantine system prompt forbids quoting/summarizing raw data outside the chosen index, tells it to ignore embedded instructions, and constrains output to `{"answer": <integer>}` — the anti-prompt-injection contract lives in the prompt, enforced by the schema. `platform/shared/built-in-agents.ts:153-171 `

<a id="g17-f008"></a>
### The prompt authoring policy that configures per-tool guardrails states the two goals explicitly: prevent internal->ext…

`platform/shared/built-in-agents.ts:33-52` @ 0773240

The prompt authoring policy that configures per-tool guardrails states the two goals explicitly: prevent internal->external data exfiltration, and route open-internet/third-party results through the Dual-LLM so injected instructions never reach the privileged model verbatim. `platform/shared/built-in-agents.ts:33-52 `

<a id="g17-f009"></a>
### Tool-result text is stripped to a plain content summary before the model sees it ( toModelOutput ), dropping structur…

`platform/backend/src/clients/chat-tool-builder.ts:291-294` @ 0773240

Tool-result text is stripped to a plain `content` summary before the model sees it (`toModelOutput`), dropping `structuredContent`, `rawContent`, and `_meta` so the LLM only receives the sanitized channel (cited "SEP-1865"). `platform/backend/src/clients/chat-tool-builder.ts:291-294 `

<a id="g17-f010"></a>
### Recovery messages steer a model that calls a hallucinated/unassigned tool back through the intended search_tools -> r…

`platform/backend/src/archestra-mcp-server/tool-recovery-messages.ts:7-33` @ 0773240

Recovery messages steer a model that calls a hallucinated/unassigned tool back through the intended `search_tools`->`run_tool` discovery path, using branded tool names so the guidance matches what the model actually sees. `platform/backend/src/archestra-mcp-server/tool-recovery-messages.ts:7-33 `

## Patterns worth porting

<a id="g17-f011"></a>
### Trust-conditioned tool-invocation policy

`platform/backend/src/models/tool-invocation-policy.ts:526-616` @ 0773240

a `block_when_context_is_untrusted` action allows a tool when context is trusted and refuses it when untrusted — this is the deterministic "lethal trifecta" cut (untrusted input + exfiltration-capable tool = block), distinct from unconditional `block_always`. `platform/backend/src/models/tool-invocation-policy.ts:526-616 `

<a id="g17-f012"></a>
### Trust does not auto-cross delegation boundaries

`platform/backend/src/archestra-mcp-server/delegation.ts:162-181` @ 0773240

the parent's `contextIsTrusted` is passed down as `parentContextIsTrusted`, but the child re-evaluates its own tool results independently rather than inheriting a blanket trust verdict. `platform/backend/src/archestra-mcp-server/delegation.ts:162-181 `

<a id="g17-f013"></a>
### Built-in tools bypass policy, but a named allowlist of injection-prone built-ins (e.g. query_knowledge_sources ) is d…

`platform/backend/src/archestra-mcp-server/branding.ts:83-97` @ 0773240

Built-in tools bypass policy, but a named allowlist of injection-prone built-ins (e.g. `query_knowledge_sources`) is deliberately excluded from bypass and evaluated like external output because knowledge-base content can carry prompt injection. `platform/backend/src/archestra-mcp-server/branding.ts:83-97 `

<a id="g17-f014"></a>
### Sandbox egress is a pure, unit-testable policy builder that emits provider-specific K8s NetworkPolicy objects (Cilium…

`platform/backend/src/k8s/dagger-environment-runtime/network-policy.ts:63-134` @ 0773240

Sandbox egress is a pure, unit-testable policy builder that emits provider-specific K8s NetworkPolicy objects (Cilium/GKE-FQDN/AWS/vanilla) from an `EffectiveNetworkPolicy`; `unrestricted` is an explicit allow-all with no metadata/RFC1918 floor, making the confinement decision auditable in isolation. `platform/backend/src/k8s/dagger-environment-runtime/network-policy.ts:63-134 `

<a id="g17-f015"></a>
### Internal-eval bench boots a fresh migrated backend + isolated DB per environment, seeds a pinned skill+MCP+agent surf…

`archestra-bench/README.md:1-40` @ 0773240

Internal-eval bench boots a fresh migrated backend + isolated DB per environment, seeds a pinned skill+MCP+agent surface, drives multi-stage conversations, and grades submissions out of band — permanent regression protection over real workflows rather than a public leaderboard. `archestra-bench/README.md:1-40 `

## Open threads / weak spots

<a id="g17-f016"></a>
### The dual-LLM loop is a fixed 5-round budget ( maxRounds: 5 ) with a temperature-0 free-text QUESTION:/OPTIONS: parse;…

`platform/backend/src/agents/subagents/dual-llm.ts:98-125` @ 0773240

The dual-LLM loop is a fixed 5-round budget (`maxRounds: 5`) with a temperature-0 free-text `QUESTION:/OPTIONS:` parse; a malformed question format silently breaks the loop early, so summary quality degrades quietly rather than erroring. `platform/backend/src/agents/subagents/dual-llm.ts:98-125 ` and `platform/backend/src/database/seed.ts:108-111 `

<a id="g17-f017"></a>
### The quarantine channel is one integer per round, but the option strings are authored by the privileged main agent fro…

`platform/backend/src/agents/subagents/dual-llm.ts:127-142` @ 0773240

The quarantine channel is one integer per round, but the option strings are authored by the privileged main agent from the user request alone; an adversary controlling tool output can still influence which pre-authored option best matches, so leakage bandwidth per round is bounded but nonzero (log2(#options) bits). `platform/backend/src/agents/subagents/dual-llm.ts:127-142 `

<a id="g17-f018"></a>
### evaluate / evaluateBulk fall back to "untrusted" when a tool has no policy row, but the whole guardrail is skipped en…

`platform/backend/src/models/trusted-data-policy.ts:412-423` @ 0773240

`evaluate`/`evaluateBulk` fall back to "untrusted" when a tool has no policy row, but the whole guardrail is skipped entirely under `permissive` global policy — a single org-level toggle disables all prompt-injection and exfiltration protection at once. `platform/backend/src/models/trusted-data-policy.ts:412-423 `

