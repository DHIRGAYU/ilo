"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { E2EEClient, type E2EEState, type Summary } from "@/lib/e2ee";

type PState = E2EEState | "error";
type Value = {
  state: PState;
  client: E2EEClient | null;
  summaries: Record<string, Summary>; // per conversation: last message, unread count...
  unreadTotal: number;
  triage: number;                     // conversations where the student wrote and no reply has ever been sent
  rev: number;                        // goes up whenever anything on this device changes
  gateDone: () => void;               // call after setup, restore or switching device
  retryInit: () => void;
};

const Ctx = createContext<Value>({ state: "loading", client: null, summaries: {}, unreadTotal: 0, triage: 0, rev: 0, gateDone: () => {}, retryInit: () => {} });
export const useE2EE = () => useContext(Ctx);

// Runs the encryption client for the signed-in person and keeps it listening for new mail.
export function E2EEProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [client, setClient] = useState<E2EEClient | null>(null);
  const [state, setState] = useState<PState>("loading");
  const [rev, setRev] = useState(0);
  const [summaries, setSummaries] = useState<Record<string, Summary>>({});
  const [attempt, setAttempt] = useState(0);
  const stopRef = useRef<(() => void) | null>(null);

  const begin = useCallback((c: E2EEClient) => {
    stopRef.current?.();
    const off = c.onChange(() => setRev((r) => r + 1));
    const stop = c.subscribe();
    stopRef.current = () => { off(); stop(); };
    setRev((r) => r + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const c = new E2EEClient(createClient(), userId);
    setState("loading");
    c.init()
      .then((s) => { if (cancelled) return; setClient(c); setState(s); if (s === "ready") begin(c); })
      .catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; stopRef.current?.(); stopRef.current = null; };
  }, [userId, attempt, begin]);

  const gateDone = useCallback(() => {
    if (!client) return;
    setState(client.state);
    if (client.state === "ready") begin(client);
  }, [client, begin]);

  useEffect(() => {
    if (!client || state !== "ready") return;
    let live = true;
    client.summaries().then((s) => { if (live) setSummaries(s); });
    return () => { live = false; };
  }, [client, state, rev]);

  const value = useMemo<Value>(() => {
    const list = Object.values(summaries);
    return {
      state, client, summaries, rev, gateDone,
      unreadTotal: list.reduce((n, s) => n + s.unread, 0),
      triage: list.filter((s) => !s.lastMine && !s.hasMine).length,
      retryInit: () => setAttempt((a) => a + 1),
    };
  }, [state, client, summaries, rev, gateDone]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
