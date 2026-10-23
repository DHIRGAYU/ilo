import { dayLabel, timeLabel } from "@/lib/chat";
import type { Message, Status } from "@/lib/e2ee";

// Types and small helpers shared by the inbox page (server) and its components (client).
// Nothing here touches the database. All times are Indian Standard Time.
const TZ = "Asia/Kolkata";
const DAY = 86_400_000;
const dmF = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short" });
const wdF = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" });
const whenF = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });

export type Role = "student" | "counsellor";
export type Msg = { id: string; key: string; mine: boolean; body: string; at: number; status: Status; reason?: string };
export type InboxEvent = { id: string; at: number; text: string };
export type NextSession = { startMs: number; endMs: number; mode: "in_person" | "video" | "phone" };

// One conversation as the counsellor sees it. The student's id never reaches the browser, only the display name.
export type InboxConvo = {
  id: string;
  alias: string; // the student's name, or "Student #A-2041" if no name is available
  initial: string;
  lastBody: string;
  lastRole: Role | null;
  lastAt: number; // 0 when there are no messages yet
  firstAt: number;
  unread: number;
  everReplied: boolean;
  pinned: boolean;
  urgent: boolean;
  archived: boolean;
  resolved: boolean;
  note: string;
  sessionsHeld: number;
  next: NextSession | null;
  events: InboxEvent[];
};

export type Filter = "all" | "unread" | "urgent" | "waiting" | "archived";
export const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "urgent", label: "Urgent" },
  { id: "waiting", label: "Waiting" },
  { id: "archived", label: "Archived" },
];

// A message from this device's own store. "mine" here means sent by the counsellor.
export const fromStore = (m: Message): Msg => ({ id: m.id, key: `${m.mine ? "m" : "r"}-${m.id}`, mine: m.mine, body: m.body, at: m.at, status: m.status, reason: m.reason });

export function failText(reason?: string) {
  switch (reason) {
    case "recipient_no_key": return "They haven't turned on secure messaging yet";
    case "recipient_unavailable": return "They can't receive messages yet";
    case "mailbox_full": return "Their inbox is full right now";
    case "key_changed": return "Their security key changed. Open the security code";
    default: return "Not sent";
  }
}

export function matchesFilter(c: InboxConvo, f: Filter) {
  if (f === "archived") return c.archived;
  // An archived conversation that gets a new message still shows up, so nothing is missed
  if (c.archived && c.unread === 0) return false;
  if (f === "unread") return c.unread > 0;
  if (f === "urgent") return c.urgent;
  if (f === "waiting") return c.lastRole === "counsellor" && !c.resolved;
  return true;
}

export const sortConvos = (list: InboxConvo[]) =>
  [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastAt - a.lastAt);

export function rowTag(c: InboxConvo): { label: string; className: string } | null {
  if (c.urgent) return { label: "Urgent", className: "bg-ilo-crisis/10 text-ilo-crisis" };
  if (c.resolved) return { label: "Resolved", className: "bg-ilo-ink/10 text-ilo-ink" };
  if (c.lastRole === "student" && !c.everReplied) return { label: "New", className: "bg-ilo-blush text-ilo-plum" };
  if (c.lastRole === "counsellor") return { label: "Waiting on student", className: "bg-emerald-50 text-emerald-800" };
  return null;
}

export const snippet = (s: string, n = 70) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
};

// "11:58 am" today, "Yesterday", "Mon" within the week, otherwise "18 Mar"
export function listTime(ms: number, nowMs: number) {
  if (!ms) return "";
  const d = dayLabel(ms, nowMs);
  if (d === "Today") return timeLabel(ms);
  if (d === "Yesterday") return d;
  return nowMs - ms < 6 * DAY ? wdF.format(ms) : dmF.format(ms);
}

export const dateLabel = (ms: number) => (ms ? dmF.format(ms) : "—");
export const whenLabel = (ms: number) => `${whenF.format(ms)} · ${timeLabel(ms)}`;
