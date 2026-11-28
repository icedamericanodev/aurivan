/**
 * Qualifier case (CIA_BANK_PLAN.md section 6d, owner decision 28 Nov 2026).
 *
 * Plain English: The IIA writes the qualifier in lowercase ("which action
 * should the internal auditor take first?"), ISACA in capitals ("FIRST"). A
 * course with `qualifierCase: 'lowercase'` must still find the word, but only
 * in the question sentence, so a "most" in a fact sentence is never picked.
 * Every course without the field (CISA) must read exactly as before.
 */
import fs from 'fs';
import path from 'path';
import type { PackQuestion } from '../content/types';
import {
  acceptedAsks,
  findPriority,
  LEAST_MEANING,
  fitWord,
  meaningFor,
  priorityPool,
  priorityWord,
  priorityWritten,
  qualifierCopy,
  questionSpan,
  shownWord,
  PRIORITY_MEANING,
  ASK_MEANING,
  type PriorityWord,
} from '../engine/games/priorityLens';
import { dnaCopy, dnaCue, DNA_COPY } from '../engine/mistakeDNA';
import { pickMiss, signpostMiss } from '../engine/games/recap';
import { GAMES, isPlayable } from '../engine/games/registry';
import { badgeDef, badgeRule } from '../engine/milestones';
import { PATTERN_COPY, patternCopy, patternsOf, slipCoach } from '../engine/slipCoach';
import { EVE_REMINDER, eveReminders } from '../engine/eveReminders';
import { getAllQuestions } from '../content/loader';

// ---- The rule as it was before this change, kept here to prove CISA is unchanged. ----
function oldPriorityWord(stem: string): PriorityWord | null {
  let found: PriorityWord | null = null;
  for (const m of stem.matchAll(/\b(FIRST|BEST|MOST|PRIMARY|GREATEST)\b/g)) found = m[1] as PriorityWord;
  return found;
}
function oldLastWholeWordIndex(text: string, word: string): number {
  const isWordChar = (ch: string | undefined) => ch !== undefined && /[A-Za-z0-9_]/.test(ch);
  let at = text.lastIndexOf(word);
  while (at >= 0) {
    if (!isWordChar(text[at - 1]) && !isWordChar(text[at + word.length])) return at;
    at = at === 0 ? -1 : text.lastIndexOf(word, at - 1);
  }
  return -1;
}
function oldFitWord(stem: string): string | null {
  if (oldPriorityWord(stem) !== 'MOST') return null;
  const m = /^\s+(appropriate|appropriately|suitable)\b/i.exec(stem.slice(oldLastWholeWordIndex(stem, 'MOST') + 4));
  return m ? m[1].toLowerCase() : null;
}
function oldMeaningFor(stem: string): string {
  const word = oldPriorityWord(stem);
  if (!word) return '';
  const fit = oldFitWord(stem);
  return fit ? `MOST ${fit} works like BEST. ${ASK_MEANING['best-fit']}` : PRIORITY_MEANING[word];
}

const q = (stem: string): PackQuestion => ({
  id: 'x1',
  certId: 'cia1',
  domainId: '1',
  subtopic: 's',
  difficulty: 'application',
  stem,
  options: { A: 'a.', B: 'b.', C: 'c.', D: 'd.' },
  correct: 'C',
  explanation: 'Why. More.',
  wrongExplanations: { A: 'No.', B: 'No.', D: 'No.' },
  tips: [],
  related: [],
});

