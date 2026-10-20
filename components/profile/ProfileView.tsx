"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, EyeOff, Heart, Languages, Lock, LogOut, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { BottomNav } from "@/components/ui/BottomNav";

const SHEET_POINTS = [
  { title: "Totals, never names", text: "Your college sees that counselling is happening, as overall numbers only. It does not see who came." },
  { title: "Your chats stay between you and your counsellor", text: "Faculty and administration have no access to your messages, notes, or what you share in a session." },
  { title: "Your college email only proves you belong", text: "We use it to check that you are a student of your college. It is not shared with college staff." },
];

function RowBody({ icon: Icon, title, sub }: { icon: typeof Lock; title: string; sub: string }) {
  return (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ilo-blush text-ilo-plum"><Icon className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-ilo-plum">{title}</span>
        <span className="block text-[10px] leading-snug text-ilo-ink/70">{sub}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-ilo-ink/60" />
    </>
  );
}

const row = "flex w-full items-center gap-3 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ilo-plum";

export function ProfileView({ firstName, initials, college }: { firstName: string; initials: string; college: string }) {
  const [open, setOpen] = useState(false);
  const [langHint, setLangHint] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  function show() { opener.current = document.activeElement as HTMLElement; setOpen(true); }
  function hide() { setOpen(false); opener.current?.focus(); }

  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") hide(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!langHint) return;
    const t = setTimeout(() => setLangHint(false), 3000);
    return () => clearTimeout(t);
  }, [langHint]);

  return (
    <main className="relative px-4 pb-44 pt-7">
      <div className="relative flex items-center justify-center">
        <h2 className="font-display text-base text-ilo-plum">Profile</h2>
        <button type="button" onClick={show} className="absolute right-0 flex items-center gap-1 rounded-full border border-ilo-plum/15 bg-ilo-blush px-2.5 py-0.5 text-[10px] font-semibold text-ilo-plum">
          <ShieldCheck className="h-3 w-3" /> Signed in privately
        </button>
      </div>

      <h1 className="mt-6 font-display text-2xl leading-tight text-ilo-plum">Your private space.</h1>
      <p className="mt-1 text-xs leading-snug text-ilo-ink/70">Your name is only used to help your counsellor greet you.</p>

      <section aria-label="Your account" className="mt-4 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-ilo-plum to-ilo-deep p-4 text-white shadow-md">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink-300 text-xs font-bold text-ilo-deep" aria-hidden="true">{initials}</span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl leading-tight">{firstName}</p>
          <p className="truncate text-[10px] text-pink-200">Private sign-in · {college}</p>
        </div>
        <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
      </section>

      <h2 className="mt-6 text-xs font-bold text-ilo-plum">Comfort &amp; privacy</h2>
      <ul className="mt-1 divide-y divide-ilo-plum/10">
        <li>
          <Link href="/profile/comfort" className={row}>
            <RowBody icon={SlidersHorizontal} title="Counsellor preferences" sub="Languages and who you feel comfortable with" />
          </Link>
        </li>
        <li>
          <button type="button" onClick={show} className={row}>
            <RowBody icon={ShieldCheck} title="What your college can see" sub="A clear explanation of your privacy boundary" />
          </button>
        </li>
        <li>
          <button type="button" onClick={() => setLangHint(true)} className={row}>
            <RowBody icon={Languages} title="Language" sub="English · Hindi" />
          </button>
          {langHint && <p role="status" className="pb-2 pl-12 text-[10px] font-medium text-ilo-plum">Language choice is coming soon.</p>}
        </li>
        <li>
          <form action="/auth/signout" method="post">
            <button type="submit" className={row}>
              <RowBody icon={LogOut} title="Sign out privately" sub="Sign out of Ilo on this device" />
            </button>
          </form>
        </li>
      </ul>

      <p className="mt-5 flex gap-2 text-[10px] leading-snug text-ilo-ink/70">
        <Lock className="mt-0.5 h-3 w-3 shrink-0" /> Your college sees that counselling happened. Never who. Never what was said.
      </p>

      <a
        href="tel:14416"
        className="fixed bottom-16 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ilo-crisis px-4 py-2 text-xs font-bold text-white shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ilo-crisis"
      >
        <Heart className="h-3.5 w-3.5" /> Need help now
      </a>

      <BottomNav />

      {open && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-ilo-deep/50" onClick={hide} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-labelledby="sheet-title" className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-ilo-bg px-5 pb-6 pt-3 shadow-2xl">
            <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-ilo-plum/20" aria-hidden="true" />
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ilo-blush text-ilo-plum"><EyeOff className="h-5 w-5" /></span>
              <div className="flex-1">
                <h2 id="sheet-title" className="font-display text-lg leading-tight text-ilo-plum">What your college can see</h2>
                <p className="text-[11px] text-ilo-ink/70">A clear boundary, in plain words.</p>
              </div>
              <button ref={closeBtn} type="button" onClick={hide} aria-label="Close" className="p-1 text-ilo-ink/70"><X className="h-5 w-5" /></button>
            </div>
            <ul className="mt-4 space-y-3">
              {SHEET_POINTS.map((p) => (
                <li key={p.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ilo-blush text-ilo-plum"><Check className="h-3.5 w-3.5" /></span>
                  <span>
                    <span className="block text-xs font-bold text-ilo-plum">{p.title}</span>
                    <span className="block text-[11px] leading-snug text-ilo-ink/80">{p.text}</span>
                  </span>
                </li>
              ))}
            </ul>
            <button type="button" onClick={hide} className="mt-5 h-11 w-full rounded-full bg-ilo-plum text-xs font-bold text-white">Got it</button>
          </div>
        </div>
      )}
    </main>
  );
}
