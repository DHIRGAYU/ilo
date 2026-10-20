import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getConversationMessages, getStudentContext } from "@/lib/counsellor-inbox";

// GET: load messages + context for a conversation (and mark as read)
export async function GET(request: NextRequest) {
  const convoId = request.nextUrl.searchParams.get("convoId");
  if (!convoId) {
    return NextResponse.json({ error: "Missing convoId" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Handle mock conversation
  if (convoId.startsWith("mock-")) {
    const studentId = `student-${convoId.replace("mock-", "")}`;
    const [messages, context] = await Promise.all([
      getConversationMessages(convoId),
      getStudentContext(studentId, user.id, convoId),
    ]);
    return NextResponse.json({ messages, context });
  }

  // Verify the conversation belongs to the current counsellor
  const { data: me } = await supabase
    .from("counsellors")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: convo } = await supabase
    .from("conversations")
    .select("id, student_id")
    .eq("id", convoId)
    .eq("counsellor_id", me.id)
    .maybeSingle();

  if (!convo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Mark as read in DB
  await supabase
    .from("conversations")
    .update({ counsellor_last_read_at: new Date().toISOString() })
    .eq("id", convoId);

  const [messages, context] = await Promise.all([
    getConversationMessages(convoId),
    getStudentContext(convo.student_id, me.id, convoId),
  ]);

  return NextResponse.json({ messages, context });
}

// PATCH: Mark conversation as read
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { conversationId } = body;
  if (!conversationId) {
    return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
  }

  if (conversationId.startsWith("mock-")) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("conversations")
    .update({ counsellor_last_read_at: new Date().toISOString() })
    .eq("id", conversationId);

  if (error) {
    console.warn("Could not update counsellor_last_read_at:", error.code, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// POST: send a message
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { conversationId, body: msgBody } = body;

  if (!conversationId || !msgBody) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Handle mock conversation
  if (conversationId.startsWith("mock-")) {
    return NextResponse.json({
      ok: true,
      messageId: `mock-msg-${Date.now()}`,
    });
  }

  const { data: me, error: meErr } = await supabase
    .from("counsellors")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (meErr) {
    console.warn("Error finding counsellor:", meErr.code, meErr.message);
  }
  if (!me) {
    console.warn("User is not a linked counsellor:", user.id);
    return NextResponse.json({ error: "Unauthorized: not a counsellor" }, { status: 401 });
  }

  // Verify ownership
  const { data: convo, error: convoErr } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("counsellor_id", me.id)
    .maybeSingle();

  if (convoErr) {
    console.warn("Error querying conversation:", convoErr.code, convoErr.message);
  }
  if (!convo) {
    console.warn("Conversation not found or not owned:", { conversationId, counsellorId: me.id });
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const clientId = crypto.randomUUID();

  // 1. Try counsellor_send_message RPC first (if migration 0005 has been executed)
  const { data: rpcData, error: rpcErr } = await supabase.rpc("counsellor_send_message", {
    p_conversation_id: conversationId,
    p_body: msgBody.slice(0, 2000),
    p_client_id: clientId,
  });

  if (!rpcErr && rpcData) {
    const msgId = (rpcData as { id?: string })?.id ?? `msg-${Date.now()}`;
    return NextResponse.json({ ok: true, messageId: msgId });
  }

  // 2. Try direct table insert
  const { data: msgRows, error: insertErr } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_role: "counsellor",
      body: msgBody.slice(0, 2000),
      client_id: clientId,
    })
    .select("id, created_at");

  if (!insertErr) {
    await supabase
      .from("conversations")
      .update({ counsellor_last_read_at: new Date().toISOString() })
      .eq("id", conversationId);

    const messageId = msgRows?.[0]?.id ?? `msg-${Date.now()}`;
    return NextResponse.json({ ok: true, messageId });
  }

  // If table insert failed due to 42501 permission denied
  console.warn("Insert error details:", insertErr.code, insertErr.message);
  return NextResponse.json({
    error: insertErr.message,
    code: insertErr.code,
    hint: "Please run supabase/migrations/0005_counsellor_messages.sql in your Supabase SQL Editor.",
  }, { status: 500 });
}
