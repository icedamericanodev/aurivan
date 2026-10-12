/**
 * The leak guard's fingerprint of the BUNDLED question bank, on the phone
 * (Uplift Phase 8, built OFF; spec §4.7). Built once, the first time the
 * composer needs it, from the questions already inside the app: nothing is
 * downloaded, nothing is saved, and nothing here ever shows how many
 * questions there are. Cloud builds only (the composer is a (cloud) screen).
 */
import { getAllQuestions } from '../content/loader';
import type { PackQuestion } from '../content/types';
import { buildFingerprint, leakItem, type Fingerprint } from '../engine/leakGuard';

const cache = new Map<string, Fingerprint>();

/** The fingerprint for one exam's bank (memoised for the session). */
export function bankFingerprint(certId: string): Fingerprint {
  let fp = cache.get(certId);
  if (!fp) {
    fp = buildFingerprint(getAllQuestions(certId).map(leakItem));
    cache.set(certId, fp);
  }
  return fp;
}

/** True once the fingerprint for this exam is built (the composer shows no "checking" state after that). */
export function bankFingerprintReady(certId: string): boolean {
  return cache.has(certId);
}

/** The question a match points at (to offer "Report it privately" on it). Same order as the fingerprint. */
export function bankQuestionAt(certId: string, index: number | undefined): PackQuestion | undefined {
  if (index === undefined) return undefined;
  return getAllQuestions(certId)[index];
}
