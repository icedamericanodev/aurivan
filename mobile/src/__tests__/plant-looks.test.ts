/**
 * Mobile 1.14 (Phase 4b "Dress and Alive"): the plant's look catalogue
 * (engine/plantLooks.ts). Pins:
 * - the catalogue: ids unique, catalogue-safe slugs, three colourways per
 *   species (the first is the art's own palette), a keepsake per badge;
 * - the unlock rule, derived: free, growth, a badge (any tier, any cert),
 *   a completed set's planter, the pass ribbon, and `kept`; game levels
 *   unlock nothing; nothing is paid;
 * - the fallback: a choice whose unlock vanished draws the slot's default,
 *   the stored choice is never changed, and it comes back when re-earned;
 * - keepsakes: at most three, distinct; the toggle never exceeds three;
 * - Reset keeps every open unlock in `kept`, and the look survives;
 * - moods: proud > happy > curious > idle, resting wins, Quiet look has none;
 * - copy: plain words, no counters, no guilt, no readiness claim.
 */
import { SPECIES_ART } from '../components/plant/art';
import { BADGES } from '../engine/milestones';
import { PLANT_SPECIES, plantNew, resetPlant, withLook, isValidPlantState, type CertPlant } from '../engine/plant';
import {
  colourwaysFor,
  GROUNDS,
  howToOpen,
  isCatalogLook,
  isLookOfSlot,
  isUnlocked,
  keepOnReset,
  KEEPSAKE_ITEMS,
  keepsakeForBadge,
  LOOK_ITEMS,
  lookItem,
  MAX_SHOWN_KEEPSAKES,
  onYourPlantLine,
  plantersFor,
  plantMood,
  resolveLook,
  toggleKeepsake,
  unlockedLooks,
  VISITORS,
  type CertMarks,
} from '../engine/plantLooks';
import { plantLeaf } from '../theme/tokens';

const T0 = Date.UTC(2026, 9, 1);
const seed = (species = 'oak' as CertPlant['species'], growth: CertPlant['growth'] = 1): CertPlant => ({ ...plantNew(species, 'Kai', T0, growth) });
const none: CertMarks[] = [];

describe('the catalogue', () => {
  it('has unique, slug-shaped ids that fit a backup', () => {
    const ids = LOOK_ITEMS.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9][a-z0-9-]{0,39}$/);
    // Every non-free unlock fits in `kept` (MAX_KEPT 64) at once.
    expect(LOOK_ITEMS.filter((x) => x.unlock.kind !== 'free').length).toBeLessThanOrEqual(64);
  });

  it('three colourways per species: two free and a third at Bough; the first is the art’s own palette', () => {
    for (const sp of PLANT_SPECIES) {
      const ways = colourwaysFor(sp);
      expect(ways).toHaveLength(3);
      expect(ways.map((w) => w.unlock.kind)).toEqual(['free', 'free', 'growth']);
      expect(ways[2].unlock).toEqual({ kind: 'growth', growth: 4 });
      expect(plantLeaf[ways[0].palette!]).toEqual(SPECIES_ART[sp].palette);
      for (const w of ways) expect(plantLeaf[w.palette!]).toBeDefined();
    }
  });

  it('every badge that gives a keepsake exists; Firm Footing and Rooted give none (part marks and undergrowth instead)', () => {
    const ids = new Set(BADGES.map((b) => b.id));
    for (const k of KEEPSAKE_ITEMS) if (k.unlock.kind === 'badge') expect(ids.has(k.unlock.badge as (typeof BADGES)[number]['id'])).toBe(true);
    expect(keepsakeForBadge('firm-footing')).toBeUndefined();
    expect(keepsakeForBadge('rooted')).toBeUndefined();
    expect(keepsakeForBadge('dress-rehearsal')?.id).toBe('lantern');
  });

  it('never a game level, never a purchase: only free, growth, badges, sets and the pass', () => {
    for (const x of LOOK_ITEMS) expect(['free', 'growth', 'badge', 'set', 'passed']).toContain(x.unlock.kind);
    // Game levels (Seedling, Sapling, Heartwood) are saved as gameGrowth, never as milestones: none of them opens anything.
    const plant = seed();
    const levels: CertMarks[] = [{ earned: { seedling: T0, sapling: T0, heartwood: T0, 'level:3': T0 } }];
    expect(unlockedLooks(plant, levels)).toEqual(unlockedLooks(plant, none));
  });

  it('the free start: two colourways, Meadow, its own ground, a terracotta pot, the wren (and no visitor)', () => {
    const open = new Set(unlockedLooks(seed('cherry-blossom'), none));
    expect(open.has('cherry-blossom-pink') && open.has('cherry-blossom-white')).toBe(true);
    expect(open.has('cherry-blossom-dusk')).toBe(false);
    for (const id of ['meadow', 'native', 'terracotta', 'wren', 'no-visitor']) expect(open.has(id)).toBe(true);
    for (const id of ['stone-ring', 'trail-blaze', 'robin', 'celadon', 'lantern']) expect(open.has(id)).toBe(false);
  });

  it('a cactus’ own ground is its terracotta pot, so the pot is never listed twice', () => {
    expect(plantersFor('cactus').map((x) => x.id)).not.toContain('terracotta');
    expect(plantersFor('oak').map((x) => x.id)).toContain('terracotta');
  });
});

