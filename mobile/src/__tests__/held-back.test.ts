/**
 * The held-back full form and first-try readiness wiring
 * (docs/content/CIA_BANK_PLAN.md section 11, item 7, second half).
 *
 * Plain English: a course that opts in (`readinessRule: 'firstTry'`) and
 * ships a held-back file has one full exam, the same for everyone, kept out
 * of every other pool until the learner has taken it. Its readiness
 * statements (the range, the report, the exam-ready hold) follow first tries.
 * CISA has no held-back file and does not opt in: its pack, pools, sets and
 * readiness are exactly as before.
 *
 * Fixtures are neutral: a made-up course for the engine, and CISA's own
 * questions with the setting and a held-back tag switched on for one test.
 */
import { Alert } from 'react-native';
import { getCertification } from '../content/certifications';
import { findQuestion, getAllQuestions, getDomainQuestions } from '../content/loader';
import { clearContentCaches } from '../content/packs';
import type { Certification, PackQuestion } from '../content/types';
import { buildBackup, readBackup } from '../engine/backup';
import { mockPool } from '../engine/blueprint';
import { firstTryAnswers, firstTryReadiness } from '../engine/firstTry';
import {
  DISCARD_LINE,
  EARLY_LINE,
  FORM_INTRO,
  FORM_TITLE,
  heldBackFormIn,
  isHeldBackHidden,
  isTaken,
  OFFER_DAYS,
  offerDue,
  SEEN_LINE,
  SEEN_TITLE,
  sectionResults,
  withTaken,
} from '../engine/heldBack';
import type { AnswerRecord } from '../engine/readiness';
import { readinessFor } from '../engine/readiness';
import { readinessRange } from '../engine/readinessRange';
import { dayKey } from '../engine/streak';
import { mergeSides, type SyncedProgress } from '../engine/syncMerge';
import { finishSession } from '../lib/finishSession';
import { heldBackStatus } from '../lib/heldBack';
import { readinessAnswersOf, readinessRead } from '../lib/readinessRead';
import {
  guardedStart,
  heldBackOf,
  planShortMock,
  startFromIds,
  startHeldBack,
  startMock,
  startPractice,
  startReview,
} from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { readHeldBack, tagHeldBack } = require('../../scripts/heldback-pack.cjs');

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));

const T0 = Date.UTC(2027, 0, 10, 9);
const DAY = 86_400_000;

// ── The pack builder ─────────────────────────────────────────────────────
describe('pack builder: the held-back file', () => {
  const q = (id: string, extra: Record<string, unknown> = {}) => ({ id, ...extra });
  const pack = [q('x_d1_001'), q('x_d1_002'), q('x_d2_001', { retired: true }), q('x_d2_002', { testableFrom: '2027-03-01' }), q('x_d2_003')];
  const file = (ids: unknown, meta: Record<string, unknown> = {}) => ({ _meta: { comment: 'c', frozen: '2026-11-27', exam: 'x', ...meta }, ids });
  const read = (raw: unknown) => readHeldBack(raw, { certId: 'x', questions: pack });

  it('no file: no form, nothing tagged (every pack without one stays byte-identical)', () => {
    expect(read(null)).toEqual({ form: null, problems: [] });
    const qs = pack.map((x) => ({ ...x }));
    expect(tagHeldBack(null, qs)).toBe(0);
    expect(qs).toEqual(pack);
  });

  it('a sound file tags each of its questions with the frozen date', () => {
    const r = read(file(['x_d1_002', 'x_d2_003']));
    expect(r.problems).toEqual([]);
    expect(r.form).toEqual({ key: '2026-11-27', ids: ['x_d1_002', 'x_d2_003'] });
    const qs = pack.map((x) => ({ ...x })) as { id: string; heldBack?: string }[];
    expect(tagHeldBack(r.form, qs)).toBe(2);
    expect(qs.filter((x) => x.heldBack).map((x) => [x.id, x.heldBack])).toEqual([
      ['x_d1_002', '2026-11-27'],
      ['x_d2_003', '2026-11-27'],
    ]);
  });

  it.each([
    ['not an object', [1, 2], /must be an object/],
    ['no _meta', { ids: ['x_d1_001'] }, /"_meta" must be an object/],
    ['a frozen date that is not a date', file(['x_d1_001'], { frozen: '2026-02-30' }), /"_meta.frozen" must be a date/],
    ['another pack’s file', file(['x_d1_001'], { exam: 'y' }), /this is the x pack/],
    ['no ids', file([]), /one or more question ids/],
    ['an id that is not text', file(['x_d1_001', 7]), /one or more question ids/],
    ['an id written twice', file(['x_d1_001', 'x_d1_001']), /written twice/],
    ['an id the pack does not have', file(['x_d9_001']), /not a question of the x pack/],
    ['a retired id', file(['x_d2_001']), /retired/],
    ['a question not on the exam at the frozen date', file(['x_d2_002']), /only from 2027-03-01/],
  ])('a malformed file fails the build: %s', (_what, raw, problem) => {
    const r = read(raw);
    expect(r.form).toBeNull();
    expect(r.problems.join('\n')).toMatch(problem);
  });
});

