/**
 * Phase 4a "Your plant" engine (engine/plant.ts): growth only from real
 * learning, never down; reset keeps the identity; restore clamps to the
 * data; a strict validator for backups; organs never bare; rest is a look,
 * never a loss; spoken labels say "growth", never "stage".
 */
import { getCertification } from '../content/certifications';
import type { AnswerRecord } from '../engine/readiness';
import {
  advance,
  clampToSupported,
  cleanPlantName,
  clearPending,
  dailySignals,
  grewLabel,
  GROWTH_IDS,
  GROWTH_NAMES,
  GROWTH_RULES,
  growthFor,
  isResting,
  isValidPlantSettings,
  isValidPlantState,
  MAX_NAME,
  maxSupportedGrowth,
  nextGrowth,
  nextGrowthSteps,
  nextToGrow,
  ORGAN_MIN,
  organFullness,
  organLabel,
  organs,
  organScales,
  organStep,
  outlineSpread,
  plantCallName,
  plantFacts,
  plantHasFace,
  plantLabel,
  plantNew,
  plantShown,
  PLANT_SPECIES,
  renamePlant,
  resetPlant,
  restLine,
  SPECIES_INFO,
  suggestName,
  supportEvidence,
  supportSpread,
  bestCaseFacts,
  shownName,
  switchSpecies,
  backfillLine,
  growthShort,
  isLookId,
  organSlots,
  PLANT_SLOTS,
  repairPlant,
  slotOf,
  type CertPlant,
  type GrowthLevel,
  type PlantFacts,
  type PlantMock,
} from '../engine/plant';

const T0 = new Date(2026, 9, 12, 10, 0, 0).getTime();
const cisa = getCertification('cisa')!;
const WEIGHTS = cisa.domains.map((d) => d.weight);

/** Facts that meet nothing past Seed. */
function facts(over: Partial<PlantFacts> = {}): PlantFacts {
  return { cleanAnswered: 0, cleanByDomain: [0, 0, 0, 0, 0], cleanMastery: [0, 0, 0, 0, 0], low: null, spread: 0, mock50: false, dress: false, readyHeld: false, ...over };
}
/** Facts that just meet every gate up to `g`. */
function factsFor(g: GrowthLevel): PlantFacts {
  const f = facts();
  if (g >= 2) f.cleanAnswered = 20;
  if (g >= 3) Object.assign(f, { cleanByDomain: [10, 10, 10, 10, 10], cleanAnswered: 50, spread: 0.05 });
  if (g >= 4) Object.assign(f, { low: 55, spread: 0.25 });
  if (g >= 5) Object.assign(f, { low: 65, spread: 0.45, mock50: true });
  if (g >= 6) Object.assign(f, { low: 80, spread: 0.6, dress: true, readyHeld: true, cleanMastery: [0.65, 0.7, 0.8, 0.66, 0.9] });
  return f;
}

describe('species', () => {
  it('is exactly the 13 v1 species, in shelf order', () => {
    expect(PLANT_SPECIES).toEqual(['oak', 'maple', 'narra', 'cherry-blossom', 'pine', 'coconut-palm', 'mango', 'bonsai', 'sunflower', 'lotus', 'sampaguita', 'cactus', 'bamboo']);
  });
  it('every species has a display name, a picker line and clean name ideas', () => {
    for (const sp of PLANT_SPECIES) {
      const info = SPECIES_INFO[sp];
      expect(info.name.length).toBeGreaterThan(0);
      expect(info.lower).toBe(info.name.toLowerCase());
      expect(info.line).toMatch(/\.$/);
      expect(info.suggestions.length).toBeGreaterThanOrEqual(3);
      for (const s of info.suggestions) expect(cleanPlantName(s)).toBe(s);
      expect(new Set(info.suggestions).size).toBe(info.suggestions.length);
    }
  });
  it('suggestName picks from the list for any 0..1 input', () => {
    for (const pick of [0, 0.3, 0.999, 1, -1]) expect(SPECIES_INFO.lotus.suggestions).toContain(suggestName('lotus', pick));
  });
  it('no picker line or name idea is a trademark echo', () => {
    const all = PLANT_SPECIES.flatMap((s) => [SPECIES_INFO[s].line, ...SPECIES_INFO[s].suggestions]).join(' ');
    expect(all).not.toMatch(/pok[eé]mon|finch|duo\b|tamagotchi/i);
  });
});

describe('growth gates (mascot_progression §1.2)', () => {
  it('Seed · Sprout · Shoot · Bough · Crown · Elder', () => {
    expect(GROWTH_IDS).toEqual(['seed', 'sprout', 'shoot', 'bough', 'crown', 'elder']);
    expect(Object.values(GROWTH_NAMES)).toEqual(['Seed', 'Sprout', 'Shoot', 'Bough', 'Crown', 'Elder']);
  });

  it.each([1, 2, 3, 4, 5, 6] as GrowthLevel[])('meeting the gates up to %i gives exactly that growth', (g) => {
    expect(growthFor(factsFor(g))).toBe(g);
  });

  it('Sprout: 20 clean answers', () => {
    expect(growthFor(facts({ cleanAnswered: 19 }))).toBe(1);
    expect(growthFor(facts({ cleanAnswered: 20 }))).toBe(2);
  });

  it('Shoot: 10 in EVERY domain and 5% of the outline', () => {
    const f = factsFor(3);
    expect(growthFor({ ...f, cleanByDomain: [10, 10, 9, 10, 10] })).toBe(2);
    expect(growthFor({ ...f, spread: 0.049 })).toBe(2);
  });

  it('Bough: low ≥ 55 (not "not enough data") and 25% of the outline', () => {
    const f = factsFor(4);
    expect(growthFor({ ...f, low: 54 })).toBe(3);
    expect(growthFor({ ...f, low: null })).toBe(3);
    expect(growthFor({ ...f, spread: 0.24 })).toBe(3);
  });

  it('Crown needs a mock of 50+', () => {
    expect(growthFor({ ...factsFor(5), mock50: false })).toBe(4);
  });

  it('Elder needs the ready hold, every domain ≥ 65%, 60% of the outline and a dress rehearsal', () => {
    const f = factsFor(6);
    expect(growthFor({ ...f, readyHeld: false })).toBe(5);
    expect(growthFor({ ...f, cleanMastery: [0.9, 0.9, 0.64, 0.9, 0.9] })).toBe(5);
    expect(growthFor({ ...f, spread: 0.59 })).toBe(5);
    expect(growthFor({ ...f, dress: false })).toBe(5);
  });

  it('gates are cumulative: a high readiness alone does not skip Sprout', () => {
    expect(growthFor(facts({ low: 90, spread: 0.9, mock50: true, dress: true, readyHeld: true, cleanMastery: [1, 1, 1, 1, 1] }))).toBe(1);
  });

  it('nextGrowth never goes down', () => {
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) expect(nextGrowth(a as GrowthLevel, b as GrowthLevel)).toBe(Math.max(a, b));
  });

  it('the rule texts carry the constants, a percentage, and no bank size or "stage"', () => {
    expect(GROWTH_RULES[2]).toContain('20');
    expect(GROWTH_RULES[4]).toContain('55%');
    expect(GROWTH_RULES[5]).toContain('65%');
    for (const r of Object.values(GROWTH_RULES)) {
      expect(r).not.toMatch(/stage/i);
      expect(r).not.toMatch(/\bof \d{3,}/);
    }
  });

  it('nextGrowthSteps lists the next rule with 0..1 progress, and nothing at Elder', () => {
    const s = nextGrowthSteps(1, facts({ cleanAnswered: 5 }))!;
    expect(s.growth).toBe(2);
    expect(s.steps[0].progress).toBeCloseTo(0.25);
    for (let g = 1; g <= 5; g++) for (const step of nextGrowthSteps(g as GrowthLevel, factsFor(3))!.steps) {
        expect(step.progress).toBeGreaterThanOrEqual(0);
        expect(step.progress).toBeLessThanOrEqual(1);
      }
    expect(nextGrowthSteps(6, factsFor(6))).toBeNull();
  });
});

