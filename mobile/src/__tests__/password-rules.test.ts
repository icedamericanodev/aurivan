/**
 * engine/passwordRules.ts and its lists (owner decisions 28 Nov 2026,
 * docs/WEB_LAUNCH_PLAN.md; NIST SP 800-63B-4 §3.1.1.2; OWASP ASVS 5.0 V6.2):
 * - 15 characters minimum (code points, in both NFC and NFKC), no
 *   composition rules, at most 72 bytes (the server's bcrypt limit),
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
 * - fast enough to run on every key press.
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
  passwordGuidance,
  passwordLength,
  passwordProblem,
  passwordWordsLoaded,
  unloadPasswordWordsForTest,
  type PasswordProblem,
} from '../engine/passwordRules';
import { breachRangeHit, breachRangeParts } from '../engine/passwordBreach';
import { PASSWORD_LISTS_SOURCE, PASSWORD_LONG_LIST, PASSWORD_LONG_SHA256, PASSWORD_LONG_SIZE, PASSWORD_WORDS_EXPECTED } from '../engine/passwordBlocklist';
import { PASSWORD_DICT_LIST, PASSWORD_DICT_SIZE, PASSWORD_LOCAL_LIST, PASSWORD_LOCAL_SIZE, PASSWORD_SHORT_LIST, PASSWORD_SHORT_SIZE } from '../engine/passwordWords';
import { GOOD, HOSTILE, HOSTILE_CONTEXT, HOSTILE_GROUPS, KNOWN_ACCEPTS, OFF_LIST_WORDS, ORDINARY_WORDS, unscramble } from '../../jest/password-fixtures';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const lists = require('../../scripts/password-lists.cjs');

/** Random characters, cut to an exact length (what a password manager makes). */
const RANDOM = 'x7Gq2mPz9LwR4tVbK3hD8nQe5YjC6fAuS1oMxZ0wPk2VgR7tBl4HnQ9eCj3DsF8yAu6';
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
const WORDS = { short: PASSWORD_SHORT_LIST, dict: PASSWORD_DICT_LIST, local: PASSWORD_LOCAL_LIST };
const ok = (p: string, ctx: object = CTX) => checkPassword(p, ctx).length === 0;

beforeAll(() => {
  expect(loadPasswordWords(WORDS)).toBe(true);
});

describe('length (NIST: 15 for a single-factor password; the server stores at most 72 bytes)', () => {
  it('the constants match the owner decision and the server', () => {
    expect([PASSWORD_MIN_CHARS, PASSWORD_MAX_BYTES, MAX_LEFT_OVER, MIN_MATERIAL]).toEqual([15, 72, 2, 10]);
  });

  it('14 is too short, 15 and 64 are fine, 72 bytes is the most, 73 and 200 are too long', () => {
    expect(checkPassword(ofLength(14))[0]).toBe('too_short');
    expect(checkPassword(ofLength(15))).toEqual([]);
    expect(checkPassword(ofLength(64))).toEqual([]);
    expect(checkPassword(ofLength(72))).toEqual([]);
    expect(checkPassword(ofLength(73))).toEqual(['too_long']);
    expect(checkPassword(ofLength(200))).toEqual(['too_long']);
    expect(passwordProblem(ofLength(200))).toBe('too_long');
    expect(passwordProblem(ofLength(15))).toBeNull();
    expect(passwordGuidance('too_long')!.text).toBe('Use up to 72 letters, fewer with accents or emoji.');
  });

  it('counts code points (an emoji is one character) and bytes as UTF-8', () => {
    const emoji = '🌿🌳🍀🌲🌱🌵🌴🌾🍁🍂🍃🌸🌼🌻🌺🌷🥀🪴';
    expect(passwordLength(emoji)).toBe(18);
    expect(passwordBytes(emoji)).toBe(72);
    expect(checkPassword(emoji)).toEqual([]);
    expect(checkPassword(`${emoji}a`)).toEqual(['too_long']);
    expect(passwordBytes('é'.repeat(36))).toBe(72);
    expect(checkPassword('é'.repeat(64))).toEqual(['too_long']);
  });

  it('spaces count and are never trimmed; no character types are required', () => {
    expect(passwordLength(`  ${ofLength(13)}`)).toBe(15);
    expect(checkPassword('all lower case words here')).toEqual([]);
    expect(checkPassword('ALL UPPER CASE WORDS HERE')).toEqual([]);
    expect(checkPassword('x7gq2mpz9lwr4tvb')).toEqual([]);
  });

  it('anything that is not a string reads as empty, never a crash', () => {
    expect(checkPassword(undefined)).toEqual(['too_short', 'too_simple']);
    expect(checkPassword(42 as unknown as string, 7 as unknown as string)).toEqual(['too_short', 'too_simple']);
    expect(normalizePassword(null)).toBeNull();
  });
});

