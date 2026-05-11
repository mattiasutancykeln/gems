#!/usr/bin/env bash
# Idempotent label setup for the gems repo. Re-run any time.
set -euo pipefail

REPO="${REPO:-mattiasutancykeln/gems}"

create() {
  local name="$1" color="$2" desc="$3"
  if gh label list --repo "$REPO" --limit 200 | awk '{print $1}' | grep -qx "$name"; then
    gh label edit "$name" --repo "$REPO" --color "$color" --description "$desc" >/dev/null
  else
    gh label create "$name" --repo "$REPO" --color "$color" --description "$desc" >/dev/null
  fi
  echo "  $name"
}

echo "Pipeline stages (exactly one per issue):"
create "stage:raw"         "ededed" "Just a URL, unvetted"
create "stage:summarized"  "fbca04" "LLM has read it and posted a summary comment"
create "stage:idea"        "0e8a16" "Has a written implementation sketch ready to reference"

echo "Source kind:"
create "source:repo"       "c5def5" "Open source repository"
create "source:article"    "c5def5" "Blog post / article"
create "source:paper"      "c5def5" "Academic paper"

echo "Topic:"
create "topic:agent"       "d4c5f9" "Agent design / harness"
create "topic:eval"        "d4c5f9" "Evaluation / benchmarks"
create "topic:infra"       "d4c5f9" "Infrastructure / tooling"
create "topic:ux"          "d4c5f9" "User experience / interface"
create "topic:research"    "d4c5f9" "Research / methodology"

echo "Quality / status:"
create "quality:high"      "b60205" "Promoted gem — surface first when ravaging"
create "status:claimed"    "1d76db" "Someone is actively building from this"
create "status:built"      "0e8a16" "Landed in shepherd — closing comment links the PR"

echo "Done."
