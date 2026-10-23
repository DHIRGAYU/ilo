"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarPlus, CheckCircle2, Lock, MessageCircle, UserX } from "lucide-react";
import { JoinSessionButton } from "@/components/call/JoinSessionButton";
import { useE2EE } from "@/components/e2ee/E2EEProvider";
import type { SessionData } from "@/lib/counsellor-schedule";
import { createClient } from "@/lib/supabase/client";
import { MODE_META, dateTimeOf, fullWhen, scheduleError, timeOf, type Outcome } from "@/lib/schedule-shared";

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ilo-plum";
const card = "rounded-2xl border border-ilo-plum/10 bg-white p-5 shadow-sm";
const eyebrow = "text-[10px] font-bold uppercase tracking-wider text-ilo-ink/60";
const btn = `inline-flex items-center gap-1.5 rounded-full border border-ilo-plum/25 bg-white px-4 py-2.5 text-xs font-semibold text-ilo-plum ${focus}`;

const statusText = (status: string, outcome: Outcome | null) =>
  outcome === "no_show" ? "No-show" : outcome === "held" || status === "completed" ? "Completed" : status === "cancelled" ? "Cancelled" : "Booked";

// A private note, locked on this device before it is sent. The server only ever holds scrambled text.
function NoteEditor({ appointmentId, sealed, disabled }: { appointmentId: string; sealed: SessionData["note"]; disabled: boolean }) {
  const { state, client } = useE2EE();
  const supabase = useMemo(() => createClient(), []);
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(!sealed);
  const [broken, setBroken] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const latest = useRef("");
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!sealed || !client || state !== "ready") return;
    let live = true;
    client.openText(sealed).then((t) => { if (live) { setText(t); latest.current = t; setLoaded(true); } }).catch(() => { if (live) setBroken(true); });
    return () => { live = false; };
  }, [sealed, client, state]);

  const save = useCallback(async () => {
    if (!client || !dirty.current) return;
    dirty.current = false;
    setStatus("saving");
    const value = latest.current;
    const args = value.trim()
      ? await client.sealText(value).then((s) => ({ p_note_ciphertext: s.ciphertext, p_note_nonce: s.nonce, p_clear_note: false }))
      : { p_clear_note: true };
    const { error } = await supabase.rpc("save_session_record", { p_appointment_id: appointmentId, ...args });
    if (error) dirty.current = true;
    setStatus(error ? "error" : "saved");
  }, [client, supabase, appointmentId]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); if (dirty.current) void save(); }, [save]);

  if (state === "loading") return <p className="mt-3 text-xs text-ilo-ink/70" role="status">Opening your secure notes…</p>;
  if (state !== "ready") {
    return (
      <p className="mt-3 rounded-xl bg-ilo-bg p-3 text-xs leading-relaxed text-ilo-ink">
        Session notes are locked on your device. <Link href="/counsellor/inbox" className="font-bold text-ilo-plum underline">Turn on secure messaging</Link> to write them.
      </p>
    );
  }
  if (broken) return <p role="alert" className="mt-3 text-xs font-semibold text-ilo-crisis">This note couldn&apos;t be opened on this device. It was locked with a different key.</p>;

  return (
    <div className="mt-3">
      <label htmlFor="session-note" className="sr-only">Private notes for this session</label>
      <textarea
        id="session-note" value={text} rows={9} maxLength={4000} disabled={disabled || !loaded}
        placeholder="What came up, what helped, what to hold gently next time…"
        onChange={(e) => {
          setText(e.target.value); latest.current = e.target.value; dirty.current = true; setStatus("idle");
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => void save(), 1000);
        }}
        className={`w-full resize-y rounded-xl border border-ilo-plum/15 bg-ilo-bg px-3 py-3 text-xs leading-relaxed text-ilo-ink placeholder:text-ilo-ink/50 disabled:opacity-60 ${focus}`}
      />
      <p className="mt-1 flex h-4 items-center justify-between text-[10px] text-ilo-ink/60" aria-live="polite">
        <span>{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Couldn't save. Will retry when you type again." : ""}</span>
        <span>{text.length}/4000</span>
      </p>
    </div>
  );
}