// ── The engine ──────────────────────────────────────────────────────────
const fxq = (id: string, domainId: string, extra: Partial<PackQuestion> = {}): PackQuestion => ({
  id,
  certId: 'fx',
  domainId,
  subtopic: 'General',
  difficulty: 'application',
  stem: '?',
  options: { A: 'a', B: 'b', C: 'c', D: 'd' },
  correct: 'A',
  explanation: '',
  wrongExplanations: {},
  tips: [],
  related: [],
  ...extra,
});

describe('engine: the form, taken or not', () => {
  it('the form is the tagged live questions; none tagged = no form (CISA)', () => {
    const bank = [fxq('a', '1', { heldBack: '2026-11-27' }), fxq('b', '1'), fxq('c', '2', { heldBack: '2026-11-27', retired: true }), fxq('d', '2', { heldBack: '2026-11-27' })];
    expect(heldBackFormIn(bank)).toEqual({ key: '2026-11-27', ids: ['a', 'd'] });
    expect(heldBackFormIn([fxq('b', '1')])).toBeNull();
    expect(heldBackFormIn(getAllQuestions('cisa'))).toBeNull();
  });

  it('hidden until taken; taking keeps the earliest time, and the same object when nothing changes', () => {
    const q = fxq('a', '1', { heldBack: 'F' });
    expect(isHeldBackHidden(q, undefined)).toBe(true);
    expect(isHeldBackHidden(fxq('b', '1'), undefined)).toBe(false);
    const t = withTaken(undefined, 'F', T0);
    expect(t).toEqual({ F: T0 });
    expect(isHeldBackHidden(q, t)).toBe(false);
    expect(isTaken(t, 'F')).toBe(true);
    expect(isTaken(t, 'G')).toBe(false);
    expect(withTaken(t, 'F', T0 + 5)).toBe(t);
    expect(withTaken(t, 'F', T0 - 5)).toEqual({ F: T0 - 5 });
    // A new form (a new frozen date) is a fresh form.
    expect(isHeldBackHidden(fxq('z', '1', { heldBack: 'G' }), t)).toBe(true);
  });

  describe('the Today card (offerDue)', () => {
    const ready = [{ firstTries: 30 }, { firstTries: 50 }];
    const short = [{ total: 40 }];
    const base = { sections: ready, mocks: short, examQuestions: 125, daysLeft: null, taken: false };
    it('every section at 30+ first tries and one short mock done', () => {
      expect(offerDue(base)).toBe(true);
    });
    it('not with one section short, no short mock, only a full mock, or only the form itself', () => {
      expect(offerDue({ ...base, sections: [{ firstTries: 29 }, { firstTries: 50 }] })).toBe(false);
      expect(offerDue({ ...base, mocks: [] })).toBe(false);
      expect(offerDue({ ...base, mocks: [{ total: 125 }] })).toBe(false);
      expect(offerDue({ ...base, mocks: [{ total: 40, heldBack: 'fresh' }] })).toBe(false);
    });
    it('or 3 weeks (or less) before a set exam date, whatever the practice', () => {
      const early = { ...base, sections: [{ firstTries: 0 }], mocks: [] };
      expect(offerDue({ ...early, daysLeft: OFFER_DAYS })).toBe(true);
      expect(offerDue({ ...early, daysLeft: 0 })).toBe(true);
      expect(offerDue({ ...early, daysLeft: OFFER_DAYS + 1 })).toBe(false);
      expect(offerDue({ ...early, daysLeft: -1 })).toBe(false);
    });
    it('never once the form is taken', () => {
      expect(offerDue({ ...base, daysLeft: 3, taken: true })).toBe(false);
    });
  });

  it('results: percent and counts by section, never a scaled score, 600, "pass" or "likely"', () => {
    const cert = { domains: [{ id: '1', short: 'Ethics' }, { id: '2', short: 'Risk' }, { id: '3', short: 'Tools' }], domainStyle: { noun: 'Section' as const, numbering: 'letter' as const } } as Certification;
    const rows = sectionResults(cert, { '1': { total: 44, correct: 31 }, '2': { total: 25, correct: 25 } });
    expect(rows.map((r) => `${r.name}: ${r.line}`)).toEqual(['Section A · Ethics: 31 of 44 right (70%)', 'Section B · Risk: 25 of 25 right (100%)']);
    expect(rows[0].spoken).toBe('Section A, Ethics: 31 of 44 right, 70 percent.');
    const all = [...rows.flatMap((r) => [r.line, r.spoken]), FORM_INTRO, SEEN_LINE, EARLY_LINE, DISCARD_LINE].join(' ');
    expect(all).not.toMatch(/scaled|\b600\b|\bpass|likely|last chance|hurry|only \d+ (days|left)/i);
  });

  it('the agreed words', () => {
    expect(FORM_TITLE).toBe('Full exam');
    expect(SEEN_TITLE).toBe('Full exam (seen)');
    expect(EARLY_LINE).toBe('Most useful in your last 2 to 3 weeks.');
    expect(FORM_INTRO).toBe(
      'A full exam, the same for everyone, kept out of practice so your result is a fair read. You get one fresh try; afterwards its questions and explanations join your practice.',
    );
  });
});

