/**
 * Fit the plan to each learner (mobile 1.15, Phase 5a).
 *
 * Two answers shape Today's plan:
 *   - where the learner is starting from (familiarity), and
 *   - how long they can study most days (minutes).
 *
 * Why (behavioural review §3, PHASE5.md §0): beginners learn best from a
 * worked example first, and experts are slowed by one (expertise reversal,
 * Kalyuga et al. 2003). A plan that fits the day gets done (Fogg ability).
 * So a new learner's first day teaches before it tests, an experienced
 * learner's plan leads with mocks and weak spots, and every plan is sized
 * in minutes, never more than the learner said they have (plus a little).
 *
 * Every answer is optional and can be changed in Settings. Nothing here is
 * stored or sent anywhere: it only picks defaults.
 *
 * Pure TypeScript: no React, no storage.
 */
import { MINUTES_PER_QUESTION } from './pace';

export type Familiarity = 'new' | 'some' | 'experienced';
export const FAMILIARITIES: Familiarity[] = ['new', 'some', 'experienced'];

/** The daily-time choices (onboarding, Settings, the fit screen). */
export const DAILY_MINUTES = [10, 20, 30, 45] as const;
export type DailyMinutes = (typeof DAILY_MINUTES)[number];
export const DEFAULT_MINUTES: DailyMinutes = 20;

/** The old "questions a day" choices (Settings before 1.15). Kept for older apps reading a backup. */
const OLD_GOALS = [10, 20, 40] as const;

const nearest = <N extends number>(choices: readonly N[], n: number): N =>
  choices.reduce((best, c) => (Math.abs(c - n) < Math.abs(best - n) ? c : best), choices[0]);

/** Any number → the nearest minute choice (a backup with 33 reads as 30). Not a number → the default. */
export function snapMinutes(n: number): DailyMinutes {
  return Number.isFinite(n) ? nearest(DAILY_MINUTES, n) : DEFAULT_MINUTES;
}

/** Old "questions a day" → the nearest minute choice at study pace (10 → 10, 20 → 20, 40 → 45). */
export function minutesFromGoal(goal: number): DailyMinutes {
  return Number.isFinite(goal) ? nearest(DAILY_MINUTES, goal * MINUTES_PER_QUESTION) : DEFAULT_MINUTES;
}

/**
 * Minutes → the nearest old daily goal. Written alongside the minutes, so an
 * older app that restores a 1.15 backup still plans a sensible day.
 */
export function goalFromMinutes(m: number): 10 | 20 | 40 {
  return nearest(OLD_GOALS, m / MINUTES_PER_QUESTION);
}

/** Questions that fit a number of minutes at study pace, never fewer than 5 (10:8, 20:16, 30:25, 45:37). */
export function questionsFor(minutes: number): number {
  // A hair added before flooring: 30 / 1.2 is 25 in maths, and must stay 25 in floating point.
  return Math.max(5, Math.floor(minutes / MINUTES_PER_QUESTION + 1e-9));
}

/**
 * How far a plan may run past the budget: 15% of it, at least 2 minutes
 * (a 6-minute game fits a 10-minute day with 5 minutes of reviews).
 */
export function planTolerance(budget: number): number {
  return Math.max(2, Math.round(0.15 * budget));
}

/** Exam-focused: an explicit choice wins; otherwise on for experienced practitioners only. */
export function examFocusedOf(s: { familiarity?: Familiarity; examFocused?: boolean }): boolean {
  return s.examFocused ?? s.familiarity === 'experienced';
}

/** The three rows, word for word the same in onboarding, Settings and the fit screen. */
export const FAMILIARITY_INFO: Record<Familiarity, { title: string; subtitle: string }> = {
  new: { title: 'New to audit', subtitle: 'I’m new to IT audit, or I’ve just graduated.' },
  some: { title: 'Some IT audit experience', subtitle: 'I work in IT, risk or audit, or I’ve studied some of it.' },
  experienced: { title: 'Experienced practitioner', subtitle: 'Years in audit, risk or security. I want exam practice.' },
};

