/**
 * Mobile 1.15 "Fit the plan to each learner" (PHASE5.md §2.3, §2.5, §2.9):
 * the pure rules in engine/fit.ts, the settings store's fit actions, and the
 * engine's smaller changes (study mode suggestion, smart mix yardstick).
 */
import { getCertification } from '../content/certifications';
import { lessonsFor } from '../content/lessons';
import {
  DAILY_MINUTES,
  DEFAULT_MINUTES,
  examFocusedOf,
  FAMILIARITY_INFO,
  goalFromMinutes,
  minutesFromGoal,
  planLesson,
  planTolerance,
  questionsFor,
  shouldAskFit,
  skippableDomains,
  snapMinutes,
  type FitAskInput,
} from '../engine/fit';
import { computeReadiness } from '../engine/readiness';
import { slotCounts } from '../engine/smartMix';
import { suggestedMode } from '../engine/studyModes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dailyMinutesOf, useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('minutes and the old daily goal', () => {
  it('the choices are 10 / 20 / 30 / 45, 20 by default', () => {
    expect([...DAILY_MINUTES]).toEqual([10, 20, 30, 45]);
    expect(DEFAULT_MINUTES).toBe(20);
  });

  it('minutesFromGoal: 10 → 10, 20 → 20, 40 → 45; odd values snap; broken values give the default', () => {
    expect(minutesFromGoal(10)).toBe(10);
    expect(minutesFromGoal(20)).toBe(20);
    expect(minutesFromGoal(40)).toBe(45);
    expect(minutesFromGoal(30)).toBe(30); // 36 min of questions → 30
    expect(minutesFromGoal(1)).toBe(10);
    expect(minutesFromGoal(999)).toBe(45);
    expect(minutesFromGoal(Number.NaN)).toBe(20);
  });

  it('goalFromMinutes: the nearest old goal, written for older apps reading a backup', () => {
    expect(DAILY_MINUTES.map(goalFromMinutes)).toEqual([10, 20, 20, 40]);
    // Round trip: an old goal survives minutes and back.
    for (const g of [10, 20, 40]) expect(goalFromMinutes(minutesFromGoal(g))).toBe(g);
  });

  it('snapMinutes: any number → the nearest choice', () => {
    expect(snapMinutes(33)).toBe(30);
    expect(snapMinutes(0)).toBe(10);
    expect(snapMinutes(60)).toBe(45);
    expect(snapMinutes(Number.POSITIVE_INFINITY)).toBe(20);
  });

  it('questionsFor: 10 → 8, 20 → 16, 30 → 25, 45 → 37, never below 5', () => {
    expect(DAILY_MINUTES.map(questionsFor)).toEqual([8, 16, 25, 37]);
    expect(questionsFor(1)).toBe(5);
    expect(questionsFor(0)).toBe(5);
  });

  it('the tolerance is 15% of the day, at least 2 minutes', () => {
    expect(DAILY_MINUTES.map(planTolerance)).toEqual([2, 3, 5, 7]);
  });
});

describe('Exam-focused and familiarity', () => {
  it('an explicit choice wins; otherwise on for experienced practitioners only', () => {
    expect(examFocusedOf({})).toBe(false);
    expect(examFocusedOf({ familiarity: 'new' })).toBe(false);
    expect(examFocusedOf({ familiarity: 'some' })).toBe(false);
    expect(examFocusedOf({ familiarity: 'experienced' })).toBe(true);
    expect(examFocusedOf({ familiarity: 'experienced', examFocused: false })).toBe(false);
    expect(examFocusedOf({ familiarity: 'new', examFocused: true })).toBe(true);
  });

  it('the three rows, word for word (PHASE5.md §2.1)', () => {
    expect(FAMILIARITY_INFO).toEqual({
      new: { title: 'New to audit', subtitle: 'I’m new to IT audit, or I’ve just graduated.' },
      some: { title: 'Some IT audit experience', subtitle: 'I work in IT, risk or audit, or I’ve studied some of it.' },
      experienced: { title: 'Experienced practitioner', subtitle: 'Years in audit, risk or security. I want exam practice.' },
    });
  });

  it('a new learner at the start is offered Guided (worked examples first); others are unchanged', () => {
    expect(suggestedMode('diagnose', 'new')).toBe('guided');
    expect(suggestedMode('diagnose', 'some')).toBe('random');
    expect(suggestedMode('diagnose')).toBe('random');
    expect(suggestedMode('practice', 'new')).toBe('smart');
    expect(suggestedMode('learn', 'experienced')).toBe('guided');
  });

  it('the smart mix reads its backlog yardstick from the minutes (questionsFor)', () => {
    // 20 minutes → 16 questions a day; 40 due is more than twice that: the backlog share.
    expect(slotCounts(10, 40, questionsFor(20))).toEqual(slotCounts(10, 40, 16));
    expect(slotCounts(10, 40, questionsFor(45)).due).toBeLessThanOrEqual(slotCounts(10, 40, questionsFor(10)).due);
  });
});

