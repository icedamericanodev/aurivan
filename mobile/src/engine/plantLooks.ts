/**
 * "Your plant": the look catalogue (mobile 1.14, Phase 4b "Dress and Alive").
 * Design: mascot_progression.md §3, badges_game.md §7, mascot spec §6 and §13.
 *
 * Pure TypeScript: no React, no storage, no clock. Five slots:
 * - colour (a colourway: three per species, two free, the third at Bough);
 * - ground (Meadow free; Stone ring at Crown; Trail blaze at Elder);
 * - planter (the species' own ground and a terracotta pot free; one per
 *   completed badge set, read from milestones.planters);
 * - visitor (the wren free, the robin at Shoot; it visits on days you clear
 *   your plan);
 * - keepsakes (up to three shown): each badge's emblem as a small object by
 *   the plant, with a caption that names the skill.
 *
 * The unlock rule is DERIVED (mascot §3.3), so nothing is stored for it:
 *   unlocked(id) = free OR growth ≥ its growth OR some cert earned its badge
 *                  OR some cert completed its set OR plant.kept has it.
 * Growth never goes down and badges are never taken away, so an unlock is
 * never lost in normal use. A restore can make one vanish: then the slot
 * falls back to its default AT RENDER (resolveLook) and the stored choice is
 * left alone, so it comes back by itself when the unlock is re-earned.
 *
 * Guard rails: cosmetics carry no readiness claim; game LEVELS unlock
 * nothing (they can step back); nothing is paid; there is no "n of m
 * collected" anywhere (no completion counters); a locked item says how to
 * earn it in plain words, never as a guilt line.
 */
import { BADGES, WHOLE_MAP_FLOOR } from './milestones';
import type { CertPlant, GrowthLevel, LookId, PlantLook, PlantSettings, PlantSpecies } from './plant';

/**
 * The species list, written out here (not imported from plant.ts) so the two
 * modules never need each other at load time. A test checks it equals
 * PLANT_SPECIES, in order.
 */
const SPECIES: readonly PlantSpecies[] = [
  'oak',
  'maple',
  'narra',
  'cherry-blossom',
  'pine',
  'coconut-palm',
  'mango',
  'bonsai',
  'sunflower',
  'lotus',
  'sampaguita',
  'cactus',
  'bamboo',
];
const GROWTH_WORD: Record<number, string> = { 1: 'Seed', 2: 'Sprout', 3: 'Shoot', 4: 'Bough', 5: 'Crown', 6: 'Elder' };

export type LookSlot = 'style' | 'colourway' | 'ground' | 'planter' | 'visitor' | 'keepsake';

/** How an item opens. Never a game level, never a purchase. */
export type LookUnlock =
  | { kind: 'free' }
  | { kind: 'growth'; growth: GrowthLevel }
  | { kind: 'badge'; badge: string }
  | { kind: 'set'; set: string }
  | { kind: 'passed' };

/** A colour palette key in theme/tokens.ts plantLeaf (the art maps it). */
export type PaletteKey = 'grove' | 'spring' | 'evergreen' | 'ember' | 'gold' | 'blossom' | 'twilight' | 'silver' | 'rosewood' | 'pearl' | 'snow' | 'lemon' | 'golden';

/** Where a keepsake stands: on the ground by the plant, or behind it (the clear dawn). */
export type KeepsakePlace = 'ground' | 'back';
/**
 * A keepsake's build (UX review H2): a tall one (a post, a bird, a lantern)
 * still reads standing behind the plant; a flat one (a stone, a pond, a
 * ring) would hide behind the trunk there, so flat ones take the front slots.
 */
export type KeepsakeShape = 'tall' | 'flat';

