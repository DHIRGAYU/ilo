import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseNote } from "./notes";

test("unsent edits on this device win, even if the server has something", () => {
  assert.equal(chooseNote({ text: "draft", dirty: true, syncedNonce: "a" }, "b"), "local");
  assert.equal(chooseNote({ text: "draft", dirty: true, syncedNonce: null }, null), "local");
});
test("a copy that matches the server is kept; a different server copy is unlocked", () => {
  assert.equal(chooseNote({ text: "x", dirty: false, syncedNonce: "n1" }, "n1"), "keep");
  assert.equal(chooseNote({ text: "x", dirty: false, syncedNonce: "n1" }, "n2"), "server");
});
test("a new device takes the server copy, and an empty server means an empty note", () => {
  assert.equal(chooseNote(undefined, "n1"), "server");
  assert.equal(chooseNote(undefined, null), "empty");
  assert.equal(chooseNote({ text: "x", dirty: false, syncedNonce: "n1" }, null), "empty");
});
