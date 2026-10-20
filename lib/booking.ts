// Booking helpers. All times are Indian Standard Time (UTC+05:30, no daylight saving).
export type AvailSlot = { weekday: number; start_time: string; end_time: string }; // weekday 1 = Mon ... 7 = Sun
export type Day = { ymd: string; isoWeekday: number; heading: string; sub: string };
export type SlotView = { startMs: number; label: string };

export const SESSION_MIN = 45;
const DAY_MS = 86_400_000;
const TZ = "Asia/Kolkata";
const SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const ymdFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
const hmFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const wdShort = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" });
const wdLong = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "long" });
const monthDay = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric" });
const whenDay = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" });

const pad = (n: number) => String(n).padStart(2, "0");
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const isoWeekday = (ms: number) => SHORT.indexOf(wdShort.format(ms)) + 1;
const minutesIST = (ms: number) => { const [h, m] = hmFmt.format(ms).split(":"); return Number(h) * 60 + Number(m); };

export function clock(min: number) {
  const h = Math.floor(min / 60);
  return `${h % 12 || 12}:${pad(min % 60)} ${h >= 12 ? "pm" : "am"}`;
}

export function dayList(nowMs: number, count = 7): Day[] {
  const base = Date.parse(`${ymdFmt.format(nowMs)}T00:00:00+05:30`);
  return Array.from({ length: count }, (_, i) => {
    const ms = base + i * DAY_MS + 12 * 3_600_000; // midday keeps us clear of date edges
    return {
      ymd: ymdFmt.format(ms),
      isoWeekday: isoWeekday(ms),
      heading: i === 0 ? "TODAY" : i === 1 ? "TOMORROW" : wdLong.format(ms).toUpperCase(),
      sub: monthDay.format(ms),
    };
  });
}

// Back-to-back 45-minute starts inside each working window; slots that are too soon are dropped.
export function slotsForDay(avail: AvailSlot[], day: Day, nowMs: number): SlotView[] {
  const out: SlotView[] = [];
  for (const w of avail.filter((a) => a.weekday === day.isoWeekday)) {
    for (let m = toMin(w.start_time); m + SESSION_MIN <= toMin(w.end_time); m += SESSION_MIN) {
      const startMs = Date.parse(`${day.ymd}T${pad(Math.floor(m / 60))}:${pad(m % 60)}:00+05:30`);
      if (startMs >= nowMs + 15 * 60_000) out.push({ startMs, label: clock(m) });
    }
  }
  return out.sort((a, b) => a.startMs - b.startMs);
}

export function presenceLabel(avail: AvailSlot[], nowMs: number): string {
  if (!avail.length) return "Availability coming soon";
  const wd = isoWeekday(nowMs), mins = minutesIST(nowMs);
  const today = avail
    .filter((a) => a.weekday === wd)
    .map((a) => ({ s: toMin(a.start_time), e: toMin(a.end_time) }))
    .sort((a, b) => a.s - b.s);
  const now = today.find((w) => w.s <= mins && mins < w.e);
  if (now) return `On campus today till ${clock(now.e)}`;
  const later = today.find((w) => w.s > mins);
  if (later) return `On campus today from ${clock(later.s)}`;
  for (let o = 1; o <= 7; o++) {
    const d = ((wd - 1 + o) % 7) + 1;
    const w = avail.filter((a) => a.weekday === d).sort((a, b) => toMin(a.start_time) - toMin(b.start_time))[0];
    if (w) return `Next on campus · ${o === 1 ? "tomorrow" : SHORT[d - 1]} ${clock(toMin(w.start_time))}`;
  }
  return "Availability coming soon";
}

export function formatWhen(ms: number) {
  return `${whenDay.format(ms)} · ${clock(minutesIST(ms))}`;
}