export interface LookItem {
  id: LookId;
  slot: LookSlot;
  /** Short name ("Lantern", "Autumn gold"). */
  name: string;
  /** One plain line. A keepsake's names the skill: "The sundial: you finished a timed mock on pace." */
  caption: string;
  unlock: LookUnlock;
  /** Colourways only: the species and its palette. */
  species?: PlantSpecies;
  palette?: PaletteKey;
  /** Keepsakes only. */
  place?: KeepsakePlace;
  shape?: KeepsakeShape;
  /** Keepsakes only: how to earn it, in plain words ("Answer your first 20 questions"). */
  how?: string;
}

// ── Style (mobile 1.40: the botanical default) ──────────────────────────
/**
 * How the plant is drawn. Owner decision (22 Oct 2026): new plants are a
 * calm botanical line drawing with no face; the rounded storybook art, and
 * its face, are optional looks. All three are free and listed first.
 * The ids are saved (`look.style`): never rename one.
 */
export type PlantStyle = 'botanical' | 'storybook' | 'storybook-face';
const styleItems: LookItem[] = [
  { id: 'botanical', slot: 'style', name: 'Botanical', caption: 'A fine line drawing, like a field guide.', unlock: { kind: 'free' } },
  { id: 'storybook', slot: 'style', name: 'Storybook', caption: 'Rounded and colourful.', unlock: { kind: 'free' } },
  { id: 'storybook-face', slot: 'style', name: 'Storybook with a face', caption: 'A friendly face that shows its mood.', unlock: { kind: 'free' } },
];

/**
 * The style a plant is drawn in. No migration step and no renamed key:
 * - a plant with `look.style` (any plant planted from mobile 1.40 on, or
 *   one whose style the learner picked) uses it;
 * - a plant saved BEFORE this release has no `look.style`, so it keeps the
 *   art it always had: the storybook plant, with its face unless the old
 *   Settings switch "Quiet look" was on.
 * Reads saved data only (per plant), never an install date.
 */
export function resolveStyle(look: Pick<PlantLook, 'style'> | undefined, settings: Pick<PlantSettings, 'quietLook'> | undefined): PlantStyle {
  if (look?.style !== undefined && isLookOfSlot(look.style, 'style')) return look.style as PlantStyle;
  return settings?.quietLook === true ? 'storybook' : 'storybook-face';
}
/** Only "Storybook with a face" draws a face (and says its mood). */
export const styleHasFace = (s: PlantStyle): boolean => s === 'storybook-face';
/** The style a new plant is planted with. */
export const NEW_PLANT_STYLE: PlantStyle = 'botanical';

// ── Colourways (three per species: two free, the third at Bough) ────────
const COLOURWAYS: Record<PlantSpecies, [string, string, PaletteKey][]> = {
  oak: [['summer', 'Summer green', 'grove'], ['spring', 'Spring green', 'spring'], ['autumn', 'Autumn gold', 'gold']],
  maple: [['autumn', 'Autumn red', 'ember'], ['gold', 'Gold', 'gold'], ['summer', 'Summer green', 'grove']],
  narra: [['fresh', 'Fresh green', 'spring'], ['deep', 'Deep green', 'grove'], ['silver', 'Silver leaf', 'silver']],
  'cherry-blossom': [['pink', 'Pink', 'blossom'], ['white', 'White', 'snow'], ['dusk', 'Dusk violet', 'twilight']],
  pine: [['evergreen', 'Evergreen', 'evergreen'], ['fresh', 'Fresh green', 'grove'], ['frost', 'Frost', 'silver']],
  // Id "sun" is kept (ids are saved); it is drawn golden-green, never dried (UX review P13).
  'coconut-palm': [['tropic', 'Tropic green', 'spring'], ['deep', 'Deep green', 'grove'], ['sun', 'Golden', 'golden']],
  mango: [['deep', 'Deep green', 'evergreen'], ['leafy', 'Leafy green', 'grove'], ['new', 'New leaf', 'spring']],
  bonsai: [['green', 'Green', 'grove'], ['juniper', 'Juniper', 'evergreen'], ['autumn', 'Autumn', 'ember']],
  sunflower: [['gold', 'Gold', 'gold'], ['lemon', 'Lemon', 'lemon'], ['velvet', 'Velvet red', 'rosewood']],
  lotus: [['pink', 'Pink', 'blossom'], ['white', 'White', 'snow'], ['violet', 'Violet', 'twilight']],
  sampaguita: [['white', 'White', 'pearl'], ['blush', 'Blush', 'blossom'], ['lilac', 'Lilac', 'twilight']],
  cactus: [['pink', 'Pink bloom', 'blossom'], ['yellow', 'Yellow bloom', 'gold'], ['red', 'Red bloom', 'rosewood']],
  bamboo: [['green', 'Green', 'grove'], ['lime', 'Lime', 'spring'], ['silver', 'Silver', 'silver']],
};
/** The growth that opens each species' third colourway. */
export const THIRD_COLOURWAY_AT: GrowthLevel = 4;

