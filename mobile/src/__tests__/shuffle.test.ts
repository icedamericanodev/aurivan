import type { PackQuestion } from '../content/types';
import { createRng } from '../engine/random';
import {
  displayToOriginal,
  isCheckCorrect,
  isCorrect,
  lettersFor,
  makeCheckPermutation,
  makePermutation,
  originalToDisplay,
  renderText,
} from '../engine/shuffle';

const q = {
  id: 'd1_001',
  options: { A: 'a', B: 'b', C: 'c', D: 'd' },
  correct: 'A',
} as unknown as PackQuestion;

describe('option shuffling', () => {
  it('produces a permutation of the same letters', () => {
    const perm = makePermutation(q, createRng(42));
    expect([...perm].sort()).toEqual(['A', 'B', 'C', 'D']);
  });

  it('display ↔ original mapping round-trips for every letter', () => {
    for (let seed = 1; seed < 50; seed++) {
      const perm = makePermutation(q, createRng(seed));
      for (const l of ['A', 'B', 'C', 'D'] as const) {
        expect(displayToOriginal(originalToDisplay(l, perm), perm)).toBe(l);
      }
    }
  });

  it('grades on the ORIGINAL letter, whatever the shuffle', () => {
    for (let seed = 1; seed < 50; seed++) {
      const perm = makePermutation(q, createRng(seed));
      const shownAs = originalToDisplay('A', perm);
      expect(isCorrect(q, shownAs, perm)).toBe(true);
      const wrongDisplay = (['A', 'B', 'C', 'D'] as const).find((l) => l !== shownAs)!;
      expect(isCorrect(q, wrongDisplay, perm)).toBe(false);
    }
  });

  it('renders {{X}} tokens as display letters and leaves plain words alone', () => {
    const perm = ['C', 'A', 'D', 'B'] as const; // display A shows original C
    const out = renderText('Trap is {{B}}. A sample of 25 is small; Annex A applies.', [...perm]);
    expect(out).toBe('Trap is D. A sample of 25 is small; Annex A applies.');
  });
});

describe('lesson check shuffling', () => {
  it('maps option counts to original letters', () => {
    expect(lettersFor(3)).toEqual(['A', 'B', 'C']);
    expect(lettersFor(4)).toEqual(['A', 'B', 'C', 'D']);
    expect(lettersFor(9)).toEqual(['A', 'B', 'C', 'D']); // never more letters than exist
  });

  it('keeps the written order when shuffling is off', () => {
    expect(makeCheckPermutation(4, null)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('is a permutation, and the same seed gives the same order', () => {
    const a = makeCheckPermutation(4, createRng(7));
    expect([...a].sort()).toEqual(['A', 'B', 'C', 'D']);
    expect(makeCheckPermutation(4, createRng(7))).toEqual(a);
  });

  it('grades on the original letter, wherever the answer is displayed', () => {
    for (let seed = 1; seed < 50; seed++) {
      const perm = makeCheckPermutation(4, createRng(seed));
      for (let correctIndex = 0; correctIndex < 4; correctIndex++) {
        // Exactly one display letter is correct: the one showing the key.
        const right = (['A', 'B', 'C', 'D'] as const).filter((d) => isCheckCorrect(correctIndex, d, perm));
        expect(right).toEqual([originalToDisplay(lettersFor(4)[correctIndex], perm)]);
      }
    }
  });

  it('moves the key off one fixed letter across seeds', () => {
    const shown = new Set<string>();
    for (let seed = 1; seed < 40; seed++) shown.add(originalToDisplay('B', makeCheckPermutation(4, createRng(seed))));
    expect(shown.size).toBeGreaterThan(1);
  });
});
