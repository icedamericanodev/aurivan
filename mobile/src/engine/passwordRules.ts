/**
 * Password rules for KaiSip accounts (owner decisions of 28 Nov 2026,
 * docs/WEB_LAUNCH_PLAN.md; design docs/mobile/PASSWORD_SIGN_IN_DESIGN.md §4.3).
 * Shared by the website (compiled into assets/kaisip-cloud.js) and the phone.
 * The standard: NIST SP 800-63B-4 §3.1.1.2 and OWASP ASVS 5.0 V6.2.
 *
 * Plain English for the founder:
 * - A password needs at least 15 characters. There are no "must contain a
 *   digit / capital / symbol" rules (NIST says not to: they push people to
 *   "Password1!"). Spaces, accents, other alphabets and emoji are fine, and
 *   so are pasting and password managers.
 * - The longest password the sign-in server can store is 72 bytes: 72 plain
 *   letters, fewer with accents or emoji (2 to 4 bytes each). That is a
 *   documented deviation from NIST's "at least 64 characters" for non-English
 *   text. Invisible characters (control characters, zero-width spaces,
 *   direction marks, tag characters) can't be used.
 * - Before anything else the password is put in one standard Unicode form
 *   (NFKC), so "é" typed as one key or as "e" + accent, and full-width
 *   letters, all make the same password on every device. If a phone or
 *   browser can't do that, a password with non-English characters is refused
 *   rather than sent unchanged.
 * - Because Supabase's Free plan has no leaked-password check, the apps
 *   refuse predictable passwords with two kinds of check (the owner asked to
 *   apply the standard and reject common passwords; this is what we can do
 *   without a leak lookup, not a guarantee). NIST asks us to compare the
 *   WHOLE password, including derivatives, so the comparison first makes a
 *   "compared form" (lower case; accents, invisible characters and spaces
 *   taken out; Cyrillic and Greek look-alike letters read as Latin;
 *   letter-for-number swaps read both ways, position by position; and read
 *   backwards too). Then:
 *   A. Structural rules, which work on passwords nobody listed:
 *      - fewer than 10 real characters left after repeats, sequences,
 *        keyboard runs, copies, mirrors and years;
 *      - one ordinary word typed as one (up to 14 letters) with only
 *        numbers, symbols or runs besides;
 *      - mostly the account's own words (the email, its domain, the name);
 *      - a whole password of names (up to 5) with numbers or symbols;
 *      - dates, Philippine mobile numbers, short numbers next to years.
 *   B. Lists, which only know what is on them: the whole password made of
 *      at most two list entries (plus the app and exam words, numbers and
 *      symbols, at most 3 word pieces in all) with at most 2 characters
 *      left over. The lists: the 100,000 most used short passwords, every
 *      English word of 15+ letters, the 3,000 most used 15+ character
 *      passwords (refused as they are), and hand-written clichés, the
 *      app's own hints, exam and work vocabulary, and Filipino, other Asian
 *      and name lists.
 *   What it cannot do: a phrase, name or slogan that is on no list passes
 *   (a famous line, a celebrity, a school). Measured on a tester's
 *   held-out set of predictable passwords the rules were never tuned on,
 *   11.5% still passed (down from 30.6%; 4.4% on the half used for tuning,
 *   from 33.9%): see docs/WEB_LAUNCH_PLAN.md, "What the password rules
 *   cannot do". The leaked-password check (webcloud/breach.ts, ON since
 *   28 Nov 2026) catches such passwords when they have leaked anywhere;
 *   an uncommon phrase that never leaked still passes, and so does any
 *   password while the check can't reach the service (it fails open).
 *   Four or more different ordinary words pass by design (a passphrase), and
 *   so do three in nearly all cases (fewer than 1 random triple in 200 is
 *   refused, when a word is itself a pattern or two make a list entry).
 *   Passphrases in Tagalog, Thai, Hindi or with accents pass too.
 * - The check runs only in our apps: someone calling the server directly for
 *   their own account could skip it (a documented deviation until the Pro
 *   plan's server check).
 * - The answer is a list of reason codes, most important first, and
 *   passwordGuidance gives the words the screen shows (NIST: the app SHALL
 *   say how to choose a better one).
 * - Nothing here keeps, logs or sends the password.
 *
 * Pure TypeScript: no React, no storage, no network. The word lists are big,
 * so they are not imported here: loadPasswordWords gives them, and only
 * lists with the expected sizes and fingerprints are accepted (the website
 * fetches them only when a password form opens; see auth.ts).
 */
import { normalizeEmail } from './account';
import { PASSWORD_LONG_LIST, PASSWORD_WORDS_EXPECTED } from './passwordBlocklist';
import { sha256Hex } from './sha256';

/** At least this many characters (Unicode code points, in both NFC and NFKC). Owner decision; the dashboard says the same. */
export const PASSWORD_MIN_CHARS = 15;
/** The sign-in server's limit (bcrypt): at most 72 bytes of UTF-8. */
export const PASSWORD_MAX_BYTES = 72;
/** At most this many characters may be left over after the predictable pieces. */
export const MAX_LEFT_OVER = 2;
/** At most this many entries from the bundled lists count as predictable pieces. */
export const MAX_LIST_WORDS = 2;
/** At most this many word pieces in all (list entries plus app and exam words): four or more is a passphrase. */
export const MAX_WORD_PIECES = 3;
/** At least this many real characters must remain after repeats, sequences, copies and years. */
export const MIN_MATERIAL = 10;