const colourwayItems: LookItem[] = SPECIES.flatMap((sp) =>
  COLOURWAYS[sp].map(([key, name, palette], i) => ({
    id: `${sp}-${key}`,
    slot: 'colourway' as const,
    name,
    caption: i === 0 ? 'Its own colours.' : i === 1 ? 'Another colourway for it.' : 'A third colourway.',
    unlock: i < 2 ? ({ kind: 'free' } as const) : ({ kind: 'growth', growth: THIRD_COLOURWAY_AT } as const),
    species: sp,
    palette,
  })),
);

// ── Grounds ─────────────────────────────────────────────────────────────
const groundItems: LookItem[] = [
  { id: 'meadow', slot: 'ground', name: 'Meadow', caption: 'Soft grass and a daisy.', unlock: { kind: 'free' } },
  { id: 'stone-ring', slot: 'ground', name: 'Stone ring', caption: 'River stones around the base.', unlock: { kind: 'growth', growth: 5 } },
  { id: 'trail-blaze', slot: 'ground', name: 'Trail blaze', caption: 'A painted waymark that points north.', unlock: { kind: 'growth', growth: 6 } },
];

// ── Planters (the set planters: badges_game.md §7) ──────────────────────
/**
 * Display names of the counted sets (engine/badgeCatalog.ts setInfo). The
 * Domains set is "The Five Domains" for CISA but four or eight for other
 * exams, so the look screens say "the Domains set" (code review M9c).
 */
const SET_NAMES: Record<string, string> = {
  groundwork: 'Groundwork',
  domains: 'Domains',
  evergreen: 'Evergreen',
  judgement: 'Sound Judgement',
  examDay: 'Exam Day',
  rooted: 'Rooted',
};
const planterItems: LookItem[] = [
  { id: 'native', slot: 'planter', name: 'Its usual home', caption: 'Where this plant grows best.', unlock: { kind: 'free' } },
  { id: 'terracotta', slot: 'planter', name: 'Terracotta pot', caption: 'A plain clay pot.', unlock: { kind: 'free' } },
  { id: 'fieldstone', slot: 'planter', name: 'Fieldstone planter', caption: 'From completing Groundwork.', unlock: { kind: 'set', set: 'groundwork' } },
  { id: 'five-stone', slot: 'planter', name: 'Five-stone planter', caption: 'From completing the Domains set.', unlock: { kind: 'set', set: 'domains' } },
  { id: 'celadon', slot: 'planter', name: 'Celadon pot', caption: 'From completing Evergreen.', unlock: { kind: 'set', set: 'evergreen' } },
  { id: 'compass-rose', slot: 'planter', name: 'Compass-rose planter', caption: 'From completing Sound Judgement.', unlock: { kind: 'set', set: 'judgement' } },
  { id: 'banded', slot: 'planter', name: 'Banded planter', caption: 'From completing Exam Day.', unlock: { kind: 'set', set: 'examDay' } },
  { id: 'root-woven', slot: 'planter', name: 'Root-woven basket', caption: 'From completing Rooted.', unlock: { kind: 'set', set: 'rooted' } },
];
/** Species whose own ground is a pot already: the terracotta pot is their own. */
export const NATIVE_POT: Partial<Record<PlantSpecies, 'terracotta' | 'tray' | 'bowl'>> = { cactus: 'terracotta', bonsai: 'tray', lotus: 'bowl' };

