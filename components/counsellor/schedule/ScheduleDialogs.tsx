"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { JoinSessionButton } from "@/components/call/JoinSessionButton";
import { createClient } from "@/lib/supabase/client";
import {
  DAY_MS, MODE_META, WEEKDAYS, freeSlots, fullWhen, isoWeekday, istDayStart, scheduleError, timeOf, toMin, dayNum, weekdayShort,
  type Availability, type CalAppt, type Mode, type StudentOption, type Window,
} from "@/lib/schedule-shared";

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ilo-plum";
const primary = `rounded-full bg-ilo-plum px-5 py-2.5 text-xs font-bold text-white disabled:opacity-40 ${focus}`;
const secondary = `rounded-full border border-ilo-plum/25 bg-white px-4 py-2.5 text-xs font-semibold text-ilo-plum ${focus}`;

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ilo-deep/40" onClick={onClose} aria-hidden="true" />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl focus:outline-none sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-xl text-ilo-deep">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className={`-mr-2 -mt-1 rounded-full p-2 text-ilo-ink ${focus}`}><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------- Book a session / reschedule ----------

type BookProps = {
  kind: "book" | "reschedule";
  students: StudentOption[];
  appts: CalAppt[];
  availability: Availability;
  nowMs: number;
  initialStudentId?: string | null;
  reschedule?: CalAppt;
  onClose: () => void;
  onDone: (message: string) => void;
};

export function BookDialog({ kind, students, appts, availability, nowMs, initialStudentId, reschedule, onClose, onDone }: BookProps) {
  const supabase = useMemo(() => createClient(), []);
  const [studentId, setStudentId] = useState(initialStudentId ?? reschedule?.studentId ?? "");
  const [mode, setMode] = useState<Mode>(reschedule?.mode ?? "in_person");
  const [slot, setSlot] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = istDayStart(nowMs);
  const taken = useMemo(() => new Set(appts.map((a) => a.startMs)), [appts]);
  const days = useMemo(() => Array.from({ length: 15 }, (_, i) => today + i * DAY_MS).map((d) => ({ d, slots: freeSlots(d, availability[isoWeekday(d)] ?? [], taken, nowMs) })), [today, availability, taken, nowMs]);
  const firstOpen = days.findIndex((x) => x.slots.length > 0);
  const [dayIdx, setDayIdx] = useState(firstOpen < 0 ? 0 : firstOpen);
  const open = days[dayIdx]?.slots ?? [];

  async function confirm() {
    if (slot === null || (kind === "book" && !studentId)) return;
    setBusy(true); setError(null);
    const startsAt = new Date(slot).toISOString();
    const { error: e } = kind === "book"
      ? await supabase.rpc("counsellor_book_appointment", { p_student_id: studentId, p_starts_at: startsAt, p_mode: mode })
      : await supabase.rpc("counsellor_reschedule_appointment", { p_appointment_id: reschedule!.id, p_starts_at: startsAt });
    setBusy(false);
    if (e) { setError(scheduleError(e.message)); return; }
    onDone(kind === "book" ? "Session booked. The student will see it in their sessions." : "Session moved. The student will see the new time.");
  }

  return (
    <Modal title={kind === "book" ? "Book a session" : "Move this session"} onClose={onClose}>
      {kind === "reschedule" && reschedule && (
        <p className="mt-2 text-xs text-ilo-ink">{reschedule.studentLabel} · now {fullWhen(reschedule.startMs)}</p>
      )}
      {kind === "book" && (
        <>
          <label htmlFor="bk-student" className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-ilo-ink/70">Student</label>
          <select id="bk-student" value={studentId} onChange={(e) => setStudentId(e.target.value)} className={`mt-1 w-full rounded-xl border border-ilo-plum/20 bg-white px-3 py-2.5 text-xs text-ilo-deep ${focus}`}>
            <option value="">Choose a student</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          {students.length === 0 && <p className="mt-1 text-[11px] text-ilo-ink/70">You can book for students who have written to you or booked with you.</p>}

          <fieldset className="mt-4">
            <legend className="text-[11px] font-bold uppercase tracking-wider text-ilo-ink/70">How will you meet?</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {(Object.keys(MODE_META) as Mode[]).map((m) => (
                <label key={m} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ilo-plum ${mode === m ? "border-ilo-plum bg-ilo-plum text-white" : "border-ilo-plum/25 text-ilo-plum"}`}>
                  <input type="radio" name="bk-mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="sr-only" />
                  {MODE_META[m].long}
                </label>
              ))}
            </div>
          </fieldset>
        </>
      )}

      <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-ilo-ink/70">Pick a day</p>
      <div className="mt-1 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Day">
        {days.map(({ d, slots }, i) => (
          <button key={d} type="button" disabled={slots.length === 0} onClick={() => { setDayIdx(i); setSlot(null); }} aria-pressed={dayIdx === i}
            className={`flex w-14 shrink-0 flex-col items-center rounded-xl border py-1.5 text-[10px] font-semibold disabled:opacity-35 ${focus} ${dayIdx === i ? "border-ilo-plum bg-ilo-plum text-white" : "border-ilo-plum/20 text-ilo-plum"}`}>
            <span>{weekdayShort(d)}</span><span className="font-display text-base leading-tight">{dayNum(d)}</span>
          </button>
        ))}
      </div>

      <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-ilo-ink/70">Pick a time</p>
      {open.length === 0 ? (
        <p className="mt-1 text-xs text-ilo-ink/70">No open times in the next 14 days. Add working hours in the availability panel.</p>
      ) : (
        <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label="Time">
          {open.map((ms) => (
            <button key={ms} type="button" onClick={() => setSlot(ms)} aria-pressed={slot === ms} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${focus} ${slot === ms ? "border-ilo-plum bg-ilo-plum text-white" : "border-ilo-plum/25 text-ilo-plum"}`}>{timeOf(ms)}</button>
          ))}
        </div>
      )}
      <p className="mt-2 text-[10px] text-ilo-ink/60">Sessions are 45 minutes. Times shown in IST.</p>

      {error && <p role="alert" className="mt-3 text-xs font-semibold text-ilo-crisis">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={secondary}>Cancel</button>
        <button type="button" onClick={confirm} disabled={busy || slot === null || (kind === "book" && !studentId)} className={primary}>{busy ? "Saving…" : kind === "book" ? "Book session" : "Move session"}</button>
      </div>
    </Modal>
  );
}

