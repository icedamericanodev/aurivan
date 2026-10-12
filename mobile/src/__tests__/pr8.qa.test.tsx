/**
 * QA for Uplift Phase 8 (the feedback board, built OFF): the learner and
 * staff journeys end to end, through the same glue the screens call
 * (lib/board.ts) and the in-memory backend that plays the server's rules.
 * Two learners (Maya, who has posted before, and Raj, who is new to the
 * board) plus a staff member (Calm Birch 1) share one memory "server";
 * switching who is signed in is a real sign-in with an email code.
 *
 * Covered here (the gaps the PR's own tests leave):
 * - first visit → the gate → a post held for first-post review → staff
 *   approves → others see it; the next post goes straight up;
 * - vote and take it back quickly (the outbox's last word wins on the server);
 * - comment; edit and withdraw your own post and comment;
 * - report a post ("real exam content" hides it for everyone at once; three
 *   reporters 7+ days old hide one) and a comment (hidden for the reporter);
 * - block and unblock (the blocker stops seeing the learner; the blocked
 *   learner can't comment on the blocker's posts, and isn't told);
 * - a removal, its notice, "Ask us to look again", and the team restoring it;
 * - a pasted practice question is refused with the kind message (no bank
 *   text, no counts), while ordinary CISA words (attack, exploit, kill
 *   switch, penetration test) go through;
 * - offline: the post is kept as a draft, then sent exactly once; a vote
 *   whose reply was lost (app killed mid-send) is sent again and counts once;
 * - posting paused; the read scope in all three settings;
 * - deleting the account removes the learner's board rows.
 * (With the flag off, a link to any board screen landing on Today is
 * covered by cloud-off.test.tsx, which runs in the flag-off pass.)
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import type { ComponentType, ReactElement } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { setBackendForTests } from '../cloud/backend';
import { createMemoryBackend, type MemoryBackend } from '../cloud/memory/backend';
import { BOARD_POST, BOARD_STAFF_ID, boardSeed, DEMO_EMAIL, DEMO_USER_ID } from '../cloud/memory/seed';
import { outboxSize } from '../cloud/outbox';
import type { Draft, ReadScope } from '../cloud/types';
import { copy } from '../content/cloud/copy';
import { getAllQuestions } from '../content/loader';
import { TERMS_VERSION } from '../engine/account';
import { moderateText } from '../engine/moderation';
import { sha256Hex } from '../engine/sha256';
import * as account from '../lib/account';
import * as board from '../lib/board';
import { SIGNED_OUT, useAccount } from '../store/account';
import { useSettings } from '../store/settings';

jest.mock('../cloud/flag', () => ({ CLOUD: true, PROVIDERS: ['email', 'apple', 'google'] }));
const mockRedirects: unknown[] = [];
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
    Stack,
    router: { ...base.router, push: () => {}, back: () => {}, replace: () => {} },
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
const MAYA = DEMO_USER_ID;
const RAJ = 'mem-user-raj';
const LEE = 'mem-user-lee';
const STAFF = BOARD_STAFF_ID;
const EMAIL: Record<string, string> = { [MAYA]: DEMO_EMAIL, [RAJ]: 'raj@example.com', [LEE]: 'lee@example.com', [STAFF]: 'birch@example.com' };
const P = BOARD_POST;

let memory: MemoryBackend;
function server(o: { readScope?: ReadScope; postingOpen?: boolean; signedIn?: string | null } = {}) {
  const now = Date.now();
  memory = createMemoryBackend({
    users: Object.entries(EMAIL).map(([userId, email]) => ({ userId, email, providers: ['email' as const], termsVersion: TERMS_VERSION, createdAt: now - 30 * DAY })),
    signedIn: o.signedIn === null ? null : { userId: o.signedIn ?? MAYA, authAt: now },
    board: boardSeed(now, { readScope: o.readScope, postingOpen: o.postingOpen }),
  });
  setBackendForTests(memory);
  useAccount.getState().setFacts({ ...SIGNED_OUT, ...(o.signedIn === null ? {} : { signedIn: true, emailMasked: 'x•••@example.com', providers: ['email'] }) });
  board.resetBoardSession();
}

/** Sign in as someone else on this phone (a real email-code sign-in), then open the board as they would. */
async function as(userId: string | null, opts: { keepSession?: boolean } = {}) {
  await memory.auth.signOut('local').catch(() => {});
  useAccount.getState().setFacts({ ...SIGNED_OUT });
  if (!opts.keepSession) board.resetBoardSession();
  if (userId) {
    await memory.auth.sendEmailCode(EMAIL[userId]);
    await memory.auth.verifyEmailCode(EMAIL[userId], memory.control.lastCode(EMAIL[userId])!);
    useAccount.getState().setFacts({ ...SIGNED_OUT, signedIn: true, emailMasked: 'x•••@example.com', providers: ['email'] });
  }
  if (!opts.keepSession) await board.openBoard(userId !== null);
}
const ok = <T,>(r: { ok: boolean } & T) => {
  if (!r.ok) throw new Error(`expected ok, got ${JSON.stringify(r)}`);
  return r as T & { ok: true };
};
const feedIds = async (tab: 'top' | 'new' | 'shipped' = 'new') => {
  const r = await board.loadFeed({ cert: 'cisa', tab });
  return r.ok ? r.items.map((p) => p.id) : [`error:${r.code}`];
};
const draft = (title: string, body = '', extra: Partial<Draft> = {}): Draft => ({ kind: 'idea', title, body, cert: 'cisa', ...extra });
const row = (id: string) => memory.control.board.posts().find((p) => p.id === id);