// ── Visitors (on days you clear your plan; mascot_progression §2) ───────
// No owl, and no bird called a finch (mascot §3.3: avoid Duolingo and Finch echoes).
const visitorItems: LookItem[] = [
  { id: 'wren', slot: 'visitor', name: 'Wren', caption: 'A small brown wren.', unlock: { kind: 'free' } },
  { id: 'robin', slot: 'visitor', name: 'Robin', caption: 'A robin with a warm red breast.', unlock: { kind: 'growth', growth: 3 } },
  { id: 'no-visitor', slot: 'visitor', name: 'No visitor', caption: 'The plant on its own.', unlock: { kind: 'free' } },
];

// ── Keepsakes (badges → objects that name the skill; mascot §3.3) ───────
// [id, name, badge, caption, shape, how, place]. Firm Footing gives a part
// mark and Rooted undergrowth instead (later), so neither is here. The ribbon
// opens only when the learner reports a pass. `how` says how to earn it in
// plain words (UX review P2); the badge's name follows in brackets.
const KEEPSAKES: [string, string, string, string, KeepsakeShape, string, KeepsakePlace?][] = [
  ['stepping-stone', 'Stepping stone', 'first-foothold', 'The stepping stone: you answered your first 20 questions.', 'flat', 'Answer your first 20 questions'],
  ['trail-post', 'Trail post', 'topic-clear', 'The trail post: you cleared your first topic.', 'tall', 'Clear your first topic'],
  ['trail-board', 'Trail board', 'ten-topics', 'The trail board: you cleared ten topics.', 'tall', 'Clear ten topics'],
  // Past tense: a keepsake never claims where readiness stands today (code review M9b).
  ['compass-stone', 'Compass stone', 'whole-map', `The compass stone: every domain reached ${Math.round(WHOLE_MAP_FLOOR * 100)}% or more.`, 'flat', `Bring every domain to ${Math.round(WHOLE_MAP_FLOOR * 100)}%`],
  ['jay', 'Jay', 'long-memory', 'The jay: you recall answers a week later.', 'tall', 'Recall answers a week after you saw them'],
  ['empty-nest', 'Empty nest', 'graduate', 'The empty nest: questions you’ve learned have flown the nest.', 'flat', 'Clear questions out of review'],
  ['woven-ring', 'Woven ring', 'loop-closed', 'The woven ring: you fixed your mistakes for good.', 'flat', 'Fix your mistakes on a later day'],
  ['fern', 'Fern', 'took-root', 'The fern: a whole topic took root.', 'tall', 'Help a whole topic take root'],
  ['still-pond', 'Still pond', 'know-what-you-know', 'The still pond: when you say sure, you’re right.', 'flat', 'Be right when you say you’re sure'],
  ['dew-web', 'Dew-lit web', 'slip-spotter', 'The dew-lit web: you can name your own thinking slips.', 'tall', 'Tag your mistakes with their thinking slip'],
  ['weather-vane', 'Weather vane', 'mindset-shift', 'The weather vane: you fall for the runner-up less often.', 'tall', 'Pick the tempting runner-up less often'],
  ['lantern', 'Lantern', 'dress-rehearsal', 'The lantern: you sat a full, timed mock.', 'tall', 'Sit a full, timed mock'],
  ['sundial', 'Sundial', 'on-pace', 'The sundial: you finished a timed mock on pace.', 'tall', 'Finish a timed mock on pace'],
  ['swallow', 'Swallow', 'fresh-start', 'The swallow: you came back and picked up again.', 'tall', 'Pick up again after some time away'],
  ['fox', 'Fox', 'snare-wise', 'The fox: you spot the snare in a trap question.', 'tall', 'Spot the snare in trap questions'],
  ['cairn', 'Cairn', 'even-keel', 'The cairn: your confidence matches your results, round after round.', 'tall', 'Keep your confidence matched to your results'],
  ['signpost', 'Signpost', 'signpost-reader', 'The signpost: you read the deciding word.', 'tall', 'Read the deciding word in a question'],
  ['clear-dawn', 'Clear dawn', 'myth-clearer', 'The clear dawn: half-truths don’t fool you.', 'tall', 'Clear half-truths in a practice game', 'back'],
  ['roe-deer', 'Roe deer', 'sure-footed-pace', 'The roe deer: speed without guessing.', 'tall', 'Answer at pace without guessing'],
  ['mushroom-ring', 'Mushroom ring', 'whole-grove', 'The mushroom ring: you’ve tried every kind of practice game.', 'flat', 'Play every practice game once'],
  ['pebble-path', 'Pebble path', 'back-on-path', 'The pebble path: you fixed game misses on a later day.', 'flat', 'Fix game misses on a later day'],
];
const keepsakeItems: LookItem[] = [
  ...KEEPSAKES.map(([id, name, badge, caption, shape, how, place]) => ({ id, slot: 'keepsake' as const, name, caption, unlock: { kind: 'badge', badge } as const, place: place ?? 'ground', shape, how })),
  { id: 'ribbon', slot: 'keepsake', name: 'Ribbon', caption: 'The ribbon: you told us you passed.', unlock: { kind: 'passed' }, place: 'ground', shape: 'tall', how: 'Tell us you passed' },
];

