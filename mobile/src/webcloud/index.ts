/**
 * The website's cloud client, put together (accounts beta §1): what
 * assets/kaisip-cloud.js exposes as `window.KaiSipCloud`.
 *
 * Plain English for the founder:
 * - `createWebCloud` wires the sign-in client (auth.ts), the synced-copy
 *   API (rest.ts, zipped by codec.ts), the website as a sync device
 *   (device.ts) and the phone's own sync cycle (lib/syncCore.ts).
 * - `syncNow` runs ONE cycle at a time across every open tab, inside the
 *   browser lock 'kaisip-sync'. After it pulls, other tabs must reload the
 *   progress on the `storage` event (index.html's job).
 * - `appVersion` is what every push says wrote it. The bundle passes
 *   mobile/LIVE_VERSION (the app version live on Google Play), never the
 *   website's own version: phones pause on a copy from a newer app, so the
 *   website must follow the Play release and never lead it.
 *
 * Pure TypeScript: no React. Everything outside comes in as ports.
 */
import { accountHash } from '../engine/account';
import { BackupError, type UndoSnapshot } from '../engine/backup';
import { confirmFirstSync, prepareFirstSync, syncCycle, type CycleCtx, type CycleResult, type FirstSyncPrep, type PrepResult } from '../lib/syncCore';
import { isDeviceId, uuidV4 } from '../cloud/deviceId';
import { CloudError, type SyncPort } from '../cloud/types';
import { createWebAuth, type WebAuth } from './auth';
import { streamGzip, type GzipPort, type StreamEnv } from './codec';
import { ACCOUNT_ORIGIN, DEVICE_ID_KEY, SYNC_LOCK, WEB_CERT } from './config';
import { createWebDevice, type WebDevice, type WebHost } from './device';
import type { PerStore } from '../engine/syncMeta';
import type { BrowserStores, ClockPort, FetchPort, LockPort, RandomPort, StoragePort } from './ports';
import { createRestSync } from './rest';
import type { WebBank } from './toWeb';

export interface WebCloudOptions {
  fetch: FetchPort;
  stores: BrowserStores;
  random: RandomPort;
  lock: LockPort;
  clock: ClockPort;
  /** The gzip port, or the browser's stream classes to build it from. */
  gzip: GzipPort | StreamEnv;
  host: WebHost;
  bank: WebBank;
  /** The app version pushes are stamped with (the bundle passes mobile/LIVE_VERSION). */
  appVersion: string;
  /** The store versions pushes are stamped with (the bundle passes mobile/LIVE_STORE_VERSIONS.json). Missing: this engine's. */
  storeVersions?: PerStore<number>;
  /** The page's address (location.origin; the bundle fills it in). Accounts run only on https://kaisip.com. */
  origin: string;
  /**
   * Tests and local development only: also allow http://localhost,
   * http://127.0.0.1 and no address at all (Node). It can't open any other
   * address, so it can't switch accounts on for a copy of the site elsewhere.
   */
  devOrigin?: boolean;
  /** How the cycle waits before retrying a conflict (default setTimeout). */
  wait?: (ms: number) => Promise<void>;
  /** Tests: a fake server's address and key. */
  url?: string;
  apiKey?: string;
}

export interface WebCloud {
  auth: WebAuth;
  sync: SyncPort;
  device: WebDevice;
  /** This browser's random install id (made once, kept in localStorage). */
  deviceId(): Promise<string>;
  /** One sync cycle under the 'kaisip-sync' lock. 'idle' when signed out or sync is off. */
  syncNow(): Promise<CycleResult>;
  /** The first-sync preview's three columns (This browser · Account · After). Changes nothing. */
  prepareFirst(): Promise<PrepResult>;
  /**
   * Do the first sync: 'merge' (Combine) or 'replace' (Use the account's
   * progress here; this browser's record is kept as the 7-day undo copy).
   */
  confirmFirst(prep: FirstSyncPrep, mode: 'merge' | 'replace'): Promise<CycleResult>;
  /** The signed-in account no longer matches the one this browser synced with: ask before syncing. */
  accountChanged(): boolean;
}

const SEMVER = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/;
/**
 * "Keep an undo copy" for confirmFirstSync. The phone passes its backup
 * snapshot here; the website's device (device.ts write) only checks that one
 * was asked for and saves this browser's own record instead.
 */
const KEEP_UNDO = { takenAt: 0, kind: 'sync' } as unknown as UndoSnapshot;

/** True when account features may show here: only on https://kaisip.com (never file:// or a preview). */
export function accountsAllowed(origin: string): boolean {
  return origin === ACCOUNT_ORIGIN;
}

/** The address check createWebCloud makes; `devOrigin` adds only local addresses (and none, for Node tests). */
export function originAllowed(origin: string, devOrigin = false): boolean {
  if (accountsAllowed(origin)) return true;
  return devOrigin && (origin === '' || /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(origin));
}

