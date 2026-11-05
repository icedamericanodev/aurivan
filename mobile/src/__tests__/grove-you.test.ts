/**
 * Grove You, version C2 (engine/groveYou.ts): the summary sentence and the streak row.
 *
 * Plain English for the founder: You opens with one sentence: the area to focus on next and the
 * countdown. Since Sky's short-text rule (5 Nov 2026: nothing repeated on a screen) the week's study
 * days and the readiness range are left to the streak tile and the readiness card right under it.
 * These tests pin the website's own rules (SPEC section 2, "Summary sentence rules"), so the phone
 * and the web say the same thing. The streak row follows Today's twig (DECISIONS 3).
 */
import { countdownWords, GAIN_MOST, KEEP_DOT, readinessWords, weekDaysWords, youStreakRow, youSummary } from '../engine/groveYou';
import type { ReadinessRange } from '../engine/readinessRange';

const before = (needed: number, answered = 40 - needed): ReadinessRange => ({ enough: false, answered, needed });
const after = (low: number, high: number): ReadinessRange => ({ enough: true, answered: 120, low, high, centre: (low + high) / 2 });
const DASHES = /[\u2013\u2014]/;
const BANNED = /\b(pass|passed|guarantee|official|evolve)\b|you’re ready|you're ready/i;

describe('the summary sentence (SPEC section 2 rules)', () => {
  it('Maya: focus with its reason, and the countdown held by no-break spaces (no days, no range: shown under it)', () => {
    const s = youSummary({ studyDaysThisWeek: 4, range: after(63, 73), focusShort: 'Protection', answered: 112, daysLeft: 42 });
    expect(s.shown).toBe(`Focus next: Protection, ${GAIN_MOST}${KEEP_DOT}42 days to go.`);
    expect(s.shown).not.toMatch(/study days|Readiness/);
    expect(s.lead + s.focus + s.tail).toBe(s.shown);
    expect(s.focus).toBe('Protection');
    // Said with a comma where the dot is; no "·" read aloud.
    expect(s.spoken).toBe('Focus next: Protection, where you’ll gain most, 42 days to go.');
  });

  it('a new learner: focus with no reason (no answers), no countdown without a date', () => {
    const s = youSummary({ studyDaysThisWeek: 0, range: before(40, 0), focusShort: 'Audit', answered: 0, daysLeft: null });
    expect(s.shown).toBe('Focus next: Audit.');
  });

  it('before 40 answers: the count stays on the readiness card, not in the sentence', () => {
    const s = youSummary({ studyDaysThisWeek: 3, range: before(6), focusShort: 'Operations', answered: 34, daysLeft: 42 });
    expect(s.shown).toBe(`Focus next: Operations, ${GAIN_MOST}${KEEP_DOT}42 days to go.`);
    expect(youSummary({ studyDaysThisWeek: 1, range: before(22), focusShort: 'Governance', answered: 18, daysLeft: null }).shown).toBe(`Focus next: Governance, ${GAIN_MOST}.`);
    // The words themselves are kept for other screens.
    expect(readinessWords(before(6))).toBe('34 of 40 answers toward your first readiness range');
  });

  it('the countdown: "1 day to go", "Exam day", and left out once the date has passed', () => {
    expect(countdownWords(1)).toBe('1 day to go');
    expect(countdownWords(0)).toBe('Exam day');
    expect(countdownWords(-3)).toBeNull();
    expect(countdownWords(null)).toBeNull();
    const done = youSummary({ studyDaysThisWeek: 2, range: after(70, 80), focusShort: 'Audit', answered: 200, daysLeft: -1 });
    expect(done.shown.endsWith(`${GAIN_MOST}.`)).toBe(true);
    const day = youSummary({ studyDaysThisWeek: 2, range: after(70, 80), focusShort: 'Audit', answered: 200, daysLeft: 0 });
    expect(day.shown.endsWith(`${KEEP_DOT}Exam day.`)).toBe(true);
  });

  it('a wrapped line never starts with the dot: the only spaces beside it are no-break', () => {
    const s = youSummary({ studyDaysThisWeek: 4, range: after(63, 73), focusShort: 'Protection', answered: 112, daysLeft: 42 });
    expect(s.shown).not.toMatch(/ ·|· /);
    expect(s.shown).toContain(' · ');
  });

  it('with no focus area the sentence still reads whole: the week, and the countdown stays', () => {
    const s = youSummary({ studyDaysThisWeek: 1, range: after(60, 70), focusShort: null, answered: 50, daysLeft: 9 });
    expect(s.shown).toBe(`1 study day this week${KEEP_DOT}9 days to go.`);
    expect(youSummary({ studyDaysThisWeek: 0, range: after(60, 70), focusShort: null, answered: 50, daysLeft: null }).shown).toBe('No study days yet this week.');
    expect(s.focus).toBeNull();
  });

  it('the parts, and the copy rules: no dashes, no banned words, never the bank size', () => {
    expect(weekDaysWords(0)).toBe('No study days yet this week');
    expect(weekDaysWords(1)).toBe('1 study day this week');
    expect(readinessWords(before(40, 0))).toBe('Answer 40 questions to see your first readiness range');
    for (const s of [
      youSummary({ studyDaysThisWeek: 0, range: before(40, 0), focusShort: 'Audit', answered: 0, daysLeft: null }),
      youSummary({ studyDaysThisWeek: 7, range: after(80, 90), focusShort: 'Audit', answered: 900, daysLeft: 0 }),
    ]) {
      expect(s.shown).not.toMatch(DASHES);
      expect(s.shown).not.toMatch(BANNED);
    }
  });
});

describe('the streak row (DECISIONS 3, as on Today)', () => {
  it('"Starts today" while there are fewer than 2 study days in all', () => {
    expect(youStreakRow(0, 0, 0)).toMatchObject({ label: 'Streak', word: 'Starts today', spoken: 'starts today, with your first answer' });
    expect(youStreakRow(1, 1, 1)).toMatchObject({ label: 'Streak', word: 'Starts today', spoken: 'starts today' });
  });

  it('"N days in a row" from a streak of 2, before the 14th study day', () => {
    expect(youStreakRow(5, 3, 3)).toMatchObject({ label: 'Streak', value: '3', unit: 'days in a row', count: true });
    expect(youStreakRow(13, 9, 5)).toMatchObject({ label: 'Streak', value: '9', count: true });
  });

  it('a streak under 2 after that, or the 14th study day on: this week instead, never a 0 or a reset', () => {
    expect(youStreakRow(6, 1, 2)).toMatchObject({ label: 'This week', value: '2', unit: 'study days', count: false });
    expect(youStreakRow(14, 9, 4)).toMatchObject({ label: 'This week', value: '4', unit: 'study days', spoken: '4 study days' });
    expect(youStreakRow(20, 0, 1)).toMatchObject({ label: 'This week', value: '1', unit: 'study day' });
    expect(youStreakRow(20, 0, 0)).toMatchObject({ label: 'This week', word: 'None yet' });
    for (const d of [0, 1, 2, 13, 14, 40]) for (const s of [0, 1, 2, 9]) for (const w of [0, 1, 4]) {
      const r = youStreakRow(d, s, w);
      expect(`${r.value ?? ''} ${r.unit ?? ''} ${r.word ?? ''} ${r.spoken}`).not.toMatch(/broke|lost|reset|^0 /i);
      expect(r.value).not.toBe('0');
    }
  });
});
