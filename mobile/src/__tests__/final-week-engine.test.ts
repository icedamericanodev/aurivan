/**
 * Final review week, the rules (engine/finalWeek.ts, engine/examWeek.ts,
 * lib/finalWeek.ts topSlip) and the saved "days done":
 * - which card is today; the Today card's window (8 days out to the eve
 *   with a plan, 7 to 2 without);
 * - days marked done belong to one exam date and sit BESIDE the checklist
 *   ticks (neither one wipes the other); a junk id is dropped;
 * - focus / next_focus (readiness, with the no-data fallback);
 * - what each action kind opens, including top_slip's fallbacks;
 * - backup round trip and sync merge for the new field.
 */
import { CERTIFICATIONS, getCertification } from '../content/certifications';
import { getFinalWeek } from '../content/exam';
import { getAllQuestions } from '../content/loader';
import { subtopicOfQuestion } from '../content/notes';
import { readBackup } from '../engine/backup';
import {
  cleanDays,
  CHECKLIST_WINDOW,
  examWeekCardDue,
  examWeekOf,
  FINAL_WEEK_WINDOW,
  hideExamWeek,
  toggleExamWeek,
  toggleWeekDay,
  weekDaysCount,
  weekDaysOf,
} from '../engine/examWeek';
import { dayForToday, miniMockSize, mostMissedSubtopic, resolveAction, sheetParts, weekFocus, type ActionContext } from '../engine/finalWeek';
import { computeReadiness, type AnswerRecord } from '../engine/readiness';
import { shouldAskFit } from '../engine/fit';
import { STAGE_ORDER, type Stage } from '../engine/journey';
import { FINAL_WEEK_MOCK_REST, todaysPlan } from '../engine/planner';
import { runnerUp } from '../engine/tips';
import { mergeSides, type SyncedProgress } from '../engine/syncMerge';
import { checkBackupText, currentBackup } from '../lib/backup';
import { actionContext, topSlip } from '../lib/finalWeek';
import { selectCert, useProgress, type ThinkingSlip } from '../store/progress';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const cisa = getCertification('cisa')!;
const week = getFinalWeek('cisa')!;
const DATE = '2026-10-26';
const OTHER = '2026-11-02';

describe('today’s day card and Today’s window', () => {
  it('the card for today is the one whose days-before equals the days left', () => {
    expect([8, 7, 6, 4, 1, 0, -1, null].map((d) => dayForToday(week.days, d)?.id ?? null)).toEqual([null, 'day-7', 'day-6', 'day-4', 'day-1', null, null, null]);
  });

  it('with a plan, Today shows the card from 8 days out to the eve; without one, 7 to 2 as before', () => {
    const days = [10, 9, 8, 7, 6, 2, 1, 0, -1];
    expect(days.map((d) => examWeekCardDue(d, undefined, DATE, FINAL_WEEK_WINDOW))).toEqual([false, false, true, true, true, true, true, false, false]);
    expect(days.map((d) => examWeekCardDue(d, undefined, DATE, CHECKLIST_WINDOW))).toEqual([false, false, false, true, true, true, false, false, false]);
    // The default is the checklist's window.
    expect(days.map((d) => examWeekCardDue(d, undefined, DATE))).toEqual(days.map((d) => examWeekCardDue(d, undefined, DATE, CHECKLIST_WINDOW)));
    // Hidden for this date: hidden in either window; no date: never.
    expect(examWeekCardDue(5, hideExamWeek(undefined, DATE), DATE, FINAL_WEEK_WINDOW)).toBe(false);
    expect(examWeekCardDue(5, undefined, undefined, FINAL_WEEK_WINDOW)).toBe(false);
  });
});

