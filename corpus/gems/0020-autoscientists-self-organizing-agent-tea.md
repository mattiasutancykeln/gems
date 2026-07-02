# AutoScientists — self-organizing agent teams for long-running science

| | |
|---|---|
| Source | https://arxiv.org/abs/2605.28655 |
| Repo | https://github.com/mims-harvard/AutoScientists @ `c71a92343b9a488ed10134be805845b9473ad18f` |
| Kind | paper |
| Topics | agent, research |
| License | none (forbidden) |
| Verdict | promote |
| Findings | 62 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/20 |

## Implementation decisions

<a id="g20-f001"></a>
### Three-tier state split

`system/reference/SKILL.md:16-23` @ c71a923

`system/reference/SKILL.md:16-23 ` — Three-tier state split: Workshop (pub/sub container, all agents subscribe), Main workspace (global champion + all results + cross-team knowledge), Team workspace (per-team queue/dead-ends/strategy). Posts are ephemeral discussion; workspace files are durable structured state. This distinction — ephemeral vs. durable — is the load-bearing architectural decision the rest of the protocol depends on.

<a id="g20-f002"></a>
### HEARTBEAT.md is assembled once at launch by splicing system/templates/HEARTBEAT.md + role doc ( ROLE-GPU.md / ROLE-AN…

`launch.py:643-678` @ c71a923

`launch.py:643-678 ` and `system/reference/AGENT-SETUP.md:164-177 ` and `runbook.md:126-135 ` — HEARTBEAT.md is assembled once at launch by splicing `system/templates/HEARTBEAT.md` + role doc (`ROLE-GPU.md` / `ROLE-ANALYST.md` / `ROLE-MONITOR.md`) + `ROLE-TEAM.md`, stripping YAML frontmatter from role docs and injecting via placeholder comments. The resulting self-contained file is the only document the agent reads on every boot. The launch prompt is exactly 3 lines: agent name, FOCUS_ROOT, and a single `Read … HEARTBEAT.md and follow it.` — no workspace IDs, no step instructions, no team name. All complexity lives in the heartbeat file, not in the launch prompt.

<a id="g20-f003"></a>
### Five-branch dispatch table executes before any work

`system/templates/HEARTBEAT.md:10-19` @ c71a923

`system/templates/HEARTBEAT.md:10-19 ` — Five-branch dispatch table executes before any work: Discussion, No-Team exit, Normal cycle, Resume-and-post, or Resume-waiting. Part 0 (Mode Selector) exits with an error if uncertain rather than freelancing. Part 6 (Always-Last) runs unconditionally at every exit. No branch is optional.

<a id="g20-f004"></a>
### result_latest.json is written before training starts ( status

`system/templates/HEARTBEAT.md:100-165` @ c71a923

`system/templates/HEARTBEAT.md:100-165 ` — `result_latest.json` is written before training starts (`status: running`, `pid: os.getpid()`), updated after (`status: complete`), and flipped to `posted` after the workshop post. On restart, Check C detects unposted-complete sentinels by testing PID liveness AND artifact presence: if PID is dead AND a training artifact exists, the entry is promoted from `running` to `complete` and routed to Part 5. Covers OOM kills and rate-limit crashes without orchestrator intervention.

<a id="g20-f005"></a>
### The orchestrator is a hard-boundary pure coordinator

`runbook.md:17-21` @ c71a923

`runbook.md:17-21 ` and `system/templates/ROLE-MONITOR.md:1-20 ` — The orchestrator is a hard-boundary pure coordinator: it never runs experiments, never writes result files, never claims queue items. Its only file writes are champion-promotion copies and log appends. Monitor similarly is a pure janitor (releases stale claims, posts `[AUDIT]` summaries, checks GPU utilization) and explicitly does NOT form teams, trigger stagnation, or pick hypotheses. These are agent responsibilities.

<a id="g20-f006"></a>
### Two-tier persistent memory

`system/reference/AGENT-SETUP.md:31-47` @ c71a923

`system/reference/AGENT-SETUP.md:31-47 ` and `launch.py:575-700 ` — Two-tier persistent memory: `AGENT.md` is overwritten every session (current identity: role, team, GPU, last outcome, session_count, last_val_bpb); `memory/*.md` is append-only accumulated knowledge (feedback, project, reference). The MEMORY.md index (<50 lines) gates which memory files are loaded at boot. `setup_agent()` materializes all identity files before the first session — nothing is lazy-created at agent runtime.

<a id="g20-f007"></a>
### Teams are organized around falsifiable hypotheses, not axis partitions. Each strategy.md frontmatter records hypothes…

