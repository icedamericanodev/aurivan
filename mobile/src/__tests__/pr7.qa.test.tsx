/**
 * QA Phase 7 (sync, built OFF): learner journeys with two phones on ONE
 * memory backend, plus the real stores for the screens' actions. These fill
 * gaps next to sync-core / sync-engine / sync-screens:
 * - each first-sync choice (phone only, account only, both, Start fresh);
 * - a second phone joining; both phones studying offline, then reconnecting;
 * - a mock open on one phone while the other syncs (and the paused quiz
 *   surviving an applied pull);
 * - the app killed after a sync write landed but before its record saved;
 * - a pending account switch blocks every sync; sign out keep / remove;
 * - Delete synced progress, then keep studying (on both phones);
 * - Undo sync, then keep studying; Reset while two phones sync (the
 *   documented "comes back from another device");
 * - restoring a backup while syncing (nothing is lost for 7 days);
 * - an older app meeting a newer snapshot, then updating;
 * - flag OFF: a whole study day never touches aurivan.sync.v1, the backend or a timer.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import { act } from 'react-test-renderer';
import { setBackendForTests } from '../cloud/backend';
import { CloudError, type SyncPort } from '../cloud/types';
import { CERTIFICATIONS } from '../content/certifications';
import { createMemoryBackend, type MemoryBackend, type MemoryUser } from '../cloud/memory/backend';
import { getAllQuestions } from '../content/loader';
import { TERMS_VERSION } from '../engine/account';
import { dayKey } from '../engine/streak';
import { stableStringify } from '../engine/syncMerge';
import * as account from '../lib/account';
import * as sync from '../lib/sync';
import { confirmFirstSync, phoneSides, prepareFirstSync, syncCycle, type CycleCtx, type Device, type PhoneData } from '../lib/syncCore';
import { SIGNED_OUT, useAccount } from '../store/account';
import { useBackup } from '../store/backup';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { SYNC_OFF, useSyncMeta, useSyncStatus, type SyncMeta } from '../store/sync';

jest.mock('../cloud/flag', () => ({ CLOUD: true, PROVIDERS: ['email', 'apple', 'google'] }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.18.0' } } }));
const mockNav = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
const mockRedirects: string[] = [];
jest.mock('expo-router', () => {
  const base = require('../../jest/perf/focusRouter').routerMock();
  const Stack = function MockStack() {
    return null;
  };
  Stack.Screen = function MockStackScreen() {
    return null;
  };
  return {
    ...base,
    router: {
      ...base.router,
      push: (...a: unknown[]) => mockNav.push(...a),
      back: (...a: unknown[]) => mockNav.back(...a),
      replace: (...a: unknown[]) => mockNav.replace(...a),
    },
    Redirect: ({ href }: { href: string }) => {
      mockRedirects.push(href);
      return null;
    },
    Stack,
  };
});
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => true, shareAsync: async () => {} }));
jest.mock('expo-file-system', () => {
  class File {
    uri = 'file:///cache/x';
    create() {}
    write() {}
    delete() {}
  }
  return { File, Directory: class { list() { return []; } }, Paths: { cache: 'cache' } };
});
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, SafeAreaProvider: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, { get: (t, k: string) => (k in t ? t[k] : Icon) });
});
jest.mock('../components/brand', () => ({ KaisipLockup: () => null, KaisipMark: () => null, PillarList: () => null }));
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {}, medium: () => {} } }));
jest.mock('../lib/reminders', () => ({
  remindersSupported: false,
  scheduleReminders: async () => {},
  cancelReminders: async () => {},
  ensurePermission: async () => true,
  initNotifications: () => {},
}));

const AS = (() => {
  const m = require('@react-native-async-storage/async-storage');
  return m.default ?? m;
})();
const ids = getAllQuestions('cisa').map((q) => q.id);
const MAYA: MemoryUser = { userId: 'user-7f3a9c', email: 'maya@example.com', providers: ['email', 'google'], termsVersion: TERMS_VERSION, createdAt: Date.UTC(2026, 8, 1) };
const RAJ: MemoryUser = { userId: 'user-raj-02', email: 'raj@example.com', providers: ['email'], termsVersion: TERMS_VERSION, createdAt: Date.UTC(2026, 8, 3) };
let memory: MemoryBackend;
const backendWith = (signedInAs: MemoryUser | null = MAYA) => {
  memory = createMemoryBackend({ users: [MAYA, RAJ], signedIn: signedInAs ? { userId: signedInAs.userId, authAt: Date.now() - 60_000 } : null, appVersion: '1.18.0' });
  setBackendForTests(memory);
  if (signedInAs) act(() => {
      useAccount.getState().setFacts({ ...SIGNED_OUT, signedIn: true, emailMasked: signedInAs === MAYA ? 'm•••@example.com' : 'r•••@example.com', providers: signedInAs.providers });
    });
  return memory;
};

const flush = async (n = 30) => {
  await act(async () => {
    for (let i = 0; i < n; i++) await Promise.resolve();
  });
};
const answered = () => Object.keys(selectCert(useProgress.getState(), 'cisa').answers);
const answer = (qid: string) => act(() => {
      useProgress.getState().recordAnswer('cisa', qid, true, undefined, { ms: 20_000, mastery: false });
    });
const remoteProgress = (qids: string[]) => ({
  byCert: { cisa: { answers: Object.fromEntries(qids.map((q) => [q, { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: Date.now() - 86_400_000 }])) } },
  streak: { current: 2, best: 5, lastDay: dayKey(Date.now() - 86_400_000) },
});

beforeEach(async () => {
  jest.useFakeTimers({ now: new Date(2026, 9, 12, 10, 0) });
  mockNav.push.mockClear();
  mockNav.back.mockClear();
  mockNav.replace.mockClear();
  mockRedirects.length = 0;
  sync.resetSyncForTests();
  useSyncMeta.setState({ ...SYNC_OFF, stamps: { settings: {}, progress: {} } });
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useBackup.setState({ undo: null, lastBackupAt: null, restoredSavedAt: null });
  useSettings.setState({ activeCertId: 'cisa', onboarded: true, theme: 'light', examDates: { cisa: '2026-12-01' } });
  useAccount.getState().setFacts({ ...SIGNED_OUT });
  backendWith(null);
  await flush();
});
afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
  setBackendForTests(undefined);
  sync.resetSyncForTests();
});


// ── Two simulated phones on one account (lib/syncCore.ts against ports) ──

const CERT_IDS = CERTIFICATIONS.map((c) => c.id);
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const T0 = new Date(2026, 9, 12, 9, 0, 0).getTime();
let now = T0;

interface Phone {
  data: PhoneData;
  meta: SyncMeta;
  busy: boolean;
  offline: boolean;
  /** The next write lands on disk, then the app dies before the sync record is saved. */
  dieAfterWrite: boolean;
  device: Device;
  ctx: CycleCtx;
}

