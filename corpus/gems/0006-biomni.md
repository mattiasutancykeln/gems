# Biomni

| | |
|---|---|
| Source | https://github.com/snap-stanford/Biomni |
| Repo | https://github.com/snap-stanford/Biomni @ `400c1f366b96a35ca253e13c9b06c5076af41d65` |
| Kind | - |
| Topics | - |
| License | Apache-2.0 (permissive) |
| Verdict | keep |
| Findings | 110 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/6 |

## Implementation decisions

<a id="g6-f001"></a>
### LLM is initialized with hard stop sequences ["</execute>", "</solution>"] , eliminating a whole class of runaway-gene…

`biomni/agent/a1.py:L197-L204` @ 400c1f3

`biomni/agent/a1.py:L197-L204` — LLM is initialized with hard stop sequences `["</execute>", "</solution>"]`, eliminating a whole class of runaway-generation bugs where the model overruns its action boundary.

<a id="g6-f002"></a>
### Tool timeout uses multiprocessing.Process + Queue (not threading) so a hung tool can be SIGKILLed without corrupting …

`biomni/agent/react.py:L91-L152` @ 400c1f3

`biomni/agent/react.py:L91-L152` — Tool timeout uses `multiprocessing.Process` + `Queue` (not threading) so a hung tool can be SIGKILLed without corrupting the host process; threads cannot be forcibly killed in Python.

<a id="g6-f003"></a>
### Module-level _persistent_namespace = {} shared across all run_python_repl calls so variables defined in one agent ste…

`biomni/tool/support_tools.py:6-7` @ 400c1f3

`biomni/tool/support_tools.py:6-7` — Module-level `_persistent_namespace = {}` shared across all `run_python_repl` calls so variables defined in one agent step survive into the next, eliminating re-run boilerplate.

<a id="g6-f004"></a>
### plt.show and plt.savefig are monkey-patched once (guarded by _biomni_patched sentinel) to auto-capture figures to bas…

`biomni/tool/support_tools.py:87-120` @ 400c1f3

`biomni/tool/support_tools.py:87-120` — `plt.show` and `plt.savefig` are monkey-patched once (guarded by `_biomni_patched` sentinel) to auto-capture figures to base64, removing the requirement for the agent to explicitly save plots in a headless environment.

<a id="g6-f005"></a>
### Incomplete XML tag auto-close before regex parsing prevents silent drops when the LLM truncates mid-tag

`biomni/agent/a1.py:L1415-L1420` @ 400c1f3

`biomni/agent/a1.py:L1415-L1420` — Incomplete XML tag auto-close before regex parsing prevents silent drops when the LLM truncates mid-tag: `if "<execute>" in msg and "</execute>" not in msg: msg += "</execute>"`.

<a id="g6-f006"></a>
### Instead of regex post-processing, result formatting makes a second LLM call with with_structured_output(output_class)…

`biomni/agent/qa_llm.py:32-49` @ 400c1f3

`biomni/agent/qa_llm.py:32-49` — Instead of regex post-processing, result formatting makes a second LLM call with `with_structured_output(output_class)` over the conversation log, turning free-form agent output into a typed Pydantic object. The same pattern appears in `biomni/agent/react.py:L447-L464` and `biomni/agent/a1.py:L1942-L1960` under the name "evaluateGPT."

<a id="g6-f007"></a>
### Tools are materialized into a pandas.DataFrame at construction time alongside the raw list, creating a retrieval inde…

`biomni/tool/tool_registry.py:15-18` @ 400c1f3

`biomni/tool/tool_registry.py:15-18` — Tools are materialized into a `pandas.DataFrame` at construction time alongside the raw list, creating a retrieval index from the same source of truth as direct lookups.

<a id="g6-f008"></a>
### run_python_repl is always stripped from the tool-description dict fed to the system prompt (always available implicit…

`biomni/agent/a1.py:L1308` @ 400c1f3

`biomni/agent/a1.py:L1308` — `run_python_repl` is always stripped from the tool-description dict fed to the system prompt (always available implicitly), preventing token waste and confusion: `tool_desc = {i: [x for x in j if x["name"] != "run_python_repl"] for i, j in self.module2api.items()}`.

<a id="g6-f009"></a>
### Three-layer credential resolution ( env_var_1 or env_var_2 or config_attribute ) with no hardcoded fallback; avoids s…

`biomni/tool/protocols.py:L24-26` @ 400c1f3

`biomni/tool/protocols.py:L24-26` — Three-layer credential resolution (`env_var_1 or env_var_2 or config_attribute`) with no hardcoded fallback; avoids secrets in code while supporting multiple deployment configurations.

<a id="g6-f010"></a>
### PubMed retry progressively drops the last word of the query on each attempt rather than retrying verbatim; effective …

`biomni/tool/literature.py:L168-173` @ 400c1f3

`biomni/tool/literature.py:L168-173` — PubMed retry progressively drops the last word of the query on each attempt rather than retrying verbatim; effective heuristic for over-specified queries returning zero results: `simplified_query = " ".join(query.split()[:-retries])`.

<a id="g6-f011"></a>
### OpenAI models receive an extra inline reminder to use XML tags injected at the start of every generate call, compensa…

`biomni/agent/a1.py:L1382-L1388` @ 400c1f3

`biomni/agent/a1.py:L1382-L1388` — OpenAI models receive an extra inline reminder to use XML tags injected at the start of every `generate` call, compensating for model-specific formatting drift without branching the graph.

<a id="g6-f012"></a>
### pinned commit SHA

`biomni/tool/lab_automation.py:30-43` @ 400c1f3

`biomni/tool/lab_automation.py:30-43` — PyLabRobot docs are fetched from a pinned commit SHA (`106aef9c8699…`), not `main`, so the agent's grounding context is frozen and reproducible regardless of upstream changes.

<a id="g6-f013"></a>
### basic.ipynb is sorted first within liquid-handling docs ( key=0 if endswith("basic.ipynb") else 1 ), ensuring the mos…

`biomni/tool/lab_automation.py:103-108` @ 400c1f3

