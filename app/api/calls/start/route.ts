import { NextResponse } from "next/server";
import { createDailyRoom, createDailyToken, dailyConfigured, roomUrl } from "@/lib/daily";
import { createClient } from "@/lib/supabase/server";

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

// Starts a call (or joins the one already open) after the database confirms this person is allowed to.
export async function POST(request: Request) {
  if (!dailyConfigured()) return fail("not_configured", 503);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("unauthorized", 401);

  const body = (await request.json().catch(() => ({}))) as { conversationId?: string; counsellorId?: string; appointmentId?: string; kind?: string };
  const kind = body.kind === "audio" ? "audio" : "video";

  const { data, error } = await supabase.rpc("start_call", {
    p_conversation_id: body.conversationId ?? null,
    p_counsellor_id: body.counsellorId ?? null,
    p_appointment_id: body.appointmentId ?? null,
    p_kind: kind,
    p_room_name: `ilo-${crypto.randomUUID()}`,
  });
  if (error) {
    const known = ["rate_limited", "too_early", "not_allowed"].find((k) => error.message.includes(k));
    return fail(known ?? "start_failed", known === "rate_limited" ? 429 : known === "not_allowed" ? 403 : 400);
  }
  const call = data as { call_id: string; room_name: string; kind: "audio" | "video"; role: "student" | "counsellor"; status: string; created: boolean };

  if (call.created) {
    try {
      await createDailyRoom(call.room_name);
    } catch {
      await supabase.rpc("end_call", { p_call_id: call.call_id });
      return fail("provider_failed", 502);
    }
  }

  const { data: ctx } = await supabase.rpc("call_context", { p_call_id: call.call_id });
  const c = ctx as { my_name: string; peer_name: string };

  let token: string | null = null;
  try {
    token = await createDailyToken({ roomName: call.room_name, userName: c.my_name, userId: user.id, isOwner: call.role === "counsellor", audioOnly: call.kind === "audio" });
  } catch {
    token = null; // we will ask again once the call is answered
  }

  return NextResponse.json({ callId: call.call_id, kind: call.kind, role: call.role, status: call.status, peerName: c.peer_name, roomUrl: roomUrl(call.room_name), token });
}
