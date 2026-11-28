/**
 * The pure half of the leaked-password range check, k-anonymity style (Have
 * I Been Pwned's "range" API; ON since 28 Nov 2026, webcloud/breach.ts has
 * the network half). Nothing here talks to the network.
 *
 * Plain English for the founder:
 * - The page makes the password's SHA-1 fingerprint (40 hex characters) on
 *   the learner's device, sends only the first 5 to the lookup service, and
 *   gets back every known-leaked fingerprint that starts the same way
 *   (several hundred to a thousand-odd of them). If the other 35 characters
 *   are in that answer, the password has leaked somewhere and is refused.
 *   The service never sees the password or its whole fingerprint.
 * - These two helpers split the fingerprint and read the answer. An answer
 *   that isn't a range list at all (an error page, an empty or huge body)
 *   is 'bad', so the check says "couldn't check" instead of "not leaked".
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
 * The biggest answer read. A real one, padded, is about 40 KB (800 to 1,000
 * lines of 40-odd characters); anything far bigger is not the range API.
 */
export const BREACH_ANSWER_MAX = 200_000;

const RANGE_LINE = /^([0-9A-F]{35}):(\d+)$/i;

/**
 * Reads a range answer ("SUFFIX:COUNT" lines): 'hit' when it lists this
 * suffix with a count above zero (padding entries have count 0), 'miss' when
 * it is a real range list without it, and 'bad' when it isn't one (not
 * text, over BREACH_ANSWER_MAX, or no line in the SUFFIX:COUNT shape) or
 * the suffix is malformed. 'bad' means "couldn't check" (the check fails open).
 */
export function breachRangeResult(answer: unknown, suffix: unknown): 'hit' | 'miss' | 'bad' {
  if (typeof answer !== 'string' || typeof suffix !== 'string' || !/^[0-9A-F]{35}$/.test(suffix) || answer.length > BREACH_ANSWER_MAX) return 'bad';
  let rangeLines = 0;
  for (const line of answer.split(/\r?\n/)) {
    const m = RANGE_LINE.exec(line.trim());
    if (!m) continue;
    rangeLines++;
    if (m[1].toUpperCase() === suffix && Number(m[2]) > 0) return 'hit';
  }
  return rangeLines > 0 ? 'miss' : 'bad';
}
