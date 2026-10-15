/**
 * Mobile 1.24 copy rules that are pure functions:
 *  - Results headlines by sample size (no verdict on a handful of questions),
 *  - the calibration line ("Sure: 7 of 9 right. Unsure: 2 of 4 right."),
 *  - the answer screen's coach line (specific only when a slip is tagged),
 *  - which tips lead after a miss (Key idea + Exam cue first),
 *  - the notes "read" count that stays quiet until the first read.
 */
import { calibrationLine, countHeadline, resultsHeadline, SMALL_SAMPLE, smallSampleFact } from '../engine/resultsCopy';
import { missCoachLine, NEUTRAL_MISS_LINE, RUNNER_UP_LINE, SLIP_LINE } from '../engine/slipCoach';
import { readProgressText } from '../engine/notesSearch';
import { splitMissTips, tipParts } from '../engine/tips';
import type { Confidence } from '../engine/srs';

describe('Results headline by sample size', () => {
  it('under 8 answered it is the plain count, never a verdict', () => {
    expect(SMALL_SAMPLE).toBe(8);
    expect(resultsHeadline(3, 4, 75)).toBe('3 of 4 right'); // not "Strong work."
    expect(resultsHeadline(2, 5, 40)).toBe('2 of 5 right'); // not "Every miss is a lesson."
    expect(resultsHeadline(5, 5, 100)).toBe('All 5 right');
    expect(resultsHeadline(7, 7, 100)).toBe('All 7 right');
    expect(countHeadline(1, 1)).toBe('Right');
  });
  it('from 8 answered the bands come back', () => {
    expect(resultsHeadline(6, 8, 75)).toBe('Strong work.');
    expect(resultsHeadline(5, 8, 63)).toBe('Getting there.');
    expect(resultsHeadline(3, 8, 38)).toBe('Every miss is a lesson.');
    expect(resultsHeadline(120, 150, 80)).toBe('Strong work.');
  });
  it('the one fact under a small count is the topic most missed, or nothing', () => {
    expect(smallSampleFact('Risk planning', 1)).toBe('Most missed: Risk planning.');
    expect(smallSampleFact('Risk planning', 0)).toBeNull();
    expect(smallSampleFact(undefined, 2)).toBeNull();
  });
});

describe('calibration line', () => {
  const row = (confidence: Confidence | undefined, correct: boolean) => ({ confidence, correct });
  const many = (c: Confidence, right: number, wrong: number) => [...Array(right).fill(row(c, true)), ...Array(wrong).fill(row(c, false))];

  it('"Sure: 7 of 9 right. Unsure: 2 of 4 right." when enough answers were rated', () => {
    const rows = [...many('sure', 7, 2), ...many('unsure', 2, 2), row(undefined, true)];
    expect(calibrationLine(rows)).toBe('Sure: 7 of 9 right. Unsure: 2 of 4 right.');
  });
  it('only the levels that were used; Guessing appears when it was', () => {
    expect(calibrationLine([...many('sure', 3, 0), ...many('guessing', 1, 2)])).toBe('Sure: 3 of 3 right. Guessing: 1 of 3 right.');
  });
  it('nothing when fewer than 5 answers were rated (a few ratings say little)', () => {
    expect(calibrationLine([...many('sure', 2, 1), row(undefined, true), row(undefined, false)])).toBeNull();
    expect(calibrationLine([])).toBeNull();
  });
});

describe('the coach line under "Not quite"', () => {
  it('the runner-up line comes from the question’s own Final two tip', () => {
    expect(missCoachLine(true)).toBe(RUNNER_UP_LINE);
    expect(missCoachLine(true, 'role')).toBe(RUNNER_UP_LINE);
  });
  it('is neutral when the learner has not tagged why they slipped', () => {
    expect(missCoachLine(false)).toBe(NEUTRAL_MISS_LINE);
    expect(NEUTRAL_MISS_LINE).not.toMatch(/who you are/i);
  });
  it('"Check who you are in the question." appears only for a tagged role slip', () => {
    expect(missCoachLine(false, 'role')).toBe('Check who you are in the question.');
    for (const slip of Object.keys(SLIP_LINE) as (keyof typeof SLIP_LINE)[]) {
      if (slip !== 'role') expect(SLIP_LINE[slip]).not.toMatch(/who you are/i);
    }
  });
});

describe('splitMissTips: the short lines first', () => {
  const v2 = ['Eliminate: {{A}} and {{C}} are wrong.', 'Final two: {{B}} beats {{D}} because it comes first.', 'Exam cue: suspected fraud means escalate.'];
  it('puts the Exam cue first and keeps Eliminate and Final two after it, in their order', () => {
    expect(splitMissTips(v2)).toEqual({ first: [2], rest: [0, 1] });
  });
  it('nothing is dropped or repeated', () => {
    const { first, rest } = splitMissTips(v2);
    expect([...first, ...rest].sort()).toEqual([0, 1, 2]);
  });
  it('older tips without a prefix: the exam-day shortcut leads, and keeps its label by its original position', () => {
    const legacy = ['The trap text', 'The mindset text', 'The shortcut text'];
    const { first, rest } = splitMissTips(legacy);
    expect(first).toEqual([2]);
    expect(rest).toEqual([0, 1]);
    expect(tipParts(legacy[first[0]], first[0]).label).toBe('Exam-day shortcut');
    expect(tipParts(legacy[rest[1]], rest[1]).label).toBe('The mindset');
  });
  it('no cue at all: everything is in the second group', () => {
    expect(splitMissTips(['Eliminate: x', 'Final two: y'])).toEqual({ first: [], rest: [0, 1] });
    expect(splitMissTips([])).toEqual({ first: [], rest: [] });
  });
});

describe('notes "read" count stays quiet until the first read', () => {
  it('says nothing at 0, then "2 of 5 read", then "All read"', () => {
    expect(readProgressText(0, 252)).toBeNull();
    expect(readProgressText(2, 5)).toBe('2 of 5 read');
    expect(readProgressText(5, 5)).toBe('All read');
    expect(readProgressText(0, 0)).toBeNull();
  });
});
