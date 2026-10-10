/**
 * Guided and In order — the two "walk the outline" study modes (Build E).
 *
 * Plain English for the founder:
 *
 * GUIDED (the suggested mode while learning; it follows the Learn path).
 * Each step is about ONE outline topic (e.g. "4B1"):
 *   1. read the topic's lesson (or its study notes when it has no lesson);
 *   2. answer 5 questions on that topic, foundational first, then application;
 *   3. answer 3 questions mixed in from topics already done (retrieval).
 * A topic is "clear" when its lesson is done AND 4 of the learner's last 5
 * unassisted answers on that topic are right. The next topic is NEVER
 * locked: "Next topic" always works; an uncleared topic simply stays a weak
 * spot for Smart.
 *
 * IN ORDER (topic by topic; resumable).
 * Walks the outline in order within the chosen domain(s) and remembers the
 * last question answered, so the next session carries on from there. Every
 * session ENDS with a short mixed review tail (2 questions, 3 from 20 up)
 * from earlier topics: pure blocked practice feels effective but isn't
 * (Kornell & Bjork 2008).
 *
 * Pure TypeScript: no React, no storage.
 */
import type { Difficulty, PackQuestion } from '../content/types';
import { topicQuestionIds, type OutlineTopic } from './outline';
import { shuffled, type Rng } from './random';
import type { AnswerRecord } from './readiness';
import type { PathItem } from './studyModes';

// ── Guided ───────────────────────────────────────────────────────────────

export const GUIDED_BLOCK = 5;
export const GUIDED_TAIL = 3;
/** Topic clear: at least this many right among the last CLEAR_OF unassisted answers. */
export const CLEAR_RIGHT = 4;
export const CLEAR_OF = 5;
/** Of the 5 blocked questions, up to this many are foundational (the rest application or harder). */
export const GUIDED_FOUNDATIONAL = 2;

const DIFF_RANK: Record<Difficulty, number> = { foundational: 0, application: 1, analysis: 2 };

/**
 * Step 1 is done: the topic's lesson is done when it has one; otherwise
 * every one of its study notes is marked read.
 */
export function topicStudied(topic: OutlineTopic, lessonIds: readonly string[], lessonsDone: readonly string[], notesRead: readonly string[]): boolean {
  if (lessonIds.length > 0) return lessonIds.some((id) => lessonsDone.includes(id));
  return topic.subtopics.length > 0 && topic.subtopics.every((s) => notesRead.includes(s.id));
}

/**
 * The learner's most recent UNASSISTED answers on these questions, newest
 * first (true = right). Each question counts its last answer; an answer
 * given after Coach me is left out.
 */
export function lastUnassisted(questionIds: readonly string[], answers: Record<string, AnswerRecord>, n = CLEAR_OF): boolean[] {
  return questionIds
    .map((id) => answers[id])
    .filter((r): r is AnswerRecord => Boolean(r) && !r.lastAssisted)
    .sort((a, b) => b.lastAt - a.lastAt)
    .slice(0, n)
    .map((r) => r.lastCorrect);
}

/** How the topic is doing: studied, right answers among the last 5, and clear. */
export function topicStatus(topic: OutlineTopic, studied: boolean, answers: Record<string, AnswerRecord>) {
  const last = lastUnassisted(topicQuestionIds(topic), answers);
  const right = last.filter(Boolean).length;
  return { studied, answered: last.length, right, clear: studied && right >= CLEAR_RIGHT };
}

/**
 * The topic Guided is on: from the saved cursor (or the start), the first
 * topic that isn't clear yet. When every topic from there on is clear, the
 * first uncleared one from the start; when all are clear, the cursor's topic.
 */
export function currentGuidedTopic(topics: OutlineTopic[], cursor: string | undefined, isClear: (t: OutlineTopic) => boolean): OutlineTopic | undefined {
  if (!topics.length) return undefined;
  const from = Math.max(0, topics.findIndex((t) => t.id === cursor));
  for (let k = from; k < topics.length; k++) if (!isClear(topics[k])) return topics[k];
  for (let k = 0; k < from; k++) if (!isClear(topics[k])) return topics[k];
  return topics[from];
}

/** The topic after this one (wraps to the first), for "Next topic". Never gated on a score. */
export function nextTopic(topics: OutlineTopic[], current: OutlineTopic | undefined): OutlineTopic | undefined {
  if (!topics.length) return undefined;
  const k = current ? topics.findIndex((t) => t.id === current.id) : -1;
  return topics[(k + 1) % topics.length];
}

/**
 * The 5 blocked questions for a topic: up to 2 foundational, the rest
 * application (or analysis), topped up from whatever is left; questions the
 * learner hasn't got right yet come first. Shown foundational first.
 */
