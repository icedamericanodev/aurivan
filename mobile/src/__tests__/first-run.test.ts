/**
 * Mobile 1.24, "first five minutes": the pure rules and words.
 * - engine/firstRun.ts: the consequence line, the Day-1 closing words, the
 *   "first readiness range" summary and the reminder ask rules;
 * - content/firstSet.ts: the five questions exist, one per domain, in order;
 * - engine/planner.ts: Day 1 is the first set alone, and the first 20 answers
 *   finish inside ordinary plans on days 2 and 3 (with no "check" word).
 */
import { getCertification } from '../content/certifications';
import { FIRST_SET, FIRST_SET_SIZE, firstSetIds } from '../content/firstSet';
import { findQuestion } from '../content/loader';
import {
  comeBackLine,
  defaultReminderTime,
  firstRange,
  firstRangePanelDue,
  firstSetFact,
  FIRST_RANGE_MAX_ANSWERS,
  planConsequence,
  reminderAskLine,
  secondAskDue,
  spanLabel,
  tomorrowPreview,
} from '../engine/firstRun';
import { FIRST_SET_COUNT, FIRST_SET_LABEL, todaysPlan, type PlanInput, type PlanItem } from '../engine/planner';

describe('the first set: five questions, the same for everyone', () => {
  const cert = getCertification('cisa')!;

  it('has five questions, one per domain, in domain order', () => {
    const ids = firstSetIds('cisa');
    expect(ids).toHaveLength(FIRST_SET_SIZE);
    const domains = ids.map((id) => findQuestion('cisa', id)?.domainId);
    expect(domains).toEqual(cert.domains.map((d) => d.id));
  });

  it('every id is a real question, with a key and a reason for each wrong answer', () => {
    for (const id of firstSetIds('cisa')) {
      const q = findQuestion('cisa', id)!;
      expect(q).toBeDefined();
      expect(q.options[q.correct]).toBeTruthy();
      const wrong = Object.keys(q.options).filter((k) => k !== q.correct);
      for (const k of wrong) expect((q.wrongExplanations as Record<string, string | undefined>)[k]).toBeTruthy();
    }
  });

  it('is plain data: no id repeats, and a cert with none has an empty set', () => {
    expect(new Set(FIRST_SET.cisa).size).toBe(FIRST_SET.cisa.length);
    expect(firstSetIds('nope')).toEqual([]);
  });

  it('the planner and the content agree on the size and the label', () => {
    expect(FIRST_SET_COUNT).toBe(FIRST_SET_SIZE);
    expect(FIRST_SET_LABEL).toBe('Your first five');
  });
});

describe('onboarding: what the two choices add up to', () => {
  it('says the span and the daily minutes in plain words', () => {
    expect(planConsequence(42, 20)).toBe('6 weeks: about 20 min a day adds up to about 14 hours of study.');
    expect(planConsequence(30, 45)).toBe('4 weeks: about 45 min a day adds up to about 23 hours of study.');
    expect(planConsequence(90, 10)).toBe('13 weeks: about 10 min a day adds up to about 15 hours of study.');
  });
  it('short spans count days; long ones count months', () => {
    expect(spanLabel(1)).toBe('1 day');
    expect(spanLabel(10)).toBe('10 days');
    expect(spanLabel(14)).toBe('2 weeks');
    expect(spanLabel(180)).toBe('6 months');
    expect(planConsequence(5, 10)).toBe('5 days: about 10 min a day adds up to about 50 min of study.');
  });
  it('no date: says what the plan does instead; never "check" or "diagnose"', () => {
    for (const d of [null, 0, -3]) {
      const t = planConsequence(d, 20);
      expect(t).toMatch(/No date yet/);
      expect(t).toMatch(/about 20 min a day/);
      expect(t).not.toMatch(/check|diagnos/i);
    }
  });
});

