import { fromB64, getSodium, toB64 } from "./sodium";

// One message, locked so only the recipient can open it and provably from the sender (libsodium crypto_box).
export const MAX_BODY_CHARS = 2000;
const PAD_BLOCK = 256; // every message is padded to a multiple of this, so its length doesn't give away what it says
const VERSION = 1;

export type Sealed = { ciphertext: string; nonce: string };
export class DecryptError extends Error {
  constructor(why = "cannot_decrypt") { super(why); this.name = "DecryptError"; }
}

export async function encryptMessage(body: string, clientId: string, recipientPublicKey: string, senderSecretKey: Uint8Array): Promise<Sealed> {
  const s = await getSodium();
  if (!body || body.length > MAX_BODY_CHARS) throw new Error("bad_message");
  // The message id travels inside the lock too, so the server cannot swap or replay one without being noticed
  const payload = s.pad(s.from_string(JSON.stringify({ v: VERSION, id: clientId, body })), PAD_BLOCK);
  const nonce = s.randombytes_buf(s.crypto_box_NONCEBYTES);
  const ct = s.crypto_box_easy(payload, nonce, fromB64(s, recipientPublicKey), senderSecretKey);
  return { ciphertext: toB64(s, ct), nonce: toB64(s, nonce) };
}

export async function decryptMessage(ciphertext: string, nonce: string, senderPublicKey: string, recipientSecretKey: Uint8Array): Promise<{ id: string; body: string }> {
  const s = await getSodium();
  try {
    const padded = s.crypto_box_open_easy(fromB64(s, ciphertext), fromB64(s, nonce), fromB64(s, senderPublicKey), recipientSecretKey);
    const p = JSON.parse(s.to_string(s.unpad(padded, PAD_BLOCK)));
    if (p?.v !== VERSION || typeof p.id !== "string" || typeof p.body !== "string") throw new DecryptError("bad_payload");
    return { id: p.id, body: p.body };
  } catch (e) {
    throw e instanceof DecryptError ? e : new DecryptError();
  }
}

// History archive pieces use a symmetric lock (secretbox) with the archive key
export async function encryptBlob(data: Uint8Array, key: Uint8Array): Promise<Sealed> {
  const s = await getSodium();
  const nonce = s.randombytes_buf(s.crypto_secretbox_NONCEBYTES);
  return { ciphertext: toB64(s, s.crypto_secretbox_easy(s.pad(data, 1024), nonce, key)), nonce: toB64(s, nonce) };
}

export async function decryptBlob(sealed: Sealed, key: Uint8Array): Promise<Uint8Array> {
  const s = await getSodium();
  try {
    return s.unpad(s.crypto_secretbox_open_easy(fromB64(s, sealed.ciphertext), fromB64(s, sealed.nonce), key), 1024);
  } catch {
    throw new DecryptError();
  }
}
