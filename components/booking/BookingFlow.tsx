"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Clock, Lock, MapPin, Phone, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { dayList, formatWhen, slotsForDay, type AvailSlot } from "@/lib/booking";
import { shortName } from "@/lib/sessions";

export type ModeId = "in_person" | "video" | "phone";
export type CounsellorOption = {
  id: string;
  display_name: string;
  qualification: string | null;
  designation: string | null;
  languages: string[];
  room: string | null;
  counsellor_availability: AvailSlot[];
};

const MODES = [
  { id: "in_person", label: "In person", sub: "At their room", icon: MapPin },
  { id: "video", label: "Video call", sub: "Online", icon: Video },
  { id: "phone", label: "Phone call", sub: "They call you", icon: Phone },
] as const;

export type RescheduleInfo = { id: string; counsellorId: string; whenLabel: string };

const heading = "text-[10px] font-bold uppercase tracking-wider text-ilo-ink/70";

export function BookingFlow({ counsellors, nowMs, initialMode, reschedule }: { counsellors: CounsellorOption[]; nowMs: number; initialMode: ModeId; reschedule?: RescheduleInfo }) {
  const days = dayList(nowMs);
  const firstDayFor = (c?: CounsellorOption) =>
    (days.find((d) => slotsForDay(c?.counsellor_availability ?? [], d, nowMs).length > 0) ?? days[0]).ymd;

  const [cid, setCid] = useState(reschedule?.counsellorId ?? counsellors[0]?.id ?? "");
  const [dayYmd, setDayYmd] = useState(() => firstDayFor(counsellors[0]));
  const [slotMs, setSlotMs] = useState<number | null>(null);
  const [mode, setMode] = useState<ModeId>(initialMode);
  const [booked, setBooked] = useState<Set<number>>(new Set());
  const [refresh, setRefresh] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const off = reschedule ? 0 : 1; // steps are numbered from the date when rescheduling

  const counsellor = counsellors.find((c) => c.id === cid);
  const avail = counsellor?.counsellor_availability ?? [];
  const day = days.find((d) => d.ymd === dayYmd) ?? days[0];
  const slots = slotsForDay(avail, day, nowMs);

  // Which slots are already taken (times only, never who booked them)
  useEffect(() => {
    if (!cid) return;
    let cancelled = false;
    (async () => {
      const { data } = await createClient().rpc("get_booked_slots", {
        p_counsellor_id: cid,
        p_from: new Date(nowMs).toISOString(),
        p_to: new Date(nowMs + 8 * 86_400_000).toISOString(),
      });
      if (!cancelled) setBooked(new Set(((data ?? []) as string[]).map((t) => Date.parse(t))));
    })();
    return () => { cancelled = true; };
  }, [cid, nowMs, refresh]);

  function pickCounsellor(c: CounsellorOption) {
    setCid(c.id);
    setDayYmd(firstDayFor(c));
    setSlotMs(null);
    setError(null);
  }

  async function confirm() {
    if (!cid || slotMs == null) return;
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const startsAt = new Date(slotMs).toISOString();
    const { error } = reschedule
      ? await supabase.rpc("reschedule_appointment", { p_appointment_id: reschedule.id, p_starts_at: startsAt })
      : await supabase.rpc("book_appointment", { p_counsellor_id: cid, p_starts_at: startsAt, p_mode: mode, p_note: note.trim() || null });
    setSubmitting(false);
    if (error) {
      if (/slot_taken|slot_unavailable/.test(error.message)) {
        setError("That time was just taken. Please pick another slot.");
        setSlotMs(null);
        setRefresh((r) => r + 1);
      } else if (/too_late|cannot_reschedule/.test(error.message)) {
        setError("Changes close 2 hours before a session. Please message your counsellor.");
      } else {
        setError("We couldn't complete your booking. Please try again.");
      }
      return;
    }
    setDone(formatWhen(slotMs));
  }

  const header = (
    <header className="sticky top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center border-b border-ilo-plum/10 bg-ilo-bg/95 px-4 pb-3 pt-7 backdrop-blur">
      <Link href={reschedule ? "/sessions" : "/home"} className="flex w-fit items-center gap-0.5 text-xs text-ilo-ink">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="font-display text-base text-ilo-plum">{reschedule ? "Reschedule Session" : "Book a Private Session"}</h1>
      <span />
    </header>
  );

  if (!counsellors.length) {
    return (
      <main className="min-h-full">
        {header}
        <p className="px-4 py-8 text-center text-sm text-ilo-ink">Your college hasn&apos;t added a counsellor yet. Please check back soon.</p>
      </main>
    );
  }

  if (done && counsellor) {
    const m = MODES.find((x) => x.id === mode)!;
    return (
      <main className="min-h-full">
        {header}
        <div className="px-6 pt-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ilo-plum text-white">
            <Check className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-xl text-ilo-plum">{reschedule ? "Your session was moved" : "Your session is booked"}</h2>
          <div className="mt-5 rounded-2xl border border-ilo-plum/10 bg-white p-4 text-left">
            <p className="text-sm font-bold text-ilo-plum">{counsellor.display_name}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-ilo-ink"><Clock className="h-3.5 w-3.5" /> {done} · 45 mins</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-ilo-ink">
              <m.icon className="h-3.5 w-3.5" /> {m.label}{mode === "in_person" && counsellor.room ? ` · ${counsellor.room}` : ""}
            </p>
          </div>
          <p className="mt-4 text-[11px] text-ilo-ink/70">Your college sees that counselling happened. Never who. Never what was said.</p>
          <Link href="/sessions" className="mt-6 flex h-11 items-center justify-center rounded-full bg-ilo-plum text-xs font-bold uppercase tracking-wide text-white">
            View my sessions
          </Link>
          <Link href="/home" className="mt-3 block text-xs font-semibold text-ilo-plum">Back to home</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-full flex-col">
      {header}

      <div className="flex-1 space-y-5 px-4 pb-4 pt-4">
        {reschedule && (
          <p className="rounded-xl border border-ilo-plum/15 bg-ilo-blush p-3 text-xs text-ilo-ink">
            Rescheduling with <strong className="text-ilo-plum">{counsellor?.display_name}</strong>. Currently {reschedule.whenLabel}.
          </p>
        )}
        {!reschedule && (
          <section aria-labelledby="s1">
            <h2 id="s1" className={heading}>1. Campus counsellor</h2>
            <div role="radiogroup" aria-labelledby="s1" className="mt-2 space-y-2">
              {counsellors.map((c) => {
                const on = c.id === cid;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => pickCounsellor(c)}
                    className={`relative w-full rounded-xl border p-3 pr-9 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ilo-plum ${on ? "border-ilo-plum bg-ilo-blush" : "border-ilo-plum/10 bg-white"}`}
                  >
                    <p className="text-xs font-bold text-ilo-plum">{c.display_name}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-ilo-ink">
                      {[c.designation, c.languages.join(", ")].filter(Boolean).join(" · ")}
                    </p>
                    {c.room && <p className="mt-0.5 text-[10px] text-ilo-ink/70">{c.room}</p>}
                    {on && (
                      <span className="absolute right-3 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full border border-ilo-plum text-ilo-plum">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section aria-labelledby="s2">
          <h2 id="s2" className={heading}>{off + 1}. Select date</h2>
          <div role="radiogroup" aria-labelledby="s2" className="scrollbar-hide -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
            {days.map((d) => {
              const on = d.ymd === day.ymd;
              const empty = slotsForDay(avail, d, nowMs).length === 0;
              return (
                <button
                  key={d.ymd}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={empty}
                  onClick={() => { setDayYmd(d.ymd); setSlotMs(null); setError(null); }}
                  className={`shrink-0 rounded-xl border px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ilo-plum disabled:opacity-40 ${on ? "border-ilo-plum bg-ilo-plum text-white" : "border-ilo-plum/10 bg-white text-ilo-plum"}`}
                >
                  <span className={`block text-[9px] font-semibold tracking-wide ${on ? "text-white/80" : "text-ilo-ink/70"}`}>{d.heading}</span>
                  <span className="block text-xs font-bold">{d.sub}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="s3">
          <div className="flex items-baseline justify-between">
            <h2 id="s3" className={heading}>{off + 2}. Concrete open time slot</h2>
            <span className="text-[10px] text-ilo-ink/60">45 mins per session</span>
          </div>
          {slots.length === 0 ? (
            <p className="mt-2 text-xs text-ilo-ink">No open slots on this day. Try another date.</p>
          ) : (
            <div role="radiogroup" aria-labelledby="s3" className="mt-2 grid grid-cols-2 gap-2">
              {slots.map((s) => {
                const taken = booked.has(s.startMs);
                const on = s.startMs === slotMs;
                return (
                  <button
                    key={s.startMs}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={taken}
                    onClick={() => { setSlotMs(s.startMs); setError(null); }}
                    className={`flex flex-col items-center rounded-xl border py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ilo-plum ${taken
                        ? "border-dashed border-ilo-plum/25 bg-ilo-blush/50 text-ilo-ink/40"
                        : on
                          ? "border-ilo-plum bg-ilo-plum text-white"
                          : "border-ilo-plum/10 bg-white text-ilo-plum"
                      }`}
                  >
                    <span className="flex items-center gap-1 text-xs font-bold"><Clock className="h-3 w-3" /> {s.label}</span>
                    <span className="text-[9px]">{taken ? "Reserved" : "Open slot"}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {!reschedule && (
          <>
            <section aria-labelledby="s4">
              <h2 id="s4" className={heading}>{off + 3}. Session mode</h2>
              <div role="radiogroup" aria-labelledby="s4" className="mt-2 grid grid-cols-3 gap-2">
                {MODES.map(({ id, label, sub, icon: Icon }) => {
                  const on = id === mode;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setMode(id)}
                      className={`flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ilo-plum ${on ? "border-ilo-plum bg-ilo-blush text-ilo-plum" : "border-ilo-plum/10 bg-white text-ilo-ink"}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[11px] font-bold">{label}</span>
                      <span className="text-[9px] text-ilo-ink/70">{sub}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section aria-labelledby="s5">
              <h2 id="s5" className={heading}>5. Note to counsellor <span className="font-normal normal-case tracking-normal">(optional)</span></h2>
              <textarea
                aria-labelledby="s5"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder={`Anything you'd like ${counsellor ? shortName(counsellor.display_name) : "your counsellor"} to know beforehand?`}
                className="mt-2 w-full resize-none rounded-xl border border-ilo-plum/15 bg-white p-3 text-xs text-ilo-ink placeholder:text-ilo-ink/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ilo-plum"
              />
              <p className="mt-1 flex justify-between text-[10px] text-ilo-ink/60"><span>Only your counsellor can read this.</span><span>{note.length}/500</span></p>
            </section>
          </>
        )}
      </div>

      <div className="sticky bottom-0 z-10 space-y-2 border-t border-ilo-plum/10 bg-ilo-bg/95 p-3 backdrop-blur">
        {error && <p role="alert" className="text-center text-xs font-medium text-ilo-crisis">{error}</p>}
        <Button
          onClick={confirm}
          disabled={slotMs == null || submitting}
          className="h-11 w-full rounded-full bg-ilo-plum text-[11px] font-bold uppercase tracking-wide text-white hover:bg-ilo-plum/90"
        >
          {submitting ? "Booking…" : <>{reschedule ? "Confirm new time" : "Confirm confidential booking"} <ChevronRight className="ml-1 h-4 w-4" /></>}
        </Button>
        <p className="flex items-center gap-2 rounded-lg border border-ilo-plum/10 bg-white/80 px-3 py-2 text-[10px] leading-snug text-ilo-ink">
          <Lock className="h-3 w-3 shrink-0" />
          <span>Your college sees that counselling happened. <strong className="text-ilo-plum">Never who. Never what was said.</strong></span>
        </p>
      </div>
    </main>
  );
}
