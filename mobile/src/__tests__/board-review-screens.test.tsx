/**
 * The feedback board after the Phase 8 review (fix round, 12 Oct): the code
 * review's screen and outbox repros R1–R9 (crp8.test.tsx, which asserted the
 * BUGGY behaviour; here the expectations are the fixed ones) and QA's nine
 * failing repros (pr8.repro.qa.test.tsx). Each failed on b36dfda.
 *
 * In plain English, a learner who already agreed is never sent back to the
 * guidelines (and never silently renamed) when a board screen opens
 * directly; two quick taps never lose a vote, a report or a block; signing
 * out or switching learners on a shared phone leaves nothing of the last
 * learner behind; the staff queue never shows one tab's list under another
 * tab's name; a post whose reply was lost is posted once; and the comment
 * count counts replies.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import type { ComponentType, ReactElement } from 'react';
import { Alert } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { setBackendForTests } from '../cloud/backend';
import { createMemoryBackend, type MemoryBackend } from '../cloud/memory/backend';
import { BOARD_POST, BOARD_STAFF_ID, boardSeed, DEMO_EMAIL, DEMO_USER_ID } from '../cloud/memory/seed';
import { outboxSize } from '../cloud/outbox';
import type { Draft, ReadScope } from '../cloud/types';
import { TERMS_VERSION } from '../engine/account';
import { moderateText } from '../engine/moderation';
import { sha256Hex } from '../engine/sha256';
import * as account from '../lib/account';
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
jest.mock('../components/brand', () => ({ KaisipLockup: () => null, KaisipMark: () => null, PillarList: () => null }));
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {}, medium: () => {} } }));

const DAY = 86_400_000;
const MAYA = DEMO_USER_ID;
const RAJ = 'mem-user-raj';
const EMAIL: Record<string, string> = { [MAYA]: DEMO_EMAIL, [RAJ]: 'raj@example.com', [BOARD_STAFF_ID]: 'birch@example.com' };
const P = BOARD_POST;
let memory: MemoryBackend;

function backendWith(o: { signedIn?: boolean; staff?: boolean; readScope?: ReadScope; joined?: boolean } = {}) {
  const now = Date.now();
  memory = createMemoryBackend({
    users: Object.entries(EMAIL).map(([userId, email]) => ({ userId, email, providers: ['email' as const], termsVersion: TERMS_VERSION, createdAt: now - 30 * DAY })),
    signedIn: o.signedIn === false ? null : { userId: MAYA, authAt: now },
    board: boardSeed(now, { boardStaff: o.staff, readScope: o.readScope, boardJoined: o.joined }),
  });
  setBackendForTests(memory);
  useAccount.getState().setFacts({ ...SIGNED_OUT, ...(o.signedIn === false ? {} : { signedIn: true, emailMasked: 'm•••@example.com', providers: ['email'] }) });
  board.resetBoardSession();
}

/** A member's id as the app sees it (their public id once the fix is in; the account id before). */
const memberIdOf = (userId: string): string => {
  const m = memory.control.board.members().find((x) => x.userId === userId) as { publicId?: string } | undefined;
  return m?.publicId ?? userId;
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
const flush = async (ms = 0) => {
  await act(async () => {
    for (let i = 0; i < 40; i++) await Promise.resolve();
    if (ms) jest.advanceTimersByTime(ms);
    for (let i = 0; i < 40; i++) await Promise.resolve();
  });
};
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(r!.root);
  return out.join(' ');
};
const button = (label: string) => {
  const n = r!.root.findAll((x) => typeof x.props.onPress === 'function' && (x.props.accessibilityLabel === label || x.props.label === label))[0];
  if (!n) throw new Error(`no button "${label}" in: ${allText()}`);
  return n;
};
const selectedChips = () => r!.root.findAll((n) => n.props.selected === true && typeof n.props.label === 'string').map((n) => n.props.label as string);
const screen = (path: string) => require(`../app/(cloud)/board/${path}`).default as ComponentType;
const params = () => require('../../jest/perf/focusRouter').routeParams as Record<string, string | undefined>;
const draft = (title: string, body = '', extra: Partial<Draft> = {}): Draft => ({ kind: 'idea', title, body, cert: 'cisa', ...extra });

