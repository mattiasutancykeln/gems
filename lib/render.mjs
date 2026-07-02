import { reuseNote } from "./license-map.mjs";

const ISSUES = "https://github.com/mattiasutancykeln/gems/issues";

export function snippet(text, max = 300) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}

function fullBlock(f, rank, gemsByNumber) {
  const gemTitle = gemsByNumber.get(f.gem)?.title ?? `gem #${f.gem}`;
  const q = f.quality === "high" ? "[high] " : "";
  const cite = f.citation ? `\`${f.citation}\`${f.sha ? ` @ ${f.sha}` : ""}\n` : "";
  return `### ${rank}. ${f.title}   ${q}${f.category}\n` +
    `${gemTitle} (gem #${f.gem}) · topics: ${f.topic.join(", ")}\n` +
    cite +
    `${reuseNote(f.codeReuse, f.license)}\n` +
    `${snippet(f.text)}\n` +
    `-> ${ISSUES}/${f.gem}\n`;
}

function compactLine(f, rank) {
  const cite = f.citation ? ` · \`${f.citation}\`` : "";
  const lic = f.codeReuse === "permissive" ? ` · ${f.license} (permissive)` : ` · ${f.license ?? "none"} (${f.codeReuse})`;
  return `  ${rank}. ${f.title} — gem #${f.gem}${cite}${lic}`;
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
  const parts = heading ? [heading, ""] : [];
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

export function renderEmpty({ q, findings, issueFormUrl }) {
  const topics = [...new Set(findings.flatMap((f) => f.topic))].sort().join(", ");
  return `No findings for "${q}".\n\n` +
    `Available topics: ${topics}\n` +
    `Try again without filters, broaden the query, or submit this as a new gem: ${issueFormUrl}\n`;
}
