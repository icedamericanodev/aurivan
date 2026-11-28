/**
 * A sibling group that spans two domains must not leave a small domain short.
 *
 * Plain English: a mock keeps one question of each sibling group. When a
 * group has members in more than one domain and one of those domains has only
 * just enough questions, the kept member must come from THAT domain, or the
 * mock is topped up from elsewhere and drifts off the exam's weights. The rule
 * lives in engine/siblings.ts (groupsForShortDomains, oneOfEachGroup) and is
 * used by engine/blueprint.ts buildMockExam.
 *
 * The fixtures are made up: a three-domain course and a tiny bank, with one
 * CISA question as the template for the fields the draw does not read.
 */
import { getCertification } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import type { Certification, Difficulty, PackQuestion } from '../content/types';
import { allocate, buildMockExam } from '../engine/blueprint';
import { createRng, type Rng } from '../engine/random';
import { groupsForShortDomains, oneOfEachGroup } from '../engine/siblings';

// The same rule in plain JavaScript, for the pack dry run (scripts/cia_pack_dry_run.cjs).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dryRun = require('../../scripts/mock-siblings.cjs') as {
  groupsForShortDomains: (pool: PackQuestion[], targets: Map<string, number>) => Map<string, string>;
  firstOfEachGroup: (pool: PackQuestion[], targets: Map<string, number>) => { pool: PackQuestion[]; given: Map<string, string> };
};

const cisa = getCertification('cisa')!;
const template = getAllQuestions('cisa')[0];
const TIERS: Difficulty[] = ['analysis', 'application', 'foundational'];
const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);
/** A 10-question mock: enough to give each domain a small target. */
const TOTAL = 10;