// ---------- Add a working-hours slot ----------

export function AddSlotDialog({ availability, onClose, onDone }: { availability: Availability; onClose: () => void; onDone: (message: string) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [days, setDays] = useState<number[]>([1]);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("13:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (days.length === 0) { setError("Choose at least one day."); return; }
    if (toMin(end) - toMin(start) < 45) { setError("A slot needs to be at least 45 minutes long."); return; }
    setBusy(true); setError(null);
    for (const wd of days) {
      const merged: Window[] = [...(availability[wd] ?? []), { start, end }].sort((a, b) => toMin(a.start) - toMin(b.start));
      const { error: e } = await supabase.rpc("set_my_availability", { p_weekday: wd, p_windows: merged });
      if (e) { setBusy(false); setError(`${WEEKDAYS[wd - 1]}: ${scheduleError(e.message)}`); return; }
    }
    setBusy(false);
    onDone("Working hours updated.");
  }

  return (
    <Modal title="Add a slot" onClose={onClose}>
      <p className="mt-2 text-xs leading-relaxed text-ilo-ink">Open more time on the days you choose. Students can book 45-minute sessions inside your working hours.</p>
      <fieldset className="mt-4">
        <legend className="text-[11px] font-bold uppercase tracking-wider text-ilo-ink/70">Days</legend>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {WEEKDAYS.map((name, i) => {
            const wd = i + 1, on = days.includes(wd);
            return (
              <label key={name} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ilo-plum ${on ? "border-ilo-plum bg-ilo-plum text-white" : "border-ilo-plum/25 text-ilo-plum"}`}>
                <input type="checkbox" checked={on} onChange={() => setDays((d) => (on ? d.filter((x) => x !== wd) : [...d, wd]))} className="sr-only" />
                {name.slice(0, 3)}
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="text-[11px] font-bold uppercase tracking-wider text-ilo-ink/70">From
          <input type="time" step={900} value={start} onChange={(e) => setStart(e.target.value)} className={`mt-1 w-full rounded-xl border border-ilo-plum/20 px-3 py-2 text-xs font-normal normal-case tracking-normal text-ilo-deep ${focus}`} />
        </label>
        <label className="text-[11px] font-bold uppercase tracking-wider text-ilo-ink/70">To
          <input type="time" step={900} value={end} onChange={(e) => setEnd(e.target.value)} className={`mt-1 w-full rounded-xl border border-ilo-plum/20 px-3 py-2 text-xs font-normal normal-case tracking-normal text-ilo-deep ${focus}`} />
        </label>
      </div>
      {error && <p role="alert" className="mt-3 text-xs font-semibold text-ilo-crisis">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={secondary}>Cancel</button>
        <button type="button" onClick={save} disabled={busy} className={primary}>{busy ? "Saving…" : "Add slot"}</button>
      </div>
    </Modal>
  );
}

// ---------- One session: details and actions ----------

export function AppointmentPanel({ appt, nowMs, onClose, onReschedule, onDone }: {
  appt: CalAppt; nowMs: number; onClose: () => void; onReschedule: (a: CalAppt) => void; onDone: (message: string) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upcoming = appt.status === "confirmed" && appt.startMs > nowMs;

  async function cancel() {
    setBusy(true); setError(null);
    const { error: e } = await supabase.rpc("counsellor_cancel_appointment", { p_appointment_id: appt.id });
    setBusy(false);
    if (e) { setError(scheduleError(e.message)); return; }
    onDone("Session cancelled. The student will see it as cancelled.");
  }

  return (
    <Modal title={appt.studentLabel} onClose={onClose}>
      <p className="mt-1 text-xs font-semibold text-ilo-plum">{appt.outcome === "no_show" ? "No-show" : appt.outcome === "held" || appt.status === "completed" ? "Completed" : appt.kind}</p>
      <dl className="mt-4 space-y-2 text-xs">
        <div className="flex justify-between gap-3"><dt className="text-ilo-ink/70">When</dt><dd className="text-right font-semibold text-ilo-deep">{fullWhen(appt.startMs)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-ilo-ink/70">How</dt><dd className="font-semibold text-ilo-deep">{MODE_META[appt.mode].long}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-ilo-ink/70">Length</dt><dd className="font-semibold text-ilo-deep">45 minutes</dd></div>
      </dl>
      {appt.studentNote && (
        <div className="mt-4 rounded-xl bg-ilo-bg p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ilo-ink/60">What they shared when booking</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-ilo-ink">{appt.studentNote}</p>
        </div>
      )}

      {appt.status === "confirmed" && appt.mode !== "in_person" && (
        <div className="mt-4"><JoinSessionButton appointmentId={appt.id} kind={appt.mode === "video" ? "video" : "audio"} startsAtMs={appt.startMs} endsAtMs={appt.endMs} /></div>
      )}
      {error && <p role="alert" className="mt-3 text-xs font-semibold text-ilo-crisis">{error}</p>}

      {confirming ? (
        <div className="mt-5 rounded-xl border border-ilo-crisis/30 bg-ilo-crisis/5 p-3">
          <p className="text-xs text-ilo-deep">Cancel this session? {appt.studentLabel} will see it as cancelled. You may want to send them a message too.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={cancel} disabled={busy} className={`rounded-full bg-ilo-crisis px-4 py-2 text-xs font-bold text-white disabled:opacity-40 ${focus}`}>{busy ? "Cancelling…" : "Yes, cancel it"}</button>
            <button type="button" onClick={() => setConfirming(false)} className={secondary}>Keep it</button>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={`/counsellor/schedule/${appt.id}`} className={primary}>Open session workspace</Link>
          {upcoming && <button type="button" onClick={() => onReschedule(appt)} className={secondary}>Reschedule</button>}
          {upcoming && <button type="button" onClick={() => setConfirming(true)} className={`rounded-full border border-ilo-crisis/30 bg-white px-4 py-2.5 text-xs font-semibold text-ilo-crisis ${focus}`}>Cancel session</button>}
        </div>
      )}
    </Modal>
  );
}

