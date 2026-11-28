/**
 * mock-siblings.cjs — the mock's sibling rule, for scripts that cannot read
 * the app's TypeScript (the pack dry run, scripts/cia_pack_dry_run.cjs).
 *
 * WHAT IT IS (plain English): a mock keeps one question of each sibling
 * group. When a group has questions in more than one domain (the CIA course
 * says "section"), the app keeps a question from the domain that would
 * otherwise be short of its share of the mock. The app's code for that is
 * src/engine/siblings.ts groupsForShortDomains; this file is the same steps
 * in plain JavaScript, so a dry run can say exactly how many questions each
 * section holds for a mock.
 *
 * The two must never differ: src/__tests__/mock-sibling-scarce.test.ts runs
 * both on hundreds of made-up banks and fails if one answer differs. Change
 * both together.
 *
 * CommonJS so Jest and the pack dry runs can use it, like siblings-pack.cjs.
 */
'use strict';

/**
 * Which sibling groups must give a question from one particular domain.
 * `pool`: the questions a mock may use ({ id, domainId, siblingGroup? }).
 * `targets`: a Map, domain id → how many questions the mock wants from it
 * (in the course's domain order). Returns a Map, group → domain id.
 *
 * 1. Count what each domain is sure to have whichever sibling is kept: its
 *    questions with no group, plus 1 for each group whose questions all sit
 *    in that domain. A domain is short when that is below its target.
 * 2. Give groups that span domains to short domains, each group to ONE
 *    domain it has a question in, never more to a domain than it is short by:
 *    a. First fill as many short domains as possible right up to their
 *       target: every set of short domains is tried, the largest first; of
 *       two sets of the same size, the one with the domains listed first.
 *    b. Then the groups still free go, one at a time, to the short domain
 *       that still needs the most (a tie: the domain listed first).
 *    Whenever a domain wants a group another domain holds, the holder hands
 *    it over if it can take a different group instead. So no other way of
 *    sharing out the groups fills more domains, or more places in total.
 *    (More than 12 short domains: step a is skipped, as in the app.)
 * The Map comes back in the pool's order of the groups.
 */
const MOST_DOMAINS_TRIED = 12;
function groupsForShortDomains(pool, targets) {
  const need = new Map(targets);
  const lower = (domainId) => {
    if (need.has(domainId)) need.set(domainId, need.get(domainId) - 1);
  };
  const domainsOf = new Map(); // group → the domains its questions sit in
  for (const q of pool) {
    if (q.siblingGroup === undefined) {
      lower(q.domainId);
      continue;
    }
    if (!domainsOf.has(q.siblingGroup)) domainsOf.set(q.siblingGroup, new Set());
    domainsOf.get(q.siblingGroup).add(q.domainId);
  }
  const cross = []; // groups that span domains, in the pool's order
  for (const [group, domains] of domainsOf) {
    if (domains.size === 1) lower([...domains][0]);
    else cross.push([group, domains]);
  }
  // The short domains a group that spans domains could help: [domain id, how many it is short by].
  const short = [...need].filter(([domainId, n]) => n > 0 && cross.some(([, domains]) => domains.has(domainId)));
  if (short.length === 0) return new Map();

  // One move: give `domainId` one more group. `holder`: group → the domain that holds it so far;
  // `asked`: the domains already asked in this move.
  const giveOne = (holder, domainId, asked) => {
    asked.add(domainId);
    for (const [group, domains] of cross) {
      if (!domains.has(domainId) || holder.has(group)) continue;
      holder.set(group, domainId); // a group nobody holds yet
      return true;
    }
    for (const [group, domains] of cross) {
      if (!domains.has(domainId)) continue;
      const other = holder.get(group);
      // A group another domain holds, if that domain can take a different one instead.
      if (asked.has(other) || !giveOne(holder, other, asked)) continue;
      holder.set(group, domainId);
      return true;
    }
    return false;
  };
  const fillAll = (holder, wanted) => wanted.every(([domainId, n]) => {
    for (let k = 0; k < n; k++) if (!giveOne(holder, domainId, new Set())) return false;
    return true;
  });

  // Step a: every set of short domains, the largest first, then the domains listed first.
  const count = short.length;
  const sets = count > MOST_DOMAINS_TRIED
    ? []
    : Array.from({ length: 2 ** count - 1 }, (_, i) => short.filter((_d, j) => ((2 ** count - 1 - i) >> (count - 1 - j)) & 1));
  sets.sort((a, b) => b.length - a.length);
  const full = sets.find((set) => fillAll(new Map(), set)) || [];
  const holder = new Map();
  fillAll(holder, full);

  // Step b: the groups still free, one at a time to the domain that still needs the most.
  const open = new Map(short.filter((d) => !full.includes(d)));
  for (;;) {
    let next;
    for (const [domainId, n] of open) if (n > 0 && (next === undefined || n > open.get(next))) next = domainId;
    if (next === undefined) break;
    if (giveOne(holder, next, new Set())) open.set(next, open.get(next) - 1);
    else open.delete(next); // no group can reach it, now or later
  }

  const given = new Map();
  for (const [group] of cross) if (holder.has(group)) given.set(group, holder.get(group));
  return given;
}

/**
 * A mock's pool with one question per sibling group, as the app's
 * oneOfEachGroup keeps them, but with no random number: where the app keeps a
 * RANDOM question of a group (of the domain the group was given to, if any),
 * this keeps the FIRST. That is enough to count what each domain holds and to
 * prove a draw can be made. Returns { pool, given } (`given` as above).
 */
function firstOfEachGroup(pool, targets) {
  const given = groupsForShortDomains(pool, targets);
  const done = new Set();
  const kept = pool.filter((q) => {
    const g = q.siblingGroup;
    if (g === undefined) return true;
    if (done.has(g)) return false;
    const domainId = given.get(g);
    if (domainId !== undefined && q.domainId !== domainId) return false;
    done.add(g);
    return true;
  });
  return { pool: kept, given };
}

module.exports = { groupsForShortDomains, firstOfEachGroup };
