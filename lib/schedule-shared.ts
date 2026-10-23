import { clock } from "@/lib/booking";

// Calendar helpers shared by the Schedule, Session workspace and Students screens.
// All times are Indian Standard Time (UTC+05:30, no daylight saving), so day maths on milliseconds is exact.
export const TZ = "Asia/Kolkata";
export const DAY_MS = 86_400_000;
export const SESSION_MIN = 45;
const IST_MS = 330 * 60_000;

export type Mode = "in_person" | "video" | "phone";
export type Status = "confirmed" | "cancelled" | "completed";
export type Outcome = "held" | "no_show";
export type Window = { start: string; end: string }; // "HH:MM"
export type Availability = Record<number, Window[]>;  // 1 = Mon ... 7 = Sun
export type StudentOption = { id: string; label: string };

export type CalAppt = {
  id: string;
  studentId: string;
  studentLabel: string;
  startMs: number;
  endMs: number;
  mode: Mode;
  status: Status;
  kind: "First conversation" | "Follow-up";
  studentNote: string | null; // what the student wrote when booking
  outcome: Outcome | null;
  followUp: boolean;
};

export const MODE_META: Record<Mode, { label: string; long: string; block: string; dot: string }> = {
  in_person: { label: "In person", long: "In person", block: "border-ilo-plum/25 bg-ilo-blush text-ilo-deep", dot: "bg-ilo-plum/50" },
  video: { label: "Video", long: "Private video", block: "border-violet-300 bg-violet-50 text-violet-950", dot: "bg-violet-400" },
  phone: { label: "Phone", long: "Phone call", block: "border-emerald-300 bg-emerald-50 text-emerald-950", dot: "bg-emerald-500" },
};

const pad = (n: number) => String(n).padStart(2, "0");
export const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const hhmm = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
export const istDayStart = (ms: number) => Math.floor((ms + IST_MS) / DAY_MS) * DAY_MS - IST_MS;
export const isoWeekday = (ms: number) => ((Math.floor((ms + IST_MS) / DAY_MS) + 3) % 7) + 1; // 1970-01-01 was a Thursday
export const minutesIST = (ms: number) => Math.floor(((ms + IST_MS) % DAY_MS) / 60_000);
export const weekStart = (ms: number) => istDayStart(ms) - (isoWeekday(ms) - 1) * DAY_MS;
export const sameDay = (a: number, b: number) => istDayStart(a) === istDayStart(b);

const ymdF = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
const dmF = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short" });
const dmyF = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
const wdF = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" });
const wdLongF = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "long" });
const monthF = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "long", year: "numeric" });
const dayNumF = new Intl.DateTimeFormat("en-US", { timeZone: TZ, day: "numeric" });

export const ymd = (ms: number) => ymdF.format(ms);
export const dayNum = (ms: number) => dayNumF.format(ms);
export const weekdayShort = (ms: number) => wdF.format(ms);
export const weekdayLong = (ms: number) => wdLongF.format(ms);
export const dateShort = (ms: number) => dmF.format(ms);
export const monthLabel = (ms: number) => monthF.format(ms);
export const monthStart = (ms: number) => Date.parse(`${ymd(ms).slice(0, 8)}01T00:00:00+05:30`);
export const sameMonth = (a: number, b: number) => ymd(a).slice(0, 7) === ymd(b).slice(0, 7);
export const timeOf = (ms: number) => clock(minutesIST(ms));
export const dateTimeOf = (ms: number) => `${dmF.format(ms)}, ${timeOf(ms).toUpperCase()}`;
export const fullWhen = (ms: number) => `${wdF.format(ms)}, ${dmF.format(ms)} · ${timeOf(ms)}`;
export const rangeOfWeek = (startMs: number) => `${dmF.format(startMs)} — ${dmyF.format(startMs + 6 * DAY_MS)}`;
export const dayHeading = (ms: number) => `${wdLongF.format(ms)}, ${dmyF.format(ms)}`;

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const windowText = (w: Window) => {
  const a = toMin(w.start), b = toMin(w.end);
  const same = a >= 720 === b >= 720;
  return `${clock(a).replace(same ? / (am|pm)$/ : /$^/, "").toUpperCase()} – ${clock(b).toUpperCase()}`;
};

export function parseAvailability(rows: { weekday: number; start_time: string; end_time: string }[]): Availability {
  const out: Availability = {};
  for (const r of rows) (out[r.weekday] ??= []).push({ start: r.start_time.slice(0, 5), end: r.end_time.slice(0, 5) });
  for (const k of Object.keys(out)) out[Number(k)].sort((a, b) => toMin(a.start) - toMin(b.start));
  return out;
}

// Start times (ms) a session can be booked at on one day: back-to-back 45-minute slots from the start of each working window,
// minus slots already taken, too soon (under 15 minutes away), or beyond the 14-day booking limit.
export function freeSlots(dayStartMs: number, windows: Window[], taken: Set<number>, nowMs: number): number[] {
  const out: number[] = [];
  for (const w of windows) {
    for (let m = toMin(w.start); m + SESSION_MIN <= toMin(w.end); m += SESSION_MIN) {
      const startMs = dayStartMs + m * 60_000;
      if (startMs >= nowMs + 15 * 60_000 && startMs <= nowMs + 14 * DAY_MS - 60_000 && !taken.has(startMs)) out.push(startMs);
    }
  }
  return out.sort((a, b) => a - b);
}

// Plain-English messages for the errors the database can return
export function scheduleError(message: string): string {
  const m = (k: string) => message.includes(k);
  if (m("slot_taken")) return "That time was just taken. Please pick another.";
  if (m("slot_unavailable")) return "That time isn't open for booking. Slots open from 15 minutes to 14 days ahead.";
  if (m("has_booked_sessions")) return "Some booked sessions wouldn't fit. Move or cancel them first.";
  if (m("cannot_cancel") || m("cannot_reschedule")) return "That session has already started or changed. Refresh and try again.";
  if (m("bad_windows")) return "Working hours need a start before the end (at least 45 minutes), and can't overlap.";
  if (m("too_early")) return "You can record an outcome once the session has started.";
  if (m("not_allowed")) return "That isn't allowed for this student.";
  return "Something went wrong. Please try again.";
}
