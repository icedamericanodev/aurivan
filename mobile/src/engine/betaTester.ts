/**
 * The opt-in "Tester question" card on Today (mobile 1.41, behavioural
 * review changes 3 and 7). Pure TypeScript: no React, no storage, no network.
 *
 * Plain English for the founder:
 * - It is OFF unless the learner turns on "I'm a beta tester" in Help. The
 *   public build is this same build, so a switch (not a build flag) keeps it
 *   away from everyone else.
 * - Test days are counted from the day the switch was turned on (day 1).
 *   Days 1–2, 3, 5, 7, 9, 12 and 14 each have one short question; other days
 *   have none. A question that was skipped or missed is simply gone: nothing
 *   piles up, and there is never a "Day N of 14" countdown.
 * - After 3 or more days with no study, the card asks "What got in the way?"
 *   instead of that day's question (once per absence).
 * - Answering opens the learner's own email app with the question filled in
 *   and a subject tag like "[KaiSip beta D3]". Nothing is sent automatically.
 * - The day-7 and day-14 questions show "You studied on N of the last 7 days"
 *   on screen only. That number is never put in the email.
 * - Nothing here gives a badge, plant growth or streak credit.
 */
import { daysBetween, type Streak, weekStrip } from './streak';
import type { Email } from './support';

/** What the phone remembers about the switch and the card (store/seen.ts `tester`). */
export interface TesterState {
  /** The local day ("YYYY-MM-DD") the switch was turned on. Unset = off. */
  since?: string;
  /** The day the learner chose "Not today" (the card stays away until tomorrow). */
  skipped?: string;
  /** Question ids already answered (each question is asked once). */
  answered?: string[];
}

/** The scheduled questions, by test day. */
export type TesterQuestionId = 'expect' | 'size' | 'doubt' | 'week1' | 'skip' | 'change' | 'week2';

interface Question {
  id: TesterQuestionId;
  /** Test days it may show on (1 = the day the switch was turned on). */
  days: readonly number[];
  caption: string;
  body: string;
  /** Show "You studied on N of the last 7 days" (on screen only). */
  week?: boolean;
}

/** The test lasts this many days; after it the card never shows. */
export const TEST_DAYS = 14;
/** "What got in the way?" after this many whole days with no study. */
export const AWAY_DAYS = 3;
/** The most question ids kept (there are only seven, plus one per absence). */
const MAX_ANSWERED = 40;

export const TESTER_QUESTIONS: readonly Question[] = [
  { id: 'expect', days: [1, 2], caption: 'Tester question', body: 'What did you expect KaiSip to do that it didn’t?' },
  { id: 'size', days: [3], caption: 'Tester question', body: 'Was today’s plan the right size for your day: too long, about right, or too short?' },
  {
    id: 'doubt',
    days: [5],
    caption: 'Tester question',
    body: 'Has any answer or explanation made you doubt it? Use Report a problem under that question, or tell us here.',
  },
  { id: 'week1', days: [7], caption: 'Week 1 check-in', body: 'How has your first week with KaiSip gone? What helped, and what got in the way?', week: true },
  { id: 'skip', days: [9], caption: 'Tester question', body: 'Which part of the app do you skip? What would make it worth opening?' },
  { id: 'change', days: [12], caption: 'Tester question', body: 'If you could change one thing before launch, what would it be?' },
  { id: 'week2', days: [14], caption: 'Week 2 check-in', body: 'After two weeks, would you keep studying with KaiSip? What would make the difference?', week: true },
];

/** The question after an absence. It replaces that day's question. */
export const AWAY_QUESTION = 'Welcome back. What got in the way? A busy week, a bug, losing interest: anything helps.';
/** Said under the last question (day 14). No animation, no celebration. */
export const LAST_QUESTION_LINE = 'Thank you. That’s the last tester question.';

/** The card to show today, or null. */
export interface TesterCard {
  /** A question id, or "away:<day>" for the absence question (one per absence). */
  id: string;
  /** The test day (1-based), for the subject tag. */
  day: number;
  caption: string;
  body: string;
  /** Day 7 and day 14 only: how many of the last 7 days had study (on screen only). */
  studiedOfLast7?: number;
  /** Day 14 only: the closing line. */
  closing?: string;
  away?: boolean;
}

