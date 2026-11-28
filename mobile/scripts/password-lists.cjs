/**
 * The password lists the apps refuse (src/engine/passwordRules.ts), picked
 * from two pinned public sources and two hand-written ones. Used by
 * build-password-blocklist.mjs (the command) and by Jest
 * (password-rules.test.ts checks the picking rules).
 *
 * Plain English for the founder:
 * - "long": the 3,000 most used passwords of 15+ characters (any of them
 *   typed whole is refused). OWASP ASVS 5.0 6.2.4 asks for the top 3,000
 *   that fit our rules.
 * - "short": the 100,000 most used passwords of 4 to 14 characters, digits
 *   included. Too short on their own, so they are used as building blocks:
 *   "football12345678" is a common password plus a sequence.
 * - "dict": every English word of 15+ letters ("congratulations"), from a
 *   public-domain word list.
 * - "local": two hand-written lists in scripts/password-sources/: clichéd
 *   phrases ("merry christmas") and Filipino passwords and words (many of
 *   KaiSip's learners are Filipino; the owner reviews that list in
 *   docs/content/PASSWORD_LIST_FILIPINO.md).
 * - Each entry is kept in the form the app compares: Unicode NFKC, lower
 *   case, accents and invisible characters taken out, Cyrillic and Greek
 *   look-alike letters turned into the Latin ones, and spaces, dots, dashes
 *   and underscores taken out.
 * - The lists hold rude words (they are real passwords), so the files store
 *   them lightly scrambled (letters ROT13, digits ROT5, shared starts
 *   shortened). That is not secrecy, only "not readable at a glance"; the
 *   app unscrambles them when it loads.
 *
 * No third-party packages: only Node's built-in modules.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SOURCES = {
  xato: {
    what: 'SecLists (Daniel Miessler and contributors, MIT licence)',
    file: 'Passwords/Common-Credentials/xato-net-10-million-passwords-1000000.txt',
    commit: 'c34ab251571b9c5e7c93d2e258d0c5b1a678a01c',
    sha256: '424a3e03a17df0a2bc2b3ca749d81b04e79d59cb7aeec8876a5a3f308d0caf51',
    note: "Mark Burnett's 10 million passwords set (xato.net, 2015), ranked by use",
    url: 'https://raw.githubusercontent.com/danielmiessler/SecLists/c34ab251571b9c5e7c93d2e258d0c5b1a678a01c/Passwords/Common-Credentials/xato-net-10-million-passwords-1000000.txt',
  },
  words: {
    what: 'dwyl/english-words (Unlicense, public domain)',
    file: 'words_alpha.txt',
    commit: '20f5cc9b3f0ccc8ce45d814c532b7c2031bba31c',
    sha256: '3ed0c94610d8bcf7c11bbb49c56aa49c7234d32b66824df91f554169e572da48',
    note: 'English words, letters only',
    url: 'https://raw.githubusercontent.com/dwyl/english-words/20f5cc9b3f0ccc8ce45d814c532b7c2031bba31c/words_alpha.txt',
  },
};
/** The hand-written sources (in the repo). */
const LOCAL_DIR = path.join(__dirname, 'password-sources');
const LOCAL_FILES = ['phrases.txt', 'filipino.txt'];

/** The same numbers as passwordRules.ts. */
const MIN_CHARS = 15;
const MAX_BYTES = 72;
const LONG_KEEP = 3000;
const SHORT_KEEP = 100000;
const SHORT_MIN = 4;
const SHORT_MAX = 14;
/** List words shorter than this never match (passwordRules.ts looks up 4+ characters). */
const WORD_MIN = 4;

