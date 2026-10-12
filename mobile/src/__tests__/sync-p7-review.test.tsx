/**
 * Phase 7 review fixes (FIXES_P7.md) in the app's sync glue, with the real
 * stores and the memory backend.
 *
 * The first two groups are the reviewers' repros, ported as they were
 * written (code review CR_P7.md B1a/B1b/B2/B3/B3b/B5; QA_P7.md B1/B2/B3/B5).
 * Every one of them FAILED on e4eb12d and passes now. The overriding
 * property: a learner's progress is never lost or merged into another
 * learner's account, whatever runs at the same time.
 *
 * The third group covers the rest of the list: one cycle at a time (CR N2,
 * N5), an unreadable copy not downloaded again (SEC S5), a failed merge into
 * live data records nothing (CR N1), a change during the write keeps its
 * stamp (CR N4), "Not now" on the switch sheet turns sync off, Delete
 * synced progress / sync off / account deletion during a pull, the full
 * wipe (theme kept, new install id), and the screens: the sign-out sheet's
 * red button and unsynced warning (UX H1), the Reset alert while syncing
 * (UX H2, O2), and status announcements after a tap (UX H3, O4).
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import type { ComponentType, ReactElement } from 'react';
import { AccessibilityInfo, Alert } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { setBackendForTests } from '../cloud/backend';
import { createMemoryBackend, type MemoryBackend, type MemoryUser } from '../cloud/memory/backend';
import { getAllQuestions } from '../content/loader';
import { TERMS_VERSION } from '../engine/account';
import { sha256Hex } from '../engine/sha256';
import { dayKey } from '../engine/streak';
import * as account from '../lib/account';
import { flushSayLaterForTest } from '../lib/a11y';
import * as sync from '../lib/sync';
import { SIGNED_OUT, useAccount } from '../store/account';
import { useBackup } from '../store/backup';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { SYNC_OFF, useSyncMeta } from '../store/sync';

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
jest.mock('../components/brand', () => ({ BrandLockup: () => null, PillarList: () => null, BrandMark: () => null }));
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

let r: ReactTestRenderer | undefined;
const mount = (el: ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const unmount = () => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
};
const flush = async (n = 30) => {
  await act(async () => {
    for (let i = 0; i < n; i++) await Promise.resolve();
  });
};
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(r!.root);
  return out.join(' ');
};
const pressables = (label: string) =>
  r!.root.findAll((n) => typeof n.props.onPress === 'function' && (n.props.accessibilityLabel === label || n.props.label === label || n.props.title === label));
const press = async (label: string) => {
  const n = pressables(label)[0];
  if (!n) throw new Error(`no button "${label}" in: ${allText()}`);
  await act(async () => {
    n.props.onPress();
  });
  await flush();
};
const toggle = async (label: string, on: boolean) => {
  const n = r!.root.findAll((x) => typeof x.props.onValueChange === 'function' && x.props.accessibilityLabel === label)[0];
  if (!n) throw new Error(`no switch "${label}"`);
  await act(async () => {
    n.props.onValueChange(on);
  });
  await flush();
};
const screen = (path: string) => require(`../app/(cloud)/account/${path}`).default as ComponentType;
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
  unmount();
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
  setBackendForTests(undefined);
  sync.resetSyncForTests();
});


// ── CR P7 repros ────────────────────────────────────────────────────────
/** Holds the server's reply to the next pull until release() (the request already reached the server). */
function holdNextPull() {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  let entered = false;
  const orig = memory.sync.pull.bind(memory.sync);
  memory.sync.pull = async (s) => {
    const reply = await orig(s);
    memory.sync.pull = orig;
    entered = true;
    await gate;
    return reply;
  };
  return { release, entered: () => entered };
}
const setUp = async () => {
  backendWith(MAYA);
  answer(ids[0]);
  await sync.startFirstSync();
  await sync.confirmPreview();
};

