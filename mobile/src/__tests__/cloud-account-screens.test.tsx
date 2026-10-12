/**
 * Uplift Phase 6 (accounts, built OFF): the account screens with the flag
 * forced ON and the in-memory backend. Spec PHASE6_8.md §2.1 (A1–A6) and
 * §2.7 "Security tests (PR 6)":
 * - A1: only two ways in (You, Settings); nothing at onboarding or the first session;
 * - A2: the "16 or older" box gates every button; email code rules; Apple on iOS only;
 * - #3: no token, email or account id in AsyncStorage after a sign-in;
 * - #6: an old sign-in asks to confirm it's you before any delete call;
 * - #7: deleting offline deletes nothing and leaves the phone's progress;
 * - #8: no PII in console during sign-in, sign-out and delete;
 * - deep links with hostile params start nothing (§2.6);
 * - A5: "Download my data" saves a file a backup restore would accept.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import type { ComponentType, ReactElement } from 'react';
import { Alert, Platform } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { setBackendForTests } from '../cloud/backend';
import { createMemoryBackend, type MemoryBackend, type MemoryUser } from '../cloud/memory/backend';
import { CERTIFICATIONS } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import { readBackup } from '../engine/backup';
import { TERMS_VERSION } from '../engine/account';
import * as account from '../lib/account';
import { currentBackup } from '../lib/backup';
import { startFromIds } from '../lib/sessions';
import { SIGNED_OUT, useAccount } from '../store/account';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

jest.mock('../cloud/flag', () => ({ CLOUD: true, PROVIDERS: ['email', 'apple', 'google'] }));
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
const mockWritten: string[] = [];
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => true, shareAsync: async () => {} }));
jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    name: string;
    constructor(_dir: unknown, name: string) {
      this.name = name;
      this.uri = `file:///cache/${name}`;
    }
    create() {}
    write(t: string) {
      mockWritten.push(t);
    }
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

// ── Helpers ────────────────────────────────────────────────────────────
const MAYA: MemoryUser = { userId: 'user-7f3a9c', email: 'maya@example.com', providers: ['email', 'google'], termsVersion: TERMS_VERSION, createdAt: Date.UTC(2026, 8, 1) };
let memory: MemoryBackend;
const backendWith = (o: { signedIn?: boolean; authAgoMin?: number; users?: MemoryUser[] } = {}) => {
  memory = createMemoryBackend({
    users: o.users ?? [MAYA],
    signedIn: o.signedIn ? { userId: (o.users ?? [MAYA])[0].userId, authAt: Date.now() - (o.authAgoMin ?? 1) * 60_000 } : null,
    appVersion: '1.17.0',
  });
  setBackendForTests(memory);
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
const flush = async () => {
  await act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
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
const button = (label: string) => {
  const n = pressables(label)[0];
  if (!n) throw new Error(`no button "${label}" in: ${allText()}`);
  return n;
};
const disabled = (label: string) => button(label).props.disabled === true || button(label).props.accessibilityState?.disabled === true;
const press = async (label: string) => {
  await act(async () => {
    button(label).props.onPress();
  });
  await flush();
};
const field = (label: string) => {
  const n = r!.root.findAll((x) => typeof x.props.onChangeText === 'function' && x.props.accessibilityLabel === label)[0];
  if (!n) throw new Error(`no field "${label}"`);
  return n;
};
const type = (label: string, text: string) =>
  act(() => {
    field(label).props.onChangeText(text);
  });
const screen = (path: string) => require(`../app/(cloud)/account/${path}`).default as ComponentType;
const facts = () => useAccount.getState();
const setFacts = (f: Partial<typeof SIGNED_OUT>) =>
  act(() => {
    useAccount.getState().setFacts({ ...SIGNED_OUT, ...f });
  });

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 9, 12, 10, 0) });
  mockNav.push.mockClear();
  mockNav.back.mockClear();
  mockNav.replace.mockClear();
  mockRedirects.length = 0;
  mockWritten.length = 0;
  account.setAgreed(false);
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ activeCertId: 'cisa', onboarded: true, theme: 'light' });
  useAccount.getState().setFacts({ ...SIGNED_OUT });
  backendWith();
});
afterEach(() => {
  unmount();
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
  setBackendForTests(undefined);
});

// ── A1: only two ways in ───────────────────────────────────────────────
describe('A1: optional, never pushy', () => {
  it('You: "Sync across devices" signed out, opening the account screen', async () => {
    const You = require('../app/(tabs)/you').default as ComponentType;
    mount(<You />);
    expect(allText()).toContain('Sync across devices');
    expect(allText()).toContain('Optional. Keep your progress on your other phone or tablet.');
    await press('Sync across devices, Optional. Keep your progress on your other phone or tablet.');
    expect(mockNav.push).toHaveBeenCalledWith('/account');
  });

  it('You: "Account and sync" with the masked email; Apple relay; a restored phone', () => {
    const You = require('../app/(tabs)/you').default as ComponentType;
    setFacts({ signedIn: true, emailMasked: 'm•••@example.com', providers: ['email'] });
    mount(<You />);
    expect(allText()).toContain('Account and sync');
    expect(allText()).toContain('Signed in as m•••@example.com');
    setFacts({ signedIn: true, emailMasked: null, providers: ['apple'] });
    expect(allText()).toContain('Signed in with Apple');
    setFacts({ signedIn: false, expired: true });
    expect(allText()).toContain('Sign in again to keep syncing');
  });

  it('Settings: an Account group, and About says progress is stored on this device', () => {
    const Settings = require('../app/settings').default as ComponentType;
    mount(<Settings />);
    expect(allText()).toContain('Not signed in');
    expect(allText()).toContain('Progress is stored on this device.');
    expect(allText()).not.toContain('Progress is stored only on this device.');
  });

  it('no sign-in UI at onboarding, on Today or in the first session', () => {
    const banned = ['Sync across devices', 'Keep your progress on every device', 'Continue with', 'Sign in'];
    useSettings.setState({ onboarded: false });
    const Onboarding = require('../app/onboarding').default as ComponentType;
    mount(<Onboarding />);
    for (const w of banned) expect(allText()).not.toContain(w);
    unmount();
    useSettings.setState({ onboarded: true });
    const Today = require('../app/(tabs)/home').default as ComponentType;
    mount(<Today />);
    for (const w of banned) expect(allText()).not.toContain(w);
    unmount();
    startFromIds('cisa', getAllQuestions('cisa').slice(0, 3).map((q) => q.id), 'T');
    const Session = require('../app/session').default as ComponentType;
    mount(<Session />);
    for (const w of banned) expect(allText()).not.toContain(w);
    expect(memory.control.calls).toEqual([]);
  });

  it('a cloud build with no backend shows no way in, and its routes redirect', () => {
    setBackendForTests(null);
    const You = require('../app/(tabs)/you').default as ComponentType;
    mount(<You />);
    expect(allText()).not.toContain('Sync across devices');
    unmount();
    const Layout = require('../app/(cloud)/_layout').default as ComponentType;
    mount(<Layout />);
    expect(mockRedirects).toEqual(['/']);
  });
});

// ── Deep links start nothing ───────────────────────────────────────────
describe('deep links with hostile params', () => {
  it.each(['index', 'sign-in', 'email', 'delete'])('/account/%s?confirm=DELETE&scope=global calls no backend method', (path) => {
    backendWith({ signedIn: true });
    setFacts({ signedIn: true, emailMasked: 'm•••@example.com', providers: ['email', 'google'] });
    account.setAgreed(true);
    const routeParams = require('../../jest/perf/focusRouter').routeParams as Record<string, string | undefined>;
    Object.assign(routeParams, { confirm: 'DELETE', scope: 'global', open: 'delete' });
    const Screen = screen(path);
    mount(<Screen />);
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(memory.control.calls).toEqual([]);
    if (path === 'delete') expect(allText()).toContain('Delete your Aurivan account?');
    for (const k of ['confirm', 'scope', 'open']) delete routeParams[k];
  });

  it('the email screen without the "16 or older" box goes back to the sheet', () => {
    mount(<>{(() => { const E = screen('email'); return <E />; })()}</>);
    expect(mockRedirects).toEqual(['/account/sign-in']);
  });
});

// ── A2: the sign-in sheet ──────────────────────────────────────────────
describe('A2: sign in', () => {
  it('every button waits for the "16 or older" box, and the hint says why', () => {
    const Account = screen('index');
    mount(<Account />);
    expect(allText()).toContain('Keep your progress on every device');
    expect(allText()).toContain('Tick the box above to continue.');
    for (const b of ['Continue with Apple', 'Continue with Google', 'Continue with email']) expect(disabled(b)).toBe(true);
    act(() => {
      button('I’m 16 or older and I agree to the Terms of Use.').props.onPress();
    });
    expect(allText()).not.toContain('Tick the box above to continue.');
    for (const b of ['Continue with Apple', 'Continue with Google', 'Continue with email']) expect(disabled(b)).toBe(false);
    expect(memory.control.calls).toEqual([]);
  });

  it('Apple shows on iOS, never on Android', () => {
    const Account = screen('index');
    mount(<Account />);
    expect(pressables('Continue with Apple').length).toBeGreaterThan(0);
    unmount();
    const os = Platform.OS;
    Platform.OS = 'android';
    try {
      mount(<Account />);
      expect(pressables('Continue with Apple')).toHaveLength(0);
      expect(pressables('Continue with Google').length).toBeGreaterThan(0);
    } finally {
      Platform.OS = os;
    }
  });

  it('Google: signed in, Terms recorded, the account screen in place', async () => {
    const Account = screen('index');
    mount(<Account />);
    act(() => {
      button('I’m 16 or older and I agree to the Terms of Use.').props.onPress();
    });
    await press('Continue with Google');
    expect(facts()).toMatchObject({ signedIn: true, emailMasked: 'm•••@example.com' });
    expect(memory.control.users().find((u) => u.email === 'maya@example.com')!.termsVersion).toBe(TERMS_VERSION);
    expect(allText()).toContain('Signed in as m•••@example.com');
    expect(allText()).toContain('Download my data');
  });

  it('a new Apple account accepts the Terms, and its hidden email is never shown', async () => {
    const Account = screen('index');
    mount(<Account />);
    act(() => {
      button('I’m 16 or older and I agree to the Terms of Use.').props.onPress();
    });
    await press('Continue with Apple');
    expect(facts()).toMatchObject({ signedIn: true, emailMasked: null, providers: ['apple'] });
    expect(allText()).toContain('Signed in with Apple (your email is hidden)');
    expect(allText()).not.toContain('privaterelay');
  });

  it('a closed Apple sheet just comes back; offline says so', async () => {
    const Account = screen('index');
    mount(<Account />);
    act(() => {
      button('I’m 16 or older and I agree to the Terms of Use.').props.onPress();
    });
    memory.control.failNext('auth.signInWithApple', 'cancelled');
    await press('Continue with Apple');
    expect(facts().signedIn).toBe(false);
    expect(allText()).not.toContain('Something went wrong');
    memory.control.setOffline(true);
    await press('Continue with Google');
    expect(allText()).toContain('You’re offline. Connect to the internet to sign in.');
  });

  it('email: a bad address, the code step with its 60-second resend, a wrong code, then in', async () => {
    account.setAgreed(true);
    const Email = screen('email');
    mount(<Email />);
    type('Email address', 'maya@example');
    await press('Send code');
    expect(allText()).toContain('Enter an email address like name@example.com.');
    expect(memory.control.calls).toEqual([]);
    type('Email address', ' Maya@Example.com ');
    await press('Send code');
    expect(allText()).toContain('Enter the code we sent to m•••@example.com');
    expect(allText()).toContain('Send a new code in 1:00');
    expect(pressables('Send a new code in 1 minute')[0].props.disabled).toBe(true);
    await act(async () => {
      jest.advanceTimersByTime(18_000);
    });
    expect(allText()).toContain('Send a new code in 0:42');
    const code = memory.control.lastCode('maya@example.com')!;
    expect(disabled('Sign in')).toBe(true);
    type('6-digit code', code === '000000' ? '111 111' : '000 000');
    await press('Sign in');
    expect(allText()).toContain('That code didn’t work. Check it, or send a new one.');
    type('6-digit code', code);
    await press('Sign in');
    expect(mockNav.back).toHaveBeenCalled();
    expect(facts()).toMatchObject({ signedIn: true, emailMasked: 'm•••@example.com' });
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
  });

  it('email: after 5 wrong codes, Sign in waits for a new code', async () => {
    account.setAgreed(true);
    const Email = screen('email');
    mount(<Email />);
    type('Email address', 'maya@example.com');
    await press('Send code');
    const wrong = memory.control.lastCode('maya@example.com') === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      type('6-digit code', wrong);
      await press('Sign in');
    }
    expect(allText()).toContain('Too many tries. Send a new code to try again.');
    type('6-digit code', memory.control.lastCode('maya@example.com')!);
    expect(disabled('Sign in')).toBe(true);
  });
});

// ── A3 / #3 / #8: secrets stay out of storage and logs ─────────────────
describe('A3: the session never leaks', () => {
  it('#3 + #8: after sign-in, sign-out and delete, no token, email or id in AsyncStorage or the console', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((k) => jest.spyOn(console, k).mockImplementation(() => {}));
    const alert = jest.spyOn(Alert, 'alert');
    try {
      account.setAgreed(true);
      const Email = screen('email');
      mount(<Email />);
      type('Email address', 'maya@example.com');
      await press('Send code');
      const code = memory.control.lastCode('maya@example.com')!;
      type('6-digit code', code);
      await press('Sign in');
      const session = memory.control.session()!;
      unmount();

      // Walk every saved key on the phone.
      const AS = require('@react-native-async-storage/async-storage');
      const storage = AS.default ?? AS;
      const keys: string[] = await storage.getAllKeys();
      const saved = (await storage.multiGet(keys)).map(([, v]: [string, string]) => v ?? '').join('\n');
      expect(keys).toContain('aurivan.account.v1');
      for (const secret of [session.accessToken, session.refreshToken, session.userId, 'maya@example.com', code]) expect(saved).not.toContain(secret);

      // Sign out, sign back in, delete: all quiet.
      const Account = screen('index');
      mount(<Account />);
      alert.mockImplementation((_t, _m, buttons) => buttons?.[1]?.onPress?.());
      await press('Sign out');
      expect(facts().signedIn).toBe(false);
      await act(async () => {
        jest.advanceTimersByTime(61_000);
      });
      await account.sendCode('maya@example.com');
      await account.verifyCode('maya@example.com', memory.control.lastCode('maya@example.com')!, true);
      await account.deleteAccount({ alsoLocal: false });
      const logged = spies.flatMap((s) => s.mock.calls).map((c) => c.map(String).join(' ')).join('\n');
      for (const secret of [session.accessToken, session.refreshToken, session.userId, 'maya@example.com', code]) expect(logged).not.toContain(secret);
    } finally {
      spies.forEach((s) => s.mockRestore());
      alert.mockRestore();
    }
  });

  it('a restored phone (no session in the secure store) is quietly signed out, with the row saying so', async () => {
    backendWith({ signedIn: false });
    const AS = require('@react-native-async-storage/async-storage');
    await (AS.default ?? AS).setItem('aurivan.account.v1', JSON.stringify({ state: { ...SIGNED_OUT, signedIn: true, emailMasked: 'm•••@example.com', providers: ['email'] }, version: 1 }));
    const stop = await account.initAccount();
    expect(facts()).toMatchObject({ signedIn: false, expired: true });
    // The AppState hook reached the backend (the session refreshes only in the foreground).
    expect(memory.control.calls).toContain('auth.setForeground');
    stop();
  });

  it('a session whose account never accepted the Terms is not used', async () => {
    backendWith({ signedIn: true, users: [{ ...MAYA, termsVersion: null }] });
    const stop = await account.initAccount();
    expect(facts().signedIn).toBe(false);
    expect(await memory.auth.current()).toBeNull();
    stop();
  });
});

// ── A4: delete ─────────────────────────────────────────────────────────
describe('A4: delete the account', () => {
  const signIn = (authAgoMin = 1, users?: MemoryUser[]) => {
    backendWith({ signedIn: true, authAgoMin, users });
    const u = (users ?? [MAYA])[0];
    setFacts({ signedIn: true, emailMasked: u.email.startsWith('maya') ? 'm•••@example.com' : null, providers: u.providers });
  };
  const answerOne = () =>
    act(() => {
      useProgress.getState().recordAnswer('cisa', getAllQuestions('cisa')[0].id, true);
    });
  const answered = () => Object.keys(selectCert(useProgress.getState(), 'cisa').answers).length;

  it('a recent sign-in: Continue, type DELETE, deleted; the phone keeps its progress (box unticked)', async () => {
    signIn(1);
    answerOne();
    const Delete = screen('delete');
    mount(<Delete />);
    expect(allText()).toContain('Delete your Aurivan account?');
    expect(button('Also remove my progress from this phone').props.checked).toBe(false);
    await press('Continue');
    expect(disabled('Delete account')).toBe(true);
    type('Type DELETE to confirm', 'delete');
    expect(disabled('Delete account')).toBe(true);
    type('Type DELETE to confirm', 'DELETE');
    await press('Delete account');
    expect(allText()).toContain('Your account is deleted');
    expect(memory.control.users()).toEqual([]);
    expect(facts().signedIn).toBe(false);
    expect(answered()).toBe(1);
  });

  it('"Also remove my progress from this phone" clears it after the account is gone', async () => {
    signIn(1);
    answerOne();
    const Delete = screen('delete');
    mount(<Delete />);
    await press('Also remove my progress from this phone');
    await press('Continue');
    type('Type DELETE to confirm', 'DELETE');
    await press('Delete account');
    expect(allText()).toContain('Your account is deleted');
    expect(answered()).toBe(0);
  });

  it('#6: a sign-in 11 minutes old asks to confirm it’s you; no delete call is made first', async () => {
    signIn(11);
    expect(await account.deleteAccount({ alsoLocal: false })).toMatchObject({ ok: false, code: 'reauth_required' });
    expect(memory.control.calls).not.toContain('auth.deleteAccount');
    const Delete = screen('delete');
    mount(<Delete />);
    await press('Continue');
    expect(allText()).toContain('For your security, confirm it’s you first.');
    expect(pressables('Type DELETE to confirm')).toHaveLength(0);
    // Maya signs in with Google here, so she confirms with Google.
    await press('Continue with Google');
    type('Type DELETE to confirm', 'DELETE');
    await press('Delete account');
    expect(allText()).toContain('Your account is deleted');
  });

  it('#6: an email-only account confirms with a code sent to its address', async () => {
    const ann: MemoryUser = { userId: 'user-ann', email: 'ann@example.org', providers: ['email'], termsVersion: TERMS_VERSION, createdAt: 0 };
    signIn(30, [ann]);
    act(() => {
      useAccount.getState().setFacts({ emailMasked: 'a•••@example.org' });
    });
    const Delete = screen('delete');
    mount(<Delete />);
    await press('Continue');
    await press('Send a code to a•••@example.org');
    type('6-digit code', memory.control.lastCode('ann@example.org')!);
    await press('Confirm it’s you');
    type('Type DELETE to confirm', 'DELETE');
    await press('Delete account');
    expect(allText()).toContain('Your account is deleted');
  });

  it('#7: offline, nothing is deleted, here or there, even with the box ticked', async () => {
    signIn(1);
    answerOne();
    const Delete = screen('delete');
    mount(<Delete />);
    await press('Also remove my progress from this phone');
    await press('Continue');
    type('Type DELETE to confirm', 'DELETE');
    memory.control.setOffline(true);
    const before = JSON.stringify(useProgress.getState().byCert);
    await press('Delete account');
    expect(allText()).toContain('You’re offline. Connect to the internet to delete your account. Nothing was deleted.');
    expect(memory.control.users()).toHaveLength(1);
    expect(JSON.stringify(useProgress.getState().byCert)).toBe(before);
    expect(facts().signedIn).toBe(true);
  });

  it('a server failure: nothing deleted, and the support address to write to', async () => {
    signIn(1);
    const Delete = screen('delete');
    mount(<Delete />);
    await press('Continue');
    type('Type DELETE to confirm', 'DELETE');
    memory.control.failNext('auth.deleteAccount', 'server');
    await press('Delete account');
    expect(allText()).toContain('We couldn’t delete your account just now. Nothing was deleted. Try again, or email certprep.support@gmail.com.');
    expect(memory.control.users()).toHaveLength(1);
  });
});

// ── A5 / A6: download and sign out ─────────────────────────────────────
describe('A5: Download my data, A6: sign out', () => {
  const signedIn = () => {
    backendWith({ signedIn: true });
    setFacts({ signedIn: true, emailMasked: 'm•••@example.com', providers: ['email', 'google'] });
  };

  it('saves the account file through the share sheet; once an hour', async () => {
    signedIn();
    const Account = screen('index');
    mount(<Account />);
    await press('Download my data, A copy of everything your account holds, as a file.');
    expect(mockWritten).toHaveLength(1);
    expect(JSON.parse(mockWritten[0])).toMatchObject({ app: 'aurivan', account: { email: 'maya@example.com' } });
    expect(allText()).toContain('Your data file is ready.');
    await press('Download my data, A copy of everything your account holds, as a file.');
    expect(allText()).toContain('You can download your data once an hour. Try again later.');
  });

  it('the file is a backup a restore accepts (the account section is dropped)', async () => {
    signedIn();
    const file = currentBackup();
    for (const store of ['settings', 'progress'] as const) {
      await memory.sync.push({ store, expectedRev: null, storeVersion: file.stores[store].version, appVersion: '1.17.0', deviceId: 'd', state: file.stores[store].state });
    }
    const text = await memory.auth.exportMyData();
    const data = readBackup(text, CERTIFICATIONS.map((c) => c.id));
    expect(data.settings.activeCertId).toBe('cisa');
    expect(data).not.toHaveProperty('account');
  });

  it('Sign out asks first, keeps progress, and goes back; on all devices offline says so', async () => {
    signedIn();
    const alert = jest.spyOn(Alert, 'alert');
    try {
      const Account = screen('index');
      mount(<Account />);
      memory.control.setOffline(true);
      alert.mockImplementation((_t, _m, buttons) => buttons?.[1]?.onPress?.());
      await press('Sign out on all devices');
      expect(alert.mock.calls[0][0]).toBe('Sign out on all devices?');
      expect(allText()).toContain('You’re offline. Connect to the internet to sign out on all devices.');
      expect(facts().signedIn).toBe(true);
      memory.control.setOffline(false);
      await press('Sign out');
      expect(alert.mock.calls[1][0]).toBe('Sign out?');
      expect(alert.mock.calls[1][1]).toBe('Your progress stays on this phone, and Aurivan keeps working without an account.');
      expect(facts().signedIn).toBe(false);
      expect(mockNav.back).toHaveBeenCalled();
    } finally {
      alert.mockRestore();
    }
  });
});
