# AutoResearchClaw

| | |
|---|---|
| Source | https://github.com/aiming-lab/AutoResearchClaw |
| Repo | https://github.com/aiming-lab/AutoResearchClaw @ `ea77ec19fefe9198ac1364d2cdb4f9e928cf0705` |
| Kind | repo |
| Topics | agent, research |
| License | MIT (permissive) |
| Verdict | - |
| Findings | 86 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/19 |

## Implementation decisions

<a id="g19-f001"></a>
### Each skill card carries trigger-keywords and applicable-stages in YAML frontmatter; the harness injects only skills m…

`researchclaw/skills/builtin/tooling/data-loading/SKILL.md:6-7` @ ea77ec1

`researchclaw/skills/builtin/tooling/data-loading/SKILL.md:6-7` + `researchclaw/skills/builtin/experiment/systematic-review/SKILL.md:6` — Each skill card carries `trigger-keywords` and `applicable-stages` in YAML frontmatter; the harness injects only skills matching the current stage number and task keywords, keeping context lean. Two independent workers confirmed the same mechanism across tooling and experiment skills.

<a id="g19-f002"></a>
### Pipeline blocks at Step 0 if target or assumptions are undefined, enforcing formulation-first discipline before any c…

`external/agents/stat_research_agent/skills/stat-research-orchestrator/SKILL.md:54` @ ea77ec1

`external/agents/stat_research_agent/skills/stat-research-orchestrator/SKILL.md:54` — Pipeline blocks at Step 0 if target or assumptions are undefined, enforcing formulation-first discipline before any code is written — an explicit guard against the common failure of code-first research pipelines.

<a id="g19-f003"></a>
### The MFA orchestrator never re-runs completed steps (idempotency via progress-file PASS status) and never executes FBA…

`external/agents/Biology-Agent/skills/mfa-pipeline-orchestrator/SKILL.md:96-101` @ ea77ec1

`external/agents/Biology-Agent/skills/mfa-pipeline-orchestrator/SKILL.md:96-101` — The MFA orchestrator never re-runs completed steps (idempotency via progress-file PASS status) and never executes FBA itself — all computation is strictly delegated to sub-agents.

<a id="g19-f004"></a>
### BenchmarkPlan.to_prompt_block() serialises the plan as a fenced markdown block (benchmarks, baselines, ready-to-use c…

`researchclaw/agents/benchmark_agent/orchestrator.py:108-155` @ ea77ec1

`researchclaw/agents/benchmark_agent/orchestrator.py:108-155` — `BenchmarkPlan.to_prompt_block()` serialises the plan as a fenced markdown block (benchmarks, baselines, ready-to-use code snippets) for direct injection into downstream code-generation prompts, avoiding re-parsing JSON mid-pipeline.

<a id="g19-f005"></a>
### Final claim verdicts use PASS/WARN/FAIL where FAIL specifically means the evidence chain is broken (missing formulati…

`external/agents/stat_research_agent/skills/stat-result-validator/SKILL.md:124-130` @ ea77ec1

`external/agents/stat_research_agent/skills/stat-result-validator/SKILL.md:124-130` — Final claim verdicts use PASS/WARN/FAIL where FAIL specifically means the evidence chain is broken (missing formulation, theory, or fair comparison), not just weak results — severity is defined by structural completeness, not metric values.

<a id="g19-f006"></a>
### Formulation quality bar is operationalised as

`external/agents/stat_research_agent/skills/statistical-problem-formulation/SKILL.md:108-111` @ ea77ec1

`external/agents/stat_research_agent/skills/statistical-problem-formulation/SKILL.md:108-111` — Formulation quality bar is operationalised as: another researcher could implement or analyse the problem without guessing target, assumptions, or success criteria — a reproducibility-anchored definition rather than a subjective "good enough."

<a id="g19-f007"></a>
### Boundary reactions ( EX_ , DM_ , SK_ , BIOMASS ) are explicitly excluded from mass-balance errors and demoted to warn…

`external/agents/Biology-Agent/skills/gsmm-validator/SKILL.md:54-64` @ ea77ec1

`external/agents/Biology-Agent/skills/gsmm-validator/SKILL.md:54-64` — Boundary reactions (`EX_`, `DM_`, `SK_`, `BIOMASS`) are explicitly excluded from mass-balance errors and demoted to warnings because they are intentionally open; conflating them with stoichiometric errors would flood the report and mask real problems.

<a id="g19-f008"></a>
### pFBA is positioned after standard FBA and explained as a two-stage solve (maximise growth, then minimise total flux) …

`external/agents/Biology-Agent/skills/fba-simulator/SKILL.md:63-67` @ ea77ec1

`external/agents/Biology-Agent/skills/fba-simulator/SKILL.md:63-67` — pFBA is positioned after standard FBA and explained as a two-stage solve (maximise growth, then minimise total flux) to avoid biologically unrealistic high-flux split cycles — the rationale is embedded in the skill so the agent understands when to prefer pFBA over FBA.

<a id="g19-f009"></a>
### Feasibility gate scores candidate studies on five criteria (model availability, runtime, interpretability, output ric…

`external/agents/Biology-Agent/skills/metabolic-study-planner/SKILL.md:152-165` @ ea77ec1

`external/agents/Biology-Agent/skills/metabolic-study-planner/SKILL.md:152-165` — Feasibility gate scores candidate studies on five criteria (model availability, runtime, interpretability, output richness, reproducibility) and rejects any plan scoring below 18/25 before a single line of code is generated.

<a id="g19-f010"></a>
### The COBRApy context manager for temporary perturbations is documented as the canonical pattern for non-destructive mo…

`external/agents/Biology-Agent/skills/gsmm-builder/references/cobra_reference.md:113-120` @ ea77ec1

