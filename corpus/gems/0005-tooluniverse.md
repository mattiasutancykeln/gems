# ToolUniverse

| | |
|---|---|
| Source | https://github.com/mims-harvard/ToolUniverse |
| Repo | https://github.com/mims-harvard/ToolUniverse @ `9b7ff91ddb45b567cac2fa8ea31b82851e877617` |
| Kind | - |
| Topics | agent, infra |
| License | Apache-2.0 (permissive) |
| Verdict | keep |
| Findings | 18 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/5 |

## Implementation decisions

<a id="g5-f001"></a>
### Tools are Python classes that self-register via a @register_tool("Name", config=...) decorator into module-global dicts ( _tool_registry , _config_registry )

`tool_registry.py:60-89` @ 9b7ff91

Tools are Python classes that self-register via a `@register_tool("Name", config=...)` decorator into module-global dicts (`_tool_registry`, `_config_registry`); the decorator also injects `type` into the config and calls `add_annotations_to_tool_config` for MCP annotations `tool_registry.py:60-89 `.

<a id="g5-f002"></a>
### no

`tool_registry.py:346-400` @ 9b7ff91

Discovery is lazy by design: an AST walk parses every `*.py`, reads `register_tool` decorator args to build a `{tool_name -> module_name}` map, and imports no modules until a tool is actually requested `tool_registry.py:346-400 `.

<a id="g5-f003"></a>
### A precomputed STATIC_LAZY_REGISTRY is preferred for frozen/bundled envs, with AST discovery layered on top to catch newly-added tool files without a manual rebuild

`tool_registry.py:498-540` @ 9b7ff91

A precomputed `STATIC_LAZY_REGISTRY` is preferred for frozen/bundled envs, with AST discovery layered on top to catch newly-added tool files without a manual rebuild; if AST yields 0 tools (PyInstaller/Nuitka) it falls back to eager `pkgutil` import `tool_registry.py:498-540 `.

<a id="g5-f004"></a>
### Tool *behavior* is separated from tool *definition*

`data/arxiv_tools.json:1-40` @ 9b7ff91

behavior lives in ~300 Python classes under `src/tooluniverse/`, while ~610 JSON files in `src/tooluniverse/data/` hold the name/description/JSON-Schema `parameter`/`return_schema` per tool (e.g. `ArXiv_search_papers`) `data/arxiv_tools.json:1-40 `.

<a id="g5-f005"></a>
### default_config.py maps a category key to its JSON file ( default_tool_files ), so loading…

`default_config.py:13-60` @ 9b7ff91

`default_config.py` maps a category key to its JSON file (`default_tool_files`), so loading is category-scoped rather than all-or-nothing `default_config.py:13-60 `.

## Skills, prompts, tools

<a id="g5-f006"></a>
### The engine ToolUniverse.run_one_function is the single dispatch path: resolve (possibly…

`execute_function.py:3006-3220` @ 9b7ff91

The engine `ToolUniverse.run_one_function` is the single dispatch path: resolve (possibly shortened) name -> optional cache lookup with a singleflight guard -> lenient type coercion + strip `None` args -> schema validation -> instantiate -> execute -> apply output hooks -> cache `execute_function.py:3006-3220 `.

<a id="g5-f007"></a>
### BaseTool.validate_parameters validates args with jsonschema and rewrites errors into…

`base_tool.py:181-260` @ 9b7ff91

`BaseTool.validate_parameters` validates args with `jsonschema` and rewrites errors into agent-friendly messages, including enum "Allowed values" hints and a case-variant "did you mean 'kinase_ID'?" suggestion for missing required props `base_tool.py:181-260 `.

<a id="g5-f008"></a>
### AgenticTool turns a JSON config's prompt template + input args into an LLM call,…

`agentic_tool.py:30-58` @ 9b7ff91

`AgenticTool` turns a JSON config's `prompt` template + input args into an LLM call, dispatching across Azure/OpenRouter/Gemini/vLLM clients by config — i.e. LLM-backed tools are declared as data, not code `agentic_tool.py:30-58,264-290 `.

