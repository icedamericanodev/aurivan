/**
 * Round 4 (28 Nov 2026, evening): the 12-to-14-character, all-four-types space
 * the owner's new rule opens (lowercase, uppercase, number and symbol, 12+).
 * Not a test file (outside __tests__). Written BEFORE the rules were changed
 * for this round.
 *
 * - R4_HOSTILE: predictable passwords that meet the composition rule, built the
 *   way people meet it: a capitalised common password, word, name, place,
 *   brand, season or keyboard walk, plus a year, a short number and a symbol;
 *   letter-for-number swaps; the app's and exam names; the account's own
 *   words; a word typed twice. 12 to 14 characters, all four types.
 * - The split is by VOCABULARY, not by index: every family has two disjoint
 *   word pools. Pool A builds the TUNING half (the rules may be tuned on it);
 *   pool B builds the HELD-OUT half (report-only: never tuned on). The
 *   patterns (suffixes, swaps) are shared, so the held-out half measures new
 *   words in known shapes, not new shapes. Both pools were written by the same
 *   author as the rules (no independent tester this round): a weaker measure
 *   than round 3's.
 * - R4_GOOD: passwords a learner might choose under the new rule, 12 to 14
 *   characters with all four types: three short unrelated words with a
 *   number and a symbol, and password-manager output.
 * - R4_CONTEXT: the account the context family is built from.
 */

export const R4_CONTEXT = { email: 'maya.santos1990@example.com', names: ['Maya Santos'] };

type Pools = { a: readonly string[]; b: readonly string[] };

/** The families and their two pools (lower case; the patterns add the capital). */
export const R4_FAMILIES: Readonly<Record<string, Pools>> = {
  common: {
    a: ['password', 'sunshine', 'iloveyou', 'princess', 'football', 'welcome', 'dragon', 'monkey', 'shadow', 'master', 'superman', 'baseball', 'starwars', 'freedom', 'whatever', 'qwerty'],
    b: ['letmein', 'charlie', 'jordan', 'michael', 'buster', 'soccer', 'hunter', 'ranger', 'harley', 'thomas', 'robert', 'killer', 'pepper', 'ginger', 'cookie', 'flower'],
  },
  word: {
    a: ['elephant', 'mountain', 'butterfly', 'chocolate', 'computer', 'keyboard', 'sandwich', 'umbrella', 'notebook', 'airplane', 'blanket', 'diamond'],
    b: ['pineapple', 'dinosaur', 'kangaroo', 'telephone', 'waterfall', 'sunflower', 'lighthouse', 'adventure', 'treasure', 'tomato', 'penguin', 'volcano'],
  },
  name: {
    a: ['jennifer', 'angelica', 'christian', 'jasmine', 'patrick', 'kimberly', 'joshua', 'mariel', 'rosalie', 'gabriel', 'nicole', 'carlo'],
    b: ['jonathan', 'michelle', 'raymond', 'kristine', 'angeline', 'jerome', 'maricel', 'honeylyn', 'reynaldo', 'bianca', 'marvin', 'janine'],
  },
  walk: {
    a: ['qwerty', 'asdfgh', 'zxcvbn', 'qazwsx', '1qaz2wsx', 'qwertyuiop', 'asdf', 'zxcv'],
    b: ['asdfghjkl', 'zaq12wsx', 'poiuyt', 'mnbvcx', '1q2w3e4r', 'qwer', 'lkjhgf', 'wasd'],
  },
  sequence: {
    a: ['abcd', 'abcde', 'abc', 'abcdefg'],
    b: ['abcdef', 'xyz', 'abcdefgh', 'pqrs'],
  },
  service: {
    a: ['kaisip', 'cisa', 'isaca', 'cisaexam', 'kaisippass', 'isacacisa'],
    b: ['crisc', 'aaia', 'cpa', 'criscexam', 'cisapass', 'kaisipapp'],
  },
  account: {
    a: ['maya', 'santos', 'mayasantos', 'example'],
    b: ['santosmaya', 'msantos', 'mayas', 'mayamaya'],
  },
  season: {
    a: ['summer', 'winter', 'january', 'december', 'hunyo', 'monday'],
    b: ['spring', 'autumn', 'october', 'pasko', 'marso', 'friday'],
  },
  place: {
    a: ['barcelona', 'manila', 'jollibee', 'samsung', 'lakers', 'chelsea', 'iphone'],
    b: ['liverpool', 'cebu', 'toyota', 'arsenal', 'boracay', 'davao', 'android'],
  },
  filipino: {
    a: ['mahalkita', 'mahalko', 'pogiako', 'iloveu', 'bestfriend'],
    b: ['salamat', 'maganda', 'ingat', 'pangit', 'kaibigan'],
  },
  pair: {
    a: ['bluesky', 'sweetheart', 'happyday', 'lovelove', 'bigdaddy'],
    b: ['redrose', 'bigboss', 'goodluck', 'sweetpea', 'babygirl'],
  },
};

