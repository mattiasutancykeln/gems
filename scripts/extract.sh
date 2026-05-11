#!/usr/bin/env bash
# extract.sh — deep extraction pass for a stage:summarized gem.
#
# Pins the upstream to a SHA, shallow-clones it, picks the most
# interesting files, dispatches N parallel `claude -p` subagents that read
# full file contents, then runs a coordinator pass that aggregates the
# findings into one comment with strict citations.
#
# Usage:
#   extract.sh <issue#>
#   extract.sh <issue#> --workers 8 --max-files 40
#   extract.sh <issue#> --rev v1.4.2 --force
#   extract.sh <issue#> --include "src/agents/**,prompts/**"
set -euo pipefail

REPO="${REPO:-mattiasutancykeln/gems}"
WORKERS="${GEMS_WORKERS:-4}"
MAX_FILES=30
MAX_BYTES_PER_FILE=200000   # 200KB hard cap
REV=""
INCLUDE=""
FORCE=0
ISSUE=""

usage() {
  sed -n '2,15p' "$0"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --workers)    WORKERS="$2"; shift 2 ;;
    --max-files)  MAX_FILES="$2"; shift 2 ;;
    --rev)        REV="$2"; shift 2 ;;
    --include)    INCLUDE="$2"; shift 2 ;;
    --force)      FORCE=1; shift ;;
    -h|--help)    usage ;;
    -*)           echo "unknown flag: $1" >&2; exit 1 ;;
    *)            if [[ -z "$ISSUE" ]]; then ISSUE="$1"; shift; else echo "extra arg: $1" >&2; exit 1; fi ;;
  esac
done

[[ -z "$ISSUE" ]] && usage
command -v claude >/dev/null || { echo "claude CLI not found on PATH" >&2; exit 1; }
command -v gh     >/dev/null || { echo "gh CLI not found on PATH" >&2; exit 1; }

WORK=$(mktemp -d -t gems-extract.XXXXXX)
trap 'rm -rf "$WORK"' EXIT

# ── 1. Fetch issue ─────────────────────────────────────────────────────────
ISSUE_JSON=$(gh issue view "$ISSUE" --repo "$REPO" --json title,body,labels,comments)
LABELS=$(echo "$ISSUE_JSON" | python3 -c 'import json,sys; print(" ".join(l["name"] for l in json.load(sys.stdin)["labels"]))')

if [[ "$FORCE" -eq 0 ]]; then
  if echo "$LABELS" | grep -q "stage:extracting"; then
    echo "✗ #$ISSUE is already mid-extraction (stage:extracting). Pass --force to retry." >&2
    exit 1
  fi
  if echo "$LABELS" | grep -q "stage:extracted"; then
    echo "✗ #$ISSUE is already stage:extracted. Pass --force to re-extract (a new comment will be appended)." >&2
    exit 1
  fi
fi

