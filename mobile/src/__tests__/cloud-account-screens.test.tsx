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
 * Plus the Phase 6 fix round (code review B1–B3, S3–S5; UX H2, H3, P2, P4–P6, O1):
 * Apple accounts on iOS always confirm with Apple; only "gone" is deleted;
 * the email code step can always get a new code; Android back on delete.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import type { ComponentType, ReactElement } from 'react';
import { AccessibilityInfo, Alert, AppState, BackHandler, Platform } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { setBackendForTests } from '../cloud/backend';
import { createMemoryBackend, type MemoryBackend, type MemoryUser } from '../cloud/memory/backend';
import { CERTIFICATIONS } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import { readBackup } from '../engine/backup';
import { TERMS_VERSION } from '../engine/account';
import * as account from '../lib/account';
import { flushSayLaterForTest } from '../lib/a11y';
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
jest.mock('../components/brand', () => ({ KaisipLockup: () => null, KaisipMark: () => null, PillarList: () => null }));
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
/** How many typing fields have this spoken name (0 or 1). */
const fields = (label: string) => r!.root.findAll((x) => typeof x.props.onChangeText === 'function' && x.props.accessibilityLabel === label).length;
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
    // Mobile 1.46: Account is a door on Settings' page; its rows are on its own screen.
    expect(allText()).toContain('Sign in and sync');
    expect(allText()).toContain('Progress is stored on this device.');
    expect(allText()).not.toContain('Progress is stored only on this device.');
    unmount();
    (require('../../jest/perf/focusRouter').routeParams as Record<string, string | undefined>).category = 'account';
    mount(<Settings />);
    expect(allText()).toContain('Not signed in');
    delete (require('../../jest/perf/focusRouter').routeParams as Record<string, string | undefined>).category;
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
    if (path === 'delete') expect(allText()).toContain('Delete your KaiSip account?');
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
    // Waiting: a quiet line (spoken in words), not a button to tap yet.
    expect(r!.root.findAll((n) => n.props.accessibilityLabel === 'Send a new code in 1 minute').length).toBeGreaterThan(0);
    expect(pressables('Send a new code')).toHaveLength(0);
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
  });

  it('email: after 60 seconds "Send a new code" is a button again, and sends one', async () => {
    account.setAgreed(true);
    const Email = screen('email');
    mount(<Email />);
    type('Email address', 'maya@example.com');
    await press('Send code');
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(pressables('Send a new code').length).toBeGreaterThan(0);
    await press('Send a new code');
    expect(memory.control.calls.filter((c) => c === 'auth.sendEmailCode')).toHaveLength(2);
    expect(allText()).toContain('Send a new code in 1:00');
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
      // Phase 7: the row opens the sign-out sheet; sign out the way it does.
      await press('Sign out on this phone');
      await act(async () => {
        await account.signOut('local');
      });
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
    expect(allText()).toContain('Delete your KaiSip account?');
    expect(button('Also remove my progress from this phone').props.checked).toBe(false);
    await press('Continue');
    expect(disabled('Delete account')).toBe(true);
    // The step 1 choice, restated above the field.
    expect(allText()).toContain('Your progress on this phone stays here.');
    type('Type DELETE to confirm', 'DELET');
    expect(disabled('Delete account')).toBe(true);
    // Any case counts (the keyboard may not start in capitals).
    type('Type DELETE to confirm', 'delete');
    await press('Delete account');
    expect(allText()).toContain('Your account is deleted');
    expect(allText()).toContain('It’s gone from our live systems now');
    expect(allText()).not.toContain('was removed too');
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
    expect(allText()).toContain('Your progress on this phone will be removed too.');
    type('Type DELETE to confirm', 'DELETE');
    await press('Delete account');
    expect(allText()).toContain('Your account is deleted');
    expect(allText()).toContain('Your progress on this phone was removed too.');
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
    expect(fields('Type DELETE to confirm')).toBe(0);
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
    expect(JSON.parse(mockWritten[0])).toMatchObject({ app: 'kaisip', account: { email: 'maya@example.com' } });
    expect(allText()).toContain('Your data file is ready.');
    await press('Download my data, A copy of everything your account holds, as a file.');
    expect(allText()).toContain('You can download your data once an hour. Try again later.');
  });

  it('the file is a backup a restore accepts (the account section is dropped)', async () => {
    signedIn();
    const file = currentBackup();
    for (const store of ['settings', 'progress'] as const) {
      await memory.sync.push({ store, expectedRev: null, storeVersion: file.stores[store].version, appVersion: '1.17.0', deviceId: '6f1c2b9e-4d3a-4c1b-9a7e-2f5d8c0b1a3e', state: file.stores[store].state });
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
      // Phase 7: signing out on this phone is a sheet (with "Remove my progress from this phone").
      await press('Sign out on this phone');
      expect(mockNav.push).toHaveBeenCalledWith('/account/sign-out');
      unmount();
      mount(<>{(() => { const S = screen('sign-out'); return <S />; })()}</>);
      expect(allText()).toContain('Your progress stays on this phone, and KaiSip keeps working without an account.');
      await press('Sign out on this phone');
      expect(facts().signedIn).toBe(false);
      expect(mockNav.replace).toHaveBeenCalledWith('/you');
    } finally {
      alert.mockRestore();
    }
  });
});