export function SessionWorkspace({ data }: { data: SessionData }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { appt, history, conversationId, recordsReady } = data;
  const [now, setNow] = useState(data.nowMs);
  const [outcome, setOutcome] = useState<Outcome | null>(appt.outcome);
  const [followUp, setFollowUp] = useState(appt.followUp);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  const started = now >= appt.startMs;
  const cancelled = appt.status === "cancelled";
  const upcoming = appt.status === "confirmed" && !started;
  const meta = MODE_META[appt.mode];

  async function record(args: { p_outcome?: Outcome; p_follow_up?: boolean }) {
    setBusy(true); setError(null);
    const { error: e } = await supabase.rpc("save_session_record", { p_appointment_id: appt.id, ...args });
    setBusy(false);
    if (e) { setError(scheduleError(e.message)); return false; }
    router.refresh(); // keeps the dashboard's follow-up count in step
    return true;
  }
  const markOutcome = async (o: Outcome) => { if (await record({ p_outcome: o })) setOutcome(o); };
  const toggleFollowUp = async (v: boolean) => { setFollowUp(v); if (!(await record({ p_follow_up: v }))) setFollowUp(!v); };

  async function cancel() {
    setBusy(true); setError(null);
    const { error: e } = await supabase.rpc("counsellor_cancel_appointment", { p_appointment_id: appt.id });
    setBusy(false);
    if (e) { setError(scheduleError(e.message)); return; }
    router.push("/counsellor/schedule");
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 lg:px-8">
      <Link href="/counsellor/schedule" className={`inline-flex items-center gap-1.5 text-xs font-semibold text-ilo-plum ${focus}`}><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Schedule</Link>

      <header className="mt-3">
        <p className={eyebrow}>Session · {appt.kind}</p>
        <h1 className="mt-1 break-words font-display text-3xl leading-tight text-ilo-deep lg:text-4xl">{appt.studentLabel}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ilo-ink/80">
          <span>{fullWhen(appt.startMs)} – {timeOf(appt.endMs)}</span>
          <span className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden="true" />{meta.long}</span>
          <span className="rounded-full bg-ilo-blush px-2.5 py-0.5 text-[10px] font-bold text-ilo-plum">{statusText(appt.status, outcome)}</span>
        </p>
      </header>

      {!recordsReady && <p role="status" className="mt-4 rounded-xl bg-ilo-deep px-4 py-2.5 text-xs text-white">Notes and outcomes need the 0016_counsellor_scheduling.sql database update.</p>}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="min-w-0 space-y-5">
          <section className={card} aria-label="Actions">
            <div className="flex flex-wrap items-center gap-2">
              {appt.status === "confirmed" && appt.mode !== "in_person" && (
                <JoinSessionButton appointmentId={appt.id} kind={appt.mode === "video" ? "video" : "audio"} startsAtMs={appt.startMs} endsAtMs={appt.endMs} />
              )}
              {conversationId && <Link href={`/counsellor/inbox?c=${conversationId}`} className={btn}><MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> Message</Link>}
              <Link href={`/counsellor/schedule?book=${appt.studentId}`} className={btn}><CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" /> Book a follow-up</Link>
              {upcoming && <Link href={`/counsellor/schedule?resched=${appt.id}`} className={btn}>Reschedule</Link>}
              {upcoming && !confirming && <button type="button" onClick={() => setConfirming(true)} className={`rounded-full border border-ilo-crisis/30 bg-white px-4 py-2.5 text-xs font-semibold text-ilo-crisis ${focus}`}>Cancel session</button>}
            </div>
            {confirming && (
              <div className="mt-4 rounded-xl border border-ilo-crisis/30 bg-ilo-crisis/5 p-3">
                <p className="text-xs text-ilo-deep">Cancel this session? {appt.studentLabel} will see it as cancelled.</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={cancel} disabled={busy} className={`rounded-full bg-ilo-crisis px-4 py-2 text-xs font-bold text-white disabled:opacity-40 ${focus}`}>{busy ? "Cancelling…" : "Yes, cancel it"}</button>
                  <button type="button" onClick={() => setConfirming(false)} className={btn}>Keep it</button>
                </div>
              </div>
            )}
            {error && <p role="alert" className="mt-3 text-xs font-semibold text-ilo-crisis">{error}</p>}
          </section>

          {appt.studentNote && (
            <section className={card} aria-labelledby="shared-title">
              <h2 id="shared-title" className="font-display text-lg text-ilo-deep">What they shared when booking</h2>
              <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-ilo-ink">{appt.studentNote}</p>
            </section>
          )}

          <section className={card} aria-labelledby="notes-title">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="notes-title" className="font-display text-lg text-ilo-deep">Private session notes</h2>
              <span className="flex shrink-0 items-center gap-1 text-[10px] text-ilo-ink/60"><Lock className="h-3 w-3" aria-hidden="true" /> Only you can read these</span>
            </div>
            <p className="mt-1 text-[11px] text-ilo-ink/70">Locked on your device before they are saved. Not even Ilo or your college can read them.</p>
            <NoteEditor appointmentId={appt.id} sealed={data.note} disabled={!recordsReady || cancelled} />
          </section>

          <section className={card} aria-labelledby="outcome-title">
            <h2 id="outcome-title" className="font-display text-lg text-ilo-deep">How did it go?</h2>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Session outcome">
              <button type="button" aria-pressed={outcome === "held"} disabled={busy || !started || cancelled || !recordsReady} onClick={() => markOutcome("held")}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-xs font-semibold disabled:opacity-40 ${focus} ${outcome === "held" ? "border-ilo-plum bg-ilo-plum text-white" : "border-ilo-plum/25 text-ilo-plum"}`}>
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Session held
              </button>
              <button type="button" aria-pressed={outcome === "no_show"} disabled={busy || !started || cancelled || !recordsReady} onClick={() => markOutcome("no_show")}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-xs font-semibold disabled:opacity-40 ${focus} ${outcome === "no_show" ? "border-ilo-plum bg-ilo-plum text-white" : "border-ilo-plum/25 text-ilo-plum"}`}>
                <UserX className="h-3.5 w-3.5" aria-hidden="true" /> No-show
              </button>
            </div>
            {!started && !cancelled && <p className="mt-2 text-[11px] text-ilo-ink/60">You can record the outcome once the session has started.</p>}
            <label className="mt-4 flex items-start gap-2 text-xs text-ilo-ink">
              <input type="checkbox" checked={followUp} disabled={busy || !recordsReady || cancelled} onChange={(e) => void toggleFollowUp(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#6b2a67]" />
              <span><strong className="text-ilo-deep">A follow-up is needed.</strong> It shows in &ldquo;Follow-ups due&rdquo; on your dashboard until you book the next session.</span>
            </label>
          </section>
        </div>

        <aside className="min-w-0 space-y-5" aria-label="Student">
          <section className={card}>
            <h2 className={eyebrow}>Student</h2>
            <p className="mt-2 break-words font-display text-lg text-ilo-deep">{appt.studentLabel}</p>
            <p className="mt-1 text-[11px] text-ilo-ink/70">{history.length === 0 ? "This is your first session together." : `${history.length} other ${history.length === 1 ? "session" : "sessions"} with you.`}</p>
          </section>
          <section className={card} aria-labelledby="hist-title">
            <h2 id="hist-title" className={eyebrow}>Other sessions</h2>
            {history.length === 0 ? <p className="mt-2 text-xs text-ilo-ink/70">Nothing else yet.</p> : (
              <ul className="mt-2 divide-y divide-ilo-plum/10">
                {history.slice(0, 8).map((h) => (
                  <li key={h.id}>
                    <Link href={`/counsellor/schedule/${h.id}`} className={`flex items-center justify-between gap-3 py-2.5 text-xs ${focus}`}>
                      <span className="min-w-0"><span className="block font-semibold text-ilo-deep">{dateTimeOf(h.startMs)}</span><span className="block text-[11px] text-ilo-ink/70">{MODE_META[h.mode].label}</span></span>
                      <span className="shrink-0 rounded-full bg-ilo-blush px-2 py-0.5 text-[10px] font-semibold text-ilo-plum">{statusText(h.status, h.outcome)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