/** Every look item, in the order the Look screen lists them. Ids are saved in backups: never rename one. */
export const LOOK_ITEMS: readonly LookItem[] = [...styleItems, ...colourwayItems, ...groundItems, ...planterItems, ...visitorItems, ...keepsakeItems];
const BY_ID = new Map(LOOK_ITEMS.map((x) => [x.id, x]));

export function lookItem(id: string | undefined): LookItem | undefined {
  return id === undefined ? undefined : BY_ID.get(id);
}
/** True for a catalogue id (any slot). Backups accept nothing else. */
export function isCatalogLook(x: unknown): x is LookId {
  return typeof x === 'string' && BY_ID.has(x);
}
/** True for a catalogue id of this slot. */
export function isLookOfSlot(x: unknown, slot: LookSlot): x is LookId {
  return typeof x === 'string' && BY_ID.get(x)?.slot === slot;
}

/** The species' own colourways, default first. */
export function colourwaysFor(species: PlantSpecies): LookItem[] {
  return colourwayItems.filter((x) => x.species === species);
}
/** The planters offered for a species (a cactus' own pot is terracotta, so it isn't listed twice). */
export function plantersFor(species: PlantSpecies): LookItem[] {
  return planterItems.filter((x) => !(x.id === 'terracotta' && NATIVE_POT[species] === 'terracotta'));
}
export const STYLES = styleItems;
export const GROUNDS = groundItems;
export const VISITORS = visitorItems;
export const KEEPSAKE_ITEMS = keepsakeItems;
export const MAX_SHOWN_KEEPSAKES = 3;

/** The keepsake a badge gives (by its badge id), if any. */
export function keepsakeForBadge(badge: string): LookItem | undefined {
  return keepsakeItems.find((k) => k.unlock.kind === 'badge' && k.unlock.badge === badge);
}

// ── Unlocks (derived) ───────────────────────────────────────────────────
/** One certification's saved marks, as the unlock rule reads them. */
export interface CertMarks {
  /** milestones.earned: "dress-rehearsal", "long-memory:50", "firm-footing:4"… */
  earned?: Record<string, number>;
  /** milestones.planters: completed counted sets. */
  planters?: Record<string, number>;
}

/** A badge counts once ANY tier of it was earned on ANY cert (badges are the learner's, not the plant's). */
function badgeEarned(badge: string, certs: readonly CertMarks[]): boolean {
  return certs.some((c) => Object.keys(c.earned ?? {}).some((k) => k === badge || k.startsWith(`${badge}:`)));
}