describe('days marked done (saved beside the checklist ticks)', () => {
  it('toggles per exam date; another date starts fresh', () => {
    let s = toggleWeekDay(undefined, DATE, 'day-7');
    s = toggleWeekDay(s, DATE, 'day-5');
    expect(s).toEqual({ for: DATE, done: [], days: ['day-7', 'day-5'] });
    expect(weekDaysOf(s, DATE)).toEqual(['day-7', 'day-5']);
    expect(weekDaysOf(s, OTHER)).toEqual([]);
    expect(weekDaysOf(toggleWeekDay(s, DATE, 'day-7'), DATE)).toEqual(['day-5']);
    // Untick the last one: no empty list is kept.
    expect(toggleWeekDay(toggleWeekDay(undefined, DATE, 'day-3'), DATE, 'day-3')).toEqual({ for: DATE, done: [] });
    expect(toggleWeekDay(s, OTHER, 'day-1')).toEqual({ for: OTHER, done: [], days: ['day-1'] });
    expect(weekDaysCount(2, 7)).toBe('2 of 7 days done');
  });

  it('ticks, Hide and days never wipe each other', () => {
    let s = toggleExamWeek(undefined, DATE, 'booking');
    s = toggleWeekDay(s, DATE, 'day-6');
    s = toggleExamWeek(s, DATE, 'sleep');
    s = hideExamWeek(s, DATE);
    s = toggleWeekDay(s, DATE, 'day-4');
    expect(s).toEqual({ for: DATE, done: ['booking', 'sleep'], hidden: true, days: ['day-6', 'day-4'] });
    expect(examWeekOf(s, DATE)).toEqual({ done: ['booking', 'sleep'], hidden: true });
  });

  it('a junk or repeated day id is dropped, and the order counts down', () => {
    expect(cleanDays(['day-1', 'day-9', 'day-7', 'day-1', 7, null, 'Day-2', 'day-3'])).toEqual(['day-7', 'day-3', 'day-1']);
    expect(weekDaysOf({ for: DATE, done: [], days: ['day-0', 'day-2'] }, DATE)).toEqual(['day-2']);
  });

  it('the store saves it per cert and a Reset keeps it (it is about the exam, not study)', () => {
    useProgress.getState().resetCert('cisa');
    useProgress.getState().toggleWeekDay('cisa', DATE, 'day-7');
    useProgress.getState().tickExamWeek('cisa', DATE, 'pace');
    expect(selectCert(useProgress.getState(), 'cisa').moments?.examWeek).toEqual({ for: DATE, done: ['pace'], days: ['day-7'] });
    useProgress.getState().resetCert('cisa');
    expect(selectCert(useProgress.getState(), 'cisa').moments?.examWeek).toEqual({ for: DATE, done: ['pace'], days: ['day-7'] });
  });

  it('round-trips a backup; a tampered list is cleaned, not refused; an older file has none', () => {
    useProgress.getState().resetCert('cisa');
    useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...s.byCert.cisa, moments: undefined } } }));
    const plain = checkBackupText(JSON.stringify(currentBackup(Date.now())));
    if (plain.kind !== 'ok') throw new Error(plain.code);
    expect(plain.data.progress.byCert.cisa.moments?.examWeek).toBeUndefined();

    useProgress.getState().toggleWeekDay('cisa', DATE, 'day-6');
    useProgress.getState().toggleWeekDay('cisa', DATE, 'day-2');
    const file = currentBackup(Date.now());
    const read = checkBackupText(JSON.stringify(file));
    if (read.kind !== 'ok') throw new Error(read.code);
    expect(read.data.progress.byCert.cisa.moments?.examWeek).toEqual({ for: DATE, done: [], days: ['day-6', 'day-2'] });
    const tampered = JSON.parse(JSON.stringify(file));
    tampered.stores.progress.state.byCert.cisa.moments.examWeek.days = ['day-2', 'day-99', 'day-2', 5, 'day-5'];
    expect(readBackup(JSON.stringify(tampered), CERTIFICATIONS.map((c) => c.id)).progress.byCert.cisa.moments?.examWeek?.days).toEqual(['day-5', 'day-2']);
    tampered.stores.progress.state.byCert.cisa.moments.examWeek.days = 'all of them';
    expect(readBackup(JSON.stringify(tampered), CERTIFICATIONS.map((c) => c.id)).progress.byCert.cisa.moments?.examWeek?.days).toEqual([]);
  });

  it('sync: a day marked done on either phone stays done (same exam date)', () => {
    const T0 = new Date(2026, 9, 19, 9).getTime();
    const ctx = { now: T0, knownCertIds: CERTIFICATIONS.map((c) => c.id) };
    const side = (examWeek: object) => ({
      state: { byCert: { cisa: { answers: {}, moments: { examWeek } } }, streak: { current: 0, best: 0, lastDay: null } } as unknown as SyncedProgress,
      stamps: {},
    });
    const a = side({ for: DATE, done: ['pace'], days: ['day-7'] });
    const b = side({ for: DATE, done: ['sleep'], days: ['day-6'] });
    const m = mergeSides('progress', a, b, ctx).state.byCert.cisa.moments?.examWeek;
    expect(m).toEqual({ for: DATE, done: ['pace', 'sleep'], days: ['day-7', 'day-6'] });
    expect(mergeSides('progress', b, a, ctx).state.byCert.cisa.moments?.examWeek).toEqual(m);
    // A side from before the final week (no days) merges cleanly.
    expect(mergeSides('progress', side({ for: DATE, done: [] }), side({ for: DATE, done: ['booking'] }), ctx).state.byCert.cisa.moments?.examWeek).toEqual({ for: DATE, done: ['booking'] });
  });
});