describe('advance: monotonic, skips share a time, one pending moment', () => {
  it('skipped growths get the same reached time; only the highest is pending', () => {
    const p = plantNew('oak', 'Kai', T0);
    const { plant, grew } = advance(p, factsFor(4), T0 + 1000);
    expect(grew).toBe(4);
    expect(plant.growth).toBe(4);
    expect(plant.pending).toBe(4);
    expect(plant.reached).toEqual({ sprout: T0 + 1000, shoot: T0 + 1000, bough: T0 + 1000 });
  });

  it('a dip in the data never lowers growth, and returns the same object', () => {
    const p = advance(plantNew('oak', '', T0), factsFor(5), T0).plant;
    const again = advance(p, factsFor(2), T0 + 5);
    expect(again.grew).toBeNull();
    expect(again.plant).toBe(p);
  });

  it('random fact streams: growth never decreases', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let p = plantNew('sunflower', 'Sunny', T0);
    for (let i = 0; i < 400; i++) {
      const before = p.growth;
      p = advance(p, factsFor((1 + Math.floor(rnd() * 6)) as GrowthLevel), T0 + i).plant;
      expect(p.growth).toBeGreaterThanOrEqual(before);
      expect(isValidPlantState(p)).toBe(true);
    }
  });

  it('clearPending removes only the pending mark', () => {
    const p = advance(plantNew('pine', '', T0), factsFor(2), T0).plant;
    const c = clearPending(p);
    expect(c.pending).toBeUndefined();
    expect(c.growth).toBe(2);
    expect(clearPending(c)).toBe(c);
  });
});

describe('life cycle', () => {
  const grown = (): CertPlant => ({ ...advance(plantNew('cherry-blossom', 'Hana', T0), factsFor(5), T0 + 10).plant, look: { ground: 'meadow', keepsakes: ['lantern'] }, kept: ['robin'] });

  it('plantNew: a seed, or a quiet back-fill for an existing learner', () => {
    // Mobile 1.40: a new plant is written down as botanical at birth.
    expect(plantNew('oak', '  Kai  ', T0)).toEqual({ species: 'oak', name: 'Kai', plantedAt: T0, growth: 1, look: { style: 'botanical' } });
    const b = plantNew('oak', 'Kai', T0, 4);
    expect(b.growth).toBe(4);
    expect(b.backfill).toEqual({ at: T0, growth: 4 });
    expect(b.pending).toBeUndefined(); // a back-fill is a summary line, not a grow-up moment
    expect(isValidPlantState(b)).toBe(true);
  });

  it('reset: back to a seed, keeping name, species, look, planted date and every unlock', () => {
    const r = resetPlant(grown(), T0 + 99, ['stone-ring', 'robin', 'Bad Id']);
    expect(r.growth).toBe(1);
    expect(r.reached).toBeUndefined();
    expect(r.pending).toBeUndefined();
    expect(r.name).toBe('Hana');
    expect(r.species).toBe('cherry-blossom');
    expect(r.plantedAt).toBe(T0);
    expect(r.replantedAt).toBe(T0 + 99);
    expect(r.look).toEqual({ ground: 'meadow', keepsakes: ['lantern'] });
    expect(r.kept).toEqual(['robin', 'stone-ring']);
    expect(r.backfill).toEqual({ at: T0 + 99, growth: 1, seen: true });
    expect(isValidPlantState(r)).toBe(true);
  });

  it('switching species keeps every bit of growth; the colourway goes back to the default', () => {
    const p = { ...grown(), look: { colourway: 'white', ground: 'meadow' } };
    const s = switchSpecies(p, 'bamboo');
    expect(s.species).toBe('bamboo');
    expect(s.growth).toBe(p.growth);
    expect(s.reached).toEqual(p.reached);
    expect(s.look).toEqual({ ground: 'meadow' });
    expect(switchSpecies(s, 'bamboo')).toBe(s);
  });

  it('rename cleans the name; the call name falls back to the species', () => {
    const p = renamePlant(grown(), '‮evil‬  name');
    expect(p.name).toBe('evil name');
    expect(plantCallName({ name: '', species: 'coconut-palm' })).toBe('Your coconut palm');
    expect(plantCallName({ name: 'Isla', species: 'coconut-palm' })).toBe('Isla');
  });
});

