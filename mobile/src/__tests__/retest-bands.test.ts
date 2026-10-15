/**
 * Mobile 1.24, honest readiness (engine + store):
 *  1. The retest rule: a right answer less than 4 hours after a WRONG
 *     answer to the same question earns no spacing credit (no promotion, the
 *     mistake is not "fixed", half weight in readiness, due at the start of
 *     tomorrow at the earliest). A wrong retest still counts in full, and a
 *     right answer after a right answer is a normal answer.
 *  2. Domain bands: Building / Steady / Strong below 30 answers, the number
 *     (with "%" and "latest tries") from 30.
 *  3. The readiness report's yardstick line uses the app's own bars.
 */
import { getCertification } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import { BAND_MIN_ANSWERS, bandOf, BANDS_LINE, domainFigure, LATEST_TRIES_LABEL, YARDSTICK_LINE } from '../engine/domainBand';
import { READY_LOW } from '../engine/examReady';
import { DOMAIN_TARGET } from '../engine/journey';
import { answerCredit, computeReadiness, type AnswerRecord } from '../engine/readiness';
import { effectiveAnswers } from '../engine/readinessRange';
import { DAY_MS, isRetest, isRetestAfterMiss, nextReview, RETEST_LINE, RETEST_WINDOW_MS, startOfNextDay, type ReviewEntry } from '../engine/srs';
import { selectCert, useProgress } from '../store/progress';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const NOW = 1_700_000_000_000;
const HOUR = 3_600_000;
const cisa = getCertification('cisa')!;

describe('isRetest: the 4-hour window and its edges', () => {
  it('is a retest at 0 minutes, 1 hour and one millisecond under 4 hours', () => {
    expect(isRetest(NOW, NOW)).toBe(true);
    expect(isRetest(NOW - HOUR, NOW)).toBe(true);
    expect(isRetest(NOW - (RETEST_WINDOW_MS - 1), NOW)).toBe(true);
  });
  it('is NOT a retest at exactly 4 hours, or later', () => {
    expect(RETEST_WINDOW_MS).toBe(4 * HOUR);
    expect(isRetest(NOW - RETEST_WINDOW_MS, NOW)).toBe(false);
    expect(isRetest(NOW - 5 * HOUR, NOW)).toBe(false);
    expect(isRetest(NOW - 3 * DAY_MS, NOW)).toBe(false);
  });
  it('is not a retest with no earlier answer, or an earlier answer stamped later than this one', () => {
    expect(isRetest(undefined, NOW)).toBe(false);
    expect(isRetest(NOW + HOUR, NOW)).toBe(false);
  });
  it('the full rule needs the previous answer to be WRONG: right after right is never a retest', () => {
    expect(isRetestAfterMiss({ lastCorrect: false, lastAt: NOW - HOUR }, NOW)).toBe(true);
    expect(isRetestAfterMiss({ lastCorrect: true, lastAt: NOW - HOUR }, NOW)).toBe(false);
    expect(isRetestAfterMiss({ lastCorrect: false, lastAt: NOW - RETEST_WINDOW_MS }, NOW)).toBe(false);
    expect(isRetestAfterMiss(undefined, NOW)).toBe(false);
  });
});

describe('startOfNextDay: local midnight, not +24 hours', () => {
  it('21:30 today is due at 00:00 tomorrow, and 00:00 itself moves on a whole day', () => {
    const late = new Date(2026, 9, 15, 21, 30).getTime();
    expect(startOfNextDay(late)).toBe(new Date(2026, 9, 16, 0, 0).getTime());
    expect(startOfNextDay(new Date(2026, 9, 16, 0, 0).getTime())).toBe(new Date(2026, 9, 17, 0, 0).getTime());
    expect(startOfNextDay(new Date(2026, 9, 31, 12, 0).getTime())).toBe(new Date(2026, 10, 1, 0, 0).getTime());
  });
});

