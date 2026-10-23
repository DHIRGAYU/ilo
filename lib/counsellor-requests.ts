import { getWorkspace } from "@/lib/counsellor-data";
import { studentLabel } from "@/lib/counsellor-day";
import type { RequestStatus } from "@/lib/requests-shared";
import { createClient } from "@/lib/supabase/server";

export type RequestRow = {
  id: string; studentId: string; label: string; convId: string; status: RequestStatus; createdMs: number;
  ciphertext: string; nonce: string; senderKey: string; // locked on the student's device; opened on the counsellor's
};
export type Requests = { meId: string; nowMs: number; rows: RequestRow[]; colleagues: { id: string; name: string }[]; college: string; ready: boolean };

// Loads the requests sent to the signed-in counsellor. Row-level security limits every query to their own rows.
// What the student wrote is locked: it is opened on the counsellor's device, never on the server.
export async function getRequests(): Promise<Requests | null> {
  const ws = await getWorkspace();
  if (!ws) return null;
  const supabase = await createClient();
  const { data: me } = await supabase.from("counsellors").select("institution_id").eq("id", ws.me.id).maybeSingle();
  const [reqRes, colRes] = await Promise.all([
    supabase.from("support_requests")
      .select("id, student_id, conversation_id, status, ciphertext, nonce, sender_public_key, created_at")
      .eq("counsellor_id", ws.me.id).order("created_at", { ascending: false }).limit(200),
    me?.institution_id
      ? supabase.from("counsellors").select("id, display_name").eq("institution_id", me.institution_id).eq("is_active", true).neq("id", ws.me.id).order("sort_order")
      : Promise.resolve({ data: [] as { id: string; display_name: string }[] }),
  ]);
  const ready = !reqRes.error; // false until 0017_support_requests.sql has been run
  type Row = { id: string; student_id: string; conversation_id: string; status: RequestStatus; ciphertext: string; nonce: string; sender_public_key: string; created_at: string };
  const rows = ((ready ? reqRes.data : []) ?? []) as Row[];
  return {
    meId: ws.me.id,
    nowMs: ws.nowMs,
    college: ws.college,
    ready,
    colleagues: ((colRes.data ?? []) as { id: string; display_name: string }[]).map((c) => ({ id: c.id, name: c.display_name })),
    rows: rows.map((r) => ({
      id: r.id, studentId: r.student_id, label: studentLabel(r.student_id, ws.names), convId: r.conversation_id, status: r.status,
      createdMs: Date.parse(r.created_at), ciphertext: r.ciphertext, nonce: r.nonce, senderKey: r.sender_public_key,
    })),
  };
}
