import { getWorkspace } from "@/lib/counsellor-data";
import { MODE_LABEL, studentAlias, studentLabel, type Appt } from "@/lib/counsellor-day";
import { whenLabel, type InboxConvo, type InboxEvent, type NextSession } from "@/lib/inbox-shared";
import { createClient } from "@/lib/supabase/server";

type ConvRow = { id: string; student_id: string };
type FlagRow = { conversation_id: string; pinned: boolean; urgent: boolean; archived: boolean; resolved: boolean; note: string };
type ApptRow = Pick<Appt, "id" | "student_id" | "starts_at" | "ends_at" | "mode" | "status" | "cancelled_at" | "created_at">;

export type Inbox = { convos: InboxConvo[]; selectedId: string | null; nowMs: number; setupNeeded: boolean };

// Loads the signed-in counsellor's conversations, flags, notes and sessions. Row-level security limits every query to their own rows.
// Message text is NOT loaded here: messages are locked end to end and live only on the counsellor's device.
// The message fields (last message, unread count...) start empty and are filled in on the device.
// Returns null when nobody is signed in as a counsellor.
export async function getInbox(selectedParam?: string): Promise<Inbox | null> {
  const ws = await getWorkspace();
  if (!ws) return null;
  const supabase = await createClient();
  const nowMs = ws.nowMs;

  const [convRes, flagRes, apptRes] = await Promise.all([
    supabase.from("conversations").select("id, student_id").eq("counsellor_id", ws.me.id),
    supabase.from("conversation_flags").select("conversation_id, pinned, urgent, archived, resolved, note").eq("counsellor_id", ws.me.id),
    supabase
      .from("appointments")
      .select("id, student_id, starts_at, ends_at, mode, status, cancelled_at, created_at")
      .eq("counsellor_id", ws.me.id)
      .order("starts_at", { ascending: true })
      .limit(1000),
  ]);

  const convs = (convRes.data ?? []) as ConvRow[];
  const setupNeeded = !!flagRes.error;
  const flags = new Map(((flagRes.error ? [] : flagRes.data ?? []) as FlagRow[]).map((f) => [f.conversation_id, f]));
  const appts = (apptRes.data ?? []) as ApptRow[];

  const byStudent = new Map<string, ApptRow[]>();
  for (const a of appts) { const l = byStudent.get(a.student_id); if (l) l.push(a); else byStudent.set(a.student_id, [a]); }

  const built: InboxConvo[] = convs.map((c) => {
    const f = flags.get(c.id);
    const mine = byStudent.get(c.student_id) ?? [];
    const upcoming = mine
      .filter((x) => x.status === "confirmed" && Date.parse(x.ends_at) > nowMs)
      .sort((x, y) => Date.parse(x.starts_at) - Date.parse(y.starts_at))[0];
    const next: NextSession | null = upcoming ? { startMs: Date.parse(upcoming.starts_at), endMs: Date.parse(upcoming.ends_at), mode: upcoming.mode } : null;
    const held = mine.filter((x) => x.status === "completed" || (x.status === "confirmed" && Date.parse(x.ends_at) <= nowMs)).length;

    const events: InboxEvent[] = [];
    for (const x of mine) {
      const when = whenLabel(Date.parse(x.starts_at));
      events.push({ id: `b-${x.id}`, at: Date.parse(x.created_at), text: `Session booked · ${when} · ${MODE_LABEL[x.mode]}` });
      if (x.status === "cancelled" && x.cancelled_at) events.push({ id: `x-${x.id}`, at: Date.parse(x.cancelled_at), text: `Session cancelled · ${when}` });
    }
    events.sort((p, q) => p.at - q.at);

    return {
      id: c.id,
      alias: studentLabel(c.student_id, ws.names),
      initial: (ws.names[c.student_id] ?? studentAlias(c.student_id))[0].toUpperCase(),
      lastBody: "", lastRole: null, lastAt: 0, firstAt: 0, unread: 0, everReplied: false,
      pinned: f?.pinned ?? false,
      urgent: f?.urgent ?? false,
      archived: f?.archived ?? false,
      resolved: f?.resolved ?? false,
      note: f?.note ?? "",
      sessionsHeld: held,
      next,
      events: events.slice(-8),
    };
  });

  const selectedId = selectedParam && built.some((c) => c.id === selectedParam) ? selectedParam : null;
  return { convos: built, selectedId, nowMs, setupNeeded };
}