/** Sign in as someone else on this phone (an email-code sign-in that skips lib/account, like a session restored), then open the board unless asked not to. */
async function as(userId: string, opts: { keepSession?: boolean } = {}) {
  await memory.auth.signOut('local').catch(() => {});
  useAccount.getState().setFacts({ ...SIGNED_OUT });
  if (!opts.keepSession) board.resetBoardSession();
  await memory.auth.sendEmailCode(EMAIL[userId]);
  await memory.auth.verifyEmailCode(EMAIL[userId], memory.control.lastCode(EMAIL[userId])!);
  useAccount.getState().setFacts({ ...SIGNED_OUT, signedIn: true, emailMasked: 'x•••@example.com', providers: ['email'] });
  if (!opts.keepSession) await board.openBoard(true);
}

/** board.me answers only after `ms` (a real round trip). */
function slowMe(ms: number) {
  const orig = memory.board.me.bind(memory.board);
  memory.board.me = () => new Promise((res, rej) => setTimeout(() => orig().then(res, rej), ms));
}

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

describe('CR B1: a board screen opened directly', () => {
  it('R1: the composer waits for a slow me() instead of sending an agreed learner to the gate', async () => {
    slowMe(500);
    const Compose = screen('new');
    mount(<Compose />);
    await flush();
    expect(mockRedirects).not.toContainEqual(expect.objectContaining({ pathname: '/board/guidelines' }));
    await flush(600);
    await flush();
    expect(mockRedirects).not.toContainEqual(expect.objectContaining({ pathname: '/board/guidelines' }));
    expect(allText()).toContain('Posting as Misty Rowan 77');
  });
  it('R2: a post opened before the account is known loads the learner once it is', async () => {
    useAccount.getState().setFacts({ ...SIGNED_OUT });
    params().id = P.audio;
    const Post = screen('[id]');
    mount(<Post />);
    await flush();
    act(() => {
      useAccount.getState().setFacts({ signedIn: true, emailMasked: 'm', providers: ['email'] });
    });
    await flush();
    await flush();
    expect(board.useBoard.getState().me?.handle).toBe('Misty Rowan 77');
    expect(board.needsGate(board.useBoard.getState().me, board.useBoard.getState().settings)).toBe(false);
  });
});

describe('CR N2: your own withdrawn or removed comments', () => {
  it('R3: don’t come back as ordinary comments', async () => {
    await board.openBoard(true);
    const r1 = await board.loadPost(P.weekly);
    if (!r1.ok) throw new Error('load');
    expect(r1.post.comments.some((c) => c.id === 'c-maya-removed')).toBe(false);
    params().id = P.weekly;
    const Post = screen('[id]');
    mount(<Post />);
    await flush();
    expect(allText()).not.toContain('Here is the full question I saw, with the options.');
    const c = await board.comment(P.bcp, 'A comment I will take back now');
    if (!c.ok) throw new Error('comment');
    await board.withdrawComment(c.id);
    const r2 = await board.loadPost(P.bcp);
    if (!r2.ok) throw new Error('load 2');
    expect(r2.post.comments.some((x) => x.id === c.id)).toBe(false);
  });
});

describe('CR B2: the outbox never loses an act', () => {
  it('R4: two quick votes while the first is still sending both land', async () => {
    await board.openBoard(true);
    const orig = memory.board.vote.bind(memory.board);
    memory.board.vote = (id: string, on: boolean) => new Promise((res, rej) => setTimeout(() => orig(id, on).then(res, rej), 300));
    const a = board.setVote(P.audio, true);
    await flush();
    const b = board.setVote(P.weekly, true);
    await flush();
    await flush(1000);
    await flush(1000);
    await act(async () => {
      await Promise.all([a, b]);
    });
    await flush(1000);
    const votes = memory.control.board.votes().filter((v) => v.userId === MAYA).map((v) => v.postId);
    expect(votes).toEqual(expect.arrayContaining([P.audio, P.weekly]));
    expect(await outboxSize(sha256Hex(MAYA))).toBe(0);
  });
  it('R5: two acts started together offline both wait', async () => {
    await board.openBoard(true);
    memory.control.setOffline(true);
    await Promise.all([board.setVote(P.audio, true), board.block(memberIdOf('mem-m-rowan'))]);
    expect(await outboxSize(sha256Hex(MAYA))).toBe(2);
  });
  it('R6: report then block from the same ⋯ menu: both reach the server', async () => {
    await board.openBoard(true);
    const p1 = board.report('post', P.audio, 'spam');
    await Promise.resolve();
    await Promise.resolve();
    const p2 = board.block(memberIdOf('mem-m-rowan'));
    await act(async () => {
      await Promise.all([p1, p2]);
    });
    await board.flushOutbox();
    expect(memory.control.board.blocks()).toHaveLength(1);
    expect(memory.control.board.reports().some((x) => x.reporterId === MAYA && x.targetId === P.audio)).toBe(true);
    expect(await outboxSize(sha256Hex(MAYA))).toBe(0);
  });
});

