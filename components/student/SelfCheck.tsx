"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { BottomNav } from "@/components/ui/BottomNav";
import { NOTICE_SECONDS, PAUSE_CYCLES, breathCue } from "@/lib/student/pause";

type Phase = "ready" | "breathe" | "notice" | "done";

export function SelfCheck() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (phase !== "breathe" && phase !== "notice") return;
    const timer = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === "breathe" && breathCue(elapsed, PAUSE_CYCLES).done) {
      setPhase("notice");
      setElapsed(0);
    } else if (phase === "notice" && elapsed >= NOTICE_SECONDS) {
      setPhase("done");
    }
  }, [phase, elapsed]);

  function start() {
    setElapsed(0);
    setPhase("breathe");
  }
  function stop() {
    setElapsed(0);
    setPhase("ready");
  }

  const cue = breathCue(elapsed, PAUSE_CYCLES);

  return (
    <main className="relative px-4 pb-36 pt-7">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ilo-ink/70">About 2 minutes · nothing is saved</p>
      <h1 className="mt-2 font-display text-[1.55rem] leading-tight text-ilo-plum">Quick self-check</h1>
      <p className="mt-1 text-xs leading-relaxed text-ilo-ink/80">A short pause for a tight chest or a busy mind. Not a diagnosis.</p>

      <section className="mt-5 rounded-2xl border border-ilo-plum/10 bg-white px-5 py-8 text-center" aria-live="polite">
        {phase === "ready" && (
          <>
            <p className="font-display text-lg text-ilo-plum">Sit back. Let your shoulders drop.</p>
            <p className="mx-auto mt-2 max-w-[28ch] text-xs leading-relaxed text-ilo-ink/80">You will breathe in for 4 and out for 6, eight times. You can stop whenever you want.</p>
            <button type="button" onClick={start} className="mt-5 h-11 rounded-full bg-ilo-plum px-6 text-xs font-bold text-white">Start the pause</button>
          </>
        )}
        {phase === "breathe" && (
          <>
            <p className="font-display text-2xl text-ilo-plum">{cue.label}</p>
            <p className="mt-2 text-sm font-semibold text-ilo-ink">{cue.left}</p>
            <button type="button" onClick={stop} className="mt-5 text-xs font-semibold text-ilo-plum underline">Stop</button>
          </>
        )}
        {phase === "notice" && (
          <>
            <p className="font-display text-lg text-ilo-plum">Notice what is here.</p>
            <p className="mx-auto mt-2 max-w-[30ch] text-xs leading-relaxed text-ilo-ink/80">If a word for this moment shows up, you can keep it to yourself. This page does not record it.</p>
            <p className="mt-3 text-[10px] text-ilo-ink/60">{Math.max(0, NOTICE_SECONDS - elapsed)}s</p>
          </>
        )}
        {phase === "done" && (
          <>
            <p className="font-display text-lg text-ilo-plum">That was a pause, not an answer.</p>
            <p className="mx-auto mt-2 max-w-[32ch] text-xs leading-relaxed text-ilo-ink/80">If you want a next step, you can name the feeling, read something short, or message your counsellor.</p>
            <div className="mt-5 flex flex-col items-center gap-2">
              <Link href="/feelings" className="flex h-10 w-full max-w-[16rem] items-center justify-center rounded-full bg-ilo-plum text-xs font-bold text-white">What am I feeling?</Link>
              <Link href="/learn" className="text-xs font-semibold text-ilo-plum">Browse resources</Link>
              <button type="button" onClick={start} className="text-xs text-ilo-ink/70 underline">Start again</button>
            </div>
          </>
        )}
      </section>

      <p className="mt-4 text-[11px] leading-relaxed text-ilo-ink/70">
        If you need someone now, call Tele-MANAS on <a className="font-bold text-ilo-plum underline" href="tel:14416">14416</a>.
      </p>

      <a href="tel:14416" className="fixed bottom-16 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ilo-crisis px-4 py-2 text-xs font-bold text-white shadow-lg">
        <Heart className="h-3.5 w-3.5" /> Need help now
      </a>
      <BottomNav />
    </main>
  );
}
