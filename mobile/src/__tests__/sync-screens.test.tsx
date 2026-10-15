/**
 * Uplift Phase 7 (sync, built OFF): the sync screens and the scheduler with
 * the flag forced ON, the in-memory backend, and the real stores. Spec
 * §3.1 S2–S6, §3.2, §3.3, §3.5 and §3.8 Jest #5, #6:
 * - the Account → Sync section, its status line and its actions;
 * - the first-sync preview (phone only, account only, both), its three
 *   columns from the real merge, Combine, and the 7-day "Undo sync" written
 *   in the SAME storage write as the merged stores (a failed write puts the
 *   old rows back);
 * - a different account on a shared phone: Start fresh (the default) keeps
 *   the other learner's progress in Undo sync, never in this account;
 * - Settings → Your data (UX O2: no "kept only on this phone" with the
 *   cloud on; Undo sync), Settings → About, You's own Account section (O3);
 * - the sign-out sheet ("remove my progress", unticked), Delete synced
 *   progress, What syncs;
 * - deep links to the new routes start nothing;
 * - the scheduler: launch, leaving a session applies a waiting pull, a
 *   failure backs off quietly, a change is stamped (last-writer-wins).
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import type { ComponentType, ReactElement } from 'react';
import { Alert } from 'react-native';
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
import { SYNC_OFF, useSyncMeta, useSyncStatus } from '../store/sync';

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

// ── Account → Sync ──────────────────────────────────────────────────────
describe('Account → Sync (§3.2)', () => {
  it('signed in, never synced: "Sync this phone" off, "Sync is off", What syncs and Delete synced progress', () => {
    backendWith(MAYA);
    mount(<>{(() => { const A = screen('index'); return <A />; })()}</>);
    expect(allText()).toContain('Sync this phone');
    expect(allText()).toContain('Your progress and study settings, on every device you sign in on.');
    expect(allText()).toContain('Sync is off');
    expect(allText()).toContain('What syncs');
    expect(allText()).toContain('Delete synced progress');
    expect(pressables('Sync now')).toHaveLength(0);
    // Opening the screen asked the server nothing.
    expect(memory.control.calls).toEqual([]);
  });

  it('switching it on reads the account and opens the preview ("both"): three columns from the real merge', async () => {
    backendWith(MAYA);
    answer(ids[0]);
    answer(ids[1]);
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[1], ids[2], ids[3]]) });
    mount(<>{(() => { const A = screen('index'); return <A />; })()}</>);
    await toggle('Sync this phone', true);
    expect(mockNav.push).toHaveBeenCalledWith('/account/first-sync');
    unmount();
    mount(<>{(() => { const F = screen('first-sync'); return <F />; })()}</>);
    expect(allText()).toContain('Bring your progress together?');
    expect(allText()).toContain('You’re signed in as m•••@example.com.');
    // This phone 2, the account 3, after 4 (one overlaps): never the bank size.
    const row = r!.root.findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Answered:'))[0];
    expect(row.props.accessibilityLabel).toBe('Answered: this phone 2 questions, account 3 questions, after 4 questions');
    expect(allText()).toContain('You can undo this for 7 days in Settings → Your data.');
    expect(useSyncMeta.getState().enabled).toBe(false);
    expect(answered()).toHaveLength(2);
  });

  it('Combine: merged stores and the 7-day undo copy in ONE storage write (#5); then on, linked, pushed', async () => {
    backendWith(MAYA);
    answer(ids[0]);
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[2]]) });
    expect((await sync.startFirstSync())).toEqual({ ok: true, next: 'preview' });
    // The storage mock's multiSet is already a jest.fn: read its calls from here on (never restore it).
    const from = (AS.multiSet as jest.Mock).mock.calls.length;
    mount(<>{(() => { const F = screen('first-sync'); return <F />; })()}</>);
    await press('Combine');
    // (The mock's setItem goes through multiSet too: look for the one write that holds all three.)
    const writes = (AS.multiSet as jest.Mock).mock.calls.slice(from).map((c) => (c[0] as [string, string][]).map(([k]) => k).sort());
    expect(writes).toContainEqual(['aurivan.backup.v1', 'aurivan.progress.v1', 'aurivan.settings.v1']);
    expect(answered().sort()).toEqual([ids[0], ids[2]].sort());
    expect(useBackup.getState().undo?.kind).toBe('sync');
    expect(Object.keys(useBackup.getState().undo!.file.stores.progress.state.byCert.cisa.answers!)).toEqual([ids[0]]);
    expect(useSyncMeta.getState().enabled).toBe(true);
    expect(useAccount.getState().syncedAccountHash).toBe(sha256Hex(MAYA.userId));
    const pushed = memory.control.snapshots(MAYA.userId).progress!.state as { byCert: { cisa: { answers: object } } };
    expect(Object.keys(pushed.byCert.cisa.answers).sort()).toEqual([ids[0], ids[2]].sort());
    expect(mockNav.back).toHaveBeenCalled();
  });

  it('#5: a failed write puts the old rows back and changes nothing (sync stays off)', async () => {
    backendWith(MAYA);
    answer(ids[0]);
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[2]]) });
    await sync.startFirstSync();
    const before = await AS.multiGet(['aurivan.progress.v1', 'aurivan.settings.v1', 'aurivan.backup.v1']);
    (AS.multiSet as jest.Mock).mockImplementationOnce(async () => {
      throw new Error('disk full');
    });
    mount(<>{(() => { const F = screen('first-sync'); return <F />; })()}</>);
    await press('Combine');
    expect(await AS.multiGet(['aurivan.progress.v1', 'aurivan.settings.v1', 'aurivan.backup.v1'])).toEqual(before);
    expect(answered()).toEqual([ids[0]]);
    expect(useBackup.getState().undo).toBeNull();
    expect(useSyncMeta.getState().enabled).toBe(false);
    expect(allText()).toContain('We couldn’t sync just now. Nothing was changed.');
  });

  it('only the phone has progress / only the account has progress: the other two previews', async () => {
    backendWith(MAYA);
    answer(ids[0]);
    await sync.startFirstSync();
    mount(<>{(() => { const F = screen('first-sync'); return <F />; })()}</>);
    expect(allText()).toContain('Add this phone’s progress to your account?');
    expect(allText()).toContain('Your account has no progress yet.');
    unmount();
    useProgress.getState().resetCert('cisa');
    act(() => {
      useProgress.setState({ streak: { current: 0, best: 0, lastDay: null } });
    });
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[4]]) });
    // Review CR N8: an exam date alone is something to keep, so the undo line shows…
    await sync.startFirstSync();
    mount(<>{(() => { const F = screen('first-sync'); return <F />; })()}</>);
    expect(allText()).toContain('You can undo this');
    unmount();
    // …and with truly nothing on the phone there is nothing to undo: no undo line.
    act(() => {
      useSettings.setState({ examDates: {} });
    });
    await sync.startFirstSync();
    mount(<>{(() => { const F = screen('first-sync'); return <F />; })()}</>);
    expect(allText()).toContain('Bring your progress to this phone?');
    expect(allText()).not.toContain('You can undo this');
    await press('Bring it here');
    expect(answered()).toEqual([ids[4]]);
  });

  it('nothing on either side: sync simply turns on (no preview)', async () => {
    backendWith(MAYA);
    act(() => {
      useProgress.setState({ streak: { current: 0, best: 0, lastDay: null } });
    });
    expect(await sync.startFirstSync()).toEqual({ ok: true, next: 'done' });
    expect(useSyncMeta.getState().enabled).toBe(true);
  });

  it('"Not now" changes nothing; a stale or deep-linked preview goes back to Account', async () => {
    backendWith(MAYA);
    answer(ids[0]);
    await sync.startFirstSync();
    mount(<>{(() => { const F = screen('first-sync'); return <F />; })()}</>);
    await press('Not now');
    expect(useSyncMeta.getState().enabled).toBe(false);
    unmount();
    mount(<>{(() => { const F = screen('first-sync'); return <F />; })()}</>);
    expect(mockRedirects).toEqual(['/account']);
  });

  it('the status line: just now, minutes, paused (newer, unreadable, too big), offline, sign in again', () => {
    const base = { enabled: true, signedIn: true, expired: false, busy: false, offline: false, pausedReason: null, lastSyncAt: Date.now() - 20_000, now: Date.now() };
    expect(sync.statusLine(base)).toBe('Synced just now');
    expect(sync.statusLine({ ...base, lastSyncAt: Date.now() - 2 * 60_000 })).toBe('Synced 2 min ago');
    expect(sync.statusLine({ ...base, lastSyncAt: new Date(2026, 9, 12, 7, 5).getTime() })).toBe('Synced today at 7:05');
    expect(sync.statusLine({ ...base, lastSyncAt: new Date(2026, 9, 9, 7, 5).getTime() })).toBe('Synced 9 Oct');
    expect(sync.statusLine({ ...base, busy: true })).toBe('Syncing…');
    expect(sync.statusLine({ ...base, offline: true })).toBe('Will sync when you’re online');
    expect(sync.statusLine({ ...base, pausedReason: 'newer' })).toMatch(/^Sync is paused\. This account has progress from a newer version/);
    expect(sync.statusLine({ ...base, pausedReason: 'unreadable' })).toBe('Sync is paused. We couldn’t read the synced copy, so your phone’s progress is unchanged. If this keeps happening, contact us from Help.');
    // UX P1: only a lost connection is "offline"; anything else says it will try again.
    expect(sync.statusLine({ ...base, retrying: true })).toBe('Couldn’t sync just now. We’ll try again soon.');
    expect(sync.statusLine({ ...base, pausedReason: 'toobig' })).toMatch(/^Your progress is too large to sync/);
    expect(sync.statusLine({ ...base, enabled: false })).toBe('Sync is off');
    expect(sync.statusLine({ ...base, signedIn: false, expired: true })).toBe('Sign in again to keep syncing');
  });

  it('Delete synced progress asks first (its own sheet); then the account copy goes, this phone keeps its progress, sync turns off', async () => {
    backendWith(MAYA);
    answer(ids[0]);
    await sync.startFirstSync();
    await sync.confirmPreview();
    expect(memory.control.snapshots(MAYA.userId).progress).toBeDefined();
    mount(<>{(() => { const A = screen('index'); return <A />; })()}</>);
    await press('Delete synced progress');
    expect(mockNav.push).toHaveBeenCalledWith('/account/delete-synced');
    expect(memory.control.calls).not.toContain('sync.deleteAll');
    unmount();
    mount(<>{(() => { const D = screen('delete-synced'); return <D />; })()}</>);
    expect(allText()).toContain('This deletes the copy of your progress stored in your account. Your account and this phone’s progress stay. Sync turns off.');
    // Offline: nothing deleted.
    memory.control.setOffline(true);
    await press('Delete synced progress');
    expect(allText()).toContain('You’re offline. Connect to the internet to delete your synced progress. Nothing was deleted.');
    expect(useSyncMeta.getState().enabled).toBe(true);
    memory.control.setOffline(false);
    await press('Delete synced progress');
    expect(memory.control.snapshots(MAYA.userId)).toEqual({});
    expect(useSyncMeta.getState().enabled).toBe(false);
    expect(answered()).toEqual([ids[0]]);
    expect(allText()).toContain('Synced progress deleted.');
  });
});

// ── A different account on a shared phone (§3.8 #6) ────────────────────
describe('account switch', () => {
  it('Raj signs in where Maya synced: the sheet; "Start fresh" (default) keeps Maya’s progress in Undo sync, never in Raj’s account', async () => {
    backendWith(MAYA);
    answer(ids[0]);
    answer(ids[1]);
    await sync.startFirstSync();
    await sync.confirmPreview();
    const mayaDevice = await memory.device.id();
    // Maya signs out (progress kept); Raj signs in on the same phone.
    await account.signOut('local');
    const stop = await sync.initSync();
    memory.control.writeSnapshot(RAJ.userId, 'progress', { state: remoteProgress([ids[7]]) });
    await account.sendCode('raj@example.com');
    await account.verifyCode('raj@example.com', memory.control.lastCode('raj@example.com')!, true);
    await flush();
    expect(useSyncStatus.getState().offer).toBe('switch');
    mount(<>{(() => { const A = screen('index'); return <A />; })()}</>);
    await flush();
    expect(mockNav.push).toHaveBeenCalledWith('/account/switch');
    unmount();
    mount(<>{(() => { const S = screen('switch'); return <S />; })()}</>);
    expect(allText()).toContain('This phone has progress from another account');
    expect(allText()).toContain('You’re now signed in as r•••@example.com.');
    const fresh = r!.root.findAll((n) => n.props.accessibilityRole === 'radio')[0];
    expect(fresh.props.accessibilityState.checked).toBe(true);
    await press('Continue');
    // The phone took Raj's progress; Maya's is in the undo slot, not in Raj's account.
    expect(answered()).toEqual([ids[7]]);
    expect(useBackup.getState().undo?.kind).toBe('sync');
    expect(Object.keys(useBackup.getState().undo!.file.stores.progress.state.byCert.cisa.answers!).sort()).toEqual([ids[0], ids[1]].sort());
    const rajCopy = memory.control.snapshots(RAJ.userId).progress!.state as { byCert: { cisa: { answers: object } } };
    expect(Object.keys(rajCopy.byCert.cisa.answers)).toEqual([ids[7]]);
    expect(useAccount.getState().syncedAccountHash).toBe(sha256Hex(RAJ.userId));
    // A new install id for a different learner (Phase 6 review N6).
    expect(await memory.device.id()).not.toBe(mayaDevice);
    stop();
  });

  it('"Keep this phone’s progress" adds it to the new account', async () => {
    backendWith(MAYA);
    answer(ids[0]);
    await sync.startFirstSync();
    await sync.confirmPreview();
    await account.signOut('local');
    const stop = await sync.initSync();
    await account.sendCode('raj@example.com');
    await account.verifyCode('raj@example.com', memory.control.lastCode('raj@example.com')!, true);
    await flush();
    mount(<>{(() => { const S = screen('switch'); return <S />; })()}</>);
    await press('Keep this phone’s progress. It will be added to this account, even if it’s someone else’s.');
    await press('Continue');
    const rajCopy = memory.control.snapshots(RAJ.userId).progress!.state as { byCert: { cisa: { answers: object } } };
    expect(Object.keys(rajCopy.byCert.cisa.answers)).toEqual([ids[0]]);
    stop();
  });
});

// ── Your data, About, You (UX O2, O3) ───────────────────────────────────
describe('Settings → Your data, About; You → Account', () => {
  it('O2: the intro never says "kept only on this phone" with the cloud on; it says it syncs while it does', async () => {
    const Settings = require('../app/settings').default as ComponentType;
    mount(<Settings />);
    expect(allText()).not.toContain('Your progress is kept only on this phone.');
    expect(allText()).toContain('Your progress is kept on this phone. A backup file keeps it safe');
    expect(allText()).toContain('Progress is stored on this device.');
    unmount();
    backendWith(MAYA);
    act(() => {
      useSyncMeta.setState({ enabled: true });
    });
    mount(<Settings />);
    expect(allText()).toContain('Your progress is kept on this phone and syncs to your KaiSip account.');
    expect(allText()).toContain('Progress is stored on this device and syncs to your KaiSip account.');
  });

  it('Undo sync: offered for 7 days; it puts this phone back and turns sync off; the account copy stays', async () => {
    backendWith(MAYA);
    answer(ids[0]);
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[2]]) });
    await sync.startFirstSync();
    await sync.confirmPreview();
    expect(answered().sort()).toEqual([ids[0], ids[2]].sort());
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, b) => {
      void b?.[1]?.onPress?.();
    });
    try {
      const Settings = require('../app/settings').default as ComponentType;
      mount(<Settings />);
      expect(allText()).toContain('Undo sync');
      expect(allText()).toContain('Put back this phone’s progress from before it first synced (until 19 Oct).');
      expect(allText()).not.toContain('Undo restore');
      await press('Undo sync');
      await flush();
      expect(alert.mock.calls[0][0]).toBe('Undo sync?');
      expect(answered()).toEqual([ids[0]]);
      expect(useSyncMeta.getState().enabled).toBe(false);
      expect(Object.keys((memory.control.snapshots(MAYA.userId).progress!.state as { byCert: { cisa: { answers: object } } }).byCert.cisa.answers).sort()).toEqual([ids[0], ids[2]].sort());
      flushSayLaterForTest();
      expect(allText()).toContain('Sync undone');
    } finally {
      alert.mockRestore();
    }
  });

  it('a first sync replaces an earlier "Undo restore", and the preview says so', async () => {
    backendWith(MAYA);
    answer(ids[0]);
    const { currentBackup } = require('../lib/backup');
    act(() => {
      useBackup.setState({ undo: { takenAt: Date.now(), file: currentBackup() } });
    });
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[2]]) });
    await sync.startFirstSync();
    mount(<>{(() => { const F = screen('first-sync'); return <F />; })()}</>);
    expect(allText()).toContain('This replaces the earlier “Undo restore”.');
  });

  it('O3: You has its own Account section, before Help and feedback', () => {
    const You = require('../app/(tabs)/you').default as ComponentType;
    mount(<You />);
    const text = allText();
    expect(text.indexOf('Sync across devices')).toBeGreaterThan(-1);
    expect(text.indexOf('Sync across devices')).toBeLessThan(text.indexOf('Help and feedback'));
    expect(text.lastIndexOf('Account', text.indexOf('Sync across devices'))).toBeGreaterThan(-1);
  });
});

// ── Sign out, What syncs ────────────────────────────────────────────────
describe('the sign-out sheet and What syncs', () => {
  it('"Remove my progress from this phone" is unticked; ticked, it asks, then clears the phone and its link', async () => {
    backendWith(MAYA);
    answer(ids[0]);
    await sync.startFirstSync();
    await sync.confirmPreview();
    mount(<>{(() => { const S = screen('sign-out'); return <S />; })()}</>);
    expect(allText()).toContain('Sync stops until you sign in again.');
    const box = r!.root.findAll((n) => n.props.accessibilityRole === 'checkbox')[0];
    expect(box.props.accessibilityState.checked).toBe(false);
    await act(async () => box.props.onPress());
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, b) => {
      void b?.[1]?.onPress?.();
    });
    try {
      await press('Remove and sign out');
      expect(alert.mock.calls[0][1]).toBe('This removes all your study progress, your plant and your study settings from this phone. Your account’s copy isn’t affected.');
    } finally {
      alert.mockRestore();
    }
    expect(useAccount.getState().signedIn).toBe(false);
    expect(answered()).toEqual([]);
    expect(useAccount.getState().syncedAccountHash).toBeNull();
    expect(useSyncMeta.getState().enabled).toBe(false);
    // The account's copy is untouched.
    expect(Object.keys((memory.control.snapshots(MAYA.userId).progress!.state as { byCert: { cisa: { answers: object } } }).byCert.cisa.answers)).toEqual([ids[0]]);
  });

  it('What syncs lists what travels and what stays, and the one limit', () => {
    mount(<>{(() => { const W = screen('what-syncs'); return <W />; })()}</>);
    expect(allText()).toContain('These stay on this phone: reminders, theme, motion, haptics, plant display choices and a quiz in progress.');
    expect(allText()).toContain('Removals don’t sync yet');
  });
});

// ── Deep links start nothing ────────────────────────────────────────────
describe('deep links to the sync routes', () => {
  it.each(['first-sync', 'switch', 'what-syncs', 'sign-out', 'delete-synced'])('/account/%s?confirm=1 calls no backend method', (path) => {
    backendWith(MAYA);
    const routeParams = require('../../jest/perf/focusRouter').routeParams as Record<string, string | undefined>;
    Object.assign(routeParams, { confirm: '1', choice: 'fresh', remove: '1' });
    const S = screen(path);
    mount(<S />);
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(memory.control.calls).toEqual([]);
    if (path === 'first-sync' || path === 'switch') expect(mockRedirects).toEqual(['/account']);
    for (const k of ['confirm', 'choice', 'remove']) delete routeParams[k];
  });
});

// ── The scheduler (§3.5) ────────────────────────────────────────────────
describe('the scheduler', () => {
  const setUp = async () => {
    backendWith(MAYA);
    answer(ids[0]);
    await sync.startFirstSync();
    await sync.confirmPreview();
  };

  it('at launch it syncs; another phone’s change waits while a quiz is open and lands when it ends', async () => {
    await setUp();
    const stop = await sync.initSync();
    await flush();
    const rev = memory.control.snapshots(MAYA.userId).progress!.rev;
    memory.control.writeSnapshot(MAYA.userId, 'progress', { state: remoteProgress([ids[0], ids[9]]) });
    sync.setRoute('/session');
    await sync.syncNow();
    await flush();
    expect(answered()).toEqual([ids[0]]);
    expect(useSyncMeta.getState().deferredPull).toBe(true);
    sync.setRoute('/results');
    await flush(60);
    expect(answered().sort()).toEqual([ids[0], ids[9]].sort());
    expect(useSyncMeta.getState().deferredPull).toBe(false);
    expect(memory.control.snapshots(MAYA.userId).progress!.rev).toBeGreaterThan(rev);
    stop();
  });

  it('offline: no pop-up, the status line says so, and it tries again after 30 s', async () => {
    await setUp();
    const stop = await sync.initSync();
    await flush();
    memory.control.setOffline(true);
    answer(ids[3]);
    await sync.syncNow();
    await flush();
    expect(useSyncStatus.getState().offline).toBe(true);
    memory.control.setOffline(false);
    memory.control.calls.length = 0;
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    await flush(60);
    expect(memory.control.calls).toContain('sync.push');
    expect(useSyncStatus.getState().offline).toBe(false);
    stop();
  });

  it('a changed choice is stamped (last-writer-wins); sync’s own writes are not', async () => {
    await setUp();
    const stop = await sync.initSync();
    await flush();
    act(() => {
      useSettings.getState().setExamDate('cisa', '2027-02-01');
    });
    expect(useSyncMeta.getState().stamps.settings['examDates.cisa']).toBe(Date.now());
    act(() => {
      useSettings.getState().setTheme('dark');
    });
    expect(useSyncMeta.getState().stamps.settings.theme).toBeUndefined();
    stop();
  });

  it('a session that ended on the server says "Sign in again to keep syncing"', async () => {
    await setUp();
    const stop = await sync.initSync();
    await flush();
    memory.control.failNext('sync.head', 'unauthorized');
    await sync.syncNow();
    await flush();
    expect(useAccount.getState().signedIn).toBe(false);
    expect(useAccount.getState().expired).toBe(true);
    stop();
  });
});
