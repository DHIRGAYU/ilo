"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useE2EE } from "@/components/e2ee/E2EEProvider";
import type { SignalVote } from "@/lib/e2ee";
import { requestScore, startSignalEngine, stopSignalEngine } from "./engine";

type Bridge = {
  enabled: boolean;
  votes: Record<string, SignalVote>;
  toggle: (on: boolean) => void;
  vote: (id: string, vote: SignalVote) => void;
};

const Ctx = createContext<Bridge | null>(null);

export function useSignalPrefs() {
  return useContext(Ctx);
}

// Starts the on-device model only inside the signed-in counsellor workspace, and only while the toggle is on.
export function SignalBridge({ children }: { children: React.ReactNode }) {
  const { client, state, rev } = useE2EE();
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [votes, setVotes] = useState<Record<string, SignalVote>>({});

  useEffect(() => {
    if (!client || state !== "ready") return;
    let dead = false;
    void Promise.all([client.signalEnabled(), client.signalVotes()]).then(([on, stored]) => {
      if (dead) return;
      setEnabled(on);
      setVotes(stored);
      setReady(true);
    });
    return () => { dead = true; };
  }, [client, state]);

  useEffect(() => {
    if (!client || !ready || !enabled) {
      stopSignalEngine();
      return;
    }
    startSignalEngine(({ messageId, scores }) => { void client.saveSignal(messageId, scores); });
    return () => stopSignalEngine();
  }, [client, ready, enabled]);

  useEffect(() => {
    if (!client || !enabled) return;
    for (const item of client.drainUnscored()) requestScore(item.id, item.body);
  }, [client, enabled, rev]);

  const toggle = (on: boolean) => {
    if (!client) return;
    setEnabled(on);
    void client.setSignalEnabled(on);
  };

  const vote = (id: string, next: SignalVote) => {
    if (!client) return;
    const value = votes[id] === next ? null : next;
    setVotes((prev) => {
      const copy = { ...prev };
      if (value) copy[id] = value;
      else delete copy[id];
      return copy;
    });
    void client.setSignalVote(id, value);
  };

  return <Ctx.Provider value={{ enabled, votes, toggle, vote }}>{children}</Ctx.Provider>;
}
