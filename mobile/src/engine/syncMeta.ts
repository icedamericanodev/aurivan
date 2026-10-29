/**
 * The sync record's SHAPE (Uplift Phase 7; accounts beta §1.1 prerequisite).
 *
 * Plain English for the founder:
 * - store/sync.ts keeps the phone's sync record in a zustand store (saved as
 *   `aurivan.sync.v1`). lib/syncCore.ts, the sync cycle, only needs the
 *   record's TYPES and the "sync is off" blank, not the store itself.
 * - zustand is a package, so anything importing store/sync.ts can't go into
 *   the website's bundle (assets/kaisip-cloud.js, built from plain modules).
 *   These definitions therefore live here, in pure TypeScript, and
 *   store/sync.ts re-exports them under the same names. Nothing about how
 *   the phone behaves changes.
 *
 * Pure TypeScript: no React, no storage, no network.
 */
import type { Stamps } from './syncMerge';

/** Why sync is paused: a newer app wrote the account's copy, it couldn't be read, or this side's progress is too large. */
export type SyncPause = 'newer' | 'unreadable' | 'toobig';
/** One value per synced store. */
export type PerStore<T> = { settings: T; progress: T };

/** What this device knows about its last sync with the account (store/sync.ts explains each field). */
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

/** The record when sync is off (everything forgotten except the stamps). */
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