// ── The compared form: keep in step with passwordRules.ts canonical() (a test checks) ──
const JOINERS = /[\s._-]+/g;
const MARKS = /[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g;
const INVISIBLE = /[\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180f\u200b-\u200f\u202a-\u202e\u2060-\u206f\u3164\ufe00-\ufe0f\ufeff\uffa0]|\udb40[\udc00-\udc7f\udd00-\uddef]/g;
const LOOKALIKE = {
  а: 'a', в: 'b', е: 'e', ё: 'e', к: 'k', м: 'm', н: 'h', о: 'o', р: 'p', с: 'c', т: 't', у: 'y', х: 'x', і: 'i', ї: 'i', ј: 'j', ѕ: 's', ԁ: 'd', ԛ: 'q', ԝ: 'w',
  α: 'a', β: 'b', ε: 'e', η: 'n', ι: 'i', κ: 'k', ν: 'v', ο: 'o', ρ: 'p', τ: 't', υ: 'u', χ: 'x', ω: 'w', ϲ: 'c', ζ: 'z',
};
function canon(s) {
  let x = s.normalize('NFKC').toLowerCase().normalize('NFKD').replace(MARKS, '').replace(INVISIBLE, '').normalize('NFC');
  x = Array.from(x, (c) => LOOKALIKE[c] || c).join('');
  return x.replace(JOINERS, '');
}
const chars = (s) => Array.from(s).length;
const lines = (text) => text.split(/\r?\n/);

/** Top LONG_KEEP distinct passwords of 15+ code points (NFKC) and at most 72 bytes, in rank order. */
function pickLong(xatoText) {
  const out = [];
  const seen = new Set();
  for (const raw of lines(xatoText)) {
    const p = raw.normalize('NFKC').toLowerCase();
    if (chars(p) < MIN_CHARS || Buffer.byteLength(p, 'utf8') > MAX_BYTES) continue;
    const c = canon(p);
    if (!c || seen.has(c)) continue;
    seen.add(c);
    out.push(c);
    if (out.length === LONG_KEEP) return out;
  }
  throw new Error(`only ${out.length} passwords of ${MIN_CHARS}+ characters in the source (need ${LONG_KEEP})`);
}

/** Top `keep` distinct passwords of 4–14 code points (NFKC), digits-only ones included, in rank order. */
function pickShort(xatoText, keep = SHORT_KEEP) {
  const out = [];
  const seen = new Set();
  for (const raw of lines(xatoText)) {
    const p = raw.normalize('NFKC').toLowerCase();
    const n = chars(p);
    if (n < SHORT_MIN || n > SHORT_MAX) continue;
    const c = canon(p);
    if (chars(c) < SHORT_MIN || seen.has(c)) continue;
    seen.add(c);
    out.push(c);
    if (out.length === keep) return out;
  }
  throw new Error(`only ${out.length} short passwords in the source (need ${keep})`);
}

/** Every distinct English word of 15+ letters (a–z only). */
function pickDict(wordsText) {
  const out = new Set();
  for (const raw of lines(wordsText)) {
    const w = raw.trim().toLowerCase();
    if (w.length >= MIN_CHARS && /^[a-z]+$/.test(w)) out.add(w);
  }
  if (out.size < 10000) throw new Error(`only ${out.size} long English words in the source`);
  return [...out];
}

/** Letters ROT13, digits ROT5, everything else as it is (its own inverse). */
function rot(s) {
  let o = '';
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    if (c >= 97 && c <= 122) o += String.fromCharCode(((c - 97 + 13) % 26) + 97);
    else if (c >= 48 && c <= 57) o += String.fromCharCode(((c - 48 + 5) % 10) + 48);
    else o += ch;
  }
  return o;
}

/**
 * A hand-written source: one entry per line, "#" lines are comments, a line
 * starting with "~" is stored scrambled (ROT13/ROT5). Returns { entries
 * (compared form, 4+ characters, once each), plain (the unscrambled lines
 * as written, by category: for the review document) }.
 */
function parseLocal(text) {
  const entries = [];
  const seen = new Set();
  const plain = [];
  let category = '';
  for (const raw of lines(text)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('## ')) {
      category = line.slice(3).trim();
      continue;
    }
    if (line.startsWith('#')) continue;
    const scrambled = line.startsWith('~');
    const value = scrambled ? rot(line.slice(1)) : line;
    if (!scrambled) plain.push({ category, value });
    const c = canon(value);
    if (chars(c) < WORD_MIN || seen.has(c)) continue;
    seen.add(c);
    entries.push(c);
  }
  return { entries, plain };
}
function readLocal() {
  const all = new Set();
  for (const f of LOCAL_FILES) for (const e of parseLocal(fs.readFileSync(path.join(LOCAL_DIR, f), 'utf8')).entries) all.add(e);
  return [...all];
}