// ── Phase 6 fix round ──────────────────────────────────────────────────
describe('fix round: deleting is never falsely "done"', () => {
  const APPLE: MemoryUser = { userId: 'user-apple', email: 'demo-learner@privaterelay.appleid.com', providers: ['apple'], termsVersion: TERMS_VERSION, createdAt: 0 };
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

  it('B1 (repro R1): an Apple account signed in a minute ago confirms with Apple on iOS, and its fresh code reaches the server', async () => {
    signIn(1, [APPLE]);
    const plan = await account.deletePlan();
    expect(plan).toMatchObject({ ok: true, plan: { gate: 'reauth', provider: 'apple' } });
    const del = jest.spyOn(memory.auth, 'deleteAccount');
    const Delete = screen('delete');
    mount(<Delete />);
    await press('Continue');
    expect(fields('Type DELETE to confirm')).toBe(0);
    await press('Continue with Apple');
    type('Type DELETE to confirm', 'DELETE');
    await press('Delete account');
    expect(allText()).toContain('Your account is deleted');
    expect(del.mock.calls[0][0].appleAuthorizationCode).toMatch(/^mem-apple-code-/);
    expect(memory.control.users()).toEqual([]);
  });

  it('B1: Apple’s code refused by the server goes back to "confirm it’s you", not a dead end', async () => {
    signIn(1, [APPLE]);
    const Delete = screen('delete');
    mount(<Delete />);
    await press('Continue');
    await press('Continue with Apple');
    type('Type DELETE to confirm', 'DELETE');
    memory.control.failNext('auth.deleteAccount', 'invalid', 'apple_code_invalid');
    await press('Delete account');
    expect(pressables('Continue with Apple').length).toBeGreaterThan(0);
    expect(fields('Type DELETE to confirm')).toBe(0);
    await press('Continue with Apple');
    type('Type DELETE to confirm', 'DELETE');
    await press('Delete account');
    expect(allText()).toContain('Your account is deleted');
  });

  it('B2 (repro R2): the server refusing the session is NOT deleted: account kept, progress kept, signed out here', async () => {
    signIn(1);
    answerOne();
    const resetSpy = jest.spyOn(useProgress.getState(), 'resetCert');
    memory.control.failNext('auth.deleteAccount', 'unauthorized');
    const r = await account.deleteAccount({ alsoLocal: true });
    expect(r).toMatchObject({ ok: false, code: 'unauthorized' });
    expect(memory.control.users().map((u) => u.userId)).toEqual([MAYA.userId]);
    expect(resetSpy).not.toHaveBeenCalled();
    expect(answered()).toBe(1);
    // The row says "Sign in again to keep syncing".
    expect(facts()).toMatchObject({ signedIn: false, expired: true });
    resetSpy.mockRestore();
  });

  it('B2: on screen, a sign-in that ended says so, and nothing reads "deleted"', async () => {
    signIn(1);
    const Delete = screen('delete');
    mount(<Delete />);
    await press('Also remove my progress from this phone');
    await press('Continue');
    type('Type DELETE to confirm', 'DELETE');
    memory.control.failNext('auth.deleteAccount', 'unauthorized');
    await press('Delete account');
    expect(allText()).toContain('Your sign-in has ended, so nothing was deleted. Sign in again, then delete your account.');
    expect(allText()).not.toContain('Your account is deleted');
    expect(allText()).toContain('Delete your KaiSip account?');
  });

  it('B2: no session on this phone is refused before any server call', async () => {
    backendWith({ signedIn: false });
    expect(await account.deleteAccount({ alsoLocal: true })).toMatchObject({ ok: false, code: 'unauthorized' });
    expect(memory.control.calls).not.toContain('auth.deleteAccount');
  });

  it('B2: a reply lost after the server deleted the account: the retry hears "gone", which is done', async () => {
    signIn(1);
    answerOne();
    memory.control.dropNextReply('auth.deleteAccount');
    expect(await account.deleteAccount({ alsoLocal: true })).toMatchObject({ ok: false, code: 'offline' });
    expect(facts().signedIn).toBe(true);
    expect(answered()).toBe(1);
    expect(await account.deleteAccount({ alsoLocal: true })).toEqual({ ok: true });
    expect(facts()).toMatchObject({ signedIn: false, expired: false });
    expect(answered()).toBe(0);
    expect(await memory.auth.current()).toBeNull();
  });
});

