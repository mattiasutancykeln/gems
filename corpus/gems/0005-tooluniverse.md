# ToolUniverse

| | |
|---|---|
| Source | https://github.com/mims-harvard/ToolUniverse |
| Repo | https://github.com/mims-harvard/ToolUniverse @ `be6a89a3b8` |
| Kind | - |
| Topics | agent, infra |
| License | Apache-2.0 (permissive) |
| Verdict | keep |
| Findings | 5 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/5 |

## Open threads / weak spots

<a id="g5-f001"></a>
### TOOLUNIVERSE_LLM_CONFIG_MODE is a global env var

`TOOLUNIVERSE_LLM_CONFIG_MODE` is a global env var. All `AgenticTool` instances in a process share the same config mode. No per-tool or per-registry override. A registry that mixes tools from different operators cannot apply different config modes per tool.

<a id="g5-f002"></a>
### Fallback chain swallows provider-specific errors silently

The fallback triggers on any failure, not just rate-limit/auth errors. A transient network error would silently cascade through all three providers before returning failure. No distinction between "recoverable with backoff" and "permanent API key error".

<a id="g5-f003"></a>
### SQLite WAL mode not mentioned

For concurrent async writes + reads, SQLite without WAL mode can produce lock contention. If `PersistentCache` doesn't enable WAL, high-concurrency tool workloads may see SQLite lock timeouts.

<a id="g5-f004"></a>
### LRUCache eviction is count-based, not size-based

`LRUCache` eviction is count-based, not size-based. `max_size` limits the number of entries, not total memory. Large tool results (genomic sequences, protein structures) can exhaust RAM even with a small entry count.

<a id="g5-f005"></a>
### SingleFlight implementation not shown beyond the class stub

`SingleFlight` implementation not shown beyond the class stub. The referenced implementation must handle: what happens if the executing coroutine raises? Do waiters get the exception or a cache miss? This edge case determines whether `SingleFlight` is safe to use on fallible operations.

