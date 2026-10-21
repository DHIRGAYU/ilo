"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const field = "mt-1.5 h-11 w-full rounded-xl border border-ilo-plum/15 bg-white px-3.5 text-sm text-ilo-ink placeholder:text-ilo-ink/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ilo-plum";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setError("That email or password isn't right. Please check and try again.");
      setBusy(false);
      return;
    }

    // Only accounts linked to a counsellor profile may use this sign-in. This is the same check the workspace
    // itself uses, so a counsellor who can open the dashboard is never turned away here.
    const { data: { user } } = await supabase.auth.getUser();
    const { data: link } = user
      ? await supabase.from("counsellors").select("id").eq("profile_id", user.id).maybeSingle()
      : { data: null };
    if (!link) {
      await supabase.auth.signOut({ scope: "local" });
      setError("This sign-in is for counsellors. Students sign in with their college Google account.");
      setBusy(false);
      return;
    }

    router.replace("/counsellor");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-ilo-blush/60 to-ilo-bg px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl border border-ilo-plum/10 bg-white p-7 shadow-xl">
          <Image src="/images/logo.png" alt="ilo" width={270} height={390} priority className="mx-auto h-14 w-auto" />
          <h1 className="mt-4 text-center font-display text-2xl text-ilo-plum">Counsellor sign-in</h1>
          <p className="mt-1 text-center text-xs leading-relaxed text-ilo-ink/70">
            Use the email and password your institution received from Ilo.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="text-xs font-semibold text-ilo-plum">Institution email</label>
              <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@yourinstitution.edu.in" className={field} />
            </div>
            <div>
              <label htmlFor="password" className="text-xs font-semibold text-ilo-plum">Password</label>
              <div className="relative">
                <input id="password" type={show ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={`${field} pr-11`} />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} className="absolute right-1 top-1.5 flex h-9 w-9 items-center justify-center text-ilo-ink/60">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <p role="alert" className="rounded-lg bg-ilo-crisis/10 px-3 py-2 text-xs font-medium text-ilo-crisis">{error}</p>}

            <button type="submit" disabled={busy || !email || !password} className="h-11 w-full rounded-xl bg-gradient-to-b from-ilo-plum to-ilo-deep text-sm font-bold text-white shadow-md transition-opacity disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ilo-plum">
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-ilo-ink/70">
            Forgot your password? Please ask your Ilo administrator to reset it.
          </p>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-ilo-ink/70"><Lock className="h-3 w-3" /> Counsellor access only</p>
        <p className="mt-2 text-center text-xs text-ilo-ink/80">
          Student? <Link href="/login" className="font-semibold text-ilo-plum underline-offset-2 hover:underline">Sign in here</Link>
          <span className="mx-2 text-ilo-ink/30">·</span>
          <Link href="/" className="font-semibold text-ilo-plum underline-offset-2 hover:underline">Back to website</Link>
        </p>
      </div>
    </main>
  );
}
