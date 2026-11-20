import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LABELS, packSignal, softmax, topLabel, unpackSignal } from "./score";
import { MESSAGE_MAX_LENGTH, encode, vocabFromTokenizer } from "./tokenize";
import { modelContentType, modelRelativeParts } from "./files";

const tokenizer = JSON.parse(readFileSync(new URL("../../model/tokenizer/tokenizer.json", import.meta.url), "utf8"));
const id2label = JSON.parse(readFileSync(new URL("../../model/config.json", import.meta.url), "utf8")).id2label as Record<string, string>;
const labels = Object.keys(id2label).sort((a, b) => Number(a) - Number(b)).map((key) => id2label[key]);
const vocab = vocabFromTokenizer(tokenizer);

test("label order matches the shipped mapping", () => {
  assert.deepEqual([...LABELS], labels);
});

test("softmax is a distribution and keeps the largest logit on top", () => {
  const scores = softmax([1, 3, 2]);
  assert.equal(scores.length, 3);
  assert.ok(Math.abs(scores.reduce((sum, n) => sum + n, 0) - 1) < 1e-6);
  assert.equal(topLabel([0, 0, 0, 0, 0, 0, 0.9]), "Suicidal");
});

test("a short sentence is WordPiece with CLS and SEP, and stays within the message limit", () => {
  const encoded = encode("I feel anxious today.", vocab);
  assert.ok(encoded);
  assert.deepEqual(encoded.inputIds, [101, 1045, 2514, 11480, 2651, 1012, 102]);
  assert.deepEqual(encoded.attentionMask, [1, 1, 1, 1, 1, 1, 1]);
  assert.ok(encoded.inputIds.length <= MESSAGE_MAX_LENGTH);
});

test("a long message keeps the beginning and still ends with SEP", () => {
  const encoded = encode(`${"hello ".repeat(400)}end`, vocab);
  assert.ok(encoded);
  assert.equal(encoded.inputIds.length, MESSAGE_MAX_LENGTH);
  assert.equal(encoded.inputIds[0], 101);
  assert.equal(encoded.inputIds.at(-1), 102);
  assert.equal(encoded.inputIds[1], 7592);
});

test("an empty string is not scored", () => {
  assert.equal(encode("", vocab), null);
  assert.equal(encode("   \n", vocab), null);
});

test("a score from the previous label order is ignored", () => {
  assert.equal(unpackSignal(JSON.stringify([0, 0, 0.9, 0, 0, 0, 0.1])), null);
  assert.equal(unpackSignal(JSON.stringify({ v: 1, scores: [0, 0, 0, 0, 0, 0, 1] })), null);
  assert.deepEqual(unpackSignal(packSignal([0, 0, 0, 0, 0, 0, 1])), [0, 0, 0, 0, 0, 0, 1]);
  assert.equal(topLabel(unpackSignal(packSignal([0, 0, 0, 0, 0, 0, 1])) ?? []), "Suicidal");
});

test("only the new classifier and the session hunch files are served", () => {
  assert.equal(modelContentType("ibnn_int8.onnx"), "application/octet-stream");
  assert.equal(modelContentType("ibnn_tokenizer.json"), "application/json; charset=utf-8");
  assert.equal(modelContentType("hunch_int8.onnx"), "application/octet-stream");
  assert.equal(modelContentType("hunch_tokenizer.json"), "application/json; charset=utf-8");
  assert.equal(modelContentType("hunch_config.json"), "application/json; charset=utf-8");
  assert.deepEqual(modelRelativeParts("ibnn_tokenizer.json"), ["model", "tokenizer", "tokenizer.json"]);
  assert.deepEqual(modelRelativeParts("hunch_config.json"), ["session_hunch", "config.json"]);
  assert.equal(modelContentType("mental_health_int8.onnx"), null);
  assert.equal(modelContentType("tokenizer.json"), null);
  assert.equal(modelContentType("label_mappings.json"), null);
  assert.equal(modelContentType("../tokenizer.json"), null);
  assert.equal(modelRelativeParts("../hunch_int8.onnx"), null);
});