describe('engine: first-try answers (what readiness statements read)', () => {
  const bank = ['1', '2'].flatMap((d) => Array.from({ length: 60 }, (_, i) => fxq(`fx_d${d}_${String(i + 1).padStart(3, '0')}`, d)));
  const rec = (correct: boolean, at: number, first = true, assisted = false): AnswerRecord => ({
    attempts: 2,
    correctCount: 2,
    lastCorrect: true,
    lastAt: at + DAY,
    ...(first ? { first: { correct, assisted, at } } : {}),
  });

  it('one clean record per counted first try: the try’s result, not the latest answer', () => {
    const answers = {
      [bank[0].id]: rec(false, T0), // first try wrong, later right: counts as wrong
      [bank[1].id]: rec(true, T0, true, true), // hinted first try: left out
      [bank[2].id]: rec(true, T0, false), // no first try (a game, an older save): left out
      [bank[3].id]: rec(true, T0 + 10), // seen before the try: left out
    };
    const out = firstTryAnswers(bank, answers, { [bank[3].id]: T0 }, '2027-01-10');
    expect(out).toEqual({ [bank[0].id]: { attempts: 1, correctCount: 0, lastCorrect: false, lastAt: T0 } });
  });

  it('the same tries as the "First tries by section" rows, the latest 50 per section', () => {
    const answers: Record<string, AnswerRecord> = {};
    bank.slice(0, 60).forEach((q, i) => (answers[q.id] = rec(i % 2 === 0, T0 + i)));
    const out = firstTryAnswers(bank, answers, undefined, '2027-01-10');
    const rows = firstTryReadiness({ domains: [{ id: '1' }, { id: '2' }] } as Certification, bank, answers, undefined, '2027-01-10');
    expect(Object.keys(out)).toHaveLength(rows[0].firstTries);
    expect(rows[0].firstTries).toBe(50);
    expect(Object.values(out).filter((r) => r.lastCorrect)).toHaveLength(rows[0].right);
    // The oldest 10 fell out of the window.
    expect(out[bank[0].id]).toBeUndefined();
    expect(out[bank[59].id]).toBeDefined();
  });
});

