"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, Lock, Phone } from "lucide-react";
import { E2EEGate } from "@/components/e2ee/E2EEGate";
import { E2EEProvider, useE2EE } from "@/components/e2ee/E2EEProvider";
import { LIMITS, TOPICS, URGENCY, YEARS, requestError, toJson, type RequestStatus, type Urgency } from "@/lib/requests-shared";
import { createClient } from "@/lib/supabase/client";

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ilo-plum";

type Props = {
  userId: string;
  counsellor: { id: string; shortName: string; fullName: string };
  latest: { status: RequestStatus; createdMs: number } | null;
  nowMs: number;
};

export function RequestView(props: Props) {
  return (
    <E2EEProvider userId={props.userId}>
      <E2EEGate audience="student" backHref="/home">
        <RequestInner {...props} />
      </E2EEGate>
    </E2EEProvider>
  );
}

function Help() {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-ilo-blush/60 px-3 py-2.5 text-[11px] leading-snug text-ilo-plum">
      <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>If you feel unsafe right now, call <a href="tel:14416" className="font-bold underline">Tele-MANAS 14416</a> (free, 24×7) or <a href="tel:112" className="font-bold underline">112</a>. You don&apos;t need to wait for a reply.</span>
    </p>
  );
}

function RequestInner({ counsellor, latest }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { client } = useE2EE();
  const [state, setState] = useState<RequestStatus | null>(latest && latest.status !== "closed" ? latest.status : null);
  const [topic, setTopic] = useState("");
  const [urgency, setUrgency] = useState<Urgency | "">("");
  const [note, setNote] = useState("");
  const [year, setYear] = useState("");
  const [branch, setBranch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentUrgent, setSentUrgent] = useState(false);

  async function submit() {
    if (!client || !topic || !urgency) return;
    setBusy(true); setError(null);
    try {
      // The conversation is created if needed, so the counsellor can reply. Then the request is locked for them and sent.
      const conv = await supabase.rpc("start_conversation", { p_counsellor_id: counsellor.id });
      if (conv.error || !conv.data) throw new Error(conv.error?.message ?? "start_failed");
      const convId = conv.data as string;
      const peer = await supabase.rpc("get_peer_public_key", { p_conversation_id: convId });
      const key = (peer.data as { public_key: string; key_version: number }[] | null)?.[0];
      if (!key) throw new Error("recipient_no_key");
      const id = crypto.randomUUID();
      const sealed = await client.sealFor(id, toJson({ v: 1, topic, urgency, note, year, branch }), key.public_key);
      const sent = await supabase.rpc("submit_support_request", {
        p_conversation_id: convId, p_request_id: id, p_ciphertext: sealed.ciphertext, p_nonce: sealed.nonce, p_recipient_key_version: key.key_version,
      });
      if (sent.error) throw new Error(sent.error.message);
      // An urgent request also goes to the top of the counsellor's inbox
      if (urgency === "urgent") await supabase.rpc("raise_escalation", { p_conversation_id: convId, p_reason: "other", p_note: null });
      setSentUrgent(urgency === "urgent");
      setState("new");
      router.refresh();
    } catch (e) {
      setError(requestError(e instanceof Error ? e.message : ""));
    } finally {
      setBusy(false);
    }
  }

  const header = (
    <header className="flex items-center gap-2 pb-3 pt-1">
      <Link href="/home" aria-label="Back to home" className="p-1 text-ilo-ink"><ChevronLeft className="h-5 w-5" /></Link>
      <h1 className="font-display text-lg text-ilo-plum">Request support</h1>
    </header>
  );

  if (state) {
    const text = {
      new: { title: "Your request is with " + counsellor.shortName, body: `${counsellor.shortName} will read it and reply here, usually within a day or two. You don't need to do anything else.` },
      accepted: { title: counsellor.shortName + " accepted your request", body: "They'll be in touch in your messages. You can also book a time that suits you." },
      referred: { title: "Next steps are in your messages", body: `${counsellor.shortName} has suggested the best way to get you support. Please check your messages.` },
      closed: { title: "", body: "" },
    }[state];
    return (
      <main className="min-h-full px-4 pb-10 pt-7">
        {header}
        <section className="rounded-2xl border border-ilo-plum/10 bg-white p-5 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-ilo-blush text-ilo-plum"><CheckCircle2 className="h-5 w-5" aria-hidden="true" /></span>
          <h2 className="mt-3 font-display text-lg text-ilo-plum">{text.title}</h2>
          <p className="mt-2 text-xs leading-relaxed text-ilo-ink">{text.body}</p>
          {sentUrgent && <p className="mt-3 text-xs font-semibold text-ilo-crisis">We&apos;ve marked it as urgent for {counsellor.shortName}.</p>}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {(state === "accepted" || state === "referred") && <Link href="/messages" className={`rounded-full bg-ilo-plum px-5 py-2.5 text-xs font-bold text-white ${focus}`}>Open messages</Link>}
            {state === "accepted" && <Link href="/sessions/book" className={`rounded-full border border-ilo-plum/25 px-5 py-2.5 text-xs font-semibold text-ilo-plum ${focus}`}>Book a session</Link>}
            <Link href="/home" className={`rounded-full border border-ilo-plum/25 px-5 py-2.5 text-xs font-semibold text-ilo-plum ${focus}`}>Back home</Link>
          </div>
        </section>
        <div className="mt-4"><Help /></div>
      </main>
    );
  }

  const canSend = !!topic && !!urgency && !busy;
  const field = `w-full rounded-xl border border-ilo-plum/20 bg-white px-3 py-2.5 text-xs text-ilo-deep placeholder:text-ilo-ink/40 ${focus}`;
  return (
    <main className="min-h-full px-4 pb-10 pt-7">
      {header}
      <p className="text-xs leading-relaxed text-ilo-ink">Not sure what to book, or can&apos;t find a time? Tell {counsellor.shortName} a little about what&apos;s on your mind. Share only what you&apos;d like to.</p>
      <p className="mt-2 flex items-start gap-2 text-[11px] leading-snug text-ilo-ink/80"><Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" /> It&apos;s locked on your device and only {counsellor.shortName} can read it. If another counsellor at your college could help better, {counsellor.shortName} may share it with them. Your college never sees it.</p>

      <fieldset className="mt-5">
        <legend className="text-xs font-bold text-ilo-plum">What&apos;s on your mind?</legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {TOPICS.map((t) => (
            <label key={t} className={`cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ilo-plum ${topic === t ? "border-ilo-plum bg-ilo-plum text-white" : "border-ilo-plum/25 bg-white text-ilo-plum"}`}>
              <input type="radio" name="topic" value={t} checked={topic === t} onChange={() => setTopic(t)} className="sr-only" />{t}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5">
        <label htmlFor="rq-note" className="text-xs font-bold text-ilo-plum">Anything you&apos;d like them to know? <span className="font-normal text-ilo-ink/60">(optional)</span></label>
        <textarea id="rq-note" value={note} onChange={(e) => setNote(e.target.value)} rows={4} maxLength={LIMITS.note} placeholder="In your own words, as little or as much as you like." className={`mt-2 resize-y ${field}`} />
        <p className="mt-1 text-right text-[10px] text-ilo-ink/50">{note.length}/{LIMITS.note}</p>
      </div>

      <fieldset className="mt-3">
        <legend className="text-xs font-bold text-ilo-plum">How soon would you like to hear back?</legend>
        <div className="mt-2 space-y-1.5">
          {(Object.keys(URGENCY) as Urgency[]).map((u) => (
            <label key={u} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ilo-plum ${urgency === u ? "border-ilo-plum bg-ilo-blush/60" : "border-ilo-plum/15 bg-white"}`}>
              <input type="radio" name="urgency" value={u} checked={urgency === u} onChange={() => setUrgency(u)} className="mt-0.5 h-4 w-4 accent-[#6b2a67]" />
              <span><span className="block text-xs font-bold text-ilo-deep">{URGENCY[u].student}</span><span className="block text-[11px] text-ilo-ink/70">{URGENCY[u].hint}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="rq-year" className="text-xs font-bold text-ilo-plum">Year <span className="font-normal text-ilo-ink/60">(optional)</span></label>
          <select id="rq-year" value={year} onChange={(e) => setYear(e.target.value)} className={`mt-2 ${field}`}>
            <option value="">Prefer not to say</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="rq-branch" className="text-xs font-bold text-ilo-plum">Course <span className="font-normal text-ilo-ink/60">(optional)</span></label>
          <input id="rq-branch" value={branch} onChange={(e) => setBranch(e.target.value)} maxLength={LIMITS.branch} placeholder="e.g. Civil Engineering" className={`mt-2 ${field}`} />
        </div>
      </div>

      {error && <p role="alert" className="mt-4 text-xs font-semibold text-ilo-crisis">{error}</p>}
      <button type="button" onClick={submit} disabled={!canSend} className={`mt-5 w-full rounded-full bg-ilo-plum px-5 py-3 text-xs font-bold text-white disabled:opacity-40 ${focus}`}>{busy ? "Sending…" : "Send request"}</button>
      <div className="mt-4"><Help /></div>
      <p className="mt-3 text-center text-[10px] text-ilo-ink/50">Prefer to pick a time yourself? <Link href="/sessions/book" className="font-semibold text-ilo-plum underline">Book a session</Link></p>
    </main>
  );
}
