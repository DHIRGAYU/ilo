const IN_SECONDS = 4;
const OUT_SECONDS = 6;
const CYCLE = IN_SECONDS + OUT_SECONDS;

export function breathCue(elapsedSeconds: number, cycles: number): { label: "Breathe in" | "Breathe out"; left: number; done: boolean } {
  const total = cycles * CYCLE;
  if (elapsedSeconds >= total) return { label: "Breathe out", left: 0, done: true };
  const into = elapsedSeconds % CYCLE;
  if (into < IN_SECONDS) return { label: "Breathe in", left: IN_SECONDS - into, done: false };
  return { label: "Breathe out", left: CYCLE - into, done: false };
}

export const PAUSE_CYCLES = 8;
export const NOTICE_SECONDS = 20;
