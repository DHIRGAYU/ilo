import Link from "next/link";
import { ChatView, type ChatCounsellor, type MessageRow } from "@/components/chat/ChatView";
import { getMyCounsellor } from "@/lib/counsellors";
import { createClient } from "@/lib/supabase/server";

const COLS = "id, display_name, designation, counsellor_availability(weekday, start_time, end_time)";

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const supabase = await createClient();

  // Row-level security limits every query here to the student's own college and own conversations
  let counsellor: ChatCounsellor | null = null;
  if (c) {
    const { data } = await supabase.from("counsellors").select(COLS).eq("id", c).maybeSingle();
    counsellor = data as ChatCounsellor | null;
  }
  if (!counsellor) counsellor = await getMyCounsellor<ChatCounsellor>(supabase, COLS);

  if (!counsellor) {
    return (
      <main className="px-6 pt-16 text-center">
        <p className="text-sm text-ilo-ink">Your college hasn&apos;t added a counsellor yet.</p>
        <Link href="/home" className="mt-4 inline-block text-xs font-bold text-ilo-plum">Back to home</Link>
      </main>
    );
  }

  const { data: conv } = await supabase.from("conversations").select("id").eq("counsellor_id", counsellor.id).maybeSingle();
  let initial: MessageRow[] = [];
  if (conv) {
    const { data } = await supabase
      .from("messages")
      .select("id, sender_role, body, created_at, client_id")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: false })
      .limit(200);
    initial = ((data ?? []) as MessageRow[]).reverse();
  }

  return <ChatView counsellor={counsellor} conversationId={conv?.id ?? null} initial={initial} nowMs={Date.now()} />;
}
