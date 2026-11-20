import { test } from "node:test";
import assert from "node:assert/strict";
import { decryptBlob, decryptMessage, encryptBlob, encryptMessage, DecryptError } from "../e2ee/box";
import { generateKeypair, notesKeyFrom } from "../e2ee/keys";
import { getSodium, toB64 } from "../e2ee/sodium";

test("an inbox note sealed with the notes key opens only with that key", async () => {
  const owner = await generateKeypair();
  const other = await generateKeypair();
  const key = await notesKeyFrom(owner.secretKey);
  const sealed = await encryptBlob(new TextEncoder().encode("follow up gently"), key);
  assert.equal(new TextDecoder().decode(await decryptBlob(sealed, key)), "follow up gently");
  await assert.rejects(decryptBlob(sealed, await notesKeyFrom(other.secretKey)), DecryptError);
});

test("a booking note sealed to the counsellor opens for them and not for anyone else", async () => {
  const student = await generateKeypair();
  const counsellor = await generateKeypair();
  const stranger = await generateKeypair();
  const s = await getSodium();
  const sealed = await encryptMessage("please know I haven't slept", "note-1", toB64(s, counsellor.publicKey), student.secretKey);
  const out = await decryptMessage(sealed.ciphertext, sealed.nonce, toB64(s, student.publicKey), counsellor.secretKey);
  assert.equal(out.body, "please know I haven't slept");
  await assert.rejects(
    decryptMessage(sealed.ciphertext, sealed.nonce, toB64(s, student.publicKey), stranger.secretKey),
    DecryptError,
  );
});
