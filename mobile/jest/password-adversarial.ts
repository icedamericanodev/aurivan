/**
 * Inputs built to make the password rules slow (the timing tests use them).
 *
 * The rules look at every stretch of the password, so text that repeats
 * itself (runs, copies, mirrors, the same word again) is where a careless
 * loop costs the most. Each entry is [name, password]. Everything here is up
 * to 72 characters, the most the sign-in server stores; the 72 emoji are
 * longer than 72 bytes and only show that the size check comes first.
 */

/** A small seeded random number generator (mulberry32), so the list never changes. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `unit` written again and again, cut to 72 characters. */
const fill = (unit: string) => unit.repeat(Math.ceil(72 / unit.length)).slice(0, 72);

function build(): [string, string][] {
  const out: [string, string][] = [];
  // Repeats of 1, 2, 3, 5 and 7 characters (letters, digits and symbols).
  for (const unit of ['a', 'Z', '1', '!', ' ', 'ab', '12', 'a1', 'abc', 'xyz', 'abcde', '13579', 'abcdefg', 'pa55wrd']) {
    out.push([`repeat ${JSON.stringify(unit)}`, fill(unit)]);
  }
  // Alternating case.
  for (const unit of ['aA', 'Aa', 'PaSsWoRd', 'pAsSwOrD', 'MaYa', 'aBcDeFgH']) out.push([`case ${unit}`, fill(unit)]);
  // Runs of characters that also read as letters (4 = a, @ = a, 1 = i or l, 0 = o, 3 = e, 5 = s, $ = s).
  for (const unit of ['4', '@', '0', '3', '5', '$', '|', '1l', '4@', '1!|', 'p4ssw0rd', 'P@$$w0rd', 'h3ll0', 'm4y4']) {
    out.push([`leet ${unit}`, fill(unit)]);
  }
  // Names written again and again (the CTX name and common Filipino and English names).
  for (const unit of ['mayasantos', 'Maya Santos ', 'santosmaya', 'maria', 'juandelacruz', 'jose', 'MaryJane', 'angel']) {
    out.push([`names ${unit.trim()}`, fill(unit)]);
  }
  // Near-repeats: one different character at each position.
  for (const [base, odd] of [['a', 'b'], ['ab', 'c'], ['password', 'x']]) {
    const t = fill(base);
    for (let i = 0; i < 72; i++) out.push([`near ${base} @${i}`, t.slice(0, i) + odd + t.slice(i + 1)]);
  }
  // Periodic near-repeats: a unit with one different character, written again and again
  // (copies of earlier text everywhere, but no single run).
  for (const unit of ['441', 'aaaa1', 'aab', 'abab1', '1112', 'xxxxxxy', 'aaaaaaaaaab', 'passwordx', 'maya1', 'Aa1!']) {
    out.push([`periodic ${unit}`, fill(unit)]);
  }
  // Long keyboard walks.
  for (const walk of [
    'qwertyuiopasdfghjklzxcvbnm',
    'qwertyuiop[]asdfghjkl;zxcvbnm,./',
    '1qaz2wsx3edc4rfv5tgb6yhn7ujm8ik9ol0p',
    '1q2w3e4r5t6y7u8i9o0p',
    'zaq1xsw2cde3vfr4bgt5nhy6mju7',
    '`1234567890-=',
    'poiuytrewqlkjhgfdsamnbvcxz',
    '!@#$%^&*()_+',
  ]) {
    out.push([`walk ${walk.slice(0, 8)}`, fill(walk)]);
  }
  // Emoji: 72 different ones (too long), and the 18 that fit in 72 bytes.
  const emoji = Array.from({ length: 72 }, (_, i) => String.fromCodePoint(0x1f600 + i)).join('');
  out.push(['emoji 72', emoji], ['emoji 18', Array.from(emoji).slice(0, 18).join('')]);
  // Random 72-character strings: printable ASCII, letters only, and lowercase only.
  const rnd = seeded(20261128);
  const pick = (alphabet: string) => Array.from({ length: 72 }, () => alphabet[Math.floor(rnd() * alphabet.length)]).join('');
  let ascii = '';
  for (let c = 33; c < 127; c++) ascii += String.fromCharCode(c);
  for (let i = 0; i < 8; i++) out.push([`random ascii ${i}`, pick(ascii)]);
  for (let i = 0; i < 4; i++) out.push([`random letters ${i}`, pick('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')]);
  for (let i = 0; i < 4; i++) out.push([`random lower ${i}`, pick('abcdefghijklmnopqrstuvwxyz')]);
  return out;
}

export const ADVERSARIAL: readonly [string, string][] = build();
