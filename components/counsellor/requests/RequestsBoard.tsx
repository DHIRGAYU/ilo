"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Clock, HeartHandshake, Lock, ShieldCheck, User } from "lucide-react";
import { E2EEGate } from "@/components/e2ee/E2EEGate";
import { useE2EE } from "@/components/e2ee/E2EEProvider";
import type { RequestRow, Requests } from "@/lib/counsellor-requests";
import { ago } from "@/lib/counsellor-day";
import {
  ACCEPT_MESSAGE, REFER_OUTSIDE_MESSAGE, URGENCY, aboutLine, parsePayload, referColleagueMessage, requestError, type RequestPayload, type Urgency,
} from "@/lib/requests-shared";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "./Modal";

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ilo-plum";
const primary = `inline-flex items-center gap-1.5 rounded-full bg-ilo-plum px-4 py-2 text-xs font-bold text-white disabled:opacity-40 ${focus}`;
const secondary = `inline-flex items-center gap-1.5 rounded-full border border-ilo-plum/25 bg-white px-4 py-2 text-xs font-semibold text-ilo-plum disabled:opacity-40 ${focus}`;
type Opened = RequestPayload | "locked";
type Filter = "new" | "all" | "accepted" | "referred";
const FILTERS: { id: Filter; label: string }[] = [{ id: "new", label: "Awaiting triage" }, { id: "all", label: "All requests" }, { id: "accepted", label: "Accepted" }, { id: "referred", label: "Referred" }];
const STATUS_LABEL = { new: "Awaiting", accepted: "Accepted", referred: "Referred", closed: "Closed" } as const;

export function RequestsBoard({ data }: { data: Requests }) {
  return (
    <E2EEGate audience="counsellor">
      <Board data={data} />
    </E2EEGate>
  );
}

type Action = { kind: "read" | "accept" | "refer"; row: RequestRow } | null;

