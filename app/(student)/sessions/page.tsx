import Link from "next/link";
import { CalendarCheck, ChevronRight, Lock, Plus } from "lucide-react";
import { BottomNav } from "@/components/ui/BottomNav";
import { PastCard, UpcomingCard, type SessionRow } from "@/components/sessions/SessionCard";
import { getMyCounsellor } from "@/lib/counsellors";
import { createClient } from "@/lib/supabase/server";

export default async function SessionsPage() {
  const supabase = await createClient();

  // Row-level security: a student only ever gets their own appointments
  const [{ data: rows }, primary] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, counsellor_id, starts_at, ends_at, mode, status, student_note, counsellor:counsellors(display_name, qualification, designation, room)")
      .order("starts_at", { ascending: true }),
    getMyCounsellor<{ display_name: string }>(supabase, "display_name"),
  ]);

  const nowMs = Date.now();
  const all = (rows ?? []) as unknown as SessionRow[];
  const upcoming = all.filter((s) => s.status === "confirmed" && Date.parse(s.ends_at) > nowMs);
  const past = all
    .filter((s) => !upcoming.includes(s))
    .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at))
    .slice(0, 10);
  const name = primary?.display_name;

  return (
    <main className="relative px-4 pb-44 pt-7">
      <header className="flex items-start justify-between gap-3 border-b border-ilo-plum/10 pb-3">
        <div>
          <h1 className="font-display text-xl leading-tight text-ilo-plum">Your Confidential Sessions</h1>
          <p className="mt-0.5 text-[10px] text-ilo-ink/70">Encrypted &amp; independent of college transcripts</p>
        </div>
        <Link href="/sessions/book" className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-ilo-plum px-3.5 text-xs font-bold text-white">
          <Plus className="h-3.5 w-3.5" /> Book
        </Link>
      </header>

      {name && (
        <Link href="/messages" className="mt-4 flex items-center gap-3 rounded-2xl border border-ilo-plum/15 bg-ilo-blush p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ilo-plum text-white"><Lock className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-ilo-plum">Open Continuity Thread</span>
            <span className="block text-[11px] leading-snug text-ilo-ink/80">Past reflections &amp; shared notes with {name}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-ilo-ink/70" />
        </Link>
      )}

      {upcoming.length > 0 ? (
        <section aria-labelledby="up" className="mt-5">
          <h2 id="up" className="font-display text-base text-ilo-plum">Upcoming {upcoming.length > 1 ? "Sessions" : "Session"}</h2>
          <div className="mt-2 space-y-3">{upcoming.map((s) => <UpcomingCard key={s.id} s={s} nowMs={nowMs} />)}</div>
        </section>
      ) : (
        <section className="mt-4 rounded-2xl border border-ilo-plum/10 bg-white px-5 py-6 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-ilo-blush text-ilo-plum"><CalendarCheck className="h-5 w-5" /></span>
          <h2 className="mt-3 font-display text-base text-ilo-plum">No sessions scheduled yet</h2>
          <p className="mx-auto mt-2 max-w-[28ch] text-[11px] leading-relaxed text-ilo-ink">
            When you book a private meeting with {name ?? "your counsellor"}, your upcoming slot and meeting location will appear right here.
          </p>
          <Link href="/sessions/book" className="mt-4 inline-flex h-9 items-center rounded-full bg-ilo-plum px-5 text-xs font-bold text-white">
            Book your first session
          </Link>
        </section>
      )}

      {past.length > 0 && (
        <section aria-labelledby="past" className="mt-6">
          <h2 id="past" className="font-display text-base text-ilo-plum">Past sessions</h2>
          <div className="mt-2 space-y-2">{past.map((s) => <PastCard key={s.id} s={s} nowMs={nowMs} />)}</div>
        </section>
      )}

      <p className="fixed inset-x-0 bottom-14 z-10 mx-auto flex w-full max-w-[375px] items-center justify-center gap-2 border-t border-ilo-plum/10 bg-white/95 px-4 py-2 text-center text-[10px] leading-snug text-ilo-ink backdrop-blur">
        <Lock className="h-3 w-3 shrink-0" />
        <span>Your college sees that counselling happened. <strong className="text-ilo-plum">Never who. Never what was said.</strong></span>
      </p>

      <BottomNav />
    </main>
  );
}
