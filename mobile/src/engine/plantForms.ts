/**
 * "Your plant" grows into new FORMS (mobile 1.50, the owner's "Turnings"
 * decision of 29 Oct 2026).
 *
 * Plain English for the founder:
 * - A form is a new shape of the same plant, with its own name: an oak is
 *   an Acorn-cup Oak, then a Whip Oak, then a Standard Oak, then a
 *   Broadcrown Oak. Four forms on the six growths the plant already has:
 *       Form I   = growth 1–2 (Seed, Sprout)
 *       Form II  = growth 3   (Shoot)
 *       Form III = growth 4–5 (Bough, Crown)
 *       Form IV  = growth 6   (Elder)
 * - A form is WORKED OUT from the saved growth. Nothing new is saved for
 *   it, so a plant that is already at Crown shows its Form III at once,
 *   there is no reset, and a form can never disagree with the growth.
 * - At Form IV the learner may choose the line's own final or one of five
 *   "flavour" finals (Lookout, Moot, Espalier, Coppice, Holdfast). The
 *   learner chooses; the strongest area NEVER decides. With no choice, the
 *   plant is its own final.
 *
 * Guard rails (with engine/plant.ts):
 * - growth only goes up; a form follows it, so a form is never lost by
 *   time away (no decay, no needs, no notifications about the plant);
 * - no random forms: the same growth and choice always draw the same form;
 * - no "n of m" counters and no wall of locked forms: a form is a name;
 * - no readiness wording next to a form, and never "evolve"/"evolution"
 *   in learner copy: a plant "grows into a new form".
 *
 * Pure TypeScript: no React, no storage, no clock. It imports only TYPES
 * from plant.ts, so plant.ts can use it with no import cycle.
 *
 * Saved data (staged rollout, docs/mobile/DESIGN_SYSTEM.md §8.10): this
 * release reads an optional `look.final` from a backup, but keeps the
 * learner's own choice on this phone only (store/seen.ts `plantFinal`). A
 * later release writes it into the plant, once every build in use reads it.
 */
import type { GrowthLevel, PlantSpecies } from './plant';

// ── Forms on the growths ───────────────────────────────────────────────

/** Form I…IV as a number (design and code only: learner copy uses the form's NAME). */
export type FormNumber = 1 | 2 | 3 | 4;
export const FORM_OF_GROWTH: Record<GrowthLevel, FormNumber> = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 3, 6: 4 };
/** The first growth of each form (where the plant grows into it). */
export const FORM_START: Record<FormNumber, GrowthLevel> = { 1: 1, 2: 3, 3: 4, 4: 6 };

/** The growth words, written out here so this module needs nothing from plant.ts at run time. */
const GROWTH_WORD: Record<GrowthLevel, string> = { 1: 'Seed', 2: 'Sprout', 3: 'Shoot', 4: 'Bough', 5: 'Crown', 6: 'Elder' };

const clampGrowth = (g: number): GrowthLevel => Math.max(1, Math.min(6, Math.round(Number.isFinite(g) ? g : 1))) as GrowthLevel;

/** The form a growth draws. */
export function formOf(growth: number): FormNumber {
  return FORM_OF_GROWTH[clampGrowth(growth)];
}

/** True when growing from `from` to `to` reaches a new form (skipped growths count once, at the highest). */
export function crossesForm(from: number, to: number): boolean {
  return formOf(to) > formOf(from);
}

/** The next form and the growth that opens it; null at Form IV (there is no form after Elder). */
export function nextFormAt(growth: number): { form: FormNumber; at: GrowthLevel } | null {
  const f = formOf(growth);
  if (f >= 4) return null;
  const next = (f + 1) as FormNumber;
  return { form: next, at: FORM_START[next] };
}

// ── The Form IV finals (the learner's choice) ───────────────────────────

/**
 * The five flavour finals. Ids are saved (look.final, later): never rename
 * one. Each echoes one CISA area as a THEME only; mastery never picks it.
 */