describe('nextReview: a right retest earns no spacing credit', () => {
  const missed: ReviewEntry = { box: 1, dueAt: NOW - HOUR, lastSeen: NOW - HOUR, reps: 1 };

  it('stays in its box and is due at the start of tomorrow at the earliest (a miss was due right away)', () => {
    const e = nextReview(missed, true, 'sure', NOW, false, true)!;
    expect(e.box).toBe(1);
    expect(e.dueAt).toBe(startOfNextDay(NOW));
    expect(e.reps).toBe(2);
  });

  it('without the retest flag the same answer WOULD promote (the rule is the only difference)', () => {
    expect(nextReview(missed, true, 'sure', NOW)!.box).toBe(2);
  });

  it('never makes a later review earlier: a box-4 question keeps its 7-day wait', () => {
    const box4: ReviewEntry = { box: 4, dueAt: NOW + 5 * DAY_MS, lastSeen: NOW - HOUR, reps: 4 };
    const e = nextReview(box4, true, 'sure', NOW, false, true)!;
    expect(e.box).toBe(4);
    expect(e.dueAt).toBe(NOW + 5 * DAY_MS);
  });

  it('a hinted right retest also stays put and waits until tomorrow', () => {
    const e = nextReview(missed, true, 'sure', NOW, true, true)!;
    expect(e.box).toBe(1);
    expect(e.dueAt).toBe(startOfNextDay(NOW));
  });

  it('a WRONG retest counts in full: back to box 1, due now', () => {
    const box3: ReviewEntry = { box: 3, dueAt: NOW + DAY_MS, lastSeen: NOW - HOUR, reps: 3 };
    expect(nextReview(box3, false, 'sure', NOW, false, false)).toEqual({ box: 1, dueAt: NOW, lastSeen: NOW, reps: 4 });
  });

  it('a right retest of a miss that was never queued (a mock saves without scheduling) joins Box 1, due tomorrow', () => {
    expect(nextReview(undefined, true, 'sure', NOW, false, true)).toEqual({ box: 1, dueAt: startOfNextDay(NOW), lastSeen: NOW, reps: 1 });
    expect(nextReview(undefined, true, 'guessing', NOW, false, true)!.dueAt).toBe(startOfNextDay(NOW));
  });

  it('says "Back in your review tomorrow." in those words', () => {
    expect(RETEST_LINE).toBe('Back in your review tomorrow.');
  });
});

describe('readiness: a right retest counts half', () => {
  const rec = (extra: Partial<AnswerRecord> = {}): AnswerRecord => ({ attempts: 2, correctCount: 1, lastCorrect: true, lastAt: NOW, ...extra });

  it('answerCredit: clean 1, retest 0.5, hinted 0.5, wrong 0 (a wrong retest is not marked, so it is simply wrong)', () => {
    expect(answerCredit(rec())).toBe(1);
    expect(answerCredit(rec({ lastRetest: true }))).toBe(0.5);
    expect(answerCredit(rec({ lastAssisted: true }))).toBe(0.5);
    expect(answerCredit(rec({ lastCorrect: false }))).toBe(0);
  });

  it('half a point per retest in the domain, and half evidence for the range (not counted twice with a hint)', () => {
    const answers: Record<string, AnswerRecord> = {};
    for (let i = 0; i < 10; i++) answers[`d1_${i}`] = rec({ lastRetest: i < 4 ? true : undefined, lastAssisted: i < 2 ? true : undefined });
    const d1 = computeReadiness(cisa, answers).domains[0];
    expect(d1.answered).toBe(10);
    expect(d1.credit).toBe(4 * 0.5 + 6); // four halved (2 hinted + 2 retests... overlap counted once), six whole
    expect(d1.halved).toBe(4);
    expect(d1.assisted).toBe(2);
    expect(effectiveAnswers(d1)).toBe(10 - 4 * 0.5);
  });
});