`system/reference/PHASES.md:101-115` @ c71a923

`system/reference/PHASES.md:101-115 ` and `system/templates/ROLE-MONITOR.md:83-138 ` — Teams are organized around falsifiable hypotheses, not axis partitions. Each `strategy.md` frontmatter records `hypothesis` (causal claim), `prediction` (experimental pattern supporting it), `falsification` (bar at which hypothesis is abandoned), `age_rotations`, `supported_keeps`, `refuted_discards`. Five named hypothesis templates (H-throughput, H-gradient-quality, H-capacity, H-schedule-shape, H-hidden-constant). Any team may propose on any axis; the hypothesis is a lens for evaluating results, not a partition of search space.

<a id="g20-f008"></a>
### Multi-seed noise gate before champion promotion

`system/templates/ROLE-GPU.md:741-815` @ c71a923

`system/templates/ROLE-GPU.md:741-815 ` — Multi-seed noise gate before champion promotion: if `|delta| ≤ noise_floor * MARGIN` (default MARGIN=2), run a second seed before promoting. Append `(metric_a, metric_b, code_hash)` triple to `knowledge/noise_floor_data.md` on every second-seed invocation (lazy calibration — σ never measured upfront). A persistent near-miss (same axis/direction/value with 2 prior near-misses in `knowledge/near_miss_ledger.md`) triggers a 3-seed tiebreaker: promote if ≥2 of 3 seeds beat champion.

<a id="g20-f009"></a>
### Exactly-once shared baseline uses If-None-Match

`system/templates/ROLE-GPU.md:78-98` @ c71a923

`system/templates/ROLE-GPU.md:78-98 ` — Exactly-once shared baseline uses `If-None-Match: *` on a `baseline_lock.md` file. First GPU to arrive wins; all others skip to real queue experiments. Prevents per-team baseline duplication without a lock service.

<a id="g20-f010"></a>
### Champion propagation uses temp-then-rename ( tmp.replace(dst) ) for atomic local file update, plus appending to champ…

`system/templates/ROLE-GPU.md:916-927` @ c71a923

`system/templates/ROLE-GPU.md:916-927 ` — Champion propagation uses temp-then-rename (`tmp.replace(dst)`) for atomic local file update, plus appending to `champion/SOURCE` (one line per promotion: `exp_id metric agent timestamp`). Losing concurrent KEEPs are already gated out by `If-Match` on `champion.md` PUT. `champion/SOURCE` is the promotion audit trail.

<a id="g20-f011"></a>
### Before training, verify train.py is NOT byte-identical to champion/train.py using filecmp.cmp . If identical, set dif…

`system/templates/ROLE-GPU.md:499-511` @ c71a923

`system/templates/ROLE-GPU.md:499-511 ` — Before training, verify `train.py` is NOT byte-identical to `champion/train.py` using `filecmp.cmp`. If identical, set `diff_applied=False`, skip training, post `[RESULT] FAILED`. Prevents phantom KEEPs (documented production failure: `data_v7`, 0.979985, diff rejected silently).

<a id="g20-f012"></a>
### Optimistic concurrency via HTTP If-Match

`system/reference/API-REFERENCE.md:141-142` @ c71a923

`system/reference/API-REFERENCE.md:141-142 ` and `system/templates/ROLE-TEAM.md:119-122 ` — Optimistic concurrency via HTTP `If-Match: {version}` on file PUT; server returns 409 on conflict. PATCH is explicitly forbidden for `queue.md` because dotted-key PATCH on nested frontmatter (`claims.agent_1`) flattens `pending:` lists and corrupts the YAML. Queue mutations use read-modify-PUT exclusively.

<a id="g20-f013"></a>
### experiments.jsonl is the single authoritative JSONL log, orchestrator-owned. Fields

`system/reference/LOGGING.md:11-38` @ c71a923

`system/reference/LOGGING.md:11-38 ` — `experiments.jsonl` is the single authoritative JSONL log, orchestrator-owned. Fields: `exp_id`, `agent`, `team`, `metric`, `champion_before`, `champion_after`, `delta`, `outcome`, `race_condition`. Stagnation checks read this file, not workspace files. `sessions.jsonl` (`system/reference/LOGGING.md:60-126 `) tracks per-session lifecycle including `promise_received` and per-experiment sub-array.

<a id="g20-f014"></a>
### Meta-improvement runs every 3 execution cycles and requires a file to change

`system/reference/META-IMPROVEMENT.md:1-18` @ c71a923

