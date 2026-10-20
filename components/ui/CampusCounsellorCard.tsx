import Link from "next/link";
import { CalendarDays, Clock, MessageCircle, Phone } from "lucide-react";
import { Lavender } from "@/components/ui/Lavender";
import { presenceLabel, type AvailSlot } from "@/lib/booking";

export type CardCounsellor = {
  display_name: string;
  qualification: string | null;
  counsellor_availability: AvailSlot[] | null;
};

const pill = "flex h-9 items-center justify-center gap-1.5 rounded-full text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export function CampusCounsellorCard({ counsellor }: { counsellor: CardCounsellor | null }) {
  const initials = (counsellor?.display_name ?? "")
    .split(" ")
    .filter((w) => !/^(dr|prof|mr|ms|mrs)\.?$/i.test(w))
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <section aria-labelledby="campus" className="relative mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-ilo-plum to-ilo-deep p-4 text-white shadow-md">
      <Lavender className="pointer-events-none absolute -bottom-3 right-2 h-28 w-auto opacity-25" />

      <p className="relative text-[10px] font-semibold uppercase tracking-wider text-pink-300">On-campus professional support</p>
      <h2 id="campus" className="relative mt-2 font-display text-[1.15rem] leading-tight">Reach the counsellor on your campus</h2>

      {counsellor ? (
        <div className="relative">
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f3dfee] font-display text-sm text-ilo-plum" aria-hidden="true">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold">
                {counsellor.display_name}
                {counsellor.qualification && <span className="font-semibold text-pink-300"> · {counsellor.qualification}</span>}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/80">
                <Clock className="h-3 w-3 shrink-0" /> {presenceLabel(counsellor.counsellor_availability ?? [], Date.now())}
              </p>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <Link href="/sessions/book" className={`${pill} flex-1 bg-white text-ilo-plum`}>
              <CalendarDays className="h-3.5 w-3.5" /> Book a session
            </Link>
            <Link href="/messages" className={`${pill} flex-1 bg-ilo-deep/80 text-white`}>
              <MessageCircle className="h-3.5 w-3.5" /> Message
            </Link>
          </div>
          <Link href="/sessions/book?mode=phone" className={`${pill} mt-2 w-full border border-white/30 text-white`}>
            <Phone className="h-3.5 w-3.5" /> Request a call
          </Link>
        </div>
      ) : (
        <p className="relative mt-3 text-xs leading-relaxed text-white/80">
          Your college hasn&apos;t added a counsellor yet. Use the helpline below if you need someone now.
        </p>
      )}
    </section>
  );
}
