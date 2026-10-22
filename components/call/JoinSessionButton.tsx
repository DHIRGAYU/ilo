"use client";

import { useEffect, useState } from "react";
import { Phone, Video } from "lucide-react";
import { useCall } from "@/components/call/CallProvider";

// Shows "Join" while a booked session is on (from 10 minutes before it starts until 15 minutes after it ends).
// The database enforces the same rule, so hiding the button is only a convenience.
export function JoinSessionButton({ appointmentId, kind, startsAtMs, endsAtMs, label, variant = "solid" }: {
  appointmentId: string; kind: "audio" | "video"; startsAtMs: number; endsAtMs: number; label?: string; variant?: "solid" | "light";
}) {
  const { startCall, busy } = useCall();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  if (now === null) return null; // wait for the browser clock, so server and browser always agree
  const Icon = kind === "video" ? Video : Phone;
  const text = label ?? (kind === "video" ? "Join video session" : "Start call");

  if (now < startsAtMs - 10 * 60_000) {
    return <p className={`text-[11px] ${variant === "light" ? "text-white/70" : "text-ilo-ink/60"}`}>The call opens 10 minutes before the session.</p>;
  }
  if (now > endsAtMs + 15 * 60_000) return null;

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => startCall({ appointmentId, kind })}
      className={`inline-flex h-10 items-center gap-2 rounded-full px-5 text-xs font-bold transition-opacity disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
        variant === "light" ? "bg-white text-ilo-plum focus-visible:outline-white" : "bg-ilo-plum text-white focus-visible:outline-ilo-plum"
      }`}
    >
      <Icon className="h-4 w-4" /> {text}
    </button>
  );
}