describe('unlocks (derived, nothing stored)', () => {
  it('growth opens the robin (Shoot), the third colourway (Bough), Stone ring (Crown) and Trail blaze (Elder)', () => {
    const at = (g: CertPlant['growth']) => new Set(unlockedLooks(seed('oak', g), none));
    expect(at(2).has('robin')).toBe(false);
    expect(at(3).has('robin')).toBe(true);
    expect(at(3).has('oak-autumn')).toBe(false);
    expect(at(4).has('oak-autumn')).toBe(true);
    expect(at(4).has('stone-ring')).toBe(false);
    expect(at(5).has('stone-ring')).toBe(true);
    expect(at(5).has('trail-blaze')).toBe(false);
    expect(at(6).has('trail-blaze')).toBe(true);
  });

  it('a badge opens its keepsake at ANY tier, on ANY cert (badges are the learner’s, not the plant’s)', () => {
    const plant = seed();
    expect(isUnlocked(lookItem('jay')!, plant, [{ earned: { 'long-memory:25': T0 } }])).toBe(true);
    expect(isUnlocked(lookItem('lantern')!, plant, [{ earned: {} }, { earned: { 'dress-rehearsal': T0 } }])).toBe(true);
    // A badge whose id only starts the same way does not count.
    expect(isUnlocked(lookItem('trail-post')!, plant, [{ earned: { 'topic-clear-extra': T0 } }])).toBe(false);
  });

  it('a completed set opens its planter (milestones.planters); the ribbon opens with a reported pass', () => {
    const plant = seed();
    expect(isUnlocked(lookItem('fieldstone')!, plant, [{ planters: { groundwork: T0 } }])).toBe(true);
    expect(isUnlocked(lookItem('celadon')!, plant, [{ planters: { groundwork: T0 } }])).toBe(false);
    expect(isUnlocked(lookItem('ribbon')!, plant, none)).toBe(false);
    expect(isUnlocked(lookItem('ribbon')!, { ...plant, passedOn: '2026-11-02' }, none)).toBe(true);
  });

  it('kept unlocks stay open after a Reset', () => {
    const grown = { ...seed('oak', 6), look: { ground: 'trail-blaze', keepsakes: ['lantern'] } };
    const marks: CertMarks[] = [{ earned: { 'dress-rehearsal': T0 }, planters: { examDay: T0 } }];
    const keep = keepOnReset(grown, marks);
    for (const id of ['trail-blaze', 'stone-ring', 'robin', 'oak-autumn', 'lantern', 'banded']) expect(keep).toContain(id);
    for (const id of ['meadow', 'wren', 'native']) expect(keep).not.toContain(id); // free: nothing to keep
    const reset = resetPlant(grown, T0 + 1, keep);
    expect(reset.growth).toBe(1);
    expect(reset.look).toEqual(grown.look);
    expect(isValidPlantState(reset)).toBe(true);
    // The badge and planter marks are gone after the Reset; the look still draws.
    const r = resolveLook('oak', reset.look, unlockedLooks(reset, none));
    expect(r.ground).toBe('trail-blaze');
    expect(r.keepsakes).toEqual(['lantern']);
  });
});

