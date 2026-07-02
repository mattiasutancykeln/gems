# texlab

| | |
|---|---|
| Source | https://github.com/latex-lsp/texlab |
| Repo | https://github.com/latex-lsp/texlab @ `90836b9430639688576d52ca2dbc2f4216945d3b` |
| Kind | - |
| Topics | infra |
| License | GPL-3.0 (ideas-only) |
| Verdict | keep |
| Findings | 22 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/7 |

## Implementation decisions

<a id="g7-f001"></a>
### Server boot is a two-phase LSP handshake

`crates/texlab/src/server.rs:80-133` @ 90836b9

`exec` reads `InitializeParams`, keeps only `file://` workspace folders, sends static `capabilities()`, then hands off to `run`; workspace and thread pool live behind the constructed `Server`. `crates/texlab/src/server.rs:80-133 `

<a id="g7-f002"></a>
### Request routing is a fluent dispatcher

`crates/texlab/src/server/dispatch.rs:53-86` @ 90836b9

each `.on::<R,_>()` tries `req.extract` for the method, runs the handler on match, else passes the request through unchanged; the terminal `default()` replies `MethodNotFound`. `crates/texlab/src/server/dispatch.rs:53-86 `

<a id="g7-f003"></a>
### Read-only language queries run off the main loop

`crates/texlab/src/server.rs:199-229` @ 90836b9

`run_query` clones the `Arc<RwLock<Workspace>>`, acquires a read lock inside a pool task, and ships the response, so many features run concurrently against a shared immutable snapshot. `crates/texlab/src/server.rs:199-229 `

<a id="g7-f004"></a>
### Diagnostics are debounced by spawning a pool task that sleeps config().diagnostics.delay…

`crates/texlab/src/server.rs:288-295` @ 90836b9

Diagnostics are debounced by spawning a pool task that sleeps `config().diagnostics.delay` then posts an internal `Diagnostics` message back into the select loop. `crates/texlab/src/server.rs:288-295 `

<a id="g7-f005"></a>
### Document parsing is eager and total per language

`crates/base-db/src/document.rs:42-107` @ 90836b9

`Document::parse` builds the rowan green tree and semantics up front for TeX/BibTeX/aux/log/latexmkrc/file-list variants. `crates/base-db/src/document.rs:42-107 `

## Skills, prompts, tools

<a id="g7-f006"></a>
### The command surface exposed to editors is fixed at init

`crates/texlab/src/server.rs:176-186` @ 90836b9

`cleanAuxiliary`, `cleanArtifacts`, `changeEnvironment`, `findEnvironments`, `showDependencyGraph`, `cancelBuild`. `crates/texlab/src/server.rs:176-186 `

<a id="g7-f007"></a>
### Non-standard build/preview features are advertised as experimental capability flags (…

`crates/texlab/src/server.rs:188-194` @ 90836b9

Non-standard build/preview features are advertised as `experimental` capability flags (`textDocumentBuild`, `textDocumentForwardSearch`) rather than as vendored request methods. `crates/texlab/src/server.rs:188-194 `

<a id="g7-f008"></a>
### execute_command dispatches each command name to a prepared closure run through run_fallible

`crates/texlab/src/server.rs:617-663` @ 90836b9

`execute_command` dispatches each command name to a prepared closure run through `run_fallible`; unknown commands return `InvalidParams` with the offending name. `crates/texlab/src/server.rs:617-663 `

<a id="g7-f009"></a>
### Completion is a registry of 15 independent providers invoked in sequence into one shared…

`crates/completion/src/lib.rs:193-211` @ 90836b9

Completion is a registry of 15 independent providers invoked in sequence into one shared builder (`complete_commands`, `complete_citations`, `complete_label_references`, ...). `crates/completion/src/lib.rs:193-211 `

<a id="g7-f010"></a>
### Inverse search works editor-agnostically via a separate CLI subcommand that canonicalizes…

`crates/texlab/src/main.rs:71-109` @ 90836b9

Inverse search works editor-agnostically via a separate CLI subcommand that canonicalizes a path+line and sends an IPC request to the already-running server instance. `crates/texlab/src/main.rs:71-109 `

## Patterns worth porting

<a id="g7-f011"></a>
### Result assembly for completion is a single ranked funnel

`crates/completion/src/util/builder.rs:29-44` @ 90836b9

sort by preselect, then score, then per-kind `sort_index`, then label; dedup by label; truncate to `LIMIT = 50`. `crates/completion/src/util/builder.rs:29-44 ` and `crates/completion/src/lib.rs:13 `

