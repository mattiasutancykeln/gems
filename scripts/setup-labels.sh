#!/usr/bin/env bash
# Idempotent label setup for the gems repo. Re-run any time.
# Uses `gh api` for compatibility with older gh versions (<2.7).
set -euo pipefail

REPO="${REPO:-mattiasutancykeln/gems}"

upsert() {
  local name="$1" color="$2" desc="$3"
  # URL-encode the label name for the GET/PATCH path
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

echo "Pipeline stages:"
upsert "stage:raw"         "ededed" "Just a URL, unvetted"
upsert "stage:summarized"  "fbca04" "LLM has read it and posted a summary comment"
upsert "stage:idea"        "0e8a16" "Has a written implementation sketch ready to reference"

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
