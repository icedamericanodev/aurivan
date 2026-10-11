/**
 * Mobile 1.11, badges_game.md slice C: tiers (Long Memory 25/75/150, Dress
 * Rehearsal ×1/×2/×3 spaced a week, Firm Footing · 80% after Whole Map),
 * Stretch rows, Took Root, the one-time quiet catalogue fill, "New in
 * <set>" for a set that grew, and the catalogue and the restore check
 * agreeing on every key.
 */
import { getCertification } from '../content/certifications';
import { getDomainQuestions } from '../content/loader';
import {
  CATALOG_VERSION,
  caseKey,
  caseMarks,
  caseSets,
  grownLine,
  nextForExam,
  quietTimes,
  setCountLine,
  stretchLine,
  tierOf,
  type CaseInput,
  type CaseMark,
} from '../engine/badgeCatalog';
import {
  afterAnswer,
  allMarks,
  DRESS_GAP_DAYS,
  LONG_IDS_CAP,
  markSupported,
  spacedChain,
  type CertMilestones,
  type MarkEvidence,
  type MilestoneFacts,
  type MockFacts,
  withFrozenPlanters,
} from '../engine/milestones';
import { badgeShareable, isHonestShareText } from '../engine/shareCard';
import { checkBackupText, currentBackup } from '../lib/backup';
import { catalogFillLine, checkMilestones, ensureBackfill, ensureCatalog, milestoneFacts, seeCatalogFill, syncPlanters, tookRootShare } from '../lib/milestones';
import { certOutline, questionExists } from '../lib/outline';
import { selectCert, useProgress, type MockResult } from '../store/progress';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const T0 = new Date(2026, 9, 12, 10, 0, 0).getTime();
const DAY = 86_400_000;
const cisa = getCertification('cisa')!;
const DOMAINS = cisa.domains.map((d) => ({ id: d.id, short: d.short, weight: d.weight, tone: d.tone, ...(d.emblem ? { emblem: d.emblem } : {}) }));
const EXAM = { questions: cisa.exam.questions, minutes: cisa.exam.minutes };
const FULL: MockFacts = { total: 150, timing: 'standard', unanswered: 0 };

function facts(over: Partial<MilestoneFacts> = {}): MilestoneFacts {
  return {
    cleanAnswered: 0,
    topicsClear: 0,
    domains: cisa.domains.map((d) => ({ id: d.id, short: d.short, answered: 0, mastery: 0 })),
    loopFixed: 0,
    slipsTagged: 0,
    longRecall: 0,
    graduated: 0,
    sure: [],
    mocks: [],
    fullMockSize: 150,
    mindsetShift: false,
    mindsetData: false,
    studyDays: 0,
    freshStart: false,
    gamesPlayed: 0,
    gamesTotal: 9,
    snareHits: [],
    keelRun: 0,
    signposts: [],
    myths: [],
    paceRounds: 0,
    gameFixes: 0,
    ...over,
  };
}
const every = (answered: number, mastery: number) => cisa.domains.map((d) => ({ id: d.id, short: d.short, answered, mastery }));
const met = (f: MilestoneFacts) => allMarks(f).filter((m) => m.met).map((m) => m.key);
const input = (f: MilestoneFacts, earned: Record<string, number> = {}): CaseInput => ({ marks: allMarks(f), earned, domains: DOMAINS, exam: EXAM, mindsetData: Boolean(f.mindsetData) });
const caseOf = (f: MilestoneFacts, earned: Record<string, number> = {}) => {
  const marks = caseMarks(input(f, earned));
  return { marks, sets: caseSets(marks, EXAM, DOMAINS.length) };
};
const find = (marks: CaseMark[], key: string) => marks.find((m) => m.key === key)!;

