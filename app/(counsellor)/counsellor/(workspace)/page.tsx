import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ArrowUpRight, CalendarDays, Clock, Heart, MessageCircle, Sparkles, User } from "lucide-react";
import { getWorkspace } from "@/lib/counsellor-data";
import { MODE_LABEL, ago } from "@/lib/counsellor-day";
import { JoinSessionButton } from "@/components/call/JoinSessionButton";

export const metadata = { title: "Dashboard | Ilo counsellor space", description: "Your day at a glance: sessions, messages and what needs attention." };

const two = (n: number) => String(n).padStart(2, "0");
const card = "rounded-2xl border border-ilo-plum/10 bg-white p-5 shadow-sm";
const unit = (n: number, one: string, many: string) => (n === 1 ? one : many);

function Stat({ label, value, sub, icon: Icon }: { label: string; value: number; sub: string; icon: typeof Clock }) {
  return (
    <div className="rounded-2xl border border-ilo-plum/10 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ilo-ink/60">{label}</p>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ilo-blush text-ilo-plum"><Icon className="h-3.5 w-3.5" /></span>
      </div>
      <p className="mt-2 font-display text-3xl leading-none text-ilo-deep">{two(value)}</p>
      <p className="mt-1 text-[11px] text-ilo-ink/70">{sub}</p>
    </div>
  );
}

function inLabel(m: number) {
  if (m < 60) return `${m} ${unit(m, "MINUTE", "MINUTES")}`;
  return `${Math.floor(m / 60)} HR ${m % 60} MIN`;
}

