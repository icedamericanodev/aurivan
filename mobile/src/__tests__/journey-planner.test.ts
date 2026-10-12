import { getCertification } from '../content/certifications';
import { DAILY_MINUTES, planTolerance, questionsFor } from '../engine/fit';
import { journeyStage, STAGE_ORDER, type JourneyInput, type Stage } from '../engine/journey';
import { itemMinutes, planMinutes, todaysPlan, type PlanInput } from '../engine/planner';
import { computeReadiness, MIN_SAMPLE } from '../engine/readiness';
import { bumpStreak, visibleStreak, weekStrip } from '../engine/streak';

const cisa = getCertification('cisa')!;
const answers = (accuracy: number) => {
  const a: Record<string, { attempts: number; correctCount: number; lastCorrect: boolean; lastAt: number }> = {};
  for (const d of cisa.domains) {
    for (let i = 0; i < MIN_SAMPLE * 2; i++) {
      a[`d${d.id}_${i}`] = { attempts: 1, correctCount: 1, lastCorrect: i < MIN_SAMPLE * 2 * accuracy, lastAt: 0 };
    }
  }
  return a;
};
const base = (over: Partial<JourneyInput> = {}): JourneyInput => ({
  readiness: computeReadiness(cisa, {}),
  answeredTotal: 0,
  lessonsDone: 0,
  lessonsAvailable: 10,
  mocksTaken: 0,
  daysLeft: 60,
  ...over,
});

describe('journey stage', () => {
  it('starts with the diagnostic', () => expect(journeyStage(base())).toBe('diagnose'));
  it('moves to learning when readiness is low and lessons remain', () => {
    expect(journeyStage(base({ answeredTotal: 30, readiness: computeReadiness(cisa, answers(0.3)) }))).toBe('learn');
  });
  it('practises until every domain clears the floor, then mocks, then ready', () => {
    const strong = computeReadiness(cisa, answers(0.9));
    expect(journeyStage(base({ answeredTotal: 100, lessonsDone: 10, readiness: computeReadiness(cisa, answers(0.5)) }))).toBe('practice');
    expect(journeyStage(base({ answeredTotal: 100, lessonsDone: 10, readiness: strong }))).toBe('mock');
    expect(journeyStage(base({ answeredTotal: 100, lessonsDone: 10, readiness: strong, mocksTaken: 2 }))).toBe('ready');
  });
  it('switches to exam week and after the exam by date', () => {
    expect(journeyStage(base({ daysLeft: 5 }))).toBe('examDay');
    expect(journeyStage(base({ daysLeft: -1 }))).toBe('afterExam');
  });
});

describe("today's plan", () => {
  it('puts due reviews first and never exceeds 4 items', () => {
    const plan = todaysPlan({
      stage: 'practice',
      dueReviews: 7,
      dailyMinutes: 20,
      focusDomain: { id: '4', short: 'IS Operations' },
      nextLesson: { id: 'l1', title: 'Audit charter' },
      daysLeft: 40,
      examQuestions: 150,
    });
    expect(plan[0]).toEqual({ kind: 'review', count: 7 });
    expect(plan.length).toBeLessThanOrEqual(4);
  });
  it('suggests a mini mock in the mock stage', () => {
    const plan = todaysPlan({ stage: 'mock', dueReviews: 0, dailyMinutes: 20, daysLeft: 30, examQuestions: 150, examMinutes: 240 });
    // At exam pace: 50 questions of a 240-minute, 150-question exam = 80 minutes (C4).
    expect(plan).toEqual([{ kind: 'mock', questions: 50, label: 'Mini mock · 50 questions', minutes: 80 }]);
  });
});

