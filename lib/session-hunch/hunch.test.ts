import { test } from "node:test";
import assert from "node:assert/strict";
import { closestTopic, hunchFromScores, temperatureSoftmax, transcript, type Turn } from "./hunch";
import { softmax } from "@/lib/mental-health/score";

const vocab = new Map<string, number>();

test("a transcript keeps the newest turns that fit and needs a student line", () => {
  assert.equal(transcript([{ speaker: "counsellor", text: "hello" }], vocab, 128), null);
  assert.equal(transcript([{ speaker: "student", text: "hello" }], vocab, 128), "student: hello");

  const turns: Turn[] = [
    { speaker: "student", text: "one" },
    { speaker: "counsellor", text: "two" },
    { speaker: "student", text: "three" },
  ];
  assert.equal(transcript(turns, vocab, 8), "counsellor: two\nstudent: three");
});

test("a student turn that is longer than the window is still passed through", () => {
  const text = `hello ${"word ".repeat(20)}`.trim();
  assert.equal(transcript([{ speaker: "student", text }], vocab, 8), `student: ${text}`);
  assert.equal(
    transcript(
      [
        { speaker: "student", text: "earlier" },
        { speaker: "counsellor", text: "hello ".repeat(20) },
      ],
      vocab,
      8,
    ),
    null,
  );
});

test("a lower temperature makes the top class sharper", () => {
  const soft = softmax([0, 2]);
  const sharp = temperatureSoftmax([0, 2], 0.5);
  assert.ok(Math.abs(sharp.reduce((sum, n) => sum + n, 0) - 1) < 1e-6);
  assert.ok(sharp[1] > soft[1]);
});

test("the closest topic wins, and a tie hides the follow-up", () => {
  const probs = [0.7, 0.1, 0.1, 0.1];
  assert.equal(
    closestTopic(probs, [
      { topic: "sleep / burnout", probs: [0.72, 0.1, 0.09, 0.09] },
      { topic: "financial stress", probs: [0.1, 0.1, 0.1, 0.7] },
    ]),
    "sleep / burnout",
  );
  assert.equal(
    closestTopic([1, 0, 0, 0], [
      { topic: "sleep / burnout", probs: [1, 0, 0, 0] },
      { topic: "financial stress", probs: [1, 0, 0, 0] },
    ]),
    null,
  );
});

test("a hunch uses the display phrase and the winning topic's question", () => {
  const hunch = hunchFromScores(
    [0.05, 0.8, 0.05, 0.04, 0.03, 0.03],
    ["Normal", "Anxiety", "Stress", "Depression", "Suicidal", "Other"],
    { Anxiety: "anxiety / worry-driven distress" },
    { "exam anxiety": "What do you notice just before an exam?" },
    [
      { topic: "exam anxiety", probs: [0.05, 0.8, 0.05, 0.04, 0.03, 0.03] },
      { topic: "grief / loss", probs: [0.05, 0.05, 0.05, 0.7, 0.1, 0.05] },
    ],
  );
  assert.ok(hunch);
  assert.equal(hunch.label, "Anxiety");
  assert.equal(hunch.display, "anxiety / worry-driven distress");
  assert.equal(hunch.topic, "exam anxiety");
  assert.equal(hunch.followup, "What do you notice just before an exam?");
});
