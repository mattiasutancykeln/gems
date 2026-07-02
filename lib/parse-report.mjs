export const SECTION_CATEGORIES = [
  [/^###\s+implementation decisions/i, "impl-decision"],
  [/^###\s+skills?,?\s*prompts?,?\s*(and\s+|&\s*)?tools?/i, "skill-prompt-tool"],
  [/^###\s+patterns worth porting/i, "pattern"],
  [/^###\s+open threads/i, "weak-spot"],
];
const HIGHLIGHTS_RE = /^###\s+highlights/i;
const CITATION_RE = /[A-Za-z0-9_][A-Za-z0-9_.\/-]*\.[A-Za-z0-9_]+:L?\d+(?:-L?\d+)?|[A-Za-z0-9_][A-Za-z0-9_.\/-]*:L?\d+-L?\d+/g;
const SOURCE_RE = /\*\*Source:\*\*\s*`([\w.-]+\/[\w.-]+)`\s*@\s*`([0-9a-f]{7,40})`/i;
// A pinned-SHA attribution suffix on a citation, e.g. "@ AutoScientists@c71a923"
// or "@ owner/repo@abcdef0". CITATION_RE only ever captures the leading
// `path:line` part of a bullet's backtick span, so a bullet shaped like
// `` `path:line @ owner@sha` `` leaves this suffix behind — strip it
// separately wherever citation text is scrubbed for title/prose use.
const ATTRIBUTION_RE = /@\s*[\w.\-\/]+@[0-9a-f]{6,40}/g;

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

// Placeholder for a colon that sits inside a backtick-quoted label (e.g.
// `` `description:` ``) rather than a natural-language "Title: body" split.
// Built from a char code, not a literal, so real bullet text can never
// contain it by coincidence.
const PROTECTED_COLON = String.fromCharCode(1);

// Shorten a long sentence-title to a concise label. A truncated full sentence
// makes a poor title, so when the text runs long, prefer to end at the first
// natural clause boundary rather than a hard mid-word cut with an ellipsis:
//   - if it exceeds ~80 chars, cut at the FIRST ". ", "; ", or " - " boundary
//     that starts at position >= 20 (a clean clause end, no ellipsis);
//   - otherwise, if it still exceeds ~90 chars, cut at the last word boundary
//     before 90 chars and append "…" (never mid-word);
//   - a title of 81-90 chars with no clause boundary is left intact, so we do
//     not ellipsize a sentence that is only marginally long.
function conciseTitle(title) {
  if (title.length <= 80) return title;
  const seps = [". ", "; ", " - "];
  let boundary = -1;
  for (const sep of seps) {
    const idx = title.indexOf(sep);
    if (idx >= 20 && (boundary === -1 || idx < boundary)) boundary = idx;
  }
  if (boundary !== -1) return title.slice(0, boundary).trim();
  if (title.length <= 90) return title;
  const cut = title.slice(0, 90);
  const lastSpace = cut.lastIndexOf(" ");
  const head = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return head.trim() + "…";
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
    // A backtick span whose content ends in ":" right at the closing
    // backtick (e.g. `` `description:` ``) is quoting a field/label name,
    // not opening a "Title: body" split — protect that colon so it isn't
    // mistaken for the title/body boundary once backticks are stripped.
    // Real citations like `src/cache.ts:84-112` always have more content
    // after the colon before the closing backtick, so they never match.
    const codeProtected = textNoUrls.replace(/`([^`:]+):`/g, (_, word) => "`" + word + PROTECTED_COLON + "`");
    // strip citations, backticks, and URLs first, then split on the title
    // delimiter — otherwise a leading `path:line` citation (the common
    // "citation-first" bullet style) gets taken as the title.
    // keep the protected colon in place through the split step, so it never
    // acts as a title/body boundary — only restore it to ":" afterward.
    const plainProtected = codeProtected
      .replace(CITATION_RE, " ")
      .replace(ATTRIBUTION_RE, " ")
      .replace(/`/g, " ")
      .replace(/\*\*/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      // stripping a `citation @ owner@sha` span out of a multi-citation list
      // (e.g. "`a @ o@s` and `b @ o@s` — prose") can leave a dangling "and"
      // connector, or bare separator punctuation, at the edges of the
      // string — drop those before candidate-splitting so the connector
      // itself is never mistaken for the title.
      .replace(/^(?:and|[/,;-])(?:\s+(?:and|[/,;-]))*\s*/i, "")
      .replace(/\s*(?:and|[/,;-])(?:\s+(?:and|[/,;-]))*$/i, "");
    const restore = (s) => s.split(PROTECTED_COLON).join(":");
    // A real title must carry words, not just a line-number/citation
    // fragment. Reject a candidate that has NO alphabetic character (only
    // digits, punctuation, spaces, colons, commas, dashes) — this kills
    // leftovers like ":58-65", "161-165", or "1549 , 1803" that survive when
    // a bare secondary line range trails a stripped citation. Also reject a
    // candidate whose word characters, once punctuation/whitespace is
    // removed, are empty or shorter than 3 chars, and reject a lone connector
    // word like "(also )" that is a citation-join aside, not a label.
    const CONNECTOR_ONLY = /^(?:and|also|or|the|a|an|plus|see|via)$/i;
    const isRealTitle = (s) => {
      if (!/[A-Za-z]/.test(s)) return false;
      const core = s.replace(/[^A-Za-z0-9]+/g, " ").trim();
      if (core.replace(/\s+/g, "").length < 3) return false;
      if (CONNECTOR_ONLY.test(core)) return false;
      return true;
    };
    // split on the em-dash boundary only, then take the first candidate
    // that looks like a real title — not empty, not leftover citation-join
    // punctuation (e.g. "/ /"), not a bare line-number fragment, and not too
    // short to be meaningful.
    const dashCandidates = plainProtected.split(/\s*—\s+/).map((s) => s.trim());
    let seg = dashCandidates.find(isRealTitle) ?? plainProtected;
    // a leading "Label: description" shape should collapse to just the
    // label — but only when the colon is an early, top-level boundary. A
    // colon deep in prose, or inside a parenthetical aside (e.g. a bullet
    // quoting "(`status: running`)"), is not a title boundary and must not
    // truncate the title mid-sentence. Require the colon to land within the
    // first 60 chars of the segment, with no "(" before it, before treating
    // it as a label split. This search runs on the protected form, so a
    // backtick-protected field colon (e.g. `description:`) is invisible
    // here and never counts as a boundary.
    const colonIdx = seg.indexOf(": ");
    if (colonIdx !== -1 && colonIdx <= 60 && !seg.slice(0, colonIdx).includes("(")) {
      const labelCandidate = seg.slice(0, colonIdx).trim();
      if (isRealTitle(labelCandidate)) seg = labelCandidate;
    }
    // Only accept a real title. If the chosen segment (or the label trim of
    // it) is a wordless fragment, fall back to the whole de-cited text, then
    // to the first citation's basename, then to "(untitled)" — never emit a
    // number-only or empty title.
    if (isRealTitle(seg)) title = restore(seg);
    else if (isRealTitle(plainProtected)) title = restore(plainProtected);
    else {
      const base = citations[0] ? citations[0].split("/").pop() : null;
      title = base || "(untitled)";
    }
  }
  if (bold) {
    // bold titles are already concise; keep them, with only a hard safety cut.
    if (title.length > 120) title = title.slice(0, 117) + "…";
  } else {
    // prefer a clean clause boundary over a hard mid-word ellipsis cut.
    title = conciseTitle(title);
  }
  title = title.trim();
  return { category, title, text: cleanFindingText(bulletText, title), citation: citations[0] ?? null, citations };
}

// Agent-facing `text` should read as clean prose, not raw markdown: unwrap
// bold/italic emphasis markers (keep inline-code backticks — they render
// fine), then drop a leading span that just repeats the title (the common
// "**Title**: body" / "**Title.** body" bullet shapes), so callers never see
// the heading duplicated inside the snippet.
function cleanFindingText(bulletText, title) {
  let text = bulletText
    .replace(/\*\*([^\n]+?)\*\*/g, "$1")
    .replace(/__([^\n]+?)__/g, "$1")
    // the "@ owner@sha" attribution suffix is redundant noise once the gem
    // already records repo+sha on the finding — drop it, but keep the
    // `path:line` citation substrings it trails, as-is.
    .replace(ATTRIBUTION_RE, "");
  if (title) {
    const seps = [". ", ": ", " - ", " — "];
    const sep = seps.find((s) => text.startsWith(title + s));
    if (sep) text = text.slice((title + sep).length);
    else if (text === title + "." || text === title + ":") text = "";
  }
  return text.replace(/  +/g, " ").trim();
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
