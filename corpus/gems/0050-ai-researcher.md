# AI-Researcher

| | |
|---|---|
| Source | https://github.com/HKUDS/AI-Researcher |
| Repo | https://github.com/HKUDS/AI-Researcher @ `f9a6f8480860c193afff600eeffe3defcee8a978` |
| Kind | repo |
| Topics | agent, research |
| License | none (forbidden) |
| Verdict | - |
| Findings | 32 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/50 |

## Implementation decisions

<a id="g50-f001"></a>
### Hidden dependency injection by signature rewrite

`research_agent/inno/tools/file_surfer_tool.py:16-29` @ f9a6f84

`research_agent/inno/tools/file_surfer_tool.py:16-29`, `research_agent/inno/tools/web_tools.py:44-57`, `research_agent/inno/agents/inno_agent/exp_analyser.py:82-97` — Hidden dependency injection by signature rewrite. A `with_env` (and `with_two_envs`) decorator binds live stateful deps (markdown browser, Docker sandbox) into a tool at registration and then *overwrites the function's `signature`* to drop the `env` param, so the LLM never sees or supplies it. A tool is only bound when it actually declares `env` (`"env" in inspect.signature(tool).parameters`), letting one flat tool list mix env-bound and env-free callables with no per-tool bookkeeping.

<a id="g50-f002"></a>
### tool_choice="required" + parallel_tool_calls=False on execution agents

`research_agent/inno/agents/inno_agent/ml_agent.py:99-100` @ f9a6f84

`research_agent/inno/agents/inno_agent/ml_agent.py:99-100`, `research_agent/inno/agents/inno_agent/exp_analyser.py:99-106` — `tool_choice="required"` + `parallel_tool_calls=False` on execution agents. Forcing exactly one serial tool call per turn stops the model narrating instead of acting and avoids concurrent-edit races in the shared Docker workspace. Recurs across nearly every agent; idea generation is the deliberate exception (below).

<a id="g50-f003"></a>
### Phase-conditioned tool policy

`research_agent/inno/agents/inno_agent/idea_agent.py:155` @ f9a6f84

`research_agent/inno/agents/inno_agent/idea_agent.py:155` vs `research_agent/inno/agents/inno_agent/survey_agent.py:77` — Phase-conditioned tool policy. Idea generation runs `tool_choice="auto"` (model may reason without calling a tool) while survey/plan/implement/analyse phases force `"required"`. Creative divergence is left unconstrained; execution is made deterministic.

<a id="g50-f004"></a>
### Head+tail token truncation with spill-to-disk

`research_agent/inno/tools/tool_utils.py:6-23` @ f9a6f84

`research_agent/inno/tools/tool_utils.py:6-23`, `research_agent/inno/tools/web_tools.py:329-346` — Head+tail token truncation with spill-to-disk. Long output keeps the first `max_tokens//2` and the trailing remainder joined by `\n...\n` (preserving both the command and its final result/error), side-saves the full text to a timestamped file, and hands the agent a recovery pointer — with graceful degradation if the write fails.

<a id="g50-f005"></a>
### Content-hash cache key for the vector index

`research_agent/inno/tools/rag_code.py:18-25` @ f9a6f84

`research_agent/inno/tools/rag_code.py:18-25`, `research_agent/inno/tools/tool_retriever.py:19-23` — Content-hash cache key for the vector index. The embedding collection name is suffixed with the MD5 of the source (zipped code tree / `tool_docs.csv`), and re-embedding only runs when `count()==0`. Any content change yields a new collection, so stale embeddings are never reused and unchanged content short-circuits the expensive embed step for free.

<a id="g50-f006"></a>
### Reference-repo selection as explicit prompt heuristics

`research_agent/inno/agents/inno_agent/prepare_agent.py:39-48` @ f9a6f84

`research_agent/inno/agents/inno_agent/prepare_agent.py:39-48` — Reference-repo selection as explicit prompt heuristics: more stars, more recent ("too old repositories are NOT recommended"), richer README, Python/PyTorch, local-runnable over Docker — plus a min/max tension ("at least 5" but "as less as possible") to bound downstream context.

