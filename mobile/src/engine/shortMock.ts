/**
 * The per-learner short mock (docs/content/CIA_BANK_PLAN.md section 11, item 7).
 *
 * Plain English for the founder: for a course that opts in
 * (`readinessRule: 'firstTry'`), a mock shorter than the real exam is drawn
 * for THIS learner from questions they have not seen yet, so its answers are
 * fresh first tries. It keeps every rule a normal mock has:
 *   - sections at the exam's weights (allocate), topics spread inside each
 *     section (buildMockExam with the outline), one question per sibling group;
 *   - only questions on the exam today (the caller passes mockPool's pool).
 * When a section has too few unseen questions left, it is topped up with
 * questions the learner HAS seen from that same section. The caller tells the
 * learner before the start ("This mock reuses 4 questions you have seen;
 * those won't count toward readiness") and labels the result "includes seen
 * questions". Seen questions never count toward first-try readiness anyway
 * (engine/firstTry.ts), so nothing else is needed for that promise to hold.
 *
 * CISA never comes here: its mini mock is drawn exactly as before.
 *
 * Pure TypeScript: no React, no storage, no network.
 */
import type { Certification, PackQuestion } from '../content/types';
import { allocate, buildMockExam } from './blueprint';
import type { OutlineTopic } from './outline';
import { shuffled, type Rng } from './random';

/** A short mock as drawn. */
export interface ShortMockDraw {
  /** The question ids, in exam order. */
  ids: string[];
  /** How many of them the learner has seen before (0 for a fully fresh mock). */
  reused: number;
}

/** The notice before the start when a short mock reuses seen questions (curly apostrophes, like the app). */
export function reusedLine(n: number): string {
  return n === 1
    ? 'This mock reuses 1 question you have seen; it won’t count toward readiness.'
    : `This mock reuses ${n} questions you have seen; those won’t count toward readiness.`;
}

/** The label a result carries when its mock reused seen questions. */
export const INCLUDES_SEEN = 'includes seen questions';

/**
 * One question per sibling group, preferring one the learner has NOT seen:
 * a random unseen member when the group has one, else a random seen member.
 * Questions with no group are all kept. The pool's order is kept.
 */
function oneFreshPerGroup(pool: readonly PackQuestion[], seen: (id: string) => boolean, rng: Rng): PackQuestion[] {
  if (!pool.some((q) => q.siblingGroup !== undefined)) return [...pool];
  const chosen = new Map<string, PackQuestion>();
  for (const q of shuffled(pool, rng)) {
    const g = q.siblingGroup;
    if (g === undefined) continue;
    const had = chosen.get(g);
    if (!had || (seen(had.id) && !seen(q.id))) chosen.set(g, q);
  }
  return pool.filter((q) => q.siblingGroup === undefined || chosen.get(q.siblingGroup) === q);
}

/**
 * Draw a short mock of `total` questions from `pool` (the questions a mock may
 * use today: blueprint.ts mockPool).
 *
 * 1. One question per sibling group, an unseen one when the group has one.
 * 2. Each section's share of `total` (allocate, by weight).
 * 3. A section with at least its share of unseen questions draws from those
 *    only. A section with fewer draws all of its unseen questions plus seen
 *    ones from the same section (random) to make up its share.
 * 4. buildMockExam then picks from that pool exactly as a normal mock does
 *    (topic spread, difficulty mix, random order). If the whole pool is still
 *    short, it is topped up from what is left (a shorter mock when even that
 *    runs out).
 * Same seed + same inputs = the same mock, so the start sheet can say how many
 * seen questions the mock reuses and then start that very mock.
 */
export function buildShortMock(
  cert: Certification,
  pool: readonly PackQuestion[],
  seen: (id: string) => boolean,
  rng: Rng,
  total: number,
  outline?: readonly OutlineTopic[],
): ShortMockDraw {
  const one = oneFreshPerGroup(pool, seen, rng);
  const targets = allocate(total, cert.domains.map((d) => d.weight));
  const keep = new Set<string>();
  cert.domains.forEach((dom, i) => {
    const inSection = one.filter((q) => q.domainId === dom.id);
    const fresh = inSection.filter((q) => !seen(q.id));
    for (const q of fresh) keep.add(q.id);
    const short = targets[i] - fresh.length;
    if (short <= 0) return;
    // Top up with seen questions from the SAME section.
    for (const q of shuffled(inSection.filter((x) => seen(x.id)), rng).slice(0, short)) keep.add(q.id);
  });
  // Questions outside every section (none in a well-formed pack) are left out, like a normal mock's allocation.
  const drawPool = one.filter((q) => keep.has(q.id));
  const ids = buildMockExam(cert, drawPool, rng, total, outline);
  return { ids, reused: ids.filter(seen).length };
}
