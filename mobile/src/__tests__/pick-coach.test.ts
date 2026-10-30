/**
 * The pick-aware coach line (engine/pickCoach.ts; phone parity with web v12.47).
 *
 * - the parser reads the ORIGINAL letters from a tip's {{X}} tokens;
 * - "rule out first" needs exactly two letters in Eliminate, the pick one of them, the best neither;
 * - "final two" needs exactly the pick and the best in Final two;
 * - anything else is null (the usual line stays): never a guess;
 * - the words carry DISPLAY letters after the shuffle, the comparing stays on originals;
 * - over the whole content pack, every wrong pick gets one of the two lines
 *   (scripts/verify_repo.sh 6e prints the web's counts: 0 fallback).
 */
import type { Letter, PackQuestion } from '../content/types';
import { generatedPacks } from '../content/generated';
import { finalTwoLine, pickCoachKind, pickCoachLine, ruleOutLine, tipByLabel, tipLetters } from '../engine/pickCoach';
import { optionLetters, originalToDisplay, type Permutation } from '../engine/shuffle';
import { RUNNER_UP_LINE } from '../engine/slipCoach';

const TIPS = [
  'Eliminate: {{A}} skips the owner and {{C}} fixes the tool before the policy.',
  'Final two: {{D}} beats {{B}} because the auditor reports, not fixes.',
  'Exam cue: when fraud is suspected, escalate first.',
];

describe('tipLetters', () => {
  it('reads ORIGINAL letters from {{X}} tokens, in order, once each', () => {
    expect(tipLetters('Final two: {{D}} beats {{B}}; {{D}} wins again.')).toEqual(['D', 'B']);
  });
  it('ignores bare capital letters (the build already decided which are options)', () => {
    expect(tipLetters('Eliminate: a C-level view and A SOC 2 report are not options.')).toEqual([]);
  });
  it('an empty or missing tip names none', () => {
    expect(tipLetters(undefined)).toEqual([]);
    expect(tipLetters('')).toEqual([]);
  });
  it('finds a tip by its label', () => {
    expect(tipByLabel(TIPS, 'Eliminate')).toBe(TIPS[0]);
    expect(tipByLabel(TIPS, 'Final two')).toBe(TIPS[1]);
    expect(tipByLabel(['The trap is B'], 'Final two')).toBeUndefined();
  });
});

describe('pickCoachKind (ORIGINAL letters)', () => {
  it('a pick named in Eliminate: rule out first', () => {
    expect(pickCoachKind(TIPS, 'D', 'A')).toBe('rule-out');
    expect(pickCoachKind(TIPS, 'D', 'C')).toBe('rule-out');
  });
  it('the other option in Final two: the final two', () => {
    expect(pickCoachKind(TIPS, 'D', 'B')).toBe('final-two');
  });
  it('a right answer, or no pick, gets none', () => {
    expect(pickCoachKind(TIPS, 'D', 'D')).toBeNull();
    expect(pickCoachKind(TIPS, 'D', undefined)).toBeNull();
  });
  it('never guesses: three letters in Eliminate, or the best inside it, falls back', () => {
    expect(pickCoachKind(['Eliminate: {{A}}, {{B}} and {{C}} all miss it.'], 'D', 'A')).toBeNull();
    expect(pickCoachKind(['Eliminate: {{A}} and {{D}} miss it.'], 'D', 'A')).toBeNull();
  });
  it('never guesses: a Final two without the best, or with one letter, falls back', () => {
    expect(pickCoachKind(['Final two: {{B}} beats {{C}}.'], 'D', 'C')).toBeNull();
    expect(pickCoachKind(['Final two: {{B}} is close.'], 'D', 'B')).toBeNull();
  });
  it('older tips without v2 labels fall back', () => {
    expect(pickCoachKind(['The trap is {{B}}.', 'Think like an auditor.'], 'D', 'B')).toBeNull();
  });
});

describe('pickCoachLine (DISPLAY letters in the words)', () => {
  it('unshuffled, the letters read as written', () => {
    const perm: Permutation = ['A', 'B', 'C', 'D'];
    expect(pickCoachLine(TIPS, 'D', 'A', perm)).toBe('Your pick, A, is one of the two to rule out first.');
    expect(pickCoachLine(TIPS, 'D', 'B', perm)).toBe('You reached the final two: B against D.');
    expect(pickCoachLine(TIPS, 'D', 'D', perm)).toBeNull();
  });
  it('shuffled, the words name what is on screen (original B shown as A, original D shown as C)', () => {
    // perm[i] = the ORIGINAL letter in display slot i: display A = B, display B = A, display C = D, display D = C.
    const perm: Permutation = ['B', 'A', 'D', 'C'];
    expect(pickCoachLine(TIPS, 'D', 'B', perm)).toBe('You reached the final two: A against C.');
    expect(pickCoachLine(TIPS, 'D', 'C', perm)).toBe('Your pick, D, is one of the two to rule out first.');
  });
  it('learner copy never says "runner-up"', () => {
    for (const line of [ruleOutLine('B'), finalTwoLine('B', 'D'), RUNNER_UP_LINE]) expect(line).not.toMatch(/runner/i);
  });
});

describe('the whole content pack: every wrong pick gets a pick-aware line', () => {
  const all: PackQuestion[] = Object.values(generatedPacks).flatMap((domains) => Object.values(domains).flatMap((load) => load()));

  it('0 fall back to the usual line; each 4-option question has 2 rule-out picks and 1 final-two pick', () => {
    let ruleOut = 0;
    let finalTwo = 0;
    const fallback: string[] = [];
    const odd: string[] = [];
    for (const q of all) {
      let r = 0;
      let f = 0;
      for (const pick of optionLetters(q)) {
        if (pick === q.correct) continue;
        const kind = pickCoachKind(q.tips, q.correct, pick);
        if (kind === 'rule-out') r++;
        else if (kind === 'final-two') f++;
        else fallback.push(`${q.id}:${pick}`);
      }
      ruleOut += r;
      finalTwo += f;
      if (optionLetters(q).length === 4 && (r !== 2 || f !== 1)) odd.push(q.id);
    }
    // The bank-wide counts, for the PR (the web's 6e check prints the same three numbers).
    console.log(`pick-aware coach line, ${all.length} questions: ${ruleOut} rule out first · ${finalTwo} final two · ${fallback.length} usual line`);
    expect(all.length).toBeGreaterThan(0);
    expect(fallback).toEqual([]);
    expect(odd).toEqual([]);
  });

  it('with a shuffle, the words carry the display letters of the pick and the best answer', () => {
    const perm: Permutation = ['C', 'D', 'A', 'B'];
    for (const q of all.slice(0, 200)) {
      if (optionLetters(q).length !== 4) continue;
      for (const pick of optionLetters(q)) {
        if (pick === q.correct) continue;
        const line = pickCoachLine(q.tips, q.correct, pick as Letter, perm)!;
        const shown = originalToDisplay(pick, perm);
        expect(line.startsWith(`Your pick, ${shown},`) || line.startsWith(`You reached the final two: ${shown} against ${originalToDisplay(q.correct, perm)}.`)).toBe(true);
      }
    }
  });
});
