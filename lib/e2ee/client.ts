import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptBlob, decryptMessage, encryptBlob, encryptMessage, MAX_BODY_CHARS } from "./box";
import { archiveKeyFrom, generateKeypair, publicFromSecret, unwrapSecretKey, wrapSecretKey, type KeyBackup, type Keypair } from "./keys";
import { generateRecoveryCode } from "./recovery";
import { fromB64, getSodium, toB64 } from "./sodium";
import { Store, type Message, type Summary } from "./store";
import { notesKeyFrom } from "./keys"
import { safetyCode } from "./safety";
import { chooseNote } from "./notes";


export type { Message, Status, Summary } from "./store";

// What the app should show the person right now
export type E2EEState =
  | "loading"
  | "needs_setup"    // brand new: create keys and show the recovery code
  | "needs_restore"  // keys exist but not on this device: ask for the recovery code
  | "other_device"   // this device has the key but another device is the active one: offer to switch
  | "ready";

export class E2EEError extends Error {
  constructor(public code: string) { super(code); this.name = "E2EEError"; }
}

// Database errors that retrying will not fix. Anything else (no network, timeouts) is treated as temporary.
const PERMANENT = ["not_allowed", "bad_message", "recipient_unavailable", "recipient_no_key", "sender_no_key", "mailbox_full", "key_changed"];
const SAVEABLE = new Set(["sent", "delivered", "expired", "received"]);

type Peer = { publicKey: string; version: number };
type ArchiveItem = { id: string; c: string; m: boolean; b: string; t: number; s: string };

export class E2EEClient {
  state: E2EEState = "loading";
  private store!: Store;
  private secretKey: Uint8Array | null = null;
  private peers = new Map<string, Peer>();
  private inFlight = new Set<string>();
  private badRows = new Set<string>();
  private listeners = new Set<(conversationId?: string) => void>();
  private collecting: Promise<void> | null = null;
  private backupTimer: ReturnType<typeof setTimeout> | null = null;
  private pending: { kp: Keypair; code: string; rotate: boolean } | null = null;
  // Mail that could not be opened is reported here and left on the server rather than being acknowledged
  issues: { rowId: string; reason: string }[] = [];

  constructor(private supabase: SupabaseClient, private userId: string) { }

  onChange(cb: (conversationId?: string) => void) { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; }
  private emit(conversationId?: string) {
    this.listeners.forEach((cb) => cb(conversationId));
    this.scheduleBackup();
  }

  // ---------- Setup and recovery ----------

  async init(): Promise<E2EEState> {
    this.store = await Store.open(this.userId);
    const local = await this.store.getIdentity();
    const { data: server } = await this.supabase.from("user_keys").select("public_key, key_version, device_id").eq("user_id", this.userId).maybeSingle();

    if (!local) return (this.state = server ? "needs_restore" : "needs_setup");
    if (!server) {
      // The server has no record of our key (it was cleared). Register the key we hold.
      await this.register(local.publicKey, local.deviceId);
    } else if (server.public_key !== local.publicKey) {
      // The key was replaced from another device; this device's copy is out of date
      await this.store.clearIdentity();
      return (this.state = "needs_restore");
    }
    this.secretKey = await this.store.open(local.sealedSecret);
    // Anything left half-sent when the page closed goes back in the queue
    for (const m of await this.store.listByStatus("sending")) await this.store.updateStatus(true, m.id, "queued");
    const active = server ? server.device_id === local.deviceId : true;
    return (this.state = active ? "ready" : "other_device");
  }

  private async register(publicKey: string, deviceId: string, rotate = false) {
    const { data, error } = await this.supabase.rpc("register_public_key", { p_public_key: publicKey, p_device_id: deviceId, p_rotate: rotate });
    if (error) throw new E2EEError(error.message);
    return data as { key_version: number; device_id: string };
  }