describe('cleanPlantName', () => {
  it('strips controls, zero-widths and bidi marks, and collapses spaces', () => {
    expect(cleanPlantName('a\u0000b\u0007c')).toBe('abc');
    expect(cleanPlantName('Ju​ni﻿per')).toBe('Juniper');
    expect(cleanPlantName('⁦Kai⁩')).toBe('Kai');
    expect(cleanPlantName('  big \n\t tree  ')).toBe('big tree');
  });
  it('keeps at most 20 code points, never splitting an emoji', () => {
    const s = cleanPlantName('🌳'.repeat(30));
    expect(Array.from(s)).toHaveLength(MAX_NAME);
    expect(s).toBe('🌳'.repeat(MAX_NAME));
  });
  it('normalises to NFC and is idempotent', () => {
    const decomposed = 'Café';
    expect(cleanPlantName(decomposed)).toBe('Café');
    for (const raw of ['x', ' a  b ', '‮x', 'é'.normalize('NFD'), 'a'.repeat(40)]) expect(cleanPlantName(cleanPlantName(raw))).toBe(cleanPlantName(raw));
  });
});

describe('isValidPlantState (backup restore)', () => {
  const ok: CertPlant = { species: 'lotus', name: 'Padma', plantedAt: T0, growth: 3, reached: { sprout: T0, shoot: T0 + 1 }, pending: 3 };

  it('accepts a well-formed plant, with or without the optional fields', () => {
    expect(isValidPlantState(ok)).toBe(true);
    expect(isValidPlantState({ species: 'oak', name: '', plantedAt: 0, growth: 1 })).toBe(true);
    expect(
      isValidPlantState({ ...ok, replantedAt: T0, backfill: { at: T0, growth: 2, seen: false }, look: { colourway: 'oak-autumn', ground: 'meadow', planter: 'celadon', visitor: 'wren', keepsakes: ['jay', 'fox'] }, kept: ['robin'], passedOn: '2026-11-02' }),
    ).toBe(true);
  });

  it.each([
    ['not an object', null],
    ['an array', []],
    ['an unknown species', { ...ok, species: 'lavender' }],
    ['an unclean name', { ...ok, name: ' Padma' }],
    ['a name with a bidi mark', { ...ok, name: '‮x' }],
    ['a long name', { ...ok, name: 'x'.repeat(21) }],
    ['a negative date', { ...ok, plantedAt: -1 }],
    ['a NaN date', { ...ok, plantedAt: NaN }],
    ['growth 0', { ...ok, growth: 0 }],
    ['growth 7', { ...ok, growth: 7 }],
    ['growth 2.5', { ...ok, growth: 2.5 }],
    ['growth as a string', { ...ok, growth: '3' }],
    ['reached above growth', { ...ok, reached: { bough: T0 } }],
    ['an unknown reached key', { ...ok, reached: { bloom: T0 } }],
    ['pending above growth', { ...ok, pending: 4 }],
    ['pending at Seed', { ...ok, pending: 1 }],
    ['a back-fill above growth', { ...ok, backfill: { at: T0, growth: 4 } }],
    ['four keepsakes', { ...ok, look: { keepsakes: ['a', 'b', 'c', 'd'] } }],
    ['a repeated keepsake', { ...ok, look: { keepsakes: ['jay', 'jay'] } }],
    ['a look id with spaces', { ...ok, look: { ground: 'stone ring' } }],
    ['an unknown Form IV final', { ...ok, look: { final: 'sparkle' } }],
    ['a bad pass date', { ...ok, passedOn: '2 Nov' }],
  ])('refuses %s', (_why, x) => {
    expect(isValidPlantState(x)).toBe(false);
  });

  // Mobile 1.50 (forward-compatible): a newer app's extra fields are ignored, never a reason to refuse its backup.
  it.each([
    ['a back-fill with extra keys', { ...ok, backfill: { at: T0, growth: 2, x: 1 } }],
    ['an unknown look key', { ...ok, look: { hat: 'cap' } }],
    ['an unknown top-level key', { ...ok, water: 3 }],
    ['the Form IV final', { ...ok, look: { final: 'moot' } }],
  ])('accepts %s', (_why, x) => {
    expect(isValidPlantState(x)).toBe(true);
  });

  it('settings: three optional booleans, nothing else', () => {
    expect(isValidPlantSettings({})).toBe(true);
    expect(isValidPlantSettings({ showPlant: false, quietLook: true })).toBe(true);
    expect(isValidPlantSettings({ promptHidden: true })).toBe(true);
    expect(isValidPlantSettings({ promptHidden: 1 })).toBe(false);
    expect(isValidPlantSettings({ showPlant: 'no' })).toBe(false);
    expect(isValidPlantSettings({ mood: 'sad' })).toBe(false);
    expect(plantShown(undefined)).toBe(true);
    expect(plantShown({ showPlant: false })).toBe(false);
    expect(plantHasFace({})).toBe(true);
    expect(plantHasFace({ quietLook: true })).toBe(false);
  });
});

describe('restore clamp', () => {
  const ev = { answered: 0, answeredByDomain: [0, 0, 0, 0, 0], spread: 0, mock50: false, dress: false, readyEver: false };

  it('maxSupportedGrowth uses plain necessary conditions, cumulatively', () => {
    expect(maxSupportedGrowth(ev)).toBe(1);
    expect(maxSupportedGrowth({ ...ev, answered: 20 })).toBe(2);
    expect(maxSupportedGrowth({ ...ev, answered: 50, answeredByDomain: [10, 10, 10, 10, 10], spread: 0.05 })).toBe(3);
    expect(maxSupportedGrowth({ ...ev, answered: 50, answeredByDomain: [10, 10, 10, 10, 10], spread: 0.3 })).toBe(4);
    expect(maxSupportedGrowth({ ...ev, answered: 50, answeredByDomain: [10, 10, 10, 10, 10], spread: 0.5, mock50: true })).toBe(5);
    const elder = { answered: 200, answeredByDomain: [20, 20, 20, 20, 20], spread: 0.6, mock50: true, dress: true, readyEver: true };
    expect(maxSupportedGrowth(elder)).toBe(6);
    expect(maxSupportedGrowth({ ...elder, readyEver: false })).toBe(5);
    // The live Elder gate needs 10 clean answers per domain (mastery = credit / max(n, 10)), so the clamp does too (PR #43 B1a).
    expect(maxSupportedGrowth({ ...elder, answeredByDomain: [20, 20, 10, 20, 20] })).toBe(6);
    expect(maxSupportedGrowth({ ...elder, answeredByDomain: [20, 20, 9, 20, 20] })).toBe(2);
  });

  it('is the live gates on the best-case facts: one shared rule, never a stricter copy', () => {
    const elder = { answered: 200, answeredByDomain: [20, 20, 10, 20, 20], spread: 0.6, mock50: true, dress: true, readyEver: true };
    expect(maxSupportedGrowth(elder)).toBe(growthFor(bestCaseFacts(elder)));
    expect(bestCaseFacts(elder)).toMatchObject({ cleanAnswered: 200, low: 100, cleanMastery: [1, 1, 1, 1, 1], readyHeld: true });
    expect(bestCaseFacts({ ...elder, answered: 39 }).low).toBeNull(); // no range below RANGE_MIN_ANSWERS
    expect(bestCaseFacts({ ...elder, answeredByDomain: [5, 20, 20, 20, 20] }).cleanMastery[0]).toBe(0.5);
  });

  it('clampToSupported lowers growth and trims reached, pending and the back-fill', () => {
    const p: CertPlant = { species: 'oak', name: 'Kai', plantedAt: T0, growth: 5, reached: { sprout: 1, shoot: 2, bough: 3, crown: 4 }, pending: 5, backfill: { at: T0, growth: 4 } };
    const c = clampToSupported(p, 3);
    expect(c.growth).toBe(3);
    expect(c.reached).toEqual({ sprout: 1, shoot: 2 });
    expect(c.pending).toBeUndefined();
    expect(c.backfill).toEqual({ at: T0, growth: 3 });
    expect(isValidPlantState(c)).toBe(true);
    expect(clampToSupported(c, 3)).toBe(c);
    expect(clampToSupported(c, 6)).toBe(c); // a clamp never raises growth
  });
});

