/**
 * engine/passwordRules.ts and its lists (owner decisions 28 Nov 2026,
 * docs/WEB_LAUNCH_PLAN.md; NIST SP 800-63B-4 §3.1.1.2; OWASP ASVS 5.0 V6.2):
 * - 12 characters minimum (code points, in both NFC and NFKC) and the four
 *   types the server requires (a-z, A-Z, 0-9, ASCII punctuation; owner
 *   decision 28 Nov 2026 evening, deviations D3 and D4), the checklist and
 *   the "Add ..." guidance, at most 72 bytes (the server's bcrypt limit),
 *   Unicode and spaces allowed; control and invisible characters and broken
 *   characters refused; a device without Unicode normalisation fails closed;
 * - the compared form: accents, invisible characters and joiners out,
 *   look-alikes as Latin, letter-for-number swaps per position, backwards too;
 * - the whole password is compared: refused when it is predictable pieces
 *   with at most 2 characters left over, or fewer than 10 real characters
 *   remain; three different ordinary words pass;
 * - independent measures (fixtures in jest/password-fixtures.ts): the 288
 *   hostile passwords of the re-test (every accept listed with its reason),
 *   the 70 good phrases (26 Tagalog), English words ranked after the bundled
 *   list, random triples of ordinary words;
 * - the generated lists are intact, match their sources, and are only
 *   accepted with the recorded sizes and fingerprints;
 * - guidance after every refusal (NIST: SHALL offer guidance);
 * - fast enough to run on every key press: a deterministic step budget and
 *   a median-of-five clock on inputs built to be slow (jest/password-adversarial.ts).
 */
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  assessPassword,
  checkPassword,
  comparedForm,
  decodeList,
  emailWords,
  isCommonPassword,
  loadPasswordWords,
  MAX_LEFT_OVER,
  MIN_MATERIAL,
  normalizePassword,
  PASSWORD_GUIDANCE,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_CHARS,
  passwordBytes,
  passwordChecklist,
  PASSWORD_CHECKLIST_ITEMS,
  passwordMissingText,
  passwordMissingTypes,
  PASSWORD_SYMBOLS,
  passwordTypes,
  passwordCheckStepsForTest,
  PASSWORD_OTHER_GUIDANCE,
  passwordGuidance,
  passwordLength,
  passwordProblem,
  passwordWordsLoaded,
  unloadPasswordWordsForTest,
  type PasswordProblem,
} from '../engine/passwordRules';
import { BREACH_ANSWER_MAX, breachRangeParts, breachRangeResult } from '../engine/passwordBreach';
import { sha1Hex as pureSha1Hex } from '../engine/sha1';
import { PASSWORD_LISTS_SOURCE, PASSWORD_LONG_LIST, PASSWORD_LONG_SHA256, PASSWORD_LONG_SIZE, PASSWORD_WORDS_EXPECTED } from '../engine/passwordBlocklist';
import { PASSWORD_DICT_LIST, PASSWORD_DICT_SIZE, PASSWORD_LOCAL_LIST, PASSWORD_LOCAL_SIZE, PASSWORD_NAMES_LIST, PASSWORD_NAMES_SIZE, PASSWORD_SHORT_LIST, PASSWORD_SHORT_SIZE } from '../engine/passwordWords';
import { GOOD, HOSTILE, HOSTILE_CONTEXT, HOSTILE_GROUPS, KNOWN_ACCEPTS, OFF_LIST_LONG_WORDS, OFF_LIST_WORDS, ORDINARY_WORDS, unscramble } from '../../jest/password-fixtures';
import { R3_CONTEXT, R3_FAMILIES, R3_GOOD_KINDS, R3_HOSTILE } from '../../jest/password-fixtures-r3';
import { breachForms, createBreachCheck } from '../webcloud/breach';
import { ADVERSARIAL } from '../../jest/password-adversarial';
import { withAllTypes } from '../../jest/password-mix';
import { R4_CONTEXT, R4_FAMILIES, R4_GOOD, R4_HELD_OUT, R4_TUNING } from '../../jest/password-fixtures-r4';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const lists = require('../../scripts/password-lists.cjs');

