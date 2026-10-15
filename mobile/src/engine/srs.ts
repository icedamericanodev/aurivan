/**
 * Spaced repetition (Leitner boxes) — a direct port of the web app's
 * review queue so learners get the same behaviour on mobile.
 *
 * Idea in plain English: every question you miss goes into Box 1 and is
 * due again immediately. Each time you answer it correctly (and you were
 * not just guessing), it moves up a box and comes back later:
 *   Box 1 → now, Box 2 → 1 day, Box 3 → 3 days, Box 4 → 7 days, Box 5 → 16 days.
 * Answer it correctly from Box 5 and it "graduates" out of the queue.
 *
 * A correct first answer marked "guessing" or "unsure" also enters the queue
 * (Box 1 or Box 2, due tomorrow), so lucky guesses are re-tested.
 *
 * Coach me (assisted answers): a right answer after a hint is real progress,
 * but it is weaker evidence, so it does NOT move the question up a box. It
 * stays in its box and comes back after that box's (shorter) interval.
 *
 * Retest rule (mobile 1.24): a RIGHT answer to a question you got WRONG
 * less than RETEST_WINDOW_MS (4 hours) earlier is a "retest". A right
 * answer minutes after reading the explanation is working memory, not
 * remembering, so it earns no spacing credit: the box stays, and the
 * question is due at the start of the next local day at the earliest.
 * Only a miss re-answered soon counts: a right answer after a RIGHT answer
 * is a normal answer (full credit, normal promotion). A WRONG retest still
 * counts in full (honesty is asymmetric: it falls back to Box 1 like any
 * miss). Because a right retest leaves the last answer right, the window
 * never slides on: the next answer to that question is a normal one.
 */
export type Confidence = 'sure' | 'unsure' | 'guessing';

export interface ReviewEntry {
  box: number; // 1..MAX_BOX
  dueAt: number; // epoch ms
  lastSeen: number; // epoch ms
  reps: number; // how many times it was reviewed
}

/**
 * The most due reviews one session asks (Today's plan item and the Spaced
 * review row both start a session of at most this many). The rest wait for
 * the next session; the screens say so in one line (REVIEW_CAP_LINE).
 */
export const REVIEW_SESSION_CAP = 20;
/**
 * One plain line explaining the cap, used on Today, Practice and You, always
 * beside the full due count ("55 due"): one phrasing for one thing (1.8).
 */
export const REVIEW_CAP_LINE = `${REVIEW_SESSION_CAP} at a time, most overdue first`;

/** The trailing unit for the review queue count: one word everywhere ("55 due"). */
export const REVIEW_UNIT = 'due';

export const INTERVAL_DAYS: Record<number, number> = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 16 };

/** A re-answer sooner than this after the previous answer to the same question is a retest. */
export const RETEST_WINDOW_MS = 4 * 3_600_000;
/** The one line the answer screen shows after a right retest (nothing was promoted). */
export const RETEST_LINE = 'Back in your review tomorrow.';

/**
 * The time check alone: is `now` inside the 4-hour window after `prevAt`?
 * Strictly less than 4 hours counts (exactly 4 hours is a fresh try). No
 * previous answer, or a previous answer stamped LATER than this one (an
 * expired mock saved afterwards), is never inside it.
 */
export function isRetest(prevAt: number | undefined, now: number): boolean {
  if (prevAt === undefined) return false;
  const gap = now - prevAt;
  return gap >= 0 && gap < RETEST_WINDOW_MS;
}

/**
 * The full retest rule for a RIGHT answer given at `now`: the previous
 * answer to the same question was WRONG and less than 4 hours ago. A right
 * answer after a right answer is never a retest (it is a normal answer).
 */
export function isRetestAfterMiss(prev: { lastCorrect: boolean; lastAt: number } | undefined, now: number): boolean {
  return prev !== undefined && prev.lastCorrect === false && isRetest(prev.lastAt, now);
}

/**
 * The start of the next local day (midnight), as epoch ms. Plain Date maths,
 * so the engine stays pure; setHours(24) is DST-safe.
 */
export function startOfNextDay(now: number): number {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}
export const MAX_BOX = 5;
export const DAY_MS = 86_400_000;

/**
 * Work out the new review entry after an answer.
 * Returns `null` when the question should NOT be in the queue
 * (never missed and answered with confidence, or just graduated).
 * `assisted` = answered after Coach me: a correct answer is re-spaced at the
 * same box instead of promoted, so it comes back sooner.
 */
