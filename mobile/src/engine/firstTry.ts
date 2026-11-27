/**
 * First-try readiness (docs/content/CIA_BANK_PLAN.md section 11, item 7).
 *
 * Plain English for the founder: a course can opt in with
 * `readinessRule: 'firstTry'` (content/types.ts). For such a course the app
 * keeps two small records, and reads readiness from them:
 *
 *   1. "Seen": a question is seen once it was shown in any mode. An answer
 *      record already says "answered". What had no record before is a
 *      question shown WITHOUT a counted try: skipped in a mock, left in a
 *      discarded mock, or answered in a game or as a relaxed sibling (those
 *      tries never count). `shown` keeps the EARLIEST time each of those was
 *      shown (CertProgress.shown, id → epoch ms).
 *   2. "First try": the first graded answer to a question
 *      (AnswerRecord.first: right or not, hinted or not, when). Written once,
 *      never overwritten, never for a game answer or a relaxed sibling.
 *
 * Readiness then counts, per section, the first tries that were: unhinted,
 * at a question NOT seen before that try, and at a question that is on the
 * exam today (`testableFrom`). Only the latest 50 per section count, so it
 * follows where the learner is now. It never shows a scaled score, a pass
 * mark or a "likely" anything: just "31 of 44 first tries right (70%)".
 *
 * No live course opts in, so none of this runs for CISA: its answers, saves
 * and readiness are exactly as before.
 *
 * Pure TypeScript: no React, no storage, no network.
 */
import type { Certification, PackQuestion } from '../content/types';
import { testableOn } from './blueprint';
import type { AnswerRecord, FirstTry } from './readiness';

/** id → the earliest time it was shown without a counted try (CertProgress.shown). */
export type Shown = Record<string, number>;

/** The latest first tries counted per section. */
export const FIRST_TRY_WINDOW = 50;
/** Below this many first tries in a section: no percent ("Too few to say yet"). */
export const FIRST_TRY_MIN = 10;
/** Below this many (and at least FIRST_TRY_MIN): the percent is marked "early read". */
export const FIRST_TRY_SETTLED = 30;
/** The note on a section with no unseen question left (curly apostrophes, like the rest of the app). */
export const MET_EVERY_LINE = 'You’ve met every question here; this won’t change.';
/** What is added to a section's line while it rests on 10 to 29 first tries. */
export const EARLY_READ = 'early read';

/** True when this course reads readiness from first tries (opt-in; no live course does). */
export function isFirstTryCourse(cert: Pick<Certification, 'readinessRule'> | null | undefined): boolean {
  return cert?.readinessRule === 'firstTry';
}

/**
 * `shown` with each of `ids` noted as shown at `at`: the earliest time is
 * kept. An id that already has a first try is skipped (a later sight cannot
 * change that try). The very same object comes back when nothing changed,
 * so the store saves nothing.
 */
export function withShown(shown: Shown | undefined, ids: readonly string[], at: number, answers: Readonly<Record<string, AnswerRecord>> = {}): Shown | undefined {
  let next: Shown | undefined;
  for (const id of ids) {
    if (answers[id]?.first) continue;
    const had = (next ?? shown)?.[id];
    if (had !== undefined && had <= at) continue;
    next ??= { ...shown };
    next[id] = at;
  }
  return next ?? shown;
}

/** What one answer does to the two records, for an opted-in course. */
export interface FirstTryUpdate {
  /** The record's `first`: the old one kept, a new one, or none. */
  first?: FirstTry;
  /** The course's `shown` (the same object when unchanged). */
  shown: Shown | undefined;
}

/**
 * One answer, for an opted-in course (store/progress.ts recordAnswer):
 * - a first try already written stays exactly as it is (write-once);
 * - a game answer or a relaxed sibling's answer writes no first try, but the
 *   question is now seen (`shown`), so a later first try at it never counts;
 * - otherwise this answer IS the first try.
 */
export function firstTryUpdate(
  prev: AnswerRecord | undefined,
  shown: Shown | undefined,
  id: string,
  a: { correct: boolean; assisted: boolean; at: number; game: boolean; sibling: boolean },
): FirstTryUpdate {
  if (prev?.first) return { first: prev.first, shown };
  if (a.game || a.sibling) return { shown: withShown(shown, [id], a.at) };
  return { first: { correct: a.correct, assisted: a.assisted, at: a.at }, shown };
}

