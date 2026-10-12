/**
 * Uplift Phase 8 (the feedback board, built OFF): the board screens with the
 * flag forced ON and the in-memory backend. Spec PHASE6_8.md §4.8 "Jest"
 * (with the 12 Oct addendum: there is no What's next feed to fall back):
 * - the ⋯ menu on every post and comment has Report and Block; Edit and
 *   Withdraw only on your own;
 * - the guidelines gate can't be skipped: no post, comment or vote before it;
 * - a blocked learner's posts and comments disappear at once;
 * - the reporter's view hides the item at once;
 * - the composer turns Post off on a bank match, and nothing is sent;
 * - learners' text is plain Text (no links made from it);
 * - the staff queue redirects anyone the server doesn't call staff;
 * - board actions never touch study progress;
 * - the read scope decides what a signed-out or signed-in learner sees;
 * - votes made offline wait in the outbox, for that account only.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import type { ComponentType, ReactElement } from 'react';
import { Alert, Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { setBackendForTests } from '../cloud/backend';
import { createMemoryBackend, type MemoryBackend } from '../cloud/memory/backend';
import { BOARD_POST, boardSeed, DEMO_EMAIL, DEMO_USER_ID } from '../cloud/memory/seed';
import { outboxSize } from '../cloud/outbox';
import type { ReadScope } from '../cloud/types';
import { getAllQuestions } from '../content/loader';
import { TERMS_VERSION } from '../engine/account';
import { sha256Hex } from '../engine/sha256';
import * as board from '../lib/board';
import { SIGNED_OUT, useAccount } from '../store/account';
import { useProgress } from '../store/progress';
import { useSettings } from '../store/settings';

jest.mock('../cloud/flag', () => ({ CLOUD: true, PROVIDERS: ['email', 'apple', 'google'] }));
const mockNav = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
const mockRedirects: unknown[] = [];
jest.mock('expo-router', () => {
  const base = require('../../jest/perf/focusRouter').routerMock();
  return {
    ...base,
    router: {
      ...base.router,
      push: (...a: unknown[]) => mockNav.push(...a),
      back: (...a: unknown[]) => mockNav.back(...a),
      replace: (...a: unknown[]) => mockNav.replace(...a),
    },
    Redirect: ({ href }: { href: unknown }) => {
      mockRedirects.push(href);
      return null;
    },
  };
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

const DAY = 86_400_000;
const RAJ = 'mem-user-raj';
let memory: MemoryBackend;
function backendWith(o: { signedIn?: boolean; joined?: boolean; staff?: boolean; readScope?: ReadScope; postingOpen?: boolean } = {}) {
  const now = Date.now();
  memory = createMemoryBackend({
    users: [
      { userId: DEMO_USER_ID, email: DEMO_EMAIL, providers: ['email'], termsVersion: TERMS_VERSION, createdAt: now - 30 * DAY },
      { userId: RAJ, email: 'raj@example.com', providers: ['email'], termsVersion: TERMS_VERSION, createdAt: now - 30 * DAY },
    ],
    signedIn: o.signedIn === false ? null : { userId: DEMO_USER_ID, authAt: now },
    board: boardSeed(now, { boardJoined: o.joined ?? true, boardStaff: o.staff, readScope: o.readScope, postingOpen: o.postingOpen }),
  });
  setBackendForTests(memory);
  useAccount.getState().setFacts({ ...SIGNED_OUT, ...(o.signedIn === false ? {} : { signedIn: true, emailMasked: 'm•••@example.com', providers: ['email'] }) });
  board.resetBoardSession();
}

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
const flush = async (ms = 0) => {
  await act(async () => {
    for (let i = 0; i < 30; i++) await Promise.resolve();
    if (ms) jest.advanceTimersByTime(ms);
    for (let i = 0; i < 30; i++) await Promise.resolve();
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
const has = (label: string) => pressables(label).length > 0;
const press = async (label: string) => {
  await act(async () => {
    button(label).props.onPress();
  });
  await flush();
};
const type = (label: string, text: string) =>
  act(() => {
    const n = r!.root.findAll((x) => typeof x.props.onChangeText === 'function' && (x.props.accessibilityLabel === label || x.props.label === label))[0];
    if (!n) throw new Error(`no field "${label}"`);
    n.props.onChangeText(text);
  });
const screen = (path: string) => require(`../app/(cloud)/board/${path}`).default as ComponentType;
const params = () => require('../../jest/perf/focusRouter').routeParams as Record<string, string | undefined>;
const boardCalls = () => memory.control.calls.filter((c) => c.startsWith('board.'));
/** The ⋯ menu's buttons (the open sheet). */
const menuLabels = () =>
  r!.root
    .findAll((n) => n.props.label !== undefined && typeof n.props.onPress === 'function' && n.props.kind !== undefined)
    .map((n) => String(n.props.label));

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 9, 12, 10, 0) });
  mockNav.push.mockClear();
  mockNav.back.mockClear();
  mockNav.replace.mockClear();
  mockRedirects.length = 0;
  for (const k of Object.keys(params())) delete params()[k];
  useProgress.getState().resetCert('cisa');
  useSettings.setState({ activeCertId: 'cisa', onboarded: true, theme: 'light' });
  backendWith();
});
afterEach(async () => {
  unmount();
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
  setBackendForTests(undefined);
  const AS = require('@react-native-async-storage/async-storage');
  await (AS.default ?? AS).clear();
});