`system/reference/META-IMPROVEMENT.md:1-18 ` and `system/reference/META-IMPROVEMENT.md:94-99 ` and `system/reference/META-IMPROVEMENT.md:103-115 ` — Meta-improvement runs every 3 execution cycles and requires a file to change — if nothing changed, the step did not run (anti-report rule: no checklists, no declarations of normalcy). One-change-only discipline: fix the single most important gap; bundling changes makes causality opaque. Changes are logged to `logs/meta_results.tsv` with columns `cycle`, `pattern_diagnosed`, `file_changed`, `outcome` — the system's own trace of its self-improvement history, readable by future meta-improvement runs.

<a id="g20-f015"></a>
### Execution loop is while True with no built-in termination. Twelve named profile hooks ( pre_cycle_check , discussion_…

`runbook.md:181-201` @ c71a923

`runbook.md:181-201 ` — Execution loop is `while True` with no built-in termination. Twelve named profile hooks (`pre_cycle_check`, `discussion_policy`, `gpu_dispatch`, `champion_promotion`, `stagnation_response`, `exit_condition`, etc.) are the entire variation surface between task types. Only `exit_condition()` or Ctrl+C can stop it. Base-program logic is universal; task-specific logic lives entirely in hooks.

<a id="g20-f016"></a>
### Three-state orchestrator boot

`runbook.md:30-64` @ c71a923

`runbook.md:30-64 ` — Three-state orchestrator boot: (A) template with no `WORKSPACE_ID` -> run `launch.py` then proceed; (B) existing ablation -> read `teams/roster.md` to determine phase; (C) interruption resume -> read `logs/sessions.jsonl` + `logs/experiments.jsonl`, release stale claims, re-enter loop. Discriminant is `WORKSPACE_ID` existence plus roster content, not a separate state file.

<a id="g20-f017"></a>
### Haiku is explicitly prohibited for analyst agents. Failure mode reproduced 3/3 times in a 2026-05-26 run

`runbook.md:137-143` @ c71a923

`runbook.md:137-143 ` — Haiku is explicitly prohibited for analyst agents. Failure mode reproduced 3/3 times in a 2026-05-26 run: analysts hallucinate "no API available" and write local memory files claiming work is done without ever calling the workshop API. Sonnet/opus mandatory for analysts. The prohibition lives in the runbook as a markdown comment, not a programmatic gate.

<a id="g20-f018"></a>
### Fresh per-run git clone (not symlink) prevents stale state contamination. Documented prior bug

`launch.py:438-507` @ c71a923

`launch.py:438-507 ` — Fresh per-run git clone (not symlink) prevents stale state contamination. Documented prior bug: a shared symlinked `repo/` accumulated ~1800 lines of uncommitted code from previous runs, anchoring every subsequent experiment to a non-upstream baseline. The `.cache/` directory (HuggingFace, torch, uv) IS shared across runs via symlink — intentional exception for weights/pip caches while code state is isolated.

<a id="g20-f019"></a>
### Approach registry uses fcntl.LOCK_EX for atomic read-modify-write on a shared JSON file. Agents that find their appro…

`system/templates/ROLE-GPU.md:146-164` @ c71a923

`system/templates/ROLE-GPU.md:146-164 ` — Approach registry uses `fcntl.LOCK_EX` for atomic read-modify-write on a shared JSON file. Agents that find their approach already taken must pick a different paradigm and re-register before any training. Prevents two GPU agents from running identical experiments in the same cycle.

<a id="g20-f020"></a>
### Dead-end re-triage

`system/templates/ROLE-ANALYST.md:806-818` @ c71a923

`system/templates/ROLE-ANALYST.md:806-818 ` — Dead-end re-triage: when the empirically measured noise floor rises above a prior dead-end's recorded delta, downgrade (not delete) the entry to `NOISE-CONTAMINATED — axis remains open`. Preserves experimental history while restoring productive surface area.

<a id="g20-f021"></a>
### Noise floor σ accumulates passively from multi-seed gate runs. After n≥5 pairs a locked

`system/templates/ROLE-ANALYST.md:273-318` @ c71a923

`system/templates/ROLE-ANALYST.md:273-318 ` — Noise floor σ accumulates passively from multi-seed gate runs. After n≥5 pairs a `locked: true` flag in `knowledge/noise_floor.md` freezes σ. Late analysts may not retroactively reclassify DISCARDs when σ drifts post-lock.

## Skills, prompts, tools

<a id="g20-f022"></a>
### Boot sequence is 5 self-discovered steps

`system/reference/AGENT-SETUP.md:108-123` @ c71a923