export const FLAVOUR_IDS = ['lookout', 'moot', 'espalier', 'coppice', 'holdfast'] as const;
export type FlavourId = (typeof FLAVOUR_IDS)[number];
/** 'own' = the line's own final (the default). */
export const FINAL_IDS = ['own', ...FLAVOUR_IDS] as const;
export type FinalId = (typeof FINAL_IDS)[number];

export function isFinalId(x: unknown): x is FinalId {
  return typeof x === 'string' && (FINAL_IDS as readonly string[]).includes(x);
}

export interface FlavourInfo {
  name: string;
  /** What it means, in one plain line (the Look screen). */
  idea: string;
}
export const FLAVOURS: Record<FlavourId, FlavourInfo> = {
  lookout: { name: 'Lookout', idea: 'A high, open crown with a clear view through it.' },
  moot: { name: 'Moot', idea: 'Level limbs make a roof over a ring of meeting stones.' },
  espalier: { name: 'Espalier', idea: 'Limbs trained along a frame, built to a plan.' },
  coppice: { name: 'Coppice', idea: 'Several stems rise from one base and keep growing back.' },
  holdfast: { name: 'Holdfast', idea: 'Roots grip a stone under a dense, closed crown.' },
};

/**
 * The final that is DRAWN: the choice at Elder when it is a known final,
 * else the line's own. Below Elder there is no final (it reads 'own').
 */
export function resolveFinal(growth: number, choice: unknown): FinalId {
  return clampGrowth(growth) >= 6 && isFinalId(choice) ? choice : 'own';
}

// ── Names and looks (from the art masters: scratchpad evolve/art13/names.md) ──

/** The word every form name holds, so a screen reader always knows the plant ("Cherry", "Palm"). */
export const SPECIES_KEY: Record<PlantSpecies, string> = {
  oak: 'Oak',
  maple: 'Maple',
  narra: 'Narra',
  'cherry-blossom': 'Cherry',
  pine: 'Pine',
  'coconut-palm': 'Palm',
  mango: 'Mango',
  bonsai: 'Bonsai',
  sunflower: 'Sunflower',
  lotus: 'Lotus',
  sampaguita: 'Sampaguita',
  cactus: 'Cactus',
  bamboo: 'Bamboo',
};

