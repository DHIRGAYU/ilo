"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Lock, PhoneOff } from "lucide-react";
import type { DailyCall } from "@daily-co/daily-js";
import { createClient } from "@/lib/supabase/client";

type Role = "student" | "counsellor";
type Kind = "audio" | "video";
type Phase = "idle" | "starting" | "outgoing" | "incoming" | "connecting" | "incall" | "notice";
type ActiveCall = { id: string; kind: Kind; peer: string };
type Notice = { title: string; body?: string; help?: boolean };
export type StartArgs = { conversationId?: string; counsellorId?: string; appointmentId?: string; kind: Kind };
type CallRow = { id: string; status: string; initiator_id: string };

const RING_MS = 45_000;
const ERRORS: Record<string, string> = {
  not_configured: "Calls aren't set up yet. Please send a message instead.",
  rate_limited: "You've started a few calls in a row. Please wait a few minutes and try again.",
  too_early: "The call for this session opens 15 minutes before it starts.",
  not_allowed: "This call isn't available.",
  provider_failed: "We couldn't open the call room. Please try again in a moment.",
  start_failed: "We couldn't start the call. Please try again, or send a message.",
};

const Ctx = createContext<{ startCall: (a: StartArgs) => Promise<void>; busy: boolean }>({ startCall: async () => {}, busy: false });
export const useCall = () => useContext(Ctx);

const initialOf = (name: string) =>
  (name.split(" ").filter((w) => !/^(dr|prof|mr|ms|mrs)\.?$/i.test(w))[0]?.[0] ?? "?").toUpperCase();
// Supabase calls only run once something waits on them, so fire-and-forget calls go through here
const fire = (p: PromiseLike<unknown>) => { p.then(() => {}, () => {}); };

