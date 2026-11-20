import type { Turn } from "./hunch";

export function speakerFor(participantId: string | undefined, localSessionId: string): Turn["speaker"] | null {
  if (!participantId) return null;
  return participantId === localSessionId ? "counsellor" : "student";
}

export function appendPhrase(turns: Turn[], speaker: Turn["speaker"], text: string): Turn[] {
  const phrase = text.trim();
  if (!phrase) return turns;
  const last = turns[turns.length - 1];
  if (last?.speaker === speaker) {
    return [...turns.slice(0, -1), { speaker, text: `${last.text} ${phrase}` }];
  }
  return [...turns, { speaker, text: phrase }];
}
