import { redirect } from "next/navigation";
import { getInboxData, getConversationMessages, getStudentContext } from "@/lib/counsellor-inbox";
import { InboxShell } from "@/components/counsellor/InboxShell";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Inbox | Ilo counsellor space",
  description: "Private messages between you and your students.",
};

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ convo?: string }>;
}) {
  const data = await getInboxData();
  if (!data) redirect("/counsellor/login");

  const params = await searchParams;
  const convoId = params.convo ?? (data.conversations.length > 0 ? data.conversations[0].id : null);

  let initialMessages: Awaited<ReturnType<typeof getConversationMessages>> = [];
  let initialContext: Awaited<ReturnType<typeof getStudentContext>> | null = null;

  if (convoId) {
    const convo = data.conversations.find((c) => c.id === convoId);
    if (convo) {
      // Mark as read in the DB for the active conversation
      if (!convoId.startsWith("mock-")) {
        const supabase = await createClient();
        await supabase
          .from("conversations")
          .update({ counsellor_last_read_at: new Date().toISOString() })
          .eq("id", convoId);
      }

      // Immediately reflect read status in server-rendered props
      const prevUnread = convo.unread;
      convo.unread = 0;
      convo.status = convo.lastSender === "counsellor" ? "waiting" : "resolved";
      data.totalUnread = Math.max(0, data.totalUnread - prevUnread);

      const [msgs, ctx] = await Promise.all([
        getConversationMessages(convoId),
        getStudentContext(convo.studentId, data.counsellorId, convoId),
      ]);
      initialMessages = msgs;
      initialContext = ctx;
    }
  }

  return (
    <InboxShell
      conversations={data.conversations}
      totalUnread={data.totalUnread}
      nowMs={data.nowMs}
      counsellorId={data.counsellorId}
      initialMessages={initialMessages}
      initialContext={initialContext}
      initialConvoId={convoId}
    />
  );
}