describe('fix round: the email code step on delete (UX H2, CR S3)', () => {
  const ANN: MemoryUser = { userId: 'user-ann', email: 'ann@example.org', providers: ['email'], termsVersion: TERMS_VERSION, createdAt: 0 };
  const open = async () => {
    backendWith({ signedIn: true, authAgoMin: 30, users: [ANN] });
    setFacts({ signedIn: true, emailMasked: 'a•••@example.org', providers: ['email'] });
    const Delete = screen('delete');
    mount(<Delete />);
    await press('Continue');
  };
  const wrongFor = (code: string) => (code === '000000' ? '111111' : '000000');

  it('sending says "Code sent to …"; a wrong code shows on the field (spoken as its hint)', async () => {
    const said = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await open();
    await press('Send a code to a•••@example.org');
    act(() => flushSayLaterForTest());
    expect(said).toHaveBeenCalledWith('Code sent to a•••@example.org');
    type('6-digit code', wrongFor(memory.control.lastCode('ann@example.org')!));
    await press('Confirm it’s you');
    expect(allText()).toContain('That code didn’t work. Check it, or send a new one.');
    expect(field('6-digit code').props.accessibilityHint).toBe('That code didn’t work. Check it, or send a new one.');
    said.mockRestore();
  });

  it('an expired code goes back to "Send a code to …", which sends a new one', async () => {
    await open();
    await press('Send a code to a•••@example.org');
    const first = memory.control.lastCode('ann@example.org')!;
    act(() => {
      jest.advanceTimersByTime(11 * 60_000);
    });
    type('6-digit code', first);
    await press('Confirm it’s you');
    expect(allText()).toContain('That code has expired. Send a new one.');
    expect(fields('6-digit code')).toBe(0);
    await press('Send a code to a•••@example.org');
    expect(memory.control.calls.filter((c) => c === 'auth.reauthenticate')).toHaveLength(3);
    type('6-digit code', memory.control.lastCode('ann@example.org')!);
    await press('Confirm it’s you');
    expect(fields('Type DELETE to confirm')).toBeGreaterThan(0);
  });

  it('five wrong codes go back to "Send a code to …" (never a dead end)', async () => {
    await open();
    await press('Send a code to a•••@example.org');
    const wrong = wrongFor(memory.control.lastCode('ann@example.org')!);
    for (let i = 0; i < 5; i++) {
      type('6-digit code', wrong);
      await press('Confirm it’s you');
    }
    expect(allText()).toContain('Too many tries. Send a new code to try again.');
    expect(pressables('Send a code to a•••@example.org').length).toBeGreaterThan(0);
  });
});