describe('who reads the board (one server value)', () => {
  it('signed out with the default scope: the sign-in line, no posts, no feed call', async () => {
    backendWith({ signedIn: false });
    const Home = screen('index');
    mount(<Home />);
    await flush();
    expect(allText()).toContain('Sign in to read the board, and to post, vote and comment.');
    expect(allText()).not.toContain('More practice on BCP test types');
    expect(boardCalls()).not.toContain('board.feed');
  });

  it('signed out with "everyone": the posts, and "Reading is open to everyone."', async () => {
    backendWith({ signedIn: false, readScope: 'everyone' });
    const Home = screen('index');
    mount(<Home />);
    await flush();
    expect(allText()).toContain('Reading is open to everyone.');
    expect(allText()).toContain('More practice on BCP test types');
    // Voting signed out opens the sign-in sheet, and sends nothing.
    await press('Vote for: More practice on BCP test types. 42 votes. Not voted yet.');
    expect(mockNav.push).toHaveBeenCalledWith('/account/sign-in');
    expect(boardCalls()).not.toContain('board.vote');
  });

  it('"author_staff": the intro says only you and the team see your posts, and only yours are listed', async () => {
    backendWith({ readScope: 'author_staff' });
    const Home = screen('index');
    mount(<Home />);
    await flush();
    expect(allText()).toContain('Only you and the team see your posts.');
    expect(allText()).toContain('Reminders at a different time on weekends');
    expect(allText()).not.toContain('More practice on BCP test types');
  });

  it('no What’s next anywhere: the tabs are Top, New and Shipped', async () => {
    const Home = screen('index');
    mount(<Home />);
    await flush();
    expect(allText()).not.toMatch(/What.s next/);
    for (const t of ['Top', 'New', 'Shipped']) expect(allText()).toContain(t);
  });
});

describe('the guidelines gate can’t be skipped', () => {
  it('not joined: a vote opens the gate and nothing is sent; the composer redirects to the gate', async () => {
    backendWith({ joined: false });
    const Home = screen('index');
    mount(<Home />);
    await flush();
    await press('Vote for: Audio for the study notes on my commute. 5 votes. Not voted yet.');
    expect(mockNav.push).toHaveBeenCalledWith({ pathname: '/board/guidelines', params: { then: 'back' } });
    await press('New post');
    expect(mockNav.push).toHaveBeenCalledWith({ pathname: '/board/guidelines', params: { then: 'compose' } });
    unmount();
    const Compose = screen('new');
    mount(<Compose />);
    await flush();
    expect(mockRedirects).toContainEqual({ pathname: '/board/guidelines', params: { then: 'compose' } });
    for (const c of ['board.vote', 'board.submitPost', 'board.comment']) expect(boardCalls()).not.toContain(c);
  });

  it('the gate: "I agree, continue" waits for the box; a reserved name is refused on the phone; then it joins', async () => {
    backendWith({ joined: false });
    await board.openBoard(true);
    params().then = 'compose';
    const Gate = screen('guidelines');
    mount(<Gate />);
    await flush();
    expect(allText()).toContain('No real exam questions. Ever.');
    expect(allText()).toContain('We review reports within 24 hours.');
    expect(allText()).toContain('Your email address is never shown.');
    expect(button('I agree, continue').props.disabled).toBe(true);
    await press('A name you choose');
    type('Your name on the board', 'Aurivan Team');
    await press('I agree to the community guidelines');
    expect(allText()).toContain('That name is kept for the Aurivan team. Choose another.');
    expect(button('I agree, continue').props.disabled).toBe(true);
    expect(boardCalls()).not.toContain('board.join');
    type('Your name on the board', 'Maya B');
    await press('I agree, continue');
    expect(boardCalls()).toContain('board.join');
    expect(memory.control.board.members().find((m) => m.userId === DEMO_USER_ID)).toMatchObject({ handle: 'Maya B', handleKind: 'chosen' });
    expect(mockNav.replace).toHaveBeenCalledWith('/board/new');
  });
});

