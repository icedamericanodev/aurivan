/**
 * The sync cycle (Uplift Phase 7, built OFF; spec §3.4–3.5), written against
 * ports only: a `SyncPort` (the account) and a `Device` (this phone's
 * stores and its sync record). No React, no timers. lib/sync.ts wires it to
 * the real stores; the tests run two "phones" against one memory backend.
 *
 * One cycle, in plain English:
 * 1. Read the account's heads (rev and app version only, never the data).
 * 2. engine/syncPlan.ts decides per store: nothing, push, pull, merge, or
 *    pause (a newer app wrote it), or stop (the account's copy was deleted
 *    from another device: sync turns off here, nothing is re-uploaded).
 * 3. If the account changed and a quiz, lesson or game is open, wait: the
 *    pull is applied when it ends (`deferredPull`).
 * 4. Pull what changed and check it like a backup file (readSnapshot). A
 *    snapshot that fails the check pauses sync; the phone changes NOTHING and
 *    the account is never "repaired" by pushing over it. The same unreadable
 *    copy is not downloaded again until it changes (`pausedRev`).
 * 5. Merge (engine/syncMerge.ts) and, if that changes the phone, write both
 *    stores in one storage write (lib/backup.ts writeSynced). The write
 *    merges in whatever the learner did while the pull was on the network
 *    (`rebase`), and a quiz opened meanwhile still makes it wait.
 * 6. Push what the phone now holds and the account doesn't have yet, at the
 *    rev just seen. Another phone writing first is a `conflict`: go back to
 *    1, at most 3 more times (after 1 s, 3 s, 9 s).
 *
 * Concurrency (Phase 7 review, CR B1/B3): lib/sync.ts runs one cycle at a
 * time. `ctx.alive()` turns false the moment the learner turns sync off,
 * signs out, removes their progress, undoes the first sync or deletes the
 * synced copy: the cycle then stops before its next write or push and
 * records nothing, and lib/sync.ts waits for it before acting.
 */
import { BackupError, fitForBackup, utf8Bytes, type UndoSnapshot } from '../engine/backup';
import { PROGRESS_VERSION, SETTINGS_VERSION } from '../engine/saveMigrations';
import {
  deviceLocalOf,
  dropFutureStamps,
  fnv1a,
  MAX_SETTINGS_BYTES,
  mergeSides,
  holdsStudy,
  mergeStamps,
  progressIsEmpty,
  readSnapshot,
  readStamps,
  stableStringify,
  toPayload,
  withoutDeviceLocal,
  type MergeContext,
  type Side,
  type Stamps,
  type SyncedProgress,
  type SyncedSettings,
} from '../engine/syncMerge';
import { firstCase, plan, type FirstCase, type SyncAction } from '../engine/syncPlan';
import { errorCode, type CloudErrorCode, type SnapshotHead, type SyncPort, type SyncStore } from '../cloud/types';
import { SYNC_OFF, type PerStore, type SyncMeta, type SyncPause } from '../engine/syncMeta';

/** The biggest snapshot this app pushes (UTF-8). Bigger: "too large to sync", kept safe on the phone. */
export const MAX_PUSH_BYTES = 1_500_000;
/** The waits before trying again after another phone wrote first. */
export const CONFLICT_WAITS = [1000, 3000, 9000] as const;
const STORES: readonly SyncStore[] = ['settings', 'progress'];
const NO_REV: PerStore<number | null> = { settings: null, progress: null };

/** The phone's two stores as plain data (all fields, device-local ones included). */
export interface PhoneData {
  settings: object;
  progress: object;
}

export interface Device {
  read(): PhoneData;
  /**
   * One storage write of both stores. `rebase` merges the live stores into
   * `next` (whatever the learner did since `next` was worked out), both
   * when the write starts and again after it lands; merging is safe to
   * repeat. Throws if it failed, or if that merge couldn't be done: then
   * nothing changed and the cycle records nothing.
   */
  write(next: PhoneData, opts: { undo?: UndoSnapshot | null; rebase?: (live: PhoneData) => PhoneData | null }): Promise<void>;
  meta(): SyncMeta;
  setMeta(m: Partial<SyncMeta>): void;
  /** A quiz, mock, lesson or game is open: no pull is applied now. */
  busy(): boolean;
}

