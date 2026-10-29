/**
 * Accounts beta §3.1 and SECURITY_GATES.md I9: the website's snapshot codec
 * (src/webcloud/codec.ts) on the browser's CompressionStream (here Node's own
 * stream classes, the same Web API). It must read what the server's reader
 * (supabase/functions/_shared/gz.ts) reads and refuse what it refuses:
 * - a round trip keeps the JSON, starts "H4sI" and records the exact size;
 * - a gzip bomb (10 MB of zeros, acceptance S5) stops at the cap, fed 1 KB
 *   at a time, without inflating the rest;
 * - a bad prefix, a size that isn't raw_bytes, an unknown encoding, broken
 *   UTF-8 and non-objects are refused;
 * - a push over the server's caps is "too_big" before it is sent.
 * Plus the hand-written base64 and UTF-8 helpers it needs.
 */
import { gzipSync } from 'zlib';
import { CompressionStream, DecompressionStream, ReadableStream } from 'stream/web';
import { CloudError } from '../cloud/types';
import { utf8 } from '../engine/sha256';
import { fromBase64, fromBase64Url, toBase64, toBase64Url } from '../webcloud/base64';
import { CodecError, decodeSnapshot, encodeSnapshot, GZ_SLICE_BYTES, MAX_GZ_CHARS, streamGzip, type StreamEnv } from '../webcloud/codec';
import { decodeUtf8 } from '../webcloud/utf8';

const env = { CompressionStream, DecompressionStream, ReadableStream } as unknown as StreamEnv;
const gz = streamGzip(env);
const codeOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'ok';
  } catch (e) {
    return e instanceof CodecError || e instanceof CloudError ? e.code : String(e);
  }
};

describe('base64 and UTF-8 helpers', () => {
  it('match the platform encoders, both alphabets', () => {
    for (const n of [0, 1, 2, 3, 4, 5, 31, 32, 33, 1000]) {
      const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 37 + 11) & 0xff);
      expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
      expect(toBase64Url(bytes)).toBe(Buffer.from(bytes).toString('base64url'));
      expect(Array.from(fromBase64(toBase64(bytes))!)).toEqual(Array.from(bytes));
      expect(Array.from(fromBase64Url(toBase64Url(bytes))!)).toEqual(Array.from(bytes));
    }
  });

  it('refuse text outside the alphabet or not in whole groups', () => {
    expect(fromBase64('abc')).toBeNull();
    expect(fromBase64('ab-_')).toBeNull();
    expect(fromBase64('a===')).toBeNull();
    expect(fromBase64Url('a')).toBeNull();
    expect(fromBase64Url('ab+/')).toBeNull();
  });

  it('decodes valid UTF-8 like TextDecoder and refuses invalid sequences', () => {
    const text = 'Plain, café, 中文, emoji 🌱 and \u0000 nul';
    expect(decodeUtf8(utf8(text))).toBe(text);
    for (const bad of [[0xc0, 0x80], [0xe0, 0x80, 0x80], [0xed, 0xa0, 0x80], [0xf4, 0x90, 0x80, 0x80], [0xe2, 0x82], [0x80], [0xff]]) {
      expect(decodeUtf8(Uint8Array.from(bad))).toBeNull();
    }
  });
});