`external/agents/Biology-Agent/skills/gsmm-builder/references/cobra_reference.md:113-120` — The COBRApy context manager for temporary perturbations is documented as the canonical pattern for non-destructive model mutation; this prevents any single knockout experiment from corrupting shared model state across a batch simulation loop.

<a id="g19-f011"></a>
### Theory is a required pipeline stage even when no theorem is provable; the report must label claims as proven, heurist…

`external/agents/stat_research_agent/skills/stat-research-orchestrator/SKILL.md:88-91` @ ea77ec1

`external/agents/stat_research_agent/skills/stat-research-orchestrator/SKILL.md:88-91` — Theory is a required pipeline stage even when no theorem is provable; the report must label claims as proven, heuristic, or only experimentally supported — preventing the theory step from being silently skipped.

<a id="g19-f012"></a>
### max_iterations

`researchclaw/agents/benchmark_agent/orchestrator.py:49` @ ea77ec1

`researchclaw/agents/benchmark_agent/orchestrator.py:49` — `max_iterations: int = 2` caps the Acquirer-Validator retry loop explicitly in config, not in orchestrator logic, so callers can tune it per budget.

<a id="g19-f013"></a>
### Double gene deletion is capped at the first 50 genes with a comment "adjust as needed", acknowledging the O(n^2) comp…

`external/agents/Biology-Agent/skills/flux-analyzer/SKILL.md:68-73` @ ea77ec1

`external/agents/Biology-Agent/skills/flux-analyzer/SKILL.md:68-73` — Double gene deletion is capped at the first 50 genes with a comment "adjust as needed", acknowledging the O(n^2) compute cost; the cap is a default guard, not a hardcoded limit.

<a id="g19-f014"></a>
### GitHub repo search results are filtered to stars >= 10 before deeper analysis, cutting noise with a hardcoded quality…

`researchclaw/agents/code_searcher/agent.py:180-185` @ ea77ec1

`researchclaw/agents/code_searcher/agent.py:180-185` — GitHub repo search results are filtered to `stars >= 10` before deeper analysis, cutting noise with a hardcoded quality threshold.

<a id="g19-f015"></a>
### On Critic retry, only failed figures are replaced in final_rendered ; previously-passed figures are preserved via set…

`researchclaw/agents/figure_agent/orchestrator.py:386-395` @ ea77ec1

`researchclaw/agents/figure_agent/orchestrator.py:386-395` — On Critic retry, only failed figures are replaced in `final_rendered`; previously-passed figures are preserved via set-difference on `figure_id`, avoiding redundant re-renders.

<a id="g19-f016"></a>
### trigger-keywords is a flat comma-separated string (not a list), consistent across all skills; the consuming router sp…

`researchclaw/skills/builtin/experiment/meta-analysis/SKILL.md:6` @ ea77ec1

`researchclaw/skills/builtin/experiment/meta-analysis/SKILL.md:6` — `trigger-keywords` is a flat comma-separated string (not a list), consistent across all skills; the consuming router splits on comma and does substring match against the agent's current task description.

<a id="g19-f017"></a>
### priority

`researchclaw/skills/builtin/experiment/experimental-design/SKILL.md:8` @ ea77ec1

`researchclaw/skills/builtin/experiment/experimental-design/SKILL.md:8` — `priority: "2"` (the lowest seen across the batch) deliberately makes experimental-design a fallback, not a first-hit; higher-priority domain skills fire first, then experimental-design fills methodology gaps.

<a id="g19-f018"></a>
### Each skill cites exactly one or two canonical papers in references rather than a bibliography; this bounds the LLM's …

`researchclaw/skills/builtin/domain/nlp-alignment/SKILL.md:11` @ ea77ec1

`researchclaw/skills/builtin/domain/nlp-alignment/SKILL.md:11` — Each skill cites exactly one or two canonical papers in `references` rather than a bibliography; this bounds the LLM's source surface to vetted literature and prevents hallucinated citations.

<a id="g19-f019"></a>
### Literature-search skill names concrete databases ("Semantic Scholar, arXiv, OpenAlex") rather than "search the litera…

`researchclaw/skills/builtin/experiment/systematic-review/SKILL.md:20` @ ea77ec1

`researchclaw/skills/builtin/experiment/systematic-review/SKILL.md:20` — Literature-search skill names concrete databases ("Semantic Scholar, arXiv, OpenAlex") rather than "search the literature", eliminating ambiguity for the executing agent.

## Skills, prompts, tools

<a id="g19-f020"></a>
### Defines a comprehensive YAML handoff schema ( topic_id , observed_data , data_model , target , assumptions , claims ,…

`external/agents/stat_research_agent/skills/statistical-problem-formulation/SKILL.md:37-69` @ ea77ec1

`external/agents/stat_research_agent/skills/statistical-problem-formulation/SKILL.md:37-69` — Defines a comprehensive YAML handoff schema (`topic_id`, `observed_data`, `data_model`, `target`, `assumptions`, `claims`, `evaluation_criteria`, `theory_targets`, `blocking_ambiguities`) for structured context passing between sub-agents — all fields typed with controlled vocabularies.

<a id="g19-f021"></a>
### Full per-step progress file templates with PASS/FAIL status headers and required subsections enumerated

`external/agents/stat_research_agent/skills/stat-research-orchestrator/SKILL.md:157-282` @ ea77ec1

`external/agents/stat_research_agent/skills/stat-research-orchestrator/SKILL.md:157-282` — Full per-step progress file templates with PASS/FAIL status headers and required subsections enumerated — each template makes step completion mechanically verifiable by the orchestrator.