describe('focus and next focus', () => {
  const answers = (byDomain: Record<string, [number, number]>): Record<string, AnswerRecord> => {
    const out: Record<string, AnswerRecord> = {};
    for (const [d, [n, right]] of Object.entries(byDomain)) {
      getAllQuestions('cisa')
        .filter((q) => q.domainId === d)
        .slice(0, n)
        .forEach((q, i) => {
          out[q.id] = { attempts: 1, correctCount: i < right ? 1 : 0, lastCorrect: i < right, lastAt: 1 };
        });
    }
    return out;
  };

  it('no answers yet: the heaviest-weighted domains (CISA: 4, then 5)', () => {
    expect(weekFocus(cisa.domains, computeReadiness(cisa, {}))).toEqual({ focus: '4', next: '5' });
  });

  it('with answers: the readiness focus first, then the next largest weighted gap', () => {
    // Domain 4 strong, Domain 2 weak, the rest middling.
    const r = computeReadiness(cisa, answers({ '1': [10, 6], '2': [10, 1], '3': [10, 6], '4': [10, 10], '5': [10, 6] }));
    const f = weekFocus(cisa.domains, r);
    expect(f.focus).toBe(r.focusDomainId);
    // Gaps: 1 → .4×18=7.2, 2 → .9×18=16.2, 3 → .4×12=4.8, 4 → 0, 5 → .4×26=10.4.
    expect(f).toEqual({ focus: '2', next: '5' });
    expect(sheetParts(['focus', 'next_focus', '2', 'pace'], f)).toEqual(['2', '5', 'pace']);
  });
});

