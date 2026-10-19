/**
 * Today's plan — a short, achievable list built from the learner's real
 * situation: reviews due, the weakest high-weight domain, lessons not yet
 * done, and how close the exam is. Never more than 4 items: one screen,
 * one clear next step, no guilt.
 *
 * Mobile 1.15 (PHASE5.md §2.3): the plan is sized in MINUTES, to the time
 * the learner said they have most days (B). It may run a little over (the
 * tolerance T = 15% of B, at least 2 minutes), never more. A mock is the one
 * exception: it is planned at most once a week and says it is longer.
 *
 *   1. Reviews first, when any are due (spacing is the cheapest win), sized
 *      to about half the day: B=10 → 5 · 20 → 8 · 30 → 12 · 45 → 18.
 *   2. Then the stage's items, in order, while they fit in what is left.
 *   3. Time left, and reviews cut below what is due? The reviews grow into it.
 *
 * And by where the learner is starting from (engine/fit.ts):
 *   - `new`: from day 2 it teaches before it tests: the next lesson + a few questions on it
 *     (day 1 is the first set for everyone, see the end of this comment).
 *   - `experienced` (or Exam-focused switched on): no lessons; weak spots
 *     lead, with an optional mini mock once a week.
 *
 * A mini mock never leads the plan: it sits right after the first timed
 * item, and the day clears without it (dayPlan.ts isOptional).
 *
 * Mobile 1.16, exam week (PHASE5.md §3.2): a calm taper.
 *   - 7, 6, 5 days out: reviews, a top-up on the focus domain, and ONE
 *     optional full mock, only when none was taken in the last 14 days and
 *     the first 20 answers are done ("a last long rehearsal; skip it if you'd
 *     rather rest"). Exempt from the budget, like every mock.
 *   - 4, 3, 2 days out: no mock; the day is sized to min(minutes, 20).
 *   - The eve and the exam day are unchanged.
 *
 * Mobile 1.24, "first five minutes": Day 1 is ONE item, the first set (the
 * same five questions for everyone, no lesson before it, no timer). Those
 * five answers count toward the 20 that end the first stage, which then
 * finishes inside ordinary plans on days 2 and 3. Nothing on screen says
 * "check" or "diagnose".
 */
import { GAMES, gameMinutes, type GameId } from './games/registry';
import { DEFAULT_MINUTES, examFocusedOf, planTolerance, questionsFor, type Familiarity } from './fit';
import type { Stage } from './journey';
import { MINUTES_PER_QUESTION } from './pace';
import { REVIEW_SESSION_CAP } from './srs';
import { dayKey, daysBetween } from './streak';

/** A game's plan label: its registry name and honest length (e.g. "Snare Spotter · 6 min"). */
const gameItem = (gameId: GameId): PlanItem => ({ kind: 'game', gameId, label: `${GAMES[gameId].name} · ${GAMES[gameId].minutes} min` });

/**
 * Why a practice item is in the plan (its meta line says so). Optional:
 * older saved plans have none and read as "new material first".
 *   check: the rest of the first 20 answers (Day 2 and 3; the word never shows) · learn: right after a lesson
 *   weak: Exam-focused weak spots · topup: exam week's light top-up on the focus domain (mobile 1.16)
 *   first: Day 1's first set, the same five questions for everyone (mobile 1.24)
 */
export type PracticeWhy = 'check' | 'learn' | 'weak' | 'topup' | 'first';

export type PlanItem =
  /** `label` is optional: older saved plans have none, and Today then says "Review N due". */
  /**
   * `due`: the whole queue when more were due than today's count (mobile
   * 1.15: also when the day's budget, not the session cap, cut it), so Today
   * says "Review 55 due · 8 today". `capped`: the older shape (more than one
   * session's 20 were due); kept so saved plans read the same.
   */
  | { kind: 'review'; count: number; label?: string; capped?: boolean; due?: number }
  /** `minutes`: the lesson's own length (mobile 1.15). Older saves have none: LESSON_MINUTES. */
  | { kind: 'lesson'; lessonId: string; title: string; minutes?: number }
  | { kind: 'practice'; domainId?: string; count: number; label: string; why?: PracticeWhy }
  /** `label` is saved with the day's plan; screens show the registry name, so old labels never show an old name. */
  | { kind: 'game'; gameId: GameId; label: string }
  /**
   * `minutes`: the mock's time at exam pace (mobile 1.15). Older saves have none: EXAM_MINUTES_PER_QUESTION.
   * `why: 'final'`: exam week's last long rehearsal (mobile 1.16); optional, older saves have none.
   */
  | { kind: 'mock'; questions: number; label: string; minutes?: number; why?: 'final' };