type Four<T> = readonly [T, T, T, T];
/** [name, look] for Forms I–IV. */
export const FORMS: Record<PlantSpecies, Four<readonly [string, string]>> = {
  oak: [
    ['Acorn-cup Oak', 'An acorn in its engraved cup; the first root shows in the soil.'],
    ['Whip Oak', 'One straight leader with lobed leaves at each node.'],
    ['Standard Oak', 'A clear stem and an upright oval crown; the first acorns.'],
    ['Broadcrown Oak', 'A short, massive trunk, low sinuous limbs and a broad, open dome hung with acorns.'],
  ],
  maple: [
    ['Samara Maple', 'The paired winged seed on the soil; two strap seed-leaves and a first five-point leaf.'],
    ['Forked Maple', 'Leaves in opposite pairs up a slim stem that forks in two.'],
    ['Flame Maple', 'A tall, pointed crown shaped like a candle flame.'],
    ['Vaulted Maple', 'A tall, open vase of limbs under a broad vault; winged seeds hang from its eaves.'],
  ],
  narra: [
    ['Coin Narra', 'The round winged pod, half settled; a first shoot and root.'],
    ['Featherleaf Narra', 'One arching wand of feathered leaves; the husk stays by it.'],
    ['Parasol Narra', 'A flat, spreading parasol on a clean stem; the first golden sprays.'],
    ['Gold-rain Narra', 'Plank buttresses, a vast weeping umbrella, golden showers and hanging coins.'],
  ],
  'cherry-blossom': [
    ['Cherry Stone', 'The round stone with its seam; two first serrated leaves.'],
    ['Banded Cherry', 'A slim stem with the cherry’s banded bark and its first pink buds.'],
    ['Spreading Cherry', 'Wide, low clouds of bud and blossom on spreading limbs.'],
    ['Cascade Cherry', 'Limbs rise, then fall in long curtains of blossom; petals drift.'],
  ],
  pine: [
    ['Starburst Pine', 'The winged seed, and a starburst of seed-needles.'],
    ['Candle Pine', 'One leader in whorls of needles, a pale new candle at its tip.'],
    ['Spire Pine', 'A tiered cone of whorls, narrowing to a point.'],
    ['Highcloud Pine', 'A tall, leaning bole carrying level cloud pads high up; cones below.'],
  ],
  'coconut-palm': [
    ['Husk Palm', 'The husked nut lying on the soil, a shoot rising from its eye.'],
    ['Strapleaf Palm', 'Whole, pleated young leaves fanning from the nut.'],
    ['Ringed Palm', 'A short ringed trunk, five arching fronds and the first green nuts.'],
    ['Shoreline Palm', 'A tall curving trunk, a full crown of fronds, ripe nuts, and a nut sprouting at its foot.'],
  ],
  mango: [
    ['Kernel Mango', 'The flat, fibred stone and a first flush of leaves.'],
    ['Whorl Mango', 'Leaves gather in whorls; the new flush hangs bronze at the tip.'],
    ['Tassel Mango', 'A rounded crown with flower tassels standing up like candles.'],
    ['Laden Mango', 'A vast, low, dark dome with fruit hanging on long stalks.'],
  ],
  bonsai: [
    ['First-bend Bonsai', 'A seedling in its tray, taking its first bend.'],
    ['Upright Bonsai', 'A straight, tapering trunk and three pads in a triangle.'],
    ['Winding Bonsai', 'An S-curved trunk carrying five cloud pads.'],
    ['Windswept Bonsai', 'The trunk leans with the wind and every pad streams one way; small white flowers.'],
  ],
  sunflower: [
    ['Seed-cap Sunflower', 'Two round seed-leaves, one still wearing the striped seed as a cap.'],
    ['Heart-leaf Sunflower', 'Paired heart-shaped leaves and a tight green bud.'],
    ['Morning Sunflower', 'A tall stem, the head open and turned to one side.'],
    ['Spiral Sunflower', 'A great head facing you, its seeds set in spirals; a second bud below.'],
  ],
  lotus: [
    ['First-pad Lotus', 'One floating pad and a rolled leaf rising from the water.'],
    ['Raised-pad Lotus', 'Pads lift on stalks above the water; a new leaf unrolls.'],
    ['Tall-bud Lotus', 'Five pads and one tall, pointed bud.'],
    ['Open Lotus', 'The flower fully open around its seed cup, a bud and a seed head beside it.'],
  ],
  sampaguita: [
    ['Cutting Sampaguita', 'A cutting set in the soil, rooting from its node.'],
    ['Twining Sampaguita', 'Two arching stems with paired leaves and the first star-buds.'],
    ['Star-mound Sampaguita', 'A dark green mound dotted with white star flowers.'],
    ['Garland Sampaguita', 'A full shrub in flower, with a strung garland of its own stars.'],
  ],
  cactus: [
    ['Pebble Cactus', 'A small spined globe in its pot.'],
    ['Column Cactus', 'One ribbed column lined with spines.'],
    ['Cross-arm Cactus', 'Four short arms and a first bud on top.'],
    ['Crown-bloom Cactus', 'A tall column, arms raised high, crowned with flowers.'],
  ],
  bamboo: [
    ['Sheath Bamboo', 'The shoot in its overlapping sheaths; the rhizome below.'],
    ['First-culm Bamboo', 'One jointed culm with leaf fans; the next shoot beside it.'],
    ['Vase Bamboo', 'Five culms rise in a vase, sprays leaning outward.'],
    ['Moon-gate Bamboo', 'The culms arch together into a round gate.'],
  ],
};

