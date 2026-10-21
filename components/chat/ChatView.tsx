"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Lock, Phone, RotateCcw, Send, ShieldCheck, Video } from "lucide-react";
import { useCall } from "@/components/call/CallProvider";
import { createClient } from "@/lib/supabase/client";
import { presenceLabel, type AvailSlot } from "@/lib/booking";
import { dayKey, dayLabel, timeLabel } from "@/lib/chat";
import { shortName } from "@/lib/sessions";

export type ChatCounsellor = {
  id: string;
  display_name: string;
  designation: string | null;
  counsellor_availability: AvailSlot[] | null;
};
export type MessageRow = { id: string; sender_role: "student" | "counsellor"; body: string; created_at: string; client_id: string | null };
type Msg = { key: string; mine: boolean; body: string; at: number; status: "sent" | "sending" | "failed" };

const toMsg = (r: MessageRow): Msg => ({
  key: r.client_id ?? r.id,
  mine: r.sender_role === "student",
  body: r.body,
  at: Date.parse(r.created_at),
  status: "sent",
});

// Wording is deliberately limited to what Ilo can guarantee today (see README note on end-to-end encryption)
const EMERGENCY = "Counsellors reply during campus hours. In an emergency call Tele-MANAS 14416, free, 24×7.";

export function ChatView({ counsellor, conversationId, initial, nowMs }: { counsellor: ChatCounsellor; conversationId: string | null; initial: MessageRow[]; nowMs: number }) {
  const { startCall, busy } = useCall();
  const short = shortName(counsellor.display_name);
  const initials = counsellor.display_name
    .split(" ")
    .filter((w) => !/^(dr|prof|mr|ms|mrs)\.?$/i.test(w))
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const [convId, setConvId] = useState(conversationId);
  const [msgs, setMsgs] = useState<Msg[]>(() => initial.map(toMsg));
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  // Keep the newest message in view
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length]);

  // New messages from the counsellor arrive live
  useEffect(() => {
    if (!convId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`chat-${convId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` }, (p) => {
        const m = toMsg(p.new as MessageRow);
        setMsgs((cur) => (cur.some((x) => x.key === m.key) ? cur.map((x) => (x.key === m.key ? { ...x, ...m } : x)) : [...cur, m]));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [convId]);

  // Catch up when the student returns to the tab
  const refetch = useCallback(async () => {
    if (!convId) return;
    const { data } = await createClient()
      .from("messages")
      .select("id, sender_role, body, created_at, client_id")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (!data) return;
    const server = (data as MessageRow[]).reverse().map(toMsg);
    setMsgs((cur) => [...server, ...cur.filter((m) => m.status !== "sent" && !server.some((s) => s.key === m.key))]);
  }, [convId]);
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") refetch(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refetch]);

  async function deliver(key: string, body: string) {
    const { data, error } = await createClient().rpc("send_message", { p_counsellor_id: counsellor.id, p_body: body, p_client_id: key });
    if (error) {
      setMsgs((cur) => cur.map((m) => (m.key === key ? { ...m, status: "failed" } : m)));
      return;
    }
    const r = data as { conversation_id: string; created_at: string };
    setConvId(r.conversation_id);
    setMsgs((cur) => cur.map((m) => (m.key === key ? { ...m, at: Date.parse(r.created_at), status: "sent" } : m)));
  }

  function send() {
    const body = draft.trim();
    if (!body) return;
    const key = crypto.randomUUID();
    setMsgs((cur) => [...cur, { key, mine: true, body, at: Date.now(), status: "sending" }]);
    setDraft("");
    deliver(key, body);
  }

  function retry(m: Msg) {
    setMsgs((cur) => cur.map((x) => (x.key === m.key ? { ...x, status: "sending" } : x)));
    deliver(m.key, m.body);
  }

  const canSend = draft.trim().length > 0;

  return (
    <main className="flex h-full min-h-0 flex-col bg-ilo-bg">
      <header className="flex items-center gap-2.5 border-b border-ilo-plum/10 bg-white/90 px-3 pb-2.5 pt-7">
        <Link href="/home" aria-label="Back to home" className="p-1 text-ilo-ink"><ChevronLeft className="h-5 w-5" /></Link>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3dfee] font-display text-xs text-ilo-plum" aria-hidden="true">{initials}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-ilo-plum">{counsellor.display_name}</p>
          <p className="truncate text-[10px] text-ilo-ink/70">{presenceLabel(counsellor.counsellor_availability ?? [], nowMs)}</p>
        </div>
        <button type="button" disabled={busy} onClick={() => startCall({ counsellorId: counsellor.id, kind: "video" })} className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-ilo-plum/20 bg-ilo-blush px-3 text-[11px] font-semibold text-ilo-plum disabled:opacity-60">
          <Video className="h-3.5 w-3.5" /> Video Call
        </button>
        <button type="button" disabled={busy} onClick={() => startCall({ counsellorId: counsellor.id, kind: "audio" })} aria-label="Audio call" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ilo-plum/20 bg-ilo-blush text-ilo-plum disabled:opacity-60">
          <Phone className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="space-y-1 border-b border-ilo-plum/10 bg-ilo-blush/60 px-4 py-2 text-[10px] leading-snug text-ilo-plum">
        <p className="flex items-start gap-2"><Lock className="mt-0.5 h-3 w-3 shrink-0" /> Private between you and {short}. Your college can&apos;t see these messages.</p>
        <p className="pl-5 text-ilo-ink/80">{EMERGENCY.split("14416")[0]}<a href="tel:14416" className="font-bold underline">14416</a>{EMERGENCY.split("14416")[1]}</p>
      </div>

      <div ref={scroller} role="log" aria-live="polite" aria-label="Messages" className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {msgs.length === 0 ? (
          <section className="mt-4 rounded-2xl border border-ilo-plum/10 bg-white px-5 py-6 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-ilo-blush text-ilo-plum"><ShieldCheck className="h-5 w-5" /></span>
            <h2 className="mt-3 font-display text-base text-ilo-plum">Your Confidential Direct Channel</h2>
            <p className="mt-2 text-[11px] leading-relaxed text-ilo-ink">
              This chat is private between you and {counsellor.display_name}. Your college&apos;s faculty and administration have no access to these messages.
            </p>
            <p className="mt-4 font-display text-[11px] italic text-ilo-plum">Say hello whenever you feel ready.</p>
          </section>
        ) : (
          <div className="space-y-2">
            {msgs.map((m, i) => (
              <Fragment key={m.key}>
                {(i === 0 || dayKey(m.at) !== dayKey(msgs[i - 1].at)) && (
                  <p className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-ilo-ink/50">{dayLabel(m.at, nowMs)}</p>
                )}
                <div className={`flex flex-col ${m.mine ? "items-end" : "items-start"}`}>
                  <p className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                    m.mine ? "rounded-br-md bg-ilo-plum text-white" : "rounded-bl-md border border-ilo-plum/10 bg-white text-ilo-ink"
                  } ${m.status === "sending" ? "opacity-60" : ""}`}>{m.body}</p>
                  {m.status === "failed" ? (
                    <button type="button" onClick={() => retry(m)} className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-ilo-crisis">
                      <RotateCcw className="h-3 w-3" /> Not sent. Tap to retry
                    </button>
                  ) : (
                    <span className="mt-0.5 text-[9px] text-ilo-ink/50">{m.status === "sending" ? "Sending…" : timeLabel(m.at)}</span>
                  )}
                </div>
              </Fragment>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-ilo-plum/10 bg-white/95 px-3 pb-3 pt-2.5">
        <div className="flex items-end gap-2">
          <textarea
            aria-label={`Write a message to ${short}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1}
            maxLength={2000}
            placeholder={`Write a message to ${short}…`}
            className="max-h-24 min-h-10 flex-1 resize-none rounded-2xl border border-ilo-plum/15 bg-white px-4 py-2.5 text-xs text-ilo-ink placeholder:text-ilo-ink/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ilo-plum"
          />
          <button
            type="button"
            onClick={send}
            disabled={!canSend}
            aria-label="Send message"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ilo-plum ${canSend ? "bg-ilo-plum" : "bg-ilo-plum/40"}`}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-ilo-blush/50 px-3 py-1.5 text-center text-[10px] leading-snug text-ilo-ink">
          <Lock className="h-3 w-3 shrink-0" />
          <span>Your college sees that counselling happened. <strong className="text-ilo-plum">Never who. Never what was said.</strong></span>
        </p>
      </div>
    </main>
  );
}
