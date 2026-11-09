/**
 * Release bug hunt round 3: the phone smoke test (scripts/smoke/mobile.mjs) read NO-GO on a working
 * app, because M3 still looked for the answer card's removed "Fig. 4" caption and M6 for a
 * "Figure N" plate on You (both gone with the Grove redesign on purpose). This pins the harness to
 * what the app draws now, so it can't drift silently again:
 * - the harness never asks for the removed captions;
 * - what it does ask for is really in the app (the answer card's row ids and words, the areas chart title).
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const harness = readFileSync(join(__dirname, '../../../scripts/smoke/mobile.mjs'), 'utf8');
const quiz = readFileSync(join(__dirname, '../components/quiz.tsx'), 'utf8');
// Read as text: the screen modules pull in the icon set, which plain Jest can't load here.
const you = readFileSync(join(__dirname, '../app/(tabs)/you.tsx'), 'utf8');

it('the smoke harness no longer asks for the removed "Fig. 4" caption or a "Figure N" plate', () => {
  expect(harness).not.toMatch(/Fig\\\.\\s\*4|Fig\. 4 ·/);
  expect(harness).not.toMatch(/\/Figure \\d\//);
  expect(harness).not.toMatch(/\^Figure/);
});

it('what the harness checks is what the app draws', () => {
  for (const id of ['answer-plate', 'answer-row-best', 'answer-row-pick']) {
    expect(harness).toContain(`[data-testid="${id}"]`);
    expect(quiz).toContain(id);
  }
  expect(quiz).toContain("'Your answer · the best'");
  expect(quiz).toContain("'Best answer'");
  expect(harness).toContain('Your answer · the best');
  // The retired chart is replaced by the existing summary and its report link.
  expect(you).toContain('See report, your readiness report');
  expect(harness).toContain('See report, your readiness report');
  expect(harness).toContain('no readiness summary on You');
  expect(harness).not.toContain('no areas chart');
});