describe('Long Memory · 25, · 75, · 150', () => {
  it('each tier is its own mark, met at its own count; 150 is a Stretch tier', () => {
    expect(met(facts({ longRecall: 24 }))).not.toContain('long-memory');
    expect(met(facts({ longRecall: 25 }))).toEqual(expect.arrayContaining(['long-memory']));
    expect(met(facts({ longRecall: 74 }))).not.toContain('long-memory:75');
    expect(met(facts({ longRecall: 75 }))).toEqual(expect.arrayContaining(['long-memory', 'long-memory:75']));
    expect(met(facts({ longRecall: 150 }))).toEqual(expect.arrayContaining(['long-memory', 'long-memory:75', 'long-memory:150']));
    const { marks } = caseOf(facts({ longRecall: 40 }));
    expect(find(marks, 'long-memory:75')).toMatchObject({ tier: 2, tiers: 3, tierLabel: '75 recalls', ladder: 'long-memory', set: 'evergreen', status: 'started', detail: '40 of 75 remembered' });
    expect(find(marks, 'long-memory:75').stretch).toBeUndefined();
    expect(find(marks, 'long-memory:150')).toMatchObject({ tier: 3, stretch: true });
    expect(find(marks, 'long-memory:150').rule).toBe('Get 150 questions right, without a hint, a week or more after you last saw them.');
    expect(find(marks, 'long-memory:150').effort).toContain('Stretch: beyond exam need.');
  });

  it('the counted questions now go up to 150 (it stopped at 25), each question once', () => {
    let m: CertMilestones = { earned: {}, counts: { longRecall: 25 }, longIds: Array.from({ length: 25 }, (_, i) => `old${i}`) };
    const recall = (id: string, at: number) => afterAnswer(m, { questionId: id, correct: true, assisted: false, game: false, at, prevLastAt: at - 8 * DAY, graduated: false }).milestones;
    m = recall('q1', T0);
    expect(m.counts!.longRecall).toBe(26);
    m = recall('q1', T0 + DAY); // the same question never counts twice
    expect(m.counts!.longRecall).toBe(26);
    m = { ...m, longIds: Array.from({ length: LONG_IDS_CAP }, (_, i) => `x${i}`), counts: { longRecall: LONG_IDS_CAP } };
    m = recall('q2', T0);
    expect(m.counts!.longRecall).toBe(LONG_IDS_CAP);
    expect(LONG_IDS_CAP).toBe(150);
  });
});

describe('Dress Rehearsal · 2 and · 3', () => {
  const at = (days: number) => ({ ...FULL, finishedAt: T0 + days * DAY });
  it('count only full mocks finished once Whole Map is earned, each a week or more after the last', () => {
    const wm = T0;
    // Before Whole Map: never, however many mocks.
    expect(met(facts({ mocks: [at(1), at(9), at(17)] }))).not.toContain('dress-rehearsal:2');
    // After: two a week apart → · 2; three → · 3.
    expect(met(facts({ wholeMapAt: wm, mocks: [at(1), at(8)] }))).toEqual(expect.arrayContaining(['dress-rehearsal', 'dress-rehearsal:2']));
    expect(met(facts({ wholeMapAt: wm, mocks: [at(1), at(8), at(15)] }))).toContain('dress-rehearsal:3');
    // Six days apart is not a week: the chain stays at one.
    expect(met(facts({ wholeMapAt: wm, mocks: [at(1), at(7)] }))).not.toContain('dress-rehearsal:2');
    // A mock from before Whole Map is not part of the chain.
    expect(met(facts({ wholeMapAt: wm, mocks: [at(-10), at(1)] }))).not.toContain('dress-rehearsal:2');
    // Whole Map met right now but not yet saved: there is no date to count
    // from, so none of the older mocks count (they all came before it).
    const now = facts({ domains: every(40, 0.7), mocks: [at(-30), at(-20), at(-10)] });
    expect(met(now)).toEqual(expect.arrayContaining(['whole-map', 'dress-rehearsal']));
    expect(met(now)).not.toContain('dress-rehearsal:2');
    expect(met(now)).not.toContain('dress-rehearsal:3');
    expect(allMarks(now).find((m) => m.key === 'dress-rehearsal:2')!.progress).toBe(0);
    // Untimed or unanswered mocks never count.
    expect(met(facts({ wholeMapAt: wm, mocks: [at(1), { ...at(9), timing: 'untimed' }] }))).not.toContain('dress-rehearsal:2');
    expect(met(facts({ wholeMapAt: wm, mocks: [at(1), { ...at(9), unanswered: 3 }] }))).not.toContain('dress-rehearsal:2');
  });

  it('the chain is greedy, oldest first', () => {
    expect(spacedChain([T0, T0 + 3 * DAY, T0 + 7 * DAY, T0 + 15 * DAY]).length).toBe(3);
    expect(spacedChain([T0 + 7 * DAY, T0])).toEqual([T0, T0 + 7 * DAY]);
    expect(DRESS_GAP_DAYS).toBe(7);
  });

  it('gated until Whole Map ("Opens when every domain reaches 65%"), then a progress line', () => {
    const gated = caseOf(facts()).marks;
    expect(find(gated, 'dress-rehearsal:2')).toMatchObject({ status: 'gated', gateLine: 'Opens when every domain reaches 65%.', progress: 0 });
    expect(find(gated, 'dress-rehearsal:3')).toMatchObject({ status: 'gated', stretch: true });
    const open = caseOf(facts({ wholeMapAt: T0, mocks: [at(1)] }), { 'whole-map': T0 }).marks;
    expect(find(open, 'dress-rehearsal:2')).toMatchObject({ status: 'started', detail: '1 of 2 full mocks, a week apart', tierLabel: '2 mocks' });
    expect(find(open, 'dress-rehearsal:3').effort).toBe('Needs at least 15 days and 3 full mocks. Stretch: beyond exam need.');
  });
});

