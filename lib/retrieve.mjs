import { buildIndex, search } from "./bm25.mjs";

function applyFilters(findings, { topic, category, license, codeReuse, quality }) {
  return findings.filter((f) =>
    (!topic || f.topic.includes(topic)) &&
    (!category || f.category === category) &&
    (!license || (f.license ?? "none").toLowerCase() === license.toLowerCase()) &&
    (!codeReuse || f.codeReuse === codeReuse) &&
    (!quality || f.quality === quality));
}

export function createRetriever({ findings }) {
  const byId = new Map(findings.map((f) => [f.id, f]));
  const index = buildIndex(findings.map((f) => ({ id: f.id, text: `${f.title} ${f.title} ${f.text}` })));

  function ranked(q, filters, k) {
    const hits = search(index, q);
    const allowed = new Set(applyFilters(findings, filters).map((f) => f.id));
    return hits.filter((h) => allowed.has(h.id)).slice(0, k).map((h) => ({ ...byId.get(h.id), score: h.score }));
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
  };
}
