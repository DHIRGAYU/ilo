"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CalendarClock, Lock, X } from "lucide-react";
import { MODE_LABEL } from "@/lib/counsellor-day";
import { dateLabel, listTime, rowTag, whenLabel, type InboxConvo } from "@/lib/inbox-shared";

const card = "rounded-2xl border border-ilo-plum/10 bg-white p-4";
const eyebrow = "text-[10px] font-bold uppercase tracking-[0.14em] text-ilo-ink/60";

// Autosaves a few moments after typing stops, and once more if the panel closes first
function NoteBox({ id, initial, save }: { id: string; initial: string; save: (id: string, text: string) => Promise<boolean> }) {
  const uid = useId();
  const [text, setText] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(initial);
  const dirty = useRef(false);

  const run = useCallback(async () => {
    if (!dirty.current) return;
    dirty.current = false;
    setState("saving");
    const ok = await save(id, latest.current);
    if (!ok) dirty.current = true;
    setState(ok ? "saved" : "error");
  }, [id, save]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (dirty.current) void save(id, latest.current);
  }, [id, save]);

  return (
    <div>
      <label htmlFor={uid} className="sr-only">Private notes for this conversation</label>
      <textarea
        id={uid}
        value={text}
        maxLength={4000}
        rows={4}
        placeholder="A thought for the next check-in…"
        onChange={(e) => {
          setText(e.target.value);
          latest.current = e.target.value;
          dirty.current = true;
          setState("idle");
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(run, 800);
        }}
        className="w-full resize-y rounded-xl border border-ilo-plum/15 bg-ilo-bg px-3 py-2.5 text-xs text-ilo-ink placeholder:text-ilo-ink/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ilo-plum"
      />
      <p className="mt-1 h-4 text-[10px] text-ilo-ink/60" aria-live="polite">
        {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : state === "error" ? "Couldn't save. Will retry when you type again." : ""}
      </p>
    </div>
  );
}

export function ContextPanel({ convo, saveNote, nowMs, onClose }: { convo: InboxConvo; saveNote: (id: string, text: string) => Promise<boolean>; nowMs: number; onClose?: () => void }) {
  const tag = rowTag(convo);
  return (
    <div className="space-y-4 pb-20 xl:pb-16">
      <div className="flex items-center justify-between">
        <h2 className={eyebrow}>Student context</h2>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close student context" className="rounded-full p-1.5 text-ilo-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ilo-plum">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <section className={card} aria-labelledby="snap-title">
        <h3 id="snap-title" className={eyebrow}>Case snapshot</h3>
        <div className="mt-3 flex items-center gap-3">
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ilo-blush font-display text-sm text-ilo-plum">{convo.initial}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-ilo-deep">{convo.alias}</p>
          </div>
          {tag && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tag.className}`}>{tag.label}</span>}
        </div>
        <dl className="mt-4 space-y-2 text-[11px]">
          {[
            ["First message", dateLabel(convo.firstAt)],
            ["Last message", convo.lastAt ? listTime(convo.lastAt, nowMs) : "—"],
            ["Sessions held", String(convo.sessionsHeld)],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 border-b border-ilo-plum/5 pb-2 last:border-0 last:pb-0">
              <dt className="text-ilo-ink/70">{k}</dt>
              <dd className="font-semibold text-ilo-deep">{v}</dd>
            </div>
          ))}
        </dl>
        {/* <p className="mt-3 text-[10px] leading-snug text-ilo-ink/60">You see an alias only. Names stay hidden.</p> */}
      </section>

      <section className={card} aria-labelledby="next-title">
        <div className="flex items-center justify-between">
          <h3 id="next-title" className={eyebrow}>Next session</h3>
          <span className="flex items-center gap-1 text-[10px] text-ilo-ink/60"><Lock className="h-3 w-3" aria-hidden="true" /> Private</span>
        </div>
        {convo.next ? (
          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ilo-blush text-ilo-plum"><CalendarClock className="h-4 w-4" aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-ilo-deep">{whenLabel(convo.next.startMs)}</p>
              <p className="text-[11px] text-ilo-ink/70">{MODE_LABEL[convo.next.mode]} · {Math.round((convo.next.endMs - convo.next.startMs) / 60_000)} minutes · IST</p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-ilo-ink/70">No session booked yet.</p>
        )}
      </section>

      <section className={card} aria-labelledby="notes-title">
        <div className="flex items-center justify-between">
          <h3 id="notes-title" className={eyebrow}>Private notes</h3>
          <span className="flex items-center gap-1 text-[10px] text-ilo-ink/60"><Lock className="h-3 w-3" aria-hidden="true" /> Only you can see this</span>
        </div>
        <div className="mt-3">
          <NoteBox key={convo.id} id={convo.id} initial={convo.note} save={saveNote} />
        </div>
        <p className="flex items-center gap-1 text-[10px] text-ilo-ink/60"><Lock className="h-3 w-3" aria-hidden="true" /> Never visible to campus administrators</p>
      </section>
    </div>
  );
}