describe('what a task opens', () => {
  const ctx = (over: Partial<ActionContext> = {}): ActionContext => ({
    focus: { focus: '4', next: '5' },
    topSlip: null,
    exam: { questions: 150 },
    noteKind: (code) => (code === '1B3.2' ? { kind: 'subtopic' } : code === '1B3' ? { kind: 'topic', domainId: '1' } : undefined),
    principleKind: (id) => (id === 'evidence-quality' ? 'principle' : id === 'assurance' ? 'family' : undefined),
    ...over,
  });

  it('notes: a subtopic, a topic (its domain page), none (Study notes)', () => {
    expect(resolveAction({ kind: 'note', target: '1B3.2' }, ctx())).toEqual({ to: 'note', id: '1B3.2' });
    expect(resolveAction({ kind: 'note', target: '1B3' }, ctx())).toEqual({ to: 'notesDomain', domainId: '1' });
    expect(resolveAction({ kind: 'note' }, ctx())).toEqual({ to: 'notes' });
    // Removed by a later content update: the notes, never a dead page.
    expect(resolveAction({ kind: 'note', target: '9Z9.9' }, ctx())).toEqual({ to: 'notes' });
  });

  it('principles: one principle, a family, none', () => {
    expect(resolveAction({ kind: 'principles', target: 'evidence-quality' }, ctx())).toEqual({ to: 'principle', id: 'evidence-quality' });
    expect(resolveAction({ kind: 'principles', target: 'assurance' }, ctx())).toEqual({ to: 'principles', family: 'assurance' });
    expect(resolveAction({ kind: 'principles' }, ctx())).toEqual({ to: 'principles' });
  });

  it('top_slip: the principle; a "Didn’t know it" slip opens its note; no slip yet opens the library', () => {
    expect(resolveAction({ kind: 'principles', target: 'top_slip' }, ctx({ topSlip: { principleId: 'final-two' } }))).toEqual({ to: 'principle', id: 'final-two' });
    expect(resolveAction({ kind: 'principles', target: 'top_slip' }, ctx({ topSlip: { noteId: '4B1.2' } }))).toEqual({ to: 'note', id: '4B1.2' });
    expect(resolveAction({ kind: 'principles', target: 'top_slip' }, ctx())).toEqual({ to: 'principles' });
  });

  it('practice: a domain, focus, next focus', () => {
    expect(resolveAction({ kind: 'practice_domain', target: '3' }, ctx())).toEqual({ to: 'practice', domainId: '3' });
    expect(resolveAction({ kind: 'practice_domain', target: 'focus' }, ctx())).toEqual({ to: 'practice', domainId: '4' });
    expect(resolveAction({ kind: 'practice_domain', target: 'next_focus' }, ctx())).toEqual({ to: 'practice', domainId: '5' });
  });

  it('mocks (a third of the exam for a mini), the journal, the glossary', () => {
    expect(miniMockSize(150)).toBe(50);
    expect(resolveAction({ kind: 'mock_mini' }, ctx())).toEqual({ to: 'mock', questions: 50, full: false });
    expect(resolveAction({ kind: 'mock_full' }, ctx())).toEqual({ to: 'mock', questions: 150, full: true });
    expect(resolveAction({ kind: 'mistakes' }, ctx())).toEqual({ to: 'mistakes' });
    expect(resolveAction({ kind: 'glossary' }, ctx())).toEqual({ to: 'notes' });
    expect(resolveAction({ kind: 'glossary', target: 'RTO' }, ctx())).toEqual({ to: 'notes', q: 'RTO' });
  });

  it('every task in the real plan opens somewhere real', () => {
    useProgress.getState().resetCert('cisa');
    const real = actionContext(cisa, selectCert(useProgress.getState(), 'cisa'));
    for (const day of week.days) for (const t of day.tasks) if (t.action) expect(resolveAction(t.action, real).to).toBeTruthy();
    // Day 4's evidence task opens that exact note.
    const d4 = week.days.find((d) => d.id === 'day-4')!;
    expect(resolveAction(d4.tasks.find((t) => t.action?.kind === 'note')!.action!, real)).toEqual({ to: 'note', id: '1B3.2' });
  });
});