/** Spoken and shown for each minute choice ("20 min", "20 minutes a day"). */
export const minutesLabel = (m: number) => `${m} min`;
export const minutesSpoken = (m: number) => `${m} minutes a day`;

/** Shown under the controls when today's plan is already under way. */
export const KEEP_TODAY_LINE = 'Today’s plan stays as it is. Tomorrow’s will fit.';

// ── Diagnostic-led skipping (behavioural review §3, experienced lever 1) ──

/** A domain the learner already shows they know: at least this many answers… */
export const SKIP_MIN_ANSWERS = 5;
/** …at this accuracy or better. */
export const SKIP_ACCURACY = 0.8;

/**
 * Domains whose lessons the PLAN can skip: ≥ 5 answers at ≥ 80%. Never for a
 * `new` learner (beginners keep the worked examples). Lessons stay open in
 * Learn; only Today's plan leaves them out.
 */
export function skippableDomains(
  familiarity: Familiarity | undefined,
  domains: readonly { domainId: string; answered: number; accuracy: number | null }[],
): Set<string> {
  if (familiarity === 'new') return new Set();
  return new Set(domains.filter((d) => d.answered >= SKIP_MIN_ANSWERS && (d.accuracy ?? 0) >= SKIP_ACCURACY).map((d) => d.domainId));
}

/**
 * The lesson the plan offers next, from the lessons in teaching order.
 *   - `new`: the first lesson not yet done, in order (day 1 starts at the beginning).
 *   - otherwise: the focus domain's next lesson first, then the first in order,
 *     leaving out domains the learner already knows (skippableDomains).
 */
export function planLesson<L extends { id: string; domainId: string }>(
  lessons: readonly L[],
  done: readonly string[],
  opts: { familiarity?: Familiarity; preferDomainId?: string; skip?: Set<string>; inOrder?: boolean },
): L | undefined {
  const open = lessons.filter((l) => !done.includes(l.id) && !opts.skip?.has(l.domainId));
  if (opts.inOrder) return open[0];
  return open.find((l) => l.domainId === opts.preferDomainId) ?? open[0];
}

// ── The existing-learner card: ask once, never nag (PHASE5.md §2.5) ──────

export type FitPrompt = 'answered' | 'dismissed';

/** The card shows on at most this many separate days, then never again (code review M4). */
export const FIT_ASK_DAYS = 3;

export interface FitAskInput {
  onboarded: boolean;
  fitPrompt?: FitPrompt;
  familiarity?: Familiarity;
  /** Days to the exam; null = no date set. */
  daysLeft: number | null;
  /** The exam eve or exam day card is on Today. */
  examMoment: boolean;
  /** The "Your readiness is holding" panel is on Today. */
  readyPanel: boolean;
  /** The plant's one setup line ("Plant a companion…") is showing this visit: it goes first. */
  plantLine: boolean;
  /** The days the card has already shown (settings.fitAskDays), and today's ("YYYY-MM-DD"). */
  askedDays?: readonly string[];
  today?: string;
}

/**
 * Whether Today shows the one "Fit your plan" card. Only for a learner who
 * has never answered or dismissed it, on at most FIT_ASK_DAYS separate days
 * (the last of them all day long), never in exam week (7 days or fewer),
 * never beside another moment, and never on the same visit as the plant's
 * setup line (one setup line on Today at a time).
 */
export function shouldAskFit(i: FitAskInput): boolean {
  if (!i.onboarded || i.fitPrompt || i.familiarity) return false;
  const asked = i.askedDays ?? [];
  if (asked.length >= FIT_ASK_DAYS && !(i.today && asked.includes(i.today))) return false;
  if (i.daysLeft !== null && i.daysLeft <= 7) return false;
  return !i.examMoment && !i.readyPanel && !i.plantLine;
}