export default async function DashboardPage() {
  const ws = await getWorkspace();
  if (!ws) redirect("/counsellor/login");
  const { dash: d, me, college, nowMs } = ws;
  const n = d.sessions.length;
  const [first, ...rest] = me.shortName.split(" ");
  const lastName = rest.join(" ");
  const nx = d.next;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ilo-ink/60">{d.dateLabel}</p>
          <h1 className="mt-1 font-display text-3xl leading-tight text-ilo-deep lg:text-4xl">
            Good {d.greeting}, <span className="text-ilo-plum">{lastName ? `${first} ${lastName}` : first}.</span>
          </h1>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-ilo-ink/70">
            At {college}, {n > 0 ? "a steady day ahead" : "a quiet day ahead"}. Take each conversation at its own pace — this space is yours.
          </p>
        </div>
        <p className="flex w-fit shrink-0 items-center gap-2 rounded-xl border border-ilo-plum/10 bg-white px-3 py-2 text-xs font-semibold text-ilo-plum shadow-sm">
          <CalendarDays className="h-3.5 w-3.5" /> {d.dateChip}
        </p>
      </header>

      <section aria-label="Today at a glance" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sessions today" value={n} sub="on your calendar" icon={CalendarDays} />
        <Stat label="Unread" value={d.unread} sub="private messages" icon={MessageCircle} />
        <Stat label="Awaiting triage" value={d.triage} sub="new requests" icon={Clock} />
        <Stat label="Follow-ups due" value={d.followUps} sub="arrive with session notes" icon={Heart} />
      </section>

      <section aria-labelledby="next-title" className="relative mt-5 overflow-hidden rounded-3xl bg-gradient-to-br from-ilo-plum to-ilo-deep p-6 text-white shadow-lg lg:p-8">
        <span className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10" aria-hidden="true" />
        <span className="pointer-events-none absolute -right-4 -top-12 h-48 w-48 rounded-full border border-white/10" aria-hidden="true" />
        {nx ? (
          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-pink-300">
                {nx.inProgress ? "Session in progress" : nx.isToday ? `Next session · in ${inLabel(nx.minutesUntil)}` : `Next session · ${nx.dayLabel} ${nx.timeLabel}`}
              </p>
              <h2 id="next-title" className="mt-2 font-display text-2xl lg:text-3xl">Room to pause, together.</h2>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-white/80">
                A quiet check-in with {nx.alias}. {nx.mode === "video" ? "Your private room is ready when you are." : nx.mode === "phone" ? "You'll be calling them at the start time." : "You'll be meeting in person."}
              </p>
              {nx.mode !== "in_person" && (
                <div className="mt-4">
                  <JoinSessionButton appointmentId={nx.id} kind={nx.mode === "video" ? "video" : "audio"} startsAtMs={nx.startMs} endsAtMs={nx.startMs + 45 * 60_000} variant="light" label={nx.mode === "video" ? "Join private room" : "Start call"} />
                </div>
              )}
            </div>
            <dl className="relative flex items-center gap-6 lg:gap-8">
              <span className="hidden h-12 w-12 items-center justify-center rounded-full bg-white/15 sm:flex" aria-hidden="true"><User className="h-5 w-5" /></span>
              <div><dt className="text-[10px] font-bold uppercase tracking-wider text-white/60">Student</dt><dd className="mt-1 text-xs font-bold">{nx.alias}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase tracking-wider text-white/60">Starts</dt><dd className="mt-1 text-xs font-bold">{nx.timeLabel.toUpperCase()}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase tracking-wider text-white/60">Format</dt><dd className="mt-1 text-xs font-bold">{MODE_LABEL[nx.mode]}</dd></div>
            </dl>
          </div>
        ) : (
          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-wider text-pink-300">Next session</p>
            <h2 id="next-title" className="mt-2 font-display text-2xl lg:text-3xl">Room to pause, together.</h2>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-white/80">Your calendar is clear for now. New bookings will appear here as soon as students make them.</p>
          </div>
        )}
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="att-title" className={card}>
          <div className="flex items-baseline justify-between">
            <h2 id="att-title" className="font-display text-lg text-ilo-deep">Needs attention</h2>
            <Link href="/counsellor/inbox" className="flex items-center gap-1 text-[11px] font-bold text-ilo-plum">View all <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <p className="text-[11px] text-ilo-ink/60">A few things to hold gently today.</p>
          {d.attention.length === 0 ? (
            <p className="mt-6 rounded-xl bg-ilo-bg px-4 py-5 text-center text-xs text-ilo-ink/70">Nothing needs you right now. Take a breath.</p>
          ) : (
            <ul className="mt-3 divide-y divide-ilo-plum/10">
              {d.attention.map((a) => (
                <li key={a.key} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ilo-blush text-ilo-plum">
                    {a.icon === "message" ? <MessageCircle className="h-3.5 w-3.5" /> : <CalendarDays className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-ilo-deep">{a.alias} <span className="ml-1 text-[10px] font-semibold text-ilo-plum">{a.kind}</span></p>
                    <p className="mt-0.5 break-words text-[11px] leading-snug text-ilo-ink/70">{a.text}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-ilo-ink/50">{ago(a.atMs, nowMs)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="sch-title" className={card}>
          <div className="flex items-baseline justify-between">
            <h2 id="sch-title" className="font-display text-lg text-ilo-deep">Today&apos;s schedule</h2>
            <Link href="/counsellor/schedule" className="flex items-center gap-1 text-[11px] font-bold text-ilo-plum">Full schedule <ArrowUpRight className="h-3 w-3" /></Link>
          </div>
          <p className="text-[11px] text-ilo-ink/60">{n === 0 ? "Nothing booked today." : `${n} ${unit(n, "conversation", "conversations")} today${n > 1 ? ", with space between" : ""}.`}</p>
          {n > 0 && (
            <ol className="mt-3 space-y-1">
              {d.sessions.map((s) => (
                <li key={s.id} className={`flex items-start gap-3 rounded-xl px-2 py-2.5 ${s.state === "done" ? "opacity-50" : ""} ${s.state === "next" || s.state === "now" ? "bg-ilo-blush/60" : ""}`}>
                  <span className={`w-11 shrink-0 pt-0.5 text-xs font-bold ${s.state === "next" || s.state === "now" ? "text-ilo-plum" : "text-ilo-ink/70"}`}>{s.label}</span>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.state === "next" || s.state === "now" ? "bg-ilo-plum" : "bg-ilo-plum/30"}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-ilo-deep">{s.alias}</p>
                    <p className="text-[11px] text-ilo-ink/60">{s.type} · {MODE_LABEL[s.mode]}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-ilo-ink/50">45 min</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <section aria-labelledby="case-title" className={card}>
          <div className="flex items-center justify-between">
            <h2 id="case-title" className="text-[10px] font-bold uppercase tracking-wider text-ilo-ink/60">Active caseload</h2>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-200">{d.caseload.label}</span>
          </div>
          <p className="mt-2 text-xs text-ilo-ink/80"><span className="font-display text-2xl text-ilo-deep">{two(d.caseload.active)}</span> of {d.caseload.capacity} active students</p>
          <div role="progressbar" aria-valuenow={d.caseload.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Caseload" className="mt-3 h-2 overflow-hidden rounded-full bg-ilo-blush">
            <div className="h-full rounded-full bg-ilo-plum" style={{ width: `${d.caseload.pct}%` }} />
          </div>
        </section>

        <section aria-labelledby="pause-title" className={`${card} flex items-start gap-3`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ilo-blush text-ilo-plum"><Sparkles className="h-4 w-4" /></span>
          <div>
            <h2 id="pause-title" className="font-display text-lg text-ilo-deep">A small pause, for you too.</h2>
            <p className="mt-1 text-xs leading-relaxed text-ilo-ink/70">
              {d.gap
                ? `Your next open gap is ${d.gap}. Step away from the screen if you can.`
                : d.afterHours
                  ? "Your working hours for today are over. Rest well."
                  : !d.workingToday
                    ? "Today is outside your usual working hours."
                    : "Today's calendar is full. A few slow breaths between sessions can help."}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
