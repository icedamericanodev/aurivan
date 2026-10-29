/**
 * Mobile 1.50: the plant grows into FORMS (engine/plantForms.ts, the art in
 * components/plant/forms/). What these pin, in plain words:
 * - every growth of every species maps to its form (I = 1–2, II = 3,
 *   III = 4–5, IV = 6), and Form IV draws the learner's chosen final;
 * - names hold the species' word, pass the name cleaner and never say
 *   "evolve", "stage", "ready" or "pass";
 * - saves from before forms load unchanged, show their form at once, and
 *   a newer app's extra fields never make a backup unrestorable;
 * - delayed recall counts unique questions, a week or more later, clean
 *   answers only, and gates only the later forms' crossings (it never
 *   lowers a growth a plant already has);
 * - the reveal plays once per form, never for history, with a Reduce
 *   Motion cross-fade;
 * - every form stays within its SVG element budget.
 */
import { bounds, buildPlant, countShapes, groupNames, type GNode, type PNode } from '../components/plant/art';
import { FORM_LINES } from '../components/plant/forms';
import { afterAnswer, type AnswerEvent, type CertMilestones } from '../engine/milestones';
import { LONG_GAP_DAYS } from '../engine/milestones';
import {
  advance,
  bestCaseFacts,
  cleanPlantName,
  FORM_FACTS,
  GROWTH_RULES,
  growthFor,
  isValidPlantState,
  nextGrowthSteps,
  plantLabel,
  plantNew,
  PLANT_SPECIES,
  repairPlant,
  SPECIES_INFO,
  type CertPlant,
  type GrowthLevel,
  type PlantFacts,
} from '../engine/plant';
import {
  afterNote,
  afterReveal,
  baselineForms,
  crossesForm,
  delayedRecalls,
  FINAL_IDS,
  FLAVOURS,
  FLAVOUR_IDS,
  FLAVOUR_LOOKS,
  formLook,
  formMoment,
  formName,
  formOf,
  FORMS,
  newFormLine,
  nextFormAt,
  nextFormLine,
  RECALL_FORM_III,
  RECALL_FORM_IV,
  RECALL_GAP_DAYS,
  resolveFinal,
  revealMode,
  revealTimeline,
  SEE_NEW_FORM,
  SPECIES_KEY,
} from '../engine/plantForms';
import { useSeen } from '../store/seen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const GROWTHS: GrowthLevel[] = [1, 2, 3, 4, 5, 6];
const DAY = 86_400_000;
const T0 = new Date(2026, 9, 1, 9, 0, 0).getTime();
const bot = (species: (typeof PLANT_SPECIES)[number], stage: number, extra: Partial<Parameters<typeof buildPlant>[0]> = {}) => buildPlant({ species, stage, style: 'botanical', ...extra });
const find = (n: PNode, id: string): GNode | null => (n.t === 'g' ? (n.id === id ? n : (n.children.map((c) => find(c, id)).find(Boolean) ?? null)) : null);

