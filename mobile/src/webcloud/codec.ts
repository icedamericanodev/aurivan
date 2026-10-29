/**
 * The synced-snapshot codec (accounts beta §3.1 and SECURITY_GATES.md I9),
 * the website's half. The server's reader is
 * supabase/functions/_shared/gz.ts; this follows it rule for rule.
 *
 * Plain English for the founder:
 * - A synced copy is stored as  state_gz = base64(gzip(the JSON text)),
 *   raw_bytes = the JSON text's size in bytes, encoding = 'gzip+base64'.
 *   Zipping makes a heavy learner about 15 times smaller, which keeps the
 *   free plan's download allowance safe.
 * - The database only checks the outside shape, so a reader treats every
 *   copy as hostile: the base64 is size-checked before it is decoded; the
 *   unzip is fed 1 KB at a time and STOPS as soon as it passes the cap, so a
 *   "zip bomb" (a tiny file that unzips to gigabytes) never fills memory;
 *   the unzipped size must equal raw_bytes; the text must be valid UTF-8 and
 *   a plain JSON object. Then the app's strict snapshot checker runs.
 * - Before a push, the zipped size is checked against the server's caps, so
 *   a too-large copy pauses sync as "too large" instead of failing on the
 *   server.
 * - The gzip itself is a port: the browser's CompressionStream on the
 *   website (streamGzip below), something else on a phone.
 *
 * Pure TypeScript: no React, no storage, no network.
 */
import { utf8 } from '../engine/sha256';
import { CloudError, type SyncStore } from '../cloud/types';
import { fromBase64, toBase64 } from './base64';
import { decodeUtf8 } from './utf8';

/** Readers never unzip more than this (the database's raw_bytes cap). */
export const MAX_RAW_BYTES = 2_000_000;
/** The database's cap on state_gz (progress). */
export const MAX_GZ_CHARS = 200_000;
/** The database's settings caps (sync_settings_size). */
export const MAX_SETTINGS_GZ_CHARS = 32_768;
export const MAX_SETTINGS_RAW_BYTES = 98_304;
/** How much gzip the inflater is given per step (security audit M1). */
export const GZ_SLICE_BYTES = 1024;
export const ENCODING = 'gzip+base64';

export type CodecErrorCode = 'unknown_encoding' | 'bad_base64' | 'not_gzip' | 'too_big' | 'bad_gzip' | 'size_mismatch' | 'bad_json';

/** A copy that can't be read. Its message never holds anything from the copy. */
export class CodecError extends Error {
  constructor(public code: CodecErrorCode) {
    super(`snapshot unreadable: ${code}`);
    this.name = 'CodecError';
  }
}

export interface GzipPort {
  /** gzip (mtime 0, no file name): the output starts 1f 8b 08, "H4sI" in base64. */
  gzip(bytes: Uint8Array): Promise<Uint8Array>;
  /**
   * Unzips at most `cap` bytes, feeding the inflater GZ_SLICE_BYTES at a
   * time. Throws CodecError 'too_big' the moment the output passes the cap
   * (the rest is never inflated), 'bad_gzip' for a damaged stream.
   */
  gunzipCapped(gz: Uint8Array, cap: number): Promise<Uint8Array>;
}

/** One stored row's codec columns. */
export interface EncodedSnapshot {
  state_gz: string;
  raw_bytes: number;
}

/**
 * A store's JSON object → its stored columns. Throws CloudError 'too_big'
 * when the server would refuse its size (sync then pauses as too large).
 */
export async function encodeSnapshot(store: SyncStore, state: object, gz: GzipPort): Promise<EncodedSnapshot> {
  const raw = utf8(JSON.stringify(state));
  const rawCap = store === 'settings' ? MAX_SETTINGS_RAW_BYTES : MAX_RAW_BYTES;
  if (raw.length < 2 || raw.length > rawCap) throw new CloudError('too_big');
  const zipped = await gz.gzip(raw);
  if (zipped.length < 18 || zipped[0] !== 0x1f || zipped[1] !== 0x8b || zipped[2] !== 0x08) throw new CloudError('server');
  const text = toBase64(zipped);
  const gzCap = store === 'settings' ? MAX_SETTINGS_GZ_CHARS : MAX_GZ_CHARS;
  if (text.length > gzCap) throw new CloudError('too_big');
  return { state_gz: text, raw_bytes: raw.length };
}

