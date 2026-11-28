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

describe('two short domains and one group: the group goes where it fills a domain', () => {
  // Targets 4 / 3 / 3. Domain 2 is sure of 1 (needs 2 more), domain 3 of 2 (needs 1 more).
  // One group cannot fill domain 2, but it fills domain 3: so only domain 2 is left off its weight.
  const cert = course([40, 30, 30]);
  const pool = [...plain('a', '1', 8), q('b1', '2'), q('bx', '2', 'X'), ...plain('c', '3', 2), q('cx', '3', 'X')];
  const targets = targetsOf(cert);

  it('the group goes to the domain it can fill, on every seed', () => {
    expect([...groupsForShortDomains(pool, targets)]).toEqual([['X', '3']]);
    for (const seed of SEEDS) {
      const kept = oneOfEachGroup(pool, createRng(seed), targets);
      expect(kept.map((x) => x.id)).toContain('cx');
      expect(kept.map((x) => x.id)).not.toContain('bx');
    }
  });

  it('the order of the questions in the pool does not change who wins', () => {
    expect([...groupsForShortDomains([...pool].reverse(), targets)]).toEqual([['X', '3']]);
  });

  it('no domain can be filled: the group goes to the domain that needs the most', () => {
    // Without c2, domain 3 needs 2 as well as domain 2; with one more question gone from domain 3 it needs 3.
    const both = pool.filter((x) => x.id !== 'c2');
    expect([...groupsForShortDomains(both, targets)]).toEqual([['X', '2']]);
    const more = both.filter((x) => x.id !== 'c1');
    expect([...groupsForShortDomains(more, targets)]).toEqual([['X', '3']]);
  });

  it('equal needs: the domain listed first in the course wins', () => {
    // Domain 2 now sure of 2, so both need exactly 1.
    const tie = [...pool, q('b2', '2')];
    expect([...groupsForShortDomains(tie, targets)]).toEqual([['X', '2']]);
    expect([...groupsForShortDomains([...tie].reverse(), targets)]).toEqual([['X', '2']]);
  });

  it('more groups: as many domains filled as the groups allow, the domain listed first when either could be', () => {
    // Two cross-domain groups, needs 2 and 1: they can fill domain 2 or domain 3, not both.
    // Either way one domain is left short by 1; the domain listed first is the one filled.
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
      // 4 + 1 (b1) + 3 (c1, c2, cx): domain 3 has its share, and the top-up makes up for domain 2.
      expect(ids).toHaveLength(TOTAL);
      expect(perDomain(cert, pool, ids).slice(1)).toEqual([1, 3]);
    }
  });
});

