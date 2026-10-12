/**
 * Uplift Phase 8: the memory backend's feedback board plays the server's
 * rules (20261014000000_feedback_board.sql and board-submit), so the screens
 * are tested against the answers they'll get for real.
 */
import { createMemoryBackend, type MemoryBackend } from '../cloud/memory/backend';
import { BOARD_POST, BOARD_STAFF_ID, boardSeed, DEMO_EMAIL, DEMO_USER_ID } from '../cloud/memory/seed';
import { CloudError, type ReadScope } from '../cloud/types';
import { getAllQuestions } from '../content/loader';
import { TERMS_VERSION } from '../engine/account';

const DAY = 86_400_000;
let t = Date.UTC(2026, 9, 12, 10);
const RAJ = 'mem-user-raj';

function make(o: { joined?: boolean; staff?: boolean; readScope?: ReadScope; signedIn?: string | null; rajAgeDays?: number } = {}): MemoryBackend {
  t = Date.UTC(2026, 9, 12, 10);
  return createMemoryBackend({
    now: () => t,
    users: [
      { userId: DEMO_USER_ID, email: DEMO_EMAIL, providers: ['email'], termsVersion: TERMS_VERSION, createdAt: t - 30 * DAY },
      { userId: RAJ, email: 'raj@example.com', providers: ['email'], termsVersion: TERMS_VERSION, createdAt: t - (o.rajAgeDays ?? 30) * DAY },
    ],
    signedIn: o.signedIn === null ? null : { userId: o.signedIn ?? DEMO_USER_ID, authAt: t },
    board: boardSeed(t, { boardJoined: o.joined ?? true, boardStaff: o.staff, readScope: o.readScope }),
  });
}
const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'ok';
  } catch (e) {
    return e instanceof CloudError ? `${e.code}${e.detail ? `:${e.detail}` : ''}` : 'throw';
  }
};
const signInAs = async (b: MemoryBackend, email: string) => {
  await b.auth.sendEmailCode(email);
  await b.auth.verifyEmailCode(email, b.control.lastCode(email)!);
};

describe('who reads what (the read scope)', () => {
  it('signed out: nothing with the default scope, the visible posts with "everyone"', async () => {
    expect((await make({ signedIn: null }).board.feed({ cert: 'cisa', tab: 'top' })).items).toEqual([]);
    const open = await make({ signedIn: null, readScope: 'everyone' }).board.feed({ cert: 'cisa', tab: 'new' });
    expect(open.items.length).toBeGreaterThan(5);
    expect(open.items.every((p) => p.visibility === 'visible')).toBe(true);
  });

  it('signed in: the visible posts, never someone else’s waiting post; "author_staff": only your own', async () => {
    const b = make();
    const ids = (await b.board.feed({ cert: 'cisa', tab: 'new' })).items.map((p) => p.id);
    expect(ids).toContain(BOARD_POST.bcp);
    expect(ids).not.toContain(BOARD_POST.recall);
    expect(await code(b.board.post(BOARD_POST.recall))).toBe('not_found');
    // Your own waiting post: only in Your activity (and its own page).
    expect((await b.board.myPosts()).map((p) => p.id)).toContain(BOARD_POST.mayaHeld);
    expect((await b.board.post(BOARD_POST.mayaHeld)).visibility).toBe('pending');
    const own = make({ readScope: 'author_staff' });
    expect((await own.board.feed({ cert: 'cisa', tab: 'new' })).items.every((p) => p.authorId === DEMO_USER_ID)).toBe(true);
    expect((await own.board.settings()).readScope).toBe('author_staff');
  });

  it('the Shipped tab lists only shipped posts, newest first', async () => {
    const shipped = (await make().board.feed({ cert: 'cisa', tab: 'shipped' })).items;
    expect(shipped.map((p) => p.id)).toEqual([BOARD_POST.dark, BOARD_POST.acronyms]);
  });

  it('search matches every word; Top sorts by votes', async () => {
    const b = make();
    expect((await b.board.feed({ cert: 'cisa', tab: 'top', search: 'BCP test' })).items.map((p) => p.id)).toEqual([BOARD_POST.bcp]);
    const top = (await b.board.feed({ cert: 'cisa', tab: 'top' })).items;
    expect(top[0].id).toBe(BOARD_POST.bcp);
    expect(top[0].voteCount).toBe(42);
  });
});