<a id="g5-f009"></a>
### ~145 curated agent SKILL.md files ( skills/ ) encode domain reasoning over the tools, e.g

`skills/tooluniverse-admet-prediction/SKILL.md:9-56` @ 9b7ff91

~145 curated agent SKILL.md files (`skills/`) encode domain reasoning over the tools, e.g. the ADMET skill's "LOOK UP DON'T GUESS" / "COMPUTE, DON'T DESCRIBE" rules and a mandatory evidence-tier scorecard (T1 regulatory / T2 experimental / T3 prediction) `skills/tooluniverse-admet-prediction/SKILL.md:9-56 `.

## Patterns worth porting

<a id="g5-f010"></a>
### Config-declared tools + JSON-Schema contract as first-class citizen

The same schema drives validation, agent-facing error hints, and MCP tool annotations. Relevant to Halmos tool/skill manifests and `path@vN` provenance.

<a id="g5-f011"></a>
### Output hooks for large results

`output_hook.py:41-51` @ 9b7ff91

`SummarizationHook` routes oversized tool output through a Compose Summarizer tool (length-threshold `HookRule.evaluate`), degrading gracefully to the original result when the summarizer tool is absent `output_hook.py:41-51,296-330 `. A generic post-execution hook chain (`HookManager.apply_hooks`) is a clean seam for provenance capture.

<a id="g5-f012"></a>
### ComposeTool

`compose_tool.py:208-292` @ 9b7ff91

ComposeTool composes other tools via inline or external Python (`compose_scripts/`), auto-loading missing dependency tools and returning a structured `{status, error, missing_tools}` on failure `compose_tool.py:208-292 `.

<a id="g5-f013"></a>
### Fail-soft registry

`execute_function.py:3623-3660` @ 9b7ff91

`init_tool` never raises on a bad tool: it records the error via `mark_tool_unavailable` and *removes* the tool from all listing dicts so a missing optional dependency can't break the catalog `execute_function.py:3623-3660 `.

<a id="g5-f014"></a>
### Entry-point plugin discovery

`tool_registry.py:562-645` @ 9b7ff91

External packages declare `[project.entry-points."tooluniverse.plugins"]`; every `*.py` is imported (firing decorators) and `data/*.json` configs are absorbed — same layout as a local workspace, only a pyproject stanza extra `tool_registry.py:562-645 `.

## Open threads / weak spots

<a id="g5-f015"></a>
### Tool discovery relies on requests.get inside thin RESTful wrappers with print-based error…

`restful_tool.py:7-34` @ 9b7ff91

Tool discovery relies on `requests.get` inside thin RESTful wrappers with print-based error handling and boolean `False` sentinels, not the structured `ToolError` hierarchy — errors from these leak as `False`/dicts rather than classified exceptions `restful_tool.py:7-34 `.

<a id="g5-f016"></a>
### init_tool writes tracebacks to a hardcoded /tmp/tu_init_error.txt , which is a debugging…

`execute_function.py:3628-3633` @ 9b7ff91

`init_tool` writes tracebacks to a hardcoded `/tmp/tu_init_error.txt`, which is a debugging artifact left in the hot path `execute_function.py:3628-3633 `.

<a id="g5-f017"></a>
### Instantiation dispatch special-cases tool types by literal string lists (…

`execute_function.py:3581-3620` @ 9b7ff91

Instantiation dispatch special-cases tool types by literal string lists (`OpentargetToolDrugNameMatch`, `ToolFinder*`, `ComposeTool`, ...) to inject constructor deps — a growing if/elif that would benefit from a capability/DI declaration in config `execute_function.py:3581-3620 `.

<a id="g5-f018"></a>
### keep_default_tools merges caller tool_files over default_tool_files , so a category-key…

`execute_function.py:392-400` @ 9b7ff91

`keep_default_tools` merges caller `tool_files` over `default_tool_files`, so a category-key collision silently overrides a built-in category rather than erroring `execute_function.py:392-400 `.

