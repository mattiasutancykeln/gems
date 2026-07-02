const K1 = 1.2, B = 0.75;

// Stopwords carry no retrieval signal; dropping them keeps pure-stopword
// queries from matching everything and keeps index/query tokenization aligned.
const STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "and", "is", "are", "was", "were", "be",
  "in", "on", "for", "with", "that", "this", "it", "its", "as", "at",
  "or", "by", "from", "not", "but", "i", "you", "we", "they", "he",
  "she", "do", "does", "how", "can", "should", "would",
]);

export function tokenize(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/)
    .filter(Boolean).filter((t) => !STOPWORDS.has(t));
}

export function buildIndex(docs) {
  const df = new Map();          // term -> doc count
  const tf = new Map();          // docId -> Map(term -> count)
  const len = new Map();         // docId -> token count
  for (const d of docs) {
    const toks = tokenize(d.text);
    len.set(d.id, toks.length);
    const counts = new Map();
    for (const t of toks) counts.set(t, (counts.get(t) ?? 0) + 1);
    tf.set(d.id, counts);
    for (const t of counts.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const avgLen = docs.length ? [...len.values()].reduce((a, b) => a + b, 0) / docs.length : 0;
  return { df, tf, len, avgLen, n: docs.length };
}

export function search(index, query, k = Infinity) {
  const qToks = [...new Set(tokenize(query))];
  if (!qToks.length) return [];
  const scores = new Map();
  for (const [docId, counts] of index.tf) {
    let s = 0;
    for (const t of qToks) {
      const f = counts.get(t);
      if (!f) continue;
      const dfT = index.df.get(t) ?? 0;
      const idf = Math.log(1 + (index.n - dfT + 0.5) / (dfT + 0.5));
      s += idf * (f * (K1 + 1)) / (f + K1 * (1 - B + B * (index.len.get(docId) / index.avgLen)));
    }
    if (s > 0) scores.set(docId, s);
  }
  return [...scores.entries()].map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, k === Infinity ? undefined : k);
}