describe('Day-1 closing words', () => {
  it('the one fact under "3 of 5"', () => {
    expect(firstSetFact(5, 5)).toBe('All five right.');
    expect(firstSetFact(3, 5, 'Audit independence')).toBe('Most missed: Audit independence.');
    expect(firstSetFact(2, 5)).toMatch(/come back/);
    expect(firstSetFact(1, 1)).toBe('Right.');
  });
  it('"N will come back tomorrow"', () => {
    expect(comeBackLine(0)).toBeNull();
    expect(comeBackLine(1)).toBe('1 will come back tomorrow.');
    expect(comeBackLine(2)).toBe('2 will come back tomorrow.');
  });
  it('tomorrow in one line, from the plan, leaving reviews out', () => {
    const lesson: PlanItem = { kind: 'lesson', lessonId: 'l', title: 'Business impact analysis', minutes: 12 };
    const practice: PlanItem = { kind: 'practice', count: 5, label: '5 questions' };
    expect(tomorrowPreview([lesson, practice])).toBe('A 12-minute lesson on Business impact analysis, then 5 questions');
    expect(tomorrowPreview([lesson])).toBe('A 12-minute lesson on Business impact analysis');
    expect(tomorrowPreview([{ kind: 'practice', count: 15, label: '15 mixed questions' }])).toBe('15 questions, about 18 min');
    expect(tomorrowPreview([])).toBeNull();
  });
  it('no word "check" or "diagnose" in any of it', () => {
    const all = [firstSetFact(3, 5, 'Fraud'), firstSetFact(5, 5), comeBackLine(2), tomorrowPreview([{ kind: 'practice', count: 15, label: 'x' }])].join(' ');
    expect(all).not.toMatch(/check|diagnos/i);
  });
});

describe('"Your first readiness range"', () => {
  it('names the strongest and the weakest domain among those with answers', () => {
    const stats = [
      { domainId: '1', mastery: 0.8, answered: 10 },
      { domainId: '2', mastery: 0.5, answered: 10 },
      { domainId: '3', mastery: 0.9, answered: 0 }, // no answers: never named
      { domainId: '4', mastery: 0.65, answered: 10 },
    ];
    expect(firstRange(stats)).toEqual({ strongest: '1', weakest: '2' });
  });
  it('never names the same domain twice, or a weakest when everything is level', () => {
    expect(firstRange([{ domainId: '1', mastery: 0.7, answered: 20 }])).toEqual({ strongest: '1', weakest: null });
    expect(
      firstRange([
        { domainId: '1', mastery: 0.7, answered: 5 },
        { domainId: '2', mastery: 0.7, answered: 5 },
      ]),
    ).toEqual({ strongest: '1', weakest: null });
    expect(firstRange([])).toEqual({ strongest: null, weakest: null });
  });
  it('shows once, only while the range is new', () => {
    expect(firstRangePanelDue({ enough: true, answered: 45, seen: false })).toBe(true);
    expect(firstRangePanelDue({ enough: false, answered: 30, seen: false })).toBe(false);
    expect(firstRangePanelDue({ enough: true, answered: 45, seen: true })).toBe(false);
    // A restore with a settled range does not get a "first" moment.
    expect(firstRangePanelDue({ enough: true, answered: FIRST_RANGE_MAX_ANSWERS + 1, seen: false })).toBe(false);
    expect(firstRangePanelDue({ enough: true, answered: FIRST_RANGE_MAX_ANSWERS, seen: false })).toBe(true);
  });
});

