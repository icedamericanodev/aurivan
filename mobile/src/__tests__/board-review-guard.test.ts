/**
 * The board's shared text rules after the Phase 8 review (fix round, 12 Oct):
 * the code review's guard repros (crp8-guard, crp8-uni), the security
 * review's leak-guard variants (SEC S5, §F), QA BUG-5 and CR N6 / N7, turned
 * into tests of the FIXED behaviour. Each failed on b36dfda.
 *
 * Plain English:
 * - invisible "tag" characters can't hide a word or a pasted question;
 * - the server's extra "squashed letters" check catches a pasted question
 *   with no spaces, CamelCase, leetspeak, look-alike letters or a dot inside
 *   each word, while ordinary posts stay untouched (0 of 60) and study-note
 *   sentences rarely trip it (under 1.5%);
 * - a pasted question with A–D options is held even when it links an item;
 * - "exam.To be honest", "ISO 27001 2022" and "like the real exam
 *   questions?" are ordinary words, not a link, a phone number or recall;
 * - board names: look-alikes and every ISACA mark are reserved, but
 *   "Badminton Fan" is fine.
 * The leak guard never says what it matched or how big the bank is.
 */
import { getAllQuestions } from '../content/loader';
import { buildFingerprint, leakItem, leakMatch, RECALL_HOLD, recallScore, talksAboutAnswer, tokens } from '../engine/leakGuard';
import { checkHandle, moderateText, normalizeText } from '../engine/moderation';
import benign from './fixtures/board-benign.json';

const TAG = '\u{E0020}';
const qs = getAllQuestions('cisa');
const items = qs.map(leakItem);
/** The phone's fingerprint (words only) and the server's (with the squashed-letters check). */
const phone = buildFingerprint(items);
const server = buildFingerprint(items, { squash: true });
const stems = qs.map((q) => q.stem).filter((s) => tokens(s).length >= 12);
const blockedShare = (fp: typeof server, f: (s: string) => string) => stems.filter((s) => leakMatch(fp, normalizeText(f(s))).verdict === 'block').length / stems.length;

describe('Unicode tag characters (CR B6)', () => {
  it('are removed before matching, so a word or a pasted question still matches', () => {
    expect(tokens(`au${TAG}dit`)).toEqual(['audit']);
    expect(normalizeText(`a\u{E0001}b${TAG}c\u{E007F}d`)).toBe('abcd');
    const q = qs[10].stem;
    const sneaky = q
      .split(' ')
      .map((w) => (w.length > 3 ? w.slice(0, 2) + TAG + w.slice(2) : w))
      .join(' ');
    expect(leakMatch(phone, sneaky).verdict).toBe('block');
    expect(moderateText(`fu${TAG}ck you`, { newMember: false })).toEqual({ verdict: 'reject', reason: 'words' });
    expect(moderateText('fu⁣ck you', { newMember: false })).toEqual({ verdict: 'reject', reason: 'words' });
  });
  it('more look-alikes fold (Armenian, small capitals)', () => {
    expect(moderateText('fսck you', { newMember: false }).verdict).toBe('reject');
    expect(moderateText('ꜰᴜᴄᴋ you', { newMember: false }).verdict).toBe('reject');
  });
});

describe('the server’s squashed-letters check (SEC S5, measured on the real bank)', () => {
  it.each([
    ['no spaces', (s: string) => s.replace(/\s+/g, '')],
    ['CamelCase', (s: string) => s.split(/\s+/).map((w) => w[0].toUpperCase() + w.slice(1)).join('')],
    ['leetspeak', (s: string) => s.replace(/e/g, '3').replace(/a/g, '4').replace(/o/g, '0')],
    ['Armenian look-alikes', (s: string) => s.replace(/o/g, 'օ').replace(/u/g, 'ս').replace(/n/g, 'ո')],
    ['a dot inside each word', (s: string) => s.split(/\s+/).map((w) => (w.length > 3 ? `${w[0]}.${w.slice(1)}` : w)).join(' ')],
  ])('%s: almost every stem is blocked on the server', (_name, f) => {
    expect(blockedShare(server, f)).toBeGreaterThanOrEqual(0.99);
  });
  it('a verbatim paste is blocked on the phone and the server', () => {
    expect(blockedShare(phone, (s) => s)).toBe(1);
    expect(blockedShare(server, (s) => s)).toBe(1);
  });
  it('ordinary posts are never blocked (0 of the 60), with the extra check', () => {
    const posts = (benign as { posts: string[] }).posts;
    expect(posts.length).toBe(60);
    expect(posts.filter((p) => leakMatch(server, p).verdict === 'block')).toEqual([]);
  });
  it('study-note sentences rarely trip it (at most 1.5%), and no more than the word check alone', () => {
    const notes = require('../content/generated/cisa/notes.json') as { domains: unknown };
    const strings: string[] = [];
    const walk = (x: unknown) => {
      if (typeof x === 'string') {
        if (tokens(x).length >= 8) strings.push(x);
      } else if (Array.isArray(x)) x.forEach(walk);
      else if (x && typeof x === 'object') Object.values(x).forEach(walk);
    };
    walk(notes.domains);
    expect(strings.length).toBeGreaterThan(1000);
    const words = strings.filter((s) => leakMatch(phone, s).verdict === 'block').length;
    const both = strings.filter((s) => leakMatch(server, s).verdict === 'block').length;
    expect(both / strings.length).toBeLessThanOrEqual(0.015);
    expect(both).toBe(words);
  });
  it('never says what it matched beyond a position, nor how big the bank is', () => {
    const v = leakMatch(server, stems[0].replace(/\s+/g, ''));
    expect(Object.keys(v).sort()).toEqual(['hits', 'itemIndex', 'verdict']);
    expect(JSON.stringify(v)).not.toContain(String(qs.length));
  });
});