`system/reference/AGENT-SETUP.md:108-123 ` — Boot sequence is 5 self-discovered steps: BOOT (read credentials + role), ORIENT (roster -> team + workspace IDs -> LIST -> role doc), EXECUTE (role protocol), RECORD (actions.md + workspace agent status), EXIT (`<promise>` tag). No step is hardcoded in the launch prompt — the agent discovers all context from local files and API.

<a id="g20-f023"></a>
### Per-invocation read-state pattern

`system/templates/HEARTBEAT.md:190-223` @ c71a923

`system/templates/HEARTBEAT.md:190-223 ` — Per-invocation read-state pattern: read `AGENT.md` (identity/focus/notes from last session), `MEMORY.md` index (selective), `task/TASK.md` (constraints). `HEARTBEAT.md` overrides any procedural rule in memory files; factual findings survive rule updates.

<a id="g20-f024"></a>
### Post-KEEP inductive reasoning protocol (required after any champion update)

`system/templates/ROLE-ANALYST.md:481-510` @ c71a923

`system/templates/ROLE-ANALYST.md:481-510 ` — Post-KEEP inductive reasoning protocol (required after any champion update): answer (1) what property made the KEEP work mechanistically, (2) list 3–5 untried changes sharing that property, (3) ≥1 of 2 proposals this cycle must target the same property via a different mechanism. Written as `[ANALYSIS]` comment on the KEEP's `[RESULT]` thread so other teams see the reasoning. Structured knowledge transfer from execution agents to planning agents across session boundaries.

<a id="g20-f025"></a>
### Empirical axis priors from logs/experiments.jsonl

`system/templates/ROLE-ANALYST.md:955-998` @ c71a923

`system/templates/ROLE-ANALYST.md:955-998 ` — Empirical axis priors from `logs/experiments.jsonl`: mean `|Δ|` per `(axis, direction)` for axes with n≥3; cold axes (n<3) get an exploration bonus. Queue ranking tier order: consensus-breaking (minority direction on an over-mined axis), then cold axes, then high mean `|Δ|`, then below-noise-floor last. Replaces intuition-based ranking.

<a id="g20-f026"></a>
### Two discovery tools

`system/reference/API-REFERENCE.md:46-65` @ c71a923

`system/reference/API-REFERENCE.md:46-65 ` — Two discovery tools: LIST (`GET /workspaces/{id}/files`) returns metadata only (path, version, updatedAt, updatedBy) — cheap, call every cycle; SEARCH (`GET /workspaces/{id}/search?q=term`) returns line-level matches. Pattern: LIST first, READ selectively. Version field in LIST enables staleness detection without fetching content.

<a id="g20-f027"></a>
### Post creation includes notify_agents

`system/reference/API-REFERENCE.md:97-106` @ c71a923

`system/reference/API-REFERENCE.md:97-106 ` — Post creation includes `notify_agents: [list]` for targeted inbox delivery. Tags encode structured metadata (`team:arch`, `type:proposal`, `phase:planning`) for filtering. Posts are typed by prefix: `[PROPOSAL]`, `[RESULT]`, `[DISCUSSION]`, `[NEAR-MISS]`, `[AUDIT]`. Type prefix is the routing key for agent dispatch logic.

<a id="g20-f028"></a>
### Self-organizing discussion rounds

`system/templates/HEARTBEAT.md:36-59` @ c71a923

`system/templates/HEARTBEAT.md:36-59 ` and `system/templates/HEARTBEAT.md:477-495 ` and `launch.py:890-935 ` — Self-organizing discussion rounds: any agent can post `[DISCUSSION-TRIGGER]` (scanned: posted within last 3 rotations AND fewer than 5 `[DISCUSS-DONE]` comments). ≥5 `[DISCUSS-DONE]` votes (of 9 non-monitor agents) terminates the round; agents vote `[DISCUSS-MORE]` if new signal is still surfacing. No external coordinator decides when discussion starts or stops. The alphabetically-last analyst who participated writes `teams/roster.md` as the deterministic tiebreaker.

<a id="g20-f029"></a>
### knowledge/unqueued_axes.md is a shared cross-team backlog ledger of every axis mentioned in [DISCUSSION] , [GAPS] , […

`system/templates/ROLE-ANALYST.md:326-355` @ c71a923

`system/templates/ROLE-ANALYST.md:326-355 ` — `knowledge/unqueued_axes.md` is a shared cross-team backlog ledger of every axis mentioned in `[DISCUSSION]`, `[GAPS]`, `[CONSTANTS]`, `[RANKED]`, `[DYNAMICS]`, `[PROPOSAL]` posts. Schema: axis | direction | suggested_value | mentioning_posts | status (unqueued/queued/tested) | last_touched. Agents record a `reason:` when skipping an entry. Over time this becomes a durable record of why each hypothesis was or wasn't tested.

