export const SECTION_CATEGORIES = [
  [/^###\s+implementation decisions/i, "impl-decision"],
  [/^###\s+skills?,?\s*prompts?,?\s*(and\s+|&\s*)?tools?/i, "skill-prompt-tool"],
  [/^###\s+patterns worth porting/i, "pattern"],
  [/^###\s+open threads/i, "weak-spot"],
];
const HIGHLIGHTS_RE = /^###\s+highlights/i;
const CITATION_RE = /[A-Za-z0-9_][A-Za-z0-9_.\/-]*\.[A-Za-z0-9_]+:L?\d+(?:-L?\d+)?|[A-Za-z0-9_][A-Za-z0-9_.\/-]*:L?\d+-L?\d+/g;
const SOURCE_RE = /\*\*Source:\*\*\s*`([\w.-]+\/[\w.-]+)`\s*@\s*`([0-9a-f]{7,40})`/i;

function label(labels, prefix) {
  const hit = labels.find((l) => l.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

function splitSections(comment) {
  // -> [{ heading, lines[] }] for every ### section
  const lines = comment.split("\n");
  const sections = [];
  let cur = null;
  for (const line of lines) {
    if (/^###\s+/.test(line)) { cur = { heading: line, lines: [] }; sections.push(cur); }
    else if (/^##\s+/.test(line)) { cur = null; }
    else if (cur) cur.lines.push(line);
  }
  return sections;
}

function splitBullets(lines) {
  // top-level "- " bullets; continuation = any following line that is not a new bullet/heading,
  // stopping at a blank line followed by a non-indented, non-bullet line
  const bullets = [];
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^- /.test(line)) { cur = [line.slice(2)]; bullets.push(cur); }
    else if (cur && line.trim() === "") {
      const next = lines[i + 1] ?? "";
      if (/^(\s+\S|- )/.test(next)) cur.push(""); else cur = null;
    } else if (cur && /^\s+\S/.test(line)) cur.push(line.trim());
    else cur = null;
  }
  return bullets.map((b) => b.join("\n").trim()).filter(Boolean);
}

function bulletToFinding(bulletText, category) {
  // strip URLs before citation-matching so a citation-shaped substring inside
  // a URL (e.g. a github.com/.../blob/.../file.ts:12-34 link) never counts.
  const textNoUrls = bulletText.replace(/https?:\/\/\S+/g, " ");
  const citations = [...new Set(textNoUrls.match(CITATION_RE) ?? [])];
  const bold = bulletText.match(/\*\*(.+?)\*\*/);
  let title;
  if (bold) title = bold[1].replace(/[.:]\s*$/, "").replace(/`/g, "");
  else {
    // strip citations, backticks, and URLs first, then split on the title
    // delimiter — otherwise a leading `path:line` citation (the common
    // "citation-first" bullet style) gets taken as the title.
    const plain = textNoUrls
      .replace(CITATION_RE, " ")
      .replace(/`/g, " ")
      .replace(/\*\*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const parts = plain.split(/\s*—\s+|:\s+/).map((s) => s.trim()).filter(Boolean);
    title = parts[0] ?? "";
  }
  if (title.length > 120) title = title.slice(0, 117) + "…";
  return { category, title: title.trim(), text: bulletText, citation: citations[0] ?? null, citations };
}

export function parseIssue(issue) {
  const warnings = [];
  const labels = issue.labels;
  const title = issue.title.replace(/^\[(raw|sum|ext)\]\s*/, "").replace(/^github\.com\s*—\s*/, "");
  const bodyUrl = (issue.body.match(/https?:\/\/\S+/) ?? [null])[0];

  // pick the source comment: last "## Extraction report", else last with a canonical section, else last with Highlights
  const isExt = (c) => /^##\s+Extraction report/m.test(c);
  const hasCanonical = (c) => splitSections(c).some((s) => SECTION_CATEGORIES.some(([re]) => re.test(s.heading)));
  const extComments = issue.comments.filter(isExt);
  const canonicalFallback = issue.comments.filter((c) => !isExt(c) && hasCanonical(c));
  const reportComment = extComments.at(-1) ?? canonicalFallback.at(-1) ?? null;

  // repo + sha: Source line first, then github URL in body
  let repo = null, sha = null;
  const src = (reportComment ?? "").match(SOURCE_RE);
  if (src) { repo = src[1]; sha = src[2]; }
  if (!repo && bodyUrl) {
    const gh = bodyUrl.match(/github\.com\/([\w.-]+\/[\w.-]+)/);
    if (gh) repo = gh[1].replace(/\.git$/, "");
  }

  // verdict: from any comment's "### Verdict" section, first keep/promote/discard word
  let verdict = null;
  for (const c of issue.comments) {
    for (const s of splitSections(c)) {
      if (/^###\s+verdict/i.test(s.heading)) {
        const m = s.lines.join(" ").match(/\b(keep|promote|discard)\b/i);
        if (m) verdict = m[1].toLowerCase();
      }
    }
  }

  const findings = [];
  const push = (bullet, category) => {
    const f = bulletToFinding(bullet, category);
    f.id = `g${issue.number}-f${String(findings.length + 1).padStart(3, "0")}`;
    f.gem = issue.number;
    f.repo = repo;
    f.sha = sha ? sha.slice(0, 7) : null;
    if (category !== "highlight" && !f.citation)
      warnings.push(`gem #${issue.number} ${f.id} ("${f.title}"): no citation in a code section`);
    findings.push(f);
  };

  if (reportComment) {
    for (const s of splitSections(reportComment)) {
      const cat = SECTION_CATEGORIES.find(([re]) => re.test(s.heading))?.[1];
      if (!cat) continue;
      for (const b of splitBullets(s.lines)) push(b, cat);
    }
  } else {
    const sumComment = [...issue.comments].reverse().find((c) => splitSections(c).some((s) => HIGHLIGHTS_RE.test(s.heading)));
    if (sumComment) {
      for (const s of splitSections(sumComment)) {
        if (!HIGHLIGHTS_RE.test(s.heading)) continue;
        for (const b of splitBullets(s.lines)) push(b, "highlight");
      }
    } else warnings.push(`gem #${issue.number}: no parseable report or highlights comment`);
  }

  const gem = {
    number: issue.number, title, url: bodyUrl, repo, sha,
    source: label(labels, "source:"), topics: labels.filter((l) => l.startsWith("topic:")).map((l) => l.slice(6)).sort(),
    verdict, quality: labels.includes("quality:high") ? "high" : "normal",
    stage: label(labels, "stage:"),
  };
  return { gem, findings, warnings };
}
