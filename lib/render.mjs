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
  return parts.join("\n").trim() + "\n";
}

export function renderEmpty({ q, findings, issueFormUrl }) {
  const topics = [...new Set(findings.flatMap((f) => f.topic))].sort().join(", ");
  return `No findings for "${q}".\n\n` +
    `Available topics: ${topics}\n` +
    `Try again without filters, broaden the query, or submit this as a new gem: ${issueFormUrl}\n`;
}