function Board({ data }: { data: Requests }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { client } = useE2EE();
  const [opened, setOpened] = useState<Record<string, Opened>>({});
  const [filter, setFilter] = useState<Filter>("new");
  const [menu, setMenu] = useState(false);
  const [action, setAction] = useState<Action>(null);
  const [now, setNow] = useState(data.nowMs);
  const cache = useRef(new Map<string, Opened>());

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);

  // Open each request on this device. Anything that can't be opened is shown as locked, never guessed at.
  useEffect(() => {
    if (!client) return;
    let live = true;
    (async () => {
      for (const r of data.rows) {
        if (cache.current.has(r.id)) continue;
        try { cache.current.set(r.id, parsePayload(await client.openFrom(r.id, r.ciphertext, r.nonce, r.senderKey)) ?? "locked"); }
        catch { cache.current.set(r.id, "locked"); }
      }
      if (live) setOpened(Object.fromEntries(cache.current));
    })();
    return () => { live = false; };
  }, [client, data.rows]);

  // A new request appears without a refresh
  useEffect(() => {
    const ch = supabase.channel(`requests-${data.meId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_requests", filter: `counsellor_id=eq.${data.meId}` }, () => router.refresh())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [supabase, router, data.meId]);

  const waiting = data.rows.filter((r) => r.status === "new").length;
  const shown = data.rows.filter((r) => (filter === "all" ? true : r.status === filter));
  const columns = (["urgent", "moderate", "routine"] as Urgency[]).map((u) => ({
    u,
    items: shown.filter((r) => { const o = opened[r.id]; return o && o !== "locked" ? o.urgency === u : u === "routine"; }),
  }));

  async function say(convId: string, text: string) {
    if (client && text.trim()) await client.send(convId, text.trim()).catch(() => {});
  }

  async function accept(row: RequestRow, text: string, next: "inbox" | "book") {
    const { error } = await supabase.rpc("update_support_request_status", { p_request_id: row.id, p_status: "accepted" });
    if (error) throw new Error(error.message);
    await say(row.convId, text);
    router.push(next === "book" ? `/counsellor/schedule?book=${row.studentId}` : `/counsellor/inbox?c=${row.convId}`);
    router.refresh();
  }

  async function referColleague(row: RequestRow, payload: RequestPayload, toId: string, name: string, text: string) {
    if (!client) throw new Error("not_ready");
    const key = ((await supabase.rpc("get_counsellor_public_key", { p_counsellor_id: toId })).data as { public_key: string; key_version: number }[] | null)?.[0];
    if (!key) throw new Error("recipient_no_key");
    const newId = crypto.randomUUID();
    const sealed = await client.sealFor(newId, JSON.stringify(payload), key.public_key);
    const { error } = await supabase.rpc("refer_support_request", {
      p_request_id: row.id, p_to_counsellor_id: toId, p_new_request_id: newId, p_ciphertext: sealed.ciphertext, p_nonce: sealed.nonce, p_recipient_key_version: key.key_version,
    });
    if (error) throw new Error(error.message);
    await say(row.convId, text || referColleagueMessage(name));
    setAction(null);
    router.refresh();
  }

  async function referOutside(row: RequestRow, text: string) {
    const { error } = await supabase.rpc("update_support_request_status", { p_request_id: row.id, p_status: "referred" });
    if (error) throw new Error(error.message);
    await say(row.convId, text);
    setAction(null);
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 lg:px-8">
      {!data.ready && <p role="status" className="mb-4 rounded-xl bg-ilo-deep px-4 py-2.5 text-xs text-white">Requests need the 0017_support_requests.sql database update.</p>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ilo-ink/60">Intake · private to you</p>
          <h1 className="mt-1 font-display text-3xl leading-tight text-ilo-deep lg:text-4xl">A thoughtful first response.</h1>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-ilo-ink/70">Each request is a small invitation to listen. Review what the student chose to share, then decide what support fits.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-ilo-plum/15 bg-white px-3.5 py-2 text-xs font-semibold text-ilo-deep"><HeartHandshake className="h-3.5 w-3.5 text-ilo-plum" aria-hidden="true" /> {waiting} awaiting triage</span>
          <div className="relative">
            <button type="button" aria-haspopup="listbox" aria-expanded={menu} onClick={() => setMenu((v) => !v)} className={`flex items-center gap-1.5 rounded-full border border-ilo-plum/15 bg-white px-3.5 py-2 text-xs font-semibold text-ilo-deep ${focus}`}>
              {FILTERS.find((f) => f.id === filter)?.label} <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} aria-hidden="true" />
                <ul role="listbox" className="absolute right-0 top-11 z-20 w-48 rounded-2xl border border-ilo-plum/10 bg-white p-1.5 shadow-xl">
                  {FILTERS.map((f) => (
                    <li key={f.id} role="option" aria-selected={filter === f.id}>
                      <button type="button" onClick={() => { setFilter(f.id); setMenu(false); }} className={`w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-ilo-blush/60 ${focus} ${filter === f.id ? "font-bold text-ilo-plum" : "text-ilo-ink"}`}>{f.label}</button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-ilo-plum/10 bg-white px-4 py-2.5 text-[11px] text-ilo-ink/80">
        <span className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Private to your counsellor account. Campus administrators never see request details or case content.</span>
        <ShieldCheck className="hidden h-4 w-4 shrink-0 text-ilo-plum sm:block" aria-hidden="true" />
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-3 md:items-start">
        {columns.map(({ u, items }) => (
          <section key={u} aria-labelledby={`col-${u}`} className="rounded-2xl border border-ilo-plum/10 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-3 p-4">
              <div className="flex items-start gap-2">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${URGENCY[u].dot}`} aria-hidden="true" />
                <div><h2 id={`col-${u}`} className="font-display text-lg leading-tight text-ilo-deep">{URGENCY[u].title}</h2><p className="text-[11px] text-ilo-ink/60">{URGENCY[u].sub}</p></div>
              </div>
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full border border-ilo-plum/15 px-1.5 text-[11px] font-bold text-ilo-plum" aria-label={`${items.length} requests`}>{items.length}</span>
            </div>
            <ul className="space-y-3 border-t border-ilo-plum/10 p-3">
              {items.length === 0 && <li className="px-2 py-6 text-center text-xs text-ilo-ink/60">Nothing here right now.</li>}
              {items.map((r) => {
                const o = opened[r.id];
                const p = o && o !== "locked" ? o : null;
                return (
                  <li key={r.id}>
                    <article className="rounded-2xl border border-ilo-plum/10 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-ilo-deep"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ilo-blush text-ilo-plum" aria-hidden="true"><User className="h-3 w-3" /></span><span className="truncate">{r.label}</span></span>
                        <span className="flex shrink-0 items-center gap-1 text-[10px] text-ilo-ink/60"><Clock className="h-3 w-3" aria-hidden="true" /> {ago(r.createdMs, now)}</span>
                      </div>
                      <h3 className="mt-3 font-display text-lg leading-snug text-ilo-deep">{p ? p.topic : o === "locked" ? "Couldn't open this request" : "Opening…"}</h3>
                      {p && aboutLine(p) && <p className="mt-0.5 text-[11px] text-ilo-ink/60">{aboutLine(p)}.</p>}
                      {o === "locked" && <p className="mt-0.5 text-[11px] text-ilo-ink/60">It was locked with a key this device doesn&apos;t have.</p>}
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-ilo-plum/10 pt-3">
                        <button type="button" disabled={!p} onClick={() => setAction({ kind: "read", row: r })} className={`text-[11px] font-bold text-ilo-plum disabled:opacity-40 ${focus}`}>Read intake →</button>
                        {r.status === "new" ? (
                          <div className="flex gap-1.5">
                            <button type="button" disabled={!p} onClick={() => setAction({ kind: "refer", row: r })} className={secondary}>Refer</button>
                            <button type="button" disabled={!p} onClick={() => setAction({ kind: "accept", row: r })} className={primary}>Accept</button>
                          </div>
                        ) : <span className="rounded-full bg-ilo-blush px-2.5 py-1 text-[10px] font-bold text-ilo-plum">{STATUS_LABEL[r.status]}</span>}
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {action && opened[action.row.id] && opened[action.row.id] !== "locked" && (
        <RequestDialog
          kind={action.kind} row={action.row} payload={opened[action.row.id] as RequestPayload} now={now} colleagues={data.colleagues} college={data.college}
          onClose={() => setAction(null)} onSwitch={(kind) => setAction({ kind, row: action.row })}
          onAccept={accept} onReferColleague={referColleague} onReferOutside={referOutside}
        />
      )}
    </main>
  );
}

type DialogProps = {
  kind: "read" | "accept" | "refer"; row: RequestRow; payload: RequestPayload; now: number; colleagues: Requests["colleagues"]; college: string;
  onClose: () => void; onSwitch: (k: "accept" | "refer") => void;
  onAccept: (row: RequestRow, text: string, next: "inbox" | "book") => Promise<void>;
  onReferColleague: (row: RequestRow, payload: RequestPayload, toId: string, name: string, text: string) => Promise<void>;
  onReferOutside: (row: RequestRow, text: string) => Promise<void>;
};

function RequestDialog({ kind, row, payload, now, colleagues, college, onClose, onSwitch, onAccept, onReferColleague, onReferOutside }: DialogProps) {
  const [text, setText] = useState(ACCEPT_MESSAGE);
  const [to, setTo] = useState<"colleague" | "outside">(colleagues.length ? "colleague" : "outside");
  const [colleagueId, setColleagueId] = useState(colleagues[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colleagueName = colleagues.find((c) => c.id === colleagueId)?.name ?? "";
  const messageFor = to === "colleague" ? referColleagueMessage(colleagueName || "a colleague") : REFER_OUTSIDE_MESSAGE;
  const [referText, setReferText] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError(null);
    try { await fn(); } catch (e) { setError(requestError(e instanceof Error ? e.message : "")); setBusy(false); }
  }

  if (kind === "read") {
    return (
      <Modal title={row.label} onClose={onClose}>
        <p className="mt-1 text-xs text-ilo-ink/70">{ago(row.createdMs, now)} · {URGENCY[payload.urgency].student}</p>
        <h3 className="mt-4 font-display text-xl text-ilo-deep">{payload.topic}</h3>
        {aboutLine(payload) && <p className="text-[11px] text-ilo-ink/60">{aboutLine(payload)}.</p>}
        <div className="mt-4 rounded-xl bg-ilo-bg p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ilo-ink/60">In their words</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-ilo-ink">{payload.note ?? "They didn't add a note."}</p>
        </div>
        {row.status === "new" ? (
          <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => onSwitch("refer")} className={secondary}>Refer</button><button type="button" onClick={() => onSwitch("accept")} className={primary}>Accept</button></div>
        ) : <p className="mt-5 text-xs font-semibold text-ilo-plum">{STATUS_LABEL[row.status]}</p>}
      </Modal>
    );
  }

  if (kind === "accept") {
    return (
      <Modal title={`Accept ${row.label}'s request`} onClose={onClose}>
        <p className="mt-2 text-xs leading-relaxed text-ilo-ink">This opens a private conversation. Your first message is sent to them locked, and you can change it first.</p>
        <label htmlFor="acc-msg" className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-ilo-ink/70">Your first message</label>
        <textarea id="acc-msg" value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={1500} className={`mt-1 w-full resize-y rounded-xl border border-ilo-plum/20 px-3 py-2.5 text-xs leading-relaxed text-ilo-deep ${focus}`} />
        {error && <p role="alert" className="mt-3 text-xs font-semibold text-ilo-crisis">{error}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className={secondary}>Cancel</button>
          <button type="button" disabled={busy} onClick={() => run(() => onAccept(row, text, "book"))} className={secondary}>Accept and book a time</button>
          <button type="button" disabled={busy} onClick={() => run(() => onAccept(row, text, "inbox"))} className={primary}>{busy ? "Sending…" : "Accept and message"}</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Refer ${row.label}'s request`} onClose={onClose}>
      <fieldset className="mt-3">
        <legend className="text-[11px] font-bold uppercase tracking-wider text-ilo-ink/70">Who could help better?</legend>
        <div className="mt-2 space-y-2">
          <label className={`flex items-start gap-3 rounded-xl border p-3 ${colleagues.length ? "cursor-pointer" : "opacity-50"} ${to === "colleague" ? "border-ilo-plum bg-ilo-blush/60" : "border-ilo-plum/15"}`}>
            <input type="radio" name="to" checked={to === "colleague"} disabled={!colleagues.length} onChange={() => { setTo("colleague"); setReferText(null); }} className="mt-0.5 h-4 w-4 accent-[#6b2a67]" />
            <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-ilo-deep">Another counsellor at {college}</span>
              <span className="block text-[11px] text-ilo-ink/70">{colleagues.length ? "Their copy is locked for them. They'll see what the student shared." : "There are no other counsellors at your college yet."}</span>
              {to === "colleague" && colleagues.length > 0 && (
                <select aria-label="Counsellor" value={colleagueId} onChange={(e) => { setColleagueId(e.target.value); setReferText(null); }} className={`mt-2 w-full rounded-lg border border-ilo-plum/20 bg-white px-2 py-2 text-xs ${focus}`}>
                  {colleagues.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </span>
          </label>
          <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${to === "outside" ? "border-ilo-plum bg-ilo-blush/60" : "border-ilo-plum/15"}`}>
            <input type="radio" name="to" checked={to === "outside"} onChange={() => { setTo("outside"); setReferText(null); }} className="mt-0.5 h-4 w-4 accent-[#6b2a67]" />
            <span><span className="block text-xs font-bold text-ilo-deep">Outside support</span><span className="block text-[11px] text-ilo-ink/70">Share Tele-MANAS and suggest specialised help.</span></span>
          </label>
        </div>
      </fieldset>
      <label htmlFor="ref-msg" className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-ilo-ink/70">Your message to the student</label>
      <textarea id="ref-msg" value={referText ?? messageFor} onChange={(e) => setReferText(e.target.value)} rows={5} maxLength={1500} className={`mt-1 w-full resize-y rounded-xl border border-ilo-plum/20 px-3 py-2.5 text-xs leading-relaxed text-ilo-deep ${focus}`} />
      {error && <p role="alert" className="mt-3 text-xs font-semibold text-ilo-crisis">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={secondary}>Cancel</button>
        <button type="button" disabled={busy || (to === "colleague" && !colleagueId)} onClick={() => run(() => (to === "colleague" ? onReferColleague(row, payload, colleagueId, colleagueName, referText ?? messageFor) : onReferOutside(row, referText ?? messageFor)))} className={primary}>{busy ? "Sending…" : "Refer and send"}</button>
      </div>
    </Modal>
  );
}