const B64 = /^H4sI[A-Za-z0-9+/]+={0,2}$/;

/** base64 → gzip bytes, refusing anything over the cap or not whole groups of the standard alphabet. */
function gzBytes(text: string): Uint8Array {
  if (text.length > MAX_GZ_CHARS) throw new CodecError('too_big');
  if (text.length % 4 !== 0 || !B64.test(text)) throw new CodecError('bad_base64');
  const out = fromBase64(text);
  if (!out) throw new CodecError('bad_base64');
  return out;
}

/** One stored row → its JSON object, or a CodecError. */
export async function decodeSnapshot(row: { encoding: unknown; state_gz: unknown; raw_bytes: unknown }, gz: GzipPort, cap = MAX_RAW_BYTES): Promise<Record<string, unknown>> {
  if (row.encoding !== ENCODING) throw new CodecError('unknown_encoding');
  if (typeof row.state_gz !== 'string') throw new CodecError('bad_base64');
  const rawBytes = row.raw_bytes;
  if (typeof rawBytes !== 'number' || !Number.isInteger(rawBytes) || rawBytes < 2) throw new CodecError('size_mismatch');
  if (rawBytes > cap) throw new CodecError('too_big');
  const bytes = gzBytes(row.state_gz);
  if (bytes.length < 18 || bytes[0] !== 0x1f || bytes[1] !== 0x8b || bytes[2] !== 0x08) throw new CodecError('not_gzip');
  // One byte past the declared size at most: enough to see a mismatch.
  const raw = await gz.gunzipCapped(bytes, rawBytes + 1);
  if (raw.length !== rawBytes) throw new CodecError('size_mismatch');
  const text = decodeUtf8(raw);
  if (text === null) throw new CodecError('bad_json');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new CodecError('bad_json');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new CodecError('bad_json');
  return parsed as Record<string, unknown>;
}

// ── The browser's gzip (CompressionStream) ───────────────────────────────
interface StreamReader<T> {
  read(): Promise<{ done: boolean; value?: T }>;
  cancel(): Promise<void>;
}
interface ReadableLike<T> {
  getReader(): StreamReader<T>;
  pipeThrough(t: unknown): ReadableLike<Uint8Array>;
}
/** The three stream classes a modern browser (and Node 18+) has. */
export interface StreamEnv {
  CompressionStream: new (format: 'gzip') => unknown;
  DecompressionStream: new (format: 'gzip') => unknown;
  ReadableStream: new (
    source: { pull(controller: { enqueue(c: Uint8Array): void; close(): void }): void },
    strategy?: { highWaterMark: number },
  ) => ReadableLike<Uint8Array>;
}

async function readAll(reader: StreamReader<Uint8Array>, cap: number, badCode: CodecErrorCode): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      let chunk: { done: boolean; value?: Uint8Array };
      try {
        chunk = await reader.read();
      } catch {
        throw new CodecError(badCode);
      }
      if (chunk.done || !chunk.value) break;
      total += chunk.value.byteLength;
      if (total > cap) throw new CodecError('too_big');
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

/** A pull-based source that hands over one slice only when the reader asks for more. */
function slices(env: StreamEnv, bytes: Uint8Array, size: number): ReadableLike<Uint8Array> {
  let offset = 0;
  return new env.ReadableStream(
    {
      pull(controller) {
        if (offset >= bytes.length) {
          controller.close();
          return;
        }
        const end = Math.min(offset + size, bytes.length);
        controller.enqueue(bytes.slice(offset, end));
        offset = end;
      },
    },
    { highWaterMark: 0 },
  );
}

/** The GzipPort on the browser's own CompressionStream / DecompressionStream. */
export function streamGzip(env: StreamEnv): GzipPort {
  return {
    async gzip(bytes) {
      const reader = slices(env, bytes, 64 * 1024).pipeThrough(new env.CompressionStream('gzip')).getReader();
      return readAll(reader, Number.MAX_SAFE_INTEGER, 'bad_gzip');
    },
    async gunzipCapped(gz, cap) {
      const reader = slices(env, gz, GZ_SLICE_BYTES).pipeThrough(new env.DecompressionStream('gzip')).getReader();
      return readAll(reader, cap, 'bad_gzip');
    },
  };
}