export interface CycleCtx {
  port: SyncPort;
  device: Device;
  deviceId: () => Promise<string>;
  /** This app's version ("1.18.0"). */
  thisApp: string;
  now: () => number;
  knownCertIds: readonly string[];
  wait: (ms: number) => Promise<void>;
  /**
   * False once the learner turned sync off, signed out, removed their
   * progress, undid the first sync or deleted the synced copy, or another
   * account signed in, since this cycle started: it stops before its next
   * write or push and records nothing. Missing: always alive (tests).
   */
  alive?: () => boolean;
}

export type CycleResult =
  | { kind: 'idle' }
  | { kind: 'synced'; pulled: boolean; pushed: boolean }
  | { kind: 'deferred' }
  | { kind: 'paused'; reason: SyncPause }
  /** The account's copy was deleted from another device: sync is off on this phone now. */
  | { kind: 'stopped' }
  | { kind: 'failed'; code: CloudErrorCode; retryAfterSec?: number };

export type Sides = { settings: Side<SyncedSettings>; progress: Side<SyncedProgress> };

const versionOf = (s: SyncStore) => (s === 'settings' ? SETTINGS_VERSION : PROGRESS_VERSION);
/** A side's fingerprint, as it would be pushed. */
export const hashOf = (side: Side<object>) => fnv1a(stableStringify(toPayload(side)));
const mctxOf = (ctx: Pick<CycleCtx, 'now' | 'knownCertIds'>): MergeContext => ({ now: ctx.now(), knownCertIds: ctx.knownCertIds });

/** The phone's stores in their canonical synced form (what it would push). Throws a BackupError if they can't pass the checker. */
export function phoneSides(local: PhoneData, stamps: PerStore<Stamps>, mctx: MergeContext): Sides {
  const fitted = fitForBackup(local) as { settings: object; progress: object };
  return {
    settings: mergeSides<SyncedSettings>('settings', { state: withoutDeviceLocal('settings', fitted.settings) as SyncedSettings, stamps: readStamps(stamps.settings) }, null, mctx),
    progress: mergeSides<SyncedProgress>('progress', { state: withoutDeviceLocal('progress', fitted.progress) as SyncedProgress, stamps: readStamps(stamps.progress) }, null, mctx),
  };
}

/** Synced sides back to the phone's full stores, with THIS phone's own device-local fields. */
export function forPhone(sides: Sides, local: PhoneData): PhoneData {
  return {
    settings: { ...sides.settings.state, ...deviceLocalOf('settings', local.settings) },
    progress: { ...sides.progress.state, ...deviceLocalOf('progress', local.progress) },
  };
}

/** Merge two phones' worth of sides, store by store (a missing side: the other alone). */
export function mergeAll(a: Sides, b: Partial<Sides>, mctx: MergeContext): Sides {
  return {
    settings: b.settings ? mergeSides('settings', a.settings, b.settings, mctx) : a.settings,
    progress: b.progress ? mergeSides('progress', a.progress, b.progress, mctx) : a.progress,
  };
}

/** A failed call as a result (a raw message never leaves here). */
function failed(e: unknown): CycleResult {
  const code = errorCode(e);
  return { kind: 'failed', code, ...(e && typeof e === 'object' && 'retryAfterSec' in e && typeof e.retryAfterSec === 'number' ? { retryAfterSec: e.retryAfterSec } : {}) };
}
/** The phone's own data can't be synced: too large, or (never expected) it fails the checker. */
function localProblem(e: unknown, dev: Device): CycleResult {
  if (e instanceof BackupError && e.code === 'too-big') {
    dev.setMeta({ pausedReason: 'toobig' });
    return { kind: 'paused', reason: 'toobig' };
  }
  return { kind: 'failed', code: 'server' };
}
/**
 * Stamps only ever move forward: a change made while a sync was in flight
 * keeps its stamp. A stamp more than a day ahead (a wrong clock) is dropped
 * here too, so it can't come back and win once real time catches up.
 */
