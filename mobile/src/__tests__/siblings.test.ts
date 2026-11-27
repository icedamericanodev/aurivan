/**
 * Sibling groups (docs/content/CIA_BANK_PLAN.md section 11, item 5).
 *
 * Plain English: questions that teach the same lesson in nearly the same way
 * share a `siblingGroup`. A mock never holds two of one group; practice,
 * review, daily and game sets keep them apart, and relax that only when the
 * set would otherwise be empty or short of its normal size. A relaxed
 * sibling's answer is marked (`lastSibling`). A course with no groups (every
 * live course, CISA included) is drawn exactly as before.
 *
 * The fixtures are neutral: CISA's own questions with made-up groups, and
 * made-up pack ids ("p1_001") for the pack builder.
 */
import fs from 'fs';
import path from 'path';
import { getCertification } from '../content/certifications';
import { getAllQuestions, siblingGroupOf } from '../content/loader';
import type { PackQuestion } from '../content/types';
import { buildMockExam } from '../engine/blueprint';
import { buildDaylightRound } from '../engine/games/daylight';
import { buildTrapRound } from '../engine/games/trapSpotter';
import { buildPriorityRound } from '../engine/games/priorityLens';
import { certOutline } from '../lib/outline';
import { createRng } from '../engine/random';
import { isRelaxedSibling, oneOfEachGroup, relaxedMark, spreadSiblings, takeApart, type GroupOf } from '../engine/siblings';
import { startFromIds, startMock, startPractice, startReview } from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { readSiblingGroups, tagPack } = require('../../scripts/siblings-pack.cjs');

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));

/** A group lookup from a plain map. */
const groups = (m: Record<string, string>): GroupOf => (id) => m[id];
/** True when no two ids in the list share a group. */
const apart = (ids: readonly string[], groupOf: GroupOf) => {
  const g = ids.map(groupOf).filter((x): x is string => x !== undefined);
  return new Set(g).size === g.length;
};

describe('engine: spreadSiblings', () => {
  it('no group: the very same array comes back (and spares are never read)', () => {
    const ids = ['a', 'b', 'c'];
    const spares = jest.fn(() => ['d']);
    expect(spreadSiblings(ids, groups({}), spares)).toBe(ids);
    expect(spares).not.toHaveBeenCalled();
  });

  it('siblings already apart: the very same array', () => {
    const ids = ['a', 'b', 'c'];
    expect(spreadSiblings(ids, groups({ a: 'g1', c: 'g2' }))).toBe(ids);
  });

  it('a second sibling gives its place to a spare: same size, no two siblings', () => {
    const g = groups({ a: 'g', c: 'g', e: 'g' });
    const out = spreadSiblings(['a', 'b', 'c', 'd'], g, () => ['a', 'e', 'f', 'h']);
    // "a" is already in, "e" is a sibling too: "f" fills the place.
    expect(out).toEqual(['a', 'b', 'd', 'f']);
    expect(apart(out, g)).toBe(true);
    expect(out.some((id) => isRelaxedSibling(out, id, g))).toBe(false);
  });

  it('relaxes ONLY when it must: with no spare, the sibling comes back at the end, after its partner', () => {
    const g = groups({ a: 'g', b: 'g' });
    const out = spreadSiblings(['a', 'b', 'c'], g, () => []);
    expect(out).toEqual(['a', 'c', 'b']);
    expect(isRelaxedSibling(out, 'b', g)).toBe(true);
    expect(isRelaxedSibling(out, 'a', g)).toBe(false);
    expect(isRelaxedSibling(out, 'c', g)).toBe(false);
    expect(relaxedMark(out, 'b', g)).toEqual({ sibling: true });
    expect(relaxedMark(out, 'c', g)).toEqual({});
  });

  it('a set of siblings only is never left empty or short', () => {
    const g = groups({ a: 'g', b: 'g' });
    expect(spreadSiblings(['a', 'b'], g)).toEqual(['a', 'b']);
    // One spare: it takes the place, so nothing is relaxed.
    expect(spreadSiblings(['a', 'b'], g, () => ['x'])).toEqual(['a', 'x']);
  });

  it('takeApart is exactly a cut without a group lookup', () => {
    expect(takeApart(['a', 'b', 'c', 'd'], 2)).toEqual(['a', 'b']);
    expect(takeApart(['a', 'b', 'c', 'd'], 2, groups({ a: 'g', b: 'g' }))).toEqual(['a', 'c']);
  });
});