/**
 * Why a password is refused, most important first:
 * - invalid_characters: control or invisible characters, a broken
 *   character, or a device that can't put the password in standard form;
 * - too_short: under 15 characters;
 * - too_long: over 72 bytes;
 * - contains_email: mostly the email address or the learner's name;
 * - contains_service_word: mostly "kaisip", the exam names or study words;
 * - common: a common password, phrase or words with small changes;
 * - too_simple: repeats, sequences, keyboard patterns, dates or too few real characters.
 */
export type PasswordProblem = 'invalid_characters' | 'too_short' | 'too_long' | 'contains_email' | 'contains_service_word' | 'common' | 'too_simple';

/** What the app knows about the learner (NIST: "context-specific words"). */
export interface PasswordContext {
  email?: string | null;
  /** The learner's name, when known (Google's display name). Never stored. */
  names?: readonly (string | null | undefined)[];
}

/** The app, the exams and their bodies (owner decision; NIST: "the name of the service"). */
export const SERVICE_WORDS: readonly string[] = ['kaisip', 'cisa', 'isaca', 'crisc', 'aaia', 'csoe', 'cia', 'cpa'];
/** Study and exam words that go with them ("cisaexam2026pass", "certifiedinformationsystemsauditor"), English and Tagalog. */
export const STUDY_WORDS: readonly string[] = [
  'exam', 'study', 'pass', 'passer', 'prep', 'cert', 'certified', 'audit', 'auditor', 'auditing', 'information', 'systems', 'system', 'security', 'control', 'controls',
  'internal', 'risk', 'governance', 'review', 'reviewer', 'board', 'license', 'accountant', 'accounting', 'app', 'ipasa', 'papasa', 'pasado', 'pumasa',
];
/** Month names and short forms (English and Tagalog): a piece only next to a number ("jan011990", "November2026"). */
export const MONTH_WORDS: readonly string[] = [
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
  'enero', 'pebrero', 'marso', 'abril', 'mayo', 'hunyo', 'hulyo', 'agosto', 'setyembre', 'oktubre', 'nobyembre', 'disyembre',
];

/**
 * What the screen shows after a refusal (NIST: SHALL offer guidance). The
 * key is for the copy file; the text is the default English.
 */
export const PASSWORD_GUIDANCE: Readonly<Record<PasswordProblem, { key: string; text: string }>> = {
  invalid_characters: { key: 'password.guide.invalid_characters', text: 'Your password has a hidden character, often from copy and paste. Please type it by hand. Accents and emoji are fine.' },
  too_short: { key: 'password.guide.too_short', text: 'Use at least 15 characters. Three or four ordinary words with spaces are easy to remember.' },
  too_long: { key: 'password.guide.too_long', text: 'Use up to 72 letters, fewer with accents or emoji.' },
  contains_email: { key: 'password.guide.contains_email', text: 'Don’t build your password from your email address or your name. Add words only you would pick.' },
  contains_service_word: { key: 'password.guide.contains_service_word', text: 'Don’t build your password from the app’s or the exam’s name. Add words only you would pick.' },
  common: { key: 'password.guide.common', text: 'That password is used by many people or is easy to guess. Try three or four words that don’t usually go together.' },
  too_simple: { key: 'password.guide.too_simple', text: 'Avoid repeats, sequences, dates, keyboard patterns and a single word with numbers. Try three or four ordinary words that don’t usually go together.' },
};

/**
 * Words for the refusals that come from the server or the checker itself
 * (not from the rules): the server's leaked-password check (Pro plan), the
 * server refusing for its own reasons, and the word lists not loading.
 */
export const PASSWORD_OTHER_GUIDANCE: Readonly<Record<'leaked' | 'weak' | 'rules_unavailable' | 'breach_unchecked', { key: string; text: string }>> = {
  leaked: { key: 'password.guide.leaked', text: 'This password has appeared in a data leak. Please choose a different one.' },
  weak: { key: 'password.guide.weak', text: 'The sign-in service didn’t accept that password. Try a longer phrase of unrelated words.' },
  rules_unavailable: { key: 'password.guide.rules_unavailable', text: 'We couldn’t load the password checker. Check your connection and try again.' },
  breach_unchecked: { key: 'password.guide.breach_unchecked', text: 'We couldn’t check this password against known leaks just now. It was saved; you can change it later.' },
};

/**
 * The words to show (null for none). Takes a rule reason ("too_short"), the
 * client's error detail ("password_too_short", "password_leaked",
 * "password_weak", "password_rules") or an other-guidance key.
 * Type-guarded: an unknown value gives null.
 */
