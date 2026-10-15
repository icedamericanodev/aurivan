/**
 * Feedback board text rules (Uplift Phase 8, built OFF; spec PHASE6_8.md
 * §4.5 step 2–3 and support.md §10.2): pure, tested in
 * __tests__/board-moderation.test.ts. No React, no storage, no network.
 *
 * The SAME file runs in two places, so the phone and the server always
 * agree:
 * - the app's composer, as the learner types (a hint before Post);
 * - the `board-submit` Edge Function, which decides. The copy in
 *   supabase/functions/_shared/moderation.ts is written by
 *   mobile/scripts/sync-shared.mjs, and `--check` (guard G8) fails if the
 *   two ever differ. Edit THIS file, then run `node scripts/sync-shared.mjs`.
 *
 * Plain English:
 * - normalizeText: the one way text is cleaned before any check (Unicode
 *   NFKC, every invisible "format" character removed, including the "tag"
 *   characters U+E0020–E007F a reviewer used to hide a word (fix round P8,
 *   CR B6) and blank-looking ones like the empty braille cell U+2800
 *   (RR_P8 R4), curly quotes straightened, spaces collapsed). Look-alike letters
 *   from other alphabets (Cyrillic "а", Armenian "օ", small capitals "ᴀ")
 *   are folded only for MATCHING, never in what is stored.
 * - moderateText: words we never allow (reject), words a person should see
 *   first (hold), and links (a new member can't post one yet; link
 *   shorteners and exam-dump sites are never allowed).
 * - checkHandle: the name a learner shows on the board can't pretend to be
 *   the team, the exam body or staff.
 *
 * The starter word lists here are deliberately short and mild: this file is
 * public (it ships in the app). The full lists are kept server-side only, in
 * private.moderation_terms, and passed in as `extra` by board-submit.
 */

// ── Normalising ─────────────────────────────────────────────────────────

/** Printable ASCII and line breaks only: nothing to fold or strip. */
const ASCII = /^[\n\x20-\x7e]*$/;

/**
 * Characters nobody sees, as [first, last] code point ranges: every Unicode
 * "format" (Cf) character (zero-width spaces and joiners, direction marks,
 * the soft hyphen, the BOM, the "tag" characters U+E0000–E007F), the
 * variation selectors, the Hangul and Mongolian fillers, and the control
 * characters other than the line break and tab. A common way to sneak a
 * word past a filter. Checked one code point at a time (no regex: the same
 * in Hermes, Node and Deno, and lint-safe).
 *
 * Re-review RR_P8 R4: some characters LOOK blank but aren't "format"
 * characters, so they need naming one by one: U+2800 (the empty braille
 * cell), U+1D159 (a musical "null" note head) and U+16FE4 (the Khitan
 * filler). The Unicode "default ignorable" blocks not yet assigned
 * (U+FFF0–FFF8, U+E0080–E00FF, U+E01F0–E0FFF) go too, so a future font
 * can't turn them into a hiding place. Ranges stay in order (`hidden` stops
 * at the first range past the code point).
 */
const HIDDEN: readonly (readonly [number, number])[] = [
  [0x00, 0x08], [0x0b, 0x1f], [0x7f, 0x9f], [0xad, 0xad], [0x34f, 0x34f], [0x600, 0x605], [0x61c, 0x61c], [0x6dd, 0x6dd],
  [0x70f, 0x70f], [0x890, 0x891], [0x8e2, 0x8e2], [0x115f, 0x1160], [0x17b4, 0x17b5], [0x180b, 0x180f], [0x200b, 0x200f],
  [0x202a, 0x202e], [0x2060, 0x206f], [0x2800, 0x2800], [0x3164, 0x3164], [0xfe00, 0xfe0f], [0xfeff, 0xfeff], [0xffa0, 0xffa0],
  [0xfff0, 0xfffb], [0x110bd, 0x110bd], [0x110cd, 0x110cd], [0x13430, 0x1343f], [0x16fe4, 0x16fe4], [0x1bca0, 0x1bca3],
  [0x1d159, 0x1d159], [0x1d173, 0x1d17a], [0xe0000, 0xe0fff],
];
function hidden(c: number): boolean {
  for (const [lo, hi] of HIDDEN) {
    if (c < lo) return false;
    if (c <= hi) return true;
  }
  return false;
}
/** The text without its hidden characters (a line break and a tab stay). */
function stripHidden(s: string): string {
  let out = '';
  for (const ch of s) if (!hidden(ch.codePointAt(0) ?? 0)) out += ch;
  return out;
}

