/**
 * First-try readiness, the "seen" record and the per-learner short mock
 * (docs/content/CIA_BANK_PLAN.md section 11, item 7, first half).
 *
 * Plain English: a course that opts in (`readinessRule: 'firstTry'`) keeps
 * each question's first graded try (write-once) and a record of questions
 * shown without a counted try. Its readiness counts first, unhinted tries at
 * questions not seen before, per section; its shorter mocks are drawn from
 * questions the learner has not seen. CISA does not opt in: its answers,
 * saves and mocks are exactly as before.
 *
 * The fixtures are neutral: a made-up two-section course ("fx") for the
 * engine, and CISA's own questions with the setting switched on for a moment
 * for the store (switched off again after each test).
 */
import { getCertification } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import type { Certification, Difficulty, PackQuestion } from '../content/types';
import { buildBackup, readBackup } from '../engine/backup';
import { mockPool } from '../engine/blueprint';
import {
  FIRST_TRY_WINDOW,
  firstTryLabel,
  firstTryReadiness,
  firstTryUpdate,
  isFirstTryCourse,
  MET_EVERY_LINE,
  seenBy,
  withShown,
  type Shown,
} from '../engine/firstTry';
import { createRng } from '../engine/random';
import type { AnswerRecord } from '../engine/readiness';
import { PROGRESS_VERSION, SETTINGS_VERSION } from '../engine/saveMigrations';
import { buildShortMock, INCLUDES_SEEN, reusedLine } from '../engine/shortMock';
import { mergeSides, type SyncedProgress } from '../engine/syncMerge';
import { finishSession } from '../lib/finishSession';
import { isShortMock, planShortMock, startMock, startPractice } from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));

// ── A neutral two-section fixture course ─────────────────────────────────
const DIFFS: Difficulty[] = ['foundational', 'application', 'analysis'];
const FX: Certification = {
  id: 'fx',
  name: 'FX',
  fullName: 'Fixture course',
  issuer: { id: 'fx', name: 'Fixture' },
  mindset: '',
  trademarkNotice: '',
  status: 'available',
  exam: { questions: 30, minutes: 60, difficultyMix: { foundational: 1, application: 1, analysis: 1 }, passingNote: '' },
  domains: [
    { id: '1', name: 'One', short: 'One', weight: 60, tone: 0 },
    { id: '2', name: 'Two', short: 'Two', weight: 40, tone: 1 },
  ],
  domainStyle: { noun: 'Section', numbering: 'letter' },
  readinessRule: 'firstTry',
};
const qid = (d: string, n: number) => `fx_d${d}_${String(n).padStart(3, '0')}`;
function fxq(d: string, n: number, extra: Partial<PackQuestion> = {}): PackQuestion {
  return {
    id: qid(d, n),
    certId: 'fx',
    domainId: d,
    subtopic: 'General',
    difficulty: DIFFS[n % 3],
    stem: '?',
    options: { A: 'a', B: 'b', C: 'c', D: 'd' },
    correct: 'A',
    explanation: '',
    wrongExplanations: {},
    tips: [],
    related: [],
    ...extra,
  };
}
/** 20 questions in each section. */
const BANK = ['1', '2'].flatMap((d) => Array.from({ length: 20 }, (_, i) => fxq(d, i + 1)));
const T0 = Date.UTC(2027, 0, 10, 9);
const TODAY = '2027-01-10';
/** An answer record with a first try. */
const rec = (correct: boolean, at: number, extra: Partial<AnswerRecord['first']> = {}): AnswerRecord => ({
  attempts: 1,
  correctCount: correct ? 1 : 0,
  lastCorrect: correct,
  lastAt: at,
  first: { correct, assisted: false, at, ...extra },
});

describe('engine: the opt-in', () => {
  it('only readinessRule "firstTry" opts in; CISA and every live course do not', () => {
    expect(isFirstTryCourse(FX)).toBe(true);
    expect(isFirstTryCourse({})).toBe(false);
    expect(isFirstTryCourse(undefined)).toBe(false);
    expect(isFirstTryCourse(getCertification('cisa'))).toBe(false);
    const { CERTIFICATIONS } = jest.requireActual('../content/certifications');
    expect((CERTIFICATIONS as Certification[]).filter(isFirstTryCourse)).toEqual([]);
  });
});

