import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSecurityHeaders, contentSecurityPolicy, permissionsPolicy } from "./headers.mjs";

const header = (list: { key: string; value: string }[], key: string) => list.find((h) => h.key === key)?.value;

test("every response gets a locked-down content security policy and nosniff", () => {
  const headers = buildSecurityHeaders({ supabaseUrl: "https://abc.supabase.co", production: false, dailyDomain: "ilo" });
  const csp = header(headers, "Content-Security-Policy") ?? "";
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'/);
  assert.doesNotMatch(csp, /nonce-/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /https:\/\/\*\.daily\.co/);
  assert.match(csp, /https:\/\/abc\.supabase\.co/);
  assert.match(csp, /wss:\/\/abc\.supabase\.co/);
  assert.equal(header(headers, "X-Content-Type-Options"), "nosniff");
  assert.equal(header(headers, "Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.equal(header(headers, "Permissions-Policy"), permissionsPolicy("ilo"));
  assert.match(header(headers, "Permissions-Policy") ?? "", /camera=\(self "https:\/\/ilo\.daily\.co"\)/);
  assert.match(header(headers, "Permissions-Policy") ?? "", /microphone=\(self "https:\/\/ilo\.daily\.co"\)/);
  assert.match(header(headers, "Permissions-Policy") ?? "", /autoplay=\(self "https:\/\/ilo\.daily\.co"\)/);
  assert.equal(permissionsPolicy(undefined), "camera=(self), microphone=(self), autoplay=(self), geolocation=(), payment=()");
  assert.equal(header(headers, "Strict-Transport-Security"), undefined);
});

test("HSTS is sent only in production, and the static config does not add a second policy", () => {
  const headers = buildSecurityHeaders({ supabaseUrl: undefined, production: true });
  assert.match(header(headers, "Strict-Transport-Security") ?? "", /max-age=/);
  assert.equal(header(headers, "Content-Security-Policy"), undefined);
});

test("production policy carries one nonce and does not allow inline scripts", () => {
  const csp = contentSecurityPolicy({ supabaseUrl: "https://abc.supabase.co", production: true, nonce: "abc+def=" });
  assert.match(csp, /script-src 'self' 'nonce-abc\+def=' 'strict-dynamic' 'wasm-unsafe-eval'/);
  assert.doesNotMatch(csp, /script-src[^;]*unsafe-inline/);
  assert.match(csp, /https:\/\/abc\.supabase\.co/);
});