describe('diagnostic-led skipping (the plan only; Learn keeps every lesson)', () => {
  const cisa = getCertification('cisa')!;
  const lessons = lessonsFor('cisa');
  /** 6 answers in domain 1 at 5 of 6 right (83%), 6 in domain 2 at 3 of 6. */
  const answers: Record<string, { attempts: number; correctCount: number; lastCorrect: boolean; lastAt: number }> = {};
  for (let i = 0; i < 6; i++) {
    answers[`d1_${900 + i}`] = { attempts: 1, correctCount: 1, lastCorrect: i < 5, lastAt: 0 };
    answers[`d2_${900 + i}`] = { attempts: 1, correctCount: 1, lastCorrect: i < 3, lastAt: 0 };
  }
  const domains = computeReadiness(cisa, answers).domains;

  it('skips domains with ≥ 5 answers at ≥ 80% for some and experienced, never for new', () => {
    expect([...skippableDomains('some', domains)]).toEqual(['1']);
    expect([...skippableDomains('experienced', domains)]).toEqual(['1']);
    expect([...skippableDomains(undefined, domains)]).toEqual(['1']);
    expect(skippableDomains('new', domains).size).toBe(0);
    // Fewer than 5 answers proves nothing yet.
    const few = computeReadiness(cisa, { d3_900: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: 0 } }).domains;
    expect(skippableDomains('some', few).size).toBe(0);
  });

  it('planLesson: new learners go in order from the start; others skip known domains and prefer the focus', () => {
    expect(planLesson(lessons, [], { familiarity: 'new', inOrder: true })?.id).toBe(lessons[0].id);
    // Every lesson in the first domain done (a restore): the next undone one, in order.
    const d1 = lessons.filter((l) => l.domainId === '1').map((l) => l.id);
    expect(planLesson(lessons, d1, { familiarity: 'new', inOrder: true })?.domainId).toBe('2');
    const skip = skippableDomains('some', domains);
    expect(planLesson(lessons, [], { familiarity: 'some', skip })?.domainId).not.toBe('1');
    expect(planLesson(lessons, [], { familiarity: 'some', preferDomainId: '4', skip })?.domainId).toBe('4');
    // Never a lesson already done; none left → none.
    expect(planLesson(lessons, lessons.map((l) => l.id), {})).toBeUndefined();
  });
});

describe('shouldAskFit: ask once, never nag (PHASE5.md §2.5)', () => {
  const ok: FitAskInput = { onboarded: true, daysLeft: 40, examMoment: false, readyPanel: false, plantLine: false };

  it('shows for an onboarded learner who has never answered, with no date or a far one', () => {
    expect(shouldAskFit(ok)).toBe(true);
    expect(shouldAskFit({ ...ok, daysLeft: null })).toBe(true);
    expect(shouldAskFit({ ...ok, daysLeft: 8 })).toBe(true);
  });

  it('never: not onboarded, answered, dismissed, familiarity set, exam week, a moment, the ready panel, the plant line', () => {
    expect(shouldAskFit({ ...ok, onboarded: false })).toBe(false);
    expect(shouldAskFit({ ...ok, fitPrompt: 'answered' })).toBe(false);
    expect(shouldAskFit({ ...ok, fitPrompt: 'dismissed' })).toBe(false);
    expect(shouldAskFit({ ...ok, familiarity: 'some' })).toBe(false);
    for (const daysLeft of [7, 3, 1, 0, -2]) expect(shouldAskFit({ ...ok, daysLeft })).toBe(false);
    expect(shouldAskFit({ ...ok, examMoment: true })).toBe(false);
    expect(shouldAskFit({ ...ok, readyPanel: true })).toBe(false);
    expect(shouldAskFit({ ...ok, plantLine: true })).toBe(false);
  });
});