describe('the fallback (a restore can make an unlock vanish)', () => {
  it('draws the slot default, never changes the stored choice, and comes back when re-earned', () => {
    const plant: CertPlant = { ...seed('cherry-blossom', 6), look: { colourway: 'cherry-blossom-dusk', ground: 'trail-blaze', planter: 'celadon', visitor: 'robin', keepsakes: ['lantern', 'jay'] } };
    const before = JSON.stringify(plant);
    // Restored to a seed with no marks: everything falls back.
    const restored = { ...plant, growth: 1 as const };
    const fell = resolveLook('cherry-blossom', restored.look, unlockedLooks(restored, none));
    expect(fell).toMatchObject({ colourway: 'cherry-blossom-pink', palette: 'blossom', ground: 'meadow', planter: 'native', visitor: 'wren', keepsakes: [] });
    expect(JSON.stringify(plant)).toBe(before);
    // Re-earned: the stored choice draws again, unchanged.
    const back = resolveLook('cherry-blossom', restored.look, unlockedLooks({ ...restored, growth: 6 }, [{ earned: { 'dress-rehearsal': T0, 'long-memory:25': T0 }, planters: { evergreen: T0 } }]));
    expect(back).toMatchObject({ colourway: 'cherry-blossom-dusk', palette: 'twilight', ground: 'trail-blaze', planter: 'celadon', visitor: 'robin', keepsakes: ['lantern', 'jay'] });
  });

  it('another species’ colourway, or an unknown id, falls back to this species’ own colours', () => {
    const all = LOOK_ITEMS.map((x) => x.id);
    expect(resolveLook('maple', { colourway: 'oak-autumn' }, all).colourway).toBe('maple-autumn');
    expect(resolveLook('maple', { colourway: 'nope' }, all).palette).toBe('ember');
    expect(resolveLook('cactus', { planter: 'terracotta' }, all).planter).toBe('native');
  });

  it('switching species drops only the colourway; growth and the rest of the look stay', () => {
    const p = withLook(seed('oak', 5), { colourway: 'oak-autumn', ground: 'stone-ring', keepsakes: ['fox'] });
    expect(p.look).toEqual({ colourway: 'oak-autumn', ground: 'stone-ring', keepsakes: ['fox'] });
  });
});

describe('withLook and keepsakes', () => {
  it('takes catalogue ids of the right slot only; null clears a slot; same object when nothing changes', () => {
    const p = seed();
    expect(withLook(p, { ground: 'lantern' })).toBe(p);
    const q = withLook(p, { ground: 'stone-ring', planter: 'celadon', visitor: 'robin' });
    expect(q.look).toEqual({ ground: 'stone-ring', planter: 'celadon', visitor: 'robin' });
    expect(withLook(q, { ground: 'stone-ring' })).toBe(q);
    expect(withLook(q, { planter: null }).look).toEqual({ ground: 'stone-ring', visitor: 'robin' });
    expect(withLook(q, { keepsakes: ['fox', 'fox', 'jay', 'cairn', 'lantern', 'meadow'] }).look?.keepsakes).toEqual(['fox', 'jay', 'cairn']);
  });

  it('the toggle shows at most three, distinct, in the order chosen', () => {
    let ks: string[] = [];
    for (const id of ['fox', 'jay', 'fox', 'cairn', 'lantern']) ks = toggleKeepsake(ks, id);
    // fox on, jay on, fox off, cairn on, lantern on.
    expect(ks).toEqual(['jay', 'cairn', 'lantern']);
    expect(toggleKeepsake(ks, 'sundial')).toEqual(ks);
    expect(toggleKeepsake(ks, 'cairn')).toEqual(['jay', 'lantern']);
    expect(MAX_SHOWN_KEEPSAKES).toBe(3);
  });
});

describe('ids in a backup', () => {
  it('are catalogue ids, each in its own slot', () => {
    expect(isCatalogLook('lantern')).toBe(true);
    expect(isCatalogLook('kept-1')).toBe(false);
    expect(isLookOfSlot('lantern', 'keepsake')).toBe(true);
    expect(isLookOfSlot('lantern', 'ground')).toBe(false);
    expect(isValidPlantState({ ...seed(), look: { ground: 'lantern' } })).toBe(false);
    expect(isValidPlantState({ ...seed(), look: { planter: 'five-stone', keepsakes: ['clear-dawn'] } })).toBe(true);
  });
});