function blankData(): PhoneData {
  return {
    settings: { onboarded: true, activeCertId: 'cisa', examDates: { cisa: '2026-12-01' }, theme: 'system', motion: 'system', shuffleOptions: true, dailyGoal: 20, reminder: { enabled: false, hour: 19, minute: 0 }, haptics: true, gameRulesSeen: [], practiceTimer: false, badgesHidden: false },
    progress: { byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {}, reports: [] },
  };
}

function makePhone(deviceId: string, app = '1.18.0'): Phone {
  const p = { data: blankData(), meta: { ...SYNC_OFF, stamps: { settings: {}, progress: {} } }, busy: false, offline: false, dieAfterWrite: false } as Phone;
  const net = <T,>(f: () => Promise<T>): Promise<T> => (p.offline ? Promise.reject(new CloudError('offline')) : f());
  const port: SyncPort = {
    head: (s) => net(() => memory.sync.head(s)),
    pull: (s) => net(() => memory.sync.pull(s)),
    push: (i) => net(() => memory.sync.push(i)),
    deleteAll: () => net(() => memory.sync.deleteAll()),
  };
  p.device = {
    read: () => clone(p.data),
    write: async (next) => {
      p.data = { settings: clone(next.settings), progress: { ...clone(next.progress), days: (p.data.progress as { days?: unknown }).days } };
      if (p.dieAfterWrite) {
        p.dieAfterWrite = false;
        throw new Error('app killed');
      }
    },
    meta: () => p.meta,
    setMeta: (m) => {
      p.meta = { ...p.meta, ...m };
    },
    busy: () => p.busy,
  };
  p.ctx = { port, device: p.device, deviceId: async () => deviceId, thisApp: app, now: () => now, knownCertIds: CERT_IDS, wait: async () => {} };
  return p;
}
/** The app on this phone is updated (or is an older build). */
const runApp = (p: Phone, version: string) => {
  p.ctx = { ...p.ctx, thisApp: version };
};