describe('the top slip, from the Mistake journal', () => {
  const tagFive = (slip: ThinkingSlip, from = 0) => {
    const qs = getAllQuestions('cisa').filter((q) => q.domainId === '4').slice(from, from + 5);
    for (const q of qs) {
      const ru = runnerUp(q.tips, q.correct);
      const wrong = (['A', 'B', 'C', 'D'] as const).find((l) => l !== q.correct && l !== ru)!;
      useProgress.getState().recordMistake('cisa', q.id, wrong);
      useProgress.getState().tagMistake('cisa', q.id, slip);
    }
    return qs.map((q) => q.id);
  };
  beforeEach(() => useProgress.getState().resetCert('cisa'));

  it('fewer than 5 tagged: none yet (the library)', () => {
    expect(topSlip('cisa', selectCert(useProgress.getState(), 'cisa').mistakes)).toBeNull();
  });

  it('a thinking slip: its principle (the slip map)', () => {
    tagFive('role');
    expect(topSlip('cisa', selectCert(useProgress.getState(), 'cisa').mistakes)).toEqual({ principleId: 'recommend-dont-implement' });
  });

  it('"Didn’t know it": the note behind the most open mistakes', () => {
    const ids = tagFive('knowledge');
    const want = mostMissedSubtopic(ids, (q) => subtopicOfQuestion('cisa', q));
    expect(want).toBeTruthy();
    expect(topSlip('cisa', selectCert(useProgress.getState(), 'cisa').mistakes)).toEqual({ noteId: want });
  });

  it('mostMissedSubtopic counts, and keeps the first on a tie', () => {
    const map: Record<string, string> = { a: 'X', b: 'Y', c: 'Y', d: 'X', e: 'Z' };
    expect(mostMissedSubtopic(['a', 'b', 'c'], (q) => map[q])).toBe('Y');
    expect(mostMissedSubtopic(['a', 'b'], (q) => map[q])).toBe('X');
    expect(mostMissedSubtopic(['nope'], (q) => map[q])).toBeUndefined();
  });
});

// ── QA review: the plan around the week's start ─────────────────────────
describe('the day before the week (8 days out) with a final review week', () => {
  const plan = (stage: Stage, daysLeft: number, finalWeek: boolean) =>
    todaysPlan({
      stage,
      dueReviews: 0,
      dailyMinutes: 120,
      answered: 300,
      examFocused: true,
      focusDomain: { id: '4', short: 'IS Operations' },
      lastMockAt: null,
      lastFullMockAt: null,
      daysLeft,
      finalWeek,
      examQuestions: 150,
      examMinutes: 240,
      now: new Date(2026, 9, 12, 9).getTime(),
    });
  const mocks = (stage: Stage, daysLeft: number, finalWeek: boolean) => plan(stage, daysLeft, finalWeek).filter((i) => i.kind === 'mock');

  it('no mini mock 8 days out, so day 7’s full rehearsal never follows a mock the day before (product call)', () => {
    // The stages a learner can be in 8 days out (exam week's own stage starts at 7, engine/journey.ts).
    const stages = STAGE_ORDER.filter((s) => s !== 'afterExam' && s !== 'examDay');
    // Without a plan the weekly mini mock can still land 8 days out (unchanged)…
    expect(stages.some((s) => mocks(s, 8, false).length > 0)).toBe(true);
    // …with one, never.
    for (const s of stages) expect([s, mocks(s, 8, true)]).toEqual([s, []]);
    // 9 days out the weekly mock is back, plan or not.
    expect(stages.some((s) => mocks(s, 9, true).length > 0)).toBe(true);
    expect(FINAL_WEEK_MOCK_REST).toBe(FINAL_WEEK_WINDOW.from);
  });

  it('the Fit card rests from 8 days out when the plan’s card shows from 8', () => {
    const ok = { onboarded: true, fitPrompt: undefined, familiarity: undefined, examMoment: false, readyPanel: false, plantLine: false };
    expect(shouldAskFit({ ...ok, daysLeft: 8 })).toBe(true);
    expect(shouldAskFit({ ...ok, daysLeft: 8, finalWeek: true })).toBe(false);
    expect(shouldAskFit({ ...ok, daysLeft: 9, finalWeek: true })).toBe(true);
  });
});