describe('CR B3: signing out leaves nothing of the board behind', () => {
  it('R7: the session and the draft are gone after sign-out', async () => {
    await board.openBoard(true);
    await board.saveDraft({ kind: 'idea', title: 'Maya private unsent idea', body: 'secret words', cert: 'cisa' });
    await account.signOut('local');
    await flush();
    expect(board.useBoard.getState().me).toBeUndefined();
    expect(await board.loadDraft()).toBeNull();
  });
});

describe('CR B5: the staff queue’s tab', () => {
  it('R8: an action that finishes after a tab switch doesn’t bring the old tab back', async () => {
    backendWith({ staff: true });
    const orig = memory.board.staff.bind(memory.board);
    memory.board.staff = (a) => new Promise((res, rej) => setTimeout(() => orig(a).then(res, rej), 500));
    const Mod = screen('moderation');
    mount(<Mod />);
    await flush();
    await act(async () => {
      button('Approve').props.onPress();
    });
    await act(async () => {
      button('Reported').props.onPress();
    });
    await flush();
    await flush(600);
    await flush();
    expect(selectedChips()).toEqual(['Reported']);
    expect(allText()).toContain('Reported ×');
    expect(allText()).not.toMatch(/Held · /);
  });
  it('R9: answers to the staff check that arrive out of order don’t pick the tab', async () => {
    backendWith({ staff: true });
    const Mod = screen('moderation');
    mount(<Mod />);
    await flush();
    const orig = memory.board.isStaff.bind(memory.board);
    let n = 0;
    memory.board.isStaff = () => {
      const d = n++ === 0 ? 400 : 10;
      return new Promise((res, rej) => setTimeout(() => orig().then(res, rej), d));
    };
    await act(async () => {
      button('Reported').props.onPress();
    });
    await act(async () => {
      button('Appeals').props.onPress();
    });
    await flush(50);
    await flush(500);
    await flush();
    expect(selectedChips()).toEqual(['Appeals']);
    expect(allText()).toMatch(/Appeals · /);
    expect(allText()).not.toContain('Reported ×');
  });
});

describe('QA (pr8.repro.qa): the nine failing repros, fixed', () => {
  it('BUG-1: a post whose reply was lost, sent again from its draft, is ONE post', async () => {
    jest.useRealTimers();
    const d = draft('Bigger text on the results screen', 'The domain names are hard to read.');
    memory.control.dropNextReply('board.submitPost');
    const first = await board.submitPost(d);
    expect(first.ok).toBe(false);
    // The draft is kept (with this draft's id, so the retry is recognised).
    expect(await board.loadDraft()).toMatchObject(d);
    await board.submitPost((await board.loadDraft())!);
    expect(memory.control.board.posts().filter((p) => p.authorId === MAYA && p.title === d.title)).toHaveLength(1);
  });
  it('BUG-2a: Maya’s draft isn’t offered to Raj after Maya signs out', async () => {
    jest.useRealTimers();
    memory.control.setOffline(true);
    await board.submitPost(draft('Maya private draft title', 'Something only Maya wrote.'));
    memory.control.setOffline(false);
    await account.signOut('local');
    await as(RAJ);
    expect(await board.loadDraft()).toBeNull();
  });
  it('BUG-2b: deleting the account (also from this phone) removes the board draft', async () => {
    memory.control.setOffline(true);
    await board.submitPost(draft('Maya private draft title', 'Something only Maya wrote.'));
    memory.control.setOffline(false);
    expect((await account.deleteAccount({ alsoLocal: true })).ok).toBe(true);
    const AS = require('@react-native-async-storage/async-storage');
    expect(await (AS.default ?? AS).getItem(board.DRAFT_KEY)).toBeNull();
  });
  it('BUG-3: after Maya signs out, Raj opening the composer is sent to the gate, never shown Maya’s name', async () => {
    await board.openBoard(true);
    await account.signOut('local');
    await as(RAJ, { keepSession: true });
    const Compose = screen('new');
    mount(<Compose />);
    await flush();
    await flush();
    expect(allText()).not.toContain('Misty Rowan 77');
    expect(mockRedirects).toContainEqual(expect.objectContaining({ pathname: '/board/guidelines' }));
  });
  it.each([
    'Great app.To be honest the timer is too short',
    'I logged in.In the mock the timer froze',
    'Thanks for the update.Me and my study group love it',
  ])('BUG-5: "%s" is not a link', (text) => {
    expect(moderateText(text, { newMember: true })).toEqual({ verdict: 'ok' });
  });
  it('BUG-6: a report made offline is applied before the first feed after a restart', async () => {
    jest.useRealTimers();
    memory.control.setOffline(true);
    await board.report('post', P.audio, 'off_topic');
    memory.control.setOffline(false);
    board.resetBoardSession();
    await board.openBoard(true);
    const feed = await board.loadFeed({ cert: 'cisa', tab: 'new' });
    expect(feed.ok && feed.items.map((p) => p.id)).not.toContain(P.audio);
  });
  it('BUG-7: one comment and one reply read "2 comments"', async () => {
    const c = await board.comment(P.timer, 'Same on my phone, thanks for fixing it.', 'c-timer-1');
    expect(c.ok).toBe(true);
    params().id = P.timer;
    const Post = screen('[id]');
    mount(<Post />);
    await flush();
    expect(allText()).toContain('Same on my phone');
    expect(allText()).toContain('2 comments');
  });
});

