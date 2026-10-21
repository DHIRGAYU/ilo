import { test } from "node:test";
import assert from "node:assert/strict";
import { formatRecoveryCode, generateRecoveryCode, normalizeRecoveryCode } from "./recovery";

test("a generated code has 6 groups of 4 and is accepted back", () => {
  const code = generateRecoveryCode();
  assert.match(code, /^([0-9A-HJKMNP-TV-Z]{4}-){5}[0-9A-HJKMNP-TV-Z]{4}$/);
  assert.equal(normalizeRecoveryCode(code), code.replaceAll("-", ""));
});

test("codes are different every time", () => {
  const seen = new Set(Array.from({ length: 200 }, generateRecoveryCode));
  assert.equal(seen.size, 200);
});

test("typing it by hand: lower case, spaces and look-alikes are forgiven", () => {
  const ok = "ABCD-EFGH-JKMN-PQRS-TVWX-YZ01";
  assert.equal(normalizeRecoveryCode(ok.toLowerCase().replaceAll("-", " ")), "ABCDEFGHJKMNPQRSTVWXYZ01");
  assert.equal(normalizeRecoveryCode("ABCD-EFGH-JKMN-PQRS-TVWX-YZOI"), "ABCDEFGHJKMNPQRSTVWXYZ01"); // O -> 0, I -> 1
  assert.equal(normalizeRecoveryCode("ABCD-EFGH-JKMN-PQRS-TVWX-YZL0"), "ABCDEFGHJKMNPQRSTVWXYZ10"); // L -> 1
});

test("things that are not codes are refused", () => {
  assert.equal(normalizeRecoveryCode(""), null);
  assert.equal(normalizeRecoveryCode("ABCD-EFGH"), null);
  assert.equal(normalizeRecoveryCode("ABCD-EFGH-JKMN-PQRS-TVWX-YZ0U"), null); // U is not in the alphabet
  assert.equal(normalizeRecoveryCode("ABCD-EFGH-JKMN-PQRS-TVWX-YZ012"), null); // too long
});

test("formatting groups into fours", () => {
  assert.equal(formatRecoveryCode("ABCDEFGHJKMNPQRSTVWXYZ01"), "ABCD-EFGH-JKMN-PQRS-TVWX-YZ01");
});