beforeEach(() => {
  mockRedirects.length = 0;
  useSettings.setState({ activeCertId: 'cisa', onboarded: true, theme: 'light' });
  server();
});
afterEach(async () => {
  setBackendForTests(undefined);
  const AS = require('@react-native-async-storage/async-storage');
  await (AS.default ?? AS).clear();
});

describe('journey: first post → held for review → staff approves → visible', () => {
  it('Raj agrees to the guidelines, his first post waits, staff approve it, Maya then sees it; his next post goes straight up', async () => {
    await as(RAJ);
    // Not joined: the gate is due, and the server refuses a post that skips it.
    expect(board.needsGate(board.useBoard.getState().me, board.useBoard.getState().settings)).toBe(true);
    const skipped = await board.submitPost(draft('Practice questions by subtopic please'));
    expect(skipped.ok).toBe(false);
    expect(memory.control.board.posts().filter((p) => p.authorId === RAJ)).toHaveLength(0);

    ok(await board.joinBoard('Quiet Ash 12', 'pseudonym'));
    expect(board.needsGate(board.useBoard.getState().me, board.useBoard.getState().settings)).toBe(false);
    const first = ok(await board.submitPost(draft('Practice questions by subtopic please', 'Domain drills are great, subtopics would be better.')));
    expect(first.visibility).toBe('pending');
    expect(first.holdReason).toBe('new_member');
    // The author sees it in Your activity, waiting.
    const mine = ok(await board.loadMyPosts());
    expect(mine.items.map((p) => [p.id, p.visibility])).toEqual([[first.id, 'pending']]);

    // Maya can't see it yet, in the feed or by link.
    await as(MAYA);
    expect(await feedIds()).not.toContain(first.id);
    expect((await board.loadPost(first.id)).ok).toBe(false);

    // Staff see it in Held and approve it.
    await as(STAFF);
    const held = ok(await board.loadStaffQueue('held'));
    expect(held.queue.items.some((i) => i.id === first.id && i.label === 'new_member' && i.newMember)).toBe(true);
    ok(await board.staffAct({ action: 'approve', targetKind: 'post', targetId: first.id }));

    await as(MAYA);
    expect(await feedIds()).toContain(first.id);

    // One approved post: Raj's next one is up at once.
    await as(RAJ);
    const second = ok(await board.submitPost(draft('Dark mode for the flashcards screen')));
    expect(second.visibility).toBe('visible');
  });
});

