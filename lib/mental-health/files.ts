const SERVED: Record<string, { type: string; parts: readonly string[] }> = {
  "ibnn_int8.onnx": { type: "application/octet-stream", parts: ["model", "ibnn_int8.onnx"] },
  "ibnn_tokenizer.json": { type: "application/json; charset=utf-8", parts: ["model", "tokenizer", "tokenizer.json"] },
  "hunch_int8.onnx": { type: "application/octet-stream", parts: ["session_hunch", "hunch_int8.onnx"] },
  "hunch_tokenizer.json": { type: "application/json; charset=utf-8", parts: ["session_hunch", "tokenizer", "tokenizer.json"] },
  "hunch_config.json": { type: "application/json; charset=utf-8", parts: ["session_hunch", "config.json"] },
};

export function modelContentType(name: string): string | null {
  return Object.prototype.hasOwnProperty.call(SERVED, name) ? SERVED[name].type : null;
}

export function modelRelativeParts(name: string): readonly string[] | null {
  return Object.prototype.hasOwnProperty.call(SERVED, name) ? SERVED[name].parts : null;
}
