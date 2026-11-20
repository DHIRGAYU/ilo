/// <reference lib="webworker" />

import { LABELS, softmax } from "./score";
import { MESSAGE_MAX_LENGTH, encode, vocabFromTokenizer, type Vocab } from "./tokenize";

// One thread, so the page does not need cross-origin isolation. That keeps calls and Supabase working.
const CACHE = "ilo-signal-v2";
const ORIGIN = self.location.origin;

type ScoreIn = { type: "score"; requestId: number; messageId: string; text: string };
type Out =
  | { type: "ready" }
  | { type: "result"; requestId: number; messageId: string; scores: number[] }
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
const waiting: ScoreIn[] = [];

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
      // WebGPU is optional. WASM still scores the message.
    }
  }
  configure(ort.env);
  tensor = ort.Tensor;
  const tokenizer = await (await cached("/models/ibnn_tokenizer.json")).json();
  vocab = vocabFromTokenizer(tokenizer);
  const model = await (await cached("/models/ibnn_int8.onnx")).arrayBuffer();
  try {
    session = await ort.InferenceSession.create(model, { executionProviders: providers });
  } catch {
    const wasm = (await import("onnxruntime-web/wasm")) as OrtModule;
    configure(wasm.env);
    tensor = wasm.Tensor;
    session = await wasm.InferenceSession.create(model, { executionProviders: ["wasm"] });
  }
  post({ type: "ready" });
  for (const job of waiting.splice(0)) void score(job);
}

async function score(job: ScoreIn) {
  if (!session || !vocab || !tensor) {
    waiting.push(job);
    return;
  }
  try {
    const encoded = encode(job.text, vocab, MESSAGE_MAX_LENGTH);
    if (!encoded) {
      post({ type: "error", requestId: job.requestId, message: "empty" });
      return;
    }
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
    const scores = softmax(Array.from(output[outName].data as ArrayLike<number>, Number));
    if (scores.length !== LABELS.length) throw new Error("unexpected label count");
    post({ type: "result", requestId: job.requestId, messageId: job.messageId, scores });
  } catch (error) {
    post({ type: "error", requestId: job.requestId, message: error instanceof Error ? error.message : "score failed" });
  }
}

addEventListener("message", (event: MessageEvent<ScoreIn>) => {
  if (event.data?.type === "score") void score(event.data);
});

boot().catch((error: unknown) => {
  post({ type: "error", message: error instanceof Error ? error.message : "model failed" });
});