// ── The store and sessions, on CISA's questions with the setting switched on ─────────
const cisa = getCertification('cisa')! as Certification;
const FORM = '2026-11-27';
/** 30 questions per domain: a 150-question form, CISA's exam length. */
const formIds = () => cisa.domains.flatMap((d) => getDomainQuestions('cisa', d.id).slice(0, 30).map((q) => q.id));
let tagged: string[] = [];
/** Opt in and tag a held-back form on CISA's questions (undone after each test). */
function withForm({ optIn = true } = {}) {
  tagged = formIds();
  for (const id of tagged) findQuestion('cisa', id)!.heldBack = FORM;
  if (optIn) cisa.readinessRule = 'firstTry';
  clearContentCaches();
}
const cp = () => selectCert(useProgress.getState(), 'cisa');
const inForm = (ids: readonly string[]) => ids.filter((id) => tagged.includes(id));

beforeEach(() => {
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ onboarded: true, activeCertId: 'cisa', shuffleOptions: false });
});
afterEach(() => {
  for (const id of tagged) delete findQuestion('cisa', id)!.heldBack;
  tagged = [];
  delete cisa.readinessRule;
  clearContentCaches();
  jest.restoreAllMocks();
});

describe('CISA: no held-back file, exactly as before', () => {
  it('no question carries the tag, no form, and the pools are the very same arrays', () => {
    expect(getAllQuestions('cisa').some((q) => q.heldBack !== undefined)).toBe(false);
    expect(heldBackOf('cisa')).toBeNull();
    expect(heldBackStatus(cisa, cp(), 3, '2027-01-10')).toBeNull();
    expect(startHeldBack('cisa')).toBeNull();
    const before = getDomainQuestions('cisa', '1');
    clearContentCaches();
    expect(getDomainQuestions('cisa', '1')).toEqual(before);
  });

  it('readiness reads every answer: the very same answers object', () => {
    useProgress.getState().recordAnswer('cisa', getAllQuestions('cisa')[0].id, true);
    const p = cp();
    expect(readinessAnswersOf(cisa, p, '2027-01-10')).toBe(p.answers);
    expect(readinessRead(cisa, p, '2027-01-10')).toBe(readinessFor(cisa, p.answers));
  });

  it('a full mock result has no held-back label and takes nothing', () => {
    startMock('cisa');
    finishSession({ celebrate: false });
    expect(cp().mocks[0]).not.toHaveProperty('heldBack');
    expect(cp()).not.toHaveProperty('heldBackTaken');
  });

  it('tags on a course that does not opt in are ignored (pools unchanged)', () => {
    withForm({ optIn: false });
    expect(getAllQuestions('cisa').filter((q) => q.heldBack)).toHaveLength(150);
    expect(heldBackOf('cisa')).toBeNull();
  });

  it('an opted-in course with no held-back file: no form, pools unchanged', () => {
    cisa.readinessRule = 'firstTry';
    clearContentCaches();
    expect(heldBackOf('cisa')).toBeNull();
    expect(getAllQuestions('cisa').length).toBe(getAllQuestions('cisa').length);
    expect(getDomainQuestions('cisa', '1').length).toBeGreaterThan(30);
  });
});

