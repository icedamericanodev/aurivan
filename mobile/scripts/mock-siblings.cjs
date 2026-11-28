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
 * 2. Give groups that span domains to short domains one at a time: each time
 *    the short domain that still needs the most (a tie: the domain listed
 *    first) takes the first group, in the pool's order, that has a question
 *    in it and has not been given yet.
 */
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
  const given = new Map();
  for (;;) {
    let toDomain;
    let theGroup;
    for (const [domainId, n] of need) {
      if (n <= 0) continue; // not short (any more)
      if (toDomain !== undefined && n <= need.get(toDomain)) continue; // an earlier domain needs as much or more
      const free = cross.find(([group, domains]) => !given.has(group) && domains.has(domainId));
      if (!free) continue; // no group left that could help this domain
      toDomain = domainId;
      theGroup = free[0];
    }
    if (toDomain === undefined) return given;
    given.set(theGroup, toDomain);
    need.set(toDomain, need.get(toDomain) - 1);
  }
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
