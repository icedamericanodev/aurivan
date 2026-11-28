/**
 * The leaked-password check (Have I Been Pwned's Pwned Passwords range API,
 * k-anonymity). ON since 28 Nov 2026 (owner decision, "Do as recommended";
 * config.ts BREACH_CHECK_ON). engine/passwordBreach.ts has the pure half.
 *
 * Plain English for the founder:
 * - It runs when a password is chosen (sign-up, reset, "set a password"),
 *   after the app's own rules have accepted it; never at sign-in.
 * - Three forms of the password are looked up, because people change a
 *   leaked password a little: as typed, in the compared form (lower case,
 *   accents and spaces out, look-alikes as Latin), and the compared form
 *   without its trailing numbers and symbols ("summer2026!" → "summer").
 * - For each, the device makes the SHA-1 fingerprint and sends only its
 *   first 5 characters; the answer lists every leaked fingerprint that
 *   starts the same way, and the device looks for the rest itself. The
 *   "Add-Padding" header asks the service to pad its answer with fake
 *   entries, so even the answer's size says nothing. The email, the
 *   password and the whole fingerprint never leave the device.
 * - A network problem, or no answer within 3 seconds, never blocks a
 *   password ("fails open"): the answer is then "unknown", the password is
 *   accepted (the app's rules already passed it), and the screen can say it
 *   couldn't check (passwordGuidance('breach_unchecked')).
 * - Nothing is logged.
 *
 * The privacy-policy paragraph (a draft until the sign-in release) and the
 * website CSP are in docs/mobile/PASSWORD_SIGN_IN_DESIGN.md §7.
 *
 * Pure TypeScript: no React. Network and SHA-1 come in as ports.
 */
import { breachRangeHit, breachRangeParts } from '../engine/passwordBreach';
import { comparedForm, normalizePassword } from '../engine/passwordRules';
import type { FetchPort } from './ports';

/** What a lookup found. "unknown": it couldn't check (it never blocks). */
export type BreachVerdict = 'breached' | 'clean' | 'unknown';

export interface BreachDeps {
  fetch: FetchPort;
  /** SHA-1 as 40 hex characters (the page: browser.ts browserSha1Hex(crypto.subtle)). */
  sha1Hex: (text: string) => Promise<string>;
  /** The range API (default Have I Been Pwned's). */
  url?: string;
  /** All lookups together may take this long; then the answer is "unknown" (default 3 s). */
  timeoutMs?: number;
  /** How to wait (tests); default setTimeout. */
  wait?: (ms: number) => Promise<void>;
}

/** The time all three lookups may take together before the check gives up (fails open). */
export const BREACH_TIMEOUT_MS = 3000;

export const BREACH_RANGE_URL = 'https://api.pwnedpasswords.com/range';
/** Trailing numbers and symbols ("summer2026!" → "summer"). */
const TAIL = /[0-9!-/:-@[-`{-~]+$/;

/** The forms looked up: as typed (NFKC), compared, compared without its tail. Distinct, non-empty. */
export function breachForms(password: unknown): string[] {
  const p = normalizePassword(password);
  if (!p) return [];
  const c = comparedForm(p);
  return [...new Set([p, c, c.replace(TAIL, '')])].filter((x) => x.length > 0);
}

/** A check function for the auth client's `breachedPassword` port. */
export function createBreachCheck(deps: BreachDeps): (password: string) => Promise<BreachVerdict> {
  const base = (deps.url ?? BREACH_RANGE_URL).replace(/\/+$/, '');
  const wait = deps.wait ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const lookups = lookupAll(deps, base);
  // A slow or silent service never holds a sign-up up for long: after the timeout the
  // answer is "unknown" (the password is still accepted; the screen says it couldn't check).
  return (password) => Promise.race([lookups(password), wait(deps.timeoutMs ?? BREACH_TIMEOUT_MS).then(() => 'unknown' as const)]);
}

function lookupAll(deps: BreachDeps, base: string): (password: string) => Promise<BreachVerdict> {
  return async (password) => {
    let unknown = false;
    for (const f of breachForms(password)) {
      try {
        const parts = breachRangeParts(await deps.sha1Hex(f));
        if (!parts) {
          unknown = true;
          continue;
        }
        const res = await deps.fetch(`${base}/${parts.prefix}`, { method: 'GET', headers: { 'Add-Padding': 'true' } });
        if (res.status !== 200) {
          unknown = true;
          continue;
        }
        if (breachRangeHit(await res.text(), parts.suffix)) return 'breached';
      } catch {
        unknown = true; // fail open: a network problem never blocks a password
      }
    }
    return unknown ? 'unknown' : 'clean';
  };
}