<a id="g19-f022"></a>
### Per-stage guidance block ( hypothesis_gen , experiment_design , code_generation , result_analysis , paper writing) te…

`external/agents/Biology-Agent/skills/metabolic-study-planner/SKILL.md:216-229` @ ea77ec1

`external/agents/Biology-Agent/skills/metabolic-study-planner/SKILL.md:216-229` — Per-stage guidance block (`hypothesis_gen`, `experiment_design`, `code_generation`, `result_analysis`, paper writing) tells the agent exactly how to adapt its behaviour depending on which AutoResearchClaw pipeline stage is active — a lightweight stage-aware prompt slot.

<a id="g19-f023"></a>
### Four study archetypes (Knockout Strategy, Nutrient-Condition Phase Map, Essentiality/Drug-Target, Benchmark) each def…

`external/agents/Biology-Agent/skills/metabolic-study-planner/SKILL.md:63-152` @ ea77ec1

`external/agents/Biology-Agent/skills/metabolic-study-planner/SKILL.md:63-152` — Four study archetypes (Knockout Strategy, Nutrient-Condition Phase Map, Essentiality/Drug-Target, Benchmark) each define a concrete plan, required metrics, and a paper-claim format string; this gives the LLM a bounded action space for study design rather than free-form generation.

<a id="g19-f024"></a>
### Eight-step validation workflow with explicit ERROR/WARNING severity tiers and a final JSON report artifact ( validati…

`external/agents/Biology-Agent/skills/gsmm-validator/SKILL.md:27-222` @ ea77ec1

`external/agents/Biology-Agent/skills/gsmm-validator/SKILL.md:27-222` — Eight-step validation workflow with explicit ERROR/WARNING severity tiers and a final JSON report artifact (`validation_report.json`) acts as a structured gate before any flux analysis; the report schema is defined inline for the agent to produce without ambiguity.

<a id="g19-f025"></a>
### PlannerAgent._generate_plan() system prompt gives an explicit JSON contract (9 required fields per figure), enumerate…

`researchclaw/agents/figure_agent/planner.py:248-273` @ ea77ec1

`researchclaw/agents/figure_agent/planner.py:248-273` — `PlannerAgent._generate_plan()` system prompt gives an explicit JSON contract (9 required fields per figure), enumerates all valid chart types, states hard bounds (`min_figures`/`max_figures`), and names section slots. Tight action space reduces hallucination.

<a id="g19-f026"></a>
### The method_to_claim_map YAML anchors each proposed method to specific claims, expected evidence, and theory targets

`external/agents/stat_research_agent/skills/statistical-method-design/SKILL.md:49-55` @ ea77ec1

`external/agents/stat_research_agent/skills/statistical-method-design/SKILL.md:49-55` — The `method_to_claim_map` YAML anchors each proposed method to specific claims, expected evidence, and theory targets — a machine-readable traceability artifact for downstream validators.

<a id="g19-f027"></a>
### Row-oriented JSON evidence schema ( claim_id , method , baseline , condition , metric , value , status ) normalises e…

`external/agents/stat_research_agent/skills/statistical-experimental-evaluation/SKILL.md:51-66` @ ea77ec1

`external/agents/stat_research_agent/skills/statistical-experimental-evaluation/SKILL.md:51-66` — Row-oriented JSON evidence schema (`claim_id`, `method`, `baseline`, `condition`, `metric`, `value`, `status`) normalises experiment outputs into claim-mapped rows for automated validation.

<a id="g19-f028"></a>
### claim_verdicts.json requires dual-source traceability per verdict

`external/agents/stat_research_agent/skills/statistical-experimental-evaluation/SKILL.md:68-81` @ ea77ec1

`external/agents/stat_research_agent/skills/statistical-experimental-evaluation/SKILL.md:68-81` — `claim_verdicts.json` requires dual-source traceability per verdict: both `theory_support` (citing the proposition and assumptions) and `experimental_support` (citing conditions and metrics), plus explicit limitations.

<a id="g19-f029"></a>
### Standard theorem template with four required sections (Proposition, Proof Sketch, Interpretation, Limitations) and a …

`external/agents/stat_research_agent/skills/statistical-theory-analysis/SKILL.md:36-51` @ ea77ec1

`external/agents/stat_research_agent/skills/statistical-theory-analysis/SKILL.md:36-51` — Standard theorem template with four required sections (Proposition, Proof Sketch, Interpretation, Limitations) and a rule that every theoretical claim must produce at least one empirical prediction when possible.

<a id="g19-f030"></a>
### + +

`external/agents/Biology-Agent/skills/metabolic-study-planner/SKILL.md:10-13` @ ea77ec1

`external/agents/Biology-Agent/skills/metabolic-study-planner/SKILL.md:10-13` + `researchclaw/skills/builtin/tooling/data-loading/SKILL.md:1-12` + `researchclaw/skills/builtin/experiment/systematic-review/SKILL.md:1-8` — Full SKILL.md frontmatter schema across both external agents and builtin skills: `name`, `description`, `metadata.category`, `trigger-keywords`, `applicable-stages`, `priority`, `version`, `author`, `references`; description written as an imperative for LLM consumption ("Use when...").

<a id="g19-f031"></a>
### The required study_card.md template (Research Question, Hypothesis, Model, Conditions, Analyses, Metrics, Figures, Ri…

`external/agents/Biology-Agent/skills/metabolic-study-planner/SKILL.md:169-214` @ ea77ec1

`external/agents/Biology-Agent/skills/metabolic-study-planner/SKILL.md:169-214` — The required `study_card.md` template (Research Question, Hypothesis, Model, Conditions, Analyses, Metrics, Figures, Risks) is a mandatory pre-code planning artifact; it forces structured reasoning before any simulator skill is invoked.