describe('plantFacts and supportEvidence from saved progress', () => {
  const rec = (correct: boolean, extra: Partial<AnswerRecord> = {}): AnswerRecord => ({ attempts: 1, correctCount: correct ? 1 : 0, lastCorrect: correct, lastAt: T0, ...extra });
  function answers(perDomain: number, extra: Partial<AnswerRecord> = {}) {
    const a: Record<string, AnswerRecord> = {};
    for (let d = 1; d <= 5; d++) for (let i = 0; i < perDomain; i++) a[`d${d}_${String(i).padStart(3, '0')}`] = rec(true, extra);
    return a;
  }
  const subs = [['1A'], ['2A', '2B'], ['3A'], ['4A', '4B'], ['5A', '5B']];
  const base = { cert: cisa, subtopicsByDomain: subs, mocks: [] as PlantMock[], today: '2026-10-12' };

  it('Coach me and game answers never count toward the gates', () => {
    expect(plantFacts({ ...base, answers: answers(10, { lastAssisted: true }) }).cleanAnswered).toBe(0);
    expect(plantFacts({ ...base, answers: answers(10, { lastGame: true }) }).cleanAnswered).toBe(0);
    const f = plantFacts({ ...base, answers: answers(10) });
    expect(f.cleanAnswered).toBe(50);
    expect(f.cleanByDomain).toEqual([10, 10, 10, 10, 10]);
    expect(f.low).not.toBeNull(); // 50 answers unlock the range
    // A game round never moves readiness' low end for the plant (owner rule).
    expect(plantFacts({ ...base, answers: answers(10, { lastGame: true }) }).low).toBeNull();
    const games: Record<string, AnswerRecord> = {};
    for (let d = 1; d <= 5; d++) for (let i = 50; i < 70; i++) games[`d${d}_${String(i).padStart(3, '0')}`] = rec(false, { lastGame: true });
    expect(plantFacts({ ...base, answers: { ...answers(10), ...games } }).low).toBe(f.low);
  });

  it('spread is weighted like the exam and renormalised over domains with an outline', () => {
    expect(outlineSpread(WEIGHTS, subs, undefined)).toBe(0);
    const m = { '4A': { firstDay: '2026-10-01', masteredAt: '2026-10-02' }, '4B': { firstDay: '2026-10-01' } };
    // D4 is 26 of 100: half of it known → 0.13.
    expect(outlineSpread(WEIGHTS, subs, m)).toBeCloseTo(0.13);
    // Only D4 has an outline: its half is half of everything.
    expect(outlineSpread(WEIGHTS, [[], [], [], ['4A', '4B'], []], m)).toBeCloseTo(0.5);
  });

  it('mocks: 50+ for Crown, full + timed + nothing unanswered for Elder', () => {
    const full = cisa.exam.questions;
    const f = plantFacts({ ...base, answers: {}, mocks: [{ total: 50, correct: 30, day: '2026-10-01' }] });
    expect(f.mock50).toBe(true);
    expect(f.dress).toBe(false);
    expect(plantFacts({ ...base, answers: {}, mocks: [{ total: full, correct: 100, day: '2026-10-01', timing: 'standard', unanswered: 0 }] }).dress).toBe(true);
    expect(plantFacts({ ...base, answers: {}, mocks: [{ total: full, correct: 100, day: '2026-10-01', timing: 'untimed', unanswered: 0 }] }).dress).toBe(false);
  });

  it('readyHeld: a 7-day hold, or a ready moment seen AFTER the last replant, AND the clean low end at 80 now', () => {
    const log = Array.from({ length: 7 }, (_, i) => ({ day: `2026-10-${String(6 + i).padStart(2, '0')}`, min: 82, last: 82 }));
    const strong = answers(40);
    expect(plantFacts({ ...base, answers: strong }).low!).toBeGreaterThanOrEqual(80);
    expect(plantFacts({ ...base, answers: strong, readinessLog: log }).readyHeld).toBe(true);
    expect(plantFacts({ ...base, answers: strong, readySeenAt: T0 }).readyHeld).toBe(true);
    expect(plantFacts({ ...base, answers: strong, readySeenAt: T0, replantedAt: T0 + 1 }).readyHeld).toBe(false);
    // Code review B2: the log and the panel count games. Without clean answers at the line, they never open Elder.
    expect(plantFacts({ ...base, answers: {}, readinessLog: log, readySeenAt: T0 }).readyHeld).toBe(false);
    expect(plantFacts({ ...base, answers: answers(40, { lastGame: true }), readinessLog: log }).readyHeld).toBe(false);
  });

  it('supportEvidence counts every answer (a generous necessary condition)', () => {
    const e = supportEvidence({ ...base, answers: answers(4, { lastAssisted: true }), readinessLog: [{ day: '2026-10-01', min: 81, last: 81 }] });
    expect(e.answered).toBe(20);
    expect(e.readyEver).toBe(true);
  });
});

