import { redirect } from "next/navigation";
import { RequestsBoard } from "@/components/counsellor/requests/RequestsBoard";
import { getRequests } from "@/lib/counsellor-requests";

const title = "Requests | Ilo counsellor space";
const description = "Read the support requests students send you, then accept them or refer them to a colleague or outside help. Private to your account.";
export const metadata = { title, description, openGraph: { title, description } };

export default async function RequestsPage() {
  const data = await getRequests();
  if (!data) redirect("/counsellor/login");
  return <RequestsBoard data={data} />;
}
