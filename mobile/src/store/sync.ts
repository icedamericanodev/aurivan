/**
 * Sync record (Uplift Phase 7, built OFF; spec §3.5): what THIS phone knows
 * about its last sync with the account. Saved as `aurivan.sync.v1`.
 *
 * - `enabled`: the "Sync this phone" switch (on only after the first-sync
 *   preview). Turning it off forgets the rest, so turning it on again shows
 *   the preview again.
 * - `accountHash`: SHA-256 of the account id this record syncs with (Phase 7
 *   review, CR B2 / SEC B1). Every cycle compares it with the account signed
 *   in now; a different one never syncs (the account-switch sheet asks
 *   first), even after a relaunch. A hash, never the id itself.
 * - `lastRev` / `lastAt` / `lastPushedHash`, per store: the account's `rev`
 *   and write time this phone last pushed or pulled, and a fingerprint of
 *   that data (engine/syncPlan.ts compares them to tell what changed).
 * - `pausedRev`: the account copy's rev that couldn't be read, so a paused
 *   "unreadable" sync doesn't download the same copy again on every trigger.
 * - `stamps`: when each synced choice was last changed on this phone
 *   (`dailyGoal`, `examDates.cisa`, `plant.cisa`), for last-writer-wins.
 * - `pausedReason`: why sync is paused (a newer app wrote the account's copy,
 *   it couldn't be read, or this phone's progress is too large).
 * - `deferredPull`: the account changed while a quiz, lesson or game was
 *   open; it is applied when that ends.
 *
 * Never part of a backup file, never synced, no account id (only its
 * hash), no email, no token. With the flag OFF nothing reads or writes it: `skipHydration` stops
 * the read on import, and only lib/sync.ts (cloud builds) loads or sets it,
 * so an OFF build touches no new storage key.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Stamps } from '../engine/syncMerge';
import { persistStorage } from './storage';

export type SyncPause = 'newer' | 'unreadable' | 'toobig';
export type PerStore<T> = { settings: T; progress: T };

export interface SyncMeta {
  enabled: boolean;
  accountHash: string | null;
  lastRev: PerStore<number | null>;
  lastAt: PerStore<number | null>;
  lastPushedHash: PerStore<string | null>;
  pausedRev: PerStore<number | null>;
  lastSyncAt: number | null;
  pausedReason: SyncPause | null;
  deferredPull: boolean;
  stamps: PerStore<Stamps>;
}

interface SyncState extends SyncMeta {
  setMeta: (m: Partial<SyncMeta>) => void;
}

export const SYNC_OFF: Omit<SyncMeta, 'stamps'> = {
  enabled: false,
  accountHash: null,
  lastRev: { settings: null, progress: null },
  lastAt: { settings: null, progress: null },
  lastPushedHash: { settings: null, progress: null },
  pausedRev: { settings: null, progress: null },
  lastSyncAt: null,
  pausedReason: null,
  deferredPull: false,
};

export const useSyncMeta = create<SyncState>()(
  persist(
    (set) => ({
      ...SYNC_OFF,
      stamps: { settings: {}, progress: {} },
      setMeta: (m) => set(m),
    }),
    {
      name: 'aurivan.sync.v1',
      storage: persistStorage,
      version: 1,
      // Never read on import: lib/sync.ts initSync() reads it, in a cloud build only.
      skipHydration: true,
      partialize: (s): SyncMeta => ({
        enabled: s.enabled,
        accountHash: s.accountHash,
        lastRev: s.lastRev,
        lastAt: s.lastAt,
        lastPushedHash: s.lastPushedHash,
        pausedRev: s.pausedRev,
        lastSyncAt: s.lastSyncAt,
        pausedReason: s.pausedReason,
        deferredPull: s.deferredPull,
        stamps: s.stamps,
      }),
    },
  ),
);

/** What the status line shows right now (not saved: it describes this run of the app). */
export interface SyncStatus {
  busy: boolean;
  /** The last try couldn't reach the account (no connection): "Will sync when you're online". */
  offline: boolean;
  /** The last try failed some other way (a server problem, too many conflicts or writes): "We'll try again soon". */
  retrying: boolean;
  /**
   * After a sign-in, what the Account screen offers once it is in front:
   * 'first' (this phone never synced: the preview), 'switch' (a different
   * account than the one this phone synced with: the account-switch sheet).
   */
  offer: 'first' | 'switch' | null;
}

export const useSyncStatus = create<SyncStatus>()(() => ({ busy: false, offline: false, retrying: false, offer: null }));