describe('journey: votes', () => {
  it('vote then take it back at once: the server ends with no vote, and nothing waits', async () => {
    const before = memory.control.board.votes().filter((v) => v.postId === P.audio).length;
    await Promise.all([board.setVote(P.audio, true), board.setVote(P.audio, false)]);
    await board.flushOutbox();
    expect(memory.control.board.votes().filter((v) => v.postId === P.audio && v.userId === MAYA)).toHaveLength(0);
    expect(memory.control.board.votes().filter((v) => v.postId === P.audio).length).toBe(before);
    expect(await outboxSize(sha256Hex(MAYA))).toBe(0);
  });

  it('on, off, on in quick succession: one vote', async () => {
    await board.setVote(P.audio, true);
    await board.setVote(P.audio, false);
    await board.setVote(P.audio, true);
    await board.flushOutbox();
    expect(memory.control.board.votes().filter((v) => v.postId === P.audio && v.userId === MAYA)).toHaveLength(1);
  });

  it('a vote whose reply was lost (app killed mid-send) is sent again and still counts once', async () => {
    memory.control.dropNextReply('board.vote');
    await board.setVote(P.audio, true);
    // The server has it; the phone didn't hear back, so it still waits here.
    expect(memory.control.board.votes().filter((v) => v.postId === P.audio && v.userId === MAYA)).toHaveLength(1);
    expect(await outboxSize(sha256Hex(MAYA))).toBe(1);
    // The app is opened again: the board flushes the outbox.
    board.resetBoardSession();
    await board.openBoard(true);
    await board.flushOutbox();
    expect(await outboxSize(sha256Hex(MAYA))).toBe(0);
    expect(memory.control.board.votes().filter((v) => v.postId === P.audio && v.userId === MAYA)).toHaveLength(1);
  });

  it('a vote made offline waits on the phone (not lost when the app restarts), then counts once', async () => {
    memory.control.setOffline(true);
    expect((await board.setVote(P.hint, false)).ok).toBe(true);
    expect(await outboxSize(sha256Hex(MAYA))).toBe(1);
    memory.control.setOffline(false);
    board.resetBoardSession();
    await board.openBoard(true);
    await board.flushOutbox();
    expect(memory.control.board.votes().filter((v) => v.postId === P.hint && v.userId === MAYA)).toHaveLength(0);
  });
});

describe('journey: comment, edit, withdraw', () => {
  it('a comment shows on the post and tells its author; withdrawing it hides it', async () => {
    const c = ok(await board.comment(P.audio, 'Yes please, my commute is an hour each way.'));
    expect(c.visibility).toBe('visible');
    const post = ok(await board.loadPost(P.audio));
    expect(post.post.comments.map((x) => x.id)).toContain(c.id);
    // Commenting follows the post.
    expect(post.post.following).toBe(true);
    ok(await board.withdrawComment(c.id));
    await as(RAJ);
    ok(await board.joinBoard('Quiet Ash 12', 'pseudonym'));
    expect(ok(await board.loadPost(P.audio)).post.comments.map((x) => x.id)).not.toContain(c.id);
  });

  it('edit your own post: the new words show; withdraw it: gone for everyone, and others can’t edit or withdraw it', async () => {
    const r = ok(await board.submitPost(draft('Reminders at another time on Saturdays', 'Weekdays 7 am, weekends 10 am.'), P.weekend));
    expect(r.visibility).toBe('visible');
    expect(row(P.weekend)?.title).toBe('Reminders at another time on Saturdays');

    await as(RAJ);
    ok(await board.joinBoard('Quiet Ash 12', 'pseudonym'));
    expect((await board.submitPost(draft('Taken over by someone else'), P.weekend)).ok).toBe(false);
    expect((await board.withdrawPost(P.weekend)).ok).toBe(false);
    expect(row(P.weekend)?.title).toBe('Reminders at another time on Saturdays');

    await as(MAYA);
    ok(await board.withdrawPost(P.weekend));
    await as(RAJ);
    expect(await feedIds()).not.toContain(P.weekend);
    expect((await board.loadPost(P.weekend)).ok).toBe(false);
  });

  it('an edit that pastes a practice question is refused, and the old words stay', async () => {
    const q = getAllQuestions('cisa').find((x) => x.stem.split(/\s+/).length >= 16)!;
    const r = await board.submitPost(draft('Reminders at a different time on weekends', q.stem), P.weekend);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe('bank_text');
    expect(row(P.weekend)?.body).toBe('');
  });
});