describe('Firm Footing · 80% (Stretch)', () => {
  it('needs Whole Map, 40 of the domain’s answers and 80% mastery', () => {
    const deep = every(40, 0.8);
    expect(met(facts({ domains: deep }))).toContain('whole-map'); // met now: the tier opens with it
    expect(met(facts({ domains: deep }))).toContain('firm-footing:4:80');
    // Without Whole Map (another domain under 65%), never.
    const lopsided = deep.map((d) => (d.id === '3' ? { ...d, mastery: 0.5 } : d));
    expect(met(facts({ domains: lopsided }))).not.toContain('firm-footing:4:80');
    // 39 answers, or 79%: not yet.
    expect(met(facts({ domains: every(39, 0.9), wholeMapAt: T0 }))).not.toContain('firm-footing:4:80');
    expect(met(facts({ domains: every(60, 0.79), wholeMapAt: T0 }))).not.toContain('firm-footing:4:80');
  });

  it('a two-step ladder per domain (70% Clay, 80% Lichen), gated and labelled until Whole Map', () => {
    const { marks } = caseOf(facts({ domains: every(30, 0.7) }));
    const ff = find(marks, 'firm-footing:4');
    const deep = find(marks, 'firm-footing:4:80');
    expect(ff).toMatchObject({ tier: 1, tiers: 2, tierLabel: '70%', ladder: 'firm-footing:4' });
    expect(deep).toMatchObject({ tier: 2, tiers: 2, tierLabel: '80%', ladder: 'firm-footing:4', stretch: true, status: 'gated', set: 'domains' });
    expect(deep.domain!.emblem).toBe('domain-operations');
    expect(deep.name).toBe('Firm Footing · IS Operations · 80%');
  });
});

describe('the five domains each wear their own emblem', () => {
  it('CISA: five different emblems, none of them the tree ring', () => {
    const emblems = cisa.domains.map((d) => d.emblem);
    expect(new Set(emblems).size).toBe(5);
    expect(emblems.every((e) => e && e.startsWith('domain-'))).toBe(true);
    const art = require('../content/badgeArt.json') as { emblems: Record<string, unknown> };
    for (const e of emblems) expect(art.emblems[e!]).toBeDefined();
    expect(art.emblems['took-root']).toBeDefined();
  });
});

describe('Took Root', () => {
  it('met when every part of one topic took root; progress is a percentage, never "n of m parts"', () => {
    expect(met(facts({ tookRoot: 1 }))).toContain('took-root');
    expect(met(facts({ tookRoot: 0.99 }))).not.toContain('took-root');
    const { marks } = caseOf(facts({ tookRoot: 0.6 }));
    const m = find(marks, 'took-root');
    expect(m).toMatchObject({ set: 'evergreen', status: 'started', detail: 'Closest topic: 60% rooted', minDays: 2 });
    expect(m.detail).not.toMatch(/\d+ of \d+/);
    expect(m.skill).toBe('Made a whole topic stick');
  });

  it('reads the study notes’ mastery dates: a topic whose every part (with questions) is mastered', () => {
    const topic = certOutline('cisa').topics.find((t) => t.subtopics.filter((s) => s.questionIds.some(questionExists('cisa'))).length >= 2)!;
    const parts = topic.subtopics.filter((s) => s.questionIds.some(questionExists('cisa')));
    const mastered = (n: number) => Object.fromEntries(parts.slice(0, n).map((s) => [s.id, { firstDay: '2026-10-01', masteredAt: '2026-10-03' }]));
    expect(tookRootShare('cisa', {})).toBe(0);
    expect(tookRootShare('cisa', mastered(1))).toBeCloseTo(1 / parts.length);
    expect(tookRootShare('cisa', mastered(parts.length))).toBe(1);
    // A first day alone (one day only) is not mastery.
    expect(tookRootShare('cisa', Object.fromEntries(parts.map((s) => [s.id, { firstDay: '2026-10-01' }])))).toBe(0);
  });
});