describe('the ⋯ menu, report and block', () => {
  const openPost = async (id: string) => {
    await board.openBoard(true);
    params().id = id;
    const Post = screen('[id]');
    mount(<Post />);
    await flush();
  };

  it('someone else’s post: Report and Block; your own: Edit and Withdraw', async () => {
    await openPost(BOARD_POST.bcp);
    await press('More options');
    expect(menuLabels()).toEqual(expect.arrayContaining(['Report post', 'Block Quiet Cedar 214']));
    expect(menuLabels()).not.toContain('Edit');
    expect(menuLabels()).not.toContain('Withdraw');
    unmount();
    await openPost(BOARD_POST.weekend);
    await press('More options');
    expect(menuLabels()).toEqual(expect.arrayContaining(['Edit', 'Withdraw']));
    expect(menuLabels()).not.toContain('Report post');
  });

  it('every comment has its menu: Report and Block on others’, Withdraw on yours', async () => {
    await openPost(BOARD_POST.bcp);
    const menus = r!.root.findAll((n) => n.props.accessibilityLabel === 'More options' && typeof n.props.onPress === 'function' && n.type !== Text);
    // The header's, plus one per comment (3).
    expect(menus.length).toBeGreaterThanOrEqual(4);
    await act(async () => {
      menus[1].props.onPress();
    });
    expect(menuLabels()).toEqual(expect.arrayContaining(['Report comment', 'Block Steady Oak 9']));
  });

  it('reporting a comment hides it on this phone at once', async () => {
    await openPost(BOARD_POST.bcp);
    expect(allText()).toContain('Same here. A side-by-side table would help too.');
    await act(async () => {
      board.report('comment', 'c-bcp-1', 'abuse');
    });
    expect(allText()).not.toContain('Same here. A side-by-side table would help too.');
    await flush();
    expect(memory.control.board.reports().some((x) => x.targetId === 'c-bcp-1' && x.reporterId === DEMO_USER_ID)).toBe(true);
  });

  it('the report sheet: a reason is needed; afterwards the thanks line, and the post is gone from the feed', async () => {
    await openPost(BOARD_POST.audio);
    await press('More options');
    await press('Report post');
    expect(button('Send report').props.disabled).toBe(true);
    await press('Spam or advertising');
    await press('Send report');
    expect(allText()).toContain('Thanks. We review reports within 24 hours. You won’t see this post while it’s reviewed.');
    unmount();
    const Home = screen('index');
    mount(<Home />);
    await flush();
    expect(allText()).not.toContain('Audio for the study notes on my commute');
  });

  it('blocking hides the learner’s posts and comments everywhere at once (after a confirm)', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await openPost(BOARD_POST.bcp);
    await press('More options');
    await press('Block Quiet Cedar 214');
    expect(alert.mock.calls[0][0]).toBe('Block Quiet Cedar 214?');
    await act(async () => {
      (alert.mock.calls[0][2] as { text: string; onPress?: () => void }[]).find((b) => b.text === 'Block')!.onPress!();
    });
    await flush();
    expect(memory.control.board.blocks()).toContainEqual({ blockerId: DEMO_USER_ID, blockedId: 'mem-m-cedar' });
    unmount();
    const Home = screen('index');
    mount(<Home />);
    await flush();
    expect(allText()).not.toContain('More practice on BCP test types');
    expect(allText()).not.toContain('A change management explanation could say more');
    alert.mockRestore();
  });
});

describe('the composer', () => {
  const openComposer = async () => {
    await board.openBoard(true);
    const Compose = screen('new');
    mount(<Compose />);
    await flush();
  };

  it('a pasted practice question turns Post off, shows the kind card, and sends nothing', async () => {
    await openComposer();
    const q = getAllQuestions('cisa').find((x) => x.stem.split(' ').length > 18)!;
    type('Title', 'About one question here');
    type('Details (optional)', q.stem);
    await flush(500);
    expect(allText()).toContain('This looks like text from one of Aurivan’s practice questions');
    expect(button('Post').props.disabled).toBe(true);
    // The private report on that question is offered (its text is never shown).
    expect(has('Report it privately')).toBe(true);
    await act(async () => {
      button('Post').props.onPress();
    });
    await flush();
    expect(boardCalls()).not.toContain('board.submitPost');
  });

  it('recalled real-exam wording shows the warning (a person checks it first)', async () => {
    await openComposer();
    type('Title', 'A question about my exam');
    type('Details (optional)', 'On my exam I got one about who approves the audit charter.');
    await flush(500);
    expect(allText()).toContain('This looks like it might be a question from a real exam.');
  });

  it('an ordinary idea is posted and opens; posting paused turns Post off', async () => {
    await openComposer();
    type('Title', 'A dark theme for the notes pages');
    await flush(500);
    await press('Post');
    expect(boardCalls()).toContain('board.submitPost');
    expect(mockNav.replace).toHaveBeenCalledWith({ pathname: '/board/[id]', params: { id: expect.any(String) } });
    unmount();
    backendWith({ postingOpen: false });
    await openComposer();
    type('Title', 'Another idea while paused');
    await flush(500);
    expect(allText()).toContain('Posting is paused for a short while. Reading and voting still work.');
    expect(button('Post').props.disabled).toBe(true);
  });

  it('offline: the post is kept as a draft on this phone and the screen says so', async () => {
    await openComposer();
    memory.control.setOffline(true);
    type('Title', 'An idea written on the train');
    await flush(500);
    await press('Post');
    expect(allText()).toContain('You’re offline. Your post is saved here as a draft.');
    expect(await board.loadDraft()).toMatchObject({ title: 'An idea written on the train' });
  });
});

