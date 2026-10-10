/**
 * Content loader — the only code that knows WHERE questions come from.
 *
 * Today: questions are bundled inside the app (works fully offline, no
 * server needed). Later: a RemoteContentSource can download updated
 * packs from Supabase Storage and cache them on the device, so you can
 * fix a question without waiting for an App Store review. Screens never
 * change, because they only ever call these functions.
 */
import { generatedPacks } from './generated';
import type { PackQuestion } from './types';

// Simple in-memory cache so each domain file is parsed only once.
const cache = new Map<string, PackQuestion[]>();

/** All questions for one domain of one certification. */
export function getDomainQuestions(certId: string, domainId: string): PackQuestion[] {
  const key = `${certId}:${domainId}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const load = generatedPacks[certId]?.[domainId];
  const questions = load ? load() : [];
  cache.set(key, questions);
  return questions;
}

/** All questions for a certification (every domain). */
export function getAllQuestions(certId: string): PackQuestion[] {
  const domains = Object.keys(generatedPacks[certId] ?? {});
  return domains.flatMap((d) => getDomainQuestions(certId, d));
}

/** id → question, per cert, built once (a mock submit looks up 150 at a time). */
const byId = new Map<string, Map<string, PackQuestion>>();

/** Look up one question by id, e.g. when resuming a review. */
export function findQuestion(certId: string, id: string): PackQuestion | undefined {
  let index = byId.get(certId);
  if (!index) {
    index = new Map(getAllQuestions(certId).map((q) => [q.id, q]));
    byId.set(certId, index);
  }
  return index.get(id);
}

/** True when this certification has questions inside the app. */
export function hasContent(certId: string): boolean {
  return Boolean(generatedPacks[certId]);
}