describe("today's plan, sized in minutes (mobile 1.15, PHASE5.md §2.3)", () => {
  const DAY = 86_400_000;
  const NOW = new Date(2026, 9, 12, 9).getTime();
  const input = (over: Partial<PlanInput> = {}): PlanInput => ({
    stage: 'practice',
    dueReviews: 0,
    dailyMinutes: 20,
    focusDomain: { id: '4', short: 'IS Operations' },
    nextLesson: { id: 'l1', title: 'The audit charter', minutes: 5, domainId: '1', domainShort: 'IS Audit' },
    daysLeft: 40,
    examQuestions: 150,
    examMinutes: 240,
    now: NOW,
    ...over,
  });

  it('budget property: every minute choice × every stage × reviews due fits the budget plus 15%, with at least one item', () => {
    for (const B of DAILY_MINUTES)
      for (const stage of STAGE_ORDER as Stage[])
        for (const due of [0, 3, 19, 55])
          for (const familiarity of [undefined, 'new', 'some', 'experienced'] as const)
            for (const daysLeft of [40, 5, 1, 0]) {
              const plan = todaysPlan(input({ dailyMinutes: B, stage, dueReviews: due, familiarity, daysLeft, answered: 7 }));
              const where = `B=${B} ${stage} due=${due} ${familiarity} days=${daysLeft}`;
              expect([where, planMinutes(plan) <= B + planTolerance(B)]).toEqual([where, true]);
              expect(plan.length).toBeLessThanOrEqual(4);
              if (stage !== 'afterExam' || daysLeft <= 1) expect([where, plan.length >= 1]).toEqual([where, true]);
            }
  });

  it('reviews take about half the day: B=10 → 5, 20 → 8, 30 → 12, 45 → 18', () => {
    const counts = DAILY_MINUTES.map((B) => todaysPlan(input({ dailyMinutes: B, dueReviews: 40 }))[0]);
    expect(counts.map((r) => r.kind === 'review' && r.count)).toEqual([8, 8, 12, 18]); // B=10 grows to fill (below)
    // Exactly as many as due when fewer are due, with no "of N" shape.
    expect(todaysPlan(input({ dueReviews: 3 }))[0]).toEqual({ kind: 'review', count: 3 });
  });

  it('the review fill rule: B=10 with 55 due is reviews only, 8 of them; practice waits', () => {
    for (const stage of ['learn', 'practice', 'ready'] as const) {
      const plan = todaysPlan(input({ stage, dailyMinutes: 10, dueReviews: 55 }));
      expect(plan).toEqual([{ kind: 'review', count: 8, due: 55, capped: true }]);
    }
  });

  it('a 20-minute day with 55 due: 8 reviews, then 8 questions on the focus domain', () => {
    const plan = todaysPlan(input({ dueReviews: 55 }));
    expect(plan).toEqual([
      { kind: 'review', count: 8, due: 55, capped: true },
      { kind: 'practice', count: 8, label: '8 questions · IS Operations', domainId: '4' },
    ]);
  });

  it('practice is sized to the day: 20 min → 16 questions (about 19 min); "Tomorrow" never previews more', () => {
    const plan = todaysPlan(input());
    expect(plan[0]).toEqual({ kind: 'practice', count: 16, label: '16 questions · IS Operations', domainId: '4' });
    expect(itemMinutes(plan[0])).toBe(19);
    expect(planMinutes(plan.slice(0, 2))).toBeLessThanOrEqual(20 + planTolerance(20));
    // 45 minutes: room for the lesson and the game too.
    expect(todaysPlan(input({ dailyMinutes: 45 })).map((i) => i.kind)).toEqual(['practice', 'lesson', 'game']);
  });

  it('the starting check is sized to the day and ends at 20 answers in all', () => {
    expect(todaysPlan(input({ stage: 'diagnose', dailyMinutes: 10 }))[0]).toEqual({ kind: 'practice', count: 8, label: 'Starting check: 8 mixed questions', why: 'check' });
    expect(todaysPlan(input({ stage: 'diagnose', dailyMinutes: 45 }))[0]).toMatchObject({ count: 20, label: 'Starting check: 20 mixed questions' });
    expect(todaysPlan(input({ stage: 'diagnose', dailyMinutes: 45, answered: 12 }))[0]).toMatchObject({ count: 8 });
    // Never fewer than 5.
    expect(todaysPlan(input({ stage: 'diagnose', dailyMinutes: 45, answered: 19 }))[0]).toMatchObject({ count: 5 });
  });

  it('new to audit: day 1 is the lesson, then 5 questions on its domain (no 20-question check)', () => {
    const plan = todaysPlan(input({ stage: 'diagnose', familiarity: 'new' }));
    expect(plan).toEqual([
      { kind: 'lesson', lessonId: 'l1', title: 'The audit charter', minutes: 5 },
      { kind: 'practice', count: 5, label: '5 questions · IS Audit', domainId: '1', why: 'learn' },
    ]);
    // No lesson left (a future cert, or all done): it plans like `some`.
    expect(todaysPlan(input({ stage: 'diagnose', familiarity: 'new', nextLesson: undefined }))[0]).toMatchObject({ why: 'check' });
  });

  it('experienced (or Exam-focused on): never a lesson, weak spots lead, and a mini mock once a week', () => {
    for (const over of [{ familiarity: 'experienced' as const }, { familiarity: 'new' as const, examFocused: true }]) {
      for (const stage of STAGE_ORDER as Stage[]) {
        for (const B of DAILY_MINUTES) {
          expect(todaysPlan(input({ ...over, stage, dailyMinutes: B })).some((i) => i.kind === 'lesson')).toBe(false);
        }
      }
    }
    const longAgo = todaysPlan(input({ familiarity: 'experienced', lastMockAt: NOW - 8 * DAY }));
    // The mock never leads (UX review P2): right after the first timed item.
    expect(longAgo.map((i) => i.kind)).toEqual(['practice', 'mock']);
    expect(longAgo[0]).toEqual({ kind: 'practice', count: 16, label: 'Weak spots: IS Operations', domainId: '4', why: 'weak' });
    // A mock 3 days ago: none this week.
    expect(todaysPlan(input({ familiarity: 'experienced', lastMockAt: NOW - 3 * DAY })).some((i) => i.kind === 'mock')).toBe(false);
    // The explicit choice wins: an experienced learner who switched it off gets lessons.
    expect(todaysPlan(input({ familiarity: 'experienced', examFocused: false, dailyMinutes: 45 })).some((i) => i.kind === 'lesson')).toBe(true);
  });

  it('Exam-focused never enters the learn stage: it practises instead ("Make it stick")', () => {
    const weak = { answeredTotal: 30, readiness: computeReadiness(cisa, answers(0.3)) };
    expect(journeyStage(base(weak))).toBe('learn');
    expect(journeyStage(base({ ...weak, examFocused: true }))).toBe('practice');
    expect(journeyStage(base({ ...weak, examFocused: false }))).toBe('learn');
  });

  it('the mock stage plans a mini mock at most once in 7 days', () => {
    expect(todaysPlan(input({ stage: 'mock', lastMockAt: NOW - 2 * DAY })).some((i) => i.kind === 'mock')).toBe(false);
    expect(todaysPlan(input({ stage: 'mock', lastMockAt: NOW - 7 * DAY })).some((i) => i.kind === 'mock')).toBe(true);
  });

  it('the eve is sized min(10, what the day fits), and says "N questions" like exam week', () => {
    expect(todaysPlan(input({ daysLeft: 1, dailyMinutes: 10 }))).toEqual([{ kind: 'practice', count: 8, label: 'Light review · 8 questions' }]);
    expect(todaysPlan(input({ daysLeft: 1, dailyMinutes: 45 }))).toEqual([{ kind: 'practice', count: 10, label: 'Light review · 10 questions' }]);
    expect(todaysPlan(input({ daysLeft: 1, dailyMinutes: 10, dueReviews: 30 }))[0]).toMatchObject({ kind: 'review', count: 8, label: 'Light review · 8 questions' });
    expect(questionsFor(10)).toBe(8);
  });
});

