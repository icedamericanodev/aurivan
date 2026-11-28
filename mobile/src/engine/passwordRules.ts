/**
 * Password rules for KaiSip accounts (owner decisions of 28 Nov 2026,
 * docs/WEB_LAUNCH_PLAN.md; design docs/mobile/PASSWORD_SIGN_IN_DESIGN.md §4.3).
 * Shared by the website (compiled into assets/kaisip-cloud.js) and the phone.
 *
 * Plain English for the founder:
 * - A password needs at least 15 characters. There are no "must contain a
 *   digit / capital / symbol" rules (NIST SP 800-63B-4 says not to: they push
 *   people to "Password1!"). Spaces, accents and emoji are all fine, and so
 *   are pasting and password managers.
 * - The longest password the sign-in server can store is 72 bytes. That is
 *   72 plain letters or digits (more than NIST's "at least 64"), but fewer
 *   when the password has accents or emoji, which take 2 to 4 bytes each.
 * - Before a password is checked or sent it is put in one standard Unicode
 *   form (NFC), so "é" typed as one key and "é" typed as "e" + accent are the
 *   same password on every device.
 * - Because Supabase's Free plan has no leaked-password check, the apps refuse
 *   (NIST's blocklist, OWASP ASVS 5.0 6.2.4):
 *   - the 3,000 most common passwords that are long enough to pass the length
 *     rule (passwordBlocklist.ts says where the list comes from);
 *   - passwords made mostly of the email's name part, of "kaisip", "cisa" or
 *     "isaca", or of words like "password" and "qwerty";
 *   - repeats and sequences ("aaaa…", "abcabc…", "123456…", "qwerty…").
 *   This check runs only in our apps: someone calling the server directly for
 *   their own account could skip it (a documented deviation until Pro).
 * - The answer is a list of reason codes, most important first, for the
 *   screen to pick its words. An empty list means "this password is fine".
 * - Nothing here keeps, logs or sends the password. It runs in well under a
 *   millisecond (the list is turned into a lookup set once).
 *
 * Pure TypeScript: no React, no storage, no network.
 */
import { normalizeEmail } from './account';
import { PASSWORD_BLOCKLIST_TEXT } from './passwordBlocklist';

/** At least this many characters (Unicode code points, after NFC). Owner decision; the dashboard says the same. */
export const PASSWORD_MIN_CHARS = 15;
/** The sign-in server's limit (bcrypt): at most 72 bytes of UTF-8. */
export const PASSWORD_MAX_BYTES = 72;

/**
 * Why a password is refused (the first one is the one to show):
 * - too_short: under 15 characters;
 * - too_long: over 72 bytes;
 * - common: on the common-password list, or mostly a very common password
 *   word ("password", "qwerty", "iloveyou"…);
 * - contains_email: mostly the email address's name part;
 * - contains_service_word: mostly "kaisip", "cisa" or "isaca";
 * - too_simple: repeats, sequences, keyboard rows, or very few different characters.
 */
export type PasswordProblem = 'too_short' | 'too_long' | 'common' | 'contains_email' | 'contains_service_word' | 'too_simple';

/** The app, and the exam and its body (owner decision; NIST: "the name of the service"). */
export const SERVICE_WORDS: readonly string[] = ['kaisip', 'cisa', 'isaca'];
/** Words that make most common passwords (the list catches the exact ones; this catches "password" + padding). */
export const COMMON_WORDS: readonly string[] = ['password', 'passwort', 'qwerty', 'letmein', 'welcome', 'iloveyou', 'changeme', 'admin', 'login', 'secret'];

/**
 * What is left after the predictable parts must be worth at least this many
 * "pieces" (one piece = one character typed at random, or one whole repeat or
 * sequence). Five pieces or fewer is a pattern, not a password.
 */
