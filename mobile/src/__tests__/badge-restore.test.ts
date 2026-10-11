/**
 * Mobile 1.10, badges_game.md §9.4: a restored badge never claims more than
 * the restored data shows. A key is read WHOLE, tier and all, so an edited
 * backup can't claim a higher tier on a lower tier's evidence; a completed
 * set's planter stays only when its badges do.
 */
import { readBackup } from '../engine/backup';
import { dressChain, keepSupported, markSupported, PLANTER_NEEDS, planterSupported, type MarkEvidence } from '../engine/milestones';
import { COUNTED_SETS } from '../engine/badgeCatalog';

const T0 = new Date(2026, 9, 12, 10, 0, 0).getTime();
const ids = (domain: string, n: number) => Array.from({ length: n }, (_, i) => `d${domain}_${String(i + 1).padStart(3, '0')}`);
const answered = (list: string[]) => Object.fromEntries(list.map((id) => [id, {}]));

describe('markSupported reads the whole key (the restore bug)', () => {
  const e = (over: Partial<MarkEvidence> = {}): MarkEvidence => ({ answers: answered(ids('4', 25)), ...over });

  it('tiered keys need THEIR evidence, never tier 1’s', () => {
    // Firm Footing · 80% needs 40 of the domain's answers; 20 (tier 1's) is not enough.
    expect(markSupported('firm-footing:4', e())).toBe(true);
    expect(markSupported('firm-footing:4:80', e())).toBe(false);
    expect(markSupported('firm-footing:4:80', e({ answers: answered(ids('4', 40)) }))).toBe(true);
    // Long Memory · 75 needs 75 recalls; the 25 that earn "long-memory" are not enough.
    const counts = (longRecall: number) => ({ milestones: { counts: { longRecall } } });
    expect(markSupported('long-memory', e(counts(25)))).toBe(true);
    expect(markSupported('long-memory:75', e(counts(25)))).toBe(false);
    expect(markSupported('long-memory:75', e(counts(75)))).toBe(true);
    expect(markSupported('long-memory:150', e(counts(149)))).toBe(false);
    // Dress Rehearsal · 2 needs two mocks.
    expect(markSupported('dress-rehearsal', e({ mocks: [{}] }))).toBe(true);
    expect(markSupported('dress-rehearsal:2', e({ mocks: [{}] }))).toBe(false);
    expect(markSupported('dress-rehearsal:2', e({ mocks: [{}, {}] }))).toBe(true);
    expect(markSupported('dress-rehearsal:3', e({ mocks: [{}, {}] }))).toBe(false);
  });

  it('refuses tiers no version defines, stray parts and extra segments', () => {
    const lots = e({ answers: answered(ids('4', 120)), mocks: [{}, {}, {}, {}], milestones: { counts: { longRecall: 999 }, days: 99 } });
    for (const key of [
      'long-memory:999',
      'long-memory:25', // tier 1 is the plain key
      'long-memory:075',
      'dress-rehearsal:9',
      'firm-footing:4:90',
      'firm-footing:4:80:x',
      'firm-footing:',
      'rooted:15',
      'rooted:10:x',
      'first-foothold:x',
      'whole-map:1',
      'on-pace:2',
      'snare-wise:1',
      'made-up',
    ]) {
      expect([key, markSupported(key, lots)]).toEqual([key, false]);
    }
  });

  it('every key this version earns is still supported by genuine data', () => {
    const genuine: MarkEvidence = {
      answers: answered([...ids('1', 30), ...ids('2', 30), ...ids('3', 30), ...ids('4', 30), ...ids('5', 30)]),
      lessonsDone: ['l1'],
      mocks: [{}],
      mistakes: Object.fromEntries(ids('9', 10).map((id) => [id, { slip: 'role' }])),
      milestones: { counts: { longRecall: 25, graduated: 50, loopFixed: 10, paceRounds: 3, gameFixes: 10 }, sure: Array(20).fill(true), days: 60, myths: Array(25).fill({ id: 'x', ok: true }), signposts: Array(10).fill({ id: 'x', ok: true }) },
      gameBest: { trap: 1, sprint: 1 },
      gameGrowth: { trap: { hits: Array(10).fill(true) } },
      mastery: { '4A1.1': { masteredAt: '2026-10-01' } },
    };
    for (const key of [
      'first-foothold',
      'topic-clear',
      'firm-footing:1',
      'firm-footing:5',
      'whole-map',
      'loop-closed',
      'slip-spotter',
      'long-memory',
      'graduate',
      'know-what-you-know',
      'dress-rehearsal',
      'on-pace',
      'mindset-shift',
      'rooted:10',
      'rooted:30',
      'rooted:60',
      'fresh-start',
      'snare-wise',
      'even-keel',
      'signpost-reader',
      'myth-clearer',
      'sure-footed-pace',
      'whole-grove',
      'back-on-path',
      'took-root',
    ]) {
      expect([key, markSupported(key, genuine)]).toEqual([key, true]);
    }
  });
});