`biomni/tool/lab_automation.py:103-108` — `basic.ipynb` is sorted first within liquid-handling docs (`key=0 if endswith("basic.ipynb") else 1`), ensuring the most foundational tutorial is the first thing in context before specialized notebooks.

<a id="g6-f014"></a>
### torch.load is monkey-patched to force weights_only=False for nnUNet weight compatibility and unconditionally restored…

`biomni/tool/bioimaging.py:L432-455` @ 400c1f3

`biomni/tool/bioimaging.py:L432-455` — `torch.load` is monkey-patched to force `weights_only=False` for nnUNet weight compatibility and unconditionally restored in a `finally` block, isolating the shim to only the segmentation call.

<a id="g6-f015"></a>
### Model download sends browser-like User-Agent / Accept headers to bypass Zenodo anti-bot, rather than a plain requests…

`biomni/tool/bioimaging.py:L192-203` @ 400c1f3

`biomni/tool/bioimaging.py:L192-203` — Model download sends browser-like `User-Agent`/`Accept` headers to bypass Zenodo anti-bot, rather than a plain `requests.get`, because Zenodo returns 403 to scripts.

<a id="g6-f016"></a>
### PDF validation checks both Content-Type header and magic bytes ( b"%PDF" ) to catch misconfigured servers that return…

`biomni/tool/literature.py:L377` @ 400c1f3

`biomni/tool/literature.py:L377` — PDF validation checks both `Content-Type` header and magic bytes (`b"%PDF"`) to catch misconfigured servers that return HTTP 200 with wrong content type.

<a id="g6-f017"></a>
### The gnomAD schema is stored as a concrete example GraphQL query (not a schema definition). Using a worked example red…

`biomni/tool/schema_db/gnomad.pkl:L2-L68` @ 400c1f3

`biomni/tool/schema_db/gnomad.pkl:L2-L68` — The gnomAD schema is stored as a concrete example GraphQL query (not a schema definition). Using a worked example reduces the LLM's need to synthesize correct query syntax; it mutates the template instead.

<a id="g6-f018"></a>
### The PubChem schema separates operations , properties , and formats into distinct flat lists (4 × 5 × 6), making it tr…

`biomni/tool/schema_db/pubchem.pkl:L1-L3` @ 400c1f3

`biomni/tool/schema_db/pubchem.pkl:L1-L3` — The PubChem schema separates `operations`, `properties`, and `formats` into distinct flat lists (4 × 5 × 6), making it trivial for a tool-selector to enumerate valid combinations without recursive traversal.

<a id="g6-f019"></a>
### Custom functions are stored in builtins._biomni_custom_functions so code executed in a separate REPL subprocess can a…

`biomni/agent/a1.py:L331-L335` @ 400c1f3

`biomni/agent/a1.py:L331-L335` — Custom functions are stored in `builtins._biomni_custom_functions` so code executed in a separate REPL subprocess can access them by name without an explicit import.

<a id="g6-f020"></a>
### Two separate env_desc modules are selected at import time based on commercial_mode rather than filtering at runtime, …

`biomni/agent/a1.py:L101-L108` @ 400c1f3

`biomni/agent/a1.py:L101-L108` — Two separate `env_desc` modules are selected at import time based on `commercial_mode` rather than filtering at runtime, keeping the commercial/non-commercial split clean and auditable.

<a id="g6-f021"></a>
### Agent reasoning is split across two providers

`README.md:297-306` @ 400c1f3

`README.md:297-306` — Agent reasoning is split across two providers: Biomni-R0 via SGLang handles multi-step tool-use reasoning, while `default_config` points a different provider at database/retrieval queries—separating reasoning cost from retrieval cost.

<a id="g6-f022"></a>
### Multiple Synapse entity ID failures return {"success"

`biomni/tool/support_tools.py:306-312` @ 400c1f3

`biomni/tool/support_tools.py:306-312` — Multiple Synapse entity ID failures return `{"success": False, "error": ..., "suggestion": ...}` rather than crashing, so the agent can read the constraint and self-correct.

<a id="g6-f023"></a>
### The agent package surface is deliberately thin

`biomni/agent/__init__.py:L1` @ 400c1f3

`biomni/agent/init.py:L1` — The agent package surface is deliberately thin: only `A1` is re-exported, insulating downstream callers from internal class proliferation and making the agent surface easy to version.

<a id="g6-f024"></a>
### CNVkit discovery walks PATH -> biomni_e1 conda env -> bio_env_py310 -> error , so the tool self-locates in managed envir…

`biomni/tool/cancer_biology.py:L1034-1066` @ 400c1f3

`biomni/tool/cancer_biology.py:L1034-1066` — CNVkit discovery walks `PATH -> biomni_e1 conda env -> bio_env_py310 -> error`, so the tool self-locates in managed environments without requiring PATH setup from the caller.

<a id="g6-f025"></a>
### Jupyter notebook cells are stripped to only import lines containing "pylabrobot" , capped at 20 lines per cell, keepi…

`biomni/tool/lab_automation.py:131-139` @ 400c1f3

`biomni/tool/lab_automation.py:131-139` — Jupyter notebook cells are stripped to only import lines containing `"pylabrobot"`, capped at 20 lines per cell, keeping injected docs dense with actionable API surface rather than prose.

## Skills, prompts, tools

<a id="g6-f026"></a>
### The main system prompt mandates a numbered checklist plan ( [ ] / [x] / [-] ) updated after every step, giving the LL…

`biomni/agent/a1.py:L1098-L1143` @ 400c1f3

`biomni/agent/a1.py:L1098-L1143` — The main system prompt mandates a numbered checklist plan (`[ ]` / `[x]` / `[-]`) updated after every step, giving the LLM a built-in scratchpad for tracking multi-step state without extra state machinery.

<a id="g6-f027"></a>
### Three execution modes are specified inline

`biomni/agent/a1.py:L1124-L1142` @ 400c1f3

