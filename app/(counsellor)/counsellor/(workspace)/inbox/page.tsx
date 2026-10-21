import { redirect } from "next/navigation";
import { InboxView } from "@/components/counsellor/inbox/InboxView";
import { getInbox } from "@/lib/counsellor-inbox";

const title = "Inbox | Ilo counsellor space";
const description = "Read and reply to private student messages, see who is waiting, and keep notes only you can see. Your campus counselling inbox on Ilo.";
export const metadata = { title, description, openGraph: { title, description } };

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const inbox = await getInbox(c);
  if (!inbox) redirect("/counsellor/login");
  return <InboxView {...inbox} />;
}
