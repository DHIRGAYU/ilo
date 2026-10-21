// Loads libsodium once, only when first needed (it is WebAssembly, so it is never loaded on the server render).
// If the bundler complains about "./libsodium-sumo.mjs", pin the package: npm i libsodium-wrappers-sumo@0.7.13
export type Sodium = typeof import("libsodium-wrappers-sumo");

let loading: Promise<Sodium> | null = null;

export function getSodium(): Promise<Sodium> {
  loading ??= import("libsodium-wrappers-sumo").then(async (m) => {
    const s = ((m as unknown as { default?: Sodium }).default ?? m) as Sodium;
    await s.ready;
    return s;
  });
  return loading;
}

// Keys and ciphertext are stored in the database as URL-safe base64 without padding (a 32-byte key is 43 characters)
export const toB64 = (s: Sodium, bytes: Uint8Array) => s.to_base64(bytes, s.base64_variants.URLSAFE_NO_PADDING);
export const fromB64 = (s: Sodium, text: string) => s.from_base64(text, s.base64_variants.URLSAFE_NO_PADDING);