describe('the exam the cert is for (QA: Whole Map and Dress Rehearsal’s tiers)', () => {
  const exam = { domains: ['1', '2', '3', '4', '5'], fullMockSize: 150 };
  const DAY = 86_400_000;
  const mock = (at: number, over: object = {}) => ({ total: 150, finishedAt: at, timing: 'standard', unanswered: 0, ...over });

  it('Whole Map needs answers in every exam domain, so one domain’s answers can’t claim it', () => {
    expect(markSupported('whole-map', { answers: answered(ids('4', 25)), exam })).toBe(false);
    const all = answered(['1', '2', '3', '4', '5'].flatMap((d) => ids(d, 5)));
    expect(markSupported('whole-map', { answers: all, exam })).toBe(true);
    // Without the exam (an engine caller that doesn't know it), the old floor stands.
    expect(markSupported('whole-map', { answers: answered(ids('4', 25)) })).toBe(true);
  });

  it('Dress Rehearsal · 2 and · 3 need full, timed, fully answered mocks a week apart', () => {
    const e = (mocks: object[]) => ({ answers: {}, mocks, exam });
    expect(dressChain([mock(T0), mock(T0 + 7 * DAY)], 150)).toEqual([T0, T0 + 7 * DAY]);
    expect(markSupported('dress-rehearsal:2', e([mock(T0), mock(T0 + 7 * DAY)]))).toBe(true);
    expect(markSupported('dress-rehearsal:2', e([mock(T0), mock(T0 + 6 * DAY)]))).toBe(false); // too close
    expect(markSupported('dress-rehearsal:2', e([mock(T0), mock(T0 + 8 * DAY, { total: 50 })]))).toBe(false); // a mini
    expect(markSupported('dress-rehearsal:2', e([mock(T0), mock(T0 + 8 * DAY, { timing: 'untimed' })]))).toBe(false);
    expect(markSupported('dress-rehearsal:2', e([mock(T0), mock(T0 + 8 * DAY, { unanswered: 3 })]))).toBe(false);
    expect(markSupported('dress-rehearsal:3', e([mock(T0 + 14 * DAY), mock(T0), mock(T0 + 7 * DAY)]))).toBe(true); // any order
    // Damaged records are skipped, never trusted.
    expect(markSupported('dress-rehearsal:2', e([mock(T0), { total: '150', finishedAt: T0 + 9 * DAY }, null as unknown as object]))).toBe(false);
    // A Stretch or higher tier opens only after Whole Map: dropped on restore without it.
    const genuineMocks = { answers: answered(ids('4', 45)), mocks: [mock(T0), mock(T0 + 7 * DAY)], exam };
    const strip = (earned: Record<string, number>) => Object.keys(keepSupported({ earned }, genuineMocks).earned).sort();
    expect(strip({ 'dress-rehearsal:2': T0, 'firm-footing:4:80': T0 })).toEqual([]);
    const all5 = { ...genuineMocks, answers: answered(['1', '2', '3', '5'].flatMap((d) => ids(d, 5)).concat(ids('4', 45))) };
    expect(Object.keys(keepSupported({ earned: { 'whole-map': T0, 'dress-rehearsal:2': T0, 'firm-footing:4:80': T0 } }, all5).earned).sort()).toEqual([
      'dress-rehearsal:2',
      'firm-footing:4:80',
      'whole-map',
    ]);
    // Tier 1 keeps its plain check (one mock record), so a genuine old badge is never dropped.
    expect(markSupported('dress-rehearsal', e([mock(T0, { total: 50 })]))).toBe(true);
  });
});

