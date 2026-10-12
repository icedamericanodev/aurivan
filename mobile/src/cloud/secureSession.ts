/**
 * The sign-in session, kept only in the phone's secure key store (spec
 * §2.1 A3). Never in AsyncStorage, never in a backup file, never synced.
 *
 * A session is a few KB of tokens, but secure stores dislike big values
 * (Android's warns over 2 KB), so it is split into chunks of at most 1,800
 * bytes. The order of writes keeps it safe:
 *   1. every chunk is written,
 *   2. the manifest (how many chunks, the length and a checksum) LAST.
 * A read checks the manifest against what it finds. A missing or changed
 * chunk (a crash half-way through a write, a restore onto a new phone) reads
 * as "no session": the learner is quietly signed out, never crashed, and the
 * broken keys are wiped.
 *
 * Every write is "this device only, after first unlock" (`thisDeviceOnly`),
 * so the session is never in an iCloud or Android backup.
 *
 * Its getItem / setItem / removeItem match the storage that Supabase's
 * client expects (Phase 9 passes it as `auth.storage`). The key store itself
 * is a port (`SecureKVPort`): Phase 9's adapter wraps the native module; the
 * memory backend and the tests use an in-memory fake.
 */
import { utf8 } from '../engine/sha256';
import type { SecureKVPort } from './types';

/** Largest chunk, in UTF-8 bytes. */
export const CHUNK_BYTES = 1800;
/** A session larger than this is refused (it is never this big; a guard against a runaway value). */
const MAX_CHUNKS = 64;

/** Secure-store keys may only use letters, digits, ".", "-" and "_". */
function keyBase(key: string): string {
  return `aurivan.s.${key.replace(/[^A-Za-z0-9._-]/g, '_')}`;
}
const manifestKey = (key: string) => `${keyBase(key)}.m`;
const chunkKey = (key: string, i: number) => `${keyBase(key)}.${i}`;

/** FNV-1a 32-bit, as hex: a checksum of the whole value, so a mixed old/new chunk is caught. */
export function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Split text into pieces of at most CHUNK_BYTES UTF-8 bytes (never splitting a character). */
export function chunkText(text: string, maxBytes = CHUNK_BYTES): string[] {
  const out: string[] = [];
  let cur = '';
  let curBytes = 0;
  for (const ch of text) {
    const b = utf8(ch).length;
    if (curBytes + b > maxBytes && cur) {
      out.push(cur);
      cur = '';
      curBytes = 0;
    }
    cur += ch;
    curBytes += b;
  }
  if (cur || !out.length) out.push(cur);
  return out;
}

interface Manifest {
  n: number;
  len: number;
  h: string;
}

function readManifest(raw: string | null): Manifest | null {
  if (!raw) return null;
  try {
    const m = JSON.parse(raw) as Partial<Manifest>;
    if (Number.isInteger(m.n) && m.n! > 0 && m.n! <= MAX_CHUNKS && Number.isInteger(m.len) && typeof m.h === 'string') return m as Manifest;
  } catch {
    // A manifest we can't read is no session.
  }
  return null;
}

export interface SessionStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export function createChunkedSession(kv: SecureKVPort): SessionStorage {
  const opts = { thisDeviceOnly: true } as const;

  /** Delete the manifest and every chunk it (or a broken one) could have pointed to. */
  async function wipe(key: string, n = MAX_CHUNKS) {
    await kv.deleteItem(manifestKey(key));
    for (let i = 0; i < n; i++) await kv.deleteItem(chunkKey(key, i));
  }

  return {
    async getItem(key) {
      const m = readManifest(await kv.getItem(manifestKey(key)));
      if (!m) {
        // A manifest that exists but can't be read: wipe what it may have left.
        if ((await kv.getItem(manifestKey(key))) !== null) await wipe(key);
        return null;
      }
      let text = '';
      for (let i = 0; i < m.n; i++) {
        const part = await kv.getItem(chunkKey(key, i));
        if (part === null) {
          await wipe(key, m.n);
          return null;
        }
        text += part;
      }
      if (text.length !== m.len || fnv1a(text) !== m.h) {
        await wipe(key, m.n);
        return null;
      }
      return text;
    },

    async setItem(key, value) {
      const parts = chunkText(value);
      if (parts.length > MAX_CHUNKS) throw new Error('session too large');
      const old = readManifest(await kv.getItem(manifestKey(key)));
      for (let i = 0; i < parts.length; i++) await kv.setItem(chunkKey(key, i), parts[i], opts);
      // The manifest LAST: until it is written, a read still sees the old one (or none).
      await kv.setItem(manifestKey(key), JSON.stringify({ n: parts.length, len: value.length, h: fnv1a(value) }), opts);
      // Chunks the old session had beyond the new one's end.
      if (old) for (let i = parts.length; i < old.n; i++) await kv.deleteItem(chunkKey(key, i));
    },

    async removeItem(key) {
      const m = readManifest(await kv.getItem(manifestKey(key)));
      await wipe(key, m?.n ?? MAX_CHUNKS);
    },
  };
}
