import { NextResponse } from "next/server";
import { createDailyToken, dailyConfigured, roomUrl } from "@/lib/daily";
import { createClient } from "@/lib/supabase/server";

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

// Gives one person a pass into a call they are part of. The person being called gets it only after answering.
export async function POST(request: Request) {
  if (!dailyConfigured()) return fail("not_configured", 503);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("unauthorized", 401);

  const { callId } = (await request.json().catch(() => ({}))) as { callId?: string };
  if (!callId) return fail("not_allowed", 400);

  const { data, error } = await supabase.rpc("call_context", { p_call_id: callId });
  if (error || !data) return fail("not_allowed", 403);
  const ctx = data as { role: "student" | "counsellor"; kind: "audio" | "video"; status: string; room_name: string; initiated_by: string; my_name: string };

  if (ctx.status !== "ringing" && ctx.status !== "active") return fail("call_over", 410);
  if (ctx.status === "ringing" && ctx.initiated_by !== ctx.role) return fail("not_answered", 403);

  try {
    const token = await createDailyToken({ roomName: ctx.room_name, userName: ctx.my_name, userId: user.id, isOwner: ctx.role === "counsellor", audioOnly: ctx.kind === "audio" });
    return NextResponse.json({ roomUrl: roomUrl(ctx.room_name), token });
  } catch {
    return fail("provider_failed", 502);
  }
}
