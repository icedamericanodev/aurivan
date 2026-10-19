/**
 * Mock-exam builder — picks questions so the mock looks like the real
 * exam: same domain weights and the same mix of easy / medium / hard.
 *
 * Wave 5 / M1 (topic-stratified mock): when the study outline is passed in,
 * each domain's questions are also spread across the outline's topics
 * ("1A1", "1A2" … "1B6"), so a mock can no longer skip a whole topic just
 * because the bank has more questions elsewhere. See `pickDomainStratified`.
 */
import type { Certification, Difficulty, PackQuestion } from '../content/types';
import type { OutlineTopic } from './outline';
import { shuffled, type Rng } from './random';

/**
 * Split `total` into whole numbers proportional to `weights`
 * ("largest remainder" method — the parts always add up to `total`).
 */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (sum <= 0 || total <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (w / sum) * total);
  const floors = exact.map(Math.floor);
  let remaining = total - floors.reduce((s, n) => s + n, 0);
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (remaining <= 0) break;
    floors[i] += 1;
    remaining -= 1;
  }
  return floors;
}

const DIFFICULTIES: Difficulty[] = ['analysis', 'application', 'foundational'];

/**
 * Build a mock exam. Returns question ids in random exam order.
 * If a domain or difficulty runs short, it tops up from what is left,
 * so you always get `total` questions when the bank is big enough.
 *
 * `outline` (optional): the study outline (engine/outline.ts). With it, each
 * domain's picks are stratified by topic and subtopic. Without it (a cert
 * with no notes), each domain is picked at random inside each difficulty
 * tier, exactly as before M1. Same seed + same inputs = same paper.
 */
export function buildMockExam(
  cert: Certification,
  pool: PackQuestion[],
  rng: Rng,
  total: number = cert.exam.questions,
  outline?: readonly OutlineTopic[],
): string[] {
  const picked = new Set<string>();
  const domainTargets = allocate(total, cert.domains.map((d) => d.weight));
  const stratify = outline !== undefined && outline.length > 0;

  cert.domains.forEach((dom, di) => {
    const inDomain = pool.filter((q) => q.domainId === dom.id);
    const target = domainTargets[di];
    const diffTargets = allocate(target, DIFFICULTIES.map((d) => cert.exam.difficultyMix[d]));
    const ids = stratify
      ? pickDomainStratified(dom.id, inDomain, target, diffTargets, outline, rng)
      : pickDomainRandom(inDomain, target, diffTargets, rng);
    for (const id of ids) picked.add(id);
  });

  // Top up from any domain if the whole thing is still short.
  for (const q of shuffled(pool, rng)) {
    if (picked.size >= total) break;
    picked.add(q.id);
  }
  return shuffled([...picked], rng).slice(0, total);
}

/** The pre-M1 domain pick: random inside each difficulty tier, then top up. */
function pickDomainRandom(inDomain: PackQuestion[], target: number, diffTargets: number[], rng: Rng): string[] {
  const picked = new Set<string>();
  DIFFICULTIES.forEach((diff, k) => {
    const candidates = shuffled(inDomain.filter((q) => q.difficulty === diff), rng);
    for (const q of candidates.slice(0, diffTargets[k])) picked.add(q.id);
  });
  // Top up inside the domain if a difficulty tier was short.
  for (const q of shuffled(inDomain, rng)) {
    if (picked.size >= target) break;
    picked.add(q.id);
  }
  return [...picked];
}

/**
 * How many mock questions each topic gets inside one domain.
 *
 * Plain English: in proportion to how many bank questions each topic has
 * (largest-remainder rounding, so the parts add up), then every topic that
 * has questions gets at least 1. Each topic that rounded to 0 (in reading
 * order) takes one slot from the topic that rounded up the most (its slots
 * minus its exact share is largest; ties go to the earlier topic). There is
 * always such a donor with 2+ slots, because there are at least as many
 * slots as topics.
 * Fewer slots than topics (a mini mock): one slot each for the first
 * `total` topics of a seeded shuffle, so a different topic sits out each time.
 * Never gives a topic more slots than it has questions.
 */
