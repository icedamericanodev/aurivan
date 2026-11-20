/**
 * Looking back at an answered question (mobile 2.2): the rules behind the
 * read-only page (app/answered/[id].tsx) and the bank's "Answered" filter.
 *
 * Plain English for the founder: a learner asked to see questions they already
 * answered, with the explanations, without answering again. This file decides
 * three things, and nothing else:
 *   1. Is there a real answer saved for this question? (isAnswerRecord)
 *   2. May the page open at all? (lookBackGate: not for an unknown question,
 *      not for one never answered, and never for a question that sits in a
 *      mock exam the learner has not submitted yet: that would leak the key.)
 *   3. Do we KNOW which option the learner picked? (savedMissPick)
 *
 * About 3, the honest part. An answer record (engine/readiness.ts
 * AnswerRecord) keeps the result and the time, but NOT the option picked. So
 * the page never guesses, not even after a right answer. The one place a pick
 * IS kept is the Mistake journal, and only for a miss. We show it only when we
 * can tell it belongs to the SAME attempt as the last answer; otherwise, after
 * a miss, the page says the pick was not saved (after a right answer it says
 * nothing about the pick at all).
 *
 * Pure TypeScript: no React, no storage, no network. It only reads what it is
 * given, so opening the page can never change progress.
 */
import { LETTERS, type Letter, type PackQuestion } from '../content/types';
import type { AnswerRecord } from './readiness';

/** `map[id]` only when the map itself holds that id (a link's id could be "constructor"). */
function own<T>(map: Readonly<Record<string, T>> | undefined | null, id: string): T | undefined {
  return map && Object.prototype.hasOwnProperty.call(map, id) ? map[id] : undefined;
}

const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

/**
 * A real, complete answer record: answered at least once, a true/false last
 * result and a real time. Anything else (missing, half-written, not an object)
 * is "not answered", so the Answered filter and the page always agree.
 */
export function isAnswerRecord(v: unknown): v is AnswerRecord {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const r = v as Record<string, unknown>;
  return isCount(r.attempts) && r.attempts >= 1 && isCount(r.correctCount) && r.correctCount <= r.attempts && typeof r.lastCorrect === 'boolean' && isTime(r.lastAt);
}

/** The saved answer for a question, or undefined when there is none worth showing. */
export function answerRecordOf(answers: Readonly<Record<string, unknown>> | undefined | null, id: string): AnswerRecord | undefined {
  const rec = own(answers, id);
  return isAnswerRecord(rec) ? rec : undefined;
}

/**
 * How far apart the answer's time and the mistake's time may be and still be
 * ONE attempt (2 seconds).
 *
 * Why a small window and not "exactly equal": the store writes the two in the
 * same moment but with two clock reads. `recordAnswer` stamps `lastAt`, then
 * `recordMistake` stamps `at` right after it (store/progress.ts; called back to
 * back by the session screen, the drills and a submitted mock). So `at` is the
 * same millisecond or a few later, never earlier.
 *
 * Deliberately NOT covered (the page then says the pick was not saved): a mock
 * whose time ran out while the app was closed. Its answers are stamped with the
 * exam's end and its mistakes with the moment the app recorded them, hours
 * apart, so the times cannot prove they belong together.
 */
export const SAME_ATTEMPT_MS = 2000;

/** The part of a Mistake journal entry this file reads (store/progress.ts MistakeEntry). */
export interface SavedMiss {
  picked?: unknown;
  at?: unknown;
  resolved?: unknown;
}

/**
 * The option the learner picked on their LAST answer, as an ORIGINAL letter,
 * or null when it is not known. Strict on purpose; every line is a reason to
 * say "not saved" instead of guessing:
 *   - the last answer must be a miss (a right answer never has a saved pick);
 *   - a Mistake journal entry must exist, still open (a fixed one is about an
 *     older miss), with a pick (a skipped mock question has none);
 *   - the pick must be one of this question's options, and not the best
 *     answer (a miss can't have picked today's key: the question or its key
 *     changed since, so the saved letter no longer means what it did);
 *   - the entry's time must be the same attempt as the answer's time: not
 *     earlier, and at most SAME_ATTEMPT_MS later.
 */
export function savedMissPick(record: AnswerRecord | undefined, miss: SavedMiss | undefined | null, question: Pick<PackQuestion, 'options' | 'correct'>): Letter | null {
  if (!isAnswerRecord(record) || record.lastCorrect) return null;
  if (typeof miss !== 'object' || miss === null || miss.resolved === true) return null;
  const picked = LETTERS.find((l) => l === miss.picked);
  if (!picked || picked === question.correct || typeof question.options[picked] !== 'string') return null;
  if (!isTime(miss.at)) return null;
  const gap = miss.at - record.lastAt;
  return gap >= 0 && gap <= SAME_ATTEMPT_MS ? picked : null;
}

/** The part of the open session this file reads (store/session.ts ActiveSession). */
export interface OpenSessionLike {
  mode: string;
  certId: string;
  questionIds: readonly string[];
  finishedAt?: number;
}

/** True when this question sits in a mock exam that has not been submitted: its key must stay hidden. */
export function inUnsubmittedMock(session: OpenSessionLike | null | undefined, certId: string, questionId: string): boolean {
  return Boolean(session && session.mode === 'mock' && !session.finishedAt && session.certId === certId && Array.isArray(session.questionIds) && session.questionIds.includes(questionId));
}

/** Why the page can't open, or `ok` with the saved answer. Checked in this order. */
export type LookBackGate =
  | { kind: 'unknown' } // no such question in this exam (a bad link, or another exam's id)
  | { kind: 'mock' } // in an unsubmitted mock: finish it first
  | { kind: 'unanswered' } // a real question, but no saved answer (never answered, or its old record was dropped)
  | { kind: 'ok'; record: AnswerRecord };

/**
 * May the look-back page open? The mock check comes BEFORE the answer check,
 * so a question in an open mock shows nothing about itself either way.
 */
export function lookBackGate(input: {
  question: PackQuestion | undefined;
  certId: string;
  answers: Readonly<Record<string, unknown>> | undefined | null;
  session: OpenSessionLike | null | undefined;
}): LookBackGate {
  const { question, certId, answers, session } = input;
  if (!question || question.certId !== certId) return { kind: 'unknown' };
  if (inUnsubmittedMock(session, certId, question.id)) return { kind: 'mock' };
  const record = answerRecordOf(answers, question.id);
  return record ? { kind: 'ok', record } : { kind: 'unanswered' };
}

// ── Words (one place, so the screen and the tests agree) ────────────────
export const LAST_CORRECT_LINE = 'Last time: correct';
export const LAST_MISSED_LINE = 'Last time: not quite';
/** Shown only after a MISS whose pick is not known. Never beside "Last time: correct": there it read as an error. */
export const PICK_NOT_SAVED_LINE = 'KaiSip saved your result for this answer, not which option you picked.';
export const CURRENT_EXPLANATIONS_LINE = 'Explanations here are always the latest version.';
export const READ_ONLY_LINE = 'Looking back changes nothing in your progress.';

/** "Last answered correctly" / "Last answer was not the best". */
export function lastResultLine(record: AnswerRecord): string {
  return record.lastCorrect ? LAST_CORRECT_LINE : LAST_MISSED_LINE;
}

/** The learner's own count on this question: "Answered once" / "Answered 3 times, 2 correct". */
export function attemptsLine(record: AnswerRecord): string {
  if (record.attempts === 1) return 'Answered once';
  return `Answered ${record.attempts} times, ${record.correctCount} correct`;
}
