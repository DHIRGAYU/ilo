import { getSodium } from "./sodium";

// A short number both people can read out to each other to prove nobody swapped their keys.
export async function safetyCode(keyA: string, keyB: string): Promise<string> {
  const s = await getSodium();
  const [x, y] = [keyA, keyB].sort();
  const h = s.crypto_generichash(48, s.from_string(`ilo-safety-v1|${x}|${y}`), null);
  const groups: string[] = [];
  for (let i = 0; i < 12; i++) {
    const n = ((h[i * 4] << 24) | (h[i * 4 + 1] << 16) | (h[i * 4 + 2] << 8) | h[i * 4 + 3]) >>> 0;
    groups.push(String(n % 100000).padStart(5, "0"));
  }
  return groups.join(" ");
}