describe('form mapping: every growth and species', () => {
  it('growth 1–2 is Form I, 3 is II, 4–5 is III, 6 is IV', () => {
    expect(GROWTHS.map(formOf)).toEqual([1, 1, 2, 3, 3, 4]);
    expect(crossesForm(1, 2)).toBe(false);
    expect(crossesForm(2, 3)).toBe(true);
    expect(crossesForm(3, 4)).toBe(true);
    expect(crossesForm(4, 5)).toBe(false);
    expect(crossesForm(5, 6)).toBe(true);
    // A jump counts once, at the highest form reached.
    expect(crossesForm(1, 6)).toBe(true);
    expect(nextFormAt(1)).toEqual({ form: 2, at: 3 });
    expect(nextFormAt(4)).toEqual({ form: 4, at: 6 });
    expect(nextFormAt(6)).toBeNull();
  });

  it('every species × growth has its form name and look; Elder shows the chosen final', () => {
    for (const sp of PLANT_SPECIES) {
      for (const g of GROWTHS) {
        expect(formName(sp, g)).toBe(FORMS[sp][formOf(g) - 1][0]);
        expect(formLook(sp, g)).toBe(FORMS[sp][formOf(g) - 1][1]);
        // A choice changes nothing below Elder.
        if (g < 6) expect(formName(sp, g, 'moot')).toBe(formName(sp, g));
      }
      expect(formName(sp, 6, 'own')).toBe(FORMS[sp][3][0]);
      for (const fl of FLAVOUR_IDS) {
        expect(formName(sp, 6, fl)).toBe(`${FLAVOURS[fl].name} ${SPECIES_KEY[sp]}`);
        expect(formLook(sp, 6, fl)).toBe(FLAVOUR_LOOKS[sp][fl]);
      }
      // An unknown choice (a newer app's) falls back to the line's own final.
      expect(formName(sp, 6, 'sparkle')).toBe(FORMS[sp][3][0]);
    }
    expect(resolveFinal(5, 'moot')).toBe('own');
    expect(resolveFinal(6, 'moot')).toBe('moot');
  });

  it('names: the species word in each, clean, all different, and never game or decline words', () => {
    const all = PLANT_SPECIES.flatMap((sp) => [...FORMS[sp].map((f) => f[0]), ...FLAVOUR_IDS.map((fl) => formName(sp, 6, fl))]);
    expect(new Set(all).size).toBe(all.length);
    for (const sp of PLANT_SPECIES)
      for (const name of [...FORMS[sp].map((f) => f[0]), ...FLAVOUR_IDS.map((fl) => formName(sp, 6, fl))]) {
        expect([sp, name, name.includes(SPECIES_KEY[sp])]).toEqual([sp, name, true]);
        // Clean text (no invisible marks, single spaces), and short enough for one line beside the plant.
        expect(cleanPlantName(name.slice(0, 20))).toBe(name.slice(0, 20));
        expect(name.length <= 24 && name === name.normalize('NFC').replace(/ +/g, ' ').trim()).toBe(true);
      }
    const words = [
      ...PLANT_SPECIES.flatMap((sp) => [...FORMS[sp].flat(), ...Object.values(FLAVOUR_LOOKS[sp])]),
      ...Object.values(FLAVOURS).flatMap((f) => [f.name, f.idea]),
      ...Object.values(FORM_FACTS),
      SEE_NEW_FORM,
      newFormLine('Kai', 'Whip Oak'),
      ...PLANT_SPECIES.map((sp) => nextFormLine(sp, 1) ?? ''),
    ];
    for (const w of words) expect([w, /\bevol|level up|\bstage\b|\bready\b|readiness|\bpass(ed)?\b|rare|shiny|legendary|pok[eé]mon|deadwood|driftwood|\bdying\b/i.test(w)]).toEqual([w, false]);
    // The art's registry and the names cover the same species.
    expect(Object.keys(FORM_LINES).sort()).toEqual([...PLANT_SPECIES].sort());
    expect(FINAL_IDS).toEqual(['own', 'lookout', 'moot', 'espalier', 'coppice', 'holdfast']);
  });

  it('the spoken label names the form after the plant, and never a second number', () => {
    expect(plantLabel({ name: 'Kai', species: 'oak', growth: 4, form: formName('oak', 4) })).toBe('Kai, your oak. Standard Oak form. Growth: Bough, 4 of 6.');
    expect(plantLabel({ species: 'bamboo', growth: 2, form: formName('bamboo', 2) })).toBe('Your bamboo. Sheath Bamboo form. Growth: Sprout, 2 of 6.');
    // Without forms (the storybook style keeps its six growths), the label is as before.
    expect(plantLabel({ name: 'Kai', species: 'oak', growth: 4 })).toBe('Kai, your oak. Growth: Bough, 4 of 6.');
  });
});