/**
 * The text as it is checked AND stored: NFKC (full-width letters become
 * plain ones), invisible and control characters removed, curly quotes made
 * straight, runs of spaces made one, at most two line breaks in a row, and
 * trimmed. Idempotent: normalizeText(normalizeText(x)) === normalizeText(x).
 */
export function normalizeText(text: string): string {
  // Plain printable ASCII (the whole question bank, most posts) needs only the spacing rules: the fast path.
  if (ASCII.test(text)) return spaced(text);
  return spaced(
    stripHidden(text.normalize('NFKC').replace(/\r\n?/g, '\n'))
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u00B4]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
  );
}

/** The spacing rules: runs of spaces made one, no spaces around line breaks, at most two line breaks in a row, trimmed. */
function spaced(text: string): string {
  return text
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Letters from other alphabets that look like Latin ones (Cyrillic, Greek,
 * Armenian, IPA and small capitals), folded to the Latin letter for
 * matching only. Small on purpose: the letters that make a convincing
 * look-alike of an English word (fix round P8, SEC S5).
 */
const CONFUSABLES: Record<string, string> = {
  // Cyrillic
  'а': 'a', 'в': 'b', 'е': 'e', 'ё': 'e', 'к': 'k', 'м': 'm', 'н': 'h', 'о': 'o', 'р': 'p', 'с': 'c', 'т': 't', 'у': 'y',
  'х': 'x', 'ѕ': 's', 'і': 'i', 'ї': 'i', 'ј': 'j', 'ԁ': 'd', 'ԛ': 'q', 'ԝ': 'w', 'ӏ': 'l', 'һ': 'h', 'ɡ': 'g',
  // Greek
  'α': 'a', 'β': 'b', 'ε': 'e', 'η': 'n', 'ι': 'i', 'κ': 'k', 'ν': 'v', 'ο': 'o', 'ρ': 'p', 'τ': 't', 'υ': 'u', 'χ': 'x',
  'ω': 'w', 'μ': 'u', 'γ': 'y',
  // Armenian
  'օ': 'o', 'ս': 'u', 'ո': 'n', 'ց': 'g', 'հ': 'h', 'ա': 'w', 'զ': 'q', 'ք': 'p',
  // Latin look-alikes and IPA
  'ı': 'i', 'ł': 'l', 'ø': 'o', 'đ': 'd', 'ß': 'ss', 'ɑ': 'a', 'ɩ': 'i', 'ɪ': 'i', 'ɴ': 'n', 'ʀ': 'r', 'ʏ': 'y', 'ʜ': 'h', 'ʟ': 'l',
  // Small capitals
  'ᴀ': 'a', 'ʙ': 'b', 'ᴄ': 'c', 'ᴅ': 'd', 'ᴇ': 'e', 'ꜰ': 'f', 'ɢ': 'g', 'ᴊ': 'j', 'ᴋ': 'k', 'ᴍ': 'm', 'ᴏ': 'o', 'ᴘ': 'p',
  'ꜱ': 's', 'ᴛ': 't', 'ᴜ': 'u', 'ᴠ': 'v', 'ᴡ': 'w', 'ᴢ': 'z',
};

/** Lower case, accents dropped, look-alike letters folded: for MATCHING only (never stored). */
export function foldForMatch(text: string): string {
  const clean = normalizeText(text).toLowerCase();
  // Plain ASCII (most text, and the whole question bank) has nothing to fold: the fast path.
  if (ASCII.test(clean)) return clean;
  let out = '';
  for (const ch of clean.normalize('NFD')) {
    // Combining accents (é → e) go; everything else is folded or kept.
    if (/[\u0300-\u036F]/.test(ch)) continue;
    out += CONFUSABLES[ch] ?? ch;
  }
  return out;
}

/** Digits and symbols used as letters ("h4te", "$pam"), for the word lists only. */
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };

/** The words of a text for the word lists: folded, leetspeak undone, split on anything that isn't a letter. */
export function wordsOf(text: string): string[] {
  const folded = foldForMatch(text).replace(/[0-9@$!]/g, (c) => LEET[c] ?? c);
  return folded.split(/[^a-z]+/).filter(Boolean);
}

// ── Word lists ──────────────────────────────────────────────────────────

/**
 * Never allowed (reject: "This contains words we don't allow."). Matched as
 * whole words, or as a run of whole words for phrases. A short public
 * starter list; the full one is private.moderation_terms kind 'block'.
 */
