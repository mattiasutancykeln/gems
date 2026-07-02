import { reuseNote } from "./license-map.mjs";

const ISSUES = "https://github.com/mattiasutancykeln/gems/issues";

export function snippet(text, max = 300) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}

// Query-term coverage is only a useful signal for short keyword queries; on a
// long claim, a low match count reads as falsely weak, so it's omitted there.
const SHORT_QUERY_TERM_CAP = 6;

function fullBlock(f, rank, gemsByNumber) {
  const gemTitle = gemsByNumber.get(f.gem)?.title ?? `gem #${f.gem}`;
  const q = f.quality === "high" ? "[high] " : "";
  const cite = f.citation ? `\`${f.citation}\`${f.sha ? ` @ ${f.sha}` : ""}\n` : "";
  const matchNote = f.queryTermCount !== undefined && f.queryTermCount <= SHORT_QUERY_TERM_CAP
    ? ` · matched ${f.matched}/${f.queryTermCount} terms` : "";
  return `### ${rank}. ${f.title}   ${q}${f.category} · ${f.id}\n` +
    `${gemTitle} (gem #${f.gem}) · topics: ${f.topic.join(", ")}${matchNote}\n` +
    cite +
    `${reuseNote(f.codeReuse, f.license)}\n` +
    `${snippet(f.text)}\n` +
    `-> ${ISSUES}/${f.gem}\n`;
}

function compactLine(f, rank) {
  const cite = f.citation ? ` · \`${f.citation}\`` : "";
  const lic = f.codeReuse === "permissive" ? ` · ${f.license} (permissive)` : ` · ${f.license ?? "none"} (${f.codeReuse})`;
  return `  ${rank}. ${f.title} — ${f.id} · gem #${f.gem}${cite}${lic}`;
}

function attributionFooter(hits) {
  const repos = [...new Set(hits.map((h) => h.repo).filter(Boolean))].sort();
  if (repos.length) {
    const list = repos.map((r) => `${r} (https://github.com/${r})`).join(", ");
    return `Attribution: if you use ${hits.length > 1 ? "these findings" : "this finding"}, credit the source ${repos.length > 1 ? "repos" : "repo"}: ${list}.`;
  }
  const gems = [...new Set(hits.map((h) => h.gem))].sort((a, b) => a - b);
  const list = gems.map((g) => `#${g} (${ISSUES}/${g})`).join(", ");
  return `Attribution: if you use ${hits.length > 1 ? "these findings" : "this finding"}, credit the source ${gems.length > 1 ? "gems" : "gem"}: ${list}.`;
}

export function renderHits(hits, { gemsByNumber, heading }) {
  if (!hits.length) return heading ? `${heading}\n\n(no results)` : "(no results)";
  const parts = [];
  const top = hits[0];
  if (top.queryTermCount !== undefined && top.queryTermCount >= 2 && top.queryTermCount <= SHORT_QUERY_TERM_CAP && top.matched < top.queryTermCount / 2) {
    parts.push(`Note: weak matches - the top result covers only ${top.matched} of ${top.queryTermCount} query terms; try different terms or call gems_facets to see the vocabulary.`);
    parts.push("");
  }
  if (heading) { parts.push(heading); parts.push(""); }
  const rendered = new Set();
  let rank = 0;
  for (const h of hits) {
    if (rendered.has(h.id)) continue;
    rank += 1;
    parts.push(fullBlock(h, rank, gemsByNumber));
    rendered.add(h.id);
    const siblings = hits.filter((x) => x.clusterId === h.clusterId && !rendered.has(x.id));
    if (siblings.length) {
      parts.push(`${siblings.length + 1} takes on "${h.clusterLabel}" - compare:`);
      for (const s of siblings) { rank += 1; parts.push(compactLine(s, rank)); rendered.add(s.id); }
      parts.push("");
    }
  }
  parts.push("---", attributionFooter(hits));
  return parts.join("\n").trim() + "\n";
}

const REPO_LINE_CAP = 8;

function joinCounts(list) {
  if (!list.length) return "(none)";
  return list.map(({ value, count }) => `${value} (${count})`).join(", ");
}

// Compact discovery card: the values an agent can actually filter gems_query /
// gems_ground on, plus a short coverage line. Deliberately omits the full
// cluster and license dumps - those are browsable in corpus/by-cluster.md.
export function renderFacets(facets) {
  const { topics, categories, codeReuse, repos, totals } = facets;
  const shownRepos = repos.slice(0, REPO_LINE_CAP);
  const moreRepos = repos.length - shownRepos.length;
  const reposLine = joinCounts(shownRepos) + (moreRepos > 0 ? `, ... and ${moreRepos} more` : "");

  return [
    "## gems corpus facets",
    `${totals.gems} gems · ${totals.findings} findings · ${totals.clusters} clusters`,
    "",
    "Filter gems_query / gems_ground with any of these:",
    `- topics: ${joinCounts(topics)}`,
    `- categories: ${joinCounts(categories)}`,
    `- codeReuse: ${joinCounts(codeReuse)}`,
    "",
    `Top source repos: ${reposLine}`,
  ].join("\n") + "\n";
}

// Agent-first empty state: lead with what to try next, only then the
// vocabulary reference, and put the human-facing "file a gem" link last so
// an agent's first read is a retry plan, not a dead end.
export function renderEmpty({ q, findings, issueFormUrl, filters }) {
  const known = {
    topic: [...new Set(findings.flatMap((f) => f.topic))].sort(),
    category: [...new Set(findings.map((f) => f.category))].sort(),
    codeReuse: [...new Set(findings.map((f) => f.codeReuse))].sort(),
  };

  const lines = [
    `No findings for "${q}". Try: remove filters, broaden the query, or call gems_facets for the exact topic/category/codeReuse vocabulary.`,
  ];

  if (filters) {
    const missing = Object.entries(filters)
      .filter(([key, value]) => value != null && known[key] && !known[key].includes(value))
      .map(([key, value]) => `${key}="${value}"`);
    if (missing.length) {
      lines.push(`No findings in the corpus match ${missing.join(", ")}.`);
    }
  }

  lines.push(`Available topics: ${known.topic.join(", ")}`);
  lines.push(`If this is a real gap a human can add it: ${issueFormUrl}`);
  return lines.join("\n\n") + "\n";
}
