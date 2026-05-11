# gems

Inbox for interesting repos, articles, and papers. Each item progresses through three stages via labels:

| Stage | Label | What's in the issue |
| --- | --- | --- |
| Raw | `stage:raw` | Just a URL + maybe a one-line note. Unvetted. |
| Summarized | `stage:summarized` | An LLM has read it and posted a summary + highlights as a comment. |
| Idea | `stage:idea` | A written implementation sketch lives in the issue, ready to reference from a shepherd issue or plan. |

Items never get deleted — they only flip labels and accumulate comments. The raw URL stays in the issue body forever.

## Adding things

- Web/mobile: New Issue → "Gem" template → paste URL → submit. Lands as `stage:raw`.
- CLI: `gh issue create --repo mattiasutancykeln/gems --template gem.yml`
- One-liner: `scripts/add.sh https://… "optional note"`

## Pipeline

```
stage:raw  ──(scripts/mine.sh)──▶  stage:summarized  ──(scripts/promote.sh ISSUE)──▶  stage:idea
```

- `scripts/mine.sh` — fetches all `stage:raw` issues, has Claude read the link, posts a summary comment, relabels to `stage:summarized`. Run when the inbox feels heavy.
- `scripts/promote.sh <issue#>` — drafts a concrete implementation sketch on a `stage:summarized` issue and relabels to `stage:idea`.

## Referencing from shepherd

In a shepherd issue, PR, or implementation plan, link directly:

```
See mattiasutancykeln/gems#42 for the underlying pattern.
```

GitHub renders the title inline. When ravaging for new work, browse `stage:idea` first:

```
gh issue list --repo mattiasutancykeln/gems --label stage:idea --state open
```

## Labels

- `stage:raw` / `stage:summarized` / `stage:idea` — pipeline stage (exactly one)
- `source:repo` / `source:article` / `source:paper` — what kind of thing it is
- `topic:agent` / `topic:eval` / `topic:infra` / `topic:ux` / `topic:research` — coarse subject
- `quality:high` — promoted gems, worth surfacing first
- `status:claimed` — someone is actively building from this
- `status:built` — landed in shepherd; link the PR in a closing comment

Close issues only when `status:built` or when explicitly discarded (comment why).