export const BLOCK_WORDS: readonly string[] = [
  'fuck', 'fucking', 'fucker', 'motherfucker', 'cunt', 'porn', 'porno', 'pornhub', 'xxx', 'nudes', 'blowjob', 'handjob',
  'dickpic', 'onlyfans', 'nigger', 'nigga', 'faggot', 'retard', 'kys',
];

/**
 * A person should see it first (hold: "Waiting for review"): threats,
 * self-harm, ways to contact someone off the board, and claims to speak
 * for ISACA (compliance review P8, item 8). Phrases, matched on whole words.
 */
export const HOLD_PHRASES: readonly string[] = [
  'kill you', 'kill u', 'i will find you', 'find where you live', 'hurt you', 'shoot you', 'beat you up',
  'kill myself', 'end my life', 'suicide', 'suicidal', 'self harm', 'want to die', 'cut myself',
  'whatsapp', 'telegram', 'wechat', 'viber', 'signal me', 'dm me', 'text me', 'call me', 'email me', 'pm me',
  'isaca official', 'official isaca',
];

/**
 * "Dump" waits for a person (an exam-dump offer), unless the word before it
 * makes it an audit topic ("memory dump", "core dump"): a plain word list
 * would hold those too.
 */
const TECH_DUMP = new Set([
  'memory', 'core', 'heap', 'crash', 'thread', 'stack', 'process', 'kernel', 'mini', 'full', 'system', 'database', 'db',
  'data', 'sql', 'log', 'hex', 'ram', 'disk', 'register', 'lsass', 'hash', 'credential', 'password', 'packet', 'traffic',
  'network', 'config', 'schema', 'table', 'backup', 'binary', 'firmware', 'mem', 'screen', 'xml', 'json', 'csv',
]);
function dumpOffer(words: readonly string[]): boolean {
  return words.some((w, i) => (w === 'dump' || w === 'dumps') && !TECH_DUMP.has(words[i - 1] ?? ''));
}

/** A contact detail in the text: an email address or a phone number. */
const EMAIL_IN_TEXT = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const PHONE_RUN = /(?:\+|\b)\d[\d\s().-]{7,}\d\b/g;
/** A date ("2026-10-12", "12.10.2026") or a standard's number is not a phone number. */
const DATE_LIKE = /^(\d{4}[-./]\d{1,2}[-./]\d{1,2}|\d{1,2}[-./]\d{1,2}[-./]\d{2,4})$/;

/**
 * A phone number: a run of digits and separators holding 9 to 15 digits
 * that isn't a date or standards' numbers (QA BUG-5, CR N7). A run that
 * starts with "+" or "(" always counts. Otherwise every group needs 3 or
 * more digits ("800-53 800-30" has 2-digit groups: NIST numbers), and two
 * groups where one is a year are a standard and its edition ("27001 2022").
 */
export function hasPhoneNumber(folded: string): boolean {
  for (const m of folded.matchAll(PHONE_RUN)) {
    const run = m[0].trim();
    const digits = run.replace(/\D/g, '').length;
    if (digits < 9 || digits > 15 || DATE_LIKE.test(run)) continue;
    if (run.startsWith('+') || folded[(m.index ?? 0) - 1] === '(') return true;
    const groups = run.split(/\D+/).filter(Boolean);
    if (groups.some((g) => g.length < 3)) continue;
    if (groups.length === 2 && groups.some((g) => /^(19|20)\d\d$/.test(g))) continue;
    return true;
  }
  return false;
}

/** A link with a scheme or "www." (any case). */
const SCHEME_LINK = /\b(?:https?:\/\/|www\.)\S+/gi;
/**
 * A bare web address: a name, a dot, and an ending of 2 to 24 letters (any
 * ending: there are hundreds, so ".vip" or ".shop" counts too: SEC S7). The
 * ending must be all lower case or all capitals AS TYPED: "exam.To be
 * honest" and "app.Me and…" are a missing space, not an address (QA BUG-5).
 */
const BARE_LINK = /\b[A-Za-z0-9][A-Za-z0-9-]{1,62}(?:\.[A-Za-z0-9-]{1,63})*\.(?:[a-z]{2,24}|[A-Z]{2,24})\b/g;
/** An address spelled out ("examhelp dot com", "examhelp (dot) com"). */
const SPELLED_LINK = /\b[a-z0-9][a-z0-9-]{1,62} ?(?:\(dot\)|\[dot\]|\bdot\b) ?(?:com|net|org|io|co|me|info|biz|vip|shop|club|xyz|site|online|app|pro|live|store|top|uk|us|in|ru|cn)\b/gi;
/** File names and common abbreviations are not addresses ("manual.pdf", "node.js"). */
const NOT_AN_ADDRESS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'rtf', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'heic',
  'zip', 'rar', 'json', 'xml', 'yaml', 'yml', 'md', 'js', 'ts', 'py', 'sh', 'exe', 'dll', 'log', 'ini', 'cfg', 'conf', 'bak',
  'tmp', 'mp3', 'mp4', 'mov', 'wav', 'htm', 'html', 'php', 'asp', 'aspx', 'jsp', 'sql', 'db', 'iso', 'dmg', 'apk', 'ipa',
]);

