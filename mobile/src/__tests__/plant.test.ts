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
  switchSpecies,
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
    expect(plantNew('oak', '  Kai  ', T0)).toEqual({ species: 'oak', name: 'Kai', plantedAt: T0, growth: 1 });
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
      isValidPlantState({ ...ok, replantedAt: T0, backfill: { at: T0, growth: 2, seen: false }, look: { colourway: 'pink', ground: 'meadow', visitor: 'wren', keepsakes: ['jay', 'fox'] }, kept: ['robin'], passedOn: '2026-11-02' }),
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
    ['a back-fill with extra keys', { ...ok, backfill: { at: T0, growth: 2, x: 1 } }],
    ['four keepsakes', { ...ok, look: { keepsakes: ['a', 'b', 'c', 'd'] } }],
    ['a repeated keepsake', { ...ok, look: { keepsakes: ['jay', 'jay'] } }],
    ['a look id with spaces', { ...ok, look: { ground: 'stone ring' } }],
    ['an unknown look key', { ...ok, look: { hat: 'cap' } }],
    ['a bad pass date', { ...ok, passedOn: '2 Nov' }],
    ['an unknown top-level key', { ...ok, water: 3 }],
  ])('refuses %s', (_why, x) => {
    expect(isValidPlantState(x)).toBe(false);
  });

  it('settings: two optional booleans, nothing else', () => {
    expect(isValidPlantSettings({})).toBe(true);
    expect(isValidPlantSettings({ showPlant: false, quietLook: true })).toBe(true);
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
    expect(maxSupportedGrowth({ ...elder, answeredByDomain: [20, 20, 19, 20, 20] })).toBe(5);
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

  it('readyHeld: a 7-day hold, or a ready moment seen AFTER the last replant', () => {
    const log = Array.from({ length: 7 }, (_, i) => ({ day: `2026-10-${String(6 + i).padStart(2, '0')}`, min: 82, last: 82 }));
    expect(plantFacts({ ...base, answers: {}, readinessLog: log }).readyHeld).toBe(true);
    expect(plantFacts({ ...base, answers: {}, readySeenAt: T0 }).readyHeld).toBe(true);
    expect(plantFacts({ ...base, answers: {}, readySeenAt: T0, replantedAt: T0 + 1 }).readyHeld).toBe(false);
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
