/**
 * Mobile 1.41 engine rules:
 * - "Short on time? 5 questions" (engine/dayPlan.ts shortSetItem): before the plan starts only, never
 *   on the first-set day, never in exam week, never on a mock-only day; its answers count toward the item;
 * - the name, asked later (engine/firstRun.ts nameAskDue): from the day after the first study day, once,
 *   only for learners onboarded on 1.41+, never beside another setup line;
 * - feedback: "Something confused me" (first) and "I couldn't find something" (an app reason).
 */
import { logActivity, SHORT_SET_SIZE, shortSetItem, type DayPlan } from '../engine/dayPlan';
import { nameAskDue } from '../engine/firstRun';
import type { PlanItem } from '../engine/planner';
import { buildFeedbackEmail, FEEDBACK_KINDS, REASONS } from '../engine/support';

const REVIEW: PlanItem = { kind: 'review', count: 12, due: 12 };
const LESSON: PlanItem = { kind: 'lesson', lessonId: 'cisa-l-d1-charter', title: 'Charter', minutes: 8 };
const PRACTICE: PlanItem = { kind: 'practice', count: 10, label: 'Practice · IS Audit', domainId: '1' };
const FIRST: PlanItem = { kind: 'practice', count: 5, label: 'Your first five', why: 'first' };
const MOCK: PlanItem = { kind: 'mock', questions: 50, label: 'Mini mock', minutes: 80 };
const plan = (items: PlanItem[], extra: Partial<DayPlan> = {}): DayPlan => ({
  day: '2026-10-24',
  certId: 'cisa',
  budget: 20,
  items,
  done: items.map(() => false),
  start: { score: 0, domains: {} },
  answered: 0,
  correct: 0,
  minutes: 0,
  ...extra,
});

describe('Short on time? 5 questions', () => {
  it('starts the first review or practice item, before anything is done', () => {
    expect(shortSetItem(plan([REVIEW, LESSON]), { examWeek: false })).toBe(0);
    expect(shortSetItem(plan([LESSON, PRACTICE]), { examWeek: false })).toBe(1);
    expect(SHORT_SET_SIZE).toBe(5);
  });

  it('hides once anything is done or answers are banked', () => {
    expect(shortSetItem(plan([REVIEW, LESSON], { done: [false, true] }), { examWeek: false })).toBe(-1);
    expect(shortSetItem(plan([REVIEW, LESSON], { credit: [3, 0] }), { examWeek: false })).toBe(-1);
  });

  it('never on the first-set day, a mock-only day, an empty plan or in exam week', () => {
    expect(shortSetItem(plan([FIRST]), { examWeek: false })).toBe(-1);
    expect(shortSetItem(plan([MOCK]), { examWeek: false })).toBe(-1);
    expect(shortSetItem(plan([LESSON]), { examWeek: false })).toBe(-1);
    expect(shortSetItem(plan([]), { examWeek: false })).toBe(-1);
    expect(shortSetItem(plan([REVIEW, LESSON]), { examWeek: true })).toBe(-1);
  });

  it('a plan that is already five questions has nothing shorter to offer', () => {
    expect(shortSetItem(plan([{ kind: 'practice', count: 5, label: 'Warm-up' }]), { examWeek: false })).toBe(-1);
  });

  it('five answers count toward the item (banked, and they tick a small one)', () => {
    const p = plan([REVIEW, LESSON]);
    const after = logActivity(p, { kind: 'session', mode: 'review', answered: 5, total: 5, minutes: 6 });
    expect(after.plan.credit?.[0]).toBe(5);
    const practice = plan([PRACTICE]);
    const got = logActivity(practice, { kind: 'session', mode: 'practice', answered: 5, total: 5, minutes: 6, byDomain: { '1': 5 } });
    expect(got.plan.credit?.[0]).toBe(5);
  });
});

describe('the name, asked later', () => {
  const base = { offered: true, hasName: false, studyDays: 1, lastStudyDay: '2026-10-23', today: '2026-10-24', otherSetup: false };
  it('asks from the day after the first study day', () => {
    expect(nameAskDue(base)).toBe(true);
    expect(nameAskDue({ ...base, studyDays: 2, lastStudyDay: '2026-10-24' })).toBe(true);
  });
  it('never on the first study day itself, or before any study', () => {
    expect(nameAskDue({ ...base, lastStudyDay: '2026-10-24' })).toBe(false);
    expect(nameAskDue({ ...base, studyDays: 0, lastStudyDay: undefined })).toBe(false);
  });
  it('never for someone with a name, someone already asked, or beside another setup line', () => {
    expect(nameAskDue({ ...base, hasName: true })).toBe(false);
    expect(nameAskDue({ ...base, offered: false })).toBe(false);
    expect(nameAskDue({ ...base, otherSetup: true })).toBe(false);
  });
});

describe('feedback kinds and app reasons', () => {
  it('"Something confused me" is listed first, with its own subject tag', () => {
    expect(FEEDBACK_KINDS[0]).toEqual({ code: 'confused', label: 'Something confused me', tag: 'Confused' });
    const e = buildFeedbackEmail({ kind: 'confused', certName: 'CISA', app: { version: '1.41.0', os: 'iOS 26' }, from: 'Help' });
    expect(e.subject).toBe('KaiSip · Feedback · Confused · CISA');
    expect(e.body).toContain('Kind: Something confused me');
    // Still no personal data: no name, score, streak or exam date fields.
    expect(e.body).not.toMatch(/streak|score|readiness|exam date|name:/i);
  });

  it('"I couldn’t find something" is an app reason, before "Something else"', () => {
    const codes = REASONS.app.map((r) => r.code);
    expect(codes).toContain('findable');
    expect(codes.indexOf('findable')).toBe(codes.length - 2);
    expect(REASONS.app.find((r) => r.code === 'findable')?.label).toBe('I couldn’t find something');
  });
});