describe('engine: the first try and the seen record', () => {
  const at = { correct: true, assisted: false, at: T0, game: false, sibling: false };

  it('the first graded answer is the first try; it is never overwritten', () => {
    const one = firstTryUpdate(undefined, undefined, 'x', at);
    expect(one).toEqual({ first: { correct: true, assisted: false, at: T0 }, shown: undefined });
    const prev = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: T0, first: one.first };
    const two = firstTryUpdate(prev, undefined, 'x', { ...at, correct: false, assisted: true, at: T0 + 1000 });
    expect(two.first).toBe(one.first);
  });

  it('a hinted first try says so', () => {
    expect(firstTryUpdate(undefined, undefined, 'x', { ...at, assisted: true }).first).toEqual({ correct: true, assisted: true, at: T0 });
  });

  it('a game answer and a relaxed sibling write no first try, but the question is now seen', () => {
    for (const kind of ['game', 'sibling'] as const) {
      const u = firstTryUpdate(undefined, undefined, 'x', { ...at, [kind]: true });
      expect(u.first).toBeUndefined();
      expect(u.shown).toEqual({ x: T0 });
    }
  });

  it('withShown keeps the earliest time, skips a question with a first try, and returns the same object when nothing changed', () => {
    const shown: Shown = { a: T0 };
    expect(withShown(shown, ['a'], T0 + 5)).toBe(shown);
    expect(withShown(shown, ['a'], T0 - 5)).toEqual({ a: T0 - 5 });
    expect(withShown(shown, [], T0)).toBe(shown);
    expect(withShown(shown, ['b'], T0, { b: rec(true, T0 - 1) })).toBe(shown);
    expect(withShown(undefined, ['c', 'c'], T0)).toEqual({ c: T0 });
    expect(shown).toEqual({ a: T0 }); // never changed in place
  });

  it('seen = answered (any answer) or shown', () => {
    const seen = seenBy({ a: { attempts: 1, correctCount: 0, lastCorrect: false, lastAt: T0 } }, { b: T0 });
    expect([seen('a'), seen('b'), seen('c')]).toEqual([true, true, false]);
  });
});

