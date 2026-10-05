/**
 * Practice queue — decides WHICH questions a practice session shows.
 *
 * Priority order (best for learning):
 *   1. Questions you have never seen (new material)
 *   2. Questions you got wrong last time (fix the gaps)
 *   3. Everything else (keep it fresh)
 */
import type { Difficulty, PackQuestion } from '../content/types';
import type { AnswerRecord } from './readiness';
import { shuffled, type Rng } from './random';

export interface PracticeFilter {
  domainId?: string;
  subtopic?: string;
  difficulty?: Difficulty;
}

export function filterPool(pool: PackQuestion[], f: PracticeFilter): PackQuestion[] {
  return pool.filter(
    (q) =>
      (!f.domainId || q.domainId === f.domainId) &&
      (!f.subtopic || q.subtopic === f.subtopic) &&
      (!f.difficulty || q.difficulty === f.difficulty),
  );
}

export function buildPracticeQueue(
  pool: PackQuestion[],
  answers: Record<string, AnswerRecord>,
  count: number,
  rng: Rng,
): string[] {
  const unseen: string[] = [];
  const wrong: string[] = [];
  const rest: string[] = [];
  for (const q of pool) {
    const rec = answers[q.id];
    if (!rec) unseen.push(q.id);
    else if (!rec.lastCorrect) wrong.push(q.id);
    else rest.push(q.id);
  }
  return [...shuffled(unseen, rng), ...shuffled(wrong, rng), ...shuffled(rest, rng)].slice(
    0,
    count,
  );
}