  // Step 1 of setup: make the keys and the recovery code, but save nothing yet.
  // Works for a brand-new account, and also for "start fresh" when the recovery code was lost (that replaces the old key).
  async beginSetup(): Promise<string> {
    if (this.state !== "needs_setup" && this.state !== "needs_restore") throw new E2EEError("bad_state");
    const code = generateRecoveryCode();
    this.pending = { kp: await generateKeypair(), code, rotate: this.state === "needs_restore" };
    return code;
  }

  // Step 2, after the person confirms they have kept the code: register the key, store the locked backup, keep the key here.
  // If it fails part-way it is safe to call again.
  async finishSetup(): Promise<void> {
    const p = this.pending;
    if (!p) throw new E2EEError("bad_state");
    const s = await getSodium();
    const publicKey = toB64(s, p.kp.publicKey);
    const deviceId = crypto.randomUUID();
    if (p.rotate) await this.eraseAllArchives(); // pieces locked with the old key can never be opened again
    const reg = await this.register(publicKey, deviceId, p.rotate);
    await this.saveBackup(p.kp.secretKey, p.code, reg.key_version);
    await this.store.putIdentity({ userId: this.userId, deviceId, publicKey, keyVersion: reg.key_version, sealedSecret: await this.store.seal(p.kp.secretKey) });
    this.secretKey = p.kp.secretKey;
    this.pending = null;
    this.state = "ready";
  }

  private async eraseAllArchives() {
    const { data } = await this.supabase.from("history_chunks").select("conversation_id").eq("owner_id", this.userId);
    for (const c of new Set((data ?? []).map((r: { conversation_id: string }) => r.conversation_id))) {
      await this.supabase.rpc("clear_history", { p_conversation_id: c });
      await this.store.setLastSeq(c, 0);
    }
  }

  private async saveBackup(secretKey: Uint8Array, code: string, keyVersion: number) {
    const b = await wrapSecretKey(secretKey, code);
    const { error } = await this.supabase.from("key_backups").upsert({ user_id: this.userId, ...b, key_version: keyVersion });
    if (error) throw new E2EEError("backup_failed");
  }

  // New device or cleared browser: unlock the backup with the recovery code, then bring history back from the archive.
  // Throws WrongRecoveryCodeError for a wrong code.
  async restore(code: string): Promise<void> {
    if (this.state !== "needs_restore") throw new E2EEError("bad_state");
    const s = await getSodium();
    const [{ data: b }, { data: k }] = await Promise.all([
      this.supabase.from("key_backups").select("wrapped_key, salt, nonce, kdf, kdf_params").eq("user_id", this.userId).maybeSingle(),
      this.supabase.from("user_keys").select("public_key, key_version").eq("user_id", this.userId).maybeSingle(),
    ]);
    if (!b || !k) throw new E2EEError("no_backup");
    const secretKey = await unwrapSecretKey(b as KeyBackup, code);
    const publicKey = toB64(s, await publicFromSecret(secretKey));
    if (publicKey !== k.public_key) throw new E2EEError("backup_out_of_date");
    const deviceId = crypto.randomUUID();
    await this.register(publicKey, deviceId); // same key: this device becomes the active one
    await this.store.putIdentity({ userId: this.userId, deviceId, publicKey, keyVersion: k.key_version, sealedSecret: await this.store.seal(secretKey) });
    this.secretKey = secretKey;
    this.state = "ready";
    await this.restoreHistory();
  }

  // Another device is active; make this one active instead
  async takeOver() {
    const local = await this.store.getIdentity();
    if (!local) throw new E2EEError("bad_state");
    await this.register(local.publicKey, local.deviceId);
    this.state = "ready";
  }

  private sk() {
    if (this.state !== "ready" || !this.secretKey) throw new E2EEError("not_ready");
    return this.secretKey;
  }

  // ---------- Sending ----------

