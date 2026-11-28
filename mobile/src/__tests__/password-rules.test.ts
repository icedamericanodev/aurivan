/**
 * engine/passwordRules.ts and its blocklist (owner decisions 28 Nov 2026,
 * docs/WEB_LAUNCH_PLAN.md; NIST SP 800-63B-4 §3.1.1.2; OWASP ASVS 5.0 6.2.4):
 * - 15 characters minimum (code points, after NFC), no composition rules,
 *   at most 72 bytes (the server's bcrypt limit), Unicode and spaces allowed;
 * - the generated blocklist is intact: 3,000 lower-case NFC entries that the
 *   length rule would otherwise let through, sorted, once each;
 * - the context words (the email's name part, "kaisip", "cisa", "isaca"),
 *   repeats and sequences are refused, without refusing ordinary passphrases
 *   that merely contain them;
 * - fast enough to run on every key press.
 */
import { createHash } from 'crypto';
import {
  checkPassword,
  emailWords,
  isCommonPassword,
  normalizePassword,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_CHARS,
  passwordBytes,
  passwordLength,
  passwordProblem,
  patternPieces,
} from '../engine/passwordRules';
import { PASSWORD_BLOCKLIST_SHA256, PASSWORD_BLOCKLIST_SIZE, PASSWORD_BLOCKLIST_SOURCE, PASSWORD_BLOCKLIST_TEXT } from '../engine/passwordBlocklist';

/** Ordinary words, cut to an exact length (a passphrase, nothing patterned). */
const PHRASE = 'ocean violet lamp seven river stone maple cloud tiger piano amber frost north quilt jungle';
const ofLength = (n: number) => {
  let s = '';
  while (s.length < n) s += `${PHRASE} `;
  return s.slice(0, n);
};
const EMAIL = 'Maya.Santos1990@Example.com';

describe('length (NIST: 15 for a single-factor password; the server stores at most 72 bytes)', () => {
  it('the constants match the owner decision and the server', () => {
    expect(PASSWORD_MIN_CHARS).toBe(15);
    expect(PASSWORD_MAX_BYTES).toBe(72);
  });

  it('14 is too short, 15 and 64 are fine, 72 bytes is the most, 73 and 200 are too long', () => {
    expect(checkPassword(ofLength(14))).toEqual(['too_short']);
    expect(checkPassword(ofLength(15))).toEqual([]);
    expect(checkPassword(ofLength(64))).toEqual([]);
    expect(checkPassword(ofLength(72))).toEqual([]);
    expect(checkPassword(ofLength(73))).toEqual(['too_long']);
    expect(checkPassword(ofLength(200))).toEqual(['too_long']);
    expect(passwordProblem(ofLength(200))).toBe('too_long');
    expect(passwordProblem(ofLength(15))).toBeNull();
  });

  it('counts code points (an emoji is one character) and bytes as UTF-8', () => {
    const emoji = '🌿🌳🍀🌲🌱🌵🌴🌾🍁🍂🍃🌸🌼🌻🌺🌷🥀🪴';
    expect(passwordLength(emoji)).toBe(18);
    expect(passwordBytes(emoji)).toBe(72);
    expect(checkPassword(emoji)).toEqual([]);
    expect(checkPassword(`${emoji}a`)).toEqual(['too_long']);
    // Accented text: 64 characters can be more than 72 bytes (documented: "fewer with accents").
    expect(passwordBytes('é'.repeat(36))).toBe(72);
    expect(checkPassword('é'.repeat(64))).toEqual(['too_long']);
    expect(checkPassword('日本語のパスワードです長い文章です')).toEqual([]);
  });

  it('spaces count and are never trimmed; no character types are required', () => {
    expect(passwordLength(`  ${ofLength(13)}`)).toBe(15);
    expect(checkPassword('all lower case words here')).toEqual([]);
    expect(checkPassword('ALL UPPER CASE WORDS HERE')).toEqual([]);
    expect(checkPassword(normalizePassword('x7gq2mpz9lwr4tvb'))).toEqual([]);
  });

  it('anything that is not a string reads as empty (too short), never a crash', () => {
    expect(checkPassword(undefined as unknown as string)).toEqual(['too_short', 'too_simple']);
  });
});

