/**
 * Phase 5b signature moments: the exam-ready 7-day hold, exam-eve / exam-day
 * date maths (time zones, midnight, daylight saving), the mindset growth
 * thresholds, and old saves loading without the new optional field.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCertification } from '../content/certifications';
import { daysToExam, eveReminders, examMoment, EVE_REMINDER, paceLine, topSlips } from '../engine/examDay';
import { examReadyDue, LOG_KEEP_DAYS, logReadinessDay, readyHoldDays, shiftDay, type ReadinessDay } from '../engine/examReady';
import { firstTries, GROWTH_WINDOW, mindsetGrowth, type FirstTry } from '../engine/mindsetGrowth';
import type { SlipInput } from '../engine/slipCoach';
import { selectCert, useProgress } from '../store/progress';

const cisa = getCertification('cisa')!;

// ── Exam-ready hold ────────────────────────────────────────────────────
/** A log of `values` (lower bounds), one per day, ending on `end`. */
function week(end: string, values: (number | null)[]): ReadinessDay[] {
  return values.map((v, i) => ({ day: shiftDay(end, values.length - 1 - i), min: v, last: v }));
}

describe('exam-ready 7-day hold', () => {
  const today = '2026-10-07';

  it('fires after 7 consecutive days at or above 80', () => {
    const log = week(today, [80, 81, 85, 82, 80, 90, 84]);
    expect(readyHoldDays(log, today)).toBe(7);
    expect(examReadyDue(log, today, false)).toBe(true);
  });

  it('needs the full 7 days: 6 is not enough', () => {
    const log = week(today, [82, 83, 84, 85, 86, 87]);
    expect(readyHoldDays(log, today)).toBe(6);
    expect(examReadyDue(log, today, false)).toBe(false);
  });

  it('resets when readiness drops below 80, and counts again from the drop', () => {
    const log = week(today, [85, 85, 79, 85, 85, 85, 85]);
    expect(readyHoldDays(log, today)).toBe(4);
    expect(examReadyDue(log, today, false)).toBe(false);
  });

  it('a dip during the day resets the hold even if it recovered by evening', () => {
    let log = week(shiftDay(today, 1), [85, 85, 85, 85, 85, 85]);
    log = logReadinessDay(log, today, 78); // morning dip
    log = logReadinessDay(log, today, 84); // recovered
    expect(log[log.length - 1]).toEqual({ day: today, min: 78, last: 84 });
    expect(readyHoldDays(log, today)).toBe(0);
  });

  it('"not enough data" never counts', () => {
    expect(readyHoldDays(week(today, [85, 85, 85, null, 85, 85, 85]), today)).toBe(3);
  });

  it('days without an entry carry the previous day forward (readiness only moves when you answer)', () => {
    const log: ReadinessDay[] = [
      { day: shiftDay(today, 6), min: 81, last: 82 },
      { day: shiftDay(today, 3), min: 83, last: 83 },
    ];
    expect(readyHoldDays(log, today)).toBe(7);
    // But never before the first entry: there is no evidence that far back.
    expect(readyHoldDays(log.slice(1), today)).toBe(4);
  });

  it('shows only once: dismissed means never again', () => {
    expect(examReadyDue(week(today, [90, 90, 90, 90, 90, 90, 90]), today, true)).toBe(false);
    expect(examReadyDue(undefined, today, false)).toBe(false);
  });

  it('the log keeps the minimum per day, returns the same array when unchanged, and trims old days', () => {
    const a = logReadinessDay([], today, 82);
    expect(logReadinessDay(a, today, 82)).toBe(a);
    let long: ReadinessDay[] = [];
    for (let k = 40; k >= 0; k--) long = logReadinessDay(long, shiftDay(today, k), 85);
    expect(long).toHaveLength(LOG_KEEP_DAYS);
    expect(long[long.length - 1].day).toBe(today);
  });

  it('shiftDay crosses month and year ends', () => {
    expect(shiftDay('2026-03-01', 1)).toBe('2026-02-28');
    expect(shiftDay('2027-01-01', 1)).toBe('2026-12-31');
  });
});

