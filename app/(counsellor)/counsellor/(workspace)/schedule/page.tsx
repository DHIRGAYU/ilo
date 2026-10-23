import { redirect } from "next/navigation";
import { ScheduleView } from "@/components/counsellor/schedule/ScheduleView";
import { getSchedule } from "@/lib/counsellor-schedule";

const title = "Schedule | Ilo counsellor space";
const description = "See your week at a glance, book, move or cancel sessions for your students, and set the hours students can book with you.";
export const metadata = { title, description, openGraph: { title, description } };

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ book?: string; resched?: string }> }) {
  const { book, resched } = await searchParams;
  const data = await getSchedule();
  if (!data) redirect("/counsellor/login");
  return <ScheduleView {...data} openBook={book ?? null} openReschedule={resched ?? null} />;
}