describe('rule 1: kept out of every other pool until taken, then joins practice', () => {
  it('pools (practice, mocks, games, the bank list) leave the form out', () => {
    withForm();
    const all = getAllQuestions('cisa');
    expect(inForm(all.map((q) => q.id))).toEqual([]);
    for (const d of cisa.domains) expect(inForm(getDomainQuestions('cisa', d.id).map((q) => q.id))).toEqual([]);
    expect(inForm(mockPool(all, '2027-01-10').map((q) => q.id))).toEqual([]);
  });

  it('every set: practice, a chosen list, review, a full mock and the short mock', () => {
    withForm();
    expect(inForm(startPractice('cisa', { count: 400 })!.questionIds)).toEqual([]);
    // A note's or a lesson's list naming a held-back question: it is left out of the set.
    const listed = [tagged[0], getAllQuestions('cisa')[0].id];
    expect(startFromIds('cisa', listed, 'Notes')!.questionIds).toEqual([listed[1]]);
    // A held-back id in the review queue (an imported save) is not dealt.
    useProgress.getState().queueForReview('cisa', [tagged[1]]);
    useProgress.setState((s) => {
      const c = s.byCert.cisa;
      return { byCert: { ...s.byCert, cisa: { ...c, review: { [tagged[1]]: { box: 1, dueAt: 0, lastSeen: 0, reps: 0 } } } } };
    });
    expect(startReview('cisa')).toBeNull();
    expect(inForm(startMock('cisa')!.questionIds)).toEqual([]);
    expect(inForm(planShortMock('cisa', 50, 1)!.ids)).toEqual([]);
  });

  it('the form itself: exactly its questions, titled "Full exam", timed for its length', () => {
    withForm();
    const s = startHeldBack('cisa')!;
    expect([...s.questionIds].sort()).toEqual([...tagged].sort());
    expect(s.title).toBe(FORM_TITLE);
    expect(s.heldBack).toEqual({ form: FORM, seen: false });
    expect(s.mode).toBe('mock');
    expect(s.deadline! - s.startedAt).toBe(cisa.exam.minutes * 60_000);
  });

  it('submitting takes it: its questions join every pool, wrong ones go to review', () => {
    withForm();
    const s = startHeldBack('cisa')!;
    useSession.getState().answer(s.questionIds[0], { display: 'A', correct: false });
    finishSession({ celebrate: false });
    expect(cp().heldBackTaken).toEqual({ [FORM]: expect.any(Number) });
    expect(cp().mocks[0].heldBack).toBe('fresh');
    expect(inForm(getAllQuestions('cisa').map((q) => q.id))).toHaveLength(150);
    expect(cp().review[s.questionIds[0]]).toBeDefined();
    expect(heldBackOf('cisa')!.taken).toBe(true);
  });
});

describe('rule 4: discarding after a question was shown counts as taken, said first', () => {
  it('"Discard and start" says so, then marks it taken and its reached questions seen', () => {
    withForm();
    const form = startHeldBack('cisa')!;
    useSession.getState().goTo(2);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    guardedStart(() => startPractice('cisa', { count: 5 }), () => {});
    const [title, body, buttons] = alert.mock.calls[0];
    expect(title).toBe('Replace your unfinished session?');
    expect(body).toContain(DISCARD_LINE);
    expect(cp().heldBackTaken).toBeUndefined();
    (buttons as { text: string; onPress?: () => void }[]).find((b) => b.text === 'Discard and start')!.onPress!();
    expect(cp().heldBackTaken).toEqual({ [FORM]: expect.any(Number) });
    expect(Object.keys(cp().shown ?? {}).sort()).toEqual(form.questionIds.slice(0, 3).sort());
  });

  it('an ordinary unfinished mock: the usual words, nothing taken', () => {
    withForm();
    startMock('cisa');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    guardedStart(() => startPractice('cisa', { count: 5 }), () => {});
    expect(alert.mock.calls[0][1]).not.toContain(DISCARD_LINE);
  });
});

describe('rule 5: the retake is "Full exam (seen)", out of readiness, never celebrated', () => {
  it('titled and saved as seen; its answers never count as first tries', () => {
    withForm();
    const first = startHeldBack('cisa')!;
    useSession.getState().answer(first.questionIds[0], { display: 'A', correct: true });
    finishSession({ celebrate: false });
    const today = dayKey(Date.now());
    const before = readinessRead(cisa, cp(), today);
    const again = startHeldBack('cisa')!;
    expect(again.title).toBe(SEEN_TITLE);
    expect(again.heldBack).toEqual({ form: FORM, seen: true });
    for (const id of again.questionIds.slice(0, 40)) useSession.getState().answer(id, { display: 'A', correct: true });
    finishSession();
    expect(cp().mocks[0].heldBack).toBe('seen');
    // No milestone moment on a seen retake's Results.
    expect(useSession.getState().active!.milestone).toBeUndefined();
    // Readiness (first tries) is exactly where it was: a seen retake adds nothing.
    expect(readinessRead(cisa, cp(), today).domains.map((d) => d.answered)).toEqual(before.domains.map((d) => d.answered));
  });
});