<a id="g20-f030"></a>
### KEEP followup harvest

`system/templates/ROLE-ANALYST.md:455-479` @ c71a923

`system/templates/ROLE-ANALYST.md:455-479 ` — KEEP followup harvest: each cycle grep recent result files for `## Followup` or `## Follow-up` sections on KEEPs; for each bullet, check whether an equivalent experiment exists in queue; if not, rebase to current champion and add to proposal batch. An unharvested followup from N champions ago is a system-level defect.

<a id="g20-f031"></a>
### Ambition quota

`system/templates/ROLE-ANALYST.md:1075-1150` @ c71a923

`system/templates/ROLE-ANALYST.md:1075-1150 ` — Ambition quota: ≥1 of 2 analyst proposals per cycle must satisfy ≥1 bold-move criterion (≥10% parameter count change, named-bug correctness fix, convergent untested axis from ≥2 discussion mentions, or hypothesis-tension probe). If none qualify, post `[EXEMPT]` with specific evidence. `system/templates/ROLE-ANALYST.md:1075-1114 `: ≥1 of 2 proposals must also come from the `unqueued_axes.md` ledger if any `unqueued` entries remain.

<a id="g20-f032"></a>
### Stagnation predicate

`system/templates/ROLE-ANALYST.md:62-96` @ c71a923

`system/templates/ROLE-ANALYST.md:62-96 ` — Stagnation predicate: `rotations_since_keep ≥ 3` OR `[HYPOTHESIS-FALSIFIED]` posted since last `[DISCUSSION-TRIGGER]` or `[TEAM-REFORMED]`. Replaces the simpler `keeps_in_last_10 == 0` which fired false positives after a big KEEP followed by normal DISCARDs. Separately: `system/templates/ROLE-ANALYST.md:146-164 ` — axis-mining stagnation trigger fires independently of KEEP count: if last 8+ DISCARDs fall in ≤3 distinct axes AND no `paired_with`/`cross_axis` items are pending. Title must include `(axis-mining)` to distinguish.

<a id="g20-f033"></a>
### Training dynamics analysis required after every run

`system/templates/ROLE-GPU.md:606-635` @ c71a923

`system/templates/ROLE-GPU.md:606-635 ` — Training dynamics analysis required after every run: (1) was loss still decreasing at 80% of training (undertrained signal), (2) did loss plateau before 60% (excess capacity), (3) steps and tokens seen. Recorded under `## Training Dynamics` in the result file; analysts use this in post-KEEP inductive reasoning.

<a id="g20-f034"></a>
### Meta-improvement evidence sources

`system/reference/META-IMPROVEMENT.md:29-38` @ c71a923

`system/reference/META-IMPROVEMENT.md:29-38 ` — Meta-improvement evidence sources: `experiments.jsonl` + `cycle_result.json`, `sessions.jsonl`, each team's `queue.md`, workshop posts, `champion/SOURCE` (last improvement timestamp), `system/templates/ROLE-*.md` (current agent instructions). All must be read before forming a diagnosis — partial reads produce incorrect pattern attribution.

<a id="g20-f035"></a>
### External-repo setup protocol addresses a named failure mode

`system/external-repo-setup/SKILL.md:1-8` @ c71a923

`system/external-repo-setup/SKILL.md:1-8 ` and `system/external-repo-setup/references/analyst-proposal-guide.md:22-88 ` — External-repo setup protocol addresses a named failure mode: analysts propose experiments depending on GitHub repos or pretrained weights, but agents skip them because no setup path exists. Five required fields for any such proposal: repo URL + pinned commit (not "main"), checkpoint source with exact org/model-name, interface sketch (copy-pasteable minimal example), setup complexity rating (Easy/Medium/Hard/Unknown), and a named fallback experiment. After successful setup: `system/external-repo-setup/SKILL.md:408-446 ` — write `knowledge/setup_{REPO_NAME}.md` with frontmatter (repo, commit, ckpt_path, embed_cache, embed_dim, python path, patches_applied) so other GPU agents load pre-cached `.npy` embeddings without re-running extraction.

<a id="g20-f036"></a>
### Atomic two-phase queue mutation

`system/templates/ROLE-GPU.md:685-724` @ c71a923

`system/templates/ROLE-GPU.md:685-724 ` — Atomic two-phase queue mutation: claim release and `pending -> completed` move happen in a single read-modify-PUT. The prior pattern (release only) left stale rows that analysts spent multiple turns pruning. Generalizes: any operation updating two fields of a shared YAML file atomically must be a single read-modify-PUT, not two PATCHes.

