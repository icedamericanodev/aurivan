/**
 * The leaked-password check (Have I Been Pwned's Pwned Passwords range API,
 * k-anonymity). ON since 28 Nov 2026 (owner decision, "Do as recommended";
 * config.ts BREACH_CHECK_ON). engine/passwordBreach.ts has the pure half.
 *
 * Plain English for the founder:
 * - It runs when a password is chosen (sign-up, reset, "set a password"),
 *   after the app's own rules have accepted it; never at sign-in.
 * - Two forms of the password are looked up, because people change a
 *   leaked password a little: as typed, and ONE simplified version (owner
 *   decision 28 Nov 2026: at most two, so as little as possible is sent).
 *   The simplified version is the compared form (lower case, accents and
 *   spaces out, look-alikes as Latin) without its trailing numbers and
 *   symbols ("summer2026!" → "summer") when what is left is at least 8
 *   characters and at least half the password; otherwise the compared form
 *   itself. (Without that floor, "Zq #4829 1837 4401 9921" would be looked
 *   up as "zq" and refused as leaked.) A form the same as the typed one is
 *   not sent twice.
 * - For each, the device makes the SHA-1 fingerprint and sends only its
 *   first 5 characters; the answer lists every leaked fingerprint that
 *   starts the same way, and the device looks for the rest itself. The
 *   "Add-Padding" header asks the service to pad its answer with fake
 *   entries, so even the answer's size says nothing. If the request fails
 *   at the network level (a browser or network that refuses the header),
 *   it is tried once more without it: the answer's size then says a little
 *   about the prefix, which is still only 5 characters of a fingerprint.
 * - The email, the password and the whole fingerprint never leave the
 *   device. The service does see the device's IP address and that the
 *   request came from the website (no cookies and no referrer are sent).
 * - A network problem, an answer that isn't a range list, or no answer
 *   within 3 seconds (the requests are then cancelled) never blocks a
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
import { breachRangeParts, breachRangeResult } from '../engine/passwordBreach';
import { comparedForm, normalizePassword } from '../engine/passwordRules';
import type { FetchPort } from './ports';

/** What a lookup found. "unknown": it couldn't check (it never blocks). */
export type BreachVerdict = 'breached' | 'clean' | 'unknown';

export interface BreachDeps {
  fetch: FetchPort;
  /** SHA-1 as 40 hex characters (the page: browser.ts browserSha1Hex(crypto.subtle); else engine/sha1.ts). */
  sha1Hex: (text: string) => Promise<string>;
  /** The range API (default Have I Been Pwned's). */
  url?: string;
  /** All lookups together may take this long; then they are cancelled and the answer is "unknown" (default 3 s). */
  timeoutMs?: number;
}

/** The time all lookups may take together before the check gives up (fails open). */
export const BREACH_TIMEOUT_MS = 3000;

export const BREACH_RANGE_URL = 'https://api.pwnedpasswords.com/range';
/** Trailing numbers and symbols ("summer2026!" → "summer"). */
const TAIL = /[0-9!-/:-@[-`{-~]+$/;
/** The tail-less form is looked up only when it is at least this long, and at least half the password. */
export const BREACH_BASE_MIN = 8;

/**
 * The forms looked up (at most two, distinct, non-empty): as typed (NFKC),
 * and one simplified form: the compared form without its tail when that is
 * most of the password, otherwise the compared form.
 */
export function breachForms(password: unknown): string[] {
  const p = normalizePassword(password);
  if (!p) return [];
  const c = comparedForm(p);
  const t = c.replace(TAIL, '');
  const tl = Array.from(t).length;
  const keep = tl >= BREACH_BASE_MIN && tl * 2 >= Array.from(c).length;
  return [...new Set([p, keep ? t : c])].filter((x) => x.length > 0);
}

/** One lookup's outcome. 'network': the request itself failed (maybe the padding header was refused). */
type One = 'hit' | 'miss' | 'unknown' | 'network';

/** A check function for the auth client's `breachedPassword` port. */
export function createBreachCheck(deps: BreachDeps): (password: string) => Promise<BreachVerdict> {
  const base = (deps.url ?? BREACH_RANGE_URL).replace(/\/+$/, '');
  const ms = deps.timeoutMs ?? BREACH_TIMEOUT_MS;
  const one = async (prefix: string, suffix: string, padding: boolean, signal: AbortSignal | undefined): Promise<One> => {
    let res;
    try {
      res = await deps.fetch(`${base}/${prefix}`, {
        method: 'GET',
        headers: padding ? { 'Add-Padding': 'true' } : {},
        // Nothing cached, no cookies, no referrer, and never following a redirect elsewhere.
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        redirect: 'error',
        signal,
      });
    } catch {
      return 'network';
    }
    try {
      if (res.status !== 200) return 'unknown';
      const r = breachRangeResult(await res.text(), suffix);
      return r === 'bad' ? 'unknown' : r;
    } catch {
      return 'unknown';
    }
  };
  const run = async (password: string, signal: AbortSignal | undefined): Promise<BreachVerdict> => {
    const forms = breachForms(password);
    if (!forms.length) return 'unknown';
    const parts = await Promise.all(
      forms.map(async (f) => {
        try {
          return breachRangeParts(await deps.sha1Hex(f));
        } catch {
          return null;
        }
      }),
    );
    const lookup = (i: number, padding: boolean): Promise<One> => {
      const x = parts[i];
      return x ? one(x.prefix, x.suffix, padding, signal) : Promise.resolve('unknown');
    };
    // The forms are looked up together. A request the network refused is tried once more,
    // without the padding header (a setup that refuses custom headers across sites).
    let got = await Promise.all(parts.map((_, i) => lookup(i, true)));
    if (got.includes('hit')) return 'breached';
    if (got.includes('network') && !signal?.aborted) {
      got = await Promise.all(got.map((g, i) => (g === 'network' ? lookup(i, false) : Promise.resolve(g))));
      if (got.includes('hit')) return 'breached';
    }
    // Fail open: "clean" only when every form was really looked up; never a refusal without a hit.
    return got.every((g) => g === 'miss') ? 'clean' : 'unknown';
  };
  // A slow or silent service never holds a sign-up up for long: after the timeout the requests
  // are cancelled and the answer is "unknown" (the password is still accepted; the screen says
  // it couldn't check). The timer is cleared when the lookups finish first.
  return async (password) => {
    const ctl = typeof AbortController === 'function' ? new AbortController() : undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const late = new Promise<BreachVerdict>((resolve) => {
      timer = setTimeout(() => {
        ctl?.abort();
        resolve('unknown');
      }, ms);
    });
    try {
      return await Promise.race([run(password, ctl?.signal).catch((): BreachVerdict => 'unknown'), late]);
    } finally {
      clearTimeout(timer);
    }
  };
}