describe('sets: Stretch rows and sets that grew', () => {
  it('Stretch tiers are counted on their own, never in the set’s "n of m" or its completion', () => {
    const earned = { 'first-foothold': T0, 'whole-map': T0, ...Object.fromEntries(cisa.domains.map((d) => [`firm-footing:${d.id}`, T0])) };
    const { sets } = caseOf(facts(), earned);
    const domains = sets.find((s) => s.info.id === 'domains')!;
    expect(setCountLine(domains)).toBe('6 of 6 · Complete');
    expect(stretchLine(domains)).toBe('Stretch · beyond exam need · 0 of 5');
    expect(stretchLine(sets.find((s) => s.info.id === 'evergreen')!)).toBe('Stretch · beyond exam need · 0 of 1');
    expect(stretchLine(sets.find((s) => s.info.id === 'groundwork')!)).toBeUndefined();
  });

  it('a set that showed "Complete" and gained badges says so as news, for 14 days; its planter stays', () => {
    const earned = { 'long-memory': T0, graduate: T0, 'loop-closed': T0 };
    const { sets } = caseOf(facts(), earned);
    const evergreen = sets.find((s) => s.info.id === 'evergreen')!;
    expect(setCountLine(evergreen)).toBe('3 of 5');
    expect(grownLine(evergreen, { evergreen: T0 - DAY })).toBe('New in Evergreen: 2 badges added since you completed it.');
    // First shown 13 days ago: still news. 14 days on: gone (the set's count still says 3 of 5).
    expect(grownLine(evergreen, { evergreen: T0 - DAY }, T0 - 13 * DAY, T0)).toBeDefined();
    expect(grownLine(evergreen, { evergreen: T0 - DAY }, T0 - 14 * DAY, T0)).toBeUndefined();
    // Never for a set that never completed, or one complete again.
    expect(grownLine(evergreen, {})).toBeUndefined();
    const again = caseOf(facts(), { ...earned, 'long-memory:75': T0, 'took-root': T0 }).sets.find((s) => s.info.id === 'evergreen')!;
    expect(grownLine(again, { evergreen: T0 - DAY })).toBeUndefined();
  });
});

describe('the catalogue and the restore check agree on every key', () => {
  // Evidence rich enough for every rule (whole data, so only the KEY's shape can fail).
  const answers = Object.fromEntries(cisa.domains.flatMap((d) => getDomainQuestions('cisa', d.id).slice(0, 60).map((q) => [q.id, {}])));
  const mocks = [0, 8, 16].map((d) => ({ total: 150, timing: 'standard', unanswered: 0, finishedAt: T0 + d * DAY }));
  const evidence: MarkEvidence = {
    answers,
    mistakes: Object.fromEntries(Object.keys(answers).slice(0, 12).map((id) => [id, { slip: 'misread' }])),
    mocks,
    lessonsDone: ['l1'],
    notesRead: ['n1'],
    gameBest: { trap: 1, sprint: 1, priority: 1 },
    gameGrowth: { trap: { hits: Array(12).fill(true) } },
    milestones: {
      counts: { longRecall: 150, graduated: 60, loopFixed: 12, gameFixes: 12, paceRounds: 3 },
      longIds: Array.from({ length: 150 }, (_, i) => `q${i}`),
      sure: Array(30).fill(true),
      days: 70,
      myths: Array(25).fill({ id: 'm', ok: true }),
      signposts: Array(10).fill({ id: 's', ok: true }),
    },
    mastery: { '4A1.1': { masteredAt: '2026-10-02' } },
    exam: { domains: cisa.domains.map((d) => d.id), fullMockSize: 150 },
    earned: { 'whole-map': T0 },
  };
  const catalogue = allMarks(facts()).map((m) => m.key);

  it('every key the catalogue lists is shown on the case AND accepted by a restore', () => {
    expect(catalogue).toEqual(expect.arrayContaining(['long-memory:75', 'long-memory:150', 'dress-rehearsal:2', 'dress-rehearsal:3', 'firm-footing:5:80', 'took-root']));
    for (const k of catalogue) {
      expect([k, caseKey(k)]).toEqual([k, true]);
      expect([k, markSupported(k, evidence)]).toEqual([k, true]);
    }
  });

  it('no key the catalogue can’t show is accepted by a restore', () => {
    for (const k of ['long-memory:25', 'long-memory:999', 'dress-rehearsal:1', 'dress-rehearsal:4', 'firm-footing:4:90', 'firm-footing:4:80:1', 'took-root:2', 'rooted', 'rooted:20', 'on-pace:2', 'fresh-start:1', 'nope', '']) {
      expect([k, caseKey(k)]).toEqual([k, false]);
      expect([k, markSupported(k, evidence)]).toEqual([k, false]);
    }
  });

  it('no plain "firm-footing" key: every Firm Footing mark is a domain’s leaf, for the case and the restore alike', () => {
    expect(caseKey('firm-footing')).toBe(false);
    expect(markSupported('firm-footing', evidence)).toBe(false);
    expect(caseKey('rooted')).toBe(false);
  });

  it('Long Memory’s tiers need the counted questions too, not only the counter', () => {
    const lm = (longRecall: number, ids: number): MarkEvidence => ({ ...evidence, milestones: { ...evidence.milestones, counts: { longRecall }, longIds: Array.from({ length: ids }, (_, i) => `q${i}`) } });
    // A genuine save: the counter and the list grow together.
    expect(markSupported('long-memory:150', lm(150, 150))).toBe(true);
    expect(markSupported('long-memory:75', lm(80, 80))).toBe(true);
    // An edited counter the list can't back: read as the list's length.
    expect(markSupported('long-memory:150', lm(150, 25))).toBe(false);
    expect(markSupported('long-memory:75', lm(150, 25))).toBe(false);
    expect(markSupported('long-memory', lm(150, 25))).toBe(true);
    // No list at all: no recall can be shown.
    expect(markSupported('long-memory', { ...evidence, milestones: { counts: { longRecall: 30 } } })).toBe(false);
  });

  it('tierOf names every tier the same way the case does', () => {
    expect(tierOf('long-memory')).toMatchObject({ tier: 1, tiers: 3, stretch: false });
    expect(tierOf('dress-rehearsal:3')).toMatchObject({ tier: 3, tierLabel: '3 mocks', stretch: true });
    expect(tierOf('rooted:30')).toMatchObject({ tier: 2, tierLabel: '30 days', stretch: false });
    expect(tierOf('graduate')).toBeUndefined();
  });
});