describe('Unicode NFC (the same keys make the same password on every device)', () => {
  it('composes before counting, checking and sending', () => {
    const decomposed = 'cafe\u0301 cre\u0300me bru\u0302le\u0301e';
    const composed = 'café crème brûlée';
    expect(decomposed).not.toBe(composed);
    expect(normalizePassword(decomposed)).toBe(composed);
    expect(passwordLength(decomposed)).toBe(passwordLength(composed));
    expect(passwordBytes(decomposed)).toBe(passwordBytes(composed));
    expect(checkPassword(decomposed)).toEqual(checkPassword(composed));
  });

  it('a decomposed 16-code-point string that composes to 14 characters is too short', () => {
    const s = 'e\u0301e\u0301 ocean lamps';
    expect(Array.from(s)).toHaveLength(16);
    expect(passwordLength(s)).toBe(14);
    expect(checkPassword(s)).toContain('too_short');
  });

  it('NFC, not NFKC: compatibility characters are kept as typed (owner decision)', () => {
    expect(normalizePassword('ﬁve ocean lamps')).toBe('ﬁve ocean lamps');
  });
});

describe('the bundled blocklist (ASVS 6.2.4: top 3,000 that match the policy)', () => {
  const list = PASSWORD_BLOCKLIST_TEXT.split('\n');

  it('is the generated list, intact: its SHA-256, size and source', () => {
    expect(createHash('sha256').update(PASSWORD_BLOCKLIST_TEXT, 'utf8').digest('hex')).toBe(PASSWORD_BLOCKLIST_SHA256);
    expect(PASSWORD_BLOCKLIST_SIZE).toBe(3000);
    expect(list).toHaveLength(3000);
    expect(PASSWORD_BLOCKLIST_SOURCE).toMatch(/SecLists .* \(MIT\)/);
  });

  it('every entry is lower case, NFC, long enough to pass the length rule, sorted and once', () => {
    expect([...list].sort()).toEqual(list);
    expect(new Set(list).size).toBe(list.length);
    for (const p of list) {
      expect(p).toBe(p.toLowerCase());
      expect(p).toBe(p.normalize('NFC'));
      expect(Array.from(p).length).toBeGreaterThanOrEqual(PASSWORD_MIN_CHARS);
      expect(passwordBytes(p)).toBeLessThanOrEqual(PASSWORD_MAX_BYTES);
    }
  });

  it('every entry is refused, in any case; with spaces or joiners too', () => {
    for (const p of list) expect(checkPassword(p)).toContain('common');
    expect(isCommonPassword('ManchesterUnited')).toBe(true);
    expect(isCommonPassword('manchester united')).toBe(true);
    expect(isCommonPassword('manchester.united')).toBe(true);
    expect(isCommonPassword('passwordpassword')).toBe(true);
    expect(isCommonPassword('1qaz2wsx3edc4rfv')).toBe(true);
    expect(isCommonPassword('ocean violet lamp seven')).toBe(false);
  });
});

