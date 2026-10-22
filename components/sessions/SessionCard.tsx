import Link from "next/link";
import { Clock, MapPin, MessageCircle, Phone, Video } from "lucide-react";
import { CancelButton } from "@/components/sessions/CancelButton";
import { JoinSessionButton } from "@/components/call/JoinSessionButton";
import { canChange, friendlyWhen, shortName } from "@/lib/sessions";

export type SessionRow = {
  id: string;
  counsellor_id: string;
  starts_at: string;
  ends_at: string;
  mode: "in_person" | "video" | "phone";
  status: "confirmed" | "cancelled" | "completed";
  student_note: string | null;
  counsellor: { display_name: string; qualification: string | null; designation: string | null; room: string | null } | null;
};

const MODE_LABEL = { in_person: "In-Person", video: "Video call", phone: "Phone call" } as const;
const chip = "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide";

function Where({ s }: { s: SessionRow }) {
  if (s.mode === "in_person") return <><MapPin className="h-3.5 w-3.5 shrink-0" /> {s.counsellor?.room ?? "On campus"}</>;
  if (s.mode === "video") return <><Video className="h-3.5 w-3.5 shrink-0" /> Online session</>;
  return <><Phone className="h-3.5 w-3.5 shrink-0" /> Your counsellor will call you</>;
}

export function UpcomingCard({ s, nowMs }: { s: SessionRow; nowMs: number }) {
  const start = Date.parse(s.starts_at);
  const c = s.counsellor;
  const editable = canChange(start, nowMs);

  return (
    <article className="rounded-2xl border border-ilo-plum/15 bg-white p-4 shadow-[0_0_0_3px_rgba(107,42,103,0.05)]">
      <div className="flex items-start justify-between">
        <span className={`${chip} bg-ilo-blush text-ilo-plum`}>Confirmed slot</span>
        <span className="rounded-md bg-ilo-blush/70 px-2 py-0.5 text-[10px] font-medium text-ilo-ink">{MODE_LABEL[s.mode]}</span>
      </div>
      <h3 className="mt-2 text-sm font-bold text-ilo-plum">{c?.display_name ?? "Campus counsellor"}</h3>
      <p className="text-[11px] text-ilo-ink/70">{[c?.qualification, c?.designation].filter(Boolean).join(" · ")}</p>

      <div className="mt-3 space-y-1.5 rounded-xl border border-ilo-plum/10 p-3 text-xs text-ilo-ink">
        <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 shrink-0" /> {friendlyWhen(start, nowMs)}</p>
        <p className="flex items-center gap-2"><Where s={s} /></p>
      </div>

      {s.student_note && c && (
        <p className="mt-3 text-[11px] italic leading-snug text-ilo-ink/80">Note to {shortName(c.display_name)}: “{s.student_note}”</p>
      )}

      <div className="mt-3 flex gap-2">
        <Link href={`/messages?c=${s.counsellor_id}`} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-ilo-plum text-xs font-bold text-white">
          <MessageCircle className="h-3.5 w-3.5" /> Message
        </Link>
        {editable && (
          <Link href={`/sessions/book?reschedule=${s.id}`} className="flex h-9 flex-1 items-center justify-center rounded-full border border-ilo-plum/20 bg-white text-xs font-semibold text-ilo-plum">
            Reschedule
          </Link>
        )}
      </div>
      {(s.mode === "video" || s.mode === "phone") && (
        <div className="mt-3">
          <JoinSessionButton appointmentId={s.id} kind={s.mode === "video" ? "video" : "audio"} startsAtMs={start} endsAtMs={Date.parse(s.ends_at)} />
        </div>
      )}
      {editable ? (
        <CancelButton id={s.id} />
      ) : (
        <p className="mt-3 text-center text-[10px] text-ilo-ink/60">Too close to the start to change online. Message your counsellor.</p>
      )}
    </article>
  );
}

export function PastCard({ s, nowMs }: { s: SessionRow; nowMs: number }) {
  const cancelled = s.status === "cancelled";
  return (
    <article className="flex items-center justify-between gap-3 rounded-xl border border-ilo-plum/10 bg-white p-3">
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-ilo-plum">{s.counsellor?.display_name ?? "Campus counsellor"}</p>
        <p className="mt-0.5 text-[11px] text-ilo-ink/70">{friendlyWhen(Date.parse(s.starts_at), nowMs)}</p>
      </div>
      <span className={`${chip} shrink-0 ${cancelled ? "bg-ilo-crisis/10 text-ilo-crisis" : "bg-ilo-blush text-ilo-plum"}`}>
        {cancelled ? "Cancelled" : "Past session"}
      </span>
    </article>
  );
}