<a id="g7-f012"></a>
### is_incomplete is set when matching is prefix-based or the result hit LIMIT , forcing the…

`crates/texlab/src/features/completion.rs:32-35` @ 90836b9

`is_incomplete` is set when matching is prefix-based or the result hit `LIMIT`, forcing the client to re-query as the user types more — a cheap way to keep fuzzy lists correct without returning everything. `crates/texlab/src/features/completion.rs:32-35 `

<a id="g7-f013"></a>
### Two-stage completion

`crates/texlab/src/features/completion.rs:49-77` @ 90836b9

the list carries only labels/edits, and expensive rendering (citeproc bib rendering, package metadata lookup) is deferred to `resolve` on the one item the user highlights. `crates/texlab/src/features/completion.rs:49-77 `

<a id="g7-f014"></a>
### Citation candidates are scored in parallel with rayon ( par_iter().filter_map(...) +…

`crates/completion/src/providers/citations.rs:17-27` @ 90836b9

Citation candidates are scored in parallel with rayon (`par_iter().filter_map(...)` + `par_extend`), keeping the matcher hot over large `.bib` files. `crates/completion/src/providers/citations.rs:17-27 `

<a id="g7-f015"></a>
### The lexer reverses its token vector once so the cursor is the vector tail: peek is last()…

`crates/parser/src/latex/lexer.rs:16-49` @ 90836b9

The lexer reverses its token vector once so the cursor is the vector tail: `peek` is `last()`, `eat` is `pop()` — O(1) consumption without an index cursor. `crates/parser/src/latex/lexer.rs:16-49 `

<a id="g7-f016"></a>
### Build cancellation is tracked by OS PID

`crates/texlab/src/server.rs:709-758` @ 90836b9

spawned builds insert their pid into a shared `pending_builds` set, `cancelBuild` drains and kills it, and completion checks whether its pid was still present to decide Success vs Cancelled. `crates/texlab/src/server.rs:709-758 `

## Open threads / weak spots

<a id="g7-f017"></a>
### Every keystroke triggers a full workspace recompute

`crates/base-db/src/workspace.rs:118-138` @ 90836b9

`edit` clones the text, splices the range, and calls `open`, which re-parses the document and rebuilds the dependency `Graph` for *all* documents in the workspace. `crates/base-db/src/workspace.rs:118-138 ` and `crates/base-db/src/workspace.rs:87-91 `

<a id="g7-f018"></a>
### $/cancelRequest is a no-op ( fn cancel returns Ok(()) ), so long-running queries dispatched to the pool cannot actually be aborted

`crates/texlab/src/server.rs:335-337` @ 90836b9

`$/cancelRequest` is a no-op (`fn cancel` returns `Ok(())`), so long-running queries dispatched to the pool cannot actually be aborted; only `shutdown` is honored. `crates/texlab/src/server.rs:335-337 `

<a id="g7-f019"></a>
### Worker tasks unwrap() the response send in run_query / run_fallible

`crates/texlab/src/server.rs:206-228` @ 90836b9

Worker tasks `unwrap()` the response send in `run_query`/`run_fallible`; a closed client channel panics the pool thread instead of degrading gracefully. `crates/texlab/src/server.rs:206-228 `

<a id="g7-f020"></a>
### semantic_tokens_range is a stub that returns Ok(()) and never sends a response

`crates/texlab/src/server.rs:681-687` @ 90836b9

`semantic_tokens_range` is a stub that returns `Ok(())` and never sends a response; it is not advertised in capabilities, but any client that called it would hang waiting. `crates/texlab/src/server.rs:681-687 `

<a id="g7-f021"></a>
### Disk loading uses String::from_utf8_unchecked on the borrowed-lossy path, relying on the…

`crates/base-db/src/workspace.rs:96-100` @ 90836b9

Disk loading uses `String::from_utf8_unchecked` on the borrowed-lossy path, relying on the invariant that a borrowed `Cow` from `from_utf8_lossy` implies valid UTF-8. `crates/base-db/src/workspace.rs:96-100 `

<a id="g7-f022"></a>
### Unused-entry diagnostics silently skip bibliographies larger than MAX_UNUSED_ENTRIES = 1000 entries, so big .bib files lose that check with no user signal

`crates/diagnostics/src/citations.rs:12` @ 90836b9

Unused-entry diagnostics silently skip bibliographies larger than `MAX_UNUSED_ENTRIES = 1000` entries, so big `.bib` files lose that check with no user signal. `crates/diagnostics/src/citations.rs:12,55-59 `

