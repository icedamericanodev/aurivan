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

  it('fills placeholders, and leaves a missing one visible', () => {
    expect(copy('you.row.in.sub', { email: 'j•••@gmail.com' })).toBe('Signed in as j•••@gmail.com');
    expect(copy('code.resend.wait', { 'm:ss': '0:42' })).toBe('Send a new code in 0:42');
    expect(copy('you.row.in.sub')).toBe('Signed in as {email}');
  });

  it('the About line with the flag off is the one Settings has always shown', () => {
    // Settings reads its last sentence from here (aboutLine); with the flag off it must stay word for word.
    const settings = readFileSync(join(__dirname, '../app/settings.tsx'), 'utf8');
    expect(settings).toContain('written for exam preparation. {aboutLine()}');
    expect(ACCOUNT_COPY['about.off']).toBe('Progress is stored only on this device.');
  });
});
