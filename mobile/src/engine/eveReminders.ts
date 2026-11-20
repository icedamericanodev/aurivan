/**
 * The exam-eve card's three gentle reminders (Today, the day before the exam).
 *
 * Plain English: since phone 2.2 the reminders come from the same evidence as
 * the Mistake journal's "Your mistake patterns" (engine/mistakeDNA.ts: the
 * last 28 days, the learner's tags plus what their answers show). Before, the
 * card counted every mistake ever saved, and one mistake was enough to call a
 * reminder "yours". Rules (behavioral-scientist, 20 Nov 2026):
 *   - A reminder is the learner's own only once at least 5 recent mistakes
 *     have a pattern (SLIP_COACH_MIN), and only for a pattern seen in at
 *     least 3 of them (DNA_MIN_PATTERN): the journal's own promise not to guess.
 *   - "Didn't know it" never becomes a line: no cramming tonight.
 *   - Always exactly three lines: the learner's own first (most frequent
 *     first, ties in the journal's order), then the general ones, no repeats.
 *   - "Yours" only when all three are the learner's own; a mixed card is not
 *     labelled, so the eve never singles out a weakness.
 *
 * Pure TypeScript: no React, no storage.
 */
import { DNA_MIN_PATTERN, type DNAWindow } from './mistakeDNA';
import { SLIP_COACH_MIN, type SlipPattern } from './slipCoach';

type EvePattern = Exclude<SlipPattern, 'knowledge'>;

/** Gentle exam-eve wording for each pattern ("knowledge" is left out: no cramming tonight). */
export const EVE_REMINDER: Record<EvePattern, string> = {
  'runner-up': 'When two options look right, say why the best one wins.',
  priority: 'Find the FIRST or BEST word before you read the options.',
  overconfident: 'Give a sure answer one more read of the question.',
  role: 'Ask who you are in the question before you answer.',
  'tech-first': 'Policy, ownership and approval come before tools.',
  symptom: 'Prefer the option that fixes the root cause.',
  misread: 'Slow down on the last line of each question.',
};

/** The general reminders, in order: the whole card when there is not enough evidence, else the fill. */
export const EVE_DEFAULTS: EvePattern[] = ['priority', 'runner-up', 'role'];

/** How many lines the card shows, always. */
export const EVE_LINES = 3;

/** The learner's own reminder patterns from the journal's summary (0 to 3, most frequent first). */
export function ownEvePatterns(window: Pick<DNAWindow, 'classified' | 'patterns'>): EvePattern[] {
  if (window.classified < SLIP_COACH_MIN) return [];
  // `patterns` is already ranked: count, then the journal's tie order (PATTERN_ORDER).
  return window.patterns
    .filter((p): p is typeof p & { pattern: EvePattern } => p.pattern !== 'knowledge' && p.count >= DNA_MIN_PATTERN)
    .slice(0, EVE_LINES)
    .map((p) => p.pattern);
}

/** The card's three lines, and whether all three are the learner's own (the caption says "Your…"). */
export function eveReminders(window: Pick<DNAWindow, 'classified' | 'patterns'>): { own: boolean; lines: string[] } {
  const own = ownEvePatterns(window);
  const picks = [...own, ...EVE_DEFAULTS.filter((p) => !own.includes(p))].slice(0, EVE_LINES);
  return { own: own.length === EVE_LINES, lines: picks.map((p) => EVE_REMINDER[p]) };
}