describe('Unicode: NFKC sent, 15 characters in both NFC and NFKC, invisible characters refused', () => {
  it('composes before counting, checking and sending', () => {
    const decomposed = 'cafe\u0301 cre\u0300me bru\u0302le\u0301e';
    const composed = 'café crème brûlée';
    expect(normalizePassword(decomposed)).toBe(composed);
    expect(passwordLength(decomposed)).toBe(passwordLength(composed));
    expect(checkPassword(decomposed)).toEqual(checkPassword(composed));
  });

  it('a decomposed 16-code-point string that composes to 14 characters is too short', () => {
    const s = 'e\u0301e\u0301 ocean lamps';
    expect(Array.from(s)).toHaveLength(16);
    expect(passwordLength(s)).toBe(14);
    expect(checkPassword(s)).toContain('too_short');
  });

  it('NFKC: full-width letters and ligatures are their plain forms; 15 code points in both forms', () => {
    expect(normalizePassword('ｐａｓｓｗｏｒｄ')).toBe('password');
    expect(normalizePassword('ﬁve ocean lamps')).toBe('five ocean lamps');
    expect(checkPassword('ｐａｓｓｗｏｒｄｐａｓｓｗｏｒｄ')).not.toEqual([]);
    const s = 'ﬁve ocean lamp'; // 14 in NFC, 15 in NFKC
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
    expect(checkPassword(`👨\u200d👩\u200d👧\u200d👦 family picnic day`)).toEqual([]);
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
      expect([p, checkPassword(p, CTX)]).toEqual([p, []]);
    }
  });

  it('fails closed without String.prototype.normalize: plain ASCII still works, anything else is refused, never sent raw', () => {
    const saved = String.prototype.normalize;
    try {
      // @ts-expect-error: an engine without Unicode normalisation
      delete String.prototype.normalize;
      expect(normalizePassword('ocean violet lamp seven')).toBe('ocean violet lamp seven');
      expect(normalizePassword('café violet lamp seven')).toBeNull();
      expect(checkPassword('café violet lamp seven')).toEqual(['invalid_characters']);
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
    for (const [k, text] of Object.entries(WORDS)) {
      expect([k, sha(text), decodeList(text).length]).toEqual([k, PASSWORD_WORDS_EXPECTED[k as keyof typeof WORDS].sha256, PASSWORD_WORDS_EXPECTED[k as keyof typeof WORDS].size]);
    }
    expect(PASSWORD_LISTS_SOURCE).toMatch(/SecLists .* \(MIT\); dwyl\/english-words .* \(Unlicense\); KaiSip phrases and Filipino/);
  });

  it('the hand-written lists in the repo are what the lazy file holds (its own hash test), and the owner\'s review copy matches', () => {
    expect(lists.encodeList(lists.readLocal())).toBe(PASSWORD_LOCAL_LIST);
    expect(fs.readFileSync(lists.DOC_FILE, 'utf8')).toBe(lists.renderFilipinoDoc());
    // The review copy shows no rude word: those are only in the source, scrambled.
    const doc = fs.readFileSync(lists.DOC_FILE, 'utf8');
    const rude = fs.readFileSync(path.join(lists.LOCAL_DIR, 'filipino.txt'), 'utf8').split('\n').filter((l: string) => l.startsWith('~')).map((l: string) => lists.rot(l.slice(1)));
    expect(rude.length).toBeGreaterThan(20);
    for (const r of rude) expect(doc.split('\n')).not.toContain(`- ${r}`);
    expect(local).toEqual(expect.arrayContaining(['mahalkita', 'pilipinas', 'correcthorsebatterystaple', 'merrychristmas', 'certifiedinformationsystemsauditor', lists.rot('gnatvanzb')]));
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
      expect(assessPassword('administrator1234')).toEqual({ problems: [], complete: false });
      expect(assessPassword('cisaexam2026pass').problems).toEqual(['contains_service_word']);
    } finally {
      expect(loadPasswordWords(WORDS)).toBe(true);
    }
    expect(assessPassword('administrator1234')).toEqual({ problems: ['common'], complete: true });
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
    for (const p of long) expect(checkPassword(p).length).toBeGreaterThan(0);
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
      'exam vocabulary': '29/31',
      'tagalog / filipino': '58/58',
      unicode: '25/26', // the one left: 15 different emoji in a row (no pattern to name)
    });
  });

  it('the 70 good passphrases (26 in Tagalog) all pass', () => {
    expect(GOOD).toHaveLength(70);
    expect(GOOD.filter((p) => !ok(p, HOSTILE_CONTEXT))).toEqual([]);
  });

  it('English words ranked after the bundled 100,000 (3,000 of them, not on any list): doubled, + a sequence, + a year', () => {
    const words = unscramble(OFF_LIST_WORDS);
    expect(words).toHaveLength(3000);
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
    // Accepted today (all words of 10+ letters: the 10-character floor lets them through).
    // These numbers may only go down.
    const ceiling: Record<string, number> = { doubled: 34, plusSequence: 28, plusYear: 34 };
    for (const [name, make] of Object.entries(builds)) {
      const passed = words.filter((w) => ok(make(w)));
      expect([name, passed.length <= ceiling[name]]).toEqual([name, true]);
      for (const w of passed) expect(w.length).toBeGreaterThanOrEqual(10);
    }
  });

  it('three random ordinary words pass: refused under 0.5%, with or without spaces; four words never refused', () => {
    // The words are not filtered: a few are themselves patterns ("mmmm", "wert"), which is why
    // the rate is above zero.
    const words = unscramble(ORDINARY_WORDS);
    for (const [k, sep, limit] of [[3, ' ', 0.005], [3, '', 0.005], [4, ' ', 0.001], [4, '', 0.001]] as const) {
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
        if (checkPassword(p).length) refused++;
      }
      expect([k, sep, refused / n <= limit]).toEqual([k, sep, true]);
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
    for (const [p, why] of cases) expect([p, checkPassword(p, CTX)]).toEqual([p, [why]]);
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
    expect(checkPassword('Xochitl Brennagh 26', { names: ['Xochitl Brennagh'] })).toEqual(['contains_email']);
    expect(checkPassword('brennagh xochitl brennagh', { names: ['Xochitl Brennagh'] })).toEqual(['contains_email']);
    expect(checkPassword('Xochitl Brennagh 26')).toEqual([]);
    expect(checkPassword('Xochitl Brennagh 26', { names: [null, undefined, 42 as unknown as string] })).toEqual([]);
  });

  it('the reason names the piece the refusal needs: email, then the app\'s words, then common words, else too simple', () => {
    expect(checkPassword('xochitl kaisip 1990', { names: ['Xochitl Brennagh'] })).toEqual(['contains_email']);
    expect(checkPassword('kaisip football 2026')).toEqual(['contains_service_word']);
    expect(checkPassword('football football 1')).toEqual(['common']);
    expect(checkPassword('zyxwvutsrqponmlkj')).toEqual(['too_simple']);
    // The floor: fewer than 10 real characters after repeats, sequences, copies and years.
    expect(checkPassword('Xochitlqq123456789')).toEqual(['too_simple']);
  });

  it('three different ordinary words pass, including ones a review found refused before (S7)', () => {
    for (const p of ['maple cloud tiger', 'coffee monkey sun hat', 'monkey dragon tree', 'garden summer party', 'orange banana first', 'purple tiger june', 'apple rocky knock', 'manager struggle pass', 'kaisip helps me study daily', 'studying for the cisa exam in june', 'coffee before cisa review', 'i will pass the audit exam soon okay']) {
      expect([p, checkPassword(p, CTX)]).toEqual([p, []]);
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
    const reasons: PasswordProblem[] = ['invalid_characters', 'too_short', 'too_long', 'contains_email', 'contains_service_word', 'common', 'too_simple'];
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

describe('the breached-password helpers (design for later; nothing calls them)', () => {
  it('split a SHA-1 into the 5 characters sent and the 35 looked for, and read the range answer', () => {
    const h = createHash('sha1').update('password').digest('hex');
    const parts = breachRangeParts(h)!;
    expect(parts.prefix).toBe('5BAA6');
    expect(parts.suffix).toHaveLength(35);
    expect(breachRangeParts('nope')).toBeNull();
    expect(breachRangeHit(`0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n${parts.suffix}:9545824\r\n`, parts.suffix)).toBe(true);
    expect(breachRangeHit(`${parts.suffix}:0`, parts.suffix)).toBe(false); // padding
    expect(breachRangeHit(null, parts.suffix)).toBe(false);
  });
});

describe('cost budget', () => {
  it('the worst inputs take well under 50 ms; a thousand typical checks well under three seconds', () => {
    checkPassword('warm up the sets once');
    for (const p of ['a'.repeat(72), 'password'.repeat(9), 'ab'.repeat(36), '1q2w3e4r5t6y7u8i9o0p'.repeat(4).slice(0, 72), 'internationalization'.repeat(3).slice(0, 72), 'correct horse battery staple and nine more words here to be long!!']) {
      const t0 = Date.now();
      checkPassword(p, CTX);
      expect([p.slice(0, 12), Date.now() - t0 < 50]).toEqual([p.slice(0, 12), true]);
    }
    const inputs = Array.from({ length: 1000 }, (_, i) => `${ofLength(40)}${String(i).padStart(4, '0')}`);
    const t0 = Date.now();
    for (const p of inputs) checkPassword(p, CTX);
    expect(Date.now() - t0).toBeLessThan(3000);
  });

  it('loading the lists (fingerprints checked) takes well under a second', () => {
    unloadPasswordWordsForTest();
    const t0 = Date.now();
    expect(loadPasswordWords(WORDS)).toBe(true);
    expect(Date.now() - t0).toBeLessThan(1500);
  });
});
