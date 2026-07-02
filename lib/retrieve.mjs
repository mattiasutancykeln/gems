import { buildIndex, search, tokenize } from "./bm25.mjs";

function applyFilters(findings, { topic, category, license, codeReuse, quality }) {
  return findings.filter((f) =>
    (!topic || f.topic.includes(topic)) &&
    (!category || f.category === category) &&
    (!license || (f.license ?? "none").toLowerCase() === license.toLowerCase()) &&
    (!codeReuse || f.codeReuse === codeReuse) &&
    (!quality || f.quality === quality));
}

function bump(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function sortedCounts(map) {
  return [...map.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || (a.value < b.value ? -1 : a.value > b.value ? 1 : 0));
}

export function createRetriever({ findings }) {
  const byId = new Map(findings.map((f) => [f.id, f]));
  const index = buildIndex(findings.map((f) => ({ id: f.id, text: `${f.title} ${f.title} ${f.text}` })));

  function ranked(q, filters, k) {
    const hits = search(index, q);
    const allowed = new Set(applyFilters(findings, filters).map((f) => f.id));
    const qTerms = [...new Set(tokenize(q))];
    return hits.filter((h) => allowed.has(h.id)).slice(0, k).map((h) => {
      const f = byId.get(h.id);
      const docTerms = new Set(tokenize(`${f.title} ${f.text}`));
      const matched = qTerms.filter((t) => docTerms.has(t)).length;
      return { ...f, score: h.score, matched, queryTermCount: qTerms.length };
    });
  }

  return {
    query({ q, k = 10, ...filters }) { return ranked(q, filters, k); },
    ground({ claim, topic, k = 6 }) { return ranked(claim, { topic }, k); },
    inspire({ topic, k = 5, rng = Math.random } = {}) {
      const pool = applyFilters(findings, { topic });
      const byGem = new Map();
      for (const f of pool) {
        const cur = byGem.get(f.gem);
        const better = !cur || (f.quality === "high" && cur.quality !== "high") ||
          (f.quality === cur.quality && f.id < cur.id);
        if (better) byGem.set(f.gem, f);
      }
      const candidates = [...byGem.values()].sort((a, b) =>
        (a.quality === "high" ? 0 : 1) - (b.quality === "high" ? 0 : 1) || a.gem - b.gem);
      const top = candidates.slice(0, 2 * k);
      const picked = [];
      while (picked.length < k && top.length) picked.push(top.splice(Math.floor(rng() * top.length), 1)[0]);
      return picked;
    },
    facets() {
      const topicCounts = new Map();
      const categoryCounts = new Map();
      const codeReuseCounts = new Map();
      const licenseCounts = new Map();
      const repoCounts = new Map();
      const clusterMap = new Map();
      const gems = new Set();

      for (const f of findings) {
        gems.add(f.gem);
        for (const t of f.topic) bump(topicCounts, t);
        bump(categoryCounts, f.category);
        bump(codeReuseCounts, f.codeReuse);
        bump(licenseCounts, f.license ?? "none");
        if (f.repo != null) bump(repoCounts, f.repo);

        let cluster = clusterMap.get(f.clusterId);
        if (!cluster) {
          cluster = { id: f.clusterId, label: f.clusterLabel, size: 0, gems: new Set() };
          clusterMap.set(f.clusterId, cluster);
        }
        cluster.size += 1;
        cluster.gems.add(f.gem);
      }

      const clusters = [...clusterMap.values()]
        .filter((c) => c.size >= 2)
        .map((c) => ({ id: c.id, label: c.label, size: c.size, gems: [...c.gems].sort((a, b) => a - b) }))
        .sort((a, b) => b.size - a.size || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

      return {
        topics: sortedCounts(topicCounts),
        categories: sortedCounts(categoryCounts),
        codeReuse: sortedCounts(codeReuseCounts),
        licenses: sortedCounts(licenseCounts),
        repos: sortedCounts(repoCounts),
        clusters,
        totals: { gems: gems.size, findings: findings.length, clusters: clusterMap.size },
      };
    },
    get(id) {
      const finding = byId.get(id);
      if (!finding) return null;
      const siblings = findings.filter((f) => f.id !== id && f.clusterId === finding.clusterId);
      return { finding, siblings };
    },
  };
}
