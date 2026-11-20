import { test } from "node:test";
import assert from "node:assert/strict";
import { missingSupabaseAction } from "./gate";

test("signed-in areas, APIs, and model files are refused when Supabase is missing", () => {
  assert.equal(missingSupabaseAction("/home"), "student-login");
  assert.equal(missingSupabaseAction("/sessions/book"), "student-login");
  assert.equal(missingSupabaseAction("/messages"), "student-login");
  assert.equal(missingSupabaseAction("/request"), "student-login");
  assert.equal(missingSupabaseAction("/profile"), "student-login");
  assert.equal(missingSupabaseAction("/counsellor"), "counsellor-login");
  assert.equal(missingSupabaseAction("/counsellor/inbox"), "counsellor-login");
  assert.equal(missingSupabaseAction("/counsellor/login"), "allow");
  assert.equal(missingSupabaseAction("/api/calls/start"), "unavailable");
  assert.equal(missingSupabaseAction("/models/tokenizer.json"), "unavailable");
});

test("the public site still renders", () => {
  assert.equal(missingSupabaseAction("/"), "allow");
  assert.equal(missingSupabaseAction("/contact"), "allow");
  assert.equal(missingSupabaseAction("/privacy-policy"), "allow");
});
