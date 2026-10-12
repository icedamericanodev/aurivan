/**
 * Uplift Phase 6: every account string obeys the cloud copy rules
 * (spec PHASE6_8.md §1.5), and the exact §2.3 strings are all there.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { ACCOUNT_COPY, copy, type AccountCopyKey } from '../content/cloud/copy';
import { CERTIFICATIONS } from '../content/certifications';
import { getAllQuestions } from '../content/loader';

const entries = Object.entries(ACCOUNT_COPY) as [AccountCopyKey, string][];
const EXAMS = CERTIFICATIONS.map((c) => c.name).join('|');

describe('cloud copy rules (§1.5)', () => {
  it('never says the question-bank size, or "of N questions"', () => {
    const sizes = CERTIFICATIONS.map((c) => getAllQuestions(c.id).length).filter((n) => n > 0);
    for (const [key, text] of entries) {
      for (const n of sizes) expect(`${key}: ${text}`).not.toMatch(new RegExp(`\\b${n}\\b`));
      expect(`${key}: ${text}`).not.toMatch(/\bof\s+\d+\s+questions?\b/i);
      // No big numbers at all: the only numbers are 6 (digits), 16 (age), 30 (days).
      expect(`${key}: ${text}`).not.toMatch(/\b\d{3,}\b/);
    }
  });

  it('no "ISACA": the not-affiliated line always comes from cert.trademarkNotice', () => {
    for (const [key, text] of entries) expect(`${key}: ${text}`).not.toMatch(/isaca/i);
  });

  it('no "official", "certified", "endorsed" or "forum" next to an exam name', () => {
    const near = new RegExp(`\\b(official|certified|endorsed|forum)\\b(\\W+\\w+){0,4}\\W+(${EXAMS}|exam)\\b|\\b(${EXAMS}|exam)\\b(\\W+\\w+){0,4}\\W+(official|certified|endorsed|forum)\\b`, 'i');
    for (const [key, text] of entries) expect(`${key}: ${text}`).not.toMatch(near);
  });

  it('no reply-time promise (the board’s 24-hour review line is the only exception, in board strings)', () => {
    for (const [key, text] of entries) {
      const promise = /\b(reply|replies|respond|response|answer|get back to you|hear from us)\b[^.]*\b(within|in)\s+\d+/i.test(text) || /\bwithin\s+\d+\s+(hours?|minutes?|business days?)\b/i.test(text);
      const allowed = key.startsWith('board.') && text.includes('We review reports within 24 hours');
      expect(`${key}: ${promise && !allowed}`).toBe(`${key}: false`);
    }
  });

  it('no guilt, no urgency, no exclamation marks', () => {
    const pushy = /!|\b(hurry|don’t miss|last chance|act now|right now|before it’s too late|you’ll lose|you will lose|limited time|only today|forever)\b/i;
    for (const [key, text] of entries) expect(`${key}: ${text}`).not.toMatch(pushy);
  });

  it('curly apostrophes only, like the rest of the app', () => {
    for (const [key, text] of entries) expect(`${key}: ${text}`).not.toContain("'");
  });

  it('every string is one plain line (no stray spaces, no doubled punctuation)', () => {
    for (const [key, text] of entries) {
      expect(`${key}: ${text}`).toBe(`${key}: ${text.trim()}`);
      expect(`${key}: ${text}`).not.toMatch(/\s{2,}|\.\.|\n/);
    }
  });
});

describe('the exact §2.3 strings', () => {
  it('has every key from the spec', () => {
    const spec = [
      'you.row.out.title', 'you.row.out.sub', 'you.row.in.title', 'you.row.in.sub', 'you.row.in.sub.relay', 'you.row.expired.sub',
      'signin.title', 'signin.body1', 'signin.body2', 'signin.body3', 'signin.privacy', 'signin.age', 'signin.age.hint',
      'signin.apple', 'signin.google', 'signin.email', 'signin.later',
      'email.title', 'email.field', 'email.help', 'email.send', 'email.bad',
      'code.title', 'code.field', 'code.submit', 'code.resend.wait', 'code.resend', 'code.other', 'code.wrong', 'code.expired', 'code.toomany',
      'err.offline', 'err.rate', 'err.server',
      'account.title', 'account.signedin', 'account.signedin.relay', 'account.data', 'account.download', 'account.download.sub',
      'account.download.busy', 'account.download.rate', 'account.download.fail', 'account.signout', 'account.signoutAll', 'account.foot',
      'signout.title', 'signout.body', 'signoutAll.title', 'signoutAll.body',
      'delete.row', 'delete.row.sub', 'delete.s1.title', 'delete.s1.body', 'delete.s1.local', 'delete.s1.go', 'delete.s1.cancel',
      'delete.s2.reauth', 'delete.s2.reauth.email', 'delete.s2.type', 'delete.s2.go', 'delete.busy', 'delete.done.title', 'delete.done.body',
      'delete.offline', 'delete.fail', 'delete.sub.note', 'about.off', 'about.on.out', 'about.on.sync',
    ];
    for (const k of spec) expect(ACCOUNT_COPY).toHaveProperty([k]);
  });

  it('keeps the spec’s wording for the key promises', () => {
    expect(ACCOUNT_COPY['signin.body1']).toBe('An account is optional. Everything in Aurivan works without one.');
    expect(ACCOUNT_COPY['signin.age']).toBe('I’m 16 or older and I agree to the Terms of Use.');
    expect(ACCOUNT_COPY['delete.s1.body']).toBe(
      'This permanently deletes your account, your synced progress, and your posts, comments and votes on the feedback board. Progress saved on this phone stays here unless you tick the box below. This can’t be undone.',
    );
    expect(ACCOUNT_COPY['delete.done.body']).toBe('It’s gone from our live systems now, and from backups within 30 days. Aurivan keeps working on this phone without an account.');
  });

  it('has every §3.3 sync key (Phase 7), word for word where it matters', () => {
    const spec = [
      'sync.section', 'sync.toggle', 'sync.toggle.sub', 'sync.now', 'sync.status.just', 'sync.status.min', 'sync.status.today', 'sync.status.day',
      'sync.status.busy', 'sync.status.offline', 'sync.status.off', 'sync.status.signin', 'sync.paused.newer', 'sync.paused.unreadable', 'sync.paused.toobig',
      'sync.retry', 'sync.what.title', 'sync.what.body', 'first.phone.title', 'first.phone.body', 'first.phone.go', 'first.account.title', 'first.account.body',
      'first.account.go', 'first.both.title', 'first.both.body', 'first.both.go', 'first.undo', 'first.undo.replaces', 'first.later', 'first.cols',
      'switch.title', 'switch.body', 'switch.fresh', 'switch.fresh.sub', 'switch.keep', 'switch.keep.sub', 'undo.row', 'undo.row.sub',
      'undo.confirm.title', 'undo.confirm.body', 'signout.body.sync', 'signout.remove', 'signout.remove.confirm', 'delsync.title', 'delsync.body', 'delsync.go', 'delsync.done',
    ];
    for (const k of spec) expect(ACCOUNT_COPY).toHaveProperty([k]);
    expect(ACCOUNT_COPY['first.both.body']).toBe(
      'You’re signed in as {email}. This phone and your account both have progress. We’ll combine them: nothing you’ve answered is lost, and your best results are kept.',
    );
    // Security review S7: everything that syncs, as the privacy notice lists it.
    expect(ACCOUNT_COPY['sync.what.body']).toBe(
      'Your answers (whether right, how sure you were and how long you took), reviews, your mistake journal, saved questions, mocks, lessons and notes done, your study days and streak, badges, game levels, your readiness log and exam-week checklist, your plant, the questions you reported to us, your exam date and study settings. These stay on this phone: reminders, theme, motion, haptics, plant display choices and a quiz in progress.',
    );
    // UX P3 / P4.
    expect(ACCOUNT_COPY['switch.fresh.sub']).toBe('This phone switches to this account’s progress. What’s here now is kept for 7 days in Settings → Your data → Undo sync.');
    expect(ACCOUNT_COPY['switch.keep.sub']).toBe('It will be added to this account, even if it’s someone else’s.');
    // UX H1 / H2: the review's wording (H2 reworded so it is true with one phone too: QA B4).
    expect(ACCOUNT_COPY['signout.remove.confirm.unsynced']).toBe('Some of this phone’s progress isn’t in your account yet. Removing it deletes it for good. Save a backup first if you might want it.');
    expect(ACCOUNT_COPY['reset.sync']).not.toMatch(/will come back/);
    expect(ACCOUNT_COPY['delsync.body']).toBe('This deletes the copy of your progress stored in your account. Your account and this phone’s progress stay. Sync turns off.');
    // UX O2: the cloud intro never says "only on this phone".
    expect(ACCOUNT_COPY['data.intro.on']).not.toMatch(/only/);
    expect(ACCOUNT_COPY['data.intro.sync']).not.toMatch(/only/);
  });

  it('has the §4.3 board strings word for word (Phase 8), with no What’s next and no retyped trademark line', () => {
    const exact: [AccountCopyKey, string][] = [
      ['board.title', 'Feedback board'],
      // Compliance review P8 (item 5): no absolute promise to read every post.
      ['board.sub', 'Ideas, app problems and questions from learners. We read the posts.'],
      ['board.signin', 'Sign in to post, vote and comment. Reading is open to everyone.'],
      ['board.empty.title', 'Nothing here yet'],
      ['board.empty.body', 'Be the first to suggest an idea or tell us what to fix.'],
      ['board.offline', 'You’re offline. Showing what was last loaded.'],
      ['board.foot.contact', 'Questions or concerns: {supportEmail}'],
      ['board.team', 'Aurivan team · official response'],
      ['board.spoiler', 'This post talks about the answer to a practice question.'],
      ['board.vote.a11y', 'Vote for: {title}. {n} votes. {state}.'],
      ['board.compose.private', 'Reporting one question? Report it privately instead. It’s faster, and it won’t spoil the answer for others.'],
      ['board.compose.rules', 'Be kind, stay on topic, no real exam questions, no personal details.'],
      ['board.compose.draft', 'You’re offline. Your post is saved here as a draft.'],
      ['board.leak.title', 'This looks like text from one of Aurivan’s practice questions'],
      ['board.leak.body', 'To keep answers fresh for everyone, please describe the topic in your own words. If something in that question looks wrong, report it privately: it’s faster, and it won’t spoil it for others.'],
      ['board.leak.recall', 'This looks like it might be a question from a real exam. Real exam questions can’t be posted: candidates agree to keep them confidential. Describe the topic instead.'],
      ['board.held.title', 'Waiting for review'],
      ['board.held.body', 'A person checks posts from new members before they appear.'],
      ['board.held.recall', 'It looked like it might contain real exam content, so a person will check it first.'],
      ['board.reject.words', 'This contains words we don’t allow. Please rephrase.'],
      ['board.reject.links', 'Links can’t be posted yet. Describe it in words instead.'],
      ['board.reject.rate', 'You’ve posted a lot today. Try again tomorrow.'],
      ['board.reject.paused', 'Posting is paused for a short while. Reading and voting still work.'],
      ['board.reject.banned', 'Your account can’t post on the board. If you think this is a mistake, email {supportEmail}.'],
      ['board.gate.rule.exam', 'No real exam questions. Ever. Don’t post, paraphrase or ask for questions from a real certification exam. Candidates agree to keep them confidential. Talk about topics, not items.'],
      ['board.gate.review', 'We review reports within 24 hours. We remove posts that break these rules, and we close accounts that keep breaking them.'],
      ['board.gate.email', 'Your email address is never shown.'],
      ['board.gate.go', 'I agree, continue'],
      ['board.report.done', 'Thanks. We review reports within 24 hours. You won’t see this {item} while it’s reviewed.'],
      ['board.block.body', 'You won’t see their posts or comments, and they can’t comment on yours. They won’t be told. You can unblock them in Settings → Feedback board → Blocked learners.'],
      // Fix round P8 (UX): the ellipsis comes from firstWords, and only when the words were cut short.
      ['board.notice.removed', 'We removed your {item} “{words}” because it {reason}. {who} If you think we got it wrong, you can ask us to look again within 14 days.'],
      ['board.appeal.done', 'Thanks. A person will look at this again.'],
      ['board.withdraw.confirm', 'Withdraw this post? It will no longer be shown. Comments on it are hidden too.'],
      ['board.staff.pause.confirm', 'Pause posting? Learners can still read and vote. New posts and comments wait until you reopen.'],
    ];
    for (const [k, v] of exact) expect([k, ACCOUNT_COPY[k]]).toEqual([k, v]);
    for (const r of ['exam_content', 'copyright', 'abuse', 'sexual_violent', 'spam', 'personal_info', 'off_topic', 'other']) {
      expect(ACCOUNT_COPY).toHaveProperty([`board.report.reason.${r}`]);
    }
    const board = entries.filter(([k]) => k.startsWith('board.'));
    expect(board.length).toBeGreaterThan(150);
    for (const [k, v] of board) {
      // The 12 Oct addendum: no What's next anywhere on the board.
      expect(`${k}: ${v}`).not.toMatch(/what.s next/i);
      // The not-affiliated line always comes from cert.trademarkNotice.
      expect(`${k}: ${v}`).not.toMatch(/affiliated|trademark/i);
    }
    // The 24-hour line appears only in board strings.
    for (const [k, v] of entries) if (v.includes('24 hours')) expect(k.startsWith('board.')).toBe(true);
  });

  it('fills placeholders, and leaves a missing one visible', () => {
    expect(copy('you.row.in.sub', { email: 'j•••@gmail.com' })).toBe('Signed in as j•••@gmail.com');
    expect(copy('code.resend.wait', { 'm:ss': '0:42' })).toBe('Send a new code in 0:42');
    expect(copy('you.row.in.sub')).toBe('Signed in as {email}');
  });

  it('the About line with the flag off is the one Settings has always shown', () => {
    // Settings reads its last sentence from here (aboutLine); with the flag off it must stay word for word.
    const settings = readFileSync(join(__dirname, '../app/settings.tsx'), 'utf8');
    expect(settings).toContain('written for exam preparation. {aboutLine(syncing)}');
    expect(ACCOUNT_COPY['about.off']).toBe('Progress is stored only on this device.');
  });
});