function keepStamps(dev: Device, s: SyncStore, stamps: Stamps, now: number): PerStore<Stamps> {
  const cur = dev.meta().stamps;
  return { ...cur, [s]: mergeStamps(dropFutureStamps(cur[s], now), stamps) };
}

export async function syncCycle(ctx: CycleCtx): Promise<CycleResult> {
  const dev = ctx.device;
  const alive = () => !ctx.alive || ctx.alive();
  let pulledAny = false;
  let pushedAny = false;
  for (let attempt = 0; ; attempt++) {
    const meta = dev.meta();
    if (!meta.enabled || !alive()) return { kind: 'idle' };
    const mctx = mctxOf(ctx);
    const local = dev.read();
    let mine: Sides;
    try {
      mine = phoneSides(local, meta.stamps, mctx);
    } catch (e) {
      return localProblem(e, dev);
    }
    const hash: PerStore<string> = { settings: hashOf(mine.settings), progress: hashOf(mine.progress) };

    // 1–2. Heads and the plan.
    let heads: PerStore<SnapshotHead | null>;
    try {
      heads = { settings: await ctx.port.head('settings'), progress: await ctx.port.head('progress') };
    } catch (e) {
      return failed(e);
    }
    if (!alive()) return { kind: 'idle' };
    const actions = {} as PerStore<SyncAction>;
    for (const s of STORES) {
      actions[s] = plan({
        head: heads[s],
        meta: { lastRev: meta.lastRev[s], lastPushedHash: meta.lastPushedHash[s], lastAt: meta.lastAt?.[s] ?? null },
        setUp: true,
        switchPending: false,
        localHash: hash[s],
        localEmpty: s === 'progress' && progressIsEmpty(mine.progress.state),
        thisApp: ctx.thisApp,
      });
    }
    const pauseFor = (r: string) => STORES.filter((s) => actions[s].kind === 'pause' && (actions[s] as { reason: string }).reason === r);
    if (pauseFor('newer').length) {
      dev.setMeta({ pausedReason: 'newer' });
      return { kind: 'paused', reason: 'newer' };
    }
    // A copy claiming an app no update reaches: unreadable (engine/syncPlan.ts implausibleApp).
    const implausible = pauseFor('unreadable');
    if (implausible.length) {
      const m = dev.meta();
      dev.setMeta({ pausedReason: 'unreadable', pausedRev: { ...(m.pausedRev ?? NO_REV), [implausible[0]]: heads[implausible[0]]!.rev } });
      return { kind: 'paused', reason: 'unreadable' };
    }
    if (pauseFor('remote_deleted').length) {
      dev.setMeta({ ...SYNC_OFF });
      return { kind: 'stopped' };
    }

    // 3. Never change the phone under an open quiz, lesson or game.
    const toPull = STORES.filter((s) => actions[s].kind === 'pull' || actions[s].kind === 'merge');
    if (toPull.length && dev.busy()) {
      dev.setMeta({ deferredPull: true });
      return { kind: 'deferred' };
    }
    // A copy that couldn't be read hasn't changed: the cycle would pause on it again, so download
    // nothing (security review S5). A new copy, or "Try again", reads it once more.
    const stuck = meta.pausedRev ?? NO_REV;
    if (meta.pausedReason === 'unreadable' && toPull.some((s) => stuck[s] !== null && heads[s]?.rev === stuck[s])) {
      return { kind: 'paused', reason: 'unreadable' };
    }

    // 4. Pull and check.
    const remote: Partial<Sides> = {};
    const remoteRev: PerStore<number | null> = { settings: null, progress: null };
    const remoteAt: PerStore<number | null> = { settings: null, progress: null };
    const remoteHash: PerStore<string | null> = { settings: null, progress: null };
    for (const s of toPull) {
      let snap: (SnapshotHead & { state: unknown }) | null;
      try {
        snap = await ctx.port.pull(s);
      } catch (e) {
        return failed(e);
      }
      if (!snap) continue; // deleted between head and pull: the next cycle sees it
      try {
        const side = readSnapshot(s, snap, { ...mctx, thisApp: ctx.thisApp });
        (remote as Record<string, Side<object>>)[s] = side;
        remoteHash[s] = hashOf(side); // what the server holds, as stored (never clamped to this phone's clock)
      } catch (e) {
        const reason: SyncPause = e instanceof BackupError && e.code === 'newer' ? 'newer' : 'unreadable';
        const m = dev.meta();
        dev.setMeta({ pausedReason: reason, pausedRev: { ...(m.pausedRev ?? NO_REV), [s]: reason === 'unreadable' ? snap.rev : null } });
        return { kind: 'paused', reason };
      }
      remoteRev[s] = snap.rev;
      remoteAt[s] = typeof snap.updatedAt === 'number' ? snap.updatedAt : null;
    }
    if (!alive()) return { kind: 'idle' };

    // 5. Merge, and apply on the phone in one write when it changes anything here.
    let merged: Sides;
    try {
      merged = mergeAll(mine, remote, mctx);
    } catch (e) {
      return localProblem(e, dev);
    }
    const changesPhone = STORES.some((s) => remote[s] && stableStringify(merged[s].state) !== stableStringify(mine[s].state));
    if (changesPhone) {
      // A quiz opened while the pull was on the network: still never written under it (CR B1).
      if (dev.busy()) {
        dev.setMeta({ deferredPull: true });
        return { kind: 'deferred' };
      }
      try {
        await dev.write(forPhone(merged, local), {
          // The phone as it is when the write starts (and again after it lands), merged with what was pulled.
          rebase: (live) => forPhone(mergeAll(phoneSides(live, dev.meta().stamps, mctx), merged, mctx), live),
        });
      } catch {
        return { kind: 'failed', code: 'server' };
      }
      // Stopped while the write was in flight: whoever stopped it acts next; record nothing.
      if (!alive()) return { kind: 'idle' };
    }
    for (const s of STORES) {
      if (!remote[s]) continue;
      const m = dev.meta();
      dev.setMeta({
        lastRev: { ...m.lastRev, [s]: remoteRev[s] },
        lastAt: { ...(m.lastAt ?? NO_REV), [s]: remoteAt[s] },
        lastPushedHash: { ...m.lastPushedHash, [s]: remoteHash[s] },
        stamps: keepStamps(dev, s, merged[s].stamps, mctx.now),
      });
      pulledAny = true;
    }
    // What goes up is what the phone holds now: the merge, plus anything done while it was applied.
    let outgoing = merged;
    if (changesPhone) {
      try {
        outgoing = phoneSides(dev.read(), dev.meta().stamps, mctx);
      } catch (e) {
        return localProblem(e, dev);
      }
    }

    // 6. Push what the account doesn't have yet.
    let conflict = false;
    for (const s of STORES) {
      const h = hashOf(outgoing[s]);
      const onServer = remote[s] ? remoteHash[s] : heads[s] ? dev.meta().lastPushedHash[s] : null;
      if (onServer !== null && h === onServer) continue;
      // An empty phone never overwrites the account's progress (engine/syncPlan.ts makes it merge first).
      if (s === 'progress' && heads.progress && progressIsEmpty(outgoing.progress.state)) continue;
      const payload = toPayload<object>(outgoing[s] as Side<object>);
      const bytes = utf8Bytes(JSON.stringify(payload));
      if (bytes > MAX_PUSH_BYTES || (s === 'settings' && bytes > MAX_SETTINGS_BYTES)) {
        dev.setMeta({ pausedReason: 'toobig' });
        return { kind: 'paused', reason: 'toobig' };
      }
      const expectedRev = remote[s] ? remoteRev[s] : (heads[s]?.rev ?? null);
      if (!alive()) return { kind: 'idle' };
      try {
        const head = await ctx.port.push({ store: s, expectedRev, storeVersion: versionOf(s), appVersion: ctx.thisApp, deviceId: await ctx.deviceId(), state: payload });
        // Stopped while the push was on the wire (sync off, sign-out, remove, undo): record nothing.
        if (!alive()) return { kind: 'idle' };
        const m = dev.meta();
        dev.setMeta({
          lastRev: { ...m.lastRev, [s]: head.rev },
          lastAt: { ...(m.lastAt ?? NO_REV), [s]: typeof head.updatedAt === 'number' ? head.updatedAt : null },
          lastPushedHash: { ...m.lastPushedHash, [s]: h },
          stamps: keepStamps(dev, s, outgoing[s].stamps, mctx.now),
        });
        pushedAny = true;
      } catch (e) {
        const code = errorCode(e);
        if (code === 'conflict') {
          conflict = true;
          break;
        }
        if (code === 'too_big') {
          dev.setMeta({ pausedReason: 'toobig' });
          return { kind: 'paused', reason: 'toobig' };
        }
        return failed(e);
      }
    }
    if (conflict) {
      if (attempt >= CONFLICT_WAITS.length) return { kind: 'failed', code: 'conflict' };
      await ctx.wait(CONFLICT_WAITS[attempt]);
      continue;
    }
    if (!alive()) return { kind: 'idle' };
    dev.setMeta({ lastSyncAt: ctx.now(), pausedReason: null, pausedRev: NO_REV, deferredPull: false });
    return pulledAny || pushedAny ? { kind: 'synced', pulled: pulledAny, pushed: pushedAny } : { kind: 'idle' };
  }
}