describe('fix round: Android back on delete (UX H3)', () => {
  it('does nothing while the account is being deleted; on "deleted" it goes to You', async () => {
    let handler: (() => boolean | null | undefined) | undefined;
    type BackListener = Parameters<typeof BackHandler.addEventListener>[1];
    const spy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_e, h: BackListener) => {
      handler = () => h({} as Parameters<BackListener>[0]);
      return { remove: () => {} };
    });
    try {
      backendWith({ signedIn: true });
      setFacts({ signedIn: true, emailMasked: 'm•••@example.com', providers: ['email', 'google'] });
      const Delete = screen('delete');
      mount(<Delete />);
      expect(handler!()).toBe(false); // step 1: back as usual
      await press('Continue');
      type('Type DELETE to confirm', 'DELETE');
      let finish: () => void = () => {};
      const real = memory.auth.deleteAccount.bind(memory.auth);
      jest.spyOn(memory.auth, 'deleteAccount').mockImplementation((i) => new Promise((res) => (finish = () => res(real(i)))));
      await press('Delete account');
      expect(allText()).toContain('Deleting your account…');
      expect(handler!()).toBe(true); // swallowed while it runs
      expect(mockNav.back).not.toHaveBeenCalled();
      await act(async () => finish());
      await flush();
      expect(allText()).toContain('Your account is deleted');
      let handled: boolean | null | undefined;
      act(() => {
        handled = handler!();
      });
      expect(handled).toBe(true);
      expect(mockNav.replace).toHaveBeenCalledWith('/you');
    } finally {
      spy.mockRestore();
    }
  });
});

describe('fix round: sessions that end, and launch (CR S4, S5, B3)', () => {
  it('S5: a session that ends on its own while signed in leaves "Sign in again to keep syncing"', async () => {
    backendWith({ signedIn: true });
    const stop = await account.initAccount();
    expect(facts().signedIn).toBe(true);
    // Supabase emits SIGNED_OUT when a refresh fails; here the memory backend forgets the session.
    await act(async () => {
      await memory.auth.signOut('local');
    });
    expect(facts()).toMatchObject({ signedIn: false, expired: true });
    const You = require('../app/(tabs)/you').default as ComponentType;
    mount(<You />);
    expect(allText()).toContain('Sign in again to keep syncing');
    stop();
  });

  it('S5: a sign-out the learner chose is not "expired"', async () => {
    backendWith({ signedIn: true });
    const stop = await account.initAccount();
    expect(await account.signOut('local')).toEqual({ ok: true });
    expect(facts()).toMatchObject({ signedIn: false, expired: false });
    stop();
  });

  it('S4: saved facts that can’t be read at launch: no rejection, and it checks again when the app is next in front', async () => {
    backendWith({ signedIn: true });
    const rehydrate = jest.spyOn(useAccount.persist, 'rehydrate').mockRejectedValueOnce(new Error('disk'));
    const listeners: ((s: string) => void)[] = [];
    const appState = jest.spyOn(AppState, 'addEventListener').mockImplementation((_e, h) => {
      listeners.push(h as (s: string) => void);
      return { remove: () => {} } as ReturnType<typeof AppState.addEventListener>;
    });
    try {
      const stop = await account.initAccount();
      expect(facts().signedIn).toBe(false);
      expect(memory.control.calls).toContain('auth.setForeground');
      await act(async () => {
        listeners.forEach((h) => h('active'));
      });
      await flush();
      expect(facts().signedIn).toBe(true);
      stop();
    } finally {
      rehydrate.mockRestore();
      appState.mockRestore();
    }
  });

  it('a local sign-out that reports a failure still signs out on this phone', async () => {
    backendWith({ signedIn: true });
    setFacts({ signedIn: true, emailMasked: 'm•••@example.com', providers: ['email', 'google'] });
    memory.control.failNext('auth.signOut', 'server');
    expect(await account.signOut('local')).toEqual({ ok: true });
    expect(facts().signedIn).toBe(false);
    expect(await memory.auth.current()).toBeNull();
  });

  it('B3: Download my data needs no recent sign-in; a sign-in that ended says sign in again', async () => {
    backendWith({ signedIn: true, authAgoMin: 24 * 60 });
    setFacts({ signedIn: true, emailMasked: 'm•••@example.com', providers: ['email', 'google'] });
    const Account = screen('index');
    mount(<Account />);
    await press('Download my data, A copy of everything your account holds, as a file.');
    expect(allText()).toContain('Your data file is ready.');
    act(() => {
      jest.advanceTimersByTime(60 * 60_000);
    });
    memory.control.failNext('auth.exportMyData', 'unauthorized');
    await press('Download my data, A copy of everything your account holds, as a file.');
    expect(facts()).toMatchObject({ signedIn: false, expired: true });
    expect(allText()).toContain('Your sign-in has ended. Sign in again to download your data.');
    expect(allText()).toContain('Keep your progress on every device');
  });
});

