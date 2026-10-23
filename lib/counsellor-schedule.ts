import { getWorkspace } from "@/lib/counsellor-data";
import { studentAlias, studentLabel } from "@/lib/counsellor-day";
import { DAY_MS, parseAvailability, type Availability, type CalAppt, type Mode, type Outcome, type Status, type StudentOption } from "@/lib/schedule-shared";
import { createClient } from "@/lib/supabase/server";

type ApptRow = { id: string; student_id: string; starts_at: string; ends_at: string; mode: Mode; status: Status; student_note: string | null };
type RecRow = { appointment_id: string; outcome: Outcome | null; follow_up: boolean };
type ConvRow = { id: string; student_id: string };

// Everything the three screens start from. Row-level security means only this counsellor's own rows come back.
async function loadBase() {
  const ws = await getWorkspace();
  if (!ws) return null;
  const supabase = await createClient();
  const [apptRes, recRes, convRes] = await Promise.all([
    supabase.from("appointments").select("id, student_id, starts_at, ends_at, mode, status, student_note").eq("counsellor_id", ws.me.id).order("starts_at", { ascending: true }).limit(1000),
    supabase.from("session_records").select("appointment_id, outcome, follow_up").eq("counsellor_id", ws.me.id),
    supabase.from("conversations").select("id, student_id").eq("counsellor_id", ws.me.id),
  ]);
  const rows = (apptRes.data ?? []) as ApptRow[];
  // If the 0016 migration has not been run yet the screens still open, without outcomes and notes
  const recordsReady = !recRes.error;
  const recs = new Map(((recRes.error ? [] : recRes.data ?? []) as RecRow[]).map((r) => [r.appointment_id, r]));
  const convs = (convRes.data ?? []) as ConvRow[];

  const firstStart = new Map<string, number>();
  for (const r of rows) {
    if (r.status === "cancelled") continue;
    const s = Date.parse(r.starts_at);
    const c = firstStart.get(r.student_id);
    if (c === undefined || s < c) firstStart.set(r.student_id, s);
  }
  const toCal = (r: ApptRow): CalAppt => {
    const startMs = Date.parse(r.starts_at);
    const rec = recs.get(r.id);
    return {
      id: r.id, studentId: r.student_id, studentLabel: studentLabel(r.student_id, ws.names), startMs, endMs: Date.parse(r.ends_at),
      mode: r.mode, status: r.status, kind: firstStart.get(r.student_id) === startMs ? "First conversation" : "Follow-up",
      studentNote: r.student_note, outcome: rec?.outcome ?? null, followUp: rec?.follow_up ?? false,
    };
  };
  return { ws, supabase, rows, recs, convs, recordsReady, toCal };
}

// ---------- Schedule ----------

export type Schedule = { nowMs: number; appts: CalAppt[]; availability: Availability; room: string | null; students: StudentOption[]; recordsReady: boolean };

export async function getSchedule(): Promise<Schedule | null> {
  const b = await loadBase();
  if (!b) return null;
  const { ws, supabase } = b;
  const [{ data: av }, { data: me }] = await Promise.all([
    supabase.from("counsellor_availability").select("weekday, start_time, end_time").eq("counsellor_id", ws.me.id),
    supabase.from("counsellors").select("room").eq("id", ws.me.id).maybeSingle(),
  ]);
  const ids = new Set<string>([...b.convs.map((c) => c.student_id), ...b.rows.map((r) => r.student_id)]);
  const students = [...ids].map((id) => ({ id, label: studentLabel(id, ws.names) })).sort((x, y) => x.label.localeCompare(y.label));
  return {
    nowMs: ws.nowMs,
    appts: b.rows.filter((r) => r.status !== "cancelled").map(b.toCal),
    availability: parseAvailability((av ?? []) as { weekday: number; start_time: string; end_time: string }[]),
    room: (me?.room as string | null | undefined) ?? null,
    students,
    recordsReady: b.recordsReady,
  };
}

// ---------- Session workspace ----------

