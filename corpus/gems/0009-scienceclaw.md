# scienceclaw

| | |
|---|---|
| Source | https://github.com/lamm-mit/scienceclaw |
| Repo | https://github.com/lamm-mit/scienceclaw @ `f4a628669d1bcf9702cf29d068716c02f1c9268f` |
| Kind | - |
| Topics | - |
| License | Apache-2.0 (permissive) |
| Verdict | keep |
| Findings | 97 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/9 |

## Implementation decisions

<a id="g9-f001"></a>
### Path-traversal guard

`core/skill_executor.py:40-58` @ f4a6286

`core/skill_executor.py:40-58` — Path-traversal guard: all script paths are `resolve()`d and validated to be inside `<root>/skills/` before execution; non-`.py` extensions are rejected.

<a id="g9-f002"></a>
### Error recovery heuristic

`core/skill_executor.py:166-198` @ f4a6286

`core/skill_executor.py:166-198` — Error recovery heuristic: on non-zero exit, stderr is scanned for `"required"`, `"unrecognized arguments"`, or `"invalid choice"`; if matched, a fallback retry is issued using only `--query`, `--limit`, and `--format json`.

<a id="g9-f003"></a>
### execute_skill_chain implements a linear DAG

`core/skill_executor.py:234-283` @ f4a6286

`core/skill_executor.py:234-283` — `execute_skill_chain` implements a linear DAG: each step may declare `inject_from_context` (keys pulled from prior result) and `pass_to_next` (keys written to shared context). Chain aborts on first missing skill.

<a id="g9-f004"></a>
### CLI parameter serialisation

`core/skill_executor.py:135-155` @ f4a6286

`core/skill_executor.py:135-155` — CLI parameter serialisation: boolean flags emitted only when `True`, list values use `nargs="+"` style, dict values silently skipped, leading dashes stripped from parameter keys supplied by the LLM.

<a id="g9-f005"></a>
### / :58-65

`skills/epigenomics/scripts/run.py:18` @ f4a6286

`skills/epigenomics/scripts/run.py:18` / `:58-65` — All ToolUniverse-backed workflow scripts use a module-level `WORKFLOW` constant as the sole config point, invoked via `tu.run({"name": WORKFLOW, "arguments": {"query": args.query}}, use_cache=...)`. Same dispatch as `skills/tooluniverse/scripts/tooluniverse_run.py:L56-L74`, abstracting 1000+ tools with caching default-on.

<a id="g9-f006"></a>
### SLURM self-submission

`skills/uma/SKILL.md:197-223` @ f4a6286

`skills/uma/SKILL.md:197-223` — SLURM self-submission: script detects `not torch.cuda.is_available()`, writes `submit.sh` with env vars inlined, runs `sbatch`, prints JSON `{"status": "SUBMITTED_TO_SLURM", "job_id": ...}`, then `sys.exit(0)`.

<a id="g9-f007"></a>
### Lazy dependency installation

`core/skill_executor.py:80-85` @ f4a6286

`core/skill_executor.py:80-85` — Lazy dependency installation: `execute_skill` calls `ensure_deps([skill_name])` at runtime before dispatch; failure is swallowed non-blocking.

