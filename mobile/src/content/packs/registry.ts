/**
 * The pack registry: which SOURCE each certification's content is read from.
 *
 * Plain English:
 * - Today every pack is bundled in the app, so every answer is BundledSource.
 * - Phase C adds the packs a learner downloaded. `registerPackSource` lets it
 *   add that second source without touching any screen or loader.
 * - When two sources have a pack for the same exam, the NEWER rev wins; on a
 *   tie the bundled one does. So the bundle is a floor: an older download can
 *   never replace newer bundled content.
 * - A pack written in a newer format than this app reads
 *   (schemaVersion > PACK_SCHEMA_VERSION) is ignored, never half-read.
 * - Loaders cache what they parse. `clearContentCaches()` empties every one
 *   of those caches at once (after a pack is installed, and in tests).
 *
 * No React, no storage, no network: plain functions, all synchronous.
 */
import { BundledSource } from './bundled';
import type { PackInfo, PackSource } from './types';

/** The newest pack format this app can read (scripts/build-content.mjs PACK_SCHEMA_VERSION). */
export const PACK_SCHEMA_VERSION = 1;

/** Sources other than the bundle (Phase C: downloaded packs). The bundle is always there. */
let extra: PackSource[] = [];

/** A source's info for this cert, when it has a pack this app can read. */
function readable(src: PackSource, certId: string): PackInfo | null {
  const info = src.info(certId);
  return info && info.schemaVersion <= PACK_SCHEMA_VERSION ? info : null;
}

/**
 * The source to read this cert's content from: the one with the newest
 * readable pack (the bundle on a tie). With no pack anywhere it is still
 * the bundle, whose reads then all say "nothing" (an exam not on this phone).
 */
export function sourceFor(certId: string): PackSource {
  let best: PackSource = BundledSource;
  let bestRev = readable(BundledSource, certId)?.rev ?? -1;
  for (const src of extra) {
    const rev = readable(src, certId)?.rev;
    if (rev !== undefined && rev > bestRev) {
      best = src;
      bestRev = rev;
    }
  }
  return best;
}

/** The version facts of the pack this cert reads from, or null when no pack is on this phone. */
export function packInfo(certId: string): PackInfo | null {
  return readable(sourceFor(certId), certId);
}

/** True when this cert has a readable pack on this phone (bundled or, later, downloaded). */
export function packInstalled(certId: string): boolean {
  return packInfo(certId) !== null;
}

/** Every cert with a readable pack on this phone, the bundled ones first. */
export function installedCertIds(): string[] {
  const ids = new Set<string>();
  for (const src of [BundledSource, ...extra]) for (const id of src.certIds()) if (readable(src, id)) ids.add(id);
  return [...ids];
}

/**
 * Add a source (Phase C: downloaded packs; tests: a fake). Clears every
 * content cache so the next read sees it. Returns a function that removes it.
 */
export function registerPackSource(src: PackSource): () => void {
  extra = [...extra, src];
  clearContentCaches();
  return () => {
    extra = extra.filter((s) => s !== src);
    clearContentCaches();
  };
}

// ── Caches ───────────────────────────────────────────────────────────────
// Each loader registers how to empty its own cache when its module loads, so
// this file never imports a loader (no import cycles: loaders import the
// registry, never the other way round).
const clearers = new Set<() => void>();

/** A loader's cache-emptying function, run by clearContentCaches(). */
export function onClearContentCaches(clear: () => void): void {
  clearers.add(clear);
}

/**
 * Forget every parsed or derived piece of content (questions and their id
 * index, notes, principles, exam pack, lessons, game decks, and the derived
 * indexes in lib/: backup's known ids, the outline, plant subtopics, leak
 * fingerprints, principle question indexes). The next read parses again.
 */
export function clearContentCaches(): void {
  for (const clear of clearers) clear();
}
