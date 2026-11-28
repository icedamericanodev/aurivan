/**
 * engine/passwordRules.ts and its lists (owner decisions 28 Nov 2026,
 * docs/WEB_LAUNCH_PLAN.md; NIST SP 800-63B-4 §3.1.1.2; OWASP ASVS 5.0 V6.2):
 * - 15 characters minimum (code points, in both NFC and NFKC), no
 *   composition rules, at most 72 bytes (the server's bcrypt limit),
 *   Unicode and spaces allowed; control characters and broken characters
 *   refused; a device without Unicode normalisation fails closed;
 * - the WHOLE password is compared: refused when it can be written as
 *   predictable pieces (context words, the email and name, up to two list
 *   words, runs, short numbers, years, symbols) with at most 2 characters
 *   left over; three different ordinary words always pass;
 * - the generated lists are intact, and the picking rules are the documented ones;
 * - guidance after every refusal (NIST: SHALL offer guidance);
 * - fast enough to run on every key press.
 */
import { createHash } from 'crypto';
import {
  checkPassword,
  decodeList,
  emailWords,
  isCommonPassword,
  loadPasswordWords,
  MAX_LEFT_OVER,
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
import { PASSWORD_LISTS_SOURCE, PASSWORD_LONG_LIST, PASSWORD_LONG_SHA256, PASSWORD_LONG_SIZE } from '../engine/passwordBlocklist';
import { PASSWORD_DICT_LIST, PASSWORD_DICT_SHA256, PASSWORD_DICT_SIZE, PASSWORD_SHORT_LIST, PASSWORD_SHORT_SHA256, PASSWORD_SHORT_SIZE } from '../engine/passwordWords';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const lists = require('../../scripts/password-lists.cjs');

/** Ordinary words, cut to an exact length (a passphrase, nothing patterned). */
const PHRASE = 'quilt jungle ocean violet lamp seven river stone maple cloud tiger piano amber frost north';
const ofLength = (n: number) => {
  let s = '';
  while (s.length < n) s += `${PHRASE} `;
  return s.slice(0, n);
};
const EMAIL = 'Maya.Santos1990@Example.com';
const CTX = { email: EMAIL, names: ['Maya Santos'] };
const sha = (t: string) => createHash('sha256').update(t, 'utf8').digest('hex');

beforeAll(() => loadPasswordWords({ short: PASSWORD_SHORT_LIST, dict: PASSWORD_DICT_LIST }));

describe('length (NIST: 15 for a single-factor password; the server stores at most 72 bytes)', () => {
  it('the constants match the owner decision and the server', () => {
    expect(PASSWORD_MIN_CHARS).toBe(15);
    expect(PASSWORD_MAX_BYTES).toBe(72);
    expect(MAX_LEFT_OVER).toBe(2);
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
    // Accented text: 64 characters can be more than 72 bytes (the documented deviation).
    expect(passwordBytes('é'.repeat(36))).toBe(72);
    expect(checkPassword('é'.repeat(64))).toEqual(['too_long']);
    expect(checkPassword('日本語のパスワードです長い文章です')).toEqual([]);
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

describe('Unicode: NFKC for the password, 15 characters in both NFC and NFKC', () => {
  it('composes before counting, checking and sending', () => {
    const decomposed = 'cafe\u0301 cre\u0300me bru\u0302le\u0301e';
    const composed = 'café crème brûlée';
    expect(decomposed).not.toBe(composed);
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

  it('NFKC: full-width letters and ligatures are their plain forms (full-width "password" twice is refused)', () => {
    expect(normalizePassword('ｐａｓｓｗｏｒｄ')).toBe('password');
    expect(normalizePassword('ﬁve ocean lamps')).toBe('five ocean lamps');
    expect(checkPassword('ｐａｓｓｗｏｒｄｐａｓｓｗｏｒｄ')).toEqual(['common']);
  });

  it('15 code points are needed in BOTH forms: a ligature that NFKC splits does not lengthen a short password', () => {
    // 14 in NFC, 15 in NFKC ("ﬁ" → "fi").
    const s = 'ﬁve ocean lamp';
    expect(Array.from(s.normalize('NFC'))).toHaveLength(14);
    expect(Array.from(s.normalize('NFKC'))).toHaveLength(15);
    expect(checkPassword(s)).toContain('too_short');
  });

  it('control characters and broken characters are refused', () => {
    expect(checkPassword(`${ofLength(20)}\u0000`)).toEqual(['invalid_characters']);
    expect(checkPassword(`${ofLength(20)}\t`)).toEqual(['invalid_characters']);
    expect(checkPassword(`${ofLength(20)}\u0085`)).toEqual(['invalid_characters']);
    expect(checkPassword(`${ofLength(20)}\ud800`)).toEqual(['invalid_characters']);
    expect(checkPassword(`\udc00${ofLength(20)}`)).toEqual(['invalid_characters']);
    expect(passwordGuidance('invalid_characters')).not.toBeNull();
  });

  it('fails closed without String.prototype.normalize: plain ASCII still works, anything else is refused, never sent raw', () => {
    const saved = String.prototype.normalize;
    try {
      // @ts-expect-error: an engine without Unicode normalisation
      delete String.prototype.normalize;
      expect(typeof ''.normalize).toBe('undefined');
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

describe('the bundled lists (ASVS 6.2.4; source and picking rules)', () => {
  const long = decodeList(PASSWORD_LONG_LIST);
  const short = decodeList(PASSWORD_SHORT_LIST);
  const dict = decodeList(PASSWORD_DICT_LIST);

  it('are the generated lists, intact: SHA-256, sizes and sources', () => {
    expect(sha(long.join('\n'))).toBe(PASSWORD_LONG_SHA256);
    expect(sha(short.join('\n'))).toBe(PASSWORD_SHORT_SHA256);
    expect(sha(dict.join('\n'))).toBe(PASSWORD_DICT_SHA256);
    expect([long.length, PASSWORD_LONG_SIZE]).toEqual([3000, 3000]);
    expect([short.length, PASSWORD_SHORT_SIZE]).toEqual([10000, 10000]);
    expect(dict.length).toBe(PASSWORD_DICT_SIZE);
    expect(dict.length).toBeGreaterThan(15000);
    expect(PASSWORD_LISTS_SOURCE).toMatch(/SecLists .* \(MIT\); dwyl\/english-words .* \(Unlicense\)/);
  });

  it('are stored scrambled, not as readable text, and decode the same way in the builder and the app', () => {
    for (const text of [PASSWORD_LONG_LIST, PASSWORD_SHORT_LIST, PASSWORD_DICT_LIST]) {
      expect(text).not.toMatch(/(^|\n)[A-Z]?(password|football|congratulations|monkey)/);
      expect(lists.decodeList(text)).toEqual(decodeList(text));
    }
    expect(short).toContain('football');
    expect(short).toContain('123456');
    expect(dict).toContain('congratulations');
  });

  it('every entry is in the compared form (NFKC, lower case, no joiners), sorted and once; lengths as documented', () => {
    const forms = (l: string[]) => {
      expect([...l].sort()).toEqual(l);
      expect(new Set(l).size).toBe(l.length);
      for (const p of l) expect(p).toBe(p.normalize('NFKC').toLowerCase().replace(/[\s._-]+/g, ''));
    };
    forms(long);
    forms(short);
    forms(dict);
    for (const p of short) expect(Array.from(p).length).toBeGreaterThanOrEqual(4);
    for (const p of dict) expect(p).toMatch(/^[a-z]{15,}$/);
    expect(short.filter((p) => /^\d+$/.test(p)).length).toBeGreaterThan(500); // digits-only entries included
  });

  it('the builder\'s picking rules: rank order, lengths, distinct, NFKC, canonical', () => {
    const src = ['123456', 'Password', 'pass', 'abc', 'ＰＡＳＳＷＯＲＤ', 'iloveyou', 'monkey-face', 'x'.repeat(16), 'Y'.repeat(16), ...Array.from({ length: 10010 }, (_, i) => `w${i}xyz`)].join('\r\n');
    const s = lists.pickShort(src);
    expect(s.slice(0, 5)).toEqual(['123456', 'password', 'pass', 'iloveyou', 'monkeyface']);
    expect(s).toHaveLength(10000);
    expect(() => lists.pickShort('a\nb')).toThrow(/only/);
    const longSrc = ['short', 'correct horse battery', 'Correct.Horse.Battery', 'z'.repeat(80), 'é'.repeat(40), ...Array.from({ length: 3005 }, (_, i) => `long password number ${i}`)].join('\n');
    const l = lists.pickLong(longSrc);
    expect(l.slice(0, 2)).toEqual(['correcthorsebattery', 'longpasswordnumber0']);
    expect(l).toHaveLength(3000);
    expect(lists.pickDict(['Congratulations', 'short', 'misunderstanding', "can't-be-a-word-x", ...Array.from({ length: 10000 }, (_, i) => `abcdefghijklmno${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + Math.floor(i / 26) % 26)}${String.fromCharCode(97 + Math.floor(i / 676))}`)].join('\n')).slice(0, 2)).toEqual(['congratulations', 'misunderstanding']);
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

describe('the whole-password rule (NIST: compare the entire password, derivatives included)', () => {
  it('refuses the review\'s examples', () => {
    const cases: [string, PasswordProblem][] = [
      ['monkeymonkeymonkey', 'common'],
      ['dragondragondragon', 'common'],
      ['sunshinesunshine', 'common'],
      ['trustno1trustno1', 'common'],
      ['football12345678', 'common'],
      ['superman12345678', 'common'],
      ['Summer2026Summer2026', 'common'],
      ['November2026!!!!', 'common'],
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

  it('refuses more derivatives: swaps, joiners, context words in any number, the email and the domain', () => {
    for (const p of ['P@ssw0rdP@ssw0rd', 'passwordpassword1', 'Winter2026!Winter', 'Congratulations1!', 'CISAcertified2026', 'isaca member 2026', 'cisa-exam-prep-26', 'kaisipkaisipkaisip', 'K41s1p k41s1p 2026', 'crisc aaia csoe 2026', 'mayasantos199012', 'examplecom123456', 'santos maya 1990', 'qwertyuiop12345', '1qaz2wsx3edc4rfv', 'abcabcabcabcabcabc', 'aaaaaaaabbbbbbbb', '1001010011010100', '~!@#$%^&*()_+~!@#']) {
      expect([p, checkPassword(p, CTX).length]).toEqual([p, 1]);
    }
  });

  it('the learner\'s name (Google) counts as personal, and only when given', () => {
    expect(checkPassword('Maya Santos 1990!!', { names: ['Maya Santos'] })).toEqual(['contains_email']);
    expect(checkPassword('santosmaya santos', { names: ['Maya Santos'] })).toEqual(['contains_email']);
    expect(checkPassword('Maya Santos 1990!!')).toEqual([]);
    expect(checkPassword('Maya Santos 1990!!', { names: [null, undefined, 42 as unknown as string] })).toEqual([]);
  });

  it('the reason names the piece the refusal needs: email, then the app\'s words, then common words, else too simple', () => {
    expect(checkPassword('maya kaisip 1990', CTX)).toEqual(['contains_email']);
    expect(checkPassword('kaisip football 2026')).toEqual(['contains_service_word']);
    expect(checkPassword('football football 1')).toEqual(['common']);
    expect(checkPassword('abcdefghijklmnop')).toEqual(['common']); // on the 15+ list as it is
    expect(checkPassword('zyxwvutsrqponmlkj')).toEqual(['too_simple']);
  });

  it('passes ordinary passphrases, also ones that mention the app, the exam or the name', () => {
    for (const p of ['maple cloud tiger', 'kaisip helps me study daily', 'studying for the cisa exam in june', 'ocean violet lamp seven', 'correct horse battery staple', 'precisamos de ferias', 'Lisa can sing 2026', 'the secret garden path', 'admin assistant to the boss', 'mountain river 1984 song', 'monkey dragon football', 'Tr0ub4dor&3Tr0ub4dor&3', 'maya likes ocean violet lamps', 'café crème brûlée ok']) {
      expect([p, checkPassword(p, CTX)]).toEqual([p, []]);
    }
  });

  it('the email\'s pieces', () => {
    expect(emailWords(EMAIL).sort()).toEqual(['1990', 'example', 'maya', 'maya.santos1990@example.com'.replace(/\./g, ''), 'mayasantos1990', 'santos'].sort());
    expect(emailWords('jo@ab.com')).toEqual(['jo@abcom']);
    expect(emailWords(null)).toEqual([]);
  });

  it('a short common password built up to 15+ is refused at least 97% of the time (1,000 list entries)', () => {
    const short = decodeList(PASSWORD_SHORT_LIST);
    const sample = Array.from({ length: 1000 }, (_, i) => short[(i * 9973) % short.length]);
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
    for (const [name, make] of Object.entries(builds)) {
      const passed = sample.filter((w) => checkPassword(make(w), CTX).length === 0);
      expect([name, passed.length <= 30]).toEqual([name, true]);
    }
  });

  it('random four-word phrases (ordinary list words, with or without spaces) are refused under 1% of the time', () => {
    // Ordinary words: letters only, and not themselves a repeat, a sequence or a keyboard run.
    const runs = ['abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
    const patterned = (w: string) => /(.)\1/.test(w) || runs.some((r) => [r, [...r].reverse().join('')].some((x) => Array.from({ length: x.length - 2 }, (_, i) => x.slice(i, i + 3)).some((t) => w.includes(t))));
    const words = decodeList(PASSWORD_SHORT_LIST).filter((w) => /^[a-z]{4,8}$/.test(w) && !patterned(w));
    let seed = 12345;
    const pick = () => words[(seed = (seed * 1103515245 + 12345) % 2147483648) % words.length];
    for (const sep of [' ', '']) {
      let refused = 0;
      let n = 0;
      for (let i = 0; i < 2000; i++) {
        const p = [pick(), pick(), pick(), pick()].join(sep);
        if (Array.from(p).length < 15) continue;
        n++;
        if (checkPassword(p, CTX).length) refused++;
      }
      expect([sep, refused / n < 0.01]).toEqual([sep, true]);
    }
  });

  it('without the word lists (not loaded yet) patterns and context words are still refused', () => {
    unloadPasswordWordsForTest();
    try {
      expect(passwordWordsLoaded()).toBe(false);
      expect(checkPassword('aaaaaaaaaaaaaaaa')).not.toEqual([]);
      expect(checkPassword('cisaexam2026pass')).toEqual(['contains_service_word']);
      loadPasswordWords({ short: 'nonsense', dict: '' });
      expect(passwordWordsLoaded()).toBe(false); // bad input is ignored
    } finally {
      loadPasswordWords({ short: PASSWORD_SHORT_LIST, dict: PASSWORD_DICT_LIST });
    }
    expect(passwordWordsLoaded()).toBe(true);
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

describe('cost budget', () => {
  it('the worst inputs take a few milliseconds; a thousand typical checks well under two seconds', () => {
    checkPassword('warm up the sets once');
    for (const p of ['a'.repeat(72), 'password'.repeat(9), 'ab'.repeat(36), '1q2w3e4r5t6y7u8i9o0p'.repeat(4).slice(0, 72), 'correct horse battery staple and nine more words here to be long!!']) {
      const t0 = Date.now();
      checkPassword(p, CTX);
      expect([p.slice(0, 12), Date.now() - t0 < 50]).toEqual([p.slice(0, 12), true]);
    }
    const inputs = Array.from({ length: 1000 }, (_, i) => `${ofLength(40)}${String(i).padStart(4, '0')}`);
    const t0 = Date.now();
    for (const p of inputs) checkPassword(p, CTX);
    expect(Date.now() - t0).toBeLessThan(2000);
  });
});