describe('engine: first-try readiness', () => {
  /** n first tries in section 1, the first `right` right, one minute apart. */
  const tries = (n: number, right: number, d = '1') =>
    Object.fromEntries(Array.from({ length: n }, (_, i) => [qid(d, i + 1), rec(i < right, T0 + i * 60_000)]));

  it('labels: under 10 none; 10 to 29 early; 30 and up plain. Never a scaled score, a pass mark or "likely"', () => {
    expect(firstTryLabel(6, 4)).toBe('Too few to say yet (6 answered)');
    expect(firstTryLabel(20, 12)).toBe('12 of 20 first tries right (60%) · early read');
    expect(firstTryLabel(44, 31)).toBe('31 of 44 first tries right (70%)');
    for (const n of [0, 9, 10, 29, 30, 50]) expect(firstTryLabel(n, Math.floor(n / 2))).not.toMatch(/scaled|600|\bpass|likely/i);
  });

  it('counts first tries per section, with the percent only from 10', () => {
    const [one, two] = firstTryReadiness(FX, BANK, tries(6, 4), undefined, TODAY);
    expect(one).toMatchObject({ domainId: '1', firstTries: 6, right: 4, percent: null, early: false, metAll: false, label: 'Too few to say yet (6 answered)' });
    expect(one.note).toBeUndefined();
    expect(two).toMatchObject({ domainId: '2', firstTries: 0, percent: null, label: 'Too few to say yet (0 answered)' });
    const [early] = firstTryReadiness(FX, BANK, tries(12, 9), undefined, TODAY);
    expect(early).toMatchObject({ firstTries: 12, right: 9, percent: 75, early: true });
  });

  it('leaves out: hinted tries, tries at a question seen before, untestable, retired and unknown questions', () => {
    const answers = tries(10, 10);
    answers[qid('1', 1)] = rec(true, T0, { assisted: true });
    const shown = { [qid('1', 2)]: T0 - 1, [qid('1', 3)]: T0 + 3 * 60_000 }; // 2 seen before its try; 3 shown at the same moment (not before)
    const bank = BANK.map((q) =>
      q.id === qid('1', 4) ? { ...q, testableFrom: '2027-03-01' } : q.id === qid('1', 5) ? { ...q, retired: true } : q,
    );
    answers['fx_d1_999'] = rec(true, T0);
    const [one] = firstTryReadiness(FX, bank, answers, shown, TODAY);
    // 10 tries, minus the hinted (1), the seen-before (2), the untestable (4) and the retired (5).
    expect(one.firstTries).toBe(6);
    // On its date the untestable question counts again.
    expect(firstTryReadiness(FX, bank, answers, shown, '2027-03-01')[0].firstTries).toBe(7);
  });

  it('a record without a first try (CISA, a game answer, an older save) never counts', () => {
    const answers: Record<string, AnswerRecord> = { [qid('1', 1)]: { attempts: 3, correctCount: 3, lastCorrect: true, lastAt: T0 } };
    expect(firstTryReadiness(FX, BANK, answers, undefined, TODAY)[0].firstTries).toBe(0);
  });

  it('uses the latest 50 per section', () => {
    const bank = Array.from({ length: 70 }, (_, i) => fxq('1', i + 1));
    // The 20 OLDEST are wrong, the 50 newest right.
    const answers = Object.fromEntries(bank.map((q, i) => [q.id, rec(i >= 20, T0 + i * 60_000)]));
    const [one] = firstTryReadiness(FX, bank, answers, undefined, TODAY);
    expect(one).toMatchObject({ firstTries: FIRST_TRY_WINDOW, right: 50, percent: 100, early: false, label: '50 of 50 first tries right (100%)' });
  });

  it('a section with nothing unseen left says so, and only then', () => {
    const all = Object.fromEntries(BANK.filter((q) => q.domainId === '2').map((q, i) => [q.id, rec(true, T0 + i)]));
    // One of them only shown (skipped in a mock), never answered: still seen.
    delete all[qid('2', 20)];
    const [one, two] = firstTryReadiness(FX, BANK, all, { [qid('2', 20)]: T0 }, TODAY);
    expect(two.metAll).toBe(true);
    expect(two.note).toBe(MET_EVERY_LINE);
    expect(MET_EVERY_LINE).toBe('You’ve met every question here; this won’t change.');
    expect(one.metAll).toBe(false);
    // A question not on the exam yet does not keep a section "open".
    const waiting = BANK.map((q) => (q.id === qid('2', 20) ? { ...q, testableFrom: '2027-03-01' } : q));
    expect(firstTryReadiness(FX, waiting, all, undefined, TODAY)[1].metAll).toBe(true);
  });
});

