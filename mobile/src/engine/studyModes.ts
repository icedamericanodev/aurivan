/**
 * Study modes (Build E, "Choose your path") — the names, the one-line
 * "why" for each, the suggestion by journey stage, and the two simplest
 * pickers: Random and "Practice this topic".
 *
 * Plain English for the founder:
 * - Four modes, each works with any domain or "All domains":
 *   Smart (engine/smartMix.ts), Guided and In order (engine/studyPath.ts),
 *   and Random (here).
 * - The app SUGGESTS a mode from the learner's stage (diagnose → Random,
 *   learn → Guided, later stages → Smart). Once the learner picks one, their
 *   choice always wins (settings `studyMode`).
 * - Never show the bank size: nothing here produces a total.
 *
 * Pure TypeScript: no React, no storage.
 */
import type { PackQuestion } from '../content/types';
import type { Stage } from './journey';
import { shuffled, type Rng } from './random';

export type StudyMode = 'smart' | 'guided' | 'inOrder' | 'random';
/** Display order in the mode picker. */
export const STUDY_MODES: StudyMode[] = ['smart', 'guided', 'inOrder', 'random'];

export const MODE_INFO: Record<StudyMode, { name: string; why: string }> = {
  smart: { name: 'Smart', why: 'Picks what you need next: reviews due, weak spots, new and refreshers.' },
  guided: { name: 'Guided', why: 'Follows your Learn path: a topic’s lesson, 5 questions, then a quick mix.' },
  inOrder: { name: 'In order', why: 'Topic by topic, with a quick mixed review at the end.' },
  random: { name: 'Random', why: 'A mix like the real exam.' },
};

/** Session sizes offered by the picker (Guided has its own fixed step). */
export const SESSION_SIZES = [10, 20, 50] as const;
export type SessionSize = (typeof SESSION_SIZES)[number];
export const DEFAULT_SIZE: SessionSize = 10;

/** The size the learner last chose, or the nearest offered one (a restored or odd value). */
export function sessionSize(n: number | undefined): SessionSize {
  if (n === undefined || !Number.isFinite(n)) return DEFAULT_SIZE;
  return SESSION_SIZES.reduce((best, s) => (Math.abs(s - n) < Math.abs(best - n) ? s : best), SESSION_SIZES[0] as SessionSize);
}

/** The mode the app suggests for a journey stage (behavioural review §3). */
export function suggestedMode(stage: Stage): StudyMode {
  if (stage === 'diagnose') return 'random';
  if (stage === 'learn') return 'guided';
  return 'smart';
}

/** The mode to use: the learner's saved choice wins; otherwise the stage's suggestion. */
export function activeMode(saved: StudyMode | undefined, stage: Stage): StudyMode {
  return saved && STUDY_MODES.includes(saved) ? saved : suggestedMode(stage);
}

/** The scope key a resumable path is saved under: a domain id, or "all". */
export function scopeKey(domainId?: string): string {
  return domainId ?? 'all';
}

/**
 * Why a question is in the session. Smart shows Due / Weak spot / New /
 * Refresher; In order and Guided tag their review tail "Mixed review".
 */
export type PathReason = 'due' | 'weak' | 'new' | 'refresher' | 'mixed';
export const REASON_LABEL: Record<PathReason, string> = {
  due: 'Due',
  weak: 'Weak spot',
  new: 'New',
  refresher: 'Refresher',
  mixed: 'Mixed review',
};

export interface PathItem {
  id: string;
  reason?: PathReason;
}

/**
 * Random: across the chosen domains, weighted by the blueprint. Each slot
 * first picks a domain in proportion to its exam weight (among domains that
 * still have questions), then a random question from it. Questions already
 * seen are included, like the real exam.
 */
export function randomMix(pool: PackQuestion[], weights: Record<string, number>, count: number, rng: Rng): PathItem[] {
  const byDomain = new Map<string, PackQuestion[]>();
  for (const q of shuffled(pool, rng)) {
    const list = byDomain.get(q.domainId);
    if (list) list.push(q);
    else byDomain.set(q.domainId, [q]);
  }
  const out: PathItem[] = [];
  while (out.length < count) {
    const open = [...byDomain.entries()].filter(([, l]) => l.length > 0);
    if (!open.length) break;
    // A domain the blueprint doesn't weigh still gets a tiny share, never zero.
    const w = open.map(([d]) => Math.max(weights[d] ?? 0, 0.01));
    const total = w.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    let k = 0;
    while (k < open.length - 1 && r >= w[k]) r -= w[k++];
    out.push({ id: open[k][1].pop()!.id });
  }
  return out;
}

/** The most questions "Practice this topic" puts in one session. */
export const TOPIC_CAP = 20;

/**
 * "Practice this topic": the topic's subtopics' questions, INTERLEAVED, so
 * two neighbours come from different subtopics wherever possible. Each
 * subtopic's list is shuffled, the subtopics take turns in a shuffled
 * order, and the result is capped.
 */
export function interleaveTopic(subtopicQuestionIds: string[][], rng: Rng, cap = TOPIC_CAP): string[] {
  const lists = shuffled(
    subtopicQuestionIds.map((l) => shuffled(l, rng)).filter((l) => l.length > 0),
    rng,
  );
  const out: string[] = [];
  const seen = new Set<string>();
  for (let round = 0; out.length < cap && lists.some((l) => l.length > round); round++) {
    for (const l of lists) {
      const id = l[round];
      if (id === undefined || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
      if (out.length >= cap) break;
    }
  }
  return out;
}
