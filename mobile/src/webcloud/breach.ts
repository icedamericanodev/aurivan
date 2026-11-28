/**
 * DESIGN FOR LATER (owner decision pending; OFF: config.ts BREACH_CHECK_ON
 * is false and nothing creates this today). The network half of a
 * breached-password range check, k-anonymity style, against Have I Been
 * Pwned's range API (engine/passwordBreach.ts has the pure half).
 *
 * Plain English for the founder:
 * - Three forms of the password are looked up, because people change a
 *   leaked password a little: as typed, in the compared form (lower case,
 *   accents and spaces out, look-alikes as Latin), and the compared form
 *   without its trailing numbers and symbols ("summer2026!" → "summer").
 * - For each, the device makes the SHA-1 fingerprint and sends only its
 *   first 5 characters; the answer lists every leaked fingerprint that
 *   starts the same way, and the device looks for the rest itself. The
 *   "Add-Padding" header asks the service to pad its answer with fake
 *   entries, so even the answer's size says nothing.
 * - A network problem never blocks a password ("fails open"): the answer is
 *   then "unknown", and the screen says it couldn't check
 *   (passwordGuidance('breach_unchecked')).
 * - Nothing is logged, and the password never leaves the device.
 *
 * Needed if it is ever switched on: the privacy-policy line and the website
 * CSP change written in docs/WEB_LAUNCH_PLAN.md ("Breached-password check").
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
  /** SHA-1 as 40 hex characters (the page: crypto.subtle.digest('SHA-1', …)). */
  sha1Hex: (text: string) => Promise<string>;
  /** The range API (default Have I Been Pwned's). */
  url?: string;
}

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