export function blockedQuestions(topic: OutlineTopic, find: (id: string) => PackQuestion | undefined, answers: Record<string, AnswerRecord>, rng: Rng, size = GUIDED_BLOCK): string[] {
  const qs = shuffled(
    topicQuestionIds(topic)
      .map(find)
      .filter((q): q is PackQuestion => Boolean(q)),
    rng,
  );
  // Not right yet (wrong, then unseen) before questions already answered right.
  const need = (q: PackQuestion) => (answers[q.id] ? (answers[q.id].lastCorrect ? 2 : 0) : 1);
  qs.sort((a, b) => need(a) - need(b));
  // The quota first takes questions not yet answered right; questions
  // already right only top the step up when the topic has nothing else.
  const open = qs.filter((q) => need(q) < 2);
  const found = open.filter((q) => q.difficulty === 'foundational').slice(0, GUIDED_FOUNDATIONAL);
  const harder = open.filter((q) => q.difficulty !== 'foundational').slice(0, size - found.length);
  const pick = [...found, ...harder];
  for (const q of qs) {
    if (pick.length >= size) break;
    if (!pick.includes(q)) pick.push(q);
  }
  return pick
    .slice(0, size)
    .sort((a, b) => DIFF_RANK[a.difficulty] - DIFF_RANK[b.difficulty])
    .map((q) => q.id);
}

/**
 * The mixed tail: `size` questions from EARLIER topics, each from a
 * different topic where possible (interleaved), preferring questions the
 * learner has answered before (retrieval of what was studied), wrong first.
 */
export function mixedTail(earlier: OutlineTopic[], exclude: ReadonlySet<string>, answers: Record<string, AnswerRecord>, rng: Rng, size: number): string[] {
  const rank = (id: string) => (answers[id] ? (answers[id].lastCorrect ? 1 : 0) : 2);
  const lists = shuffled(earlier, rng)
    .map((t) => shuffled(topicQuestionIds(t).filter((id) => !exclude.has(id)), rng).sort((a, b) => rank(a) - rank(b)))
    .filter((l) => l.length > 0);
  const out: string[] = [];
  for (let round = 0; out.length < size && lists.some((l) => l.length > round); round++) {
    for (const l of lists) {
      if (out.length >= size) break;
      if (l[round] !== undefined && !out.includes(l[round])) out.push(l[round]);
    }
  }
  return out;
}

/** One Guided step's questions: 5 on the topic, then 3 mixed from topics before it. */
export function guidedStep(
  topics: OutlineTopic[],
  topic: OutlineTopic,
  find: (id: string) => PackQuestion | undefined,
  answers: Record<string, AnswerRecord>,
  rng: Rng,
): PathItem[] {
  const block = blockedQuestions(topic, find, answers, rng);
  const before = topics.slice(0, Math.max(0, topics.findIndex((t) => t.id === topic.id)));
  const tail = mixedTail(before, new Set(block), answers, rng, GUIDED_TAIL).filter((id) => find(id));
  return [...block.map((id) => ({ id })), ...tail.map((id) => ({ id, reason: 'mixed' as const }))];
}

// ── In order ─────────────────────────────────────────────────────────────

/** The mixed tail's length: 2 questions, 3 for a session of 20 or more. */
export function tailSize(count: number): number {
  return count >= 20 ? 3 : 2;
}

export interface WalkItem {
  id: string;
  topicId: string;
}

/** The outline as one ordered walk of questions (only ones that still exist). */
export function walkOrder(topics: OutlineTopic[], exists: (id: string) => boolean): WalkItem[] {
  return topics.flatMap((t) => topicQuestionIds(t).filter(exists).map((id) => ({ id, topicId: t.id })));
}

/**
 * One In order session: the next questions along the walk after `cursor`
 * (the last walk question answered; none or unknown = the start, and the
 * walk wraps round at the end), then the mixed tail.
 *
 * Tail sources, in order: topics BEFORE where this session starts; on the
 * very first pass (nothing before), topics of this session other than its
 * last; failing that, any other topic in scope. So every session ends mixed.
 */
export function inOrderSession(
  topics: OutlineTopic[],
  walk: WalkItem[],
  cursor: string | undefined,
  count: number,
  answers: Record<string, AnswerRecord>,
  rng: Rng,
): PathItem[] {
  if (!walk.length) return [];
  const tailN = Math.min(tailSize(count), Math.max(0, count - 1));
  const steps = Math.min(count - tailN, walk.length);
  const start = (walk.findIndex((w) => w.id === cursor) + 1) % walk.length;
  const main: WalkItem[] = [];
  for (let k = 0; k < steps; k++) main.push(walk[(start + k) % walk.length]);
  const inSession = new Set(main.map((w) => w.id));
  const lastTopic = main[main.length - 1]?.topicId;
  const walkedTopics = new Set(main.map((w) => w.topicId));
  // Topic ids before the start, in walk order (none on a session that starts at the very beginning).
  const beforeIds = new Set(walk.slice(0, start).map((w) => w.topicId));
  const pick = (pred: (t: OutlineTopic) => boolean) => mixedTail(topics.filter(pred), inSession, answers, rng, tailN);
  let tail = pick((t) => beforeIds.has(t.id) && t.id !== lastTopic);
  if (tail.length < tailN) tail = [...tail, ...pick((t) => walkedTopics.has(t.id) && t.id !== lastTopic && !beforeIds.has(t.id))].slice(0, tailN);
  if (tail.length < tailN) {
    const have = new Set([...inSession, ...tail]);
    tail = [...tail, ...mixedTail(topics.filter((t) => t.id !== lastTopic), have, answers, rng, tailN - tail.length)];
  }
  const exists = new Set(walk.map((w) => w.id));
  return [...main.map((w) => ({ id: w.id })), ...tail.filter((id) => exists.has(id)).map((id) => ({ id, reason: 'mixed' as const }))];
}