describe('the store applies the rule', () => {
  const q = getAllQuestions('cisa')[0].id;
  const state = () => selectCert(useProgress.getState(), 'cisa');
  beforeEach(() => {
    useProgress.getState().resetCert('cisa');
  });

  it('a miss, then a right answer 1 hour later: not promoted, mistake not fixed, half credit, due at the start of tomorrow', () => {
    const p = useProgress.getState();
    p.recordAnswer('cisa', q, false, 'sure', { at: NOW });
    p.recordMistake('cisa', q, 'A', 'sure');
    p.recordAnswer('cisa', q, true, 'sure', { at: NOW + HOUR });
    const s = state();
    expect(s.review[q].box).toBe(1);
    expect(s.review[q].dueAt).toBe(startOfNextDay(NOW + HOUR));
    expect(s.mistakes[q].resolved).toBe(false);
    expect(s.answers[q].lastRetest).toBe(true);
    expect(answerCredit(s.answers[q])).toBe(0.5);
  });

  it('the same right answer at exactly 4 hours is a fresh try: promoted, fixed, full credit, no retest mark', () => {
    const p = useProgress.getState();
    p.recordAnswer('cisa', q, false, 'sure', { at: NOW });
    p.recordMistake('cisa', q, 'A', 'sure');
    p.recordAnswer('cisa', q, true, 'sure', { at: NOW + RETEST_WINDOW_MS });
    const s = state();
    expect(s.review[q].box).toBe(2);
    expect(s.mistakes[q].resolved).toBe(true);
    expect(s.answers[q].lastRetest).toBeUndefined();
    expect(answerCredit(s.answers[q])).toBe(1);
  });

  it('a WRONG retest counts in full: box 1, due now, the mistake stays open, no retest mark', () => {
    const p = useProgress.getState();
    p.recordAnswer('cisa', q, false, 'sure', { at: NOW });
    p.recordMistake('cisa', q, 'A', 'sure');
    p.recordAnswer('cisa', q, false, 'sure', { at: NOW + HOUR });
    const s = state();
    expect(s.review[q]).toMatchObject({ box: 1, dueAt: NOW + HOUR });
    expect(s.mistakes[q].resolved).toBe(false);
    expect(s.answers[q].lastRetest).toBeUndefined();
    expect(s.answers[q].lastCorrect).toBe(false);
  });

  it('a later clean answer drops the retest mark again', () => {
    const p = useProgress.getState();
    p.recordAnswer('cisa', q, false, undefined, { at: NOW });
    p.recordAnswer('cisa', q, true, undefined, { at: NOW + HOUR });
    expect(state().answers[q].lastRetest).toBe(true);
    p.recordAnswer('cisa', q, true, undefined, { at: NOW + 2 * DAY_MS });
    expect(state().answers[q].lastRetest).toBeUndefined();
    expect(state().review[q].box).toBe(2);
  });

  it('right, then right again 1 hour later, is a NORMAL answer: full credit, promoted, no retest mark', () => {
    const p = useProgress.getState();
    p.recordAnswer('cisa', q, false, 'sure', { at: NOW - 3 * DAY_MS });
    p.recordAnswer('cisa', q, true, 'sure', { at: NOW });
    const box = state().review[q].box;
    p.recordAnswer('cisa', q, true, 'sure', { at: NOW + HOUR });
    expect(state().answers[q].lastRetest).toBeUndefined();
    expect(answerCredit(state().answers[q])).toBe(1);
    expect(state().review[q].box).toBe(box + 1);
  });

  it('a right retest after a miss leaves the last answer right, so the NEXT right answer is normal (no sliding window)', () => {
    const p = useProgress.getState();
    p.recordAnswer('cisa', q, false, undefined, { at: NOW });
    p.recordAnswer('cisa', q, true, undefined, { at: NOW + HOUR });
    expect(state().answers[q].lastRetest).toBe(true);
    p.recordAnswer('cisa', q, true, undefined, { at: NOW + 2 * HOUR });
    expect(state().answers[q].lastRetest).toBeUndefined();
  });

  it('a retest is not a clean answer for milestones or mastery dates', () => {
    const p = useProgress.getState();
    p.recordAnswer('cisa', q, false, undefined, { at: NOW });
    p.recordAnswer('cisa', q, true, undefined, { at: NOW + HOUR });
    expect(state().answers[q].lastRetest).toBe(true);
    // Same day, so no second mastery day is earned from it either way; the flag is what the badges read.
    expect(state().answers[q].attempts).toBe(2);
  });
});

describe('domain bands', () => {
  it('Building under 70, Steady 70 to 79, Strong 80 and up (the app’s own bars)', () => {
    expect(Math.round(DOMAIN_TARGET * 100)).toBe(70);
    expect(READY_LOW).toBe(80);
    expect(bandOf(0)).toBe('Building');
    expect(bandOf(69)).toBe('Building');
    expect(bandOf(70)).toBe('Steady');
    expect(bandOf(79)).toBe('Steady');
    expect(bandOf(80)).toBe('Strong');
    expect(bandOf(100)).toBe('Strong');
  });

  it('below 30 answers a domain shows a word; from 30 the number with "%" and a "latest tries" label', () => {
    expect(BAND_MIN_ANSWERS).toBe(30);
    expect(domainFigure(0, 0)).toEqual({ text: '–', spoken: 'not started', banded: false });
    expect(domainFigure(10, 90)).toEqual({ text: 'Strong', spoken: 'Strong', banded: true });
    expect(domainFigure(29, 74)).toEqual({ text: 'Steady', spoken: 'Steady', banded: true });
    expect(domainFigure(29, 40).text).toBe('Building');
    expect(domainFigure(30, 74)).toEqual({ text: '74%', spoken: '74 percent, latest tries', banded: false });
    expect(domainFigure(250, 91).text).toBe('91%');
    expect(LATEST_TRIES_LABEL).toMatch(/latest try/);
    expect(BANDS_LINE).toMatch(/Building is under 70, Steady 70 to 79, Strong 80 and up/);
  });
});

describe('the readiness yardstick', () => {
  it('names the app’s own 80% low end and 70% per domain, and is not a promise or a prediction', () => {
    expect(YARDSTICK_LINE).toContain('80%');
    expect(YARDSTICK_LINE).toContain('70%');
    expect(YARDSTICK_LINE).toMatch(/not a promise or a prediction/);
    expect(YARDSTICK_LINE).not.toMatch(/\bpass|\bprobab|\bguarantee|\bfail/i);
  });
});