describe('the groups are shared out so that every domain is filled when that is possible', () => {
  it('two domains one short each, two groups: the group only one of them can use is not taken by the other', () => {
    // Targets 3 / 3 / 4. Domains 1 and 2 are sure of 2 each. Group X spans domains 1 and 2,
    // group Y spans domains 1 and 3. Domain 1 could take either; domain 2 can only take X.
    const cert = course([30, 30, 40]);
    const pool = [...plain('a', '1', 2), q('ax', '1', 'X'), q('ay', '1', 'Y'), ...plain('b', '2', 2), q('bx', '2', 'X'), ...plain('c', '3', 8), q('cy', '3', 'Y')];
    const targets = targetsOf(cert);
    expect([...targets.values()]).toEqual([3, 3, 4]);
    expect([...groupsForShortDomains(pool, targets)]).toEqual([['X', '2'], ['Y', '1']]);
    for (const seed of SEEDS) {
      const ids = buildMockExam(cert, pool, createRng(seed), TOTAL);
      expect(ids).toHaveLength(TOTAL);
      expect(perDomain(cert, pool, ids)).toEqual([3, 3, 4]);
      expect(apart(pool, ids)).toBe(true);
      expect(ids).toEqual(expect.arrayContaining(['ay', 'bx']));
    }
  });

  it('the same with the groups the other way round in the pool', () => {
    // Groups in pool order: g1 {1, 2}, g2 {1, 3}; domains 1 and 2 need 1 each, domain 3 none.
    const pool = [q('p1', '1', 'g1'), q('p2', '1', 'g2'), q('p3', '2', 'g1'), ...plain('c', '3', 5), q('p4', '3', 'g2')];
    const targets = new Map([['1', 1], ['2', 1], ['3', 2]]);
    expect([...groupsForShortDomains(pool, targets)]).toEqual([['g1', '2'], ['g2', '1']]);
    // Listed the other way (domain 2 first) the answer is the same: there is only one way to fill both.
    expect([...groupsForShortDomains(pool, new Map([['2', 1], ['1', 1], ['3', 2]]))]).toEqual([['g1', '2'], ['g2', '1']]);
  });

  it('a chain of three: each domain hands its group on so that the last one is filled too', () => {
    // g1 {1, 2}, g2 {2, 3}, g3 {3, 4}: domains 1, 2 and 3 need 1 each, and domain 3 is asked last
    // of them only by the order of the list. One answer fills all three.
    const pool = [q('p1', '1', 'g1'), q('p2', '2', 'g1'), q('p3', '2', 'g2'), q('p4', '3', 'g2'), q('p5', '3', 'g3'), ...plain('d', '4', 5), q('p6', '4', 'g3')];
    const given = groupsForShortDomains(pool, new Map([['3', 1], ['2', 1], ['1', 1], ['4', 2]]));
    expect([...given.values()].sort()).toEqual(['1', '2', '3']);
    expect(given.get('g1')).toBe('1');
  });

  it('a domain that cannot be filled does not take the group that fills another', () => {
    // Domain 1 needs 2 and only g1 reaches it; domain 2 needs 2 and g1 and g2 reach it.
    // Filling domain 2 leaves one domain short; giving g1 to domain 1 would leave two.
    const pool = [q('p1', '1', 'g1'), q('p2', '2', 'g1'), q('p3', '2', 'g2'), ...plain('c', '3', 5), q('p4', '3', 'g2')];
    expect([...groupsForShortDomains(pool, new Map([['1', 2], ['2', 2], ['3', 2]]))]).toEqual([['g1', '2'], ['g2', '2']]);
  });

  it('a small need does not block two larger ones that could both be filled', () => {
    // Domain 1 needs 2 (g1, g2 reach it). Domain 2 needs 3 (g1, g3, g4). Domain 3 needs 3 (g2, g5, g6).
    // Filling domain 1 first would leave domains 2 and 3 short; filling those two leaves only domain 1.
    const reach: [string, string[]][] = [['g1', ['1', '2']], ['g2', ['1', '3']], ['g3', ['2', '4']], ['g4', ['2', '4']], ['g5', ['3', '4']], ['g6', ['3', '4']]];
    const pool = [...reach.flatMap(([g, ds]) => ds.map((d) => q(`${g}_${d}`, d, g))), ...plain('d', '4', 9)];
    const given = groupsForShortDomains(pool, new Map([['1', 2], ['2', 3], ['3', 3], ['4', 2]]));
    expect([...given]).toEqual([['g1', '2'], ['g2', '3'], ['g3', '2'], ['g4', '2'], ['g5', '3'], ['g6', '3']]);
  });

  it('more short domains than the rule tries sets for: still every place that can be filled, and it ends', () => {
    // 14 domains, each one short, and 14 groups in a ring (group k spans domains k and k + 1).
    const ids = Array.from({ length: 14 }, (_, i) => String(i + 1));
    const pool = ids.flatMap((d, i) => [q(`r${d}a`, d, `g${i}`), q(`r${d}b`, ids[(i + 1) % 14], `g${i}`)]);
    const given = groupsForShortDomains(pool, new Map(ids.map((d) => [d, 1])));
    expect([...given.values()].sort()).toEqual([...ids].sort());
  });
});

/**
 * Every way of sharing out the groups, tried one by one (only possible on tiny banks):
 * the most places that can be filled, and the most short domains that can be filled right up.
 */
