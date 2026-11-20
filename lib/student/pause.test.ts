import { test } from "node:test";
import assert from "node:assert/strict";
import { PAUSE_CYCLES, breathCue } from "./pause";

test("a pause alternates a 4-second inhale and a 6-second exhale", () => {
  assert.deepEqual(breathCue(0, 1), { label: "Breathe in", left: 4, done: false });
  assert.deepEqual(breathCue(3, 1), { label: "Breathe in", left: 1, done: false });
  assert.deepEqual(breathCue(4, 1), { label: "Breathe out", left: 6, done: false });
  assert.deepEqual(breathCue(9, 1), { label: "Breathe out", left: 1, done: false });
  assert.equal(breathCue(10, 1).done, true);
  assert.equal(breathCue(PAUSE_CYCLES * 10, PAUSE_CYCLES).done, true);
  assert.equal(breathCue(PAUSE_CYCLES * 10 - 1, PAUSE_CYCLES).done, false);
});