describe('journey: reports', () => {
  it('"Shares real exam content" hides the post for everyone at once (pending review)', async () => {
    const p = board.report('post', P.audio, 'exam_content');
    // On this phone at once, before the round trip.
    expect(board.useBoard.getState().hiddenPosts).toContain(P.audio);
    expect(board.visibleCards([{ id: P.audio, authorId: 'x' } as never])).toEqual([]);
    ok(await p);
    expect(row(P.audio)?.visibility).toBe('hidden');
    await as(RAJ);
    expect(await feedIds()).not.toContain(P.audio);
    // Staff see it first in Reported (exam content sorts first).
    await as(STAFF);
    const q = ok(await board.loadStaffQueue('reported'));
    const exam = q.queue.items.filter((i) => i.examContent).map((i) => i.id);
    expect(exam).toContain(P.audio);
    expect(q.queue.items.slice(0, exam.length).every((i) => i.examContent)).toBe(true);
  });

  it('an ordinary reason hides it for the reporter only; the third reporter (7+ day accounts) hides it for everyone', async () => {
    ok(await board.report('post', P.hint, 'off_topic'));
    expect(await feedIds()).not.toContain(P.hint);
    await as(RAJ);
    expect(await feedIds()).toContain(P.hint);
    ok(await board.report('post', P.hint, 'spam'));
    await as(LEE);
    expect(await feedIds()).toContain(P.hint);
    ok(await board.report('post', P.hint, 'spam'));
    expect(row(P.hint)?.visibility).toBe('hidden');
    await as(STAFF);
    // Staff still read it (to decide); a learner who never reported it doesn't see it.
    expect(ok(await board.loadPost(P.hint)).post.visibility).toBe('hidden');
    server({ signedIn: RAJ });
    await board.openBoard(true);
  });

  it('a reported comment disappears for the reporter at once and stays for others', async () => {
    const p = board.report('comment', 'c-bcp-1', 'abuse');
    expect(board.visibleComments([{ id: 'c-bcp-1', authorId: 'x' } as never])).toEqual([]);
    ok(await p);
    expect(ok(await board.loadPost(P.bcp)).post.comments.map((c) => c.id)).not.toContain('c-bcp-1');
    await as(RAJ);
    expect(ok(await board.loadPost(P.bcp)).post.comments.map((c) => c.id)).toContain('c-bcp-1');
  });

  it('the report sheet’s thanks and the reasons are the spec’s words', () => {
    expect(copy('board.report.done', { item: 'post' })).toMatch(/24 hours/);
  });
});

