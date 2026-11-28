/**
 * Password rules for KaiSip accounts (owner decisions of 28 Nov 2026,
 * docs/WEB_LAUNCH_PLAN.md; design docs/mobile/PASSWORD_SIGN_IN_DESIGN.md §4.3).
 * Shared by the website (compiled into assets/kaisip-cloud.js) and the phone.
 * The standard: NIST SP 800-63B-4 §3.1.1.2 and OWASP ASVS 5.0 V6.2.
 *
 * Plain English for the founder:
 * - A password needs at least 15 characters. There are no "must contain a
 *   digit / capital / symbol" rules (NIST says not to: they push people to
 *   "Password1!"). Spaces, accents and emoji are fine, and so are pasting and
 *   password managers.
 * - The longest password the sign-in server can store is 72 bytes: 72 plain
 *   letters, fewer with accents or emoji (2 to 4 bytes each). That is a
 *   documented deviation from NIST's "at least 64 characters" for non-English
 *   text. Invisible control characters can't be used.
 * - Before anything else the password is put in one standard Unicode form
 *   (NFKC), so "é" typed as one key or as "e" + accent, and full-width
 *   letters, all make the same password on every device. If a phone or
 *   browser can't do that, a password with non-English characters is refused
 *   rather than sent unchanged.
 * - Because Supabase's Free plan has no leaked-password check, the apps
 *   refuse common and predictable passwords. NIST asks us to compare the
 *   WHOLE password, so the rule is: refuse it when the whole password can be
 *   written as predictable pieces with at most 2 characters left over. The
 *   predictable pieces are:
 *   - "kaisip", "cisa", "isaca", the other course names and study words
 *     ("exam", "study", "pass"…), any number of times;
 *   - the account's own email address, its name part and its pieces, the
 *     domain name, and the learner's name when the app knows it (Google);
 *   - up to two words from the bundled lists: the 10,000 most used short
 *     passwords and every English word of 15+ letters ("congratulations");
 *   - repeats, sequences ("abcd", "1357"), keyboard rows and columns
 *     ("qwerty", "1qaz2wsx"), and copies of an earlier part;
 *   - a short number (up to 4 digits) or a year (1900 to 2099), and symbols.
 *   Three different ordinary words always pass ("maple cloud tiger").
 *   The 3,000 most used passwords of 15+ characters are refused as they are.
 * - The check runs only in our apps: someone calling the server directly for
 *   their own account could skip it (a documented deviation until the Pro
 *   plan's server check).
 * - The answer is a list of reason codes, most important first, and
 *   passwordGuidance gives the words the screen shows (NIST: the app SHALL
 *   say how to choose a better one).
 * - Nothing here keeps, logs or sends the password.
 *
 * Pure TypeScript: no React, no storage, no network. The word lists are big,
 * so they are not imported here: loadPasswordWords gives them (the website
 * fetches them only when a password form opens; see auth.ts).
 */
import { normalizeEmail } from './account';
import { PASSWORD_LONG_LIST } from './passwordBlocklist';

/** At least this many characters (Unicode code points, in both NFC and NFKC). Owner decision; the dashboard says the same. */
export const PASSWORD_MIN_CHARS = 15;
/** The sign-in server's limit (bcrypt): at most 72 bytes of UTF-8. */
export const PASSWORD_MAX_BYTES = 72;
/** At most this many characters may be left over after the predictable pieces. */
export const MAX_LEFT_OVER = 2;
/** At most this many words from the bundled lists count as predictable pieces. */
export const MAX_LIST_WORDS = 2;

/**
 * Why a password is refused, most important first:
 * - invalid_characters: control characters, a broken character, or a device
 *   that can't put the password in standard form;
 * - too_short: under 15 characters;
 * - too_long: over 72 bytes;
 * - contains_email: mostly the email address or the learner's name;
 * - contains_service_word: mostly "kaisip", the exam names or study words;
 * - common: a common password, or common words with small changes;
 * - too_simple: repeats, sequences, keyboard patterns or a few characters.
 */
export type PasswordProblem = 'invalid_characters' | 'too_short' | 'too_long' | 'contains_email' | 'contains_service_word' | 'common' | 'too_simple';

/** What the app knows about the learner (NIST: "context-specific words"). */
export interface PasswordContext {
  email?: string | null;
  /** The learner's name, when known (Google's display name). Never stored. */
  names?: readonly (string | null | undefined)[];
}

