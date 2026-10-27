// The snapshot codec's reading half, for the Edge Functions (pure: Web APIs
// only, no imports). A synced snapshot is stored as
//   state_gz  = base64( gzip( UTF-8 JSON text ) ), starting "H4sI";
//   raw_bytes = the byte length of that JSON text;
//   encoding  = 'gzip+base64'
// (20261013000000_sync_snapshots.sql). The database checks only the shape,
// never what is inside the gzip, so a reader must assume a hostile row:
// - the base64 text is capped before it is decoded;
// - unzipping streams through DecompressionStream and STOPS as soon as the
//   output passes the cap (2,000,000 bytes, or the row's raw_bytes when
//   smaller), so a gzip bomb (megabytes of zeros in a few KB) never sits in
//   memory;
// - the unzipped size must equal raw_bytes, the text must be valid UTF-8, and
//   the JSON must be a plain object.
// Every failure is a GzError with a short code and no content from the row.

/** Readers never unzip more than this (the database's raw_bytes cap). */
export const MAX_RAW_BYTES = 2_000_000;
/** The database's cap on state_gz (progress); settings are smaller. */
export const MAX_GZ_CHARS = 700_000;
export const ENCODING = 'gzip+base64';

export type GzErrorCode =
  | 'unknown_encoding'
  | 'bad_base64'
  | 'not_gzip'
  | 'too_big'
  | 'bad_gzip'
  | 'size_mismatch'
  | 'bad_json';

export class GzError extends Error {
  constructor(public code: GzErrorCode) {
    super(`snapshot unreadable: ${code}`);
  }
}

const B64 = /^H4sI[A-Za-z0-9+/]+={0,2}$/;

/** base64 → bytes, refusing anything that isn't whole groups of the standard alphabet. */
function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  if (text.length > MAX_GZ_CHARS) throw new GzError('too_big');
  if (text.length % 4 !== 0 || !B64.test(text)) throw new GzError('bad_base64');
  let bin: string;
  try {
    bin = atob(text);
  } catch {
    throw new GzError('bad_base64');
  }
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Unzips at most `cap` bytes. Throws `too_big` the moment the output passes
 * the cap (the rest is never inflated), `bad_gzip` for a damaged stream.
 */
export async function gunzipCapped(gz: Uint8Array<ArrayBuffer>, cap: number): Promise<Uint8Array> {
  if (gz.length < 18 || gz[0] !== 0x1f || gz[1] !== 0x8b || gz[2] !== 0x08) throw new GzError('not_gzip');
  const reader = new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch {
        throw new GzError('bad_gzip');
      }
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > cap) throw new GzError('too_big');
      parts.push(chunk.value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const all = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    all.set(p, at);
    at += p.byteLength;
  }
  return all;
}

/**
 * One stored snapshot → its JSON object, or a GzError. `rawBytes` is the
 * row's raw_bytes: the unzipped text must be exactly that long.
 */
export async function decodeSnapshot(
  encoding: unknown,
  stateGz: unknown,
  rawBytes: unknown,
  cap = MAX_RAW_BYTES,
): Promise<Record<string, unknown>> {
  if (encoding !== ENCODING) throw new GzError('unknown_encoding');
  if (typeof stateGz !== 'string') throw new GzError('bad_base64');
  if (typeof rawBytes !== 'number' || !Number.isInteger(rawBytes) || rawBytes < 2) {
    throw new GzError('size_mismatch');
  }
  if (rawBytes > cap) throw new GzError('too_big');
  // Unzip one byte past the declared size at most: enough to see a mismatch.
  const raw = await gunzipCapped(fromBase64(stateGz), rawBytes + 1);
  if (raw.byteLength !== rawBytes) throw new GzError('size_mismatch');
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(raw);
  } catch {
    throw new GzError('bad_json');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new GzError('bad_json');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new GzError('bad_json');
  return parsed as Record<string, unknown>;
}
