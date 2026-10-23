import { Heart, Settings2, Sparkles, Activity, BookOpen, ShieldCheck, ArrowUpRight } from "lucide-react";
import { BottomNav } from "@/components/ui/BottomNav";
import { createClient } from "@/lib/supabase/server";
import { CampusCounsellorCard, type CardCounsellor } from "@/components/ui/CampusCounsellorCard";
import { getMyCounsellor } from "@/lib/counsellors";

// Mock data – replace with Supabase queries in phase 2

const options = [
  { title: "Quick self-check", sub: "Not a diagnosis", icon: Activity, href: "/self-check" },
  { title: "What am I feeling?", sub: "Find a starting point", icon: Sparkles, href: "/feelings" },
  { title: "Browse resources", sub: "Read at your pace", icon: BookOpen, href: "/learn" },
  { title: "Counsellor preferences", sub: "Your comfort comes first", icon: Settings2, href: "/profile/comfort" },
];

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? "";
  const firstName = fullName.split(" ")[0] || "there";

  // The counsellor who best fits the student's comfort preferences, from their own college
  const counsellor = await getMyCounsellor<CardCounsellor>(supabase, "display_name, qualification, counsellor_availability(weekday, start_time, end_time)");

  const today = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <main className="relative px-4 pb-36 pt-7">
      <div className="flex items-start justify-between">
        <p className="pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-ilo-ink/70">{today}</p>
        <span className="flex items-center gap-1 rounded-full border border-ilo-plum/15 bg-ilo-blush px-2.5 py-0.5 text-[10px] font-semibold text-ilo-plum">
          <ShieldCheck className="h-3 w-3" /> Signed in privately
        </span>
      </div>

      <h1 className="mt-3 font-display text-[1.55rem] leading-tight text-ilo-plum">Good to see you, {firstName}.</h1>
      <p className="mt-0.5 text-xs text-ilo-ink/70">Your private space is ready when you are.</p>

      <CampusCounsellorCard counsellor={counsellor} />
      <a href="/request" className="mt-2 flex items-center justify-between rounded-xl border border-ilo-plum/10 bg-white px-3 py-2.5 text-[11px] text-ilo-ink/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ilo-plum">
        Can&apos;t find a time that works? <span className="font-bold text-ilo-plum">Send a request →</span>
      </a>

      <div className="mt-5 flex items-baseline justify-between">
        <h2 className="text-xs font-bold text-ilo-plum">Not sure where to start?</h2>
        <span className="text-[10px] text-ilo-ink/60">Optional, private, yours</span>
      </div>

      <ul className="mt-2.5 grid grid-cols-2 gap-2">
        {options.map(({ title, sub, icon: Icon, href }) => (
          <li key={title}>
            <a href={href} className="relative flex h-full min-h-[7rem] flex-col rounded-xl border border-ilo-plum/10 bg-white p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ilo-plum">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ilo-blush text-ilo-plum">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="mt-2 text-xs font-bold leading-snug text-ilo-plum">{title}</span>
              <span className="mt-0.5 text-[10px] text-ilo-ink/70">{sub}</span>
              <ArrowUpRight className="absolute bottom-2.5 right-2.5 h-3.5 w-3.5 text-ilo-plum" />
            </a>
          </li>
        ))}
      </ul>

      {/* Crisis support: always reachable */}
      <section className="mt-4 rounded-xl bg-ilo-blush p-3 text-xs">
        <p className="font-bold text-ilo-plum">Need help right now?</p>
        <p className="mt-0.5 text-[11px] text-ilo-ink/80">
          Call Tele-MANAS on <a className="font-bold underline" href="tel:14416">14416</a>, free and open 24×7.
        </p>
      </section>

      <a
        href="tel:14416"
        className="fixed bottom-16 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ilo-crisis px-4 py-2 text-xs font-bold text-white shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ilo-crisis"
      >
        <Heart className="h-3.5 w-3.5" /> Need help now
      </a>

      <BottomNav />
    </main>
  );
}