describe('a lowercase course finds its qualifier in the question sentence', () => {
  const stem = 'An internal auditor finds that a payroll change was approved by its own requester. Which action should the internal auditor take first?';

  it('finds "first" in an IIA-style stem', () => {
    const hit = findPriority(stem, 'lowercase');
    expect(hit).toEqual({ word: 'FIRST', written: 'first', index: stem.lastIndexOf('first') });
    expect(priorityWord(stem, 'lowercase')).toBe('FIRST');
    expect(priorityWritten(stem, 'lowercase')).toBe('first');
    expect(acceptedAsks(stem, 'lowercase')).toEqual(['sequence']);
    expect(meaningFor(stem, 'lowercase')).toBe(PRIORITY_MEANING.FIRST);
  });

  it('never picks a "most" in a fact sentence', () => {
    const fact = 'Most branches of a retailer close their tills by hand. Which control should the internal auditor test first?';
    expect(findPriority(fact, 'lowercase')?.written).toBe('first');
    // No qualifier in the question at all: nothing, even though a fact sentence says "most".
    const none = 'Most staff at a bank work remotely, and the best branch has no badge reader. Which statement is true regarding remote access?';
    expect(findPriority(none, 'lowercase')).toBeNull();
    // An earlier "first" in a fact sentence does not count either.
    const early = 'In its first year, a lender adopted a risk framework. Which gap is the most significant?';
    expect(findPriority(early, 'lowercase')).toMatchObject({ word: 'MOST', written: 'most' });
  });

  it('reads the clause ending with "?" when a sentence follows it', () => {
    const stem2 = 'A CAE reviews the plan. Which risk is greatest? Assume the board agreed.';
    expect(stem2.slice(questionSpan(stem2).start, questionSpan(stem2).end)).toBe('Which risk is greatest?');
    expect(findPriority(stem2, 'lowercase')?.word).toBe('GREATEST');
  });

  it('"most appropriate" coaches like "best", in quotes', () => {
    const fit = 'An audit committee asks about a new vendor. Which response is most appropriate?';
    expect(fitWord(fit, 'lowercase')).toBe('appropriate');
    expect(acceptedAsks(fit, 'lowercase')).toEqual(['best-fit', 'degree']);
    expect(meaningFor(fit, 'lowercase')).toBe(`“most appropriate” works like “best”. ${ASK_MEANING['best-fit']}`);
  });

  it('still finds a capitalised word, as before (a bank mid-restyle)', () => {
    const caps = 'Most staff work remotely. Which control is MOST effective?';
    expect(findPriority(caps, 'lowercase')).toEqual(findPriority(caps));
    expect(meaningFor('Which response is MOST appropriate?', 'lowercase')).toBe(oldMeaningFor('Which response is MOST appropriate?'));
  });

  it('a capitals course ignores lowercase words, as before', () => {
    expect(findPriority(stem)).toBeNull();
    expect(priorityPool([q(stem)])).toEqual([]);
    expect(priorityPool([q(stem)], 'lowercase')).toHaveLength(1);
  });

  it('the recap shows the word as the stem writes it', () => {
    expect(signpostMiss(q(stem), false, true, 'lowercase')?.tag).toBe('Signpost word: “first”');
    expect(pickMiss(q(stem), 'A', false, (t) => t, 'lowercase')?.tag).toBe('Signpost word: “first”');
    expect(signpostMiss(q(stem), false, true)?.tag).toBe('Signpost word');
    expect(signpostMiss(q('What is done FIRST?'), false, true)?.tag).toBe('Signpost word: FIRST');
  });

  it('the mistake coach counts a lowercase qualifier only for a lowercase course', () => {
    const m = { slip: 'misread' as const, picked: 'A', correct: 'C', tips: [], stem };
    expect(patternsOf(m)).not.toContain('priority');
    expect(patternsOf({ ...m, qualifierCase: 'lowercase' })).toContain('priority');
  });
});

describe('CISA (capitals) reads exactly as before', () => {
  const dir = path.join(__dirname, '..', 'content', 'generated', 'cisa');
  const stems: string[] = [];
  for (const f of fs.readdirSync(dir).filter((n) => /^d\d+\.json$/.test(n))) {
    for (const x of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as PackQuestion[]) stems.push(x.stem);
  }

  it('same word, fit and coaching line on every CISA stem', () => {
    expect(stems.length).toBeGreaterThan(100);
    let found = 0;
    for (const s of stems) {
      expect(priorityWord(s)).toBe(oldPriorityWord(s));
      expect(fitWord(s)).toBe(oldFitWord(s));
      expect(meaningFor(s)).toBe(oldMeaningFor(s));
      // Shown back unchanged: the capitals, as written, with no quotes.
      const w = priorityWritten(s);
      expect(w).toBe(oldPriorityWord(s));
      if (w) expect(shownWord(w)).toBe(w);
      if (w) found++;
    }
    expect(found).toBeGreaterThan(100);
  });
});