`biomni/agent/a1.py:L1124-L1142` — Three execution modes are specified inline: Python (default), `#!R` prefix for R, `#!BASH`/`#!CLI` for shell—all dispatched from one `<execute>` tag by inspecting the first line of the code block.

<a id="g6-f028"></a>
### Custom resources (tools, data, software, know-how docs) are injected into a highlighted PRIORITY CUSTOM RESOURCES blo…

`biomni/agent/a1.py:L1162-L1210` @ 400c1f3

`biomni/agent/a1.py:L1162-L1210` — Custom resources (tools, data, software, know-how docs) are injected into a highlighted `PRIORITY CUSTOM RESOURCES` block above the standard environment section, with emoji labels (``, ``, ``, ``) so the LLM treats them as higher-priority.

<a id="g6-f029"></a>
### Two parallel system prompt variants share the same template

`biomni/agent/a1.py:L1246-L1257` @ 400c1f3

`biomni/agent/a1.py:L1246-L1257` — Two parallel system prompt variants share the same template: `is_retrieval=False` shows all resources and says "you'll need to import"; `is_retrieval=True` shows only retrieved resources and says "import from its module"—same slot, different framing.

<a id="g6-f030"></a>
### advanced_web_search_claude is an LLM-calls-LLM surface

`biomni/tool/literature.py:L218-267` @ 400c1f3

`biomni/tool/literature.py:L218-267` / `biomni/tool/tool_description/literature.py:136-160` — `advanced_web_search_claude` is an LLM-calls-LLM surface: it spawns a nested Claude agent with `web_search_20250305`, caps the action budget via `max_uses`, and threads inline citations back into the return string. Agent-spawning as a first-class tool action.

<a id="g6-f031"></a>
### LLM decision rules are embedded directly in the entity_type parameter description

`biomni/tool/tool_description/support_tools.py:58-63` @ 400c1f3

`biomni/tool/tool_description/support_tools.py:58-63` / `biomni/tool/support_tools.py:250-255` — LLM decision rules are embedded directly in the `entity_type` parameter description: "MUST match actual entity type! Check user hints (e.g., 'files' means entity_type='file') or search results ('node_type' field)." A second `AGENT USAGE GUIDANCE` block in the docstring reinforces the same rule. Prompt engineering inside the schema.

<a id="g6-f032"></a>
### Chunk analysis prompt includes explicit anti-hallucination rules

`biomni/agent/env_collection.py:L44-L79` @ 400c1f3

`biomni/agent/env_collection.py:L44-L79` — Chunk analysis prompt includes explicit anti-hallucination rules: "return NO tasks" is preferred over including non-universal ones; specificity is enforced by requiring concrete protocol names (e.g., "DESeq2" not "Gene Expression Analysis").

<a id="g6-f033"></a>
### Consolidation prompt requests a strict three-key JSON ( tasks , databases , software ) with a code_implementation fie…

`biomni/agent/env_collection.py:L82-L133` @ 400c1f3

`biomni/agent/env_collection.py:L82-L133` — Consolidation prompt requests a strict three-key JSON (`tasks`, `databases`, `software`) with a `code_implementation` field containing pseudocode—structured output specification embedded directly in the prompt.

<a id="g6-f034"></a>
### A hardcoded "Notes" block of known pitfalls (deprecated names, async rules, multi-channel tip format) is prepended be…

`biomni/tool/lab_automation.py:209-223` @ 400c1f3

`biomni/tool/lab_automation.py:209-223` — A hardcoded "Notes" block of known pitfalls (deprecated names, async rules, multi-channel tip format) is prepended before the fetched docs, ensuring known failure modes are salient before the model reads general documentation. System-prompt injection inside a tool.

<a id="g6-f035"></a>
### analyze_flow_cytometry_immunophenotyping accepts gating_strategy as {population

`biomni/tool/tool_description/cell_biology.py:118-129` @ 400c1f3

`biomni/tool/tool_description/cell_biology.py:118-129` — `analyze_flow_cytometry_immunophenotyping` accepts `gating_strategy` as `{population: [(marker, operator, threshold)]}` — a declarative mini-DSL that an LLM can construct directly from natural-language cell population descriptions.

<a id="g6-f036"></a>
### simulate_protein_signaling_network encodes graph topology as {target

`biomni/tool/tool_description/systems_biology.py:114-148` @ 400c1f3

`biomni/tool/tool_description/systems_biology.py:114-148` — `simulate_protein_signaling_network` encodes graph topology as `{target: [(regulator, ±1)]}` and reaction params as `{(regulator, target): {W, n, EC50}}`—compact structures an LLM can populate directly from pathway descriptions.

<a id="g6-f037"></a>
### simulate_renin_angiotensin_system_dynamics embeds exact dict key names ( 'k_ren' , 'k_agt' , 'k_ace' ) in the descrip…

`biomni/tool/tool_description/systems_biology.py:190-218` @ 400c1f3

`biomni/tool/tool_description/systems_biology.py:190-218` — `simulate_renin_angiotensin_system_dynamics` embeds exact dict key names (`'k_ren'`, `'k_agt'`, `'k_ace'`) in the description strings, giving the LLM precise construction targets rather than requiring schema inference.

<a id="g6-f038"></a>
### Every database tool exposes a prompt (natural-language) required parameter alongside an optional endpoint / search_te…

`biomni/tool/tool_description/database.py:1-731` @ 400c1f3

`biomni/tool/tool_description/database.py:1-731` — Every database tool exposes a `prompt` (natural-language) required parameter alongside an optional `endpoint`/`search_term` escape hatch. Dual-mode pattern: free text for LLM callers, exact URL for deterministic retrieval.

<a id="g6-f039"></a>
### The entire tool schema uses description fields as inline micro-docs with mechanism summaries, GPU notes, and trade-of…

`biomni/tool/tool_description/genomics.py:L1-840` @ 400c1f3

`biomni/tool/tool_description/genomics.py:L1-840` — The entire tool schema uses `description` fields as inline micro-docs with mechanism summaries, GPU notes, and trade-offs, so an LLM orchestrator can select the correct tool purely from the JSON description without external documentation.

