"use client";

import { useEffect, useRef, useState } from "react";
import type { Hunch, Turn } from "./hunch";

type WorkerOut =
  | { type: "ready" }
  | { type: "result"; requestId: number; hunch: Hunch | null }
  | { type: "error"; requestId?: number; message: string };

export type HunchPhase = "off" | "loading" | "empty" | "ready";

export type HunchState = { phase: HunchPhase; value: Hunch | null };

let worker: Worker | null = null;
let seq = 0;
const waiters = new Map<number, (hunch: Hunch | null) => void>();

function ensure() {
  if (worker || typeof window === "undefined") return;
  worker = new Worker(new URL("./hunch-worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent<WorkerOut>) => {
    const data = event.data;
    if (data.type === "ready") return;
    if (data.requestId === undefined) return;
    const resolve = waiters.get(data.requestId);
    waiters.delete(data.requestId);
    resolve?.(data.type === "result" ? data.hunch : null);
  };
}

export function stopHunchEngine() {
  worker?.terminate();
  worker = null;
  for (const resolve of waiters.values()) resolve(null);
  waiters.clear();
}

export function scoreSession(turns: Turn[]): Promise<Hunch | null> {
  if (!turns.some((turn) => turn.speaker === "student" && turn.text.trim())) return Promise.resolve(null);
  return requestHunch(turns).done;
}

function requestHunch(turns: Turn[]): { requestId: number; done: Promise<Hunch | null> } {
  ensure();
  const requestId = ++seq;
  let settle: (hunch: Hunch | null) => void = () => {};
  const done = new Promise<Hunch | null>((resolve) => { settle = resolve; });
  waiters.set(requestId, settle);
  if (worker) worker.postMessage({ type: "hunch", requestId, turns });
  else settle(null);
  return { requestId, done };
}

function turnKey(turns: Turn[]) {
  return turns.map((turn) => `${turn.speaker}\u0000${turn.text}`).join("\u0001");
}

export function useSessionHunch(turns: Turn[] | null): HunchState {
  const [state, setState] = useState<HunchState>({ phase: "off", value: null });
  const turnsRef = useRef(turns);
  turnsRef.current = turns;
  const key = turns ? turnKey(turns) : null;

  useEffect(() => {
    const current = turnsRef.current;
    if (!current) {
      stopHunchEngine();
      setState({ phase: "off", value: null });
      return;
    }
    if (!current.some((turn) => turn.speaker === "student" && turn.text.trim())) {
      setState({ phase: "empty", value: null });
      return;
    }
    let live = true;
    setState({ phase: "loading", value: null });
    const { requestId, done } = requestHunch(current);
    void done.then((hunch) => {
      if (!live || requestId !== seq) return;
      setState(hunch ? { phase: "ready", value: hunch } : { phase: "empty", value: null });
    });
    return () => { live = false; };
  }, [key]);

  return state;
}
