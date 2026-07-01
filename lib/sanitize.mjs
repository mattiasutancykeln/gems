// Strips emoji / pictographic / dingbat codepoints that leak into generated
// corpus artifacts when a finding quotes upstream (e.g. Biomni, scienceclaw)
// README text verbatim. GitHub-facing and agent-facing surfaces (gem pages,
// CATALOG, MCP output) must stay emoji-free — see
// docs/design/2026-07-01-corpus-mcp-design.md ("No emojis on any
// GitHub-facing surface").
//
// Arrows and star ratings are LOAD-BEARING in finding prose (e.g.
// "PDF→PNG", "evidence grades ★★★/★★☆/★☆☆", "[✓]"/"[✗]" checklists) — simply
// deleting them corrupts the text. So this runs three passes:
//
//   1. Transliterate semantic symbols to the project's existing ASCII
//      conventions (arrows -> `->`/`<-`/etc., the project already uses `->`
//      as its ASCII arrow; stars -> `*`/`o`; check/cross marks -> `x`/`-`)
//      BEFORE any stripping happens, so meaning survives.
//   2. Strip whatever decorative emoji/pictographs remain.
//   3. Collapse any doubled spaces the replacements left behind.
//
// Ranges covered by the strip pass (after transliteration has already
// removed the meaningful symbols from these same ranges):
//   U+1F300–U+1FAFF  misc symbols & pictographs, supplemental symbols, etc.
//   U+2600–U+27BF    misc symbols + dingbats (stars, checks, crosses, warning)
//   U+2B00–U+2BFF    misc symbols and arrows (e.g. star U+2B50)
//   U+FE0F           variation selector-16 (emoji presentation)
//   U+200D           zero-width joiner (emoji sequences)
//   U+2139           information source (outside the ranges above)
//
// Deliberately excludes U+2200–U+22FF (math operators, incl. the ∎ mark)
// and ordinary punctuation (·, —, …) — those are legitimate content.

// Specific semantic symbols -> the project's ASCII spellings. Checked first
// so the catch-all arrow-block regex below never sees them.
const TRANSLITERATE_MAP = {
  "→": "->", // →
  "➡": "->", // ➡
  "➔": "->", // ➔
  "➙": "->", // ➙
  "←": "<-", // ←
  "↔": "<->", // ↔
  "⇒": "=>", // ⇒
  "⇐": "<=", // ⇐
  "⇔": "<=>", // ⇔
  "★": "*", // ★
  "⭐": "*", // ⭐
  "☆": "o", // ☆
  "✓": "x", // ✓
  "✔": "x", // ✔
  "✅": "x", // ✅
  "✗": "-", // ✗
  "✘": "-", // ✘
  "❌": "-", // ❌
  "✖": "-", // ✖
};

const TRANSLITERATE_RE = new RegExp(
  `[${Object.keys(TRANSLITERATE_MAP).join("")}]`,
  "gu",
);

// Any other arrow codepoint (arrow blocks not already handled above) becomes
// the project's plain ASCII arrow rather than being silently deleted:
//   U+2190–U+21FF  Arrows
//   U+27F0–U+27FF  Supplemental Arrows-A
//   U+2900–U+297F  Supplemental Arrows-B
const ARROW_BLOCK_RE = /[\u{2190}-\u{21FF}\u{27F0}-\u{27FF}\u{2900}-\u{297F}]/gu;

const EMOJI_RE =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{2139}]/gu;

export function stripEmoji(str) {
  if (typeof str !== "string") return str;
  const s = str
    .replace(TRANSLITERATE_RE, (ch) => TRANSLITERATE_MAP[ch])
    .replace(ARROW_BLOCK_RE, "->")
    .replace(EMOJI_RE, "");
  return s.replace(/ {2,}/g, " ").trim();
}