/** The test day for `today` (1 = the day the switch was turned on), or null when it is off. */
export function testerDay(state: TesterState | undefined, today: string): number | null {
  if (!state?.since || !/^\d{4}-\d{2}-\d{2}$/.test(state.since)) return null;
  const d = daysBetween(state.since, today) + 1;
  return d >= 1 ? d : null;
}

/** The scheduled question for a test day, or null (most days have none). */
export function questionForDay(day: number): Question | null {
  return TESTER_QUESTIONS.find((q) => q.days.includes(day)) ?? null;
}

/** Days with study among the last 7 (today included), from the streak the phone already keeps. */
export function studiedOfLast7(streak: Streak, now: number): number {
  return weekStrip(streak, now).filter(Boolean).length;
}

/**
 * Whole days with no study before today, counted from the later of the last
 * study day before today and the day the switch was turned on. 0 when the
 * learner studied yesterday (or turned the switch on yesterday or today).
 */
export function daysAway(streak: Streak, since: string, today: string): { days: number; from: string } {
  const before = (streak.recentDays ?? (streak.lastDay ? [streak.lastDay] : [])).filter((d) => d < today);
  const last = before.length ? before[before.length - 1] : undefined;
  const from = last && last > since ? last : since;
  return { days: Math.max(0, daysBetween(from, today) - 1), from };
}

/**
 * Today's card. Null when the switch is off, the test is over, the learner
 * said "Not today" today, today has no question, or it was answered already.
 */
export function testerCard(state: TesterState | undefined, streak: Streak, now: number, today: string): TesterCard | null {
  const day = testerDay(state, today);
  if (day === null || day > TEST_DAYS || !state?.since) return null;
  if (state.skipped === today) return null;
  const answered = new Set(state.answered ?? []);
  const away = daysAway(streak, state.since, today);
  if (away.days >= AWAY_DAYS) {
    const id = `away:${away.from}`;
    if (!answered.has(id)) return { id, day, caption: 'Tester question', body: AWAY_QUESTION, away: true };
  }
  const q = questionForDay(day);
  if (!q || answered.has(q.id)) return null;
  return {
    id: q.id,
    day,
    caption: q.caption,
    body: q.body,
    ...(q.week ? { studiedOfLast7: studiedOfLast7(streak, now) } : {}),
    ...(day === TEST_DAYS ? { closing: LAST_QUESTION_LINE } : {}),
  };
}

/** "You studied on 5 of the last 7 days." Shown on screen only; never sent. */
export function weekLine(n: number): string {
  return `You studied on ${n} of the last 7 days.`;
}

/** The subject tag: "[KaiSip beta D3]", or "[KaiSip beta D5 away]" for the absence question. */
export function testerSubject(card: Pick<TesterCard, 'day' | 'away'>): string {
  return `[KaiSip beta D${card.day}${card.away ? ' away' : ''}]`;
}

/**
 * The email the card opens: the question in the body, room to answer, and
 * the app version (as every KaiSip email carries). Never the study-day count,
 * a name, an exam date, a score or anything about progress.
 */
export function testerEmail(card: TesterCard, app: { version: string; os: string }): Email {
  return {
    subject: testerSubject(card),
    body: ['Hi KaiSip team,', '', `Tester question: ${card.body}`, '', 'My answer:', '', '', '', `App: KaiSip ${app.version} (${app.os})`].join('\n'),
  };
}

// ── Saving the learner's choices (the store calls these) ─────────────────
/** The switch: on starts the test today (day 1); off forgets everything. */
export function switchTester(on: boolean, today: string): TesterState {
  return on ? { since: today } : {};
}

/** "Not today": the card stays away until tomorrow. */
export function skipToday(state: TesterState, today: string): TesterState {
  return { ...state, skipped: today };
}

/** The email app opened with this question: it is never asked again. */
export function markAnswered(state: TesterState, id: string): TesterState {
  const answered = state.answered ?? [];
  return answered.includes(id) ? state : { ...state, answered: [...answered, id].slice(-MAX_ANSWERED) };
}