<a id="g6-f040"></a>
### GEO schema bundles NCBI search field tags (e.g. "[ORGN]" , "[PDAT]" ), entry type codes, and date format patterns. Re…

`biomni/tool/schema_db/geo.pkl:L1-L33` @ 400c1f3

`biomni/tool/schema_db/geo.pkl:L1-L33` — GEO schema bundles NCBI search field tags (e.g. `"[ORGN]"`, `"[PDAT]"`), entry type codes, and date format patterns. Ready-made prompt context: drop verbatim into a tool description so the model constructs valid Entrez queries without hallucinating field names.

<a id="g6-f041"></a>
### Schema pickle encodes a bounded action space

`biomni/tool/schema_db/pubchem.pkl:L2-L3` @ 400c1f3

`biomni/tool/schema_db/pubchem.pkl:L2-L3` — Schema pickle encodes a bounded action space: 4 operations × 5 properties × 6 formats. An LLM tool-selector can exhaustively enumerate valid combinations, preventing hallucinated endpoint paths.

<a id="g6-f042"></a>
### Protocol generation has its own named instruction section specifying exactly which four tools to call ( search_protoc…

`biomni/agent/a1.py:L1152-L1155` @ 400c1f3

`biomni/agent/a1.py:L1152-L1155` — Protocol generation has its own named instruction section specifying exactly which four tools to call (`search_protocols`, `advanced_web_search_claude`, `list_local_protocols`, `read_local_protocol`) before generating any protocol.

<a id="g6-f043"></a>
### read_function_source_code lets the agent introspect its own tool implementations by fully qualified name, enabling se…

`biomni/tool/tool_description/support_tools.py:15-29` @ 400c1f3

`biomni/tool/tool_description/support_tools.py:15-29` — `read_function_source_code` lets the agent introspect its own tool implementations by fully qualified name, enabling self-guided exploration of the available action space at runtime.

<a id="g6-f044"></a>
### Citation threading

`biomni/tool/literature.py:L280-291` @ 400c1f3

`biomni/tool/literature.py:L280-291` — Citation threading: iterates `response.content` blocks, separates `text` into paragraphs and `citations` into a list, then appends `(Citation: title - url)` inline. Clean mechanism for grounding LLM responses with source attribution.

<a id="g6-f045"></a>
### The copy-number analysis log closes with a NEXT STEPS section listing upgrade tools (ABSOLUTE, FACETS, scarHRD, HRDet…

`biomni/tool/cancer_biology.py:L1286-1289` @ 400c1f3

`biomni/tool/cancer_biology.py:L1286-1289` — The copy-number analysis log closes with a `NEXT STEPS` section listing upgrade tools (ABSOLUTE, FACETS, scarHRD, HRDetect), giving the orchestrating agent actionable follow-up options embedded in the tool output.

<a id="g6-f046"></a>
### Code-gen system prompt instructs the LLM to "prioritize the use of codes on public repositories, such as HuggingFace …

`biomni/agent/function_generator.py:L39-L49` @ 400c1f3

`biomni/agent/function_generator.py:L39-L49` — Code-gen system prompt instructs the LLM to "prioritize the use of codes on public repositories, such as HuggingFace or Github"—explicit retrieval-augmented generation preference baked into the prompt.

<a id="g6-f047"></a>
### The query docstring directs the LLM caller

`biomni/tool/protocols.py:L36` @ 400c1f3

`biomni/tool/protocols.py:L36` — The `query` docstring directs the LLM caller: "should be EXACT as we are looking for EXACT MATCH"—a behavioral directive embedded in the tool description rather than in a separate prompt template.

<a id="g6-f048"></a>
### result_formatting uses a system prompt identifying the model as "evaluateGPT, tasked with extract and parse the task …

`biomni/agent/qa_llm.py:33-41` @ 400c1f3

`biomni/agent/qa_llm.py:33-41` — `result_formatting` uses a system prompt identifying the model as "evaluateGPT, tasked with extract and parse the task output based on the history of an agent," separating the parsing role cleanly from the acting role.

<a id="g6-f049"></a>
### Protocol .txt files in biomni/tool/protocols/ (Thermo Fisher, Addgene) are described as "automatically retrieved by t…

`README.md:336-354` @ 400c1f3

`README.md:336-354` — Protocol `.txt` files in `biomni/tool/protocols/` (Thermo Fisher, Addgene) are described as "automatically retrieved by the A1 agent when relevant," functioning as retrieval-augmented grounding documents for wet-lab procedure queries.

## Patterns worth porting

<a id="g6-f050"></a>
### Multiprocess timeout wrapper factory

`biomni/agent/react.py:L90-L152` @ 400c1f3

`biomni/agent/react.py:L90-L152` — Multiprocess timeout wrapper factory: wraps any callable to run in a `Process`+`Queue`, with SIGTERM then SIGKILL escalation; returns a plain error string on timeout so the agent loop continues cleanly. Portable to any tool-executing agent.

<a id="g6-f051"></a>
### Dynamic MCP tool registration

`biomni/agent/a1.py:L350-L587` @ 400c1f3

`biomni/agent/a1.py:L350-L587` — Dynamic MCP tool registration: YAML config drives discovery -> auto-generated `inputSchema`-based schemas -> synthetic `types.ModuleType` per server -> registered in both `tool_registry` and `module2api`. Full lifecycle with enable/disable and automatic schema inference.

<a id="g6-f052"></a>
### Self-critic test-time scaling node

`biomni/agent/a1.py:L1580-L1604` @ 400c1f3

`biomni/agent/a1.py:L1580-L1604` — Self-critic test-time scaling node: after a `<solution>` is produced, injects LLM-generated feedback as a `HumanMessage` and routes back to `generate` up to `test_time_scale_round` times, decoupled from the main graph via a separate node.

<a id="g6-f053"></a>
### Parse-error recovery loop

`biomni/agent/a1.py:L1440-L1468` @ 400c1f3

