import { test } from "node:test";
import assert from "node:assert/strict";

test("deps resolve", async () => {
  const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
  const { z } = await import("zod");
  assert.equal(typeof McpServer, "function");
  assert.equal(typeof z.string, "function");
});
