import { clock, type AvailSlot } from "@/lib/booking";

// Everything the counsellor dashboard shows, worked out from raw rows. All times are Indian Standard Time.
const TZ = "Asia/Kolkata";
const DAY = 86_400_000;
const ymdF = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
const hmF = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const wdShortF = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" });
const wdLongF = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "long" });
const dayMonthF = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "long" });
const dayMonthYearF = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" });
const SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type Appt = {
  id: string; student_id: string; starts_at: string; ends_at: string;
  mode: "in_person" | "video" | "phone"; status: "confirmed" | "cancelled" | "completed";
  cancelled_at: string | null; created_at: string;
};
export type Convo = { id: string; student_id: string; counsellor_last_read_at: string | null };
export type Msg = { conversation_id: string; sender_role: "student" | "counsellor"; body: string; created_at: string };

export const MODE_LABEL = { in_person: "In person", video: "Private video", phone: "Phone call" } as const;

export type SessionItem = {
  id: string; alias: string; studentName: string; startMs: number; endMs: number; label: string;
  type: "Initial conversation" | "Follow-up"; mode: Appt["mode"]; state: "done" | "now" | "next" | "later";
};
export type AttentionItem = { key: string; kind: "New request" | "New message" | "Cancelled" | "Rescheduled"; icon: "message" | "calendar"; alias: string; studentName: string; text: string; atMs: number };
export type Dashboard = {
  greeting: "morning" | "afternoon" | "evening";
  dateLabel: string; dateChip: string;
  sessions: SessionItem[];
  next: { id: string; alias: string; studentName: string; mode: Appt["mode"]; startMs: number; inProgress: boolean; isToday: boolean; minutesUntil: number; timeLabel: string; dayLabel: string } | null;
  unread: number; triage: number; followUps: number;
  attention: AttentionItem[];
  caseload: { active: number; capacity: number; pct: number; label: "Steady" | "Busy" | "At capacity" };
  gap: string | null; workingToday: boolean; afterHours: boolean;
};

// A stable, anonymous label for a student, e.g. "A-2041". The counsellor never sees a name here.
export function studentAlias(id: string) {
  const hex = id.replace(/-/g, "");
  const letter = String.fromCharCode(65 + (parseInt(hex.slice(0, 2), 16) % 26));
  const num = String(parseInt(hex.slice(2, 8), 16) % 10000).padStart(4, "0");
  return `${letter}-${num}`;
}

const minutesOf = (ms: number) => { const [h, m] = hmF.format(ms).split(":"); return Number(h) * 60 + Number(m); };
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const istMidnight = (ms: number) => Date.parse(`${ymdF.format(ms)}T00:00:00+05:30`);
const isoWd = (ms: number) => SHORT.indexOf(wdShortF.format(ms)) + 1;
const hhmm = (ms: number) => hmF.format(ms);
const whenShort = (ms: number) => `${wdShortF.format(ms)} ${clock(minutesOf(ms))}`;
const snippet = (s: string) => { const t = s.replace(/\s+/g, " ").trim(); return t.length > 80 ? t.slice(0, 79) + "…" : t; };

export function rangeLabel(a: number, b: number) {
  const same = a >= 720 === b >= 720;
  return `${clock(a).replace(same ? / (am|pm)$/ : /$^/, "")}–${clock(b)}`;
}

