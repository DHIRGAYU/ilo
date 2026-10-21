// Needs libsodium installed:  npm i libsodium-wrappers-sumo && npm i -D @types/libsodium-wrappers-sumo
// Run:  npx tsx --test lib/e2ee/*.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { decryptMessage, decryptBlob, encryptBlob, encryptMessage, DecryptError } from "./box";
import { archiveKeyFrom, generateKeypair, publicFromSecret, unwrapSecretKey, WrongRecoveryCodeError, wrapSecretKey } from "./keys";
import { generateRecoveryCode } from "./recovery";
import { getSodium, toB64 } from "./sodium";

test("a keypair's public half matches its secret half", async () => {
  const kp = await generateKeypair();
  assert.deepEqual(await publicFromSecret(kp.secretKey), kp.publicKey);
  const s = await getSodium();
  assert.equal(toB64(s, kp.publicKey).length, 43); // fits the database's key column
});

test("a message goes from sender to recipient and back out intact, including Hindi and emoji", async () => {
  const a = await generateKeypair(), b = await generateKeypair(), s = await getSodium();
  const text = "नमस्ते, मैं ठीक हूँ 🙂";
  const sealed = await encryptMessage(text, "id-1", toB64(s, b.publicKey), a.secretKey);
  const out = await decryptMessage(sealed.ciphertext, sealed.nonce, toB64(s, a.publicKey), b.secretKey);
  assert.deepEqual(out, { id: "id-1", body: text });
});

test("the wrong person, the wrong sender, or any tampering fails to open", async () => {
  const a = await generateKeypair(), b = await generateKeypair(), c = await generateKeypair(), s = await getSodium();
  const sealed = await encryptMessage("private", "id-2", toB64(s, b.publicKey), a.secretKey);
  await assert.rejects(decryptMessage(sealed.ciphertext, sealed.nonce, toB64(s, a.publicKey), c.secretKey), DecryptError);
  await assert.rejects(decryptMessage(sealed.ciphertext, sealed.nonce, toB64(s, c.publicKey), b.secretKey), DecryptError);
  const flipped = sealed.ciphertext.slice(0, 10) + (sealed.ciphertext[10] === "A" ? "B" : "A") + sealed.ciphertext.slice(11);
  await assert.rejects(decryptMessage(flipped, sealed.nonce, toB64(s, a.publicKey), b.secretKey), DecryptError);
});

test("short messages of different lengths look the same size", async () => {
  const a = await generateKeypair(), b = await generateKeypair(), s = await getSodium();
  const x = await encryptMessage("ok", "id-3", toB64(s, b.publicKey), a.secretKey);
  const y = await encryptMessage("I have been feeling really low this week", "id-4", toB64(s, b.publicKey), a.secretKey);
  assert.equal(x.ciphertext.length, y.ciphertext.length);
});

test("the longest allowed message still fits the database limit", async () => {
  const a = await generateKeypair(), b = await generateKeypair(), s = await getSodium();
  const sealed = await encryptMessage("ह".repeat(2000), "id-5", toB64(s, b.publicKey), a.secretKey); // worst case: Hindi letters are 3 bytes each
  assert.ok(sealed.ciphertext.length <= 16384, `ciphertext is ${sealed.ciphertext.length} characters`);
  await assert.rejects(encryptMessage("x".repeat(2001), "id-6", toB64(s, b.publicKey), a.secretKey));
});

test("the backup opens with its recovery code and only with it", async () => {
  const kp = await generateKeypair(), code = generateRecoveryCode();
  const backup = await wrapSecretKey(kp.secretKey, code);
  assert.deepEqual(await unwrapSecretKey(backup, code), kp.secretKey);
  assert.deepEqual(await unwrapSecretKey(backup, code.toLowerCase().replaceAll("-", " ")), kp.secretKey);
  await assert.rejects(unwrapSecretKey(backup, generateRecoveryCode()), WrongRecoveryCodeError);
  await assert.rejects(unwrapSecretKey(backup, "not a code"), WrongRecoveryCodeError);
  assert.ok(backup.wrapped_key.length >= 16 && backup.salt.length >= 8 && backup.nonce.length >= 8); // database checks
});

test("an archive piece opens only with the owner's archive key", async () => {
  const a = await generateKeypair(), b = await generateKeypair();
  const keyA = await archiveKeyFrom(a.secretKey), keyB = await archiveKeyFrom(b.secretKey);
  const data = new TextEncoder().encode(JSON.stringify([{ id: "m1", body: "hello" }]));
  const sealed = await encryptBlob(data, keyA);
  assert.deepEqual(await decryptBlob(sealed, keyA), data);
  await assert.rejects(decryptBlob(sealed, keyB), DecryptError);
});
