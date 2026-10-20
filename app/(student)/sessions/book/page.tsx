import { redirect } from "next/navigation";
import { BookingFlow, type CounsellorOption, type ModeId, type RescheduleInfo } from "@/components/booking/BookingFlow";
import { getMyPrefs, rankCounsellors } from "@/lib/counsellors";
import { createClient } from "@/lib/supabase/server";
import { canChange, friendlyWhen } from "@/lib/sessions";

export default async function BookSessionPage({ searchParams }: { searchParams: Promise<{ mode?: string; reschedule?: string; counsellor?: string }> }) {
  const { mode, reschedule, counsellor: wanted } = await searchParams;
  const supabase = await createClient();
  const nowMs = Date.now();

  let initialMode: ModeId = mode === "phone" ? "phone" : mode === "video" ? "video" : "in_person";
  let info: RescheduleInfo | undefined;

  if (reschedule) {
    // Row-level security: only the student's own appointment can be found here
    const { data: appt } = await supabase
      .from("appointments")
      .select("id, counsellor_id, starts_at, mode, status")
      .eq("id", reschedule)
      .maybeSingle();
    if (!appt || appt.status !== "confirmed" || !canChange(Date.parse(appt.starts_at), nowMs)) redirect("/sessions");
    initialMode = appt.mode as ModeId;
    info = { id: appt.id, counsellorId: appt.counsellor_id, whenLabel: friendlyWhen(Date.parse(appt.starts_at), nowMs) };
  }

  const query = supabase
    .from("counsellors")
    .select("id, display_name, qualification, designation, languages, room, gender, sort_order, counsellor_availability(weekday, start_time, end_time)")
    .order("sort_order");
  const { data } = info ? await query.eq("id", info.counsellorId) : await query;

  // Best fit for the student's comfort preferences first; a counsellor chosen on the preferences screen goes to the top
  let list = (data ?? []) as unknown as (CounsellorOption & { gender: string | null; sort_order: number })[];
  if (!info) {
    list = rankCounsellors(list, await getMyPrefs(supabase));
    const i = list.findIndex((c) => c.id === wanted);
    if (i > 0) list = [list[i], ...list.slice(0, i), ...list.slice(i + 1)];
  }

  return <BookingFlow counsellors={list} nowMs={nowMs} initialMode={initialMode} reschedule={info} />;
}