export function ago(atMs: number, nowMs: number) {
  const m = Math.floor((nowMs - atMs) / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Yesterday" : `${d} days ago`;
}

// First free stretch of at least minLen minutes inside working windows, after now and between booked sessions
export function nextOpenGap(windows: [number, number][], busy: [number, number][], nowMin: number, minLen = 30): [number, number] | null {
  const bs = [...busy].sort((a, b) => a[0] - b[0]);
  for (const [ws, we] of [...windows].sort((a, b) => a[0] - b[0])) {
    let cur = Math.max(ws, nowMin);
    for (const [s, e] of bs) {
      if (e <= cur || s >= we) continue;
      if (s - cur >= minLen) return [cur, s];
      cur = Math.max(cur, e);
    }
    if (we - cur >= minLen) return [cur, we];
  }
  return null;
}

export function buildDashboard(i: { appts: Appt[]; convos: Convo[]; msgs: Msg[]; availability: AvailSlot[]; capacity: number; nowMs: number; studentNames?: Record<string, string> }): Dashboard {
  const { appts, convos, msgs, availability, capacity, nowMs, studentNames } = i;
  const dayStart = istMidnight(nowMs), dayEnd = dayStart + DAY;
  const nowMin = minutesOf(nowMs);
  const startOf = (a: Appt) => Date.parse(a.starts_at);

  const live = appts.filter((a) => a.status !== "cancelled");
  const firstStart = new Map<string, number>();
  for (const a of live) { const s = startOf(a); const c = firstStart.get(a.student_id); if (c === undefined || s < c) firstStart.set(a.student_id, s); }

  const confirmed = appts.filter((a) => a.status === "confirmed").sort((a, b) => startOf(a) - startOf(b));
  const today = confirmed.filter((a) => startOf(a) >= dayStart && startOf(a) < dayEnd);
  const nextIdx = today.findIndex((a) => Date.parse(a.ends_at) > nowMs);
  const sessions: SessionItem[] = today.map((a, idx) => {
    const s = startOf(a), e = Date.parse(a.ends_at);
    const alias = studentAlias(a.student_id);
    const studentName = studentNames?.[a.student_id] || `Student #${alias}`;
    return {
      id: a.id, alias, studentName, startMs: s, endMs: e, label: hhmm(s),
      type: firstStart.get(a.student_id) === s ? "Initial conversation" : "Follow-up", mode: a.mode,
      state: e <= nowMs ? "done" : idx === nextIdx ? (s <= nowMs ? "now" : "next") : "later",
    };
  });

  const up = confirmed.find((a) => Date.parse(a.ends_at) > nowMs);
  const next = up ? {
    id: up.id,
    alias: studentAlias(up.student_id),
    studentName: studentNames?.[up.student_id] || `Student #${studentAlias(up.student_id)}`,
    mode: up.mode,
    startMs: startOf(up),
    inProgress: startOf(up) <= nowMs,
    isToday: startOf(up) < dayEnd,
    minutesUntil: Math.max(0, Math.round((startOf(up) - nowMs) / 60_000)),
    timeLabel: clock(minutesOf(startOf(up))),
    dayLabel: wdLongF.format(startOf(up)),
  } : null;

  // Messages: unread, awaiting a first reply, and what needs attention
  const byConvo = new Map<string, Msg[]>();
  for (const m of msgs) { const l = byConvo.get(m.conversation_id); if (l) l.push(m); else byConvo.set(m.conversation_id, [m]); }
  let unread = 0, triage = 0;
  const attention: AttentionItem[] = [];
  for (const c of convos) {
    const list = (byConvo.get(c.id) ?? []).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    if (!list.length) continue;
    const readAt = c.counsellor_last_read_at ? Date.parse(c.counsellor_last_read_at) : 0;
    unread += list.filter((m) => m.sender_role === "student" && Date.parse(m.created_at) > readAt).length;
    const everReplied = list.some((m) => m.sender_role === "counsellor");
    const last = list[0];
    if (last.sender_role === "student") {
      if (!everReplied) triage++;
      const alias = studentAlias(c.student_id);
      const studentName = studentNames?.[c.student_id] || `Student #${alias}`;
      attention.push({ key: `m-${c.id}`, kind: everReplied ? "New message" : "New request", icon: "message", alias, studentName, text: snippet(last.body), atMs: Date.parse(last.created_at) });
    }
  }
  for (const a of appts) {
    if (a.status !== "cancelled" || !a.cancelled_at) continue;
    const at = Date.parse(a.cancelled_at);
    if (nowMs - at > 3 * DAY) continue;
    const moved = appts.find((b) => b.status === "confirmed" && b.student_id === a.student_id && b.id !== a.id && Math.abs(Date.parse(b.created_at) - at) < 60_000);
    const alias = studentAlias(a.student_id);
    const studentName = studentNames?.[a.student_id] || `Student #${alias}`;
    attention.push({
      key: `c-${a.id}`, kind: moved ? "Rescheduled" : "Cancelled", icon: "calendar", alias, studentName, atMs: at,
      text: moved ? `Moved a session to ${whenShort(startOf(moved))}.` : `Cancelled the ${whenShort(startOf(a))} session.`,
    });
  }
  attention.sort((a, b) => b.atMs - a.atMs);

  // Caseload: students with a session in the last or next 30 days
  const active = new Set(live.filter((a) => startOf(a) > nowMs - 30 * DAY && startOf(a) < nowMs + 30 * DAY).map((a) => a.student_id)).size;
  const pct = Math.min(100, Math.round((active / capacity) * 100));

  const wd = isoWd(nowMs);
  const windows = availability.filter((a) => a.weekday === wd).map((a) => [toMin(a.start_time), toMin(a.end_time)] as [number, number]);
  const busy = today.map((a) => [minutesOf(startOf(a)), minutesOf(Date.parse(a.ends_at))] as [number, number]);
  const gap = nextOpenGap(windows, busy, nowMin);

  const h = Math.floor(nowMin / 60);
  return {
    greeting: h < 12 ? "morning" : h < 17 ? "afternoon" : "evening",
    dateLabel: `${wdLongF.format(nowMs).toUpperCase()} · ${dayMonthF.format(nowMs).toUpperCase()}`,
    dateChip: `${wdLongF.format(nowMs)}, ${dayMonthYearF.format(nowMs)}`,
    sessions, next, unread, triage, followUps: 0,
    attention: attention.slice(0, 4),
    caseload: { active, capacity, pct, label: pct <= 70 ? "Steady" : pct <= 90 ? "Busy" : "At capacity" },
    gap: gap ? rangeLabel(gap[0], gap[1]) : null,
    workingToday: windows.length > 0,
    afterHours: windows.length > 0 && windows.every(([, e]) => e <= nowMin),
  };
}