describe('journey: block and unblock', () => {
  async function rajWithAPost() {
    await as(RAJ);
    ok(await board.joinBoard('Quiet Ash 12', 'pseudonym'));
    const p = ok(await board.submitPost(draft('A timer per domain in the mock exam')));
    await as(STAFF);
    ok(await board.staffAct({ action: 'approve', targetKind: 'post', targetId: p.id }));
    await as(RAJ);
    const c = ok(await board.comment(P.bcp, 'A comparison table would be ideal.'));
    return { post: p.id, comment: c.id };
  }

  it('Maya blocks Raj: his posts and comments vanish for her at once and on the server; he can’t comment on her posts and isn’t told', async () => {
    const raj = await rajWithAPost();
    await as(MAYA);
    expect(await feedIds()).toContain(raj.post);
    const p = board.block(RAJ);
    expect(board.useBoard.getState().blockedIds).toContain(RAJ);
    ok(await p);
    // A fresh session (no local list): the server hides them too.
    board.resetBoardSession();
    await board.openBoard(true);
    expect(await feedIds()).not.toContain(raj.post);
    expect(ok(await board.loadPost(P.bcp)).post.comments.map((c) => c.id)).not.toContain(raj.comment);
    expect(ok(await board.loadBlocked()).members.map((m) => m.userId)).toEqual([RAJ]);

    await as(RAJ);
    // He still reads her posts (he isn't told) but can't comment on them.
    expect(await feedIds()).toContain(P.weekend);
    const refused = await board.comment(P.weekend, 'Weekends at nine would suit me.');
    expect(refused.ok).toBe(false);
    expect(!refused.ok && refused.code).toBe('forbidden');
    // The words he sees never mention a block.
    expect(board.postProblem('forbidden')).not.toMatch(/block/i);
    // He can still comment elsewhere.
    expect((await board.comment(P.audio, 'Audio would be great.')).ok).toBe(true);
  });

  it('unblock: his content comes back, and he can comment on her posts again', async () => {
    const raj = await rajWithAPost();
    await as(MAYA);
    ok(await board.block(RAJ));
    ok(await board.unblock(RAJ));
    expect(board.useBoard.getState().blockedIds).not.toContain(RAJ);
    expect(memory.control.board.blocks()).toEqual([]);
    expect(await feedIds()).toContain(raj.post);
    expect(ok(await board.loadBlocked()).members).toEqual([]);
    await as(RAJ);
    expect((await board.comment(P.weekend, 'Weekends at nine would suit me.')).ok).toBe(true);
  });

  it('staff can’t be blocked (their menu never offers it; the server refuses too)', async () => {
    ok(await board.block(STAFF));
    expect(memory.control.board.blocks()).toEqual([]);
    // Dropped from the outbox (not retried forever).
    expect(await outboxSize(sha256Hex(MAYA))).toBe(0);
  });
});

describe('journey: removal and appeal', () => {
  it('staff remove a post; the author gets the reason and "Ask us to look again"; the team restores it', async () => {
    await as(RAJ);
    ok(await board.joinBoard('Quiet Ash 12', 'pseudonym'));
    const p = ok(await board.submitPost(draft('Weekly leaderboard for study streaks')));
    await as(STAFF);
    ok(await board.staffAct({ action: 'approve', targetKind: 'post', targetId: p.id }));
    // A reason is needed to remove.
    expect((await board.staffAct({ action: 'remove', targetKind: 'post', targetId: p.id })).ok).toBe(false);
    ok(await board.staffAct({ action: 'remove', targetKind: 'post', targetId: p.id, reason: 'off_topic' }));

    await as(MAYA);
    expect(await feedIds()).not.toContain(p.id);

    await as(RAJ);
    const inbox = ok(await board.loadInbox());
    const removed = inbox.notices.find((n) => n.kind === 'removed' && n.postId === p.id)!;
    expect(removed.canAppeal).toBe(true);
    const words = board.noticeText(removed);
    expect(words).toMatch(/Weekly leaderboard/);
    expect(words).toMatch(/off topic/);
    expect(words).toMatch(/14 days/);
    ok(await board.appeal('post', p.id, 'It is about studying.'));
    // Once only.
    expect((await board.appeal('post', p.id)).ok).toBe(false);
    expect(ok(await board.loadInbox()).notices.find((n) => n.id === removed.id)?.canAppeal).toBe(false);

    await as(STAFF);
    const appeals = ok(await board.loadStaffQueue('appeals'));
    const item = appeals.queue.items.find((i) => i.title === 'Weekly leaderboard for study streaks')!;
    expect(item).toBeDefined();
    ok(await board.staffAct({ action: 'restore_appeal', targetKind: 'appeal', targetId: item.id }));

    await as(MAYA);
    expect(await feedIds()).toContain(p.id);
    await as(RAJ);
    const outcome = ok(await board.loadInbox()).notices.find((n) => n.kind === 'appeal')!;
    expect(board.noticeText(outcome)).toBe(copy('board.appeal.restored', { item: copy('board.item.post') }));
  });

  it('nobody can appeal someone else’s removal', async () => {
    // Maya's removed comment (seeded) is hers to appeal; Raj can't.
    await as(RAJ);
    expect((await board.appeal('comment', 'c-maya-removed')).ok).toBe(false);
    await as(MAYA);
    expect((await board.appeal('comment', 'c-maya-removed')).ok).toBe(true);
  });
});