describe('Next for your exam never pushes a Stretch tier or a gated one', () => {
  it('a Stretch tier is never "Best for your exam", even with its set’s core done; it may be among the nearest', () => {
    const f = facts({ cleanAnswered: 300, longRecall: 96, domains: every(30, 0.6) });
    const earned = { 'first-foothold': T0, 'long-memory': T0, 'long-memory:75': T0, graduate: T0, 'loop-closed': T0, 'took-root': T0 };
    const marks = caseMarks(input(f, earned));
    const n = nextForExam({ marks, stage: 'ready', daysLeft: null, mastery: Object.fromEntries(cisa.domains.map((d) => [d.id, 0.6])) });
    expect(n.best?.key).not.toBe('long-memory:150');
    expect(n.best?.stretch).toBeFalsy();
    // Among the nearest, any core badge comes before a Stretch tier, however close the Stretch tier is.
    const firstStretch = n.nearest.findIndex((m) => m.stretch);
    if (firstStretch >= 0) expect(n.nearest.slice(firstStretch).every((m) => m.stretch)).toBe(true);
    expect(n.nearest[0].stretch).toBeFalsy();
  });

  it('the 80% tier’s progress reads against 80%, not 70%', () => {
    const { marks } = caseOf(facts({ domains: every(40, 0.75), wholeMapAt: T0 }), { 'whole-map': T0 });
    expect(find(marks, 'firm-footing:4:80').detail).toBe('75% → 80% · 40 of 40 answered');
    expect(find(marks, 'firm-footing:4').detail).toBe('20 of 20 answered · at 70%+');
  });

  it('after Whole Map, with Firm Footing done, the mocks lead and no 80% tier is slot 1', () => {
    const f = facts({ cleanAnswered: 300, domains: every(45, 0.82), wholeMapAt: T0 });
    const earned = { 'first-foothold': T0, 'whole-map': T0, ...Object.fromEntries(cisa.domains.map((d) => [`firm-footing:${d.id}`, T0])) };
    const marks = caseMarks(input(f, earned));
    const n = nextForExam({ marks, stage: 'practice', daysLeft: null, mastery: Object.fromEntries(cisa.domains.map((d) => [d.id, 0.82])) });
    expect(n.best?.key).toBe('dress-rehearsal');
    expect(n.best?.stretch).toBeFalsy();
  });
});

describe('copy for the new marks', () => {
  it('every shareable skill line passes the honesty guard; Fresh Start is never shareable', () => {
    const { marks } = caseOf(facts());
    for (const m of marks) {
      if (m.skill) expect([m.key, isHonestShareText(m.skill)]).toEqual([m.key, true]);
    }
    expect(badgeShareable({ status: 'earned', set: 'moments', skill: 'Came back' })).toBe(false);
    expect(badgeShareable(find(marks, 'fresh-start'))).toBe(false);
    expect(find(marks, 'graduate').skill).toBe('Moved 50 questions through spaced review');
    expect(find(marks, 'on-pace').skill).toBe('Kept exam pace in a practice mock');
    expect(find(marks, 'whole-map').skill).toBe('Reached 65% in every exam domain in practice');
  });
});