<a id="g50-f007"></a>
### base64 chunked file writes into the container

`research_agent/inno/tools/terminal_tools.py:152-174` @ f9a6f84

`research_agent/inno/tools/terminal_tools.py:152-174` — base64 chunked file writes into the container: content is base64-encoded and appended via `echo … | base64 -d >> file` in ≤100k-char chunks, sidestepping shell quoting/escaping and arg-length limits across the shell boundary.

<a id="g50-f008"></a>
### run_python prefers python -m dotted.path with PYTHONPATH set

`research_agent/inno/tools/terminal_tools.py:338-345` @ f9a6f84

`research_agent/inno/tools/terminal_tools.py:338-345` — `run_python` prefers `python -m dotted.path` with `PYTHONPATH` set (dotted path computed relative to cwd), falling back to `python <path>`, so intra-package imports work without the model managing `sys.path`.

## Skills, prompts, tools

<a id="g50-f009"></a>
### Terminal states modeled as ordinary tools

`research_agent/inno/tools/inner.py:3-24` @ f9a6f84

`research_agent/inno/tools/inner.py:3-24`, `research_agent/inno/agents/inno_agent/ml_agent.py:9-25` — Terminal states modeled as ordinary tools. `case_resolved(...)` and `case_not_resolved(failure_reason)` are callable tools, not special control flow: the agent must explicitly call success or give-up. `case_resolved` requires the final answer wrapped in `<solution>…</solution>` for machine-parseable extraction; `case_not_resolved` is gated with `[IMPORTANT] … unless all of you have tried your best`, forcing a discrete outcome plus a reason on failure.

<a id="g50-f010"></a>
### Atomic-definition survey with typed handoff notes

`research_agent/inno/agents/inno_agent/survey_agent.py:171-201` @ f9a6f84

`research_agent/inno/agents/inno_agent/survey_agent.py:171-201, 215-286, 144-157` — Atomic-definition survey with typed handoff notes. The prompt forces decomposing an idea into single, math-grounded, paper-traceable concepts before research ("do not skip or combine"), then accretes each definition dict across three hops (`transfer_to_paper_survey_agent -> transfer_to_code_survey_agent -> transfer_back_to_survey_agent`) whose tool signatures enforce the schema. `case_resolved` renders all notes into a fixed markdown template — final compilation is code-formatted, not model-formatted.

<a id="g50-f011"></a>
### Structured planning via required-argument tools

`research_agent/inno/agents/inno_agent/plan_agent.py:8-27` @ f9a6f84

`research_agent/inno/agents/inno_agent/plan_agent.py:8-27`, `research_agent/inno/tools/inno_tools/planning_tools.py:7-119` — Structured planning via required-argument tools. Four typed tools (`plan_dataset`/`plan_model`/`plan_training`/`plan_testing`) force the model to fill every named research slot; each returns a `Result` that echoes the plan JSON and stashes it in `context_variables`, and `case_resolved` merges them so no slot is skipped.

<a id="g50-f012"></a>
### Bounded judge verdict + wired review loop

`research_agent/inno/agents/inno_agent/judge_agent.py:25-43` @ f9a6f84

`research_agent/inno/agents/inno_agent/judge_agent.py:25-43, 78-132` — Bounded judge verdict + wired review loop. The judge returns `case_resolved(fully_correct: bool, suggestion: Dict[str,str])` where keys are atomic idea points and values are per-point fixes; the judge<->reviewer loop is wired at construction (`code_review_agent.functions.append(transfer_to_judge_agent)`).

<a id="g50-f013"></a>
### Observation-as-paginated-browser

`research_agent/inno/tools/file_surfer_tool.py:31-54` @ f9a6f84