describe('organs', () => {
  it('fullness runs 62%–108% and is never bare, whatever the input', () => {
    expect(organFullness(0)).toBeCloseTo(ORGAN_MIN);
    expect(organFullness(1)).toBeCloseTo(1.08);
    for (const m of [-5, NaN, null, undefined, 9]) {
      const v = organFullness(m as number);
      expect(v).toBeGreaterThanOrEqual(0.62);
      expect(v).toBeLessThanOrEqual(1.08);
    }
  });

  it('size follows the blueprint weight: heavier domains draw larger at equal mastery', () => {
    const os = organs(WEIGHTS, WEIGHTS.map(() => ({ answered: 20, mastery: 0.5 })));
    expect(os).toHaveLength(5);
    expect(os[3].scale).toBeGreaterThan(os[0].scale); // 26% > 18%
    expect(os[0].scale).toBeGreaterThan(os[2].scale); // 18% > 12%
    expect(os[0].scale).toBe(os[1].scale);
    const mean = os.reduce((s, o) => s + o.weightScale, 0) / os.length;
    expect(mean).toBeCloseTo(1);
    expect(organScales(os)).toEqual(os.map((o) => o.scale));
  });

  it('steps read from mastery against the 70% target', () => {
    expect(organStep(0, 0)).toBe(0);
    expect(organStep(5, 0.1)).toBe(1);
    expect(organStep(5, 0.3)).toBe(2);
    expect(organStep(5, 0.6)).toBe(3);
    expect(organStep(5, 0.7)).toBe(4);
  });

  it('"Next to grow" is the domain with the most exam points still to gain', () => {
    expect(nextToGrow(WEIGHTS, [0.9, 0.9, 0.5, 0.9, 0.9])).toBe(2);
    expect(nextToGrow(WEIGHTS, [0.5, 0.5, 0.5, 0.5, 0.5])).toBe(3); // the first 26% domain
  });

  it('organ labels: domain number, full name, percent and word; never a colour', () => {
    const l = organLabel(3, cisa.domains[3].name, 0.3, 2, true);
    expect(l).toBe('Domain 4, IS Operations & Business Resilience, 30 percent, growing. Next to grow.');
    expect(organLabel(0, 'X', 0, 0)).not.toMatch(/bare|weak|green|blue/i);
  });
});

describe('daily life and rest', () => {
  const base = { today: '2026-10-12', planCleared: false, mocks: [] as PlantMock[], earned: {}, domainIds: ['1', '2', '3', '4', '5'] };

  it('new growth = studied today; the visitor = plan cleared', () => {
    expect(dailySignals({ ...base, lastStudyDay: '2026-10-12' }).newGrowth).toBe(true);
    expect(dailySignals({ ...base, lastStudyDay: '2026-10-11' }).newGrowth).toBe(false);
    expect(dailySignals({ ...base, planCleared: true }).visitor).toBe(true);
  });

  it('the first flower: a strong 50+ mock in the last 3 days, or one that beats every earlier 50+ mock', () => {
    const m = (day: string, correct: number, total = 50): PlantMock => ({ day, correct, total });
    expect(dailySignals({ ...base, mocks: [m('2026-10-10', 38)] }).firstFlower).toBe(true); // 76%, 2 days ago
    expect(dailySignals({ ...base, mocks: [m('2026-10-09', 45)] }).firstFlower).toBe(false); // 3 days ago: over
    expect(dailySignals({ ...base, mocks: [m('2026-10-12', 30, 20)] }).firstFlower).toBe(false); // too short
    expect(dailySignals({ ...base, mocks: [m('2026-10-01', 25), m('2026-10-12', 30)] }).firstFlower).toBe(true); // a personal best
    expect(dailySignals({ ...base, mocks: [m('2026-10-01', 32), m('2026-10-12', 30)] }).firstFlower).toBe(false);
  });

  it('part marks and undergrowth are permanent marks from badges', () => {
    const s = dailySignals({ ...base, earned: { 'firm-footing:2': T0, 'rooted:10': T0, 'rooted:30': T0 } });
    expect(s.partMarks).toEqual([false, true, false, false, false]);
    expect(s.undergrowth).toBe(2);
  });

  it('rest: a planned rest day, or 3+ days without study; a new plant is never "resting"', () => {
    expect(isResting(undefined, '2026-10-12')).toBe(false);
    expect(isResting('2026-10-11', '2026-10-12')).toBe(false);
    expect(isResting('2026-10-09', '2026-10-12')).toBe(true);
    expect(isResting('2026-10-12', '2026-10-12', true)).toBe(true);
  });

  it('rest and return lines are kind and never count the days away', () => {
    const p = { name: 'Juniper', species: 'oak' as const };
    expect(restLine(p, '2026-10-12', '2026-10-12')).toBeNull();
    expect(restLine(p, '2026-10-09', '2026-10-12')).toBe("Juniper is resting. Pick up whenever you're ready.");
    const back = restLine(p, '2026-09-01', '2026-10-12')!;
    expect(back).toBe('Juniper kept your place. Pick up where you left off.');
    for (const line of [back, restLine(p, '2026-10-09', '2026-10-12')!]) {
      expect(line).not.toMatch(/\d/);
      expect(line).not.toMatch(/miss|sad|wilt|thirst|neglect|dying|lonely/i);
    }
  });
});

describe('spoken labels (spec §12, "growth" for "stage")', () => {
  it('name first, species, growth n of 6, and the day state', () => {
    expect(plantLabel({ name: 'Kai', species: 'oak', growth: 4 })).toBe('Kai, your oak. Growth: Bough, 4 of 6.');
    expect(plantLabel({ species: 'cherry-blossom', growth: 5, newGrowth: true })).toBe('Your cherry blossom. Growth: Crown, 5 of 6. New growth today.');
    expect(plantLabel({ name: 'Pico', species: 'cactus', growth: 4, resting: true })).toBe('Pico, your cactus. Growth: Bough, 4 of 6. Resting.');
    expect(grewLabel({ name: 'Kai', species: 'oak' }, 5)).toBe('Kai grew to Crown.');
    expect(grewLabel({ name: '', species: 'lotus' }, 2)).toBe('Your lotus grew to Sprout.');
  });

  it('never says "stage", never a sad word, for every species and growth', () => {
    for (const species of PLANT_SPECIES)
      for (let g = 1; g <= 6; g++) {
        const l = plantLabel({ species, growth: g as GrowthLevel, resting: true, newGrowth: true });
        expect(l).not.toMatch(/stage|sad|neglect|dying|wilt/i);
      }
  });
});