/** A made-up course of three domains ("1", "2", "3") with these weights. */
function course(weights: [number, number, number]): Certification {
  return { ...cisa, domains: weights.map((weight, i) => ({ ...cisa.domains[i], id: String(i + 1), weight })) };
}
/** Each domain's share of the mock, as buildMockExam works it out. */
function targetsOf(cert: Certification): Map<string, number> {
  const t = allocate(TOTAL, cert.domains.map((d) => d.weight));
  return new Map(cert.domains.map((d, i) => [d.id, t[i]]));
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
/** How many of these ids sit in each domain, in the course's domain order. */
function perDomain(cert: Certification, pool: PackQuestion[], ids: string[]): number[] {
  const domainOf = new Map(pool.map((x) => [x.id, x.domainId]));
  return cert.domains.map((d) => ids.filter((id) => domainOf.get(id) === d.id).length);
}
/** True when no two of these ids share a sibling group. */
function apart(pool: PackQuestion[], ids: string[]): boolean {
  const groupOf = new Map(pool.map((x) => [x.id, x.siblingGroup]));
  const groups = ids.map((id) => groupOf.get(id)).filter((g): g is string => g !== undefined);
  return new Set(groups).size === groups.length;
}

describe('a mock keeps a cross-domain sibling group for the domain that needs it', () => {
  // Targets 4 / 3 / 3. Domain 3 is sure of only 2 (c1, and one of the pair Y),
  // so it reaches 3 only when the cross-domain group X keeps its domain 3 member.
  const cert = course([40, 30, 30]);
  const pool = [
    ...plain('a', '1', 8),
    q('ax', '1', 'X'),
    ...plain('b', '2', 5),
    q('bx', '2', 'X'),
    q('c1', '3'),
    q('cx', '3', 'X'),
    q('cy1', '3', 'Y'),
    q('cy2', '3', 'Y'),
  ];
  const targets = targetsOf(cert);

  it('the made-up course is what the test says: targets 4 / 3 / 3, and domain 3 is one short without group X', () => {
    expect([...targets.values()]).toEqual([4, 3, 3]);
    expect([...groupsForShortDomains(pool, targets)]).toEqual([['X', '3']]);
  });

  it('every seed: the mock is full, every domain has its target, and no group is in it twice', () => {
    for (const seed of SEEDS) {
      const ids = buildMockExam(cert, pool, createRng(seed), TOTAL);
      expect(ids).toHaveLength(TOTAL);
      expect(new Set(ids).size).toBe(TOTAL);
      expect(perDomain(cert, pool, ids)).toEqual([4, 3, 3]);
      expect(apart(pool, ids)).toBe(true);
      // Group X is always answered by its domain 3 member.
      expect(ids).toContain('cx');
    }
  });

  it('without the targets (the old rule, still what other callers get) domain 3 is short on some seeds', () => {
    const kept = new Set(SEEDS.map((seed) => oneOfEachGroup(pool, createRng(seed)).find((x) => x.siblingGroup === 'X')!.id));
    expect([...kept].sort()).toEqual(['ax', 'bx', 'cx']);
  });

  it('a group wholly inside the short domain is still picked at random', () => {
    const kept = new Set(SEEDS.map((seed) => oneOfEachGroup(pool, createRng(seed), targets).find((x) => x.siblingGroup === 'Y')!.id));
    expect([...kept].sort()).toEqual(['cy1', 'cy2']);
  });

  it('same seed, same mock', () => {
    for (const seed of [1, 2, 3]) {
      expect(buildMockExam(cert, pool, createRng(seed), TOTAL)).toEqual(buildMockExam(cert, pool, createRng(seed), TOTAL));
    }
  });

  it('several members in the short domain: each has its turn, and none from another domain is kept', () => {
    const two = [...pool, q('cx2', '3', 'X')];
    const kept = new Set(SEEDS.map((seed) => oneOfEachGroup(two, createRng(seed), targets).find((x) => x.siblingGroup === 'X')!.id));
    expect([...kept].sort()).toEqual(['cx', 'cx2']);
  });
});

describe('a cross-domain group no domain needs is picked as before', () => {
  // Same course, but domain 3 has plenty: nothing is short.
  const cert = course([40, 30, 30]);
  const pool = [...plain('a', '1', 8), q('ax', '1', 'X'), ...plain('b', '2', 5), q('bx', '2', 'X'), ...plain('c', '3', 6), q('cx', '3', 'X')];
  const targets = targetsOf(cert);

  it('no group is given to a domain', () => {
    expect(groupsForShortDomains(pool, targets).size).toBe(0);
  });

  it('every seed keeps the very same questions as the old rule, and every member has its turn', () => {
    const kept = new Set<string>();
    for (const seed of SEEDS) {
      const now = oneOfEachGroup(pool, createRng(seed), targets);
      expect(now).toEqual(oneOfEachGroup(pool, createRng(seed)));
      kept.add(now.find((x) => x.siblingGroup === 'X')!.id);
    }
    expect([...kept].sort()).toEqual(['ax', 'bx', 'cx']);
  });

  it('the random numbers used are the same with and without targets', () => {
    const a = createRng(11);
    const b = createRng(11);
    oneOfEachGroup(pool, a, targets);
    oneOfEachGroup(pool, b);
    expect(a()).toBe(b());
  });

  it('members from more than one domain reach the mock over many seeds', () => {
    const seen = new Set<string>();
    for (const seed of SEEDS) {
      const ids = buildMockExam(cert, pool, createRng(seed), TOTAL);
      expect(ids).toHaveLength(TOTAL);
      expect(perDomain(cert, pool, ids)).toEqual([4, 3, 3]);
      expect(apart(pool, ids)).toBe(true);
      for (const id of ids) if (id.endsWith('x')) seen.add(id);
    }
    expect([...seen].sort()).toEqual(['ax', 'bx', 'cx']);
  });
});

describe('two short domains and one group: the larger need wins', () => {
  // Targets 4 / 3 / 3. Domain 2 is sure of 1 (needs 2 more), domain 3 of 2 (needs 1 more).
  const cert = course([40, 30, 30]);
  const pool = [...plain('a', '1', 8), q('b1', '2'), q('bx', '2', 'X'), ...plain('c', '3', 2), q('cx', '3', 'X')];
  const targets = targetsOf(cert);

  it('the group goes to the domain that needs more, on every seed', () => {
    expect([...groupsForShortDomains(pool, targets)]).toEqual([['X', '2']]);
    for (const seed of SEEDS) {
      const kept = oneOfEachGroup(pool, createRng(seed), targets);
      expect(kept.map((x) => x.id)).toContain('bx');
      expect(kept.map((x) => x.id)).not.toContain('cx');
    }
  });

  it('the order of the questions in the pool does not change who wins', () => {
    expect([...groupsForShortDomains([...pool].reverse(), targets)]).toEqual([['X', '2']]);
  });

  it('equal needs: the domain listed first in the course wins', () => {
    // Domain 2 now sure of 2, so both need exactly 1.
    const tie = [...pool, q('b2', '2')];
    expect([...groupsForShortDomains(tie, targets)]).toEqual([['X', '2']]);
    expect([...groupsForShortDomains([...tie].reverse(), targets)]).toEqual([['X', '2']]);
  });

  it('more groups: one at a time, each to the domain that still needs the most', () => {
    // Two cross-domain groups, needs 2 and 1: X to domain 2 (2 against 1), then
    // the tie at 1 and 1 goes to domain 2 again, the domain listed first.
    const two = [...pool, q('bz', '2', 'Z'), q('cz', '3', 'Z')];
    expect([...groupsForShortDomains(two, targets)]).toEqual([['X', '2'], ['Z', '2']]);
    // With one more sure question in domain 2 (needs 1 and 1) each domain gets one.
    const level = [...two, q('b2', '2')];
    expect([...groupsForShortDomains(level, targets)]).toEqual([['X', '2'], ['Z', '3']]);
    // Three groups for needs 2 and 1: two to domain 2, the third to domain 3.
    const three = [...two, q('bw', '2', 'W'), q('cw', '3', 'W')];
    expect([...groupsForShortDomains(three, targets)]).toEqual([['X', '2'], ['Z', '2'], ['W', '3']]);
  });

  it('the mock still holds no group twice and is as full as the pool allows', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const ids = buildMockExam(cert, pool, createRng(seed), TOTAL);
      expect(apart(pool, ids)).toBe(true);
      // 8 + 2 (b1, bx) + 2 (c1, c2): the top-up makes up for the domains that stay short.
      expect(ids).toHaveLength(TOTAL);
      expect(perDomain(cert, pool, ids).slice(1)).toEqual([2, 2]);
    }
  });
});

