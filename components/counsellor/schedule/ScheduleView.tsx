"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  DAY_MS, MODE_META, dayHeading, isoWeekday, istDayStart, minutesIST, monthLabel, monthStart, rangeOfWeek, scheduleError, toMin, weekStart,
  type Availability, type CalAppt, type Mode, type StudentOption, type Window,
} from "@/lib/schedule-shared";
import { AvailabilityPanel } from "./AvailabilityPanel";
import { MonthGrid, TimeGrid } from "./CalendarGrids";
import { AddSlotDialog, AppointmentPanel, BookDialog } from "./ScheduleDialogs";

type View = "day" | "week" | "month";
type Dialog = { type: "book"; studentId?: string | null } | { type: "reschedule"; appt: CalAppt } | { type: "slot" } | null;
const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ilo-plum";

function useMediaQuery(query: string) {
  const subscribe = useCallback((cb: () => void) => {
    const m = window.matchMedia(query);
    m.addEventListener("change", cb);
    return () => m.removeEventListener("change", cb);
  }, [query]);
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

type Props = {
  appts: CalAppt[];
  availability: Availability;
  room: string | null;
  students: StudentOption[];
  nowMs: number;
  recordsReady: boolean;
  openBook: string | null;       // ?book=<student id>: open the booking dialog for that student
  openReschedule: string | null; // ?resched=<appointment id>: open the reschedule dialog for that session
};

export function ScheduleView({ appts, availability, room, students, nowMs, recordsReady, openBook, openReschedule }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const wide = useMediaQuery("(min-width: 768px)");
  const [pickedView, setPickedView] = useState<View | null>(null);
  const view: View = pickedView ?? (wide ? "week" : "day");
  const [anchor, setAnchor] = useState(() => istDayStart(nowMs));
  const [avail, setAvail] = useState(availability);
  const [selected, setSelected] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(() => {
    if (openReschedule) { const a = appts.find((x) => x.id === openReschedule && x.status === "confirmed" && x.startMs > nowMs); if (a) return { type: "reschedule", appt: a }; }
    if (openBook && students.some((s) => s.id === openBook)) return { type: "book", studentId: openBook };
    return null;
  });
  const [flash, setFlash] = useState<string | null>(null);
  const [now, setNow] = useState(nowMs);

  useEffect(() => { setAvail(availability); }, [availability]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);
  const say = (m: string) => { setFlash(m); setTimeout(() => setFlash(null), 6000); };

  // The days on screen, and the hours the grid needs to cover them
  const days = useMemo(() => (view === "week" ? Array.from({ length: 7 }, (_, i) => weekStart(anchor) + i * DAY_MS) : [istDayStart(anchor)]), [view, anchor]);
  const { startMin, endMin } = useMemo(() => {
    let lo = Infinity, hi = -Infinity;
    for (const d of days) {
      for (const w of avail[isoWeekday(d)] ?? []) { lo = Math.min(lo, toMin(w.start)); hi = Math.max(hi, toMin(w.end)); }
      for (const a of appts) if (istDayStart(a.startMs) === d) { lo = Math.min(lo, minutesIST(a.startMs)); hi = Math.max(hi, minutesIST(a.endMs)); }
    }
    if (!Number.isFinite(lo)) { lo = 9 * 60; hi = 17 * 60; }
    return { startMin: Math.max(0, Math.floor(lo / 60) * 60), endMin: Math.min(24 * 60, Math.max(Math.ceil(hi / 60) * 60, Math.floor(lo / 60) * 60 + 240)) };
  }, [days, avail, appts]);

  const step = (dir: 1 | -1) => setAnchor((a) =>
    view === "week" ? a + dir * 7 * DAY_MS : view === "day" ? a + dir * DAY_MS
      : dir === 1 ? monthStart(monthStart(a) + 32 * DAY_MS) : monthStart(monthStart(a) - DAY_MS));
  const label = view === "week" ? rangeOfWeek(weekStart(anchor)) : view === "day" ? dayHeading(anchor) : monthLabel(anchor);

  // Working hours save straight away. Returns an error message, or null when saved.
  const saveHours = useCallback(async (weekday: number, windows: Window[]) => {
    const prev = avail;
    setAvail((a) => ({ ...a, [weekday]: windows }));
    const { error } = await supabase.rpc("set_my_availability", { p_weekday: weekday, p_windows: windows });
    if (error) { setAvail(prev); return scheduleError(error.message); }
    router.refresh();
    return null;
  }, [avail, supabase, router]);

  const done = (message: string) => { setDialog(null); setSelected(null); say(message); router.refresh(); };
  const current = appts.find((a) => a.id === selected) ?? null;
  const seg = (v: View, text: string) => (
    <button type="button" key={v} aria-pressed={view === v} onClick={() => setPickedView(v)} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${focus} ${view === v ? "bg-white text-ilo-plum shadow-sm" : "text-ilo-ink"}`}>{text}</button>
  );
  const iconBtn = `flex h-9 w-9 items-center justify-center rounded-full border border-ilo-plum/15 bg-white text-ilo-ink hover:bg-ilo-blush/50 ${focus}`;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 lg:px-8">
      {(flash || !recordsReady) && (
        <p role="status" className="fixed left-1/2 top-16 z-30 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-ilo-deep px-4 py-2.5 text-center text-xs text-white shadow-lg">
          {flash ?? "Session outcomes need the 0016_counsellor_scheduling.sql database update."}
        </p>
      )}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ilo-ink/60">Make room for what matters</p>
          <h1 className="mt-1 font-display text-3xl leading-tight text-ilo-deep lg:text-4xl">Your week, with room to breathe.</h1>
          <p className="mt-1 text-xs text-ilo-ink/70">Sessions and quiet time, held in one private place.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => setDialog({ type: "slot" })} className={`flex items-center gap-1.5 rounded-full border border-ilo-plum/25 bg-white px-4 py-2.5 text-xs font-bold text-ilo-plum ${focus}`}><Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add slot</button>
          <button type="button" onClick={() => setDialog({ type: "book" })} className={`flex items-center gap-1.5 rounded-full bg-ilo-plum px-4 py-2.5 text-xs font-bold text-white ${focus}`}><CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" /> Book a session</button>
        </div>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <section aria-label="Calendar" className="min-w-0 rounded-3xl border border-ilo-plum/10 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-ilo-plum/10 p-4">
            <button type="button" onClick={() => step(-1)} aria-label="Previous" className={iconBtn}><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={() => step(1)} aria-label="Next" className={iconBtn}><ChevronRight className="h-4 w-4" /></button>
            <h2 className="min-w-0 flex-1 text-sm font-semibold text-ilo-deep" aria-live="polite">{label}</h2>
            <button type="button" onClick={() => setAnchor(istDayStart(now))} className={`rounded-full border border-ilo-plum/15 px-3.5 py-1.5 text-xs font-semibold text-ilo-plum ${focus}`}>Today</button>
            <div className="flex gap-0.5 rounded-full bg-ilo-bg p-0.5" role="group" aria-label="Calendar view">{seg("day", "Day")}{seg("week", "Week")}{seg("month", "Month")}</div>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-ilo-plum/10 px-4 py-2 text-[11px] text-ilo-ink/70">
            {(Object.keys(MODE_META) as Mode[]).map((m) => <span key={m} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${MODE_META[m].dot}`} aria-hidden="true" />{MODE_META[m].label}</span>)}
            <span className="ml-auto flex items-center gap-1.5"><Clock className="h-3 w-3" aria-hidden="true" /> Times shown in IST</span>
          </div>
          {view === "month"
            ? <MonthGrid anchor={anchor} appts={appts} nowMs={now} onSelect={setSelected} onPickDay={(d) => { setAnchor(d); setPickedView("day"); }} />
            : <TimeGrid days={days} appts={appts} availability={avail} nowMs={now} startMin={startMin} endMin={endMin} onSelect={setSelected} />}
        </section>

        <AvailabilityPanel availability={avail} room={room} onChange={saveHours} />
      </div>

      {current && !dialog && (
        <AppointmentPanel appt={current} nowMs={now} onClose={() => setSelected(null)} onReschedule={(a) => { setSelected(null); setDialog({ type: "reschedule", appt: a }); }} onDone={done} />
      )}
      {dialog?.type === "book" && (
        <BookDialog kind="book" students={students} appts={appts} availability={avail} nowMs={now} initialStudentId={dialog.studentId} onClose={() => setDialog(null)} onDone={done} />
      )}
      {dialog?.type === "reschedule" && (
        <BookDialog kind="reschedule" students={students} appts={appts.filter((a) => a.id !== dialog.appt.id)} availability={avail} nowMs={now} reschedule={dialog.appt} onClose={() => setDialog(null)} onDone={done} />
      )}
      {dialog?.type === "slot" && <AddSlotDialog availability={avail} onClose={() => setDialog(null)} onDone={done} />}
    </main>
  );
}
