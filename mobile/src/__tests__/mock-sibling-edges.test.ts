/**
 * Awkward banks for the mock's sibling rule (engine/siblings.ts
 * groupsForShortDomains and oneOfEachGroup, used by engine/blueprint.ts
 * buildMockExam). mock-sibling-scarce.test.ts proves the rule on tidy banks;
 * this file tries to break the whole draw.
 *
 * Plain English: whatever the bank looks like (a section with no questions,
 * a mock longer than the bank, groups spread over every section, the same
 * question listed twice), a mock must still
 *   - hold at most one question of each sibling group,
 *   - be as long as asked, or as long as the bank allows,
 *   - be the same mock again for the same seed,
 *   - and never crash or hang.
 *
 * The fixtures are made up, with one CISA question as the template for the
 * fields the draw does not read.
 */
import { getCertification } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import type { Certification, Difficulty, PackQuestion } from '../content/types';
import { buildMockExam } from '../engine/blueprint';
import { createRng } from '../engine/random';
import { groupsForShortDomains, oneOfEachGroup } from '../engine/siblings';

const cisa = getCertification('cisa')!;
const template = getAllQuestions('cisa')[0];
const TIERS: Difficulty[] = ['analysis', 'application', 'foundational'];

/** A made-up course: one domain per weight, ids "1", "2" … */
function course(weights: number[]): Certification {
  return { ...cisa, domains: weights.map((weight, i) => ({ ...cisa.domains[0], id: String(i + 1), weight })) };
}
let n = 0;
/** One made-up question in a domain, with or without a sibling group. */
function q(id: string, domainId: string, siblingGroup?: string): PackQuestion {
  return { ...template, id, domainId, difficulty: TIERS[n++ % 3], ...(siblingGroup ? { siblingGroup } : {}) };
}
/** `count` questions with no group in a domain: "a1", "a2" … */
function plain(prefix: string, domainId: string, count: number): PackQuestion[] {
  return Array.from({ length: count }, (_, i) => q(`${prefix}${i + 1}`, domainId));
}
/** The most a mock can hold: every question with no group, plus one per group. */
function room(pool: PackQuestion[]): number {
  return new Set(pool.map((x) => (x.siblingGroup === undefined ? `q:${x.id}` : `g:${x.siblingGroup}`))).size;
}
/** What is wrong with this mock, in words (an empty list when nothing is). */
function wrong(pool: PackQuestion[], ids: string[], total: number): string[] {
  const byId = new Map(pool.map((x) => [x.id, x]));
  const out: string[] = [];
  if (new Set(ids).size !== ids.length) out.push('a question twice');
  if (ids.some((id) => !byId.has(id))) out.push('a question from outside the pool');
  const groups = ids.map((id) => byId.get(id)?.siblingGroup).filter((g): g is string => g !== undefined);
  if (new Set(groups).size !== groups.length) out.push('two questions of one sibling group');
  const want = Math.min(total, room(pool));
  if (ids.length !== want) out.push(`${ids.length} questions, not ${want}`);
  return out;
}

// Targets 4 / 3 / 3 for a 10-question mock; group X spans all three domains, group Y sits in domain 3.
const cert = course([40, 30, 30]);
const bank = [
  ...plain('a', '1', 8),
  q('ax', '1', 'X'),
  ...plain('b', '2', 5),
  q('bx', '2', 'X'),
  q('c1', '3'),
  q('cx', '3', 'X'),
  q('cy1', '3', 'Y'),
  q('cy2', '3', 'Y'),
];
const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);

