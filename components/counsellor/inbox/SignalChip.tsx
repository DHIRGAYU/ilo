"use client";

import { useId, useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { MessageSignal, SignalVote } from "@/lib/e2ee";
import { LABELS } from "@/lib/mental-health/score";

const percent = new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 0 });
const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ilo-plum";

export function SignalChip({ signal, vote, onVote }: { signal: MessageSignal; vote?: SignalVote; onVote: (vote: SignalVote) => void }) {
  const [open, setOpen] = useState(false);
  const tipId = useId();
  const confidence = signal.scores[LABELS.indexOf(signal.label)] ?? 0;
  const crisis = signal.label === "Suicidal";

  return (
    <div className="mt-1 max-w-[85%] sm:max-w-[75%]">
      <div className="flex flex-wrap items-center gap-1">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${crisis ? "bg-ilo-crisis/10 text-ilo-crisis ring-ilo-crisis/30" : "bg-white text-ilo-deep ring-ilo-plum/15"}`}>
          {signal.label} <span className="font-medium text-ilo-ink/60">{percent.format(confidence)}</span>
        </span>
        <button type="button" aria-expanded={open} aria-controls={tipId} onClick={() => setOpen((v) => !v)} className={`text-[10px] text-ilo-ink/60 underline-offset-2 hover:underline ${focus}`}>
          Why?
        </button>
        <button type="button" aria-pressed={vote === "up"} aria-label="This cue was helpful" onClick={() => onVote("up")} className={`rounded-full p-1 ${vote === "up" ? "text-ilo-plum" : "text-ilo-ink/40"} ${focus}`}>
          <ThumbsUp className="h-3 w-3" />
        </button>
        <button type="button" aria-pressed={vote === "down"} aria-label="This cue was not helpful" onClick={() => onVote("down")} className={`rounded-full p-1 ${vote === "down" ? "text-ilo-plum" : "text-ilo-ink/40"} ${focus}`}>
          <ThumbsDown className="h-3 w-3" />
        </button>
      </div>
      {open && (
        <div id={tipId} role="tooltip" className="mt-1 rounded-xl bg-white px-2.5 py-2 text-[10px] leading-snug text-ilo-ink/70 ring-1 ring-ilo-plum/10">
          <ul className="space-y-0.5">
            {LABELS.map((label, i) => (
              <li key={label} className="flex justify-between gap-3">
                <span className={label === signal.label ? "font-bold text-ilo-deep" : ""}>{label}</span>
                <span>{percent.format(signal.scores[i] ?? 0)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5">On this device only. A cue from the model, not a diagnosis.</p>
          {crisis && (
            <p className="mt-1 text-ilo-crisis">
              If the student may be in immediate danger, use Escalate and call <a href="tel:14416" className="font-bold underline">Tele-MANAS 14416</a>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