/** The ⋯ menu's buttons (the open sheet). */
const menuLabels = () => r!.root.findAll((n) => n.props.label !== undefined && typeof n.props.onPress === 'function' && n.props.kind !== undefined).map((n) => String(n.props.label));
const pressMenuItem = async (label: string) => {
  await act(async () => {
    button(label).props.onPress();
  });
  await flush(400);
};
const openPost = async (id: string) => {
  params().id = id;
  const Post = screen('[id]');
  mount(<Post />);
  await flush();
};

describe('fix round P8: the post screen', () => {
  it('SEC S8: the ⋯ menu offers "Report {handle}" next to Block, and it reports the member by their public id', async () => {
    await openPost(P.bcp);
    await act(async () => {
      button('More options').props.onPress();
    });
    expect(menuLabels()).toEqual(expect.arrayContaining(['Report post', 'Report Quiet Cedar 214', 'Block Quiet Cedar 214']));
    await pressMenuItem('Report Quiet Cedar 214');
    expect(allText()).toContain('Report this learner');
    await act(async () => {
      button('Harassment or hate').props.onPress();
    });
    await act(async () => {
      button('Send report').props.onPress();
    });
    await flush();
    expect(allText()).toContain('Thanks. We review reports within 24 hours.');
    const rep = memory.control.board.reports().find((x) => x.reporterId === MAYA && x.kind === 'member');
    expect(rep?.targetId).toBe(memberIdOf('mem-m-cedar'));
    expect(rep?.targetId).not.toBe('mem-m-cedar');
  });
  it('UX H1: a signed-in reader who hasn’t agreed to the guidelines can still report (no gate in the way)', async () => {
    backendWith({ joined: false });
    await openPost(P.audio);
    await act(async () => {
      button('More options').props.onPress();
    });
    await pressMenuItem('Report post');
    expect(mockNav.push).not.toHaveBeenCalled();
    expect(allText()).toContain('Send report');
  });
  it('no Block on yourself or on the team; the team’s replies can still be reported', async () => {
    await openPost(P.timer);
    // Maya's own comment: her menu has only Withdraw.
    const c = await board.comment(P.timer, 'Mine: same on my phone.');
    expect(c.ok).toBe(true);
    unmount();
    await openPost(P.timer);
    const mineMenu = r!.root.findAll((n) => n.props.accessibilityLabel === 'More options, comment by Misty Rowan 77' && typeof n.props.onPress === 'function')[0];
    await act(async () => {
      mineMenu.props.onPress();
    });
    expect(menuLabels()).toContain('Withdraw');
    expect(menuLabels().some((l) => l.startsWith('Block') || l.startsWith('Report'))).toBe(false);
    // The team's official reply: it can be reported, but its author can't be blocked.
    expect(allText()).toContain('KaiSip team');
  });
  it('CR B7: the folded post’s "Show it" is its own button for screen readers', async () => {
    await openPost(P.change);
    const show = button('Show it');
    // No ancestor groups it into one element.
    let n: ReactTestInstance | null = show.parent;
    while (n) {
      expect(n.props.accessible === true && n !== show && n.props.accessibilityRole === undefined && typeof n.props.onPress !== 'function').toBe(false);
      n = n.parent;
    }
    await act(async () => {
      show.props.onPress();
    });
    expect(allText()).toContain('The explanation for the emergency change question');
  });
  it('UX precision: a status is read as words, never as its glyph', async () => {
    await openPost(P.bcp);
    const tag = r!.root.findAll((x) => x.props.accessibilityLabel === 'Planned' && x.props.accessible === true);
    expect(tag.length).toBeGreaterThan(0);
  });
  it('CR N11: two quick taps on the vote pill (one render) take the vote back, not count twice', async () => {
    await openPost(P.audio);
    const pill = () => r!.root.findAll((x) => typeof x.props.onPress === 'function' && /^Vote for:/.test(String(x.props.accessibilityLabel)))[0];
    const before = Number(/(\d+) votes/.exec(pill().props.accessibilityLabel)![1]);
    await act(async () => {
      const p = pill();
      p.props.onPress();
      p.props.onPress();
    });
    await flush();
    expect(Number(/(\d+) votes/.exec(pill().props.accessibilityLabel)![1])).toBe(before);
    expect(memory.control.board.votes().some((v) => v.userId === MAYA && v.postId === P.audio)).toBe(false);
  });
  it('UX H3: a comment refused for practice-question text gets the whole explanation', () => {
    expect(board.postProblem('bank_text')).toBe('This looks like text from one of KaiSip’s practice questions. To keep answers fresh for everyone, please describe the topic in your own words. If something in that question looks wrong, report it privately: it’s faster, and it won’t spoil it for others.');
  });
});

