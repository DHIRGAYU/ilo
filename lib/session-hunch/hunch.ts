import { softmax } from "@/lib/mental-health/score";
import { tokenCount, type Vocab } from "@/lib/mental-health/tokenize";

export type Turn = { speaker: "student" | "counsellor"; text: string };

export type SeedScore = { topic: string; probs: number[] };

export type Hunch = {
  label: string;
  display: string;
  probability: number;
  scores: number[];
  topic: string | null;
  followup: string | null;
};

// Topics closer than this are treated as the same hunch, so no follow-up is shown.
export const TOPIC_MARGIN = 0.02;

function lineOf(turn: Turn) {
  return `${turn.speaker}: ${turn.text.trim()}`;
}

// Newest speaker-tagged turns that fit. A single over-long student turn is kept and truncated later.
export function transcript(turns: Turn[], vocab: Vocab, maxLength: number): string | null {
  const lines = turns
    .map((turn) => ({ speaker: turn.speaker, text: turn.text.trim() }))
    .filter((turn) => turn.text.length > 0);
  if (!lines.some((turn) => turn.speaker === "student")) return null;

  let window: Turn[] = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    const next = [lines[i], ...window];
    const count = tokenCount(next.map(lineOf).join("\n"), vocab);
    if (count !== null && count <= maxLength) {
      window = next;
      continue;
    }
    break;
  }

  if (window.length === 0) {
    const last = lines[lines.length - 1];
    if (last.speaker !== "student") return null;
    return lineOf(last);
  }
  if (!window.some((turn) => turn.speaker === "student")) return null;
  return window.map(lineOf).join("\n");
}

export function temperatureSoftmax(logits: number[], temperature: number): number[] {
  const scale = temperature > 0 && Number.isFinite(temperature) ? temperature : 1;
  return softmax(logits.map((n) => n / scale));
}

export function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function closestTopic(probs: number[], seeds: SeedScore[], margin = TOPIC_MARGIN): string | null {
  const best = new Map<string, number>();
  for (const seed of seeds) {
    const score = cosine(probs, seed.probs);
    const prev = best.get(seed.topic);
    if (prev === undefined || score > prev) best.set(seed.topic, score);
  }
  let topTopic = "";
  let top = -Infinity;
  let second = -Infinity;
  for (const [topic, score] of best) {
    if (score > top) {
      second = top;
      top = score;
      topTopic = topic;
    } else if (score > second) {
      second = score;
    }
  }
  if (!topTopic || (best.size > 1 && top - second < margin)) return null;
  return topTopic;
}

export function hunchFromScores(
  probs: number[],
  labels: readonly string[],
  display: Record<string, string>,
  followups: Record<string, string>,
  seeds: SeedScore[],
): Hunch | null {
  if (probs.length === 0 || probs.length !== labels.length) return null;
  let best = 0;
  for (let i = 1; i < probs.length; i++) if (probs[i] > probs[best]) best = i;
  const label = labels[best];
  const topic = closestTopic(probs, seeds);
  return {
    label,
    display: display[label] ?? label,
    probability: probs[best] ?? 0,
    scores: probs,
    topic,
    followup: topic ? followups[topic] ?? null : null,
  };
}
