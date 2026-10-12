/**
 * Uplift Phase 8: the exam-content leak guard (engine/leakGuard.ts), on the
 * REAL bundled bank (spec PHASE6_8.md §4.7, B6):
 * - every stem of 12 or more words pasted verbatim is blocked;
 * - with 1 word in every 8 replaced, at least 95% are still blocked;
 * - a whole question pasted with "A) … B) …" options is blocked;
 * - none of the 60 ordinary posts is blocked or held;
 * - study-note paragraphs are blocked at most 2% of the time;
 * - zero-width characters, full-width letters and Cyrillic look-alikes
 *   don't get past it;
 * - the fingerprint is numbers only, and the phone builds it quickly.
 */
import { getAllQuestions } from '../content/loader';
import { noteSubtopics } from '../content/notes';
import {
  buildFingerprint,
  fnv1a,
  leakItem,
  leakMatch,
  recallScore,
  RECALL_HOLD,
  shingleHashes,
  tokens,
  type Fingerprint,
} from '../engine/leakGuard';
import { createRng } from '../engine/random';
import benign from './fixtures/board-benign.json';

const questions = getAllQuestions('cisa');
let fp: Fingerprint;
let buildMs = 0;
beforeAll(() => {
  const t = Date.now();
  fp = buildFingerprint(questions.map(leakItem));
  buildMs = Date.now() - t;
});

const ZW = String.fromCharCode(0x200b);
/** Full-width Latin letters (U+FF21…) for A–Z / a–z. */
const fullWidth = (s: string) => s.replace(/[A-Za-z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xfee0));
/** Cyrillic а, е, о, р, с for Latin a, e, o, p, c. */
const CYR: Record<string, number> = { a: 0x430, e: 0x435, o: 0x43e, p: 0x440, c: 0x441 };
const cyrillic = (s: string) => s.replace(/[aeopc]/g, (c) => String.fromCharCode(CYR[c]));

describe('hashing and tokens', () => {
  it('FNV-1a 32 matches known values, and shingle hashes are fnv1a of the joined words', () => {
    expect(fnv1a('')).toBe(0x811c9dc5);
    expect(fnv1a('a')).toBe(0xe40c292c);
    expect(fnv1a('foobar')).toBe(0xbf9cf968);
    const words = ['which', 'control', 'most', 'reduces', 'the', 'risk'];
    expect([...shingleHashes(words, 5)]).toEqual([fnv1a('which control most reduces the'), fnv1a('control most reduces the risk')]);
    expect([...shingleHashes(words.slice(0, 2), 3)]).toEqual([]);
  });

  it('tokens fold case, quotes, option markers and template letters', () => {
    expect(tokens('A) The “BEST” answer\nb. is {{C}}')).toEqual(['the', 'best', 'answer', 'is', 'c']);
    expect(tokens(`Seg${ZW}regation of DUTIES`)).toEqual(['segregation', 'of', 'duties']);
    expect(tokens(fullWidth('Audit Charter'))).toEqual(['audit', 'charter']);
    expect(tokens(cyrillic('approval process'))).toEqual(['approval', 'process']);
  });
});

