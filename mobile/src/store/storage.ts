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
 * changed (the stores never mutate), so it is always written.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, type PersistStorage, type StorageValue } from 'zustand/middleware';

const json = createJSONStorage(() => AsyncStorage)!;

/** The last value written (or read) per key: its top-level fields and version. */
const last = new Map<string, { version?: number; fields: Record<string, unknown> }>();

/** True when every top-level field is the same object (or value) as last time. */
function unchanged(name: string, value: StorageValue<unknown>): boolean {
  const prev = last.get(name);
  const state = value.state as Record<string, unknown> | null;
  if (!prev || !state || typeof state !== 'object' || prev.version !== value.version) return false;
  const keys = Object.keys(state);
  if (keys.length !== Object.keys(prev.fields).length) return false;
  return keys.every((k) => Object.is(state[k], prev.fields[k]));
}

function remember(name: string, value: StorageValue<unknown>) {
  const state = value.state;
  if (state && typeof state === 'object') last.set(name, { version: value.version, fields: { ...(state as Record<string, unknown>) } });
}

export const persistStorage: PersistStorage<any> = {
  // A read (launch, or a rehydrate after a restore) forgets what was written:
  // the next save always goes through, whatever the file now holds.
  getItem: (name) => {
    last.delete(name);
    return json.getItem(name);
  },
  setItem: (name, value) => {
    if (unchanged(name, value)) return;
    remember(name, value);
    const done = json.setItem(name, value);
    // A failed write is tried again on the next save, even an unchanged one.
    return Promise.resolve(done).catch((e: unknown) => {
      last.delete(name);
      throw e;
    });
  },
  removeItem: (name) => {
    last.delete(name);
    return json.removeItem(name);
  },
};

/** Tests: forget what was last written (a fresh launch). */
export function resetSavedForTest() {
  last.clear();
}
