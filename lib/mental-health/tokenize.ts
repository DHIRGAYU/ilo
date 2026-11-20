export const CLS_ID = 101;
export const SEP_ID = 102;
export const UNK_ID = 100;
export const MESSAGE_MAX_LENGTH = 256;
const MAX_WORD_CHARS = 100;

export type Vocab = ReadonlyMap<string, number>;
export type Encoded = { inputIds: number[]; attentionMask: number[] };

type TokenizerJson = { model?: { vocab?: Record<string, number> } };

export function vocabFromTokenizer(json: TokenizerJson): Map<string, number> {
  return new Map(Object.entries(json.model?.vocab ?? {}));
}

function isChinese(code: number) {
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x20000 && code <= 0x2a6df) ||
    (code >= 0x2a700 && code <= 0x2b73f) ||
    (code >= 0x2b740 && code <= 0x2b81f) ||
    (code >= 0x2b820 && code <= 0x2ceaf) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0x2f800 && code <= 0x2fa1f)
  );
}

function isPunctuation(char: string) {
  const code = char.codePointAt(0) ?? 0;
  if ((code >= 33 && code <= 47) || (code >= 58 && code <= 64) || (code >= 91 && code <= 96) || (code >= 123 && code <= 126)) return true;
  return /\p{P}/u.test(char);
}

function clean(text: string) {
  let out = "";
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code === 0 || code === 0xfffd) continue;
    if (code !== 0x09 && code !== 0x0a && code !== 0x0d && /\p{C}/u.test(char)) continue;
    out += code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d || /\p{Z}/u.test(char) ? " " : char;
  }
  return out;
}

function normalize(text: string) {
  let spaced = "";
  for (const char of clean(text)) {
    const code = char.codePointAt(0) ?? 0;
    spaced += isChinese(code) ? ` ${char} ` : char;
  }
  return spaced.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function preTokenize(text: string) {
  const words: string[] = [];
  for (const piece of text.split(/\s+/)) {
    if (!piece) continue;
    let buf = "";
    for (const char of piece) {
      if (isPunctuation(char)) {
        if (buf) words.push(buf);
        buf = "";
        words.push(char);
      } else buf += char;
    }
    if (buf) words.push(buf);
  }
  return words;
}

function wordPiece(word: string, vocab: Vocab): number[] {
  if ([...word].length > MAX_WORD_CHARS) return [UNK_ID];
  const ids: number[] = [];
  let start = 0;
  while (start < word.length) {
    let end = word.length;
    let found: number | undefined;
    while (start < end) {
      const piece = (start === 0 ? "" : "##") + word.slice(start, end);
      const id = vocab.get(piece);
      if (id !== undefined) {
        found = id;
        break;
      }
      end -= 1;
    }
    if (found === undefined) return [UNK_ID];
    ids.push(found);
    start = end;
  }
  return ids;
}

function contentIds(text: string, vocab: Vocab): number[] | null {
  const words = preTokenize(normalize(text));
  if (words.length === 0) return null;
  const ids: number[] = [];
  for (const word of words) ids.push(...wordPiece(word, vocab));
  return ids;
}

// Token count includes the leading CLS and trailing SEP.
export function tokenCount(text: string, vocab: Vocab): number | null {
  const ids = contentIds(text, vocab);
  return ids ? ids.length + 2 : null;
}

// Blank text is not scored. Anything else becomes [CLS] tokens [SEP], keeping the beginning.
export function encode(text: string, vocab: Vocab, maxLength = MESSAGE_MAX_LENGTH): Encoded | null {
  const content = contentIds(text, vocab);
  if (!content) return null;
  const room = Math.max(0, maxLength - 2);
  const ids = [CLS_ID, ...content.slice(0, room), SEP_ID];
  return { inputIds: ids, attentionMask: ids.map(() => 1) };
}
