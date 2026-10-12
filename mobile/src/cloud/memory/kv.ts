/**
 * An in-memory stand-in for the phone's secure key store (`SecureKVPort`),
 * for the memory backend and tests. It remembers the options of every
 * write, so a test can check each one was "this device only".
 */
import type { SecureKVPort } from '../types';

export interface MemoryKV extends SecureKVPort {
  /** Everything stored now (a copy). */
  dump(): Record<string, string>;
  /** Every write's key and options, in order. */
  writes: { key: string; opts: { thisDeviceOnly: true } }[];
}

export function createMemoryKV(initial: Record<string, string> = {}): MemoryKV {
  const data = new Map(Object.entries(initial));
  const writes: MemoryKV['writes'] = [];
  return {
    writes,
    async getItem(key) {
      return data.get(key) ?? null;
    },
    async setItem(key, value, opts) {
      writes.push({ key, opts });
      data.set(key, value);
    },
    async deleteItem(key) {
      data.delete(key);
    },
    dump() {
      return Object.fromEntries(data);
    },
  };
}
