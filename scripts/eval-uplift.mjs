#!/usr/bin/env node
// Uplift eval. Answers a different question than the retrieval eval (npm run eval):
// does a coding agent equipped with the gems MCP produce BETTER work than the same
// agent without it? It is a blind A/B differential. For each task the same agent runs
// twice - condition A has the gems tools available (plus a one-line nudge), condition B
// does not. An independent judge scores the two outputs BLIND, with the order randomized
// per task, and the primary metric is the pairwise win-rate of A (gems) over B (baseline).
//
// The off-domain control tasks are the honesty check: the corpus cannot help there, so
// the expected gems win-rate is ~50%. A large off-domain win means the judge is rewarding
// verbosity or citation-theater, not real help - the scorecard flags that loudly.
//
// The harness is dependency-injected (runAgent, judge, rng) so the whole pipeline is
// testable with zero model calls. Run: node scripts/eval-uplift.mjs --dry-run (or --live).
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const SERVER_PATH = join(ROOT, "mcp", "server.mjs");
const TASKS_PATH = process.env.GEMS_UPLIFT_TASKS ?? join(ROOT, "eval", "uplift-tasks.json");

// Off-domain gems win-rate should sit near this; drift beyond the band means judge bias.
const GUARDRAIL_LOW = 0.3;
const GUARDRAIL_HIGH = 0.7;

const GEMS_NUDGE =
  "You have the gems MCP tools available: gems_query (search mined prior art), " +
  "gems_ground (cited evidence for a specific decision), and gems_inspire (diverse " +
  "high-quality examples). Use them when prior art from agent/research repos would help.";

// --- core harness (pure, injected deps) --------------------------------------

// Pairwise win-rate of gems over baseline; ties count as half. null for an empty set.
function winRate(rows) {
  if (rows.length === 0) return null;
  const score = rows.reduce(
    (s, r) => s + (r.winner === "gems" ? 1 : r.winner === "tie" ? 0.5 : 0),
    0,
  );
  return score / rows.length;
}

// Run the blind A/B differential over all tasks.
// runAgent(prompt, { withGems }) -> { text, usedTool }
// judge(prompt, { first, second }) -> { winner: "first"|"second"|"tie", reason }
// rng() -> [0,1); decides which condition lands in the "first" slot (blinding).
export async function runUpliftEval({ tasks, runAgent, judge, rng = Math.random }) {
  const results = [];
  for (const task of tasks) {
    const gemsRun = await runAgent(task.prompt, { withGems: true });
    const baseRun = await runAgent(task.prompt, { withGems: false });

    // Randomize which output the judge sees first so it cannot infer the condition.
    const gemsFirst = rng() < 0.5;
    const first = gemsFirst ? gemsRun : baseRun;
    const second = gemsFirst ? baseRun : gemsRun;

    const verdict = await judge(task.prompt, { first: first.text, second: second.text });

    let winner;
    if (verdict.winner === "tie") {
      winner = "tie";
    } else {
      const pickedGems = (verdict.winner === "first") === gemsFirst;
      winner = pickedGems ? "gems" : "baseline";
    }

    results.push({
      id: task.id,
      type: task.type,
      domain: task.domain,
      winner,
      usedTool: Boolean(gemsRun.usedTool),
      reason: verdict.reason,
    });
  }

  const inDomain = results.filter((r) => r.domain === "in");
  const offDomain = results.filter((r) => r.domain === "off");
  const offDomainGemsWinRate = winRate(offDomain);

  const byType = {};
  for (const type of [...new Set(results.map((r) => r.type))]) {
    const rows = results.filter((r) => r.type === type);
    byType[type] = { winRate: winRate(rows), n: rows.length };
  }

  const offDomainBiasWarning =
    offDomainGemsWinRate !== null &&
    (offDomainGemsWinRate > GUARDRAIL_HIGH || offDomainGemsWinRate < GUARDRAIL_LOW);

  const aggregates = {
    inDomainGemsWinRate: winRate(inDomain),
    offDomainGemsWinRate,
    overallGemsWinRate: winRate(results),
    byType,
    counts: {
      total: results.length,
      inDomain: inDomain.length,
      offDomain: offDomain.length,
      gemsWins: results.filter((r) => r.winner === "gems").length,
      baselineWins: results.filter((r) => r.winner === "baseline").length,
      ties: results.filter((r) => r.winner === "tie").length,
      usedTool: results.filter((r) => r.usedTool).length,
    },
    offDomainBiasWarning,
  };

  return { results, aggregates };
}