describe('settings store: the fit', () => {
  const initial = useSettings.getInitialState();
  beforeEach(() => useSettings.setState(initial, true));

  it('an old save (no minutes) reads its daily goal as minutes: 40 a day → 45 min', () => {
    useSettings.setState({ dailyGoal: 40 });
    expect(dailyMinutesOf(useSettings.getState())).toBe(45);
    useSettings.setState({ dailyGoal: 10 });
    expect(dailyMinutesOf(useSettings.getState())).toBe(10);
  });

  it('completeOnboarding saves the fit, the matching old goal, and answers the Today card', () => {
    useSettings.getState().completeOnboarding('cisa', '2027-01-12', { familiarity: 'new', dailyMinutes: 30 });
    expect(useSettings.getState()).toMatchObject({ onboarded: true, familiarity: 'new', dailyMinutes: 30, dailyGoal: 20, fitPrompt: 'answered' });
    // Familiarity skipped: still answered (a new learner already chose), familiarity unset.
    useSettings.setState(initial, true);
    useSettings.getState().completeOnboarding('cisa', undefined, { dailyMinutes: 20 });
    expect(useSettings.getState().familiarity).toBeUndefined();
    expect(useSettings.getState().fitPrompt).toBe('answered');
    // A restore finishing onboarding passes no fit: nothing is set, so the card can ask later.
    useSettings.setState(initial, true);
    useSettings.getState().completeOnboarding('cisa');
    expect(useSettings.getState().fitPrompt).toBeUndefined();
  });

  it('setFit writes dailyGoal too, clears with null, and counts later changes (never the first answer)', () => {
    const s = () => useSettings.getState();
    s().setFit({ dailyMinutes: 45 });
    expect(s()).toMatchObject({ dailyMinutes: 45, dailyGoal: 40, fitPrompt: 'answered' });
    expect(s().fitChanges).toBeUndefined();
    s().setFit({ familiarity: 'experienced', examFocused: false });
    expect(s()).toMatchObject({ familiarity: 'experienced', examFocused: false, fitChanges: 1 });
    // The same values again: no change, no count.
    s().setFit({ familiarity: 'experienced' });
    expect(s().fitChanges).toBe(1);
    // null clears: back to "follow familiarity" / "not said".
    s().setFit({ examFocused: null, familiarity: null });
    expect(s().examFocused).toBeUndefined();
    expect(s().familiarity).toBeUndefined();
    expect(s().fitChanges).toBe(2);
  });

  it('a 1.14 save on disk loads with no fit keys, and its 40-a-day goal plans 45 minutes', async () => {
    await AsyncStorage.setItem('aurivan.settings.v1', JSON.stringify({ state: { onboarded: true, activeCertId: 'cisa', dailyGoal: 40, examDates: {} }, version: 1 }));
    await useSettings.persist.rehydrate();
    const st = useSettings.getState();
    expect(st.onboarded).toBe(true);
    expect([st.familiarity, st.dailyMinutes, st.examFocused, st.fitPrompt]).toEqual([undefined, undefined, undefined, undefined]);
    expect(dailyMinutesOf(st)).toBe(45);
    await AsyncStorage.clear();
  });

  it('"Not now" dismisses for good, and never overwrites an answer', () => {
    useSettings.getState().dismissFitPrompt();
    expect(useSettings.getState().fitPrompt).toBe('dismissed');
    useSettings.setState({ fitPrompt: 'answered' });
    useSettings.getState().dismissFitPrompt();
    expect(useSettings.getState().fitPrompt).toBe('answered');
  });
});
