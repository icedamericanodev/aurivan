/**
 * Mindset tips for the Practice tab's strip (Grove Phase 4, PHASE4.md 7.8 item 3).
 *
 * Plain English: the website rotates short "Mindset." tips on its Practice page. Sky answered O7 YES
 * (5 Nov 2026): the phone gets the same list and shows the strip. The list is not copied here by
 * hand: the content build (scripts/build-content.mjs with scripts/mindset-pack.cjs) reads the
 * website's MINDSET list from index.html, word for word, and writes it into the phone's content pack
 * (generated/<cert>/mindset.json). So when the website's list changes, the phone follows on the next
 * build. A course with no tips gets [] and the strip hides itself (never an empty card).
 */
import { onClearContentCaches, sourceFor } from './packs';

/** The pack file: the course id and its tips, in the website's order. */
export interface MindsetPack {
  certId: string;
  tips: string[];
}

const cache = new Map<string, readonly string[]>();

/** The course's Mindset tips, in the website's order; [] for a course that has none. */
export function mindsetTipsFor(certId: string): readonly string[] {
  const hit = cache.get(certId);
  if (hit) return hit;
  const raw = sourceFor(certId).mindset?.(certId)?.tips;
  // Only text survives: a damaged pack gives fewer tips, never a crash or an empty line.
  const tips = Array.isArray(raw) ? raw.filter((t): t is string => typeof t === 'string' && t.trim().length > 0) : [];
  cache.set(certId, tips);
  return tips;
}

onClearContentCaches(() => cache.clear());