`biomni/agent/a1.py:L1440-L1468` — Parse-error recovery loop: detects missing tags, injects a corrective `HumanMessage`, and retries generation; after 2 failures it hard-terminates rather than looping forever: `if error_count >= 2: state["next_step"] = "end"`.

<a id="g6-f054"></a>
### Persistent REPL namespace

`biomni/tool/support_tools.py:23-31` @ 400c1f3

`biomni/tool/support_tools.py:23-31` — Persistent REPL namespace: pass a single module-level dict as the `globals` argument to `exec()`. Any agent orchestrating multi-step code generation can adopt this to avoid re-running setup between steps.

<a id="g6-f055"></a>
### Headless plot capture via monkey-patching

`biomni/tool/support_tools.py:81-126` @ 400c1f3

`biomni/tool/support_tools.py:81-126` — Headless plot capture via monkey-patching: patch `plt.show`/`plt.savefig` once with a `_biomni_patched` guard, capture figures to base64 in the wrapper. Directly portable to any LLM code-execution sandbox.

<a id="g6-f056"></a>
### Execution result correlator

`biomni/agent/a1.py:L1541-L1548` @ 400c1f3

`biomni/agent/a1.py:L1541-L1548` — Execution result correlator: each `<execute>` block stores a dict with `triggering_message` + base64 images + timestamp, enabling after-the-fact association of plots to the exact agent step that produced them.

<a id="g6-f057"></a>
### Map-then-consolidate extraction

`biomni/agent/env_collection.py:L147-L164` @ 400c1f3

`biomni/agent/env_collection.py:L147-L164` — Map-then-consolidate extraction: text is split into chunks, each processed independently, then a second LLM call merges all chunk outputs—standard pattern for long-document extraction fitting within context limits.

<a id="g6-f058"></a>
### MCP sync wrapper

`biomni/agent/a1.py:L415-L444` @ 400c1f3

`biomni/agent/a1.py:L415-L444` — MCP sync wrapper: `nest_asyncio.apply()` + `asyncio.run()` with fallback to `loop.create_task()` when a running loop is detected, making async MCP tools callable synchronously from a sync agent environment.

<a id="g6-f059"></a>
### GraphQL template-as-schema

`biomni/tool/schema_db/gnomad.pkl:L2-L68` @ 400c1f3

`biomni/tool/schema_db/gnomad.pkl:L2-L68` — GraphQL template-as-schema: store a canonical working query as the schema artifact for GraphQL APIs. The model edits gene symbol and dataset fields in the template rather than generating a query cold. Generalizes to any GraphQL API where schema introspection is expensive or unreliable.

<a id="g6-f060"></a>
### Schema-as-pickle pattern

`biomni/tool/schema_db/*.pkl:L1` — Schema-as-pickle pattern: structured API metadata is serialized and shipped alongside the tool code rather than fetched at runtime. Makes schemas versionable, diffable (via re-serialization), and loadable with a single `pickle.load`.

<a id="g6-f061"></a>
### Backend-swap injection for simulation

`biomni/tool/lab_automation.py:429-490` @ 400c1f3

`biomni/tool/lab_automation.py:429-490` — Backend-swap injection for simulation: `_modify_script_for_testing` replaces `STARBackend()` with `LiquidHandlerChatterboxBackend()` via string substitution, then inserts tracking setup between imports and first function definition by scanning boundary tokens. Portable for sandboxing hardware calls in LLM-generated code.

<a id="g6-f062"></a>
### Thread-based timeout with clean temp-file teardown

`biomni/tool/lab_automation.py:493-547` @ 400c1f3

`biomni/tool/lab_automation.py:493-547` — Thread-based timeout with clean temp-file teardown: script written to `NamedTemporaryFile`, run in a `threading.Thread` with `join(timeout=N)`, temp file always unlinked in `finally`. Clean pattern for safely executing LLM-generated scripts with bounded wall-clock time.

<a id="g6-f063"></a>
### Keyword-priority section assembler

`biomni/tool/lab_automation.py:158-206` @ 400c1f3

`biomni/tool/lab_automation.py:158-206` — Keyword-priority section assembler: maps section headings to keyword lists and does a first-match scan over fetched docs, then appends unmatched docs at the end. "Curated-order + remainder" pattern for assembling any RAG context window where section ordering matters.

<a id="g6-f064"></a>
### Progressive query simplification on retry

`biomni/tool/literature.py:L164-173` @ 400c1f3

`biomni/tool/literature.py:L164-173` — Progressive query simplification on retry: remove one term per attempt, sleep between retries. Generalizes to any text-search API that fails on over-specified queries.

<a id="g6-f065"></a>
### Jitter + exponential backoff

`biomni/tool/literature.py:L269-298` @ 400c1f3

`biomni/tool/literature.py:L269-298` — Jitter + exponential backoff: random initial jitter (`random.randint(1, 10)`) combined with exponential backoff (`delay *= 2`) across `max_retries` attempts; avoids thundering-herd on rate-limited external APIs.

<a id="g6-f066"></a>
### Semantic HTML extraction

`biomni/tool/literature.py:L324-329` @ 400c1f3

`biomni/tool/literature.py:L324-329` — Semantic HTML extraction: `main -> article -> body` fallback chain, then strip `script/style/nav/header/footer/aside/iframe` before paragraph extraction. Portable web-scraping signal-to-noise pattern.

<a id="g6-f067"></a>
### Lazy model download with structured fallback

`biomni/tool/bioimaging.py:L278-425` @ 400c1f3

`biomni/tool/bioimaging.py:L278-425` — Lazy model download with structured fallback: check PATH -> probe conda envs via subprocess -> auto-download with browser headers -> verify weight file presence. Reusable for any tool requiring large pretrained weights that may not be pre-installed.

<a id="g6-f068"></a>
### Normalized Hill-function ODE framework

`biomni/tool/systems_biology.py:460-551` @ 400c1f3

`biomni/tool/systems_biology.py:460-551` — Normalized Hill-function ODE framework: generic `(regulator, target)`-keyed param dict and a single `hill_function(x, n, ec50)` shared by all activator/inhibitor edges. Network topology drives which params are consulted at runtime—clean separation of structure from kinetics.

