import { test } from "node:test";
import assert from "node:assert/strict";
import { appendPhrase, speakerFor } from "./call-turns";

const local = "local-session";

test("the local participant is the counsellor and anyone else is the student", () => {
  assert.equal(speakerFor(local, local), "counsellor");
  assert.equal(speakerFor("remote-session", local), "student");
  assert.equal(speakerFor(undefined, local), null);
  assert.equal(speakerFor("", local), null);
});

test("blank phrases are skipped and consecutive phrases from one speaker join", () => {
  const first = appendPhrase([], "student", "  I cannot sleep  ");
  assert.deepEqual(first, [{ speaker: "student", text: "I cannot sleep" }]);
  assert.deepEqual(appendPhrase(first, "student", "   "), first);
  assert.deepEqual(appendPhrase(first, "student", "at all"), [
    { speaker: "student", text: "I cannot sleep at all" },
  ]);
  assert.deepEqual(appendPhrase(appendPhrase(first, "student", "at all"), "counsellor", "When did that start?"), [
    { speaker: "student", text: "I cannot sleep at all" },
    { speaker: "counsellor", text: "When did that start?" },
  ]);
});
