export const LABELS = [
  "Anxiety",
  "Bipolar",
  "Depression",
  "Normal",
  "Personality disorder",
  "Stress",
  "Suicidal",
] as const;

export const SIGNAL_VERSION = 2;

export type Label = (typeof LABELS)[number];

export function softmax(logits: number[]): number[] {
  if (logits.length === 0) return [];
  const peak = Math.max(...logits);
  const lifted = logits.map((n) => Math.exp(n - peak));
  const sum = lifted.reduce((total, n) => total + n, 0);
  return lifted.map((n) => n / sum);
}

export function topLabel(scores: number[]): Label {
  let best = 0;
  for (let i = 1; i < scores.length; i++) if (scores[i] > scores[best]) best = i;
  return LABELS[best] ?? LABELS[0];
}

export function packSignal(scores: number[]): string {
  return JSON.stringify({ v: SIGNAL_VERSION, scores });
}

// A bare score array was written for the previous label order, so it is left unscored and computed again.
export function unpackSignal(raw: string): number[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const body = parsed as { v?: unknown; scores?: unknown };
  if (body.v !== SIGNAL_VERSION || !Array.isArray(body.scores) || body.scores.length !== LABELS.length) return null;
  if (!body.scores.every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  return body.scores;
}