export interface PlanInput {
  stage: Stage;
  dueReviews: number;
  /** The minutes the learner has most days (engine/fit.ts DAILY_MINUTES). */
  dailyMinutes: number;
  /** Where the learner is starting from; unset = not asked or skipped (reads as `some`). */
  familiarity?: Familiarity;
  /** The learner's explicit Exam-focused choice; unset = follow familiarity (fit.ts examFocusedOf). */
  examFocused?: boolean;
  /** Questions answered so far: 0 means Day 1 (the first set); it also sizes the rest of the first 20 (DIAGNOSTIC_SIZE). */
  answered?: number;
  focusDomain?: { id: string; short: string };
  /** The lesson to offer (already chosen: fit.ts planLesson), with its length and domain. */
  nextLesson?: { id: string; title: string; minutes?: number; domainId?: string; domainShort?: string };
  /** When the last mock (any size) finished; null = never. */
  lastMockAt?: number | null;
  /** When the last FULL mock finished; null = never (exam week's full mock, mobile 1.16). */
  lastFullMockAt?: number | null;
  /** Now (ms), for the once-a-week mock rule. Optional: the clock's now. */
  now?: number;
  daysLeft: number | null;
  /**
   * The cert has a final review week (content/exam). Its day 7 is a full
   * rehearsal, so the weekly mini mock also rests 8 days out: never two
   * mocks on back-to-back days (product call, QA review of the final week).
   */
  finalWeek?: boolean;
  examQuestions: number; // full mock length for this certification
  /** The exam's minutes (a mock's length at exam pace). Optional: EXAM_MINUTES_PER_QUESTION. */
  examMinutes?: number;
  /**
   * Whether a game has enough questions for this certification
   * (registry isPlayable). Optional: leaving it out treats every game as playable.
   */
  playable?: (id: GameId) => boolean;
}

/** The most the exam eve asks for: a light review, never a cram (and never more than the budget). */
export const EVE_MAX = 10;
/** Exam day: an optional warm-up only. */
export const WARM_UP = 5;
/** Questions answered before the first stage is done (journey.ts DIAGNOSTIC_SIZE). */
const CHECK_SIZE = 20;
/** The first set's length (content/firstSet.ts FIRST_SET_SIZE; kept here so the engine imports no content). */
export const FIRST_SET_COUNT = 5;
/** The first set's plan label (content/firstSet.ts FIRST_SET_TITLE). */
export const FIRST_SET_LABEL = 'Your first five';

/**
 * A plan label or session title saved by mobile 1.23, in today's words.
 * 1.23 called the mixed starting set "Starting check: 12 mixed questions",
 * and that text was saved in the day's plan AND as a paused session's title.
 * The learner never reads "check" now (mobile 1.24), so every place that shows
 * a saved title (Today's rows, Resume rows, the "Replace your unfinished
 * session?" alert, Results) passes it through here. Any other title is
 * returned as it is.
 */
export function legacyTitle(title: string): string {
  return /^Starting check\b/.test(title) ? 'Mixed practice' : title;
}
/** The most one planned practice item asks for. */
export const PRACTICE_MAX = 30;
/** The fewest questions worth a practice item (fewer than this and it waits). */
export const PRACTICE_MIN = 5;
/** A new learner's first questions on a lesson: a few, to try it, not a test. */
export const NEW_LEARNER_QUESTIONS = 5;
/** A mock is planned at most once in this many CALENDAR days (Monday's mock is due again next Monday). */
export const MOCK_GAP_DAYS = 7;
/** Exam week, 4 to 2 days out: the day is sized to at most this many minutes (a taper, never a cram). */
export const EXAM_WEEK_LIGHT_MINUTES = 20;
/** Exam week, 7 to 5 days out: a full mock is offered only when none was taken in this many calendar days. */
export const FULL_MOCK_GAP_DAYS = 14;
/** A new learner after day 1: a lesson and up to this many questions (UX review O4). */
export const NEW_LEARNER_MAX = 10;

