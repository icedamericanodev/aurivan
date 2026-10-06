import { getCertification } from '../content/certifications';
import { journeyStage, type JourneyInput } from '../engine/journey';
import { todaysPlan } from '../engine/planner';
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
      dailyGoal: 20,
      focusDomain: { id: '4', short: 'IS Operations' },
      nextLesson: { id: 'l1', title: 'Audit charter' },
      daysLeft: 40,
      examQuestions: 150,
    });
    expect(plan[0]).toEqual({ kind: 'review', count: 7 });
    expect(plan.length).toBeLessThanOrEqual(4);
  });
  it('suggests a mini mock in the mock stage', () => {
    const plan = todaysPlan({ stage: 'mock', dueReviews: 0, dailyGoal: 20, daysLeft: 30, examQuestions: 150 });
    expect(plan).toEqual([{ kind: 'mock', questions: 50, label: 'Mini mock · 50 questions' }]);
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