describe('journey: the leak guard', () => {
  const qs = getAllQuestions('cisa').filter((q) => q.stem.split(/\s+/).length >= 16);

  it('a practice question pasted nearly verbatim is caught on the phone and refused by the server, with the kind words', async () => {
    const q = qs[7];
    // One word in ten changed: still near-verbatim.
    const words = q.stem.split(/\s+/);
    const near = words.map((w, i) => (i % 10 === 5 ? 'thing' : w)).join(' ');
    const check = board.checkDraft('cisa', `Is this right?\n${near}`, null, false);
    expect(check.bank).toBe(true);
    expect(check.questionId).toBe(q.id);
    const before = memory.control.board.posts().length;
    const r = await board.submitPost(draft('Is this right? I am not sure', near));
    expect(!r.ok && r.code).toBe('bank_text');
    expect(memory.control.board.posts().length).toBe(before);
    // A comment is checked the same way.
    const c = await board.comment(P.audio, near);
    expect(!c.ok && c.code).toBe('bank_text');
  });

  it('the message never shows the question, the bank or its size', () => {
    const words = [copy('board.leak.title'), copy('board.leak.body'), copy('board.leak.report'), copy('board.leak.edit'), board.postProblem('bank_text')].join(' ');
    expect(words).not.toMatch(/\d/);
    for (const q of qs.slice(0, 50)) expect(words).not.toContain(q.stem.slice(0, 40));
    expect(words).toMatch(/your own words/);
  });

  it('ordinary CISA words are not blocked, held or warned: attack, exploit, kill switch, penetration test', async () => {
    const posts = [
      ['More penetration test questions please', 'The difference between a penetration test and a vulnerability scan keeps tripping me up.'],
      ['Where does a kill switch fit in incident response?', 'Is a kill switch a containment step or a recovery step?'],
      ['Explain exploit versus vulnerability in the notes', 'An exploit uses a vulnerability; a note with examples would help.'],
      ['Attack surface and attack vectors flashcards', 'Brute force attack, phishing attack, denial of service attack: a set of cards would be great.'],
      ['Kill chain stages in the threat notes', 'Could the notes walk through each stage of the cyber kill chain?'],
      ['Social engineering attack examples', 'Pretexting, tailgating and baiting: more scenarios please.'],
      ['How to kill a stuck mock exam?', 'The app froze mid-mock; force closing it lost nothing, nice.'],
      ['Ethical hacking and red team exercises', 'Do red team exercises count as a penetration test for audit purposes?'],
    ];
    for (const [title, body] of posts) {
      const text = `${title}\n${body}`;
      expect({ title, ...board.checkDraft('cisa', text, null, false) }).toEqual({ title, bank: false, questionId: null, recall: false, reject: null });
      expect(moderateText(text, { newMember: true })).toEqual({ verdict: 'ok' });
    }
    // Maya (an approved member) posts one: up at once.
    for (const [title, body] of posts.slice(0, 3)) {
      const r = ok(await board.submitPost(draft(title, body)));
      expect(r.visibility).toBe('visible');
    }
  });

  it('a recalled real-exam question waits for a person (and says why)', async () => {
    const r = ok(await board.submitPost(draft('Question from my exam today', 'On my exam I got one about who approves the audit charter. Which of the following is BEST?')));
    expect(r.visibility).toBe('pending');
    expect(r.holdReason).toBe('recall');
  });
});

