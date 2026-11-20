import { test } from "node:test";
import assert from "node:assert/strict";
import { callbackOrigin } from "./callback-origin";

const origin = "https://ilo.example";

test("development ignores a forwarded host", () => {
  assert.equal(callbackOrigin({
    requestOrigin: "http://localhost:3000",
    forwardedHost: "evil.example",
    siteHosts: "ilo.example",
    nodeEnv: "development",
  }), "http://localhost:3000");
});

test("an unknown forwarded host stays on the request origin", () => {
  assert.equal(callbackOrigin({
    requestOrigin: origin,
    forwardedHost: "evil.example",
    siteHosts: "ilo.example",
    nodeEnv: "production",
  }), origin);
});

test("a listed host and the request's own host are allowed", () => {
  assert.equal(callbackOrigin({
    requestOrigin: origin,
    forwardedHost: "www.ilo.example",
    siteHosts: "www.ilo.example, app.ilo.example",
    nodeEnv: "production",
  }), "https://www.ilo.example");
  assert.equal(callbackOrigin({
    requestOrigin: origin,
    forwardedHost: "ilo.example",
    siteHosts: "",
    nodeEnv: "production",
  }), "https://ilo.example");
});

test("a forwarded host with a path, user, or scheme is ignored", () => {
  for (const forwardedHost of ["evil.example/home", "user@evil.example", "https://evil.example", "ilo.example\nevil.example"]) {
    assert.equal(callbackOrigin({
      requestOrigin: origin,
      forwardedHost,
      siteHosts: "ilo.example",
      nodeEnv: "production",
    }), origin);
  }
});
