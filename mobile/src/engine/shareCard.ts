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

/**
 * Words that would turn a progress card into a pass claim, or a study badge
 * into something that reads like a credential on LinkedIn (mobile 1.11,
 * compliance review §5): "certified", "certificate", "credential",
 * "accredited", "official", "graduated". Run on every string WE write onto a
 * card (headline, skill line, caption), never on the trademark notice, which
 * must say "not … endorsed".
 */
const PASS_CLAIM = /\b(pass|passed|passing|guarantee[ds]?|certified)\b|ready to|will (pass|succeed)|certificat(e|ion)|credential|accredit|official|graduat/i;

/** True when a piece of share text makes no pass or credential claim. Used by tests and as a runtime guard. */
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
      // The streak is global (any study counts), not per certification, so no cert name here.
      spoken: `A ${streak}-day study streak.`,
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
  // Belt and braces: drop anything that ever reads like a pass claim.
  const honest = out.filter(isHonestHeadline);
  // `start` is ALWAYS the last option, so callers can rely on options[0] existing.
  // If the cert name itself ever trips the guard, use a version without it.
  const start = startHeadline(certName);
  honest.push(isHonestHeadline(start) ? start : startHeadline(null));
  return honest;
}

/** True when every word of a headline passes the honesty guard. */
function isHonestHeadline(h: ShareHeadline): boolean {
  return [h.value ?? '', h.label, h.note ?? '', h.spoken].every(isHonestShareText);
}

/** The no-number fallback headline (with or without the cert name). */
function startHeadline(certName: string | null): ShareHeadline {
  const text = certName ? `Starting my ${certName} prep` : 'Starting my exam prep';
  return { kind: 'start', value: null, label: text, note: null, spoken: `${text}.` };
}

/** The default headline: the first honest option. */
export function pickShareHeadline(input: ShareInput): ShareHeadline {
  return shareOptions(input)[0];
}

/**
 * The text that travels with the image (or alone, where only text can be
 * shared). `notice` is the cert's full trademark notice (cert.trademarkNotice:
 * "Not affiliated with or endorsed by ISACA®. CISA® is a registered trademark
 * of ISACA."), on every card and in every share text (compliance §5).
 */
export function shareMessage(h: ShareHeadline, notice: string): string {
  return `${h.spoken} Studying with Aurivan. ${notice}`;
}

// ── Badge cards (mobile 1.11, badges_game.md §6, compliance review §5) ────

/** The cert facts a badge card reads (from content/certifications.ts). */
export interface ShareCert {
  name: string;
  trademarkNotice: string;
  /** false: an unconfirmed mark ("AAIA" without ®). */
  trademarkRegistered?: boolean;
}

/**
 * "Studying for the CISA® exam": the mark as an adjective before "exam", ®
 * on its first use, built from the cert (AAIA without ®, CISSP® for ISC2).
 * It sits at the foot of the card, never on or directly above the medallion.
 */
export function studyingFor(cert: ShareCert): string {
  return `Studying for the ${cert.name}${cert.trademarkRegistered === false ? '' : '®'} exam`;
}

/** A badge, as its card needs it (an earned case mark). */
export interface ShareBadge {
  /** "Long Memory · 75 recalls" */
  name: string;
  /** The tier's metal and number, printed under the name ("Lichen · tier 2 of 3"), when it has one. */
  tierLine?: string;
  /** The skill line ("Recalls answers a week or more later"); empty = never shareable. */
  skill: string;
  set: string;
  status: string;
  /** "3 Nov 2026", formatted by the caller. */
  earnedOn: string;
}

/** Sets whose badges are never shared: Moments (Fresh Start, and the planned self-reported "Passed"). */
const NEVER_SHARED = new Set(['moments']);

/**
 * Can this badge be shared? Earned, not a Moment (a "Passed" or a Fresh Start
 * beside a cert name would read like a claim or a week away), with a skill
 * line that makes no pass or credential claim. Sharing earns nothing.
 */
export function badgeShareable(b: Pick<ShareBadge, 'status' | 'set' | 'skill'>): boolean {
  return b.status === 'earned' && !NEVER_SHARED.has(b.set) && b.skill.trim() !== '' && isHonestShareText(b.skill);
}

/** Every word on a badge card, top to bottom, plus the share text and the spoken label. */
export interface BadgeCardText {
  name: string;
  tierLine?: string;
  skill: string;
  /** "Aurivan study badge · Earned 3 Nov 2026": the medallion's caption, so it reads as ours. */
  caption: string;
  /** "Studying for the CISA® exam" */
  headline: string;
  notice: string;
  /** The text share (a plain store link, when there is one: no referral or tracking codes). */
  message: string;
  /** The whole card, for screen readers. */
  spoken: string;
}

/**
 * The words on a badge's share card. Every line we write is checked with
 * `isHonestShareText` (not the notice: it says "not … endorsed"). Throws
 * if a badge that isn't shareable gets here, so a slip can never be shared.
 */
export function badgeCardText(b: ShareBadge, cert: ShareCert, storeLink?: string | null): BadgeCardText {
  if (!badgeShareable(b)) throw new Error(`badge not shareable: ${b.name}`);
  const caption = `Aurivan study badge · Earned ${b.earnedOn}`;
  const headline = studyingFor(cert);
  // The badge NAME is not run through the guard: names were cleared by the
  // compliance review (2a), and the guard's "graduat" would refuse the
  // Graduate badge by name. Every other line we write is.
  const ours = [b.tierLine ?? '', b.skill, caption, headline];
  if (!ours.every(isHonestShareText)) throw new Error(`share text failed the honesty guard: ${b.name}`);
  const link = storeLink ? ` ${storeLink}` : '';
  const tier = b.tierLine ? ` (${b.tierLine})` : '';
  return {
    name: b.name,
    ...(b.tierLine ? { tierLine: b.tierLine } : {}),
    skill: b.skill,
    caption,
    headline,
    notice: cert.trademarkNotice,
    message: `${b.skill}: my ${b.name}${tier} study badge from Aurivan, earned ${b.earnedOn}. ${headline}.${link} ${cert.trademarkNotice}`,
    spoken: `Badge card. ${b.name}${tier}. ${b.skill}. ${caption.replace(' · ', ', ')}. ${headline}. ${cert.trademarkNotice}`,
  };
}