describe('context words (NIST: the service name and the username)', () => {
  it('the email\'s name part and its pieces', () => {
    expect(emailWords(EMAIL).sort()).toEqual(['1990', 'maya', 'maya.santos1990', 'santos']);
    expect(emailWords('jo@example.com')).toEqual([]);
    expect(emailWords(null)).toEqual([]);
  });

  it('a password that is mostly the email\'s name is refused; the same password with another email is not', () => {
    expect(checkPassword('maya.santos1990!', EMAIL)).toEqual(['contains_email']);
    expect(checkPassword('MayaSantos123456', EMAIL)).toEqual(['contains_email']);
    expect(checkPassword('santos maya 1990', EMAIL)).toEqual(['contains_email']);
    expect(checkPassword('maya.santos1990!', 'someone@example.com')).toEqual([]);
    expect(checkPassword('maya.santos1990!')).toEqual([]);
    // A long passphrase that only mentions the name is fine.
    expect(checkPassword('maya likes ocean violet lamps', EMAIL)).toEqual([]);
  });

  it('"kaisip", "cisa" and "isaca" with padding are refused, also with letter-for-number swaps', () => {
    expect(checkPassword('kaisipkaisipkaisip')).toEqual(['contains_service_word']);
    expect(checkPassword('KaiSip2026KaiSip!')).toEqual(['contains_service_word']);
    expect(checkPassword('CISA cisa CISA cisa')).toEqual(['contains_service_word']);
    expect(checkPassword('isaca-cisa-2026')).toEqual(['contains_service_word']);
    expect(checkPassword('K41s1p k41s1p 2026')).toEqual(['contains_service_word']);
    expect(checkPassword('cisa123456789012')).toEqual(['contains_service_word']);
  });

  it('ordinary passphrases that contain those letters are not refused', () => {
    for (const ok of ['precisamos de ferias', 'Lisa can sing 2026', 'kaisip helps me study daily', 'studying for the cisa exam in june', 'the secret garden path', 'admin assistant to the boss']) {
      expect([ok, checkPassword(ok, EMAIL)]).toEqual([ok, []]);
    }
  });

  it('"password", "qwerty" and friends with padding are common', () => {
    expect(checkPassword('Password12345678')).toContain('common');
    expect(checkPassword('P@ssw0rd2026!!!!')).toContain('common');
    expect(checkPassword('qwerty qwerty 2026')).toContain('common');
    expect(checkPassword('iloveyou iloveyou')).toContain('common');
  });

  it('the most personal reason comes first', () => {
    expect(checkPassword('maya kaisip 1990', EMAIL)[0]).toBe('contains_email');
  });
});

describe('repeats and sequences (NIST: "repetitive or sequential characters")', () => {
  it('are refused', () => {
    for (const bad of ['aaaaaaaaaaaaaaaaaa', 'abababababababab', 'abcabcabcabcabcabc', '1234567890123456', 'abcdefghijklmnopq', 'zyxwvutsrqponmlkj', '9876543210987654', 'qwertyuiop12345', 'asdfghjkl;asdfgh', 'poiuytrewqlkjhgf', '1001010011010100', 'Ab1!Ab1!Ab1!Ab1!', 'a a a a a a a a a', '...............']) {
      expect([bad, checkPassword(bad)]).toEqual([bad, expect.arrayContaining(['too_simple'])]);
    }
  });

  it('a pattern counts as one piece; random text counts every character', () => {
    expect(patternPieces('aaaaaaaaaaaaaaaa')).toBe(1);
    expect(patternPieces('abcdefghij')).toBe(1);
    expect(patternPieces('qwerty')).toBe(1);
    expect(patternPieces('x7gq2mpz9lwr4tvb')).toBe(16);
  });

  it('a pattern inside a real passphrase is fine', () => {
    expect(checkPassword('abc ocean violet lamp')).toEqual([]);
    expect(checkPassword('mountain river 1984 song')).toEqual([]);
  });
});

describe('speed and purity', () => {
  it('a thousand checks of 72-character passwords take well under a second', () => {
    const inputs = Array.from({ length: 1000 }, (_, i) => `${ofLength(68)}${String(i).padStart(4, '0')}`);
    checkPassword('warm up the set once');
    const t0 = Date.now();
    for (const p of inputs) checkPassword(p, EMAIL);
    expect(Date.now() - t0).toBeLessThan(1000);
  });

  it('the same input always gives the same answer (nothing is remembered between calls)', () => {
    const a = checkPassword('kaisipkaisipkaisip', EMAIL);
    checkPassword('ocean violet lamp seven', EMAIL);
    expect(checkPassword('kaisipkaisipkaisip', EMAIL)).toEqual(a);
  });
});
