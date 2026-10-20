import Image from "next/image";
import { Bell, CalendarDays, ChevronRight, MessageSquare, Phone, ShieldCheck } from "lucide-react";
import { pill } from "./styles";

// Static sample of the student app. Not interactive.
export function PhoneMockup() {
  return (
    <figure className="mx-auto w-full max-w-sm min-w-0">
      <div
        role="img"
        aria-label="Sample screen of the ilo student app: Dr. Shalini, a campus counsellor, is online, with Book, Message and Call options and an upcoming confidential session."
        className="rounded-[2rem] border border-ilo-plum/10 bg-white p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="" width={96} height={48} className="h-6 w-auto" />
            <span className={`${pill} px-2 py-0.5 text-[9px]`}>Your campus</span>
          </div>
          <Bell className="size-4 text-ilo-ink" aria-hidden="true" />
        </div>

        <div className="mt-4 rounded-2xl bg-linear-to-br from-ilo-plum to-ilo-deep p-5 text-white">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">
            <span>Campus care</span>
            <ShieldCheck className="size-4" aria-hidden="true" />
          </div>
          <p className="mt-4 font-display text-2xl leading-snug">Reach the counsellor on your campus.</p>
          <p className="mt-3 text-xs leading-relaxed text-white/70">
            Dr. Shalini is online today for audio, chat or quiet room visits.
          </p>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            [CalendarDays, "Book"],
            [MessageSquare, "Message"],
            [Phone, "Call"],
          ].map(([Icon, label]) => {
            const I = Icon as typeof Phone;
            return (
              <div key={label as string} className="flex flex-col items-center gap-1 rounded-xl bg-ilo-blush/50 py-3 text-[11px] font-semibold text-ilo-deep">
                <I className="size-4" aria-hidden="true" />
                {label as string}
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-xl border border-ilo-plum/10 p-3">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-ilo-ink">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-ilo-crisis" aria-hidden="true" />
              Upcoming safe session
            </span>
            <span className="normal-case tracking-normal text-ilo-deep">Tomorrow</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ilo-blush text-xs font-semibold text-ilo-plum">S</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ilo-deep">Dr. Shalini K.</p>
              <p className="truncate text-[11px] text-ilo-ink">Hostel Block 4 &middot; Confidential</p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-ilo-ink" aria-hidden="true" />
          </div>
        </div>

        <p className="mt-4 flex items-center gap-1.5 text-[11px] text-ilo-ink">
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
          Strict institutional alias &middot; Zero admin visibility
        </p>
      </div>
      <figcaption className="mt-3 text-center text-xs text-ilo-ink">Sample screen</figcaption>
    </figure>
  );
}