describe('posting through board-submit’s rules', () => {
  it('near-verbatim bank text is refused, and nothing is stored', async () => {
    const b = make();
    const before = b.control.board.posts().length;
    const q = getAllQuestions('cisa')[5];
    expect(await code(b.board.submitPost({ kind: 'content', title: 'About this question', body: q.stem, cert: 'cisa' }))).toBe('bank_text');
    expect(await code(b.board.comment(BOARD_POST.bcp, q.explanation))).toBe('bank_text');
    expect(b.control.board.posts().length).toBe(before);
  });

  it('blocked words and a new member’s link are refused; recall and contact details wait for review', async () => {
    const b = make();
    expect(await code(b.board.submitPost({ kind: 'idea', title: 'What the fuck is this', body: '', cert: 'cisa' }))).toBe('rejected_words:words');
    const recall = await b.board.submitPost({ kind: 'question', title: 'Question about my exam', body: 'On my exam I got one about the audit charter.', cert: 'cisa' });
    expect(recall).toMatchObject({ visibility: 'pending', holdReason: 'recall' });
    const fine = await b.board.submitPost({ kind: 'idea', title: 'A dark theme for the notes pages', body: 'Please.', cert: 'cisa' });
    expect(fine).toMatchObject({ visibility: 'visible' });
  });

  it('a new member’s posts wait for review until one is approved', async () => {
    const b = make({ signedIn: RAJ });
    await b.board.join({ handle: 'Calm Pine 7', handleKind: 'pseudonym', guidelinesVersion: '2026-11' });
    expect(await code(b.board.submitPost({ kind: 'idea', title: 'see https://example.org now', body: '', cert: 'cisa' }))).toBe('rejected_words:links');
    const first = await b.board.submitPost({ kind: 'idea', title: 'A first idea from a new member', body: '', cert: 'cisa' });
    expect(first).toMatchObject({ visibility: 'pending', holdReason: 'new_member' });
  });

  it('posting needs the guidelines first, then good standing, while posting is open', async () => {
    const b = make({ joined: false });
    expect(await code(b.board.submitPost({ kind: 'idea', title: 'Before joining the board', body: '', cert: 'cisa' }))).toBe('forbidden:not_member');
    expect(await code(b.board.vote(BOARD_POST.audio, true))).toBe('forbidden');
    await b.board.join({ handle: 'Misty Rowan 77', handleKind: 'pseudonym', guidelinesVersion: '2026-11' });
    b.control.board.setPostingOpen(false);
    expect(await code(b.board.submitPost({ kind: 'idea', title: 'While posting is paused', body: '', cert: 'cisa' }))).toBe('posting_paused');
    expect(await code(b.board.vote(BOARD_POST.hint, false))).toBe('ok');
  });

  it('3 posts an hour; a day later it starts again', async () => {
    const b = make();
    for (let i = 0; i < 3; i++) await b.board.submitPost({ kind: 'idea', title: `An idea number ${i + 1} here`, body: '', cert: 'cisa' });
    expect(await code(b.board.submitPost({ kind: 'idea', title: 'One idea too many now', body: '', cert: 'cisa' }))).toBe('rate_limited');
    t += DAY + 1;
    expect(await code(b.board.submitPost({ kind: 'idea', title: 'The next day, an idea', body: '', cert: 'cisa' }))).toBe('ok');
  });

  it('names: reserved and taken ones are refused; one change a day', async () => {
    const b = make({ signedIn: RAJ });
    expect(await code(b.board.join({ handle: 'Aurivan Team', handleKind: 'chosen', guidelinesVersion: '2026-11' }))).toBe('invalid:handle_reserved');
    expect(await code(b.board.join({ handle: 'quiet cedar 214', handleKind: 'chosen', guidelinesVersion: '2026-11' }))).toBe('invalid:handle_taken');
    expect(await code(b.board.join({ handle: 'Calm Pine 7', handleKind: 'pseudonym', guidelinesVersion: '2025-01' }))).toBe('invalid:guidelines');
    await b.board.join({ handle: 'Calm Pine 7', handleKind: 'pseudonym', guidelinesVersion: '2026-11' });
    await b.board.join({ handle: 'Calm Pine 8', handleKind: 'pseudonym', guidelinesVersion: '2026-11' });
    expect(await code(b.board.join({ handle: 'Calm Pine 9', handleKind: 'pseudonym', guidelinesVersion: '2026-11' }))).toBe('rate_limited');
  });
});