type Ans = { attempts: number; correctCount: number; lastCorrect: boolean; lastAt: number };
type Prog = { byCert: Record<string, { answers?: Record<string, Ans> }>; streak: { current: number; best: number; lastDay: string | null; recentDays?: string[] } };
function study(p: Phone, qid: string, correct = true) {
  const prog = p.data.progress as Prog;
  const a = ((prog.byCert.cisa ??= {}).answers ??= {});
  const prev = a[qid];
  a[qid] = { attempts: (prev?.attempts ?? 0) + 1, correctCount: (prev?.correctCount ?? 0) + (correct ? 1 : 0), lastCorrect: correct, lastAt: now };
  const day = dayKey(now);
  if (prog.streak.lastDay !== day) prog.streak = { current: prog.streak.current + 1, best: Math.max(prog.streak.best, prog.streak.current + 1), lastDay: day, recentDays: [...(prog.streak.recentDays ?? []), day] };
}
function setGoal(p: Phone, g: number) {
  (p.data.settings as { dailyGoal: number }).dailyGoal = g;
  p.meta = { ...p.meta, stamps: { ...p.meta.stamps, settings: { ...p.meta.stamps.settings, dailyGoal: now } } };
}
const answersOf = (p: Phone) => (p.data.progress as Prog).byCert.cisa?.answers ?? {};
const qidsOf = (p: Phone) => Object.keys(answersOf(p)).sort();
const goalOf = (p: Phone) => (p.data.settings as { dailyGoal: number }).dailyGoal;
const synced = (p: Phone) => {
  const s = phoneSides(p.data, p.meta.stamps, { now, knownCertIds: CERT_IDS });
  return stableStringify({ s: s.settings.state, p: s.progress.state });
};
const prep = (p: Phone) => prepareFirstSync({ port: p.ctx.port, thisApp: p.ctx.thisApp, now: p.ctx.now, knownCertIds: CERT_IDS, read: p.device.read, stamps: p.meta.stamps });
type Prep = Parameters<typeof confirmFirstSync>[1];
async function prepOk(p: Phone): Promise<Prep> {
  const r = await prep(p);
  if (!r.ok) throw new Error(`prepare: ${r.code}`);
  return r.prep;
}
async function join(p: Phone, mode: 'merge' | 'replace' = 'merge') {
  const pr = await prepOk(p);
  return { case: pr.case, result: await confirmFirstSync(p.ctx, pr, mode, null) };
}
const accountQids = () => Object.keys(((memory.control.snapshots(MAYA.userId).progress?.state ?? { byCert: {} }) as Prog).byCert.cisa?.answers ?? {}).sort();
const twoPhones = () => {
  now = T0;
  backendWith(MAYA);
  return { A: makePhone('aaaaaaaa-1111-4111-8111-111111111111'), B: makePhone('bbbbbbbb-2222-4222-8222-222222222222') };
};

