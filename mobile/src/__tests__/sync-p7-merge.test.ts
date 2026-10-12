/**
 * Phase 7 review fixes in the pure sync engine (FIXES_P7.md), each with the
 * repro that failed on e4eb12d:
 * - CR B4: a merge whose mocks pass the 50 cap never removes an earned Dress
 *   Rehearsal tier (a backup FILE still reads exactly as before);
 * - CR N9 (lead decision): two different plants never cost the learner a
 *   re-plant or growth; the first Combine keeps the more grown one; the rule
 *   stays commutative and associative;
 * - CR N10: a "passed on" day from a wrong clock is pulled back;
 * - SEC N2: a snapshot claiming an app no update reaches is unreadable, not
 *   "update the app"; CR N7: a rev plus its write time identifies a write;
 * - SEC S2: a settings copy over 64 KB is never applied.
 */
import { CERTIFICATIONS } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import { BackupError, buildBackup, readBackup } from '../engine/backup';
import { holdsStudy, MAX_SETTINGS_BYTES, mergeSides, progressIsEmpty, readSnapshot, stableStringify, type Side, type SyncedProgress } from '../engine/syncMerge';
import { plan, type PlanInput } from '../engine/syncPlan';
import { dayKey } from '../engine/streak';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
const CERT_IDS = CERTIFICATIONS.map((c) => c.id);
const DAY = 86_400_000;
const T0 = new Date(2026, 9, 12, 9).getTime();
const ctx = { now: T0, knownCertIds: CERT_IDS };
const qs = getAllQuestions('cisa');
const byDom = new Map<string, string[]>();
for (const q of qs) byDom.set(q.id.split('_')[0], [...(byDom.get(q.id.split('_')[0]) ?? []), q.id]);
const answers = Object.fromEntries([...byDom.values()].flatMap((l) => l.slice(0, 45)).map((id) => [id, { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: T0 - 200 * DAY }]));
const full = (i: number, at: number) => ({ id: `full-${i}`, finishedAt: at, total: 150, correct: 110, minutesUsed: 200, byDomain: {}, timing: 'standard' as const, unanswered: 0 });
const short = (i: number, at: number) => ({ id: `short-${i}`, finishedAt: at, total: 20, correct: 15, minutesUsed: 20, byDomain: {} });
const canon = (x: unknown) => stableStringify(x);

