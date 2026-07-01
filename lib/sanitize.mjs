// Strips emoji / pictographic / dingbat / arrow codepoints that leak into
// generated corpus artifacts when a finding quotes upstream (e.g. Biomni,
// scienceclaw) README text verbatim. GitHub-facing and agent-facing surfaces
// (gem pages, CATALOG, MCP output) must stay emoji-free — see
// docs/design/2026-07-01-corpus-mcp-design.md ("No emojis on any
// GitHub-facing surface").
//
// Ranges covered:
//   U+1F300–U+1FAFF  misc symbols & pictographs, supplemental symbols, etc.
//   U+2600–U+27BF    misc symbols + dingbats (stars, checks, crosses, warning)
//   U+2B00–U+2BFF    misc symbols and arrows (e.g. star U+2B50)
//   U+2190–U+21FF    arrows
//   U+FE0F           variation selector-16 (emoji presentation)
//   U+200D           zero-width joiner (emoji sequences)
//   U+2139           information source (outside the ranges above)
//
// Deliberately excludes U+2200–U+22FF (math operators, incl. the ∎ mark)
// and ordinary punctuation (·, —, …) — those are legitimate content.
const EMOJI_RE =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{FE0F}\u{200D}\u{2139}]/gu;

export function stripEmoji(str) {
  if (typeof str !== "string") return str;
  return str.replace(EMOJI_RE, "").replace(/ {2,}/g, " ").trim();
}