describe('J1: first sign-in on a phone with progress, each choice', () => {
  it('only the phone has progress: "Add this phone’s progress"; the account then holds exactly it', async () => {
    const { A } = twoPhones();
    study(A, ids[0]);
    study(A, ids[1]);
    const before = clone(A.data);
    const pr = await prepOk(A);
    expect(pr.case).toBe('phone');
    // Preparing reads only: nothing on the phone or the account changed.
    expect(A.data).toEqual(before);
    expect(memory.control.snapshots(MAYA.userId)).toEqual({});
    expect((await confirmFirstSync(A.ctx, pr, 'merge', null)).kind).toBe('synced');
    expect(accountQids()).toEqual([ids[0], ids[1]].sort());
    expect(qidsOf(A)).toEqual([ids[0], ids[1]].sort());
  });

  it('only the account has progress: "Bring it here"; the phone takes it, the account is not rewritten', async () => {
    const { A, B } = twoPhones();
    study(A, ids[2]);
    await join(A);
    const rev = memory.control.snapshots(MAYA.userId).progress!.rev;
    const j = await join(B);
    expect(j.case).toBe('account');
    expect(qidsOf(B)).toEqual([ids[2]]);
    // Same data on both sides: the second phone joining writes nothing new.
    expect(memory.control.snapshots(MAYA.userId).progress!.rev).toBe(rev);
  });

  it('both have progress: "Combine"; After is the real merge, and both phones converge on it', async () => {
    const { A, B } = twoPhones();
    study(A, ids[0]);
    await join(A);
    study(B, ids[0], false);
    study(B, ids[3]);
    const pr = await prepOk(B);
    expect(pr.case).toBe('both');
    const after = Object.keys((pr.after.progress as Prog).byCert.cisa.answers!).sort();
    await confirmFirstSync(B.ctx, pr, 'merge', null);
    expect(qidsOf(B)).toEqual(after);
    await syncCycle(A.ctx);
    expect(synced(A)).toBe(synced(B));
    // The same question answered once on each phone: attempts are the max (1), never inflated to 2.
    expect(answersOf(A)[ids[0]].attempts).toBe(1);
  });

  it('"Start fresh" (replace): the phone takes the account’s progress and none of its own reaches the account', async () => {
    const { A, B } = twoPhones();
    study(A, ids[4]);
    await join(A);
    study(B, ids[5]);
    await join(B, 'replace');
    expect(qidsOf(B)).toEqual([ids[4]]);
    expect(accountQids()).toEqual([ids[4]]);
  });
});

describe('J2–J3: a second phone joins; both study offline, then reconnect', () => {
  it('everything answered on either phone ends up on both; the later goal wins; attempts never inflate', async () => {
    const { A, B } = twoPhones();
    study(A, ids[0]);
    await join(A);
    await join(B);
    expect(qidsOf(B)).toEqual([ids[0]]);

    // The commute: both offline. Each studies; syncs fail quietly and change nothing.
    A.offline = true;
    B.offline = true;
    now += 60_000;
    study(A, ids[1]);
    study(A, ids[0], false);
    setGoal(A, 30);
    now += 60_000;
    study(B, ids[2]);
    setGoal(B, 40);
    const aBefore = clone(A.data);
    expect(await syncCycle(A.ctx)).toEqual({ kind: 'failed', code: 'offline' });
    expect(await syncCycle(B.ctx)).toEqual({ kind: 'failed', code: 'offline' });
    expect(A.data).toEqual(aBefore);

    // Back online: B first, then A (it merges), then B again.
    A.offline = false;
    B.offline = false;
    now += 60_000;
    await syncCycle(B.ctx);
    await syncCycle(A.ctx);
    await syncCycle(B.ctx);
    expect(qidsOf(A)).toEqual([ids[0], ids[1], ids[2]].sort());
    expect(synced(A)).toBe(synced(B));
    expect(goalOf(A)).toBe(40);
    expect(goalOf(B)).toBe(40);
    expect(answersOf(A)[ids[0]]).toMatchObject({ attempts: 2, correctCount: 1, lastCorrect: false });
    // Settled: another round writes nothing.
    const rev = memory.control.snapshots(MAYA.userId).progress!.rev;
    expect((await syncCycle(A.ctx)).kind).toBe('idle');
    expect((await syncCycle(B.ctx)).kind).toBe('idle');
    expect(memory.control.snapshots(MAYA.userId).progress!.rev).toBe(rev);
  });
});

