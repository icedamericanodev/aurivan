/**
 * The pack builder's option-letter tokenizer (scripts/build-content.mjs
 * tokenizeLetters): which capital letters in a tip are answer options.
 *
 * Plain English: the app swaps an option letter in a tip ("{{B}}") for the
 * letter the learner saw after shuffling. A letter that is just English (the
 * article "A") or a unit ("40°C") must stay as it is, or a tip would name the
 * wrong option and the pick-aware coach line would fall back.
 * Cases from the AAIA bank (bundled 28 Nov 2026, docs/WEB_LAUNCH_PLAN.md stream D).
 */
import { execFileSync } from 'child_process';
import path from 'path';
import { pathToFileURL } from 'url';

const BUILD = pathToFileURL(path.join(__dirname, '..', '..', 'scripts', 'build-content.mjs')).href;

/** Tokenize each text with the real builder (an ES module, so it runs in a child node). */
function tokenize(texts: string[]): string[] {
  const code = `
    const { tokenizeLetters } = await import(${JSON.stringify(BUILD)});
    process.stdout.write(JSON.stringify(JSON.parse(process.argv[1]).map((t) => tokenizeLetters(t))));
  `;
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code, JSON.stringify(texts)], { encoding: 'utf8' }));
}

it('reads "B and A both …" as two options, and "40°C" as a temperature', () => {
  expect(
    tokenize([
      'Eliminate: B and A both measure the hosting platform.',
      'Eliminate: C and A both try to manage a practice the law prohibits.',
      'Final two: B beats D because the forecast ignores the chance of passing 40°C.',
    ]),
  ).toEqual([
    'Eliminate: {{B}} and {{A}} both measure the hosting platform.',
    'Eliminate: {{C}} and {{A}} both try to manage a practice the law prohibits.',
    'Final two: {{B}} beats {{D}} because the forecast ignores the chance of passing 40°C.',
  ]);
});

it('keeps the article and ordinary option references as before', () => {
  expect(tokenize(['A sample of 40 items is enough.', 'Pick C over A.', 'C&A review'])).toEqual([
    'A sample of 40 items is enough.',
    'Pick {{C}} over {{A}}.',
    'C&A review',
  ]);
});
