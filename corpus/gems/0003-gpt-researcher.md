# gpt-researcher

| | |
|---|---|
| Source | https://github.com/assafelovic/gpt-researcher |
| Repo | https://github.com/assafelovic/gpt-researcher @ `18d405166948e11b4a0304c0c4ec440bead9e4a5` |
| Kind | - |
| Topics | agent, research |
| License | Apache-2.0 (permissive) |
| Verdict | keep |
| Findings | 20 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/3 |

## Implementation decisions

<a id="g3-f001"></a>
### Two LLM roles are split by cost/capability

`gpt_researcher/config/variables/default.py:4-12` @ 18d4051

a `strategic_llm` (default `o4-mini`) drives planning and sub-query generation, a `smart_llm` (default `gpt-4.1`) writes the report, and a cheap `fast_llm` handles summarization. `gpt_researcher/config/variables/default.py:4-12 `

<a id="g3-f002"></a>
### Standard research is a single fan-out, not an agent loop

`gpt_researcher/skills/researcher.py:329-365` @ 18d4051

plan sub-queries, then `asyncio.gather` over `_process_sub_query` for all sub-queries concurrently, filter empties, join into one context string `gpt_researcher/skills/researcher.py:329-365 `

<a id="g3-f003"></a>
### Planning seeds itself

`gpt_researcher/skills/researcher.py:48-87` @ 18d4051

`plan_research` first runs one live search with `retrievers[0]` and feeds those results back into the sub-query LLM prompt so sub-queries are grounded in current web state `gpt_researcher/skills/researcher.py:48-87 `

<a id="g3-f004"></a>
### Sub-query generation has a 3-step degradation chain

`gpt_researcher/actions/query_processing.py:71-108` @ 18d4051

strategic LLM (no max_tokens) -> strategic LLM with `strategic_token_limit` -> fall back to smart LLM, catching exceptions at each step `gpt_researcher/actions/query_processing.py:71-108 `

<a id="g3-f005"></a>
### Deep research is recursive tree search

`gpt_researcher/skills/deep_research.py:415-522` @ 18d4051

for each SERP query it spawns a fresh nested `GPTResearcher`, extracts learnings, and if `depth>1` recurses with halved breadth (`new_breadth = max(2, breadth // 2)`) and follow-up questions as the next query `gpt_researcher/skills/deep_research.py:415-522 `

<a id="g3-f006"></a>
### Retriever resolution falls back to Tavily for any unknown name rather than erroring:…

`gpt_researcher/actions/retriever.py:156-160` @ 18d4051

Retriever resolution falls back to Tavily for any unknown name rather than erroring: `get_retriever(r) or get_default_retriever()` `gpt_researcher/actions/retriever.py:156-160 `

## Skills, prompts, tools

<a id="g3-f007"></a>
### Abstain guard against fabrication

`gpt_researcher/skills/writer.py:79-88` @ 18d4051

`write_report` builds the context string and, if empty (all retrievers blocked/empty), returns an explicit "could not gather any source material" message instead of writing a confident sourced-looking report `gpt_researcher/skills/writer.py:79-88 `

<a id="g3-f008"></a>
### Report prompt hard-requires provenance

`gpt_researcher/prompts.py:273-311` @ 18d4051

for web reports it mandates in-text markdown-hyperlink citations at sentence/paragraph end plus a deduped reference list in the configured format `gpt_researcher/prompts.py:273-311 `

<a id="g3-f009"></a>
### Optional LLM source curation ranks scraped content by relevance/credibility/currency/objectivity, explicitly prioritizing quantitative data

`gpt_researcher/skills/curator.py:58-96` @ 18d4051

Optional LLM source curation ranks scraped content by relevance/credibility/currency/objectivity, explicitly prioritizing quantitative data; on any parse error it returns the unranked sources unchanged (fail-open) `gpt_researcher/skills/curator.py:58-96 ` and the prompt `gpt_researcher/prompts.py:315-332 `

<a id="g3-f010"></a>
### Deep-research query/learning prompts demand strict JSON with an exact schema (…

`gpt_researcher/skills/deep_research.py:259-289` @ 18d4051

