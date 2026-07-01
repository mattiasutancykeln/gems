function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

function tokens(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
}

function shingles(toks, k) {
  if (toks.length <= k) return new Set([toks.join(" ")]);
  const out = new Set();
  for (let i = 0; i + k <= toks.length; i++) out.add(toks.slice(i, i + k).join(" "));
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

export function clusterFindings(findings, { shingleK = 3, numHashes = 64, threshold = 0.1 } = {}) {
  const sigs = findings.map((f) => minhashSig(shingles(tokens(f.title + " " + f.text), shingleK), numHashes));
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