/**
 * What `kept` may hold (code review M4): an unlock a Reset can carry, i.e.
 * one earned by growth, a badge or a set. Never a free item (nothing to
 * keep) and never the ribbon: it opens only with a reported pass, and
 * `passedOn` already survives a Reset. A backup whose `kept` holds anything
 * else is refused.
 */
export function isKeepable(id: unknown): id is LookId {
  const item = typeof id === 'string' ? BY_ID.get(id) : undefined;
  return !!item && (item.unlock.kind === 'growth' || item.unlock.kind === 'badge' || item.unlock.kind === 'set');
}

/** Is this one item open now? */
export function isUnlocked(item: LookItem, plant: Pick<CertPlant, 'growth' | 'kept' | 'passedOn'>, certs: readonly CertMarks[]): boolean {
  const u = item.unlock;
  // The ribbon needs a reported pass, whatever `kept` says (code review M4).
  if (u.kind === 'passed') return plant.passedOn !== undefined;
  if (plant.kept?.includes(item.id)) return true;
  switch (u.kind) {
    case 'free':
      return true;
    case 'growth':
      return plant.growth >= u.growth;
    case 'badge':
      return badgeEarned(u.badge, certs);
    case 'set':
      return certs.some((c) => c.planters?.[u.set] !== undefined);
  }
}

/**
 * Every look id this plant can use now, derived (no storage). The plant's
 * own species decides which colourways are offered, but an unlock is never
 * species-bound: colourways of other species are simply not listed.
 */
export function unlockedLooks(plant: Pick<CertPlant, 'growth' | 'kept' | 'passedOn'>, certs: readonly CertMarks[]): LookId[] {
  return LOOK_ITEMS.filter((x) => isUnlocked(x, plant, certs)).map((x) => x.id);
}

/**
 * The unlocks worth carrying across a Reset (into `kept`): everything open
 * now that can be kept (isKeepable). Growth goes back to a seed and this
 * cert's badges are cleared, but the look the learner earned stays (Reset
 * keeps the look). The ribbon needs no `kept`: `passedOn` survives a Reset.
 */
export function keepOnReset(plant: Pick<CertPlant, 'growth' | 'kept' | 'passedOn'>, certs: readonly CertMarks[]): LookId[] {
  return LOOK_ITEMS.filter((x) => isKeepable(x.id) && isUnlocked(x, plant, certs)).map((x) => x.id);
}

/**
 * When the learner first had each keepsake (epoch ms), for the default
 * "first three earned": a badge's earliest tier on any exam; the ribbon's
 * reported pass; a kept one (earned before a Reset) counts as earliest.
 * Ties keep catalogue order.
 */
function keepsakeSince(item: LookItem, plant: Pick<CertPlant, 'kept' | 'passedOn'>, certs: readonly CertMarks[]): number {
  const u = item.unlock;
  if (u.kind === 'passed') return plant.passedOn ? Date.parse(plant.passedOn) || 0 : Infinity;
  let at = Infinity;
  if (u.kind === 'badge')
    for (const c of certs)
      for (const [k, t] of Object.entries(c.earned ?? {})) if ((k === u.badge || k.startsWith(`${u.badge}:`)) && typeof t === 'number' && t < at) at = t;
  if (at === Infinity && plant.kept?.includes(item.id)) return -Infinity;
  return at;
}

/**
 * The keepsakes shown while the learner has never chosen any (look.keepsakes
 * unset; UX review H1, decided): the first three they earned, so the badge
 * sheet's "On your plant" is true from the first badge. Derived, never
 * stored. Once the learner taps a keepsake, their own list (even an empty
 * one) is used instead.
 */