export function CallProvider({ role, children }: { role: Role; children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [phase, setPhaseState] = useState<Phase>("idle");
  const [call, setCallState] = useState<ActiveCall | null>(null);
  const [session, setSession] = useState<{ url: string; token: string } | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const phaseRef = useRef<Phase>("idle");
  const callRef = useRef<ActiveCall | null>(null);
  const frameRef = useRef<DailyCall | null>(null);
  const holder = useRef<HTMLDivElement>(null);
  const myId = useRef<string | null>(null);
  const ringTimer = useRef<number | null>(null);
  const pollTimer = useRef<number | null>(null);
  const noticeTimer = useRef<number | null>(null);

  const setPhase = (p: Phase) => { phaseRef.current = p; setPhaseState(p); };
  const setCall = (c: ActiveCall | null) => { callRef.current = c; setCallState(c); };

  const isTearingDownRef = useRef(false);

  const clearTimers = () => {
    if (ringTimer.current) window.clearTimeout(ringTimer.current);
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    ringTimer.current = null;
    pollTimer.current = null;
  };
  const destroyFrame = () => {
    isTearingDownRef.current = true;
    const f = frameRef.current;
    frameRef.current = null;
    if (f) {
      try {
        f.destroy().catch(() => {});
      } catch {}
    }
  };
  const reset = () => { clearTimers(); destroyFrame(); setSession(null); setCall(null); setPhase("idle"); };
  const closeNotice = () => { setNotice(null); setPhase("idle"); };

  // Ends the call on screen and tells the other side, then shows a short message
  const finish = (n: Notice, endOnServer = true) => {
    console.log("[CallProvider] finish:", n.title, n.body ?? "", "endOnServer:", endOnServer);
    const c = callRef.current;
    if (!c) return; // already finished
    clearTimers();
    destroyFrame();
    setSession(null);
    setCall(null);
    if (endOnServer) fire(supabase.rpc("end_call", { p_call_id: c.id }));
    setNotice(n);
    setPhase("notice");
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    if (!n.help) noticeTimer.current = window.setTimeout(() => { if (phaseRef.current === "notice") closeNotice(); }, 5000);
  };

  const noAnswer = (c: ActiveCall): Notice => ({ title: "No answer", body: `${c.peer} isn't available right now.`, help: role === "student" });

  const connect = async (callId: string) => {
    clearTimers();
    setPhase("connecting");
    try {
      const res = await fetch("/api/calls/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callId }) });
      if (!res.ok) throw new Error(String(res.status));
      const j = (await res.json()) as { roomUrl: string; token: string };
      if (callRef.current?.id !== callId) return; // cancelled while we were waiting
      setSession({ url: j.roomUrl, token: j.token });
      setPhase("incall");
    } catch {
      finish({ title: "Couldn't connect", body: "Please check your connection and try again." });
    }
  };

  // The database says the call changed state
  const handleStatus = (status: string) => {
    const c = callRef.current;
    const ph = phaseRef.current;
    if (!c) return;
    if (ph === "outgoing") {
      if (status === "active") void connect(c.id);
      else if (status === "declined") finish({ title: "Call declined", body: `${c.peer} can't talk right now.`, help: role === "student" }, false);
      else if (status === "missed" || status === "ended") finish(noAnswer(c), false);
    } else if (ph === "incoming") {
      if (status !== "ringing") reset();
    } else if (ph === "connecting" || ph === "incall") {
      if (status === "ended" || status === "missed") finish({ title: "Call ended" }, false);
    }
  };

  const statusOf = async (id: string) => {
    const { data } = await supabase.rpc("call_context", { p_call_id: id });
    return (data as { status?: string } | null)?.status;
  };

  const showIncoming = async (id: string) => {
    const { data, error } = await supabase.rpc("call_context", { p_call_id: id });
    const ph = phaseRef.current;
    if (error || !data || (ph !== "idle" && ph !== "notice")) return;
    const ctx = data as { kind: Kind; peer_name: string; status: string };
    if (ctx.status !== "ringing") return;
    setNotice(null);
    setCall({ id, kind: ctx.kind, peer: ctx.peer_name });
    setPhase("incoming");
    ringTimer.current = window.setTimeout(() => { if (phaseRef.current === "incoming") reset(); }, RING_MS);
    pollTimer.current = window.setInterval(async () => {
      const st = await statusOf(id);
      if (st !== "ringing" && phaseRef.current === "incoming") reset();
    }, 3000);
  };

  const startCall = async (a: StartArgs) => {
    const ph = phaseRef.current;
    if (ph !== "idle" && ph !== "notice") return;
    setNotice(null);
    setPhase("starting");
    try {
      const res = await fetch("/api/calls/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(a) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ title: "Can't start the call", body: ERRORS[j.error as string] ?? ERRORS.start_failed });
        setPhase("notice");
        return;
      }
      const c: ActiveCall = { id: j.callId, kind: j.kind, peer: j.peerName };
      setCall(c);
      if (j.status === "active") { // the other side was already calling us, so this joins straight in
        if (j.token) { setSession({ url: j.roomUrl, token: j.token }); setPhase("incall"); } else await connect(c.id);
        return;
      }
      setPhase("outgoing");
      ringTimer.current = window.setTimeout(() => { if (phaseRef.current === "outgoing") finish(noAnswer(c)); }, RING_MS);
      pollTimer.current = window.setInterval(async () => {
        const st = await statusOf(c.id);
        if (st && st !== "ringing") handleStatus(st);
      }, 3000);
    } catch {
      setNotice({ title: "Can't start the call", body: ERRORS.start_failed });
      setPhase("notice");
    }
  };

  const cancel = () => {
    const c = callRef.current;
    if (c) fire(supabase.rpc("end_call", { p_call_id: c.id }));
    reset();
  };
  const accept = async () => {
    const c = callRef.current;
    if (!c) return;
    clearTimers();
    setPhase("connecting");
    const { error } = await supabase.rpc("answer_call", { p_call_id: c.id, p_accept: true });
    if (error) { reset(); setNotice({ title: "This call has ended" }); setPhase("notice"); return; }
    await connect(c.id);
  };
  const decline = () => {
    const c = callRef.current;
    if (c) fire(supabase.rpc("answer_call", { p_call_id: c.id, p_accept: false }));
    reset();
  };

  // Always call the newest versions from the realtime listener
  const onChangeRef = useRef<(p: { eventType: string; new: unknown }) => void>(() => {});
  onChangeRef.current = (p) => {
    const row = p.new as CallRow;
    if (p.eventType === "INSERT") {
      const ph = phaseRef.current;
      if (row.initiator_id === myId.current || row.status !== "ringing") return;
      if (ph !== "idle" && ph !== "notice") return; // already busy
      void showIncoming(row.id);
    } else if (p.eventType === "UPDATE" && callRef.current?.id === row.id) {
      handleStatus(row.status);
    }
  };
  const startRef = useRef(startCall);
  startRef.current = startCall;
  const stableStart = useCallback((a: StartArgs) => startRef.current(a), []);

  // Hear about incoming calls and answers. Row-level security means we only hear about our own calls.
  useEffect(() => {
    let alive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user || !alive) return;
      myId.current = data.user.id;
      channel = supabase
        .channel(`calls-${data.user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, (p) => onChangeRef.current(p as unknown as { eventType: string; new: unknown }))
        .subscribe();
    })();
    return () => {
      alive = false;
      if (channel) supabase.removeChannel(channel);
      clearTimers();
      destroyFrame();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // The call screen itself (Daily Prebuilt, themed to Ilo)
  useEffect(() => {
    if (phase !== "incall" || !session) return;
    let cancelled = false;
    let leaveTimeout: number | null = null;

    const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    const isSecure = typeof window !== "undefined" && (window.isSecureContext || isLocalhost);

    if (!isSecure) {
      console.warn("[CallProvider] Insecure context detected:", window.location.href);
      finish(
        {
          title: "Secure connection required",
          body: "Camera and microphone require HTTPS or localhost. To test across devices on local network, run the server with: npm run dev -- --experimental-https or test on localhost.",
          help: true,
        },
        false
      );
      return;
    }

    (async () => {
      const { default: Daily } = await import("@daily-co/daily-js");
      if (cancelled || !holder.current) return;

      isTearingDownRef.current = true;
      const existing = Daily.getCallInstance();
      if (existing) {
        try {
          await existing.destroy();
        } catch {}
      }

      if (cancelled || !holder.current) return;
      holder.current.innerHTML = "";

      let frame: DailyCall;
      try {
        frame = Daily.createFrame(holder.current, {
          iframeStyle: { width: "100%", height: "100%", border: "0" },
          showLeaveButton: true,
          theme: {
            colors: {
              accent: "#6b2a67", accentText: "#ffffff", background: "#fcf9fa", backgroundAccent: "#f6e8f1",
              baseText: "#3a3540", border: "#e9dde6", mainAreaBg: "#2b1429", mainAreaBgAccent: "#4a1a47",
              mainAreaText: "#ffffff", supportiveText: "#5a5560",
            },
          },
        });
      } catch (err) {
        console.warn("[CallProvider] createFrame error:", err);
        finish({ title: "Couldn't open call", body: "Could not create call frame. Please refresh and try again.", help: true }, false);
        return;
      }

      frameRef.current = frame;
      isTearingDownRef.current = false;

      frame
        .on("left-meeting", () => {
          if (isTearingDownRef.current) return;
          console.log("[CallProvider] Left meeting (user action)");
          finish({ title: "Call ended" });
        })
        .on("participant-joined", () => {
          if (leaveTimeout) {
            window.clearTimeout(leaveTimeout);
            leaveTimeout = null;
          }
        })
        .on("participant-left", (e) => {
          if (isTearingDownRef.current) return;
          if (e && !e.participant?.local) {
            console.log("[CallProvider] Remote participant left:", e.participant?.user_name);
            const participants = frame.participants();
            const remotes = Object.values(participants).filter((p) => !p.local);
            if (remotes.length === 0) {
              leaveTimeout = window.setTimeout(() => {
                if (phaseRef.current === "incall" && !isTearingDownRef.current) {
                  const currentRemotes = Object.values(frame.participants()).filter((p) => !p.local);
                  if (currentRemotes.length === 0) {
                    console.log("[CallProvider] No remotes left after timeout, ending");
                    finish({ title: "Call ended", body: `${callRef.current?.peer ?? "The other person"} left the call.` });
                  }
                }
              }, 8000);
            }
          }
        })
        .on("error", (e) => {
          const raw = (e as { errorMsg?: string })?.errorMsg ?? (e as unknown as Error)?.message ?? e;
          const msg = String(raw);
          console.warn("[CallProvider] Daily error event:", msg);
          if (msg.toLowerCase().includes("fatal")) {
            finish({ title: "The call was interrupted", body: msg });
          }
        });

      try {
        await frame.join({ url: session.url, token: session.token });
        console.log("[CallProvider] Successfully joined room");
      } catch (err) {
        const raw = (err as { errorMsg?: string })?.errorMsg ?? (err as Error)?.message ?? err;
        const msg = String(raw);
        console.warn("[CallProvider] Daily frame.join error:", msg);
        if (!isTearingDownRef.current) {
          finish({ title: "Couldn't connect", body: msg.includes("permission") || msg.includes("NotAllowedError") ? "Please allow camera and microphone access, then try again." : `Could not connect to call: ${msg}`, help: true }, false);
        }
      }
    })().catch((err) => {
      console.warn("[CallProvider] setup error:", err);
      if (!isTearingDownRef.current) {
        finish({ title: "Couldn't start the call", body: "Please try again, or send a message instead." }, false);
      }
    });

    return () => {
      cancelled = true;
      if (leaveTimeout) window.clearTimeout(leaveTimeout);
      isTearingDownRef.current = true;
      const f = frameRef.current;
      frameRef.current = null;
      if (f) {
        try {
          f.destroy().catch(() => {});
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, session]);

  const value = useMemo(() => ({ startCall: stableStart, busy: phase !== "idle" && phase !== "notice" }), [stableStart, phase]);
  const kindLabel = call?.kind === "audio" ? "Audio call" : "Video call";

  return (
    <Ctx.Provider value={value}>
      {children}

      {(phase === "starting" || phase === "outgoing" || phase === "connecting") && (
        <div role="dialog" aria-modal="true" aria-label="Call" className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-gradient-to-b from-ilo-plum to-ilo-deep px-6 text-center text-white">
          <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white/15 font-display text-3xl" aria-hidden="true">
            {phase === "outgoing" && <span className="absolute inset-0 rounded-full bg-white/10 motion-safe:animate-ping" />}
            {call ? initialOf(call.peer) : "·"}
          </span>
          <p className="mt-5 text-[11px] font-bold uppercase tracking-wider text-pink-300">{call ? kindLabel : "Private call"}</p>
          <h2 role="status" className="mt-1 font-display text-2xl">
            {phase === "outgoing" ? `Calling ${call?.peer}…` : phase === "connecting" ? "Connecting…" : "Starting your call…"}
          </h2>
          <p className="mt-2 max-w-xs text-xs leading-relaxed text-white/70">Private between you and {call?.peer ?? "your counsellor"}. Ilo doesn&apos;t record calls.</p>
          {phase === "outgoing" && (
            <button type="button" autoFocus onClick={cancel} className="mt-8 flex h-12 items-center gap-2 rounded-full bg-ilo-crisis px-6 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              <PhoneOff className="h-4 w-4" /> Cancel
            </button>
          )}
        </div>
      )}

      {phase === "incoming" && call && (
        <div role="alertdialog" aria-label="Incoming call" aria-live="assertive" className="fixed inset-x-3 top-3 z-[70] mx-auto max-w-sm rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-ilo-plum/15">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f3dfee] font-display text-lg text-ilo-plum" aria-hidden="true">{initialOf(call.peer)}</span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ilo-plum">Incoming {call.kind} call</p>
              <p className="truncate text-sm font-bold text-ilo-deep">{call.peer}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={decline} className="h-10 flex-1 rounded-full border border-ilo-crisis/30 text-xs font-bold text-ilo-crisis focus-visible:outline focus-visible:outline-2 focus-visible:outline-ilo-crisis">Decline</button>
            <button type="button" onClick={accept} className="h-10 flex-1 rounded-full bg-ilo-plum text-xs font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ilo-plum">Accept</button>
          </div>
        </div>
      )}

      {phase === "incall" && call && (
        <div role="dialog" aria-modal="true" aria-label={`Call with ${call.peer}`} className="fixed inset-0 z-[70] flex flex-col bg-ilo-deep">
          <div className="flex items-center gap-2 px-4 py-2.5 text-white">
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1 truncate text-xs font-semibold">Private session with {call.peer}</p>
            <p className="shrink-0 text-[10px] text-white/60">Ilo doesn&apos;t record calls</p>
          </div>
          <div ref={holder} className="min-h-0 flex-1" />
        </div>
      )}

      {phase === "notice" && notice && (
        <div role="alertdialog" aria-labelledby="call-notice" className="fixed inset-0 z-[70] flex items-center justify-center bg-ilo-deep/60 px-6">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <h2 id="call-notice" className="font-display text-xl text-ilo-plum">{notice.title}</h2>
            {notice.body && <p className="mt-2 text-xs leading-relaxed text-ilo-ink/80">{notice.body}</p>}
            {notice.help && (
              <>
                <p className="mt-3 text-xs leading-relaxed text-ilo-ink/80">
                  Need to talk to someone right now? Call Tele-MANAS on <a href="tel:14416" className="font-bold underline">14416</a> (free, 24×7).
                </p>
                <Link href="/messages" onClick={closeNotice} className="mt-4 flex h-10 items-center justify-center rounded-full border border-ilo-plum/20 text-xs font-bold text-ilo-plum">Send a message instead</Link>
              </>
            )}
            <button type="button" autoFocus onClick={closeNotice} className="mt-3 h-10 w-full rounded-full bg-ilo-plum text-xs font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ilo-plum">Close</button>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
