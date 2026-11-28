/**
 * The pure half of the leaked-password range check, k-anonymity style (Have
 * I Been Pwned's "range" API; ON since 28 Nov 2026, webcloud/breach.ts has
 * the network half). Nothing here talks to the network.
 *
 * Plain English for the founder:
 * - The page would make the password's SHA-1 fingerprint (40 hex
 *   characters) on the learner's device, send only the first 5 to the
 *   lookup service, and get back every known-leaked fingerprint that starts
 *   the same way (hundreds of them). If the other 35 characters are in that
 *   answer, the password has leaked somewhere and is refused. The service
 *   never sees the password or its whole fingerprint.
 * - These two helpers split the fingerprint and read the answer.
 *
 * Pure TypeScript: no React, no storage, no network.
 */

/** A SHA-1 hex fingerprint → what is sent (5 characters) and what is looked for (35), upper case. null when it isn't one. */
export function breachRangeParts(sha1Hex: unknown): { prefix: string; suffix: string } | null {
  if (typeof sha1Hex !== 'string' || !/^[0-9a-fA-F]{40}$/.test(sha1Hex)) return null;
  const h = sha1Hex.toUpperCase();
  return { prefix: h.slice(0, 5), suffix: h.slice(5) };
}

/**
 * True when the range answer ("SUFFIX:COUNT" lines) lists this suffix with a
 * count above zero (padding entries have count 0). Bad input: false (the
 * check fails open).
 */
export function breachRangeHit(answer: unknown, suffix: unknown): boolean {
  if (typeof answer !== 'string' || typeof suffix !== 'string' || !/^[0-9A-F]{35}$/.test(suffix) || answer.length > 2_000_000) return false;
  for (const line of answer.split(/\r?\n/)) {
    const [s, n] = line.trim().split(':');
    if (s && s.toUpperCase() === suffix && Number(n) > 0) return true;
  }
  return false;
}