describe('the drawing of each form', () => {
  it('each growth draws its form; Form IV draws the chosen final; a choice below Elder changes nothing', () => {
    for (const sp of PLANT_SPECIES) {
      const seed = groupNames(bot(sp, 1).root);
      expect([sp, seed.includes('sprout')]).toEqual([sp, true]);
      // Seed and Sprout are both Form I, Shoot is Form II: a new silhouette, not a bigger copy.
      expect(JSON.stringify(bot(sp, 3).root)).not.toBe(JSON.stringify(bot(sp, 2).root));
      // Bough is Form III before its fruit and flowers: no fruit or blooms groups.
      const bough = groupNames(bot(sp, 4).root);
      expect([sp, bough.includes('fruit') || bough.includes('blooms')]).toEqual([sp, false]);
      const own = JSON.stringify(bot(sp, 6, { look: { final: 'own' } }).root);
      for (const fl of FLAVOUR_IDS) expect([sp, fl, JSON.stringify(bot(sp, 6, { look: { final: fl } }).root) !== own]).toEqual([sp, fl, true]);
      expect(JSON.stringify(bot(sp, 5, { look: { final: 'moot' } }).root)).toBe(JSON.stringify(bot(sp, 5).root));
      // Form IV's light: behind the plant, never at icon size, while resting or with the clear dawn.
      expect(find(bot(sp, 6).root, 'glow')).not.toBeNull();
      expect(find(bot(sp, 6, { lod: 'icon' }).root, 'glow')).toBeNull();
      expect(find(bot(sp, 6, { resting: true }).root, 'glow')).toBeNull();
      expect(find(bot(sp, 6, { look: { keepsakes: ['clear-dawn'] } }).root, 'glow')).toBeNull();
      expect(find(bot(sp, 5).root, 'glow')).toBeNull();
    }
  });

  it('Moot draws its meeting stones (pebbles in a pot); a pot never shows the soil cutaway', () => {
    expect(find(bot('oak', 6, { look: { final: 'moot' } }).root, 'stones-front')).not.toBeNull();
    expect(find(bot('oak', 2).root, 'cutaway')).not.toBeNull();
    expect(find(bot('oak', 2, { look: { planter: 'terracotta' } }).root, 'cutaway')).toBeNull();
    expect(find(bot('cactus', 2).root, 'cutaway')).toBeNull();
  });

  it('SVG element budget per form: at most 90 at full detail (the plant itself), fewer smaller, on the 200 × 200 stage', () => {
    const own = (r: GNode) => countShapes({ t: 'g', id: null, children: r.children.filter((c) => c.t === 'g' && ['tree', 'props-back', 'props-front', 'glow'].includes(c.id ?? '')) });
    let max = 0;
    for (const sp of PLANT_SPECIES)
      for (const g of GROWTHS)
        for (const final of g === 6 ? FINAL_IDS : (['own'] as const))
          for (const theme of ['light', 'dark'] as const) {
            const b = bot(sp, g, { theme, look: { final, keepsakes: ['lantern', 'fox'], visitor: 'robin' }, organs: [1.25, 1.25, 1.25, 1.25, 1.25] });
            const n = own(b.root);
            max = Math.max(max, n);
            const box = bounds(b.root);
            expect([sp, g, final, n <= 90, box.minX >= -0.5 && box.maxX <= 200.5 && box.minY >= -0.5 && box.maxY <= 200.5]).toEqual([sp, g, final, true, true]);
          }
    expect(max).toBeGreaterThan(20);
  });
});

describe('old saves and the backup check', () => {
  const ok: CertPlant = { species: 'oak', name: 'Kai', plantedAt: T0, growth: 5, reached: { sprout: T0, shoot: T0, bough: T0, crown: T0 }, look: { style: 'botanical' } };

  it('a plant saved before forms loads unchanged and is drawn in its form at once (no reset)', () => {
    expect(isValidPlantState(ok)).toBe(true);
    expect(repairPlant(ok)).toBe(ok);
    expect(formName(ok.species, ok.growth)).toBe('Standard Oak');
    expect(groupNames(bot('oak', ok.growth).root).filter((n) => n.startsWith('domain-')).length).toBeGreaterThanOrEqual(5);
    // A storybook plant (saved before 1.40, no style) keeps its six-growth art: forms are botanical-only.
    expect(JSON.stringify(buildPlant({ species: 'oak', stage: 5 }).root)).not.toContain('"glow"');
  });

  it('accepts an optional Form IV choice and ignores fields a newer app may add', () => {
    expect(isValidPlantState({ ...ok, growth: 6, reached: { ...ok.reached, elder: T0 }, look: { style: 'botanical', final: 'holdfast' } })).toBe(true);
    expect(isValidPlantState({ ...ok, look: { style: 'botanical', final: 'sparkle' } })).toBe(false);
    expect(isValidPlantState({ ...ok, look: { style: 'botanical', future: 'x' }, herbarium: { plates: [] } })).toBe(true);
    // A broken final is dropped by the export repair, never kept.
    expect(repairPlant({ ...ok, look: { style: 'botanical', final: 'sparkle' as never } }).look).toEqual({ style: 'botanical' });
  });
});

