// The device's own storage (IndexedDB): the private key, and every message's history.
// Everything sensitive is locked with a device key that the browser keeps non-extractable, so a copy of the
// raw database file is useless on its own. This does not protect against malicious scripts running in the page.

export type Status = "queued" | "sending" | "sent" | "delivered" | "expired" | "failed" | "received";
export type Message = {
  id: string;              // the sender's client id (a uuid)
  conversationId: string;
  mine: boolean;
  body: string;
  at: number;              // milliseconds; the server's time once known
  status: Status;
  reason?: string;         // why a send failed, e.g. "recipient_no_key"
};
export type Summary = {
  lastBody: string; lastMine: boolean; lastAt: number; lastStatus: Status; firstAt: number;
  unread: number;        // messages from the other person that have not been read on this device
  hasReceived: boolean;  // they have written at least once
  hasMine: boolean;      // I have written at least once
};
type Sealed = { iv: Uint8Array; ct: Uint8Array };

type Row = { key: string; id: string; conversationId: string; mine: boolean; at: number; status: Status; reason?: string; archived: 0 | 1; body: Sealed };
export type Identity = { userId: string; deviceId: string; publicKey: string; keyVersion: number; sealedSecret: Sealed };

export type StoredNote = { text: string; updatedAt: number; dirty: boolean; syncedNonce: string | null };
type NoteRow = { id: string; body: Sealed; updatedAt: number; dirty: 0 | 1; syncedNonce: string | null };