describe('rule 7: readiness statements follow first tries; activity keeps every answer', () => {
  it('the range and the exam-ready log read first tries only for an opted-in course', () => {
    cisa.readinessRule = 'firstTry';
    clearContentCaches();
    const p = useProgress.getState();
    const qs = getAllQuestions('cisa');
    // 60 game answers (all right): activity, never a first try.
    for (const q of qs.slice(0, 60)) p.recordAnswer('cisa', q.id, true, undefined, { mastery: false, at: T0 });
    expect(Object.keys(cp().answers)).toHaveLength(60);
    const today = dayKey(T0);
    expect(readinessRead(cisa, cp(), today).domains.every((d) => d.answered === 0)).toBe(true);
    expect(readinessRange(cisa, readinessRead(cisa, cp(), today)).enough).toBe(false);
    // Every answer still counts for activity (the plant and the stats read readinessFor on every answer).
    expect(readinessFor(cisa, cp().answers).domains.reduce((n, d) => n + d.answered, 0)).toBe(60);
    // The exam-ready hold's log: no first tries yet, so no low end logged.
    p.logReadinessNow('cisa');
    expect((cp().moments?.readiness ?? []).every((d) => d.min === null && d.last === null)).toBe(true);
  });
});

describe('saves: backup and sync keep the new fields', () => {
  const stores = (progress: unknown) => ({ settings: { onboarded: true, activeCertId: 'cisa' }, progress });
  const certIds = ['cisa'];
  const base = (cert: Record<string, unknown>) => ({ byCert: { cisa: cert }, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {} });

  it('a backup keeps `heldBackTaken` and a result’s `heldBack` through a restore', () => {
    const mock = { id: 'm', finishedAt: T0, total: 150, correct: 100, minutesUsed: 200, byDomain: {}, heldBack: 'seen' };
    const file = buildBackup(stores(base({ answers: {}, heldBackTaken: { [FORM]: T0 }, mocks: [mock] })), { now: T0, appVersion: '9.0.0' });
    const back = readBackup(JSON.stringify(file), certIds, undefined, '9.0.0');
    expect(back.progress.byCert.cisa.heldBackTaken).toEqual({ [FORM]: T0 });
    expect(back.progress.byCert.cisa.mocks![0].heldBack).toBe('seen');
  });

  it('sync: taken on either phone is taken, from the earlier time; a wrong clock is pulled back', () => {
    const ctx = { now: T0 + DAY, knownCertIds: certIds };
    const side = (cert: Record<string, unknown>) => ({ state: { byCert: { cisa: cert }, streak: { current: 0, best: 0, lastDay: null } } as unknown as SyncedProgress, stamps: {} });
    const A = side({ heldBackTaken: { [FORM]: T0 + 50 } });
    const B = side({ heldBackTaken: { [FORM]: T0 } });
    expect(mergeSides('progress', A, B, ctx).state.byCert.cisa.heldBackTaken).toEqual({ [FORM]: T0 });
    expect(mergeSides('progress', A, side({}), ctx).state.byCert.cisa.heldBackTaken).toEqual({ [FORM]: T0 + 50 });
    const far = side({ heldBackTaken: { [FORM]: T0 + 30 * DAY } });
    expect(mergeSides('progress', far, null, { now: T0, knownCertIds: certIds }).state.byCert.cisa.heldBackTaken).toEqual({ [FORM]: T0 });
  });

  it('a restored or synced "taken" releases the form at once (the pools follow the store)', () => {
    withForm();
    expect(inForm(getAllQuestions('cisa').map((q) => q.id))).toEqual([]);
    useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...s.byCert.cisa, heldBackTaken: { [FORM]: T0 } } } }));
    expect(inForm(getAllQuestions('cisa').map((q) => q.id))).toHaveLength(150);
    // A reset forgets it: the form is held back again.
    useProgress.getState().resetCert('cisa');
    expect(inForm(getAllQuestions('cisa').map((q) => q.id))).toEqual([]);
  });
});