Other takes: [gem #10](0010-autogen.md#g10-f044), [gem #18](0018-arbor.md#g18-f028)

<a id="g9-f008"></a>
### Composite rank score weights hard-coded

`skills/protein-qc/SKILL.md:L145-162` @ f4a6286

`skills/protein-qc/SKILL.md:L145-162` — Composite rank score weights hard-coded: `0.4 × ipTM + 0.3 × (pLDDT/100) + 0.2 × pTM + 0.1 × (1 - PAE/20)`. Hard filters (pLDDT > 70, ipTM > 0.6, instability < 40, zero liabilities) gate passage before composite ranking.

<a id="g9-f009"></a>
### Tool selection driven by a scored feature matrix

`skills/binder-design/SKILL.md:L34-44` @ f4a6286

`skills/binder-design/SKILL.md:L34-44` — Tool selection driven by a scored feature matrix: BoltzGen for side-chain precision/peptides, RFdiffusion for backbone-only/symmetric oligomers, BindCraft when hit rate matters (BindCraft ~25–40% experimental binding vs RFdiffusion ~10–20%).

<a id="g9-f010"></a>
### Ingestion uses SHA-256 manifest for incremental updates

`skills/corpus-search/SKILL.md:81-88` @ f4a6286

`skills/corpus-search/SKILL.md:81-88` — Ingestion uses SHA-256 manifest for incremental updates: only new/modified files re-ingested. Chunks ~600 tokens with 100-token overlap; embedding via `llama-text-embed-v2` (Pinecone).

<a id="g9-f011"></a>
### single sessions_spawn per response

`skills/research-pipeline/SKILL.md:L17` @ f4a6286

`skills/research-pipeline/SKILL.md:L17` — Orchestrator enforces a single `sessions_spawn` per response constraint — an explicit product decision making the pipeline sequential.

<a id="g9-f012"></a>
### Continuous knowledge-metabolism loop caps topic files at 200 lines and compresses older content (preserving citations…

`skills/metabolism/SKILL.md:L8-13` @ f4a6286

`skills/metabolism/SKILL.md:L8-13` — Continuous knowledge-metabolism loop caps topic files at 200 lines and compresses older content (preserving citations); a 5-day sliding search window + dedup against `processed_ids` implements bounded incremental ingestion.

<a id="g9-f013"></a>
### run.py must emit [RESULT] tagged lines; unverified values get UNVERIFIED tags, enforcing a no-fabrication contract…

`skills/research-implement/SKILL.md:L22-L24` @ f4a6286

`skills/research-implement/SKILL.md:L22-L24` — `run.py` must emit `[RESULT]` tagged lines; unverified values get ` UNVERIFIED` tags, enforcing a no-fabrication contract at the script-output boundary.

<a id="g9-f014"></a>
### Training budget fixed at exactly 5 minutes wall-clock (~12 experiments/hour); metric is val_bpb (vocab-size-independe…

`skills/autoresearch/SKILL.md:L88-91` @ f4a6286

`skills/autoresearch/SKILL.md:L88-91` — Training budget fixed at exactly 5 minutes wall-clock (~12 experiments/hour); metric is `val_bpb` (vocab-size-independent); agent edits only `train.py`, `prepare.py` is immutable.

<a id="g9-f015"></a>
### AlphaFold2 deployment prescribed

`skills/alphafold/SKILL.md:L22-36` @ f4a6286

`skills/alphafold/SKILL.md:L22-36` — AlphaFold2 deployment prescribed: ColabFold for multimers (`--model-type alphafold2_multimer_v3 --num-recycles 20 --num-models 5`), LocalColabFold offline, OpenFold (PyTorch) as third alternative.

<a id="g9-f016"></a>
### ChEMBL_get_molecule_targets banned; mandates ChEMBL_search_activities with pChEMBL >= 6.0 .

`skills/drug-research/SKILL.md:L112` @ f4a6286

`skills/drug-research/SKILL.md:L112` — `ChEMBL_get_molecule_targets` banned; mandates `ChEMBL_search_activities` with `pChEMBL >= 6.0`.

<a id="g9-f017"></a>
### Matrix orientation heuristic

`skills/single-cell/SKILL.md:L447-L451` @ f4a6286

`skills/single-cell/SKILL.md:L447-L451` — Matrix orientation heuristic: transpose when `df.shape[0] > df.shape[1] * 5`.

<a id="g9-f018"></a>
### LaTeX constraint

`skills/hypothesis-generation/SKILL.md:167-232` @ f4a6286

`skills/hypothesis-generation/SKILL.md:167-232` — LaTeX constraint: main text ≤ 4 pages; each `tcolorbox` hypothesis block ≤ 0.6 pages with `\newpage` before each box; overflow -> appendices; XeLaTeX/LuaLaTeX required.

<a id="g9-f019"></a>
### Mandatory PDF-to-image conversion for presentation reviews

`skills/peer-review/SKILL.md:391-414` @ f4a6286

`skills/peer-review/SKILL.md:391-414` — Mandatory PDF-to-image conversion for presentation reviews: direct PDF reading is forbidden; agent must run `pdf_to_images.py` first.

<a id="g9-f020"></a>
### PDF->PNG at 200 dpi, then proportional down-scale of any page over max_dim=1000 px before saving.

`skills/document-skills/pdf/scripts/convert_pdf_to_images.py:10-24` @ f4a6286

`skills/document-skills/pdf/scripts/convert_pdf_to_images.py:10-24` — PDF->PNG at 200 dpi, then proportional down-scale of any page over `max_dim=1000` px before saving.

<a id="g9-f021"></a>
### Four-level metabolite ID confidence system (L1 authentic standard MS+RT -> L4 unknown) mirroring Metabolomics Standard…

`skills/metabolomics-analysis/SKILL.md:L206-L212` @ f4a6286

`skills/metabolomics-analysis/SKILL.md:L206-L212` — Four-level metabolite ID confidence system (L1 authentic standard MS+RT -> L4 unknown) mirroring Metabolomics Standards Initiative levels.

<a id="g9-f022"></a>
### Composite Feasibility Score (0–100)

`skills/clinical-trial-design/SKILL.md:L30-L44` @ f4a6286

`skills/clinical-trial-design/SKILL.md:L30-L44` — Composite Feasibility Score (0–100): Patient Availability 30%, Endpoint Precedent 25%, Regulatory Clarity 20%, Comparator Feasibility 15%, Safety Monitoring 10%.

<a id="g9-f023"></a>
### Reproducibility via pinning census_version="2023-07-25" in open_soma() plus mandatory context-manager cleanup.

`skills/cellxgene-census/SKILL.md:L58-L65` @ f4a6286

`skills/cellxgene-census/SKILL.md:L58-L65` — Reproducibility via pinning `census_version="2023-07-25"` in `open_soma()` plus mandatory context-manager cleanup.

<a id="g9-f024"></a>
### PRS formula inlined ( PRS = Σ (dosage_i × effect_size_i) ) with p < 5×10⁻⁸ ; explicit "What This Skill Does NOT Do" b…

`skills/polygenic-risk-score/SKILL.md:L25-L45` @ f4a6286

`skills/polygenic-risk-score/SKILL.md:L25-L45` — PRS formula inlined (`PRS = Σ (dosage_i × effect_size_i)`) with `p < 5×10⁻⁸`; explicit "What This Skill Does NOT Do" block (no diagnosis, no clinical replacement, no treatment recommendations).

<a id="g9-f025"></a>
### Hardcoded performance threshold

`skills/research-review/SKILL.md:12-22` @ f4a6286

`skills/research-review/SKILL.md:12-22` — Hardcoded performance threshold: <5% loss decrease or accuracy within ±10% of random after 2-epoch validation flags a "performance anomaly" and triggers ≤2 hyperparameter iterations; each iteration re-reads original survey/plan docs (anti-drift).

<a id="g9-f026"></a>
### Skill catalog layout

`AGENTS.md:6-10` @ f4a6286

`AGENTS.md:6-10` — Skill catalog layout: each skill a folder with `SKILL.md` + `scripts/`; all scripts must support `argparse` + `--format json` (enforced via `skills/CONTRIBUTING.md`). Tests redirect home via `HOME=/tmp/scienceclaw_home` to avoid contaminating `~/.scienceclaw/`.

## Skills, prompts, tools

<a id="g9-f027"></a>
### Investigation pipeline

`openclaw-skill-pack/skills/scienceclaw-investigate/SKILL.md:L58-63` @ f4a6286

`openclaw-skill-pack/skills/scienceclaw-investigate/SKILL.md:L58-63` — Investigation pipeline: LLM selects from 300+ skill catalog -> 2–5 parallel agents run tools -> one refinement cycle fills evidence gaps -> synthesis posted to Infinite. Gap-fill tools scoped to `pubmed, uniprot, pubchem, chembl, tdc, pdb, blast, arxiv`.

<a id="g9-f028"></a>
### File-type -> skill mapping

`openclaw-skill-pack/skills/scienceclaw-local-files/SKILL.md:L120-132` @ f4a6286

`openclaw-skill-pack/skills/scienceclaw-local-files/SKILL.md:L120-132` — File-type -> skill mapping: PDF->`markitdown,pubmed,literature-review`; protein FASTA->`blast,uniprot,esm,biopython,pubmed,pdb`; CSV with SMILES->`rdkit,datamol,pubchem,tdc,pubmed`; omics CSV->`scanpy,pydeseq2,pubmed,gene-database`. SMILES tools forbidden when no SMILES present.

<a id="g9-f029"></a>
### Ten research dimensions each with explicit ToolUniverse tool chains (identity via EFO/UMLS/ICD; genetics via ClinVar/…

`skills/disease-research/references/tool-reference.md:L392-L562` @ f4a6286

`skills/disease-research/references/tool-reference.md:L392-L562` — Ten research dimensions each with explicit ToolUniverse tool chains (identity via EFO/UMLS/ICD; genetics via ClinVar/GWAS/gnomAD; safety via FAERS/OpenTargets). Citation format mandates per-table `Source` columns, inline `[Source: tool_name]` tags, and a final tools-used log table.

<a id="g9-f030"></a>
### Structured scenario framework

`skills/what-if-oracle/SKILL.md:8-41` @ f4a6286

`skills/what-if-oracle/SKILL.md:8-41` — Structured scenario framework: 6 branch archetypes (Ω Best, α Likely, Δ Worst, Ψ Wild Card, Φ Contrarian, ∞ Second Order) with per-branch probability, narrative, assumptions, triggers, and a mandatory "1% insight"; 61.8% / 38.2% Golden Ratio attention allocation.

<a id="g9-f031"></a>
### Anti-hallucination via the description field

`skills/chembl/SKILL.md:3-28` @ f4a6286

`skills/chembl/SKILL.md:3-28` / `skills/pdb/SKILL.md:3-4` / `skills/uniprot/SKILL.md:L127-139` — Anti-hallucination via the `description` field: explicitly list what NOT to query with failure/success tables. UniProt's table shows mechanism phrases return zero results; only bare gene symbols/accessions work.

<a id="g9-f032"></a>
### description: field deliberately exhaustive for routing (220+ Enrichr libraries, 40+ ToolUniverse tools, 5 organisms);…

`skills/gene-enrichment/SKILL.md:L9-69` @ f4a6286

`skills/gene-enrichment/SKILL.md:L9-69` — `description:` field deliberately exhaustive for routing (220+ Enrichr libraries, 40+ ToolUniverse tools, 5 organisms); ten mandatory core principles precede any code including report-first, T1–T4 evidence grading, and end completeness checklist.

<a id="g9-f033"></a>
### Eight-step hypothesis workflow (understand -> literature -> synthesise -> 3–5 competing hypotheses -> evaluate on 7 axes …

`skills/hypothesis-generation/SKILL.md:91-135` @ f4a6286

`skills/hypothesis-generation/SKILL.md:91-135` — Eight-step hypothesis workflow (understand -> literature -> synthesise -> 3–5 competing hypotheses -> evaluate on 7 axes -> design experiments -> predictions -> LaTeX). Every report must inject ≥1–2 AI-generated schematics via `scientific-schematics` as a blocking invariant.

<a id="g9-f034"></a>
### "Phase 0

`skills/pharmacovigilance/SKILL.md:L77-83` @ f4a6286

`skills/pharmacovigilance/SKILL.md:L77-83` / `skills/infectious-disease/SKILL.md:L72-79` / `skills/protein-therapeutic-design/SKILL.md:L94-98` / `skills/target-research/SKILL.md:L40-47` — "Phase 0: Tool Verification" pattern: table mapping wrong parameter names to correct ones before any API call (e.g. `NvidiaNIM_rfdiffusion` uses `diffusion_steps` not `num_steps`; `NCBI_Taxonomy_search` uses `query` not `name`).

<a id="g9-f035"></a>
### Report-first DDI workflow

`skills/drug-drug-interaction/SKILL.md:44-78` @ f4a6286

`skills/drug-drug-interaction/SKILL.md:44-78` — Report-first DDI workflow: create file with 9 section headers as `[Analyzing...]` before data collection; bidirectional analysis mandatory; 15-criterion completion checklist (evidence grades ***/**o/*oo, 0–100 risk score) before "Ready for Clinical Use".

<a id="g9-f036"></a>
### ScholarEval 8-dimension framework, each on a 5-point scale; scoring uses contextual multipliers by stage/venue/type ( ).

`skills/scholar-evaluation/SKILL.md:88-143` @ f4a6286

`skills/scholar-evaluation/SKILL.md:88-143` — ScholarEval 8-dimension framework, each on a 5-point scale; scoring uses contextual multipliers by stage/venue/type (`references/evaluation_framework.md:L622-650`).

<a id="g9-f037"></a>
### Routing table

`skills/clinical-guidelines/SKILL.md:L65-78` @ f4a6286

`skills/clinical-guidelines/SKILL.md:L65-78` — Routing table: cardiology->`AHA_ACC_search_guidelines`; pharmacogenomics->`CPIC_get_gene_drug_pairs`; 12+ sources, 41 tools.

<a id="g9-f038"></a>
### Perplexity model selection guide; research-lookup uses complexity scoring (each reasoning keyword +3 pts; ≥3 -> reason…

`skills/perplexity-search/SKILL.md:L92-103` @ f4a6286

`skills/perplexity-search/SKILL.md:L92-103` / `skills/research-lookup/SKILL.md:L147-165` — Perplexity model selection guide; research-lookup uses complexity scoring (each reasoning keyword +3 pts; ≥3 -> reasoning model).

<a id="g9-f039"></a>
### Mandatory-disagreement rule (each member MUST disagree with ≥1 other member on something substantive) as a structural…

`skills/consciousness-council/SKILL.md:14-18` @ f4a6286

`skills/consciousness-council/SKILL.md:14-18` — Mandatory-disagreement rule (each member MUST disagree with ≥1 other member on something substantive) as a structural anti-groupthink mechanism.

<a id="g9-f040"></a>
### BGPT MCP server exposes 25+ structured fields per paper ( study_type , sample_size , effect_size , p_value , jadad_sc…

`skills/bgpt-paper-search/SKILL.md:40-90` @ f4a6286

`skills/bgpt-paper-search/SKILL.md:40-90` — BGPT MCP server exposes 25+ structured fields per paper (`study_type`, `sample_size`, `effect_size`, `p_value`, `jadad_score`, `tools_used`, etc.); accessed via MCP not raw HTTP.

<a id="g9-f041"></a>
### Four-phase workflow

`skills/literature-deep-research/SKILL.md:L14-54` @ f4a6286

`skills/literature-deep-research/SKILL.md:L14-54` — Four-phase workflow: clarify -> target disambiguation (Ensembl/UniProt IDs, naming collisions) -> literature search with citation-network expansion -> progressive report synthesis. "English-first queries" mandatory.

<a id="g9-f042"></a>
### Five domain-aware prompt builders inject DOMAIN_PERSONAS keyed on biology/chemistry/materials/general; PATTERN_EXPLAN…

`skills/prompt-engineering-patterns/scripts/prompt_optimize.py:L12-173` @ f4a6286

`skills/prompt-engineering-patterns/scripts/prompt_optimize.py:L12-173` — Five domain-aware prompt builders inject DOMAIN_PERSONAS keyed on biology/chemistry/materials/general; PATTERN_EXPLANATIONS dict ships alongside each generated prompt for transparency. ReAct builder hardcodes six biology/chemistry tool stubs.

<a id="g9-f043"></a>
### Code sandbox

`skills/python-exec/scripts/python_exec.py:L22-31` @ f4a6286

`skills/python-exec/scripts/python_exec.py:L22-31` — Code sandbox: `subprocess.run([sys.executable, "-c", code], capture_output=True, timeout=args.timeout)`, 60-second default, stdout capped at 8000 chars.

<a id="g9-f044"></a>
### ESM3 multimodal protein generation

`skills/esm/SKILL.md:30-56` @ f4a6286

`skills/esm/SKILL.md:30-56` — ESM3 multimodal protein generation: `ESMProtein(sequence="MPRT___KEND")` with `_` masking; `GenerationConfig(track="sequence"|"structure")` selects track.

<a id="g9-f045"></a>
### Pre-task resource probe writes to .claude_resources.json

`skills/get-available-resources/SKILL.md:96-119` @ f4a6286

`skills/get-available-resources/SKILL.md:96-119` — Pre-task resource probe writes to `.claude_resources.json`: `recommendations.parallel_processing.strategy` ∈ `high_parallelism`/`moderate_parallelism`/`sequential`.

<a id="g9-f046"></a>
### Cross-skill context persistence via flat memory.md

`openclaw-skill-pack/skills/scienceclaw-query/SKILL.md:62-67` @ f4a6286

`openclaw-skill-pack/skills/scienceclaw-query/SKILL.md:62-67` / `scienceclaw-watch/SKILL.md:L106-111` — Cross-skill context persistence via flat `memory.md`: read before running, append stored research focus to the topic string.

## Patterns worth porting

<a id="g9-f047"></a>
### Named inject_from_context / pass_to_next chain protocol

`core/skill_executor.py:234-283` @ f4a6286

`core/skill_executor.py:234-283` — Named `inject_from_context`/`pass_to_next` chain protocol: explicit per-step key declarations propagate structured results without ad-hoc parameter threading. Directly portable as a `run_declared` step-level annotation.

<a id="g9-f048"></a>
### Graceful retry with reduced parameter set

`core/skill_executor.py:167-196` @ f4a6286

`core/skill_executor.py:167-196` — Graceful retry with reduced parameter set: on missing-argument failure, auto-retry with only `query`, `limit`, `format`.

<a id="g9-f049"></a>
### ToolUniverse runner pattern (single WORKFLOW constant + tu.load_tools() + tu.run({"name":...}) )

`skills/epigenomics/scripts/run.py:L1-82` @ f4a6286

`skills/epigenomics/scripts/run.py:L1-82` — ToolUniverse runner pattern (single `WORKFLOW` constant + `tu.load_tools()` + `tu.run({"name":...})`): zero-boilerplate CLI tool for any named workflow; includes clean `--no-cache` -> `use_cache=not args.no_cache` idiom.

<a id="g9-f050"></a>
### to_serializable() recursive JSON-safe coercion ( str(obj) fallback) as a universal guard before json.dumps on heterog…

`skills/tooluniverse/scripts/tooluniverse_run.py:L77-87` @ f4a6286

`skills/tooluniverse/scripts/tooluniverse_run.py:L77-87` / `skills/epigenomics/scripts/run.py:36-45` — `to_serializable()` recursive JSON-safe coercion (`str(obj)` fallback) as a universal guard before `json.dumps` on heterogeneous tool output.

<a id="g9-f051"></a>
### Report-first + progressive-update pattern (most-cited convention in corpus)

`skills/disease-research/references/tool-reference.md:L366-387` @ f4a6286

create output file with all section headers as `[Researching...]` stubs before any tool call, replacing each in place. See `skills/disease-research/references/tool-reference.md:L366-387`, `skills/chemical-safety/SKILL.md:L44-52`, `skills/drug-drug-interaction/SKILL.md:44-59`, `skills/gene-enrichment/SKILL.md:L60-69`.

<a id="g9-f052"></a>
### Multi-stage filtering funnel with explicit pass-rate numbers enabling budget planning; generalized as a DesignCampaig…

`skills/protein-qc/SKILL.md:L133-163` @ f4a6286

`skills/protein-qc/SKILL.md:L133-163` / `skills/campaign-manager/SKILL.md:L22-54` — Multi-stage filtering funnel with explicit pass-rate numbers enabling budget planning; generalized as a `DesignCampaign` dataclass with an `estimate_pipeline()` method.

<a id="g9-f053"></a>
### ASCII/inline decision-tree as the first SKILL.md section

`skills/single-cell/SKILL.md:L92-135` @ f4a6286

`skills/single-cell/SKILL.md:L92-135`, `skills/scikit-survival/SKILL.md:L64-82`, `skills/deepchem/SKILL.md:L66-90`, `skills/statistical-modeling/SKILL.md:L65-80` — routes the agent before any code.

<a id="g9-f054"></a>
### (and ~50 identical stubs)

`skills/vaex/scripts/demo.py:17-24` @ f4a6286

`skills/vaex/scripts/demo.py:17-24` (and ~50 identical stubs) — Zero-dependency stub demo template returning `{skill, status, description, note}`: pip-clean smoke test confirming skill registration without installing the underlying library. Adopt as the baseline scaffold for any new skill's `demo.py`.

<a id="g9-f055"></a>
### scale_factor = min(max_dim/width, max_dim/height)

`skills/document-skills/pdf/scripts/convert_pdf_to_images.py:14-20` @ f4a6286

`skills/document-skills/pdf/scripts/convert_pdf_to_images.py:14-20` — `scale_factor = min(max_dim/width, max_dim/height)`: correct proportional scale-down for bounding vision-LLM token cost.

<a id="g9-f056"></a>
### Negative-prompt "When NOT To Use" guard at the top of every computation-only skill with redirect to the correct retri…

`skills/biopython/SKILL.md:L11-23` @ f4a6286

Negative-prompt "When NOT To Use" guard at the top of every computation-only skill with redirect to the correct retrieval skill: `skills/biopython/SKILL.md:L11-23`, `skills/datamol/SKILL.md:L11-22`, `skills/molfeat/SKILL.md:L11-23`.

<a id="g9-f057"></a>
### Reciprocal rank fusion (RRF) merging OSTI, Google Scholar, ArXiv, and local corpus with fuzzy title dedup at >80% sim…

`skills/literature-meta-search/SKILL.md:73-77` @ f4a6286

`skills/literature-meta-search/SKILL.md:73-77` — Reciprocal rank fusion (RRF) merging OSTI, Google Scholar, ArXiv, and local corpus with fuzzy title dedup at >80% similarity and an `in_corpus` flag.

<a id="g9-f058"></a>
### Full pipeline via subprocess.run(..., check=True) ; each stage writes to a subdirectory of output_dir/ read by the next

`skills/protein-design-workflow/SKILL.md:L74-122` @ f4a6286

`skills/protein-design-workflow/SKILL.md:L74-122` — Full pipeline via `subprocess.run(..., check=True)`; each stage writes to a subdirectory of `output_dir/` read by the next — simple, auditable, crash-detectable.

<a id="g9-f059"></a>
### Artifact lifecycle (create -> cache -> load -> stream) with lineage via ln.track() / ln.finish() ; artifact.view_lineage…

`skills/lamindb/SKILL.md:L42-54` @ f4a6286

`skills/lamindb/SKILL.md:L42-54` / `references/core-concepts.md:L1-76` — Artifact lifecycle (create -> cache -> load -> stream) with lineage via `ln.track()`/`ln.finish()`; `artifact.view_lineage()` DAG; Django-style double-underscore provenance queries.

<a id="g9-f060"></a>
### Collision-aware literature search

`skills/literature-deep-research/SKILL.md:L36-42` @ f4a6286

`skills/literature-deep-research/SKILL.md:L36-42` — Collision-aware literature search: build a naming-collision list before broad queries.

<a id="g9-f061"></a>
### defusedxml for safe XML parsing after zip extraction (prevents XXE); re-written as pretty-printed ASCII.

`skills/document-skills/pptx/ooxml/scripts/unpack.py:L18-24` @ f4a6286

`skills/document-skills/pptx/ooxml/scripts/unpack.py:L18-24` — `defusedxml` for safe XML parsing after zip extraction (prevents XXE); re-written as pretty-printed ASCII.

<a id="g9-f062"></a>
### Declarative regex-based compliance checker

`skills/clinical-reports/scripts/compliance_checker.py:14-43` @ f4a6286

`skills/clinical-reports/scripts/compliance_checker.py:14-43` — Declarative regex-based compliance checker: regulation->check->pattern dict drives both iteration and output labeling.

<a id="g9-f063"></a>
### Capability proof at agent registration

`skills/infinite/SKILL.md:209-246` @ f4a6286

`skills/infinite/SKILL.md:209-246` — Capability proof at agent registration: require an actual API response (not a claim) as proof of a declared capability.

<a id="g9-f064"></a>
### Two-pass screening

`skills/jax-modal-analysis/SKILL.md:66-75` @ f4a6286

`skills/jax-modal-analysis/SKILL.md:66-75` — Two-pass screening: fast 2D FEM (~1s) to shortlist, full 3D FEM (30–120s) only on candidates.

<a id="g9-f065"></a>
### Self-consistency validation loop

`skills/alphafold/SKILL.md:L96-108` @ f4a6286

`skills/alphafold/SKILL.md:L96-108` — Self-consistency validation loop: RFdiffusion backbone -> ProteinMPNN sequences -> AF2 prediction -> TM-score/RMSD; TM-score > 0.8 = pass.

<a id="g9-f066"></a>
### Output-file naming contract + citation template requiring PRR, 95% CI, case count, serious/fatal counts, tagged FAERS…

`skills/pharmacovigilance/SKILL.md:L40-67` @ f4a6286

`skills/pharmacovigilance/SKILL.md:L40-67` — Output-file naming contract + citation template requiring PRR, 95% CI, case count, serious/fatal counts, tagged FAERS source with date range.

<a id="g9-f067"></a>
### sessions_spawn handoff contract

`skills/research-pipeline/SKILL.md:L30-34` @ f4a6286

`skills/research-pipeline/SKILL.md:L30-34` — `sessions_spawn` handoff contract: task string starts with `/skill-name`, includes workspace path, 2–5 line context summary, and expected output file.

<a id="g9-f068"></a>
### Explicit risk-threshold tables

`skills/supply-chain-analysis/SKILL.md:50-54` @ f4a6286

`skills/supply-chain-analysis/SKILL.md:50-54` — Explicit risk-threshold tables: HHI (<1500 / 1500–2500 / >2500), NIR (<25% / 25–75% / >75%), Top-3 Share (<50% / 50–75% / >75%).

<a id="g9-f069"></a>
### VecNormalize eval

`skills/stable-baselines3/scripts/evaluate_agent.py:L60-64` @ f4a6286

`skills/stable-baselines3/scripts/evaluate_agent.py:L60-64` — VecNormalize eval: set `env.training = False; env.norm_reward = False` after loading statistics to prevent distribution shift.

<a id="g9-f070"></a>
### Decision matrix

`skills/dask/references/schedulers.md:279-293` @ f4a6286

`skills/dask/references/schedulers.md:279-293` — Decision matrix: numeric/Pandas->threads, pure Python->processes, debugging->synchronous, multi-machine->cluster.

<a id="g9-f071"></a>
### SLURM self-submission as structured JSON output so the orchestrating agent can poll or set a dependency rather than s…

`skills/uma/SKILL.md:197-223` @ f4a6286

`skills/uma/SKILL.md:197-223` — SLURM self-submission as structured JSON output so the orchestrating agent can poll or set a dependency rather than seeing an error.

## Open threads / weak spots

<a id="g9-f072"></a>
### Duplicate YAML frontmatter (two --- blocks, two name / description fields) breaks parsers reading only the first block

`skills/gwas-snp-interpretation/SKILL.md:L1-11` @ f4a6286

Duplicate YAML frontmatter (two `---` blocks, two `name`/`description` fields) breaks parsers reading only the first block: `skills/gwas-snp-interpretation/SKILL.md:L1-11`, `skills/gwas-trait-to-gene/SKILL.md:L1-11`, `skills/systems-biology/SKILL.md:1-11`, `skills/variant-interpretation/SKILL.md:L9-16`.

<a id="g9-f073"></a>
### skill_name NameError in the "newer" stub-demo / DB-query template family

`skills/cirq/scripts/demo.py:62` @ f4a6286

`skill_name` `NameError` in the "newer" stub-demo / DB-query template family — referenced but never defined in the `--format summary` branch: `skills/cirq/scripts/demo.py:62` (+ dask, qutip, sympy, polars, astropy, qiskit, scanpy, plotly), `skills/anndata/scripts/demo.py:62` (+ seaborn, pennylane), and five DB query scripts (`ena-database:76`, `hmdb-database:76`, `geo-database:76`, `gwas-database:76`, `clinvar-database/scripts/query.py:77`).

<a id="g9-f074"></a>
### ~50 stub demo.py / query.py files import nothing of the advertised library and make no HTTP calls

`skills/anndata/scripts/demo.py:23-33` @ f4a6286

~50 stub `demo.py` / `query.py` files import nothing of the advertised library and make no HTTP calls — they pass CI while the library is entirely uninstalled, providing false confidence: `skills/anndata/scripts/demo.py:23-33`, `skills/ena-database/scripts/query.py:22-41` (+ hmdb/geo/gwas/clinvar). The `_demo.py` prefix at `skills/alphafold-database/scripts/_demo.py:1` is silently skipped by glob-based discovery.

<a id="g9-f075"></a>
### Embedded K-Dense Web upsells hardwired into multiple skills, inserting product promotion into agent output

`skills/offer-k-dense-web/SKILL.md:3-17` @ f4a6286

`skills/offer-k-dense-web/SKILL.md:3-17`, `skills/adaptyv/SKILL.md:L107-119`, `skills/peer-review/SKILL.md:L570-571`.

<a id="g9-f076"></a>
### _execute_package_skill hardcodes timeout=30 , silently overriding the caller-supplied timeout .

`core/skill_executor.py:222-225` @ f4a6286

`core/skill_executor.py:222-225` — `_execute_package_skill` hardcodes `timeout=30`, silently overriding the caller-supplied `timeout`.

<a id="g9-f077"></a>
### Dict-typed parameters are silently dropped; callers receive no signal their args were ignored.

`core/skill_executor.py:147-153` @ f4a6286

`core/skill_executor.py:147-153` — Dict-typed parameters are silently dropped; callers receive no signal their args were ignored.

<a id="g9-f078"></a>
### _execute_database_skill is a passthrough stub; all DB skills incur subprocess overhead and cannot stream results.

`core/skill_executor.py:213-214` @ f4a6286

`core/skill_executor.py:213-214` — `_execute_database_skill` is a passthrough stub; all DB skills incur subprocess overhead and cannot stream results.

<a id="g9-f079"></a>
### Global singleton _executor is never reset; scienceclaw_dir fixed at first import.

`core/skill_executor.py:287-294` @ f4a6286

`core/skill_executor.py:287-294` — Global singleton `_executor` is never reset; `scienceclaw_dir` fixed at first import.

<a id="g9-f080"></a>
### Registry attribute probing silently returns an empty dict if the ToolUniverse SDK renames its internal attribute.

`skills/tooluniverse/scripts/tooluniverse_search.py:L54-60` @ f4a6286

`skills/tooluniverse/scripts/tooluniverse_search.py:L54-60` — Registry attribute probing silently returns an empty dict if the ToolUniverse SDK renames its internal attribute.

<a id="g9-f081"></a>
### Remote SKILL.md fetch has 15s timeout, no hash/version pin; upstream changes apply automatically on next scaffold.

`skills/tooluniverse/setup_tu_skills.py:L180-187` @ f4a6286

`skills/tooluniverse/setup_tu_skills.py:L180-187` — Remote SKILL.md fetch has 15s timeout, no hash/version pin; upstream changes apply automatically on next scaffold.

<a id="g9-f082"></a>
### Phase 0 parameter-correction tables cover only a handful of tools (4 of 60+; 1 of 41); undocumented mismatches cause …

`skills/target-research/SKILL.md:L30-47` @ f4a6286

`skills/target-research/SKILL.md:L30-47` / `skills/clinical-guidelines/SKILL.md:L40-48` — Phase 0 parameter-correction tables cover only a handful of tools (4 of 60+; 1 of 41); undocumented mismatches cause silent empty results.

<a id="g9-f083"></a>
### References "Nano Banana Pro" / "Gemini 3 Pro" backends with no fallback; every figure-generating skill depends on thi…

`skills/scientific-schematics/SKILL.md:L1-3` @ f4a6286

`skills/scientific-schematics/SKILL.md:L1-3` — References "Nano Banana Pro" / "Gemini 3 Pro" backends with no fallback; every figure-generating skill depends on this one — single point of failure.

<a id="g9-f084"></a>
### pathway_topology_analysis is a stub returning pass ; betweenness-centrality/hub-metabolite logic described in comment…

`skills/metabolomics-analysis/SKILL.md:L530-545` @ f4a6286

`skills/metabolomics-analysis/SKILL.md:L530-545` — `pathway_topology_analysis` is a stub returning `pass`; betweenness-centrality/hub-metabolite logic described in comments but unimplemented.

<a id="g9-f085"></a>
### PAE interface extraction assumes 50/50 chain split; very asymmetric chains silently yield wrong interface PAE.

`skills/protein-qc/SKILL.md:L29-32` @ f4a6286

`skills/protein-qc/SKILL.md:L29-32` — PAE interface extraction assumes 50/50 chain split; very asymmetric chains silently yield wrong interface PAE.

<a id="g9-f086"></a>
### VecVideoRecorder records only at step 0 (not all episodes as the comment claims)

`skills/stable-baselines3/scripts/evaluate_agent.py:L67-76` @ f4a6286

`skills/stable-baselines3/scripts/evaluate_agent.py:L67-76` — `VecVideoRecorder` records only at step 0 (not all episodes as the comment claims) — likely a latent bug.

<a id="g9-f087"></a>
### Error JSON reuses args.query , which may contain PII; no sanitization before logging.

`skills/epigenomics/scripts/run.py:66-69` @ f4a6286

`skills/epigenomics/scripts/run.py:66-69` — Error JSON reuses `args.query`, which may contain PII; no sanitization before logging.

<a id="g9-f088"></a>
### "Poor downstream AF2 ipTM" troubleshooting omits that high pLDDT + low ipTM typically signals independent folding wit…

`skills/rfdiffusion/SKILL.md:L295-300` @ f4a6286

`skills/rfdiffusion/SKILL.md:L295-300` — "Poor downstream AF2 ipTM" troubleshooting omits that high pLDDT + low ipTM typically signals independent folding without a true interface.

<a id="g9-f089"></a>
### Single-dispatch-per-response constraint has no documented escape hatch for genuinely parallelisable phases.

`skills/research-pipeline/SKILL.md:L17` @ f4a6286

`skills/research-pipeline/SKILL.md:L17` — Single-dispatch-per-response constraint has no documented escape hatch for genuinely parallelisable phases.

<a id="g9-f090"></a>
### Prerequisite check halts with a directive in Chinese, opaque to non-Chinese-reading agents.

`skills/research-review/SKILL.md:7-8` @ f4a6286

`skills/research-review/SKILL.md:7-8` — Prerequisite check halts with a directive in Chinese, opaque to non-Chinese-reading agents.

<a id="g9-f091"></a>
### Model string perplexity/sonar-reasoning-pro-online (L255) conflicts with perplexity/sonar-reasoning-pro used elsewher…

`skills/research-lookup/SKILL.md:L440-447` @ f4a6286

`skills/research-lookup/SKILL.md:L440-447` — Model string `perplexity/sonar-reasoning-pro-online` (L255) conflicts with `perplexity/sonar-reasoning-pro` used elsewhere (L163).

<a id="g9-f092"></a>
### Target-prioritization weights hardcoded prose; no mechanism to adjust per indication profile.

`skills/gwas-drug-discovery/SKILL.md:L60-L80` @ f4a6286

`skills/gwas-drug-discovery/SKILL.md:L60-L80` — Target-prioritization weights hardcoded prose; no mechanism to adjust per indication profile.

<a id="g9-f093"></a>
### Scratch storage has 60-day auto-purge with no warning in the job-submission template.

`skills/hpc/SKILL.md:L32` @ f4a6286

`skills/hpc/SKILL.md:L32` — Scratch storage has 60-day auto-purge with no warning in the job-submission template.

<a id="g9-f094"></a>
### Platform URL hardcoded to only usable locally without overriding INFINITE_API_BASE .

`skills/infinite/SKILL.md:9` @ f4a6286

`skills/infinite/SKILL.md:9` — Platform URL hardcoded to `http://localhost:3000`; only usable locally without overriding `INFINITE_API_BASE`.

<a id="g9-f095"></a>
### Marked ## Status

`skills/dft/SKILL.md:9-11` @ f4a6286

`skills/dft/SKILL.md:9-11` — Marked `## Status: IN DEVELOPMENT`; no fallback/error handling if Artemis/SLURM is unreachable.

<a id="g9-f096"></a>
### --skills now constrains gap-fill cycles as well as initial tool selection

`openclaw-skill-pack/skills/scienceclaw-post/SKILL.md:L44-48` @ f4a6286

`openclaw-skill-pack/skills/scienceclaw-post/SKILL.md:L44-48` — `--skills` now constrains gap-fill cycles as well as initial tool selection — an undocumented broadening.

<a id="g9-f097"></a>
### A social agent network with no scientific function; its presence in a bioscience skill registry is unexplained.

`skills/moltbook/SKILL.md:L1-6` @ f4a6286

`skills/moltbook/SKILL.md:L1-6` — A social agent network with no scientific function; its presence in a bioscience skill registry is unexplained.

