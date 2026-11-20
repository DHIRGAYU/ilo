type Result = { messageId: string; scores: number[] };
type Handler = (result: Result) => void;
type WorkerOut =
  | { type: "ready" }
  | { type: "result"; requestId: number; messageId: string; scores: number[] }
  | { type: "error"; requestId?: number; message: string };

let worker: Worker | null = null;
let handler: Handler | null = null;
let seq = 0;
const requests = new Map<number, string>();
const inflight = new Set<string>();
const finished = new Set<string>();
const queued: { messageId: string; text: string }[] = [];

function send(messageId: string, text: string) {
  if (!worker || inflight.has(messageId) || finished.has(messageId)) return;
  inflight.add(messageId);
  const requestId = ++seq;
  requests.set(requestId, messageId);
  worker.postMessage({ type: "score", requestId, messageId, text });
}

export function startSignalEngine(onResult: Handler) {
  handler = onResult;
  if (!worker && typeof window !== "undefined") {
    worker = new Worker(new URL("./predict-worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<WorkerOut>) => {
      const data = event.data;
      if (data.type !== "result" && data.type !== "error") return;
      if (data.requestId === undefined) return;
      const messageId = requests.get(data.requestId) ?? (data.type === "result" ? data.messageId : "");
      requests.delete(data.requestId);
      if (messageId) inflight.delete(messageId);
      if (data.type === "result" && data.scores.length === 7) {
        finished.add(data.messageId);
        handler?.({ messageId: data.messageId, scores: data.scores });
      } else if (messageId) {
        finished.add(messageId);
      }
    };
  }
  for (const item of queued.splice(0)) send(item.messageId, item.text);
}

export function stopSignalEngine() {
  worker?.terminate();
  worker = null;
  handler = null;
  requests.clear();
  inflight.clear();
  queued.length = 0;
}

export function requestScore(messageId: string, text: string) {
  if (!text.trim() || inflight.has(messageId) || finished.has(messageId) || queued.some((item) => item.messageId === messageId)) return;
  if (!worker) {
    queued.push({ messageId, text });
    return;
  }
  send(messageId, text);
}