describe('the CIA bank: every stem, written in lowercase, finds its qualifier', () => {
  // Read-only: the hand-written CIA items (not yet in the app), restyled to The IIA's lowercase
  // qualifiers (28 Nov 2026). Each must find one, inside its question sentence.
  const root = path.join(__dirname, '..', '..', '..', 'data', 'cia');
  const files = ['cia1', 'cia2', 'cia3'].flatMap((p) => {
    const d = path.join(root, p, 'originals');
    return fs.existsSync(d) ? fs.readdirSync(d).filter((n) => /^d\d+\.json$/.test(n)).map((n) => path.join(d, n)) : [];
  });

  (files.length ? it : it.skip)('every CIA stem finds a qualifier in its question sentence', () => {
    let checked = 0;
    for (const f of files) {
      for (const item of JSON.parse(fs.readFileSync(f, 'utf8')).questions as { id: string; question: string }[]) {
        const hit = findPriority(item.question, 'lowercase');
        const { start, end } = questionSpan(item.question);
        expect({ id: item.id, found: hit !== null }).toEqual({ id: item.id, found: true });
        expect(hit!.index).toBeGreaterThanOrEqual(start);
        expect(hit!.index).toBeLessThan(end);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });
});

describe('a lowercase qualifier counts only where it is the ask', () => {
  it('prefers the earliest true qualifier: "best describes the first step" is BEST', () => {
    expect(findPriority('Which of the following best describes the first step of an engagement?', 'lowercase')).toMatchObject({ word: 'BEST', written: 'best' });
  });

  it('a "first" that ends the question is the action\'s order and wins', () => {
    expect(findPriority('Which action is most appropriate for management to take first?', 'lowercase')?.word).toBe('FIRST');
  });

  it('never counts an ordinary "first" (a time, a thing, a lead-in)', () => {
    expect(findPriority('During the first year of the program, which control should the auditor test?', 'lowercase')).toBeNull();
    expect(findPriority('Which control should the auditor test in the first quarter?', 'lowercase')).toBeNull();
    expect(findPriority('Which first-line function owns the risk?', 'lowercase')).toBeNull();
    expect(findPriority('Which duty does the first chief audit executive have under the charter?', 'lowercase')).toBeNull();
    // ...nor "at least", "most of", "for most staff", "best practice", "the main office".
    expect(findPriority('Which control covers at least most of the branches?', 'lowercase')).toBeNull();
    expect(findPriority('Which control do most auditors test for most staff?', 'lowercase')).toBeNull();
    expect(findPriority('Which control reflects best practice?', 'lowercase')).toBeNull();
    expect(findPriority('Which team works in the main office?', 'lowercase')).toBeNull();
  });

  it('counts "first" as the order of the action, and "the first step" when that is the ask', () => {
    expect(findPriority('What should the auditor do first with that program?', 'lowercase')?.word).toBe('FIRST');
    expect(findPriority('Where would a conflict of interest first arise?', 'lowercase')?.word).toBe('FIRST');
    expect(findPriority('What is the first step the auditor should take?', 'lowercase')?.word).toBe('FIRST');
  });

  it('finds "main" (as PRIMARY) and "least", The IIA\'s other qualifiers', () => {
    expect(findPriority('Where should the auditor place the main weakness?', 'lowercase')).toMatchObject({ word: 'PRIMARY', written: 'main' });
    expect(meaningFor('Where should the auditor place the main weakness?', 'lowercase')).toBe(PRIORITY_MEANING.PRIMARY);
    const least = 'An auditor reviews four ledgers. Which entry is recorded least soundly?';
    expect(findPriority(least, 'lowercase')).toMatchObject({ written: 'least' });
    expect(meaningFor(least, 'lowercase')).toBe(LEAST_MEANING);
    expect(fitWord('Which response is least appropriate?', 'lowercase')).toBeNull();
    // Signpost's step 1 has no card for "the weakest", so a "least" stem is left out of its rounds.
    expect(priorityPool([q(least)], 'lowercase')).toEqual([]);
    // In capitals, MAIN and LEAST stay unread, as before.
    expect(findPriority('Where should the auditor place the MAIN weakness?')).toBeNull();
  });
});

describe('the question sentence starts only at a real sentence break', () => {
  const span = (s: string) => s.slice(questionSpan(s).start, questionSpan(s).end);

  it('does not break at "e.g. ", "i.e. ", "U.S. " or a title', () => {
    expect(span('Which control, e.g. a review, is best?')).toBe('Which control, e.g. a review, is best?');
    expect(span('A bank tests one control, i.e. the review. Which is most effective?')).toBe('Which is most effective?');
    expect(span('Which U.S. regulation applies first?')).toBe('Which U.S. regulation applies first?');
    expect(span('A U.S. Treasury office hires Dr. Ruiz. Which step comes first?')).toBe('Which step comes first?');
    expect(span('Which step should Mr. Ruiz take first?')).toBe('Which step should Mr. Ruiz take first?');
  });

  it('needs a capital letter after the break', () => {
    expect(span('The ratio is 1.25. which is best?')).toBe('The ratio is 1.25. which is best?');
    expect(span('Most staff work remotely. Which control is best?')).toBe('Which control is best?');
  });

  it('finds the qualifier past an abbreviation', () => {
    expect(findPriority('Which control, e.g. a review. Most of all, is best?', 'lowercase')?.word).toBe('BEST');
    expect(findPriority('Which U.S. control is most effective?', 'lowercase')).toMatchObject({ word: 'MOST', written: 'most' });
  });
});

describe('Signpost is offered for a lowercase course (registry isPlayable)', () => {
  const lowerBank = Array.from({ length: 12 }, (_, i) => ({ ...q('An auditor reviews payroll. Which action should the internal auditor take first?'), id: `x${i}` }));

  it('counts the same questions its round is built from', () => {
    expect(isPlayable('priority', lowerBank, undefined, undefined, 'lowercase')).toBe(true);
    // Capitals (CISA, every course today): lowercase words are ordinary prose, as before.
    expect(isPlayable('priority', lowerBank)).toBe(false);
    expect(isPlayable('priority', lowerBank, undefined, undefined, 'capitals')).toBe(false);
    expect(GAMES.priority.pool(lowerBank, 'lowercase')).toHaveLength(12);
  });

  it('CISA plays Signpost exactly as before', () => {
    const cisa = getAllQuestions('cisa');
    expect(GAMES.priority.pool(cisa)).toEqual(priorityPool(cisa));
    expect(isPlayable('priority', cisa)).toBe(true);
  });
});

// The journal's tag label ("Missed FIRST or BEST") is tested in mistake-dna-screen.test.tsx (slipsFor).
describe('copy that names FIRST or BEST, in each course style', () => {
  it('capitals: CISA word for word', () => {
    expect(patternCopy('priority')).toBe(PATTERN_COPY.priority);
    expect(patternCopy('priority').title).toBe('You miss priority words like FIRST and BEST');
    expect(badgeRule('signpost-reader')).toBe(badgeDef('signpost-reader')!.rule);
    expect(qualifierCopy('Needs 10 different FIRST questions.', undefined, true)).toBe('Needs 10 different FIRST questions.');
  });

  it('lowercase: the words as The IIA writes them', () => {
    expect(patternCopy('priority', 'lowercase').title).toBe('You miss priority words like “first” and “best”');
    expect(patternCopy('runner-up', 'lowercase')).toBe(PATTERN_COPY['runner-up']);
    expect(badgeRule('signpost-reader', { qualifierCase: 'lowercase' })).toContain('different “first” questions');
    expect(qualifierCopy('Needs 10 different FIRST questions.', 'lowercase', true)).toBe('Needs 10 different “first” questions.');
  });
});

describe('fixed coach copy in each course style', () => {
  it('capitals: CISA copy word for word', () => {
    expect(dnaCue('priority')).toBe('Look for FIRST, BEST or MOST in the question, then read the options.');
    expect(dnaCue('priority', 'capitals')).toBe('Look for FIRST, BEST or MOST in the question, then read the options.');
    expect(dnaCopy('priority')).toBe(DNA_COPY.priority);
    expect(dnaCopy('priority').explanation).toContain('Identify FIRST, BEST or MOST');
    expect(qualifierCopy('a word like FIRST or BEST')).toBe('a word like FIRST or BEST');
  });

  it('lowercase: the words as The IIA writes them', () => {
    // Quoted, so none reads as an instruction about order ("Identify first, …").
    expect(dnaCue('priority', 'lowercase')).toBe('Look for “first”, “best” or “most” in the question, then read the options.');
    expect(dnaCopy('priority', 'lowercase').explanation).toBe(
      'Your tags suggest that the priority in the question may need another look. Identify “first”, “best” or “most”, then compare the options against that request.',
    );
    expect(dnaCopy('priority', 'lowercase').label).toBe('Priority words');
    expect(qualifierCopy('a word like FIRST or BEST', 'lowercase')).toBe('a word like first or best');
    // Other cues have no qualifier and do not change.
    expect(dnaCue('runner-up', 'lowercase')).toBe(dnaCue('runner-up'));
  });

  it('shownWord quotes only a lowercase word', () => {
    expect(shownWord('FIRST')).toBe('FIRST');
    expect(shownWord('first')).toBe('“first”');
  });
});

// ---- Second review (28 Nov 2026): each finding, with its examples as cases. ----
describe('review 2: a counting "most" before a noun is never the ask', () => {
  it('"most transactions", "most employees": a count, not the ask', () => {
    expect(findPriority('Which control covers most transactions?', 'lowercase')).toBeNull();
    expect(findPriority('Which risk affects most employees?', 'lowercase')).toBeNull();
    expect(findPriority('Which risk affects most high-risk transactions?', 'lowercase')).toBeNull();
    // The ask elsewhere in the same question is still found.
    expect(findPriority('Which control covering most transactions is best?', 'lowercase')).toMatchObject({ word: 'BEST', written: 'best' });
  });

  it('reads the word before "most" past a closing bracket: "(CAE) most clearly"', () => {
    // cia1_d1_107 after its restyle: "(CAE)" sits right before the qualifier.
    expect(findPriority('What must the chief audit executive (CAE) most clearly do?', 'lowercase'))
      .toMatchObject({ word: 'MOST', written: 'most' });
    // A bracketed count is still a count: "(roughly) most staff" stays out.
    expect(findPriority('Which control covers (roughly) most transactions?', 'lowercase')).toBeNull();
  });

  it('"most" before an adjective or adverb, or at the end of the ask, is the ask', () => {
    for (const w of ['likely', 'effective', 'appropriate', 'important', 'clearly', 'reliable', 'cost-effective']) {
      expect(findPriority(`Which control would be most ${w} here?`, 'lowercase')).toMatchObject({ word: 'MOST', written: 'most' });
    }
    expect(findPriority('Which consideration matters most?', 'lowercase')).toMatchObject({ word: 'MOST', written: 'most' });
    // After "the" it is a superlative, the ask even before a noun: "provides the most assurance".
    expect(findPriority('Which of the following provides the most assurance to the board?', 'lowercase')).toMatchObject({ word: 'MOST', written: 'most' });
    // And before a verb (The IIA's "What does it most lack?").
    expect(findPriority('What does it most lack?', 'lowercase')).toMatchObject({ word: 'MOST', written: 'most' });
  });
});

describe('review 2: a lead-in is searched when the cut ask has no qualifier', () => {
  it('"To best protect the data, which control…" finds "best"', () => {
    const s = 'To best protect the data, which control should be used?';
    expect(findPriority(s, 'lowercase')).toEqual({ word: 'BEST', written: 'best', index: s.indexOf('best') });
    // The ask still comes first when it has one; an ordinary lead-in "first" still never counts.
    expect(findPriority('To best protect the data, which control is most effective?', 'lowercase')?.written).toBe('most');
    expect(findPriority('During the first year of the program, which control should the auditor test?', 'lowercase')).toBeNull();
  });
});

describe('review 2: in a lowercase course a capitalised word counts only in the question', () => {
  it('"The BEST Corp board asked." does not beat the real lowercase ask', () => {
    const s = 'The BEST Corp board asked. Which action should the auditor take first?';
    expect(findPriority(s, 'lowercase')).toEqual({ word: 'FIRST', written: 'first', index: s.lastIndexOf('first') });
    // A capital inside the question still wins, as before (a bank mid-restyle).
    expect(findPriority('The BEST Corp board asked. Which action is MOST effective?', 'lowercase')?.written).toBe('MOST');
    // Capitals (CISA): anywhere in the stem, exactly as before.
    expect(findPriority(s)?.written).toBe('BEST');
  });
});

describe('review 2: a final "first" keeps the earlier qualifier as a second reading', () => {
  it('"would most likely be used first?" accepts the order and "most likely"', () => {
    const s = 'Which approach would most likely be used first?';
    expect(findPriority(s, 'lowercase')).toMatchObject({ word: 'FIRST', earlier: { word: 'MOST', written: 'most' } });
    expect(acceptedAsks(s, 'lowercase')).toEqual(['sequence', 'degree']);
    expect(acceptedAsks('Which action is most appropriate for management to take first?', 'lowercase')).toEqual(['sequence', 'best-fit']);
    // Only "first": one reading, as before. Capitals (CISA): the last word, one reading, as before.
    expect(acceptedAsks('Which action should the auditor take first?', 'lowercase')).toEqual(['sequence']);
    expect(acceptedAsks('Which approach would MOST likely be used FIRST?')).toEqual(['sequence']);
    const caps = 'Which approach would MOST likely be used FIRST?';
    expect(findPriority(caps)).toEqual({ word: 'FIRST', written: 'FIRST', index: caps.lastIndexOf('FIRST') });
  });
});

describe('review 2: lowercase copy quotes the words', () => {
  it('the exam-eve line', () => {
    const none = { classified: 0, patterns: [] };
    expect(eveReminders(none).lines[0]).toBe('Find the FIRST or BEST word before you read the options.');
    expect(eveReminders(none, 'capitals').lines).toEqual([EVE_REMINDER.priority, EVE_REMINDER['runner-up'], EVE_REMINDER.role]);
    expect(eveReminders(none, 'lowercase').lines).toEqual([
      'Find the “first” or “best” word before you read the options.',
      EVE_REMINDER['runner-up'],
      EVE_REMINDER.role,
    ]);
  });

  it('the slip coach takes the course style as a parameter', () => {
    const rows = Array.from({ length: 6 }, (_, i) => ({ slip: 'priority' as const, picked: 'A', correct: 'C', tips: [], stem: `Which step comes first? ${i}` }));
    // A not-ready coach has no title: '' then, so the expectation fails loudly.
    const title = (c: ReturnType<typeof slipCoach>) => (c.ready ? c.title : '');
    expect(title(slipCoach(rows))).toBe('You miss priority words like FIRST and BEST');
    expect(title(slipCoach(rows, 'lowercase'))).toBe('You miss priority words like “first” and “best”');
    // The rows' own field no longer decides the copy.
    expect(title(slipCoach(rows.map((r) => ({ ...r, qualifierCase: 'lowercase' as const }))))).toBe('You miss priority words like FIRST and BEST');
  });
});