export type SessionData = {
  nowMs: number;
  appt: CalAppt;
  conversationId: string | null;
  history: { id: string; startMs: number; mode: Mode; status: Status; outcome: Outcome | null }[];
  note: { ciphertext: string; nonce: string } | null; // locked on the counsellor's device, opened there
  recordsReady: boolean;
};

export async function getSession(id: string): Promise<SessionData | null> {
  const b = await loadBase();
  if (!b) return null;
  const row = b.rows.find((r) => r.id === id);
  if (!row) return null;
  const appt = b.toCal(row);
  const history = b.rows
    .filter((r) => r.student_id === row.student_id && r.id !== id && r.status !== "cancelled")
    .map(b.toCal)
    .sort((x, y) => y.startMs - x.startMs)
    .map((a) => ({ id: a.id, startMs: a.startMs, mode: a.mode, status: a.status, outcome: a.outcome }));
  let note: SessionData["note"] = null;
  if (b.recordsReady) {
    const { data } = await b.supabase.from("session_records").select("note_ciphertext, note_nonce").eq("appointment_id", id).maybeSingle();
    if (data?.note_ciphertext && data?.note_nonce) note = { ciphertext: data.note_ciphertext as string, nonce: data.note_nonce as string };
  }
  return { nowMs: b.ws.nowMs, appt, conversationId: b.convs.find((c) => c.student_id === row.student_id)?.id ?? null, history, note, recordsReady: b.recordsReady };
}

// ---------- Students (caseload) ----------

export type CaseRow = {
  id: string; label: string; initial: string; convId: string | null;
  lastMs: number | null; nextMs: number | null; nextApptId: string | null;
  status: "New" | "Ongoing" | "Follow-up due" | "Paused"; sessionsHeld: number;
};
export type Caseload = { nowMs: number; rows: CaseRow[]; active: number; followUpsThisWeek: number };

export async function getCaseload(): Promise<Caseload | null> {
  const b = await loadBase();
  if (!b) return null;
  const { ws } = b;
  const now = ws.nowMs;
  const ids = new Set<string>([...b.convs.map((c) => c.student_id), ...b.rows.map((r) => r.student_id)]);
  const rows: CaseRow[] = [...ids].map((sid) => {
    const mine = b.rows.filter((r) => r.student_id === sid && r.status !== "cancelled");
    const past = mine.filter((r) => Date.parse(r.ends_at) <= now || r.status === "completed").sort((x, y) => Date.parse(y.starts_at) - Date.parse(x.starts_at));
    const upcoming = mine.filter((r) => r.status === "confirmed" && Date.parse(r.ends_at) > now).sort((x, y) => Date.parse(x.starts_at) - Date.parse(y.starts_at))[0];
    const last = past[0];
    const lastMs = last ? Date.parse(last.starts_at) : null;
    const flagged = !!last && b.recs.get(last.id)?.follow_up === true;
    const held = past.filter((r) => b.recs.get(r.id)?.outcome !== "no_show").length;
    const status: CaseRow["status"] = flagged && !upcoming ? "Follow-up due"
      : upcoming || (lastMs !== null && now - lastMs < 30 * DAY_MS) ? "Ongoing"
      : lastMs !== null ? "Paused" : "New";
    return {
      id: sid, label: studentLabel(sid, ws.names), initial: (ws.names[sid] ?? studentAlias(sid))[0].toUpperCase(),
      convId: b.convs.find((c) => c.student_id === sid)?.id ?? null,
      lastMs, nextMs: upcoming ? Date.parse(upcoming.starts_at) : null, nextApptId: upcoming?.id ?? null, status, sessionsHeld: held,
    };
  });
  const order = { "Follow-up due": 0, Ongoing: 1, New: 2, Paused: 3 } as const;
  rows.sort((x, y) => order[x.status] - order[y.status] || (x.nextMs ?? Infinity) - (y.nextMs ?? Infinity) || x.label.localeCompare(y.label));
  return {
    nowMs: now,
    rows,
    active: rows.filter((r) => r.status === "Ongoing" || r.status === "Follow-up due").length,
    followUpsThisWeek: rows.filter((r) => r.nextMs !== null && r.nextMs < now + 7 * DAY_MS && r.sessionsHeld > 0).length,
  };
}
