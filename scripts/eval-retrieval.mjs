#!/usr/bin/env node
// Retrieval usefulness eval. Answers: when an agent has a real need, does the
// right source gem surface near the top? Labels are gem numbers known to hold a
// genuinely relevant finding. Reports recall@k and MRR for gems_query vs
// gems_ground (and for "either tool"), over the live corpus. Run: npm run eval.
// Exits non-zero if the best tool's recall@10 drops below FLOOR (regression guard).
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRetriever } from "../lib/retrieve.mjs";

const FLOOR = 0.8; // best-tool recall@10 must stay at/above this

// need -> gem numbers that genuinely answer it (any one counts as a hit)
const CASES = [
  ["prevent a long-running agent from re-exploring directions that already failed", [20]],
  ["resume an agent run after it crashed mid-task", [11, 20, 8]],
  ["stop an agent from fabricating or inflating its own evaluation scores", [21]],
  ["cap the number of expensive oracle or tool calls during evaluation", [21]],
  ["let parallel workers claim tasks without duplicating each other's work", [20]],
  ["run untrusted model-generated code safely in a sandbox", [8, 9, 21]],
  ["peer-review experiment proposals before spending compute on them", [20]],
  ["keep ingesting from a feed forever without unbounded memory growth", [9]],
  ["search over experiment configurations as a tree with checkpoints", [8]],
  ["hand off a subtask from one agent to another agent", [12, 16]],
  ["confirm an improvement is real and not just noise before accepting it", [20]],
  ["detect that a task is infeasible and refuse instead of proceeding", [21]],
  ["restrict which tools a sub-agent is allowed to call", [1, 12]],
  ["summarize long conversation history incrementally as it grows", [14]],
  ["a structured prompt that extracts JSON with rationale and evidence from a web page", [18, 3, 19]],
];

const K = [5, 10];

function firstRelevantRank(hits, gems) {
  for (let i = 0; i < hits.length; i++) if (gems.includes(hits[i].gem)) return i + 1;
  return 0; // 0 = not found in the returned list
}

function scoreTool(retriever, mode) {
  const rows = [];
  for (const [need, gems] of CASES) {
    const hits = mode === "query"
      ? retriever.query({ q: need, k: 10 })
      : retriever.ground({ claim: need, k: 10 });
    rows.push({ need, gems, rank: firstRelevantRank(hits, gems), top: hits.slice(0, 3).map((h) => h.gem) });
  }
  const recallAt = (k) => rows.filter((r) => r.rank > 0 && r.rank <= k).length / rows.length;
  const mrr = rows.reduce((s, r) => s + (r.rank ? 1 / r.rank : 0), 0) / rows.length;
  return { rows, recall5: recallAt(5), recall10: recallAt(10), mrr };
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const corpus = process.env.GEMS_CORPUS ?? join(root, "corpus");
const findings = readFileSync(join(corpus, "findings.jsonl"), "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
const retriever = createRetriever({ findings });

const q = scoreTool(retriever, "query");
const g = scoreTool(retriever, "ground");

const pct = (x) => `${(x * 100).toFixed(0)}%`.padStart(4);
const mrr = (x) => x.toFixed(2);

console.log(`\nRetrieval usefulness eval - ${CASES.length} realistic needs, ${findings.length} findings\n`);
console.log("need                                                          | query rank | ground rank | best");
console.log("-".repeat(96));
for (let i = 0; i < CASES.length; i++) {
  const need = CASES[i][0].slice(0, 60).padEnd(60);
  const qr = q.rows[i].rank || "-";
  const gr = g.rows[i].rank || "-";
  const best = Math.min(q.rows[i].rank || 99, g.rows[i].rank || 99);
  const mark = best <= 5 ? "ok" : best <= 10 ? "~" : "MISS";
  console.log(`${need} | ${String(qr).padStart(10)} | ${String(gr).padStart(11)} | ${mark}`);
}
console.log("-".repeat(96));

// "either tool": an agent may use whichever; count a need as covered if either finds it in top-k
const eitherRecall = (k) => CASES.filter((_, i) =>
  (q.rows[i].rank > 0 && q.rows[i].rank <= k) || (g.rows[i].rank > 0 && g.rows[i].rank <= k)).length / CASES.length;

console.log(`\n              recall@5   recall@10   MRR`);
console.log(`gems_query      ${pct(q.recall5)}      ${pct(q.recall10)}    ${mrr(q.mrr)}`);
console.log(`gems_ground     ${pct(g.recall5)}      ${pct(g.recall10)}    ${mrr(g.mrr)}`);
console.log(`either tool     ${pct(eitherRecall(5))}      ${pct(eitherRecall(10))}`);

const best10 = Math.max(q.recall10, g.recall10, eitherRecall(10));
console.log(`\nbest recall@10 = ${pct(best10)} (floor ${pct(FLOOR)})`);
if (best10 < FLOOR) { console.error(`FAIL: below floor`); process.exit(1); }
console.log("PASS");
