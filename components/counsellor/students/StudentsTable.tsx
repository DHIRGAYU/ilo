"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Lock, Search, Users } from "lucide-react";
import type { CaseRow, Caseload } from "@/lib/counsellor-schedule";
import { dateTimeOf } from "@/lib/schedule-shared";

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ilo-plum";
const TONE: Record<CaseRow["status"], string> = {
  "Follow-up due": "bg-amber-50 text-amber-900",
  Ongoing: "bg-emerald-50 text-emerald-800",
  New: "bg-ilo-blush text-ilo-plum",
  Paused: "bg-ilo-ink/10 text-ilo-ink",
};
const two = (n: number) => String(n).padStart(2, "0");

export function StudentsTable({ data }: { data: Caseload }) {
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? data.rows.filter((r) => r.label.toLowerCase().includes(needle) || r.status.toLowerCase().includes(needle)) : data.rows;
  }, [data.rows, q]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 lg:px-8">
      <p className="text-[10px] font-bold uppercase tracking-wider text-ilo-ink/60">Your caseload</p>
      <h1 className="mt-1 font-display text-3xl text-ilo-deep lg:text-4xl">Students</h1>
      <p className="mt-1 max-w-xl text-xs leading-relaxed text-ilo-ink/70">A quieter view of the people you support. You see students who have written to you or booked with you.</p>

      <section aria-label="Caseload summary" className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-ilo-plum/10 bg-white p-4 shadow-sm">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ilo-blush text-ilo-plum"><Users className="h-5 w-5" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg text-ilo-deep">A steady caseload, one conversation at a time</p>
          <p className="text-[11px] text-ilo-ink/70">Sessions are 45 minutes. Notes stay locked on your device.</p>
        </div>
        <dl className="flex gap-6">
          <div><dd className="font-display text-2xl text-ilo-deep">{two(data.active)}</dd><dt className="text-[10px] text-ilo-ink/60">active cases</dt></div>
          <div><dd className="font-display text-2xl text-ilo-deep">{two(data.followUpsThisWeek)}</dd><dt className="text-[10px] text-ilo-ink/60">follow-ups this week</dt></div>
        </dl>
      </section>

      <section aria-labelledby="case-title" className="mt-5 rounded-2xl border border-ilo-plum/10 bg-white shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 p-5">
          <div>
            <h2 id="case-title" className="font-display text-xl text-ilo-deep">Your caseload</h2>
            <p className="text-[11px] text-ilo-ink/70">Search by name or status.</p>
          </div>
          <label className="relative block w-full sm:w-64">
            <span className="sr-only">Find a student</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ilo-ink/50" aria-hidden="true" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a student…" className={`w-full rounded-full border border-ilo-plum/15 bg-ilo-bg py-2.5 pl-10 pr-4 text-xs text-ilo-ink placeholder:text-ilo-ink/50 ${focus}`} />
          </label>
        </div>

        {rows.length === 0 ? (
          <p className="border-t border-ilo-plum/10 px-5 py-10 text-center text-xs text-ilo-ink/70">{data.rows.length === 0 ? "No students yet. When a student writes to you or books a session, they'll appear here." : "Nobody matches that search."}</p>
        ) : (
          <div className="overflow-x-auto border-t border-ilo-plum/10">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="bg-ilo-bg text-[10px] uppercase tracking-wider text-ilo-ink/60">
                <tr>
                  <th scope="col" className="px-5 py-3 font-bold">Student</th>
                  <th scope="col" className="px-3 py-3 font-bold">Last session</th>
                  <th scope="col" className="px-3 py-3 font-bold">Next session</th>
                  <th scope="col" className="px-3 py-3 font-bold">Status</th>
                  <th scope="col" className="px-3 py-3"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ilo-plum/10">
                {rows.map((r) => (
                  <tr key={r.id} className="align-middle">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ilo-blush font-display text-sm text-ilo-plum">{r.initial}</span>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-ilo-deep">{r.label}</p>
                          <p className="text-[11px] text-ilo-ink/60">{r.sessionsHeld === 0 ? "No sessions yet" : `${r.sessionsHeld} ${r.sessionsHeld === 1 ? "session" : "sessions"}`}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-ilo-ink">{r.lastMs ? dateTimeOf(r.lastMs) : "—"}</td>
                    <td className="px-3 py-3">
                      {r.nextMs && r.nextApptId
                        ? <Link href={`/counsellor/schedule/${r.nextApptId}`} className={`font-semibold text-ilo-plum underline-offset-2 hover:underline ${focus}`}>{dateTimeOf(r.nextMs)}</Link>
                        : <span className="text-ilo-ink/60">To be scheduled</span>}
                    </td>
                    <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${TONE[r.status]}`}>{r.status}</span></td>
                    <td className="px-3 py-3 text-right">
                      {r.convId
                        ? <Link href={`/counsellor/inbox?c=${r.convId}`} aria-label={`Open conversation with ${r.label}`} className={`inline-flex rounded-full p-1.5 text-ilo-ink hover:bg-ilo-blush/60 ${focus}`}><ChevronRight className="h-4 w-4" /></Link>
                        : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="flex items-center gap-2 border-t border-ilo-plum/10 px-5 py-3 text-[11px] text-ilo-ink/60"><Lock className="h-3 w-3 shrink-0" aria-hidden="true" /> Session notes are locked on your device. Institutional administrators have no access to student case content.</p>
      </section>
    </main>
  );
}
