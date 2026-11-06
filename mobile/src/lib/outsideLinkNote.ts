/**
 * The note app/+native-intent.tsx leaves when an outside link arrives before saved settings have
 * loaded (a cold start). lib/outsideLinkGate.ts reads it once they have (release bug hunt round 3).
 * No imports on purpose: the link hook loads this before anything else.
 */
let pending = false;

/** An outside link arrived before saved settings had loaded: check it once they have. */
export function noteOutsideLink(): void {
  pending = true;
}

/** Is a check waiting? */
export function outsideLinkPending(): boolean {
  return pending;
}

/** Read the note and clear it (the check runs once). */
export function takeOutsideLink(): boolean {
  const was = pending;
  pending = false;
  return was;
}