/** Random characters, cut to an exact length (what a password manager makes). */
const RANDOM = 'x7Gq2m#Pz9LwR4t!VbK3hD8n%Qe5YjC6f&AuS1oMxZ0w*Pk2VgR7tBl4HnQ9eCj3DsF8yAu6';
const ofLength = (n: number) => {
  let s = '';
  while (s.length < n) s += RANDOM;
  return s.slice(0, n);
};
/** A small, decent random generator for the sampling tests (mulberry32). */
function random(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const EMAIL = 'Maya.Santos1990@Example.com';
const CTX = { email: EMAIL, names: ['Maya Santos'] };
const sha = (t: string) => createHash('sha256').update(t, 'utf8').digest('hex');
const WORDS = { short: PASSWORD_SHORT_LIST, dict: PASSWORD_DICT_LIST, local: PASSWORD_LOCAL_LIST, names: PASSWORD_NAMES_LIST };
/** Accepted once the four types are added the way a learner adds them (jest/password-mix.ts). */
const ok = (p: string, ctx: object = CTX) => checkPassword(withAllTypes(p), ctx).length === 0;
/** The reasons other than the four types: what the structural rules and the lists say. */
const why = (p: unknown, ctx?: object | string) => checkPassword(p, ctx as never).filter((r) => r !== 'missing_characters');

beforeAll(() => {
  expect(loadPasswordWords(WORDS)).toBe(true);
});

describe('length (owner decision: 12, a documented deviation from NIST\'s 15; the server stores at most 72 bytes)', () => {
  it('the constants match the owner decision and the server', () => {
    expect([PASSWORD_MIN_CHARS, PASSWORD_MAX_BYTES, MAX_LEFT_OVER, MIN_MATERIAL]).toEqual([12, 72, 2, 8]);
  });

  it('11 is too short, 12 and 64 are fine, 72 bytes is the most, 73 and 200 are too long', () => {
    expect(checkPassword(ofLength(11))[0]).toBe('too_short');
    expect(checkPassword(ofLength(12))).toEqual([]);
    expect(checkPassword(ofLength(64))).toEqual([]);
    expect(checkPassword(ofLength(72))).toEqual([]);
    expect(checkPassword(ofLength(73))).toEqual(['too_long']);
    expect(checkPassword(ofLength(200))).toEqual(['too_long']);
    expect(passwordProblem(ofLength(200))).toBe('too_long');
    expect(passwordProblem(ofLength(12))).toBeNull();
    expect(passwordGuidance('too_long')!.text).toBe('Use up to 72 letters, fewer with accents or emoji.');
  });

  it('counts code points (an emoji is one character) and bytes as UTF-8', () => {
    const emoji = '🌿🌳🍀🌲🌱🌵🌴🌾🍁🍂🍃🌸🌼🌻🌺🌷';
    expect(passwordLength(emoji)).toBe(16);
    expect(passwordBytes(emoji)).toBe(64);
    // Emoji are allowed beside the four types (the server counts only the ASCII sets).
    expect(checkPassword(`${emoji}Ab1!`)).toEqual([]);
    expect(checkPassword(emoji)).toEqual(['missing_characters']);
    expect(checkPassword(`${emoji}Ab1!xyzw1`)).toEqual(['too_long']);
    expect(passwordBytes('é'.repeat(36))).toBe(72);
    expect(checkPassword('é'.repeat(64))).toEqual(['too_long']);
  });

  it('spaces count and are never trimmed', () => {
    expect(passwordLength(`  ${ofLength(10)}`)).toBe(12);
    expect(checkPassword(`  ${ofLength(10)}`)).toEqual([]);
  });

  it('anything that is not a string reads as empty, never a crash', () => {
    expect(checkPassword(undefined)).toEqual(['too_short', 'too_simple', 'missing_characters']);
    expect(checkPassword(42 as unknown as string, 7 as unknown as string)).toEqual(['too_short', 'too_simple', 'missing_characters']);
    expect(normalizePassword(null)).toBeNull();
    expect(passwordTypes(null)).toEqual({ lower: false, upper: false, digit: false, symbol: false });
  });
});

describe('the four types (owner decision 28 Nov 2026: exactly what the server checks)', () => {
  it('the symbols are the server\'s: every ASCII punctuation character, no space, nothing else', () => {
    let ascii = '';
    for (let c = 33; c < 127; c++) if (!/[A-Za-z0-9]/.test(String.fromCharCode(c))) ascii += String.fromCharCode(c);
    expect([...PASSWORD_SYMBOLS].sort().join('')).toBe([...ascii].sort().join(''));
    expect(PASSWORD_SYMBOLS).toHaveLength(32);
    expect(PASSWORD_SYMBOLS).not.toContain(' ');
    // The Supabase CLI's string for "lower_upper_letters_digits_symbols", decoded the way the
    // server decodes it (split on ':', a part ending in '\' joins the next with ':').
    const cli = "abcdefghijklmnopqrstuvwxyz:ABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789:!@#$%^&*()_+-=[]{};'\\\\:\"|<>?,./`~";
    const parts = cli.split(':');
    for (let i = 0; i < parts.length - 1; i++) {
      if (parts[i] && parts[i].endsWith('\\')) {
        parts[i] = `${parts[i].slice(0, -1)}:${parts[i + 1]}`;
        parts[i + 1] = '';
      }
    }
    expect(parts.filter(Boolean)).toEqual(['abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '0123456789', PASSWORD_SYMBOLS]);
    // The local server's settings say the same as the app.
    const toml = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'supabase', 'config.toml'), 'utf8');
    expect(toml).toMatch(new RegExp(`^minimum_password_length = ${PASSWORD_MIN_CHARS}$`, 'm'));
    expect(toml).toMatch(/^password_requirements = "lower_upper_letters_digits_symbols"$/m);
  });

  it('each type needs a plain ASCII character, read on the form that is sent (NFKC), like the server', () => {
    expect(passwordMissingTypes('Ab1!')).toEqual([]);
    // "ñ", "É" and Greek or Cyrillic letters are not the server's letters; a space or "€" is not its symbol.
    expect(passwordMissingTypes('ñandú É 7 € ok')).toEqual(['upper', 'symbol']);
    expect(passwordMissingTypes('αβγ ΔΕΖ 1!')).toEqual(['lower', 'upper']);
    expect(passwordMissingTypes('lower UPPER 12345')).toEqual(['symbol']);
    // Full-width letters, digits and symbols become ASCII in NFKC, so they count (the server sees ASCII).
    expect(passwordMissingTypes('ａＢ１！')).toEqual([]);
    // Every symbol counts.
    for (const s of PASSWORD_SYMBOLS) expect([s, passwordMissingTypes(`Abc1${s}`)]).toEqual([s, []]);
  });

  it('refused with missing_characters, and the guidance says exactly what is missing, in plain words', () => {
    const p = ofLength(12).toLowerCase().replace(/[^a-z]/g, 'k'); // lower case only
    expect(checkPassword(p)).toContain('missing_characters');
    expect(passwordMissingText('abcdefgh')).toBe('Add an uppercase letter, a number and a symbol.');
    expect(passwordMissingText('Abcdefgh')).toBe('Add a number and a symbol.');
    expect(passwordMissingText('Abcdefgh1')).toBe('Add a symbol.');
    expect(passwordMissingText('ABCDEFGH1!')).toBe('Add a lowercase letter.');
    expect(passwordMissingText('abc1!')).toBe('Add an uppercase letter.');
    expect(passwordMissingText('')).toBe('Add a lowercase letter, an uppercase letter, a number and a symbol.');
    expect(passwordMissingText('Ab1!')).toBeNull();
    expect(passwordGuidance('missing_characters', 'Abcdefgh')!).toEqual({ key: 'password.guide.missing_characters', text: 'Add a number and a symbol.' });
    expect(passwordGuidance('password_missing_characters', 'abcdefgh1!')!.text).toBe('Add an uppercase letter.');
    expect(passwordGuidance('missing_characters')!.text).toBe('Use at least one lowercase letter, one uppercase letter, one number and one symbol.');
  });

  it('the checklist: five items, each met or not, and refused / ok / strong', () => {
    const labels = (p: string) => passwordChecklist(p, CTX).items.map((i) => `${i.met ? 'Y' : 'n'} ${i.label}`);
    expect(PASSWORD_CHECKLIST_ITEMS.map((i) => [i.id, i.key, i.label])).toEqual([
      ['length', 'password.check.length', '12 or more characters'],
      ['lower', 'password.check.lower', 'A lowercase letter'],
      ['upper', 'password.check.upper', 'An uppercase letter'],
      ['digit', 'password.check.digit', 'A number'],
      ['symbol', 'password.check.symbol', 'A symbol'],
    ]);
    expect(labels('')).toEqual(['n 12 or more characters', 'n A lowercase letter', 'n An uppercase letter', 'n A number', 'n A symbol']);
    expect(labels('abc')).toEqual(['n 12 or more characters', 'Y A lowercase letter', 'n An uppercase letter', 'n A number', 'n A symbol']);
    expect(passwordChecklist('', CTX).state).toBe('refused');
    expect(passwordChecklist(ofLength(12), CTX)).toMatchObject({ state: 'ok', problems: [], complete: true });
    expect(passwordChecklist(ofLength(15), CTX).state).toBe('strong');
    // All five met and still refused: a common password with the four types around it.
    const common = passwordChecklist('Password2026!', CTX);
    expect(common.items.every((i) => i.met)).toBe(true);
    expect(common.state).toBe('refused');
    expect(common.problems[0]).toBe('common');
    // A decomposed accent counts as one character, as the server will see it.
    expect(passwordChecklist('Ab1!e\u0301e\u0301e\u0301e\u0301e\u0301', CTX).items[0].met).toBe(false);
  });
});

describe('Unicode: NFKC sent, 12 characters in both NFC and NFKC, invisible characters refused', () => {
  it('composes before counting, checking and sending', () => {
    const decomposed = 'Cafe\u0301 cre\u0300me bru\u0302le\u0301e 7!';
    const composed = 'Café crème brûlée 7!';
    expect(normalizePassword(decomposed)).toBe(composed);
    expect(passwordLength(decomposed)).toBe(passwordLength(composed));
    expect(checkPassword(decomposed)).toEqual(checkPassword(composed));
  });

  it('a decomposed 13-code-point string that composes to 11 characters is too short', () => {
    const s = 'E\u0301e\u0301 ocean 7!';
    expect(Array.from(s)).toHaveLength(13);
    expect(passwordLength(s)).toBe(11);
    expect(checkPassword(s)).toContain('too_short');
  });

  it('NFKC: full-width letters and ligatures are their plain forms; 12 code points in both forms', () => {
    expect(normalizePassword('ｐａｓｓｗｏｒｄ')).toBe('password');
    expect(normalizePassword('ﬁve ocean lamps')).toBe('five ocean lamps');
    expect(checkPassword('Ｐａｓｓｗｏｒｄ２０２６！')).not.toEqual([]);
    const s = 'Fﬁve ocean7'; // 11 in NFC, 12 in NFKC
    expect(checkPassword(s)).toContain('too_short');
  });

  it('control and invisible characters are refused (S8), joiners for emoji and Indic scripts are not', () => {
    const base = ofLength(20);
    for (const cp of [0x00, 0x09, 0x85, 0xad, 0x200b, 0x200e, 0x200f, 0x202a, 0x202e, 0x2060, 0x2066, 0x206f, 0xfeff, 0x061c, 0x180e, 0xe0001, 0xe0041, 0xe007f]) {
      expect([cp.toString(16), checkPassword(`${base}${String.fromCodePoint(cp)}`)]).toEqual([cp.toString(16), ['invalid_characters']]);
    }
    expect(checkPassword(`${base}\ud800`)).toEqual(['invalid_characters']);
    expect(checkPassword(`\udc00${base}`)).toEqual(['invalid_characters']);
    // Allowed: the zero-width joiner (family emoji), non-joiner (Indic) and variation selectors.
    expect(checkPassword(`👨\u200d👩\u200d👧\u200d👦 Family picnic day 7!`)).toEqual([]);
    expect(checkPassword(`${base}\u200c`)).toEqual([]);
    expect(checkPassword(`${base}❤\ufe0f`)).toEqual([]);
    expect(passwordGuidance('invalid_characters')).not.toBeNull();
  });

  it('the compared form: accents and invisibles out, Cyrillic and Greek look-alikes as Latin, joiners out', () => {
    expect(comparedForm('Pässwörd Señorita')).toBe('passwordsenorita');
    expect(comparedForm('р\u0430ssword')).toBe('password'); // Cyrillic er and a
    expect(comparedForm('ΡΑSSWORD')).toBe('password'); // Greek capital rho and alpha
    expect(comparedForm('p\u200da\ufe0fss\u3164word')).toBe('password');
    expect(comparedForm('p\u0336a\u0336s\u0336s\u0336')).toBe('pass');
    expect(comparedForm('𝐩𝐚𝐬𝐬 ⓦⓞⓡⓓ')).toBe('password');
    // The builder makes its lists the same way.
    for (const s of ['Pässwörd Señorita', 'р\u0430ssword', 'ΡΑSSWORD', 'p\u200da\ufe0fss\u3164word', 'ภาษาไทยสวยงาม', 'नमस्ते दुनिया', 'Juan Dela-Cruz_88']) {
      expect([s, lists.canon(s)]).toEqual([s, comparedForm(s)]);
    }
  });

  it('look-alike, accented and invisible variants of common passwords are refused', () => {
    for (const p of ['раsswordраssword1', 'ΡΑSSWORDΡΑSSWORD1', 'pässwordpässword1', 'pásswórdpásswórd1', 'señoritaseñorita1', 'passwordㅤㅤㅤㅤㅤㅤㅤ', 'p\u0336a\u0336s\u0336s\u0336w\u0336o\u0336r\u0336d\u0336', 'password️password️1']) {
      expect([p, ok(p)]).toEqual([p, false]);
    }
  });

  it('Thai, Hindi, accented Spanish, Tagalog and family-emoji passphrases still pass', () => {
    for (const p of ['ภาษาไทยสวยงามมากจริงๆ', 'नमस्ते दुनिया आज अच्छा', 'niño jesús está aquí hoy', 'precisamos de férias', 'Ang Niño ay natutulog na', 'café crème brûlée ok', '日本語のパスワードです長い文章です']) {
      expect([p, checkPassword(withAllTypes(p), CTX)]).toEqual([p, []]);
      // Without the four ASCII types they are refused for that alone.
      expect([p, checkPassword(p, CTX)]).toEqual([p, ['missing_characters']]);
    }
  });

  it('fails closed without String.prototype.normalize: plain ASCII still works, anything else is refused, never sent raw', () => {
    const saved = String.prototype.normalize;
    try {
      // @ts-expect-error: an engine without Unicode normalisation
      delete String.prototype.normalize;
      expect(normalizePassword('Ocean violet lamp 7!')).toBe('Ocean violet lamp 7!');
      expect(checkPassword('Ocean violet lamp 7!')).toEqual([]);
      expect(normalizePassword('café violet lamp seven')).toBeNull();
      expect(checkPassword('Café violet lamp 7!')).toEqual(['invalid_characters']);
    } finally {
      // eslint-disable-next-line no-extend-native
      String.prototype.normalize = saved;
    }
    expect(normalizePassword('café violet lamp seven')).toBe('café violet lamp seven');
  });
});

describe('the bundled lists (ASVS 6.2.4; sources, picking rules, fingerprints)', () => {
  const long = decodeList(PASSWORD_LONG_LIST);
  const short = decodeList(PASSWORD_SHORT_LIST);
  const dict = decodeList(PASSWORD_DICT_LIST);
  const local = decodeList(PASSWORD_LOCAL_LIST);

  it('are the generated lists, intact: SHA-256, sizes and sources', () => {
    expect(sha(long.join('\n'))).toBe(PASSWORD_LONG_SHA256);
    expect([long.length, PASSWORD_LONG_SIZE]).toEqual([3000, 3000]);
    expect([short.length, PASSWORD_SHORT_SIZE]).toEqual([100000, 100000]);
    expect(dict.length).toBe(PASSWORD_DICT_SIZE);
    expect(local.length).toBe(PASSWORD_LOCAL_SIZE);
    expect(decodeList(PASSWORD_NAMES_LIST).length).toBe(PASSWORD_NAMES_SIZE);
    expect(Object.keys(PASSWORD_WORDS_EXPECTED).sort()).toEqual(['dict', 'local', 'names', 'short']);
    for (const [k, text] of Object.entries(WORDS)) {
      expect([k, sha(text), decodeList(text).length]).toEqual([k, PASSWORD_WORDS_EXPECTED[k as keyof typeof WORDS].sha256, PASSWORD_WORDS_EXPECTED[k as keyof typeof WORDS].size]);
    }
    expect(PASSWORD_LISTS_SOURCE).toMatch(/SecLists .* \(MIT\); dwyl\/english-words .* \(Unlicense\); KaiSip phrases and Filipino/);
  });

  it('the hand-written lists in the repo are what the lazy file holds (its own hash test), and the owner\'s review copy matches', () => {
    expect(lists.encodeList(lists.readLocal())).toBe(PASSWORD_LOCAL_LIST);
    expect(lists.encodeList(lists.readNames())).toBe(PASSWORD_NAMES_LIST);
    expect(fs.readFileSync(lists.DOC_FILE, 'utf8')).toBe(lists.renderFilipinoDoc());
    // The review copy shows no rude word: those are only in the source, scrambled.
    const doc = fs.readFileSync(lists.DOC_FILE, 'utf8');
    const rude = fs.readFileSync(path.join(lists.LOCAL_DIR, 'filipino.txt'), 'utf8').split('\n').filter((l: string) => l.startsWith('~')).map((l: string) => lists.rot(l.slice(1)));
    expect(rude.length).toBeGreaterThan(20);
    for (const r of rude) expect(doc.split('\n')).not.toContain(`- ${r}`);
    expect(local).toEqual(expect.arrayContaining(['mahalkita', 'pilipinas', 'correcthorsebatterystaple', 'merrychristmas', 'certifiedinformationsystemsauditor', 'akucintakamu', 'majulahsingapura', 'threeorfourordinarywords', lists.rot('gnatvanzb')]));
    // True counts: no entry in the review copy is too short to count or a second spelling of another.
    expect(doc).not.toMatch(/\((too short to count|same as ")/);
    const counted = Number(/^(\d+) readable entries that count/m.exec(doc)![1]);
    expect(counted).toBe(['filipino.txt', 'names.txt', 'asia.txt'].reduce((n, f) => n + lists.parseLocal(fs.readFileSync(path.join(lists.LOCAL_DIR, f), 'utf8'), f === 'names.txt' ? 3 : 4).plain.length, 0));
  });

  it('only the expected lists are accepted: a cut-down, altered or missing list leaves the rules "not loaded"', () => {
    unloadPasswordWordsForTest();
    try {
      const cut = PASSWORD_SHORT_LIST.split('\n').slice(0, 1500).join('\n');
      expect(loadPasswordWords({ ...WORDS, short: cut })).toBe(false);
      expect(loadPasswordWords({ ...WORDS, local: `${PASSWORD_LOCAL_LIST}\nAkkkk` })).toBe(false);
      expect(loadPasswordWords({ short: PASSWORD_SHORT_LIST, dict: PASSWORD_DICT_LIST })).toBe(false);
      expect(loadPasswordWords(null)).toBe(false);
      expect(passwordWordsLoaded()).toBe(false);
      // Not loaded: a distinct state (the screen says "checking…"), and common words can slip by.
      expect(assessPassword('Monkey dragon 2026!!')).toEqual({ problems: [], complete: false });
      expect(assessPassword('Cisaexam2026pass!').problems).toEqual(['contains_service_word']);
    } finally {
      expect(loadPasswordWords(WORDS)).toBe(true);
    }
    expect(assessPassword('Monkey dragon 2026!!')).toEqual({ problems: ['common'], complete: true });
  });

  it('are stored scrambled, not as readable text, and decode the same way in the builder and the app', () => {
    for (const text of [PASSWORD_LONG_LIST, PASSWORD_SHORT_LIST, PASSWORD_DICT_LIST, PASSWORD_LOCAL_LIST]) {
      expect(text).not.toMatch(/(^|\n)[A-Z]?(password|football|congratulations|monkey|mahalkita)/);
    }
    expect(lists.decodeList(PASSWORD_LOCAL_LIST)).toEqual(local);
    expect(short).toEqual(expect.arrayContaining(['football', '123456', 'princess']));
    expect(dict).toContain('congratulations');
  });

  it('every entry is in the compared form, sorted and once; lengths as documented', () => {
    for (const l of [long, short, dict, local]) {
      expect([...l].sort()).toEqual(l);
      expect(new Set(l).size).toBe(l.length);
      for (const p of l) expect(p).toBe(comparedForm(p));
    }
    for (const p of [...short, ...local]) expect(Array.from(p).length).toBeGreaterThanOrEqual(4);
    for (const p of dict) expect(p).toMatch(/^[a-z]{15,}$/);
    expect(short.filter((p) => /^\d+$/.test(p)).length).toBeGreaterThan(5000); // digits-only entries included
  });

  it('the builder\'s picking rules: rank order, lengths, distinct, NFKC, compared form; hand-written sources', () => {
    const src = ['123456', 'Password', 'pass', 'abc', 'ＰＡＳＳＷＯＲＤ', 'iloveyou', 'monkey-face', 'x'.repeat(16), ...Array.from({ length: 10010 }, (_, i) => `w${i}xyz`)].join('\r\n');
    const s = lists.pickShort(src, 10000);
    expect(s.slice(0, 5)).toEqual(['123456', 'password', 'pass', 'iloveyou', 'monkeyface']);
    expect(s).toHaveLength(10000);
    expect(() => lists.pickShort('a\nb')).toThrow(/only/);
    expect(lists.SHORT_KEEP).toBe(100000);
    const longSrc = ['short', 'correct horse battery', 'Correct.Horse.Battery', 'z'.repeat(80), ...Array.from({ length: 3005 }, (_, i) => `long password number ${i}`)].join('\n');
    expect(lists.pickLong(longSrc).slice(0, 2)).toEqual(['correcthorsebattery', 'longpasswordnumber0']);
    const local2 = lists.parseLocal('# a comment\n## Food\nhalo halo\nHalo-Halo\nabc\n~gnatvan\n');
    expect(local2.entries).toEqual(['halohalo', lists.rot('gnatvan')]);
    expect(local2.plain).toEqual([{ category: 'Food', value: 'halo halo' }, { category: 'Food', value: 'Halo-Halo' }, { category: 'Food', value: 'abc' }]);
    expect(lists.decodeList(lists.encodeList(['b', 'ab', 'abc', 'é😀x', 'é😀y']))).toEqual(['ab', 'abc', 'b', 'é😀x', 'é😀y']);
    expect(lists.SOURCES.xato.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(lists.SOURCES.words.commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it('every 15+ entry is refused, in any case, with joiners or letter-for-number swaps', () => {
    for (const p of long) expect(checkPassword(withAllTypes(p)).length).toBeGreaterThan(0);
    expect(isCommonPassword('ManchesterUnited')).toBe(true);
    expect(isCommonPassword('manchester united')).toBe(true);
    expect(isCommonPassword('m4nchester.united')).toBe(true);
    expect(isCommonPassword('ocean violet lamp seven')).toBe(false);
  });
});

describe('independent measures (fixtures; not built from the bundled lists)', () => {
  const hostile = unscramble(HOSTILE);
  const known = new Set(unscramble(KNOWN_ACCEPTS.map((k) => k.scrambled)));

  it('the 288 hostile passwords: every one refused except the documented known accepts (≥ 90%)', () => {
    expect(hostile).toHaveLength(288);
    const accepted = hostile.filter((p) => ok(p, HOSTILE_CONTEXT));
    expect(accepted.filter((p) => !known.has(p))).toEqual([]);
    expect(accepted.length / hostile.length).toBeLessThanOrEqual(0.1);
    // A known accept that now fails is good news: take it off the list.
    expect([...known].filter((p) => !accepted.includes(p))).toEqual([]);
    for (const k of KNOWN_ACCEPTS) expect(k.why.length).toBeGreaterThan(20);
  });

  it('by group: the review\'s examples (leet, fillers, dates and phones, exam words, Filipino, Unicode)', () => {
    const rate: Record<string, string> = {};
    for (const [g, l] of Object.entries(HOSTILE_GROUPS)) {
      const list = unscramble(l);
      rate[g] = `${list.filter((p) => !ok(p, HOSTILE_CONTEXT)).length}/${list.length}`;
    }
    expect(rate).toEqual({
      'mixed leet + digit tail': '13/13',
      '3-letter filler / ordinary non-list words': '42/42',
      'dates/phones': '18/18',
      'exam vocabulary': '30/31',
      'tagalog / filipino': '55/58',
      unicode: '25/26', // the one left: 15 different emoji in a row (no pattern to name)
    });
  });

  it('the round-2 good passphrases all pass (62: the 70 less 8 clichés and hint echoes, see the fixture)', () => {
    expect(GOOD).toHaveLength(62);
    expect(GOOD.filter((p) => !ok(p, HOSTILE_CONTEXT))).toEqual([]);
  });

  it('English words ranked after the bundled 100,000 (not on any list): doubled, + a sequence, + a year', () => {
    const all = unscramble(OFF_LIST_WORDS);
    expect(all).toHaveLength(3000);
    // The single-word rule is about words of 10 to 14 letters (shorter ones fail the floor):
    // measured on those only, so a sample of short words can't flatter it.
    const words = unscramble(OFF_LIST_LONG_WORDS);
    expect(words).toHaveLength(1000);
    for (const w of words) expect(w).toMatch(/^[a-z]{10,14}$/);
    expect(all.length).toBe(3000); // the round-2 sample (4 to 14 letters, mostly short) stays for history
    const builds: Record<string, (w: string) => string> = {
      doubled: (w) => {
        let s = w;
        while (s.length < 15) s += w;
        return s;
      },
      plusSequence: (w) => (w + '12345678901234567890').slice(0, Math.max(15, w.length + 3)),
      plusYear: (w) => {
        let s = `${w[0].toUpperCase()}${w.slice(1)}2026!`;
        while (s.length < 15) s += '!';
        return s;
      },
    };
    // Accepted today; these numbers may only go down.
    const ceiling: Record<string, number> = { doubled: 0, plusSequence: 0, plusYear: 0 };
    for (const [name, make] of Object.entries(builds)) {
      const passed = words.filter((w) => ok(make(w)));
      expect([name, passed.length <= ceiling[name]]).toEqual([name, true]);
    }
  });

  it('three random ordinary words pass: refused under 1%, with or without spaces; four words almost never', () => {
    // The words are not filtered: a few are themselves patterns ("mmmm", "wert"), which is why
    // the rate is above zero. With the four types added the way a learner adds them (a capital,
    // and a number and a symbol at the end) it rose from under 0.5% to about 0.9% (36 of 3,991
    // with spaces, 28 Nov 2026): a month word just before the number reads as a date, and three
    // given names with a number as a name and a number.
    const words = unscramble(ORDINARY_WORDS);
    for (const [k, sep, limit] of [[3, ' ', 0.01], [3, '', 0.01], [4, ' ', 0.001], [4, '', 0.001]] as const) {
      const rnd = random(987654321);
      const pick = () => words[Math.floor(rnd() * words.length)];
      let n = 0;
      let refused = 0;
      for (let i = 0; i < 4000; i++) {
        const ws = Array.from({ length: k }, pick);
        if (new Set(ws).size < k) continue;
        const p = ws.join(sep);
        if (Array.from(p).length < 15) continue;
        n++;
        if (checkPassword(withAllTypes(p)).length) refused++;
      }
      expect([k, sep, refused / n <= limit]).toEqual([k, sep, true]);
    }
  });
});

describe('round 3: an attack the rules were not tuned on (jest/password-fixtures-r3.ts)', () => {
  // The fixed split: ODD index = tuning half, EVEN index = held-out half. The held-out half is
  // REPORT-ONLY: the code and the lists are never tuned on it (see the fixture's header), so its
  // number is the honest one. Both ceilings may only fall.
  const rot = (s: string) => unscramble([s])[0];
  const tuning = R3_HOSTILE.filter((_, i) => i % 2 === 1);
  const heldOut = R3_HOSTILE.filter((_, i) => i % 2 === 0);
  const accepted = (half: typeof R3_HOSTILE) => half.filter(([, s]) => ok(rot(s), R3_CONTEXT));

  it('867 hostile passwords in 13 families, split in two fixed halves', () => {
    expect(R3_HOSTILE).toHaveLength(867);
    expect(R3_FAMILIES).toHaveLength(13);
    expect([tuning.length, heldOut.length]).toEqual([433, 434]);
  });

  it('tuning half: at most 19 of 433 accepted (4.4%; it was 147, 33.9%, at dc23533)', () => {
    expect(accepted(tuning).length).toBeLessThanOrEqual(19);
  });

  it('held-out half (report-only): at most 50 of 434 accepted (11.5%; it was 133, 30.6%, at dc23533)', () => {
    const acc = accepted(heldOut);
    expect(acc.length).toBeLessThanOrEqual(50);
    // Of those, the tester judged 28 "obscure" (unlikely to be tried early) and 22 to matter.
    expect(acc.filter(([, , obscure]) => !obscure).length).toBeLessThanOrEqual(22);
  });

  it('all 164 good passphrases pass, in every kind (English, Tagalog, Taglish, Bisaya and Ilocano, accents and emoji, …)', () => {
    const all = Object.values(R3_GOOD_KINDS).flat();
    expect(all).toHaveLength(164);
    expect(all.filter((p) => !ok(p, R3_CONTEXT))).toEqual([]);
  });
});

describe('round 4: the 12-to-14-character, four-types space (jest/password-fixtures-r4.ts)', () => {
  // Split by vocabulary: pool A words build the tuning half, pool B words the held-out half
  // (report-only: never tuned on). Same author as the rules this round, so the held-out
  // figure is a weaker measure than round 3's. Ceilings may only fall.
  const accepted = (set: readonly [string, string][]) => set.filter(([, p]) => checkPassword(p, R4_CONTEXT).length === 0);

  it('every candidate is 12 to 14 characters with all four types; the pools do not share a word', () => {
    for (const [, p] of [...R4_TUNING, ...R4_HELD_OUT, ...R4_GOOD]) {
      expect([p, Array.from(p).length >= 12 && Array.from(p).length <= 14, passwordMissingTypes(p)]).toEqual([p, true, []]);
    }
    for (const pools of Object.values(R4_FAMILIES)) expect(pools.a.filter((w) => pools.b.includes(w))).toEqual([]);
    expect([R4_TUNING.length, R4_HELD_OUT.length, R4_GOOD.length]).toEqual([2900, 2833, 240]);
  });

  it('tuning half: 0 of 2,900 accepted', () => {
    expect(accepted(R4_TUNING)).toEqual([]);
  });

  it('held-out half (report-only): at most 13 of 2,833 accepted (0.5%), none of them a common password, walk or season', () => {
    const acc = accepted(R4_HELD_OUT);
    expect(acc.length).toBeLessThanOrEqual(13);
    for (const [family] of acc) expect(['word', 'name', 'service']).toContain(family);
  });

  it('good: none of the 240 refused (three short words with a number and a symbol; password-manager output)', () => {
    expect(R4_GOOD.filter(([, p]) => checkPassword(p, R4_CONTEXT).length)).toEqual([]);
  });

  it('the shape the rule invites is refused: a capitalised word, name or walk with numbers and a symbol around it', () => {
    const ctx = { email: 'maya.santos1990@example.com', names: ['Maya Santos'] };
    for (const [p, reason] of [
      ['Password123!', 'common'],
      ['Welcome2026#', 'common'],
      ['Qwerty12345!', 'too_simple'],
      ['Jennifer1990!', 'common'],
      ['P@ssw0rd2026', 'common'],
      ['!Manila2026#', 'common'],
      ['HunyoHunyo123!', 'common'],
      ['Kaisip@2026!', 'contains_service_word'],
      ['MayaSantos#26', 'common'], // also the account's name; common words are enough to refuse it
      ['Abcdefg2026!', 'too_simple'],
    ] as const) {
      expect([p, checkPassword(p, ctx)[0]]).toEqual([p, reason]);
    }
  });
});

describe('the guidance describes, it never shows an example (S2)', () => {
  const echoes = ['atleast15characters', 'at least 15 characters', 'three or four ordinary words', 'Use three or four ordinary words', 'maple cloud tiger!', 'correct horse battery', 'thisisaverylongpassword', 'passphrase12345678', 'pleasechangeyourpassword', 'three random words 2026'];

  it('the app\'s own hints typed back as a password are refused', () => {
    for (const p of echoes) expect([p, ok(p, {})]).toEqual([p, false]);
  });

  it('no guidance text holds an example: no quotes, no digits except the two limits', () => {
    for (const g of [...Object.values(PASSWORD_GUIDANCE), ...Object.values(PASSWORD_OTHER_GUIDANCE)]) {
      expect(g.text).not.toMatch(/["“”‘]|’[a-z]+’/i);
      expect(g.text.replace(/\b(12|72)\b/g, '')).not.toMatch(/\d/);
    }
  });

  it('no passing password appears in the password docs or the account copy (describe, do not exemplify)', () => {
    const root = path.join(__dirname, '..', '..', '..');
    const files = ['docs/WEB_LAUNCH_PLAN.md', 'docs/mobile/PASSWORD_SIGN_IN_DESIGN.md', 'docs/mobile/PASSWORD_DESIGN_AUDIT.md', 'docs/content/PASSWORD_LIST_FILIPINO.md', 'mobile/src/content/cloud/copy.ts'];
    const text = files.map((f) => fs.readFileSync(path.join(root, f), 'utf8').toLowerCase()).join('\n');
    const passing = [...GOOD, ...Object.values(R3_GOOD_KINDS).flat(), 'ocean violet lamp seven'];
    expect(passing.filter((p) => text.includes(p.toLowerCase()))).toEqual([]);
    // Every quoted example in the owner's review copy is refused.
    const doc = fs.readFileSync(lists.DOC_FILE, 'utf8');
    for (const m of doc.matchAll(/"([^"\n]{15,72})"/g)) expect([m[1], ok(m[1], {})]).toEqual([m[1], false]);
  });
});

describe('round 3: structural rules (B2, B3, S1, S6 and the walks)', () => {
  it('one ordinary word of 10 to 14 letters with a year, a sequence or "@123" is too simple; a word typed twice too', () => {
    for (const p of ['Application2026', 'Governance2026!', 'Environment@123', 'conference1234567', 'MASQUERADE2026!!', 'literatureliterature', 'MasqueradeMasquerade']) {
      expect([p, why(p)]).toEqual([p, ['too_simple']]);
    }
    // Two words, or a capital inside, are not "one word".
    expect(why('quiet ApplicationX 2026', {})).toEqual([]);
  });

  it('passwords built from the account are refused (the whole domain, its labels, reversed words), innocent mentions pass', () => {
    const ctx = { email: 'grace.villanueva0312@yahoo.com', names: ['Grace Villanueva'] };
    expect(ok('villanuevaaveunalliv', ctx)).toBe(false); // the name and its mirror
    for (const p of ['yahoo.com.grace0312', 'MrsGraceVillanueva1', 'GraceVillanuevaCPA1', 'gracevillanueva.yahoo.com', 'Atty.GraceVillanueva']) {
      expect([p, why(p, ctx)]).toEqual([p, ['contains_email']]);
    }
    expect(why('deloitte.com.2026!!', { email: 'grace@deloitte.com' })).toEqual(['contains_email']);
    for (const p of ['grace under pressure daily', 'villanueva street bakery smells good', 'amazing grace sung at dawn', 'yahoo mail is so slow today', 'say grace before every meal']) {
      expect([p, why(p, ctx)]).toEqual([p, []]);
    }
  });

  it('a full name with numbers is common, whoever it belongs to; three names alone are left to the other rules', () => {
    for (const p of ['MarkAnthonyCruz88', 'JhonMarkSantos1998', 'LovelyMaeGarcia2001', 'maria santos reyes 1990']) expect([p, why(p)]).toEqual([p, ['common']]);
  });

  it('a repeated word counts once (S6); four or more different ordinary words pass by design', () => {
    expect(ok('TwinkleTwinkleLittleStar', {})).toBe(false);
    expect(ok('LoveIsPatientLoveIsKind', {})).toBe(false);
    expect(ok('lantern pebble orchid saddle', {})).toBe(true);
  });

  it('walks: right-to-left diagonals, doubled-letter sequences, a word and its mirror, long phrases', () => {
    for (const p of ['0okm9ijn8uhb7ygv', 'aabbccddeeffgghh', '1122334455667788', 'aaaabbbbccccdddd', 'passworddrowssap', 'monkeyyeknom123456', 'masterretsam2026!', 'supercalifragilisticexpialidocious']) {
      expect([p, ok(p, {})]).toEqual([p, false]);
    }
  });
});

describe('the whole-password rule', () => {
  it('refuses the first review\'s examples', () => {
    const cases: [string, PasswordProblem][] = [
      ['monkeymonkeymonkey', 'common'],
      ['football12345678', 'common'],
      ['Summer2026Summer2026', 'common'],
      ['congratulations', 'common'],
      ['misunderstanding', 'common'],
      ['uncharacteristically', 'common'],
      ['!@#$%^&*()!@#$%^', 'too_simple'],
      ['135791357913579', 'too_simple'],
      ['cisaexam2026pass', 'contains_service_word'],
      ['ilovekaisip12345', 'contains_service_word'],
      ['maya.santos1990@example.com', 'contains_email'],
    ];
    for (const [p, reason] of cases) expect([p, why(p, CTX)]).toEqual([p, [reason]]);
  });

  it('this review\'s examples: phrases, exam names, swaps per position, dates and phones, Filipino', () => {
    for (const p of ['merrychristmas2026', 'administrator1234', 'thequickbrownfoxjumps', 'certifiedinformationsystemsauditor', 'M0nk3yM0nk3y1234', '0917123456709171', 'jan011990jan011990', 'mahalkitamahalkita', 'pilipinas12345678', 'password ko ito 123', 'correct horse battery staple', 'Tr0ub4dor&3Tr0ub4dor&3', 'CorrectHorseBatteryStaple2026', 'never gonna give you up 2026', 'November282026!!', '19901231199012310', '63917123456712', 'drowssapdrowssap1', 'yeknomyeknomyeknom']) {
      expect([p, ok(p, HOSTILE_CONTEXT)]).toEqual([p, false]);
    }
  });

  it('letter-for-number swaps: the new ones (1 as l, 8 as b, 9 as g, 2 as z, + as t), mixed with real digits', () => {
    for (const p of ['8a5e8a11 8a5e8a11', 'f1ower f1ower 2026', '9ir1fri3nd 9ir1fri3nd', 'p4ssw0rd2026p4ss!', 'gui+argui+ar2026', 'ama2ingama2ing99']) {
      expect([p, ok(p)]).toEqual([p, false]);
    }
  });

  it('the learner\'s name (Google) counts as personal, and only when given', () => {
    expect(why('Xochitl Brennagh 26', { names: ['Xochitl Brennagh'] })).toEqual(['contains_email']);
    expect(why('brennagh xochitl brennagh', { names: ['Xochitl Brennagh'] })).toEqual(['contains_email']);
    expect(why('Xochitl Brennagh 26')).toEqual([]);
    expect(why('Xochitl Brennagh 26', { names: [null, undefined, 42 as unknown as string] })).toEqual([]);
  });

  it('the reason names the piece the refusal needs: email, then the app\'s words, then common words, else too simple', () => {
    expect(why('xochitl kaisip 1990', { names: ['Xochitl Brennagh'] })).toEqual(['contains_email']);
    expect(why('kaisip football 2026')).toEqual(['contains_service_word']);
    expect(why('football football 1')).toEqual(['common']);
    expect(why('zyxwvutsrqponmlkj')).toEqual(['too_simple']);
    // The floor: fewer than 10 real characters after repeats, sequences, copies and years.
    expect(why('Xochitlqq123456789')).toEqual(['too_simple']);
  });

  it('three different ordinary words pass, including ones a review found refused before (S7)', () => {
    for (const p of ['coffee monkey sun hat', 'monkey dragon tree', 'garden summer party', 'orange banana first', 'purple tiger june', 'apple rocky knock', 'manager struggle pass', 'kaisip helps me study daily', 'studying for the cisa exam in june', 'coffee before cisa review', 'i will pass the audit exam soon okay']) {
      expect([p, why(p, CTX)]).toEqual([p, []]);
    }
  });

  it('the email\'s pieces', () => {
    expect(emailWords(EMAIL).sort()).toEqual(['1990', 'example', 'maya', 'mayasantos1990@examplecom', 'mayasantos1990', 'santos'].sort());
    expect(emailWords('jo@ab.com')).toEqual(['jo@abcom']);
    expect(emailWords(null)).toEqual([]);
  });
});

describe('guidance after a refusal (NIST: SHALL offer guidance)', () => {
  it('every reason has a key and plain words in the app\'s style', () => {
    const reasons: PasswordProblem[] = ['invalid_characters', 'too_short', 'too_long', 'missing_characters', 'contains_email', 'contains_service_word', 'common', 'too_simple'];
    expect(Object.keys(PASSWORD_GUIDANCE).sort()).toEqual([...reasons].sort());
    for (const r of reasons) {
      const g = passwordGuidance(r)!;
      expect(g.key).toBe(`password.guide.${r}`);
      expect(g.text).toMatch(/^[A-Z].*\.$/);
      expect(g.text).not.toMatch(/'|!|isaca/i);
    }
    expect(passwordGuidance('nope')).toBeNull();
    expect(passwordGuidance(undefined)).toBeNull();
    expect(passwordGuidance('toString')).toBeNull();
  });
});

describe('the breached-password helpers (the pure half of the check)', () => {
  it('split a SHA-1 into the 5 characters sent and the 35 looked for, and read the range answer', () => {
    const h = createHash('sha1').update('password').digest('hex');
    const parts = breachRangeParts(h)!;
    expect(parts.prefix).toBe('5BAA6');
    expect(parts.suffix).toHaveLength(35);
    expect(breachRangeParts('nope')).toBeNull();
    expect(breachRangeResult(`0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n${parts.suffix}:9545824\r\n`, parts.suffix)).toBe('hit');
    expect(breachRangeResult(`0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n${parts.suffix}:0`, parts.suffix)).toBe('miss'); // padding
    expect(breachRangeResult(`${parts.suffix.toLowerCase()}:3`, parts.suffix)).toBe('hit');
  });

  it('an answer that is not a range list is "bad" (couldn\'t check), never "not leaked"', () => {
    const { suffix } = breachRangeParts(createHash('sha1').update('password').digest('hex'))!;
    expect(breachRangeResult(null, suffix)).toBe('bad');
    expect(breachRangeResult('', suffix)).toBe('bad');
    expect(breachRangeResult('<!doctype html><html><body>Service unavailable</body></html>', suffix)).toBe('bad');
    expect(breachRangeResult(`${suffix}:9:extra\n${suffix}`, suffix)).toBe('bad');
    // Oversized: a real padded answer is about 40 KB.
    const big = `${'0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n'.repeat(Math.ceil(BREACH_ANSWER_MAX / 38))}${suffix}:5`;
    expect(big.length).toBeGreaterThan(BREACH_ANSWER_MAX);
    expect(breachRangeResult(big, suffix)).toBe('bad');
    expect(breachRangeResult('0018A45C4D1DEF81644B54AB7F969B88D65:1', 'not a suffix')).toBe('bad');
  });

  it('the pure SHA-1 gives the known answers (Hermes and http pages have no crypto.subtle)', () => {
    expect(pureSha1Hex('')).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
    expect(pureSha1Hex('abc')).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
    expect(pureSha1Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe('84983e441c3bd26ebaae4aa1f95129e5e54670f1');
    expect(pureSha1Hex('password')).toBe('5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8');
    // Accents, CJK, emoji, and inputs across block boundaries: the same as Node's.
    for (const t of ['Summer Café 2026!', 'naïve façade', '密码很长很长的句子', 'パスワード', '😀🌲🔒 tree', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'a'.repeat(1000)]) {
      expect([t.slice(0, 12), pureSha1Hex(t)]).toEqual([t.slice(0, 12), createHash('sha1').update(t, 'utf8').digest('hex')]);
    }
  });
});

describe('guidance for the server\'s and the checker\'s own refusals (S5)', () => {
  it('leaked, weak, the checker not loading and an unchecked leak lookup each have words; details map to them', () => {
    expect(passwordGuidance('password_leaked')!.text).toBe('This password, or a simple variation of it, has appeared in a data leak. Please choose a different one.');
    expect(passwordGuidance('password_weak')!.text).toBe('The sign-in service didn’t accept that password. Try a longer phrase of unrelated words.');
    expect(passwordGuidance('password_rules')!.text).toBe('We couldn’t load the password checker. Check your connection and try again.');
    expect(passwordGuidance('invalid_characters')!.text).toBe('Your password has a hidden character, often from copy and paste. Please type it by hand. Accents and emoji are fine.');
    expect(passwordGuidance('password_too_short')).toBe(PASSWORD_GUIDANCE.too_short);
    expect(passwordGuidance('breach_unchecked')!.key).toBe('password.guide.breach_unchecked');
    for (const g of Object.values(PASSWORD_OTHER_GUIDANCE)) expect(g.text).not.toMatch(/'|!|isaca/i);
  });
});

describe('the breached-password check (k-anonymity, at most two forms, padding)', () => {
  const sha1Hex = async (t: string) => createHash('sha1').update(t, 'utf8').digest('hex');
  type Init = Parameters<Parameters<typeof createBreachCheck>[0]['fetch']>[1];
  /** A fake range API: knows the leaked passwords given; answers with padding when asked. `refusePadding`: the network refuses the header. */
  function fakeRange(leaked: string[], fail = false, refusePadding = false) {
    const calls: { url: string; headers: Record<string, string>; init: Init }[] = [];
    const fetch = async (url: string, init: Init) => {
      calls.push({ url, headers: init.headers, init });
      if (fail || (refusePadding && init.headers['Add-Padding'])) throw new TypeError('Failed to fetch');
      const prefix = url.split('/').pop()!;
      const lines = leaked.map((p) => createHash('sha1').update(p, 'utf8').digest('hex').toUpperCase()).filter((h) => h.startsWith(prefix)).map((h) => `${h.slice(5)}:42`);
      lines.push(init.headers['Add-Padding'] === 'true' ? '0000000000000000000000000000000000A:0' : '0018A45C4D1DEF81644B54AB7F969B88D65:3');
      return { status: 200, headers: { get: () => null }, text: async () => lines.join('\r\n') };
    };
    return { fetch, calls };
  }

  it('looks up the typed form and ONE simplified form; only 5 characters leave, with padding, no cookies, no referrer, no cache', async () => {
    expect(breachForms('Summer Café 2026!')).toEqual(['Summer Café 2026!', 'summercafe']);
    expect(breachForms('copper falcon wobbly harbor')).toEqual(['copper falcon wobbly harbor', 'copperfalconwobblyharbor']);
    expect(breachForms('copperfalconwobblyharbor')).toEqual(['copperfalconwobblyharbor']); // the same text is sent once
    const range = fakeRange(['summercafe']);
    const check = createBreachCheck({ fetch: range.fetch, sha1Hex });
    expect(await check('Summer Café 2026!')).toBe('breached');
    expect(range.calls).toHaveLength(2);
    for (const c of range.calls) {
      expect(c.url).toMatch(/^https:\/\/api\.pwnedpasswords\.com\/range\/[0-9A-F]{5}$/);
      expect(c.headers['Add-Padding']).toBe('true');
      expect(c.url).not.toMatch(/summer|caf/i);
      expect([c.init.cache, c.init.credentials, c.init.referrerPolicy, c.init.redirect]).toEqual(['no-store', 'omit', 'no-referrer', 'error']);
      expect(c.init.signal).toBeInstanceOf(AbortSignal);
    }
    expect(await createBreachCheck({ fetch: fakeRange(['nothing here']).fetch, sha1Hex })('Summer Café 2026!')).toBe('clean');
  });

  it('never more than two forms, on every good phrase and every hostile password of both re-tests', () => {
    for (const p of [...GOOD, ...unscramble(HOSTILE), ...R3_HOSTILE.map(([, s]) => unscramble([s])[0])]) {
      const f = breachForms(p);
      expect([p, f.length >= 1 && f.length <= 2, new Set(f).size === f.length]).toEqual([p, true, true]);
    }
  });

  it('a short base is never looked up on its own: strong, mostly-number passwords are not refused for "zq" or "box" (B1)', async () => {
    expect(breachForms('Zq #4829 1837 4401 9921')).toEqual(['Zq #4829 1837 4401 9921', 'zq#4829183744019921']);
    expect(breachForms('Box! 48 291 7730 5512 6644')).toEqual(['Box! 48 291 7730 5512 6644', 'box!48291773055126644']);
    for (const pw of ['Zq #4829 1837 4401 9921', 'Box! 48 291 7730 5512 6644']) {
      expect(checkPassword(pw)).toEqual([]);
      const range = fakeRange(['zq', 'box']);
      expect([pw, await createBreachCheck({ fetch: range.fetch, sha1Hex })(pw)]).toEqual([pw, 'clean']);
      for (const short of ['zq', 'box']) expect(range.calls.some((c) => c.url.endsWith(createHash('sha1').update(short).digest('hex').toUpperCase().slice(0, 5)))).toBe(false);
    }
    // A long base with a short tail is still looked up without the tail.
    expect(breachForms('correct horse battery staple 2026!')).toEqual(['correct horse battery staple 2026!', 'correcthorsebatterystaple']);
    expect(await createBreachCheck({ fetch: fakeRange(['correcthorsebatterystaple']).fetch, sha1Hex })('correct horse battery staple 2026!')).toBe('breached');
    // The base must be at least 8 characters and at least half the password.
    expect(breachForms('Sunflower 12345678901')).toEqual(['Sunflower 12345678901', 'sunflower12345678901']);
    expect(breachForms('Sunflower!! 2026')).toEqual(['Sunflower!! 2026', 'sunflower']);
  });

  it('when the network refuses the padding header, each lookup is tried once more without it', async () => {
    const range = fakeRange(['summercafe'], false, true);
    expect(await createBreachCheck({ fetch: range.fetch, sha1Hex })('Summer Café 2026!')).toBe('breached');
    expect(range.calls.map((c) => c.headers['Add-Padding'] ?? 'none')).toEqual(['true', 'true', 'none', 'none']);
    const down = fakeRange([], true);
    expect(await createBreachCheck({ fetch: down.fetch, sha1Hex })('Summer Café 2026!')).toBe('unknown');
    expect(down.calls).toHaveLength(4); // one retry each, no more
    // A server answer (503) is not a network refusal: no retry.
    const calls: string[] = [];
    const busy = async (url: string) => (calls.push(url), { status: 503, headers: { get: () => null }, text: async () => '' });
    expect(await createBreachCheck({ fetch: busy, sha1Hex })('Summer Café 2026!')).toBe('unknown');
    expect(calls).toHaveLength(2);
  });

  it('the two lookups run together; a timeout cancels them, and a finished check leaves no timer behind', async () => {
    let started = 0;
    const signals: AbortSignal[] = [];
    const hang = (_url: string, init: Init) => {
      started++;
      signals.push(init.signal!);
      return new Promise<never>((_, reject) => init.signal!.addEventListener('abort', () => reject(new Error('aborted'))));
    };
    const pending = createBreachCheck({ fetch: hang, sha1Hex, timeoutMs: 30 })('Summer Café 2026!');
    await new Promise((r) => setTimeout(r, 5));
    expect(started).toBe(2); // both started before either answered
    expect(await pending).toBe('unknown');
    expect(signals.every((s) => s.aborted)).toBe(true);
    expect(started).toBe(2); // an aborted lookup is not retried
    jest.useFakeTimers();
    try {
      const quick = createBreachCheck({ fetch: fakeRange([]).fetch, sha1Hex });
      expect(await quick('Summer Café 2026!')).toBe('clean');
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('fails open: a network problem or a bad answer is "unknown", never a refusal, and nothing is logged', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(await createBreachCheck({ fetch: fakeRange([], true).fetch, sha1Hex })('Summer Café 2026!')).toBe('unknown');
      const bad = async () => ({ status: 503, headers: { get: () => null }, text: async () => '' });
      expect(await createBreachCheck({ fetch: bad, sha1Hex })('Summer Café 2026!')).toBe('unknown');
      // A 200 that isn't a range list (a captive portal's page, an empty body, a huge body): "unknown", not "clean".
      for (const body of ['<html><body>Sign in to the Wi-Fi</body></html>', '', 'A'.repeat(BREACH_ANSWER_MAX + 1)]) {
        const odd = async () => ({ status: 200, headers: { get: () => null }, text: async () => body });
        expect([body.slice(0, 10), await createBreachCheck({ fetch: odd, sha1Hex })('Summer Café 2026!')]).toEqual([body.slice(0, 10), 'unknown']);
      }
      const throwingHash = async () => {
        throw new Error('no crypto');
      };
      expect(await createBreachCheck({ fetch: fakeRange([]).fetch, sha1Hex: throwingHash })('Summer Café 2026!')).toBe('unknown');
      expect(log).not.toHaveBeenCalled();
      expect(err).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
      err.mockRestore();
    }
  });
});

describe('cost budget', () => {
  // The rules look at every stretch of the password, so repetitive text is the
  // worst case (jest/password-adversarial.ts). Two checks, both on that list:
  // - a step count the rules keep (passwordCheckStepsForTest). It is the same on
  //   every machine, so the main budget cannot flake on a slow, shared runner;
  // - the clock, as a backstop for work the count does not see: the median of
  //   five runs per input in CPU time, so a busy runner does not fail it.
  // What the count sees: the per-position run, sequence and copy work, every
  // step of the word and name lookups, the app/exam/personal token matches and
  // the dynamic-programming moves over runs. What it does NOT see: building
  // the per-reading tables (the copy and mirror tables, n² per reading), the
  // normal-form and compared-form work, number and month matching, and the
  // list lookups' own hashing; a slowdown there shows only on the clock.
  // Measured 28 Nov 2026 on this list, lists loaded: 105,179 steps for the
  // worst check ('441' repeated), 19,056,137 for the whole list (each input
  // with and without CTX); in plain Node (the website bundle) at most about
  // 2.7 ms median, in Jest about 11 ms (Jest's transformed code is several
  // times slower). The version before this budget took up to 23 ms in plain
  // Node and failed CI at 50 ms. The counts only change when the code or the
  // lists do, so the margins are small on purpose (about 4 to 5%): taking out
  // the "no entry starts like this" stop, or looking at identical readings
  // twice, fails. A change that adds work on purpose updates these numbers,
  // with the reason.
  const STEP_WORST = 110_000;
  const STEP_TOTAL = 19_800_000;
  const MEDIAN_MS = 50;
  const TYPICAL_STEPS = 1_450_000; // measured 1,367,194 (28 Nov 2026)
  // The clock backstop for typical checks: their CPU time as a multiple of a fixed
  // reference loop timed in the same test. Measured 44 to 51 locally in Jest (about
  // 4 ms a check there; about 0.6 ms in plain Node). The limit is five times that,
  // because the two sides do not slow down by exactly the same factor on another
  // machine; the step count above is the tight guard, this one catches work the
  // count does not see.
  const TYPICAL_CLOCK_RATIO = 250;
  // CPU time of this process, not wall time: CI's shared runner once took 192 s for
  // this file while other test files ran beside it, and a wall-clock median of an
  // 11 ms check went past 50 ms there (28 Nov 2026, 'periodic abab1'). Time this
  // process spends waiting for a busy machine says nothing about the rules.
  const median = (f: () => void) => {
    const t: number[] = [];
    for (let k = 0; k < 5; k++) {
      const c0 = process.cpuUsage();
      f();
      const c = process.cpuUsage(c0);
      t.push((c.user + c.system) / 1000);
    }
    return t.sort((a, b) => a - b)[2];
  };

  it('the adversarial list covers every shape the budget is about', () => {
    const kinds = new Set(ADVERSARIAL.map(([name]) => name.split(' ')[0]));
    expect([...kinds].sort()).toEqual(['case', 'emoji', 'leet', 'names', 'near', 'periodic', 'random', 'repeat', 'walk']);
    for (const [name, p] of ADVERSARIAL) if (name !== 'emoji 72') expect([name, passwordBytes(p) <= PASSWORD_MAX_BYTES]).toEqual([name, true]);
    // Near-repeats change each of the 72 positions in turn.
    expect(ADVERSARIAL.filter(([name]) => name.startsWith('near a @')).length).toBe(72);
  });

  it('every adversarial input stays inside the step budget, and the count does not depend on the run', () => {
    let worst = 0;
    let total = 0;
    for (const [name, p] of ADVERSARIAL) {
      for (const ctx of [{}, CTX]) {
        passwordCheckStepsForTest(true);
        checkPassword(p, ctx);
        const steps = passwordCheckStepsForTest(true);
        checkPassword(p, ctx);
        expect([name, passwordCheckStepsForTest(true)]).toEqual([name, steps]);
        expect([name, steps <= STEP_WORST]).toEqual([name, true]);
        worst = Math.max(worst, steps);
        total += steps;
      }
    }
    expect(total).toBeLessThanOrEqual(STEP_TOTAL);
    // The budgets are ceilings close to the real cost, not loose guesses.
    expect(worst).toBeGreaterThan(STEP_WORST * 0.9);
    expect(total).toBeGreaterThan(STEP_TOTAL * 0.9);
  });

  it('the answers on the adversarial list do not drift', () => {
    // The speed rewrite was checked against the previous version input by input
    // (17,949 inputs: every fixture and this list, 0 differences). Re-recorded
    // once, on purpose, for the owner's four-types rule (28 Nov 2026, evening):
    // the answers now include missing_characters and the core rule.
    const h = createHash('sha256');
    for (const [name, p] of ADVERSARIAL) h.update(`${name}\t${checkPassword(p, CTX).join(',')}\t${checkPassword(p).join(',')}\n`);
    expect(h.digest('hex')).toBe('a81b488e720af43bfc5a093037d98932ad781e36920be3e02e25c207a31ec143');
  });

  it('every adversarial input takes well under 50 ms (median of five)', () => {
    for (const [, p] of ADVERSARIAL.slice(0, 40)) checkPassword(p, CTX); // warm up
    for (const [name, p] of ADVERSARIAL) {
      const ms = median(() => checkPassword(p, CTX));
      expect([name, ms < MEDIAN_MS]).toEqual([name, true]);
    }
  });

  it('a thousand typical checks stay inside a step budget, and inside a clock budget measured against this machine', () => {
    // CI's shared runner took 14 s of wall time for these 1000 checks while other
    // test files ran beside it (28 Nov 2026), against about 3 s locally, so a fixed
    // number of seconds says more about the runner than about the rules. Two checks:
    // - the step count, the same on every machine;
    // - the clock as a backstop, in CPU time (other processes do not count) and as a
    //   multiple of a fixed reference loop timed in the same test, so a slower
    //   machine moves both sides.
    const inputs = Array.from({ length: 1000 }, (_, i) => `${ofLength(40)}${String(i).padStart(4, '0')}`);
    for (const p of inputs.slice(0, 50)) checkPassword(p, CTX); // warm up
    passwordCheckStepsForTest(true);
    for (const p of inputs) checkPassword(p, CTX);
    const steps = passwordCheckStepsForTest(true);
    for (const p of inputs) checkPassword(p, CTX);
    expect(passwordCheckStepsForTest(true)).toBe(steps);
    expect(steps).toBeLessThanOrEqual(TYPICAL_STEPS);
    expect(steps).toBeGreaterThan(TYPICAL_STEPS * 0.9);

    const cpuMs = (f: () => void) => {
      const c0 = process.cpuUsage();
      f();
      const c = process.cpuUsage(c0);
      return (c.user + c.system) / 1000;
    };
    const reference = () => {
      // Plain string work of the kind the rules do: fixed, and unrelated to them.
      let acc = 0;
      for (let r = 0; r < 400; r++) for (const p of inputs) for (let i = 0; i < p.length; i++) acc = (acc * 31 + p.charCodeAt(i)) | 0;
      return acc;
    };
    reference();
    const refMs = [0, 0, 0].map(() => cpuMs(reference)).sort((a, b) => a - b)[1];
    const runMs = [0, 0, 0].map(() => cpuMs(() => { for (const p of inputs) checkPassword(p, CTX); })).sort((a, b) => a - b)[1];
    // PASSWORD_BUDGET_PRINT=1 prints the measured numbers, for when a budget is updated.
    if (process.env.PASSWORD_BUDGET_PRINT) console.log(JSON.stringify({ steps, refMs, runMs, ratio: runMs / refMs }));
    expect(runMs / refMs).toBeLessThan(TYPICAL_CLOCK_RATIO);
  });

  it('loading the lists (fingerprints checked) takes well under a second', () => {
    unloadPasswordWordsForTest();
    const t0 = Date.now();
    expect(loadPasswordWords(WORDS)).toBe(true);
    expect(Date.now() - t0).toBeLessThan(1500);
  });
});
