function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

// Small English stopword set. Kept short and boring on purpose: it only
// needs to strip glue words that would otherwise inflate accidental overlap
// between unrelated findings, not do real NLP.
const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "are", "was",
  "not", "but", "its", "per", "via", "a", "an", "of", "to", "in", "on", "by",
  "is", "as", "at", "or",
]);

// Citation shape: `path/to/file.ext:123` or `path/to/file.ext:123-456` (with
// an optional leading `L` on the line numbers). Matched against a whole
// whitespace-delimited token, so it only fires on citation-looking tokens,
// not on prose that merely contains a colon.
const CITATION_TOKEN_RE = /^\S+:L?\d+(?:-L?\d+)?$/;

// Turn raw "title + text" into the content-only token list used for the
// similarity signal. This is a similarity-signal transform ONLY: callers
// must not use this to mutate the findings they return.
function cleanContentTokens(raw) {
  let s = raw;
  // Strip markdown inline code spans entirely (their content is almost
  // always a path, symbol, or citation fragment, not prose).
  s = s.replace(/`[^`]*`/g, " ");
  // Strip URLs.
  s = s.replace(/https?:\/\/\S+/g, " ");
  // Strip markdown emphasis markers, keeping the emphasized words.
  s = s.replace(/\*\*/g, " ");

  // Drop whole whitespace-delimited tokens that are path segments or
  // citation-shaped BEFORE the generic non-alphanumeric split below, since
  // that split would otherwise destroy the "/" and ":" that identify them.
  const words = s.split(/\s+/).filter(Boolean).filter((w) => {
    if (w.includes("/")) return false; // path segment, e.g. python/packages/foo/bar.py
    if (CITATION_TOKEN_RE.test(w)) return false; // file.py:123 or file.py:123-456
    return true;
  });
  s = words.join(" ");

  const toks = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return toks.filter((t) => t.length >= 3 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

// Robust-for-short-content shingling: below 8 content tokens, fall back to
// the unigram SET (order-independent bag of words) since there isn't enough
// text for word n-grams to survive paraphrasing; at or above that, use word
// bigrams (shingleK) so that generic prose overlap between unrelated
// findings doesn't look as similar as true near-duplicates.
function contentShingles(toks, shingleK) {
  if (toks.length < 8) return new Set(toks);
  if (toks.length < shingleK) return new Set([toks.join(" ")]);
  const out = new Set();
  for (let i = 0; i + shingleK <= toks.length; i++) out.add(toks.slice(i, i + shingleK).join(" "));
  return out;
}

function minhashSig(sh, numHashes) {
  const sig = new Array(numHashes).fill(0xffffffff);
  for (const s of sh) for (let i = 0; i < numHashes; i++) {
    const h = fnv1a(i + ":" + s);
    if (h < sig[i]) sig[i] = h;
  }
  return sig;
}

class UnionFind {
  constructor(n) { this.p = Array.from({ length: n }, (_, i) => i); }
  find(x) { while (this.p[x] !== x) { this.p[x] = this.p[this.p[x]]; x = this.p[x]; } return x; }
  union(a, b) { const ra = this.find(a), rb = this.find(b); if (ra !== rb) this.p[Math.max(ra, rb)] = Math.min(ra, rb); }
}

export function clusterFindings(findings, { shingleK = 2, numHashes = 64, threshold = 0.1 } = {}) {
  const sigs = findings.map((f) =>
    minhashSig(contentShingles(cleanContentTokens(f.title + " " + f.text), shingleK), numHashes));
  const uf = new UnionFind(findings.length);
  for (let i = 0; i < findings.length; i++) for (let j = i + 1; j < findings.length; j++) {
    let same = 0;
    for (let h = 0; h < numHashes; h++) if (sigs[i][h] === sigs[j][h]) same++;
    if (same / numHashes >= threshold) uf.union(i, j);
  }
  const rootToCluster = new Map();
  const members = new Map();
  for (let i = 0; i < findings.length; i++) {
    const r = uf.find(i);
    if (!rootToCluster.has(r)) rootToCluster.set(r, `c${String(rootToCluster.size + 1).padStart(3, "0")}`);
    const cid = rootToCluster.get(r);
    if (!members.has(cid)) members.set(cid, []);
    members.get(cid).push(findings[i]);
  }
  const labels = new Map();
  for (const [cid, ms] of members) {
    const best = [...ms].sort((a, b) =>
      (a.quality === "high" ? 0 : 1) - (b.quality === "high" ? 0 : 1) ||
      a.title.length - b.title.length || a.id.localeCompare(b.id))[0];
    labels.set(cid, best.title);
  }
  return findings.map((f, i) => {
    const cid = rootToCluster.get(uf.find(i));
    return { ...f, clusterId: cid, clusterLabel: labels.get(cid) };
  });
}
