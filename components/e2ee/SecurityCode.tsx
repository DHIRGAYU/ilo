"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { useE2EE } from "@/components/e2ee/E2EEProvider";

export function SecurityCode({ conversationId, name }: { conversationId: string; name: string }) {
    const { client, rev } = useE2EE();
    const [open, setOpen] = useState(false);
    const [code, setCode] = useState<string | null>(null);
    const [changed, setChanged] = useState(false);
    const [busy, setBusy] = useState(false);
    const closeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        let live = true;
        client?.keyChanged(conversationId).then((v) => { if (live) setChanged(v); });
        return () => { live = false; };
    }, [client, conversationId, rev, open]);

    useEffect(() => {
        if (!open || !client) return;
        setCode(null);
        client.safetyCode(conversationId).then(setCode).catch(() => setCode(""));
        closeRef.current?.focus();
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, client, conversationId]);

    if (!client) return null;
    return (
        <>
            <button type="button" onClick={() => setOpen(true)} aria-label={changed ? `Security code (${name}'s key changed)` : "Security code"} className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ilo-plum/20 bg-white text-ilo-plum focus-visible:outline focus-visible:outline-2 focus-visible:outline-ilo-plum">
                <ShieldCheck className="h-3.5 w-3.5" />
                {changed && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-ilo-crisis" />}
            </button>
            {open && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                    <div className="absolute inset-0 bg-ilo-deep/50" onClick={() => setOpen(false)} aria-hidden="true" />
                    <div role="dialog" aria-modal="true" aria-labelledby="sec-title" className="relative w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
                        <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Close" className="absolute right-3 top-3 p-2 text-ilo-ink/70"><X className="h-5 w-5" /></button>
                        <h2 id="sec-title" className="font-display text-xl text-ilo-plum">Security code</h2>
                        <p className="mt-1 text-xs leading-relaxed text-ilo-ink/80">
                            To be sure nobody is listening in, read this code to {name} on a call or in person. If you both see the same numbers, your messages are private between you.
                        </p>
                        <p className="mt-4 grid grid-cols-4 gap-x-3 gap-y-1.5 rounded-xl bg-ilo-bg p-3 text-center font-mono text-xs font-bold tracking-wider text-ilo-deep">
                            {code ? code.split(" ").map((g, i) => <span key={i}>{g}</span>) : <span className="col-span-4 font-sans font-normal text-ilo-ink/60">{code === "" ? "Couldn't load the code. Try again." : "Loading…"}</span>}
                        </p>
                        {changed && (
                            <div role="alert" className="mt-4 rounded-xl bg-ilo-crisis/10 p-3 text-xs leading-relaxed text-ilo-ink">
                                <p className="font-bold text-ilo-crisis">{name}&apos;s security key changed.</p>
                                <p className="mt-1">This usually means they set up a new device or reset their key. If you weren&apos;t expecting that, check the code with them before sending anything private. New messages from them are waiting until you continue.</p>
                                <button type="button" disabled={busy} onClick={async () => { setBusy(true); await client.trustNewKey(conversationId); setBusy(false); setChanged(false); setOpen(false); }} className="mt-3 h-9 w-full rounded-full bg-ilo-crisis text-xs font-bold text-white disabled:opacity-60">
                                    {busy ? "Continuing…" : "I've checked, continue"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}