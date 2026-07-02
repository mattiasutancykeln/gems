import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const here = dirname(fileURLToPath(import.meta.url));

function makeCorpus() {
  const dir = mkdtempSync(join(tmpdir(), "gems-corpus-"));
  mkdirSync(join(dir, "gems"), { recursive: true });
  const gems = [
    { number: 1, title: "widget", url: "u", repo: "acme/widget", sha: "1234567", source: "repo",
      topics: ["agent"], verdict: "keep", quality: "high", stage: "extracted", license: "MIT",
      codeReuse: "permissive", findingCount: 2 },
    { number: 2, title: "gadget", url: "u2", repo: "acme/gadget", sha: "89abcde", source: "repo",
      topics: ["agent"], verdict: "keep", quality: "normal", stage: "extracted", license: "MIT",
      codeReuse: "permissive", findingCount: 1 },
  ];
  const findings = [
    { id: "g1-f001", gem: 1, repo: "acme/widget", sha: "1234567", citation: "src/q.ts:1-9", citations: ["src/q.ts:1-9"],
      category: "pattern", topic: ["agent"], license: "MIT", codeReuse: "permissive", quality: "high",
      clusterId: "c001", clusterLabel: "claim queue", title: "Optimistic claim queue", text: "workers claim jobs via file locks" },
    { id: "g1-f002", gem: 1, repo: "acme/widget", sha: "1234567", citation: "src/d.ts:2-5", citations: ["src/d.ts:2-5"],
      category: "weak-spot", topic: ["agent"], license: "MIT", codeReuse: "permissive", quality: "high",
      clusterId: "c002", clusterLabel: "dead ends", title: "Dead-end registry", text: "persist failed directions" },
    { id: "g2-f001", gem: 2, repo: "acme/gadget", sha: "89abcde", citation: "src/w.ts:3-9", citations: ["src/w.ts:3-9"],
      category: "pattern", topic: ["agent"], license: "MIT", codeReuse: "permissive", quality: "normal",
      clusterId: "c001", clusterLabel: "claim queue", title: "Locking claim queue", text: "gadget also claims jobs via file locks" },
  ];
  writeFileSync(join(dir, "gems.json"), JSON.stringify(gems));
  writeFileSync(join(dir, "findings.jsonl"), findings.map((f) => JSON.stringify(f)).join("\n") + "\n");
  return dir;
}

function makeEmptyCorpus() {
  const dir = mkdtempSync(join(tmpdir(), "gems-corpus-empty-"));
  mkdirSync(join(dir, "gems"), { recursive: true });
  writeFileSync(join(dir, "gems.json"), JSON.stringify([]));
  writeFileSync(join(dir, "findings.jsonl"), "");
  return dir;
}

async function connect(corpusDir) {
  const transport = new StdioClientTransport({
    command: "node",
    args: [join(here, "..", "mcp", "server.mjs")],
    env: { ...process.env, GEMS_CORPUS: corpusDir },
  });
  const client = new Client({ name: "e2e", version: "1.0.0" });
  await client.connect(transport);
  return client;
}

test("server exposes 5 tools and answers a query", async () => {
  const client = await connect(makeCorpus());
  try {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), ["gems_facets", "gems_get", "gems_ground", "gems_inspire", "gems_query"]);
    const res = await client.callTool({ name: "gems_query", arguments: { q: "claim queue file locks" } });
    const text = res.content[0].text;
    assert.match(text, /Optimistic claim queue/);
    assert.match(text, /`src\/q\.ts:1-9` @ 1234567/);
    assert.match(text, /License: MIT \(permissive\)/);
  } finally { await client.close(); }
});

test("empty findings.jsonl: server still starts and a query returns actionable empty-state text", async () => {
  const client = await connect(makeEmptyCorpus());
  try {
    const res = await client.callTool({ name: "gems_query", arguments: { q: "anything" } });
    assert.match(res.content[0].text, /No findings for/);
  } finally { await client.close(); }
});

test("ground and inspire respond; empty query is actionable", async () => {
  const client = await connect(makeCorpus());
  try {
    const g = await client.callTool({ name: "gems_ground", arguments: { claim: "persist failed directions" } });
    assert.match(g.content[0].text, /Dead-end registry/);
    const i = await client.callTool({ name: "gems_inspire", arguments: {} });
    assert.match(i.content[0].text, /gem #1/);
    const e = await client.callTool({ name: "gems_query", arguments: { q: "zzzz-nonexistent" } });
    assert.match(e.content[0].text, /No findings for/);
    assert.match(e.content[0].text, /Available topics: agent/);
  } finally { await client.close(); }
});

test("gems_facets summarizes the corpus vocabulary", async () => {
  const client = await connect(makeCorpus());
  try {
    const res = await client.callTool({ name: "gems_facets", arguments: {} });
    const text = res.content[0].text;
    assert.match(text, /2 gems · 3 findings · 2 clusters/);
    assert.match(text, /agent \(3\)/);
    assert.match(text, /"claim queue".*2 findings, gems #1, #2/);
  } finally { await client.close(); }
});

test("gems_get fetches a finding with its cluster siblings, and is actionable on a bogus id", async () => {
  const client = await connect(makeCorpus());
  try {
    const res = await client.callTool({ name: "gems_get", arguments: { id: "g1-f001" } });
    const text = res.content[0].text;
    assert.match(text, /Optimistic claim queue/);
    assert.match(text, /Locking claim queue/);
    const missing = await client.callTool({ name: "gems_get", arguments: { id: "g99-f999" } });
    const missingText = missing.content[0].text;
    assert.match(missingText, /No finding with id g99-f999/);
    assert.match(missingText, /gems_query/);
    assert.match(missingText, /gems_facets/);
  } finally { await client.close(); }
});