describe('delayed recall: unique questions, a week or more later, clean answers only', () => {
  const ev = (questionId: string, at: number, prevLastAt: number | undefined, o: Partial<AnswerEvent> = {}): AnswerEvent => ({ questionId, correct: true, assisted: false, game: false, at, prevLastAt, graduated: false, ...o });
  const run = (events: AnswerEvent[]) => events.reduce<CertMilestones | undefined>((m, e) => afterAnswer(m, e).milestones, undefined);

  it('counts each question once, only when right with no hint and not in a game, 7+ days after it was last seen', () => {
    expect(RECALL_GAP_DAYS).toBe(LONG_GAP_DAYS);
    const m = run([
      ev('q1', T0 + 7 * DAY, T0), // a week later: counts
      ev('q1', T0 + 20 * DAY, T0 + 7 * DAY), // the same question again: still one
      ev('q2', T0 + 6 * DAY, T0), // six days: too soon
      ev('q3', T0 + 9 * DAY, T0, { assisted: true }), // after a hint
      ev('q4', T0 + 9 * DAY, T0, { game: true }), // in a game
      ev('q5', T0 + 9 * DAY, T0, { correct: false }), // wrong
      ev('q6', T0 + 9 * DAY, undefined), // never seen before
      ev('q7', T0 + 30 * DAY, T0), // a month later: counts
    ]);
    expect(delayedRecalls(m?.longIds)).toBe(2);
    expect(delayedRecalls(['a', 'a', 'b'])).toBe(2);
    expect(delayedRecalls(undefined)).toBe(0);
  });

  /** Facts that open every gate except, possibly, the recall one. */
  const facts = (recalled?: number): PlantFacts => ({ cleanAnswered: 400, cleanByDomain: [80, 80, 80, 80, 80], cleanMastery: [0.8, 0.8, 0.8, 0.8, 0.8], low: 85, spread: 0.7, mock50: true, dress: true, readyHeld: true, ...(recalled !== undefined ? { recalled } : {}) });

  it('gates the later forms: Bough (Form III) and Elder (Form IV)', () => {
    expect(growthFor(facts(RECALL_FORM_III - 1))).toBe(3);
    expect(growthFor(facts(RECALL_FORM_III))).toBe(5);
    expect(growthFor(facts(RECALL_FORM_IV - 1))).toBe(5);
    expect(growthFor(facts(RECALL_FORM_IV))).toBe(6);
    // Not counted (the website, or an older caller): never a block.
    expect(growthFor(facts())).toBe(6);
    expect(GROWTH_RULES[4]).toMatch(/15 questions right, without a hint, a week or more after you last saw them/);
    expect(nextGrowthSteps(3, facts(6))!.steps.at(-1)).toEqual({ label: 'Get 15 questions right a week or more after you last saw them', progress: 6 / 15 });
    expect(nextGrowthSteps(5, facts(6))!.steps.at(-1)!.label).toMatch(/^Get 30 questions right/);
    expect(nextGrowthSteps(3, facts())!.steps.some((s) => /right a week/.test(s.label))).toBe(false);
  });

  it('never lowers a growth a plant already has, live or on restore', () => {
    const elder: CertPlant = { ...plantNew('oak', 'Kai', T0, 6) };
    expect(advance(elder, facts(0), T0 + DAY).plant).toBe(elder);
    const bough: CertPlant = { ...plantNew('oak', 'Kai', T0, 4) };
    expect(advance(bough, facts(0), T0 + DAY).plant.growth).toBe(4);
    // The restore clamp reads the recall gate generously (a plant may have grown before it existed).
    expect(bestCaseFacts({ answered: 400, answeredByDomain: [80, 80, 80, 80, 80], spread: 0.7, mock50: true, dress: true, readyEver: true }).recalled).toBeUndefined();
  });
});