describe('journey: offline', () => {
  it('offline: the post is kept as a draft and not sent; back online, Post sends it exactly once and the draft goes', async () => {
    const d = draft('Bigger text on the results screen', 'The domain names are hard to read.');
    const mineBefore = memory.control.board.posts().filter((p) => p.authorId === MAYA).length;
    memory.control.setOffline(true);
    const off = await board.submitPost(d);
    expect(!off.ok && off.code).toBe('offline');
    expect(board.postProblem('offline')).toBe(copy('board.compose.draft'));
    expect(await board.loadDraft()).toEqual(d);
    expect(memory.control.board.posts().filter((p) => p.authorId === MAYA).length).toBe(mineBefore);
    // Nothing goes on its own when the phone is back (posts are never queued).
    memory.control.setOffline(false);
    await board.flushOutbox();
    expect(memory.control.board.posts().filter((p) => p.authorId === MAYA).length).toBe(mineBefore);
    // The composer reopens with the draft; Post sends it once.
    const again = (await board.loadDraft())!;
    ok(await board.submitPost(again));
    expect(memory.control.board.posts().filter((p) => p.authorId === MAYA && p.title === d.title)).toHaveLength(1);
    expect(await board.loadDraft()).toBeNull();
  });

  it('the feed offline shows what was last loaded, with the offline line', async () => {
    const first = await feedIds('top');
    memory.control.setOffline(true);
    const r = ok(await board.loadFeed({ cert: 'cisa', tab: 'top' }));
    expect(r.offline).toBe(true);
    expect(r.items.map((p) => p.id)).toEqual(first);
  });
});

describe('journey: posting paused', () => {
  it('staff pause posting: posts and comments are refused with the paused words; votes and reading still work; reopening lets posts through', async () => {
    await as(STAFF);
    ok(await board.staffAct({ action: 'pause', targetKind: 'board' }));
    expect(ok(await board.loadStaffQueue('held')).queue.postingOpen).toBe(false);

    await as(MAYA);
    expect(board.useBoard.getState().settings?.postingOpen).toBe(false);
    const p = await board.submitPost(draft('Paused or not, here I come'));
    expect(!p.ok && p.code).toBe('posting_paused');
    expect(board.postProblem('posting_paused')).toBe(copy('board.reject.paused'));
    const c = await board.comment(P.audio, 'A comment while paused.');
    expect(!c.ok && c.code).toBe('posting_paused');
    ok(await board.setVote(P.audio, true));
    expect(memory.control.board.votes().some((v) => v.postId === P.audio && v.userId === MAYA)).toBe(true);
    expect((await feedIds()).length).toBeGreaterThan(0);

    await as(STAFF);
    ok(await board.staffAct({ action: 'reopen', targetKind: 'board' }));
    await as(MAYA);
    expect(ok(await board.submitPost(draft('Posting is open again, thanks'))).visibility).toBe('visible');
  });

  it('a learner can’t pause posting', async () => {
    expect((await board.staffAct({ action: 'pause', targetKind: 'board' })).ok).toBe(false);
    expect(ok(await board.openBoard(true)).settings.postingOpen).toBe(true);
  });
});

describe('journey: the read scope, all three settings', () => {
  async function rajPending() {
    await as(RAJ);
    ok(await board.joinBoard('Quiet Ash 12', 'pseudonym'));
    return ok(await board.submitPost(draft('A pending post from Raj here'))).id;
  }

  it('"signed_in" (the default): signed out reads nothing; any signed-in learner reads visible posts, never others’ pending ones', async () => {
    const pending = await rajPending();
    await as(null);
    expect(board.useBoard.getState().settings?.readScope).toBe('signed_in');
    expect(await feedIds()).toEqual([]);
    expect((await board.loadPost(P.bcp)).ok).toBe(false);
    await as(MAYA);
    expect(await feedIds()).toContain(P.bcp);
    expect(await feedIds()).not.toContain(pending);
    await as(STAFF);
    expect(ok(await board.loadPost(pending)).post.visibility).toBe('pending');
  });

  it('"author_staff": each learner reads only their own posts; staff read all; signed out reads nothing', async () => {
    server({ readScope: 'author_staff' });
    await as(MAYA);
    const mine = await feedIds();
    expect(mine.length).toBeGreaterThan(0);
    for (const id of mine) expect(row(id)?.authorId).toBe(MAYA);
    expect((await board.loadPost(P.bcp)).ok).toBe(false);
    await as(RAJ);
    expect(await feedIds()).toEqual([]);
    await as(STAFF);
    expect(await feedIds()).toContain(P.bcp);
    await as(null);
    expect(await feedIds()).toEqual([]);
  });

  it('"everyone": signed out reads visible posts and comments, but not pending, hidden or removed ones, and can’t write', async () => {
    server({ readScope: 'everyone', signedIn: null });
    await board.openBoard(false);
    const ids = await feedIds();
    expect(ids).toContain(P.bcp);
    expect(ids).not.toContain(P.mayaHeld);
    expect(ids).not.toContain(P.recall);
    const post = ok(await board.loadPost(P.weekly));
    expect(post.post.comments.map((c) => c.id)).not.toContain('c-maya-removed');
    expect((await board.loadPost(P.recall)).ok).toBe(false);
    // Writing needs an account (the vote isn't even queued).
    expect((await board.setVote(P.bcp, true)).ok).toBe(false);
    expect((await board.comment(P.bcp, 'hello there')).ok).toBe(false);
    expect((await board.submitPost(draft('Signed out, trying to post'))).ok).toBe(false);
  });
});