// ── Through the stores: the one-time quiet catalogue fill ────────────────
const cp = () => selectCert(useProgress.getState(), 'cisa');
describe('the catalogue fill (a 1.10 save meets 1.11)', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: T0 });
    useProgress.setState({ byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {} });
    useSettings.setState({ onboarded: true, activeCertId: 'cisa' });
  });
  afterEach(() => jest.useRealTimers());

  /** A 1.10 save: back-filled, no catalogue version; a whole topic mastered; 25 recalls kept; Whole Map and two spaced mocks after it. */
  function save110() {
    const topic = certOutline('cisa').topics.find((t) => t.subtopics.some((s) => s.questionIds.some(questionExists('cisa'))))!;
    const mastery = Object.fromEntries(topic.subtopics.filter((s) => s.questionIds.some(questionExists('cisa'))).map((s) => [s.id, { firstDay: '2026-09-01', masteredAt: '2026-09-03' }]));
    const mock = (d: number): MockResult => ({ id: `m${d}`, finishedAt: T0 - d * DAY, total: 150, correct: 100, minutesUsed: 200, byDomain: {}, timing: 'standard', unanswered: 0 });
    useProgress.setState((s) => ({
      byCert: {
        ...s.byCert,
        cisa: {
          ...selectCert(s, 'cisa'),
          mastery,
          // Answers in every domain (Whole Map's own restore evidence).
          answers: Object.fromEntries(cisa.domains.flatMap((d) => getDomainQuestions('cisa', d.id).slice(0, 6).map((q) => [q.id, { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: T0 - 40 * DAY }]))),
          mocks: [mock(20), mock(10)],
          milestones: {
            earned: { 'first-foothold': T0 - 50 * DAY, 'whole-map': T0 - 30 * DAY, 'long-memory': T0 - 40 * DAY, 'dress-rehearsal': T0 - 20 * DAY },
            backfill: { at: T0 - 60 * DAY, count: 3, seen: true },
            counts: { longRecall: 25 },
            longIds: Array.from({ length: 25 }, (_, i) => `q${i}`),
            planters: { evergreen: T0 - 30 * DAY },
          },
        },
      },
    }));
  }

  it('earns what the saved study shows, ONCE and quietly (no moments), with one summary line', () => {
    save110();
    expect(ensureCatalog('cisa', T0)).toBe(2); // Took Root and Dress Rehearsal · 2
    const m = cp().milestones!;
    expect(m.earned['took-root']).toBe(T0);
    expect(m.earned['dress-rehearsal:2']).toBe(T0);
    // Never inflated: the 25 recalls counted before don't make 75.
    expect(m.earned['long-memory:75']).toBeUndefined();
    expect(m.queue ?? []).toEqual([]);
    expect(m.catalog).toBe(CATALOG_VERSION);
    expect(m.catalogFill).toEqual({ at: T0, count: 2 });
    // Quiet: stamped with the fill's time, so "By 12 Oct" and never the "new" dot.
    expect(quietTimes(m)).toContain(T0);
    // Planters earned before are kept.
    expect(m.planters!.evergreen).toBe(T0 - 30 * DAY);
    // Once: a second run does nothing.
    expect(ensureCatalog('cisa', T0 + DAY)).toBeNull();
    expect(catalogFillLine(2)).toBe('Badges now have higher tiers, plus a new one: Took Root. Your study so far already earned 2 of them.');
    expect(catalogFillLine(0)).toBeNull();
    seeCatalogFill('cisa');
    expect(cp().milestones!.catalogFill!.seen).toBe(true);
  });

  it('a session finished before the launch fill runs it first: history is never queued as moments', () => {
    save110();
    checkMilestones('cisa', { now: T0 });
    expect(cp().milestones!.queue ?? []).toEqual([]);
    expect(cp().milestones!.catalog).toBe(CATALOG_VERSION);
  });

  it('a fresh install’s back-fill reads the new catalogue, so the fill has nothing to add', () => {
    ensureBackfill('cisa', T0);
    expect(cp().milestones!.catalog).toBe(CATALOG_VERSION);
    expect(ensureCatalog('cisa', T0)).toBeNull();
  });

  it('Reset is a fresh start: the catalogue is marked filled, nothing is re-awarded', () => {
    save110();
    useProgress.getState().resetCert('cisa');
    expect(cp().milestones).toMatchObject({ earned: {}, catalog: CATALOG_VERSION });
    expect(ensureCatalog('cisa', T0)).toBeNull();
  });

  it('the backup carries the new fields, and a 1.10 backup (no catalogue) still restores', () => {
    save110();
    ensureCatalog('cisa', T0);
    useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...cp(), milestones: { ...cp().milestones!, longIds: Array.from({ length: 150 }, (_, i) => `q${i}`) } } } }));
    const read = checkBackupText(JSON.stringify(currentBackup(Date.now())));
    if (read.kind !== 'ok') throw new Error(read.code);
    const back = read.data.progress.byCert.cisa.milestones!;
    expect(back.catalog).toBe(CATALOG_VERSION);
    expect(back.catalogFill).toEqual({ at: T0, count: 2 });
    expect(back.longIds).toHaveLength(150);
    // Its tiers survive the restore check on their own evidence.
    expect(back.earned['dress-rehearsal:2']).toBe(T0);
    expect(back.earned['took-root']).toBe(T0);
    // A 1.10 file: no catalogue fields at all.
    const old = JSON.parse(JSON.stringify(currentBackup(Date.now())));
    delete old.stores.progress.state.byCert.cisa.milestones.catalog;
    delete old.stores.progress.state.byCert.cisa.milestones.catalogFill;
    expect(checkBackupText(JSON.stringify(old)).kind).toBe('ok');
  });

  it('the summary counts badges the way the back-fill does: each badge once, milestones only', () => {
    save110();
    // Two more Firm Footing · 80% leaves in the save: one badge, not two marks.
    useProgress.setState((s) => {
      const c = selectCert(s, 'cisa');
      const deep = Object.fromEntries(['1', '4'].flatMap((d) => getDomainQuestions('cisa', d).slice(0, 45).map((q) => [q.id, { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: T0 - 40 * DAY }])));
      return { byCert: { ...s.byCert, cisa: { ...c, answers: { ...c.answers, ...deep } } } };
    });
    expect(ensureCatalog('cisa', T0)).toBe(3); // Took Root, Dress Rehearsal, Firm Footing
    const m = cp().milestones!;
    expect(m.earned['firm-footing:1:80']).toBe(T0);
    expect(m.earned['firm-footing:4:80']).toBe(T0);
    expect(m.catalogFill).toEqual({ at: T0, count: 3 });
  });

  it('the facts read Whole Map’s date and the topics’ mastery from the save', () => {
    save110();
    const f = milestoneFacts('cisa', cp(), { now: T0 })!;
    expect(f.wholeMapAt).toBe(T0 - 30 * DAY);
    expect(f.tookRoot).toBe(1);
  });
});