const req = <T,>(r: IDBRequest<T>) => new Promise<T>((ok, no) => { r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
const done = (tx: IDBTransaction) => new Promise<void>((ok, no) => { tx.oncomplete = () => ok(); tx.onerror = () => no(tx.error); tx.onabort = () => no(tx.error); });
const keyOf = (mine: boolean, id: string) => `${mine ? "m" : "r"}:${id}`;
const enc = new TextEncoder(), dec = new TextDecoder();

export class Store {
  private constructor(private db: IDBDatabase, private deviceKey: CryptoKey, private name: string) { }

  static async open(userId: string): Promise<Store> {
    const name = `ilo-e2ee-${userId}`; // one database per account, so people sharing a device never mix
    const open = indexedDB.open(name, 2);
    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
      if (!db.objectStoreNames.contains("messages")) {
        const m = db.createObjectStore("messages", { keyPath: "key" });
        m.createIndex("byConv", ["conversationId", "at"]);
        m.createIndex("byStatus", "status");
        m.createIndex("byArchived", "archived");
      }
      if (!db.objectStoreNames.contains("notes")) {
        const n = db.createObjectStore("notes", { keyPath: "id" });
        n.createIndex("byDirty", "dirty");
      }
    };

    const db = await req(open);
    let deviceKey = (await req(db.transaction("meta").objectStore("meta").get("deviceKey"))) as CryptoKey | undefined;
    if (!deviceKey) {
      const fresh = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
      try {
        const tx = db.transaction("meta", "readwrite");
        tx.objectStore("meta").add(fresh, "deviceKey");
        await done(tx);
        deviceKey = fresh;
      } catch {
        // another tab got there first
        deviceKey = (await req(db.transaction("meta").objectStore("meta").get("deviceKey"))) as CryptoKey;
      }
    }
    return new Store(db, deviceKey, name);
  }

  async seal(data: Uint8Array): Promise<Sealed> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, this.deviceKey, data as BufferSource));
    return { iv, ct };
  }
  async open(s: Sealed): Promise<Uint8Array> {
    return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: s.iv as BufferSource }, this.deviceKey, s.ct as BufferSource));
  }

  private meta = (mode: IDBTransactionMode = "readonly") => this.db.transaction("meta", mode);
  private msgs = (mode: IDBTransactionMode = "readonly") => this.db.transaction("messages", mode);

  async getIdentity() { return (await req(this.meta().objectStore("meta").get("identity"))) as Identity | undefined; }
  async putIdentity(i: Identity) { const tx = this.meta("readwrite"); tx.objectStore("meta").put(i, "identity"); await done(tx); }
  async clearIdentity() { const tx = this.meta("readwrite"); tx.objectStore("meta").delete("identity"); await done(tx); }
  // Keys we have accepted for the other person, per conversation (the first one is trusted on first contact)
  async getPins(conversationId: string): Promise<string[]> {
    return ((await req(this.meta().objectStore("meta").get(`pins:${conversationId}`))) as string[] | undefined) ?? [];
  }
  async addPin(conversationId: string, publicKey: string) {
    const pins = await this.getPins(conversationId);
    if (pins.includes(publicKey)) return;
    const tx = this.meta("readwrite");
    tx.objectStore("meta").put([...pins, publicKey], `pins:${conversationId}`);
    await done(tx);
  }
  async getKeyChanged(conversationId: string) { return Boolean(await req(this.meta().objectStore("meta").get(`kc:${conversationId}`))); }
  async setKeyChanged(conversationId: string, value: boolean) { const tx = this.meta("readwrite"); tx.objectStore("meta").put(value, `kc:${conversationId}`); await done(tx); }
  async getLastSeq(conversationId: string) { return ((await req(this.meta().objectStore("meta").get(`seq:${conversationId}`))) as number | undefined) ?? 0; }
  async setLastSeq(conversationId: string, seq: number) { const tx = this.meta("readwrite"); tx.objectStore("meta").put(seq, `seq:${conversationId}`); await done(tx); }

  private async toMessage(r: Row): Promise<Message> {
    return { id: r.id, conversationId: r.conversationId, mine: r.mine, at: r.at, status: r.status, reason: r.reason, body: dec.decode(await this.open(r.body)) };
  }

  async getMessage(mine: boolean, id: string): Promise<Message | undefined> {
    const r = (await req(this.msgs().objectStore("messages").get(keyOf(mine, id)))) as Row | undefined;
    return r ? this.toMessage(r) : undefined;
  }

  // Saves a message. With ifAbsent, an existing copy is left untouched (used when merging an archive or re-collecting mail).
  async putMessage(m: Message, opts: { archived?: boolean; ifAbsent?: boolean } = {}): Promise<boolean> {
    const key = keyOf(m.mine, m.id);
    const body = await this.seal(enc.encode(m.body));
    const tx = this.msgs("readwrite");
    const st = tx.objectStore("messages");
    if (opts.ifAbsent && (await req(st.count(key))) > 0) { await done(tx); return false; }
    st.put({ key, id: m.id, conversationId: m.conversationId, mine: m.mine, at: m.at, status: m.status, reason: m.reason, archived: opts.archived ? 1 : 0, body } satisfies Row);
    await done(tx);
    return true;
  }

  // Change a message's status (and optionally its time). A message is never moved backwards from delivered.
  async updateStatus(mine: boolean, id: string, status: Status, extra: { at?: number; reason?: string | null } = {}) {
    const tx = this.msgs("readwrite");
    const st = tx.objectStore("messages");
    const r = (await req(st.get(keyOf(mine, id)))) as Row | undefined;
    if (r && !(r.status === "delivered" && status !== "delivered")) {
      const changed = r.status !== status || (extra.at !== undefined && extra.at !== r.at);
      r.status = status;
      if (extra.at) r.at = extra.at;
      if (extra.reason !== undefined) r.reason = extra.reason ?? undefined;
      if (changed) r.archived = 0; // upload the new state with the next archive piece
      st.put(r);
    }
    await done(tx);
    return r?.conversationId;
  }

  async list(conversationId: string): Promise<Message[]> {
    const rows = (await req(this.msgs().objectStore("messages").index("byConv").getAll(IDBKeyRange.bound([conversationId, 0], [conversationId, Infinity])))) as Row[];
    return Promise.all(rows.map((r) => this.toMessage(r)));
  }

  async listByStatus(status: Status): Promise<Message[]> {
    const rows = (await req(this.msgs().objectStore("messages").index("byStatus").getAll(status))) as Row[];
    return Promise.all(rows.map((r) => this.toMessage(r)));
  }

  // Messages finished with (not mid-send) that have not been uploaded to the archive yet
  async listUnarchived(): Promise<Message[]> {
    const rows = (await req(this.msgs().objectStore("messages").index("byArchived").getAll(0))) as Row[];
    return Promise.all(rows.filter((r) => ["sent", "delivered", "expired", "received"].includes(r.status)).map((r) => this.toMessage(r)));
  }

  async markArchived(items: { mine: boolean; id: string }[]) {
    const tx = this.msgs("readwrite");
    const st = tx.objectStore("messages");
    for (const it of items) {
      const r = (await req(st.get(keyOf(it.mine, it.id)))) as Row | undefined;
      if (r) { r.archived = 1; st.put(r); }
    }
    await done(tx);
  }

  async remove(mine: boolean, id: string) { const tx = this.msgs("readwrite"); tx.objectStore("messages").delete(keyOf(mine, id)); await done(tx); }

  // "Read up to here" is the time of the newest message seen, using the sender's clock, so device clock differences never matter
  async getReadAt(conversationId: string) { return ((await req(this.meta().objectStore("meta").get(`read:${conversationId}`))) as number | undefined) ?? 0; }
  async setReadAt(conversationId: string, at: number) { const tx = this.meta("readwrite"); tx.objectStore("meta").put(at, `read:${conversationId}`); await done(tx); }

  // Last message, unread count and so on for every conversation: what the inbox list and the badges are built from
  async summaries(): Promise<Record<string, Summary>> {
    const rows = (await req(this.msgs().objectStore("messages").getAll())) as Row[];
    const by = new Map<string, Row[]>();
    for (const r of rows) { const l = by.get(r.conversationId); if (l) l.push(r); else by.set(r.conversationId, [r]); }
    const out: Record<string, Summary> = {};
    for (const [conv, list] of by) {
      const readAt = await this.getReadAt(conv);
      let last = list[0], first = list[0].at, unread = 0, hasReceived = false, hasMine = false;
      for (const r of list) {
        if (r.at > last.at) last = r;
        if (r.at < first) first = r.at;
        if (r.mine) hasMine = true;
        else { hasReceived = true; if (r.at > readAt) unread++; }
      }
      out[conv] = { lastBody: dec.decode(await this.open(last.body)), lastMine: last.mine, lastAt: last.at, lastStatus: last.status, firstAt: first, unread, hasReceived, hasMine };
    }
    return out;
  }

  async getNote(id: string): Promise<StoredNote | undefined> {
    const r = (await req(this.db.transaction("notes").objectStore("notes").get(id))) as NoteRow | undefined;
    return r ? { text: dec.decode(await this.open(r.body)), updatedAt: r.updatedAt, dirty: r.dirty === 1, syncedNonce: r.syncedNonce } : undefined;
  }

  async putNote(id: string, text: string, opts: { synced?: string | null } = {}) {
    const body = await this.seal(enc.encode(text));
    const tx = this.db.transaction("notes", "readwrite");
    const st = tx.objectStore("notes");
    const prev = (await req(st.get(id))) as NoteRow | undefined;
    const fromServer = opts.synced !== undefined;
    st.put({
      id, body,
      updatedAt: fromServer ? prev?.updatedAt ?? Date.now() : Date.now(),
      dirty: fromServer ? 0 : 1,
      syncedNonce: fromServer ? opts.synced ?? null : prev?.syncedNonce ?? null,
    } satisfies NoteRow);
    await done(tx);
  }

  async markNoteSynced(id: string, updatedAt: number, nonce: string | null) {
    const tx = this.db.transaction("notes", "readwrite");
    const st = tx.objectStore("notes");
    const r = (await req(st.get(id))) as NoteRow | undefined;
    if (r && r.updatedAt === updatedAt) { r.dirty = 0; r.syncedNonce = nonce; st.put(r); }
    await done(tx);
  }

  async dirtyNotes(): Promise<string[]> {
    const keys = await req(this.db.transaction("notes").objectStore("notes").index("byDirty").getAllKeys(1));
    return keys.map(String);
  }

  async conversationIds(): Promise<string[]> {
    const rows = (await req(this.msgs().objectStore("messages").getAll())) as Row[];
    return [...new Set(rows.map((r) => r.conversationId))];
  }

  close() { this.db.close(); }
  // Used when someone signs out on a shared device
  async destroy() { this.db.close(); await req(indexedDB.deleteDatabase(this.name)); }
}
