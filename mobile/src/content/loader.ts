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
 */
import { onClearContentCaches, packInstalled, sourceFor } from './packs';
import type { PackQuestion } from './types';

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

/** All questions for one domain of one certification (retired ones left out). */
export function getDomainQuestions(certId: string, domainId: string): PackQuestion[] {
  const key = `${certId}:${domainId}`;
  const hit = poolCache.get(key);
  if (hit) return hit;
  const every = domainEvery(certId, domainId);
  // Same array when nothing is retired (today: always), so nothing is copied.
  const pool = every.some((q) => q.retired) ? every.filter((q) => !q.retired) : every;
  poolCache.set(key, pool);
  return pool;
}

/** All questions for a certification (every domain; retired ones left out). */
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

/** True when this certification has questions inside the app. */
export function hasContent(certId: string): boolean {
  return packInstalled(certId);
}

onClearContentCaches(() => {
  everyCache.clear();
  poolCache.clear();
  byId.clear();
});
