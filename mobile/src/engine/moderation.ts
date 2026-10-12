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
 *   NFKC, invisible characters removed, curly quotes straightened, spaces
 *   collapsed). Look-alike letters from other alphabets (Cyrillic "а" for
 *   Latin "a") are folded only for MATCHING, never in what is stored.
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

/** Zero-width and other invisible format characters (a common way to sneak a word past a filter). */
const INVISIBLE = /[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180F\u200B-\u200F\u202A-\u202E\u2060-\u206F\u3164\uFE00-\uFE0F\uFEFF\uFFA0]/g;
/** Control characters (C0 and C1) other than the line break and tab, dropped one by one (no regex: lint-safe in both linters). */
function stripControl(s: string): string {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    if ((c < 32 && c !== 10 && c !== 9) || (c >= 0x7f && c <= 0x9f)) continue;
    out += ch;
  }
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
    stripControl(text.normalize('NFKC').replace(/\r\n?/g, '\n').replace(INVISIBLE, ''))
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
 * Letters from other alphabets that look like Latin ones (Cyrillic and
 * Greek), folded to the Latin letter for matching only. Small on purpose:
 * the letters that make a convincing look-alike of an English word.
 */
const CONFUSABLES: Record<string, string> = {
  // Cyrillic
  'а': 'a', 'в': 'b', 'е': 'e', 'ё': 'e', 'к': 'k', 'м': 'm', 'н': 'h', 'о': 'o', 'р': 'p', 'с': 'c', 'т': 't', 'у': 'y',
  'х': 'x', 'ѕ': 's', 'і': 'i', 'ї': 'i', 'ј': 'j', 'ԁ': 'd', 'ԛ': 'q', 'ԝ': 'w', 'ӏ': 'l', 'һ': 'h', 'ɡ': 'g',
  // Greek
  'α': 'a', 'β': 'b', 'ε': 'e', 'η': 'n', 'ι': 'i', 'κ': 'k', 'ν': 'v', 'ο': 'o', 'ρ': 'p', 'τ': 't', 'υ': 'u', 'χ': 'x',
  'ω': 'w', 'μ': 'u', 'γ': 'y',
  // Latin look-alikes
  'ı': 'i', 'ł': 'l', 'ø': 'o', 'đ': 'd', 'ß': 'ss',
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
 * self-harm and ways to contact someone off the board. Phrases, matched
 * on whole words.
 */
export const HOLD_PHRASES: readonly string[] = [
  'kill you', 'kill u', 'i will find you', 'find where you live', 'hurt you', 'shoot you', 'beat you up',
  'kill myself', 'end my life', 'suicide', 'suicidal', 'self harm', 'want to die', 'cut myself',
  'whatsapp', 'telegram', 'wechat', 'viber', 'signal me', 'dm me', 'text me', 'call me', 'email me', 'pm me',
];

/** A contact detail in the text: an email address or a phone number. */
const EMAIL_IN_TEXT = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const PHONE_RUN = /(?:\+|\b)\d[\d\s().-]{7,}\d\b/g;
/** A date ("2026-10-12", "12.10.2026") or a standard's number is not a phone number. */
const DATE_LIKE = /^(\d{4}[-./]\d{1,2}[-./]\d{1,2}|\d{1,2}[-./]\d{1,2}[-./]\d{2,4})$/;

/** A phone number: a run of digits and separators holding 9 to 15 digits that isn't a date. */
export function hasPhoneNumber(folded: string): boolean {
  for (const m of folded.matchAll(PHONE_RUN)) {
    const run = m[0].trim();
    const digits = run.replace(/\D/g, '').length;
    if (digits >= 9 && digits <= 15 && !DATE_LIKE.test(run)) return true;
  }
  return false;
}

/** A link: a scheme, "www.", or a bare domain with a common ending. */
const LINK = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9][a-z0-9-]{0,62}\.(?:com|net|org|io|co|me|info|biz|ly|gl|app|xyz|site|online|top|ru|cn|in|ph|uk|us|de|to|gg|link|page|pdf)\b/i;

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

/** The link-looking parts of a text, folded (for the shortener and dump checks). */
export function linksIn(text: string): string[] {
  const folded = foldForMatch(text);
  const out: string[] = [];
  const re = new RegExp(LINK.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(folded)) !== null) out.push(m[0].toLowerCase());
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
  if (hold.some((p) => hasPhrase(words, p)) || EMAIL_IN_TEXT.test(folded) || hasPhoneNumber(folded)) {
    return { verdict: 'hold', reason: 'hold_words' };
  }
  return { verdict: 'ok' };
}

// ── Handles ─────────────────────────────────────────────────────────────

/** 3–24 characters: a letter first, then letters, digits, spaces and . _ ' - (the SQL check is the same). */
export const HANDLE_RE = /^[A-Za-z][A-Za-z0-9 ._'-]{2,23}$/;

/**
 * Names nobody may use, matched anywhere in the folded name without its
 * spaces and punctuation ("Aurivan Team", "ISACA_mod", "s u p p o r t").
 * The server's members_guard trigger holds the same list.
 */
export const RESERVED_HANDLES: readonly string[] = [
  'aurivan', 'isaca', 'cisa', 'cism', 'crisc', 'cgeit', 'admin', 'moderator', 'mod', 'team', 'support', 'official', 'staff',
];

export type HandleProblem = 'shape' | 'reserved' | 'words';

/**
 * Whether a board name can be used: its shape (HANDLE_RE, no double
 * spaces), not a reserved name (alone or inside another word, after folding
 * look-alikes and dropping spaces and punctuation), and not on the block
 * list. null = fine.
 */
export function checkHandle(handle: string, extra: { reserved?: readonly string[]; block?: readonly string[] } = {}): HandleProblem | null {
  if (handle !== handle.trim() || !HANDLE_RE.test(handle) || handle.includes('  ')) return 'shape';
  const squashed = wordsOf(handle).join('');
  const reserved = [...RESERVED_HANDLES, ...(extra.reserved ?? [])].map((r) => wordsOf(r).join(''));
  // Short reserved words ("mod") count only as a whole word, so "Modest Pine 4" stays fine.
  const words = wordsOf(handle);
  for (const r of reserved) {
    if (!r) continue;
    if (r.length <= 4 ? words.includes(r) || squashed === r : squashed.includes(r)) return 'reserved';
  }
  if (moderateText(handle, { newMember: false, extra: { block: extra.block } }).verdict === 'reject') return 'words';
  return null;
}