/** How people meet "a number and a symbol": what goes after (or around) the word. */
const SUFFIXES = ['2026!', '123!', '@2026', '#1234', '1990!', '!2026', '12345!', '2026@#', '0312!', '143!', '_2026', '1!', '!!2026', '$123'];
const LEET: Record<string, string> = { a: '@', o: '0', e: '3', i: '1', s: '$' };

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
const allTypes = (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[!-/:-@[-`{-~]/.test(p);
const fits = (p: string) => p.length >= 12 && p.length <= 14 && allTypes(p);

/** Every shape built from one word: capital first, swaps, the word twice, a symbol first. */
function shapes(w: string): string[] {
  const out: string[] = [];
  const leet = cap(Array.from(w, (c) => LEET[c] ?? c).join(''));
  for (const s of SUFFIXES) {
    out.push(cap(w) + s, leet + s, w.toUpperCase().slice(0, 1) + w.slice(1, -1) + w.slice(-1).toUpperCase() + s);
    if (w.length <= 5) out.push(cap(w) + cap(w) + s, cap(w) + s + cap(w));
    // Too short with one suffix: people add more numbers.
    out.push(cap(w) + s + '12', cap(w) + '2026' + s);
  }
  out.push('!' + cap(w) + '2026', '#' + cap(w) + '123', '1' + cap(w) + '2026!');
  return out;
}

function build(pool: 'a' | 'b'): [string, string][] {
  const seen = new Set<string>();
  const out: [string, string][] = [];
  for (const [family, pools] of Object.entries(R4_FAMILIES)) {
    for (const w of pools[pool]) {
      for (const p of shapes(w)) {
        if (!fits(p) || seen.has(p)) continue;
        seen.add(p);
        out.push([family, p]);
      }
    }
  }
  return out;
}

/** [family, password]: the tuning half (pool A words). */
export const R4_TUNING: readonly [string, string][] = build('a');
/** [family, password]: the held-out half (pool B words). Report-only: never tune on it. */
export const R4_HELD_OUT: readonly [string, string][] = build('b');

/** A small seeded random number generator (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Short ordinary words (3 to 5 letters) a learner might string together. */
const SHORT_WORDS = [
  'fig', 'lamp', 'crow', 'moss', 'tea', 'oak', 'kite', 'drum', 'pear', 'wolf', 'jam', 'hut', 'reef', 'mule', 'plum', 'owl', 'yak', 'bolt', 'dune', 'fern',
  'gust', 'helm', 'ink', 'jade', 'knot', 'loom', 'mint', 'nook', 'opal', 'quay', 'rust', 'silk', 'tusk', 'urn', 'vase', 'wick', 'yarn', 'zinc', 'brim', 'cove',
];
const SYMBOLS = '!#$%&*+-=?@^_~';

function goodBuild(): [string, string][] {
  const rnd = seeded(20261128);
  const pick = <T>(l: readonly T[]) => l[Math.floor(rnd() * l.length)];
  const out: [string, string][] = [];
  // Three different short words, one capital, a number and a symbol somewhere.
  while (out.length < 120) {
    const ws = [pick(SHORT_WORDS), pick(SHORT_WORDS), pick(SHORT_WORDS)];
    if (new Set(ws).size < 3) continue;
    const k = Math.floor(rnd() * 3);
    ws[k] = cap(ws[k]);
    const sep = [pick([...SYMBOLS]), String(Math.floor(rnd() * 10))];
    if (rnd() < 0.5) sep.reverse();
    const p = ws[0] + sep[0] + ws[1] + sep[1] + ws[2];
    if (fits(p)) out.push(['three words', p]);
  }
  // Password-manager output: 12 to 14 characters, all four types.
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = lower + upper + digits + SYMBOLS;
  while (out.length < 240) {
    const n = 12 + Math.floor(rnd() * 3);
    const p = Array.from({ length: n }, () => pick([...all])).join('');
    if (fits(p)) out.push(['generated', p]);
  }
  return out;
}

/** [kind, password]: must pass. */
export const R4_GOOD: readonly [string, string][] = goodBuild();