/**
 * Sorted, then each line = one character for "letters shared with the line
 * before" (0x41 + n, n ≤ 40) and the rest, scrambled. passwordRules.ts
 * decodeList undoes it.
 */
function encodeList(list) {
  const sorted = [...new Set(list)].sort();
  let prev = '';
  const out = [];
  for (const w of sorted) {
    if (w.includes('\n')) throw new Error('an entry holds a line break');
    let n = 0;
    while (n < 40 && n < w.length && n < prev.length && w[n] === prev[n]) n++;
    // Never split a UTF-16 pair.
    if (n > 0 && w.charCodeAt(n - 1) >= 0xd800 && w.charCodeAt(n - 1) <= 0xdbff) n--;
    out.push(String.fromCharCode(0x41 + n) + rot(w.slice(n)));
    prev = w;
  }
  return out.join('\n');
}

/** The inverse of encodeList (the same code as passwordRules.ts decodeList). */
function decodeList(text) {
  const out = [];
  let prev = '';
  for (const line of text.split('\n')) {
    if (!line) continue;
    const n = line.charCodeAt(0) - 0x41;
    const w = prev.slice(0, n) + rot(line.slice(1));
    out.push(w);
    prev = w;
  }
  return out;
}

function sha256(text) {
  return require('crypto').createHash('sha256').update(text, 'utf8').digest('hex');
}

function header(lines_) {
  return ['/**', ' * GENERATED FILE: do not edit. Built by mobile/scripts/build-password-blocklist.mjs', ' * (password-lists.cjs explains the lists and how to rebuild them).', ' *', ...lines_.map((l) => (l ? ` * ${l}` : ' *')), ' *', ' * Pure data: no React, no storage, no network.', ' */', ''];
}
const srcLine = (s) => `${s.what}: ${s.file} at commit ${s.commit} (SHA-256 ${s.sha256}). ${s.note}.`;

/** The three lazy lists, encoded, with their sizes and fingerprints. */
function wordLists(short, dict, local) {
  const out = {};
  for (const [k, list] of Object.entries({ short, dict, local })) {
    const text = encodeList(list);
    out[k] = { text, size: decodeList(text).length, sha256: sha256(text) };
  }
  return out;
}

/** src/engine/passwordBlocklist.ts: the long list (in every bundle), and what the lazy file must hold. */
function renderBlocklistModule(long, words) {
  const text = encodeList(long);
  const expect = Object.fromEntries(Object.entries(words).map(([k, v]) => [k, { size: v.size, sha256: v.sha256 }]));
  return [
    ...header([
      `The ${long.length} most used passwords of ${MIN_CHARS}+ characters (OWASP ASVS 5.0 6.2.4), in the`,
      'compared form, scrambled (password-lists.cjs encodeList), and the sizes and SHA-256',
      'fingerprints the lazy word file (passwordWords.ts) must match before it is used.',
      '',
      `Source: ${srcLine(SOURCES.xato)}`,
    ]),
    `/** SHA-256 of the decoded entries joined by line breaks (a test checks it). */`,
    `export const PASSWORD_LONG_SHA256 = '${sha256(decodeList(text).join('\n'))}';`,
    `export const PASSWORD_LONG_SIZE = ${long.length};`,
    `export const PASSWORD_LISTS_SOURCE = 'SecLists ${SOURCES.xato.file.split('/').pop()} @ ${SOURCES.xato.commit.slice(0, 12)} (MIT); dwyl/english-words words_alpha.txt @ ${SOURCES.words.commit.slice(0, 12)} (Unlicense); KaiSip phrases and Filipino lists (scripts/password-sources)';`,
    '',
    '/** What loadPasswordWords accepts: each list text must have exactly this many entries and this SHA-256 (of the stored text). */',
    `export const PASSWORD_WORDS_EXPECTED: Readonly<Record<'short' | 'dict' | 'local', { size: number; sha256: string }>> = ${JSON.stringify(expect)};`,
    '',
    `export const PASSWORD_LONG_LIST = ${JSON.stringify(text)};`,
    '',
  ].join('\n');
}