<a id="g20-f037"></a>
### Target validation before training

`system/templates/ROLE-GPU.md:444-452` @ c71a923

`system/templates/ROLE-GPU.md:444-452 ` — Target validation before training: if the experiment reads/writes a named collection (list of params, config dict, feature set), verify it is non-empty and actually wired into the code path. Helper variables sometimes defined but never referenced produce noise-only deltas that look like signal.

<a id="g20-f038"></a>
### Lesson

`system/reference/META-IMPROVEMENT.md:136-153` @ c71a923

`system/reference/META-IMPROVEMENT.md:136-153 ` — `META-IMPROVEMENT.md` ends with a named, dated record of real system failures (task spec drift, autonomy failure, report-writing substitution). Each entry has a `Lesson:` that rewrites the instruction. This is a structured postmortem corpus embedded directly in the skill file, readable by future meta-improvement runs. The autonomy failure (`system/reference/META-IMPROVEMENT.md:143-148 `): the orchestrator "paused after cycle 1 and asked 'can you continue?'" despite explicit instructions. Fix was to replace soft prohibitions with `NEVER ASK PERMISSION`. Any loop-launched Claude agent should audit its stop conditions for weak-directive patterns.

## Patterns worth porting

<a id="g20-f039"></a>
### Sentinel-driven session recovery

`system/templates/HEARTBEAT.md:100-165` @ c71a923

`system/templates/HEARTBEAT.md:100-165 ` — Sentinel-driven session recovery. Writing `result_latest.json` with `status/pid/posted_to_workshop` before training starts gives a clean resume path after any crash. The PID + artifact-presence promotion logic (`running` -> `complete` -> `posted`) handles ungraceful kills without orchestrator intervention. Directly portable to Halmos agent runs where a long compute step may outlive the orchestrator session.

<a id="g20-f040"></a>
### Filesystem-first, two-tier agent identity

`system/reference/AGENT-SETUP.md:31-47` @ c71a923