describe('a short domain takes only the groups it needs', () => {
  // Domain 3 needs one more and two cross-domain groups could give it.
  const cert = course([40, 30, 30]);
  const pool = [...plain('a', '1', 8), q('ax', '1', 'X'), q('az', '1', 'Z'), ...plain('b', '2', 5), ...plain('c', '3', 2), q('cx', '3', 'X'), q('cz', '3', 'Z')];
  const targets = targetsOf(cert);

  it('the first group in the pool is given; the other stays random', () => {
    expect([...groupsForShortDomains(pool, targets)]).toEqual([['X', '3']]);
    const keptZ = new Set<string>();
    for (const seed of SEEDS) {
      const kept = oneOfEachGroup(pool, createRng(seed), targets);
      expect(kept.map((x) => x.id)).toContain('cx');
      keptZ.add(kept.find((x) => x.siblingGroup === 'Z')!.id);
      const ids = buildMockExam(cert, pool, createRng(seed), TOTAL);
      expect(perDomain(cert, pool, ids)).toEqual([4, 3, 3]);
      expect(apart(pool, ids)).toBe(true);
    }
    expect([...keptZ].sort()).toEqual(['az', 'cz']);
  });
});

describe('groups wholly inside one domain: nothing changes', () => {
  // Domain 3 is short (2 sure, target 3) but no group spans two domains, so there is nothing to give.
  const cert = course([40, 30, 30]);
  const pool = [...plain('a', '1', 8), q('ay1', '1', 'Y'), q('ay2', '1', 'Y'), ...plain('b', '2', 5), q('c1', '3'), q('cw1', '3', 'W'), q('cw2', '3', 'W')];
  const targets = targetsOf(cert);

  it('no group is given, and every seed keeps the very same questions as the old rule', () => {
    expect(groupsForShortDomains(pool, targets).size).toBe(0);
    const kept = new Set<string>();
    for (const seed of SEEDS) {
      const now = oneOfEachGroup(pool, createRng(seed), targets);
      expect(now).toEqual(oneOfEachGroup(pool, createRng(seed)));
      for (const x of now) if (x.siblingGroup !== undefined) kept.add(x.id);
    }
    expect([...kept].sort()).toEqual(['ay1', 'ay2', 'cw1', 'cw2']);
  });

  it('a domain the course does not list is never short, and its questions change nothing', () => {
    const odd = [...pool, q('z1', '9', 'Y')];
    expect(groupsForShortDomains(odd, targets).size).toBe(0);
  });
});