// ── Dress Rehearsal counts from the day Whole Map is SAVED (CR B1) ─────────
describe('Dress Rehearsal · 2 and · 3 never count mocks from before Whole Map', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: T0 });
    useProgress.setState({ byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {} });
    useSettings.setState({ onboarded: true, activeCertId: 'cisa' });
  });
  afterEach(() => jest.useRealTimers());

  const mock = (id: string, at: number): MockResult => ({ id, finishedAt: at, total: 150, correct: 110, minutesUsed: 200, byDomain: {}, timing: 'standard', unanswered: 0 });
  /** Every domain at 100% (Whole Map met), three full mocks a week apart, all BEFORE now. */
  function seed(milestones?: CertMilestones) {
    useProgress.setState((s) => ({
      byCert: {
        ...s.byCert,
        cisa: {
          ...selectCert(s, 'cisa'),
          answers: Object.fromEntries(cisa.domains.flatMap((d) => getDomainQuestions('cisa', d.id).slice(0, 25).map((q) => [q.id, { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: T0 - 40 * DAY }]))),
          mocks: [mock('a', T0 - 30 * DAY), mock('b', T0 - 20 * DAY), mock('c', T0 - 10 * DAY)],
          ...(milestones ? { milestones } : {}),
        },
      },
    }));
  }

  it('live: the session that first meets Whole Map earns it (and Dress Rehearsal), never · 2 or · 3', () => {
    seed({ earned: { 'first-foothold': T0 - 40 * DAY }, backfill: { at: T0 - 50 * DAY, count: 1, seen: true }, catalog: CATALOG_VERSION });
    const fresh = checkMilestones('cisa', { now: T0, finished: true });
    expect(fresh).toEqual(expect.arrayContaining(['whole-map', 'dress-rehearsal']));
    expect(fresh).not.toContain('dress-rehearsal:2');
    expect(fresh).not.toContain('dress-rehearsal:3');
    // Mocks from the day Whole Map was saved on do count, a week apart.
    useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...cp(), mocks: [...cp().mocks, mock('d', T0 + DAY), mock('e', T0 + 8 * DAY)] } } }));
    expect(checkMilestones('cisa', { now: T0 + 8 * DAY, finished: true })).toEqual(['dress-rehearsal:2']);
  });

  it('back-fill: an older save meets Whole Map now; its older mocks never make · 2 or · 3', () => {
    seed();
    ensureBackfill('cisa', T0);
    const m = cp().milestones!;
    expect(m.earned['whole-map']).toBe(T0);
    expect(m.earned['dress-rehearsal']).toBe(T0);
    expect(m.earned['dress-rehearsal:2']).toBeUndefined();
    expect(m.earned['dress-rehearsal:3']).toBeUndefined();
  });
});

