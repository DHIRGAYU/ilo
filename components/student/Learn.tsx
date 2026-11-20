"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { BottomNav } from "@/components/ui/BottomNav";
import { GUIDES } from "@/lib/student/wellness";

export function Learn() {
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (GUIDES.some((guide) => guide.id === id)) setOpen(id);
  }, []);

  return (
    <main className="relative px-4 pb-36 pt-7">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ilo-ink/70">Read at your pace</p>
      <h1 className="mt-2 font-display text-[1.55rem] leading-tight text-ilo-plum">Browse resources</h1>
      <p className="mt-1 text-xs leading-relaxed text-ilo-ink/80">Short notes for campus life. They are not a substitute for your counsellor.</p>

      <ul className="mt-4 space-y-2">
        {GUIDES.map((guide) => {
          const on = open === guide.id;
          return (
            <li key={guide.id} id={guide.id}>
              <button
                type="button"
                aria-expanded={on}
                onClick={() => setOpen(on ? null : guide.id)}
                className="w-full rounded-xl border border-ilo-plum/10 bg-white p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ilo-plum"
              >
                <span className="block text-xs font-bold text-ilo-plum">{guide.title}</span>
                <span className="mt-0.5 block text-[11px] text-ilo-ink/70">{guide.summary}</span>
                {on && (
                  <span className="mt-3 block space-y-2 text-xs leading-relaxed text-ilo-ink">
                    {guide.body.map((paragraph) => <span key={paragraph} className="block">{paragraph}</span>)}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-[11px] leading-relaxed text-ilo-ink/70">
        If a note is not enough, <Link href="/messages" className="font-semibold text-ilo-plum underline">message your counsellor</Link> or call Tele-MANAS on <a className="font-bold text-ilo-plum underline" href="tel:14416">14416</a>.
      </p>

      <a href="tel:14416" className="fixed bottom-16 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ilo-crisis px-4 py-2 text-xs font-bold text-white shadow-lg">
        <Heart className="h-3.5 w-3.5" /> Need help now
      </a>
      <BottomNav />
    </main>
  );
}