function bestByTrying(pool: PackQuestion[], targets: Map<string, number>): { places: number; domains: number } {
  const need = new Map(targets);
  const domainsOf = new Map<string, Set<string>>();
  for (const x of pool) {
    if (x.siblingGroup === undefined) need.set(x.domainId, (need.get(x.domainId) ?? 0) - 1);
    else domainsOf.set(x.siblingGroup, (domainsOf.get(x.siblingGroup) ?? new Set<string>()).add(x.domainId));
  }
  const cross: string[][] = [];
  for (const domains of domainsOf.values()) {
    if (domains.size === 1) need.set([...domains][0], (need.get([...domains][0]) ?? 0) - 1);
    else cross.push([...domains]);
  }
  const short = [...need].filter(([, k]) => k > 0);
  let places = 0;
  let domains = 0;
  const got = new Map<string, number>();
  const walk = (i: number) => {
    if (i === cross.length) {
      places = Math.max(places, short.reduce((sum, [d, k]) => sum + Math.min(k, got.get(d) ?? 0), 0));
      domains = Math.max(domains, short.filter(([d, k]) => (got.get(d) ?? 0) >= k).length);
      return;
    }
    walk(i + 1); // this group goes to nobody
    for (const d of cross[i]) {
      got.set(d, (got.get(d) ?? 0) + 1);
      walk(i + 1);
      got.set(d, got.get(d)! - 1);
    }
  };
  walk(0);
  return { places, domains };
}

describe('no other way of sharing out the groups does better (checked by trying every way)', () => {
  it('400 tiny made-up banks: the most places filled, the most domains filled, never more than a domain needs', () => {
    const rng = createRng(4242);
    const pick = (k: number) => Math.floor(rng() * k);
    let helped = 0;
    let notAllFilled = 0;
    for (let b = 0; b < 400; b++) {
      const domainIds = Array.from({ length: 2 + pick(4) }, (_, i) => String(i + 1));
      const pool: PackQuestion[] = [];
      const size = 4 + pick(16);
      for (let i = 0; i < size; i++) {
        const domainId = domainIds[pick(domainIds.length)];
        const kind = pick(5); // 0: alone; 1: a group of its own domain; 2 to 4: a group shared across domains
        pool.push(q(`t${b}_${i}`, domainId, kind === 0 ? undefined : kind === 1 ? `in${domainId}` : `across_${pick(6)}`));
      }
      const targets = new Map(domainIds.map((d) => [d, pick(5)]));
      const given = groupsForShortDomains(pool, targets);
      const best = bestByTrying(pool, targets);

      // What the rule gave each domain, and what each domain was short by.
      const got = new Map<string, number>();
      for (const [group, domainId] of given) {
        // Only to a domain the group has a question in.
        expect(pool.some((x) => x.siblingGroup === group && x.domainId === domainId)).toBe(true);
        got.set(domainId, (got.get(domainId) ?? 0) + 1);
      }
      const sure = (d: string) => new Set(pool.filter((x) => x.domainId === d && (x.siblingGroup === undefined || pool.every((y) => y.siblingGroup !== x.siblingGroup || y.domainId === d))).map((x) => x.siblingGroup ?? x.id)).size;
      let places = 0;
      let filled = 0;
      for (const d of domainIds) {
        const shortBy = Math.max(0, targets.get(d)! - sure(d));
        const mine = got.get(d) ?? 0;
        expect(mine).toBeLessThanOrEqual(shortBy); // never more than it needs
        places += mine;
        if (shortBy > 0 && mine === shortBy) filled++;
      }
      expect({ bank: b, places, domains: filled }).toEqual({ bank: b, places: best.places, domains: best.domains });
      helped += places;
      if (domainIds.some((d) => targets.get(d)! - sure(d) > (got.get(d) ?? 0))) notAllFilled++;
    }
    // The banks really do exercise the rule, both where every domain can be filled and where not.
    expect(helped).toBeGreaterThan(300);
    expect(notAllFilled).toBeGreaterThan(50);
    expect(notAllFilled).toBeLessThan(350);
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