<a id="g19-f032"></a>
### code-template block inside YAML frontmatter delivers a copy-paste-ready AMP training loop (scaler, autocast, step) di…

`researchclaw/skills/builtin/tooling/mixed-precision/SKILL.md:12-21` @ ea77ec1

`researchclaw/skills/builtin/tooling/mixed-precision/SKILL.md:12-21` — `code-template` block inside YAML frontmatter delivers a copy-paste-ready AMP training loop (scaler, autocast, step) directly as structured metadata, not prose — LLM consumers can extract and emit it verbatim without additional reasoning.

<a id="g19-f033"></a>
### MFA progress files for steps 1-3 each carry structured fields (model ID, reaction/metabolite/gene counts, WT growth r…

`external/agents/Biology-Agent/skills/mfa-pipeline-orchestrator/SKILL.md:64-93` @ ea77ec1

`external/agents/Biology-Agent/skills/mfa-pipeline-orchestrator/SKILL.md:64-93` — MFA progress files for steps 1-3 each carry structured fields (model ID, reaction/metabolite/gene counts, WT growth rate, essential gene count, key file paths) that the orchestrator reads to parameterise the next sub-agent.

<a id="g19-f034"></a>
### The stat agent exposes a linear six-skill chain (orchestrator to formulation to method design to theory analysis to e…

`external/agents/stat_research_agent/skills/README.md:7-26` @ ea77ec1

`external/agents/stat_research_agent/skills/README.md:7-26` — The stat agent exposes a linear six-skill chain (orchestrator to formulation to method design to theory analysis to experimental evaluation to validator) with each skill name matching a canonical research phase; the README is the sole routing document, keeping the orchestrator's decision surface minimal.

<a id="g19-f035"></a>
### Canonical output file naming table ( fba_fluxes.csv , pfba_fluxes.csv , fva_result.csv , etc.) with one file per simu…

`external/agents/Biology-Agent/skills/fba-simulator/SKILL.md:233-244` @ ea77ec1

`external/agents/Biology-Agent/skills/fba-simulator/SKILL.md:233-244` — Canonical output file naming table (`fba_fluxes.csv`, `pfba_fluxes.csv`, `fva_result.csv`, etc.) with one file per simulation type; downstream skills read these exact names, making inter-skill hand-offs deterministic.

<a id="g19-f036"></a>
### CodeSearchResult.to_prompt_context() provides a single stable injection point

`researchclaw/agents/code_searcher/agent.py:43-47` @ ea77ec1

`researchclaw/agents/code_searcher/agent.py:43-47` — `CodeSearchResult.to_prompt_context()` provides a single stable injection point: upstream agents call this one method to get a formatted context block for code-gen prompts, decoupling search result shape from prompt assembly.

<a id="g19-f037"></a>
### User prompt injects domain detection result, data availability flags ( has_training_history , has_ablation , has_mult…

`researchclaw/agents/figure_agent/planner.py:275-290` @ ea77ec1

`researchclaw/agents/figure_agent/planner.py:275-290` — User prompt injects domain detection result, data availability flags (`has_training_history`, `has_ablation`, `has_multiple_seeds`), and the pre-computed domain chart matrix suggestions, grounding the LLM in concrete data signals before plan generation.

<a id="g19-f038"></a>
### "Common pitfalls" subsection names three concrete failure modes with vocabulary an agent can match against observed o…

`researchclaw/skills/builtin/domain/nlp-alignment/SKILL.md:28-31` @ ea77ec1

`researchclaw/skills/builtin/domain/nlp-alignment/SKILL.md:28-31` — "Common pitfalls" subsection names three concrete failure modes with vocabulary an agent can match against observed outputs (reward hacking, mode collapse, catastrophic forgetting); structured as anti-pattern recognition, not just advice.

<a id="g19-f039"></a>
### Training recipe gives per-algorithm hyperparameter tuples (PPO clip=0.2, SAC tau=0.005) alongside implementation note…

`researchclaw/skills/builtin/domain/rl-policy-optimization/SKILL.md:21-26` @ ea77ec1

`researchclaw/skills/builtin/domain/rl-policy-optimization/SKILL.md:21-26` — Training recipe gives per-algorithm hyperparameter tuples (PPO clip=0.2, SAC tau=0.005) alongside implementation notes; machine-readable density allows code generation without additional reasoning.

<a id="g19-f040"></a>
### Parameter-efficient methods block provides concrete hyperparameter ranges (LoRA r=8-64, alpha=16-128, prefix tokens 1…

`researchclaw/skills/builtin/domain/nlp-pretraining/SKILL.md:23-26` @ ea77ec1

`researchclaw/skills/builtin/domain/nlp-pretraining/SKILL.md:23-26` — Parameter-efficient methods block provides concrete hyperparameter ranges (LoRA r=8-64, alpha=16-128, prefix tokens 10-20) that an agent can use directly in generated training code without further lookup.

<a id="g19-f041"></a>
### Uses ALL-CAPS imperatives ("ALWAYS", "EACH") as emphasis tokens for LLM attention, distinguishing must-have constrain…

`researchclaw/skills/builtin/experiment/experimental-design/SKILL.md:15-16` @ ea77ec1

`researchclaw/skills/builtin/experiment/experimental-design/SKILL.md:15-16` — Uses ALL-CAPS imperatives ("ALWAYS", "EACH") as emphasis tokens for LLM attention, distinguishing must-have constraints from optional guidance.

<a id="g19-f042"></a>
### Benchmark numbers are baked into the skill content (COCO ~37 mAP for Faster R-CNN R50, ~51 for DINO Swin-L) so the ag…

`researchclaw/skills/builtin/domain/cv-detection/SKILL.md:27-30` @ ea77ec1

