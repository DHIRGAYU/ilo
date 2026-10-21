"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Archive, CheckCircle2, ChevronLeft, Lock, MoreHorizontal, PanelRight, Phone, Pin, RotateCcw, Send, ShieldAlert, Video } from "lucide-react";
import { useCall } from "@/components/call/CallProvider";
import { dayKey, dayLabel, timeLabel } from "@/lib/chat";
import { listTime, rowTag, type InboxConvo, type Msg } from "@/lib/inbox-shared";

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ilo-plum";
const QUICK = ["I hear you", "One step at a time", "Let's find a time"];
type Flags = Partial<Pick<InboxConvo, "pinned" | "urgent" | "archived" | "resolved">>;
type Item = { kind: "msg"; key: string; at: number; m: Msg } | { kind: "event"; key: string; at: number; text: string };

type Props = {
  convo: InboxConvo;
  msgs: Msg[];
  loading: boolean;
  draft: string;
  onDraft: (v: string) => void;
  onSend: () => void;
  onRetry: (m: Msg) => void;
  onReload: () => void;
  onBack: () => void;
  onOpenContext: () => void;
  onFlags: (patch: Flags) => void;
  nowMs: number;
};

export function ChatPane({ convo, msgs, loading, draft, onDraft, onSend, onRetry, onReload, onBack, onOpenContext, onFlags, nowMs }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const [escalate, setEscalate] = useState(false);
  const escClose = useRef<HTMLButtonElement>(null);
  const { startCall, busy } = useCall();

  const items = useMemo<Item[]>(() => {
    // Only show booking events from the point the loaded history begins
    const floor = msgs.length >= 200 ? msgs[0].at : 0;
    const list: Item[] = msgs.map((m) => ({ kind: "msg", key: m.key, at: m.at, m }));
    for (const e of convo.events) if (e.at >= floor) list.push({ kind: "event", key: e.id, at: e.at, text: e.text });
    return list.sort((a, b) => a.at - b.at);
  }, [msgs, convo.events]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items.length, convo.id]);

  useEffect(() => { if (escalate) escClose.current?.focus(); }, [escalate]);
  useEffect(() => {
    if (!escalate && !menu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setEscalate(false); setMenu(false); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [escalate, menu]);

  const tag = rowTag(convo);
  const recent = convo.lastAt && nowMs - convo.lastAt < 86_400_000;
  const canSend = draft.trim().length > 0;
  const menuItem = `flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-ilo-ink hover:bg-ilo-blush/60 ${focus}`;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b border-ilo-plum/10 px-3 py-3 sm:gap-3 sm:px-4">
        <button type="button" onClick={onBack} aria-label="Back to conversations" className={`rounded-full p-1.5 text-ilo-ink lg:hidden ${focus}`}>
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ilo-blush font-display text-base text-ilo-plum">{convo.initial}</span>
        <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-lg leading-tight text-ilo-deep">{convo.alias}</h2>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ilo-ink/70">
            <span className="flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${recent ? "bg-emerald-600" : "bg-ilo-ink/30"}`} aria-hidden="true" />
              {recent ? "Active conversation" : convo.lastAt ? `Last message ${listTime(convo.lastAt, nowMs)}` : "No messages yet"}
            </span>
            {tag && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tag.className}`}>{tag.label}</span>}
          </p>
        </div>
        <button type="button" onClick={() => setEscalate(true)} className={`flex shrink-0 items-center gap-1.5 rounded-full border border-ilo-crisis/30 bg-white px-3 py-2 text-[11px] font-bold text-ilo-crisis hover:bg-ilo-crisis/5 ${focus}`}>
          <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" /> <span className="hidden sm:inline">Escalate</span><span className="sr-only sm:hidden">Escalate</span>
        </button>
        <button type="button" disabled={busy} onClick={() => startCall({ conversationId: convo.id, kind: "audio" })} className={`flex shrink-0 items-center gap-1.5 rounded-full border border-ilo-plum/20 bg-white px-3 py-2 text-[11px] font-bold text-ilo-plum hover:bg-ilo-blush/50 disabled:opacity-50 ${focus}`}>
          <Phone className="h-3.5 w-3.5" aria-hidden="true" /> <span className="hidden sm:inline">Call</span><span className="sr-only sm:hidden">Call</span>
        </button>
        <button type="button" disabled={busy} onClick={() => startCall({ conversationId: convo.id, kind: "video" })} className={`flex shrink-0 items-center gap-1.5 rounded-full border border-ilo-plum/20 bg-white px-3 py-2 text-[11px] font-bold text-ilo-plum hover:bg-ilo-blush/50 disabled:opacity-50 ${focus}`}>
          <Video className="h-3.5 w-3.5" aria-hidden="true" /> <span className="hidden sm:inline">Video</span><span className="sr-only sm:hidden">Video</span>
        </button>
        <button type="button" onClick={onOpenContext} aria-label="Open student context" className={`rounded-full border border-ilo-plum/15 p-2 text-ilo-plum xl:hidden ${focus}`}>
          <PanelRight className="h-4 w-4" />
        </button>
        <div className="relative">
          <button type="button" onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-haspopup="menu" aria-label="More actions" className={`rounded-full border border-ilo-plum/15 p-2 text-ilo-plum ${focus}`}>
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} aria-hidden="true" />
              <div role="menu" className="absolute right-0 top-11 z-20 w-52 rounded-2xl border border-ilo-plum/10 bg-white p-1.5 shadow-xl">
                <button role="menuitem" type="button" className={menuItem} onClick={() => { onFlags({ pinned: !convo.pinned }); setMenu(false); }}>
                  <Pin className="h-3.5 w-3.5 text-ilo-plum" /> {convo.pinned ? "Unpin" : "Pin to top"}
                </button>
                <button role="menuitem" type="button" className={menuItem} onClick={() => { onFlags({ resolved: !convo.resolved }); setMenu(false); }}>
                  <CheckCircle2 className="h-3.5 w-3.5 text-ilo-plum" /> {convo.resolved ? "Reopen" : "Mark resolved"}
                </button>
                <button role="menuitem" type="button" className={menuItem} onClick={() => { onFlags({ archived: !convo.archived }); setMenu(false); }}>
                  <Archive className="h-3.5 w-3.5 text-ilo-plum" /> {convo.archived ? "Move to inbox" : "Archive"}
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <p className="mx-3 mt-3 flex items-start gap-2 rounded-xl bg-ilo-blush/50 px-3 py-2 text-[11px] leading-snug text-ilo-ink sm:mx-4">
        <Lock className="mt-0.5 h-3 w-3 shrink-0 text-ilo-plum" aria-hidden="true" />
        <span>Private between you and this student. Your college can&apos;t see these messages.</span>
      </p>

      <div ref={scroller} role="log" aria-live="polite" aria-label="Messages" className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
        {loading && msgs.length === 0 ? (
          <p className="py-10 text-center text-xs text-ilo-ink/70">Loading messages…</p>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-xs text-ilo-ink/70">
            <p>No messages to show.</p>
            <button type="button" onClick={onReload} className={`mt-2 font-bold text-ilo-plum underline ${focus}`}>Try again</button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((it, i) => (
              <Fragment key={it.key}>
                {(i === 0 || dayKey(it.at) !== dayKey(items[i - 1].at)) && (
                  <p className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-ilo-ink/60">{dayLabel(it.at, nowMs)}</p>
                )}
                {it.kind === "event" ? (
                  <p className="mx-auto w-fit max-w-full break-words rounded-lg bg-ilo-bg px-3 py-1.5 text-center text-[10px] text-ilo-ink ring-1 ring-ilo-plum/10">{it.text}</p>
                ) : (
                  <div className={`flex flex-col ${it.m.mine ? "items-end" : "items-start"}`}>
                    <p className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-xs leading-relaxed sm:max-w-[75%] ${
                      it.m.mine ? "rounded-br-md bg-ilo-plum text-white" : "rounded-bl-md bg-ilo-blush/70 text-ilo-deep"
                    } ${it.m.status === "sending" ? "opacity-60" : ""}`}>{it.m.body}</p>
                    {it.m.status === "failed" ? (
                      <button type="button" onClick={() => onRetry(it.m)} className={`mt-1 flex items-center gap-1 text-[10px] font-semibold text-ilo-crisis ${focus}`}>
                        <RotateCcw className="h-3 w-3" /> Not sent. Tap to retry
                      </button>
                    ) : (
                      <span className="mt-0.5 text-[10px] text-ilo-ink/60">{it.m.status === "sending" ? "Sending…" : timeLabel(it.m.at)}</span>
                    )}
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Extra bottom space below xl keeps the floating Crisis protocol button off the Send button */}
      <div className="border-t border-ilo-plum/10 px-3 pb-16 pt-3 sm:px-4 xl:pb-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK.map((q) => (
            <button key={q} type="button" onClick={() => onDraft(draft ? `${draft.replace(/\s+$/, "")} ${q}` : q)} className={`rounded-full border border-ilo-plum/15 bg-white px-3 py-1 text-[11px] text-ilo-plum hover:bg-ilo-blush/50 ${focus}`}>
              {q}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2 rounded-2xl border border-ilo-plum/15 bg-white p-2 focus-within:border-ilo-plum">
          <textarea
            aria-label="Write a private message"
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            rows={2}
            maxLength={2000}
            placeholder="Write a private message…"
            className="max-h-32 min-h-12 min-w-0 flex-1 resize-none bg-transparent px-2 py-1.5 text-xs text-ilo-ink placeholder:text-ilo-ink/50 focus:outline-none"
          />
          <button type="button" onClick={onSend} disabled={!canSend} className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white transition-colors ${focus} ${canSend ? "bg-ilo-plum" : "bg-ilo-plum/40"}`}>
            <Send className="h-3.5 w-3.5" aria-hidden="true" /> Send
          </button>
        </div>
        <p className="mt-1.5 hidden text-right text-[10px] text-ilo-ink/60 sm:block">Enter to send · Shift + Enter for a new line</p>
      </div>

      {escalate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-ilo-deep/40" onClick={() => setEscalate(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-labelledby="esc-title" className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
            <h2 id="esc-title" className="font-display text-xl text-ilo-crisis">Escalate this conversation</h2>
            <p className="mt-2 text-xs leading-relaxed text-ilo-ink">
              {convo.urgent
                ? "This conversation is marked urgent and stays at the top of your inbox."
                : "Marking it urgent keeps it at the top of your inbox so it isn't missed."}{" "}
              If the student may be in immediate danger, follow your institution&apos;s crisis protocol and call for help now.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <a href="tel:14416" className={`flex items-center gap-1.5 rounded-full bg-ilo-crisis/10 px-3 py-2 font-bold text-ilo-crisis ${focus}`}><Phone className="h-3.5 w-3.5" /> Tele-MANAS 14416</a>
              <a href="tel:112" className={`flex items-center gap-1.5 rounded-full bg-ilo-crisis/10 px-3 py-2 font-bold text-ilo-crisis ${focus}`}><Phone className="h-3.5 w-3.5" /> Emergency 112</a>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button ref={escClose} type="button" onClick={() => setEscalate(false)} className={`rounded-full border border-ilo-plum/20 px-4 py-2 text-xs font-semibold text-ilo-plum ${focus}`}>Close</button>
              <button type="button" onClick={() => { onFlags({ urgent: !convo.urgent }); setEscalate(false); }} className={`rounded-full bg-ilo-crisis px-4 py-2 text-xs font-bold text-white ${focus}`}>
                {convo.urgent ? "Clear urgent flag" : "Mark as urgent"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
