/**
 * Mobile 1.40: the plant's Style (owner decision, 22 Oct 2026).
 *
 * Plain English: a new plant is a calm botanical drawing with no face; the
 * storybook art (and its face) is a free choice on the Look screen. A plant
 * saved BEFORE 1.40 has no `look.style`, so it keeps exactly the art it had:
 * the face, or no face if the old Settings switch "Quiet look" was on.
 * Nothing is renamed or migrated: the rule reads only saved data, per plant.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  freezeKeepsakes,
  isValidPlantState,
  plantFace,
  plantNew,
  repairPlant,
  resetPlant,
  switchSpecies,
  withLook,
  type CertPlant,
} from '../engine/plant';
import { isKeepable, LOOK_ITEMS, NEW_PLANT_STYLE, resolveLook, resolveStyle, STYLES, styleHasFace, unlockedLooks } from '../engine/plantLooks';
import { PROGRESS_VERSION } from '../engine/saveMigrations';
import { carryPlantIdentity, plantLookView } from '../lib/plant';
import { selectCert, useProgress, type CertProgress } from '../store/progress';
import { legacy } from '../../jest/legacyPlant';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const T0 = Date.UTC(2026, 9, 22, 9);
const DAY = 86_400_000;

describe('resolveStyle: the rule', () => {
  it('a plant with no style follows the old Quiet look switch; an explicit style wins', () => {
    expect(resolveStyle(undefined, undefined)).toBe('storybook-face');
    expect(resolveStyle({}, {})).toBe('storybook-face');
    expect(resolveStyle({}, { quietLook: false })).toBe('storybook-face');
    expect(resolveStyle({}, { quietLook: true })).toBe('storybook');
    expect(resolveStyle({ style: 'botanical' }, { quietLook: false })).toBe('botanical');
    expect(resolveStyle({ style: 'storybook-face' }, { quietLook: true })).toBe('storybook-face');
    expect(resolveStyle({ style: 'storybook' }, undefined)).toBe('storybook');
  });
  it('an unknown or wrong-slot id falls back to the legacy rule', () => {
    expect(resolveStyle({ style: 'meadow' }, undefined)).toBe('storybook-face');
    expect(resolveStyle({ style: 'nope' }, { quietLook: true })).toBe('storybook');
  });
  it('only the storybook style with a face has a face', () => {
    expect(STYLES.map((s) => [s.id, styleHasFace(s.id as never)])).toEqual([
      ['botanical', false],
      ['storybook', false],
      ['storybook-face', true],
    ]);
  });
  it('the three styles are free, listed first, and never kept through a Reset (nothing to keep)', () => {
    expect(LOOK_ITEMS.slice(0, 3).map((x) => x.id)).toEqual(['botanical', 'storybook', 'storybook-face']);
    for (const s of STYLES) {
      expect(s.slot).toBe('style');
      expect(s.unlock).toEqual({ kind: 'free' });
      expect(isKeepable(s.id)).toBe(false);
    }
    expect(unlockedLooks({ growth: 1 }, [])).toEqual(expect.arrayContaining(['botanical', 'storybook', 'storybook-face']));
  });
});

describe('the saved field', () => {
  const p = () => plantNew('oak', 'Kai', T0, 3);
  it('plantNew writes botanical at birth', () => {
    expect(NEW_PLANT_STYLE).toBe('botanical');
    expect(p().look).toEqual({ style: 'botanical' });
    expect(plantNew('lotus', '', T0).look?.style).toBe('botanical');
    expect(isValidPlantState(p())).toBe(true);
  });
  it('Reset, Change plant, a restore with no plant and a colour change all keep it', () => {
    expect(resetPlant(p(), T0 + DAY).look?.style).toBe('botanical');
    expect(switchSpecies(withLook(p(), { colourway: 'oak-autumn' }), 'maple').look).toEqual({ style: 'botanical' });
    expect(withLook(p(), { colourway: 'oak-autumn' }).look).toEqual({ style: 'botanical', colourway: 'oak-autumn' });
    const restored = { answers: {}, review: {}, bookmarks: [], mocks: [], lessonsDone: [], mistakes: {}, gameBest: {} } as unknown as CertProgress;
    expect(carryPlantIdentity('cisa', restored, p(), T0)?.look).toEqual({ style: 'botanical' });
  });
  it('a restore with no plant keeps a pre-1.40 phone plant WITHOUT a style (it stays storybook)', () => {
    const restored = { answers: {}, review: {}, bookmarks: [], mocks: [], lessonsDone: [], mistakes: {}, gameBest: {} } as unknown as CertProgress;
    const old = legacy(p());
    expect(old.look).toBeUndefined();
    const carried = carryPlantIdentity('cisa', restored, old, T0)!;
    expect(carried.look).toBeUndefined();
    expect(resolveStyle(carried.look, undefined)).toBe('storybook-face');
  });
  it('withLook: sets it; null removes it (back to the legacy rule); a non-style id is ignored', () => {
    const face = withLook(p(), { style: 'storybook-face' });
    expect(face.look).toEqual({ style: 'storybook-face' });
    const cleared = withLook(face, { style: null });
    expect(cleared.look).toBeUndefined();
    expect(withLook(face, { style: 'meadow' })).toBe(face);
    expect(withLook(face, { style: 'storybook-face' })).toBe(face);
  });
  it('validation: a style of the style slot is accepted; another slot’s id is refused; repair drops it', () => {
    expect(isValidPlantState({ ...p(), look: { style: 'storybook' } })).toBe(true);
    const bad = { ...p(), look: { style: 'meadow', colourway: 'oak-autumn' } } as CertPlant;
    expect(isValidPlantState(bad)).toBe(false);
    expect(repairPlant(bad).look).toEqual({ colourway: 'oak-autumn' });
  });
});

describe('what each style draws by default (props are opt-in on a botanical plant)', () => {
  const marks = [{ earned: { 'dress-rehearsal': T0 - 3 * DAY, 'snare-wise': T0 - 2 * DAY } }];
  it('botanical: no visitor and no keepsakes until the learner picks them; picked ones always show', () => {
    const p = plantNew('oak', 'Kai', T0, 4);
    const open = unlockedLooks(p, marks);
    const r = resolveLook('oak', p.look, open, ['lantern', 'fox'], 'botanical');
    expect([r.style, r.visitor, r.keepsakes]).toEqual(['botanical', 'no-visitor', []]);
    const picked = resolveLook('oak', { style: 'botanical', visitor: 'wren', keepsakes: ['fox'] }, open, ['lantern', 'fox'], 'botanical');
    expect([picked.visitor, picked.keepsakes]).toEqual(['wren', ['fox']]);
  });
  it('a plant saved before 1.40 (storybook): the wren and the first three earned, as before', () => {
    const p = legacy(plantNew('oak', 'Kai', T0, 4));
    const r = resolveLook('oak', p.look, unlockedLooks(p, marks), ['lantern', 'fox']);
    expect([r.style, r.visitor, r.keepsakes]).toEqual(['storybook-face', 'wren', ['lantern', 'fox']]);
    expect(resolveLook('oak', p.look, unlockedLooks(p, marks), ['lantern', 'fox'], 'storybook').visitor).toBe('wren');
  });
  it('freezeKeepsakes (before a Reset) leaves a botanical plant alone: its default is none', () => {
    const b = plantNew('oak', 'Kai', T0, 4);
    expect(freezeKeepsakes(b, marks)).toBe(b);
    const old = legacy(plantNew('oak', 'Kai', T0, 4));
    expect(freezeKeepsakes(old, marks).look?.keepsakes).toEqual(['lantern', 'fox']);
  });
  it('the view: the art carries the style; the face (and its words) only with a face; the posture for every style', () => {
    const grew = (style?: string) => {
      const base = plantNew('oak', 'Kai', T0 - 5 * DAY, 3);
      const p = { ...base, growth: 4 as const, reached: { ...base.reached, bough: T0 } };
      return style ? withLook(p, { style }) : legacy(p);
    };
    const today = new Date(T0).toISOString().slice(0, 10);
    const input = { marks: [], resting: false, planCleared: false, newTopicToday: false, newKeepsakeToday: false, today };
    for (const [style, face] of [
      ['botanical', false],
      ['storybook', false],
      ['storybook-face', true],
    ] as const) {
      const v = plantLookView(grew(style), { ...input, style });
      expect([v.art.style, v.face, v.mood]).toEqual([style, face, 'proud']);
    }
    // No style and Quiet look off: the face, as before 1.40.
    expect(plantLookView(grew(), { ...input, face: true }).art.style).toBe('storybook-face');
    expect(plantLookView(grew(), { ...input, face: false }).art.style).toBe('storybook');
  });
  it('plantFace: the plant’s own style, else the Quiet look switch', () => {
    expect(plantFace(plantNew('oak', 'Kai', T0), {})).toBe(false);
    expect(plantFace(legacy(plantNew('oak', 'Kai', T0)), {})).toBe(true);
    expect(plantFace(legacy(plantNew('oak', 'Kai', T0)), { quietLook: true })).toBe(false);
    expect(plantFace(withLook(plantNew('oak', 'Kai', T0), { style: 'storybook-face' }), { quietLook: true })).toBe(true);
  });
});

describe('saved-data guard: a learner updating to 1.40 keeps their plant exactly', () => {
  // The exact shape the current release saves under aurivan.progress.v1: a plant without `style`.
  const save = (plantSettings: Record<string, unknown>) => ({
    state: {
      byCert: {
        cisa: {
          answers: {},
          review: {},
          bookmarks: [],
          mocks: [],
          lessonsDone: [],
          mistakes: {},
          gameBest: {},
          plant: { species: 'maple', name: 'Ada', plantedAt: T0 - 40 * DAY, growth: 4, reached: { sprout: T0 - 30 * DAY, shoot: T0 - 20 * DAY, bough: T0 - 10 * DAY }, look: { colourway: 'maple-gold', keepsakes: ['lantern'] } },
        },
      },
      plantSettings,
      reports: [],
      days: {},
    },
    version: PROGRESS_VERSION,
  });
  const load = async (raw: ReturnType<typeof save>) => {
    await AsyncStorage.setItem('aurivan.progress.v1', JSON.stringify(raw));
    await useProgress.persist.rehydrate();
    return useProgress.getState();
  };

  it('no style and no settings: the storybook plant with its face; nothing renamed or rewritten', async () => {
    const raw = save({});
    const s = await load(raw);
    const plant = selectCert(s, 'cisa').plant!;
    expect(plant).toEqual(raw.state.byCert.cisa.plant);
    expect(plant.look?.style).toBeUndefined();
    expect(resolveStyle(plant.look, s.plantSettings)).toBe('storybook-face');
    expect(plantFace(plant, s.plantSettings)).toBe(true);
    // The key is unchanged and still holds the plant as it was.
    const stored = JSON.parse((await AsyncStorage.getItem('aurivan.progress.v1'))!);
    expect(stored.state.byCert.cisa.plant).toEqual(raw.state.byCert.cisa.plant);
  });

  it('with Quiet look on: the storybook plant without a face; the switch is kept', async () => {
    const s = await load(save({ quietLook: true }));
    const plant = selectCert(s, 'cisa').plant!;
    expect(s.plantSettings?.quietLook).toBe(true);
    expect(resolveStyle(plant.look, s.plantSettings)).toBe('storybook');
    expect(plantFace(plant, s.plantSettings)).toBe(false);
  });
});