`researchclaw/skills/builtin/domain/cv-detection/SKILL.md:27-30` — Benchmark numbers are baked into the skill content (COCO ~37 mAP for Faster R-CNN R50, ~51 for DINO Swin-L) so the agent can sanity-check generated results against known baselines without a search step.

<a id="g19-f043"></a>
### OptGP sampler (Markov-chain Monte Carlo in the flux cone) with thinning=100 is the prescribed method for flux samplin…

`external/agents/Biology-Agent/skills/flux-analyzer/SKILL.md:133-137` @ ea77ec1

`external/agents/Biology-Agent/skills/flux-analyzer/SKILL.md:133-137` — OptGP sampler (Markov-chain Monte Carlo in the flux cone) with `thinning=100` is the prescribed method for flux sampling, chosen over ACHR for large-model stability; the failure mode section explicitly flags when to fall back to `processes=1`.

## Patterns worth porting

<a id="g19-f044"></a>
### Resumable checkpoint pattern

`external/agents/Biology-Agent/skills/mfa-pipeline-orchestrator/SKILL.md:15-16` @ ea77ec1

`external/agents/Biology-Agent/skills/mfa-pipeline-orchestrator/SKILL.md:15-16` + `external/agents/stat_research_agent/skills/stat-research-orchestrator/SKILL.md:38-54` — **Resumable checkpoint pattern**: write `progress/<ID>/stepN_*.md` with PASS/FAIL before invoking the next sub-agent; check the file's status before any step to skip already-completed work. Two independent domain pipelines converge on the same pattern, making it domain-general for any multi-step agent workflow.

<a id="g19-f045"></a>
### (trigger-keywords, applicable-stages, priority) routing triple

`researchclaw/skills/builtin/experiment/meta-analysis/SKILL.md:6-8` @ ea77ec1

`researchclaw/skills/builtin/experiment/meta-analysis/SKILL.md:6-8` + `researchclaw/skills/builtin/experiment/systematic-review/SKILL.md:6-8` — **`(trigger-keywords, applicable-stages, priority)` routing triple**: keywords select candidate skills, stage number filters to the current pipeline position, priority breaks ties. Any research-pipeline orchestrator can adopt this schema without code changes.

<a id="g19-f046"></a>
### Claim traceability chain

`external/agents/stat_research_agent/skills/stat-result-validator/SKILL.md:117-122` @ ea77ec1

`external/agents/stat_research_agent/skills/stat-result-validator/SKILL.md:117-122` — **Claim traceability chain**: every final claim must trace through `formulation -> method -> theory -> experiment -> comparison`. This linear audit chain is reusable for any research-output validation scenario.

<a id="g19-f047"></a>
### Three-tier fallback

`researchclaw/agents/figure_agent/planner.py:295-319` @ ea77ec1

`researchclaw/agents/figure_agent/planner.py:295-319` — **Three-tier fallback** after LLM plan generation: (1) use LLM output if non-empty, (2) apply `_fallback_plan()` from the domain matrix if LLM returns nothing, (3) `_augment_plan()` to reach minimum figure count. Each tier is a separate method, making the chain independently testable.

<a id="g19-f048"></a>
### Fork-and-merge dual-backend

`researchclaw/agents/figure_agent/orchestrator.py:231-263` @ ea77ec1

`researchclaw/agents/figure_agent/orchestrator.py:231-263` — **Fork-and-merge dual-backend**: Decision agent output is split into `code_figures` (routed to matplotlib/CodeGen) and `image_figures` (routed to Nano Banana/Gemini), with graceful degradation when Nano Banana is disabled. The shape is portable to any pipeline with two backend options.

<a id="g19-f049"></a>
### Optional artifact persistence helper

`researchclaw/agents/benchmark_agent/orchestrator.py:201-213` @ ea77ec1

`researchclaw/agents/benchmark_agent/orchestrator.py:201-213` + `researchclaw/agents/figure_agent/orchestrator.py:182-194` — **Optional artifact persistence helper**: identical `_save_artifact(name, data)` in both orchestrators writes JSON or text to a per-stage directory if provided, silently no-ops otherwise. Clean pattern for optional persistence without cluttering pipeline logic.

<a id="g19-f050"></a>
### Canonical experiment directory layout

`external/agents/stat_research_agent/skills/statistical-experimental-evaluation/SKILL.md:36-45` @ ea77ec1

`external/agents/stat_research_agent/skills/statistical-experimental-evaluation/SKILL.md:36-45` — **Canonical experiment directory layout** (`config.yaml`, `src/`, `results/metrics.json`, `results/run_manifest.json`, `results/comparison_summary.md`, `results/claim_verdicts.json`, `report/paper.md`, `README.md`) provides a reproducible artifact contract that validators can check by directory scan.

<a id="g19-f051"></a>
### Structured baseline taxonomy

`external/agents/stat_research_agent/skills/statistical-method-design/SKILL.md:37-44` @ ea77ec1

`external/agents/stat_research_agent/skills/statistical-method-design/SKILL.md:37-44` — **Structured baseline taxonomy** (classical, naive/unadjusted, oracle/idealized, robust variant, ablation of key feature) prevents cherry-picked comparisons; portable to any evaluation skill that needs mandatory baselines.

<a id="g19-f052"></a>
### 10-field method proposal schema

`external/agents/stat_research_agent/skills/statistical-method-design/SKILL.md:22-33` @ ea77ec1

`external/agents/stat_research_agent/skills/statistical-method-design/SKILL.md:22-33` — **10-field method proposal schema** (Name, Problem, Formula/Algorithm, Inputs/Outputs, Tuning parameters, Required assumptions, Diagnostics, Expected failure modes, Computational cost, Relation to baselines) is a complete reusable template for structured method documentation in any technical skill.