describe('a mock from an awkward bank with sibling groups across domains', () => {
  it('600 made-up banks: one per group, as long as the bank allows, the same mock for the same seed', () => {
    const rng = createRng(20261128);
    const pick = (k: number) => Math.floor(rng() * k);
    let given = 0;
    for (let b = 0; b < 600; b++) {
      const domains = 2 + pick(4);
      // Some domains carry no weight (a target of 0); never all of them.
      const weights = Array.from({ length: domains }, (_, i) => (i > 0 && pick(8) === 0 ? 0 : 1 + pick(40)));
      const made = course(weights);
      // Sometimes one domain has no question at all, and sometimes the bank holds a domain the course does not list.
      const empty = pick(4) === 0 ? String(1 + pick(domains)) : null;
      const pool: PackQuestion[] = [];
      const size = pick(50);
      for (let i = 0; i < size; i++) {
        const domainId = String(1 + pick(domains + (pick(10) === 0 ? 1 : 0)));
        if (domainId === empty) continue;
        const kind = pick(4); // 0 and 1: alone; 2: a group of its own domain; 3: a group shared by any domain
        pool.push(q(`r${b}_${i}`, domainId, kind < 2 ? undefined : kind === 2 ? `in${domainId}_${pick(3)}` : `across_${pick(8)}`));
      }
      const fits = room(pool);
      // A mock of nothing, of one, of part of the bank, of all of it, and of more than it holds.
      for (const total of [0, 1, 1 + pick(Math.max(1, fits)), fits, fits + 1 + pick(20)]) {
        for (const seed of [1, 2, 3]) {
          const ids = buildMockExam(made, pool, createRng(seed), total);
          expect(wrong(pool, ids, total)).toEqual([]);
          expect(buildMockExam(made, pool, createRng(seed), total)).toEqual(ids);
        }
      }
      given += groupsForShortDomains(pool, new Map(made.domains.map((d) => [d.id, fits]))).size;
    }
    // The banks really do have groups for a short domain to take.
    expect(given).toBeGreaterThan(600);
  });

  it('a mock longer than the bank: every question the bank can give, once', () => {
    for (const seed of SEEDS) {
      const ids = buildMockExam(cert, bank, createRng(seed), 40);
      expect(wrong(bank, ids, 40)).toEqual([]);
      expect(ids).toHaveLength(16);
    }
  });

  it('a domain with no question at all: the mock is still full, topped up from the others', () => {
    const pool = [...plain('a', '1', 8), q('ax', '1', 'X'), q('c1', '3'), q('c2', '3'), q('cx', '3', 'X')];
    // Domain 3 is one short without group X; domain 2 is short too but no group has a member in it.
    expect([...groupsForShortDomains(pool, new Map([['1', 4], ['2', 3], ['3', 3]]))]).toEqual([['X', '3']]);
    for (const seed of SEEDS) {
      const ids = buildMockExam(cert, pool, createRng(seed), 10);
      expect(wrong(pool, ids, 10)).toEqual([]);
      expect(ids).toContain('cx');
    }
  });

  it('every domain a group touches is short: it goes to the one that needs most, and nothing is lost', () => {
    const pool = [q('a1', '1'), q('ax', '1', 'X'), q('b1', '2'), q('bx', '2', 'X'), q('c1', '3'), q('cx', '3', 'X')];
    for (const seed of SEEDS) {
      const ids = buildMockExam(cert, pool, createRng(seed), 10);
      expect(wrong(pool, ids, 10)).toEqual([]);
      expect([...ids].sort()).toEqual(['a1', 'ax', 'b1', 'c1']);
    }
  });

  it('a group left with one question (its siblings were taken out before the draw) is simply kept', () => {
    const pool = bank.filter((x) => x.id !== 'ax' && x.id !== 'bx');
    expect(groupsForShortDomains(pool, new Map([['1', 4], ['2', 3], ['3', 3]])).size).toBe(0);
    for (const seed of SEEDS) {
      const kept = oneOfEachGroup(pool, createRng(seed), new Map([['1', 4], ['2', 3], ['3', 3]]));
      expect(kept.map((x) => x.id)).toContain('cx');
      expect(wrong(pool, buildMockExam(cert, pool, createRng(seed), 10), 10)).toEqual([]);
    }
  });

  it('the same question listed twice in the bank is dealt once', () => {
    const twice = [...bank, { ...bank.find((x) => x.id === 'cx')! }, { ...bank[0] }];
    for (const seed of SEEDS) {
      const ids = buildMockExam(cert, twice, createRng(seed), 10);
      expect(ids).toHaveLength(10);
      expect(new Set(ids).size).toBe(10);
      expect(ids.filter((id) => ['ax', 'bx', 'cx'].includes(id))).toHaveLength(1);
    }
  });
});

describe('odd targets never crash or hang the rule', () => {
  const cases: [string, Map<string, number>, [string, string][]][] = [
    ['no target at all', new Map(), []],
    ['a domain of the bank is missing from the targets', new Map([['1', 4], ['2', 3]]), []],
    ['a target of 0 everywhere', new Map([['1', 0], ['2', 0], ['3', 0]]), []],
    ['targets below zero', new Map([['1', -5], ['2', -1], ['3', -2]]), []],
    ['a domain the bank does not have', new Map([['7', 5], ['3', 3]]), [['X', '3']]],
    ['targets far above the bank', new Map([['1', 1e9], ['2', 1e9], ['3', 1e9]]), [['X', '3']]],
    ['targets that are not whole numbers', new Map([['1', 4.5], ['2', 2.5], ['3', 3.2]]), [['X', '3']]],
    ['targets without end', new Map([['1', Infinity], ['2', Infinity], ['3', Infinity]]), [['X', '1']]],
  ];
  it.each(cases)('%s', (_label, targets, given) => {
    expect([...groupsForShortDomains(bank, targets)]).toEqual(given);
    const kept = oneOfEachGroup(bank, createRng(1), targets);
    // One question per group whatever the targets: 14 alone, one of X, one of Y.
    expect(kept).toHaveLength(16);
    expect(new Set(kept.map((x) => x.siblingGroup ?? x.id)).size).toBe(16);
  });

  it('a target that is not a number still ends, with one question per group', () => {
    const targets = new Map([['1', NaN], ['2', NaN], ['3', NaN]]);
    expect(groupsForShortDomains(bank, targets).size).toBeLessThanOrEqual(1);
    expect(oneOfEachGroup(bank, createRng(1), targets)).toHaveLength(16);
  });

  it('a group can be given only once, so a huge bank of groups ends after one pass each', () => {
    // 1,500 groups over three domains, every domain far short: each group is given exactly once.
    const big = Array.from({ length: 1500 }, (_, i) => [q(`p${i}`, '1', `G${i}`), q(`s${i}`, '2', `G${i}`), q(`t${i}`, '3', `G${i}`)]).flat();
    const given = groupsForShortDomains(big, new Map([['1', 1e6], ['2', 1e6], ['3', 1e6]]));
    expect(given.size).toBe(1500);
    const ids = buildMockExam(cert, big, createRng(3), 1500);
    expect(wrong(big, ids, 1500)).toEqual([]);
  });
});