describe('CR-P7 merge repros', () => {
  it('B4: an earned Dress Rehearsal tier survives a merge whose mocks pass the 50 cap', () => {
    const earned = { 'whole-map': T0 - 150 * DAY, 'dress-rehearsal': T0 - 150 * DAY, 'dress-rehearsal:2': T0 - 143 * DAY, 'dress-rehearsal:3': T0 - 136 * DAY };
    const A = { byCert: { cisa: { answers, mocks: [full(1, T0 - 150 * DAY), full(2, T0 - 143 * DAY), full(3, T0 - 136 * DAY)], milestones: { earned } } }, streak: { current: 0, best: 3, lastDay: null } } as unknown as SyncedProgress;
    const B = { byCert: { cisa: { answers, mocks: Array.from({ length: 50 }, (_, i) => short(i, T0 - i * DAY)), milestones: { earned: { 'whole-map': T0 - 150 * DAY } } } }, streak: { current: 0, best: 3, lastDay: null } } as unknown as SyncedProgress;
    const a = mergeSides('progress', { state: A, stamps: {} }, null, ctx);
    expect(Object.keys(a.state.byCert.cisa.milestones!.earned).sort()).toEqual(Object.keys(earned).sort());
    const m = mergeSides('progress', { state: A, stamps: {} }, { state: B, stamps: {} }, ctx);
    expect(Object.keys(m.state.byCert.cisa.milestones!.earned).sort()).toEqual(Object.keys(earned).sort());
    // Either order, and once more with B (a merge is absorbing): the same.
    expect(canon(mergeSides('progress', { state: B, stamps: {} }, { state: A, stamps: {} }, ctx))).toBe(canon(m));
    expect(canon(mergeSides('progress', m, { state: B, stamps: {} }, ctx))).toBe(canon(m));
  });

  it('B4: a phone whose own chain scrolled out of its 50 mocks keeps its tiers when it syncs', () => {
    const earned = { 'whole-map': T0 - 150 * DAY, 'dress-rehearsal': T0 - 150 * DAY, 'dress-rehearsal:2': T0 - 143 * DAY };
    const P = { byCert: { cisa: { answers, mocks: Array.from({ length: 50 }, (_, i) => short(i, T0 - i * DAY)), milestones: { earned } } }, streak: { current: 0, best: 3, lastDay: null } } as unknown as SyncedProgress;
    expect(Object.keys(mergeSides('progress', { state: P, stamps: {} }, null, ctx).state.byCert.cisa.milestones!.earned).sort()).toEqual(Object.keys(earned).sort());
  });

  it('B4: a backup FILE is checked exactly as before (flag OFF unchanged): an unsupported tier is still dropped', () => {
    const earned = { 'whole-map': T0 - 150 * DAY, 'dress-rehearsal': T0 - 150 * DAY, 'dress-rehearsal:2': T0 - 143 * DAY };
    const progress = {
      byCert: { cisa: { answers, review: {}, bookmarks: [], mocks: Array.from({ length: 50 }, (_, i) => short(i, T0 - i * DAY)), lessonsDone: [], mistakes: {}, milestones: { earned } } },
      streak: { current: 0, best: 3, lastDay: null },
      today: { day: '', answered: 0 },
      days: {},
    };
    const file = buildBackup({ settings: { onboarded: true, activeCertId: 'cisa', examDates: {}, theme: 'system', shuffleOptions: true, dailyGoal: 20, reminder: { enabled: false, hour: 19, minute: 0 }, haptics: true, gameRulesSeen: [] } as never, progress: progress as never }, { now: T0, appVersion: '1.18.0' });
    const read = readBackup(JSON.stringify(file), CERT_IDS);
    expect(Object.keys(read.progress.byCert.cisa.milestones!.earned).sort()).toEqual(['dress-rehearsal', 'whole-map']);
  });
});

