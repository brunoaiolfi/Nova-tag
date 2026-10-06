/* eslint-disable no-bitwise */
import {NfcFailure} from './failure';

export interface WireNdefRecord {
  tnf: number;
  type: number[];
  id: number[];
  payload: number[];
}

function assertBytes(bytes: readonly number[]) {
  if (
    bytes.length > 4096 ||
    bytes.some(byte => !Number.isInteger(byte) || byte < 0 || byte > 255)
  )
    throw invalid();
}

export function utf8(bytes: readonly number[]): string {
  assertBytes(bytes);
  let text = '';
  for (let offset = 0; offset < bytes.length; ) {
    const first = bytes[offset++];
    if (first < 0x80) {
      text += String.fromCharCode(first);
      continue;
    }
    const count =
      first >= 0xc2 && first <= 0xdf
        ? 1
        : first >= 0xe0 && first <= 0xef
        ? 2
        : first >= 0xf0 && first <= 0xf4
        ? 3
        : 0;
    if (!count || offset + count > bytes.length) throw invalid();
    let code = first & (0x7f >> (count + 1));
    for (let remaining = count; remaining > 0; remaining--) {
      const next = bytes[offset++];
      if (next < 0x80 || next > 0xbf) throw invalid();
      code = code * 64 + (next & 63);
    }
    if (
      code < [0, 0x80, 0x800, 0x10000][count] ||
      code > 0x10ffff ||
      (code >= 0xd800 && code <= 0xdfff)
    )
      throw invalid();
    text += String.fromCodePoint(code);
  }
  return text;
}

export function ndefText(payload: readonly number[]): string {
  assertBytes(payload);
  const status = payload[0];
  if (status === undefined || status & 0x40) throw invalid();
  const languageLength = status & 63;
  if (languageLength + 1 > payload.length) throw invalid();
  const text = payload.slice(languageLength + 1);
  if (!(status & 0x80)) return utf8(text);
  if (text.length % 2) throw invalid();
  const littleEndian = text[0] === 0xff && text[1] === 0xfe;
  let offset = littleEndian || (text[0] === 0xfe && text[1] === 0xff) ? 2 : 0;
  const unit = (position: number) =>
    littleEndian
      ? text[position] + text[position + 1] * 256
      : text[position] * 256 + text[position + 1];
  let result = '';
  while (offset < text.length) {
    const code = unit(offset);
    offset += 2;
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = unit(offset);
      if (offset >= text.length || next < 0xdc00 || next > 0xdfff)
        throw invalid();
      result += String.fromCharCode(code, next);
      offset += 2;
    } else {
      if (code >= 0xdc00 && code <= 0xdfff) throw invalid();
      result += String.fromCharCode(code);
    }
  }
  return result;
}
function invalid(): NfcFailure {
  return new NfcFailure(
    'NFC_INVALID_RESPONSE',
    'Mensagem NDEF inválida ou incompleta. Faça uma nova leitura.',
  );
}

/** Parses bounded wire bytes; never reconstructs the message for evidence. */
export function wireNdefRecords(bytes: readonly number[]): WireNdefRecord[] {
  assertBytes(bytes);
  if (!bytes.length) return [];
  const records: WireNdefRecord[] = [];
  let offset = 0;
  let first = true;
  let ended = false;
  let chunk: WireNdefRecord | undefined;
  const take = (count: number): number[] => {
    if (offset + count > bytes.length) throw invalid();
    const value = bytes.slice(offset, offset + count);
    offset += count;
    return value;
  };
  while (offset < bytes.length) {
    if (ended) throw invalid();
    const flags = take(1)[0];
    const mb = !!(flags & 0x80);
    const me = !!(flags & 0x40);
    const cf = !!(flags & 0x20);
    const sr = !!(flags & 0x10);
    const il = !!(flags & 0x08);
    const tnf = flags & 7;
    if (mb !== first || (me && cf) || tnf === 7) throw invalid();
    const typeLength = take(1)[0];
    const lengthBytes = take(sr ? 1 : 4);
    const payloadLength = lengthBytes.reduce(
      (length, byte) => length * 256 + byte,
      0,
    );
    const idLength = il ? take(1)[0] : 0;
    const type = take(typeLength);
    const id = take(idLength);
    const payload = take(payloadLength);
    if (chunk) {
      if (tnf !== 6 || typeLength !== 0 || il) throw invalid();
      chunk.payload.push(...payload);
      if (!cf) {
        records.push(chunk);
        chunk = undefined;
      }
    } else {
      if (
        tnf === 6 ||
        (tnf === 0 && (typeLength || idLength || payloadLength || cf)) ||
        (tnf === 5 && typeLength) ||
        ([1, 2, 3, 4].includes(tnf) && !typeLength)
      )
        throw invalid();
      const record = {tnf, type, id, payload};
      if (cf) chunk = record;
      else records.push(record);
    }
    first = false;
    ended = me;
  }
  if (!ended || chunk) throw invalid();
  return records;
}

export function bytesBase64(bytes: readonly number[]): string {
  assertBytes(bytes);
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let encoded = '';
  for (let offset = 0; offset < bytes.length; offset += 3) {
    const a = bytes[offset],
      b = bytes[offset + 1],
      c = bytes[offset + 2];
    encoded +=
      alphabet[a >> 2] +
      alphabet[((a & 3) << 4) | ((b ?? 0) >> 4)] +
      (b === undefined ? '=' : alphabet[((b & 15) << 2) | ((c ?? 0) >> 6)]) +
      (c === undefined ? '=' : alphabet[c & 63]);
  }
  return encoded;
}