describe('fix round: the field and the words (UX P1, P4, P6)', () => {
  it('P4: the visible label and problem lines are hidden from screen readers (the field says them); the outline turns tip', async () => {
    account.setAgreed(true);
    const Email = screen('email');
    mount(<Email />);
    type('Email address', 'nope');
    await press('Send code');
    const hidden = r!.root.findAll((n) => n.props.importantForAccessibility === 'no-hide-descendants' && n.props.accessibilityElementsHidden === true);
    const hiddenText = hidden.map((n) => n.findAll((x) => typeof x.props.children === 'string').map((x) => x.props.children).join(' ')).join(' | ');
    expect(hiddenText).toContain('Email address');
    expect(hiddenText).toContain('Enter an email address like name@example.com.');
    const style = [field('Email address').props.style].flat(3).reduce((a: object, b: object | null) => ({ ...a, ...(b ?? {}) }), {}) as { borderColor?: string };
    expect(style.borderColor).toBe(require('../theme/tokens').light.tip);
  });

  it('P1: the sign-out section and row say where', () => {
    backendWith({ signedIn: true });
    setFacts({ signedIn: true, emailMasked: 'm•••@example.com', providers: ['email'] });
    const Account = screen('index');
    mount(<Account />);
    expect(allText()).toContain('Where you’re signed in');
    expect(pressables('Sign out on this phone').length).toBeGreaterThan(0);
  });

  it('P6: no spoken string is typed into the account screens outside copy.ts', () => {
    const { readFileSync } = require('fs');
    const { join } = require('path');
    const files = [
      'app/(cloud)/account/index.tsx',
      'app/(cloud)/account/email.tsx',
      'app/(cloud)/account/delete.tsx',
      'app/(cloud)/account/sign-in.tsx',
      'app/(cloud)/account/first-sync.tsx',
      'app/(cloud)/account/switch.tsx',
      'app/(cloud)/account/what-syncs.tsx',
      'app/(cloud)/account/sign-out.tsx',
      'app/(cloud)/account/delete-synced.tsx',
      'components/account.tsx',
      'components/sync.tsx',
    ];
    for (const f of files) {
      const src = readFileSync(join(__dirname, '..', f), 'utf8') as string;
      expect(`${f}: ${src.match(/accessibility(Label|Hint)=["'`]/g) ?? 'none'}`).toBe(`${f}: none`);
      expect(`${f}: ${src.match(/accessibility(Label|Hint)=\{`/g) ?? 'none'}`).toBe(`${f}: none`);
    }
  });
});
