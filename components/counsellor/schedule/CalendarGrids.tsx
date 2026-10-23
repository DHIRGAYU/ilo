"use client";

import { MapPin, Phone, Video } from "lucide-react";
import {
  DAY_MS, MODE_META, dayNum, isoWeekday, istDayStart, minutesIST, monthStart, sameDay, sameMonth, timeOf, toMin, weekStart, weekdayShort,
  type Availability, type CalAppt, type Mode,
} from "@/lib/schedule-shared";

const ROW = 56; // pixels per hour
const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ilo-plum";
const ICON: Record<Mode, typeof Phone> = { in_person: MapPin, video: Video, phone: Phone };
const hourLabel = (h: number) => `${h % 12 || 12} ${h >= 12 ? "PM" : "AM"}`;

type TimeProps = {
  days: number[];            // start of each day shown (IST midnight, ms)
  appts: CalAppt[];
  availability: Availability;
  nowMs: number;
  startMin: number;          // first minute shown, a whole hour
  endMin: number;            // last minute shown, a whole hour
  onSelect: (id: string) => void;
};

// Week and day view: one column per day, hours down the side. Working hours are white; time outside them is tinted.
export function TimeGrid({ days, appts, availability, nowMs, startMin, endMin, onSelect }: TimeProps) {
  const hours = Math.max(1, Math.round((endMin - startMin) / 60));
  const height = hours * ROW;
  const nowMin = minutesIST(nowMs);

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: days.length > 1 ? 640 : 0 }}>
        <div className="grid" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}>
          <div className="border-b border-ilo-plum/10" />
          {days.map((d) => {
            const today = sameDay(d, nowMs);
            return (
              <div key={d} className="border-b border-l border-ilo-plum/10 py-2 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ilo-ink/60">{weekdayShort(d)}</p>
                <p className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full font-display text-sm ${today ? "bg-ilo-plum text-white" : "text-ilo-deep"}`}>{dayNum(d)}</p>
              </div>
            );
          })}

          <div className="relative" style={{ height }} aria-hidden="true">
            {Array.from({ length: hours }, (_, i) => (
              <span key={i} className="absolute right-2 -translate-y-1/2 text-[10px] text-ilo-ink/50" style={{ top: i === 0 ? 8 : i * ROW }}>{hourLabel(Math.floor(startMin / 60) + i)}</span>
            ))}
          </div>

          {days.map((d) => {
            const today = sameDay(d, nowMs);
            const wins = availability[isoWeekday(d)] ?? [];
            const here = appts.filter((a) => sameDay(a.startMs, d));
            return (
              <div key={d} role="group" aria-label={`${weekdayShort(d)} ${dayNum(d)}`} className="relative border-l border-ilo-plum/10 bg-ilo-bg" style={{ height }}>
                {wins.map((w, i) => (
                  <div key={i} className="absolute inset-x-0 bg-white" style={{ top: Math.max(0, ((toMin(w.start) - startMin) / 60) * ROW), height: ((toMin(w.end) - toMin(w.start)) / 60) * ROW }} />
                ))}
                {Array.from({ length: hours }, (_, i) => <div key={i} className="absolute inset-x-0 border-t border-ilo-plum/10" style={{ top: i * ROW }} />)}
                {today && <div className="pointer-events-none absolute inset-0 bg-ilo-blush/30" />}
                {here.map((a) => {
                  const top = ((minutesIST(a.startMs) - startMin) / 60) * ROW + 1;
                  const h = ((a.endMs - a.startMs) / 3_600_000) * ROW - 2;
                  const Icon = ICON[a.mode];
                  const done = a.status === "completed" || a.outcome === "no_show";
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onSelect(a.id)}
                      aria-label={`${a.studentLabel}, ${timeOf(a.startMs)}, ${MODE_META[a.mode].label}${a.outcome === "no_show" ? ", no-show" : ""}`}
                      className={`absolute inset-x-1 overflow-hidden rounded-lg border px-2 py-1 text-left transition-shadow hover:shadow-md ${focus} ${MODE_META[a.mode].block} ${done ? "opacity-70" : ""}`}
                      style={{ top, height: h }}
                    >
                      <span className="flex items-center justify-between gap-1 text-[10px] font-semibold"><span>{timeOf(a.startMs)}</span><Icon className="h-3 w-3 shrink-0" aria-hidden="true" /></span>
                      <span className="mt-0.5 block truncate text-[11px] font-bold">{a.studentLabel}</span>
                      <span className="block truncate text-[10px] opacity-70">{a.outcome === "no_show" ? "No-show" : a.kind}</span>
                    </button>
                  );
                })}
                {today && nowMin >= startMin && nowMin <= endMin && (
                  <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: ((nowMin - startMin) / 60) * ROW }} aria-hidden="true">
                    <span className="-ml-1 h-2 w-2 rounded-full bg-ilo-crisis" />
                    <span className="h-px flex-1 bg-ilo-crisis/60" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type MonthProps = { anchor: number; appts: CalAppt[]; nowMs: number; onSelect: (id: string) => void; onPickDay: (dayStartMs: number) => void };

// Month view: a calendar of small chips. Pick a day number to open that day.
export function MonthGrid({ anchor, appts, nowMs, onSelect, onPickDay }: MonthProps) {
  const gridStart = weekStart(monthStart(anchor));
  const cells = Array.from({ length: 42 }, (_, i) => istDayStart(gridStart + i * DAY_MS + 12 * 3_600_000));
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-7">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <p key={d} className="border-b border-ilo-plum/10 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-ilo-ink/60">{d}</p>
          ))}
          {cells.map((d) => {
            const inMonth = sameMonth(d, anchor);
            const today = sameDay(d, nowMs);
            const here = appts.filter((a) => sameDay(a.startMs, d));
            return (
              <div key={d} className={`min-h-24 border-b border-l border-ilo-plum/10 p-1.5 ${inMonth ? "bg-white" : "bg-ilo-bg"} ${today ? "bg-ilo-blush/30" : ""}`}>
                <button type="button" onClick={() => onPickDay(d)} aria-label={`Open ${weekdayShort(d)} ${dayNum(d)}`} className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${focus} ${today ? "bg-ilo-plum text-white" : inMonth ? "text-ilo-deep" : "text-ilo-ink/40"}`}>{dayNum(d)}</button>
                <div className="mt-1 space-y-0.5">
                  {here.slice(0, 3).map((a) => (
                    <button key={a.id} type="button" onClick={() => onSelect(a.id)} className={`flex w-full items-center gap-1 rounded border px-1 py-0.5 text-left text-[10px] ${focus} ${MODE_META[a.mode].block}`}>
                      <span className="shrink-0 font-semibold">{timeOf(a.startMs).replace(" ", "")}</span>
                      <span className="truncate">{a.studentLabel}</span>
                    </button>
                  ))}
                  {here.length > 3 && <button type="button" onClick={() => onPickDay(d)} className={`text-[10px] font-semibold text-ilo-plum ${focus}`}>+{here.length - 3} more</button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
