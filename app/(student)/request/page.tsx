import Link from "next/link";
import { redirect } from "next/navigation";
import { RequestView } from "@/components/request/RequestView";
import { getMyCounsellor } from "@/lib/counsellors";
import type { RequestStatus } from "@/lib/requests-shared";
import { shortName } from "@/lib/sessions";
import { createClient } from "@/lib/supabase/server";

const title = "Request support | Ilo";
const description = "Tell your campus counsellor a little about what's on your mind. Your request is locked on your device, and only they can read it.";
export const metadata = { title, description, openGraph: { title, description } };

export default async function RequestPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const counsellor = await getMyCounsellor<{ id: string; display_name: string }>(supabase, "id, display_name");
  if (!counsellor) {
    return (
      <main className="px-4 pt-10 text-center">
        <h1 className="font-display text-xl text-ilo-plum">No counsellor yet</h1>
        <p className="mt-2 text-xs leading-relaxed text-ilo-ink">There isn&apos;t a counsellor set up at your college yet. If you need to talk to someone now, call Tele-MANAS on <a href="tel:14416" className="font-bold underline">14416</a>.</p>
        <Link href="/home" className="mt-4 inline-block text-xs font-semibold text-ilo-plum underline">Back home</Link>
      </main>
    );
  }

  // Only the plain status is read here. What the student wrote stays locked.
  const { data: latest } = await supabase.from("support_requests").select("status, created_at").eq("student_id", user.id).eq("counsellor_id", counsellor.id).order("created_at", { ascending: false }).limit(1).maybeSingle();

  return (
    <RequestView
      userId={user.id}
      counsellor={{ id: counsellor.id, shortName: shortName(counsellor.display_name), fullName: counsellor.display_name }}
      latest={latest ? { status: latest.status as RequestStatus, createdMs: Date.parse(latest.created_at as string) } : null}
      nowMs={Date.now()}
    />
  );
}
