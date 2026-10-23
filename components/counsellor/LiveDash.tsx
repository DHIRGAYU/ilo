"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, MessageCircle } from "lucide-react";
import { useE2EE } from "@/components/e2ee/E2EEProvider";
import { ago, type AttentionItem } from "@/lib/counsellor-day";
import { snippet } from "@/lib/inbox-shared";

// Dashboard pieces that depend on messages. Messages are locked end to end, so these are worked out on this device.

export function LiveStat({ which }: { which: "unread" | "triage" }) {
  const { state, unreadTotal, triage } = useE2EE();
  const value = state === "ready" ? (which === "unread" ? unreadTotal : triage) : 0;
  const Icon = which === "unread" ? MessageCircle : Clock;
  return (
    <div className="rounded-2xl border border-ilo-plum/10 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ilo-ink/60">{which === "unread" ? "Unread" : "Awaiting triage"}</p>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ilo-blush text-ilo-plum"><Icon className="h-3.5 w-3.5" /></span>
      </div>
      <p className="mt-2 font-display text-3xl leading-none text-ilo-deep">{String(value).padStart(2, "0")}</p>
      <p className="mt-1 text-[11px] text-ilo-ink/70">{which === "unread" ? "private messages" : "new requests"}</p>
    </div>
  );
}

export function LiveAttention({ items, labels, nowMs }: { items: AttentionItem[]; labels: Record<string, string>; nowMs: number }) {
  const { state, summaries } = useE2EE();
  const fromMessages: AttentionItem[] = state !== "ready" ? [] : Object.entries(summaries)
    .filter(([id, s]) => !s.lastMine && labels[id])
    .map(([id, s]) => ({
      key: `m-${id}`, kind: "New message" , icon: "message", alias: labels[id], text: snippet(s.lastBody), atMs: s.lastAt,
    }));
  const all = [...fromMessages, ...items].sort((a, b) => b.atMs - a.atMs).slice(0, 4);

  return (
    <section aria-labelledby="att-title" className="rounded-2xl border border-ilo-plum/10 bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 id="att-title" className="font-display text-lg text-ilo-deep">Needs attention</h2>
        <Link href="/counsellor/inbox" className="flex items-center gap-1 text-[11px] font-bold text-ilo-plum">View all <ArrowRight className="h-3 w-3" /></Link>
      </div>
      <p className="text-[11px] text-ilo-ink/60">A few things to hold gently today.</p>
      {all.length === 0 ? (
        <p className="mt-6 rounded-xl bg-ilo-bg px-4 py-5 text-center text-xs text-ilo-ink/70">Nothing needs you right now. Take a breath.</p>
      ) : (
        <ul className="mt-3 divide-y divide-ilo-plum/10">
          {all.map((a) => (
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
  );
}