// ── The first sync on this phone ─────────────────────────────────────────
export interface FirstSyncPrep {
  case: FirstCase;
  /** The account's sides (none when it has nothing), their revs and fingerprints. */
  remote: Partial<Sides>;
  remoteRev: PerStore<number | null>;
  remoteAt: PerStore<number | null>;
  remoteHash: PerStore<string | null>;
  /** The phone, the account and the merged result, as full stores (for the preview's three columns). */
  phone: PhoneData;
  account: PhoneData | null;
  after: PhoneData;
  /** This phone holds no study (no answers, lessons or study days): decides the preview's case. */
  phoneEmpty: boolean;
  /** This phone holds anything a learner would miss (engine/syncMerge.ts holdsStudy): the 7-day undo copy is kept. */
  keepUndo: boolean;
}

export type PrepResult = { ok: true; prep: FirstSyncPrep } | { ok: false; code: CloudErrorCode | 'newer' | 'unreadable' | 'toobig' };

/** What a first sync would do. Reads the account; changes nothing anywhere. */
export async function prepareFirstSync(ctx: Omit<CycleCtx, 'device' | 'wait' | 'deviceId'> & { read: () => PhoneData; stamps: PerStore<Stamps> }): Promise<PrepResult> {
  // The first sync's Combine: two different plants keep the more grown one (engine/syncMerge.ts mergePlant).
  const mctx = { ...mctxOf(ctx), firstSync: true };
  const local = ctx.read();
  let mine: Sides;
  try {
    mine = phoneSides(local, ctx.stamps, mctx);
  } catch (e) {
    return { ok: false, code: e instanceof BackupError && e.code === 'too-big' ? 'toobig' : 'server' };
  }
  const remote: Partial<Sides> = {};
  const remoteRev: PerStore<number | null> = { settings: null, progress: null };
  const remoteAt: PerStore<number | null> = { settings: null, progress: null };
  const remoteHash: PerStore<string | null> = { settings: null, progress: null };
  for (const s of STORES) {
    let snap: (SnapshotHead & { state: unknown }) | null;
    try {
      const head = await ctx.port.head(s);
      if (!head) continue;
      const first = plan({ head, meta: { lastRev: null, lastPushedHash: null }, setUp: false, switchPending: false, localHash: '', localEmpty: false, thisApp: ctx.thisApp });
      if (first.kind === 'pause') return { ok: false, code: first.reason === 'unreadable' ? 'unreadable' : 'newer' };
      snap = await ctx.port.pull(s);
    } catch (e) {
      return { ok: false, code: errorCode(e) };
    }
    if (!snap) continue;
    try {
      const side = readSnapshot(s, snap, { ...mctx, thisApp: ctx.thisApp });
      (remote as Record<string, Side<object>>)[s] = side;
      remoteHash[s] = hashOf(side); // what the server holds, as stored (never clamped to this phone's clock)
      remoteRev[s] = snap.rev;
      remoteAt[s] = typeof snap.updatedAt === 'number' ? snap.updatedAt : null;
    } catch (e) {
      return { ok: false, code: e instanceof BackupError && e.code === 'newer' ? 'newer' : 'unreadable' };
    }
  }
  let merged: Sides;
  try {
    merged = mergeAll(mine, remote, mctx);
  } catch (e) {
    return { ok: false, code: e instanceof BackupError && e.code === 'too-big' ? 'toobig' : 'server' };
  }
  const phoneEmpty = progressIsEmpty(mine.progress.state);
  const accountHasProgress = Boolean(remote.progress && !progressIsEmpty(remote.progress.state));
  return {
    ok: true,
    prep: {
      case: firstCase(phoneEmpty, accountHasProgress),
      remote,
      remoteRev,
      remoteAt,
      remoteHash,
      phone: local,
      account: remote.settings || remote.progress ? forPhone({ settings: remote.settings ?? mine.settings, progress: remote.progress ?? EMPTY_PROGRESS }, local) : null,
      after: forPhone(merged, local),
      phoneEmpty,
      keepUndo: holdsStudy(mine.progress.state, mine.settings.state),
    },
  };
}