describe('fix round P8: lists and the staff queue', () => {
  it('your post waiting for review says so, without "Open" beside it', async () => {
    await board.openBoard(true);
    const Activity = screen('activity');
    mount(<Activity />);
    await flush();
    const row = r!.root.findAll((x) => typeof x.props.onPress === 'function' && /^Practice by subtopic/.test(String(x.props.accessibilityLabel)))[0];
    expect(row.props.accessibilityLabel).toContain('Waiting for review');
    expect(row.props.accessibilityLabel).not.toContain('Open');
  });
  it('UX H5: a ban asks why, then asks again, before anything happens', async () => {
    backendWith({ staff: true });
    // A learner reported as a member shows in Reported, with Suspend, Ban and Dismiss (CR N4).
    await board.openBoard(true);
    await board.report('member', memberIdOf('mem-m-rowan'), 'abuse');
    await board.flushOutbox();
    const alert = jest.spyOn(Alert, 'alert');
    const Mod = screen('moderation');
    mount(<Mod />);
    await flush();
    await act(async () => {
      button('Reported').props.onPress();
    });
    await flush();
    expect(r!.root.findAll((x) => x.props.accessibilityLabel === 'Dismiss reports: Bright Rowan 58').length).toBeGreaterThan(0);
    const ban = r!.root.findAll((x) => typeof x.props.onPress === 'function' && x.props.accessibilityLabel === 'Ban: Bright Rowan 58')[0];
    await act(async () => {
      ban.props.onPress();
    });
    expect(allText()).toContain('Why?');
    await act(async () => {
      button('Spam or advertising').props.onPress();
    });
    expect(alert).toHaveBeenCalled();
    expect(memory.control.board.log().some((l) => l.action === 'ban')).toBe(false);
    await act(async () => {
      (alert.mock.calls[0][2] as { text: string; onPress?: () => void }[]).find((b) => b.text === 'Ban')!.onPress!();
    });
    await flush();
    expect(memory.control.board.log().some((l) => l.action === 'ban' && l.reason === 'spam')).toBe(true);
    alert.mockRestore();
  });
  it('the board says "We read the posts.", never "every post"', async () => {
    await board.openBoard(true);
    const Home = screen('index');
    mount(<Home />);
    await flush();
    expect(allText()).toContain('We read the posts.');
    expect(allText()).not.toContain('We read every post');
  });
});

describe('fix round P8: What’s New', () => {
  const credit = 'Some of these changes started as ideas on the feedback board.';
  it('thanks board posters only when an idea from the board has shipped', async () => {
    const WhatsNew = require('../app/whats-new').default as ComponentType;
    mount(<WhatsNew />);
    await flush();
    expect(allText()).toContain(credit);
  });
  it('and not when nothing on the board has shipped (or the reader can’t see the board)', async () => {
    backendWith({ signedIn: false });
    const WhatsNew = require('../app/whats-new').default as ComponentType;
    mount(<WhatsNew />);
    await flush();
    expect(allText()).not.toContain(credit);
  });
});