describe('the reminder ask', () => {
  it('defaults to the hour the learner is studying now, on the hour', () => {
    const now = new Date(2026, 9, 15, 21, 47).getTime();
    expect(defaultReminderTime(now)).toEqual({ hour: 21, minute: 0 });
    expect(reminderAskLine(19, 0, 'en-US')).toBe('Tomorrow I’ll study at 7:00 PM');
    expect(reminderAskLine(19, 0, 'en-GB')).toBe('Tomorrow I’ll study at 19:00');
  });

  const due = { supported: true, enabled: false, studyDays: 3, studiedToday: true, secondShown: false } as const;
  it('the second chance: the 3rd study day, studied today, still off, not shown before', () => {
    expect(secondAskDue(due)).toBe(true);
    expect(secondAskDue({ ...due, first: 'later' })).toBe(true);
    expect(secondAskDue({ ...due, studyDays: 2 })).toBe(false);
    expect(secondAskDue({ ...due, studiedToday: false })).toBe(false);
  });
  it('never twice, never once reminders are on, never after the phone said no, never where unsupported', () => {
    expect(secondAskDue({ ...due, secondShown: true })).toBe(false);
    expect(secondAskDue({ ...due, enabled: true })).toBe(false);
    expect(secondAskDue({ ...due, first: 'blocked' })).toBe(false);
    expect(secondAskDue({ ...due, supported: false })).toBe(false);
    expect(secondAskDue({ ...due, first: 'on', enabled: true })).toBe(false);
  });
});

describe('the plan: Day 1 is the first set, the rest of the first 20 finish on days 2 and 3', () => {
  const NOW = new Date(2026, 9, 15, 10, 0).getTime();
  const input = (over: Partial<PlanInput> = {}): PlanInput => ({
    stage: 'diagnose',
    dueReviews: 0,
    dailyMinutes: 20,
    focusDomain: { id: '1', short: 'IS Audit' },
    nextLesson: { id: 'l1', title: 'The audit charter', minutes: 12, domainId: '1', domainShort: 'IS Audit' },
    now: NOW,
    daysLeft: 60,
    examQuestions: 150,
    examMinutes: 240,
    answered: 0,
    ...over,
  });
  const FIRST: PlanItem = { kind: 'practice', count: 5, label: 'Your first five', why: 'first' };

  it('Day 1 is one item for everyone, whatever they said about where they start', () => {
    for (const familiarity of [undefined, 'new', 'some', 'experienced'] as const) {
      for (const dailyMinutes of [10, 20, 45]) {
        expect(todaysPlan(input({ familiarity, dailyMinutes }))).toEqual([FIRST]);
      }
    }
    // Exam-focused learners too.
    expect(todaysPlan(input({ familiarity: 'new', examFocused: true }))).toEqual([FIRST]);
  });

  it('even a learner who sets up in exam week starts with the first set', () => {
    expect(todaysPlan(input({ stage: 'examDay', daysLeft: 5 }))).toEqual([FIRST]);
  });

  it('no lesson before it for a learner new to audit, and no mock, no game', () => {
    const plan = todaysPlan(input({ familiarity: 'new' }));
    expect(plan.map((i) => i.kind)).toEqual(['practice']);
  });

  it('from the first answer on, new learners get the lesson and questions that fit the day', () => {
    const plan = todaysPlan(input({ familiarity: 'new', answered: 5 }));
    expect(plan.map((i) => i.kind)).toEqual(['lesson', 'practice']);
    expect(plan[1]).toMatchObject({ kind: 'practice', why: 'learn' });
  });

  it('everyone else finishes the first 20 inside an ordinary mixed set, with a plain label', () => {
    const day2 = todaysPlan(input({ answered: 5, dailyMinutes: 45 }));
    expect(day2[0]).toMatchObject({ kind: 'practice', count: 15, why: 'check', label: '15 mixed questions' });
    const day3 = todaysPlan(input({ answered: 15, dailyMinutes: 45 }));
    expect(day3[0]).toMatchObject({ count: 5, label: '5 mixed questions' });
    for (const p of [...day2, ...day3]) expect('label' in p ? p.label : '').not.toMatch(/check|diagnos/i);
  });

  it('exam week before 20 answers also uses the plain label', () => {
    const plan = todaysPlan(input({ stage: 'examDay', daysLeft: 5, answered: 8, dailyMinutes: 45 }));
    const practice = plan.find((i) => i.kind === 'practice')!;
    expect(practice).toMatchObject({ why: 'check' });
    expect((practice as { label: string }).label).toMatch(/^\d+ mixed questions$/);
  });
});
