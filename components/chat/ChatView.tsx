"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Lock, Phone, RotateCcw, Send, ShieldCheck, Video } from "lucide-react";
import { useCall } from "@/components/call/CallProvider";
import { createClient } from "@/lib/supabase/client";
import { E2EEGate } from "@/components/e2ee/E2EEGate";
import { E2EEProvider, useE2EE } from "@/components/e2ee/E2EEProvider";
import { presenceLabel, type AvailSlot } from "@/lib/booking";
import { dayKey, dayLabel, timeLabel } from "@/lib/chat";
import { fromStore, type Msg } from "@/lib/inbox-shared";
import { shortName } from "@/lib/sessions";

export type ChatCounsellor = {
  id: string;
  display_name: string;
  designation: string | null;
  counsellor_availability: AvailSlot[] | null;
};

// Wording is deliberately limited to what Ilo can guarantee today (see README note on end-to-end encryption)
const EMERGENCY = "Counsellors reply during campus hours. In an emergency call Tele-MANAS 14416, free, 24×7.";

type Props = { counsellor: ChatCounsellor; conversationId: string | null; nowMs: number; userId: string };

export function ChatView(props: Props) {
  return (
    <E2EEProvider userId={props.userId}>
      <E2EEGate audience="student" backHref="/home">
        <ChatInner {...props} />
      </E2EEGate>
    </E2EEProvider>
  );
}

function ChatInner({ counsellor, conversationId, nowMs }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const { client, summaries, rev } = useE2EE();
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
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // Messages come from this device and refresh whenever anything changes (new mail, receipts, sending)
  useEffect(() => {
    if (!client || !convId) { setMsgs([]); return; }
    let live = true;
    client.messages(convId).then((list) => { if (live) setMsgs(list.map(fromStore)); });
    return () => { live = false; };
  }, [client, convId, rev]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length]);

  // Anything the counsellor wrote counts as read while this screen is open
  const unread = convId ? summaries[convId]?.unread ?? 0 : 0;
  useEffect(() => {
    if (client && convId && unread > 0 && document.visibilityState === "visible") void client.markRead(convId);
  }, [client, convId, unread]);

  async function send() {
    const body = draft.trim();
    if (!body || !client) return;
    setNotice(null);
    let id = convId;
    if (!id) {
      // The conversation is created on the first message
      const { data, error } = await supabase.rpc("start_conversation", { p_counsellor_id: counsellor.id });
      if (error || !data) { setNotice("Couldn't start the chat. Please try again."); return; }
      id = data as string;
      setConvId(id);
    }
    setDraft("");
    client.send(id, body).catch(() => { setDraft(body); setNotice("Couldn't send that message. Please try again."); });
  }

  function failText(reason?: string) {
    switch (reason) {
      case "recipient_no_key": return `${short} hasn't turned on secure messaging yet`;
      case "mailbox_full": return `${short}'s inbox is full right now`;
      default: return "Not sent";
    }
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
                  } ${m.status === "sending" || m.status === "queued" ? "opacity-60" : ""}`}>{m.body}</p>
                  {m.status === "failed" ? (
                    <button type="button" onClick={() => void client?.retry(m.id)} className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-ilo-crisis">
                      <RotateCcw className="h-3 w-3" /> {failText(m.reason)}. Tap to retry
                    </button>
                  ) : m.status === "expired" ? (
                    <button type="button" onClick={() => void client?.resend(m.id)} className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-ilo-crisis">
                      <RotateCcw className="h-3 w-3" /> Not delivered. Tap to send again
                    </button>
                  ) : (
                    <span className="mt-0.5 text-[9px] text-ilo-ink/50">
                      {m.status === "sending" || m.status === "queued" ? "Sending…" : `${timeLabel(m.at)}${m.mine ? (m.status === "delivered" ? " · Delivered" : " · Sent") : ""}`}
                    </span>
                  )}
                </div>
              </Fragment>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-ilo-plum/10 bg-white/95 px-3 pb-3 pt-2.5">
        {notice && <p role="alert" className="mb-2 text-center text-[10px] font-semibold text-ilo-crisis">{notice}</p>}
        <div className="flex items-end gap-2">
          <textarea
            aria-label={`Write a message to ${short}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            rows={1}
            maxLength={2000}
            placeholder={`Write a message to ${short}…`}
            className="max-h-24 min-h-10 flex-1 resize-none rounded-2xl border border-ilo-plum/15 bg-white px-4 py-2.5 text-xs text-ilo-ink placeholder:text-ilo-ink/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ilo-plum"
          />
          <button
            type="button"
            onClick={() => void send()}
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