describe('recall (SEC S5, CR N6)', () => {
  const pasted = 'An IS auditor finds the backup tapes are stored in the same building as the data center. What should the auditor recommend FIRST?\nA) one thing\nB) two thing\nC) three thing\nD) four thing';
  it('a pasted question with A–D options is held, linked item or not', () => {
    expect(recallScore(pasted, null)).toBeGreaterThanOrEqual(RECALL_HOLD);
    expect(recallScore(pasted, 'q:d1_001')).toBeGreaterThanOrEqual(RECALL_HOLD);
    expect(recallScore(pasted, 'app:timer')).toBeGreaterThanOrEqual(RECALL_HOLD);
  });
  it('a post about one of our questions (no option list) still gets the discount', () => {
    expect(recallScore('On my exam I got one like this one, was it the board?', 'q:d1_001')).toBeLessThan(RECALL_HOLD);
  });
  it.each([
    'How long should I study? I want to do well on the exam and there are 5 domains.',
    'Are the practice questions like the real exam questions?',
    'Do the mocks feel like actual questions on the test?',
    'Tips for the exam day: on the exam I was so nervous, any advice?',
  ])('an everyday question isn’t recall: "%s"', (text) => {
    expect(recallScore(text, null)).toBeLessThan(RECALL_HOLD);
    expect(moderateText(text, { newMember: true })).toEqual({ verdict: 'ok' });
  });
  it.each([
    'On my exam I got one about who approves the audit charter.',
    'Does anyone have the real exam questions? Please share.',
    'Selling the actual exam questions, message me.',
  ])('real recall or a dump offer still is: "%s"', (text) => {
    expect(recallScore(text, null)).toBeGreaterThanOrEqual(RECALL_HOLD);
  });
});

describe('links and phone numbers (QA BUG-5, CR N7, SEC S7)', () => {
  it.each([
    'Great app.To be honest the timer is too short',
    'I logged in.In the mock the timer froze',
    'Thanks for the update.Me and my study group love it',
    'I failed the exam.To be honest the BCP part was hard.',
    'Thanks.Co-sourcing questions are tricky.',
    'The review manual.pdf has it',
    'ISO 27001 2022 changed annex A',
    'NIST 800-53 800-30 are both referenced',
    'Is the memory dump topic in domain 5?',
  ])('ordinary words, not a link or a phone number: "%s"', (text) => {
    expect(moderateText(text, { newMember: true })).toEqual({ verdict: 'ok' });
  });
  it('any web address is a link for a new member, whatever its ending', () => {
    for (const t of ['see examhelp.shop for more', 'try certpass.vip today', 'at examhelp dot com', 'go to WWW.EXAMHELP.ORG', 'ping me at site.co.uk']) {
      expect(moderateText(t, { newMember: true })).toEqual({ verdict: 'reject', reason: 'links' });
    }
  });
  it('a dump site is refused for everyone, whatever its ending', () => {
    expect(moderateText('real CISA questions at certdumps.vip', { newMember: false })).toEqual({ verdict: 'reject', reason: 'links' });
  });
  it('a real phone number is still held', () => {
    expect(moderateText('my number is +44 7700 900123', { newMember: false })).toEqual({ verdict: 'hold', reason: 'hold_words' });
  });
});

describe('hold words (compliance 8)', () => {
  it('claims to speak for ISACA wait for a person', () => {
    expect(moderateText('I am ISACA official support for this exam', { newMember: false })).toEqual({ verdict: 'hold', reason: 'hold_words' });
    expect(moderateText('An official ISACA statement says so', { newMember: false })).toEqual({ verdict: 'hold', reason: 'hold_words' });
  });
  it('a dump offer waits; a memory or core dump doesn’t', () => {
    expect(moderateText('I have a dump for the exam', { newMember: false })).toEqual({ verdict: 'hold', reason: 'hold_words' });
    expect(moderateText('A core dump or a heap dump can hold passwords', { newMember: false })).toEqual({ verdict: 'ok' });
  });
});

describe('a post that talks about a practice question’s answer is folded (CR N12)', () => {
  it('when it links one of our questions and talks about its answer', () => {
    expect(talksAboutAnswer('The answer is B, but the explanation says C.', 'q:d3_041')).toBe(true);
    expect(talksAboutAnswer('Option C is correct here, surely?', null)).toBe(true);
    expect(talksAboutAnswer('Could the timer pause when I lock my phone?', null)).toBe(false);
  });
});

describe('board names (SEC B1 d, compliance 8, CR nit 8)', () => {
  it.each(['AURlVAN Helper', 'Cobit Fan', 'AAIA Pro', 'CDPSE Learner', 'Team Rocket', 'Staff Pick'])('"%s" is reserved', (h) => {
    expect(checkHandle(h)).toBe('reserved');
  });
  it.each(['Badminton Fan', 'Distaff Pine', 'Steam Punk', 'Modest Pine 4', 'Quiet Cedar 214'])('"%s" is fine', (h) => {
    expect(checkHandle(h)).toBeNull();
  });
});