export function topicTargets(total: number, sizes: number[], rng: Rng): number[] {
  const sum = sizes.reduce((s, n) => s + n, 0);
  const t = Math.min(total, sum);
  const nonEmpty = sizes.map((_, i) => i).filter((i) => sizes[i] > 0);
  if (t < nonEmpty.length) {
    const alloc = sizes.map(() => 0);
    for (const i of shuffled(nonEmpty, rng).slice(0, Math.max(0, t))) alloc[i] = 1;
    return alloc;
  }
  const alloc = allocate(t, sizes);
  const exact = sizes.map((n) => (n / sum) * t);
  for (const z of nonEmpty.filter((i) => alloc[i] === 0)) {
    let donor = -1;
    for (let i = 0; i < alloc.length; i++) {
      if (alloc[i] < 2) continue;
      if (donor < 0 || alloc[i] - exact[i] > alloc[donor] - exact[donor]) donor = i;
    }
    if (donor < 0) break; // cannot happen while t >= topics with questions
    alloc[donor] -= 1;
    alloc[z] += 1;
  }
  return alloc;
}

/** One subtopic's still-unpicked questions (seeded shuffle) and how many it has given. */
interface SubBucket {
  qs: PackQuestion[];
  picks: number;
}

/**
 * Rotation rule: the next pick comes from a subtopic that has given the
 * fewest picks so far (among subtopics with questions left). So no subtopic
 * repeats until every subtopic of its topic has given one (or run out).
 */
function eligibleSubs(subs: SubBucket[]): SubBucket[] {
  const open = subs.filter((s) => s.qs.length > 0);
  if (open.length === 0) return [];
  const min = Math.min(...open.map((s) => s.picks));
  return open.filter((s) => s.picks === min);
}

/** True when no subtopic is more than one pick ahead of a subtopic with questions left. */
function rotationHolds(subs: SubBucket[]): boolean {
  const open = subs.filter((s) => s.qs.length > 0);
  if (open.length === 0) return true;
  const min = Math.min(...open.map((s) => s.picks));
  return subs.every((s) => s.picks <= min + 1);
}

/**
 * The M1 domain pick. Exactly, so the web app can mirror it:
 * 1. Group the domain's questions by outline topic, then subtopic. A
 *    question counts only under a topic of its OWN domain; the rest, and
 *    questions no note lists, form the domain's "unmapped" pool. Seeded
 *    shuffles, in this order: each subtopic's questions and then each
 *    topic's subtopic order (topic by topic, reading order), the unmapped
 *    pool, the mini-mock topic pick (inside topicTargets, only when there
 *    are fewer slots than topics), the topic order.
 * 2. Topic slots = topicTargets(min(target, mapped questions), topic sizes).
 * 3. Fill in rounds: round r gives one pick to every topic with more than r
 *    slots, in the shuffled topic order. Each pick: the eligible subtopics
 *    are those with the fewest picks so far (and questions left); try the
 *    difficulties still needed, most-needed first (ties: analysis,
 *    application, foundational); take the first question of that
 *    difficulty from the first eligible subtopic that has one. If no needed
 *    difficulty is there, take the first question of the first eligible one.
 * 4. Gaps (fewer mapped questions than the domain target): fill from the
 *    unmapped pool, needed difficulty first.
 * 5. Repair the difficulty mix: while one tier is over target and another
 *    under, swap a picked over-tier question (in pick order) for an unpicked
 *    under-tier one from the same subtopic, else another subtopic of the
 *    same topic if the rotation rule still holds (unmapped: from the
 *    unmapped pool). Stop when no swap is possible.
 */