Deep-research query/learning prompts demand strict JSON with an exact schema (`{"query","researchGoal"}`, `{"insight","sourceUrl"}`) and ask the model to attach a source URL per learning `gpt_researcher/skills/deep_research.py:259-289,344-374 `

<a id="g3-f011"></a>
### MCP tool selection uses the strategic LLM (temp 0.0) to pick <=N relevant tools from tool…

`gpt_researcher/mcp/tool_selector.py:35-127` @ 18d4051

MCP tool selection uses the strategic LLM (temp 0.0) to pick <=N relevant tools from tool name+description, with a pattern-matching fallback scoring names/descriptions against verbs like search/get/fetch when the LLM output can't be parsed `gpt_researcher/mcp/tool_selector.py:35-127,163-203 `

## Patterns worth porting

<a id="g3-f012"></a>
### Cost-avoiding compression fast-path

`gpt_researcher/context/compression.py:157-171` @ 18d4051

if total scraped chars < `COMPRESSION_THRESHOLD` (8000) and doc count <= max_results, skip the embeddings/splitter pipeline entirely and return docs directly `gpt_researcher/context/compression.py:157-171 `

<a id="g3-f013"></a>
### Robust JSON parsing for LLM output

`gpt_researcher/skills/deep_research.py:20-116` @ 18d4051

`json_repair` over multiple regex-extracted candidates (fenced block, bare array, bare object), then a line-oriented `Query:`/`Goal:`/`Learning:` regex fallback so malformed responses still yield structured data `gpt_researcher/skills/deep_research.py:20-116 `

<a id="g3-f014"></a>
### Recency-preserving context budget

`gpt_researcher/skills/deep_research.py:213-231` @ 18d4051

`trim_context_to_word_limit` iterates the context list in reverse, keeping newest items under a 25k-word cap and truncating the single item if nothing fits yet `gpt_researcher/skills/deep_research.py:213-231 `

<a id="g3-f015"></a>
### Skip re-scraping content retrievers already return in full

`gpt_researcher/skills/researcher.py:776-834` @ 18d4051

results with `raw_content` >100 chars are treated as prefetched and passed through, only bare URLs go to the scraper `gpt_researcher/skills/researcher.py:776-834 `

## Open threads / weak spots

<a id="g3-f016"></a>
### Config/threshold drift

`gpt_researcher/context/compression.py:119` @ 18d4051

`ContextCompressor` reads `SIMILARITY_THRESHOLD` from the env with a hardcoded fallback of `0.35`, but the config default is `0.42` and is never pushed into the env, so the config value is silently ignored unless the env var is set `gpt_researcher/context/compression.py:119 ` vs `gpt_researcher/config/variables/default.py:6 `

<a id="g3-f017"></a>
### No verification stage

`gpt_researcher/skills/deep_research.py:344-374` @ 18d4051

learnings get a `sourceUrl` attached but nothing checks the claim is actually supported by the cited source; citations are trusted as emitted by the extraction LLM `gpt_researcher/skills/deep_research.py:344-374 `

<a id="g3-f018"></a>
### Deep research dedups learnings with list(set(...)) , discarding order (and any…

`gpt_researcher/skills/deep_research.py:533` @ 18d4051

Deep research dedups learnings with `list(set(...))`, discarding order (and any deterministic report structure) for the sake of uniqueness `gpt_researcher/skills/deep_research.py:533 `

<a id="g3-f019"></a>
### Curation is off by default ( CURATE_SOURCES: False ), so out-of-the-box the report LLM…

`gpt_researcher/config/variables/default.py:14` @ 18d4051

Curation is off by default (`CURATE_SOURCES: False`), so out-of-the-box the report LLM receives all compressed context unranked `gpt_researcher/config/variables/default.py:14 `

<a id="g3-f020"></a>
### Nested deep-research researchers each construct a full GPTResearcher per SERP query with…

`gpt_researcher/skills/deep_research.py:413-435` @ 18d4051

Nested deep-research researchers each construct a full `GPTResearcher` per SERP query with its own retrievers/scraper/LLM calls, so cost scales with breadth x depth and is only bounded by an `asyncio.Semaphore(concurrency_limit)` `gpt_researcher/skills/deep_research.py:413-435 `