describe('J4: a mock exam open on one phone', () => {
  it('the other phone’s progress waits; the mock phone keeps (and later sends) its own answers', async () => {
    const { A, B } = twoPhones();
    study(A, ids[0]);
    await join(A);
    await join(B);
    B.busy = true; // the mock is open on B
    now += 60_000;
    study(A, ids[1]);
    expect((await syncCycle(A.ctx)).kind).toBe('synced');
    study(B, ids[2]); // B's own study from before the mock
    const bBefore = clone(B.data);
    expect(await syncCycle(B.ctx)).toEqual({ kind: 'deferred' });
    expect(B.data).toEqual(bBefore);
    expect(B.meta.deferredPull).toBe(true);
    // The mock ends: the waiting pull lands, and B's own answer goes up.
    B.busy = false;
    expect((await syncCycle(B.ctx)).kind).toBe('synced');
    expect(qidsOf(B)).toEqual([ids[0], ids[1], ids[2]].sort());
    expect(B.meta.deferredPull).toBe(false);
    await syncCycle(A.ctx);
    expect(synced(A)).toBe(synced(B));
  });
});

describe('J5: the app is killed during a sync write', () => {
  it('the merged data landed but the record did not: the next launch converges, nothing doubles or goes missing', async () => {
    const { A, B } = twoPhones();
    study(A, ids[0]);
    await join(A);
    await join(B);
    now += 60_000;
    study(B, ids[1]);
    await syncCycle(B.ctx);
    study(A, ids[2]);
    const metaBefore = clone(A.meta);
    A.dieAfterWrite = true;
    expect(await syncCycle(A.ctx)).toEqual({ kind: 'failed', code: 'server' });
    // The merged data is on disk; the sync record is the old one.
    expect(qidsOf(A)).toEqual([ids[0], ids[1], ids[2]].sort());
    expect(A.meta).toEqual(metaBefore);
    // Next launch.
    expect((await syncCycle(A.ctx)).kind).toBe('synced');
    await syncCycle(B.ctx);
    expect(synced(A)).toBe(synced(B));
    for (const q of [ids[0], ids[1], ids[2]]) expect(answersOf(B)[q].attempts).toBe(1);
    expect((await syncCycle(A.ctx)).kind).toBe('idle');
  });
});

describe('J8: Delete synced progress, then keep studying', () => {
  it('the account copy goes; this phone studies on with no upload; the other phone stops instead of re-uploading', async () => {
    const { A, B } = twoPhones();
    study(A, ids[0]);
    await join(A);
    study(B, ids[1]);
    await join(B);
    await syncCycle(A.ctx);
    // A: Delete synced progress (lib/sync.ts deleteSyncedProgress: deleteAll, then sync off).
    await A.ctx.port.deleteAll();
    A.meta = { ...A.meta, ...SYNC_OFF };
    now += 60_000;
    study(A, ids[2]);
    expect(await syncCycle(A.ctx)).toEqual({ kind: 'idle' });
    expect(memory.control.snapshots(MAYA.userId)).toEqual({});
    // B studied meanwhile, then syncs: it stops, keeps everything, uploads nothing.
    study(B, ids[3]);
    expect(await syncCycle(B.ctx)).toEqual({ kind: 'stopped' });
    expect(B.meta.enabled).toBe(false);
    expect(qidsOf(B)).toEqual([ids[0], ids[1], ids[3]].sort());
    expect(memory.control.snapshots(MAYA.userId)).toEqual({});
    // A turns sync on again: the preview is "this phone only" and only A's progress goes up.
    const again = await join(A);
    expect(again.case).toBe('phone');
    expect(accountQids()).toEqual([ids[0], ids[1], ids[2]].sort());
  });
});

describe('Reset while two phones sync (in-app: progress you reset can come back from another device)', () => {
  it('nothing is lost: the other phone’s next sync puts the reset exam back everywhere', async () => {
    const { A, B } = twoPhones();
    study(A, ids[0]);
    study(A, ids[1]);
    await join(A);
    await join(B);
    // Settings → Reset on A (per exam; the streak stays, as the store does).
    now += 60_000;
    (A.data.progress as Prog).byCert.cisa = {};
    await syncCycle(A.ctx);
    expect(qidsOf(A)).toEqual([]);
    await syncCycle(B.ctx);
    expect(qidsOf(B)).toEqual([ids[0], ids[1]].sort());
    await syncCycle(A.ctx);
    expect(qidsOf(A)).toEqual([ids[0], ids[1]].sort());
    expect(accountQids()).toEqual([ids[0], ids[1]].sort());
  });
});

