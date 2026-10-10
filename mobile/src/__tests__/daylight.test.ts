/**
 * Build D: Daylight (engine/games/daylight.ts). Pure.
 * Tiers from the exam facts, the shared budget, flag & move on, the light
 * setting (timed-out questions revealed, not failed), scoring, the pace line
 * with a one-question grace, spoken pace marks, the suggestion, the end screen.
 */
import { getCertification } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import {
  answerCurrent,
  averageSeconds,
  budgetGone,
  buildDaylightRound,
  canExtend,
  canFlag,
  currentItem,
  daylightLine,
  lowLight,
  lowLightLine,
  MAX_EXTENDS,
  tierCanExtend,
  DAYLIGHT_MINUTES,
  DAYLIGHT_SIZE,
  daylightMax,
  daylightPace,
  daylightScore,
  extendBudget,
  finishedInBudget,
  flagCurrent,
  newDaylightRound,
  paceMarksDue,
  setLight,
  slowestItem,
  suggestTier,
  tierSeconds,
} from '../engine/games/daylight';
import { MAX_ANSWER_MS } from '../engine/answerClock';
import { GAME_ORDER, GAMES, isPlayable } from '../engine/games/registry';
import { createRng } from '../engine/random';

const CISA = getCertification('cisa')!.exam;
const S = 1000;
const IDS = ['a', 'b', 'c', 'd', 'e'];

describe('tiers come from the exam pace', () => {
  it('CISA: Seedling 120 s, Sapling 96 s, Heartwood 80 s', () => {
    expect(tierSeconds('seedling', CISA)).toBe(120);
    expect(tierSeconds('sapling', CISA)).toBe(96);
    expect(tierSeconds('heartwood', CISA)).toBe(80);
  });

  it('a different exam scales every tier', () => {
    const aaia = getCertification('aaia')!.exam; // 90 questions, 150 min = 100 s
    expect(tierSeconds('sapling', aaia)).toBe(100);
    expect(tierSeconds('seedling', aaia)).toBe(125);
  });

  it('only Seedling can be extended', () => {
    expect(tierCanExtend('seedling')).toBe(true);
    expect(tierCanExtend('sapling')).toBe(false);
    expect(tierCanExtend('heartwood')).toBe(false);
  });
});

describe('the registry', () => {
  it('lists Daylight with its name, tagline and honest length (the Sapling budget)', () => {
    expect(GAME_ORDER).toContain('daylight');
    expect(GAMES.daylight).toMatchObject({ id: 'daylight', name: 'Daylight', tagline: 'Answer at exam pace.', size: 5 });
    expect(DAYLIGHT_MINUTES).toBe(8);
    expect(GAMES.daylight.minutes).toBe(8);
    expect(isPlayable('daylight', getAllQuestions('cisa'))).toBe(true);
  });

  it('a round is 5 different bank questions', () => {
    const ids = buildDaylightRound(getAllQuestions('cisa'), createRng(7));
    expect(ids).toHaveLength(DAYLIGHT_SIZE);
    expect(new Set(ids).size).toBe(DAYLIGHT_SIZE);
  });
});

