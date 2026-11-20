/// <reference lib="webworker" />

import { encode, vocabFromTokenizer, type Vocab } from "@/lib/mental-health/tokenize";
import {
  hunchFromScores,
  temperatureSoftmax,
  transcript,
  type Hunch,
  type SeedScore,
  type Turn,
} from "./hunch";

const CACHE = "ilo-hunch-v1";
const ORIGIN = self.location.origin;

type HunchConfig = {
  labels: string[];
  temperature: number;
  max_len: number;
  topic_seeds: Record<string, string[]>;
  followups: Record<string, string>;
  display: Record<string, string>;
};

type In = { type: "hunch"; requestId: number; turns: Turn[] };
type Out =
  | { type: "ready" }
  | { type: "result"; requestId: number; hunch: Hunch | null }
  | { type: "error"; requestId?: number; message: string };

type Session = {
  inputNames: readonly string[];
  outputNames: readonly string[];
  run: (feeds: Record<string, unknown>) => Promise<Record<string, { data: ArrayLike<number> }>>;
};

type OrtEnv = { wasm: { numThreads: number; simd: boolean; proxy: boolean; wasmPaths: string } };
type OrtTensor = { new (type: "int64", data: BigInt64Array, dims: number[]): unknown };
type OrtModule = {
  env: OrtEnv;
  Tensor: OrtTensor;
  InferenceSession: { create: (model: ArrayBuffer, opts: { executionProviders: string[] }) => Promise<Session> };
};

let session: Session | null = null;
let vocab: Vocab | null = null;
let tensor: OrtTensor | null = null;
let config: HunchConfig | null = null;
let seeds: SeedScore[] = [];
let ready = false;
const waiting: In[] = [];

const post = (message: Out) => postMessage(message);

function configure(env: OrtEnv) {
  env.wasm.numThreads = 1;
  env.wasm.simd = true;
  env.wasm.proxy = false;
  env.wasm.wasmPaths = `${ORIGIN}/ort/`;
}

async function cached(path: string): Promise<Response> {
  const url = `${ORIGIN}${path}`;
  const cache = await caches.open(CACHE);
  const hit = await cache.match(url);
  if (hit) return hit;
  const fresh = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  if (!fresh.ok) throw new Error(`${path} unavailable`);
  await cache.put(url, fresh.clone());
  return fresh;
}

async function logitsOf(text: string): Promise<number[] | null> {
  if (!session || !vocab || !tensor || !config) return null;
  const encoded = encode(text, vocab, config.max_len);
  if (!encoded) return null;
  const shape = [1, encoded.inputIds.length];
  const ids = BigInt64Array.from(encoded.inputIds, (id) => BigInt(id));
  const mask = BigInt64Array.from(encoded.attentionMask, (bit) => BigInt(bit));
  const feeds: Record<string, unknown> = {};
  for (const name of session.inputNames) {
    if (name === "input_ids") feeds[name] = new tensor("int64", ids, shape);
    else if (name === "attention_mask") feeds[name] = new tensor("int64", mask, shape);
    else if (name === "token_type_ids") feeds[name] = new tensor("int64", new BigInt64Array(ids.length), shape);
    else throw new Error(`unexpected input ${name}`);
  }
  const output = await session.run(feeds);
  const outName = session.outputNames[0];
  if (!outName) throw new Error("missing logits");
  const logits = Array.from(output[outName].data as ArrayLike<number>, Number);
  if (logits.length !== config.labels.length) throw new Error("unexpected label count");
  return logits;
}

async function boot() {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
  let ort = (await import("onnxruntime-web/wasm")) as OrtModule;
  let providers = ["wasm"];
  if (gpu) {
    try {
      if (await gpu.requestAdapter()) {
        ort = (await import("onnxruntime-web/webgpu")) as OrtModule;
        providers = ["webgpu", "wasm"];
      }
    } catch {
      // WebGPU is optional. WASM still scores the conversation.
    }
  }
  configure(ort.env);
  tensor = ort.Tensor;
  const [tokenizer, model, rawConfig] = await Promise.all([
    cached("/models/hunch_tokenizer.json").then((res) => res.json()),
    cached("/models/hunch_int8.onnx").then((res) => res.arrayBuffer()),
    cached("/models/hunch_config.json").then((res) => res.json() as Promise<HunchConfig>),
  ]);
  vocab = vocabFromTokenizer(tokenizer);
  config = rawConfig;
  const cfg = rawConfig;
  try {
    session = await ort.InferenceSession.create(model, { executionProviders: providers });
  } catch {
    const wasm = (await import("onnxruntime-web/wasm")) as OrtModule;
    configure(wasm.env);
    tensor = wasm.Tensor;
    session = await wasm.InferenceSession.create(model, { executionProviders: ["wasm"] });
  }
  const scored: SeedScore[] = [];
  for (const [topic, sentences] of Object.entries(cfg.topic_seeds)) {
    for (const sentence of sentences) {
      const logits = await logitsOf(sentence);
      if (!logits) continue;
      scored.push({ topic, probs: temperatureSoftmax(logits, cfg.temperature) });
    }
  }
  seeds = scored;
  ready = true;
  post({ type: "ready" });
  for (const job of waiting.splice(0)) void predict(job);
}

async function predict(job: In) {
  if (!ready || !vocab || !config) {
    waiting.push(job);
    return;
  }
  try {
    const text = transcript(job.turns, vocab, config.max_len);
    if (!text) {
      post({ type: "result", requestId: job.requestId, hunch: null });
      return;
    }
    const logits = await logitsOf(text);
    if (!logits) {
      post({ type: "result", requestId: job.requestId, hunch: null });
      return;
    }
    const probs = temperatureSoftmax(logits, config.temperature);
    post({
      type: "result",
      requestId: job.requestId,
      hunch: hunchFromScores(probs, config.labels, config.display, config.followups, seeds),
    });
  } catch (error) {
    post({ type: "error", requestId: job.requestId, message: error instanceof Error ? error.message : "hunch failed" });
  }
}

addEventListener("message", (event: MessageEvent<In>) => {
  if (event.data?.type === "hunch") void predict(event.data);
});

boot().catch((error: unknown) => {
  post({ type: "error", message: error instanceof Error ? error.message : "model failed" });
});
