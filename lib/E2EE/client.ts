import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptBlob, decryptMessage, encryptBlob, encryptMessage, MAX_BODY_CHARS } from "./box";
import { archiveKeyFrom, generateKeypair, publicFromSecret, unwrapSecretKey, wrapSecretKey, type KeyBackup } from "./keys";
import { generateRecoveryCode } from "./recovery";
import { fromB64, getSodium, toB64 } from "./sodium";
import { Store, type Message } from "./store";

export type { Message, Status } from "./store";

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
const PERMANENT = ["not_allowed", "bad_message", "recipient_unavailable", "recipient_no_key", "sender_no_key", "mailbox_full"];
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
  // Mail that could not be opened is reported here and left on the server rather than being acknowledged
  issues: { rowId: string; reason: string }[] = [];

  constructor(private supabase: SupabaseClient, private userId: string) {}

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

  // First time: makes the keys and returns the recovery code. Show it once and make the person save it.
  async setup(): Promise<string> {
    if (this.state !== "needs_setup") throw new E2EEError("bad_state");
    const s = await getSodium();
    const kp = await generateKeypair();
    const publicKey = toB64(s, kp.publicKey);
    const deviceId = crypto.randomUUID();
    const reg = await this.register(publicKey, deviceId); // refused with key_exists if another device got there first
    const code = generateRecoveryCode();
    await this.saveBackup(kp.secretKey, code, reg.key_version);
    await this.store.putIdentity({ userId: this.userId, deviceId, publicKey, keyVersion: reg.key_version, sealedSecret: await this.store.seal(kp.secretKey) });
    this.secretKey = kp.secretKey;
    this.state = "ready";
    return code;
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
          const sealed = await encryptMessage(m.body, id, peer.publicKey, this.sk());
          const { data, error } = await this.supabase.rpc("send_mailbox_message", {
            p_conversation_id: m.conversationId, p_client_id: id, p_ciphertext: sealed.ciphertext, p_nonce: sealed.nonce, p_recipient_key_version: peer.version,
          });
          if (!error) {
            const r = data as { created_at: string; delivered: boolean };
            await this.store.updateStatus(true, id, r.delivered ? "delivered" : "sent", { at: Date.parse(r.created_at) });
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
      if (data.length < 200) return;
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
      void this.collect(); void this.syncReceipts(); void this.flushOutbox();
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

  // ---------- Encrypted archive (how a new device gets history back) ----------

  private scheduleBackup() {
    if (this.state !== "ready") return;
    if (this.backupTimer) clearTimeout(this.backupTimer);
    this.backupTimer = setTimeout(() => void this.backupAll().catch(() => {}), 20_000);
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
        const items = JSON.parse(new TextDecoder().decode(await decryptBlob({ ciphertext: c.ciphertext, nonce: c.nonce }, key))) as ArchiveItem[];
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
