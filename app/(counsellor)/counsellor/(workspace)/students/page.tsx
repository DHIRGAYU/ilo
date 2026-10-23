import { redirect } from "next/navigation";
import { StudentsTable } from "@/components/counsellor/students/StudentsTable";
import { getCaseload } from "@/lib/counsellor-schedule";

const title = "Students | Ilo counsellor space";
const description = "See everyone you support at a glance: last and next sessions, who is due a follow-up, and a quick way back into each conversation.";
export const metadata = { title, description, openGraph: { title, description } };

export default async function StudentsPage() {
  const data = await getCaseload();
  if (!data) redirect("/counsellor/login");
  return <StudentsTable data={data} />;
}