describe('older and newer app versions', () => {
  it('an older app pauses on a newer minor’s copy, studies on, never pushes; once updated it merges everything', async () => {
    const { A, B } = twoPhones();
    study(A, ids[0]);
    await join(A);
    await join(B);
    runApp(B, '1.19.0');
    now += 60_000;
    study(B, ids[1]);
    expect((await syncCycle(B.ctx)).kind).toBe('synced');
    const server = clone(memory.control.snapshots(MAYA.userId));
    study(A, ids[2]);
    const aBefore = clone(A.data);
    expect(await syncCycle(A.ctx)).toEqual({ kind: 'paused', reason: 'newer' });
    expect(A.meta.pausedReason).toBe('newer');
    expect(A.data).toEqual(aBefore);
    expect(memory.control.snapshots(MAYA.userId)).toEqual(server);
    // A first-sync preview on an older app refuses too (it never shows a merge it can't read).
    const third = makePhone('cccccccc-3333-4333-8333-333333333333', '1.18.0');
    expect(await prep(third)).toEqual({ ok: false, code: 'newer' });
    // The app updates: the pause clears and nothing from either phone is lost.
    runApp(A, '1.19.0');
    expect((await syncCycle(A.ctx)).kind).toBe('synced');
    expect(A.meta.pausedReason).toBeNull();
    await syncCycle(B.ctx);
    expect(qidsOf(B)).toEqual([ids[0], ids[1], ids[2]].sort());
    expect(synced(A)).toBe(synced(B));
  });

  it('a newer app reads an older app’s copy and syncs with it; the older phone then pauses instead of writing over it', async () => {
    const { A, B } = twoPhones();
    runApp(A, '1.17.2');
    study(A, ids[0]);
    await join(A);
    study(B, ids[1]);
    const j = await join(B);
    expect(j.result.kind).toBe('synced');
    expect(qidsOf(B)).toEqual([ids[0], ids[1]].sort());
    expect(await syncCycle(A.ctx)).toEqual({ kind: 'paused', reason: 'newer' });
  });
});

// ── The real stores and lib/sync.ts ─────────────────────────────────────
const mayaUp = async () => {
  backendWith(MAYA);
  answer(ids[0]);
  await sync.startFirstSync();
  await sync.confirmPreview();
  expect(useSyncMeta.getState().enabled).toBe(true);
};
const syncCalls = () => memory.control.calls.filter((c) => c.startsWith('sync.'));
const accountAnswers = (u: MemoryUser) => Object.keys(((memory.control.snapshots(u.userId).progress?.state ?? { byCert: {} }) as Prog).byCert.cisa?.answers ?? {}).sort();
const later = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
  await flush(60);
};