describe('CR-P7 N9: two different plants (lead decision)', () => {
  // 60 answers support a little growth; each side's growth is clamped to what its data supports.
  const some = Object.fromEntries(qs.slice(0, 60).map((q) => [q.id, { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: T0 - DAY }]));
  const plant = (o: Record<string, unknown>) => ({ species: 'oak', name: 'Kai', plantedAt: T0 - 90 * DAY, growth: 1, ...o });
  const side = (p: Record<string, unknown>, a: object = some): Side<SyncedProgress> =>
    mergeSides('progress', { state: { byCert: { cisa: { answers: a, plant: p } }, streak: { current: 0, best: 0, lastDay: null } } as unknown as SyncedProgress, stamps: {} }, null, ctx);
  const grownOld = side(plant({ growth: 3, reached: { sprout: T0 - 80 * DAY, sapling: T0 - 60 * DAY } }), answers);
  const seedlingNew = side(plant({ species: 'lotus', name: 'Hana', plantedAt: T0 - 2 * DAY, growth: 1 }));

  it('the setup: the old plant really grew (its data supports it), the new one is a seedling', () => {
    expect(grownOld.state.byCert.cisa.plant!.growth).toBeGreaterThan(1);
    expect(seedlingNew.state.byCert.cisa.plant!.growth).toBe(1);
  });

  it('every sync keeps the EARLIER plant, at the HIGHER growth: nobody re-plants, nothing grown is lost, either order', () => {
    const ab = mergeSides('progress', grownOld, seedlingNew, ctx);
    const ba = mergeSides('progress', seedlingNew, grownOld, ctx);
    expect(canon(ab)).toBe(canon(ba));
    expect(ab.state.byCert.cisa.plant).toMatchObject({ species: 'oak', name: 'Kai', growth: grownOld.state.byCert.cisa.plant!.growth });
    // An old seedling against a newer grown plant: the earlier one stays, and takes the higher growth.
    const oldSeed = side(plant({ growth: 1 }));
    const newGrown = side(plant({ species: 'lotus', name: 'Hana', plantedAt: T0 - 20 * DAY, growth: 3, reached: { sprout: T0 - 15 * DAY, sapling: T0 - 10 * DAY } }), answers);
    const m = mergeSides('progress', oldSeed, newGrown, ctx).state.byCert.cisa.plant!;
    expect(m).toMatchObject({ species: 'oak', growth: newGrown.state.byCert.cisa.plant!.growth });
  });

  it('the first sync’s Combine keeps the MORE GROWN plant, and the next ordinary sync keeps it', () => {
    const fctx = { ...ctx, firstSync: true };
    const oldSeed = side(plant({ growth: 1 }));
    const newGrown = side(plant({ species: 'lotus', name: 'Hana', plantedAt: T0 - 20 * DAY, growth: 3, reached: { sprout: T0 - 15 * DAY, sapling: T0 - 10 * DAY } }), answers);
    const first = mergeSides('progress', oldSeed, newGrown, fctx);
    expect(canon(first)).toBe(canon(mergeSides('progress', newGrown, oldSeed, fctx)));
    expect(first.state.byCert.cisa.plant).toMatchObject({ species: 'lotus', name: 'Hana' });
    expect(first.stamps['plantId.cisa']).toBe(T0);
    // A phone that still holds the old (earlier) oak syncs as usual afterwards, either order: the lotus stays.
    expect(mergeSides('progress', oldSeed, first, ctx).state.byCert.cisa.plant).toMatchObject({ species: 'lotus', name: 'Hana' });
    expect(canon(mergeSides('progress', first, oldSeed, ctx))).toBe(canon(mergeSides('progress', oldSeed, first, ctx)));
    // Without two different plants nothing is stamped.
    expect(mergeSides('progress', newGrown, newGrown, fctx).stamps['plantId.cisa']).toBeUndefined();
  });

  // Some sides carry a first-sync choice stamp (it travels with its plant).
  const stamped = (at: number | undefined, x: Side<SyncedProgress>): Side<SyncedProgress> => (at === undefined ? x : { ...x, stamps: { ...x.stamps, 'plantId.cisa': at } });

  it('associative over many triples of different plants (identity keys and their own stamp only)', () => {
    const species = ['oak', 'lotus', 'maple'];
    for (let i = 0; i < 60; i++) {
      const mk = (k: number) =>
        stamped(
          (i + k) % 5 === 0 ? T0 - k * DAY : undefined,
          side(
          plant({ species: species[(i + k) % 3], name: ['Kai', 'Hana', 'Ledger'][(i * k) % 3], plantedAt: T0 - ((i * 7 + k * 13) % 40) * DAY, growth: 1 + ((i + k) % 3), ...((i + k) % 4 === 0 ? { replantedAt: T0 - k * DAY } : {}) }),
            (i + k) % 2 ? answers : some,
          ),
        );
      const [a, b, c] = [mk(1), mk(2), mk(3)];
      const left = mergeSides('progress', mergeSides('progress', a, b, ctx), c, ctx);
      const right = mergeSides('progress', a, mergeSides('progress', b, c, ctx), ctx);
      expect(`${i}: ${canon(left)}`).toBe(`${i}: ${canon(right)}`);
    }
  });
});

