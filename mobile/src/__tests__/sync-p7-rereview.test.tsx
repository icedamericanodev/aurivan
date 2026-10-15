/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase 7 re-review repros (RR1-RR4): a preview read for one account is never
 * confirmed into another; a hung request can't block sign-out, removal, Undo or
 * account deletion for ever; a cycle stopped mid-push records nothing.
 */
import { act, type ReactTestRenderer } from 'react-test-renderer';
import { setBackendForTests } from '../cloud/backend';
import { createMemoryBackend, type MemoryBackend, type MemoryUser } from '../cloud/memory/backend';
import { getAllQuestions } from '../content/loader';
import { TERMS_VERSION } from '../engine/account';
import { dayKey } from '../engine/streak';
import * as account from '../lib/account';
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
  const base = require('../jest/perf/focusRouter').routerMock();
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


/** Holds the server's reply to the next pull until release() (the request reached the server as whoever was signed in then). */
function holdNextPull() {
  let release!: () => void;
  const gate = new Promise<void>((res) => (release = res));
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
const progressAnswers = (userId: string) =>
  Object.keys(((memory.control.snapshots(userId).progress?.state ?? { byCert: {} }) as { byCert: { cisa?: { answers?: object } } }).byCert.cisa?.answers ?? {});

describe('RR7 adversarial', () => {
  it('RR1: a first-sync preview read for Maya is never confirmed into Raj’s account after a sign-out + sign-in', async () => {
    backendWith(MAYA);
    // Maya's account holds her progress (from her other phone); this phone has a little of Raj's own later.
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[1], ids[2]]) });
    // Raj already syncs from his own phone.
    memory.control.writeSnapshot(RAJ.userId, 'progress', { state: remoteProgress([ids[7]]) });
    memory.control.writeSnapshot(RAJ.userId, 'settings', { state: { activeCertId: 'cisa', examDates: { cisa: '2027-05-05' } } });
    answer(ids[0]);
    // Maya turns "Sync this phone" on: the preview reads her account, and the reply is slow.
    const h = holdNextPull();
    let first!: Promise<Awaited<ReturnType<typeof sync.startFirstSync>>>;
    await act(async () => {
      first = sync.startFirstSync();
      for (let i = 0; i < 20; i++) await Promise.resolve();
    });
    expect(h.entered()).toBe(true);
    // Meanwhile Maya signs out (keeping this phone's progress) and Raj signs in.
    await act(async () => {
      await sync.signOutHere({ removeLocal: false });
    });
    await account.sendCode('raj@example.com');
    await account.verifyCode('raj@example.com', memory.control.lastCode('raj@example.com')!, true);
    await flush();
    // Maya's slow reply lands; the Account screen opens the preview it says is ready.
    h.release();
    let r!: Awaited<ReturnType<typeof sync.startFirstSync>>;
    await act(async () => {
      r = await first;
    });
    const preview = sync.pendingPreview();
    // Raj taps the main button.
    if (r.ok && r.next === 'preview' && preview) {
      await act(async () => {
        await sync.confirmPreview();
      });
      await flush(60);
    }
    // Maya's account answers must never reach Raj's account (nor this phone under Raj).
    expect(progressAnswers(RAJ.userId)).not.toContain(ids[1]);
    expect(answered()).not.toContain(ids[1]);
  });

  it('RR2: Sign out (and Remove my progress) finishes even when a sync request never answers', async () => {
    await setUp();
    const stop = await sync.initSync();
    await flush();
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[0], ids[9]]) });
    // A request that never comes back (a stalled connection: no timeout anywhere on the way).
    const orig = memory.sync.pull.bind(memory.sync);
    memory.sync.pull = () => new Promise(() => {});
    void sync.syncNow();
    await flush();
    let done = false;
    await act(async () => {
      void sync.signOutHere({ removeLocal: true }).then(() => {
        done = true;
      });
      for (let i = 0; i < 50; i++) await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(5 * 60_000);
      for (let i = 0; i < 50; i++) await Promise.resolve();
    });
    memory.sync.pull = orig;
    expect(done).toBe(true);
    stop();
  });

  it('RR3: account deletion is not blocked by a sync request that never answers', async () => {
    await setUp();
    const stop = await sync.initSync();
    await flush();
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[0], ids[9]]) });
    memory.sync.pull = () => new Promise(() => {});
    void sync.syncNow();
    await flush();
    let settled = false;
    await act(async () => {
      void sync.deleteAccountHere({ alsoLocal: true }).then(() => {
        settled = true;
      });
      for (let i = 0; i < 50; i++) await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(5 * 60_000);
      for (let i = 0; i < 50; i++) await Promise.resolve();
    });
    expect(settled).toBe(true);
    stop();
  });

  it('RR4: turning sync off during an in-flight push leaves no stale record behind it', async () => {
    await setUp();
    const stop = await sync.initSync();
    await flush();
    answer(ids[4]);
    let release!: () => void;
    const gate = new Promise<void>((res) => (release = res));
    const orig = memory.sync.push.bind(memory.sync);
    memory.sync.push = async (a) => {
      const out = await orig(a);
      await gate;
      return out;
    };
    const p = sync.syncNow();
    await flush();
    sync.turnSyncOff();
    release();
    await act(async () => {
      await p;
    });
    memory.sync.push = orig;
    const m = useSyncMeta.getState();
    expect({ enabled: m.enabled, lastRev: m.lastRev, hash: m.lastPushedHash }).toEqual({ enabled: false, lastRev: SYNC_OFF.lastRev, hash: SYNC_OFF.lastPushedHash });
    stop();
  });
});