describe('certs whose domain count is not 5 (owner decision 5)', () => {
  const dm = (n: number, mastery = 0.5) => Array.from({ length: n }, () => ({ answered: 12, mastery }));

  it('five domains: the slots are exactly the organs', () => {
    expect(organSlots(WEIGHTS, dm(5))).toEqual(organs(WEIGHTS, dm(5)));
  });

  it('8 domains merge into the nearest slot by order; D1 lowest, the last domain last', () => {
    expect(Array.from({ length: 8 }, (_, i) => slotOf(i, 8))).toEqual([0, 1, 1, 2, 2, 3, 3, 4]);
    const w = [16, 10, 13, 13, 12, 13, 13, 10]; // a CISSP-like blueprint
    const domains = w.map((_, i) => ({ answered: 10 + i, mastery: i === 1 ? 0.9 : i === 2 ? 0.1 : 0.5 }));
    const s = organSlots(w, domains);
    expect(s).toHaveLength(PLANT_SLOTS);
    // Slot 1 holds D2 and D3: mastery is their weight-averaged mastery.
    const merged = (0.9 * 10 + 0.1 * 13) / 23;
    expect(s[1].fullness).toBeCloseTo(organFullness(merged), 6);
    // A merged slot weighs more than a single-domain slot at the same mastery.
    expect(s[1].weightScale).toBeGreaterThan(s[0].weightScale * 0.9);
    for (const o of s) expect(o.fullness).toBeGreaterThanOrEqual(ORGAN_MIN);
  });

  it('4 domains: the missing slot is a young organ of average size, never bare', () => {
    const s = organSlots([25, 25, 25, 25], dm(4, 1));
    expect(s).toHaveLength(PLANT_SLOTS);
    expect(s[4].fullness).toBe(ORGAN_MIN);
    expect(s[4].step).toBe(0);
    expect(s[4].weightScale).toBeCloseTo(1, 6);
    expect(s[0].fullness).toBeGreaterThan(s[4].fullness);
    // 3 domains (AAIA-like): two young slots.
    const three = organSlots([40, 30, 30], dm(3));
    expect(three.slice(3).every((o) => o.fullness === ORGAN_MIN && o.scale > 0.5)).toBe(true);
  });

  it('never throws or returns NaN on odd input (no weights, zero weights)', () => {
    for (const w of [[], [0, 0, 0, 0], [5], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]]) {
      const s = organSlots(w, dm(w.length));
      expect(s).toHaveLength(PLANT_SLOTS);
      for (const o of s) expect(Number.isFinite(o.scale)).toBe(true);
    }
  });
});

describe('backup fit: repairPlant', () => {
  it('a valid plant comes back as the same object', () => {
    const p = plantNew('lotus', 'Padma', T0, 3);
    expect(repairPlant(p)).toBe(p);
  });

  it('repairs what an older build could hold into a plant the restore accepts', () => {
    const broken = {
      species: 'oak',
      name: 'Kai\u200B  the   oak',
      plantedAt: T0,
      growth: 2,
      reached: { sprout: T0, crown: T0 },
      pending: 4,
      backfill: { at: T0, growth: 5 },
      look: { colourway: 'Bad Id', ground: 'lantern', keepsakes: ['jay', 'jay', 'a', 'fox', 'cairn', 'lantern'] },
      kept: ['robin', 'robin', 'NOPE'],
    } as unknown as CertPlant;
    expect(isValidPlantState(broken)).toBe(false);
    const fixed = repairPlant(broken);
    expect(isValidPlantState(fixed)).toBe(true);
    expect(fixed.name).toBe('Kai the oak');
    expect(fixed.reached).toEqual({ sprout: T0 });
    expect(fixed.pending).toBeUndefined();
    expect(fixed.backfill).toEqual({ at: T0, growth: 2 });
    // Mobile 1.14: only catalogue ids, each in its own slot (a keepsake is never a ground).
    expect(fixed.look).toEqual({ keepsakes: ['jay', 'fox', 'cairn'] });
    expect(fixed.kept).toEqual(['robin']);
  });

  it('isLookId: catalogue ids only (mobile 1.14; 4a took any short slug)', () => {
    expect(isLookId('stone-ring')).toBe(true);
    expect(isLookId('lantern')).toBe(true);
    expect(isLookId('some-new-slug')).toBe(false);
    expect(isLookId('Stone Ring')).toBe(false);
    expect(isLookId('')).toBe(false);
  });
});

describe('plant lines', () => {
  it('the back-fill line names the growth, or the first sprout for a seed', () => {
    expect(backfillLine({ name: 'Kai', species: 'oak' }, 4)).toBe('Your study so far grew Kai to Bough.');
    expect(backfillLine({ name: '', species: 'cactus' }, 2)).toBe('Your study so far grew your cactus to Sprout.');
    expect(backfillLine({ name: 'Kai', species: 'oak' }, 1)).toMatch(/first 20 answers/);
  });

  it('growthShort says "growth", never "stage"', () => {
    for (const g of [1, 2, 3, 4, 5, 6] as GrowthLevel[]) {
      expect(growthShort(g)).toMatch(new RegExp(`growth ${g} of 6$`));
      expect(growthShort(g)).not.toMatch(/stage/i);
    }
  });
});