/** A lesson's length when a saved plan item has none (1.15: 3 → 5, to match the lessons themselves). */
export const LESSON_MINUTES = 5;
/**
 * Exam pace in minutes per question, for a saved mock item with no minutes
 * (every ISACA exam: 240 minutes / 150 questions). A 50-question mini mock = 80.
 */
export const EXAM_MINUTES_PER_QUESTION = 1.6;

const studyMinutes = (count: number) => Math.max(1, Math.round(count * MINUTES_PER_QUESTION));
/** Questions that fit in `minutes` at study pace (no floor of 5). */
const fitting = (minutes: number) => Math.max(0, Math.floor(minutes / MINUTES_PER_QUESTION + 1e-9));

/** Rough minutes an item takes: study pace for questions, the lesson's own length, exam pace for a mock. */
export function itemMinutes(item: PlanItem): number {
  switch (item.kind) {
    case 'review':
    case 'practice':
      return studyMinutes(item.count);
    case 'mock':
      return item.minutes ?? Math.round(item.questions * EXAM_MINUTES_PER_QUESTION);
    case 'lesson':
      return item.minutes ?? LESSON_MINUTES;
    case 'game':
      // From the game's round size (engine/games/registry.ts), not a fixed guess.
      return gameMinutes(item.gameId);
  }
}

/** The minutes a plan asks for, leaving mocks out (they are exempt from the budget). */
export function planMinutes(items: readonly PlanItem[]): number {
  return items.reduce((n, i) => n + (i.kind === 'mock' ? 0 : itemMinutes(i)), 0);
}

function reviewItem(count: number, due: number, label?: string): PlanItem {
  return {
    kind: 'review',
    count,
    ...(label ? { label } : {}),
    // The whole queue when today's count is less, so Today can say "Review 55 due · 8 today".
    ...(due > count ? { due } : {}),
    ...(due > REVIEW_SESSION_CAP ? { capped: true } : {}),
  };
}

/** With a final review week, the weekly mini mock rests from this many days out (day 7's full mock follows). */
export const FINAL_WEEK_MOCK_REST = 8;