// --- deterministic dry-run stub (no model calls) -----------------------------

// Stub runners keyed by the task list so the stub agent knows a task's domain.
// The gems condition only lifts quality on in-domain tasks (where the corpus can
// actually help); off-domain quality is identical, so those land as ties (~50%).
// The judge sees only the output text and compares an embedded quality score, so
// it stays blind to which output is gems vs baseline.
export function makeStubRunners(tasks) {
  const byPrompt = new Map(tasks.map((t) => [t.prompt, t]));

  const runAgent = (prompt, { withGems }) => {
    const task = byPrompt.get(prompt);
    const inDomain = task?.domain === "in";
    const quality = 5 + (withGems && inDomain ? 3 : 0);
    const text =
      `[stub answer quality=${quality}] ` +
      `${withGems ? "grounded in prior art" : "from first principles"}: ` +
      prompt.slice(0, 48);
    return { text, usedTool: withGems };
  };

  const readQuality = (t) => Number((t.match(/quality=(\d+)/) ?? [])[1] ?? 0);
  const judge = (_prompt, { first, second }) => {
    const a = readQuality(first);
    const b = readQuality(second);
    if (a === b) return { winner: "tie", reason: "equal-quality outputs (stub)" };
    return { winner: a > b ? "first" : "second", reason: "higher-quality output (stub)" };
  };

  return { runAgent, judge };
}

// Small seeded PRNG so the dry-run scorecard is reproducible.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- real runners (used by the CLI, not by tests; these spend tokens) --------

function writeMcpConfig() {
  const dir = mkdtempSync(join(tmpdir(), "gems-uplift-"));
  const path = join(dir, "mcp.json");
  const config = {
    mcpServers: { gems: { type: "stdio", command: "node", args: [SERVER_PATH] } },
  };
  writeFileSync(path, JSON.stringify(config));
  return path;
}