describe('engine: the per-learner short mock', () => {
  const none = () => false;
  const inSection = (ids: string[], d: string) => ids.filter((id) => id.startsWith(`fx_d${d}_`)).length;

  it('nothing seen: a fresh mock at the section weights, reusing nothing', () => {
    const draw = buildShortMock(FX, BANK, none, createRng(1), 10);
    expect(draw.ids).toHaveLength(10);
    expect(new Set(draw.ids).size).toBe(10);
    expect([inSection(draw.ids, '1'), inSection(draw.ids, '2')]).toEqual([6, 4]);
    expect(draw.reused).toBe(0);
  });

  it('draws only unseen questions while a section has enough', () => {
    const seen = new Set(BANK.filter((q) => q.domainId === '1').slice(0, 14).map((q) => q.id)); // 6 unseen left in section 1
    const draw = buildShortMock(FX, BANK, (id) => seen.has(id), createRng(2), 10);
    expect(draw.reused).toBe(0);
    expect(draw.ids.some((id) => seen.has(id))).toBe(false);
    expect(inSection(draw.ids, '1')).toBe(6);
  });

  it('a short section is topped up with seen questions from THAT section, and the count is told', () => {
    const seen = new Set(BANK.filter((q) => q.domainId === '2').slice(0, 18).map((q) => q.id)); // 2 unseen left in section 2
    const draw = buildShortMock(FX, BANK, (id) => seen.has(id), createRng(3), 10);
    expect([inSection(draw.ids, '1'), inSection(draw.ids, '2')]).toEqual([6, 4]);
    expect(draw.reused).toBe(2);
    expect(draw.ids.filter((id) => seen.has(id)).every((id) => id.startsWith('fx_d2_'))).toBe(true);
    // Both unseen questions of section 2 are in.
    expect(draw.ids).toEqual(expect.arrayContaining([qid('2', 19), qid('2', 20)]));
  });

  it('the same seed gives the same mock (the start sheet previews the very mock it starts)', () => {
    const seen = (id: string) => id.endsWith('1');
    expect(buildShortMock(FX, BANK, seen, createRng(7), 10)).toEqual(buildShortMock(FX, BANK, seen, createRng(7), 10));
  });

  it('one question per sibling group, and an unseen member when the group has one', () => {
    const bank = BANK.map((q) =>
      [qid('1', 1), qid('1', 2), qid('1', 3)].includes(q.id) ? { ...q, siblingGroup: 'g1' } : [qid('2', 1), qid('2', 2)].includes(q.id) ? { ...q, siblingGroup: 'g2' } : q,
    );
    const seen = (id: string) => id === qid('2', 1);
    for (let seed = 1; seed <= 25; seed++) {
      const draw = buildShortMock(FX, bank, seen, createRng(seed), 30);
      expect(draw.ids.filter((id) => [qid('1', 1), qid('1', 2), qid('1', 3)].includes(id)).length).toBeLessThanOrEqual(1);
      // g2: the seen member never stands in for its unseen sibling.
      expect(draw.ids).not.toContain(qid('2', 1));
    }
  });

  it('a question not on the exam yet stays out (the caller passes mockPool)', () => {
    const bank = BANK.map((q) => (q.domainId === '2' ? { ...q, testableFrom: '2027-03-01' } : q));
    const draw = buildShortMock(FX, mockPool(bank, TODAY), none, createRng(4), 10);
    expect(inSection(draw.ids, '2')).toBe(0);
    expect(draw.ids).toHaveLength(10); // section 1 fills the rest, as a normal mock tops up
  });

  it('the words before the start and on the result', () => {
    expect(reusedLine(4)).toBe('This mock reuses 4 questions you have seen; those won’t count toward readiness.');
    expect(reusedLine(1)).toBe('This mock reuses 1 question you have seen; it won’t count toward readiness.');
    expect(INCLUDES_SEEN).toBe('includes seen questions');
  });
});

// ── The store, backup and sync ───────────────────────────────────────────
const cisa = getCertification('cisa')!;
const ids = getAllQuestions('cisa').slice(0, 6).map((q) => q.id);
/** Switch the first-try rule on CISA's descriptor for one test (a neutral stand-in course). */
const optIn = () => {
  (cisa as Certification).readinessRule = 'firstTry';
};

beforeEach(() => {
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ onboarded: true, activeCertId: 'cisa', shuffleOptions: false });
});
afterEach(() => {
  delete (cisa as Certification).readinessRule;
  jest.restoreAllMocks();
});
const cp = () => selectCert(useProgress.getState(), 'cisa');

describe('store: CISA (no opt-in) saves exactly as before', () => {
  it('no first try, no seen record, and noteShown changes nothing', () => {
    const p = useProgress.getState();
    p.recordAnswer('cisa', ids[0], true);
    p.recordAnswer('cisa', ids[1], false, undefined, { mastery: false });
    p.recordAnswer('cisa', ids[2], true, undefined, { sibling: true });
    expect(cp().answers[ids[0]]).toEqual({ attempts: 1, correctCount: 1, lastCorrect: true, lastAt: expect.any(Number) });
    for (const id of ids.slice(0, 3)) expect(cp().answers[id]).not.toHaveProperty('first');
    expect(cp()).not.toHaveProperty('shown');
    const before = useProgress.getState();
    p.noteShown('cisa', [ids[4]]);
    expect(useProgress.getState()).toBe(before);
  });

  it('a mini mock is not a short mock, and a skipped mock item leaves no seen record', () => {
    expect(isShortMock('cisa', 50)).toBe(false);
    expect(planShortMock('cisa', 50, 1)).toBeNull();
    const s = startMock('cisa', 50)!;
    expect(s.seenReused).toBeUndefined();
    finishSession({ celebrate: false });
    expect(cp()).not.toHaveProperty('shown');
    expect(cp().mocks[0]).not.toHaveProperty('includesSeen');
  });
});