<a id="g6-f069"></a>
### Multi-model fit + best-by-R² selection with mechanism interpretation

`biomni/tool/bioengineering.py:L658-887` @ 400c1f3

`biomni/tool/bioengineering.py:L658-887` — Multi-model fit + best-by-R² selection with mechanism interpretation: fit zero-order, first-order, Higuchi, and Korsmeyer-Peppas models, rank by R², then derive a mechanistic label from the winner's identity and parameter values. Generic pattern for hypothesis ranking over a fixed model family.

<a id="g6-f070"></a>
### Structured error returns with suggestion field

`biomni/tool/support_tools.py:278-388` @ 400c1f3

`biomni/tool/support_tools.py:278-388` — Structured error returns with suggestion field: every failure path returns `{"success": False, "error": "...", "suggestion": "..."}`. Agents can read the `suggestion` field and self-correct without exception-handling logic.

<a id="g6-f071"></a>
### Multi-source credential resolution + dual-level error handling

`biomni/tool/protocols.py:L24-26` @ 400c1f3

`biomni/tool/protocols.py:L24-26` / `biomni/tool/protocols.py:L84-91` — Multi-source credential resolution + dual-level error handling: `env1 or env2 or config.attr` for secrets; HTTP errors via `raise_for_status()` (exception path) and application-level errors via `status_code != 0` (dict path) with consistent normalized return shape.

<a id="g6-f072"></a>
### Uniform typed manifest schema

All `tool_description/*.py` files — Uniform typed manifest schema: `{description, name, required_parameters, optional_parameters}` with per-parameter `{default, description, name, type}` enables dynamic tool registration and prompt generation from a single source of truth.

<a id="g6-f073"></a>
### Proxy HRD scoring with documented upgrade path

`biomni/tool/cancer_biology.py:L1113-1200` @ 400c1f3

`biomni/tool/cancer_biology.py:L1113-1200` — Proxy HRD scoring with documented upgrade path: LST-like events + HRD-LOH-like events as proxy metrics, with explicit note to replace with scarHRD for clinical use. Pattern for "good enough" metrics that document their own upgrade path.

<a id="g6-f074"></a>
### Sequence lineage assignment via Hamming clustering

`biomni/tool/bioengineering.py:L474-504` @ 400c1f3

`biomni/tool/bioengineering.py:L474-504` — Sequence lineage assignment via Hamming clustering: compute pairwise Hamming distance, convert to condensed form, apply average linkage, cut at fixed distance. Reusable for any short-sequence grouping task (barcodes, UMIs, guides).

<a id="g6-f075"></a>
### Run-length region extraction

`biomni/tool/biophysics.py:62-83` @ 400c1f3

`biomni/tool/biophysics.py:62-83` — Run-length region extraction: consecutive positions above threshold accumulated into `current_region` lists and flushed only when a gap appears or sequence ends, with `len > 1` minimum to filter isolated spikes. Compact and correct idiom for any sequence segmentation task.

<a id="g6-f076"></a>
### Two-level entry-type registry

`biomni/tool/schema_db/geo.pkl:L18-L31` @ 400c1f3

`biomni/tool/schema_db/geo.pkl:L18-L31` — Two-level entry-type registry: `"GEO Series" -> "gse"`, database name -> Entrez db string in a single dict. Store human-readable label -> API identifier mappings in schema payloads so the model works with natural-language labels while the tool layer resolves them to API tokens.

<a id="g6-f077"></a>
### Module docstring as output-format contract

`biomni/tool/glycoengineering.py:1-6` @ 400c1f3

`biomni/tool/glycoengineering.py:1-6` / `biomni/tool/glycoengineering.py:97-112` — Module docstring as output-format contract: declare the output format ("research-log style strings") at the module level; individual tools follow the pattern: heading -> metadata line -> capped candidate list -> referral to authoritative external tool.

<a id="g6-f078"></a>
### Commercial-mode license filter

`biomni/agent/a1.py:L876-L896` @ 400c1f3

`biomni/agent/a1.py:L876-L896` — Commercial-mode license filter: metadata field (`-` emoji or "Non-Commercial" string) in know-how documents is checked at configure time, not query time—cheap, deterministic, no LLM involvement.

<a id="g6-f079"></a>
### Deprecated-but-supported dual input path

`biomni/tool/biochemistry.py:L700-752` @ 400c1f3

`biomni/tool/biochemistry.py:L700-752` — Deprecated-but-supported dual input path: accepts both a file path (preferred) and a legacy DataFrame with an explicit deprecation warning, enabling callers to migrate without immediate breakage.

## Open threads / weak spots

<a id="g6-f080"></a>
### go() uses a fixed thread_id=42 in config, meaning all concurrent agent invocations share a single LangGraph checkpoin…

`biomni/agent/a1.py:L1774` @ 400c1f3

`biomni/agent/a1.py:L1774` — `go()` uses a fixed `thread_id=42` in config, meaning all concurrent agent invocations share a single LangGraph checkpoint thread and overwrite each other's state. Critical correctness bug for any multi-user or parallel use.

<a id="g6-f081"></a>
### Access code "Biomni2025" is hardcoded in the Gradio demo source; anyone reading the repo can bypass the verification …

`biomni/agent/a1.py:L2654-L2655` @ 400c1f3

`biomni/agent/a1.py:L2654-L2655` — Access code `"Biomni2025"` is hardcoded in the Gradio demo source; anyone reading the repo can bypass the verification gate.

<a id="g6-f082"></a>
### Two separate exec(command, namespace) paths run with full process privileges and no timeout or resource cap. The READ…

`biomni/tool/support_tools.py:31` @ 400c1f3

`biomni/tool/support_tools.py:31` / `biomni/tool/lab_automation.py:550-553` — Two separate `exec(command, namespace)` paths run with full process privileges and no timeout or resource cap. The README explicitly warns this is unsafe for production; the lab automation path even includes a comment: "In practice, you might want to use subprocess or other isolation methods."