export function todaysPlan(p: PlanInput): PlanItem[] {
  // A missing or broken number plans the default day, never a NaN one.
  const minutes = Number.isFinite(p.dailyMinutes) ? Math.max(1, p.dailyMinutes) : DEFAULT_MINUTES;
  // Exam week tapers: from 4 days out, at most 20 minutes (mobile 1.16).
  const taper = p.stage === 'examDay' && p.daysLeft !== null && p.daysLeft >= 2 && p.daysLeft <= 4;
  const budget = taper ? Math.min(minutes, EXAM_WEEK_LIGHT_MINUTES) : minutes;
  const tol = planTolerance(budget);

  // The day before the exam and exam day are for rest, not cramming
  // (the eve card says "Rest tonight rather than cram"; the plan must agree).
  // Eve: ONE light item, due reviews if any, else practice. No game, no mock.
  if (p.daysLeft === 1) {
    const n = Math.min(EVE_MAX, questionsFor(budget));
    return p.dueReviews > 0
      ? [reviewItem(Math.min(p.dueReviews, n), p.dueReviews, `Light review · ${Math.min(p.dueReviews, n)} questions`)]
      : [{ kind: 'practice', count: n, label: `Light review · ${n} questions` }];
  }
  // Exam day: only an optional five-question warm-up.
  if (p.daysLeft === 0) {
    return [{ kind: 'practice', count: WARM_UP, label: `Optional warm-up · ${WARM_UP} questions` }];
  }
  if (p.stage === 'afterExam') return [];

  const focused = examFocusedOf(p);
  const plan: PlanItem[] = [];
  let used = 0;
  const left = () => budget - used;
  const add = (item: PlanItem) => {
    plan.push(item);
    if (item.kind !== 'mock') used += itemMinutes(item);
  };

  // 1. Spaced reviews first, when due: about half the day.
  // Exam week calls them what they are, as the eve does: "Light review · 8 questions" (UX review P6).
  const reviewLabel = (n: number) => (p.stage === 'examDay' ? `Light review · ${n} questions` : undefined);
  let review: Extract<PlanItem, { kind: 'review' }> | null = null;
  const reviewCap = Math.min(p.dueReviews, REVIEW_SESSION_CAP);
  if (p.dueReviews > 0) {
    const n = Math.min(reviewCap, Math.max(5, fitting((0.5 * budget))));
    review = reviewItem(n, p.dueReviews, reviewLabel(n)) as Extract<PlanItem, { kind: 'review' }>;
    add(review);
  }
  // 3 (the fill). Time left and reviews cut below what is due: they grow into it (spacing first).
  const fill = () => {
    if (!review || review.count >= reviewCap) return;
    const more = Math.min(reviewCap - review.count, fitting(left()));
    if (more <= 0) return;
    used -= itemMinutes(review);
    const grown = reviewItem(review.count + more, p.dueReviews, reviewLabel(review.count + more)) as Extract<PlanItem, { kind: 'review' }>;
    plan[plan.indexOf(review)] = grown;
    review = grown;
    used += itemMinutes(grown);
  };
  // Too little left for a real practice set: the reviews take it now, before a lesson or game could.
  if (left() < studyMinutes(PRACTICE_MIN)) fill();

  // 2. The stage's items, in order, while they fit.
  /** A sized practice item: as many questions as fit (5 to 30), or nothing when fewer than 5 fit. */
  const practice = (label: (n: number) => string, extra: { domainId?: string; why?: PracticeWhy } = {}, max = PRACTICE_MAX) => {
    const n = Math.min(max, PRACTICE_MAX, fitting(left()));
    if (n < PRACTICE_MIN) return;
    add({ kind: 'practice', count: n, label: label(n), ...(extra.domainId ? { domainId: extra.domainId } : {}), ...(extra.why ? { why: extra.why } : {}) });
  };
  /** A fixed-length item (a lesson, a game, 5 questions): added only when it fits, with the tolerance. */
  const fixed = (item: PlanItem) => {
    if (itemMinutes(item) <= left() + tol) add(item);
  };
  const game = (id: GameId) => {
    // A game is only planned when it can be played (small banks hide it).
    if (!p.playable || p.playable(id)) fixed(gameItem(id));
  };
  const lessonOf = (l: NonNullable<PlanInput['nextLesson']>): PlanItem => ({
    kind: 'lesson',
    lessonId: l.id,
    title: l.title,
    ...(l.minutes ? { minutes: l.minutes } : {}),
  });
  // Exam-focused plans never offer a lesson (they stay one tap away in Learn).
  const lesson = p.nextLesson && !focused ? p.nextLesson : undefined;
  const focusPractice = () =>
    practice((n) => (p.focusDomain ? `${n} questions · ${p.focusDomain.short}` : `${n} mixed questions`), { domainId: p.focusDomain?.id });
  // Calendar days, not hours (code review M1): a mock finished Monday evening
  // is due again next Monday morning, DST weeks included. Never in exam week
  // (with a final review week, not the day before it either: day 7 is a full mock).
  const mockDue =
    (p.daysLeft === null || p.daysLeft > (p.finalWeek ? FINAL_WEEK_MOCK_REST : 7)) &&
    (p.lastMockAt == null || daysBetween(dayKey(p.lastMockAt), dayKey(p.now ?? Date.now())) >= MOCK_GAP_DAYS);
  const miniMock = (): PlanItem => {
    const questions = Math.round(p.examQuestions / 3);
    const minutes = p.examMinutes ? Math.round((p.examMinutes / p.examQuestions) * questions) : Math.round(questions * EXAM_MINUTES_PER_QUESTION);
    return { kind: 'mock', questions, label: `Mini mock · ${questions} questions`, minutes };
  };
  // Exam week's one full rehearsal: none finished in the last 14 calendar days.
  const fullMockDue = () =>
    p.lastFullMockAt == null || daysBetween(dayKey(p.lastFullMockAt), dayKey(p.now ?? Date.now())) >= FULL_MOCK_GAP_DAYS;
  const fullMock = (): PlanItem => ({
    kind: 'mock',
    questions: p.examQuestions,
    label: `Full mock · ${p.examQuestions} questions`,
    minutes: p.examMinutes ?? Math.round(p.examQuestions * EXAM_MINUTES_PER_QUESTION),
    why: 'final',
  });
  const practiceStage = () => {
    if (focused) {
      // Leads with a mock (once a week) and the weak spots; no lessons.
      if (mockDue) add(miniMock());
      practice((n) => (p.focusDomain ? `Weak spots: ${p.focusDomain.short}` : `${n} mixed questions`), { domainId: p.focusDomain?.id, why: 'weak' });
      game('trap');
      return;
    }
    focusPractice();
    if (lesson) fixed(lessonOf(lesson));
    game('trap');
  };

  // Day 1 (mobile 1.24): nothing answered yet means the first set, alone. The same five
  // questions for everyone, no lesson before them. It replaces the stage rules, so a learner
  // who set up close to the exam gets it too (their stage is exam week, not the first).
  const firstDay = (p.answered ?? 0) === 0 && (p.stage === 'diagnose' || p.stage === 'examDay');
  const route = firstDay ? ('first' as const) : p.stage;

  switch (route) {
    case 'first':
      fixed({ kind: 'practice', count: FIRST_SET_COUNT, label: FIRST_SET_LABEL, why: 'first' });
      break;
    case 'diagnose':
      if (p.familiarity === 'new' && lesson) {
        // Teach before testing (worked examples first): the lesson, then a few questions on it.
        fixed(lessonOf(lesson));
        // Day 1 was the first set (above). From day 2 the questions grow to the minutes the
        // learner chose (up to 10, and never past the 20 that end this stage):
        // a 45-minute learner isn't left with 9 minutes a day (UX review O4).
        const answered = p.answered ?? 0;
        const count = Math.max(NEW_LEARNER_QUESTIONS, Math.min(NEW_LEARNER_MAX, fitting(left()), CHECK_SIZE - answered));
        const short = lesson.domainShort;
        fixed({
          kind: 'practice',
          count,
          label: short ? `${count} questions · ${short}` : `${count} questions`,
          ...(lesson.domainId ? { domainId: lesson.domainId } : {}),
          why: 'learn',
        });
      } else {
        // The rest of the first 20 answers, sized to the day (the first set was the first five).
        // The label is plain: the learner never reads "check" or "diagnose".
        const remaining = Math.max(PRACTICE_MIN, CHECK_SIZE - (p.answered ?? 0));
        practice((n) => `${n} mixed questions`, { why: 'check' }, remaining);
      }
      break;
    case 'learn':
      if (focused) {
        practiceStage();
        break;
      }
      if (lesson) fixed(lessonOf(lesson));
      focusPractice();
      break;
    case 'practice':
      practiceStage();
      break;
    case 'mock':
      // A mini mock (exempt from the budget), at most once a week; in a week
      // that already had one, the day is ordinary practice.
      if (mockDue) add(miniMock());
      else practiceStage();
      break;
    case 'ready':
      game('sprint');
      practice((n) => `${n} mixed questions to stay sharp`);
      break;
    case 'examDay': {
      // Exam week (mobile 1.16): reviews came first; then a light top-up on the
      // focus domain. Before the first 20 answers are done, the top-up is a mixed
      // set sized to the rest of them, and no full mock is offered.
      const answered = p.answered ?? 0;
      if (answered < CHECK_SIZE) practice((n) => `${n} mixed questions`, { why: 'check' }, Math.max(PRACTICE_MIN, CHECK_SIZE - answered));
      // From 4 days out the top-up stays light (at most 10), so a short game still fits.
      else practice((n) => (p.focusDomain ? `Top-up: ${p.focusDomain.short}` : `Top-up: ${n} mixed questions`), { domainId: p.focusDomain?.id, why: 'topup' }, taper ? EVE_MAX : PRACTICE_MAX);
      if (taper) game('priority');
      else if (answered >= CHECK_SIZE && fullMockDue()) add(fullMock());
      break;
    }
  }

  fill();
  // Never an empty day: a short mixed set that fits. Exam week's optional
  // full rehearsal never stands alone either: it is an extra, not the day.
  if (plan.every((i) => i.kind === 'mock' && i.why === 'final')) plan.unshift({ kind: 'practice', count: questionsFor(budget), label: `${questionsFor(budget)} mixed questions` });
  // A mock never leads (UX review P2, decided): it goes right after the first
  // timed item, so the hero matches "About N min today". It stays optional,
  // and its row says how long it is.
  const m = plan.findIndex((i) => i.kind === 'mock');
  const t = plan.findIndex((i) => i.kind !== 'mock');
  if (m === 0 && t > 0) plan.splice(t, 0, ...plan.splice(0, 1));
  return plan.slice(0, 4);
}