/** The app, the exams and their bodies (owner decision; NIST: "the name of the service"). */
export const SERVICE_WORDS: readonly string[] = ['kaisip', 'cisa', 'isaca', 'crisc', 'aaia', 'csoe', 'cia'];
/** Study words that go with them ("cisaexam2026pass"). */
export const STUDY_WORDS: readonly string[] = ['exam', 'study', 'pass', 'prep', 'cert', 'certified', 'audit', 'auditor'];

/**
 * What the screen shows after a refusal (NIST: SHALL offer guidance). The
 * key is for the copy file; the text is the default English.
 */
export const PASSWORD_GUIDANCE: Readonly<Record<PasswordProblem, { key: string; text: string }>> = {
  invalid_characters: { key: 'password.guide.invalid_characters', text: 'Some characters can’t be used in a password. Use letters, numbers, spaces and the symbols on your keyboard.' },
  too_short: { key: 'password.guide.too_short', text: 'Use at least 15 characters. Three or four ordinary words with spaces are easy to remember.' },
  too_long: { key: 'password.guide.too_long', text: 'Use up to 72 letters, fewer with accents or emoji.' },
  contains_email: { key: 'password.guide.contains_email', text: 'Don’t build your password from your email address or your name. Add words only you would pick.' },
  contains_service_word: { key: 'password.guide.contains_service_word', text: 'Don’t build your password from the app’s or the exam’s name. Add words only you would pick.' },
  common: { key: 'password.guide.common', text: 'That password is used by many people or is easy to guess. Try three or four words that don’t usually go together.' },
  too_simple: { key: 'password.guide.too_simple', text: 'Avoid repeats, sequences and keyboard patterns like abcabc, 123456 or qwerty.' },
};

/** The words to show for a reason (null for none). Type-guarded: an unknown value gives null. */
export function passwordGuidance(problem: unknown): { key: string; text: string } | null {
  return typeof problem === 'string' && Object.prototype.hasOwnProperty.call(PASSWORD_GUIDANCE, problem) ? PASSWORD_GUIDANCE[problem as PasswordProblem] : null;
}

// ── Lists ──────────────────────────────────────────────────────────────

/** Letters ROT13, digits ROT5 (the lists are stored lightly scrambled: they hold rude words). */
function rot(s: string): string {
  let o = '';
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    if (c >= 97 && c <= 122) o += String.fromCharCode(((c - 97 + 13) % 26) + 97);
    else if (c >= 48 && c <= 57) o += String.fromCharCode(((c - 48 + 5) % 10) + 48);
    else o += ch;
  }
  return o;
}

/** A stored list → its entries (scripts/password-lists.cjs encodeList: shared starts, then scrambled). */
export function decodeList(text: string): string[] {
  const out: string[] = [];
  let prev = '';
  for (const line of typeof text === 'string' ? text.split('\n') : []) {
    if (!line) continue;
    const w = prev.slice(0, line.charCodeAt(0) - 0x41) + rot(line.slice(1));
    out.push(w);
    prev = w;
  }
  return out;
}

let longSet: Set<string> | null = null;
const long = () => (longSet ??= new Set(decodeList(PASSWORD_LONG_LIST)));
let wordSet: Set<string> | null = null;

/**
 * Give the rules their word lists (passwordWords.ts: PASSWORD_SHORT_LIST and
 * PASSWORD_DICT_LIST). Until then the rules still refuse the 15+ list,
 * patterns and the context words, but auth.ts never saves a password before
 * this is done. Bad input is ignored (the lists stay unloaded).
 */
export function loadPasswordWords(lists: { short: string; dict: string }): void {
  if (!lists || typeof lists.short !== 'string' || typeof lists.dict !== 'string') return;
  const set = new Set<string>([...decodeList(lists.short), ...decodeList(lists.dict)]);
  if (set.size < 1000) return;
  for (const w of long()) set.add(w);
  wordSet = set;
}
/** True once loadPasswordWords has run with real lists. */
export function passwordWordsLoaded(): boolean {
  return wordSet !== null;
}
/** Tests only: forget the word lists. */
export function unloadPasswordWordsForTest(): void {
  wordSet = null;
}

// ── Normal form ────────────────────────────────────────────────────────