<a id="g6-f083"></a>
### SnpEff is called with shell=True and output redirection; if filtered_vcf or annotated_vcf paths contain shell metacha…

`biomni/tool/cancer_biology.py:L519-520` @ 400c1f3

`biomni/tool/cancer_biology.py:L519-520` — SnpEff is called with `shell=True` and output redirection; if `filtered_vcf` or `annotated_vcf` paths contain shell metacharacters, this is a command injection risk.

<a id="g6-f084"></a>
### Registry serialization uses pickle , which is both insecure (arbitrary code execution on load from untrusted file) an…

`biomni/tool/tool_registry.py:79-88` @ 400c1f3

`biomni/tool/tool_registry.py:79-88` — Registry serialization uses `pickle`, which is both insecure (arbitrary code execution on load from untrusted file) and version-sensitive.

<a id="g6-f085"></a>
### Fallback model ID "claude-4-sonnet-latest" is non-standard (not a known Anthropic model ID); will cause an API error …

`biomni/tool/literature.py:L253-254` @ 400c1f3

`biomni/tool/literature.py:L253-254` — Fallback model ID `"claude-4-sonnet-latest"` is non-standard (not a known Anthropic model ID); will cause an API error whenever the `biomni.config` import fails.

<a id="g6-f086"></a>
### get_tool_by_name , get_tool_by_id , get_id_by_name , and get_name_by_id all perform linear list scans—O(n) lookup deg…

`biomni/tool/tool_registry.py:36-58` @ 400c1f3

`biomni/tool/tool_registry.py:36-58` — `get_tool_by_name`, `get_tool_by_id`, `get_id_by_name`, and `get_name_by_id` all perform linear list scans—O(n) lookup degrades as the registry grows.

<a id="g6-f087"></a>
### JSON parse failure in consolidation falls back to {"tasks"

`biomni/agent/env_collection.py:L198-L230` @ 400c1f3

`biomni/agent/env_collection.py:L198-L230` — JSON parse failure in consolidation falls back to `{"tasks": [{"error": "...", "raw_response": ...}]}` with no retry or logging of the bad model output; silent data loss.

<a id="g6-f088"></a>
### When auto_download=False and the model is absent, the code falls through to input() , which will hang forever in a he…

`biomni/tool/bioimaging.py:L409-413` @ 400c1f3

`biomni/tool/bioimaging.py:L409-413` — When `auto_download=False` and the model is absent, the code falls through to `input()`, which will hang forever in a headless or agent context.

<a id="g6-f089"></a>
### query_scholar uses pg.FreeProxies() unconditionally on every invocation with no timeout; uncontrolled third-party pro…

`biomni/tool/literature.py:L127-131` @ 400c1f3

`biomni/tool/literature.py:L127-131` — `query_scholar` uses `pg.FreeProxies()` unconditionally on every invocation with no timeout; uncontrolled third-party proxies are highly unreliable in non-demo environments.

<a id="g6-f090"></a>
### Placeholder emails hardcoded in both PubMed clients ( "your-email@example.com" and "YOUR_EMAIL" ); NCBI will rate-lim…

`biomni/tool/literature.py:L161` @ 400c1f3

`biomni/tool/literature.py:L161` / `biomni/tool/example_mcp_tools/pubmed_mcp.py:L7` — Placeholder emails hardcoded in both PubMed clients (`"your-email@example.com"` and `"YOUR_EMAIL"`); NCBI will rate-limit or block requests in production.

<a id="g6-f091"></a>
### _capture_matplotlib_plots() inside execute_in_repl is commented out, so plots are only captured if the agent's code c…

`biomni/tool/support_tools.py:35` @ 400c1f3

`biomni/tool/support_tools.py:35` — `_capture_matplotlib_plots()` inside `execute_in_repl` is commented out, so plots are only captured if the agent's code calls `plt.show()` or `plt.savefig()`. Silent no-op otherwise.

<a id="g6-f092"></a>
### entity_type defaults to "dataset" even though both the docstring and description warn this default is usually wrong. …

`biomni/tool/tool_description/support_tools.py:60-62` @ 400c1f3

`biomni/tool/tool_description/support_tools.py:60-62` / `biomni/tool/support_tools.py:205` — `entity_type` defaults to `"dataset"` even though both the docstring and description warn this default is usually wrong. Agents using zero-shot parameter inference will likely hit the wrong code path.

<a id="g6-f093"></a>
### Fallback module when no match is found is hardcoded to "biomni.tool.scRNA_tools" , a domain-specific default that wil…

`biomni/agent/a1.py:L1851-L1853` @ 400c1f3

`biomni/agent/a1.py:L1851-L1853` — Fallback module when no match is found is hardcoded to `"biomni.tool.scRNA_tools"`, a domain-specific default that will silently misdirect import instructions for non-scRNA tools.

<a id="g6-f094"></a>
### analyze_enzyme_kinetics_assay calls np.random.seed(42) and generates synthetic data with np.random.normal rather than…

`biomni/tool/biochemistry.py:L521-528` @ 400c1f3

`biomni/tool/biochemistry.py:L521-528` — `analyze_enzyme_kinetics_assay` calls `np.random.seed(42)` and generates synthetic data with `np.random.normal` rather than analyzing caller-provided data—the function simulates kinetics, not analyzes them.

<a id="g6-f095"></a>
### ADC map fitting uses a triple nested loop iterating voxel-by-voxel with no vectorization; prohibitively slow for typi…

`biomni/tool/physiology.py:L687-712` @ 400c1f3

`biomni/tool/physiology.py:L687-712` — ADC map fitting uses a triple nested loop iterating voxel-by-voxel with no vectorization; prohibitively slow for typical brain volumes (~50M voxels).

<a id="g6-f096"></a>
### time.sleep(2) between HMMER job submission and result fetch is unconditional; under any server latency, the result UR…

`biomni/tool/synthetic_biology.py:L1256` @ 400c1f3

`biomni/tool/synthetic_biology.py:L1256` — `time.sleep(2)` between HMMER job submission and result fetch is unconditional; under any server latency, the result URL returns 404 and domain detection silently returns an empty list.