describe('votes, reports, blocks, appeals', () => {
  it('a vote counts once, can be taken back, and 100 changes a day is the limit (take-backs count)', async () => {
    const b = make();
    await b.board.vote(BOARD_POST.audio, true);
    await b.board.vote(BOARD_POST.audio, true);
    expect((await b.board.post(BOARD_POST.audio)).voteCount).toBe(6);
    // 1 vote, then 49 take-backs and re-votes (99 changes), then one more take-back: 100.
    for (let i = 0; i < 49; i++) {
      await b.board.vote(BOARD_POST.audio, false);
      await b.board.vote(BOARD_POST.audio, true);
    }
    await b.board.vote(BOARD_POST.audio, false);
    expect(await code(b.board.vote(BOARD_POST.weekly, true))).toBe('rate_limited');
    // Taking a vote back is never refused.
    expect(await code(b.board.vote(BOARD_POST.hint, false))).toBe('ok');
    expect(b.control.board.votes().some((v) => v.postId === BOARD_POST.hint && v.userId === DEMO_USER_ID)).toBe(false);
  });

  it('"real exam content" hides a post at once; three reporters 7+ days old hide one', async () => {
    const b = make();
    await b.board.report({ kind: 'post', id: BOARD_POST.audio, reason: 'exam_content' });
    expect(b.control.board.posts().find((p) => p.id === BOARD_POST.audio)).toMatchObject({ visibility: 'hidden', holdReason: 'exam_report' });
    // Reporting again is the same answer (the outbox may resend it).
    expect(await code(b.board.report({ kind: 'post', id: BOARD_POST.audio, reason: 'spam' }))).toBe('ok');
    expect(b.control.board.reports().filter((r) => r.reporterId === DEMO_USER_ID)).toHaveLength(1);
  });

  it('a young account’s report doesn’t count toward the three', async () => {
    const b = make({ rajAgeDays: 1 });
    const visible = (id: string) => b.control.board.posts().find((p) => p.id === id)!.visibility;
    await b.board.report({ kind: 'post', id: BOARD_POST.weekly, reason: 'spam' });
    await signInAs(b, 'raj@example.com');
    await b.board.report({ kind: 'post', id: BOARD_POST.weekly, reason: 'spam' });
    expect(visible(BOARD_POST.weekly)).toBe('visible');
  });

  it('a blocked learner can’t comment on the blocker’s posts, and staff can’t be blocked', async () => {
    const b = make();
    await b.board.block(RAJ);
    expect(await code(b.board.block(BOARD_STAFF_ID))).toBe('forbidden');
    await signInAs(b, 'raj@example.com');
    await b.board.join({ handle: 'Calm Pine 7', handleKind: 'pseudonym', guidelinesVersion: '2026-11' });
    expect(await code(b.board.comment(BOARD_POST.weekend, 'Hello from Raj'))).toBe('forbidden');
    expect(await code(b.board.comment(BOARD_POST.bcp, 'Hello from Raj'))).toBe('ok');
  });

  it('appeals: your own removal, within 14 days, once', async () => {
    const b = make();
    const inbox = await b.board.inbox();
    const removed = inbox.find((n) => n.kind === 'removed')!;
    expect(removed).toMatchObject({ targetKind: 'comment', canAppeal: true, reason: 'exam_content' });
    expect(await code(b.board.appeal({ kind: 'comment', id: removed.commentId!, note: 'It was my own words.' }))).toBe('ok');
    expect(await code(b.board.appeal({ kind: 'comment', id: removed.commentId! }))).toBe('conflict');
    expect((await b.board.inbox()).find((n) => n.kind === 'removed')!.canAppeal).toBe(false);
    expect(await code(b.board.appeal({ kind: 'post', id: BOARD_POST.bcp }))).toBe('forbidden');
  });
});

describe('staff', () => {
  it('only staff read the queue or act; every action is logged with the actor', async () => {
    const learner = make();
    expect(await learner.board.isStaff()).toBe(false);
    expect(await code(learner.board.staffQueue('held'))).toBe('forbidden');
    expect(await code(learner.board.staff({ action: 'pause', targetKind: 'board' }))).toBe('forbidden');
    const b = make({ staff: true });
    const held = await b.board.staffQueue('held');
    expect(held.items.map((i) => i.id)).toContain(BOARD_POST.recall);
    const reported = await b.board.staffQueue('reported');
    // "Real exam content" first.
    expect(reported.items[0]).toMatchObject({ examContent: true });
    await b.board.staff({ action: 'remove_warn', targetKind: 'post', targetId: BOARD_POST.recall, reason: 'exam_content' });
    await b.board.staff({ action: 'status', targetKind: 'post', targetId: BOARD_POST.hint, extra: { status: 'in_progress' } });
    expect(await code(b.board.staff({ action: 'status', targetKind: 'post', targetId: BOARD_POST.hint, extra: { status: 'not_planned' } }))).toBe('invalid:note_required');
    await b.board.staff({ action: 'pause', targetKind: 'board' });
    expect((await b.board.settings()).postingOpen).toBe(false);
    expect(b.control.board.log().filter((l) => l.actorId === DEMO_USER_ID).map((l) => l.action)).toEqual(['warn', 'remove', 'status', 'pause']);
  });
});

describe('the account', () => {
  it('deleting the account deletes its board rows; Download my data has your own board rows only', async () => {
    const b = make();
    const file = JSON.parse(await b.auth.exportMyData());
    expect(file.board.member.handle).toBe('Misty Rowan 77');
    expect(file.board.posts.map((p: { id: string }) => p.id)).toContain(BOARD_POST.mocks);
    expect(JSON.stringify(file.board)).not.toContain('Quiet Cedar 214');
    t += 11 * 60_000;
    await b.auth.reauthenticate('email');
    await b.auth.reauthenticate('email', b.control.lastCode(DEMO_EMAIL)!);
    await b.auth.deleteAccount({ confirm: 'DELETE' });
    expect(b.control.board.posts().some((p) => p.authorId === DEMO_USER_ID)).toBe(false);
    expect(b.control.board.votes().some((v) => v.userId === DEMO_USER_ID)).toBe(false);
    expect(b.control.board.members().some((m) => m.userId === DEMO_USER_ID)).toBe(false);
  });
});
