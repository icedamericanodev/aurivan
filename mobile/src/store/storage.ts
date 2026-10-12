/**
 * Where saved data lives on the phone. AsyncStorage is a simple key/value
 * store that survives app restarts. All stores share this adapter so
 * swapping storage later (e.g. to MMKV for speed) is a one-file change.
 *
 * Saving only what changed (performance, mobile 1.15.x): zustand's `persist`
 * saves the WHOLE store after every `set`, even one that changed nothing
 * (it returned the same state). With months of study the progress store is
 * a few hundred KB of JSON, and screens make such no-op sets as they come
 * into view (a plant check, a growth "seen" mark). So a save whose top-level
 * fields are all the very same objects as the last save is skipped: there
 * is nothing new to write. Any real change makes a new object for what
 * changed (the stores never mutate: src/__tests__/stores-immutable.test.ts),
 * so it is always written.
 *
 * Only a write the phone CONFIRMED counts as saved. While a write is still
 * in flight, the same state again shares it; if that write then fails, the
 * shared save writes again by itself (unless a newer save has come since,
 * which holds the newer state). A failed write is never taken as saved.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, type PersistStorage, type StorageValue } from 'zustand/middleware';

const json = createJSONStorage(() => AsyncStorage)!;

/** A save's version and its top-level fields (the objects themselves, compared by identity). */
type Snap = { version?: number; fields: Record<string, unknown> };
/** Per key: the last save the phone confirmed. */
const saved = new Map<string, Snap>();
/** Per key: the write still in flight (the newest one started), and what it writes. */
const pending = new Map<string, { snap: Snap | null; done: Promise<void> }>();
/** Per key: how many saves were asked for, so a retry never writes over a newer save. */
const asked = new Map<string, number>();

function snapOf(value: StorageValue<unknown>): Snap | null {
  const state = value.state;
  return state && typeof state === 'object' ? { version: value.version, fields: { ...(state as Record<string, unknown>) } } : null;
}

/** True when every top-level field is the same object (or value) as in `prev`. */
function same(prev: Snap | null | undefined, value: StorageValue<unknown>): boolean {
  const state = value.state as Record<string, unknown> | null;
  if (!prev || !state || typeof state !== 'object' || prev.version !== value.version) return false;
  const keys = Object.keys(state);
  if (keys.length !== Object.keys(prev.fields).length) return false;
  return keys.every((k) => Object.is(state[k], prev.fields[k]));
}

/** Forget what was saved or is being saved: the next save always writes. */
function forget(name: string) {
  saved.delete(name);
  pending.delete(name);
}
/** A read or a removal makes the file the truth: forget, and no older save may retry over it. */
function supersede(name: string) {
  forget(name);
  asked.set(name, (asked.get(name) ?? 0) + 1);
}

function write(name: string, value: StorageValue<unknown>): Promise<void> {
  // Nothing is recorded before the write has started: if turning the state
  // into JSON throws, the next save simply tries again.
  const started = json.setItem(name, value);
  const entry = { snap: snapOf(value), done: Promise.resolve() };
  entry.done = Promise.resolve(started).then(
    () => {
      // Only the newest write may say what the phone holds.
      if (pending.get(name) !== entry) return;
      pending.delete(name);
      if (entry.snap) saved.set(name, entry.snap);
      else saved.delete(name);
    },
    (e: unknown) => {
      if (pending.get(name) === entry) forget(name);
      throw e;
    },
  );
  pending.set(name, entry);
  return entry.done;
}

export const persistStorage: PersistStorage<any> = {
  // A read (launch, or a rehydrate after a restore) forgets what was written,
  // both when it starts and when it ends: the next save always goes through,
  // whatever the file now holds.
  getItem: (name) => {
    supersede(name);
    const read = json.getItem(name);
    if (read instanceof Promise) {
      const done = () => supersede(name);
      // A side branch: the read itself is returned untouched (no extra ticks for zustand's hydrate).
      read.then(done, done);
    }
    return read;
  },
  setItem: (name, value) => {
    const ask = (asked.get(name) ?? 0) + 1;
    asked.set(name, ask);
    const inFlight = pending.get(name);
    if (inFlight) {
      if (same(inFlight.snap, value)) {
        // The very same state is being written: share that write. If it fails,
        // write again now, unless a newer save came since (it holds newer state).
        return inFlight.done.catch(() => (asked.get(name) === ask ? write(name, value) : undefined));
      }
    } else if (same(saved.get(name), value)) {
      return;
    }
    return write(name, value);
  },
  removeItem: (name) => {
    supersede(name);
    return json.removeItem(name);
  },
};

/** Tests: forget what was last written (a fresh launch). */
export function resetSavedForTest() {
  saved.clear();
  pending.clear();
  asked.clear();
}
