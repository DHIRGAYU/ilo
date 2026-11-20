"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { BottomNav } from "@/components/ui/BottomNav";
import { FEELINGS } from "@/lib/student/wellness";

export function Feelings() {
  const [id, setId] = useState<string | null>(null);
  const picked = FEELINGS.find((feeling) => feeling.id === id) ?? null;

  return (
    <main className="relative px-4 pb-36 pt-7">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ilo-ink/70">Stays on this screen</p>
      <h1 className="mt-2 font-display text-[1.55rem] leading-tight text-ilo-plum">What am I feeling?</h1>
      <p className="mt-1 text-xs leading-relaxed text-ilo-ink/80">Pick the closest word. Nothing you tap is saved or sent.</p>

      <div role="radiogroup" aria-label="Feelings" className="mt-4 grid grid-cols-2 gap-2">
        {FEELINGS.map((feeling) => {
          const on = feeling.id === id;
          return (
            <button
              key={feeling.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setId(feeling.id)}
              className={`rounded-xl border px-3 py-3 text-left text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ilo-plum ${on ? "border-ilo-plum bg-ilo-blush text-ilo-plum" : "border-ilo-plum/10 bg-white text-ilo-ink"}`}
            >
              {feeling.label}
            </button>
          );
        })}
      </div>

      {picked && (
        <section className="mt-4 rounded-2xl border border-ilo-plum/10 bg-white p-4" aria-live="polite">
          <h2 className="font-display text-lg text-ilo-plum">{picked.label}</h2>
          <p className="mt-1 text-xs leading-relaxed text-ilo-ink/80">{picked.text}</p>
          <Link href={picked.start.href} className="mt-4 flex h-10 items-center justify-center rounded-full bg-ilo-plum text-xs font-bold text-white">{picked.start.label}</Link>
          {picked.start.href !== "/messages" && <Link href="/messages" className="mt-2 block text-center text-xs font-semibold text-ilo-plum">Or message your counsellor</Link>}
        </section>
      )}

      <a href="tel:14416" className="fixed bottom-16 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ilo-crisis px-4 py-2 text-xs font-bold text-white shadow-lg">
        <Heart className="h-3.5 w-3.5" /> Need help now
      </a>
      <BottomNav />
    </main>
  );
}