/** True when the question was shown in any mode: answered (any answer) or in `shown`. */
export function seenBy(answers: Readonly<Record<string, AnswerRecord>>, shown: Shown | undefined): (id: string) => boolean {
  return (id) => answers[id] !== undefined || shown?.[id] !== undefined;
}

/** One section's first-try reading. */
export interface FirstTrySection {
  domainId: string;
  /** First tries counted (at most FIRST_TRY_WINDOW). */
  firstTries: number;
  /** How many of them were right. */
  right: number;
  /** Whole percent, or null under FIRST_TRY_MIN first tries. */
  percent: number | null;
  /** True for 10 to 29 first tries: the percent is an early read. */
  early: boolean;
  /** True when every question of this section on the exam today has been seen. */
  metAll: boolean;
  /** "31 of 44 first tries right (70%)", "… (60%) · early read" or "Too few to say yet (6 answered)". */
  label: string;
  /** MET_EVERY_LINE when `metAll`, else nothing. */
  note?: string;
}

/** The line for one section: never a scaled score, a pass mark or "likely". */
export function firstTryLabel(firstTries: number, right: number): string {
  if (firstTries < FIRST_TRY_MIN) return `Too few to say yet (${firstTries} answered)`;
  const pct = Math.round((right / firstTries) * 100);
  const line = `${right} of ${firstTries} first tries right (${pct}%)`;
  return firstTries < FIRST_TRY_SETTLED ? `${line} · ${EARLY_READ}` : line;
}

/**
 * First-try readiness, section by section in the course's order.
 *
 * Counts a question's first try when: it was not hinted; the question was
 * not seen before it (no `shown` time earlier than the try); and the question
 * is in the pack, not retired, and on the exam `today` ("YYYY-MM-DD",
 * testableOn). Game answers and relaxed siblings never wrote a first try, so
 * they are never counted. The latest FIRST_TRY_WINDOW per section count.
 *
 * `questions`: the course's pack, retired questions included or not (a
 * retired one is left out either way).
 */
export function firstTryReadiness(
  cert: Pick<Certification, 'domains'>,
  questions: readonly PackQuestion[],
  answers: Readonly<Record<string, AnswerRecord>>,
  shown: Shown | undefined,
  today: string,
): FirstTrySection[] {
  const live = new Map<string, PackQuestion>();
  for (const q of questions) if (!q.retired && testableOn(q, today)) live.set(q.id, q);
  // Each section's counted first tries.
  const tries = new Map<string, FirstTry[]>();
  for (const [id, rec] of Object.entries(answers)) {
    const f = rec.first;
    const q = live.get(id);
    if (!f || !q || f.assisted) continue;
    const seenAt = shown?.[id];
    if (seenAt !== undefined && seenAt < f.at) continue;
    const list = tries.get(q.domainId) ?? [];
    list.push(f);
    tries.set(q.domainId, list);
  }
  // Each section: is anything on the exam today still unseen?
  const seen = seenBy(answers, shown);
  const unseenLeft = new Set<string>();
  const hasAny = new Set<string>();
  for (const q of live.values()) {
    hasAny.add(q.domainId);
    if (!seen(q.id)) unseenLeft.add(q.domainId);
  }
  return cert.domains.map((d) => {
    // Newest first, then the window. Ties keep a stable order (by the try itself).
    const latest = (tries.get(d.id) ?? []).sort((a, b) => b.at - a.at).slice(0, FIRST_TRY_WINDOW);
    const firstTries = latest.length;
    const right = latest.filter((f) => f.correct).length;
    const metAll = hasAny.has(d.id) && !unseenLeft.has(d.id);
    return {
      domainId: d.id,
      firstTries,
      right,
      percent: firstTries >= FIRST_TRY_MIN ? Math.round((right / firstTries) * 100) : null,
      early: firstTries >= FIRST_TRY_MIN && firstTries < FIRST_TRY_SETTLED,
      metAll,
      label: firstTryLabel(firstTries, right),
      ...(metAll ? { note: MET_EVERY_LINE } : {}),
    };
  });
}