URL=$(echo "$ISSUE_JSON" | python3 -c 'import json,re,sys
body=json.load(sys.stdin)["body"] or ""
m=re.search(r"https?://[^\s)\]]+", body)
print(m.group(0) if m else "")')

[[ -z "$URL" ]] && { echo "✗ no URL found in #$ISSUE body" >&2; exit 1; }
echo "→ #$ISSUE  URL: $URL"

# ── 2. Parse owner/repo or fall back to article mode ───────────────────────
OWNER=""; NAME=""
if [[ "$URL" =~ ^https?://github\.com/([^/]+)/([^/#?]+) ]]; then
  OWNER="${BASH_REMATCH[1]}"
  NAME="${BASH_REMATCH[2]%.git}"
fi

# Mark stage:extracting so a parallel run won't double-process.
gh issue edit "$ISSUE" --repo "$REPO" --add-label "stage:extracting" --remove-label "stage:summarized" >/dev/null 2>&1 || true

if [[ -z "$OWNER" || -z "$NAME" ]]; then
  echo "→ not a github repo URL; running single-pass article extraction"
  exec "$0.article" "$ISSUE" "$URL" 2>/dev/null || {
    # Inline fallback when no companion script exists.
    PROMPT_FILE="$WORK/prompt.txt"
    cat > "$PROMPT_FILE" <<EOF
You are extracting reusable technical insights from a single source document.

URL: $URL

Use WebFetch to read the page in full. Then produce a markdown report with these sections:

## Extraction report (article)

**Source:** <URL> (fetched $(date -u +%FT%TZ))

### Implementation decisions
- <decision> — <why it pays off>. Cite section heading or anchor.

### Skills, prompts, tools
- Same shape. Quote sparingly (≤ 3 lines per quote).

### Patterns worth porting
- ...

### Open threads / weak spots
- ...

Rules:
- Every bullet must reference a specific section, heading, paragraph, or page anchor in the source. If you cannot, drop the bullet.
- Do not summarize the page generally — produce a catalog of mineable specifics.
- Output ONLY the report markdown. No preamble.
EOF
    REPORT=$(claude -p < "$PROMPT_FILE")
    [[ -z "$REPORT" ]] && { echo "✗ claude returned empty" >&2; exit 1; }
    gh issue comment "$ISSUE" --repo "$REPO" --body "$REPORT" >/dev/null
    gh issue edit "$ISSUE" --repo "$REPO" --remove-label "stage:extracting" --add-label "stage:extracted" >/dev/null
    TITLE=$(gh issue view "$ISSUE" --repo "$REPO" --json title --jq .title | sed -E 's/^\[(raw|sum)\]/[ext]/')
    gh issue edit "$ISSUE" --repo "$REPO" --title "$TITLE" >/dev/null
    echo "✓ #$ISSUE article-extracted"
    exit 0
  }
fi

echo "→ repo: $OWNER/$NAME"

# ── 3. Resolve SHA ─────────────────────────────────────────────────────────
if [[ -z "$REV" ]]; then
  DEFAULT_BRANCH=$(gh api "repos/$OWNER/$NAME" --jq '.default_branch')
  SHA=$(gh api "repos/$OWNER/$NAME/commits/$DEFAULT_BRANCH" --jq '.sha')
else
  SHA=$(gh api "repos/$OWNER/$NAME/commits/$REV" --jq '.sha')
fi
SHORT_SHA="${SHA:0:7}"
PIN_TS=$(date -u +%FT%TZ)
echo "→ pinned: $OWNER/$NAME@$SHORT_SHA"

# ── 4. Clone (cached) ──────────────────────────────────────────────────────
CACHE="${TMPDIR:-/tmp}/gems-extract/$OWNER-$NAME-$SHORT_SHA"
if [[ ! -d "$CACHE/.git" ]]; then
  mkdir -p "$(dirname "$CACHE")"
  echo "→ cloning to $CACHE"
  git clone --depth 1 "https://github.com/$OWNER/$NAME.git" "$CACHE" >/dev/null 2>&1
  if [[ -n "$REV" ]]; then
    git -C "$CACHE" fetch --depth 1 origin "$SHA" >/dev/null 2>&1
    git -C "$CACHE" checkout -q "$SHA"
  fi
else
  echo "→ cache hit: $CACHE"
fi

# ── 5. Pick interesting files ──────────────────────────────────────────────
# Score each file; pick top MAX_FILES.
SCORED="$WORK/scored.tsv"
python3 - "$CACHE" "$INCLUDE" > "$SCORED" <<'PY'
import os, sys, fnmatch, re
root = sys.argv[1]
include = [g.strip() for g in sys.argv[2].split(",") if g.strip()] if sys.argv[2] else []
EX_DIRS = {".git","node_modules","dist","build",".next",".turbo","vendor","target",
           ".venv","venv","__pycache__",".cache","coverage",".idea",".vscode"}
EX_NAMES = {"package-lock.json","yarn.lock","pnpm-lock.yaml","poetry.lock","Cargo.lock","uv.lock","bun.lockb"}
EX_EXT  = {".png",".jpg",".jpeg",".gif",".webp",".ico",".pdf",".zip",".gz",".tar",".woff",".woff2",".ttf",".mp4",".wasm",".so",".dylib",".o",".a"}
PRIORITY_DIRS = [
    ("agents",10),("agent",10),("skills",10),("skill",10),("tools",9),("tool",9),
    ("prompts",10),("prompt",10),("sandbox",8),("router",8),("orchestrat",8),
    ("runner",8),("dispatch",8),("loop",7),("harness",9),("eval",7),
    ("src",4),("lib",3),("packages",3),("apps",3),("core",4),
]
PRIORITY_NAMES = ["agent","skill","tool","prompt","dispatch","router","runner","loop",
                  "orchestrat","sandbox","harness","scheduler","planner","executor"]
HIGH_TOP = {"readme.md","contributing.md","architecture.md","design.md"}

def score(rel, size):
    s = 0
    lower = rel.lower()
    base = os.path.basename(lower)
    if base in HIGH_TOP and "/" not in rel: s += 12
    for d, w in PRIORITY_DIRS:
        if "/"+d in "/"+lower: s += w
    for n in PRIORITY_NAMES:
        if n in base: s += 5
    if base.endswith((".md",".mdx")):       s += 2
    if base.endswith((".ts",".tsx",".js",".jsx",".py",".go",".rs",".rb",".java",".kt",".swift")): s += 3
    if base.endswith((".yml",".yaml",".toml",".json")) and size < 8000: s += 1
    if "test" in lower or "__tests__" in lower or lower.endswith(".test.ts") or lower.endswith(".spec.ts"): s -= 4
    if size > 200_000: s -= 6
    if size < 80:      s -= 4
    return s

out = []
for dp, dns, fns in os.walk(root):
    dns[:] = [d for d in dns if d not in EX_DIRS]
    for f in fns:
        full = os.path.join(dp, f)
        rel  = os.path.relpath(full, root)
        if f in EX_NAMES: continue
        if os.path.splitext(f)[1].lower() in EX_EXT: continue
        try: size = os.path.getsize(full)
        except OSError: continue
        if include and not any(fnmatch.fnmatch(rel, g) for g in include): continue
        sc = score(rel, size)
        if sc <= 0 and not include: continue
        out.append((sc, size, rel))

out.sort(key=lambda x: (-x[0], x[1]))
for sc, size, rel in out:
    print(f"{sc}\t{size}\t{rel}")
PY

TOTAL_CANDIDATES=$(wc -l < "$SCORED")
echo "→ scored $TOTAL_CANDIDATES candidate files; picking top $MAX_FILES"
PICKED="$WORK/picked.txt"
head -n "$MAX_FILES" "$SCORED" | cut -f3 > "$PICKED"

if [[ ! -s "$PICKED" ]]; then
  echo "✗ no files selected. Adjust --include or heuristics." >&2
  gh issue edit "$ISSUE" --repo "$REPO" --remove-label "stage:extracting" --add-label "stage:summarized" >/dev/null
  exit 1
fi

# ── 6. Split into worker batches ───────────────────────────────────────────
NUM_PICKED=$(wc -l < "$PICKED")
BATCH_SIZE=$(( (NUM_PICKED + WORKERS - 1) / WORKERS ))
[[ $BATCH_SIZE -lt 1 ]] && BATCH_SIZE=1
split -l "$BATCH_SIZE" "$PICKED" "$WORK/batch."

EXTRACT_PROMPT_HEADER=$(cat <<EOF
You are a code-extraction subagent reading a fixed set of files from $OWNER/$NAME pinned at commit $SHORT_SHA. Your job is to produce a *catalog of mineable specifics*, NOT a summary.

Rules — these are not suggestions:
1. Read every file end-to-end BEFORE writing anything.
2. Every finding MUST cite \`path:LINE_START-LINE_END\`. Line numbers are 1-indexed and refer to the file as provided below.
3. Do NOT cite a file you didn't read. Do NOT cite a line range you didn't open.
4. Quote at most 3 lines per finding, fenced with the file's language.
5. Skip findings you cannot cite precisely. Quality over quantity.
6. Output ONLY the four sections below in markdown — no preamble, no closing remarks.

## Implementation decisions
Non-obvious choices that pay off. ("Why this, not the naive thing?")

## Skills, prompts, tools
Skills, prompts, tools, or agent-facing surfaces that look engineered for an LLM consumer — well-bounded action spaces, observation formatting, prompt structure, retry/guard logic.

## Patterns worth porting
Reusable structures (orchestrator/worker splits, retry policies, sandboxing, citation handling, etc.).

## Open threads / weak spots
Things flagged TODO/HACK/FIXME in code, or that obviously look fragile.

Each bullet:
- \`path/to/file.ext:L_start-L_end\` — short prose (1–2 sentences). Optional fenced quote.

Repo: $OWNER/$NAME @ $SHORT_SHA
EOF
)

# ── 7. Dispatch parallel workers ───────────────────────────────────────────
echo "→ dispatching $WORKERS workers in parallel..."
WORKER_OUTS=()
i=0
for batch in "$WORK"/batch.*; do
  i=$((i+1))
  OUT="$WORK/worker.$i.out"
  WORKER_OUTS+=("$OUT")
  (
    PROMPT_FILE="$WORK/worker.$i.prompt"
    {
      echo "$EXTRACT_PROMPT_HEADER"
      echo
      echo "## Files (worker $i)"
      while IFS= read -r relpath; do
        full="$CACHE/$relpath"
        [[ -f "$full" ]] || continue
        sz=$(stat -c%s "$full" 2>/dev/null || stat -f%z "$full")
        if (( sz > MAX_BYTES_PER_FILE )); then
          echo
          echo "### \`$relpath\`  (truncated; first $MAX_BYTES_PER_FILE bytes of $sz)"
          ext="${relpath##*.}"
          echo '```'"$ext"
          head -c "$MAX_BYTES_PER_FILE" "$full" | awk '{ printf "%5d  %s\n", NR, $0 }'
          echo '```'
        else
          echo
          echo "### \`$relpath\`"
          ext="${relpath##*.}"
          echo '```'"$ext"
          awk '{ printf "%5d  %s\n", NR, $0 }' "$full"
          echo '```'
        fi
      done < "$batch"
    } > "$PROMPT_FILE"
    if ! claude -p < "$PROMPT_FILE" > "$OUT" 2>"$WORK/worker.$i.err"; then
      echo "  ✗ worker $i failed (see $WORK/worker.$i.err)" >&2
      : > "$OUT"
    else
      WORDS=$(wc -w < "$OUT")
      echo "  ✓ worker $i done ($WORDS words)"
    fi
  ) &
done
wait
echo "→ all workers finished"

# ── 8. Coordinator pass ────────────────────────────────────────────────────
COORD_PROMPT="$WORK/coord.prompt"
{
  cat <<EOF
You are the coordinator for an extraction pass on $OWNER/$NAME @ $SHORT_SHA. Below are reports from $WORKERS subagents who each read a different slice of the repo. Your job is to MERGE them into a single, ranked extraction report.

Rules:
1. Preserve every citation verbatim — do not modify \`path:line\` references.
2. Deduplicate identical or near-identical findings; merge into one bullet with both citations.
3. Rank within each section by load-bearingness (most reusable / surprising first).
4. Drop bullets that have no precise line citation.
5. Add a header with the source pin and stats.
6. Output ONLY the final report markdown.

Required header:

## Extraction report

**Source:** \`$OWNER/$NAME\` @ \`$SHA\` (pinned $PIN_TS)
**Workers:** $WORKERS • **Files read:** $NUM_PICKED of $TOTAL_CANDIDATES scored

Then the four sections: \`### Implementation decisions\`, \`### Skills, prompts, tools\`, \`### Patterns worth porting\`, \`### Open threads / weak spots\`.

After the four sections, append:

### Files read by workers
<bulleted list of the file paths below>

---

Files that were distributed to workers:
EOF
  cat "$PICKED" | sed 's/^/- /'
  echo
  echo "---"
  echo
  echo "Worker reports follow."
  j=0
  for out in "${WORKER_OUTS[@]}"; do
    j=$((j+1))
    echo
    echo "## Worker $j report"
    echo
    cat "$out"
  done
} > "$COORD_PROMPT"

echo "→ coordinator pass..."
REPORT=$(claude -p < "$COORD_PROMPT")
if [[ -z "$REPORT" ]]; then
  echo "✗ coordinator returned empty" >&2
  gh issue edit "$ISSUE" --repo "$REPO" --remove-label "stage:extracting" --add-label "stage:summarized" >/dev/null
  exit 1
fi

# ── 9. Post & relabel ──────────────────────────────────────────────────────
gh issue comment "$ISSUE" --repo "$REPO" --body "$REPORT" >/dev/null
gh issue edit "$ISSUE" --repo "$REPO" --remove-label "stage:extracting" --add-label "stage:extracted" >/dev/null
TITLE=$(gh issue view "$ISSUE" --repo "$REPO" --json title --jq .title | sed -E 's/^\[(raw|sum)\]/[ext]/')
gh issue edit "$ISSUE" --repo "$REPO" --title "$TITLE" >/dev/null
echo "✓ #$ISSUE extracted → stage:extracted ($OWNER/$NAME@$SHORT_SHA)"