<a id="g6-f097"></a>
### Async main() detection spawns a second thread just to call asyncio.run() when an event loop is already running. Can d…

`biomni/tool/lab_automation.py:574-599` @ 400c1f3

`biomni/tool/lab_automation.py:574-599` — Async `main()` detection spawns a second thread just to call `asyncio.run()` when an event loop is already running. Can deadlock if the outer loop holds locks the inner run needs.

<a id="g6-f098"></a>
### Debug print statements ( DEBUG

`biomni/agent/a1.py:L2187` @ 400c1f3

`biomni/agent/a1.py:L2187` — Debug `print` statements (`DEBUG: Using conversation state...`) left in production path of `_get_messages_for_processing`.

Other takes: [gem #8](0008-ai-scientist-v2.md#g8-f077)

<a id="g6-f099"></a>
### str(self.log) converts a Python list of tuples to raw repr before passing to the LLM; no structured message formattin…

`biomni/agent/qa_llm.py:49` @ 400c1f3

`biomni/agent/qa_llm.py:49` — `str(self.log)` converts a Python list of tuples to raw repr before passing to the LLM; no structured message formatting—token efficiency and parse reliability depend on the model tolerating Python repr syntax.

<a id="g6-f100"></a>
### Default DATA_ROOT="/dfs/project/bioagentos/data/singlecell/" is a hardcoded lab cluster path; will silently fail or p…

`biomni/tool/tool_description/genomics.py:L159` @ 400c1f3

`biomni/tool/tool_description/genomics.py:L159` — Default `DATA_ROOT="/dfs/project/bioagentos/data/singlecell/"` is a hardcoded lab cluster path; will silently fail or produce wrong behavior on any other system.

<a id="g6-f101"></a>
### n_samples_per_label=10 is listed as "(currently unused)"—dead schema parameter that silently does nothing, but may co…

`biomni/tool/tool_description/genomics.py:L549-551` @ 400c1f3

`biomni/tool/tool_description/genomics.py:L549-551` — `n_samples_per_label=10` is listed as "(currently unused)"—dead schema parameter that silently does nothing, but may confuse LLM callers that try to act on it.

<a id="g6-f102"></a>
### query_chatnt lists question and sequence as required parameters but both have default

`biomni/tool/tool_description/systems_biology.py:230-233` @ 400c1f3

`biomni/tool/tool_description/systems_biology.py:230-233` — `query_chatnt` lists `question` and `sequence` as required parameters but both have `default: "A"`, a schema-generation bug that can mask missing inputs: `{"default": "A", "description": "Questions about the DNA sequence", "name": "question", "type": "str"}`.

<a id="g6-f103"></a>
### No version pin or API revision field in the PubChem schema payload; a stale pickle would silently cause bad requests …

`biomni/tool/schema_db/pubchem.pkl:L1` @ 400c1f3

`biomni/tool/schema_db/pubchem.pkl:L1` — No version pin or API revision field in the PubChem schema payload; a stale pickle would silently cause bad requests with no in-band signal to the model.

<a id="g6-f104"></a>
### Example query hardcodes gene_symbol

`biomni/tool/schema_db/gnomad.pkl:L3-L4` @ 400c1f3

`biomni/tool/schema_db/gnomad.pkl:L3-L4` — Example query hardcodes `gene_symbol: "BRCA1"` and `dataset: gnomad_r4`; if gnomAD releases r5 or retires that dataset enum, the template generates invalid queries with cryptic GraphQL errors.

<a id="g6-f105"></a>
### geo_databases dict lists only two entries ( gds , geoprofiles ) while entry_types lists four; a tool iterating geo_da…

`biomni/tool/schema_db/geo.pkl:L29-L32` @ 400c1f3

`biomni/tool/schema_db/geo.pkl:L29-L32` — `geo_databases` dict lists only two entries (`gds`, `geoprofiles`) while `entry_types` lists four; a tool iterating `geo_databases` will silently omit GSE/GSM/GPL queries.

<a id="g6-f106"></a>
### contours[0] is assumed to be the aorta (largest contour) with no anatomical sanity check; any large non-aortic struct…

`biomni/tool/pathology.py:L83-85` @ 400c1f3

`biomni/tool/pathology.py:L83-85` — `contours[0]` is assumed to be the aorta (largest contour) with no anatomical sanity check; any large non-aortic structure or imaging artifact silently produces wrong measurements.

<a id="g6-f107"></a>
### Cell-cycle classifier is explicitly a hardcoded rule set ( # This is a simplified approach - in practice, you would t…

`biomni/tool/cell_biology.py:113-135` @ 400c1f3

`biomni/tool/cell_biology.py:113-135` — Cell-cycle classifier is explicitly a hardcoded rule set (`# This is a simplified approach - in practice, you would train a classifier`); no trained model, so results on real data are unreliable without replacement.

<a id="g6-f108"></a>
### TODO comment ### TODO

`biomni/agent/react.py:L60-L61` @ 400c1f3

`biomni/agent/react.py:L60-L61` — TODO comment `### TODO: Download the data` with no implementation; the data directory is created but nothing is fetched if it doesn't exist.

<a id="g6-f109"></a>
### query_scholar is hardcoded to return only the first result with no max_papers parameter, significantly less capable t…

`biomni/tool/tool_description/literature.py:44-56` @ 400c1f3

`biomni/tool/tool_description/literature.py:44-56` — `query_scholar` is hardcoded to return only the first result with no `max_papers` parameter, significantly less capable than the `query_arxiv`/`query_pubmed` equivalents.

<a id="g6-f110"></a>
### fetch_supplementary_info_from_doi returns research_log (a list ) on the no-links early-exit path, but returns "\n".jo…

`biomni/tool/literature.py:L63` @ 400c1f3

`biomni/tool/literature.py:L63` — `fetch_supplementary_info_from_doi` returns `research_log` (a `list`) on the no-links early-exit path, but returns `"\n".join(research_log)` (a `str`) at L87—inconsistent return type callers must handle both.

