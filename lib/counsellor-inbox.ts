import { getWorkspace } from "@/lib/counsellor-data";
import { MODE_LABEL, studentAlias, studentLabel, type Appt } from "@/lib/counsellor-day";
import { whenLabel, type InboxConvo, type InboxEvent, type MessageRow, type NextSession, type Role } from "@/lib/inbox-shared";
import { createClient } from "@/lib/supabase/server";

type ConvRow = { id: string; student_id: string; counsellor_last_read_at: string | null };
type FlagRow = { conversation_id: string; pinned: boolean; urgent: boolean; archived: boolean; resolved: boolean; note: string };
type MsgRow = { conversation_id: string; sender_role: Role; body: string; created_at: string };
type ApptRow = Pick<Appt, "id" | "student_id" | "starts_at" | "ends_at" | "mode" | "status" | "cancelled_at" | "created_at">;

export type Inbox = {
  convos: InboxConvo[];
  selectedId: string | null;
  initialMessages: MessageRow[];
  nowMs: number;
  setupNeeded: boolean;
};

// Loads the signed-in counsellor's conversations. Row-level security means only their own rows come back.
// Returns null when nobody is signed in as a counsellor.
export async function getInbox(selectedParam?: string): Promise<Inbox | null> {
  const ws = await getWorkspace();
  if (!ws) return null;
  const supabase = await createClient();
  const nowMs = ws.nowMs;

  const [convRes, flagRes, apptRes] = await Promise.all([
    supabase.from("conversations").select("id, student_id, counsellor_last_read_at").eq("counsellor_id", ws.me.id),
    supabase.from("conversation_flags").select("conversation_id, pinned, urgent, archived, resolved, note").eq("counsellor_id", ws.me.id),
    supabase
      .from("appointments")
      .select("id, student_id, starts_at, ends_at, mode, status, cancelled_at, created_at")
      .eq("counsellor_id", ws.me.id)
      .order("starts_at", { ascending: true })
      .limit(1000),
  ]);

  const convs = (convRes.data ?? []) as ConvRow[];
  // If the 0010 migration has not been run yet the inbox still opens, read-only, and says so
  const setupNeeded = !!flagRes.error;
  const flags = new Map(((flagRes.error ? [] : flagRes.data ?? []) as FlagRow[]).map((f) => [f.conversation_id, f]));
  const appts = (apptRes.data ?? []) as ApptRow[];

  const ids = convs.map((c) => c.id);
  const { data: msgData } = ids.length
    ? await supabase
        .from("messages")
        .select("conversation_id, sender_role, body, created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false })
        .limit(2000)
    : { data: [] };

  // Messages arrive newest first, so the first one seen per conversation is the latest
  const acc = new Map<string, { body: string; role: Role; at: number; firstAt: number; replied: boolean; unread: number }>();
  const readAt = new Map(convs.map((c) => [c.id, c.counsellor_last_read_at ? Date.parse(c.counsellor_last_read_at) : 0]));
  for (const m of (msgData ?? []) as MsgRow[]) {
    const at = Date.parse(m.created_at);
    let a = acc.get(m.conversation_id);
    if (!a) { a = { body: m.body, role: m.sender_role, at, firstAt: at, replied: false, unread: 0 }; acc.set(m.conversation_id, a); }
    a.firstAt = at;
    if (m.sender_role === "counsellor") a.replied = true;
    else if (at > (readAt.get(m.conversation_id) ?? 0)) a.unread++;
  }

  const byStudent = new Map<string, ApptRow[]>();
  for (const a of appts) { const l = byStudent.get(a.student_id); if (l) l.push(a); else byStudent.set(a.student_id, [a]); }

  const built: InboxConvo[] = convs.map((c) => {
    const a = acc.get(c.id);
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
      lastBody: a?.body ?? "",
      lastRole: a?.role ?? null,
      lastAt: a?.at ?? 0,
      firstAt: a?.firstAt ?? 0,
      unread: a?.unread ?? 0,
      everReplied: a?.replied ?? false,
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
  let initialMessages: MessageRow[] = [];
  if (selectedId) {
    const { data } = await supabase
      .from("messages")
      .select("id, sender_role, body, created_at, client_id")
      .eq("conversation_id", selectedId)
      .order("created_at", { ascending: false })
      .limit(200);
    initialMessages = ((data ?? []) as MessageRow[]).reverse();
  }

  return { convos: built, selectedId, initialMessages, nowMs, setupNeeded };
}