`research_agent/inno/tools/file_surfer_tool.py:31-54`, `research_agent/inno/tools/terminal_tools.py:20-100` — Observation-as-paginated-browser. One `RequestsMarkdownBrowser` viewport renders both files and terminal output into a compact state banner (Address, Title, "you previously visited this page N seconds ago" recency note, `Showing page X of Y`), with pagination hints appended only when output spans multiple pages (naming `terminal_page_to`, and telling the model to skip meaningless middle pages like progress bars).

<a id="g50-f014"></a>
### Uniform, error-forward browser action space

`research_agent/inno/tools/web_tools.py:96-128` @ f9a6f84

`research_agent/inno/tools/web_tools.py:96-128, 266-312` — Uniform, error-forward browser action space. Observations carry an error prefix, URL, and flattened accessibility tree plus an in-band `click("12")` few-shot; `get_error_prefix` prepends "IMPORTANT! Last action is incorrect… Think again" with the failed action + error. `visit_url` disambiguates by input shape (scheme -> direct; contains space -> Google query; else prepend `https://`), tolerating loose model output.

<a id="g50-f015"></a>
### Self-documenting tool-authoring contract

`research_agent/inno/tools/dummy_tool.py:5-38` @ f9a6f84

`research_agent/inno/tools/dummy_tool.py:5-38` — Self-documenting tool-authoring contract: a registered dummy tool whose body is a docstring template teaching the three legal return shapes (`str` / `Agent` handoff / `Result` with `context_variables`) plus the "save long output to a file" rule.

<a id="g50-f016"></a>
### get_api_doc retrieve-then-rerank over a tool catalog

`research_agent/inno/tools/tool_retriever.py:22-38` @ f9a6f84

`research_agent/inno/tools/tool_retriever.py:22-38` — `get_api_doc` retrieve-then-rerank over a tool catalog: embed -> top-20 -> LLM rerank -> single best doc formatted as API Name/Description/Details/Key/Platform, falling back to the raw top-20 on rerank failure.

<a id="g50-f017"></a>
### Multimodal blind-spot guard

`research_agent/inno/agents/inno_agent/exp_analyser.py:49-72` @ f9a6f84

`research_agent/inno/agents/inno_agent/exp_analyser.py:49-72`, `research_agent/inno/tools/file_surfer_tool.py:204-223` — Multimodal blind-spot guard. The analyser prompt catalogs tools grouped by capability and routes generated images/plots through a `visualizer` ("use this tool to SEE the experimental results") before writing analysis; the page-QA prompt carries a `mathnote` forcing expansion of custom `\newcommand` LaTeX macros to built-ins so formulas are self-contained.

<a id="g50-f018"></a>
### MATH_COT_PROMPT

`benchmark/process/dataset_candidate/reasoning/math_reasoning/prompts.py:1-23` @ f9a6f84

`benchmark/process/dataset_candidate/reasoning/math_reasoning/prompts.py:1-23` — `MATH_COT_PROMPT` is a 4-shot CoT bank, each shot ending with the parseable sentinel "Final Answer: The final answer is $X$. I hope it is correct."

## Patterns worth porting

<a id="g50-f019"></a>
### Handoff-as-return orchestration (no central loop)

`research_agent/inno/agents/inno_agent/survey_agent.py:159-290` @ f9a6f84

`research_agent/inno/agents/inno_agent/survey_agent.py:159-290` — Handoff-as-return orchestration (no central loop). `transfer_*` tools return `Result(agent=…)` that reroutes the conversation and threads shared `context_variables`; each agent picks the next by which tool it calls, so control flow lives in the tool set, not a coordinator.

<a id="g50-f020"></a>
### Plugin auto-discovery of agents

`research_agent/inno/agents/__init__.py:29-62` @ f9a6f84

`research_agent/inno/agents/init.py:29-62` — Plugin auto-discovery of agents: `os.walk` imports every non-dunder `.py` (try/except, warn-only), each module self-registers via decorator, then `globals().update(registry.agents)` + dynamic `all`. Add an agent by dropping a file.

<a id="g50-f021"></a>
### Two-stage retrieve-then-rerank RAG with a swappable backend

`research_agent/inno/tools/rag_code.py:16-28` @ f9a6f84

