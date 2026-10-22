"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Download, KeyRound, Lock, Smartphone } from "lucide-react";
import { E2EEError, WrongRecoveryCodeError } from "@/lib/e2ee";
import { useE2EE } from "./E2EEProvider";

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ilo-plum";
const primary = `rounded-full bg-ilo-plum px-5 py-2.5 text-xs font-bold text-white disabled:opacity-40 ${focus}`;
const secondary = `rounded-full border border-ilo-plum/25 bg-white px-4 py-2 text-xs font-semibold text-ilo-plum ${focus}`;

// Shows the first-time, restore and switch-device screens until secure messaging is ready, then shows the real screen.
// audience only changes the framing: the counsellor workspace is wide, the student app is a narrow phone screen.
export function E2EEGate({ audience, backHref, children }: { audience: "student" | "counsellor"; backHref?: string; children: React.ReactNode }) {
  const { state, client, gateDone, retryInit } = useE2EE();
  const [code, setCode] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [input, setInput] = useState("");
  const [fresh, setFresh] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (state === "ready") return <>{children}</>;

  const who = audience === "counsellor" ? "your students" : "your counsellor";
  const shell = audience === "counsellor" ? "flex h-[calc(100dvh-3.5rem)] items-center justify-center overflow-y-auto p-4" : "flex h-full items-center justify-center overflow-y-auto p-4";

  async function run(fn: () => Promise<void>) {
    setBusy(true); setErr(null);
    try { await fn(); }
    catch (e) {
      if (e instanceof WrongRecoveryCodeError) setErr("That code doesn't match. Check it and try again. It has 24 letters and numbers.");
      else if (e instanceof E2EEError && (e.code === "key_exists" || e.code === "backup_out_of_date")) { setErr("Your account was set up somewhere else a moment ago. Reloading…"); retryInit(); }
      else if (e instanceof E2EEError && e.code === "backup_failed") setErr("Couldn't save your backup. Check your connection and try again.");
      else setErr("Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  const start = () => run(async () => { if (client) setCode(await client.beginSetup()); });
  const finish = () => run(async () => { await client?.finishSetup(); gateDone(); });
  const restore = () => run(async () => { await client?.restore(input); gateDone(); });
  const takeOver = () => run(async () => { await client?.takeOver(); gateDone(); });

  const download = () => {
    const blob = new Blob([`Ilo recovery code\n\n${code}\n\nKeep this somewhere safe. Anyone with this code and your sign-in can read your messages. Ilo cannot recover it for you.\n`], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "ilo-recovery-code.txt"; a.click();
    URL.revokeObjectURL(a.href);
  };

  let body: React.ReactNode;
  if (state === "loading") {
    body = <p className="text-center text-xs text-ilo-ink/70" role="status">Opening your secure messages…</p>;
  } else if (state === "error") {
    body = (
      <>
        <h2 className="font-display text-xl text-ilo-deep">Secure messaging couldn&apos;t start</h2>
        <p className="mt-2 text-xs leading-relaxed text-ilo-ink">This browser blocked the private storage Ilo needs. Try Chrome, Safari or Firefox, and turn off private browsing.</p>
        <button type="button" onClick={retryInit} className={`mt-4 ${primary}`}>Try again</button>
      </>
    );
  } else if (state === "other_device") {
    body = (
      <>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ilo-blush text-ilo-plum"><Smartphone className="h-5 w-5" aria-hidden="true" /></span>
        <h2 className="mt-3 font-display text-xl text-ilo-deep">Open on another device</h2>
        <p className="mt-2 text-xs leading-relaxed text-ilo-ink">Your secure messages are active on a different device. Use this one instead? New messages will come here, and the other device will ask you to switch back.</p>
        <button type="button" onClick={takeOver} disabled={busy} className={`mt-4 ${primary}`}>{busy ? "Switching…" : "Use this device"}</button>
      </>
    );
  } else if (code) {
    body = (
      <>
        <h2 className="font-display text-xl text-ilo-deep">Keep your recovery code</h2>
        <p className="mt-2 text-xs leading-relaxed text-ilo-ink">You&apos;ll need this code if you switch devices or clear your browser. <strong>Ilo can&apos;t recover it for you.</strong> Save it in a password manager, or write it down.</p>
        <p className="mt-4 select-all break-words rounded-2xl border border-ilo-plum/15 bg-ilo-bg px-4 py-4 text-center font-mono text-sm font-bold tracking-wider text-ilo-deep" aria-label="Your recovery code">{code}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => navigator.clipboard?.writeText(code)} className={`${secondary} flex items-center gap-1.5`}><Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy</button>
          <button type="button" onClick={download} className={`${secondary} flex items-center gap-1.5`}><Download className="h-3.5 w-3.5" aria-hidden="true" /> Download</button>
        </div>
        <label className="mt-4 flex items-start gap-2 text-xs text-ilo-ink">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#6b2a67]" />
          <span>I&apos;ve saved my recovery code somewhere safe.</span>
        </label>
        <button type="button" onClick={finish} disabled={!saved || busy} className={`mt-4 ${primary}`}>{busy ? "Saving…" : "Continue"}</button>
      </>
    );
  } else if (state === "needs_restore" && !fresh) {
    body = (
      <>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ilo-blush text-ilo-plum"><KeyRound className="h-5 w-5" aria-hidden="true" /></span>
        <h2 className="mt-3 font-display text-xl text-ilo-deep">Welcome back</h2>
        <p className="mt-2 text-xs leading-relaxed text-ilo-ink">This looks like a new device. Enter your recovery code to bring your messages back.</p>
        <label className="mt-4 block text-[11px] font-semibold text-ilo-plum" htmlFor="rc">Recovery code</label>
        <input id="rc" value={input} onChange={(e) => setInput(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
          className={`mt-1 w-full rounded-xl border border-ilo-plum/20 bg-white px-3 py-2.5 font-mono text-xs uppercase text-ilo-deep ${focus}`} />
        <button type="button" onClick={restore} disabled={busy || input.trim().length < 20} className={`mt-4 ${primary}`}>{busy ? "Restoring…" : "Restore my messages"}</button>
        <button type="button" onClick={() => { setFresh(true); setErr(null); }} className={`mt-3 block text-[11px] font-semibold text-ilo-plum underline ${focus}`}>I&apos;ve lost my code</button>
      </>
    );
  } else if (state === "needs_restore" && fresh) {
    body = (
      <>
        <h2 className="font-display text-xl text-ilo-deep">Start fresh?</h2>
        <p className="mt-2 text-xs leading-relaxed text-ilo-ink">Without the code, your old messages can&apos;t be brought back. Starting fresh makes a new key. Past conversations will be empty here, and any messages still waiting for you will be lost.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={start} disabled={busy} className={primary}>{busy ? "Working…" : "Start fresh"}</button>
          <button type="button" onClick={() => setFresh(false)} className={secondary}>Go back</button>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ilo-blush text-ilo-plum"><Lock className="h-5 w-5" aria-hidden="true" /></span>
        <h2 className="mt-3 font-display text-xl text-ilo-deep">Turn on secure messaging</h2>
        <p className="mt-2 text-xs leading-relaxed text-ilo-ink">Messages between you and {who} are locked on your device before they are sent. Ilo&apos;s servers only ever hold scrambled text that they can&apos;t read.</p>
        <p className="mt-2 text-xs leading-relaxed text-ilo-ink">You&apos;ll get a recovery code to keep. It takes about a minute.</p>
        <button type="button" onClick={start} disabled={busy} className={`mt-4 ${primary}`}>{busy ? "Creating…" : "Create my secure key"}</button>
      </>
    );
  }

  return (
    <div className={shell}>
      <div className="w-full max-w-sm">
        {backHref && <Link href={backHref} className={`mb-3 inline-block text-xs font-semibold text-ilo-plum ${focus}`}>← Back</Link>}
        <section aria-live="polite" className="w-full rounded-3xl border border-ilo-plum/10 bg-white p-6 shadow-sm">
          {body}
          {err && <p role="alert" className="mt-3 text-[11px] font-semibold text-ilo-crisis">{err}</p>}
        </section>
      </div>
    </div>
  );
}