describe('moods (the face only)', () => {
  const base = { face: true, resting: false, grewToday: false, newKeepsakeToday: false, planCleared: false, newTopicToday: false };
  it('proud (a growth step or a new keepsake) > happy (plan cleared) > curious (a new topic) > idle; resting wins', () => {
    expect(plantMood(base)).toBe('idle');
    expect(plantMood({ ...base, newTopicToday: true })).toBe('curious');
    expect(plantMood({ ...base, newTopicToday: true, planCleared: true })).toBe('happy');
    expect(plantMood({ ...base, planCleared: true, grewToday: true })).toBe('proud');
    expect(plantMood({ ...base, newKeepsakeToday: true })).toBe('proud');
    expect(plantMood({ ...base, grewToday: true, resting: true })).toBe('resting');
  });
  it('Quiet look shows no mood at all', () => {
    expect(plantMood({ ...base, face: false, grewToday: true, resting: true })).toBe('idle');
  });
});

describe('copy', () => {
  const lines = [...LOOK_ITEMS.map((x) => x.caption), ...LOOK_ITEMS.map((x) => howToOpen(x)), ...LOOK_ITEMS.map((x) => howToOpen(x, { badgesHidden: true })), ...GROUNDS.map((x) => x.name), ...VISITORS.map((x) => x.name)];
  it('plain words: no counters, no "Unlocked!", no guilt, no readiness claim, no trademark echo', () => {
    for (const l of lines) {
      expect(l).not.toMatch(/\d+\s+of\s+\d+|collected|unlocked!|\bstage\b|wilt|miss(es)? you|you haven.t|ready for the exam|pass the exam|Pokémon|Pokemon|owl|finch/i);
    }
  });
  it('a keepsake’s caption names the skill: "The sundial: you finished a timed mock on pace."', () => {
    expect(lookItem('sundial')!.caption).toBe('The sundial: you finished a timed mock on pace.');
    for (const k of KEEPSAKE_ITEMS) expect(k.caption).toMatch(/^The [a-z -]+: /);
  });
  it('a locked item says how to open it, in plain words', () => {
    expect(howToOpen(lookItem('stone-ring')!)).toBe('Opens when your plant reaches Crown.');
    // UX review P2: what to do, then the badge in brackets.
    expect(howToOpen(lookItem('lantern')!)).toBe('Sit a full, timed mock (the Dress Rehearsal badge).');
    expect(howToOpen(lookItem('stepping-stone')!)).toBe('Finish your diagnostic (the First Foothold badge).');
    // Code review M9c: the Domains set is four, five or eight domains, so it is named neutrally.
    expect(howToOpen(lookItem('five-stone')!)).toBe('Opens when you finish the Domains set in Badges.');
    expect(howToOpen(lookItem('ribbon')!)).toBe('Opens when you tell us you passed.');
    for (const k of KEEPSAKE_ITEMS) expect(k.how).toMatch(/^[A-Z][^.]+$/);
  });
  it('with badges hidden, a locked line never names a badge or a set (code review M9d)', () => {
    expect(howToOpen(lookItem('lantern')!, { badgesHidden: true })).toBe('Sit a full, timed mock.');
    expect(howToOpen(lookItem('five-stone')!, { badgesHidden: true })).toBe('Opens as you study.');
    for (const x of LOOK_ITEMS) expect(howToOpen(x, { badgesHidden: true })).not.toMatch(/badge|set in/i);
  });
  it('captions never make a readiness claim in the present tense (code review M9b) and never say "the Five Domains" (M9c)', () => {
    expect(lookItem('compass-stone')!.caption).toBe('The compass stone: every domain reached 65% or more.');
    for (const x of LOOK_ITEMS) expect(x.caption).not.toMatch(/Five Domains|\bis at\b/);
    expect(lookItem('empty-nest')!.caption).toBe('The empty nest: questions you’ve learned have flown the nest.');
    expect(lookItem('native')!.name).toBe('Its usual home');
    // UX review P13: no colourway reads as dying or grey.
    expect(lookItem('coconut-palm-sun')!.name).toBe('Golden');
    for (const x of LOOK_ITEMS) expect(x.name).not.toMatch(/dried|dead|grey|gray|faded/i);
  });
  it('the badge sheet’s quiet line says "On your plant" only when the keepsake is on show (UX review H1)', () => {
    expect(onYourPlantLine('dress-rehearsal', ['lantern'])).toBe('On your plant: the lantern.');
    expect(onYourPlantLine('long-memory', ['jay', 'fox'])).toBe('On your plant: the jay.');
    expect(onYourPlantLine('long-memory', ['fox'])).toBe('A keepsake for your plant: the jay. Show it from Your plant, Change its look.');
    expect(onYourPlantLine('firm-footing', [])).toBeNull();
  });
});
