# texlab

| | |
|---|---|
| Source | https://github.com/latex-lsp/texlab |
| Repo | https://github.com/latex-lsp/texlab |
| Kind | - |
| Topics | infra |
| License | GPL-3.0 (ideas-only) |
| Verdict | keep |
| Findings | 4 |
| Issue | https://github.com/mattiasutancykeln/gems/issues/7 |

## Implementation decisions

<a id="g7-f001"></a>
### %! filename.tex lines delimit files

`%! filename.tex` lines delimit files

<a id="g7-f002"></a>
### | marks the cursor position inline in source text

`|` marks the cursor position inline in source text

<a id="g7-f003"></a>
### ^ marks a range (multiple carets = range width)

`^` marks a range (multiple carets = range width)

<a id="g7-f004"></a>
### Fixture::parse() converts this into a Workspace with multiple Document entries

`Fixture::parse()` converts this into a `Workspace` with multiple `Document` entries

