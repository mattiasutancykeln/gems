# Imbad0202/academic-research-skills — academic research skills for Claude Code

| | |
|---|---|
| Source | https://github.com/Imbad0202/academic-research-skills/pulse |
| Repo | https://github.com/Imbad0202/academic-research-skills @ `95a7a94f225315a96d5f3fb3cf4a27a7dd058dfa` |
| Kind | - |
| Topics | research |
| License | none (forbidden) |
| Verdict | keep |
| Findings | 17 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/4 |

## Implementation decisions

<a id="g4-f001"></a>
### The write-scope guard is a PreToolUse hook whose testable core is a pure evaluate_decision(payload, manifest, workspace_root, plugin_root)

`scripts/ars_write_scope_guard.py:27-28` @ 95a7a94

The write-scope guard is a `PreToolUse` hook whose testable core is a pure `evaluate_decision(payload, manifest, workspace_root, plugin_root)`; `main()` only wires stdin->decision->stdout JSON, so the policy is unit-testable without a live hook. `scripts/ars_write_scope_guard.py:27-28,288 `

<a id="g4-f002"></a>
### Bash is denied wholesale for the 23 fenced single-phase agents rather than filtered: they reason that neither a denylist of "writes a file" nor an allowlist of "read-only" commands is decidable from a command string, so all-deny is the only zero-fail-open policy

`scripts/ars_write_scope_guard.py:334-349` @ 95a7a94

Bash is denied wholesale for the 23 fenced single-phase agents rather than filtered: they reason that neither a denylist of "writes a file" nor an allowlist of "read-only" commands is decidable from a command string, so all-deny is the only zero-fail-open policy; agents use Grep/Glob to search and Write/Edit/MultiEdit to write. `scripts/ars_write_scope_guard.py:334-349 `

<a id="g4-f003"></a>
### Path normalization uses os.path.realpath (not abspath ) so .

`scripts/ars_write_scope_guard.py:123-129` @ 95a7a94

Path normalization uses `os.path.realpath` (not `abspath`) so `..` and symlinks resolve together in true filesystem order; abspath would collapse `..` lexically and blind the guard to a symlinked-dir escape. `scripts/ars_write_scope_guard.py:123-129 `

<a id="g4-f004"></a>
### The hook renders a deny as explicit permissionDecision:"deny" but a non-deny as a bare…

`scripts/ars_write_scope_guard.py:420-438` @ 95a7a94

The hook renders a deny as explicit `permissionDecision:"deny"` but a non-deny as a bare pass-through with NO `permissionDecision` key — emitting `"allow"` would grant and skip every other permission rule; a guard that only adds denials must never widen. `scripts/ars_write_scope_guard.py:420-438 `

## Skills, prompts, tools

<a id="g4-f005"></a>
### Socratic/guided modes activate on detected user *intent* (no clear question, "guide me", uncertainty) rather than keywords, so they work in any language

`deep-research/SKILL.md:62-80` @ 95a7a94

Socratic/guided modes activate on detected user *intent* (no clear question, "guide me", uncertainty) rather than keywords, so they work in any language; the coarse skill-trigger keyword list stays EN + Traditional Chinese. `deep-research/SKILL.md:62-80 `

<a id="g4-f006"></a>
### The offline citation-existence gate cross-checks each reference against four bibliographic indexes

`scripts/arxiv_client.py:174-219` @ 95a7a94

The offline citation-existence gate cross-checks each reference against four bibliographic indexes; the arXiv resolver does ID-first lookup gated by a mandatory 0.70 title cross-check (ID_MISMATCH -> None) then an exact-title-or-bust fallback. `scripts/arxiv_client.py:174-219 `

<a id="g4-f007"></a>
### A closed _GENERIC_TITLES frozenset (editorial, erratum, case report, …) demotes bare…

`scripts/_text_similarity.py:102-139` @ 95a7a94

A closed `_GENERIC_TITLES` frozenset (editorial, erratum, case report, …) demotes bare generic titles to `unresolvable` unless a DOI/arXiv ID corroborates, so a title like "Editorial" that collides across thousands of works never counts as a `matched` verdict. `scripts/_text_similarity.py:102-139 `

<a id="g4-f008"></a>
### verify_passport.py REFUSES (exit 2) to emit a verification summary from a passport alone, because ref_slug is a prose-sourced join from <!--ref:slug--> markers that a passport doesn't carry

`scripts/verify_passport.py:85-106` @ 95a7a94

`verify_passport.py` REFUSES (exit 2) to emit a verification summary from a passport alone, because `ref_slug` is a prose-sourced join from `<!--ref:slug-->` markers that a passport doesn't carry; a `--synthetic-ref-slug` flag gives diagnostic-only output with a stderr warning. `scripts/verify_passport.py:85-106 `

## Patterns worth porting