describe('engine: a mock never holds two siblings', () => {
  const cisa = getCertification('cisa')!;
  const bank = getAllQuestions('cisa');

  it('oneOfEachGroup with no group: the same pool, and no random number used', () => {
    const a = createRng(7);
    const b = createRng(7);
    expect(oneOfEachGroup(bank, a)).toBe(bank);
    expect(a()).toBe(b());
  });

  it('full and mini mocks: at most one question per group, at full length', () => {
    // Every pair of neighbouring questions becomes a sibling group (a made-up course).
    const grouped: PackQuestion[] = bank.map((q, i) => ({ ...q, siblingGroup: `g${Math.floor(i / 2)}` }));
    const groupOf: GroupOf = (id) => grouped.find((q) => q.id === id)?.siblingGroup;
    for (const seed of [1, 2, 3]) {
      for (const total of [cisa.exam.questions, 50]) {
        const ids = buildMockExam(cisa, grouped, createRng(seed), total, certOutline('cisa').topics);
        expect(ids).toHaveLength(total);
        expect(apart(ids, groupOf)).toBe(true);
      }
    }
  });

  it('no group: the draw is the same as before (same seed, same paper)', () => {
    const copy = bank.map((q) => ({ ...q }));
    expect(buildMockExam(cisa, copy, createRng(5), 150)).toEqual(buildMockExam(cisa, bank, createRng(5), 150));
  });
});

describe('sessions: practice, review, mocks and sets of chosen questions', () => {
  // Pretend some CISA questions are siblings. (The loader's question objects
  // are shared inside this test file only; they are put back afterwards.)
  const bank = getAllQuestions('cisa');
  const d1 = bank.filter((q) => q.domainId === '1');
  const pairs = d1.slice(0, 40);
  beforeAll(() => {
    pairs.forEach((q, i) => (q.siblingGroup = `g${Math.floor(i / 2)}`));
  });
  afterAll(() => {
    for (const q of pairs) delete q.siblingGroup;
  });
  beforeEach(() => {
    useProgress.getState().resetCert('cisa');
    useSession.getState().clear();
    useSettings.setState({ onboarded: true, activeCertId: 'cisa', shuffleOptions: true });
  });
  const groupOf = siblingGroupOf('cisa');

  it('a practice set keeps siblings apart and stays full size when the pool allows', () => {
    for (let k = 0; k < 5; k++) {
      // Only the 40 grouped questions plus 10 others: two siblings are very likely in a 20-question set.
      const s = startPractice('cisa', { count: 20, ids: [...pairs, ...d1.slice(40, 50)].map((q) => q.id) })!;
      expect(s.questionIds).toHaveLength(20);
      expect(apart(s.questionIds, groupOf)).toBe(true);
    }
  });

  it('a practice set relaxes only when it must: a sibling comes back last, and its answer is marked', () => {
    // Three questions, two of them siblings, three asked for: the set cannot be full without both.
    const [a, b] = pairs;
    const c = d1[45];
    const s = startPractice('cisa', { count: 3, ids: [a.id, b.id, c.id] })!;
    expect(s.questionIds).toHaveLength(3);
    const last = s.questionIds[2];
    expect([a.id, b.id]).toContain(last);
    expect(isRelaxedSibling(s.questionIds, last, groupOf)).toBe(true);
    expect(s.questionIds.filter((id) => isRelaxedSibling(s.questionIds, id, groupOf))).toEqual([last]);
    // Two asked for: no need to relax, so the two are never together.
    const two = startPractice('cisa', { count: 2, ids: [a.id, b.id, c.id] })!;
    expect(two.questionIds).toHaveLength(2);
    expect(apart(two.questionIds, groupOf)).toBe(true);
  });

  it('a chosen list (saved, missed) keeps every question; a sibling moves after its partner', () => {
    const [a, b] = pairs;
    const c = d1[45];
    const s = startFromIds('cisa', [a.id, b.id, c.id], 'Saved questions')!;
    expect(s.questionIds).toEqual([a.id, c.id, b.id]);
  });

  it('a review fills a sibling’s place from the next due question', () => {
    const now = Date.now();
    const review = Object.fromEntries(
      [pairs[0], pairs[1], d1[45], d1[46]].map((q, i) => [q.id, { box: 1, dueAt: now - 10_000 + i, lastSeen: now - 86_400_000, reps: 1 }]),
    );
    useProgress.setState((st) => ({ byCert: { ...st.byCert, cisa: { ...selectCert(st, 'cisa'), review } } }));
    const s = startReview('cisa', 3)!;
    expect(s.questionIds).toEqual([pairs[0].id, d1[45].id, d1[46].id]);
  });

  it('a full mock from the app holds no two siblings', () => {
    const s = startMock('cisa')!;
    expect(s.questionIds).toHaveLength(150);
    expect(apart(s.questionIds, groupOf)).toBe(true);
  });

  it('the answer record marks a relaxed sibling, and the next answer drops the mark', () => {
    const id = pairs[1].id;
    useProgress.getState().recordAnswer('cisa', id, true, undefined, { sibling: true });
    expect(selectCert(useProgress.getState(), 'cisa').answers[id].lastSibling).toBe(true);
    useProgress.getState().recordAnswer('cisa', id, true);
    expect(selectCert(useProgress.getState(), 'cisa').answers[id]).not.toHaveProperty('lastSibling');
  });
});

