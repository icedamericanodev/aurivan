/**
 * Share card — which ONE honest number goes on the image a learner shares.
 *
 * The card is something a learner might post on LinkedIn, so every word on
 * it must be true and modest:
 *   - Never a pass claim ("ready to pass", "will pass", "guaranteed").
 *   - Never the size of the question bank (brand rule: we don't advertise it).
 *     Counts of what the LEARNER did ("120 practice questions answered") are fine.
 *   - Readiness only as the RANGE from readinessRange.ts, and only once that
 *     range exists (below the data threshold there is no range to show).
 *
 * Order of preference (the first one that applies is the default headline):
 *   1. range    — "Estimated readiness 68–76%" (a study estimate, not a prediction)
 *   2. streak   — "12-day study streak" (2+ days; a 1-day streak says little)
 *   3. days     — "5 days studied in the last 2 weeks"
 *   4. answered — "37 practice questions answered"
 *   5. start    — "Starting my CISA prep" (no number at all)
 * The learner can switch to any other option that applies (shareOptions).
 *
 * Pure TypeScript: no React, no storage.
 */
import type { ReadinessRange } from './readinessRange';
import { daysBetween } from './streak';

/** How many recent days the "days studied" headline looks back over. */
export const SHARE_DAYS_WINDOW = 14;
/** A streak needs at least this many days to be the headline. */
export const SHARE_MIN_STREAK = 2;

export type ShareKind = 'range' | 'streak' | 'days' | 'answered' | 'start';

export interface ShareInput {
  certName: string; // "CISA"
  issuer: string; // "ISACA": for the "Not affiliated with …" line
  streak: number; // the visible streak (engine/streak.ts visibleStreak)
  recentDays: string[]; // distinct study days "YYYY-MM-DD" (Streak.recentDays)
  today: string; // today's local day key
  answered: number; // questions the learner has answered
  range: ReadinessRange;
}

export interface ShareHeadline {
  kind: ShareKind;
  /** The big number on the card ("68–76%", "12"), or null for `start`. */
  value: string | null;
  /** The words under the number ("Estimated readiness", "day study streak"). */
  label: string;
  /** A short honest note under the label (e.g. "A study estimate, not an exam prediction."). */
  note: string | null;
  /** One plain sentence for screen readers and the text share. */
  spoken: string;
}

/** Words that would turn a progress card into a pass claim. */
const PASS_CLAIM = /\b(pass|passed|passing|guarantee[ds]?|certified)\b|ready to|will (pass|succeed)/i;

/** True when a piece of share text makes no pass claim. Used by tests and as a runtime guard. */
export function isHonestShareText(text: string): boolean {
  return !PASS_CLAIM.test(text);
}

/** Distinct study days within the last SHARE_DAYS_WINDOW days (today included). */
export function daysStudied(recentDays: string[], today: string): number {
  const inWindow = new Set(
    recentDays.filter((d) => {
      const ago = daysBetween(d, today);
      return ago >= 0 && ago < SHARE_DAYS_WINDOW;
    }),
  );
  return inWindow.size;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Every honest headline that applies, best first. Always has at least one (`start`). */
export function shareOptions(input: ShareInput): ShareHeadline[] {
  const out: ShareHeadline[] = [];
  const { range, streak, answered, certName } = input;

  if (range.enough) {
    const v = `${range.low}–${range.high}%`;
    out.push({
      kind: 'range',
      value: v,
      label: 'Estimated readiness',
      note: 'A study estimate from my practice, not an exam prediction.',
      spoken: `Estimated ${certName} readiness ${range.low} to ${range.high} percent, a study estimate from my practice.`,
    });
  }
  if (streak >= SHARE_MIN_STREAK) {
    out.push({
      kind: 'streak',
      value: String(streak),
      label: 'day study streak',
      note: null,
      spoken: `A ${streak}-day ${certName} study streak.`,
    });
  }
  const days = daysStudied(input.recentDays, input.today);
  if (days >= 1) {
    const word = plural(days, 'day', 'days');
    out.push({
      kind: 'days',
      value: String(days),
      label: `${word} studied in the last 2 weeks`,
      note: null,
      spoken: `${days} ${word} of ${certName} study in the last 2 weeks.`,
    });
  }
  if (answered >= 1) {
    const word = plural(answered, 'practice question answered', 'practice questions answered');
    out.push({
      kind: 'answered',
      value: String(answered),
      label: word,
      note: null,
      spoken: `${answered} ${certName} ${word}.`,
    });
  }
  out.push({
    kind: 'start',
    value: null,
    label: `Starting my ${certName} prep`,
    note: null,
    spoken: `Starting my ${certName} prep.`,
  });
  // Belt and braces: drop anything that ever reads like a pass claim.
  return out.filter((h) => [h.value ?? '', h.label, h.note ?? '', h.spoken].every(isHonestShareText));
}

/** The default headline: the first honest option. */
export function pickShareHeadline(input: ShareInput): ShareHeadline {
  return shareOptions(input)[0];
}

/** The trademark-safe line printed on every card. */
export function notAffiliated(issuer: string): string {
  return `Not affiliated with ${issuer}.`;
}

/** The text that travels with the image (or alone, where only text can be shared). */
export function shareMessage(h: ShareHeadline, issuer: string): string {
  return `${h.spoken} Studying with Aurivan. ${notAffiliated(issuer)}`;
}