function pickDomainStratified(
  domainId: string,
  inDomain: PackQuestion[],
  target: number,
  diffTargets: number[],
  outline: readonly OutlineTopic[],
  rng: Rng,
): string[] {
  // Step 1: topic → subtopic buckets, plus the unmapped pool.
  const byId = new Map(inDomain.map((q) => [q.id, q]));
  const mapped = new Set<string>();
  const topics: SubBucket[][] = [];
  for (const t of outline) {
    if (t.domainId !== domainId) continue;
    const subs: SubBucket[] = [];
    for (const s of t.subtopics) {
      const qs: PackQuestion[] = [];
      for (const id of s.questionIds) {
        const q = byId.get(id);
        if (q && !mapped.has(id)) {
          mapped.add(id);
          qs.push(q);
        }
      }
      if (qs.length > 0) subs.push({ qs: shuffled(qs, rng), picks: 0 });
    }
    if (subs.length > 0) topics.push(shuffled(subs, rng));
  }
  const unmapped: SubBucket = { qs: shuffled(inDomain.filter((q) => !mapped.has(q.id)), rng), picks: 0 };

  // Remaining need per difficulty (negative = over target).
  const need = new Map<Difficulty, number>(DIFFICULTIES.map((d, k) => [d, diffTargets[k]]));
  // Most-needed first; Array.sort is stable, so ties keep the tier order.
  const neededOrder = () => DIFFICULTIES.filter((d) => need.get(d)! > 0).sort((a, b) => need.get(b)! - need.get(a)!);
  const picked: PackQuestion[] = [];
  const home = new Map<string, { bucket: SubBucket; topic: SubBucket[] | null }>();
  const take = (bucket: SubBucket, i: number, topic: SubBucket[] | null) => {
    const [q] = bucket.qs.splice(i, 1);
    bucket.picks += 1;
    need.set(q.difficulty, need.get(q.difficulty)! - 1);
    picked.push(q);
    home.set(q.id, { bucket, topic });
  };
  const pickFrom = (subs: SubBucket[], topic: SubBucket[] | null) => {
    const eligible = eligibleSubs(subs);
    if (eligible.length === 0) return;
    for (const d of neededOrder()) {
      for (const s of eligible) {
        const i = s.qs.findIndex((q) => q.difficulty === d);
        if (i >= 0) return take(s, i, topic);
      }
    }
    take(eligible[0], 0, topic);
  };

  // Steps 2–3: topic slots, filled round by round.
  const sizes = topics.map((subs) => subs.reduce((n, s) => n + s.qs.length, 0));
  const slots = topicTargets(target, sizes, rng);
  const order = shuffled(topics.map((_, i) => i), rng);
  const rounds = Math.max(0, ...slots);
  for (let r = 0; r < rounds; r++) {
    for (const j of order) if (slots[j] > r) pickFrom(topics[j], topics[j]);
  }

  // Step 4: gaps come from the unmapped pool.
  while (picked.length < target && unmapped.qs.length > 0) pickFrom([unmapped], null);

  // Step 5: repair the difficulty mix with like-for-like swaps.
  const swapOnce = (): boolean => {
    const over = DIFFICULTIES.filter((d) => need.get(d)! < 0);
    for (const lo of neededOrder()) {
      for (let p = 0; p < picked.length; p++) {
        const out = picked[p];
        if (!over.includes(out.difficulty)) continue;
        const { bucket, topic } = home.get(out.id)!;
        // Same subtopic first, then the other subtopics of the same topic.
        const candidates = topic ? [bucket, ...topic.filter((s) => s !== bucket)] : [bucket];
        for (const s of candidates) {
          const i = s.qs.findIndex((q) => q.difficulty === lo);
          if (i < 0) continue;
          // Try the swap; undo it if it would break the rotation rule.
          const [inQ] = s.qs.splice(i, 1);
          bucket.qs.push(out);
          bucket.picks -= 1;
          s.picks += 1;
          if (topic && !rotationHolds(topic)) {
            s.picks -= 1;
            bucket.picks += 1;
            bucket.qs.pop();
            s.qs.splice(i, 0, inQ);
            continue;
          }
          picked[p] = inQ;
          home.delete(out.id);
          home.set(inQ.id, { bucket: s, topic });
          need.set(out.difficulty, need.get(out.difficulty)! + 1);
          need.set(inQ.difficulty, need.get(inQ.difficulty)! - 1);
          return true;
        }
      }
    }
    return false;
  };
  for (let guard = 0; guard < picked.length && neededOrder().length > 0; guard++) {
    if (!swapOnce()) break;
  }
  return picked.map((q) => q.id);
}