describe('no group, no change', () => {
  beforeEach(() => {
    useProgress.getState().resetCert('cisa');
    useSession.getState().clear();
    useSettings.setState({ onboarded: true, activeCertId: 'cisa', shuffleOptions: true });
  });

  it('CISA has no sibling group anywhere in its pack', () => {
    expect(getAllQuestions('cisa').some((q) => q.siblingGroup !== undefined)).toBe(false);
  });

  it('a practice set is the same first questions as the old cut of the queue', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    try {
      const s = startPractice('cisa', { count: 10 })!;
      // The old code: buildPracticeQueue(pool, answers, 10, createRng(now)). The same seed, the same first ten.
      const { buildPracticeQueue } = jest.requireActual('../engine/queue');
      expect(s.questionIds).toEqual(buildPracticeQueue(getAllQuestions('cisa'), {}, 10, createRng(1_800_000_000_000)));
    } finally {
      jest.restoreAllMocks();
    }
  });

  it('game rounds are the same with or without a group lookup', () => {
    const bank = getAllQuestions('cisa');
    const g = siblingGroupOf('cisa');
    expect(buildDaylightRound(bank, createRng(3), 10, g)).toEqual(buildDaylightRound(bank, createRng(3), 10));
    expect(buildTrapRound(bank, createRng(3), 5, g)).toEqual(buildTrapRound(bank, createRng(3), 5));
    expect(buildPriorityRound(bank, createRng(3), 5, g)).toEqual(buildPriorityRound(bank, createRng(3), 5));
  });

  it('game rounds keep siblings apart when there are groups', () => {
    const bank = getAllQuestions('cisa');
    const grouped = bank.map((q, i) => ({ ...q, siblingGroup: `g${i % 3}` }));
    const g: GroupOf = (id) => grouped.find((q) => q.id === id)?.siblingGroup;
    // Only three groups: a 10-question round must relax, but never more than it needs.
    const round = buildDaylightRound(grouped, createRng(3), 10, g);
    expect(round).toHaveLength(10);
    expect(apart(round.slice(0, 3), g)).toBe(true);
    expect(round.filter((id) => isRelaxedSibling(round, id, g))).toHaveLength(7);
    expect(apart(buildTrapRound(grouped, createRng(3), 3, g), g)).toBe(true);
  });
});