/** The flavour finals' looks, per species. Their name is "<Flavour> <key word>" ("Moot Oak"). */
export const FLAVOUR_LOOKS: Record<PlantSpecies, Record<FlavourId, string>> = {
  oak: {
    lookout: 'A tall clear bole; the oak’s crown parts into a ring around an open window.',
    moot: 'Long level limbs roof a ring of five stones; the crown sits in tiers.',
    espalier: 'Three tiers of oak limbs trained level along wires between two posts.',
    coppice: 'Three oak stems rise from one broad stool; new shoots at the foot.',
    holdfast: 'Oak roots grip a boulder under a dense, closed dome.',
  },
  maple: {
    lookout: 'A tall maple with its crown opened into a ring, winged seeds hanging.',
    moot: 'Maple limbs held level in calm tiers over five meeting stones.',
    espalier: 'Maple cordons trained flat along a frame, seeds along the wires.',
    coppice: 'Three slim maple stems from one stool, each with its own small crown.',
    holdfast: 'A short, thick maple gripping a stone, its crown closed and dense.',
  },
  narra: {
    lookout: 'A raised narra parasol, parted around a sightline, gold sprays on top.',
    moot: 'The narra’s parasol spread into level tiers above five stones.',
    espalier: 'Narra limbs trained level along wires, golden sprays along each tier.',
    coppice: 'Three narra stems from one stool, each with a small gold-flecked crown.',
    holdfast: 'Narra roots clasp a boulder beneath a dense, closed crown.',
  },
  'cherry-blossom': {
    lookout: 'A tall banded cherry, its blossom parted into a ring around an open window.',
    moot: 'Level blossom tiers on long banded limbs over five meeting stones.',
    espalier: 'Cherry limbs trained flat on a frame, blossom along every tier.',
    coppice: 'Three cherry stems from one stool, each in its own cloud of blossom.',
    holdfast: 'A thick banded trunk on a boulder under a dense dome of blossom.',
  },
  pine: {
    lookout: 'A tall bare bole with level pads only near the top, around a sightline.',
    moot: 'Broad, level pads in calm tiers, like a roof, over five meeting stones.',
    espalier: 'A pole rises above the crown and ropes fan down to hold the level limbs.',
    coppice: 'Three pine stems from one stool, each carrying its own pads.',
    holdfast: 'A pine on a rock, its roots clasping the stone; dense pads above.',
  },
  'coconut-palm': {
    lookout: 'The tallest, straightest trunk, its crown high above everything.',
    moot: 'Fronds held level like a flat roof over five meeting stones.',
    espalier: 'A young palm braced by a timber tripod, its fronds trained into an even fan.',
    coppice: 'A mother palm with two young palms rising from the same base.',
    holdfast: 'A short, stout trunk on a rock, roots gripping, a dense crown of fronds.',
  },
  mango: {
    lookout: 'A tall mango, its dark crown parted around a sightline, fruit hanging.',
    moot: 'The mango’s dome spread into level tiers over five meeting stones.',
    espalier: 'Mango limbs trained level along a frame, fruit hanging along the wires.',
    coppice: 'Three mango stems from one stool, each with its own small dome.',
    holdfast: 'A thick mango gripping a boulder under a closed, dark dome.',
  },
  bonsai: {
    lookout: 'A tall, slender trunk with a few small pads high up: the scholar’s style.',
    moot: 'A thick, short trunk with broad pads in level tiers; pebbles on the soil.',
    espalier: 'Branches wired into a flat fan, the wire coiled along each one.',
    coppice: 'Three trunks rising together from one root.',
    holdfast: 'Roots grip over a stone set in the tray; a dense crown above.',
  },
  sunflower: {
    lookout: 'An extra-tall stem, the head high and turned outward; leaves stay low.',
    moot: 'Leaves held level in tiers, the head turned up to the sky, five stones below.',
    espalier: 'Tied to a cane at three points, leaves trained flat to each side.',
    coppice: 'One stem branches into three heads from a single base.',
    holdfast: 'A short, stout stem on a stone, the head bowed, leaves overlapping like a shield.',
  },
  lotus: {
    lookout: 'One flower lifted far above the pads on a tall stalk.',
    moot: 'Pads held level in a ring around the open flower; stepping stones in the water.',
    espalier: 'A reed frame in the bowl; the stem tied to its rails, pads in a neat row.',
    coppice: 'Three flowers rise from one root: a bud, a half-open cup and a full bloom.',
    holdfast: 'A stone in the bowl gripped by the root; raised pads close round a cupped bloom.',
  },
  sampaguita: {
    lookout: 'Trained as a little tree: a clear stem and a round, starred head.',
    moot: 'Clipped into two level tiers, stars along the edges, over five stones.',
    espalier: 'Stems tied along a fan trellis, a star flower at each tip.',
    coppice: 'Cut back to a low stool; many slim stems spring up again.',
    holdfast: 'A dense clipped dome over a stone its roots hold fast.',
  },
  cactus: {
    lookout: 'The tallest column, tiny arms low down, a single flower at the top.',
    moot: 'Arms held level in two tiers, like a table; pebbles in the pot.',
    espalier: 'Arms trained round a wire hoop on a stake, a flower on each.',
    coppice: 'A clustering cactus: young offsets ring the mother column.',
    holdfast: 'A broad barrel wedged against a stone, dense with spines.',
  },
  bamboo: {
    lookout: 'One culm rises far above the rest of the stand.',
    moot: 'Straight culms with leaves clipped into level shelves, five stones at the foot.',
    espalier: 'Culms tied in a straight row to two rails: a living screen.',
    coppice: 'A dense clump of short culms, new shoots coming up all round.',
    holdfast: 'The rhizome grips a stone; culms stand close as a palisade.',
  },
};