export function passwordGuidance(problem: unknown): { key: string; text: string } | null {
  if (typeof problem !== 'string') return null;
  const k = problem === 'password_rules' ? 'rules_unavailable' : problem.startsWith('password_') ? problem.slice('password_'.length) : problem;
  const own = (o: object) => Object.prototype.hasOwnProperty.call(o, k);
  if (own(PASSWORD_GUIDANCE)) return PASSWORD_GUIDANCE[k as PasswordProblem];
  if (own(PASSWORD_OTHER_GUIDANCE)) return PASSWORD_OTHER_GUIDANCE[k as keyof typeof PASSWORD_OTHER_GUIDANCE];
  return null;
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
export function decodeList(text: unknown): string[] {
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
let prefix4: Set<string> = new Set();
let prefix8: Set<string> = new Set();

/** The word lists, as passwordWords.ts holds them. */
export interface PasswordWordLists {
  short: string;
  dict: string;
  local: string;
  /** Common given names and surnames (their own piece kind: a full name plus a year is common). */
  names: string;
}
let nameSet: Set<string> | null = null;
let namePrefix3: Set<string> = new Set();

/**
 * Give the rules their word lists (passwordWords.ts). Each list must have
 * exactly the size and SHA-256 the build recorded in passwordBlocklist.ts
 * (PASSWORD_WORDS_EXPECTED), so a cut-down, stale or altered file is never
 * used: the rules stay "not loaded" and auth.ts saves no password. Returns
 * true when the lists were accepted.
 */
export function loadPasswordWords(lists: unknown): boolean {
  if (!lists || typeof lists !== 'object') return false;
  const l = lists as Record<string, unknown>;
  const parts: string[][] = [];
  for (const k of ['short', 'dict', 'local', 'names'] as const) {
    const text = l[k];
    const want = PASSWORD_WORDS_EXPECTED[k];
    if (typeof text !== 'string' || sha256Hex(text) !== want.sha256) return false;
    const entries = decodeList(text);
    if (entries.length !== want.size) return false;
    parts.push(entries);
  }
  const set = new Set<string>();
  for (const p of parts.slice(0, 3)) for (const w of p) set.add(w);
  nameSet = new Set(parts[3]);
  namePrefix3 = new Set([...nameSet].map((w) => w.slice(0, 3)));
  for (const w of long()) set.add(w);
  // The first 4 and 8 characters of every entry: most positions of a password start no entry,
  // and these let the lookup stop early (a check stays around a millisecond).
  const p4 = new Set<string>();
  const p8 = new Set<string>();
  for (const w of set) {
    p4.add(w.slice(0, 4));
    if (w.length >= 8) p8.add(w.slice(0, 8));
  }
  wordSet = set;
  prefix4 = p4;
  prefix8 = p8;
  return true;
}
/** True once loadPasswordWords has accepted the real lists. */
export function passwordWordsLoaded(): boolean {
  return wordSet !== null;
}
/** Tests only: forget the word lists. */
export function unloadPasswordWordsForTest(): void {
  wordSet = null;
  nameSet = null;
}

// ── Normal form ────────────────────────────────────────────────────────

const ASCII_ONLY = /^[\u0000-\u007f]*$/;
/**
 * Never allowed: C0 and C1 control characters (tab and line breaks
 * included), the soft hyphen, zero-width space, direction marks and
 * embeddings, word joiner and invisible operators, the byte-order mark,
 * the Arabic letter mark, the Mongolian vowel separator and tag characters.
 * (Zero-width joiners and variation selectors are fine: emoji need them.)
 */
const INVALID = /[\u0000-\u001f\u007f-\u009f\u00ad\u200b\u200e\u200f\u202a-\u202e\u2060-\u206f\ufeff\u061c\u180e]|\udb40[\udc00-\udc7f]/;
/** Joiners people put between words; the comparison ignores them. */
const JOINERS = /[\s._-]+/g;
/** Combining accents (taken out of the compared form after NFKD; other scripts' vowel signs stay). */
const MARKS = /[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g;
/** Invisible characters (taken out of the compared form). */
const INVISIBLE = /[\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180f\u200b-\u200f\u202a-\u202e\u2060-\u206f\u3164\ufe00-\ufe0f\ufeff\uffa0]|\udb40[\udc00-\udc7f\udd00-\uddef]/g;
/** Cyrillic and Greek letters that look like Latin ones (the compared form reads them as Latin). */
const LOOKALIKE: Record<string, string> = {
  а: 'a', в: 'b', е: 'e', ё: 'e', к: 'k', м: 'm', н: 'h', о: 'o', р: 'p', с: 'c', т: 't', у: 'y', х: 'x', і: 'i', ї: 'i', ј: 'j', ѕ: 's', ԁ: 'd', ԛ: 'q', ԝ: 'w',
  α: 'a', β: 'b', ε: 'e', η: 'n', ι: 'i', κ: 'k', ν: 'v', ο: 'o', ρ: 'p', τ: 't', υ: 'u', χ: 'x', ω: 'w', ϲ: 'c', ζ: 'z',
};

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

function form(s: string, f: 'NFC' | 'NFKC' | 'NFKD'): string | null {
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

/**
 * The compared form (scripts/password-lists.cjs canon builds the lists the
 * same way; a test checks): NFKC, lower case, accents and invisible
 * characters out, look-alikes as Latin, joiners out.
 */
export function comparedForm(s: string): string {
  return comparedWords(s).join('');
}

/** The compared form split where the joiners were ("red kite" → ["red", "kite"]). */
function comparedWords(s: string): string[] {
  let x = (form(s, 'NFKC') ?? s).toLowerCase();
  x = (form(x, 'NFKD') ?? x).replace(MARKS, '').replace(INVISIBLE, '');
  x = form(x, 'NFC') ?? x;
  return Array.from(x, (c) => LOOKALIKE[c] ?? c)
    .join('')
    .split(JOINERS)
    .filter(Boolean);
}

/** Letter-for-number swaps ("p4ssw0rd"), two readings: 1 and ! as "i", or as "l". */
const LEET_I: Record<string, string> = { '0': 'o', '1': 'i', '2': 'z', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g', '@': 'a', $: 's', '!': 'i', '+': 't' };
const LEET_L: Record<string, string> = { ...LEET_I, '1': 'l', '!': 'l' };
const fold = (s: string, map: Record<string, string>) => Array.from(s, (c) => map[c] ?? c).join('');

/** True when the whole password (any case, any joiners, swaps undone) is on the 15+ list. */
export function isCommonPassword(password: unknown): boolean {
  const p = normalizePassword(password);
  if (p === null) return false;
  const c = comparedForm(p);
  return [c, fold(c, LEET_I), fold(c, LEET_L)].some((x) => long().has(x));
}

// ── Context words ──────────────────────────────────────────────────────

/** 'd' digit, 'l' letter (any script), 'o' anything else. Plain code, no Unicode regex classes (older engines). */
function kindOf(ch: string | undefined): 'd' | 'l' | 'o' {
  if (ch === undefined) return 'o';
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
  const out = new Set<string>([comparedForm(e)]);
  if (Array.from(comparedForm(local)).length >= 3) out.add(comparedForm(local));
  for (const p of piecesOf(local, 3)) out.add(comparedForm(p));
  if (at > 0) {
    const labels = e.slice(at + 1).split('.');
    for (const l of labels.slice(0, -1)) if (Array.from(l).length >= 4) out.add(comparedForm(l));
  }
  out.delete('');
  return [...out];
}

/**
 * The email's whole domain and its label suffixes of 4+ characters, in the
 * compared form ("mail.yahoo.com.ph" → "mailyahoocomph", "yahoocomph", "comph").
 */
function domainWords(email: unknown): string[] {
  if (typeof email !== 'string' || !email.includes('@')) return [];
  const labels = normalizeEmail(email).split('@').pop()!.split('.');
  const out: string[] = [];
  for (let k = 0; k < labels.length - 1; k++) {
    const d = comparedForm(labels.slice(k).join(''));
    if (Array.from(d).length >= 4) out.push(d);
  }
  return out;
}

/** A name's pieces: the whole name and each part of 3+ letters. */
function nameWords(names: unknown): string[] {
  const out = new Set<string>();
  for (const n of Array.isArray(names) ? names : []) {
    if (typeof n !== 'string' || !n.trim() || n.length > 200) continue;
    const whole = comparedForm(n);
    if (Array.from(whole).length >= 3) out.add(whole);
    for (const p of piecesOf(n.toLowerCase(), 3)) out.add(comparedForm(p));
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
  // Right-to-left diagonals ("0okm9ijn8uhb").
  '0okm9ijn8uhb7ygv6tfc5rdx4esz3wa2q',
  '0pl,9okm8ijn7uhb6ygv5tfc4rdx3esz2wa1q',
];
const isDigit = (c: string | undefined) => c !== undefined && c >= '0' && c <= '9';
const isAsciiAlnum = (c: string) => (c >= 'a' && c <= 'z') || isDigit(c);
/** An ASCII symbol is a predictable piece; a letter, digit or any other character is not. */
const isSymbol = (c: string) => c.length === 1 && c.charCodeAt(0) < 0x80 && !isAsciiAlnum(c);
/** The longest list entry looked up (dictionary words reach 31 letters, phrases a little more). */
const MAX_WORD = 72;
/** A full name: up to this many name pieces ("john mark santos dela cruz" is five, and still a name). */
export const MAX_NAME_PIECES = 5;

/**
 * Per position: where a repeat, sequence, keyboard run or copy of earlier
 * text starting there may end (3+ characters). A run of exactly 3 that is
 * not the same character three times, is all letters, and touches another
 * letter doesn't count: "par-ty" or "the" are parts of words, not patterns.
 */
function runEnds(s: string[], bounds: ReadonlySet<number>): number[][] {
  const n = s.length;
  const lcp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let j = n - 1; j >= 0; j--) for (let i = n - 1; i > j; i--) lcp[j][i] = s[j] === s[i] ? 1 + lcp[j + 1][i + 1] : 0;
  // mir[j][i]: how far s[i..] reads as s[..j] backwards (a word and its mirror: "drowssap").
  const mir: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = 0; j < i; j++) mir[j][i] = s[j] === s[i] ? 1 + (j > 0 ? mir[j - 1][i + 1] : 0) : 0;
  const out: number[][] = [];
  for (let i = 0; i < n; i++) {
    let copy = 0;
    for (let j = 0; j < i; j++) copy = Math.max(copy, lcp[j][i], Math.min(mir[j][i], j + 1));
    let seq = 0;
    let rep = 1;
    while (i + rep < n && s[i + rep] === s[i]) rep++;
    // Doubled-letter sequences ("aabbccdd", "111222333"): blocks of 2 to 4 equal characters,
    // each one up or down from the last.
    for (let k = 2; k <= Math.min(4, rep); k++) {
      for (const d of [1, -1]) {
        let m = k;
        while (i + m + k <= n && isAsciiAlnum(s[i + m]) && s[i + m].charCodeAt(0) - s[i + m - 1].charCodeAt(0) === d && s.slice(i + m, i + m + k).every((c) => c === s[i + m])) m += k;
        if (m >= 3 * k) rep = Math.max(rep, m);
      }
    }
    for (const d of [1, -1, 2, -2]) {
      let m = 1;
      while (i + m < n) {
        const a = s[i + m - 1];
        const b = s[i + m];
        const okPair = Math.abs(d) === 1 ? isAsciiAlnum(a) && isAsciiAlnum(b) : isDigit(a) && isDigit(b);
        if (!okPair || b.charCodeAt(0) - a.charCodeAt(0) !== d) break;
        m++;
      }
      seq = Math.max(seq, m);
    }
    for (const row of KEY_RUNS) {
      for (let at = row.indexOf(s[i]); at >= 0; at = row.indexOf(s[i], at + 1)) {
        for (const d of [1, -1]) {
          let m = 1;
          while (i + m < n && row[at + m * d] === s[i + m]) m++;
          seq = Math.max(seq, m);
        }
      }
    }
    const ends = new Set<number>();
    const lettersOnly = (len: number) => s.slice(i, i + len).every((c) => kindOf(c) === 'l');
    // A letter just before / after, in the same word (a joiner or the edge is not one).
    const letterBefore = !bounds.has(i) && kindOf(s[i - 1]) === 'l';
    const letterAfter = (len: number) => !bounds.has(i + len) && kindOf(s[i + len]) === 'l';
    for (let len = 3; len <= rep; len++) ends.add(i + len);
    // Sequences and keyboard runs: a letters-only run of exactly 3 next to a letter is part of a word.
    for (let len = 3; len <= seq; len++) if (!(len === 3 && lettersOnly(3) && (letterBefore || letterAfter(3)))) ends.add(i + len);
    // Copies of earlier text. Letters-only copies count when they stand alone, start a word and
    // have 5+ letters, or have 6+ letters: ordinary words share shorter pieces ("ball" in
    // "balloon" and "caballo").
    for (let len = 3; len <= copy; len++) {
      if (!lettersOnly(len) || len >= 6 || (!letterBefore && (len >= 5 || !letterAfter(len)))) ends.add(i + len);
    }
    out.push([...ends]);
  }
  return out;
}

const validMonth = (m: number) => m >= 1 && m <= 12;
const validDay = (d: number) => d >= 1 && d <= 31;
const validYear = (y: number) => y >= 1900 && y <= 2099;
/** A 6- or 8-digit date: DDMMYY, MMDDYY, YYMMDD, MMYYYY, YYYYMM, DDMMYYYY, MMDDYYYY, YYYYMMDD. */
function isDate(d: string): boolean {
  const n = (a: number, b: number) => Number(d.slice(a, b));
  if (d.length === 6) {
    return (validDay(n(0, 2)) && validMonth(n(2, 4))) || (validMonth(n(0, 2)) && validDay(n(2, 4))) || (validMonth(n(2, 4)) && validDay(n(4, 6))) || (validMonth(n(0, 2)) && validYear(n(2, 6))) || (validYear(n(0, 4)) && validMonth(n(4, 6)));
  }
  if (d.length === 8) {
    return (validDay(n(0, 2)) && validMonth(n(2, 4)) && validYear(n(4, 8))) || (validMonth(n(0, 2)) && validDay(n(2, 4)) && validYear(n(4, 8))) || (validYear(n(0, 4)) && validMonth(n(4, 6)) && validDay(n(6, 8)));
  }
  return false;
}

/** Per position: where a predictable number starting there may end (on the plain form). */
function numberEnds(s: string[]): number[][] {
  const n = s.length;
  const out: number[][] = [];
  const digitsAt = (i: number, len: number) => i + len <= n && s.slice(i, i + len).every(isDigit);
  const yearAt = (i: number) => digitsAt(i, 4) && validYear(Number(s.slice(i, i + 4).join('')));
  for (let i = 0; i < n; i++) {
    const ends = new Set<number>();
    if (isDigit(s[i]) && !isDigit(s[i - 1])) {
      let k = 0;
      while (i + k < n && isDigit(s[i + k])) k++;
      if (k <= 4) ends.add(i + k);
    }
    if (yearAt(i)) ends.add(i + 4);
    for (const len of [6, 8]) if (digitsAt(i, len) && isDate(s.slice(i, i + len).join(''))) ends.add(i + len);
    // A short number next to a year ("011990", "282026", "199012").
    for (const k of [1, 2]) {
      if (digitsAt(i, k) && yearAt(i + k)) ends.add(i + k + 4);
      if (yearAt(i) && digitsAt(i + 4, k)) ends.add(i + 4 + k);
    }
    // Philippine mobile numbers: 09 + 9 digits, 639 + 9 digits.
    if (digitsAt(i, 11) && s[i] === '0' && s[i + 1] === '9') ends.add(i + 11);
    if (digitsAt(i, 12) && s[i] === '6' && s[i + 1] === '3' && s[i + 2] === '9') ends.add(i + 12);
    out.push([...ends]);
  }
  return out;
}

/** Where each of `tokens` matches, per position, in any of the forms. */
function tokenEnds(forms: string[][], tokens: string[][]): number[][] {
  const n = forms[0].length;
  const out: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (const t of tokens) {
      if (!t.length || i + t.length > n) continue;
      if (forms.some((f) => t.every((c, k) => f[i + k] === c))) out[i].push(i + t.length);
    }
  }
  return out;
}

interface Lattice {
  n: number;
  plain: string[];
  runs: number[][];
  numbers: number[][];
  months: number[][];
  words: number[][];
  personal: number[][];
  service: number[][];
  names: number[][];
}

/**
 * The positions of one reading of the password. `forms` are the same
 * length (the plain compared form and its letter-for-number readings), so a
 * piece may come from any of them at each position.
 */
function lattice(forms: string[], personal: string[][], service: string[][], bounds: ReadonlySet<number>): Lattice {
  const fs = forms.map((f) => Array.from(f));
  const plain = fs[0];
  const n = plain.length;
  const merge = (lists: number[][][]) => Array.from({ length: n }, (_, i) => [...new Set(lists.flatMap((l) => l[i]))]);
  const runs = merge(fs.map((f) => runEnds(f, bounds)));
  // A list entry may run across a space only from the start of a word to the end of one
  // ("mahal kita" is "mahalkita"; "ouch inky" does not hide "chinky").
  // (A word also ends where letters meet a digit or symbol: "tiger!".)
  const edge = (i: number) => bounds.has(i) || (kindOf(plain[i - 1]) === 'l') !== (kindOf(plain[i]) === 'l');
  const crosses = (i: number, j: number) => {
    for (let b = i + 1; b < j; b++) if (bounds.has(b)) return !(edge(i) && edge(j));
    return false;
  };
  const words: number[][] = Array.from({ length: n }, () => []);
  if (wordSet) {
    for (const f of fs) {
      for (let i = 0; i + 4 <= n; i++) {
        let sub = f.slice(i, i + 4).join('');
        if (!prefix4.has(sub)) continue;
        for (let j = i + 4; j <= Math.min(n, i + MAX_WORD); j++) {
          if (j > i + 4) sub += f[j - 1];
          if (j === i + 8 && !prefix8.has(sub)) {
            if (wordSet.has(sub) && !words[i].includes(j) && !crosses(i, j)) words[i].push(j);
            break;
          }
          if (wordSet.has(sub) && !words[i].includes(j) && !crosses(i, j)) words[i].push(j);
        }
      }
    }
  }
  // A list entry that repeats earlier text counts once: its later copies are free
  // ("twinkle twinkle little star", "love is patient love is kind").
  for (const f of fs) {
    const text = f.join('');
    const offsets = [0];
    for (const ch of f) offsets.push(offsets[offsets.length - 1] + ch.length);
    for (let i = 0; i < n; i++) {
      for (const j of words[i]) {
        const sub = text.slice(offsets[i], offsets[j]);
        if (text.slice(0, offsets[i]).includes(sub) && !runs[i].includes(j)) runs[i].push(j);
      }
    }
  }
  // Given names and surnames (their own kind: a whole password of names and numbers is common).
  const names: number[][] = Array.from({ length: n }, () => []);
  if (nameSet) {
    for (const f of fs) {
      for (let i = 0; i + 3 <= n; i++) {
        let sub = f.slice(i, i + 3).join('');
        if (!namePrefix3.has(sub)) continue;
        for (let j = i + 3; j <= Math.min(n, i + 20); j++) {
          if (j > i + 3) sub += f[j - 1];
          if (nameSet.has(sub) && !names[i].includes(j)) names[i].push(j);
        }
      }
    }
  }
  const monthsAll = tokenEnds([plain], MONTH_WORDS.map((m) => Array.from(m)));
  const months = monthsAll.map((ends, i) => ends.filter((j) => isDigit(plain[i - 1]) || isDigit(plain[j])));
  // A 3-letter app or exam word ("cia", "cpa", "app") counts only standing alone: "special" is not "cia".
  const service3 = tokenEnds(fs, service).map((ends, i) => ends.filter((j) => j - i > 3 || (kindOf(plain[i - 1]) !== 'l' && kindOf(plain[j]) !== 'l')));
  return { n, plain, runs, numbers: numberEnds(plain), months, words, personal: tokenEnds(fs, personal), service: service3, names };
}

/**
 * The fewest characters left over when the password is written as
 * predictable pieces (dynamic programming over positions × list words used ×
 * word pieces used). `use` picks the piece kinds; symbols are always free.
 * Word pieces (list entries, app and exam words) are capped at
 * MAX_WORD_PIECES in all: four or more words is a passphrase, not a pattern.
 */
function leftOver(l: Lattice, use: { personal: boolean; service: boolean; listWords: number; numbers: boolean }): number {
  const { n, plain } = l;
  const W = MAX_WORD_PIECES;
  const at = (k: number, w: number) => k * (W + 1) + w;
  const cost = Array.from({ length: (use.listWords + 1) * (W + 1) }, () => new Array<number>(n + 1).fill(Infinity));
  cost[at(0, 0)][0] = 0;
  for (let i = 0; i < n; i++) {
    for (let k = 0; k <= use.listWords; k++) {
      for (let w = 0; w <= W; w++) {
        const c = cost[at(k, w)][i];
        if (c === Infinity) continue;
        const relax = (kk: number, ww: number, j: number) => {
          const row = cost[at(kk, ww)];
          if (c < row[j]) row[j] = c;
        };
        const lit = isSymbol(plain[i]) ? 0 : 1;
        const here = cost[at(k, w)];
        if (c + lit < here[i + 1]) here[i + 1] = c + lit;
        for (const j of l.runs[i]) relax(k, w, j);
        if (use.numbers) {
          for (const j of l.numbers[i]) relax(k, w, j);
          for (const j of l.months[i]) relax(k, w, j);
        }
        if (use.personal) for (const j of l.personal[i]) relax(k, w, j);
        if (w < W) {
          if (use.service) for (const j of l.service[i]) relax(k, w + 1, j);
          if (k < use.listWords) for (const j of l.words[i]) relax(k + 1, w + 1, j);
        }
      }
    }
  }
  let best = Infinity;
  for (const row of cost) best = Math.min(best, row[n]);
  return best;
}

/**
 * The fewest characters left over when the password is written as names
 * only (up to MAX_NAME_PIECES given names or surnames, the account's own
 * words) plus numbers, symbols, repeats and sequences ("MarkAnthonyCruz88").
 */
function namesLeftOver(l: Lattice): number {
  const { n, plain } = l;
  const W = MAX_NAME_PIECES;
  const cost = Array.from({ length: W + 1 }, () => new Array<number>(n + 1).fill(Infinity));
  cost[0][0] = 0;
  for (let i = 0; i < n; i++) {
    for (let w = 0; w <= W; w++) {
      const c = cost[w][i];
      if (c === Infinity) continue;
      const lit = isSymbol(plain[i]) ? 0 : 1;
      if (c + lit < cost[w][i + 1]) cost[w][i + 1] = c + lit;
      const free = (j: number, ww: number) => {
        if (c < cost[ww][j]) cost[ww][j] = c;
      };
      for (const j of l.runs[i]) free(j, w);
      for (const j of l.numbers[i]) free(j, w);
      for (const j of l.personal[i]) free(j, w);
      if (w < W) for (const j of l.names[i]) free(j, w + 1);
    }
  }
  return Math.min(...cost.map((row) => row[n]));
}

/** Real characters left after repeats, sequences, copies and years (B1.2's floor). */
function material(l: Lattice): number {
  const { n, plain } = l;
  const cost = new Array<number>(n + 1).fill(Infinity);
  cost[0] = 0;
  for (let i = 0; i < n; i++) {
    const c = cost[i];
    if (c === Infinity) continue;
    const step = isSymbol(plain[i]) ? 0 : 1;
    if (c + step < cost[i + 1]) cost[i + 1] = c + step;
    for (const j of l.runs[i]) if (c < cost[j]) cost[j] = c;
    if (isDigit(plain[i]) && i + 4 <= n && plain.slice(i, i + 4).every(isDigit) && validYear(Number(plain.slice(i, i + 4).join('')))) if (c < cost[i + 4]) cost[i + 4] = c;
  }
  return cost[n];
}

const reverseStr = (s: string) => Array.from(s).reverse().join('');

/** The reason the whole password is predictable, or null. `p` is NFKC already. */
function predictable(p: string, ctx: PasswordContext): PasswordProblem | null {
  const pieces = comparedWords(p);
  const c = pieces.join('');
  const readings = [c, fold(c, LEET_I), fold(c, LEET_L)];
  // Where the words began and ended (code points), forwards and backwards.
  const n = Array.from(c).length;
  const bounds = new Set<number>([0, n]);
  let at = 0;
  for (const w of pieces) bounds.add((at += Array.from(w).length));
  const backBounds = new Set([...bounds].map((b) => n - b));
  // The account's words, and backwards ("aveunalliv"); the whole email domain too ("yahoocom").
  const account = [...emailWords(ctx.email), ...domainWords(ctx.email), ...nameWords(ctx.names)];
  const personal = [...new Set([...account, ...account.map(reverseStr)])];
  const personalTokens = [...new Set([...personal, ...personal.map((t) => fold(t, LEET_I)), ...personal.map((t) => fold(t, LEET_L))])].map((t) => Array.from(t));
  // Study words ("exam", "review", "control"…) are ordinary English too: they count as the
  // app's words only when an app or exam name is there as well ("cisaexam2026pass"), so
  // "manager struggle pass" and "passion plastic control" stay three ordinary words. Exam
  // names and terms on their own ("certified information systems auditor", "internal
  // controls") are phrases on the bundled list.
  const has = (w: string) => readings.some((r) => r.includes(w) || reverseStr(r).includes(w));
  const serviceTokens = [...SERVICE_WORDS, ...(SERVICE_WORDS.some(has) ? STUDY_WORDS : [])].map((t) => Array.from(t));
  // Forwards and backwards ("drowssap").
  const lats = [lattice(readings, personalTokens, serviceTokens, bounds), lattice(readings.map(reverseStr), personalTokens, serviceTokens, backBounds)];
  const worst = (use: Parameters<typeof leftOver>[1]) => Math.min(...lats.map((l) => leftOver(l, use)));

  const exact = readings.some((x) => long().has(x));
  const all = worst({ personal: true, service: true, listWords: MAX_LIST_WORDS, numbers: true });
  if (all <= MAX_LEFT_OVER) {
    // Name the piece the refusal needs: without it, the password would pass this test.
    if (worst({ personal: false, service: true, listWords: MAX_LIST_WORDS, numbers: true }) > MAX_LEFT_OVER) return 'contains_email';
    if (worst({ personal: false, service: false, listWords: MAX_LIST_WORDS, numbers: true }) > MAX_LEFT_OVER) return 'contains_service_word';
    if (exact || worst({ personal: false, service: false, listWords: 0, numbers: true }) > MAX_LEFT_OVER) return 'common';
    return 'too_simple';
  }
  // Mostly the account's own words: they cover 8+ characters and at most 4 are left over
  // ("MrsGraceVillanueva1", "yahoo.com.grace0312").
  if (lats.some((l) => l.personal.some((e) => e.length))) {
    const withAccount = worst({ personal: true, service: true, listWords: 0, numbers: true });
    const without = worst({ personal: false, service: true, listWords: 0, numbers: true });
    if (withAccount <= 4 && without - withAccount >= 8) return 'contains_email';
  }
  // A full name and numbers ("MarkAnthonyCruz88"): common, whoever's name it is. Names alone
  // with no number or symbol are left to the other rules (three names can be a passphrase).
  if (nameSet && /[0-9!-\/:-@[-`{-~]/.test(p) && lats[0].names.some((e) => e.length) && Math.min(...lats.map(namesLeftOver)) <= MAX_LEFT_OVER) return 'common';
  if (exact) return 'common';
  // One ordinary word of up to 14 letters, typed as one (no joiner inside, no capital inside),
  // and only numbers, symbols or runs besides; the same word typed again counts once
  // (a single word with numbers, or a word typed twice).
  const lettered = pieces.filter((x) => /[a-z]/.test(x));
  const one = lettered.length === 1 ? /^[^a-z]*([a-z]+)[^a-z]*$/.exec(lettered[0]) : null;
  if (one) {
    const word = one[1];
    // A word typed twice or more: the shortest repeating part (two whole copies at least).
    let period = word.length;
    for (let q = 1; word.length > 14 && 2 * q <= word.length && q <= 14; q++) {
      if (Array.from(word).every((ch, i) => i < q || ch === word[i - q])) {
        period = q;
        break;
      }
    }
    const letters = Array.from(p).filter((ch) => /[A-Za-z]/.test(ch)).join('');
    // Each copy of the word written alike: all lower case, a capital first, or all capitals.
    const chunks = letters.match(new RegExp(`.{1,${period}}`, 'g')) ?? [];
    const plainCase = chunks.length > 0 && (chunks.every((x) => /^[A-Za-z][a-z]*$/.test(x)) || /^[A-Z]+$/.test(letters));
    if (period <= 14 && plainCase && worst({ personal: false, service: false, listWords: 0, numbers: true }) <= period + MAX_LEFT_OVER) return 'too_simple';
  }
  if (Math.min(...lats.map(material)) < MIN_MATERIAL || new Set(Array.from(c)).size < 5) return 'too_simple';
  return null;
}

/**
 * Every reason this password would be refused, most important first ([]:
 * fine). The second argument is the account's email, or { email, names }.
 * Over 72 bytes, only 'too_long' is reported (nothing else matters until it
 * is shorter, and it keeps the work small). Until the word lists are loaded
 * the answer can miss common words: use assessPassword to know.
 */
export function checkPassword(password: unknown, context?: string | PasswordContext | null): PasswordProblem[] {
  const ctx: PasswordContext = typeof context === 'string' ? { email: context } : context && typeof context === 'object' ? context : {};
  const raw = typeof password === 'string' ? password : '';
  const p = normalizePassword(raw);
  const nfc = form(raw, 'NFC');
  if (p === null || nfc === null || INVALID.test(p) || INVALID.test(raw)) return ['invalid_characters'];
  if (passwordBytes(p) > PASSWORD_MAX_BYTES) return ['too_long'];
  const out: PasswordProblem[] = [];
  if (Math.min(Array.from(p).length, Array.from(nfc).length) < PASSWORD_MIN_CHARS) out.push('too_short');
  const why = predictable(p, ctx);
  if (why) out.push(why);
  return out;
}

/**
 * checkPassword plus whether the word lists were loaded: when `complete` is
 * false the screen should say "checking…" (or wait for the lists) rather
 * than "looks good". auth.ts never saves a password while it is false.
 */
export function assessPassword(password: unknown, context?: string | PasswordContext | null): { problems: PasswordProblem[]; complete: boolean } {
  return { problems: checkPassword(password, context), complete: passwordWordsLoaded() };
}

/** The one reason to show, or null when the password is fine. */
export function passwordProblem(password: unknown, context?: string | PasswordContext | null): PasswordProblem | null {
  return checkPassword(password, context)[0] ?? null;
}