// ── PR #43 review: names (code review M3, QA 2–5; probes P4, P5) ─────────
describe('cleanPlantName after the PR #43 review', () => {
  it.each([
    ['U+061C Arabic letter mark', '\u061C'],
    ['U+2060 word joiner', '\u2060'],
    ['U+2062 invisible times', '\u2062'],
    ['U+00AD soft hyphen', '\u00AD'],
    ['U+180E Mongolian vowel separator', '\u180E'],
    ['U+3164 Hangul filler', '\u3164'],
    ['U+115F Hangul choseong filler', '\u115F'],
    ['U+FFA0 halfwidth Hangul filler', '\uFFA0'],
    ['U+2800 blank braille cell', '\u2800'],
    ['U+E0041 tag A', '\u{E0041}'],
    ['U+FFF9 interlinear anchor', '\uFFF9'],
  ])('strips %s', (_n, ch) => {
    expect(cleanPlantName(`Ka${ch}i`)).toBe('Kai');
    // A name made only of it is no name at all ("Your oak"), never a blank-looking one.
    expect(cleanPlantName(`${ch}${ch}${ch}`)).toBe('');
  });

  it('turns newlines and tabs into one space', () => {
    expect(cleanPlantName('Kai\n\tLee')).toBe('Kai Lee');
    expect(cleanPlantName('Kai\r\nLee')).toBe('Kai Lee');
    expect(cleanPlantName('Kai\u2028Lee')).toBe('Kai Lee');
    expect(cleanPlantName('Kai\u3000Lee')).toBe('Kai Lee');
  });

  it('keeps emoji and script joiners between visible characters, and drops stray ones', () => {
    expect(cleanPlantName('👩\u200D💻')).toBe('👩\u200D💻');
    expect(cleanPlantName('🏳\uFE0F\u200D🌈')).toBe('🏳\uFE0F\u200D🌈');
    expect(cleanPlantName('\u0645\u06CC\u200C\u062E\u0648\u0627\u0645')).toBe('\u0645\u06CC\u200C\u062E\u0648\u0627\u0645'); // Persian "mi-khaham"
    expect(cleanPlantName('\u200DKai\u200D')).toBe('Kai');
    expect(cleanPlantName('Kai \u200D Lee')).toBe('Kai Lee');
    expect(cleanPlantName('a\u200D\u200Db')).toBe('a\u200Db');
    // A subdivision flag keeps its tags; tags anywhere else go.
    const scotland = '🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}';
    expect(cleanPlantName(`Go ${scotland}`)).toBe(`Go ${scotland}`);
  });

  it('never cuts an emoji sequence, an accent or a flag in half at the 20 limit', () => {
    const family = '👨\u200D👩\u200D👧\u200D👦'; // 7 code points
    const s = cleanPlantName(`${'a'.repeat(17)}${family}`);
    expect(s).toBe('a'.repeat(17));
    expect(cleanPlantName(`${'a'.repeat(19)}🇵🇭`)).toBe('a'.repeat(19));
    expect(cleanPlantName(`${'a'.repeat(18)}🇵🇭`)).toBe(`${'a'.repeat(18)}🇵🇭`);
    expect(cleanPlantName(`${'a'.repeat(19)}e\u0301`)).toBe(`${'a'.repeat(19)}\u00E9`);
    // A letter and its virama stay together: the conjunct is left out whole.
    expect(cleanPlantName(`${'a'.repeat(19)}\u0915\u094D\u0937`)).toBe('a'.repeat(19));
  });

  it('strips before normalising, so a stripped mark never leaves a name that is not NFC (P5)', () => {
    const once = cleanPlantName('e\u200B\u0301');
    expect(once).toBe('\u00E9');
    expect(cleanPlantName(once)).toBe(once);
    expect(isValidPlantState({ species: 'oak', name: cleanPlantName('Rene\u200B\u0301'), plantedAt: T0, growth: 1 })).toBe(true);
  });

  it('is idempotent on fuzzed names, and every result passes the backup check (P5b)', () => {
    const pool = ['a', 'e', 'o', 'A', ' ', '\n', '\t', '\u0301', '\u0308', '\u0328', '\u200B', '\u200C', '\u200D', '\u202E', '\u2066', '\u0000', '\u00AD', '\u3164', '\u1100', '\u1161', '\u11A8', '🌳', '👩', '\u{1F3FD}', '\uFE0F', '🏴', '\u{E0067}', '\u{E007F}', '🇵', '🇭', '\u30A2', '\u3099', '\u00C5', '\u05E9', '\u0645', '\uFEFF'];
    let seed = 7;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = 0; i < 4000; i++) {
      const raw = Array.from({ length: 1 + Math.floor(rnd() * 34) }, () => pool[Math.floor(rnd() * pool.length)]).join('');
      const once = cleanPlantName(raw);
      expect(cleanPlantName(once)).toBe(once);
      expect(Array.from(once).length).toBeLessThanOrEqual(MAX_NAME);
      expect(once).toBe(once.trim());
      expect(isValidPlantState({ species: 'oak', name: once, plantedAt: T0, growth: 1 })).toBe(true);
    }
  });

  it('bidi-isolates a right-to-left name where a sentence shows it, never in the saved name', () => {
    const p = { name: '\u05E9\u05DC\u05D5\u05DD', species: 'oak' as const };
    expect(cleanPlantName(p.name)).toBe(p.name);
    expect(shownName(p.name)).toBe(`\u2068${p.name}\u2069`);
    expect(grewLabel(p, 5)).toBe(`\u2068${p.name}\u2069 grew to Crown.`);
    expect(plantLabel({ ...p, growth: 2 })).toMatch(/^\u2068/);
    expect(backfillLine(p, 3)).toContain(`\u2068${p.name}\u2069`);
    expect(restLine(p, '2026-01-01', '2026-01-04')).toMatch(/^\u2068/);
    // A left-to-right name reads as it is.
    expect(grewLabel({ name: 'Kai', species: 'oak' }, 5)).toBe('Kai grew to Crown.');
  });
});