<a id="g19-f053"></a>
### Cross-domain analogy table

`external/agents/Biology-Agent/skills/README.md:43-51` @ ea77ec1

`external/agents/Biology-Agent/skills/README.md:43-51` — **Cross-domain analogy table** mapping ColliderAgent stages (LaTeX Lagrangian, FeynRules, MadGraph, MadAnalysis) to FBA-Agent stages (stoichiometric matrix, COBRApy Model, FBA, FVA + knockouts); a reusable pattern for adapting an existing agent pipeline to a new scientific domain by identifying structural equivalents.

<a id="g19-f054"></a>
### Safe default autonomous topic

`external/agents/Biology-Agent/skills/metabolic-study-planner/SKILL.md:231-242` @ ea77ec1

`external/agents/Biology-Agent/skills/metabolic-study-planner/SKILL.md:231-242` — **Safe default autonomous topic**: "Recommended First Autonomous Topic" section provides a concrete fallback prompt for zero-input runs. Porting this pattern to other domain agents would prevent blank-slate failures in unattended loops.

<a id="g19-f055"></a>
### Five-function modular builder

`external/agents/Biology-Agent/skills/gsmm-builder/templates/minimal_model.py:28-258` @ ea77ec1

`external/agents/Biology-Agent/skills/gsmm-builder/templates/minimal_model.py:28-258` — **Five-function modular builder** (`build_metabolites` -> `build_reactions` -> `build_model` -> `validate_and_run` -> `export_model`) with inline mass-balance check and CSV export; the separation between assembly and validation is a portable scaffold for any domain that constructs computational models programmatically.

<a id="g19-f056"></a>
### Exclusive-resource assignment pattern

`external/agents/Biology-Agent/skills/fba-simulator/SKILL.md:174-200` @ ea77ec1

`external/agents/Biology-Agent/skills/fba-simulator/SKILL.md:174-200` — **Exclusive-resource assignment pattern**: carbon source swap loop uses `with model:` to close all carbon exchanges before opening the target one, preventing accidental co-uptake artefacts. Reusable for any constraint model with mutually exclusive resource assignment.

<a id="g19-f057"></a>
### Transparent cost accounting

`researchclaw/agents/benchmark_agent/orchestrator.py:238-239` @ ea77ec1

`researchclaw/agents/benchmark_agent/orchestrator.py:238-239` — **Transparent cost accounting**: `self._accumulate(result)` is called after every sub-agent step, aggregating `total_llm_calls` and `total_tokens` into the orchestrator so the final plan carries end-to-end cost without the caller instrumenting anything.

<a id="g19-f058"></a>
### Cache-first lookup

`researchclaw/agents/code_searcher/agent.py:153-157` @ ea77ec1

`researchclaw/agents/code_searcher/agent.py:153-157` — **Cache-first lookup** keyed on `(domain_id, topic)` before any GitHub API call; only caches if `patterns.has_content`, preventing empty-result pollution. Simple but effective rate-limit guard.

<a id="g19-f059"></a>
### _CHART_TYPE_MATRIX domain heuristics

`researchclaw/agents/figure_agent/planner.py:26-82` @ ea77ec1

`researchclaw/agents/figure_agent/planner.py:26-82` — **`_CHART_TYPE_MATRIX` domain heuristics**: domain -> list of chart specs plus `_DOMAIN_KEYWORDS` (domain -> keyword list) implement a static decision aid: keyword scoring picks a domain, the matrix suggests chart types, both are injected into the LLM prompt. Decouples heuristics from model calls.

<a id="g19-f060"></a>
### Architecture selection by scale

`researchclaw/skills/builtin/domain/cv-classification/SKILL.md:14-18` @ ea77ec1

`researchclaw/skills/builtin/domain/cv-classification/SKILL.md:14-18` — **Architecture selection by scale** (small/medium/large with concrete model names per tier) gives the agent a decision tree instead of an unbounded model zoo; portable to any domain with tiered model complexity.

<a id="g19-f061"></a>
### "Menu + recipe" skill structure

`researchclaw/skills/builtin/domain/nlp-alignment/SKILL.md:14-19` @ ea77ec1

`researchclaw/skills/builtin/domain/nlp-alignment/SKILL.md:14-19` — **"Menu + recipe" skill structure**: list multiple method families before giving recipes (RLHF -> DPO -> GRPO -> SFT), then provide per-method hyperparameter blocks. Reusable for any skill covering a family of related algorithms.

<a id="g19-f062"></a>
### Ablation design constraint block

`researchclaw/skills/builtin/experiment/experimental-design/SKILL.md:18-21` @ ea77ec1

`researchclaw/skills/builtin/experiment/experimental-design/SKILL.md:18-21` — **Ablation design constraint block** ("remove one component at a time, each ablation must be meaningfully different from baseline") is a portable controlled-variable rule injectable into any experimental-planning skill or system prompt.

<a id="g19-f063"></a>
### "Common pitfalls" portable appendix

`researchclaw/skills/builtin/domain/rl-policy-optimization/SKILL.md:34-38` @ ea77ec1

`researchclaw/skills/builtin/domain/rl-policy-optimization/SKILL.md:34-38` — **"Common pitfalls" portable appendix**: naming seed sensitivity and hyperparameter sensitivity with concrete guidance (5+ seeds, small sweep) is an anti-pattern block applicable to any stochastic training skill.

<a id="g19-f064"></a>
### Composable medium definition dicts

`external/agents/Biology-Agent/skills/gsmm-builder/references/cobra_reference.md:64-109` @ ea77ec1