<a id="g4-f009"></a>
### Anchor infra self-protection on the PLUGIN root, not the user's PROJECT root: matching the guard's own filenames against a user path (#448) wrongly denied a user's identically-named CLAUDE.md / hooks/*.sh

`scripts/ars_write_scope_guard.py:222-261` @ 95a7a94

Anchor infra self-protection on the PLUGIN root, not the user's PROJECT root: matching the guard's own filenames against a user path (#448) wrongly denied a user's identically-named `CLAUDE.md`/`hooks/*.sh`; the fix resolves the target inside `plugin_root` before any glob match and runs infra-protection *before* the workspace-escape check. `scripts/ars_write_scope_guard.py:222-261,363-382 `

<a id="g4-f010"></a>
### Segment-aware glob matching implemented as an iterative NFA over (path_index,…

`scripts/ars_write_scope_guard.py:149-189` @ 95a7a94

Segment-aware glob matching implemented as an iterative NFA over `(path_index, pattern_index)` states with a visited set, deliberately replacing recursion because `**` recursed once per segment and overflowed Python's recursion limit on deep paths, crashing the hook. `scripts/ars_write_scope_guard.py:149-189 `

<a id="g4-f011"></a>
### Fail-closed block parsing for the diff/patch revision toolchain: unclassifiable input raises BlockParseError naming the construct rather than guessing, and blocks carry UTF-8 byte-span offsets so the apply side splices the original stream without re-serializing

`scripts/_block_parser.py:9-29` @ 95a7a94

Fail-closed block parsing for the diff/patch revision toolchain: unclassifiable input raises `BlockParseError` naming the construct rather than guessing, and blocks carry UTF-8 byte-span offsets so the apply side splices the original stream without re-serializing. `scripts/_block_parser.py:9-29,55-67 `

<a id="g4-f012"></a>
### Elapsed-time throttling standardized on time.monotonic (not time.time ) across the API…

`scripts/arxiv_client.py:101-109` @ 95a7a94

Elapsed-time throttling standardized on `time.monotonic` (not `time.time`) across the API clients so NTP/manual clock adjustments can't make pacing go backward. `scripts/arxiv_client.py:101-109 `

<a id="g4-f013"></a>
### A shared-launcher hook shim ( sh ) that probes for a real Python via a stdout marker,…

`hooks/run_guard.sh:14-33` @ 95a7a94

A shared-launcher hook shim (`sh`) that probes for a real Python via a stdout marker, skips the 0-byte Windows Store `python3` stub, and on any degraded path emits valid pass-through JSON and exits 0 — never non-zero, never per-call stderr on the hot path. `hooks/run_guard.sh:14-33,55-60 `

## Open threads / weak spots

<a id="g4-f014"></a>
### + phase6_*/

`scripts/ars_phase_scope_manifest.json:6` @ 95a7a94

`draft_writer_agent` is the one Bucket A agent with a multi-phase static write union (`phase4_*/` + `phase6_*/`) because the hook payload never carries the invocation phase; this permits a Phase 4 call to write `phase6_*/` and vice-versa. Bounded inflation, tracked as #330, real fix deferred to per-invocation scope grants. `scripts/ars_phase_scope_manifest.json:6 (_known_multiphase_static_union) `

<a id="g4-f015"></a>
### The guard enforces phase ISOLATION, not artifact OWNERSHIP

`scripts/ars_phase_scope_manifest.json:6` @ 95a7a94

a fenced agent can still overwrite another file inside its own phase dir — and it does not disambiguate same-phase-number cross-skill collisions in a hypothetical shared flat workspace (deferred). `scripts/ars_phase_scope_manifest.json:6 (_coverage_claim) `

<a id="g4-f016"></a>
### The Windows \ -> / rewrite in glob matching is gated on os.sep == "\\" after a cross-model…

`scripts/ars_write_scope_guard.py:205-219` @ 95a7a94

The Windows `\`->`/` rewrite in glob matching is gated on `os.sep == "\\"` after a cross-model review caught that an unconditional replace would split a POSIX filename literally containing a backslash into two segments and let it masquerade as a phase dir (fence-escape false-allow, #330/PR#450). `scripts/ars_write_scope_guard.py:205-219 `

<a id="g4-f017"></a>
### The temporal-integrity verifier is regex/heuristic and self-described advisory-only, covering 5 failure modes (retrospective arithmetic, anachronistic citation, unmaterialized comparator, causal inversion, deictic present) at an estimated 55-75% coverage

`scripts/temporal_integrity_audit.py:1-16` @ 95a7a94

The temporal-integrity verifier is regex/heuristic and self-described advisory-only, covering 5 failure modes (retrospective arithmetic, anachronistic citation, unmaterialized comparator, causal inversion, deictic present) at an estimated 55-75% coverage; a v3.9.4.1 hotfix shows `_date_to_interval` silently `ValueError`'d on schema-valid `YYYY-MM` / interval dates, skipping the check entirely. `scripts/temporal_integrity_audit.py:1-16,93-120 `

