import type { PackQuestion } from '../content/types';
import { createRng } from '../engine/random';
import {
  displayToOriginal,
  isCorrect,
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