`research_agent/inno/tools/rag_code.py:16-28`, `research_agent/inno/tools/rag_code_tree.py:17-28`, `research_agent/inno/tools/tool_retriever.py:16-26` — Two-stage retrieve-then-rerank RAG with a swappable backend. Cheap embedding recall (ChromaDB / `text-embedding-3-small`) -> expensive LLM rerank (`gpt-4o`), content-hash-keyed cache, graceful degradation. The flat-chunk and tree-sitter-AST variants share one skeleton and one tool contract; tree-sitter fetches fewer candidates (`n_results=10` vs `20`) because its chunks are already whole functions/classes, and a `DummyReranker` lets the second stage be toggled off without changing call sites.

<a id="g50-f022"></a>
### Staged-JSON decomposition of one hard judgment

`create_innovation_graph_instruction_step4.md:1-7` @ f9a6f84

`benchmark_collection/prompts/create_innovation_graph_instruction_step1.md … _step5.md` (+ `_overall.md`) — Staged-JSON decomposition of one hard judgment. "Which references are most influential" is split into five stages each emitting a strict JSON contract that feeds the next (frequency/location map -> influence analysis -> evidence collection with required `quotes` -> weighted impact scoring -> ranked selection). Impact scoring uses explicit fixed weights (frequency 30% / location 25% / depth 25% / direct influence 20%) with a per-dimension `breakdown` object, making the composite score auditable; every stage keys objects on `"reference": "<exact paper title>"` as a stable join key so stages merge by title without positional coupling (`create_innovation_graph_instruction_step4.md:1-7`, `_step3.md:7-18`).

<a id="g50-f023"></a>
### Anonymized paper->task decomposition for leakage-free evals

`benchmark_collection/prompts/anonymize_target_paper_instruction.md:1-17` @ f9a6f84

`benchmark_collection/prompts/anonymize_target_paper_instruction.md:1-17`, `benchmark_collection/prompts/anonymize_target_paper_extract_model_name.md:1-18`, `benchmark_collection/prompts/create_innovation_task_instruction_task1.md`, `…_task2.md` — Anonymized paper->task decomposition for leakage-free evals. Both task generators forbid naming the proposed model or its module names so a downstream agent must re-derive the method; `task1` ("reproduce the method", 6-point schema) and `task2` ("motivation only") split *how to solve* from *what to solve* into two independently anonymized artifacts. Supporting prompts do bounded-output NER-via-LLM (extract main model name; sentinel `"NO MODEL NAME FOUND"`) and cheap-skip anonymization (sentinel `"NO NEED TO PROCESS"` for unchanged paragraphs).

<a id="g50-f024"></a>
### Scholar/PDF resolution recipe

`research_agent/inno/tools/inno_tools/web_tools.py:368-525` @ f9a6f84

`research_agent/inno/tools/inno_tools/web_tools.py:368-525, 526-566, 606-629` — Scholar/PDF resolution recipe: parse raw CDP DOM snapshots (parallel `nodeName/parentIndex/attributes/strings` arrays) back into `{title, authors, pdf_link, venue, citation_count, year}`; map publisher landing pages (Springer/ACM/IEEE/MDPI/Nature/Science) to institutional-proxy PDF URLs via per-publisher DOI surgery; enforce a run-wide `date_limit` by injecting `as_yhi=<year>` from `context_variables` into every query (policy via context, not tool args).

<a id="g50-f025"></a>
### try/except tool envelope

`research_agent/inno/tools/web_tools.py:165-176` @ f9a6f84

Uniform try/except tool envelope (`research_agent/inno/tools/web_tools.py:165-176`, `research_agent/inno/tools/terminal_tools.py:143-150`) — every tool returns `f"Error in \`tool\`: {e}"` instead of raising, so the agent loop always receives a usable observation.

## Open threads / weak spots

<a id="g50-f026"></a>
### get_idea_agent returns an Agent misnamed "Paper Survey Agent" and duplicates the entire survey pipeline verbatim from survey_agent.py