export function defaultKeepsakes(plant: Pick<CertPlant, 'growth' | 'kept' | 'passedOn'>, certs: readonly CertMarks[]): LookId[] {
  return keepsakeItems
    .filter((k) => isUnlocked(k, plant, certs))
    .map((k, i) => ({ id: k.id, at: keepsakeSince(k, plant, certs), i }))
    .sort((a, b) => a.at - b.at || a.i - b.i)
    .slice(0, MAX_SHOWN_KEEPSAKES)
    .map((x) => x.id);
}

/** Options for the locked lines. */
export interface HowOptions {
  /** Settings → Show badges is off: say what to do, never the badge's name. */
  badgesHidden?: boolean;
}

/**
 * A locked item's line: how to earn it, in plain words (UX review P2).
 * Never a guilt line, never a count. With badges hidden it never names a
 * badge or a set (code review M9d).
 */
export function howToOpen(item: LookItem, o: HowOptions = {}): string {
  const u = item.unlock;
  switch (u.kind) {
    case 'free':
      return '';
    case 'growth':
      return `Opens when your plant reaches ${GROWTH_WORD[u.growth]}.`;
    case 'badge': {
      const name = BADGES.find((b) => b.id === u.badge)?.name ?? u.badge;
      const how = item.how ?? 'Earn its badge';
      return o.badgesHidden ? `${how}.` : `${how} (the ${name} badge).`;
    }
    case 'set':
      return o.badgesHidden ? 'Opens as you study.' : `Opens when you finish the ${SET_NAMES[u.set] ?? u.set} set in Badges.`;
    case 'passed':
      return 'Opens when you tell us you passed.';
  }
}

// ── What the art draws (with the fallback) ──────────────────────────────
export interface ResolvedLook {
  /** Mobile 1.40: how it is drawn (resolveStyle). */
  style: PlantStyle;
  colourway: LookId;
  palette: PaletteKey;
  ground: LookId;
  planter: LookId;
  visitor: LookId;
  /** Shown keepsakes, in the learner's order (at most MAX_SHOWN_KEEPSAKES). */
  keepsakes: LookId[];
}

/** What the art reads from a look (components/plant/art.ts draws it). */
export interface ArtLook {
  /** Mobile 1.40: 'botanical' draws the line drawing; unset or a storybook style, the storybook art. */
  style?: PlantStyle;
  palette?: PaletteKey;
  ground?: string;
  planter?: string;
  /** The visitor perched today ("wren", "robin"); unset = none. */
  visitor?: string;
  keepsakes?: readonly string[];
}

export const DEFAULT_LOOK = { ground: 'meadow', planter: 'native', visitor: 'wren' } as const;

/**
 * The look the art draws: each chosen item if it is in the catalogue, fits
 * the slot (a colourway of THIS species) and is open now; otherwise the
 * slot's default. Pure: it never changes the stored choice, so a look whose
 * unlock vanished (after a restore) comes back when the unlock does.
 * `defaultKeeps`: what shows while no keepsake was ever chosen
 * (defaultKeepsakes; none when not given).
 */
export function resolveLook(
  species: PlantSpecies,
  look: PlantLook | undefined,
  unlocked: ReadonlySet<string> | readonly string[],
  defaultKeeps: readonly string[] = [],
  style: PlantStyle = resolveStyle(look, undefined),
): ResolvedLook {
  const open = unlocked instanceof Set ? (unlocked as ReadonlySet<string>) : new Set(unlocked as readonly string[]);
  const ok = (id: string | undefined, slot: LookSlot) => id !== undefined && isLookOfSlot(id, slot) && open.has(id);
  const ways = colourwaysFor(species);
  const cw = look?.colourway !== undefined && ok(look.colourway, 'colourway') && lookItem(look.colourway)!.species === species ? lookItem(look.colourway)! : ways[0];
  const planter = ok(look?.planter, 'planter') && plantersFor(species).some((x) => x.id === look!.planter) ? look!.planter! : DEFAULT_LOOK.planter;
  // Mobile 1.40: a botanical plant is the plant on its own until the learner
  // picks a visitor or keepsakes (they are optional looks there). The
  // storybook styles keep the wren and the first three earned, as before.
  const botanical = style === 'botanical';
  return {
    style,
    colourway: cw.id,
    palette: cw.palette!,
    ground: ok(look?.ground, 'ground') ? look!.ground! : DEFAULT_LOOK.ground,
    planter,
    visitor: ok(look?.visitor, 'visitor') ? look!.visitor! : botanical ? 'no-visitor' : DEFAULT_LOOK.visitor,
    keepsakes: [...new Set(look?.keepsakes ?? (botanical ? [] : defaultKeeps))].filter((k) => ok(k, 'keepsake')).slice(0, MAX_SHOWN_KEEPSAKES),
  };
}