describe('one shared budget', () => {
  it('5 × the tier: 8 minutes at Sapling, 10 at Seedling', () => {
    expect(newDaylightRound(IDS, 'sapling', 96).budgetMs).toBe(480 * S);
    expect(newDaylightRound(IDS, 'seedling', 120).budgetMs).toBe(600 * S);
  });

  it('the budget is gone at, not before, its end', () => {
    const r = newDaylightRound(IDS, 'sapling', 96);
    expect(budgetGone(r, 479 * S)).toBe(false);
    expect(budgetGone(r, 480 * S)).toBe(true);
  });

  it('Seedling: "Add a minute" grows the budget; other tiers and finished rounds stay', () => {
    const r = newDaylightRound(IDS, 'seedling', 120);
    expect(extendBudget(r).budgetMs).toBe(660 * S);
    const sapling = newDaylightRound(IDS, 'sapling', 96);
    expect(canExtend(sapling)).toBe(false);
    expect(extendBudget(sapling)).toBe(sapling);
    expect(extendBudget(setLight(r)).budgetMs).toBe(600 * S);
  });

  it(`at most ${MAX_EXTENDS} minutes can be added, then the button goes`, () => {
    let r = newDaylightRound(IDS, 'seedling', 120);
    for (let k = 0; k < MAX_EXTENDS + 5; k++) r = extendBudget(r);
    expect(r.extends).toBe(MAX_EXTENDS);
    expect(r.budgetMs).toBe((600 + MAX_EXTENDS * 60) * S);
    expect(canExtend(r)).toBe(false);
  });

  it('the tier is locked at the start: a new suggestion never changes what the round allows (C2)', () => {
    const r = newDaylightRound(IDS, 'seedling', 120);
    // The suggestion is recomputed as answers come in; the round never asks
    // for it again: canExtend / extendBudget read the round's own tier.
    expect(r.tier).toBe('seedling');
    expect(canExtend(r)).toBe(true);
    expect(extendBudget(r).extends).toBe(1);
    const h = newDaylightRound(IDS, 'heartwood', 80);
    expect(canExtend(h)).toBe(false);
  });

  it('the light always sets, even for a budget past the 30-minute answer-clock cap', () => {
    const r = { ...newDaylightRound(IDS, 'seedling', 120), budgetMs: 40 * 60 * S };
    expect(budgetGone(r, MAX_ANSWER_MS - 1)).toBe(false);
    expect(budgetGone(r, MAX_ANSWER_MS)).toBe(true);
  });

  it('answer times are capped at 30 minutes, however long a question was parked', () => {
    let r = newDaylightRound(['a', 'b'], 'seedling', 120);
    r = flagCurrent(r, 25 * 60 * S);
    r = answerCurrent(r, true, S); // b
    r = answerCurrent(r, true, 20 * 60 * S); // a: 25 + 20 min
    expect(r.answers.a.ms).toBe(MAX_ANSWER_MS);
  });
});

describe('flag & move on', () => {
  it('parks the current question at the back; it comes back at the end with its time kept', () => {
    let r = newDaylightRound(IDS, 'sapling', 96);
    r = flagCurrent(r, 40 * S);
    expect(currentItem(r)).toBe('b');
    expect(r.queue).toEqual(['b', 'c', 'd', 'e', 'a']);
    expect(r.flagged).toEqual(['a']);
    for (let k = 0; k < 4; k++) r = answerCurrent(r, true, 50 * S);
    expect(currentItem(r)).toBe('a');
    r = answerCurrent(r, false, 30 * S);
    expect(r.answers.a).toEqual({ correct: false, ms: 70 * S }); // 40 + 30
    expect(r.over).toBe(true);
  });

  it('is not offered on the last question left', () => {
    let r = newDaylightRound(['a', 'b'], 'sapling', 96);
    expect(canFlag(r)).toBe(true);
    r = answerCurrent(r, true, S);
    expect(canFlag(r)).toBe(false);
    expect(flagCurrent(r, S)).toBe(r);
  });
});

describe('when the light sets', () => {
  it('unanswered questions are revealed, not failed; no bonus', () => {
    let r = newDaylightRound(IDS, 'sapling', 96);
    r = answerCurrent(r, true, 100 * S);
    r = flagCurrent(r, 60 * S); // b parked
    r = answerCurrent(r, false, 90 * S); // c
    r = setLight(r);
    expect(r.over).toBe(true);
    expect(r.timedOut.sort()).toEqual(['b', 'd', 'e']);
    // Timed-out questions are NOT answers: they can't be wrong.
    expect(Object.keys(r.answers).sort()).toEqual(['a', 'c']);
    expect(finishedInBudget(r)).toBe(false);
    expect(daylightScore(r)).toBe(1);
    expect(currentItem(r)).toBeNull();
    // Setting an already-set light changes nothing.
    expect(setLight(r)).toBe(r);
  });
});

describe('scoring', () => {
  it('+1 per correct answer, +1 for finishing within the budget', () => {
    let r = newDaylightRound(IDS, 'sapling', 96);
    for (const ok of [true, true, false, true, true]) r = answerCurrent(r, ok, 60 * S);
    expect(finishedInBudget(r)).toBe(true);
    expect(daylightScore(r)).toBe(5);
    expect(daylightMax(5)).toBe(6);
  });

  it('a perfect round in time scores the max', () => {
    let r = newDaylightRound(IDS, 'heartwood', 80);
    for (let k = 0; k < IDS.length; k++) r = answerCurrent(r, true, 70 * S);
    expect(daylightScore(r)).toBe(daylightMax(IDS.length));
  });
});