describe('CR-P7 repros', () => {
  it('B1a: an answer made while a pull is on the wire is kept', async () => {
    await setUp();
    const stop = await sync.initSync();
    await flush();
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[0], ids[9]]) });
    const h = holdNextPull();
    const p = sync.syncNow();
    await flush();
    expect(h.entered()).toBe(true);
    answer(ids[5]); // the learner answers while the reply is in flight
    h.release();
    await act(async () => {
      await p;
    });
    await flush(60);
    expect(answered().sort()).toEqual([ids[0], ids[5], ids[9]].sort());
    stop();
  });

  it('B1b: an exam date changed while a pull is on the wire is kept', async () => {
    await setUp();
    const stop = await sync.initSync();
    await flush();
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[0], ids[9]]) });
    const h = holdNextPull();
    const p = sync.syncNow();
    await flush();
    act(() => {
      useSettings.getState().setExamDate('cisa', '2027-03-03');
    });
    h.release();
    await act(async () => {
      await p;
    });
    await flush(60);
    expect(useSettings.getState().examDates.cisa).toBe('2027-03-03');
    stop();
  });

  it('B2: after "Not now" on the switch sheet and a relaunch, Maya’s phone never syncs into Raj’s account', async () => {
    await setUp();
    await account.signOut('local');
    let stop = await sync.initSync();
    memory.control.writeSnapshot(RAJ.userId, 'progress', { state: remoteProgress([ids[7]]) });
    memory.control.writeSnapshot(RAJ.userId, 'settings', { state: { activeCertId: 'cisa', examDates: { cisa: '2027-05-05' } } });
    await account.sendCode('raj@example.com');
    await account.verifyCode('raj@example.com', memory.control.lastCode('raj@example.com')!, true);
    await flush();
    expect(sync.switchOffered()).toBe(true);
    expect(useSyncMeta.getState().lastRev).toEqual({ settings: 1, progress: 1 });
    // "Not now" on the sheet, then the app is closed and opened again.
    stop();
    sync.resetSyncForTests();
    stop = await sync.initSync();
    await flush(60);
    answer(ids[3]);
    await sync.syncNow();
    await flush(60);
    const raj = memory.control.snapshots(RAJ.userId).progress!.state as { byCert: { cisa: { answers: object } } };
    // Raj's account must still be Raj's alone.
    expect(useSyncMeta.getState().enabled).toBe(true);
    expect(Object.keys(raj.byCert.cisa.answers)).toEqual([ids[7]]);
    stop();
  });

  it('B3: "Remove my progress from this phone" while a sync reply is in flight leaves the phone empty', async () => {
    await setUp();
    const stop = await sync.initSync();
    await flush();
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[0], ids[9]]) });
    const h = holdNextPull();
    const p = sync.syncNow();
    await flush();
    let out!: Promise<unknown>;
    await act(async () => {
      out = sync.signOutHere({ removeLocal: true });
      for (let i = 0; i < 20; i++) await Promise.resolve();
    });
    h.release();
    await act(async () => {
      await p;
      await out;
    });
    await flush(60);
    expect(answered()).toEqual([]);
    stop();
  });

  it('B3b: "Undo sync" while a sync reply is in flight sticks', async () => {
    backendWith(MAYA);
    answer(ids[0]);
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[2]]) });
    await sync.startFirstSync();
    await sync.confirmPreview();
    const stop = await sync.initSync();
    await flush();
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[2], ids[9]]) });
    const h = holdNextPull();
    const p = sync.syncNow();
    await flush();
    let out!: Promise<unknown>;
    await act(async () => {
      out = sync.undoSync();
      for (let i = 0; i < 20; i++) await Promise.resolve();
    });
    h.release();
    await act(async () => {
      await p;
      await out;
    });
    await flush(60);
    expect(answered()).toEqual([ids[0]]);
    stop();
  });

  it('B5: "Remove my progress from this phone" leaves nothing of Maya for the next account to merge', async () => {
    await setUp();
    act(() => {
      useSettings.getState().setExamDate('cisa', '2027-04-04');
    });
    const stop = await sync.initSync();
    await act(async () => {
      await sync.signOutHere({ removeLocal: true });
    });
    const p = useProgress.getState();
    expect(answered()).toEqual([]);
    expect({ streak: p.streak.lastDay, best: p.streak.best, exam: useSettings.getState().examDates.cisa }).toEqual({ streak: null, best: 0, exam: undefined });
    stop();
  });
});