// ── Exam eve / exam day ────────────────────────────────────────────────
describe('exam eve and exam day dates', () => {
  /**
   * The learner's local calendar day in a given time zone. Jest cannot switch
   * the process time zone, so the zone is simulated exactly with Intl.
   */
  const inZone = (tz: string) => (ms: number) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms);
  const auckland = inZone('Pacific/Auckland'); // UTC+13 in October (NZDT)
  const la = inZone('America/Los_Angeles'); // UTC-7 in October (PDT)
  const utc = (y: number, mo: number, d: number, h: number, mi = 0, s = 0) => Date.UTC(y, mo - 1, d, h, mi, s);

  it('no exam date: neither card', () => {
    expect(examMoment(undefined, Date.now())).toBeNull();
    expect(daysToExam('', '2026-10-07')).toBeNull();
    expect(daysToExam('soon', '2026-10-07')).toBeNull();
  });

  it('flips from eve to exam day exactly at local midnight (Auckland)', () => {
    // Auckland midnight 7 Oct = 6 Oct 11:00 UTC.
    expect(examMoment('2026-10-08', utc(2026, 10, 6, 10, 59, 59), auckland)).toBeNull(); // 6 Oct 23:59:59: 2 days out
    expect(examMoment('2026-10-08', utc(2026, 10, 6, 11, 0, 0), auckland)).toBe('eve'); // 7 Oct 00:00
    expect(examMoment('2026-10-08', utc(2026, 10, 7, 10, 59, 59), auckland)).toBe('eve'); // 7 Oct 23:59:59
    expect(examMoment('2026-10-08', utc(2026, 10, 7, 11, 0, 0), auckland)).toBe('day'); // 8 Oct 00:00
    expect(examMoment('2026-10-08', utc(2026, 10, 8, 11, 0, 1), auckland)).toBeNull(); // 9 Oct: after the exam
  });

  it('the same instant is exam day in Auckland and exam eve in Los Angeles', () => {
    const instant = utc(2026, 10, 7, 12); // 8 Oct 01:00 NZDT, 7 Oct 05:00 PDT
    expect(examMoment('2026-10-08', instant, auckland)).toBe('day');
    expect(examMoment('2026-10-08', instant, la)).toBe('eve');
  });

  it('is calendar maths, so 23- and 25-hour daylight-saving days still read right', () => {
    const ny = inZone('America/New_York'); // clocks go back 1 Nov 2026: a 25-hour day
    expect(examMoment('2026-11-02', utc(2026, 11, 1, 4, 10), ny)).toBe('eve'); // 1 Nov 00:10 EDT
    expect(examMoment('2026-11-02', utc(2026, 11, 2, 4, 50), ny)).toBe('eve'); // 1 Nov 23:50 EST
    expect(examMoment('2026-11-02', utc(2026, 11, 2, 5, 0), ny)).toBe('day'); // 2 Nov 00:00 EST
    const london = inZone('Europe/London'); // clocks go forward 29 Mar 2026: a 23-hour day
    expect(examMoment('2026-03-30', utc(2026, 3, 29, 22, 30), london)).toBe('eve'); // 29 Mar 23:30 BST
    expect(examMoment('2026-03-30', utc(2026, 3, 29, 23, 5), london)).toBe('day'); // 30 Mar 00:05 BST
  });

  it('the default uses the phone’s own calendar day', () => {
    const noonToday = new Date();
    noonToday.setHours(12, 0, 0, 0);
    const d = new Date(noonToday);
    d.setDate(d.getDate() + 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(examMoment(key, noonToday.getTime())).toBe('eve');
  });

  it('pacing comes from the certification config, not a hard-coded number', () => {
    expect(paceLine(cisa.exam)).toBe('150 questions in 4 hours: about 1.5 minutes each.');
    expect(paceLine({ questions: 90, minutes: 150 })).toBe('90 questions in 2 h 30 min: about 1.5 minutes each.');
    expect(paceLine({ questions: 60, minutes: 60 })).toBe('60 questions in 1 hour: about 1 minute each.');
  });
});

describe('exam eve reminders (top slips)', () => {
  const finalTwo = ['Final two: {{B}} beats {{C}} because…'];
  const m = (over: Partial<SlipInput>): SlipInput => ({ correct: 'B', tips: finalTwo, stem: 'What should the auditor do?', ...over });

  it('ranks the three most frequent slips, ties in coach order, never "knowledge"', () => {
    const mistakes = [
      m({ slip: 'role' }),
      m({ slip: 'role' }),
      m({ slip: 'role' }),
      m({ picked: 'C' }), // runner-up, untagged: still counts
      m({ picked: 'C' }),
      m({ slip: 'symptom' }),
      m({ slip: 'symptom' }),
      m({ slip: 'knowledge' }),
      m({ slip: 'knowledge' }),
      m({ slip: 'knowledge' }),
      m({ slip: 'knowledge' }),
    ];
    // runner-up 2 and symptom 2 tie: runner-up comes first in coach order.
    expect(topSlips(mistakes)).toEqual(['role', 'runner-up', 'symptom']);
    expect(eveReminders(mistakes)).toEqual({ own: true, lines: [EVE_REMINDER.role, EVE_REMINDER['runner-up'], EVE_REMINDER.symptom] });
  });

  it('runner-up is read on ORIGINAL letters', () => {
    expect(topSlips([m({ picked: 'C' })])).toEqual(['runner-up']);
    expect(topSlips([m({ picked: 'A' })])).toEqual([]);
  });

  it('with no slips yet, shows three general reminders (not labelled as yours)', () => {
    const r = eveReminders([]);
    expect(r.own).toBe(false);
    expect(r.lines).toHaveLength(3);
  });
});