/** Link shorteners hide where a link goes: never allowed. */
export const SHORTENERS: readonly string[] = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'rebrand.ly', 'cutt.ly', 'shorturl.at', 'rb.gy', 't.ly', 'tiny.cc'];

/** Words that mark an exam-dump site or offer, in a link. Never allowed. */
const DUMP_IN_LINK = /dump|braindump|examtopics|exam-?collection|pass4|passleader|actualtests|realexam|testking|certkiller|prep-?away|vceplus|\.vce\b/i;

/** A word spelled out letter by letter ("f u c k", "F.U.C.K") joined back into one word, for the block list. */
function joinSpelledOut(words: string[]): string[] {
  const out: string[] = [];
  let run = '';
  for (const w of words) {
    if (w.length === 1) {
      run += w;
      continue;
    }
    if (run) out.push(run);
    run = '';
    out.push(w);
  }
  if (run) out.push(run);
  return out;
}

function hasPhrase(words: string[], phrase: string): boolean {
  const p = phrase.split(' ');
  for (let i = 0; i + p.length <= words.length; i++) {
    let ok = true;
    for (let j = 0; j < p.length; j++) {
      if (words[i + j] !== p[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

export type ModerationVerdict =
  | { verdict: 'ok' }
  /** words: on the block list; links: a new member's link, a shortener or a dump site. */
  | { verdict: 'reject'; reason: 'words' | 'links' }
  /** A person checks it first. */
  | { verdict: 'hold'; reason: 'hold_words' };

export interface ModerationTerms {
  /** Extra whole-word phrases to reject (server: private.moderation_terms 'block'). */
  block?: readonly string[];
  /** Extra phrases to hold (server: 'hold'). */
  hold?: readonly string[];
  /** Extra link domains never allowed (server: 'link_domain'). */
  linkDomains?: readonly string[];
}

/**
 * The link-looking parts of a text, folded to lower case (for the
 * shortener and dump checks). Read from the text as typed (the case of a
 * web address's ending matters: see BARE_LINK).
 */
export function linksIn(text: string): string[] {
  const clean = normalizeText(text);
  const out: string[] = [];
  for (const m of clean.matchAll(SCHEME_LINK)) out.push(foldForMatch(m[0]));
  const rest = clean.replace(SCHEME_LINK, ' ');
  for (const m of rest.matchAll(BARE_LINK)) {
    const ending = m[0].slice(m[0].lastIndexOf('.') + 1).toLowerCase();
    if (!NOT_AN_ADDRESS.has(ending)) out.push(foldForMatch(m[0]));
  }
  for (const m of foldForMatch(rest).matchAll(SPELLED_LINK)) out.push(m[0].replace(/ ?(?:\(dot\)|\[dot\]|\bdot\b) ?/, '.'));
  return out;
}

/**
 * The filters a post or comment goes through (board-submit step 3), in
 * order: the block list (reject), links (reject for a new member, and
 * shorteners or dump sites for everyone), then the hold list and contact
 * details (hold). Phrases from `extra` are plain words, never patterns, so a
 * staff-added term can't slow the server down.
 */
export function moderateText(text: string, opts: { newMember: boolean; extra?: ModerationTerms } = { newMember: true }): ModerationVerdict {
  const words = wordsOf(text);
  const block = [...BLOCK_WORDS, ...(opts.extra?.block ?? [])].map((p) => wordsOf(p).join(' ')).filter(Boolean);
  const spelled = joinSpelledOut(words);
  if (block.some((p) => hasPhrase(words, p) || hasPhrase(spelled, p))) return { verdict: 'reject', reason: 'words' };

  const links = linksIn(text);
  if (links.length) {
    if (opts.newMember) return { verdict: 'reject', reason: 'links' };
    const banned = [...SHORTENERS, ...(opts.extra?.linkDomains ?? [])].map((d) => d.toLowerCase());
    const bad = links.some((l) => DUMP_IN_LINK.test(l) || banned.some((d) => l === d || l.includes(`//${d}`) || l.includes(`.${d}`) || l.startsWith(`${d}/`) || l.includes(`www.${d}`) || l.startsWith(d)));
    if (bad) return { verdict: 'reject', reason: 'links' };
  }

  const hold = [...HOLD_PHRASES, ...(opts.extra?.hold ?? [])].map((p) => wordsOf(p).join(' ')).filter(Boolean);
  const folded = foldForMatch(text);
  if (hold.some((p) => hasPhrase(words, p)) || dumpOffer(words) || EMAIL_IN_TEXT.test(folded) || hasPhoneNumber(folded)) {
    return { verdict: 'hold', reason: 'hold_words' };
  }
  return { verdict: 'ok' };
}

// ── Handles ─────────────────────────────────────────────────────────────

/** 3–24 characters: a letter first, then letters, digits, spaces and . _ ' - (the SQL check is the same). */
export const HANDLE_RE = /^[A-Za-z][A-Za-z0-9 ._'-]{2,23}$/;

/**
 * Names nobody may use, matched anywhere in the folded name without its
 * spaces and punctuation ("KaiSip Team", "ISACA_mod", "s u p p o r t"):
 * the team, the exam body and every ISACA certification or framework mark
 * (compliance review P8, item 8). The server's members_guard trigger holds
 * the same list.
 */
export const RESERVED_HANDLES: readonly string[] = [
  'aurivan', 'kaisip', 'isaca', 'cisa', 'cism', 'crisc', 'cgeit', 'cdpse', 'ccoa', 'aaia', 'aaism', 'cobit', 'csx',
  'admin', 'moderator', 'mod', 'team', 'support', 'official', 'staff',
];
/**
 * Everyday words that happen to contain "admin" or "staff" (CR nit 8). They
 * are taken out of the name before "admin" and "staff" are looked for, so
 * "Badminton Fan" and "Distaff Pine" are fine while "SiteAdmin",
 * "StaffPick" and "Badminton Admin" are not (re-review RR_P8 R2: matching
 * those two only as whole words let "SiteAdmin" through). Written already
 * folded (foldHandle reads "l" as "i": "flagstaff" is "fiagstaff"), and
 * taken out one after another in this order; the server's members_guard
 * does exactly the same.
 */
export const RESERVED_CARRIERS: readonly string[] = ['badminton', 'distaff', 'fiagstaff', 'pikestaff', 'quarterstaff', 'stafford'];
/** The reserved words checked after the carriers above are taken out. */
const CARRIED = new Set(['admin', 'staff']);

/**
 * A name's word folded for the reserved check (the server's
 * private.fold_handle does the same): after wordsOf (lower case, digits
 * read as letters), the look-alikes "l" for "I", "rn" for "m" and "vv" for
 * "w" ("AURlVAN" reads as "aurivan": SEC B1 d).
 */
export function foldHandle(word: string): string {
  return word.replace(/l/g, 'i').replace(/rn/g, 'm').replace(/vv/g, 'w');
}

export type HandleProblem = 'shape' | 'reserved' | 'words';

/**
 * Whether a board name can be used: its shape (HANDLE_RE, no double
 * spaces), not a reserved name (alone or inside another word, after folding
 * look-alikes and dropping spaces and punctuation), and not on the block
 * list. null = fine.
 */
export function checkHandle(handle: string, extra: { reserved?: readonly string[]; block?: readonly string[] } = {}): HandleProblem | null {
  if (handle !== handle.trim() || !HANDLE_RE.test(handle) || handle.includes('  ')) return 'shape';
  const words = wordsOf(handle).map(foldHandle);
  const squashed = words.join('');
  // The name without its everyday "admin" / "staff" words ("Badminton Fan" → "fan").
  let uncarried = squashed;
  for (const c of RESERVED_CARRIERS) uncarried = uncarried.split(c).join('');
  // Short reserved words ("mod") count only as a whole word, so "Modest Pine 4" stays fine.
  // The rest count anywhere in the name; "admin" and "staff" once the everyday words are out.
  for (const name of RESERVED_HANDLES) {
    const r = foldHandle(wordsOf(name).join(''));
    const hit = r.length <= 4 ? words.includes(r) || squashed === r : (CARRIED.has(name) ? uncarried : squashed).includes(r);
    if (hit) return 'reserved';
  }
  for (const name of extra.reserved ?? []) {
    const r = foldHandle(wordsOf(name).join(''));
    if (r && squashed.includes(r)) return 'reserved';
  }
  if (moderateText(handle, { newMember: false, extra: { block: extra.block } }).verdict === 'reject') return 'words';
  return null;
}