describe('blocking near-verbatim bank text (B6)', () => {
  const long = questions.filter((q) => tokens(q.stem).length >= 12);

  it('blocks every stem of 12 or more words pasted verbatim', () => {
    expect(long.length).toBeGreaterThan(0);
    const missed = long.filter((q) => leakMatch(fp, q.stem).verdict !== 'block').map((q) => q.id);
    expect(missed).toEqual([]);
  });

  it.each([1, 7, 42])('still blocks at least 95%% with 1 word in every 8 replaced (seed %i)', (seed) => {
    const rng = createRng(seed);
    let blocked = 0;
    for (const q of long) {
      const w = q.stem.split(/\s+/);
      for (let b = 0; b < w.length; b += 8) w[b + Math.floor(rng() * Math.min(8, w.length - b))] = `zq${b}x`;
      if (leakMatch(fp, w.join(' ')).verdict === 'block') blocked++;
    }
    expect(blocked / long.length).toBeGreaterThanOrEqual(0.95);
  });

  it('blocks a whole question pasted with its A) … D) options, and names that question', () => {
    const q = questions.find((x) => x.id === 'd4_011') ?? questions[0];
    const paste = `${q.stem}\nA) ${q.options.A}\nB) ${q.options.B}\nC) ${q.options.C}\nD) ${q.options.D}`;
    const v = leakMatch(fp, paste);
    expect(v.verdict).toBe('block');
    expect(questions[v.itemIndex!].id).toBe(q.id);
    // On one line, with the options run together, too.
    expect(leakMatch(fp, paste.replace(/\n/g, ' ')).verdict).toBe('block');
  });

  it('blocks a pasted explanation or tip as well', () => {
    const withLongTip = questions.filter((q) => tokens(q.explanation).length >= 20).slice(0, 50);
    for (const q of withLongTip) expect(leakMatch(fp, q.explanation).verdict).toBe('block');
  });

  it('Unicode tricks still match: zero-width characters, full-width letters, Cyrillic look-alikes', () => {
    const stems = long.slice(0, 40).map((q) => q.stem);
    for (const s of stems) {
      expect(leakMatch(fp, s.split('').join(ZW)).verdict).toBe('block');
      expect(leakMatch(fp, fullWidth(s)).verdict).toBe('block');
      expect(leakMatch(fp, cyrillic(s)).verdict).toBe('block');
    }
  });

  it('blocks none of the 60 ordinary posts, and holds none of them', () => {
    const posts = benign.posts as string[];
    expect(posts).toHaveLength(60);
    expect(posts.filter((p) => leakMatch(fp, p).verdict === 'block')).toEqual([]);
    expect(posts.filter((p) => recallScore(p, false) >= RECALL_HOLD)).toEqual([]);
  });

  it('blocks at most 2% of study-note paragraphs', () => {
    let paras = 0;
    let blocked = 0;
    for (const s of noteSubtopics('cisa')) {
      const parts = [s.definition, s.whyItMatters, ...s.howItWorks, s.example, s.isacaRule, ...s.examTraps.map((t) => `${t.trap} ${t.why}`), s.analogy ?? ''];
      for (const p of parts) {
        if (!p || tokens(p).length < 8) continue;
        paras++;
        if (leakMatch(fp, p).verdict === 'block') blocked++;
      }
    }
    expect(paras).toBeGreaterThan(100);
    expect(blocked / paras).toBeLessThanOrEqual(0.02);
  });

  it('short or generic exam phrasing is never blocked on its own', () => {
    for (const text of ['Which of the following is the BEST way to study?', 'What should the IS auditor do FIRST?', 'the audit committee', '']) {
      expect(leakMatch(fp, text).verdict).toBe('ok');
    }
  });
});

describe('the fingerprint', () => {
  it('holds numbers only (no text), sorted for lookups', () => {
    for (const p of [fp.full, fp.stem]) {
      expect(p.hashes).toBeInstanceOf(Uint32Array);
      expect(p.items).toBeInstanceOf(Uint32Array);
      expect(p.common).toBeInstanceOf(Uint32Array);
      for (let i = 1; i < p.hashes.length; i += 997) expect(p.hashes[i - 1]).toBeLessThanOrEqual(p.hashes[i]);
    }
    expect(JSON.stringify(Object.keys(fp))).toBe('["full","stem"]');
  });

  it('is built quickly on the phone (time logged for CI)', () => {
    // A generous bound so a slow CI machine doesn't flake; the log line is the number to watch.
    console.log(`leak guard fingerprint built in ${buildMs} ms`);
    expect(buildMs).toBeLessThan(5000);
  });

  it('the same items always give the same fingerprint (phone and server agree)', () => {
    const again = buildFingerprint(questions.slice(0, 50).map(leakItem));
    const once = buildFingerprint(questions.slice(0, 50).map(leakItem));
    expect([...again.full.hashes]).toEqual([...once.full.hashes]);
    expect([...again.stem.items]).toEqual([...once.stem.items]);
  });
});

describe('recall score (support.md §10.3)', () => {
  it.each([
    ['On my exam I got one about the audit charter approval', false, 3],
    ['In the exam I saw a question on RTO and RPO', false, 3],
    ['Anyone have the CISA dumps pdf?', false, 3],
    ['Selling real exam questions, message me', false, 3],
    ['Which of the following is the BEST control?\nA) one\nB) two\nC) three\nD) four', false, 3],
    ['Which of the following is the BEST control?\nA) one\nB) two\nC) three\nD) four', true, 1],
    ['I keep confusing a memory dump with a core dump in forensics.', false, 0],
    ['Which of the following is BEST? I never know how to choose.', false, 1],
  ])('%j (item linked: %s) scores %i', (text, ref, score) => {
    expect(recallScore(text, ref)).toBe(score);
  });

  it('look-alike letters and odd spacing do not hide recall language', () => {
    expect(recallScore(cyrillic('on my exam I got one about BCP'), false)).toBeGreaterThanOrEqual(RECALL_HOLD);
    expect(recallScore(`brain${ZW}dump for sale`, false)).toBeGreaterThanOrEqual(RECALL_HOLD);
  });
});