/** The default palette of a species (its first colourway). */
export function defaultPalette(species: PlantSpecies): PaletteKey {
  return colourwaysFor(species)[0].palette!;
}

/**
 * The badge sheet's quiet keepsake line (UX review H1): "On your plant: the
 * lantern." only when it is one of the keepsakes on show; otherwise where to
 * show it. Null when the badge gives none.
 */
export function onYourPlantLine(badge: string, shown: readonly string[]): string | null {
  const k = keepsakeForBadge(badge);
  if (!k) return null;
  const the = `the ${k.name.charAt(0).toLowerCase()}${k.name.slice(1)}`;
  return shown.includes(k.id) ? `On your plant: ${the}.` : `A keepsake for your plant: ${the}. Show it from Your plant, Change its look.`;
}

/** A keepsake's skill line without its "The jay: " lead, for a row that already shows the name ("You recall answers a week later."). */
export function skillLine(item: LookItem): string {
  const i = item.caption.indexOf(': ');
  const rest = i >= 0 ? item.caption.slice(i + 2) : item.caption;
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

/** Toggle a keepsake in the shown list: added at the end, or put away. Never more than MAX_SHOWN_KEEPSAKES. */
export function toggleKeepsake(current: readonly string[] | undefined, id: string): string[] {
  const list = [...new Set(current ?? [])];
  if (list.includes(id)) return list.filter((x) => x !== id);
  if (list.length >= MAX_SHOWN_KEEPSAKES) return list;
  return [...list, id];
}

// ── Moods (expressions on the face) ─────────────────────────────────────
/** The face's expression. Never sad: there is no sad, tired or "missing you" face. */
export type PlantMood = 'idle' | 'happy' | 'curious' | 'proud' | 'resting';

export interface MoodInput {
  /**
   * False: no expression at all. Mobile 1.40: lib/plant.ts passes true for
   * every style to work out the POSTURE (a faceless plant still stands tall
   * on a good day); only a plant with a face draws and says the mood.
   */
  face: boolean;
  resting: boolean;
  /** A growth step was reached today (this cert). */
  grewToday: boolean;
  /** A badge that gives a keepsake was earned today (any cert). */
  newKeepsakeToday: boolean;
  /** Today's plan is cleared: a good session. */
  planCleared: boolean;
  /** A new topic was opened today (a subtopic answered for the first time today). */
  newTopicToday: boolean;
}

/**
 * One mood at a time, the most meaningful first: proud (a growth step or a
 * new keepsake) > happy (the plan is cleared) > curious (a new topic today)
 * > idle. Resting is the calm look of a rest day, and wins. Derived from
 * saved data: never from taps, and never from absence (no mood reads the
 * days away).
 */
export function plantMood(i: MoodInput): PlantMood {
  if (!i.face) return 'idle';
  if (i.resting) return 'resting';
  if (i.grewToday || i.newKeepsakeToday) return 'proud';
  if (i.planCleared) return 'happy';
  if (i.newTopicToday) return 'curious';
  return 'idle';
}

/** A short spoken word for the mood (added to the plant's label). Idle and resting say nothing extra. */
export const MOOD_WORDS: Record<PlantMood, string> = { idle: '', happy: 'Looking happy.', curious: 'Looking curious.', proud: 'Looking proud.', resting: '' };
