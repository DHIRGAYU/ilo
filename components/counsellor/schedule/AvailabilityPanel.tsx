"use client";

import { useState } from "react";
import { Clock, X } from "lucide-react";
import { WEEKDAYS, windowText, type Availability, type Window } from "@/lib/schedule-shared";

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ilo-plum";

// Weekly working hours. Every change is saved straight away; students only ever see the open times this sets.
export function AvailabilityPanel({ availability, room, onChange }: {
  availability: Availability;
  room: string | null;
  onChange: (weekday: number, windows: Window[]) => Promise<string | null>; // returns an error message, or null when saved
}) {
  const [busyDay, setBusyDay] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function apply(wd: number, next: Window[]) {
    setBusyDay(wd); setError(null);
    const e = await onChange(wd, next);
    setBusyDay(null);
    if (e) setError(`${WEEKDAYS[wd - 1]}: ${e}`);
  }

  return (
    <section aria-labelledby="av-title" className="rounded-3xl border border-ilo-plum/10 bg-white p-5 shadow-sm">
      <h2 id="av-title" className="font-display text-xl text-ilo-deep">Availability settings</h2>
      <p className="mt-1 text-[11px] leading-relaxed text-ilo-ink/70">Set a steady rhythm that works for you. Students only see your open appointment times.</p>

      <p className="mt-4 flex items-center justify-between rounded-xl bg-ilo-bg px-3 py-2.5 text-[11px] text-ilo-ink">
        <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" aria-hidden="true" /> India Standard Time</span>
        <span className="font-semibold text-ilo-deep">IST · UTC+5:30</span>
      </p>

      <h3 className="mt-5 text-[10px] font-bold uppercase tracking-wider text-ilo-ink/60">Weekly hours</h3>
      <ul className="mt-2 divide-y divide-ilo-plum/10">
        {WEEKDAYS.map((name, i) => {
          const wd = i + 1;
          const wins = availability[wd] ?? [];
          const on = wins.length > 0;
          return (
            <li key={name} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ilo-deep">{name}</p>
                {on ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {wins.map((w, j) => (
                      <span key={j} className="flex items-center gap-1 rounded-full bg-ilo-blush px-2 py-0.5 text-[10px] font-semibold text-ilo-plum">
                        {windowText(w)}
                        <button type="button" disabled={busyDay === wd} onClick={() => apply(wd, wins.filter((_, k) => k !== j))} aria-label={`Remove ${windowText(w)} on ${name}`} className={`rounded-full ${focus}`}><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                ) : <p className="text-[11px] text-ilo-ink/60">Unavailable</p>}
              </div>
              <button
                type="button" role="switch" aria-checked={on} aria-label={`${name} available`} disabled={busyDay === wd}
                onClick={() => apply(wd, on ? [] : [{ start: "09:00", end: "17:00" }])}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${focus} ${on ? "bg-ilo-plum" : "bg-ilo-ink/25"}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="mt-3 text-[11px] font-semibold text-ilo-crisis">{error}</p>}

      {room && (
        <div className="mt-4 rounded-xl bg-ilo-bg p-3">
          <p className="text-xs font-bold text-ilo-deep">Campus counselling room</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-ilo-ink/70">{room}. Booked sessions are 45 minutes.</p>
        </div>
      )}
    </section>
  );
}