describe('shared phone: switch account, sign out', () => {
  it('while the account-switch sheet waits, nothing syncs at all (Sync now, leaving a quiz, timers)', async () => {
    await mayaUp();
    await account.signOut('local');
    const stop = await sync.initSync();
    memory.control.writeSnapshot(RAJ.userId, 'progress', { state: remoteProgress([ids[7]]) });
    await account.sendCode('raj@example.com');
    await account.verifyCode('raj@example.com', memory.control.lastCode('raj@example.com')!, true);
    await flush();
    expect(sync.switchOffered()).toBe(true);
    memory.control.calls.length = 0;
    answer(ids[1]);
    await sync.syncNow();
    sync.setRoute('/session');
    sync.setRoute('/home');
    await later(61 * 60_000);
    expect(syncCalls()).toEqual([]);
    expect(accountAnswers(RAJ)).toEqual([ids[7]]);
    expect(answered().sort()).toEqual([ids[0], ids[1]].sort());
    stop();
  });

  it('sign out (keep): progress stays, nothing syncs while signed out; the same account signing back in resumes without a preview', async () => {
    await mayaUp();
    const stop = await sync.initSync();
    await flush();
    expect(await sync.signOutHere({ removeLocal: false })).toEqual({ ok: true });
    expect(answered()).toEqual([ids[0]]);
    memory.control.calls.length = 0;
    answer(ids[1]);
    await sync.syncNow();
    await later(15 * 60_000);
    expect(syncCalls()).toEqual([]);
    await account.sendCode('maya@example.com');
    await account.verifyCode('maya@example.com', memory.control.lastCode('maya@example.com')!, true);
    await flush(60);
    expect(useSyncStatus.getState().offer).toBeNull();
    expect(sync.switchOffered()).toBe(false);
    expect(accountAnswers(MAYA)).toEqual([ids[0], ids[1]].sort());
    stop();
  });

  it('sign out (remove): answers, the undo copy and the link go; sync is off; the account copy is untouched', async () => {
    await mayaUp();
    answer(ids[1]);
    await sync.syncNow();
    await flush();
    expect(await sync.signOutHere({ removeLocal: true })).toEqual({ ok: true });
    expect(answered()).toEqual([]);
    expect(useBackup.getState().undo).toBeNull();
    expect(useSyncMeta.getState().enabled).toBe(false);
    expect(useAccount.getState().syncedAccountHash).toBeNull();
    expect(useAccount.getState().signedIn).toBe(false);
    expect(accountAnswers(MAYA)).toEqual([ids[0], ids[1]].sort());
  });
});

describe('after Delete synced progress / Undo sync, study goes on with no upload', () => {
  it('Delete synced progress: later study is never uploaded, by timers or by leaving a quiz', async () => {
    await mayaUp();
    const stop = await sync.initSync();
    await flush();
    expect(await sync.deleteSyncedProgress()).toEqual({ ok: true });
    expect(memory.control.snapshots(MAYA.userId)).toEqual({});
    memory.control.calls.length = 0;
    answer(ids[1]);
    sync.setRoute('/session');
    sync.setRoute('/results');
    await later(61 * 60_000);
    expect(syncCalls()).toEqual([]);
    expect(memory.control.snapshots(MAYA.userId)).toEqual({});
    expect(answered().sort()).toEqual([ids[0], ids[1]].sort());
    // Turning it on again shows the preview again ("this phone only").
    expect(await sync.startFirstSync()).toEqual({ ok: true, next: 'preview' });
    expect(sync.pendingPreview()!.case).toBe('phone');
    stop();
  });

  it('Undo sync: the phone goes back, sync is off, later study is not uploaded, the account copy stays', async () => {
    backendWith(MAYA);
    answer(ids[0]);
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[2]]) });
    await sync.startFirstSync();
    await sync.confirmPreview();
    const stop = await sync.initSync();
    await flush();
    expect((await sync.undoSync()).kind).toBe('ok');
    expect(answered()).toEqual([ids[0]]);
    expect(useSyncMeta.getState().enabled).toBe(false);
    memory.control.calls.length = 0;
    answer(ids[5]);
    await later(61 * 60_000);
    expect(syncCalls()).toEqual([]);
    expect(accountAnswers(MAYA)).toEqual([ids[0], ids[2]].sort());
    stop();
  });
});

describe('a pull lands while a quiz is paused (not open)', () => {
  it('the paused quiz is kept exactly; only progress changes', async () => {
    await mayaUp();
    const stop = await sync.initSync();
    await flush();
    const paused = { id: 'qa-paused', certId: 'cisa', kind: 'mock', questionIds: [ids[0], ids[1]], responses: { [ids[0]]: { picked: 'B' } }, startedAt: Date.now() - 60_000 };
    act(() => {
      useSession.setState({ active: paused as never });
    });
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[0], ids[9]]) });
    await sync.syncNow();
    await flush(60);
    expect(answered().sort()).toEqual([ids[0], ids[9]].sort());
    expect(useSession.getState().active).toEqual(paused);
    stop();
  });
});

