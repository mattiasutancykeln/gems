#!/usr/bin/env bash
# Walk every stage:raw issue, ask Claude to read it and post a summary comment,
# then relabel stage:raw → stage:summarized.
#
# Requires: gh (authed), claude CLI on PATH.
# Usage: scripts/mine.sh [--limit N] [--dry-run]
set -euo pipefail

REPO="${REPO:-mattiasutancykeln/gems}"
LIMIT=50
DRY=0
PREP_ONLY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --limit)     LIMIT="$2"; shift 2 ;;
    --dry-run)   DRY=1; shift ;;
    --prep-only) PREP_ONLY=1; shift ;;
    *) echo "unknown arg: $1" >&2; exit 1 ;;
  esac
done

mapfile -t ISSUES < <(gh issue list --repo "$REPO" --label "stage:raw" --state open --limit "$LIMIT" --json number --jq '.[].number')

if [[ ${#ISSUES[@]} -eq 0 ]]; then
  echo "No stage:raw issues. Inbox is empty."
  exit 0
fi

echo "Mining ${#ISSUES[@]} raw issue(s) in $REPO..."

for n in "${ISSUES[@]}"; do
  echo "── #$n ──"
  BODY=$(gh issue view "$n" --repo "$REPO" --json title,body --jq '"# " + .title + "\n\n" + .body')
  URL=$(echo "$BODY" | grep -oE 'https?://[^[:space:]]+' | head -1 || true)

  if [[ -z "$URL" ]]; then
    echo "  no URL found, skipping"
    continue
  fi

  PROMPT="You're triaging a saved link for later reference. URL: $URL

Read the page (use WebFetch). Produce a comment with these sections, terse:

### TL;DR
One sentence — what is this and why might it matter.

### Highlights
3–6 bullets of the most reusable / surprising / load-bearing ideas. Quote sparingly.

### Connections
Where this might plug into shepherd (agent harness, eval, sandbox, citations, etc.). If nothing obvious, say so.

### Verdict
One of: keep / promote / discard, with a sentence of reasoning.

Output ONLY the comment body in markdown. No preamble."

  if [[ $DRY -eq 1 ]]; then
    echo "  [dry-run] would summarize $URL"
    continue
  fi

  if [[ $PREP_ONLY -eq 1 ]]; then
    printf 'PREP_ITEM\n'
    printf 'issue=%s\n' "$n"
    printf 'url=%s\n' "$URL"
    printf 'prompt=%s\n' "$PROMPT"
    printf -- '---\n'
    continue
  fi

  SUMMARY=$(claude -p "$PROMPT" --allowedTools WebFetch 2>/dev/null || true)
  if [[ -z "$SUMMARY" ]]; then
    echo "  claude returned empty, skipping"
    continue
  fi

  gh issue comment "$n" --repo "$REPO" --body "$SUMMARY" >/dev/null
  gh issue edit "$n" --repo "$REPO" --remove-label "stage:raw" --add-label "stage:summarized" >/dev/null
  # retitle [raw] → [sum]
  TITLE=$(gh issue view "$n" --repo "$REPO" --json title --jq .title | sed 's/^\[raw\]/[sum]/')
  gh issue edit "$n" --repo "$REPO" --title "$TITLE" >/dev/null
  echo "  ✓ summarized"
done

echo "Done."