describe('the reveal: once per form, never for history', () => {
  it('a plant first seen on this release counts what it is as seen; past Form I it is owed one quiet note', () => {
    expect(baselineForms(1)).toEqual({ seen: 1 });
    expect(baselineForms(2)).toEqual({ seen: 1 });
    expect(baselineForms(5)).toEqual({ seen: 3, note: 3 });
    expect(formMoment(5, baselineForms(5))).toEqual({ kind: 'note', form: 3 });
    expect(formMoment(5, afterNote(baselineForms(5)))).toBeNull();
    expect(formMoment(5, undefined)).toBeNull();
  });

  it('a new form reveals once; a skipped form reveals once, at the highest; a Reset never replays', () => {
    let rec = baselineForms(2);
    expect(formMoment(2, rec)).toBeNull();
    expect(formMoment(3, rec)).toEqual({ kind: 'reveal', from: 1, to: 2 });
    rec = afterReveal(rec, 3);
    expect(formMoment(3, rec)).toBeNull();
    expect(formMoment(5, rec)).toEqual({ kind: 'reveal', from: 2, to: 3 });
    expect(formMoment(6, rec)).toEqual({ kind: 'reveal', from: 2, to: 4 });
    rec = afterReveal(rec, 6);
    // A Reset back to Seed, then growing again: each form was already shown.
    for (const g of GROWTHS) expect(formMoment(g, rec)).toBeNull();
    // A note owed for an older form never shows after a newer reveal.
    expect(formMoment(6, afterReveal({ seen: 3, note: 3 }, 6))).toBeNull();
  });

  it('the store keeps it on this phone: a baseline never overwrites, a restore forgets it', () => {
    useSeen.setState({ plantForms: {}, plantFinal: {} });
    useSeen.getState().baselineForms('cisa', 5);
    useSeen.getState().baselineForms('cisa', 1);
    expect(useSeen.getState().plantForms?.cisa).toEqual({ seen: 3, note: 3 });
    useSeen.getState().seeFormNote('cisa');
    useSeen.getState().seeFormReveal('cisa', 6);
    expect(useSeen.getState().plantForms?.cisa).toEqual({ seen: 4 });
    useSeen.getState().forgetForms();
    expect(useSeen.getState().plantForms?.cisa).toBeUndefined();
    // The Form IV choice: kept here only (staged rollout); 'own' clears it.
    useSeen.getState().setPlantFinal('cisa', 'coppice');
    expect(useSeen.getState().plantFinal?.cisa).toBe('coppice');
    useSeen.getState().setPlantFinal('cisa', 'own');
    expect(useSeen.getState().plantFinal?.cisa).toBeUndefined();
  });

  it('Reduce Motion: a 120 ms cross-fade and the words at once; full motion is about 1.2 s', () => {
    const full = revealTimeline(false);
    expect(full.total).toBe(1200);
    expect(full.hold + full.change + full.settle).toBeLessThanOrEqual(full.wordsAt);
    expect(full.wordsAt + full.wordsIn).toBeLessThanOrEqual(full.total);
    expect(revealTimeline(true)).toEqual({ hold: 0, change: 120, settle: 0, wordsAt: 0, wordsIn: 0, total: 120 });
    expect(revealMode(true, () => true)).toBe('reduced');
    // The session's motion budget already spent: the calm cross-fade, never no moment at all.
    expect(revealMode(false, () => false)).toBe('reduced');
    expect(revealMode(false, () => true)).toBe('full');
  });
});

it('every species name in the forms matches the shelf', () => {
  for (const sp of PLANT_SPECIES) expect(FORMS[sp][0][0].toLowerCase()).toContain(SPECIES_KEY[sp].toLowerCase());
  expect(Object.keys(SPECIES_INFO).sort()).toEqual(Object.keys(FORMS).sort());
});