/** src/engine/passwordWords.ts: the building blocks (loaded only when a password is set). */
function renderWordsModule(words) {
  return [
    ...header([
      'The building blocks of common passwords (passwordRules.ts loads them with',
      'loadPasswordWords before a password can be set). On the website this is its own',
      'file, assets/kaisip-password-words.js, fetched only when a password form opens.',
      '',
      `- short: ${words.short.size} most used passwords of ${SHORT_MIN}–${SHORT_MAX} characters, digits-only ones included.`,
      `  Source: ${srcLine(SOURCES.xato)}`,
      `- dict: ${words.dict.size} English words of ${MIN_CHARS}+ letters. Source: ${srcLine(SOURCES.words)}`,
      `- local: ${words.local.size} hand-written entries: clichéd phrases and Filipino passwords and`,
      '  words (scripts/password-sources/; reviewed in docs/content/PASSWORD_LIST_FILIPINO.md).',
    ]),
    `export const PASSWORD_SHORT_SIZE = ${words.short.size};`,
    `export const PASSWORD_DICT_SIZE = ${words.dict.size};`,
    `export const PASSWORD_LOCAL_SIZE = ${words.local.size};`,
    '',
    `export const PASSWORD_SHORT_LIST = ${JSON.stringify(words.short.text)};`,
    '',
    `export const PASSWORD_DICT_LIST = ${JSON.stringify(words.dict.text)};`,
    '',
    `export const PASSWORD_LOCAL_LIST = ${JSON.stringify(words.local.text)};`,
    '',
  ].join('\n');
}

/** docs/content/PASSWORD_LIST_FILIPINO.md: the Filipino list's readable entries by category (the rude ones are only counted). */
function renderFilipinoDoc() {
  const { plain } = parseLocal(fs.readFileSync(path.join(LOCAL_DIR, 'filipino.txt'), 'utf8'));
  const text = fs.readFileSync(path.join(LOCAL_DIR, 'filipino.txt'), 'utf8');
  const rude = lines(text).filter((l) => l.trim().startsWith('~')).length;
  const byCat = new Map();
  for (const { category, value } of plain) {
    if (!byCat.has(category)) byCat.set(category, []);
    byCat.get(category).push(value);
  }
  const out = [
    '# Filipino password list (for the owner\'s review)',
    '',
    'GENERATED from `mobile/scripts/password-sources/filipino.txt` by',
    '`node mobile/scripts/build-password-blocklist.mjs --docs`; a test keeps the two the same.',
    'To change the list, edit that file, then run the command and `npm run web-plant`.',
    '',
    'What it is for: the apps refuse a password made mostly of common pieces (see',
    '`mobile/src/engine/passwordRules.ts`). Each entry below is one such piece. A password made',
    'of up to two of these plus numbers, years or symbols is refused ("MahalKita2026!",',
    '"pilipinas12345678"); a passphrase of three or more different words still passes',
    '("kape muna bago mag aral"). Spaces and capitals do not matter.',
    '',
    'Please check: is each entry common enough that many people would use it? Is anything',
    'missing that Filipino learners often type? Are the spellings the usual ones?',
    '',
    `${plain.length} readable entries in ${byCat.size} groups, plus ${rude} rude words stored scrambled in the source (not shown here).`,
    '',
  ];
  for (const [cat, vals] of byCat) {
    out.push(`## ${cat} (${vals.length})`, '');
    for (const v of vals) out.push(`- ${v}`);
    out.push('');
  }
  return out.join('\n');
}
const DOC_FILE = path.join(__dirname, '..', '..', 'docs', 'content', 'PASSWORD_LIST_FILIPINO.md');

module.exports = { renderFilipinoDoc, DOC_FILE, SOURCES, LOCAL_DIR, LOCAL_FILES, canon, pickLong, pickShort, pickDict, parseLocal, readLocal, encodeList, decodeList, rot, wordLists, renderBlocklistModule, renderWordsModule, LONG_KEEP, SHORT_KEEP };