export function nextReview(
  current: ReviewEntry | undefined,
  correct: boolean,
  confidence: Confidence | undefined,
  now: number,
  assisted = false,
  retest = false,
): ReviewEntry | null {
  if (!correct) {
    // Wrong → back to Box 1, due right away. (A wrong retest counts in full.)
    return { box: 1, dueAt: now, lastSeen: now, reps: (current?.reps ?? 0) + 1 };
  }
  if (retest) {
    // A right answer minutes after a MISS: no promotion, and not due again
    // before the start of tomorrow (local midnight, so it is in tomorrow's
    // plan, as the answer screen promises). The miss normally queued it
    // already; if it did not (a mock saves without scheduling), it joins
    // Box 1 now, so "Back in your review tomorrow." is always true.
    const tomorrow = startOfNextDay(now);
    if (current) return { ...current, dueAt: Math.max(current.dueAt, tomorrow), lastSeen: now, reps: current.reps + 1 };
    return { box: 1, dueAt: tomorrow, lastSeen: now, reps: 1 };
  }
  if (!current) {
    // First time in the queue. A confident correct answer needs no review.
    // But a lucky guess, or a shaky "unsure" hit, is weak evidence: bring it
    // back so it is re-tested (re-testing low-confidence correct answers
    // improves retention). Guess → Box 1, unsure → Box 2; both due
    // tomorrow, never right now (the learner has just seen the answer).
    if (confidence === 'guessing') return { box: 1, dueAt: now + DAY_MS, lastSeen: now, reps: 1 };
    if (confidence === 'unsure') return { box: 2, dueAt: now + INTERVAL_DAYS[2] * DAY_MS, lastSeen: now, reps: 1 };
    return null;
  }

  if (confidence === 'guessing' || assisted) {
    // A lucky guess, or a right answer after a hint, does not earn a
    // promotion — re-space at the same box (a shorter wait than promoting).
    return {
      ...current,
      dueAt: now + INTERVAL_DAYS[current.box] * DAY_MS,
      lastSeen: now,
      reps: current.reps + 1,
    };
  }
  if (current.box >= MAX_BOX) return null; // graduated 🎓

  const box = current.box + 1;
  return { box, dueAt: now + INTERVAL_DAYS[box] * DAY_MS, lastSeen: now, reps: current.reps + 1 };
}

/**
 * When spaced review next has questions, for the "all caught up" screen
 * (mobile 1.9): the first moment something falls due after `now`, and how
 * many of the learner's own questions fall due by the end of that local
 * day. Null when nothing is scheduled. `exists` drops ids the bank no
 * longer has (a review session skips those too, so they are never promised).
 */
export function upcomingReview(
  review: Record<string, ReviewEntry>,
  now: number,
  exists: (id: string) => boolean = () => true,
): { at: number; count: number } | null {
  const future = Object.entries(review)
    .filter(([id]) => exists(id))
    .map(([, r]) => r.dueAt)
    .filter((t) => t > now);
  if (future.length === 0) return null;
  const at = Math.min(...future);
  const end = new Date(at);
  end.setHours(23, 59, 59, 999);
  return { at, count: future.filter((t) => t <= end.getTime()).length };
}

/**
 * "Next review: tomorrow · 6 questions" (later today / tomorrow / "16 Oct").
 * `dateOf` formats a far day ("16 Oct"); passed in so the engine stays free of UI helpers.
 */
export function upcomingReviewLine(next: { at: number; count: number }, now: number, dateOf: (ms: number) => string): string {
  const day = (ms: number) => {
    const d = new Date(ms);
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS;
  };
  const gap = day(next.at) - day(now);
  const when = gap <= 0 ? 'later today' : gap === 1 ? 'tomorrow' : dateOf(next.at);
  return `Next review: ${when} · ${next.count} ${next.count === 1 ? 'question' : 'questions'}`;
}

/** Question ids due now — most overdue first, then lowest box. `exists`: as in upcomingReview. */
export function dueIds(review: Record<string, ReviewEntry>, now: number, exists: (id: string) => boolean = () => true): string[] {
  return Object.keys(review)
    .filter((id) => review[id].dueAt <= now && exists(id))
    .sort((a, b) => review[a].dueAt - review[b].dueAt || review[a].box - review[b].box);
}

// Performance (1.15.x): each mounted tab counted the due reviews (a filter
// and a sort over the whole queue) after every answer. The count can only
// change when the queue changes (a new object: it is never mutated) or the
// clock passes the next review's due time, so it is shared until then.
const dueCounts = new WeakMap<Record<string, ReviewEntry>, WeakMap<(id: string) => boolean, { at: number; next: number; count: number }>>();
/** The default `exists`: every question counts. One function, so its counts are shared too. */
const everyQuestion = () => true;

/**
 * dueIds(review, now, exists).length, shared: the same queue object and the
 * same `exists` function (by identity: lib/outline.ts questionExists gives
 * one per certification) reuse the count while no review falls due between
 * the time it was counted and `now`. Exactly the same number as counting
 * again; a different `exists` is never given another one's count.
 */
export function dueCountFor(review: Record<string, ReviewEntry>, now: number, exists: (id: string) => boolean = everyQuestion): number {
  let byRule = dueCounts.get(review);
  if (!byRule) {
    byRule = new WeakMap();
    dueCounts.set(review, byRule);
  }
  const hit = byRule.get(exists);
  if (hit && now >= hit.at && now < hit.next) return hit.count;
  let count = 0;
  let next = Infinity;
  for (const id of Object.keys(review)) {
    const due = review[id].dueAt;
    if (due <= now) {
      if (exists(id)) count++;
    } else if (due < next) next = due;
  }
  byRule.set(exists, { at: now, next, count });
  return count;
}
