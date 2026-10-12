/**
 * The sign-in session, kept only in the phone's secure key store (spec
 * §2.1 A3). Never in AsyncStorage, never in a backup file, never synced.
 *
 * A session is a few KB of tokens, but secure stores dislike big values
 * (Android's warns over 2 KB), so it is split into chunks of at most 1,800
 * bytes. Two SLOTS (0 and 1) take turns, so a write never touches the chunks
 * the current manifest points to:
 *   1. clear the OTHER slot (leftovers from a write that was cut off),
 *   2. write every chunk into it,
 *   3. write the manifest (slot, how many chunks, the length and a checksum),
 *   4. clear the old slot.
 * Until step 3, a read still finds the old session whole (a crash or a read
 * in the middle of a write sees the old one, never a mix). After step 3 it
 * finds the new one.
 *
 * Chunks are written from the first up and deleted from the last down, so a
 * slot only ever holds chunks 0..k-1 with no gaps; clearing a slot counts
 * what is there instead of trusting a manifest. Sign-out (removeItem) clears
 * the manifest and BOTH slots, so no piece of a refresh token is left behind
 * (iOS keeps Keychain items after the app is deleted).
 *
 * A read whose chunks don't match the manifest (a chunk missing or changed, a
 * phone restored from a backup) is "no session": the learner is quietly
 * signed out, never crashed. It clears the keys only if the manifest is still
 * the one it read (a write may have just replaced it).
 *
 * Every write is "this device only, after first unlock" (`thisDeviceOnly`),
 * so the session is never in an iCloud or Android backup.
 *
 * Its getItem / setItem / removeItem match the storage that Supabase's
 * client expects (Phase 9 passes it as `auth.storage`, with supabase-js's
 * own lock so two writes never run at once). The key store itself is a port
 * (`SecureKVPort`): Phase 9's adapter wraps the native module; the memory
 * backend and the tests use an in-memory fake.
 */
import { utf8 } from '../engine/sha256';
import type { SecureKVPort } from './types';

/** Largest chunk, in UTF-8 bytes. */
export const CHUNK_BYTES = 1800;
/** A session larger than this is refused (it is never this big; a guard against a runaway value). */
const MAX_CHUNKS = 64;

type Slot = 0 | 1;

/** Secure-store keys may only use letters, digits, ".", "-" and "_". */
function keyBase(key: string): string {
  return `aurivan.s.${key.replace(/[^A-Za-z0-9._-]/g, '_')}`;
}
const manifestKey = (key: string) => `${keyBase(key)}.m`;
const chunkKey = (key: string, slot: Slot, i: number) => `${keyBase(key)}.${slot}.${i}`;

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
  /** Which slot holds the chunks. */
  s: Slot;
  n: number;
  len: number;
  h: string;
}

function readManifest(raw: string | null): Manifest | null {
  if (!raw) return null;
  try {
    const m = JSON.parse(raw) as Partial<Manifest>;
    if ((m.s === 0 || m.s === 1) && Number.isInteger(m.n) && m.n! > 0 && m.n! <= MAX_CHUNKS && Number.isInteger(m.len) && typeof m.h === 'string') return m as Manifest;
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

  /**
   * Delete every chunk in a slot, from the last down: at least the `known`
   * count a manifest gave, plus any unbroken run found after it (leftovers of
   * a write that was cut off).
   */
  async function clearSlot(key: string, slot: Slot, known = 0) {
    let k = known;
    while (k < MAX_CHUNKS && (await kv.getItem(chunkKey(key, slot, k))) !== null) k++;
    for (let i = k - 1; i >= 0; i--) await kv.deleteItem(chunkKey(key, slot, i));
  }

  /** The manifest first (so nothing reads as a session any more), then both slots. */
  async function clearAll(key: string, m: Manifest | null) {
    await kv.deleteItem(manifestKey(key));
    await clearSlot(key, 0, m?.s === 0 ? m.n : 0);
    await clearSlot(key, 1, m?.s === 1 ? m.n : 0);
  }

  return {
    async getItem(key) {
      const raw = await kv.getItem(manifestKey(key));
      if (raw === null) return null;
      const m = readManifest(raw);
      let text: string | null = null;
      if (m) {
        text = '';
        for (let i = 0; i < m.n && text !== null; i++) {
          const part = await kv.getItem(chunkKey(key, m.s, i));
          text = part === null ? null : text + part;
        }
        if (text !== null && (text.length !== m.len || fnv1a(text) !== m.h)) text = null;
      }
      if (text !== null) return text;
      // Broken: clear it, unless a write replaced the manifest while we read.
      if ((await kv.getItem(manifestKey(key))) === raw) await clearAll(key, m);
      return null;
    },

    async setItem(key, value) {
      const parts = chunkText(value);
      if (parts.length > MAX_CHUNKS) throw new Error('session too large');
      const old = readManifest(await kv.getItem(manifestKey(key)));
      const slot: Slot = old?.s === 0 ? 1 : 0;
      await clearSlot(key, slot);
      for (let i = 0; i < parts.length; i++) await kv.setItem(chunkKey(key, slot, i), parts[i], opts);
      // The switch: from here on a read finds the new session.
      await kv.setItem(manifestKey(key), JSON.stringify({ s: slot, n: parts.length, len: value.length, h: fnv1a(value) }), opts);
      await clearSlot(key, slot === 0 ? 1 : 0, old?.n ?? 0);
    },

    async removeItem(key) {
      await clearAll(key, readManifest(await kv.getItem(manifestKey(key))));
    },
  };
}