describe('store: an opted-in course', () => {
  it('writes the first try once, and carries it through later answers', () => {
    optIn();
    const p = useProgress.getState();
    p.recordAnswer('cisa', ids[0], false, undefined, { assisted: true, at: T0 });
    p.recordAnswer('cisa', ids[0], true, undefined, { at: T0 + 86_400_000 });
    expect(cp().answers[ids[0]]).toMatchObject({ attempts: 2, lastCorrect: true, first: { correct: false, assisted: true, at: T0 } });
  });

  it('a game answer or a relaxed sibling: no first try, the question is seen, and the next try does not count', () => {
    optIn();
    const p = useProgress.getState();
    p.recordAnswer('cisa', ids[0], true, undefined, { mastery: false, at: T0 });
    p.recordAnswer('cisa', ids[1], true, undefined, { sibling: true, at: T0 });
    expect(cp().answers[ids[0]].first).toBeUndefined();
    expect(cp().shown).toEqual({ [ids[0]]: T0, [ids[1]]: T0 });
    p.recordAnswer('cisa', ids[0], true, undefined, { at: T0 + 1000 });
    expect(cp().answers[ids[0]].first).toEqual({ correct: true, assisted: false, at: T0 + 1000 });
    const today = new Date(T0).toISOString().slice(0, 10);
    const sec = firstTryReadiness(cisa, getAllQuestions('cisa'), cp().answers, cp().shown, today);
    expect(sec.reduce((n, s) => n + s.firstTries, 0)).toBe(0);
  });

  it('a submitted mock: skipped items are seen; answered ones get their first try', () => {
    optIn();
    const s = startMock('cisa')!; // full length: drawn as before
    const [a, b] = s.questionIds;
    useSession.getState().answer(a, { display: 'A', correct: true });
    finishSession({ celebrate: false });
    expect(cp().answers[a].first).toMatchObject({ correct: true, assisted: false });
    expect(cp().shown?.[b]).toEqual(expect.any(Number));
    expect(cp().shown?.[a]).toBeUndefined();
  });

  it('a discarded mock: every question the learner reached is seen; the rest are not', () => {
    optIn();
    const s = startMock('cisa')!;
    useSession.getState().goTo(2);
    startPractice('cisa', { count: 5 }); // "Discard and start"
    const shown = cp().shown ?? {};
    expect(s.questionIds.slice(0, 3).every((id) => shown[id] !== undefined)).toBe(true);
    expect(shown[s.questionIds[3]]).toBeUndefined();
  });

  it('the short mock: drawn per learner, previewed with a seed, and labelled when it reuses seen questions', () => {
    optIn();
    const mini = Math.round(cisa.exam.questions / 3);
    expect(isShortMock('cisa', mini)).toBe(true);
    // Every question of the smallest-weight domain seen but 3: that domain must reuse some.
    const small = [...cisa.domains].sort((x, y) => x.weight - y.weight)[0];
    const inSmall = getAllQuestions('cisa').filter((q) => q.domainId === small.id);
    useProgress.getState().noteShown('cisa', inSmall.slice(3).map((q) => q.id), T0);
    const plan = planShortMock('cisa', mini, 42)!;
    expect(plan.ids).toHaveLength(mini);
    expect(plan.reused).toBeGreaterThan(0);
    const s = startMock('cisa', mini, { seed: 42 })!;
    expect(s.questionIds).toEqual(plan.ids);
    expect(s.seenReused).toBe(plan.reused);
    finishSession({ celebrate: false });
    expect(cp().mocks[0].includesSeen).toBe(true);
  });
});