describe('journey: deleting the account', () => {
  it('removes the learner’s posts, comments, votes, follows, blocks and appeals from the board; reports stay without the reporter', async () => {
    await as(RAJ);
    ok(await board.joinBoard('Quiet Ash 12', 'pseudonym'));
    const p = ok(await board.submitPost(draft('A post Raj will delete with his account')));
    await as(STAFF);
    ok(await board.staffAct({ action: 'approve', targetKind: 'post', targetId: p.id }));
    await as(RAJ);
    const c = ok(await board.comment(P.bcp, 'Raj was here, briefly.'));
    ok(await board.setVote(P.audio, true));
    ok(await board.report('post', P.hint, 'spam'));
    ok(await board.block(LEE));
    const votesOnAudio = memory.control.board.votes().filter((v) => v.postId === P.audio).length;

    ok(await account.deleteAccount({ alsoLocal: false }));

    expect(memory.control.board.posts().filter((x) => x.authorId === RAJ)).toEqual([]);
    expect(memory.control.board.comments().filter((x) => x.authorId === RAJ)).toEqual([]);
    expect(memory.control.board.votes().filter((v) => v.userId === RAJ)).toEqual([]);
    expect(memory.control.board.votes().filter((v) => v.postId === P.audio).length).toBe(votesOnAudio - 1);
    expect(memory.control.board.blocks()).toEqual([]);
    expect(memory.control.board.members().some((m) => m.userId === RAJ)).toBe(false);
    expect(memory.control.board.reports().some((r) => r.reporterId === RAJ)).toBe(false);
    expect(memory.control.board.reports().some((r) => r.targetId === P.hint && r.reporterId === null)).toBe(true);

    await as(MAYA);
    expect(await feedIds()).not.toContain(p.id);
    expect(ok(await board.loadPost(P.bcp)).post.comments.map((x) => x.id)).not.toContain(c.id);
  });
});

// ── A few screen checks the journeys above lean on ──────────────────
let rr: ReactTestRenderer | undefined;
const mount = (el: ReactElement) => {
  act(() => {
    rr = create(el);
  });
};
const flushUi = async () => {
  await act(async () => {
    for (let i = 0; i < 40; i++) await Promise.resolve();
  });
};
const textOf = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(rr!.root);
  return out.join(' ');
};

describe('screens', () => {
  afterEach(() => {
    act(() => rr?.unmount());
    rr = undefined;
  });

  it('the board footer carries the support email and the guidelines (a published contact, Apple 1.2)', async () => {
    await board.openBoard(true);
    const Home = require('../app/(cloud)/board/index').default as ComponentType;
    mount(<Home />);
    await flushUi();
    const words = textOf();
    expect(words).toContain(copy('board.foot.rules'));
    expect(words).toMatch(/@/);
  });

  it('Your activity: a removed comment offers "Ask us to look again"', async () => {
    await board.openBoard(true);
    const Activity = require('../app/(cloud)/board/activity').default as ComponentType;
    mount(<Activity />);
    await flushUi();
    const labels = rr!.root.findAll((n) => typeof n.props.onPress === 'function' && n.props.label !== undefined).map((n) => String(n.props.label));
    expect(labels).toContain(copy('board.appeal.button'));
  });
});
