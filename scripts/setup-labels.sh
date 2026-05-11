#!/usr/bin/env bash
# Idempotent label setup for the gems repo. Re-run any time.
# Uses `gh api` for compatibility with older gh versions (<2.7).
set -euo pipefail

REPO="${REPO:-mattiasutancykeln/gems}"

upsert() {
  local name="$1" color="$2" desc="$3"
  local enc
  enc=$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=""))' "$name")
  if gh api "repos/$REPO/labels/$enc" >/dev/null 2>&1; then
    gh api -X PATCH "repos/$REPO/labels/$enc" \
      -f new_name="$name" -f color="$color" -f description="$desc" >/dev/null
  else
    gh api -X POST "repos/$REPO/labels" \
      -f name="$name" -f color="$color" -f description="$desc" >/dev/null
  fi
  echo "  $name"
}

rename_label() {
  # If old label exists and new doesn't, rename. Otherwise no-op.
  local old="$1" new="$2"
  local enc_old enc_new
  enc_old=$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=""))' "$old")
  enc_new=$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=""))' "$new")
  if gh api "repos/$REPO/labels/$enc_old" >/dev/null 2>&1 \
     && ! gh api "repos/$REPO/labels/$enc_new" >/dev/null 2>&1; then
    gh api -X PATCH "repos/$REPO/labels/$enc_old" -f new_name="$new" >/dev/null
    echo "  renamed $old → $new"
  fi
}

# Migrate older naming.
rename_label "stage:idea" "stage:extracted"

echo "Pipeline stages:"
upsert "stage:raw"         "ededed" "Just a URL, unvetted"
upsert "stage:summarized"  "fbca04" "LLM has read it and posted a TL;DR + highlights comment"
upsert "stage:extracting"  "ff9f1c" "Extraction in progress — do not re-run extract.sh on this issue"
upsert "stage:extracted"   "0e8a16" "Has a deep technical report citing files, line ranges, and a pinned SHA"

echo "Source kind:"
upsert "source:repo"       "c5def5" "Open source repository"
upsert "source:article"    "c5def5" "Blog post / article"
upsert "source:paper"      "c5def5" "Academic paper"

echo "Topic:"
upsert "topic:agent"       "d4c5f9" "Agent design / harness"
upsert "topic:eval"        "d4c5f9" "Evaluation / benchmarks"
upsert "topic:infra"       "d4c5f9" "Infrastructure / tooling"
upsert "topic:ux"          "d4c5f9" "User experience / interface"
upsert "topic:research"    "d4c5f9" "Research / methodology"

echo "Quality / status:"
upsert "quality:high"      "b60205" "Promoted gem — surface first when ravaging"
upsert "status:claimed"    "1d76db" "Someone is actively building from this"
upsert "status:built"      "0e8a16" "Landed in shepherd — closing comment links the PR"

echo "Done."
