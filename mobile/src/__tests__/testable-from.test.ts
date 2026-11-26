/**
 * CIA `testable_from` (docs/content/CIA_BANK_PLAN.md sections 8 and 11).
 *
 * Plain English: a CIA item on a Topical Requirement that is not on the real
 * exam yet carries the date it becomes testable. It stays in the bank (practice
 * and reviews still show it) but a mock, full or mini, leaves it out until
 * that day, by the phone's own calendar.
 *
 * - The pack builder (scripts/build-content.mjs) carries the date through as
 *   `testableFrom`, only when there is one, and a malformed date fails the build.
 * - The engine (engine/blueprint.ts testableOn / mockPool) keeps a future
 *   item out of the mock draw and lets it in on its date and after.
 * - startMock (lib/sessions.ts) uses it with today's local date.
 * - CISA never carries the field, so its pack and its mocks are unchanged.
 */
import { execFileSync } from 'child_process';
import path from 'path';
import { pathToFileURL } from 'url';
import { getCertification } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import type { PackQuestion } from '../content/types';
import { buildMockExam, mockPool, testableOn } from '../engine/blueprint';
import { createRng } from '../engine/random';
import { startMock } from '../lib/sessions';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));

const BUILD = pathToFileURL(path.join(__dirname, '..', '..', 'scripts', 'build-content.mjs')).href;

/**
 * Run the real pack builder's toPackQuestion + validate on one source item
 * (build-content.mjs is an ES module, so it runs in a child node, as
 * badge-geometry-determinism.test.ts does).
 */
function convert(item: Record<string, unknown>): { pq: Record<string, unknown>; problems: string[] } {
  const code = `
    import { toPackQuestion, validate } from ${JSON.stringify(BUILD)};
    const pq = toPackQuestion(JSON.parse(process.argv[1]), 'cia2');
    console.log(JSON.stringify({ pq, problems: validate(pq) }));`;
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code, JSON.stringify(item)], { encoding: 'utf8' }));
}

/** A small, valid CIA-shaped source item. */
const item = (extra: Record<string, unknown> = {}) => ({
  id: 'cia2_d1_043',
  domain: 1,
  subtopic: '2A1 Engagement planning. Third-party scope',
  challenge_ref: 'C1',
  difficulty: 'application',
  question: 'Which step comes first?',
  options: { A: 'One', B: 'Two', C: 'Three', D: 'Four' },
  correct: 'B',
  correct_explanation: 'Two is first.',
  wrong_explanations: { A: 'No.', C: 'No.', D: 'No.' },
  tips: ['Eliminate: A and C.', 'Final two: B over D.', 'Exam cue: first things first.'],
  ...extra,
});

describe('pack builder: testable_from → testableFrom', () => {
  it('carries a real date through and passes the build check', () => {
    const { pq, problems } = convert(item({ testable_from: '2027-03-01' }));
    expect(pq.testableFrom).toBe('2027-03-01');
    expect(problems).toEqual([]);
    expect(JSON.stringify(pq)).not.toMatch(/testable_from/);
  });

  it('leaves the field out when it is null or absent (the pack JSON is byte-identical)', () => {
    const withNull = convert(item({ testable_from: null }));
    const without = convert(item());
    expect(withNull.pq).not.toHaveProperty('testableFrom');
    expect(JSON.stringify(withNull.pq)).toBe(JSON.stringify(without.pq));
    expect(withNull.problems).toEqual([]);
  });

  it.each([['2027-3-1'], ['2027-02-30'], ['2027-13-01'], [''], ['1 March 2027'], [20270301]])(
    'fails the build check on a malformed date (%p)',
    (bad) => {
      const { problems } = convert(item({ testable_from: bad }));
      expect(problems).toEqual([`testable_from "${bad}" is not a date (YYYY-MM-DD) or null`]);
    },
  );
});

describe('engine: testableOn and mockPool', () => {
  const q = (testableFrom?: string) => ({ testableFrom });

  it('a future date is left out; today and the past are in; no date is always in', () => {
    expect(testableOn(q('2027-03-01'), '2026-11-26')).toBe(false);
    expect(testableOn(q('2027-03-01'), '2027-02-28')).toBe(false);
    expect(testableOn(q('2027-03-01'), '2027-03-01')).toBe(true);
    expect(testableOn(q('2027-03-01'), '2027-06-01')).toBe(true);
    expect(testableOn(q(), '2026-11-26')).toBe(true);
  });

  it('a malformed date (only possible in a broken downloaded pack) stays out of mocks', () => {
    expect(testableOn(q('2027-3-1'), '2099-01-01')).toBe(false);
  });

  it('gives back the very same array when nothing waits (every CISA mock is drawn exactly as before)', () => {
    const cisaPool = getAllQuestions('cisa');
    expect(cisaPool.some((x) => x.testableFrom !== undefined)).toBe(false);
    expect(mockPool(cisaPool, '2026-11-26')).toBe(cisaPool);
  });

  it('a mock draw never deals a future item, and deals it on its date', () => {
    const cisa = getCertification('cisa')!;
    // Ten real questions, three of them dated: a 10-item mock must take every item it is allowed.
    const ten: PackQuestion[] = getAllQuestions('cisa').slice(0, 10).map((x, i) => (i < 3 ? { ...x, testableFrom: '2027-03-01' } : x));
    const dated = new Set(ten.slice(0, 3).map((x) => x.id));
    for (const seed of [1, 2, 3, 4, 5]) {
      const before = buildMockExam(cisa, mockPool(ten, '2026-11-26'), createRng(seed), 10);
      expect(before).toHaveLength(7);
      expect(before.filter((id) => dated.has(id))).toEqual([]);
      const onTheDay = buildMockExam(cisa, mockPool(ten, '2027-03-01'), createRng(seed), 10);
      expect(onTheDay).toHaveLength(10);
      expect(onTheDay.filter((id) => dated.has(id)).sort()).toEqual([...dated].sort());
    }
  });
});

describe('startMock uses the phone’s local date', () => {
  // Pretend a whole domain rests on a requirement that is not on the exam yet.
  // (The loader's question objects are shared inside this test file only.)
  const bank = getAllQuestions('cisa');
  const d3 = bank.filter((x) => x.domainId === '3');
  const d3Ids = new Set(d3.map((x) => x.id));
  const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime(); // local noon

  beforeAll(() => {
    for (const x of d3) x.testableFrom = '2027-03-01';
  });
  afterAll(() => {
    for (const x of d3) delete x.testableFrom;
  });
  beforeEach(() => {
    useProgress.getState().resetCert('cisa');
    useSession.getState().clear();
    useSettings.setState({ onboarded: true, activeCertId: 'cisa' });
  });
  afterEach(() => jest.restoreAllMocks());

  it('before the date: a full mock holds no dated item (and is still full length)', () => {
    jest.spyOn(Date, 'now').mockReturnValue(at(2026, 11, 26));
    const s = startMock('cisa')!;
    expect(s.questionIds).toHaveLength(150);
    expect(s.questionIds.filter((id) => d3Ids.has(id))).toEqual([]);
  });

  it('on the date: the domain is back at its exam weight', () => {
    jest.spyOn(Date, 'now').mockReturnValue(at(2027, 3, 1));
    const s = startMock('cisa')!;
    expect(s.questionIds.filter((id) => d3Ids.has(id))).toHaveLength(18); // 12% of 150
  });

  it('practice is not filtered: the dated items stay in the bank', () => {
    expect(getAllQuestions('cisa').filter((x) => d3Ids.has(x.id))).toHaveLength(d3.length);
  });
});
