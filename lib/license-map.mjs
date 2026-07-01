const PERMISSIVE = ["MIT", "APACHE-2.0", "BSD-2-CLAUSE", "BSD-3-CLAUSE", "ISC", "UNLICENSE", "0BSD", "CC0-1.0"];
const IDEAS_PREFIX = ["GPL-", "AGPL-", "LGPL-", "MPL-", "EPL-", "CC-BY"];

export function codeReuseFor(spdxId) {
  if (!spdxId) return "forbidden";
  const id = String(spdxId).toUpperCase();
  if (id.startsWith("CC-BY-NC")) return "forbidden";
  if (PERMISSIVE.includes(id) || id.startsWith("BSD-")) return "permissive";
  if (IDEAS_PREFIX.some((p) => id.startsWith(p))) return "ideas-only";
  return "forbidden";
}

export function reuseNote(codeReuse, license) {
  const lic = license || "none";
  if (codeReuse === "permissive") return `License: ${lic} (permissive) - code may be copied with attribution`;
  if (codeReuse === "ideas-only") return `License: ${lic} - IDEAS ONLY, do not copy code verbatim`;
  return `License: ${lic} - FORBIDDEN to copy code, adopt the idea only`;
}