const MIN_PIECES = 6;
/** Fewer different characters than this is a repeat ("1001010011010100"). */
const MIN_DISTINCT = 5;
/** Repeats and sequences count from this length. */
const RUN = 3;
/** Rows of a US keyboard, for "qwerty" and "asdf" style runs (either direction). */
const KEY_ROWS = ['`1234567890-=', 'qwertyuiop[]\\', "asdfghjkl;'", 'zxcvbnm,./'];
/** Common letter-for-number swaps ("p4ssw0rd"), used only to find the words above. */
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's', '!': 'i' };
/** Joiners people put between words; they add nothing to a pattern. */
const JOINERS = /[\s._-]+/g;

let blocklist: Set<string> | null = null;
function blocked(): Set<string> {
  if (!blocklist) blocklist = new Set(PASSWORD_BLOCKLIST_TEXT.split('\n'));
  return blocklist;
}

/**
 * The password as the apps check and send it: Unicode NFC. Never trimmed or
 * shortened (NIST: no truncation; spaces count). Sign-in, sign-up, reset and
 * "set a password" all use this, so the same keys always make the same password.
 */
export function normalizePassword(password: string): string {
  // Hermes, browsers and Node all have String.prototype.normalize; plain ASCII is already NFC.
  return typeof password.normalize === 'function' ? password.normalize('NFC') : password;
}

/** Characters, counted as Unicode code points (NIST), after NFC. */
export function passwordLength(password: string): number {
  return Array.from(normalizePassword(password)).length;
}