describe('streak with a weekly rest day', () => {
  const day = (d: number) => new Date(2026, 0, d, 12).getTime();
  it('one missed day keeps the streak (rest day)', () => {
    let s = bumpStreak({ current: 0, best: 0, lastDay: null }, day(1));
    s = bumpStreak(s, day(2));
    expect(visibleStreak(s, day(4))).toBe(2); // missed day 3, rest available
    s = bumpStreak(s, day(4));
    expect(s.current).toBe(3);
    expect(s.restDay).toBe('2026-01-03');
  });
  it('a second missed day within the week breaks it', () => {
    let s = bumpStreak({ current: 0, best: 0, lastDay: null }, day(1));
    s = bumpStreak(s, day(3)); // rest covers day 2
    s = bumpStreak(s, day(5)); // day 4 missed, rest already used this week
    expect(s.current).toBe(1);
  });
  it('two missed days in a row break it', () => {
    const s = bumpStreak({ current: 0, best: 0, lastDay: null }, day(1));
    expect(visibleStreak(s, day(4))).toBe(0);
  });
  it('week strip marks study days', () => {
    let s = bumpStreak({ current: 0, best: 0, lastDay: null }, day(1));
    s = bumpStreak(s, day(3));
    expect(weekStrip(s, day(3))).toEqual([false, false, false, false, true, false, true]);
  });
});

describe('streak migration', () => {
  it('keeps yesterday in the week strip for saves without recentDays', () => {
    const day = (d: number) => new Date(2026, 0, d, 12).getTime();
    const old = { current: 3, best: 3, lastDay: '2026-01-04' }; // pre-v1 save shape
    const s = bumpStreak(old, day(5));
    expect(weekStrip(s, day(5)).slice(-2)).toEqual([true, true]);
  });
});