// ── Planters a save from before 1.11 had already won (CR B2) ───────────────
describe('a save that skips 1.10 keeps the planters its sets had won', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: T0 });
    useProgress.setState({ byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {} });
    useSettings.setState({ onboarded: true, activeCertId: 'cisa' });
  });
  afterEach(() => jest.useRealTimers());

  /** A 1.9 save: back-filled, no planters and no catalogue; Evergreen's three 1.10 badges earned. */
  const save19 = () =>
    useProgress.setState((s) => ({
      byCert: {
        ...s.byCert,
        cisa: {
          ...selectCert(s, 'cisa'),
          milestones: {
            earned: { 'long-memory': T0 - 9 * DAY, graduate: T0 - 3 * DAY, 'loop-closed': T0 - 5 * DAY },
            counts: { longRecall: 25, graduated: 50, loopFixed: 10 },
            longIds: Array.from({ length: 25 }, (_, i) => `q${i}`),
            backfill: { at: T0 - 20 * DAY, count: 3, seen: true },
          },
        },
      },
    }));

  it('1.9 → 1.11: the Evergreen planter is saved, dated when its last 1.10 badge was earned', () => {
    save19();
    ensureCatalog('cisa', T0);
    const m = cp().milestones!;
    expect(m.planters).toEqual({ evergreen: T0 - 3 * DAY });
    expect(m.catalog).toBe(CATALOG_VERSION);
    // Evergreen itself now reads 3 of 5 (Long Memory · 75 and Took Root are new), and says so.
    const evergreen = caseOf(facts({ longRecall: 25, graduated: 50, loopFixed: 10 }), m.earned).sets.find((x) => x.info.id === 'evergreen')!;
    expect(setCountLine(evergreen)).toBe('3 of 5');
    expect(grownLine(evergreen, m.planters)).toBeDefined();
    // Launch's planter sync after it changes nothing.
    expect(syncPlanters('cisa', T0)).toBeNull();
  });

  it('a learner who starts on 1.11 gets a planter only for the set as 1.11 has it', () => {
    useProgress.setState((s) => ({
      byCert: {
        ...s.byCert,
        cisa: {
          ...selectCert(s, 'cisa'),
          milestones: {
            earned: { 'long-memory': T0 - 9 * DAY, graduate: T0 - 3 * DAY, 'loop-closed': T0 - 5 * DAY },
            counts: { longRecall: 25, graduated: 50, loopFixed: 10 },
            longIds: Array.from({ length: 25 }, (_, i) => `q${i}`),
            backfill: { at: T0 - 20 * DAY, count: 0, seen: true },
            catalog: CATALOG_VERSION,
          },
        },
      },
    }));
    expect(ensureCatalog('cisa', T0)).toBeNull();
    expect(syncPlanters('cisa', T0)).toBeNull();
    checkMilestones('cisa', { now: T0 });
    expect(cp().milestones!.planters?.evergreen).toBeUndefined();
  });

  it('withFrozenPlanters: never re-dates a planter, and needs every domain for the domains set', () => {
    const exam = { domains: cisa.domains.map((d) => d.id), fullMockSize: 150 };
    const earned = { 'whole-map': T0 - 2 * DAY, ...Object.fromEntries(cisa.domains.map((d, i) => [`firm-footing:${d.id}`, T0 - (10 - i) * DAY])) };
    expect(withFrozenPlanters({ earned }, { exam }).planters).toEqual({ domains: T0 - 2 * DAY });
    expect(withFrozenPlanters({ earned, planters: { domains: T0 - 50 * DAY } }, { exam }).planters).toEqual({ domains: T0 - 50 * DAY });
    const short = { ...earned };
    delete (short as Record<string, number>)['firm-footing:3'];
    const m: CertMilestones = { earned: short };
    expect(withFrozenPlanters(m, { exam })).toBe(m);
  });
});