// ── PR #43 review B1: the restore clamp never refutes live growth ────────
describe('restore clamp: live growth is always supported (code review B1)', () => {
  const subs = plantSubtopicsFixture();
  function plantSubtopicsFixture() {
    return [1, 2, 3, 4, 5].map((d) => Array.from({ length: 6 }, (_, k) => `${d}A${k + 1}.1`));
  }
  const rec = (o: Partial<AnswerRecord>): AnswerRecord => ({ attempts: 1, correctCount: 1, lastCorrect: true, lastAt: T0, ...o });
  const pickDay = (k: number) => `2026-10-${String(1 + (k % 28)).padStart(2, '0')}`;

  it('growthFor(plantFacts(x)) ≤ maxSupportedGrowth(supportEvidence(x)) for random saves', () => {
    let seed = 11;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const seen = new Set<number>();
    for (let run = 0; run < 1500; run++) {
      // Some saves are strong (most answers right and clean, much mastered, a held week), so every growth shows up.
      const strong = rnd() < 0.4;
      const answers: Record<string, AnswerRecord> = {};
      const per = [0, 1, 2, 3, 4].map(() => (strong ? 30 + Math.floor(rnd() * 20) : Math.floor(rnd() * rnd() * 50)));
      const rightRate = strong ? 0.9 + 0.1 * rnd() : 0.55 + 0.45 * rnd();
      per.forEach((n, i) => {
        for (let k = 0; k < n; k++) {
          const r = strong ? rnd() * 2 : rnd();
          const ok = rnd() < rightRate;
          answers[`d${i + 1}_${String(k).padStart(3, '0')}`] = rec({ correctCount: ok ? 1 : 0, lastCorrect: ok, lastAssisted: r < 0.1 || undefined, lastGame: (r >= 0.1 && r < 0.2) || undefined });
        }
      });
      const mastery: Record<string, { firstDay: string; masteredAt?: string }> = {};
      const share = strong ? 0.7 + 0.3 * rnd() : rnd();
      for (const s of subs.flat()) if (rnd() < share) mastery[s] = { firstDay: pickDay(Math.floor(rnd() * 28)), ...(rnd() < 0.85 ? { masteredAt: '2026-10-20' } : {}) };
      const mocks: PlantMock[] = Array.from({ length: (strong ? 1 : 0) + Math.floor(rnd() * 4) }, () => ({
        total: [10, 50, 150][Math.floor(rnd() * 3)],
        correct: 30,
        day: pickDay(Math.floor(rnd() * 28)),
        timing: rnd() < 0.8 ? 'standard' : 'untimed',
        unanswered: rnd() < 0.8 ? 0 : 2,
      }));
      const lo = strong ? 80 + Math.floor(rnd() * 15) : 60 + Math.floor(rnd() * 40);
      const readinessLog = Array.from({ length: strong ? 10 : Math.floor(rnd() * 10) }, (_, k) => ({ day: `2026-10-${String(3 + k).padStart(2, '0')}`, min: !strong && rnd() < 0.2 ? null : lo, last: !strong && rnd() < 0.2 ? null : lo + 2 }));
      if (strong && rnd() < 0.7) mocks.push({ total: cisa.exam.questions, correct: 120, day: '2026-10-09', timing: 'standard', unanswered: 0 });
      const readySeenAt = rnd() < 0.3 ? T0 : undefined;
      const input = { cert: cisa, answers, mastery, subtopicsByDomain: subs, mocks, readinessLog, readySeenAt, today: '2026-10-12' };
      const live = growthFor(plantFacts(input));
      seen.add(live);
      expect(live).toBeLessThanOrEqual(maxSupportedGrowth(supportEvidence(input)));
    }
    // The random saves really reach the high growths.
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('a full mock history, a Dress Rehearsal mark or study older than the readiness log never refutes (P1b)', () => {
    const answers: Record<string, AnswerRecord> = {};
    for (let d = 1; d <= 5; d++) for (let k = 0; k < 40; k++) answers[`d${d}_${String(k).padStart(3, '0')}`] = rec({});
    const mastery = Object.fromEntries(subs.flat().map((s) => [s, { firstDay: '2026-08-01', masteredAt: '2026-08-03' }]));
    const base = { cert: cisa, answers, mastery, subtopicsByDomain: subs, readinessLog: [{ day: '2026-10-10', min: 70, last: 70 }] };
    const minis: PlantMock[] = Array.from({ length: 50 }, () => ({ total: 10, correct: 8, day: '2026-10-01' }));
    expect(maxSupportedGrowth(supportEvidence({ ...base, mocks: minis.slice(0, 49) }))).toBe(4);
    // 50 mocks: the history is full, so an older 50+ or full mock may have scrolled away.
    expect(maxSupportedGrowth(supportEvidence({ ...base, mocks: minis }))).toBe(6);
    // The Dress Rehearsal badge proves a full, timed mock (and, at 150 questions, a 50+ one).
    expect(maxSupportedGrowth(supportEvidence({ ...base, mocks: [], earned: { 'dress-rehearsal': T0 } }))).toBe(6);
    // Study older than the log's oldest day: an 80+ day may have scrolled out of the log.
    const recent = { ...base, mastery: Object.fromEntries(subs.flat().map((s) => [s, { firstDay: '2026-10-10', masteredAt: '2026-10-11' }])) };
    const nowAnswers = Object.fromEntries(Object.entries(answers).map(([k, a]) => [k, { ...a, lastAt: new Date(2026, 9, 11).getTime() }]));
    expect(supportEvidence({ ...recent, answers: nowAnswers, mocks: [] }).readyEver).toBe(false);
    expect(supportEvidence({ ...base, mocks: minis }).readyEver).toBe(true);
    // A day's LAST reading carries forward into the hold, so it counts too.
    expect(supportEvidence({ ...recent, answers: nowAnswers, mocks: [], readinessLog: [{ day: '2026-10-10', min: 70, last: 81 }] }).readyEver).toBe(true);
  });

  it('a renamed subtopic still counts in its domain; an unreadable id or no outline never refutes (P1c)', () => {
    const w = cisa.domains.map((d) => ({ id: d.id, weight: d.weight }));
    const all = Object.fromEntries(subs.flat().map((s) => [s, { firstDay: '2026-09-01', masteredAt: '2026-09-03' }]));
    expect(supportSpread(w, subs, all)).toBeCloseTo(1);
    // The same mastery after a notes rewrite renamed 70% of the ids ("1A1.1" → "1A1.1-v2"): still everything known.
    const renamed = Object.fromEntries(Object.entries(all).map(([k, v], i) => [i % 10 < 7 ? `${k}-v2` : k, v]));
    expect(outlineSpread(cisa.domains.map((d) => d.weight), subs, renamed)).toBeLessThan(0.45);
    expect(supportSpread(w, subs, renamed)).toBeCloseTo(1);
    // Renamed ids never count past the domain's own size.
    const doubled = { ...all, ...Object.fromEntries(subs[0].map((s) => [`${s}-old`, all[s]])) };
    expect(supportSpread(w, subs, doubled)).toBeCloseTo(1);
    expect(supportSpread(w, subs, { '1A1.1-x': all['1A1.1'] })).toBeCloseTo(cisa.domains[0].weight / 100 / 6, 3);
    expect(supportSpread(w, subs, { 'zz-unknown': all['1A1.1'] })).toBe(1);
    expect(supportSpread(w, [], { '1A1.1': all['1A1.1'] })).toBe(1);
    expect(supportSpread(w, subs, {})).toBe(0);
    // Mastery begun but not yet mastered is no evidence.
    expect(supportSpread(w, subs, { '1A1.1': { firstDay: '2026-09-01' } })).toBe(0);
  });
});