const ASCII_ONLY = /^[\x00-\x7f]*$/;
/** C0 and C1 control characters (tab and line breaks included). Spaces are fine. */
const CONTROL = /[\x00-\x1f\x7f-\x9f]/;
/** Joiners people put between words; the comparison ignores them. */
const JOINERS = /[\s._-]+/g;

function loneSurrogate(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const d = s.charCodeAt(i + 1);
      if (!(d >= 0xdc00 && d <= 0xdfff)) return true;
      i++;
    } else if (c >= 0xdc00 && c <= 0xdfff) return true;
  }
  return false;
}

function form(s: string, f: 'NFC' | 'NFKC'): string | null {
  if (typeof s.normalize !== 'function') return ASCII_ONLY.test(s) ? s : null;
  try {
    return s.normalize(f);
  } catch {
    return null;
  }
}

/**
 * The password as the apps check and send it: Unicode NFKC. Never trimmed or
 * shortened (NIST: no truncation; spaces count). null when it can't be put
 * in that form (a broken character, or a device without Unicode
 * normalisation and a non-ASCII password): the apps then refuse it rather
 * than send it unchanged. Sign-in, sign-up, reset and "set a password" all
 * use this, so the same keys always make the same password.
 */
export function normalizePassword(password: unknown): string | null {
  if (typeof password !== 'string' || loneSurrogate(password)) return null;
  return form(password, 'NFKC');
}

/** Characters (code points) after NFKC; 0 when it can't be normalised. */
export function passwordLength(password: unknown): number {
  const p = normalizePassword(password);
  return p === null ? 0 : Array.from(p).length;
}

/** UTF-8 bytes after NFKC (the server's 72-byte limit); 0 when it can't be normalised. */
export function passwordBytes(password: unknown): number {
  const p = normalizePassword(password);
  if (p === null) return 0;
  let n = 0;
  for (const ch of p) {
    const c = ch.codePointAt(0)!;
    n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  return n;
}

/** The compared form: NFKC, lower case, joiners out. */
function canonical(s: string): string {
  return (form(s, 'NFKC') ?? s).toLowerCase().replace(JOINERS, '');
}

/** Common letter-for-number swaps ("p4ssw0rd"), undone in the second form. */
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's', '!': 'i' };
const fold = (s: string) => Array.from(s, (c) => LEET[c] ?? c).join('');

/** True when the whole password (any case, any joiners, swaps undone) is on the 15+ list. */
export function isCommonPassword(password: unknown): boolean {
  const p = normalizePassword(password);
  if (p === null) return false;
  const c = canonical(p);
  return long().has(c) || long().has(fold(c));
}

// ── Context words ──────────────────────────────────────────────────────

/** 'd' digit, 'l' letter (any script), 'o' anything else. Plain code, no Unicode regex classes (older engines). */
function kindOf(ch: string): 'd' | 'l' | 'o' {
  if (ch >= '0' && ch <= '9') return 'd';
  return ch.toLowerCase() !== ch.toUpperCase() ? 'l' : 'o';
}

/** Runs of letters, or of digits, of `min`+ characters. */
function piecesOf(text: string, min: number): string[] {
  const out: string[] = [];
  let piece = '';
  let kind: 'd' | 'l' | 'o' = 'o';
  for (const ch of [...Array.from(text), '.']) {
    const k = kindOf(ch);
    if (k !== kind || k === 'o') {
      if (kind !== 'o' && Array.from(piece).length >= min) out.push(piece);
      piece = '';
    }
    kind = k;
    if (k !== 'o') piece += ch;
  }
  return out;
}

/**
 * The email's predictable pieces, in the compared form: the whole address,
 * its name part and the name part's pieces of 3+ characters, and the domain's
 * labels of 4+ (not the last one, ".com"). "maya.santos1990@example.com" →
 * the address, "mayasantos1990", "maya", "santos", "1990", "example".
 */
export function emailWords(email: unknown): string[] {
  if (typeof email !== 'string' || !email) return [];
  const e = normalizeEmail(email);
  const at = e.lastIndexOf('@');
  const local = at > 0 ? e.slice(0, at) : e;
  const out = new Set<string>([canonical(e)]);
  if (Array.from(canonical(local)).length >= 3) out.add(canonical(local));
  for (const p of piecesOf(local, 3)) out.add(canonical(p));
  if (at > 0) {
    const labels = e.slice(at + 1).split('.');
    for (const l of labels.slice(0, -1)) if (Array.from(l).length >= 4) out.add(canonical(l));
  }
  out.delete('');
  return [...out];
}