`external/agents/Biology-Agent/skills/gsmm-builder/references/cobra_reference.md:64-109` — **Composable medium definition dicts** (`M9_GLUCOSE_AEROBIC`, `M9_GLUCOSE_ANAEROBIC` built with `**M9_GLUCOSE_AEROBIC` plus a single override); the composable override pattern is applicable to any domain agent needing parameterised condition sets.

<a id="g19-f065"></a>
### Domain-conventions table

`external/agents/Biology-Agent/skills/gsmm-builder/SKILL.md:142-154` @ ea77ec1

`external/agents/Biology-Agent/skills/gsmm-builder/SKILL.md:142-154` — **Domain-conventions table** (metabolite ID format, compartment codes, exchange prefix, bound sign conventions) is a compact, machine-readable onboarding surface for any domain agent that needs consistent naming.

## Open threads / weak spots

<a id="g19-f066"></a>
### BUG-37 at two sites

`researchclaw/agents/figure_agent/orchestrator.py:428-436` @ ea77ec1

`researchclaw/agents/figure_agent/orchestrator.py:428-436` + `researchclaw/agents/figure_agent/planner.py:415-418` — **BUG-37 at two sites**: `figure_id` returned by the LLM may be a list; `orchestrator.py` takes `str(_fid[0])` while `planner.py` guards `chart_type` with `isinstance(..., str)`. Two separate sites for the same malformed-output class indicate the LLM output schema is not validated on ingestion.

<a id="g19-f067"></a>
### BUG-36

`researchclaw/agents/figure_agent/planner.py:311-312` @ ea77ec1

`researchclaw/agents/figure_agent/planner.py:311-312` — **BUG-36**: LLM may return `figures` as a list of strings instead of dicts; the fix is a post-hoc `isinstance` filter that silently discards non-dict entries with no warning logged.

<a id="g19-f068"></a>
### "FVA hangs" is documented as a known failure mode with advice to reduce processes or set loopless=False , but no time…

`external/agents/Biology-Agent/skills/fba-simulator/SKILL.md:251-254` @ ea77ec1

`external/agents/Biology-Agent/skills/fba-simulator/SKILL.md:251-254` — "FVA hangs" is documented as a known failure mode with advice to reduce `processes` or set `loopless=False`, but no timeout or process-kill guard is implemented; unattended runs on large models will block indefinitely.

<a id="g19-f069"></a>
### Thermodynamic loop detection is wrapped in a bare except Exception as exc with a WARN and silent skip; a solver error…

`external/agents/Biology-Agent/skills/gsmm-validator/SKILL.md:156-159` @ ea77ec1

`external/agents/Biology-Agent/skills/gsmm-validator/SKILL.md:156-159` — Thermodynamic loop detection is wrapped in a bare `except Exception as exc` with a WARN and silent skip; a solver error or timeout is indistinguishable from a genuine loop-free result, so publication-quality models could pass this check silently.

<a id="g19-f070"></a>
### ATPM reaction is defined twice

`external/agents/Biology-Agent/skills/gsmm-builder/templates/minimal_model.py:124-144` @ ea77ec1

`external/agents/Biology-Agent/skills/gsmm-builder/templates/minimal_model.py:124-144` — ATPM reaction is defined twice: the first definition (lines 124-133) is dead code and the comment "mass imbalance acceptable in toy" normalises a structural error in the reference template.

<a id="g19-f071"></a>
### BUG-60

`researchclaw/agents/figure_agent/orchestrator.py:155-159` @ ea77ec1

`researchclaw/agents/figure_agent/orchestrator.py:155-159` — **BUG-60**: `use_docker` is coerced from `None` to `False`, indicating the auto-detect path is not yet plumbed through to CodeGen; container-aware paths are never generated even when Docker is available.

<a id="g19-f072"></a>
### enable_web_search

`researchclaw/agents/benchmark_agent/orchestrator.py:40-42` @ ea77ec1

`researchclaw/agents/benchmark_agent/orchestrator.py:40-42` — `enable_web_search: bool = False` exists in config but `orchestrate()` never checks it — the flag is not forwarded to `SurveyorAgent`, so it has no effect at the orchestrator level.

<a id="g19-f073"></a>
### The 10-retry cap is stated but no escalation path is defined after exhaustion; an orchestrator hitting this limit has…

`external/agents/Biology-Agent/skills/mfa-pipeline-orchestrator/SKILL.md:97-99` @ ea77ec1

`external/agents/Biology-Agent/skills/mfa-pipeline-orchestrator/SKILL.md:97-99` — The 10-retry cap is stated but no escalation path is defined after exhaustion; an orchestrator hitting this limit has no prescribed behaviour (halt, alert, partial report).

<a id="g19-f074"></a>
### Step 4 ( metabolic-pheno-analyzer ) progress file template is completely absent from the spec; only steps 1-3 are ful…

`external/agents/Biology-Agent/skills/mfa-pipeline-orchestrator/SKILL.md:62-93` @ ea77ec1

`external/agents/Biology-Agent/skills/mfa-pipeline-orchestrator/SKILL.md:62-93` — Step 4 (`metabolic-pheno-analyzer`) progress file template is completely absent from the spec; only steps 1-3 are fully defined, leaving the final pipeline stage without a checkable artifact structure.

<a id="g19-f075"></a>
### References a gsmm-validator sub-skill ("run gsmm-validator before FBA") but that skill's interface (inputs, outputs, …

`external/agents/Biology-Agent/skills/gsmm-builder/SKILL.md:170-172` @ ea77ec1

`external/agents/Biology-Agent/skills/gsmm-builder/SKILL.md:170-172` — References a `gsmm-validator` sub-skill ("run `gsmm-validator` before FBA") but that skill's interface (inputs, outputs, progress file) is undocumented within this batch.

