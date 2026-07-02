import { test } from "node:test";
import assert from "node:assert/strict";
import { runUpliftEval, parseJudge, makeStubRunners } from "../scripts/eval-uplift.mjs";

// A tiny task set: 2 in-domain, 2 off-domain, spread across types.
const TASKS = [
  { id: "in-a", type: "implement", domain: "in", prompt: "in-a prompt" },
  { id: "in-b", type: "decide", domain: "in", prompt: "in-b prompt" },
  { id: "off-a", type: "write", domain: "off", prompt: "off-a prompt" },
  { id: "off-b", type: "brainstorm", domain: "off", prompt: "off-b prompt" },
];

// runAgent that labels its output by condition so a test judge can act on it.
const labelledRunAgent = (prompt, { withGems }) => ({
  text: withGems ? "GEMS_OUTPUT" : "BASELINE_OUTPUT",
  usedTool: withGems,
});

test("win-rate aggregation: gems wins in-domain, ties off-domain", async () => {
  // Judge: gems always wins in-domain, always ties off-domain. It only sees text,
  // so it decides from the labelled output, not from slot order.
  const judge = (prompt, { first, second }) => {
    const off = prompt.startsWith("off");
    if (off) return { winner: "tie", reason: "off-domain tie" };
    const gemsSlot = first === "GEMS_OUTPUT" ? "first" : "second";
    return { winner: gemsSlot, reason: "gems better in-domain" };
  };

  const { aggregates } = await runUpliftEval({
    tasks: TASKS,
    runAgent: labelledRunAgent,
    judge,
    rng: () => 0.1, // gems in first slot; mapping must still recover the true winner
  });

  assert.equal(aggregates.inDomainGemsWinRate, 1.0);
  assert.equal(aggregates.offDomainGemsWinRate, 0.5); // all ties -> 0.5
  // overall: 2 gems wins + 2 ties over 4 -> (2 + 1) / 4 = 0.75
  assert.equal(aggregates.overallGemsWinRate, 0.75);
  assert.equal(aggregates.counts.gemsWins, 2);
  assert.equal(aggregates.counts.ties, 2);
  assert.equal(aggregates.counts.baselineWins, 0);
  assert.equal(aggregates.byType.implement.winRate, 1.0);
  assert.equal(aggregates.byType.write.winRate, 0.5);
});

test("order randomization is correctly un-mapped (no leakage)", async () => {
  // Judge blindly always picks "first". rng forces gems into the SECOND slot, so the
  // true winner must be recorded as baseline for every task - proving the mapping.
  const judge = () => ({ winner: "first", reason: "always first" });
  const { results } = await runUpliftEval({
    tasks: TASKS,
    runAgent: labelledRunAgent,
    judge,
    rng: () => 0.9, // >= 0.5 -> gemsFirst false -> gems lands in the second slot
  });
  assert.ok(results.every((r) => r.winner === "baseline"));
});

test("the inverse rng slot also maps correctly", async () => {
  // Same blind judge, but now gems is forced into the FIRST slot -> gems should win all.
  const judge = () => ({ winner: "first", reason: "always first" });
  const { results } = await runUpliftEval({
    tasks: TASKS,
    runAgent: labelledRunAgent,
    judge,
    rng: () => 0.1, // < 0.5 -> gemsFirst true -> gems in first slot
  });
  assert.ok(results.every((r) => r.winner === "gems"));
});

test("usedTool is threaded through from the gems condition", async () => {
  const runAgent = (prompt, { withGems }) => ({
    text: withGems ? "g" : "b",
    usedTool: withGems && prompt.startsWith("in"), // only in-domain "called" a tool
  });
  const judge = () => ({ winner: "tie", reason: "tie" });
  const { results } = await runUpliftEval({
    tasks: TASKS,
    runAgent,
    judge,
    rng: () => 0.4,
  });
  assert.equal(results.find((r) => r.id === "in-a").usedTool, true);
  assert.equal(results.find((r) => r.id === "off-a").usedTool, false);
});

test("off-domain guardrail warning triggers when gems wins off-domain", async () => {
  // Judge rewards gems everywhere, including off-domain -> off-domain win-rate 1.0.
  const judge = (prompt, { first }) => {
    const gemsSlot = first === "GEMS_OUTPUT" ? "first" : "second";
    return { winner: gemsSlot, reason: "gems always" };
  };
  const { aggregates } = await runUpliftEval({
    tasks: TASKS,
    runAgent: labelledRunAgent,
    judge,
    rng: () => 0.2,
  });
  assert.equal(aggregates.offDomainGemsWinRate, 1.0);
  assert.equal(aggregates.offDomainBiasWarning, true);
});

test("no guardrail warning when off-domain sits near 50%", async () => {
  const judge = (prompt) =>
    prompt.startsWith("off") ? { winner: "tie", reason: "t" } : { winner: "first", reason: "f" };
  const { aggregates } = await runUpliftEval({
    tasks: TASKS,
    runAgent: labelledRunAgent,
    judge,
    rng: () => 0.1,
  });
  assert.equal(aggregates.offDomainGemsWinRate, 0.5);
  assert.equal(aggregates.offDomainBiasWarning, false);
});

test("deterministic dry-run stub: gems lifts in-domain, ties off-domain", async () => {
  const { runAgent, judge } = makeStubRunners(TASKS);
  const { aggregates } = await runUpliftEval({
    tasks: TASKS,
    runAgent,
    judge,
    rng: () => 0.3,
  });
  assert.equal(aggregates.inDomainGemsWinRate, 1.0);
  assert.equal(aggregates.offDomainGemsWinRate, 0.5);
  assert.equal(aggregates.offDomainBiasWarning, false);
});

test("parseJudge extracts strict JSON and falls back to tie", () => {
  assert.deepEqual(parseJudge('{"winner":"first","reason":"ok"}'), {
    winner: "first",
    reason: "ok",
  });
  assert.equal(parseJudge('noise before {"winner":"second","reason":"x"} after').winner, "second");
  assert.equal(parseJudge("not json at all").winner, "tie");
  assert.equal(parseJudge('{"winner":"nonsense"}').winner, "tie");
});