/** A Form IV final's name: the line's own ("Broadcrown Oak") or "<Flavour> <key word>" ("Moot Oak"). */
export function finalName(species: PlantSpecies, final: FinalId): string {
  return final === 'own' ? FORMS[species][3][0] : `${FLAVOURS[final].name} ${SPECIES_KEY[species]}`;
}
export function finalLook(species: PlantSpecies, final: FinalId): string {
  return final === 'own' ? FORMS[species][3][1] : FLAVOUR_LOOKS[species][final];
}

/** The form's name at this growth ("Whip Oak"); at Elder the chosen final's. */
export function formName(species: PlantSpecies, growth: number, final: unknown = 'own'): string {
  const f = formOf(growth);
  return f === 4 ? finalName(species, resolveFinal(growth, final)) : FORMS[species][f - 1][0];
}
/** The form's look in a few words (Your plant's italic line). */
export function formLook(species: PlantSpecies, growth: number, final: unknown = 'own'): string {
  const f = formOf(growth);
  return f === 4 ? finalLook(species, resolveFinal(growth, final)) : FORMS[species][f - 1][1];
}

/** "the Whip Oak" (inside a sentence). */
export const theForm = (name: string) => `the ${name}`;

/** Your plant's quiet line for the next form: "Grows into the Standard Oak at Bough." Null at Form IV. */
export function nextFormLine(species: PlantSpecies, growth: number): string | null {
  const n = nextFormAt(growth);
  if (!n) return null;
  return `Grows into ${theForm(formName(species, n.at))} at ${GROWTH_WORD[n.at]}.`;
}

/** Today's grow-up line adds this when the growth reached a new form (the reveal itself plays on Your plant). */
export const SEE_NEW_FORM = 'It grows into a new form: see it in Your plant.';

/** The one line a new form is announced with: "Kai grows into a new form: the Whip Oak." */
export function newFormLine(callName: string, name: string): string {
  return `${callName} grows into a new form: ${theForm(name)}.`;
}

/**
 * The quiet one-line note for a plant that was already past Form I when
 * forms arrived (no reveal for history: it would be a fake moment).
 */
export function formsIntroLine(callName: string, name: string): string {
  return `Your study so far brought ${callName} to ${theForm(name)}.`;
}

