import { notFound, redirect } from "next/navigation";
import { SessionWorkspace } from "@/components/counsellor/session/SessionWorkspace";
import { getSession } from "@/lib/counsellor-schedule";

const title = "Session | Ilo counsellor space";
const description = "Your private workspace for one session: join the call, write notes only you can read, record how it went, and plan the next step.";
export const metadata = { title, description, openGraph: { title, description } };

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getSession(id);
  if (!data) {
    // Not signed in as a counsellor, or not one of this counsellor's sessions
    const { getWorkspace } = await import("@/lib/counsellor-data");
    if (!(await getWorkspace())) redirect("/counsellor/login");
    notFound();
  }
  return <SessionWorkspace data={data} />;
}
