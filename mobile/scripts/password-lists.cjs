/**
 * The password lists the apps refuse (src/engine/passwordRules.ts), picked
 * from two pinned public sources. Used by build-password-blocklist.mjs (the
 * command) and by Jest (password-rules.test.ts checks the picking rules).
 *
 * Plain English for the founder:
 * - "long": the 3,000 most used passwords of 15+ characters (any of them
 *   typed whole is refused). OWASP ASVS 5.0 6.2.4 asks for the top 3,000
 *   that fit our rules.
 * - "short": the 10,000 most used passwords of 4 to 14 characters, digits
 *   included. Too short on their own, so they are used as building blocks:
 *   "football12345678" is a common password plus a sequence.
 * - "dict": every English word of 15+ letters ("congratulations"), from a
 *   public-domain word list.
 * - Each entry is kept in the form the app compares: Unicode NFKC, lower
 *   case, with spaces, dots, dashes and underscores taken out.
 * - The lists hold rude words (they are real passwords), so the files store
 *   them lightly scrambled (letters ROT13, digits ROT5, shared starts
 *   shortened). That is not secrecy, only "not readable at a glance"; the
 *   app unscrambles them when it loads.
 *
 * No third-party packages: only Node's built-in modules.
 */
'use strict';

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

/** The same numbers as passwordRules.ts. */
const MIN_CHARS = 15;
const MAX_BYTES = 72;
const LONG_KEEP = 3000;
const SHORT_KEEP = 10000;
const SHORT_MIN = 4;
const SHORT_MAX = 14;
const JOINERS = /[\s._-]+/g;

/** The form the app compares (passwordRules.ts canonical): NFKC, lower case, no joiners. */
function canon(s) {
  return s.normalize('NFKC').toLowerCase().replace(JOINERS, '');
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

/** Top SHORT_KEEP distinct passwords of 4–14 code points (NFKC), digits-only ones included, in rank order. */
function pickShort(xatoText) {
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
    if (out.length === SHORT_KEEP) return out;
  }
  throw new Error(`only ${out.length} short passwords in the source (need ${SHORT_KEEP})`);
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

/** src/engine/passwordBlocklist.ts: the long list (in every bundle). */
function renderBlocklistModule(long) {
  const text = encodeList(long);
  return [
    ...header([`The ${long.length} most used passwords of ${MIN_CHARS}+ characters (OWASP ASVS 5.0 6.2.4), in the`, 'compared form, scrambled (password-lists.cjs encodeList).', '', `Source: ${srcLine(SOURCES.xato)}`]),
    `/** SHA-256 of the decoded entries joined by line breaks (a test checks it). */`,
    `export const PASSWORD_LONG_SHA256 = '${sha256(decodeList(text).join('\n'))}';`,
    `export const PASSWORD_LONG_SIZE = ${long.length};`,
    `export const PASSWORD_LISTS_SOURCE = 'SecLists ${SOURCES.xato.file.split('/').pop()} @ ${SOURCES.xato.commit.slice(0, 12)} (MIT); dwyl/english-words words_alpha.txt @ ${SOURCES.words.commit.slice(0, 12)} (Unlicense)';`,
    '',
    `export const PASSWORD_LONG_LIST = ${JSON.stringify(text)};`,
    '',
  ].join('\n');
}

/** src/engine/passwordWords.ts: the building blocks (loaded only when a password is set). */
function renderWordsModule(short, dict) {
  const s = encodeList(short);
  const d = encodeList(dict);
  return [
    ...header([
      'The building blocks of common passwords (passwordRules.ts loads them with',
      'loadPasswordWords before a password can be set). On the website this is its own',
      'file, assets/kaisip-password-words.js, fetched only when a password form opens.',
      '',
      `- ${short.length} most used passwords of ${SHORT_MIN}–${SHORT_MAX} characters, digits-only ones included.`,
      `  Source: ${srcLine(SOURCES.xato)}`,
      `- ${dict.length} English words of ${MIN_CHARS}+ letters. Source: ${srcLine(SOURCES.words)}`,
    ]),
    `export const PASSWORD_SHORT_SHA256 = '${sha256(decodeList(s).join('\n'))}';`,
    `export const PASSWORD_DICT_SHA256 = '${sha256(decodeList(d).join('\n'))}';`,
    `export const PASSWORD_SHORT_SIZE = ${short.length};`,
    `export const PASSWORD_DICT_SIZE = ${dict.length};`,
    '',
    `export const PASSWORD_SHORT_LIST = ${JSON.stringify(s)};`,
    '',
    `export const PASSWORD_DICT_LIST = ${JSON.stringify(d)};`,
    '',
  ].join('\n');
}

module.exports = { SOURCES, canon, pickLong, pickShort, pickDict, encodeList, decodeList, rot, renderBlocklistModule, renderWordsModule, LONG_KEEP, SHORT_KEEP };
