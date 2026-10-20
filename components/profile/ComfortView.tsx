"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, Check, ChevronLeft, Languages, Lock, MessageCircle, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LANGUAGES, matchesPrefs, type GenderPref } from "@/lib/counsellors";
import { shortName } from "@/lib/sessions";

export type ComfortCounsellor = {
  id: string;
  display_name: string;
  credentials: string | null;
  designation: string | null;
  room: string | null;
  bio: string | null;
  gender: "female" | "male" | null;
  languages: string[];
};

const GENDERS: { id: GenderPref; label: string }[] = [
  { id: "any", label: "No Preference / Any" },
  { id: "female", label: "Female Counsellor" },
  { id: "male", label: "Male Counsellor" },
];

const label = "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ilo-ink/70";
const chipBase = "rounded-full border px-3.5 py-1.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ilo-plum";

export function ComfortView({ userId, counsellors, initialLanguages, initialGender }: {
  userId: string;
  counsellors: ComfortCounsellor[];
  initialLanguages: string[];
  initialGender: GenderPref;
}) {
  const [langs, setLangs] = useState<string[]>(initialLanguages);
  const [gender, setGender] = useState<GenderPref>(initialGender);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const seq = useRef(0);

  async function save(l: string[], g: GenderPref) {
    const id = ++seq.current;
    setStatus("saving");
    const { error } = await createClient()
      .from("profiles")
      .update({ preferred_languages: l, preferred_gender: g })
      .eq("id", userId);
    if (id === seq.current) setStatus(error ? "error" : "saved");
  }

  function toggleLang(l: string | null) {
    const next = l === null ? [] : langs.includes(l) ? langs.filter((x) => x !== l) : [...langs, l];
    setLangs(next);
    save(next, gender);
  }
  function pickGender(g: GenderPref) {
    setGender(g);
    save(langs, g);
  }

  const prefs = { preferred_languages: langs, preferred_gender: gender };
  const matched = counsellors.filter((c) => matchesPrefs(c, prefs));
  const list = matched.length ? matched : counsellors;

  return (
    <main className="relative flex min-h-full flex-col">
      <header className="sticky top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center border-b border-ilo-plum/10 bg-ilo-bg/95 px-4 pb-3 pt-7 backdrop-blur">
        <Link href="/profile" className="flex w-fit items-center gap-0.5 text-xs text-ilo-ink"><ChevronLeft className="h-4 w-4" /> Back</Link>
        <h1 className="font-display text-base text-ilo-plum">Counsellor Comfort</h1>
        <span />
      </header>

      <div className="flex-1 space-y-5 px-4 pb-4 pt-4">
        <section>
          <span className="inline-block rounded-full bg-ilo-blush px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-ilo-plum">Framed as comfort, not a form</span>
          <h2 className="mt-2 font-display text-xl leading-tight text-ilo-plum">Find someone you feel natural speaking with</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-ilo-ink/80">
            Language nuance and identity comfort make conversations smoother. Choose your preferred spoken tongue and counsellor background.
          </p>
        </section>

        <section aria-labelledby="lang">
          <h3 id="lang" className={label}><Languages className="h-3.5 w-3.5" /> Spoken languages</h3>
          <div role="group" aria-labelledby="lang" className="mt-2 flex flex-wrap gap-2">
            <button type="button" aria-pressed={langs.length === 0} onClick={() => toggleLang(null)}
              className={`${chipBase} ${langs.length === 0 ? "border-ilo-plum bg-ilo-plum text-white" : "border-ilo-plum/15 bg-white text-ilo-plum"}`}>
              All Languages
            </button>
            {LANGUAGES.map((l) => {
              const on = langs.includes(l);
              return (
                <button key={l} type="button" aria-pressed={on} onClick={() => toggleLang(l)}
                  className={`${chipBase} ${on ? "border-ilo-plum bg-ilo-plum text-white" : "border-ilo-plum/15 bg-white text-ilo-plum"}`}>
                  {l}
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="gen">
          <h3 id="gen" className={label}><Users className="h-3.5 w-3.5" /> Counsellor gender preference</h3>
          <div role="radiogroup" aria-labelledby="gen" className="mt-2 space-y-2">
            {GENDERS.map((g) => {
              const on = g.id === gender;
              return (
                <button key={g.id} type="button" role="radio" aria-checked={on} onClick={() => pickGender(g.id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-ilo-plum ${on ? "border-ilo-plum bg-ilo-blush font-semibold text-ilo-plum" : "border-ilo-plum/15 bg-white text-ilo-ink"}`}>
                  {g.label} {on && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
          <p aria-live="polite" className={`mt-2 text-[10px] ${status === "error" ? "font-semibold text-ilo-crisis" : "text-ilo-ink/60"}`}>
            {status === "saving" && "Saving…"}
            {status === "saved" && "Saved. We'll show you the best fit first."}
            {status === "error" && "Couldn't save. Check your connection and try again."}
          </p>
        </section>

        <section aria-labelledby="avail">
          <h3 id="avail" className="font-display text-base text-ilo-plum">Available Campus Counsellors ({list.length})</h3>
          {matched.length === 0 && counsellors.length > 0 && (
            <p className="mt-1 text-[11px] text-ilo-ink/80">No one at your college matches both choices yet. Here is everyone available.</p>
          )}
          {counsellors.length === 0 && <p className="mt-2 text-xs text-ilo-ink">Your college hasn&apos;t added a counsellor yet.</p>}
          <div className="mt-2 space-y-3">
            {list.map((c) => (
              <article key={c.id} className="rounded-2xl border border-ilo-plum/15 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-bold text-ilo-plum">{c.display_name}</h4>
                  {c.gender && <span className="rounded-full bg-ilo-blush px-2.5 py-0.5 text-[10px] font-semibold capitalize text-ilo-plum">{c.gender}</span>}
                </div>
                {c.credentials && <p className="mt-0.5 text-[11px] text-ilo-ink/80">{c.credentials}</p>}
                {c.room && <p className="mt-0.5 text-[11px] text-[#6f7b3d]">{c.room}</p>}
                {c.languages.length > 0 && <p className="mt-0.5 text-[10px] text-ilo-ink/60">Speaks {c.languages.join(", ")}</p>}
                {c.bio && <p className="mt-2 rounded-xl border border-ilo-plum/10 bg-ilo-bg p-3 text-[11px] leading-relaxed text-ilo-ink">{c.bio}</p>}
                <div className="mt-3 flex justify-end gap-2">
                  <Link href={`/messages?c=${c.id}`} className="flex h-9 items-center gap-1.5 rounded-full border border-ilo-plum/20 px-3.5 text-xs font-semibold text-ilo-plum">
                    <MessageCircle className="h-3.5 w-3.5" /> Message
                  </Link>
                  <Link href={`/sessions/book?counsellor=${c.id}`} className="flex h-9 items-center gap-1.5 rounded-full bg-ilo-plum px-3.5 text-xs font-bold text-white">
                    <CalendarDays className="h-3.5 w-3.5" /> Book with {shortName(c.display_name)}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <p className="sticky bottom-0 z-10 flex items-center justify-center gap-2 border-t border-ilo-plum/10 bg-white/95 px-4 py-2 text-center text-[10px] leading-snug text-ilo-ink backdrop-blur">
        <Lock className="h-3 w-3 shrink-0" />
        <span>Your college sees that counselling happened. <strong className="text-ilo-plum">Never who. Never what was said.</strong></span>
      </p>
    </main>
  );
}
