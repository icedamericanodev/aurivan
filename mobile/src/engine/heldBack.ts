/**
 * The held-back full form (docs/content/CIA_BANK_PLAN.md section 11, item 7, second half).
 *
 * Plain English for the founder: a course that opts in (`readinessRule:
 * 'firstTry'`) and ships a held-back file has ONE full exam that is the same
 * for every learner. Its questions are kept out of every other pool
 * (practice, review, the daily plan, games, mocks, the short mock, the bank
 * list) until the learner has taken it, so that one try is a fair read.
 * "Taken" = submitted (or its time ran out), or discarded after it started
 * (the learner is told first). Afterwards its questions join practice, with
 * their explanations. A retake is "Full exam (seen)": labelled, kept out of
 * readiness, never celebrated.
 *
 * The behavioral scientist's rules (scratchpad app/behavior.md): never
 * locked; one Today card (no notification) once every section has 30 or more
 * first tries and one short mock is done, or 3 weeks before a set exam date;
 * earlier, starting it asks "Most useful in your last 2 to 3 weeks." with
 * Take it now / Not yet. No countdowns, no "last chance", no guilt.
 *
 * The form's name is its frozen date (the `heldBack` value on each of its
 * questions). Saved per course: CertProgress.heldBackTaken, form → when it
 * was taken (the earliest time wins in a sync).
 *
 * No live course has a form, so none of this runs for CISA.
 *
 * Pure TypeScript: no React, no storage, no network.
 */
import type { Certification, PackQuestion } from '../content/types';
import { domainTitle } from './domainNaming';
import type { FirstTrySection } from './firstTry';

/** The form's title, on its start sheet, in the session and on Results. */
export const FORM_TITLE = 'Full exam';
/** A retake's title: the "seen" is never dropped. */
export const SEEN_TITLE = 'Full exam (seen)';
/** The start sheet's intro (the behavioral scientist's words). */
export const FORM_INTRO =
  'A full exam, the same for everyone, kept out of practice so your result is a fair read. You get one fresh try; afterwards its questions and explanations join your practice.';
/** Asked before an early start (never a lock: Take it now always starts it). */
export const EARLY_LINE = 'Most useful in your last 2 to 3 weeks.';
/** On a retake's start sheet and Results (curly apostrophe, like the app). */
export const SEEN_LINE = 'You’ve seen these questions, so this score runs high. Not counted in readiness.';
/** Said before discarding an unfinished fresh form (it then counts as taken). */
export const DISCARD_LINE = 'It will count as your one fresh try at the full exam, and its questions will join your practice.';
/** Under the form's result: what the numbers are (never a scaled score, a pass mark or "likely"). */
export const FORM_SCORE_NOTE = 'Your percent and counts here are a study measure, not an exam score.';
/** The Today card's caption and line (calm: no date, no countdown, no "last"). */
export const CARD_CAPTION = 'Full exam';
export const CARD_LINE = 'When you want a fair read, the full exam is ready. It is the same for everyone and kept out of practice.';

/** Every section needs this many first tries before the Today card shows (or the exam is near). */
export const OFFER_FIRST_TRIES = 30;
/** The Today card shows from this many days before a set exam date. */
export const OFFER_DAYS = 21;

/** form → when the learner took it (epoch ms). CertProgress.heldBackTaken. */
export type TakenForms = Record<string, number>;

/** The course's held-back form as the pack has it. */
export interface HeldBackForm {
  /** The form's name: its frozen date. */
  key: string;
  /** Its questions, in pack order (retired ones left out). */
  ids: string[];
}

/** True when this question is held back and its form is not taken yet: left out of every pool. */
export function isHeldBackHidden(q: Pick<PackQuestion, 'heldBack'>, taken: Readonly<TakenForms> | undefined): boolean {
  return q.heldBack !== undefined && !(taken && Object.prototype.hasOwnProperty.call(taken, q.heldBack));
}

/**
 * The form the pack carries: every live question tagged `heldBack`. A pack
 * holds one form; if it ever held two names, the newest (latest date) is the
 * form, the other tags are ignored. Null when no question is tagged (CISA).
 */
export function heldBackFormIn(questions: readonly PackQuestion[]): HeldBackForm | null {
  let key: string | null = null;
  for (const q of questions) if (q.heldBack !== undefined && !q.retired && (key === null || q.heldBack > key)) key = q.heldBack;
  if (key === null) return null;
  return { key, ids: questions.filter((q) => q.heldBack === key && !q.retired).map((q) => q.id) };
}

/** True when this form has been taken. */
export function isTaken(taken: Readonly<TakenForms> | undefined, key: string): boolean {
  return Boolean(taken && Object.prototype.hasOwnProperty.call(taken, key));
}

/** `taken` with `key` taken at `at` (the earliest time is kept). The same object when nothing changes. */
export function withTaken(taken: TakenForms | undefined, key: string, at: number): TakenForms {
  const had = taken && Object.prototype.hasOwnProperty.call(taken, key) ? taken[key] : undefined;
  if (taken && had !== undefined && had <= at) return taken;
  return { ...taken, [key]: at };
}

/** What the Today card needs to decide. */
export interface OfferInput {
  /** First tries by section (engine/firstTry.ts firstTryReadiness). */
  sections: readonly Pick<FirstTrySection, 'firstTries'>[];
  /** The saved mock results (a short mock is one shorter than the exam that is not the form). */
  mocks: readonly { total: number; heldBack?: 'fresh' | 'seen' }[];
  examQuestions: number;
  /** Days to the exam date (null = no date set). */
  daysLeft: number | null;
  /** The form is already taken: no card. */
  taken: boolean;
}

/**
 * The one Today card (no notification): when the form is not taken and
 * EITHER every section has OFFER_FIRST_TRIES first tries and one short mock
 * is done, OR the exam date is set and 0 to OFFER_DAYS days away.
 */
export function offerDue(i: OfferInput): boolean {
  if (i.taken) return false;
  if (i.daysLeft !== null && i.daysLeft >= 0 && i.daysLeft <= OFFER_DAYS) return true;
  const shortDone = i.mocks.some((m) => m.total < i.examQuestions && !m.heldBack);
  return shortDone && i.sections.length > 0 && i.sections.every((s) => s.firstTries >= OFFER_FIRST_TRIES);
}

/** One section's result line on the form's Results. */
export interface SectionResult {
  domainId: string;
  /** "Section A · Ethics". */
  name: string;
  /** "31 of 44 right (70%)". */
  line: string;
  /** "Section A, Ethics: 31 of 44 right, 70 percent." */
  spoken: string;
}

/**
 * The form's result, section by section in the course's order: percent and
 * counts only. Never a scaled score, a pass mark or "likely". A section with
 * no question in the form is left out.
 */
export function sectionResults(
  cert: Pick<Certification, 'domains' | 'domainStyle'>,
  byDomain: Readonly<Record<string, { total: number; correct: number }>>,
): SectionResult[] {
  const out: SectionResult[] = [];
  for (const d of cert.domains) {
    const t = byDomain[d.id];
    if (!t || t.total <= 0) continue;
    const pct = Math.round((t.correct / t.total) * 100);
    const name = `${domainTitle(d.id, cert)} · ${d.short}`;
    out.push({
      domainId: d.id,
      name,
      line: `${t.correct} of ${t.total} right (${pct}%)`,
      spoken: `${domainTitle(d.id, cert)}, ${d.short}: ${t.correct} of ${t.total} right, ${pct} percent.`,
    });
  }
  return out;
}