  async send(conversationId: string, body: string): Promise<Message> {
    this.sk();
    const text = body.trim();
    if (!text || text.length > MAX_BODY_CHARS) throw new E2EEError("bad_message");
    const m: Message = { id: crypto.randomUUID(), conversationId, mine: true, body: text, at: Date.now(), status: "queued" };
    await this.store.putMessage(m);
    this.emit(conversationId);
    void this.deliver(m.id);
    return m;
  }

  async retry(id: string) {
    await this.store.updateStatus(true, id, "queued", { reason: null });
    void this.deliver(id);
  }

  async flushOutbox() {
    for (const m of await this.store.listByStatus("queued")) await this.deliver(m.id);
  }

  private async peer(conversationId: string, force = false): Promise<Peer> {
    const cached = this.peers.get(conversationId);
    if (cached && !force) return cached;
    const { data, error } = await this.supabase.rpc("get_peer_public_key", { p_conversation_id: conversationId });
    if (error) throw new E2EEError(error.message);
    const row = (data as { public_key: string; key_version: number }[] | null)?.[0];
    if (!row) throw new E2EEError("recipient_no_key");
    const p = { publicKey: row.public_key, version: row.key_version };
    this.peers.set(conversationId, p);
    return p;
  }
  private async checkSender(conversationId: string, senderKey: string): Promise<"ok" | "held" | "unknown"> {
    const pins = await this.store.getPins(conversationId);
    if (pins.includes(senderKey)) return "ok";
    const current = await this.peer(conversationId, true); // what the server lists for them right now
    if (current.publicKey !== senderKey) return "unknown";
    if (pins.length === 0) { await this.store.addPin(conversationId, senderKey); return "ok"; }
    return "held";
  }

  async keyChanged(conversationId: string) { return this.store.getKeyChanged(conversationId); }

  async trustNewKey(conversationId: string) {
    const current = await this.peer(conversationId, true);
    await this.store.addPin(conversationId, current.publicKey);
    await this.store.setKeyChanged(conversationId, false);
    for (const m of await this.store.listByStatus("failed")) {
      if (m.conversationId === conversationId && m.reason === "key_changed") await this.retry(m.id);
    }
    void this.collect();
    this.emit(conversationId);
  }