describe('restore a backup while syncing', () => {
  it('nothing is lost: the data from before the restore is in Undo, and Undo restore brings it back to the phone and the account', async () => {
    await mayaUp();
    const lib = require('../lib/backup') as typeof import('../lib/backup');
    const file = lib.currentBackup();
    answer(ids[1]);
    answer(ids[2]);
    await sync.syncNow();
    await flush();
    expect(accountAnswers(MAYA)).toEqual([ids[0], ids[1], ids[2]].sort());
    const ready = lib.checkBackupText(JSON.stringify(file));
    if (ready.kind !== 'ok') throw new Error(ready.code);
    expect((await lib.restoreBackup(ready.data)).kind).toBe('ok');
    expect(answered()).toEqual([ids[0]]);
    expect(Object.keys(useBackup.getState().undo!.file.stores.progress.state.byCert.cisa.answers!).sort()).toEqual([ids[0], ids[1], ids[2]].sort());
    await sync.syncNow();
    await flush(60);
    expect(useSyncMeta.getState().enabled).toBe(true);
    expect(useSyncMeta.getState().pausedReason).toBeNull();
    expect((await lib.undoRestore()).kind).toBe('ok');
    expect(answered().sort()).toEqual([ids[0], ids[1], ids[2]].sort());
    await sync.syncNow();
    await flush(60);
    expect(accountAnswers(MAYA)).toEqual([ids[0], ids[1], ids[2]].sort());
  });
});

describe('flag OFF: nothing changes vs main', () => {
  it('a whole study day (answers, settings, reset, restore, routes, timers) never touches the sync record, the backend or a timer', async () => {
    // The file's flag mock is one shared object (an isolated registry still returns it): switch it off
    // for this test only. The modules below are fresh (isolated), like a real launch of an OFF build.
    const flag = require('../cloud/flag') as { CLOUD: boolean };
    flag.CLOUD = false;
    // Earlier tests (and this file's beforeEach) wrote the record: start from empty storage.
    await AS.clear();
    try {
      await jest.isolateModulesAsync(async () => {
        const off = createMemoryBackend({ users: [MAYA], signedIn: { userId: MAYA.userId, authAt: Date.now() } });
        require('../cloud/backend').setBackendForTests(off);
        const libSync = require('../lib/sync') as typeof import('../lib/sync');
        const libAccount = require('../lib/account') as typeof import('../lib/account');
        const libBackup = require('../lib/backup') as typeof import('../lib/backup');
        const P = require('../store/progress') as typeof import('../store/progress');
        const St = require('../store/settings') as typeof import('../store/settings');
        expect(libAccount.cloudReady()).toBe(false);
        // No timer of any kind is set by sync (a fake-timer count would also see React's own immediates).
        const setT = jest.spyOn(global, 'setTimeout');
        const setI = jest.spyOn(global, 'setInterval');
        await libAccount.initAccount();
        const stop = await libSync.initSync();
        act(() => {
          P.useProgress.getState().recordAnswer('cisa', ids[0], true, undefined, { ms: 10_000, mastery: false });
          St.useSettings.getState().setDailyGoal(35);
          St.useSettings.getState().setExamDate('cisa', '2027-01-15');
        });
        const file = libBackup.currentBackup();
        act(() => {
          P.useProgress.getState().resetCert('cisa');
        });
        const ready = libBackup.checkBackupText(JSON.stringify(file));
        if (ready.kind !== 'ok') throw new Error(ready.code);
        await libBackup.restoreBackup(ready.data);
        libSync.setRoute('/session');
        libSync.setRoute('/results');
        await libSync.syncNow();
        await act(async () => {
          jest.advanceTimersByTime(2 * 60 * 60_000);
        });
        await flush();
        expect(off.control.calls).toEqual([]);
        expect(setT).not.toHaveBeenCalled();
        expect(setI).not.toHaveBeenCalled();
        setT.mockRestore();
        setI.mockRestore();
        const keys: string[] = await AS.getAllKeys();
        expect(keys).toContain('aurivan.progress.v1'); // the check can see what the stores save
        expect(keys.filter((k) => k.startsWith('aurivan.sync'))).toEqual([]);
        expect(Object.keys(P.selectCert(P.useProgress.getState(), 'cisa').answers)).toEqual([ids[0]]);
        stop();
        require('../cloud/backend').setBackendForTests(undefined);
      });
    } finally {
      flag.CLOUD = true;
    }
  });
});