<a id="g19-f076"></a>
### Theory labeling (proven vs. heuristic vs. experimentally-supported) is required but the format is unstructured prose

`external/agents/stat_research_agent/skills/stat-research-orchestrator/SKILL.md:88-91` @ ea77ec1

`external/agents/stat_research_agent/skills/stat-research-orchestrator/SKILL.md:88-91` — Theory labeling (proven vs. heuristic vs. experimentally-supported) is required but the format is unstructured prose — no schema field or tag is mandated, so automated auditing cannot distinguish these categories.

<a id="g19-f077"></a>
### "Failed runs must be counted" is required but "failed run" is not defined (timeout, exception, numerical non-converge…

`external/agents/stat_research_agent/skills/statistical-experimental-evaluation/SKILL.md:86-89` @ ea77ec1

`external/agents/stat_research_agent/skills/statistical-experimental-evaluation/SKILL.md:86-89` — "Failed runs must be counted" is required but "failed run" is not defined (timeout, exception, numerical non-convergence, implausible output?); ambiguous for any automated failure-counting step.

<a id="g19-f078"></a>
### Theory checks accept "rigorous or partial" theory and a "clearly labeled heuristic analysis" as passing

`external/agents/stat_research_agent/skills/stat-result-validator/SKILL.md:85-91` @ ea77ec1

`external/agents/stat_research_agent/skills/stat-result-validator/SKILL.md:85-91` — Theory checks accept "rigorous or partial" theory and a "clearly labeled heuristic analysis" as passing — the pass threshold is low enough that a minimal heuristic paragraph could satisfy it without substantive content.

<a id="g19-f079"></a>
### Feasibility gate criterion scores are defined with thresholds ("Reject if ...") but no scoring rubric for the 1-5 sca…

`external/agents/Biology-Agent/skills/metabolic-study-planner/SKILL.md:152-165` @ ea77ec1

`external/agents/Biology-Agent/skills/metabolic-study-planner/SKILL.md:152-165` — Feasibility gate criterion scores are defined with thresholds ("Reject if ...") but no scoring rubric for the 1-5 scale per criterion; the gate requires a total >= 18/25 but leaves per-criterion scoring to the agent's judgment, making it easy to rationalise past the gate.

<a id="g19-f080"></a>
### Double gene deletion truncates to list(model.genes)[:50] with no selection rationale (e.g., top-flux genes or subsyst…

`external/agents/Biology-Agent/skills/flux-analyzer/SKILL.md:68-73` @ ea77ec1

`external/agents/Biology-Agent/skills/flux-analyzer/SKILL.md:68-73` — Double gene deletion truncates to `list(model.genes)[:50]` with no selection rationale (e.g., top-flux genes or subsystem filter); on a real genome-scale model this misses most gene pairs and could produce a misleading synthetic-lethality map.

<a id="g19-f081"></a>
### applicable-stages

`researchclaw/skills/builtin/experiment/meta-analysis/SKILL.md:7` @ ea77ec1

`researchclaw/skills/builtin/experiment/meta-analysis/SKILL.md:7` — `applicable-stages: "7,14"` references stage numbers with no legend visible in any skill file; stage semantics are an implicit dependency on an external stage-map document not co-located with the skills.

<a id="g19-f082"></a>
### All skills carry version

`researchclaw/skills/builtin/domain/nlp-pretraining/SKILL.md:9` @ ea77ec1

`researchclaw/skills/builtin/domain/nlp-pretraining/SKILL.md:9` — All skills carry `version: "1.0"` with no changelog or migration path; if a skill's recipe becomes stale, there is no mechanism to deprecate or supersede it.

<a id="g19-f083"></a>
### Skill description doubles as the routing hint and the user-facing label, but the two concerns differ (routing needs k…

`researchclaw/skills/builtin/experiment/systematic-review/SKILL.md:3` @ ea77ec1

`researchclaw/skills/builtin/experiment/systematic-review/SKILL.md:3` — Skill `description` doubles as the routing hint and the user-facing label, but the two concerns differ (routing needs keywords; users need context); no separate `routing-hint` field exists.

<a id="g19-f084"></a>
### No "common pitfalls" section unlike nlp-alignment and rl-policy-optimization skills; detection-specific failure modes…

`researchclaw/skills/builtin/domain/cv-detection/SKILL.md:1-30` @ ea77ec1

`researchclaw/skills/builtin/domain/cv-detection/SKILL.md:1-30` — No "common pitfalls" section unlike nlp-alignment and rl-policy-optimization skills; detection-specific failure modes (anchor misconfiguration, IoU threshold choice, class imbalance) are absent, making this skill asymmetrically incomplete relative to peers.

<a id="g19-f085"></a>
### DPO hyperparameters (lr=5e-7, beta=0.1) are hardcoded constants with no guidance on when to deviate; the listed GRPO …

`researchclaw/skills/builtin/domain/nlp-alignment/SKILL.md:22-25` @ ea77ec1

`researchclaw/skills/builtin/domain/nlp-alignment/SKILL.md:22-25` — DPO hyperparameters (lr=5e-7, beta=0.1) are hardcoded constants with no guidance on when to deviate; the listed GRPO entry has no recipe at all, leaving the fastest-evolving alignment method underdefined.

<a id="g19-f086"></a>
### The stars >= 10 quality threshold is hardcoded and not exposed in CodeSearchAgent.__init__ parameters, making it impo…

`researchclaw/agents/code_searcher/agent.py:181-183` @ ea77ec1

`researchclaw/agents/code_searcher/agent.py:181-183` — The `stars >= 10` quality threshold is hardcoded and not exposed in `CodeSearchAgent.__init__` parameters, making it impossible for callers to lower the bar for niche research topics with fewer starred repos.