  async safetyCode(conversationId: string) {
    const local = await this.store.getIdentity();
    if (!local) throw new E2EEError("not_ready");
    return safetyCode(local.publicKey, (await this.peer(conversationId)).publicKey);
  }
  private async deliver(id: string) {
    if (this.inFlight.has(id)) return;
    this.inFlight.add(id);
    let touched: string | undefined;
    try {
      const m = await this.store.getMessage(true, id);
      if (!m || m.status !== "queued") return;
      touched = m.conversationId;
      await this.store.updateStatus(true, id, "sending");
      this.emit(touched);
      try {
        for (let attempt = 0; attempt < 2; attempt++) {
          const peer = await this.peer(m.conversationId, attempt > 0);
          // The other person's key must be one we already trusted. First contact is trusted; a different key waits for their say-so.
          const pins = await this.store.getPins(m.conversationId);
          if (pins.length === 0) await this.store.addPin(m.conversationId, peer.publicKey);
          else if (!pins.includes(peer.publicKey)) { await this.store.setKeyChanged(m.conversationId, true); throw new E2EEError("key_changed"); }
          const sealed = await encryptMessage(m.body, id, peer.publicKey, this.sk());
          const { data, error } = await this.supabase.rpc("send_mailbox_message", {
            p_conversation_id: m.conversationId, p_client_id: id, p_ciphertext: sealed.ciphertext, p_nonce: sealed.nonce, p_recipient_key_version: peer.version,
          });
          if (!error) {
            const r = data as { id: string | null; created_at: string; delivered: boolean };
            // No id means a receipt already exists: it was delivered, or it expired unread
            const status = r.delivered ? "delivered" : r.id === null ? "expired" : "sent";
            await this.store.updateStatus(true, id, status, { at: Date.parse(r.created_at) });
            return;
          }
          if (error.message.includes("stale_key") && attempt === 0) continue; // they changed key; fetch the new one and re-lock
          throw new E2EEError(error.message);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const code = PERMANENT.find((c) => msg.includes(c));
        if (code) await this.store.updateStatus(true, id, "failed", { reason: code });
        else await this.store.updateStatus(true, id, "queued"); // no network or similar; flushOutbox() tries again
      }
    } finally {
      this.inFlight.delete(id);
      this.emit(touched);
    }
  }

  // ---------- Receiving ----------

  // Pulls waiting mail, opens it, saves it on this device, and only then tells the server it can delete its copy.
  collect(): Promise<void> {
    this.collecting ??= this.collectNow().finally(() => { this.collecting = null; });
    return this.collecting;
  }

  private async collectNow() {
    if (this.state !== "ready") return;
    // Only the device the server lists as active may take mail, or it would empty the mailbox for the real one
    const local = await this.store.getIdentity();
    const { data: k } = await this.supabase.from("user_keys").select("device_id").eq("user_id", this.userId).maybeSingle();
    if (local && k && k.device_id !== local.deviceId) { this.state = "other_device"; this.emit(); return; }
    const secretKey = this.sk();
    for (let page = 0; page < 20; page++) {
      const { data, error } = await this.supabase
        .from("mailbox")
        .select("id, conversation_id, client_id, ciphertext, nonce, sender_public_key, created_at")
        .order("created_at", { ascending: true })
        .limit(200);
      if (error || !data || data.length === 0) return;
      const ackIds: string[] = [];
      const touched = new Set<string>();
      for (const row of data) {
        if (this.badRows.has(row.id)) continue;
        try {
          const who = await this.checkSender(row.conversation_id, row.sender_public_key);
          if (who === "unknown") throw new E2EEError("unknown_sender"); // not a key the server lists for them: never open it
          if (who === "held") { await this.store.setKeyChanged(row.conversation_id, true); touched.add(row.conversation_id); continue; } // wait until they have checked the new key
          const out = await decryptMessage(row.ciphertext, row.nonce, row.sender_public_key, secretKey);
          if (out.id !== row.client_id) throw new E2EEError("id_mismatch");
          const added = await this.store.putMessage(
            { id: row.client_id, conversationId: row.conversation_id, mine: false, body: out.body, at: Date.parse(row.created_at), status: "received" },
            { ifAbsent: true },
          );
          if (added) touched.add(row.conversation_id);
          ackIds.push(row.id); // saved (now or earlier), so safe to release
        } catch (e) {
          this.badRows.add(row.id);
          this.issues.push({ rowId: row.id, reason: e instanceof Error ? e.message : "cannot_decrypt" });
        }
      }
      for (let i = 0; i < ackIds.length; i += 200) {
        await this.supabase.rpc("ack_mailbox_messages", { p_ids: ackIds.slice(i, i + 200) });
      }
      touched.forEach((c) => this.emit(c));
      if (data.length < 200 || ackIds.length === 0) return;
    }
  }

  // Delivery receipts: "delivered", or "expired" if the other side never collected it within 30 days
  async syncReceipts() {
    const { data } = await this.supabase.from("delivery_receipts").select("client_id, status, delivered_at");
    for (const r of data ?? []) await this.applyReceipt(r);
  }

  private async applyReceipt(r: { client_id: string; status: string; delivered_at: string }) {
    const status = r.status === "expired" ? "expired" : "delivered";
    const c = await this.store.updateStatus(true, r.client_id, status);
    if (c) this.emit(c);
  }

  // Starts live updates. Returns a function that stops them.
  subscribe(): () => void {
    const ch = this.supabase
      .channel(`e2ee-${this.userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mailbox", filter: `recipient_id=eq.${this.userId}` }, () => void this.collect())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "delivery_receipts", filter: `sender_id=eq.${this.userId}` },
        (p) => void this.applyReceipt(p.new as { client_id: string; status: string; delivered_at: string }))
      .subscribe();
    const catchUp = () => {
      if (this.state !== "ready" || document.visibilityState !== "visible") return;
      void this.collect(); void this.syncReceipts(); void this.flushOutbox(),void this.flushNotes();
    };
    catchUp();
    window.addEventListener("online", catchUp);
    document.addEventListener("visibilitychange", catchUp);
    const timer = setInterval(catchUp, 60_000); // safety net in case a live update is missed
    return () => {
      void this.supabase.removeChannel(ch);
      window.removeEventListener("online", catchUp);
      document.removeEventListener("visibilitychange", catchUp);
      clearInterval(timer);
    };

  }

  messages(conversationId: string) { return this.store.list(conversationId); }
  summaries(): Promise<Record<string, Summary>> { return this.store.summaries(); }
  async sealText(text: string): Promise<{ ciphertext: string; nonce: string }> {
    return encryptBlob(new TextEncoder().encode(text), await notesKeyFrom(this.sk()));
  }
  async loadNote(appointmentId: string, server: { ciphertext: string; nonce: string } | null): Promise<string> {
    const local = await this.store.getNote(appointmentId);
    const choice = chooseNote(local, server?.nonce ?? null);
    if (choice === "local" || choice === "keep") return local!.text;
    if (choice === "empty") return "";
    const text = await this.openText(server!);
    await this.store.putNote(appointmentId, text, { synced: server!.nonce });
    return text;
  }

  async saveNote(appointmentId: string, text: string): Promise<"synced" | "local"> {
    await this.store.putNote(appointmentId, text);
    return this.syncNote(appointmentId);
  }

  private async syncNote(appointmentId: string): Promise<"synced" | "local"> {
    const n = await this.store.getNote(appointmentId);
    if (!n || !n.dirty) return "synced";
    try {
      const sealed = n.text.trim() ? await this.sealText(n.text) : null;
      const { error } = await this.supabase.rpc("save_session_record", sealed
        ? { p_appointment_id: appointmentId, p_note_ciphertext: sealed.ciphertext, p_note_nonce: sealed.nonce }
        : { p_appointment_id: appointmentId, p_clear_note: true });
      if (error) return "local";
      await this.store.markNoteSynced(appointmentId, n.updatedAt, sealed?.nonce ?? null);
      return "synced";
    } catch {
      return "local";
    }
  }

  async flushNotes() {
    if (this.state !== "ready") return;
    for (const id of await this.store.dirtyNotes()) await this.syncNote(id);
  }
  async openText(sealed: { ciphertext: string; nonce: string }): Promise<string> {
    return new TextDecoder().decode(await decryptBlob(sealed, await notesKeyFrom(this.sk())));
  }
  async sealFor(id: string, text: string, recipientPublicKey: string) {
    return encryptMessage(text, id, recipientPublicKey, this.sk());
  }
  async openFrom(id: string, ciphertext: string, nonce: string, senderPublicKey: string): Promise<string> {
    const out = await decryptMessage(ciphertext, nonce, senderPublicKey, this.sk());
    if (out.id !== id) throw new E2EEError("id_mismatch");
    return out.body;
  }

  // Everything up to the newest message from the other person counts as read
  async markRead(conversationId: string) {
    const latest = Math.max(0, ...(await this.store.list(conversationId)).filter((m) => !m.mine).map((m) => m.at));
    if (latest <= (await this.store.getReadAt(conversationId))) return;
    await this.store.setReadAt(conversationId, latest);
    this.emit(conversationId);
  }

  // For a message that expired unread: send it again as a new message
  async resend(id: string) {
    const m = await this.store.getMessage(true, id);
    if (!m) return;
    await this.send(m.conversationId, m.body);
    await this.store.remove(true, id);
    this.emit(m.conversationId);
  }

  // ---------- Encrypted archive (how a new device gets history back) ----------

  private scheduleBackup() {
    if (this.state !== "ready") return;
    if (this.backupTimer) clearTimeout(this.backupTimer);
    this.backupTimer = setTimeout(() => void this.backupAll().catch(() => { }), 20_000);
  }

  async backupAll() {
    const key = await archiveKeyFrom(this.sk());
    const byConv = new Map<string, Message[]>();
    for (const m of await this.store.listUnarchived()) byConv.set(m.conversationId, [...(byConv.get(m.conversationId) ?? []), m]);
    for (const [conversationId, msgs] of byConv) {
      msgs.sort((a, b) => a.at - b.at);
      // Keep each piece well under the 1 MB database limit
      let batch: Message[] = []; let size = 0;
      const flush = async () => { if (batch.length) { await this.uploadChunk(conversationId, batch, key); batch = []; size = 0; } };
      for (const m of msgs) {
        const cost = m.body.length * 3 + 120;
        if (size + cost > 400_000) await flush();
        batch.push(m); size += cost;
      }
      await flush();
    }
  }

  private async uploadChunk(conversationId: string, batch: Message[], key: Uint8Array, retried = false): Promise<void> {
    const items: ArchiveItem[] = batch.map((m) => ({ id: m.id, c: m.conversationId, m: m.mine, b: m.body, t: m.at, s: m.status }));
    const sealed = await encryptBlob(new TextEncoder().encode(JSON.stringify(items)), key);
    const seq = (await this.store.getLastSeq(conversationId)) + 1;
    const { error } = await this.supabase.rpc("append_history_chunk", { p_conversation_id: conversationId, p_seq: seq, p_ciphertext: sealed.ciphertext, p_nonce: sealed.nonce });
    if (error) {
      if (error.message.includes("seq_conflict") && !retried) { await this.restoreHistory(); return this.uploadChunk(conversationId, batch, key, true); }
      throw new E2EEError(error.message);
    }
    await this.store.setLastSeq(conversationId, seq);
    await this.store.markArchived(batch);
  }

  // Download every archive piece, open it with this person's key, and merge it in. Existing local messages are kept as they are.
  async restoreHistory() {
    const key = await archiveKeyFrom(this.sk());
    const maxSeq = new Map<string, number>();
    const touched = new Set<string>();
    for (let from = 0; ; from += 10) {
      const { data, error } = await this.supabase
        .from("history_chunks").select("conversation_id, seq, ciphertext, nonce")
        .eq("owner_id", this.userId).order("conversation_id").order("seq").range(from, from + 9);
      if (error || !data || data.length === 0) break;
      for (const c of data) {
        maxSeq.set(c.conversation_id, Math.max(maxSeq.get(c.conversation_id) ?? 0, c.seq));
        let items: ArchiveItem[];
        try { items = JSON.parse(new TextDecoder().decode(await decryptBlob({ ciphertext: c.ciphertext, nonce: c.nonce }, key))) as ArchiveItem[]; }
        catch { continue; } // locked with a different key, so skip it
        for (const it of items) {
          if (!SAVEABLE.has(it.s)) continue;
          const added = await this.store.putMessage(
            { id: it.id, conversationId: it.c, mine: it.m, body: it.b, at: it.t, status: it.s as Message["status"] },
            { ifAbsent: true, archived: true },
          );
          if (added) touched.add(it.c);
        }
      }
      if (data.length < 10) break;
    }
    for (const [c, seq] of maxSeq) await this.store.setLastSeq(c, seq);
    touched.forEach((c) => this.emit(c));
  }

  // For a shared device: removes the key and all history from this browser
  async forgetThisDevice() {
    this.secretKey = null;
    this.state = "loading";
    await this.store.destroy();
  }

  // Ask the server to erase this person's archive of one conversation (their right under the DPDP Act)
  async eraseArchive(conversationId: string) {
    const { error } = await this.supabase.rpc("clear_history", { p_conversation_id: conversationId });
    if (error) throw new E2EEError(error.message);
    await this.store.setLastSeq(conversationId, 0);
  }
}