describe('CR-P7 N10, SEC N2, CR N7, SEC S2', () => {
  it('N10: a "passed on" day from a wrong clock is pulled back to today', () => {
    const future = dayKey(T0 + 400 * DAY);
    const p = { byCert: { cisa: { answers, plant: { species: 'oak', plantedAt: T0 - 90 * DAY, growth: 1, passedOn: future } } }, streak: { current: 0, best: 0, lastDay: null } } as unknown as SyncedProgress;
    const m = mergeSides('progress', { state: p, stamps: {} }, null, ctx);
    expect(m.state.byCert.cisa.plant!.passedOn ?? null).not.toBe(future);
  });

  const base: PlanInput = { head: { rev: 4, appVersion: '1.18.0', updatedAt: T0 }, meta: { lastRev: 4, lastPushedHash: 'h1', lastAt: T0 }, setUp: true, switchPending: false, localHash: 'h1', localEmpty: false, thisApp: '1.18.0' };
  const p = (o: Partial<PlanInput>) => plan({ ...base, ...o });

  it('SEC N2: an app version no update reaches pauses as unreadable; the next major is still "update the app"', () => {
    expect(p({ head: { rev: 5, appVersion: '999.0.0' } })).toEqual({ kind: 'pause', reason: 'unreadable' });
    expect(p({ head: { rev: 5, appVersion: '3.0.0' } })).toEqual({ kind: 'pause', reason: 'unreadable' });
    expect(p({ head: { rev: 5, appVersion: '2.0.0' } })).toEqual({ kind: 'pause', reason: 'newer' });
  });

  it('N7: the same rev written at another time (deleted and made again elsewhere) is a change, never "unchanged"', () => {
    expect(p({})).toEqual({ kind: 'idle' });
    expect(p({ head: { rev: 4, appVersion: '1.18.0', updatedAt: T0 + 5000 } })).toEqual({ kind: 'pull' });
    expect(p({ head: { rev: 4, appVersion: '1.18.0', updatedAt: T0 + 5000 }, localHash: 'h2' })).toEqual({ kind: 'merge', expectedRev: 4 });
    // An older record with no time: the rev alone decides (as before).
    expect(p({ meta: { lastRev: 4, lastPushedHash: 'h1' }, head: { rev: 4, appVersion: '1.18.0', updatedAt: T0 + 5000 } })).toEqual({ kind: 'idle' });
  });

  it('S2: a settings copy over 64 KB is never applied (unreadable)', () => {
    const big = { activeCertId: 'cisa', examDates: {}, filler: 'x'.repeat(MAX_SETTINGS_BYTES) };
    let code = 'ok';
    try {
      readSnapshot('settings', { state: big, storeVersion: 1, appVersion: '1.18.0' }, { ...ctx, thisApp: '1.18.0' });
    } catch (e) {
      code = e instanceof BackupError ? e.code : 'other';
    }
    expect(code).toBe('too-big');
    expect(() => readSnapshot('settings', { state: { activeCertId: 'cisa' }, storeVersion: 1, appVersion: '1.18.0' }, { ...ctx, thisApp: '1.18.0' })).not.toThrow();
  });
});

describe('CR N8: holdsStudy (a first sync keeps an undo copy unless the phone holds nothing)', () => {
  const empty = { byCert: {}, streak: { current: 0, best: 0, lastDay: null } } as unknown as SyncedProgress;
  const withCert = (cp: object) => ({ ...empty, byCert: { cisa: cp } }) as unknown as SyncedProgress;
  it('a fresh phone holds nothing; answers or a study day count, as before', () => {
    expect(holdsStudy(empty, {})).toBe(false);
    expect(holdsStudy(withCert({ answers }), {})).toBe(true);
    expect(holdsStudy({ ...empty, streak: { current: 1, best: 1, lastDay: '2026-10-11' } } as SyncedProgress, {})).toBe(true);
  });
  it('so do the things progressIsEmpty ignores: a saved question, a note read, a mock, a plant, a report, an exam date', () => {
    const cases = [
      withCert({ bookmarks: ['d1_001'] }),
      withCert({ notesRead: ['1A1.1'] }),
      withCert({ mocks: [short(1, T0)] }),
      withCert({ plant: { species: 'oak', plantedAt: T0, growth: 1 } }),
      withCert({ milestones: { earned: { 'first-foothold': T0 } } }),
      { ...empty, reports: [{ ref: 'R-AAAA', item: 'q:d1_001', reason: 'key', at: T0, cert: 'cisa' }] } as unknown as SyncedProgress,
    ];
    for (const p of cases) {
      expect(progressIsEmpty(p)).toBe(true);
      expect(holdsStudy(p, {})).toBe(true);
    }
    expect(holdsStudy(empty, { examDates: { cisa: '2027-01-15' } })).toBe(true);
    // An empty cert entry (launch bookkeeping) is still nothing.
    expect(holdsStudy(withCert({ answers: {}, milestones: { earned: {} } }), { examDates: {} })).toBe(false);
  });
});
