#!/usr/bin/env bash
# Promote a stage:summarized issue → stage:idea by drafting an implementation
# sketch as a comment.
#
# Usage: scripts/promote.sh <issue#>
set -euo pipefail

REPO="${REPO:-mattiasutancykeln/gems}"

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <issue#>" >&2
  exit 1
fi

N="$1"

CONTEXT=$(gh issue view "$N" --repo "$REPO" --json title,body,comments \
  --jq '"# " + .title + "\n\n" + .body + "\n\n---\n\n" + ([.comments[].body] | join("\n\n---\n\n"))')

PROMPT="A saved link has been summarized. Below is the full issue + comments. Draft a concrete implementation sketch for how shepherd could adopt or adapt the idea.

Sections:

### What to build
2–4 sentences. Concrete scope, not vision.

### Why now
What current shepherd pain or roadmap item this addresses. If speculative, say so.

### Sketch
- Files / modules likely touched
- Key interfaces or data shapes
- One non-obvious risk

### Effort
S / M / L with a one-line justification.

### Open questions
2–4 questions a planner should resolve before starting.

Output ONLY the comment body in markdown.

---

$CONTEXT"

SKETCH=$(claude -p "$PROMPT")

if [[ -z "$SKETCH" ]]; then
  echo "claude returned empty, aborting" >&2
  exit 1
fi

gh issue comment "$N" --repo "$REPO" --body "$SKETCH" >/dev/null
gh issue edit "$N" --repo "$REPO" --remove-label "stage:summarized" --add-label "stage:idea" >/dev/null
TITLE=$(gh issue view "$N" --repo "$REPO" --json title --jq .title | sed -E 's/^\[(raw|sum)\]/[idea]/')
gh issue edit "$N" --repo "$REPO" --title "$TITLE" >/dev/null
echo "✓ #$N promoted to stage:idea"