/** A name's pieces: the whole name and each part of 3+ letters. */
function nameWords(names: unknown): string[] {
  const out = new Set<string>();
  for (const n of Array.isArray(names) ? names : []) {
    if (typeof n !== 'string' || !n.trim()) continue;
    const whole = canonical(n);
    if (Array.from(whole).length >= 3) out.add(whole);
    for (const p of piecesOf(n.toLowerCase(), 3)) out.add(canonical(p));
  }
  return [...out];
}

// ── The whole-password rule ────────────────────────────────────────────

/** Keyboard rows and columns (US), the shifted number row included, either direction. */
const KEY_RUNS = [
  '`1234567890-=',
  '~!@#$%^&*()_+',
  'qwertyuiop[]\\',
  "asdfghjkl;'",
  'zxcvbnm,./',
  '1qaz2wsx3edc4rfv5tgb6yhn7ujm8ik,9ol.0p;/',
  'zaq1xsw2cde3vfr4bgt5nhy6mju7,ki8.lo9/;p0',
  'qazwsxedcrfvtgbyhnujmikolp',
  '1q2w3e4r5t6y7u8i9o0p',
  'q1w2e3r4t5y6u7i8o9p0',
];
const isDigit = (c: string) => c >= '0' && c <= '9';
const isAsciiAlnum = (c: string) => (c >= 'a' && c <= 'z') || isDigit(c);
/** An ASCII symbol is a predictable piece; a letter, digit or any other character is not. */
const isSymbol = (c: string) => c.length === 1 && c.charCodeAt(0) < 0x80 && !isAsciiAlnum(c);
/** The longest list word (dictionary words reach 31 letters). */
const MAX_WORD = 31;

/** Per position: the longest repeat, sequence, keyboard run or copy of earlier text starting there (0 when under 3). */
function runLengths(s: string[]): number[] {
  const n = s.length;
  // lcp[j][i]: how far s[j..] and s[i..] agree (copies of earlier text, overlap allowed).
  const lcp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let j = n - 1; j >= 0; j--) for (let i = n - 1; i > j; i--) lcp[j][i] = s[j] === s[i] ? 1 + lcp[j + 1][i + 1] : 0;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let best = 0;
    for (let j = 0; j < i; j++) best = Math.max(best, lcp[j][i]);
    let k = 1;
    while (i + k < n && s[i + k] === s[i]) k++;
    best = Math.max(best, k);
    for (const d of [1, -1, 2, -2]) {
      let m = 1;
      while (i + m < n) {
        const a = s[i + m - 1];
        const b = s[i + m];
        const okPair = Math.abs(d) === 1 ? isAsciiAlnum(a) && isAsciiAlnum(b) : isDigit(a) && isDigit(b);
        if (!okPair || b.charCodeAt(0) - a.charCodeAt(0) !== d) break;
        m++;
      }
      best = Math.max(best, m);
    }
    for (const row of KEY_RUNS) {
      for (let at = row.indexOf(s[i]); at >= 0; at = row.indexOf(s[i], at + 1)) {
        for (const d of [1, -1]) {
          let m = 1;
          while (i + m < n && row[at + m * d] === s[i + m]) m++;
          best = Math.max(best, m);
        }
      }
    }
    out.push(best >= 3 ? best : 0);
  }
  return out;
}

interface Prepared {
  s: string[];
  runs: number[];
  /** Per position: end positions of list words starting there. */
  words: number[][];
  /** Per position: end positions of a short number (a whole digit run of ≤ 4) or a year. */
  numbers: number[][];
}

function prepare(text: string): Prepared {
  const s = Array.from(text);
  const n = s.length;
  const words: number[][] = [];
  const numbers: number[][] = [];
  for (let i = 0; i < n; i++) {
    const w: number[] = [];
    if (wordSet) {
      let sub = s.slice(i, Math.min(n, i + 3)).join('');
      for (let j = i + 4; j <= Math.min(n, i + MAX_WORD); j++) {
        sub += s[j - 1];
        if (wordSet.has(sub)) w.push(j);
      }
    }
    words.push(w);
    const num: number[] = [];
    if (isDigit(s[i]) && (i === 0 || !isDigit(s[i - 1]))) {
      let k = 0;
      while (i + k < n && isDigit(s[i + k])) k++;
      if (k <= 4) num.push(i + k);
    }
    if (i + 4 <= n && /^(19|20)\d\d$/.test(s.slice(i, i + 4).join(''))) num.push(i + 4);
    numbers.push(num);
  }
  return { s, runs: runLengths(s), words, numbers };
}