// ── The delayed-recall sub-step (behavioural science, 28 Oct) ───────────

/**
 * Delayed recall: a question answered right, with no hint and not in a
 * game, a week or more after it was last seen. Counted per QUESTION (each
 * once) by engine/milestones.ts afterAnswer (`longIds`, the Long Memory
 * badge's list), so it is the one learning signal that can't be ground out.
 * It gates the later forms' crossings only (engine/plant.ts GATES): it can
 * never lower a growth a plant already has.
 */
export const RECALL_GAP_DAYS = 7;
/** Form III (Bough) needs this many delayed recalls. */
export const RECALL_FORM_III = 15;
/** Form IV (Elder) needs this many. */
export const RECALL_FORM_IV = 30;

/** Delayed recalls from the saved list of recalled question ids (unique ids only). */
export function delayedRecalls(longIds: readonly string[] | undefined): number {
  return new Set(longIds ?? []).size;
}

// ── The reveal: once per form ───────────────────────────────────────────

/**
 * What this phone remembers about a plant's forms (store/seen.ts, never in
 * a backup): the highest form already shown (`seen`), and a quiet note
 * still owed (`note`) for a plant that was past Form I before forms arrived.
 */
export interface FormSeen {
  seen: FormNumber;
  note?: FormNumber;
}

/**
 * The first time this release sees a plant: what it already is counts as
 * seen (no reveal for history), and a plant already past Form I is owed
 * one quiet line instead.
 */
export function baselineForms(growth: number): FormSeen {
  const f = formOf(growth);
  return f > 1 ? { seen: f, note: f } : { seen: f };
}

export type FormMoment = { kind: 'reveal'; from: FormNumber; to: FormNumber } | { kind: 'note'; form: FormNumber } | null;

/**
 * What Your plant shows for the forms, now: a reveal (a form reached and not
 * yet shown: once per form, ever), the quiet note, or nothing. With no
 * record yet the caller baselines first (baselineForms), so history never
 * plays as a moment. Never on a study screen: only Your plant asks.
 */
export function formMoment(growth: number, rec: FormSeen | undefined): FormMoment {
  if (!rec) return null;
  const f = formOf(growth);
  if (f > rec.seen) return { kind: 'reveal', from: rec.seen, to: f };
  if (rec.note !== undefined && rec.note === f) return { kind: 'note', form: f };
  return null;
}

/** After the reveal played (or was cut short: it still counts as shown). */
export function afterReveal(rec: FormSeen | undefined, growth: number): FormSeen {
  const f = formOf(growth);
  return { seen: Math.max(rec?.seen ?? 1, f) as FormNumber };
}
/** After the quiet note showed (once). */
export function afterNote(rec: FormSeen): FormSeen {
  return { seen: rec.seen };
}

/**
 * How the reveal ("The Turning", DESIGN_SYSTEM §8.10) plays, decided once on
 * its first frame:
 * - 'reduced': Reduce Motion. A 120 ms cross-fade (never a hard cut), every
 *   word at once;
 * - 'full': the whole Turning (2.4 / 3.0 / 3.6 s by tier). It is a once-ever
 *   celebration (once per form, for life), so it claims the session's moment
 *   (`claim` says yes and spends it);
 * - 'wait': the session's moment was already spent. The old form rests with
 *   the learning fact and one calm button ("See Kai's new form") that plays
 *   it in full when tapped. Never wasted on a short fade.
 * `claim` is only asked when motion is on.
 */
export type RevealMode = 'full' | 'reduced' | 'wait';
export function revealMode(reduced: boolean, claim: () => boolean): RevealMode {
  if (reduced) return 'reduced';
  return claim() ? 'full' : 'wait';
}

/** The calm button that plays a waiting reveal: "See Kai's new form", or "See your oak's new form". */
export function seeNewFormLabel(callName: string): string {
  const who = callName.startsWith('Your ') ? `your ${callName.slice(5)}` : callName;
  return `See ${who}’s new form`;
}
