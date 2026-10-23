// The recovery code: 24 characters from a 32-symbol alphabet = 120 bits of randomness, shown to the person once.
// It is the only thing that can unlock their key backup on a new device. Ilo cannot recover it for them.
// The alphabet leaves out I, L, O and U so a code copied by hand is hard to get wrong.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const LENGTH = 24;

export function generateRecoveryCode(): string {
  const bytes = new Uint8Array(LENGTH);
  crypto.getRandomValues(bytes);
  // 256 is a multiple of 32, so taking the low five bits is perfectly even
  const chars = Array.from(bytes, (b) => ALPHABET[b & 31]);
  return formatRecoveryCode(chars.join(""));
}

export function formatRecoveryCode(normalised: string): string {
  return normalised.match(/.{1,4}/g)?.join("-") ?? normalised;
}

// Accepts lower case, spaces, hyphens, and the usual look-alikes (O for 0, I or L for 1). Returns null if it can't be a code.
export function normalizeRecoveryCode(input: string): string | null {
  const s = input.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  return /^[0-9A-HJKMNP-TV-Z]{24}$/.test(s) ? s : null;
}
