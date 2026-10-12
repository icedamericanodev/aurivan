/**
 * Sync plan (Uplift Phase 7, built OFF; spec PHASE6_8.md §3.4): what one
 * store should do on this sync, from three facts. Pure: no React, no
 * storage, no network. lib/sync.ts does what it says.
 *
 * - The account's head: the snapshot's `rev` (a number the server raises on
 *   every write and never reuses, even after a delete) and `updatedAt`, the
 *   app version that wrote it. Or null: no snapshot.
 * - What this phone last synced: `lastRev` (the rev it last pushed or pulled)
 *   and `lastPushedHash` (a fingerprint of what it last sent or took).
 * - The phone's data now: its fingerprint, and whether it holds any study.
 *
 * The answer:
 *   idle   nothing changed on either side
 *   push   only this phone changed: send it (the server must still be at lastRev)
 *   pull   only the account changed: fetch it, merge, apply
 *   merge  both changed: fetch, merge, apply, send (the server must still be at head.rev)
 *   first  this phone has never synced with this account: the first-sync preview decides
 *   pause  don't touch anything (a newer app wrote it, it claims an app version no
 *          update reaches, an account switch is waiting, or the account's copy
 *          was deleted from another device)
 *
 * Safety rules built in:
 * - a snapshot from a newer MINOR app is never pulled or pushed over;
 * - a phone with no study is never pushed over an account that has some
 *   (it merges instead, which brings the account's progress back).
 */
import { compareVersions } from './backup';

export interface SnapshotHeadLite {
  rev: number;
  appVersion: string;
  /** When the server wrote it (epoch ms). With `rev`, the write's identity (code review P7 N7). */
  updatedAt?: number;
}

export type PauseReason = 'newer' | 'unreadable' | 'switch' | 'remote_deleted';
export type FirstCase = 'phone' | 'account' | 'both' | 'none';

export type SyncAction =
  | { kind: 'idle' }
  | { kind: 'push'; expectedRev: number | null }
  | { kind: 'pull' }
  | { kind: 'merge'; expectedRev: number }
  | { kind: 'first'; case: FirstCase }
  | { kind: 'pause'; reason: PauseReason };

export interface PlanInput {
  /** The account's snapshot of this store, or null when it has none. */
  head: SnapshotHeadLite | null;
  /** The phone's sync record for this store (null: never synced it). */
  meta: { lastRev: number | null; lastPushedHash: string | null; lastAt?: number | null };
  /** True once this phone has synced with this account (the first-sync preview was answered). */
  setUp: boolean;
  /** A different account signed in on this phone and the learner hasn't chosen yet. */
  switchPending: boolean;
  /** The fingerprint of what this phone would push now. */
  localHash: string;
  /** This phone holds no study at all (a new install, or after Reset). Progress only. */
  localEmpty: boolean;
  /** This app's version ("1.18.0"). */
  thisApp: string;
}

/** True when the snapshot was written by a newer minor (or major) app than this one. */
export function fromNewerApp(head: SnapshotHeadLite | null, thisApp: string): boolean {
  return Boolean(head && compareVersions(head.appVersion, thisApp, 2) > 0);
}

/**
 * True when the snapshot claims an app MORE than one major version ahead of
 * this one ("999.0.0"): no real update path gets there, so it is treated as
 * unreadable, not "update the app" (security review P7 N2). Otherwise one
 * bad write would pause every device with a message no update fixes; the
 * unreadable pause offers Delete synced progress instead.
 */
export function implausibleApp(head: SnapshotHeadLite | null, thisApp: string): boolean {
  const major = (v: string) => Number(v.split('.')[0]);
  return Boolean(head && Number.isFinite(major(head.appVersion)) && Number.isFinite(major(thisApp)) && major(head.appVersion) > major(thisApp) + 1);
}

/** Which first-sync preview to show (spec §3.1 S2). */
export function firstCase(localEmpty: boolean, accountHasProgress: boolean): FirstCase {
  if (!localEmpty && accountHasProgress) return 'both';
  if (!localEmpty) return 'phone';
  if (accountHasProgress) return 'account';
  return 'none';
}

export function plan(i: PlanInput): SyncAction {
  if (i.switchPending) return { kind: 'pause', reason: 'switch' };
  if (implausibleApp(i.head, i.thisApp)) return { kind: 'pause', reason: 'unreadable' };
  if (fromNewerApp(i.head, i.thisApp)) return { kind: 'pause', reason: 'newer' };
  if (!i.setUp) return { kind: 'first', case: firstCase(i.localEmpty, i.head !== null) };
  // This phone synced before, and now the account has nothing: its copy was
  // deleted (Delete synced progress on another device). Never re-upload it.
  if (i.head === null && i.meta.lastRev !== null) return { kind: 'pause', reason: 'remote_deleted' };
  // A different rev, or the same rev written at a different time (a copy deleted and made again
  // elsewhere): either way it is not the write this phone last saw.
  const sameWrite = i.head !== null && i.head.rev === i.meta.lastRev && (i.meta.lastAt == null || i.head.updatedAt === undefined || i.head.updatedAt === i.meta.lastAt);
  const remoteChanged = i.head !== null && !sameWrite;
  const localChanged = i.localHash !== i.meta.lastPushedHash;
  if (!remoteChanged && !localChanged) return { kind: 'idle' };
  if (!remoteChanged) {
    // An empty phone never overwrites the account's progress: merging brings it back instead.
    if (i.localEmpty && i.head !== null) return { kind: 'merge', expectedRev: i.head.rev };
    return { kind: 'push', expectedRev: i.meta.lastRev };
  }
  if (!localChanged) return { kind: 'pull' };
  return { kind: 'merge', expectedRev: i.head!.rev };
}