describe('plain text, staff, progress', () => {
  it('a learner’s words are plain Text: a link-looking string stays inert', async () => {
    await board.openBoard(true);
    const r1 = await board.submitPost({ kind: 'idea', title: 'Links stay plain words here', body: 'javascript:alert(1) and https://evil.example/x', cert: 'cisa' });
    expect(r1.ok).toBe(true);
    params().id = r1.ok ? r1.id : '';
    const Post = screen('[id]');
    mount(<Post />);
    await flush();
    const bodies = r!.root.findAll((n) => n.type === Text && n.props.children === 'javascript:alert(1) and https://evil.example/x');
    expect(bodies).toHaveLength(1);
    expect(bodies[0].props.onPress).toBeUndefined();
    expect(bodies[0].props.dataDetectorType).toBeUndefined();
  });

  it('the staff queue: anyone the server doesn’t call staff is sent back to the board', async () => {
    const Mod = screen('moderation');
    mount(<Mod />);
    await flush();
    expect(mockRedirects).toContain('/board');
    expect(boardCalls()).toContain('board.isStaff');
    expect(boardCalls()).not.toContain('board.staffQueue');
  });

  it('staff see the queue, and an action goes through the server', async () => {
    backendWith({ staff: true });
    const Mod = screen('moderation');
    mount(<Mod />);
    await flush();
    expect(allText()).toContain('Question about the audit charter');
    expect(allText()).toContain('Posting: Open');
    await act(async () => {
      button('Approve').props.onPress();
    });
    await flush();
    expect(memory.control.board.log().some((l) => l.action === 'approve' && l.actorId === DEMO_USER_ID)).toBe(true);
  });

  it('board actions never touch study progress, the plant, badges or streaks', async () => {
    const before = JSON.stringify(useProgress.getState());
    await board.openBoard(true);
    await board.setVote(BOARD_POST.audio, true);
    await board.report('post', BOARD_POST.weekly, 'spam');
    await board.block('mem-m-rowan');
    await board.submitPost({ kind: 'idea', title: 'An idea that earns nothing', body: '', cert: 'cisa' });
    await board.comment(BOARD_POST.bcp, 'A comment that earns nothing');
    expect(JSON.stringify(useProgress.getState())).toBe(before);
  });
});

describe('the outbox', () => {
  it('a vote made offline waits, and goes once the phone is back online', async () => {
    await board.openBoard(true);
    memory.control.setOffline(true);
    await board.setVote(BOARD_POST.audio, true);
    const owner = sha256Hex(DEMO_USER_ID);
    expect(await outboxSize(owner)).toBe(1);
    memory.control.setOffline(false);
    await board.flushOutbox();
    expect(await outboxSize(owner)).toBe(0);
    expect(memory.control.board.votes()).toContainEqual({ postId: BOARD_POST.audio, userId: DEMO_USER_ID });
  });

  it('another learner signing in on this phone never sends the first one’s votes', async () => {
    await board.openBoard(true);
    memory.control.setOffline(true);
    await board.setVote(BOARD_POST.audio, true);
    memory.control.setOffline(false);
    await memory.auth.signOut('local');
    await memory.auth.sendEmailCode('raj@example.com');
    await memory.auth.verifyEmailCode('raj@example.com', memory.control.lastCode('raj@example.com')!);
    await board.flushOutbox();
    expect(memory.control.board.votes().some((v) => v.postId === BOARD_POST.audio && (v.userId === RAJ || v.userId === DEMO_USER_ID))).toBe(false);
  });
});

describe('notices', () => {
  it('a removal says why, who decided, and offers "Ask us to look again"; opening marks notices read', async () => {
    await board.openBoard(true);
    const Activity = screen('activity');
    mount(<Activity />);
    await flush();
    expect(allText()).toContain('We removed your comment “Here is the full question I…” because it appears to share real exam content. A person reviewed it. If you think we got it wrong, you can ask us to look again within 14 days.');
    expect(has('Ask us to look again')).toBe(true);
    expect(allText()).toContain('Waiting for review');
    await flush();
    expect(memory.control.board.notices().filter((n) => n.userId === DEMO_USER_ID).every((n) => n.read)).toBe(true);
  });
});
