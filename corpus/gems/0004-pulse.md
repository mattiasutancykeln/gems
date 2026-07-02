# pulse

| | |
|---|---|
| Source | https://github.com/Imbad0202/academic-research-skills/pulse |
| Repo | https://github.com/Imbad0202/academic-research-skills |
| Kind | - |
| Topics | - |
| License | none (forbidden) |
| Verdict | keep |
| Findings | 6 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/4 |

## Open threads / weak spots

<a id="g4-f001"></a>
### Claim Audit is default-OFF with deferred ramp-on

The `ARS_CLAIM_AUDIT=1` gate is disabled by default because calibration evidence hasn't been gathered yet. The ramp-on plan is described as "deferred to post-calibration evidence" — this is deliberately conservative but means the strongest quality gate isn't active by default.

<a id="g4-f002"></a>
### Material Passport hash collision unaddressed

`resume_from_passport=<hash>` locates by hash match; if two boundary entries share a hash (unlikely but not impossible with short hashes), the first match wins and the second is silently ignored.

<a id="g4-f003"></a>
### Cross-Model DA has no fallback content

On `[CROSS-MODEL-ERROR]`, the protocol logs the error and continues with single-model DA without surfacing to the user. If the cross-model consistently fails, users may not realize the verification step is permanently skipped.

<a id="g4-f004"></a>
### Calibration mode requires user-supplied gold papers

The protocol specifies "5x per gold paper, cross-model default-on" but doesn't specify how gold papers are provided or validated. Without a standardized gold set, calibration results are not comparable across sessions.

<a id="g4-f005"></a>
### collaboration_depth_agent is advisory-only with no gate

`collaboration_depth_agent` is advisory-only with no gate. Observer role, never blocks. Based on Wang & Zhang (2026) — a citation to work that appears to be in-progress or very recent. The rubric it applies may not be stable.

<a id="g4-f006"></a>
### Parallel Phase 1 review requires trust that agents don't cross-reference

IRON RULE 2 says 5 reviewers review independently, but there's no technical enforcement — it relies on the agents honoring the constraint in their prompts. A model with long context could theoretically see prior reviewer outputs in the same session.