describe('no sibling group anywhere (every live course)', () => {
  const bank = getAllQuestions('cisa');
  const targets = new Map(cisa.domains.map((d) => [d.id, 30]));

  it('the same pool comes back and no random number is used, with targets too', () => {
    const a = createRng(7);
    const b = createRng(7);
    expect(oneOfEachGroup(bank, a, targets)).toBe(bank);
    expect(a()).toBe(b());
  });

  it('no group is given to a domain, even one far short of its target', () => {
    const tiny = plain('a', '1', 2);
    expect(groupsForShortDomains(tiny, new Map([['1', 50], ['2', 50]])).size).toBe(0);
  });
});

describe('the dry run’s copy of the rule (scripts/mock-siblings.cjs) never differs from the app’s', () => {
  /** A made-up bank: 4 domains, some questions alone, some in groups inside a domain, some in groups across domains. */
  function randomBank(rng: Rng): { pool: PackQuestion[]; targets: Map<string, number> } {
    const pick = (k: number) => Math.floor(rng() * k);
    const pool: PackQuestion[] = [];
    const size = 10 + pick(40);
    for (let i = 0; i < size; i++) {
      const domainId = String(1 + pick(4));
      const kind = pick(4); // 0 and 1: alone; 2: a group of its own domain; 3: a group shared by every domain
      const group = kind < 2 ? undefined : kind === 2 ? `in${domainId}_${pick(3)}` : `across_${pick(6)}`;
      pool.push(q(`r${i}`, domainId, group));
    }
    // Targets from 0 to 11 a domain, so some domains are short and some are not; domain "5" has no question at all.
    const targets = new Map(['1', '2', '3', '4', '5'].map((id) => [id, pick(12)]));
    return { pool, targets };
  }

  it('600 made-up banks: the same groups go to the same domains, in the same order', () => {
    const rng = createRng(2026);
    let given = 0;
    for (let k = 0; k < 600; k++) {
      const { pool, targets } = randomBank(rng);
      const app = [...groupsForShortDomains(pool, targets)];
      expect([...dryRun.groupsForShortDomains(pool, targets)]).toEqual(app);
      given += app.length;
    }
    // The banks really do exercise the rule.
    expect(given).toBeGreaterThan(600);
  });

  it('what the dry run counts for a domain is what the app keeps, on any seed', () => {
    const rng = createRng(7);
    for (let k = 0; k < 200; k++) {
      const { pool, targets } = randomBank(rng);
      const first = dryRun.firstOfEachGroup(pool, targets);
      const kept = oneOfEachGroup(pool, createRng(k + 1), targets);
      // The same number of questions, one per group, whichever sibling is kept.
      expect(kept).toHaveLength(first.pool.length);
      expect(apart(pool, first.pool.map((x) => x.id))).toBe(true);
      // Every group given to a domain is answered from that domain, in the app and in the dry run.
      for (const [group, domainId] of first.given) {
        expect(kept.find((x) => x.siblingGroup === group)!.domainId).toBe(domainId);
        expect(first.pool.find((x) => x.siblingGroup === group)!.domainId).toBe(domainId);
      }
    }
  });

  it('with no targets the dry run’s copy keeps the first question of every group (its short-mock model)', () => {
    const pool = [q('a1', '1', 'X'), q('b1', '2', 'X'), q('b2', '2'), q('c1', '3', 'Y'), q('c2', '3', 'Y')];
    const first = dryRun.firstOfEachGroup(pool, new Map());
    expect(first.given.size).toBe(0);
    expect(first.pool.map((x) => x.id)).toEqual(['a1', 'b2', 'c1']);
  });
});