const progressAnswers = (userId: string) =>
  Object.keys(((memory.control.snapshots(userId).progress?.state ?? { byCert: {} }) as { byCert: { cisa?: { answers?: object } } }).byCert.cisa?.answers ?? {});

describe('QA-P7 repros', () => {
  it('B1: shared phone, app restarted before the switch sheet is answered: Maya’s progress goes into Raj’s account', async () => {
    backendWith(MAYA);
    answer(ids[0]);
    answer(ids[1]);
    await sync.startFirstSync();
    await sync.confirmPreview();
    expect(useAccount.getState().syncedAccountHash).toBe(sha256Hex(MAYA.userId));
    // Maya signs out on this phone, keeping her progress.
    await sync.signOutHere({ removeLocal: false });
    expect(useSyncMeta.getState().enabled).toBe(true); // the record is kept
    // Raj, who already syncs on his own phone, signs in. The app is then killed
    // (the OS reclaims it) before he answers the switch sheet: the in-memory
    // "switch pending" is gone. Modelled as a fresh process on Raj's session.
    const keep = memory;
    const settingsState = keep.control.snapshots(MAYA.userId).settings!.state;
    memory = createMemoryBackend({ users: [MAYA, RAJ], signedIn: { userId: RAJ.userId, authAt: Date.now() - 60_000 }, appVersion: '1.18.0' });
    memory.control.writeSnapshot(RAJ.userId, 'progress', { state: remoteProgress([ids[7]]) });
    memory.control.writeSnapshot(RAJ.userId, 'progress', { state: remoteProgress([ids[7]]) });
    memory.control.writeSnapshot(RAJ.userId, 'progress', { state: remoteProgress([ids[7]]) });
    memory.control.writeSnapshot(RAJ.userId, 'settings', { state: { ...(settingsState as object), dailyGoal: 50 } });
    setBackendForTests(memory);
    sync.resetSyncForTests();
    act(() => {
      useAccount.getState().setFacts({ signedIn: true, emailMasked: 'r•••@example.com', providers: ['email'] });
    });
    const stop = await sync.initSync(); // launch: initAccount emits no 'signedIn' event
    await flush(80);
    stop();
    // Expected: nothing syncs until Raj chooses on the switch sheet.
    expect({ raj: progressAnswers(RAJ.userId), phone: answered().sort() }).toEqual({ raj: [ids[7]], phone: [ids[0], ids[1]].sort() });
  });

  it('B2: "Remove my progress from this phone" leaves the streak; the next account’s first sync takes it', async () => {
    backendWith(MAYA);
    answer(ids[0]);
    await sync.startFirstSync();
    await sync.confirmPreview();
    const mayaBest = useProgress.getState().streak.best;
    expect(mayaBest).toBeGreaterThan(0);
    await sync.signOutHere({ removeLocal: true });
    // Copy: "This removes all study progress from this phone."
    expect(answered()).toEqual([]);
    const left = { ...useProgress.getState().streak };
    // Raj (a new account, nothing synced) signs in on the shared phone and turns sync on.
    memory = createMemoryBackend({ users: [MAYA, RAJ], signedIn: { userId: RAJ.userId, authAt: Date.now() - 60_000 }, appVersion: '1.18.0' });
    setBackendForTests(memory);
    act(() => {
      useAccount.getState().setFacts({ signedIn: true, emailMasked: 'r•••@example.com', providers: ['email'] });
    });
    const start = await sync.startFirstSync();
    const preview = sync.pendingPreview();
    if (start.ok && start.next === 'preview') await sync.confirmPreview();
    const rajStreak = (memory.control.snapshots(RAJ.userId).progress?.state as { streak?: { best: number; lastDay: string | null } } | undefined)?.streak ?? null;
    expect({ left, start, previewCase: preview?.case, rajStreak }).toEqual({ left: { current: 0, best: 0, lastDay: null }, start: { ok: true, next: 'done' }, previewCase: undefined, rajStreak: expect.anything() });
  });

  it('B3: turning sync off and on again replaces the original "Undo sync" copy without saying so', async () => {
    backendWith(MAYA);
    answer(ids[0]);
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[2]]) });
    await sync.startFirstSync();
    await sync.confirmPreview();
    const firstUndo = useBackup.getState().undo!;
    expect(Object.keys(firstUndo.file.stores.progress.state.byCert.cisa.answers!)).toEqual([ids[0]]);
    sync.turnSyncOff();
    jest.setSystemTime(Date.now() + 60 * 60_000);
    await sync.startFirstSync();
    const preview = sync.pendingPreview()!;
    await sync.confirmPreview();
    // Expected: "Undo sync" still puts back the phone from before it FIRST synced (or the preview warns).
    const undoAnswers = Object.keys(useBackup.getState().undo!.file.stores.progress.state.byCert.cisa.answers!);
    expect({ undoAnswers, warned: preview.replacesUndo }).toEqual({ undoAnswers: [ids[0]], warned: false });
  });

  it('B5: Undo sync that fails to save still turns sync off (nothing says so)', async () => {
    backendWith(MAYA);
    answer(ids[0]);
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[2]]) });
    await sync.startFirstSync();
    await sync.confirmPreview();
    const ms = AS.multiSet as jest.Mock;
    const orig = ms.getMockImplementation()!;
    let armed = true;
    ms.mockImplementation(async (rows: [string, string][], cb?: unknown) => {
      if (armed && rows.length >= 3) {
        armed = false;
        throw new Error('disk full');
      }
      return orig(rows, cb);
    });
    const r = await sync.undoSync();
    ms.mockImplementation(orig);
    expect({ kind: r.kind, enabled: useSyncMeta.getState().enabled }).toEqual({ kind: 'failed', enabled: true });
  });
});