/**
 * Where the sync record, the mirror and the undo copy live: beside the
 * session. On a shared computer (the session in sessionStorage) they go to
 * sessionStorage too, so closing the tab leaves no study copy of the account
 * behind; otherwise localStorage. Writing to one removes the other copy.
 */
export function syncStorage(stores: BrowserStores, shared: () => boolean): StoragePort {
  const pick = () => (shared() ? { to: stores.session, other: stores.local } : { to: stores.local, other: stores.session });
  const quietRemove = (s: StoragePort, k: string) => {
    try {
      s.removeItem(k);
    } catch {
      // storage blocked: nothing there
    }
  };
  return {
    getItem: (k) => pick().to.getItem(k),
    setItem: (k, v) => {
      const { to, other } = pick();
      to.setItem(k, v);
      quietRemove(other, k);
    },
    removeItem: (k) => {
      quietRemove(stores.local, k);
      quietRemove(stores.session, k);
    },
  };
}

/** This browser's install id: the saved one, or a new random one saved now. */
export function webDeviceId(storage: StoragePort, random: RandomPort): string {
  const saved = storage.getItem(DEVICE_ID_KEY);
  if (isDeviceId(saved)) return saved;
  const id = uuidV4(random.bytes(16));
  storage.setItem(DEVICE_ID_KEY, id);
  return id;
}

export function createWebCloud(o: WebCloudOptions): WebCloud {
  if (!originAllowed(o.origin, o.devOrigin)) throw new Error('KaiSipCloud: accounts run only on https://kaisip.com');
  if (!SEMVER.test(o.appVersion)) throw new Error('KaiSipCloud: appVersion must be x.y.z');
  const sv = o.storeVersions;
  if (sv && !(Number.isInteger(sv.progress) && sv.progress >= 1 && Number.isInteger(sv.settings) && sv.settings >= 1)) throw new Error('KaiSipCloud: storeVersions must be whole numbers');
  const gzip: GzipPort = 'gunzipCapped' in o.gzip ? o.gzip : streamGzip(o.gzip);
  const auth = createWebAuth({ fetch: o.fetch, stores: o.stores, random: o.random, lock: o.lock, clock: o.clock, url: o.url, apiKey: o.apiKey });
  const sync = createRestSync(auth, gzip);
  const device = createWebDevice({ host: o.host, storage: syncStorage(o.stores, () => auth.sharedComputer()), bank: o.bank, clock: o.clock });
  const wait = o.wait ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const deviceId = async () => webDeviceId(o.stores.local, o.random);
  const signedInHash = () => {
    const a = auth.current();
    return a ? accountHash(a.userId) : null;
  };
  const ctx = (): CycleCtx => {
    const hash = signedInHash();
    return {
      port: sync,
      device,
      deviceId,
      thisApp: o.appVersion,
      storeVersions: o.storeVersions,
      now: () => o.clock.now(),
      knownCertIds: [WEB_CERT],
      wait,
      // Stops before its next write or push once the learner signs out or another account signs in.
      alive: () => hash !== null && signedInHash() === hash && device.meta().enabled,
    };
  };

  return {
    auth,
    sync,
    device,
    deviceId,

    syncNow: () =>
      o.lock.request(SYNC_LOCK, async () => {
        const m = device.meta();
        const hash = signedInHash();
        if (!hash || !m.enabled) return { kind: 'idle' } as CycleResult;
        // A different account than the one this browser synced with: never synced until the learner chooses.
        if (m.accountHash && m.accountHash !== hash) return { kind: 'idle' } as CycleResult;
        return syncCycle(ctx());
      }),

    prepareFirst: async () => {
      if (!signedInHash()) return { ok: false, code: 'unauthorized' };
      return prepareFirstSync({ port: sync, thisApp: o.appVersion, now: () => o.clock.now(), knownCertIds: [WEB_CERT], read: () => device.read(), stamps: device.meta().stamps });
    },

    confirmFirst: (prep, mode) =>
      o.lock.request(SYNC_LOCK, async () => {
        const hash = signedInHash();
        if (!hash) return { kind: 'failed', code: 'unauthorized' } as CycleResult;
        try {
          // 'replace' keeps this browser's record as the undo copy (device.write); 'merge' adds, so needs none.
          return await confirmFirstSync({ ...ctx(), alive: () => signedInHash() === hash }, prep, mode, mode === 'replace' ? KEEP_UNDO : null, { accountHash: hash });
        } catch (e) {
          if (e instanceof CloudError) return { kind: 'failed', code: e.code } as CycleResult;
          if (e instanceof BackupError) return { kind: 'paused', reason: 'toobig' } as CycleResult;
          throw e;
        }
      }),

    accountChanged() {
      const m = device.meta();
      const hash = signedInHash();
      return Boolean(m.accountHash && hash && m.accountHash !== hash);
    },
  };
}
