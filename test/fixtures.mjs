export const EXT_COMMENT = `## Extraction report

**Source:** \`acme/widget\` @ \`abcdef0123456789abcdef0123456789abcdef01\` (pinned 2026-06-10T09:56:19Z)
**Workers:** 2 • **Files read:** 5

---

### Implementation decisions

- **Single-flight cache**: \`src/cache.ts:84-112\` — Dedupes concurrent fetches with a 30s grace window before re-fetch.

- **Budget check runs first.** Over-budget runs are zeroed before validity is evaluated, so budget violations short-circuit.
  \`scorers/oracle_budget.py:147-153 @ acme/widget@abcdef0\`; \`scorers/oracle_budget.py:200-210 @ acme/widget@abcdef0\`

### Skills, prompts, tools

- **Triage prompt guard**: \`prompts/triage.md:1-94\` — Refuses to proceed without explicit inputs.

### Patterns worth porting

- **Queue-and-claim via optimistic file locks**: \`src/queue.ts:10-40\` — Workers claim jobs by atomic rename.

### Open threads / weak spots

- Racy token refresh under concurrency: \`src/auth.ts:30-72\`.

### Files read by workers

- src/cache.ts
`;

export const SUM_COMMENT = `### TL;DR
One-liner about the project.

### Highlights
- Streaming tool-use loop with backpressure.
- Prompt cache keyed on content hash.

### Connections
Relates to our executor.

### Verdict
keep — solid patterns.
`;

export const DEEP_READ_COMMENT = `## Deep read — widget

### TL;DR
Stuff.

### Patterns worth porting
- **Report-first crash resilience**: \`daemon/loop.py:5-25\` — Writes report before state transitions.

### Verdict
promote — extract next.
`;

export function makeIssue(overrides = {}) {
  return {
    number: 42,
    title: "[ext] widget — the acme widget",
    body: "https://github.com/acme/widget\n\nlooks neat",
    labels: ["stage:extracted", "source:repo", "topic:agent", "topic:infra", "quality:high"],
    url: "https://github.com/mattiasutancykeln/gems/issues/42",
    comments: [SUM_COMMENT, EXT_COMMENT],
    ...overrides,
  };
}