describe('the snapshot codec', () => {
  const state = { byCert: { cisa: { answers: { d1_001: { attempts: 2, correctCount: 1, lastCorrect: true, lastAt: 1_790_000_000_000 } } } }, note: 'café 🌱', changedAt: {} };

  it('round-trips: base64 gzip starting "H4sI", raw_bytes = the UTF-8 size', async () => {
    const enc = await encodeSnapshot('progress', state, gz);
    expect(enc.state_gz.startsWith('H4sI')).toBe(true);
    expect(enc.state_gz.length % 4).toBe(0);
    expect(enc.raw_bytes).toBe(Buffer.byteLength(JSON.stringify(state)));
    expect(await decodeSnapshot({ encoding: 'gzip+base64', ...enc }, gz)).toEqual(state);
  });

  it('reads what another client zipped (Node zlib, mtime 0)', async () => {
    const raw = Buffer.from(JSON.stringify(state));
    const row = { encoding: 'gzip+base64', state_gz: gzipSync(raw).toString('base64'), raw_bytes: raw.length };
    expect(await decodeSnapshot(row, gz)).toEqual(state);
  });

  it('a 10 MB gzip bomb stops at the cap, fed 1 KB at a time (acceptance S5)', async () => {
    const bomb = gzipSync(Buffer.alloc(10_000_000), { level: 9 });
    const text = bomb.toString('base64');
    expect(text.length).toBeLessThan(MAX_GZ_CHARS);
    let largest = 0;
    // Watch what the inflater is given: never more than one 1 KB slice at a time.
    const spyEnv = {
      ...env,
      ReadableStream: class extends ReadableStream<Uint8Array> {
        constructor(src: { pull(c: { enqueue(x: Uint8Array): void; close(): void }): void }, strategy?: { highWaterMark: number }) {
          super(
            {
              pull: (c) =>
                src.pull({
                  enqueue: (x) => {
                    largest = Math.max(largest, x.length);
                    c.enqueue(x);
                  },
                  close: () => c.close(),
                }),
            },
            strategy,
          );
        }
      },
    } as unknown as StreamEnv;
    // A row claiming the whole 2 MB: still refused (the real size is past the cap).
    expect(await codeOf(decodeSnapshot({ encoding: 'gzip+base64', state_gz: text, raw_bytes: 2_000_000 }, streamGzip(spyEnv)))).toBe('too_big');
    expect(largest).toBeLessThanOrEqual(GZ_SLICE_BYTES);
    // The biggest bomb the database lets in (150 MB of zeros in under 200,000 base64 characters): the
    // unzip stops at the cap and memory stays small (the server's own test asserts under 64 MB too).
    const big = gzipSync(Buffer.alloc(150_000_000), { level: 9 }).toString('base64');
    expect(big.length).toBeLessThan(MAX_GZ_CHARS);
    const mem = () => process.memoryUsage().arrayBuffers + process.memoryUsage().external;
    const before = mem();
    let peak = 0;
    const watching = { ...gz, gunzipCapped: async (b: Uint8Array, cap: number) => {
      const t = setInterval(() => (peak = Math.max(peak, mem() - before)), 1);
      try {
        return await gz.gunzipCapped(b, cap);
      } finally {
        clearInterval(t);
        peak = Math.max(peak, mem() - before);
      }
    } };
    expect(await codeOf(decodeSnapshot({ encoding: 'gzip+base64', state_gz: big, raw_bytes: 2_000_000 }, watching))).toBe('too_big');
    expect(peak).toBeLessThan(64 * 1024 * 1024);
    // A row claiming more than the cap is refused before any unzipping.
    expect(await codeOf(decodeSnapshot({ encoding: 'gzip+base64', state_gz: text, raw_bytes: 10_000_000 }, gz))).toBe('too_big');
  });

  it('refuses a bad prefix, a size mismatch, an unknown encoding, broken UTF-8 and non-objects', async () => {
    const enc = await encodeSnapshot('progress', state, gz);
    const z = (x: Buffer | string) => gzipSync(x).toString('base64');
    expect(await codeOf(decodeSnapshot({ encoding: 'zstd', ...enc }, gz))).toBe('unknown_encoding');
    expect(await codeOf(decodeSnapshot({ encoding: 'gzip+base64', state_gz: enc.state_gz, raw_bytes: enc.raw_bytes - 1 }, gz))).toBe('size_mismatch');
    expect(await codeOf(decodeSnapshot({ encoding: 'gzip+base64', state_gz: enc.state_gz, raw_bytes: enc.raw_bytes + 5 }, gz))).toBe('size_mismatch');
    expect(await codeOf(decodeSnapshot({ encoding: 'gzip+base64', state_gz: 'AAAA' + enc.state_gz.slice(4), raw_bytes: enc.raw_bytes }, gz))).toBe('bad_base64');
    expect(await codeOf(decodeSnapshot({ encoding: 'gzip+base64', state_gz: enc.state_gz.slice(0, -4), raw_bytes: enc.raw_bytes }, gz))).not.toBe('ok');
    expect(await codeOf(decodeSnapshot({ encoding: 'gzip+base64', state_gz: z(Buffer.from([0x7b, 0xff, 0x7d])), raw_bytes: 3 }, gz))).toBe('bad_json');
    expect(await codeOf(decodeSnapshot({ encoding: 'gzip+base64', state_gz: z('[1,2]'), raw_bytes: 5 }, gz))).toBe('bad_json');
    expect(await codeOf(decodeSnapshot({ encoding: 'gzip+base64', state_gz: 42, raw_bytes: 5 }, gz))).toBe('bad_base64');
    expect(await codeOf(decodeSnapshot({ encoding: 'gzip+base64', state_gz: z('{}'), raw_bytes: 1.5 }, gz))).toBe('size_mismatch');
  });

  it('a push over the server caps is too_big before it is sent', async () => {
    // Settings: 98,304 bytes unzipped at most.
    expect(await codeOf(encodeSnapshot('settings', { x: 'a'.repeat(100_000) }, gz))).toBe('too_big');
    // Progress that doesn't zip (random text) past 200,000 base64 characters.
    let seed = 1;
    const noise = Array.from({ length: 180_000 }, () => String.fromCharCode(33 + ((seed = (seed * 48271) % 2147483647) % 90))).join('');
    expect(await codeOf(encodeSnapshot('progress', { noise }, gz))).toBe('too_big');
  });
});
