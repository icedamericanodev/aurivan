/**
 * Random helpers. A "seeded" random generator gives the same sequence for
 * the same seed — handy for tests and for resuming a mock exam exactly as
 * it was. In the app we seed with the current time.
 */
export type Rng = () => number; // returns a number in [0, 1)

/** mulberry32: tiny, fast, good-enough PRNG for shuffling quiz items. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle. Returns a NEW array; the input is untouched. */
export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