`research_agent/inno/agents/inno_agent/idea_agent.py:150-157` @ f9a6f84

`research_agent/inno/agents/inno_agent/idea_agent.py:150-157, 237-368` — `get_idea_agent` returns an Agent misnamed `"Paper Survey Agent"` and duplicates the entire survey pipeline verbatim from `survey_agent.py`; two copies that can drift. Large dead prompt strings also sit as bare module-scope expressions (`idea_agent.py:371-429`, `plan_agent.py:107-118`).

<a id="g50-f027"></a>
### academic-search / file-surfer / web-search tool wiring is commented out, so some agents…

`research_agent/inno/agents/inno_agent/judge_agent.py:83-87` @ f9a6f84

`research_agent/inno/agents/inno_agent/judge_agent.py:83-87`, `research_agent/inno/agents/inno_agent/idea_agent.py:141-148` — academic-search / file-surfer / web-search tool wiring is commented out, so some agents can't reach capabilities their prompts imply.

<a id="g50-f028"></a>
### json.dumps called but json is imported only under __main__ ( NameError as a tool)

`research_agent/inno/tools/inno_tools/web_tools.py:603` @ f9a6f84

`research_agent/inno/tools/inno_tools/web_tools.py:603, 562-566, 666-679` — `json.dumps` called but `json` is imported only under `main` (`NameError` as a tool); `result_list` is mutated with `.remove` while iterating and then asserted non-empty (one unresolved publisher kills the whole search via `AssertionError`); a local proxy `127.0.0.1:7890`, `verify=False`, and HKU eproxy hostnames are hardcoded in `download_from_pdf_link`.

<a id="g50-f029"></a>
### truncate_by_tokens imports inno.tools.files while the package root elsewhere is research_agent.inno.* (likely ModuleNotFoundError )

`research_agent/inno/tools/web_tools.py:329-330` @ f9a6f84

`research_agent/inno/tools/web_tools.py:329-330` — `truncate_by_tokens` imports `inno.tools.files` while the package root elsewhere is `research_agent.inno.*` (likely `ModuleNotFoundError`); `print_stream` is defined twice in `terminal_tools.py:260-261, 279-281` (second is dead).

<a id="g50-f030"></a>
### every call re-zips and re-hashes the whole folder to compute the collection id *before* the warm-index count() check, so compression runs on the hot path even when the index is warm

`research_agent/inno/tools/rag_code.py:19-24` @ f9a6f84

`research_agent/inno/tools/rag_code.py:19-24` — every call re-zips and re-hashes the whole folder to compute the collection id *before* the warm-index `count()` check, so compression runs on the hot path even when the index is warm; code path, zip name, model ids, and `OPENAI_API_KEY` are hardcoded (`rag_code.py:16-20`), with no offline/alt-provider path.

<a id="g50-f031"></a>
### case_resolved never validates further_plan shape (claims dict[str,str] , does no runtime check) and unconditionally appends, so a malformed/empty plan silently "resolves"

`research_agent/inno/agents/inno_agent/exp_analyser.py:28-33` @ f9a6f84

`research_agent/inno/agents/inno_agent/exp_analyser.py:28-33, 98` — `case_resolved` never validates `further_plan` shape (claims `dict[str,str]`, does no runtime check) and unconditionally appends, so a malformed/empty plan silently "resolves"; the `tools` list is concatenated with no dedup, so a function in both `tool_files` and `tool_codes` registers twice.

<a id="g50-f032"></a>
### __main__ calls case_resolved() with no argument (required param -> TypeError , broken smoke test)

`research_agent/inno/tools/inner.py:26-27` @ f9a6f84

`research_agent/inno/tools/inner.py:26-27`, `research_agent/inno/agents/inno_agent/prepare_agent.py:50-59` — `main` calls `case_resolved()` with no argument (required param -> `TypeError`, broken smoke test); a tool list numbers two items both `4`. Instruction prompts also carry baked-in typos ("exsiting", `exp_analyser.py:50-71`).