describe('saves: backup and sync keep the new fields; an older reader keeps everything else', () => {
  const stores = (progress: unknown) => ({ settings: { onboarded: true, activeCertId: 'cisa' }, progress });
  const certIds = ['cisa'];

  it('a backup keeps `first`, `shown` and `includesSeen` through a restore', () => {
    const answers = { [ids[0]]: rec(true, T0) };
    const progress = {
      byCert: { cisa: { answers, shown: { [ids[1]]: T0 }, mocks: [{ id: 'm', finishedAt: T0, total: 50, correct: 30, minutesUsed: 70, byDomain: {}, includesSeen: true }] } },
      streak: { current: 0, best: 0, lastDay: null },
      today: { day: '', answered: 0 },
      days: {},
    };
    const file = buildBackup(stores(progress), { now: T0, appVersion: '9.0.0' });
    const back = readBackup(JSON.stringify(file), certIds, undefined, '9.0.0');
    expect(back.progress.byCert.cisa.answers![ids[0]].first).toEqual({ correct: true, assisted: false, at: T0 });
    expect(back.progress.byCert.cisa.shown).toEqual({ [ids[1]]: T0 });
    expect(back.progress.byCert.cisa.mocks![0].includesSeen).toBe(true);
  });

  it('an older reader drops keys it does not know and keeps the rest (the same rule that keeps `first` safe)', () => {
    // A file from a newer PATCH release with a field this app has never heard of, in each place ours went.
    const progress = {
      byCert: { cisa: { answers: { [ids[0]]: { ...rec(true, T0), futureField: 1 } }, futureMap: { x: 1 }, bookmarks: [ids[2]] } },
      streak: { current: 0, best: 0, lastDay: null },
      today: { day: '', answered: 0 },
      days: {},
    };
    const file = { app: 'kaisip', schema: 1, exportedAt: new Date(T0).toISOString(), appVersion: '9.0.1', stores: { settings: { version: SETTINGS_VERSION, state: { onboarded: true, activeCertId: 'cisa' } }, progress: { version: PROGRESS_VERSION, state: progress } } };
    const back = readBackup(JSON.stringify(file), certIds, undefined, '9.0.0');
    const c = back.progress.byCert.cisa as Record<string, unknown>;
    expect(c.futureMap).toBeUndefined();
    expect(back.progress.byCert.cisa.answers![ids[0]]).toEqual(rec(true, T0));
    expect(back.progress.byCert.cisa.bookmarks).toEqual([ids[2]]);
  });

  it('sync: the earlier first try wins, a side without one never removes it, and seen times merge to the earliest', () => {
    const ctx = { now: T0 + 86_400_000, knownCertIds: certIds };
    const side = (cert: Record<string, unknown>) => ({ state: { byCert: { cisa: cert }, streak: { current: 0, best: 0, lastDay: null } } as unknown as SyncedProgress, stamps: {} });
    const A = side({ answers: { [ids[0]]: rec(false, T0), [ids[1]]: rec(true, T0 + 5) }, shown: { [ids[2]]: T0 + 9 } });
    const B = side({
      answers: { [ids[0]]: { ...rec(true, T0 + 100), attempts: 2 }, [ids[1]]: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: T0 + 50 } },
      shown: { [ids[2]]: T0 + 1, [ids[3]]: T0 },
    });
    const m = mergeSides('progress', A, B, ctx).state.byCert.cisa;
    expect(m.answers![ids[0]].first).toEqual({ correct: false, assisted: false, at: T0 });
    expect(m.answers![ids[0]].attempts).toBe(2);
    // B (an older app's copy) has no first try for ids[1]: A's stays.
    expect(m.answers![ids[1]].first).toEqual({ correct: true, assisted: false, at: T0 + 5 });
    expect(m.shown).toEqual({ [ids[2]]: T0 + 1, [ids[3]]: T0 });
    // The same either way round.
    expect(mergeSides('progress', B, A, ctx).state.byCert.cisa).toEqual(m);
  });

  it('sync: a first try or a seen time from a wrong clock is pulled back to now', () => {
    const now = T0;
    const far = T0 + 30 * 86_400_000;
    const A = { state: { byCert: { cisa: { answers: { [ids[0]]: rec(true, far) }, shown: { [ids[1]]: far } } }, streak: { current: 0, best: 0, lastDay: null } } as unknown as SyncedProgress, stamps: {} };
    const m = mergeSides('progress', A, null, { now, knownCertIds: certIds }).state.byCert.cisa;
    expect(m.answers![ids[0]].first!.at).toBe(now);
    expect(m.shown![ids[1]]).toBe(now);
  });
});