describe('planters (a completed set’s reward, Phase 4)', () => {
  it('the frozen needs cover every counted set', () => {
    expect(Object.keys(PLANTER_NEEDS).sort()).toEqual([...COUNTED_SETS].sort());
  });

  it('kept only when the set’s badges are; unknown sets never', () => {
    const answers = answered([...ids('1', 1), ...ids('4', 1)]);
    expect(planterSupported('groundwork', { 'first-foothold': T0, 'topic-clear': T0, 'ten-topics': T0 }, { answers })).toBe(true);
    expect(planterSupported('groundwork', { 'first-foothold': T0, 'topic-clear': T0 }, { answers })).toBe(false);
    expect(planterSupported('domains', { 'whole-map': T0, 'firm-footing:1': T0, 'firm-footing:4': T0 }, { answers })).toBe(true);
    expect(planterSupported('domains', { 'whole-map': T0, 'firm-footing:1': T0 }, { answers })).toBe(false);
    expect(planterSupported('domains', { 'firm-footing:1': T0, 'firm-footing:4': T0 }, { answers })).toBe(false);
    expect(planterSupported('fieldNotes', { 'snare-wise': T0 }, { answers })).toBe(false);
    expect(planterSupported('__proto__', {}, { answers })).toBe(false);
    // With the exam known, the Five Domains planter needs a leaf in EVERY exam domain, not just the ones answered.
    const exam = { domains: ['1', '2', '3', '4', '5'], fullMockSize: 150 };
    expect(planterSupported('domains', { 'whole-map': T0, 'firm-footing:1': T0, 'firm-footing:4': T0 }, { answers, exam })).toBe(false);
    const five = Object.fromEntries(exam.domains.map((d) => [`firm-footing:${d}`, T0]));
    expect(planterSupported('domains', { 'whole-map': T0, ...five }, { answers, exam })).toBe(true);
  });

  it('keepSupported drops a planter whose badges were dropped', () => {
    const m = { earned: { 'rooted:10': T0, 'rooted:30': T0, 'rooted:60': T0 }, planters: { rooted: T0, examDay: T0 } };
    const kept = keepSupported(m, { milestones: { days: 60 } });
    expect(kept.planters).toEqual({ rooted: T0 });
    const short = keepSupported(m, { milestones: { days: 30 } }); // Rooted · 60 can't be backed by 30 days
    expect(short.earned['rooted:60']).toBeUndefined();
    expect(short.planters).toEqual({});
  });
});

describe('an edited backup, end to end', () => {
  const file = (milestones: Record<string, unknown>, cp: Record<string, unknown> = {}): string =>
    JSON.stringify({
      app: 'aurivan',
      schema: 1,
      appVersion: '1.10.0',
      exportedAt: '',
      stores: {
        settings: { version: 1, state: { onboarded: true, activeCertId: 'cisa', badgesHidden: true } },
        progress: {
          version: 2,
          state: {
            byCert: { cisa: { answers: Object.fromEntries(ids('4', 25).map((id) => [id, { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: T0 }])), mocks: [], ...cp, milestones } },
            streak: { current: 0, best: 0, lastDay: null },
            today: { day: '', answered: 0 },
          },
        },
      },
    });

  it('claims a higher tier on a lower tier’s data: dropped; the genuine marks stay', () => {
    const data = readBackup(
      file({
        earned: { 'firm-footing:4': T0, 'firm-footing:4:80': T0, 'long-memory': T0, 'long-memory:75': T0 },
        counts: { longRecall: 25 },
        planters: { evergreen: T0, made_up: T0 },
      }),
      ['cisa'],
    );
    const m = data.progress.byCert.cisa.milestones!;
    expect(Object.keys(m.earned).sort()).toEqual(['firm-footing:4', 'long-memory']);
    expect(m.planters).toEqual({});
    expect(data.settings.badgesHidden).toBe(true);
  });

  it('a planter that is not a time is refused like any damaged field', () => {
    expect(() => readBackup(file({ earned: {}, planters: { rooted: 'soon' } }), ['cisa'])).toThrow();
  });
});