`system/reference/AGENT-SETUP.md:31-47 ` and `launch.py:575-700 ` — Filesystem-first, two-tier agent identity. All durable state (identity, credentials, memory, prompt) lives in a local directory tree before any session starts. Session state (AGENT.md) is overwritten each session; accumulated knowledge (memory/*.md) is append-only per lesson; the MEMORY.md index gates what's loaded at boot. Makes agents restartable without API calls to reconstruct identity. The directory IS the agent record.

<a id="g20-f041"></a>
### Proof-of-change + one-change-only isolation

`system/reference/META-IMPROVEMENT.md:1-18` @ c71a923

`system/reference/META-IMPROVEMENT.md:1-18 ` and `system/reference/META-IMPROVEMENT.md:94-99 ` — Proof-of-change + one-change-only isolation. Meta-improvement is only complete when a file is different than before (eliminates report-writing as a substitute for action — documented as a recurring failure). Each cycle fixes exactly one gap; the `meta_results.tsv` log creates a readable A/B record of what was tried. Applicable to any self-improvement loop where causality must be preserved.

<a id="g20-f042"></a>
### Noise-contamination re-triage over deletion

`system/templates/ROLE-ANALYST.md:806-818` @ c71a923

`system/templates/ROLE-ANALYST.md:806-818 ` — Noise-contamination re-triage over deletion. When the measured noise floor rises above a dead-end's recorded delta, downgrade the entry rather than deleting it. Preserves experimental history while reopening the search surface. Directly applicable to Halmos certify/validate pipelines where claim thresholds change across champion updates — a stale dead-end should be re-evaluated, not silently retained or deleted.

<a id="g20-f043"></a>
### Hypothesis-as-team-charter with deterministic falsification

`system/reference/PHASES.md:101-115` @ c71a923

`system/reference/PHASES.md:101-115 ` and `system/templates/ROLE-MONITOR.md:83-138 ` — Hypothesis-as-team-charter with deterministic falsification. Frontmatter counters (`age_rotations`, `supported_keeps`, `refuted_discards`) enable automated hypothesis tracking without agents reading every result. Falsification condition (`age_rotations ≥ 3 AND supported_keeps == 0 AND refuted_discards ≥ 3`) is deterministic, not subject to interpretation drift. Forces proposals that are evaluable against a stated hypothesis rather than free-form exploration.

<a id="g20-f044"></a>
### Orchestrator-owned canonical log

`system/reference/LOGGING.md:11-38` @ c71a923

`system/reference/LOGGING.md:11-38 ` — Orchestrator-owned canonical log. GPU agents report results in their promise message; the orchestrator writes the single authoritative JSONL entry. Agents cannot corrupt the log by writing to it directly. Analogous to Halmos's trace-DAG where only the certify/validate step writes authoritative outcome edges — the separation prevents agents from marking their own work as valid.

<a id="g20-f045"></a>
### Shared cross-team backlog ledger with mandatory disposition

`system/templates/ROLE-ANALYST.md:326-355` @ c71a923

`system/templates/ROLE-ANALYST.md:326-355 ` — Shared cross-team backlog ledger with mandatory disposition. `knowledge/unqueued_axes.md` forces agents to record a `reason:` when skipping a backlog entry. Becomes a durable record of why each hypothesis was or wasn't tested. Maps to Halmos's capability-map pattern of canonical concept tracking; prevents the same idea from being re-proposed in future cycles without acknowledging prior history.

<a id="g20-f046"></a>
### Alphabetically-last-agent single-writer arbitration

`system/templates/ROLE-ANALYST.md:195-228` @ c71a923

`system/templates/ROLE-ANALYST.md:195-228 ` and `system/templates/ROLE-ANALYST.md:651-729 ` — Alphabetically-last-agent single-writer arbitration. Deterministic coordinator selection without a lock service or privileged role. Same convention applies to roster writes (cold-start), dimension-merge enactment, and reform enactment. Conditions for merge enactment are fully specified: endorsement bar met (≥2 substantive non-proposer comments, 0 unresolved objections, thread ≥1 rotation old) AND roster still in pre-merge state AND you are not the proposer AND you are the last analyst this rotation. Deferral under "I'm non-affected" is explicitly named a bug.

<a id="g20-f047"></a>
### Infinite loop with profile-owned exit

`runbook.md:181-201` @ c71a923

`runbook.md:181-201 ` — Infinite loop with profile-owned exit. The orchestrator loop runs forever; only the profile's `exit_condition()` hook knows when to stop. Separates "how to loop" (universal base-program) from "when to stop" (task-specific hook). Halmos's heartbeat loop should adopt the same separation — the heartbeat protocol is universal; the research-goal completion condition is domain-specific.

<a id="g20-f048"></a>
### Per-run isolated code copy with documented prior bug

`launch.py:438-507` @ c71a923

`launch.py:438-507 ` — Per-run isolated code copy with documented prior bug. Fresh git clone prevents stale state; the comment explicitly documents WHY a symlink was replaced, citing the ~1800 lines of contamination. The "prior bug" comment pattern prevents regression. Cache (weights, pip) IS shared via symlink — the isolation boundary is code state, not data state.

<a id="g20-f049"></a>
### Structured stagnation response with exhaustive options

`system/reference/PHASES.md:207-235` @ c71a923

`system/reference/PHASES.md:207-235 ` — Structured stagnation response with exhaustive options. Detect (N consecutive DISCARDs or axis-mining trigger), post structured discussion with labeled options (Merge/Split/Pivot/Dissolve), vote, execute one of four mechanical outcomes. Options are exhaustive and mutually exclusive. Each restructuring path has a distinct mechanical consequence (move agents, create new workspaces, clear queue, redistribute). Applicable to any Halmos agent pool that can stagnate.

## Open threads / weak spots

<a id="g20-f050"></a>
### Authorship inconsistency in experiments.jsonl

`system/reference/LOGGING.md:11-13` @ c71a923

`system/reference/LOGGING.md:11-13 vs 130-152 ` — Authorship inconsistency in `experiments.jsonl`. Section header says "The orchestrator writes this file — agents do NOT write to it directly" (line 12), but section 2 header says "Written by: GPU agents, after each experiment" (line 130) with agent-side Python. The two sections contradict each other; deployed model is ambiguous.

<a id="g20-f051"></a>
### Champion propagation is orchestrator-copy, not version-pinned

`system/reference/SKILL.md:80-88` @ c71a923

`system/reference/SKILL.md:80-88 ` — Champion propagation is orchestrator-copy, not version-pinned. The orchestrator copies `train.py` to `{FOCUS_ROOT}/champion/train.py` after each KEEP. There is no `path@vN`-style versioning — if two agents race around a KEEP boundary, one may train against the old champion while the other trains against the new one, with no record of which baseline each used. `champion/SOURCE` records promotion metadata but not the full champion state at each version.

<a id="g20-f052"></a>
### meta_results.tsv has no revert mechanism

`system/reference/META-IMPROVEMENT.md:103-115` @ c71a923

`system/reference/META-IMPROVEMENT.md:103-115 ` — `meta_results.tsv` has no revert mechanism. The log records that a change was applied but has no field for "was this change later reverted and why." The `If a recent meta-improvement made things worse: Revert it` heuristic produces no corresponding log entry, making the audit trail incomplete.

<a id="g20-f053"></a>
### Second-seed pair lost on crash between run and append

`system/templates/ROLE-GPU.md:780-787` @ c71a923

`system/templates/ROLE-GPU.md:780-787 ` — Second-seed pair lost on crash between run and append. If the agent crashes after the second run but before appending to `knowledge/noise_floor_data.md`, the pair is lost and the conservative default σ (0.003) stays active indefinitely. No recovery path is documented for this failure.

<a id="g20-f054"></a>
### Brittle client-side YAML parsing

`system/reference/API-REFERENCE.md:18-39` @ c71a923

`system/reference/API-REFERENCE.md:18-39 ` — Brittle client-side YAML parsing. Agents split on `"---"` and call `yaml.safe_load`. If any file body contains `---` (e.g., in code blocks or markdown separators), the split produces wrong parts and the parse silently returns incorrect data. No validation layer catches this.

<a id="g20-f055"></a>
### knowledge/near_miss_ledger.md is referenced but its schema and lookup protocol are not specified

`system/templates/ROLE-GPU.md:789-799` @ c71a923

`system/templates/ROLE-GPU.md:789-799 ` — `knowledge/near_miss_ledger.md` is referenced but its schema and lookup protocol are not specified in any documented file. The 3-seed confirmation path says "look up prior same-tuple NEAR-MISSes" without defining how entries are keyed or written.

<a id="g20-f056"></a>
### [DISCUSS-DONE] threshold of 5 is hardcoded to a 9-agent fleet

`system/templates/HEARTBEAT.md:477-495` @ c71a923

`system/templates/HEARTBEAT.md:477-495 ` — `[DISCUSS-DONE]` threshold of 5 is hardcoded to a 9-agent fleet. If the fleet shrinks (e.g., only 4 active agents), discussion rounds may never terminate automatically.

<a id="g20-f057"></a>
### Approach registry uses fcntl.LOCK_EX

`system/templates/ROLE-GPU.md:146-164` @ c71a923

`system/templates/ROLE-GPU.md:146-164 ` — Approach registry uses `fcntl.LOCK_EX`, which is a single-machine advisory lock. In a multi-node cluster where agents run on different compute nodes, this provides no coordination. The file is also not versioned (no `If-Match`), so concurrent writes from different nodes could corrupt it silently.

<a id="g20-f058"></a>
### Monitor's 30-min stale-claim threshold is a single hardcoded constant

`system/templates/ROLE-MONITOR.md:46-67` @ c71a923

`system/templates/ROLE-MONITOR.md:46-67 ` — Monitor's 30-min stale-claim threshold is a single hardcoded constant. Long-running tasks (>30 min training) will have claims swept prematurely. Monitor is explicitly instructed not to touch `result_latest.json`, leaving a swept claim inconsistent with queue state until Part 5 fires on next restart.

<a id="g20-f059"></a>
### --dangerously-skip-permissions is required for every agent session

`system/reference/AGENT-SETUP.md:169-172` @ c71a923

`system/reference/AGENT-SETUP.md:169-172 ` — `--dangerously-skip-permissions` is required for every agent session. This is a blanket capability grant with no mitigating sandboxing layer documented in these files. All agents in the focus area receive identical capability scope.

<a id="g20-f060"></a>
### The [EXEMPT] post mechanism has no enforcement

`system/templates/ROLE-ANALYST.md:1117-1150` @ c71a923

`system/templates/ROLE-ANALYST.md:1117-1150 ` — The `[EXEMPT]` post mechanism has no enforcement. Analysts who miss the ambition quota without posting `[EXEMPT]` face no automated consequence. The rule exists as a social norm enforced only by future meta-improvement pattern detection.

<a id="g20-f061"></a>
### Empty queue stall has no direct recovery path

`runbook.md:275-298` @ c71a923

`runbook.md:275-298 ` — Empty queue stall has no direct recovery path. Health check warns on empty queues but does not refill them. An empty queue + no analyst cycle produces a stall: GPU agents have nothing to claim, analysts might not add items if they read the queue as exhausted. The profile's `stagnation_response()` only triggers after 10 KEEP-less experiments, not on queue emptiness.

<a id="g20-f062"></a>
### No watchdog for the orchestrator itself

`README.md:42-45` @ c71a923

`README.md:42-45 ` — No watchdog for the orchestrator itself. The orchestrator is a plain `claude -p` session reading `runbook.md`. No process manager or restart mechanism. If the session dies (network drop, context overflow), the whole loop stops and must be manually resumed via Case C.

