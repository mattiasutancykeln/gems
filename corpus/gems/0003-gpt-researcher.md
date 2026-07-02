# gpt-researcher

| | |
|---|---|
| Source | https://github.com/assafelovic/gpt-researcher |
| Repo | https://github.com/assafelovic/gpt-researcher @ `92bfc0388c` |
| Kind | - |
| Topics | - |
| License | Apache-2.0 (permissive) |
| Verdict | keep |
| Findings | 10 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/3 |

## Open threads / weak spots

<a id="g3-f001"></a>
### COMPRESSION_THRESHOLD and MAX_CONTEXT_WORDS have no BaseConfig surface

`COMPRESSION_THRESHOLD` and `MAX_CONTEXT_WORDS` have no `BaseConfig` surface. Both are hard-coded constants (`8000` chars and `25000` words). `COMPRESSION_THRESHOLD` is env-readable, but neither appears in the TypedDict that documents all configuration. Callers have no programmatic way to tune them.

<a id="g3-f002"></a>
### GlobalRateLimiter last-write-wins race

`GlobalRateLimiter` last-write-wins race. Each `WorkerPool.init` calls `global_limiter.configure(rate_limit_delay)`. Multiple concurrent `GPTResearcher` instances that use different delays silently overwrite each other's setting. There's no lock around `configure()`.

<a id="g3-f003"></a>
### visited_urls.clear() in ResearchConductor.conduct_research clears the shared parent set

`visited_urls.clear()` in `ResearchConductor.conduct_research` clears the shared parent set. Since deep-research nested researchers receive `visited_urls=self.visited_urls` (the parent's live set), if a nested researcher's `ResearchConductor` ever calls `conduct_research()` directly, it would wipe the parent's tracking.

<a id="g3-f004"></a>
### Q&A plan generation is vestigial dead weight

`generate_research_plan` returns follow-up questions that are immediately answered with a fixed string. Each invocation costs one strategic LLM call for no benefit. Should either be removed or wired to a real user-input surface.

<a id="g3-f005"></a>
### print() left in SourceCurator.curate_sources

`print()` left in `SourceCurator.curate_sources`. Two bare `print(f"\n\nCurating ...")` and `print(f"\n\nFinal Curated sources ...")` calls remain in production code (`curator.py`). Not behind `self.researcher.verbose`.

<a id="g3-f006"></a>
### _mcp_results_cache is not invalidated between research sessions

`_mcp_results_cache` is not invalidated between research sessions. The cache on `ResearchConductor` persists for the lifetime of the researcher instance. If the same instance is reused for multiple queries (unlikely by design but possible via `conduct_research()` re-invocation), stale MCP results from the first query contaminate later ones.

<a id="g3-f007"></a>
### Chunk size 1000 / overlap 100 is hardwired

`ContextCompressor` and `WrittenContentCompressor` both use the same `RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)`. No config exposure. Different document types (long papers vs. short news) would benefit from different chunk sizes.

<a id="g3-f008"></a>
### asyncio.Lock in GlobalRateLimiter is lazily created without an event-loop guard

`asyncio.Lock` in `GlobalRateLimiter` is lazily created without an event-loop guard. The first caller inside an event loop wins. If two coroutines race to create the lock simultaneously (unlikely but possible at startup), both would pass the `if cls._lock is None` check before either assignment completes — no `asyncio.Lock` guards the lock creation itself.

<a id="g3-f009"></a>
### Deep research breadth decay is fixed at breadth // 2

Deep research breadth decay is fixed at `breadth // 2`. No config surface for breadth reduction rate. Depth-3 with breadth-8 degenerates to breadth-2 at the leaves regardless of query complexity.

<a id="g3-f010"></a>
### _current_step is a plain instance string, not a context variable

`_current_step` is a plain instance string, not a context variable. If `conduct_research()` and `write_report()` overlap (e.g., in a streaming setup where the caller begins writing before research fully completes), step attribution becomes incorrect. An `asyncio.contextvars.ContextVar` would be safer.

