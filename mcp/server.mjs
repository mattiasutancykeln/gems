#!/usr/bin/env node
// gems MCP server - stdio. stdout is protocol-only; all logging goes to stderr.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const corpusDir = process.env.GEMS_CORPUS ?? join(here, "..", "corpus");
const ISSUE_FORM = "https://github.com/mattiasutancykeln/gems/issues/new?template=gem.yml";

async function main() {
  let McpServer, StdioServerTransport, z;
  try {
    ({ McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js"));
    ({ StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js"));
    ({ z } = await import("zod"));
  } catch (err) {
    console.error("gems: dependencies missing. Run `npm install` in the gems repo root.");
    console.error(String(err?.message ?? err));
    process.exit(1);
  }
  const { createRetriever } = await import("../lib/retrieve.mjs");
  const { renderHits, renderEmpty } = await import("../lib/render.mjs");

  const gemsPath = join(corpusDir, "gems.json");
  const findingsPath = join(corpusDir, "findings.jsonl");
  if (!existsSync(gemsPath) || !existsSync(findingsPath)) {
    console.error(`gems: corpus not found at ${corpusDir}.`);
    console.error("Run `node scripts/sync-corpus.mjs` to generate it, or set GEMS_CORPUS to the corpus directory.");
    process.exit(1);
  }
  const gems = JSON.parse(readFileSync(gemsPath, "utf8"));
  const findings = readFileSync(findingsPath, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
  const gemsByNumber = new Map(gems.map((g) => [g.number, g]));
  const retriever = createRetriever({ findings });
  const clusters = new Set(findings.map((f) => f.clusterId)).size;

  const asResult = (hits, q) => ({
    content: [{ type: "text", text: hits.length ? renderHits(hits, { gemsByNumber }) : renderEmpty({ q, findings, issueFormUrl: ISSUE_FORM }) }],
  });

  const server = new McpServer({ name: "gems", version: "1.0.0" });
  const topicEnum = z.enum(["agent", "eval", "infra", "ux", "research"]).optional()
    .describe("Filter by topic label");

  server.registerTool("gems_query", {
    title: "Search the gems corpus",
    description: "Search the gems corpus of mined implementation findings from open-source agent/research repos and papers. Every hit carries an exact file:line citation, its source gem, and a license/code-reuse flag. Use for targeted search over patterns, tools, prompts, and weak spots. For broad ideation use gems_inspire; to back a specific technical decision with cited evidence use gems_ground.",
    inputSchema: {
      q: z.string().describe("Search query (keywords)"),
      topic: topicEnum,
      category: z.enum(["impl-decision", "skill-prompt-tool", "pattern", "weak-spot", "highlight"]).optional(),
      codeReuse: z.enum(["permissive", "ideas-only", "forbidden"]).optional(),
      quality: z.enum(["high", "normal"]).optional(),
      k: z.number().int().min(1).max(25).optional().describe("Max results, default 10"),
    },
  }, async ({ q, k = 10, ...filters }) => asResult(retriever.query({ q, k, ...filters }), q));

  server.registerTool("gems_ground", {
    title: "Ground a claim in cited findings",
    description: "Find cited evidence from mined open-source repos and papers that supports or informs a specific technical claim or decision. Returns fewer, higher-confidence findings with exact file:line citations and a license-safety note stating whether code may be copied or only the idea adopted. Use when about to choose an approach. For broad ideation use gems_inspire; for plain search use gems_query.",
    inputSchema: {
      claim: z.string().describe("The technical claim or decision to ground"),
      topic: topicEnum,
      k: z.number().int().min(1).max(15).optional().describe("Max results, default 6"),
    },
  }, async ({ claim, topic, k = 6 }) => asResult(retriever.ground({ claim, topic, k }), claim));

  server.registerTool("gems_inspire", {
    title: "Get inspiration from standout findings",
    description: "Get a diverse, quality-weighted sample of standout implementation patterns from the gems corpus to spark ideas when starting new work. Returns at most one finding per source gem for maximum breadth. Optionally filter by topic. To back a specific decision use gems_ground; for targeted search use gems_query.",
    inputSchema: {
      topic: topicEnum,
      k: z.number().int().min(1).max(15).optional().describe("Sample size, default 5"),
    },
  }, async ({ topic, k = 5 }) => asResult(retriever.inspire({ topic, k }), topic ?? "inspiration"));

  await server.connect(new StdioServerTransport());
  console.error(`gems: ${gems.length} gems · ${findings.length} findings · ${clusters} clusters · corpus @ ${corpusDir}`);
}

main().catch((err) => { console.error("gems: fatal:", err); process.exit(1); });
