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

/** Look up one question by id, e.g. when resuming a review. */
export function findQuestion(certId: string, id: string): PackQuestion | undefined {
  // Ids look like "d4_217": the number after "d" is the domain.
  const domainId = /^d(\d+)_/.exec(id)?.[1];
  if (domainId) {
    const found = getDomainQuestions(certId, domainId).find((q) => q.id === id);
    if (found) return found;
  }
  return getAllQuestions(certId).find((q) => q.id === id);
}

/** True when this certification has questions inside the app. */
export function hasContent(certId: string): boolean {
  return Boolean(generatedPacks[certId]);
}
