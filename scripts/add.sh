#!/usr/bin/env bash
# Add a raw gem quickly: scripts/add.sh <url> [note...]
set -euo pipefail

REPO="${REPO:-mattiasutancykeln/gems}"

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <url> [note...]" >&2
  exit 1
fi

URL="$1"; shift
NOTE="${*:-}"

# Title: domain + last path segment, prefixed [raw]
TITLE="[raw] $(echo "$URL" | sed -E 's#^https?://(www\.)?##; s#/$##' | awk -F/ '{n=NF; if (n>=2) print $1" — "$n; else print $1}')"

BODY=$'### URL\n'"$URL"
if [[ -n "$NOTE" ]]; then
  BODY+=$'\n\n### Note\n'"$NOTE"
fi

gh issue create --repo "$REPO" --title "$TITLE" --label "stage:raw" --body "$BODY"
