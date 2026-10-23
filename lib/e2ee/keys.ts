import { fromB64, getSodium, toB64 } from "./sodium";
import { normalizeRecoveryCode } from "./recovery";

export type Keypair = { publicKey: Uint8Array; secretKey: Uint8Array };

export async function notesKeyFrom(secretKey: Uint8Array): Promise<Uint8Array> {
  const s = await getSodium();
  return s.crypto_kdf_derive_from_key(32, 2, "ilonotes", secretKey);
}

// Exactly what is stored in public.key_backups. The server can see these values but cannot open them.
export type KeyBackup = {
  wrapped_key: string;
  salt: string;
  nonce: string;
  kdf: "argon2id";
  kdf_params: { v: 1; opslimit: number; memlimit: number };
};

export class WrongRecoveryCodeError extends Error {
  constructor() { super("wrong_recovery_code"); this.name = "WrongRecoveryCodeError"; }
}

export async function generateKeypair(): Promise<Keypair> {
  const s = await getSodium();
  const kp = s.crypto_box_keypair();
  return { publicKey: kp.publicKey, secretKey: kp.privateKey };
}

export async function publicFromSecret(secretKey: Uint8Array): Promise<Uint8Array> {
  const s = await getSodium();
  return s.crypto_scalarmult_base(secretKey);
}

async function deriveWrapKey(code: string, salt: Uint8Array, opslimit: number, memlimit: number) {
  const s = await getSodium();
  const normal = normalizeRecoveryCode(code);
  if (!normal) throw new WrongRecoveryCodeError();
  // The code already carries 120 bits of randomness, so the hashing cost here is a second layer, not the main defence
  return s.crypto_pwhash(32, s.from_string(normal), salt, opslimit, memlimit, s.crypto_pwhash_ALG_ARGON2ID13);
}

// Lock the private key with the recovery code
export async function wrapSecretKey(secretKey: Uint8Array, recoveryCode: string): Promise<KeyBackup> {
  const s = await getSodium();
  const opslimit = s.crypto_pwhash_OPSLIMIT_INTERACTIVE;
  const memlimit = s.crypto_pwhash_MEMLIMIT_INTERACTIVE;
  const salt = s.randombytes_buf(s.crypto_pwhash_SALTBYTES);
  const nonce = s.randombytes_buf(s.crypto_secretbox_NONCEBYTES);
  const key = await deriveWrapKey(recoveryCode, salt, opslimit, memlimit);
  const wrapped = s.crypto_secretbox_easy(secretKey, nonce, key);
  s.memzero(key);
  return { wrapped_key: toB64(s, wrapped), salt: toB64(s, salt), nonce: toB64(s, nonce), kdf: "argon2id", kdf_params: { v: 1, opslimit, memlimit } };
}

// Unlock it again on a new device. Throws WrongRecoveryCodeError if the code is wrong.
export async function unwrapSecretKey(backup: KeyBackup, recoveryCode: string): Promise<Uint8Array> {
  const s = await getSodium();
  const key = await deriveWrapKey(recoveryCode, fromB64(s, backup.salt), backup.kdf_params.opslimit, backup.kdf_params.memlimit);
  try {
    return s.crypto_secretbox_open_easy(fromB64(s, backup.wrapped_key), fromB64(s, backup.nonce), key);
  } catch {
    throw new WrongRecoveryCodeError();
  } finally {
    s.memzero(key);
  }
}

// A key only this person's private key can produce, used to lock their history archive
export async function archiveKeyFrom(secretKey: Uint8Array): Promise<Uint8Array> {
  const s = await getSodium();
  return s.crypto_kdf_derive_from_key(32, 1, "iloarchv", secretKey);
}