/**
 * The fewest characters left over when `p` is written as predictable pieces:
 * context tokens (any number), up to `listWords` list words, runs, numbers
 * and symbols. Dynamic programming over positions × list words used.
 */
function leftOver(p: Prepared, tokens: string[][], listWords: number): number {
  const { s, runs, words, numbers } = p;
  const n = s.length;
  const cost = Array.from({ length: listWords + 1 }, () => new Array<number>(n + 1).fill(Infinity));
  cost[0][0] = 0;
  const startsWith = (i: number, t: string[]) => {
    if (i + t.length > n) return false;
    for (let k = 0; k < t.length; k++) if (s[i + k] !== t[k]) return false;
    return true;
  };
  for (let i = 0; i < n; i++) {
    for (let k = 0; k <= listWords; k++) {
      const c = cost[k][i];
      if (c === Infinity) continue;
      const relax = (kk: number, j: number, add: number) => {
        if (c + add < cost[kk][j]) cost[kk][j] = c + add;
      };
      relax(k, i + 1, isSymbol(s[i]) ? 0 : 1);
      for (const t of tokens) if (t.length && startsWith(i, t)) relax(k, i + t.length, 0);
      for (let len = 3; len <= runs[i]; len++) relax(k, i + len, 0);
      for (const j of numbers[i]) relax(k, j, 0);
      if (k < listWords) for (const j of words[i]) relax(k + 1, j, 0);
    }
  }
  let best = Infinity;
  for (let k = 0; k <= listWords; k++) best = Math.min(best, cost[k][n]);
  return best;
}

/** The reason the whole password is predictable, or null. `p` is NFKC already. */
function predictable(p: string, ctx: PasswordContext): PasswordProblem | null {
  const c = canonical(p);
  const forms = [...new Set([c, fold(c)])].map(prepare);
  const personal = [...emailWords(ctx.email), ...nameWords(ctx.names)];
  const personalTokens = [...new Set([...personal, ...personal.map(fold)])].map((t) => Array.from(t));
  const serviceTokens = [...SERVICE_WORDS, ...STUDY_WORDS].map((t) => Array.from(t));
  const worst = (tokens: string[][], listWords: number) => Math.min(...forms.map((f) => leftOver(f, tokens, listWords)));

  const exact = long().has(c) || long().has(fold(c));
  if (worst([...personalTokens, ...serviceTokens], MAX_LIST_WORDS) > MAX_LEFT_OVER) {
    return exact ? 'common' : new Set(Array.from(c)).size < 5 ? 'too_simple' : null;
  }
  // Name the piece the refusal needs: without it, the password would pass.
  if (worst(serviceTokens, MAX_LIST_WORDS) > MAX_LEFT_OVER) return 'contains_email';
  if (worst([], MAX_LIST_WORDS) > MAX_LEFT_OVER) return 'contains_service_word';
  if (exact || worst([], 0) > MAX_LEFT_OVER) return 'common';
  return 'too_simple';
}

/**
 * Every reason this password would be refused, most important first ([]:
 * fine). The second argument is the account's email, or { email, names }.
 * Over 72 bytes, only 'too_long' is reported (nothing else matters until it
 * is shorter, and it keeps the work small).
 */
export function checkPassword(password: unknown, context?: string | PasswordContext | null): PasswordProblem[] {
  const ctx: PasswordContext = typeof context === 'string' ? { email: context } : context && typeof context === 'object' ? context : {};
  const raw = typeof password === 'string' ? password : '';
  const p = normalizePassword(raw);
  const nfc = form(raw, 'NFC');
  if (p === null || nfc === null || CONTROL.test(p)) return ['invalid_characters'];
  if (passwordBytes(p) > PASSWORD_MAX_BYTES) return ['too_long'];
  const out: PasswordProblem[] = [];
  if (Math.min(Array.from(p).length, Array.from(nfc).length) < PASSWORD_MIN_CHARS) out.push('too_short');
  const why = predictable(p, ctx);
  if (why) out.push(why);
  return out;
}

/** The one reason to show, or null when the password is fine. */
export function passwordProblem(password: unknown, context?: string | PasswordContext | null): PasswordProblem | null {
  return checkPassword(password, context)[0] ?? null;
}
