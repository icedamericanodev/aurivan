/**
 * "Do this once the sheet has gone" (mobile 1.49, the answer screen's ⋯ sheet).
 *
 * iOS cannot open another sheet, or push a screen under one, while a sheet is
 * still fading away; Android can at once. So a sheet row's action waits a
 * moment (`ms`) after the sheet closes. Every waiting action is kept here, so
 * tests can run them now (flushSheetWaitsForTest) or drop them when a test
 * ends (cancelSheetWaitsForTest, jest/after-env.ts), like lib/a11y.ts's timers.
 * No imports: jest/after-env.ts loads this in every test file.
 */
type Timer = ReturnType<typeof setTimeout>;
const waiting = new Map<Timer, () => void>();

/** Run `fn` after `ms`. Returns a cancel function. */
export function afterSheet(fn: () => void, ms: number): () => void {
  const t = setTimeout(() => {
    waiting.delete(t);
    fn();
  }, ms);
  waiting.set(t, fn);
  return () => {
    clearTimeout(t);
    waiting.delete(t);
  };
}

/** Tests: run every waiting action now, in order. */
export function flushSheetWaitsForTest(): void {
  for (const [t, fn] of [...waiting]) {
    clearTimeout(t);
    waiting.delete(t);
    fn();
  }
}

/** Tests: drop every waiting action (none may fire after its test has ended). */
export function cancelSheetWaitsForTest(): void {
  for (const t of waiting.keys()) clearTimeout(t);
  waiting.clear();
}