// ── The rest of FIXES_P7 ────────────────────────────────────────────────
describe('review fixes beyond the repros', () => {
  it('CR N2: one cycle at a time, the first sync’s own push included', async () => {
    backendWith(MAYA);
    answer(ids[0]);
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[2]]) });
    const stop = await sync.initSync();
    await sync.startFirstSync();
    let inFlight = 0;
    let most = 0;
    const orig = memory.sync.head.bind(memory.sync);
    memory.sync.head = async (st) => {
      inFlight++;
      most = Math.max(most, inFlight);
      try {
        await Promise.resolve();
        return await orig(st);
      } finally {
        inFlight--;
      }
    };
    const confirmed = sync.confirmPreview();
    // Triggers arriving meanwhile (a background, a route change, Sync now) never start a second cycle.
    void sync.syncNow();
    void sync.trigger();
    await act(async () => {
      await confirmed;
    });
    await flush(80);
    expect(most).toBe(1);
    expect(progressAnswers(MAYA.userId).sort()).toEqual([ids[0], ids[2]].sort());
    stop();
  });

  it('CR N5: triggers that pile up behind a failing cycle wait for its backoff (one try, not several)', async () => {
    await setUp();
    const stop = await sync.initSync();
    await flush();
    answer(ids[6]);
    memory.control.setOffline(true);
    const heads = () => memory.control.calls.filter((c) => c === 'sync.head').length;
    const before = heads();
    const run = sync.syncNow();
    void sync.trigger();
    void sync.trigger();
    await act(async () => {
      await run;
    });
    await flush(40);
    expect(heads() - before).toBeLessThanOrEqual(1);
    stop();
  });

  it('SEC S5: an unreadable account copy is downloaded once, not again on every trigger until it changes', async () => {
    await setUp();
    const stop = await sync.initSync();
    await flush();
    // Another device wrote a copy this app refuses (an exam it doesn't know).
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: { byCert: { zz9: {} }, streak: { current: 0, best: 0, lastDay: null } } });
    const pulls = () => memory.control.calls.filter((c) => c === 'sync.pull').length;
    const before = pulls();
    await act(async () => {
      await sync.trigger();
    });
    expect(useSyncMeta.getState().pausedReason).toBe('unreadable');
    await act(async () => {
      await sync.trigger();
      await sync.trigger();
    });
    expect(pulls() - before).toBe(1);
    // A settings change from another device doesn't make it fetch the stuck progress copy again.
    memory.control.writeSnapshot(MAYA.userId, 'settings', { state: { activeCertId: 'cisa', dailyGoal: 40 } });
    await act(async () => {
      await sync.trigger();
    });
    expect(pulls() - before).toBe(1);
    // "Try again" reads it once more; a NEW copy is read on the next trigger.
    await act(async () => {
      await sync.syncNow();
    });
    expect(pulls() - before).toBeGreaterThan(1);
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[0], ids[8]]) });
    await act(async () => {
      await sync.trigger();
    });
    expect(useSyncMeta.getState().pausedReason).toBeNull();
    expect(answered().sort()).toEqual([ids[0], ids[8]].sort());
    stop();
  });

  it('CR N1: when the learner’s latest change can’t be merged in, nothing is recorded as pulled and nothing is lost', async () => {
    const { writeSynced } = require('../lib/backup') as typeof import('../lib/backup');
    answer(ids[0]);
    const ms = AS.multiSet as jest.Mock;
    const orig = ms.getMockImplementation()!;
    let calls = 0;
    ms.mockImplementation(async (rows: [string, string][], cb?: unknown) => {
      calls++;
      // The learner answers while the sync's write is in flight.
      if (calls === 1) answer(ids[1]);
      return orig(rows, cb);
    });
    let rebases = 0;
    const next = { settings: { ...useSettings.getState() }, progress: { byCert: {}, streak: { current: 0, best: 0, lastDay: null } } } as never;
    let threw = false;
    try {
      await writeSynced(next, {
        rebase: (live) => {
          rebases++;
          if (rebases === 2) throw new Error('can’t merge');
          return live as never;
        },
      });
    } catch {
      threw = true;
    } finally {
      ms.mockImplementation(orig);
    }
    expect(threw).toBe(true);
    // Memory still has both answers, and storage was put back to match it.
    expect(answered().sort()).toEqual([ids[0], ids[1]].sort());
    const saved = JSON.parse((await AS.getItem('aurivan.progress.v1'))!).state.byCert.cisa.answers;
    expect(Object.keys(saved).sort()).toEqual([ids[0], ids[1]].sort());
  });

  it('CR N4: a setting changed while the sync’s write is in flight keeps its value AND its stamp', async () => {
    await setUp();
    const stop = await sync.initSync();
    await flush();
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[0], ids[9]]) });
    const ms = AS.multiSet as jest.Mock;
    const orig = ms.getMockImplementation()!;
    let armed = true;
    ms.mockImplementation(async (rows: [string, string][], cb?: unknown) => {
      if (armed && rows.some(([k]) => k === 'aurivan.progress.v1')) {
        armed = false;
        jest.setSystemTime(Date.now() + 1000);
        useSettings.getState().setExamDate('cisa', '2027-02-02');
      }
      return orig(rows, cb);
    });
    try {
      await act(async () => {
        await sync.syncNow();
      });
    } finally {
      ms.mockImplementation(orig);
    }
    await flush(40);
    expect(useSettings.getState().examDates.cisa).toBe('2027-02-02');
    expect(useSyncMeta.getState().stamps.settings['examDates.cisa']).toBeGreaterThan(0);
    expect(answered().sort()).toEqual([ids[0], ids[9]].sort());
    stop();
  });

  it('lead decision on CR B2: "Not now" on the switch sheet turns sync off here; nothing reaches either account', async () => {
    await setUp();
    await account.signOut('local');
    const stop = await sync.initSync();
    memory.control.writeSnapshot(RAJ.userId, 'progress', { state: remoteProgress([ids[7]]) });
    await account.sendCode('raj@example.com');
    await account.verifyCode('raj@example.com', memory.control.lastCode('raj@example.com')!, true);
    await flush();
    expect(sync.switchOffered()).toBe(true);
    mount(<>{(() => { const F = screen('switch'); return <F />; })()}</>);
    await press('Not now');
    expect(useSyncMeta.getState().enabled).toBe(false);
    expect(sync.switchOffered()).toBe(false);
    answer(ids[3]);
    await act(async () => {
      await sync.syncNow();
    });
    expect(progressAnswers(RAJ.userId)).toEqual([ids[7]]);
    expect(progressAnswers(MAYA.userId)).toEqual([ids[0]]);
    stop();
  });

  it('CR B3: Delete synced progress, sync off and account deletion during a pull: nothing is written or pushed after them', async () => {
    // Delete synced progress.
    await setUp();
    let stop = await sync.initSync();
    await flush();
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[0], ids[9]]) });
    let h = holdNextPull();
    let p = sync.syncNow();
    await flush();
    let out!: Promise<unknown>;
    await act(async () => {
      out = sync.deleteSyncedProgress();
      for (let i = 0; i < 20; i++) await Promise.resolve();
    });
    h.release();
    await act(async () => {
      await p;
      await out;
    });
    await flush(40);
    expect(memory.control.snapshots(MAYA.userId)).toEqual({});
    expect(useSyncMeta.getState().enabled).toBe(false);
    stop();
    sync.resetSyncForTests();

    // Sync off: the pull is never applied, nothing is pushed.
    useSyncMeta.setState({ ...SYNC_OFF, stamps: { settings: {}, progress: {} } });
    useAccount.getState().setFacts({ syncedAccountHash: null });
    useProgress.getState().resetCert('cisa');
    await setUp();
    stop = await sync.initSync();
    await flush();
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[0], ids[9]]) });
    const revBefore = memory.control.snapshots(MAYA.userId).progress!.rev;
    h = holdNextPull();
    p = sync.syncNow();
    await flush();
    act(() => {
      sync.turnSyncOff();
    });
    h.release();
    await act(async () => {
      await p;
    });
    await flush(40);
    expect(answered()).toEqual([ids[0]]);
    expect(memory.control.snapshots(MAYA.userId).progress!.rev).toBe(revBefore);
    stop();
  });

  it('CR B5 / SEC S3–S4: remove from this phone is a fresh install’s study state (theme kept), with a new install id', async () => {
    await setUp();
    act(() => {
      useSettings.setState({ theme: 'dark', dailyGoal: 40 });
      useProgress.getState().logReport({ ref: 'R-AAAA', item: `q:${ids[0]}`, reason: 'key', cert: 'cisa' } as never);
    });
    expect(useProgress.getState().reports?.length).toBe(1);
    const idBefore = await memory.device.id();
    const stop = await sync.initSync();
    await act(async () => {
      await sync.signOutHere({ removeLocal: true });
    });
    const p = useProgress.getState();
    expect({ byCert: p.byCert, streak: p.streak, reports: p.reports ?? [] }).toEqual({ byCert: {}, streak: { current: 0, best: 0, lastDay: null }, reports: [] });
    expect(useSettings.getState().dailyGoal).toBe(useSettings.getInitialState().dailyGoal);
    expect(useSettings.getState().theme).toBe('dark');
    expect(useBackup.getState().undo).toBeNull();
    expect(useSyncMeta.getState()).toMatchObject({ enabled: false, accountHash: null, stamps: { settings: {}, progress: {} } });
    expect(useAccount.getState().syncedAccountHash).toBeNull();
    expect(await memory.device.id()).not.toBe(idBefore);
    // Saved that way too (one storage write), not only in memory.
    const saved = JSON.parse((await AS.getItem('aurivan.progress.v1'))!).state;
    expect(saved.byCert).toEqual({});
    stop();
  });

  it('account deletion with "also remove from this phone" during a pull leaves the phone empty', async () => {
    await setUp();
    const stop = await sync.initSync();
    await flush();
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[0], ids[9]]) });
    const h = holdNextPull();
    const p = sync.syncNow();
    await flush();
    let out!: Promise<unknown>;
    await act(async () => {
      out = sync.deleteAccountHere({ alsoLocal: true });
      for (let i = 0; i < 20; i++) await Promise.resolve();
    });
    h.release();
    await act(async () => {
      await p;
      await out;
    });
    await flush(40);
    expect(await out).toMatchObject({ ok: true });
    expect(answered()).toEqual([]);
    stop();
  });

  it('UX H1: ticked, the sign-out button is red; it syncs first, then warns when something isn’t in the account', async () => {
    await setUp();
    const stop = await sync.initSync();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    try {
      mount(<>{(() => { const F = screen('sign-out'); return <F />; })()}</>);
      const btn = () => r!.root.findAll((n) => n.props.label === 'Remove and sign out' && n.props.kind !== undefined)[0];
      act(() => {
        r!.root.findAll((n) => typeof n.props.onPress === 'function' && n.props.label === 'Remove my progress from this phone (for shared devices)')[0].props.onPress();
      });
      await flush();
      expect(btn().props.kind).toBe('danger');
      // Syncing and everything sent: the plain confirmation.
      answer(ids[4]); // not synced yet: the button sends it first
      await press('Remove and sign out');
      await flush(60);
      expect(progressAnswers(MAYA.userId).sort()).toEqual([ids[0], ids[4]].sort());
      expect(alert.mock.calls[0][1]).toBe('This removes all your study progress, your plant and your study settings from this phone. Your account’s copy isn’t affected.');
      // Offline: the latest answer can't reach the account, so it warns.
      answer(ids[5]);
      memory.control.setOffline(true);
      await press('Remove and sign out');
      await flush(60);
      expect(alert.mock.calls[1][1]).toBe('Some of this phone’s progress isn’t in your account yet. Removing it deletes it for good. Save a backup first if you might want it.');
      // Sync off: it warns too.
      memory.control.setOffline(false);
      act(() => {
        sync.turnSyncOff();
      });
      await press('Remove and sign out');
      await flush(20);
      expect(alert.mock.calls[2][1]).toMatch(/^Some of this phone’s progress isn’t in your account yet\./);
    } finally {
      alert.mockRestore();
    }
    stop();
  });

  it('UX H2 / O2: the Reset alert says what syncing means, and that the Undo sync copy goes', async () => {
    backendWith(MAYA);
    answer(ids[0]);
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[2]]) });
    await sync.startFirstSync();
    await sync.confirmPreview();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    try {
      const Settings = require('../app/settings').default as ComponentType;
      mount(<Settings />);
      await press('Reset CISA progress');
      const body = alert.mock.calls[0][1] as string;
      expect(body).toContain('Sync is on: progress removed here can come back from another device that syncs with your account. To start fresh everywhere, first use Delete synced progress in Account.');
      expect(body).toContain('This also removes the Undo sync copy kept on this phone.');
    } finally {
      alert.mockRestore();
    }
  });

  it('UX H3 / O4: after a tap, a screen reader hears the status line when it changes ("Synced just now", "Sync is off")', async () => {
    await setUp();
    const stop = await sync.initSync();
    await flush();
    const said: string[] = [];
    const a = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation((t: string) => void said.push(t));
    const b = jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions').mockImplementation((t: string) => void said.push(t));
    try {
      const { SyncSection } = require('../components/sync') as typeof import('../components/sync');
      act(() => {
        useSyncMeta.setState({ lastSyncAt: Date.now() - 5 * 60_000 });
      });
      mount(<SyncSection />);
      // The quiet "n min ago" refresh is never announced.
      act(() => {
        jest.advanceTimersByTime(60_000);
      });
      flushSayLaterForTest();
      expect(said).toEqual([]);
      answer(ids[6]);
      await press('Sync now');
      await flush(40);
      flushSayLaterForTest();
      expect(said[said.length - 1]).toBe('Synced just now');
      await toggle('Sync this phone', false);
      flushSayLaterForTest();
      expect(said[said.length - 1]).toBe('Sync is off');
    } finally {
      a.mockRestore();
      b.mockRestore();
    }
    stop();
  });
});

describe('SEC S4: two learners on one phone never share an install id', () => {
  it('after "Remove my progress", and even if the app died before the new id was saved', async () => {
    await setUp();
    const mayaDevice = memory.control.snapshots(MAYA.userId).progress!.deviceId;
    await sync.signOutHere({ removeLocal: true });
    // Model a kill between the wipe and the renewal: put the old id back.
    await memory.control.kv.setItem('aurivan.device', mayaDevice, { thisDeviceOnly: true });
    act(() => {
      useAccount.getState().setFacts({ signedIn: true, emailMasked: 'r•••@example.com', providers: ['email'] });
    });
    const swap = createMemoryBackend({ users: [MAYA, RAJ], signedIn: { userId: RAJ.userId, authAt: Date.now() - 60_000 }, appVersion: '1.18.0', kv: memory.control.kv });
    memory = swap;
    setBackendForTests(swap);
    answer(ids[3]);
    const start = await sync.startFirstSync();
    if (start.ok && start.next === 'preview') await sync.confirmPreview();
    const rajDevice = memory.control.snapshots(RAJ.userId).progress!.deviceId;
    expect(rajDevice).not.toBe(mayaDevice);
  });
});
