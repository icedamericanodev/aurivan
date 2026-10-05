/**
 * Mock-exam builder — picks questions so the mock looks like the real
 * exam: same domain weights and the same mix of easy / medium / hard.
 */
import type { Certification, Difficulty, PackQuestion } from '../content/types';
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
 */
export function buildMockExam(
  cert: Certification,
  pool: PackQuestion[],
  rng: Rng,
  total: number = cert.exam.questions,
): string[] {
  const picked = new Set<string>();
  const domainTargets = allocate(total, cert.domains.map((d) => d.weight));

  cert.domains.forEach((dom, di) => {
    const inDomain = pool.filter((q) => q.domainId === dom.id);
    const target = domainTargets[di];
    const diffTargets = allocate(target, DIFFICULTIES.map((d) => cert.exam.difficultyMix[d]));
    DIFFICULTIES.forEach((diff, k) => {
      const candidates = shuffled(inDomain.filter((q) => q.difficulty === diff), rng);
      for (const q of candidates.slice(0, diffTargets[k])) picked.add(q.id);
    });
    // Top up inside the domain if a difficulty tier was short.
    const domainPicked = () => inDomain.filter((q) => picked.has(q.id)).length;
    for (const q of shuffled(inDomain, rng)) {
      if (domainPicked() >= target) break;
      picked.add(q.id);
    }
  });

  // Top up from any domain if the whole thing is still short.
  for (const q of shuffled(pool, rng)) {
    if (picked.size >= total) break;
    picked.add(q.id);
  }
  return shuffled([...picked], rng).slice(0, total);
}
