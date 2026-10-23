import { cache } from "react";
import { buildDashboard, studentLabel, type Appt, type Convo, type Msg } from "@/lib/counsellor-day";
import { shortName } from "@/lib/sessions";
import { createClient } from "@/lib/supabase/server";



// Loads the signed-in counsellor and everything the workspace needs, once per request.
// Row-level security means a counsellor only ever receives their own appointments and conversations.
// Returns null when nobody is signed in or the account is not a linked counsellor.
export const getWorkspace = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: me } = await supabase
    .from("counsellors")
    .select("id, display_name, institution_id, caseload_capacity, counsellor_availability(weekday, start_time, end_time)")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!me) return null;

  const nowMs = Date.now();
  const [{ data: inst }, { data: appts }, { data: convos }] = await Promise.all([
    supabase.from("institutions").select("name").eq("id", me.institution_id).maybeSingle(),
    supabase
      .from("appointments")
      .select("id, student_id, starts_at, ends_at, mode, status, cancelled_at, created_at")
      .eq("counsellor_id", me.id)
      .order("starts_at", { ascending: true })
      .limit(1000),
    supabase.from("conversations").select("id, student_id, counsellor_last_read_at").eq("counsellor_id", me.id),
  ]);

  const { data: nameRows } = await supabase.rpc("counsellor_student_names");
  const names: Record<string, string> = Object.fromEntries(
    ((nameRows ?? []) as { student_id: string; full_name: string | null }[]).filter((r) => r.full_name).map((r) => [r.student_id, r.full_name as string]),
  );
  const dash = buildDashboard({
    appts: (appts ?? []) as Appt[],
    convos: (convos ?? []) as Convo[],
    msgs: [] as Msg[],
    availability: me.counsellor_availability ?? [],
    capacity: me.caseload_capacity ?? 25,
    nowMs, names,

  });
  const { count: newRequests } = await supabase.from("support_requests").select("id", { count: "exact", head: true }).eq("counsellor_id", me.id).eq("status", "new");
  dash.triage = newRequests ?? 0;
  const { data: recs } = await supabase.from("session_records").select("appointment_id").eq("counsellor_id", me.id).eq("follow_up", true);
  if (recs?.length) {
    const flagged = new Set(recs.map((r: { appointment_id: string }) => r.appointment_id));
    const list = (appts ?? []) as { id: string; student_id: string; status: string; ends_at: string }[];
    const waiting = new Set<string>();
    for (const a of list) if (flagged.has(a.id)) waiting.add(a.student_id);
    for (const a of list) if (a.status === "confirmed" && Date.parse(a.ends_at) > nowMs) waiting.delete(a.student_id);
    dash.followUps = waiting.size;
  }

  const initials = me.display_name
    .split(" ")
    .filter((w: string) => !/^(dr|prof|mr|ms|mrs)\.?$/i.test(w))
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return {
    me: { id: me.id as string, fullName: me.display_name as string, shortName: shortName(me.display_name), initials },
    college: (inst?.name as string | undefined) ?? "your institution",
    userId: user.id,
    dash,
    labels: Object.fromEntries((convos ?? []).map((c: any) => [c.id as string, studentLabel(c.student_id as string, names)])) as Record<string, string>, names,
    nowMs,
  };
});