/** UTF-8 bytes after NFC (the server's 72-byte limit). */
export function passwordBytes(password: string): number {
  let n = 0;
  for (const ch of normalizePassword(password)) {
    const c = ch.codePointAt(0)!;
    n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  return n;
}

/** True when the password (any case) is on the common-password list, with or without its spaces and joiners. */
export function isCommonPassword(password: string): boolean {
  const p = normalizePassword(password).toLowerCase();
  const set = blocked();
  return set.has(p) || set.has(p.replace(JOINERS, ''));
}

/** The longest repeat, sequence or keyboard run starting at i (0 when shorter than RUN). */
function runAt(s: string[], i: number): number {
  let best = 0;
  // A copy of something earlier (overlap allowed: "aaaa", "abab", "passwordpassword").
  for (let j = 0; j < i; j++) {
    let k = 0;
    while (i + k < s.length && s[j + k] === s[i + k]) k++;
    if (k > best) best = k;
  }
  // The same character again and again.
  let k = 1;
  while (i + k < s.length && s[i + k] === s[i]) k++;
  if (k > best) best = k;
  // Up or down by one ("abcd", "9876"), letters and digits only.
  for (const d of [1, -1]) {
    let n = 1;
    while (i + n < s.length && /[a-z0-9]/.test(s[i + n]) && /[a-z0-9]/.test(s[i + n - 1]) && s[i + n].charCodeAt(0) - s[i + n - 1].charCodeAt(0) === d) n++;
    if (n > best) best = n;
  }
  // Along a keyboard row, either way ("qwerty", "lkjh").
  for (const row of KEY_ROWS) {
    const at = row.indexOf(s[i]);
    if (at < 0) continue;
    for (const d of [1, -1]) {
      let n = 1;
      while (i + n < s.length && row[at + n * d] === s[i + n]) n++;
      if (n > best) best = n;
    }
  }
  return best >= RUN ? best : 0;
}

/**
 * How many "pieces" a string is: each run (repeat, sequence, keyboard row,
 * copy of an earlier part) counts once, every other character once.
 */
export function patternPieces(text: string): number {
  const s = Array.from(text);
  let pieces = 0;
  for (let i = 0; i < s.length; ) {
    const run = runAt(s, i);
    i += run || 1;
    pieces++;
  }
  return pieces;
}

/** Remove every copy of each word (longest first). Returns what is left and whether anything matched. */
function strip(text: string, words: readonly string[]): { rest: string; hit: boolean } {
  let rest = text;
  let hit = false;
  for (const w of [...words].sort((a, b) => b.length - a.length)) {
    if (!w) continue;
    const next = rest.split(w).join('');
    if (next !== rest) hit = true;
    rest = next;
  }
  return { rest, hit };
}

const fold = (s: string) => Array.from(s, (c) => LEET[c] ?? c).join('');

/** 'd' digit, 'l' letter (any script), 'o' anything else. Plain code, no Unicode regex classes (older engines). */
function kindOf(ch: string): 'd' | 'l' | 'o' {
  if (ch >= '0' && ch <= '9') return 'd';
  return ch.toLowerCase() !== ch.toUpperCase() ? 'l' : 'o';
}

/** The email's name part and its pieces of 3+ characters ("maya.santos1990" → itself, "maya", "santos", "1990"). */
export function emailWords(email: string | null | undefined): string[] {
  if (typeof email !== 'string' || !email) return [];
  const e = normalizePassword(normalizeEmail(email));
  const at = e.lastIndexOf('@');
  const local = at > 0 ? e.slice(0, at) : e;
  const out = new Set<string>();
  if (Array.from(local).length >= RUN) out.add(local);
  // Pieces: runs of letters, or of digits ("maya", "santos", "1990").
  let piece = '';
  let kind: 'd' | 'l' | 'o' = 'o';
  for (const ch of [...Array.from(local), '.']) {
    const k = kindOf(ch);
    if (k !== kind || k === 'o') {
      if (kind !== 'o' && Array.from(piece).length >= RUN) out.add(piece);
      piece = '';
    }
    kind = k;
    if (k !== 'o') piece += ch;
  }
  return [...out];
}

/**
 * Every reason this password would be refused, most important first ([]:
 * fine). `email` is the account's address (its name part may not be most of
 * the password). Over 72 bytes, only 'too_long' is reported (nothing else
 * matters until it is shorter, and it keeps the work small).
 */
export function checkPassword(password: string, email?: string | null): PasswordProblem[] {
  const p = normalizePassword(typeof password === 'string' ? password : '');
  if (passwordBytes(p) > PASSWORD_MAX_BYTES) return ['too_long'];
  const out: PasswordProblem[] = [];
  if (Array.from(p).length < PASSWORD_MIN_CHARS) out.push('too_short');
  const lower = p.toLowerCase();
  const mine = emailWords(email);

  // The predictable words taken out, as typed and with "p4ssw0rd" swaps undone.
  const kinds: [PasswordProblem, readonly string[]][] = [
    ['contains_email', mine],
    ['contains_service_word', SERVICE_WORDS],
    ['common', COMMON_WORDS],
  ];
  const found = new Set<PasswordProblem>();
  let a = lower;
  let b = fold(lower);
  for (const [kind, words] of kinds) {
    const ra = strip(a, words);
    const rb = strip(b, words.map(fold));
    if (ra.hit || rb.hit) found.add(kind);
    a = ra.rest;
    b = rb.rest;
  }
  const weakRest = found.size > 0 && Math.min(patternPieces(a.replace(JOINERS, '')), patternPieces(b.replace(JOINERS, ''))) < MIN_PIECES;

  if (isCommonPassword(p)) out.push('common');
  if (weakRest) {
    // Name the most personal reason first: the email, then the app's words, then "password".
    const why = (['contains_email', 'contains_service_word', 'common'] as const).find((k) => found.has(k))!;
    if (!out.includes(why)) out.push(why);
  }
  const distinct = new Set(Array.from(lower)).size;
  if (distinct < MIN_DISTINCT || patternPieces(lower) < MIN_PIECES) out.push('too_simple');
  return out;
}

/** The one reason to show, or null when the password is fine. */
export function passwordProblem(password: string, email?: string | null): PasswordProblem | null {
  return checkPassword(password, email)[0] ?? null;
}
