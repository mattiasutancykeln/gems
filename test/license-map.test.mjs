import { test } from "node:test";
import assert from "node:assert/strict";
import { codeReuseFor, reuseNote } from "../lib/license-map.mjs";

test("permissive licenses", () => {
  for (const id of [
    "MIT",
    "Apache-2.0",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "ISC",
    "Unlicense",
    "0BSD",
    "CC0-1.0",
    "BSD-4-Clause",
    "BSD-3-Clause-Clear",
  ])
    assert.equal(codeReuseFor(id), "permissive", id);
});

test("ideas-only licenses", () => {
  for (const id of [
    "GPL-3.0",
    "GPL-2.0",
    "AGPL-3.0",
    "LGPL-2.1",
    "MPL-2.0",
    "CC-BY-4.0",
    "CC-BY-SA-4.0",
    "EPL-2.0",
    "CC-BY-3.0",
    "CC-BY-2.0",
  ])
    assert.equal(codeReuseFor(id), "ideas-only", id);
});

test("forbidden: none, unknown, NC", () => {
  for (const id of [null, "", "none", "NOASSERTION", "CC-BY-NC-SA-4.0", "LicenseRef-proprietary", "SomethingNew-1.0"])
    assert.equal(codeReuseFor(id), "forbidden", String(id));
});

test("case-insensitive", () => {
  assert.equal(codeReuseFor("mit"), "permissive");
});

test("reuseNote wording", () => {
  assert.equal(reuseNote("permissive", "MIT"), "License: MIT (permissive) - code may be copied with attribution");
  assert.equal(reuseNote("ideas-only", "GPL-3.0"), "License: GPL-3.0 - IDEAS ONLY, do not copy code verbatim");
  assert.equal(reuseNote("forbidden", "none"), "License: none - FORBIDDEN to copy code, adopt the idea only");
});
