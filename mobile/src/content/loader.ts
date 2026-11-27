/**
 * Content loader — the only code that knows WHERE questions come from.
 *
 * The questions come from a content pack (content/packs/): today the pack
 * bundled inside the app (works fully offline, no server needed); later a
 * newer pack the learner downloaded from kaisip.com can take its place
 * (docs/mobile/ARCHITECTURE.md, "Content packs"). Screens never change,
 * because they only ever call these functions.
 *
 * Retired questions (content packs): a question an author retires stays in
 * the pack with `retired: true`, so old progress still makes sense. It is
 * left out of every POOL (getDomainQuestions, getAllQuestions: practice,
 * mock, Smart, the games, the bank list) but findQuestion still finds it, so
 * reviews, the mistake journal and bookmarks keep working.
 *
 * The held-back full form (engine/heldBack.ts, CIA_BANK_PLAN.md section 11
 * item 7): for a course that opts in (`readinessRule: 'firstTry'`), a question
 * tagged `heldBack` is left out of every pool the same way until the learner
 * has taken its form; then it joins them. Which forms are taken is the
 * learner's progress, so store/progress.ts tells this file (setHeldBackTaken)
 * and empties the pool cache whenever it changes. Every live course has no
 * tagged question, so its pools are exactly what they were.
 */
import { getCertification } from './certifications';
import { isHeldBackHidden, type TakenForms } from '../engine/heldBack';
import { isFirstTryCourse } from '../engine/firstTry';
import { onClearContentCaches, packInstalled, sourceFor } from './packs';
import type { PackQuestion } from './types';

/** Which held-back forms the learner has taken, per course (store/progress.ts sets it). None known: every form untaken. */
let takenOf: (certId: string) => Readonly<TakenForms> | undefined = () => undefined;

/**
 * Called by store/progress.ts: how to read the taken forms, and again (with the
 * same reader) whenever they change, so the next pool read is fresh.
 */
export function setHeldBackTaken(read: (certId: string) => Readonly<TakenForms> | undefined): void {
  takenOf = read;
  poolCache.clear();
}

/** True when this question is left out of every pool: retired, or held back in an untaken form of an opted-in course. */
function leftOut(certId: string, q: PackQuestion): boolean {
  if (q.retired) return true;
  if (q.heldBack === undefined || !isFirstTryCourse(getCertification(certId))) return false;
  return isHeldBackHidden(q, takenOf(certId));
}

/**
 * True when this question is held back in a form the learner has not taken
 * (an opted-in course only). lib/sessions.ts drops such ids from every set but
 * the held-back form itself. Always false for every live course.
 */
export function isHeldBackOut(certId: string, id: string): boolean {
  const q = findQuestion(certId, id);
  return Boolean(q && q.heldBack !== undefined && !q.retired && leftOut(certId, q));
}

// Simple in-memory caches so each domain file is parsed (and filtered) only once.
const everyCache = new Map<string, PackQuestion[]>();
const poolCache = new Map<string, PackQuestion[]>();

/** Every question in one domain, retired ones included (for lookups by id). */
function domainEvery(certId: string, domainId: string): PackQuestion[] {
  const key = `${certId}:${domainId}`;
  const hit = everyCache.get(key);
  if (hit) return hit;
  const questions = sourceFor(certId).questions(certId, domainId) ?? [];
  everyCache.set(key, questions);
  return questions;
}

/** All questions for one domain of one certification (retired ones, and an untaken held-back form, left out). */
export function getDomainQuestions(certId: string, domainId: string): PackQuestion[] {
  const key = `${certId}:${domainId}`;
  const hit = poolCache.get(key);
  if (hit) return hit;
  const every = domainEvery(certId, domainId);
  // Same array when nothing is left out (today: always), so nothing is copied.
  const out = (q: PackQuestion) => leftOut(certId, q);
  const pool = every.some(out) ? every.filter((q) => !out(q)) : every;
  poolCache.set(key, pool);
  return pool;
}

/** All questions for a certification (every domain; retired ones, and an untaken held-back form, left out). */
export function getAllQuestions(certId: string): PackQuestion[] {
  return sourceFor(certId).domainIds(certId).flatMap((d) => getDomainQuestions(certId, d));
}

/**
 * Every question a certification's pack holds, retired ones INCLUDED. For
 * code that checks or keeps ids (a backup's known ids, the leak fingerprint),
 * never for building a quiz.
 */
export function getAllQuestionsIncludingRetired(certId: string): PackQuestion[] {
  return sourceFor(certId).domainIds(certId).flatMap((d) => domainEvery(certId, d));
}

/** id → question, per cert, built once (a mock submit looks up 150 at a time). */
const byId = new Map<string, Map<string, PackQuestion>>();

/** Look up one question by id, e.g. when resuming a review. Finds retired questions too. */
export function findQuestion(certId: string, id: string): PackQuestion | undefined {
  let index = byId.get(certId);
  if (!index) {
    index = new Map(getAllQuestionsIncludingRetired(certId).map((q) => [q.id, q]));
    byId.set(certId, index);
  }
  return index.get(id);
}

/**
 * Sibling groups (engine/siblings.ts): a question id's group in this exam's
 * pack, or undefined (no group, or an unknown id). Every live course: always
 * undefined, so sets and games stay exactly as they were.
 */
export function siblingGroupOf(certId: string): (id: string) => string | undefined {
  return (id) => findQuestion(certId, id)?.siblingGroup;
}

/** True when this certification has questions inside the app. */
export function hasContent(certId: string): boolean {
  return packInstalled(certId);
}

onClearContentCaches(() => {
  everyCache.clear();
  poolCache.clear();
  byId.clear();
});