function realRunAgent(prompt, { withGems }) {
  const base = process.env.GEMS_EVAL_AGENT_CMD ?? "claude -p";
  let cmd = base;
  let fullPrompt = prompt;
  if (withGems) {
    cmd = `${base} --mcp-config ${writeMcpConfig()}`;
    fullPrompt = `${GEMS_NUDGE}\n\n${prompt}`;
  }
  const res = spawnSync(cmd, {
    input: fullPrompt,
    shell: true,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const stdout = res.stdout ?? "";
  const usedTool = /gems_/.test(stdout + (res.stderr ?? ""));
  return { text: stdout.trim(), usedTool };
}

function realJudge(prompt, { first, second }) {
  const base = process.env.GEMS_EVAL_JUDGE_CMD ?? "claude -p";
  const rubric =
    "You are a strict, impartial judge comparing two answers to the same task.\n" +
    "Score each on: correctness, use of relevant prior art, robustness and edge-case " +
    "handling, insight, and whether claims are grounded. Ignore length and formatting; " +
    "do not reward verbosity or citations that add no substance.\n" +
    `TASK:\n${prompt}\n\nANSWER A (first):\n${first}\n\nANSWER B (second):\n${second}\n\n` +
    'Reply with ONLY strict JSON: {"winner":"first"|"second"|"tie","reason":"<one sentence>"}.';
  const res = spawnSync(base, {
    input: rubric,
    shell: true,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return parseJudge(res.stdout ?? "");
}

// Best-effort extraction of the {winner, reason} JSON from a judge transcript.
export function parseJudge(out) {
  const match = out.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const obj = JSON.parse(match[0]);
      if (["first", "second", "tie"].includes(obj.winner)) {
        return { winner: obj.winner, reason: String(obj.reason ?? "") };
      }
    } catch {
      /* fall through to tie */
    }
  }
  return { winner: "tie", reason: "unparseable judge output" };
}

// --- scorecard ---------------------------------------------------------------

const pct = (x) => (x === null ? "  n/a" : `${(x * 100).toFixed(0)}%`.padStart(5));

export function formatScorecard({ results, aggregates }, { mode }) {
  const lines = [];
  lines.push("");
  lines.push(
    `Uplift eval (${mode}) - blind A/B, gems MCP vs baseline, ${results.length} tasks`,
  );
  lines.push("");
  lines.push("task                  type       domain  winner    usedTool");
  lines.push("-".repeat(64));
  for (const r of results) {
    lines.push(
      `${r.id.padEnd(21)} ${r.type.padEnd(10)} ${r.domain.padEnd(6)}  ` +
        `${r.winner.padEnd(9)} ${r.usedTool ? "yes" : "no"}`,
    );
  }
  lines.push("-".repeat(64));

  const a = aggregates;
  lines.push("");
  lines.push(`in-domain gems win-rate   ${pct(a.inDomainGemsWinRate)}   (expect gems to help)`);
  lines.push(
    `off-domain gems win-rate  ${pct(a.offDomainGemsWinRate)}   (guardrail - expect ~50%)`,
  );
  lines.push(`overall gems win-rate     ${pct(a.overallGemsWinRate)}`);
  lines.push("");
  lines.push("by type:");
  for (const [type, v] of Object.entries(a.byType)) {
    lines.push(`  ${type.padEnd(12)} ${pct(v.winRate)}  (n=${v.n})`);
  }
  lines.push("");
  lines.push(
    `counts: ${a.counts.gemsWins} gems / ${a.counts.baselineWins} baseline / ` +
      `${a.counts.ties} tie · usedTool ${a.counts.usedTool}/${a.counts.total}`,
  );

  if (a.offDomainBiasWarning) {
    lines.push("");
    lines.push(
      `WARNING: possible judge bias - off-domain gems win-rate ${pct(a.offDomainGemsWinRate)} ` +
        `is outside the ${pct(GUARDRAIL_LOW)}-${pct(GUARDRAIL_HIGH)} band. The corpus cannot ` +
        "help off-domain, so a skewed result means the judge is rewarding style over substance.",
    );
  }
  lines.push("");
  return lines.join("\n");
}

// --- CLI ---------------------------------------------------------------------

function loadTasks() {
  return JSON.parse(readFileSync(TASKS_PATH, "utf8"));
}

async function main(argv) {
  const live = argv.includes("--live");
  const mode = live ? "live" : "dry-run";
  const tasks = loadTasks();

  let runAgent;
  let judge;
  let rng;
  if (live) {
    const calls = tasks.length * 3;
    console.log(
      `WARNING: --live spends model tokens - ${tasks.length} tasks x (2 agent runs + ` +
        `1 judge call) = ${calls} model calls via 'claude -p'. Ctrl-C to abort.`,
    );
    runAgent = realRunAgent;
    judge = realJudge;
    rng = Math.random;
  } else {
    const stub = makeStubRunners(tasks);
    runAgent = stub.runAgent;
    judge = stub.judge;
    rng = mulberry32(0x9e3779b9); // fixed seed -> reproducible dry-run scorecard
  }

  const result = await runUpliftEval({ tasks, runAgent, judge, rng });
  console.log(formatScorecard(result, { mode }));
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  main(process.argv.slice(2)).catch((err) => {
    console.error("uplift eval: fatal:", err);
    process.exit(1);
  });
}