describe('pace line', () => {
  const r0 = newDaylightRound(IDS, 'sapling', 96);
  it('never "behind" while still inside the first question’s share', () => {
    expect(daylightPace(r0, 100 * S)).toBe('onPace');
    expect(daylightPace(r0, 106 * S)).toBe('behind'); // past 96 s + 10%
  });

  it('ahead when well under the answered questions’ share', () => {
    let r = answerCurrent(r0, true, 30 * S);
    r = answerCurrent(r, true, 30 * S);
    expect(daylightPace(r, 60 * S)).toBe('ahead');
    expect(daylightPace(r, 180 * S)).toBe('onPace');
    expect(daylightPace(r, 320 * S)).toBe('behind');
  });

  it('on the last question there is nothing to flag: "Behind pace." alone (O5)', () => {
    expect(daylightLine('behind', true)).toBe('Behind pace. Flag & move on if one is stuck.');
    expect(daylightLine('behind', false)).toBe('Behind pace.');
    expect(daylightLine('onPace', false)).toBe('On pace');
  });

  it('the last 10% of light shows a warning, with "add a minute" only where allowed (P12)', () => {
    const seed = newDaylightRound(IDS, 'seedling', 120); // 600 s
    expect(lowLight(seed, 539 * S)).toBe(false);
    expect(lowLight(seed, 540 * S)).toBe(true);
    expect(lowLightLine(seed)).toBe('About a minute of light left. You can add a minute.');
    expect(lowLightLine(r0)).toBe('About a minute of light left.');
  });

  it('spoken marks: half the light, then 10% left, each once', () => {
    expect(paceMarksDue(r0, 200 * S, [])).toEqual([]);
    expect(paceMarksDue(r0, 240 * S, [])).toEqual(['half']);
    expect(paceMarksDue(r0, 433 * S, ['half'])).toEqual(['tenthLeft']);
    expect(paceMarksDue(r0, 470 * S, ['half', 'tenthLeft'])).toEqual([]);
    // Reopened late: both at once.
    expect(paceMarksDue(r0, 440 * S, [])).toEqual(['half', 'tenthLeft']);
  });
});

describe('the suggested tier', () => {
  const answers = (sec: number, n = 12) => Array.from({ length: n }, (_, i) => ({ ms: sec * S, lastAt: 1_800_000_000_000 + i }));
  it('Seedling with too few timed answers', () => {
    expect(suggestTier(answers(50, 9), CISA)).toBe('seedling');
    expect(suggestTier([{ lastAt: 1 }], CISA)).toBe('seedling');
  });

  it('the fastest tier that still covers the learner’s median', () => {
    expect(suggestTier(answers(75), CISA)).toBe('heartwood');
    expect(suggestTier(answers(90), CISA)).toBe('sapling');
    expect(suggestTier(answers(110), CISA)).toBe('seedling');
  });

  it('reads the most recent answers only', () => {
    const old = Array.from({ length: 40 }, (_, i) => ({ ms: 200 * S, lastAt: i }));
    const recent = Array.from({ length: 30 }, (_, i) => ({ ms: 70 * S, lastAt: 1000 + i }));
    expect(suggestTier([...old, ...recent], CISA)).toBe('heartwood');
  });
});

describe('end screen: where time went', () => {
  it('average seconds and the slowest question', () => {
    let r = newDaylightRound(IDS, 'sapling', 96);
    r = answerCurrent(r, true, 60 * S);
    r = answerCurrent(r, true, 140 * S);
    r = answerCurrent(r, false, 40 * S);
    expect(averageSeconds(r)).toBe(80);
    expect(slowestItem(r)).toEqual({ id: 'b', seconds: 140 });
    expect(averageSeconds(newDaylightRound(IDS, 'sapling', 96))).toBeNull();
    expect(slowestItem(newDaylightRound(IDS, 'sapling', 96))).toBeNull();
  });
});