// ── Mindset growth ─────────────────────────────────────────────────────
describe('mindset growth', () => {
  const DAY = 86_400_000;
  const now = Date.UTC(2026, 9, 7);
  /** `n` first tries spread over `days` days ending now, `rate` share runner-up, in two halves. */
  function history(early: number, late: number, days = 30, n = 2 * GROWTH_WINDOW): FirstTry[] {
    return Array.from({ length: n }, (_, i) => {
      const half = i < n / 2;
      const k = half ? i : i - n / 2;
      const rate = half ? early : late;
      return { at: now - days * DAY + (i * (days * DAY)) / n, runnerUp: k < Math.round(rate * (n / 2)) };
    });
  }

  it('shows "4 in 10 → 2 in 10" when the runner-up rate halves', () => {
    const g = mindsetGrowth(history(0.4, 0.2), now);
    expect(g.show).toBe(true);
    if (!g.show) return;
    expect([g.earlyIn10, g.lateIn10]).toEqual([4, 2]);
    expect(g.line).toBe('In your first weeks you picked the tempting runner-up 4 times in 10. Lately it’s 2 in 10.');
  });

  it('needs 2 weeks of history', () => {
    expect(mindsetGrowth(history(0.4, 0.2, 13), now)).toEqual({ show: false, reason: 'too-soon' });
  });

  it('needs enough answers (two full windows)', () => {
    expect(mindsetGrowth(history(0.4, 0.2, 30, 2 * GROWTH_WINDOW - 2), now)).toEqual({ show: false, reason: 'too-few' });
  });

  it('hides when the change is too small or the wrong way', () => {
    expect(mindsetGrowth(history(0.24, 0.16), now).show).toBe(false); // 8 points: under the 10-point bar
    expect(mindsetGrowth(history(0.2, 0.4), now).show).toBe(false); // worse: never shown
    expect(mindsetGrowth(history(0.3, 0.3), now).show).toBe(false);
  });

  it('a drop of exactly 10 points shows', () => {
    expect(mindsetGrowth(history(0.3, 0.2), now).show).toBe(true);
  });

  it('says "fewer than 1 in 10" rather than "0 in 10"', () => {
    const g = mindsetGrowth(history(0.2, 0.02), now);
    expect(g.show && g.line.endsWith('Lately it’s fewer than 1 in 10.')).toBe(true);
  });

  it('firstTries uses only questions answered once, and ORIGINAL letters', () => {
    const q = { correct: 'B', tips: ['Final two: {{B}} beats {{C}}…'] };
    const tries = firstTries(
      {
        d1_1: { attempts: 1, correctCount: 0, lastCorrect: false, lastAt: 3 }, // picked C = runner-up
        d1_2: { attempts: 1, correctCount: 0, lastCorrect: false, lastAt: 1 }, // picked A = not
        d1_3: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: 2 },
        d1_4: { attempts: 2, correctCount: 1, lastCorrect: false, lastAt: 4 }, // re-answered: left out
        d1_5: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: 5 }, // not in the bank
      },
      { d1_1: { picked: 'C' }, d1_2: { picked: 'A' }, d1_4: { picked: 'C' } },
      (id) => (id === 'd1_5' ? undefined : q),
    );
    expect(tries).toEqual([
      { at: 1, runnerUp: false },
      { at: 2, runnerUp: false },
      { at: 3, runnerUp: true },
    ]);
  });
});

// ── Saved progress: the new optional field ─────────────────────────────
describe('saves from before Phase 5b', () => {
  it('load without `moments`, then log readiness and dismiss as normal', async () => {
    await AsyncStorage.setItem(
      'aurivan.progress.v1',
      JSON.stringify({
        state: {
          byCert: { cisa: { answers: { d1_001: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: 1 } }, review: {}, bookmarks: [], mocks: [], lessonsDone: [], mistakes: {}, gameBest: {} } },
          streak: { current: 0, best: 0, lastDay: null },
          today: { day: '', answered: 0 },
          days: {},
        },
        version: 2,
      }),
    );
    await useProgress.persist.rehydrate();
    const p = useProgress.getState();
    expect(selectCert(p, 'cisa').moments).toBeUndefined();
    expect(selectCert(p, 'cisa').answers.d1_001.lastCorrect).toBe(true);

    p.noteReadiness('cisa', '2026-10-07', null);
    expect(selectCert(useProgress.getState(), 'cisa').moments?.readiness).toEqual([{ day: '2026-10-07', min: null, last: null }]);

    // Answering logs today's readiness too (not enough data yet → null).
    useProgress.getState().recordAnswer('cisa', 'd2_001', true);
    expect(selectCert(useProgress.getState(), 'cisa').moments?.readiness?.length).toBeGreaterThanOrEqual(1);

    useProgress.getState().dismissReady('cisa');
    const seen = selectCert(useProgress.getState(), 'cisa').moments?.readySeenAt;
    expect(seen).toEqual(expect.any(Number));
    // Once per certification: a reset keeps the dismissed flag, drops the log.
    useProgress.getState().resetCert('cisa');
    expect(selectCert(useProgress.getState(), 'cisa').moments).toEqual({ readySeenAt: seen });
  });
});