describe('pack builder: siblings-pack.cjs', () => {
  type Q = { id: string; retired?: boolean; siblingGroup?: string };
  const pack = (): Q[] => ['p1_001', 'p1_002', 'p1_003', 'p1_004', 'p1_005'].map((id) => ({ id }));
  const known = new Set(['p1_001', 'p1_002', 'p1_003', 'p1_004', 'p1_005', 'p2_001', 'p2_002']);

  it('tags a question only when its group has another question of the same pack; the id is the sorted first id', () => {
    const raw = { _meta: {}, groups: [{ ids: ['p2_001', 'p1_002', 'p1_001'], lesson: 'one' }, { ids: ['p1_003', 'p2_002'], lesson: 'two' }] };
    const r = readSiblingGroups(raw, { knownIds: known });
    expect(r.problems).toEqual([]);
    expect(r.warnings).toEqual([]);
    const qs = pack();
    const t = tagPack(r.groups, qs);
    expect(qs.map((q) => q.siblingGroup)).toEqual(['p1_001', 'p1_001', undefined, undefined, undefined]);
    expect(t).toEqual({ tagged: 2, groups: 1, joined: 0, warnings: [] });
    // In the other pack the same group carries the same id.
    const other: Q[] = [{ id: 'p2_001' }, { id: 'p2_002' }];
    tagPack(r.groups, other);
    expect(other.map((q) => q.siblingGroup)).toEqual([undefined, undefined]);
  });

  it('reports an unknown id and a retired id, and still builds', () => {
    const r = readSiblingGroups({ groups: [{ ids: ['p1_001', 'p1_002', 'zz_404'] }, { ids: ['p1_003', 'p1_004'] }] }, { knownIds: known });
    expect(r.problems).toEqual([]);
    expect(r.warnings).toEqual(['group 1: zz_404 is not a question of this course']);
    const qs = pack();
    qs[3].retired = true;
    const t = tagPack(r.groups, qs);
    expect(t.warnings).toEqual(['p1_004 is retired: left out of its sibling group']);
    // The retired question leaves p1_003 with no sibling in the pack: no tag.
    expect(qs.map((q) => q.siblingGroup)).toEqual(['p1_001', 'p1_001', undefined, undefined, undefined]);
  });

  it.each([
    ['not an object', [], 'the siblings file must be an object with a "groups" list'],
    ['no groups list', { _meta: {} }, 'the siblings file has no "groups" list'],
    ['a group that is not an object', { groups: ['p1_001'] }, 'group 1 is not an object'],
    ['ids that are not a list of ids', { groups: [{ ids: 'p1_001,p1_002' }] }, 'group 1: "ids" must be a list of question ids'],
    ['a group of one', { groups: [{ ids: ['p1_001'] }] }, 'group 1: a group needs 2 or more different ids'],
    ['a lesson that is not text', { groups: [{ ids: ['p1_001', 'p1_002'], lesson: 3 }] }, 'group 1: "lesson" must be text'],
  ])('a malformed file fails the build: %s', (_name, raw, problem) => {
    expect(readSiblingGroups(raw).problems).toContain(problem);
  });

  it('groups that share a question in this pack are joined into one (a question has one group)', () => {
    const r = readSiblingGroups({ groups: [{ ids: ['p1_004', 'p1_002'] }, { ids: ['p1_002', 'p1_003'] }, { ids: ['p1_005', 'p2_001'] }] });
    expect(r.problems).toEqual([]);
    const qs = pack();
    expect(tagPack(r.groups, qs)).toEqual({ tagged: 3, groups: 1, joined: 1, warnings: [] });
    expect(qs.map((q) => q.siblingGroup)).toEqual([undefined, 'p1_002', 'p1_002', 'p1_002', undefined]);
  });

  it('a question shared only through ANOTHER pack does not join two groups here', () => {
    const r = readSiblingGroups({ groups: [{ ids: ['p1_001', 'p1_002', 'p2_001'] }, { ids: ['p2_001', 'p1_003', 'p1_004'] }] });
    const qs = pack();
    expect(tagPack(r.groups, qs).groups).toBe(2);
    expect(qs.map((q) => q.siblingGroup)).toEqual(['p1_001', 'p1_001', 'p1_003', 'p1_003', undefined]);
  });

  it('a pack of copies under new ids reads the groups through its id map', () => {
    const r = readSiblingGroups({ groups: [{ ids: ['p1_001', 'p2_001'] }] });
    const copies: Q[] = [{ id: 'pc_001' }, { id: 'pc_002' }, { id: 'pc_003' }];
    const aliases = new Map([
      ['p1_001', 'pc_001'],
      ['p2_001', 'pc_003'],
    ]);
    tagPack(r.groups, copies, { aliases });
    expect(copies.map((q) => q.siblingGroup)).toEqual(['pc_001', undefined, 'pc_001']);
  });

  it('no file: no groups and no problem', () => {
    expect(readSiblingGroups(null)).toEqual({ groups: [], problems: [], warnings: [] });
  });

  it('the app build reads no siblings file for CISA (its pack stays byte-identical)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'build-content.mjs'), 'utf8');
    const cisaEntry = src.slice(src.indexOf("certId: 'cisa'"), src.indexOf('];', src.indexOf("certId: 'cisa'")));
    expect(cisaEntry).not.toMatch(/\bsiblings:/);
  });
});