/** No study at all: a "start fresh" phone's progress when the account has none. */
export const EMPTY_PROGRESS: Side<SyncedProgress> = { state: { byCert: {}, streak: { current: 0, best: 0, lastDay: null } } as SyncedProgress, stamps: {} };

/**
 * Do the first sync (the learner chose on the preview, or on the
 * account-switch sheet):
 * - 'merge': this phone and the account together (Combine / Add this
 *   phone's progress / Bring it here / Keep this phone's progress);
 * - 'replace': this phone takes the account's progress ("Start fresh with
 *   this account"; this phone's own goes to the undo slot first).
 * The undo snapshot is written in the SAME storage write as the stores. Then
 * sync is on for `accountHash` (the account this was confirmed for), and a
 * normal cycle sends the result to the account: here when `cycle` is left
 * on (the tests), or by lib/sync.ts's one-at-a-time queue.
 */
export async function confirmFirstSync(
  ctx: CycleCtx,
  prep: FirstSyncPrep,
  mode: 'merge' | 'replace',
  undo: UndoSnapshot | null | undefined,
  opts: { accountHash?: string | null; cycle?: boolean } = {},
): Promise<CycleResult> {
  const dev = ctx.device;
  const mctx = { ...mctxOf(ctx), firstSync: true };
  const local = dev.read();
  let target: Sides;
  try {
    const mine = phoneSides(local, dev.meta().stamps, mctx);
    target = mode === 'merge' ? mergeAll(mine, prep.remote, mctx) : { settings: prep.remote.settings ?? mine.settings, progress: prep.remote.progress ?? EMPTY_PROGRESS };
  } catch (e) {
    return localProblem(e, dev);
  }
  try {
    await dev.write(forPhone(target, local), {
      undo,
      // Merging: anything done meanwhile is merged in. Replacing: the old progress is in the undo slot.
      rebase: mode === 'merge' ? (live) => forPhone(mergeAll(phoneSides(live, dev.meta().stamps, mctx), target, mctx), live) : undefined,
    });
  } catch {
    return { kind: 'failed', code: 'server' };
  }
  dev.setMeta({
    ...SYNC_OFF,
    enabled: true,
    accountHash: opts.accountHash ?? null,
    lastRev: prep.remoteRev,
    lastAt: prep.remoteAt ?? NO_REV,
    lastPushedHash: prep.remoteHash,
    stamps: { settings: target.settings.stamps, progress: target.progress.stamps },
  });
  return opts.cycle === false ? { kind: 'idle' } : syncCycle(ctx);
}
