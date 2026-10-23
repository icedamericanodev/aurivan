/**
 * "Your plant": the optional companion that grows with real learning
 * (Phase 4a; design: mascot spec + mascot_progression.md).
 *
 * Pure TypeScript: no React, no storage, no clock. Every function takes plain
 * inputs (the store and the screens work them out), so the rules can be
 * tested on their own.
 *
 * The guard rails, built into the maths below:
 * - Growth comes ONLY from mastery, readiness and mock data. Never from taps,
 *   minutes, streaks, game answers or Coach me answers.
 * - Growth only ever goes up (`nextGrowth`). Only the learner's own Reset, or
 *   a restore clamp to what the restored data supports, lowers it.
 * - Nothing here reads elapsed time as decay. Rest is a calm look, never a
 *   punishment: the plant is exactly as it was left.
 * - The plant has no needs (no water, food, energy or health).
 *
 * UI copy rule: the six steps are called "growth", never "stage".
 */
import type { Certification } from '../content/types';
import { MOCK_DOMAIN_FLOOR, DIAGNOSTIC_SIZE, DOMAIN_TARGET, MAX_MOCKS } from './journey';
import { readyHoldDays, READY_DAYS, READY_LOW, type ReadinessDay } from './examReady';
import type { SubtopicMastery } from './mastery';
import { computeReadiness, MIN_SAMPLE, domainMastery, type AnswerRecord } from './readiness';
import { RANGE_MIN_ANSWERS, readinessRange } from './readinessRange';
import { daysBetween, dayKey } from './streak';
import { defaultKeepsakes, isCatalogLook, isKeepable, isLookOfSlot, keepOnReset, MOOD_WORDS, NEW_PLANT_STYLE, resolveStyle, styleHasFace, type CertMarks, type PlantMood } from './plantLooks';

// ── Species ────────────────────────────────────────────────────────────

/** The v1 shelf, 13 species. Ids are saved in backups: never rename one. */
export const PLANT_SPECIES = [
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
] as const;
export type PlantSpecies = (typeof PLANT_SPECIES)[number];

export type PlantFamily = 'tree' | 'flowering-tree' | 'conifer' | 'tropical' | 'fruit-tree' | 'bonsai' | 'flower' | 'succulent' | 'grass';

export interface SpeciesInfo {
  /** Display name, title case ("Cherry blossom"). */
  name: string;
  /** The same, as it reads mid-sentence ("your cherry blossom"). */
  lower: string;
  family: PlantFamily;
  /** One plain line for the picker. */
  line: string;
  /** Name ideas: one is prefilled at random, with a shuffle. Each passes cleanPlantName unchanged. */
  suggestions: readonly string[];
}

export const SPECIES_INFO: Record<PlantSpecies, SpeciesInfo> = {
  oak: { name: 'Oak', lower: 'oak', family: 'tree', line: 'A round, steady crown. Acorns when it is ready.', suggestions: ['Ledger', 'Atlas', 'Bracken', 'North'] },
  maple: { name: 'Maple', lower: 'maple', family: 'tree', line: 'Warm red leaves and winged seeds.', suggestions: ['Ember', 'Tally', 'Russet', 'Quill'] },
  narra: { name: 'Narra', lower: 'narra', family: 'tree', line: 'A wide, shady crown with golden flowers.', suggestions: ['Tala', 'Lakan', 'Dayang', 'Ledger'] },
  'cherry-blossom': { name: 'Cherry blossom', lower: 'cherry blossom', family: 'flowering-tree', line: 'A tree that blossoms limb by limb.', suggestions: ['Hana', 'Haru', 'Fable', 'Sora'] },
  pine: { name: 'Pine', lower: 'pine', family: 'conifer', line: 'Cloud-pruned pads that climb toward the top.', suggestions: ['Summit', 'Vale', 'Harbor', 'Matsu'] },
  'coconut-palm': { name: 'Coconut palm', lower: 'coconut palm', family: 'tropical', line: 'Feather fronds, one for each domain.', suggestions: ['Isla', 'Niyog', 'Harbor', 'Coco'] },
  mango: { name: 'Mango', lower: 'mango', family: 'fruit-tree', line: 'A low, dark dome that ripens into fruit.', suggestions: ['Amber', 'Mangga', 'Tally', 'Sunny'] },
  bonsai: { name: 'Bonsai', lower: 'bonsai', family: 'bonsai', line: 'A small, patient tree in a tray.', suggestions: ['Kumo', 'Pebble', 'Sable', 'Quill'] },
  sunflower: { name: 'Sunflower', lower: 'sunflower', family: 'flower', line: 'One tall stem, one leaf for each domain.', suggestions: ['Sunny', 'Helio', 'Goldie', 'Fable'] },
  lotus: { name: 'Lotus', lower: 'lotus', family: 'flower', line: 'Lily pads in a bowl, then a calm bloom.', suggestions: ['Padma', 'Lumi', 'Nila', 'Still'] },
  sampaguita: { name: 'Sampaguita', lower: 'sampaguita', family: 'flower', line: 'A dark green mound with white star flowers.', suggestions: ['Ligaya', 'Perla', 'Mutya', 'Jasmine'] },
  cactus: { name: 'Cactus', lower: 'cactus', family: 'succulent', line: 'Four arms and a crown flower.', suggestions: ['Pico', 'Nopal', 'Rio', 'Sable'] },
  bamboo: { name: 'Bamboo', lower: 'bamboo', family: 'grass', line: 'Five culms that rise together.', suggestions: ['Reed', 'Zhu', 'Kawayan', 'Vale'] },
};

export function isPlantSpecies(x: unknown): x is PlantSpecies {
  return typeof x === 'string' && (PLANT_SPECIES as readonly string[]).includes(x);
}

// ── Growth ─────────────────────────────────────────────────────────────

/** The six growths, lowest first. Never Seedling / Sapling / Heartwood (game levels). */
export const GROWTH_IDS = ['seed', 'sprout', 'shoot', 'bough', 'crown', 'elder'] as const;
export type GrowthId = (typeof GROWTH_IDS)[number];
/** 1 = Seed … 6 = Elder. Saved as a number, so "only up" is a plain max(). */
export type GrowthLevel = 1 | 2 | 3 | 4 | 5 | 6;
export const MAX_GROWTH: GrowthLevel = 6;

export const GROWTH_NAMES: Record<GrowthLevel, string> = { 1: 'Seed', 2: 'Sprout', 3: 'Shoot', 4: 'Bough', 5: 'Crown', 6: 'Elder' };
/** What each growth looks like, in a few words (spoken on the Your plant screen). */
export const GROWTH_LOOKS: Record<GrowthLevel, string> = {
  1: 'A seed, settled in',
  2: 'First two leaves',
  3: 'A young trunk and a first crown',
  4: 'Branches reach out',
  5: 'A full, rounded crown',
  6: 'In season: flowers or fruit',
};

export function growthId(level: GrowthLevel): GrowthId {
  return GROWTH_IDS[level - 1];
}
export function isGrowthLevel(x: unknown): x is GrowthLevel {
  return typeof x === 'number' && Number.isInteger(x) && x >= 1 && x <= MAX_GROWTH;
}

// The gate constants (mascot_progression §1.2). Each one appears in its rule text.
/** Sprout: the diagnostic, answered without hints. */
export const SPROUT_ANSWERS = DIAGNOSTIC_SIZE; // 20
/** Shoot: clean answers in EVERY domain (the "readiness is reliable" floor). */
export const SHOOT_PER_DOMAIN = MIN_SAMPLE; // 10
export const SHOOT_SPREAD = 0.05;
export const BOUGH_LOW = 55;
export const BOUGH_SPREAD = 0.25;
export const CROWN_LOW = 65;
export const CROWN_SPREAD = 0.45;
/** Crown needs one finished mock of at least this many questions. */
export const CROWN_MOCK = 50;
export const ELDER_DOMAIN_FLOOR = MOCK_DOMAIN_FLOOR; // 0.65
export const ELDER_SPREAD = 0.6;

/**
 * Everything the growth gates read, as plain values. `plantFacts` works them
 * out from saved progress; tests and screens can also pass them directly.
 * Per-domain arrays follow the certification's domain order.
 */
export interface PlantFacts {
  /** Unique questions whose last answer had no Coach me hint and was not in a game. */
  cleanAnswered: number;
  /** The same, per domain. */
  cleanByDomain: number[];
  /** Clean domain mastery 0..1 (sample-adjusted, like the rings). */
  cleanMastery: number[];
  /** The readiness range's lower bound, from clean answers only (no games, no Coach me); null while "Not enough data yet". */
  low: number | null;
  /** Share of the exam outline known, 0..1, weighted like the exam (see outlineSpread). */
  spread: number;
  /** Any finished mock with at least CROWN_MOCK questions. */
  mock50: boolean;
  /** Any full, timed mock with every question answered (a dress rehearsal). */
  dress: boolean;
  /**
   * The exam-ready moment holds (the logged low ≥ 80 for 7 days, or its panel
   * was seen since the last replant) AND the CLEAN low end is at 80 or more
   * now. The log and the panel count game answers, so on their own they could
   * let games open Elder (code review B2).
   */
  readyHeld: boolean;
}

/** Each gate (growth 2..6) as a test on the facts. Cumulative: a growth needs every gate below it too. */
const GATES: Record<Exclude<GrowthLevel, 1>, (f: PlantFacts) => boolean> = {
  2: (f) => f.cleanAnswered >= SPROUT_ANSWERS,
  3: (f) => f.cleanByDomain.length > 0 && f.cleanByDomain.every((n) => n >= SHOOT_PER_DOMAIN) && f.spread >= SHOOT_SPREAD,
  4: (f) => f.low !== null && f.low >= BOUGH_LOW && f.spread >= BOUGH_SPREAD,
  5: (f) => f.low !== null && f.low >= CROWN_LOW && f.spread >= CROWN_SPREAD && f.mock50,
  6: (f) =>
    f.readyHeld && f.cleanMastery.length > 0 && Math.min(...f.cleanMastery) >= ELDER_DOMAIN_FLOOR && f.spread >= ELDER_SPREAD && f.dress,
};

/** The highest growth the facts support right now (1..6). The plant itself never goes below what it reached. */
export function growthFor(f: PlantFacts): GrowthLevel {
  let g: GrowthLevel = 1;
  for (const k of [2, 3, 4, 5, 6] as const) {
    if (!GATES[k](f)) break;
    g = k;
  }
  return g;
}

/** Growth never decreases: the new highest is the larger of the two. */
export function nextGrowth(prevHighest: GrowthLevel, computed: GrowthLevel): GrowthLevel {
  return Math.max(prevHighest, computed) as GrowthLevel;
}

/**
 * The exam-ready gate in words. "For a week" is READY_DAYS (7); the line is
 * the exam-ready moment's own READY_LOW, so the words can't drift from the rule.
 */
const READY_RULE = `The low end of your readiness holds at ${READY_LOW}% or more for ${READY_DAYS === 7 ? 'a week' : `${READY_DAYS} days`}`;
/**
 * The plant's readiness gates read clean answers only, while Today's range
 * also counts hints and games: the words say so, so the two never seem to
 * disagree (code review M8).
 */
const CLEAN_LOW = 'The low end of your readiness, without hints or games,';

/** One line per growth: the rule, in learner words (shown before it is reached). No bank sizes. */
export const GROWTH_RULES: Record<GrowthLevel, string> = {
  1: 'Plant it.',
  2: `Answer ${SPROUT_ANSWERS} questions without a hint or a game (your diagnostic).`,
  3: `Answer ${SHOOT_PER_DOMAIN} or more questions in every domain, and know ${pct(SHOOT_SPREAD)} of the outline.`,
  4: `${CLEAN_LOW} reaches ${BOUGH_LOW}%, and you know ${pct(BOUGH_SPREAD)} of the outline.`,
  5: `${CLEAN_LOW} reaches ${CROWN_LOW}%, you know ${pct(CROWN_SPREAD)} of the outline, and you finish a mock of ${CROWN_MOCK} questions or more.`,
  6: `${READY_RULE}, every domain is at ${pct(ELDER_DOMAIN_FLOOR)} or more, you know ${pct(ELDER_SPREAD)} of the outline, and you finish a full, timed mock with every question answered.`,
};
/** The one-line explainer for "know X% of the outline". */
export const SPREAD_EXPLAINER = "Subtopics you've answered right, without a hint, on two different days, weighted like the exam.";

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

/** The parts of the next growth's rule, each with 0..1 progress (the Your plant screen). Empty at Elder. */
export function nextGrowthSteps(current: GrowthLevel, f: PlantFacts): { growth: GrowthLevel; steps: { label: string; progress: number }[] } | null {
  if (current >= MAX_GROWTH) return null;
  const g = (current + 1) as Exclude<GrowthLevel, 1>;
  const frac = (have: number, need: number) => (need <= 0 ? 1 : Math.max(0, Math.min(1, have / need)));
  const low = f.low ?? 0;
  const spread = (need: number) => ({ label: `Know ${pct(need)} of the outline`, progress: frac(f.spread, need) });
  const lowStep = (need: number) => ({ label: `${CLEAN_LOW} reaches ${need}%`, progress: f.low === null ? 0 : frac(low, need) });
  let steps: { label: string; progress: number }[];
  switch (g) {
    case 2:
      steps = [{ label: `Answer ${SPROUT_ANSWERS} questions without a hint or a game`, progress: frac(f.cleanAnswered, SPROUT_ANSWERS) }];
      break;
    case 3: {
      const n = f.cleanByDomain.length;
      const avg = n ? f.cleanByDomain.reduce((s, x) => s + frac(x, SHOOT_PER_DOMAIN), 0) / n : 0;
      steps = [{ label: `Answer ${SHOOT_PER_DOMAIN} or more in every domain`, progress: avg }, spread(SHOOT_SPREAD)];
      break;
    }
    case 4:
      steps = [lowStep(BOUGH_LOW), spread(BOUGH_SPREAD)];
      break;
    case 5:
      steps = [lowStep(CROWN_LOW), spread(CROWN_SPREAD), { label: `Finish a mock of ${CROWN_MOCK} questions or more`, progress: f.mock50 ? 1 : 0 }];
      break;
    default: {
      const min = f.cleanMastery.length ? Math.min(...f.cleanMastery) : 0;
      steps = [
        { label: READY_RULE, progress: f.readyHeld ? 1 : 0 },
        { label: `Every domain at ${pct(ELDER_DOMAIN_FLOOR)} or more`, progress: frac(min, ELDER_DOMAIN_FLOOR) },
        spread(ELDER_SPREAD),
        { label: 'A full, timed mock with every question answered', progress: f.dress ? 1 : 0 },
      ];
    }
  }
  return { growth: g, steps };
}

// ── Facts from saved progress (pure) ───────────────────────────────────

/**
 * Share of the outline known, weighted like the exam: Σ W_d · known_d / S_d.
 * `subtopicsByDomain[i]` lists domain i's outline subtopics that have at
 * least one practice question; a domain with none is left out and the other
 * weights are renormalised. A subtopic is known once it has `masteredAt`
 * (permanent: engine/mastery.ts), so spread never goes down.
 */
export function outlineSpread(weights: readonly number[], subtopicsByDomain: readonly (readonly string[])[], mastery: Record<string, SubtopicMastery> | undefined): number {
  let wSum = 0;
  let acc = 0;
  weights.forEach((w, i) => {
    const subs = subtopicsByDomain[i] ?? [];
    if (!subs.length || !(w > 0)) return;
    const known = subs.filter((s) => !!mastery?.[s]?.masteredAt).length;
    wSum += w;
    acc += (w * known) / subs.length;
  });
  return wSum > 0 ? acc / wSum : 0;
}

/** A mock as the plant reads it. `day` is the local "YYYY-MM-DD" it finished on. */
export interface PlantMock {
  total: number;
  correct: number;
  day: string;
  timing?: 'standard' | 'extra25' | 'extra50' | 'untimed' | string;
  unanswered?: number;
}

export interface PlantFactsInput {
  cert: Pick<Certification, 'domains' | 'exam'>;
  answers: Record<string, AnswerRecord>;
  /** Subtopic mastery dates (CertProgress.mastery). */
  mastery?: Record<string, SubtopicMastery>;
  /** Outline subtopics with practice questions, per domain in cert order. */
  subtopicsByDomain: readonly (readonly string[])[];
  mocks: readonly PlantMock[];
  readinessLog?: readonly ReadinessDay[];
  readySeenAt?: number;
  /** The last Reset: an exam-ready moment seen before it can't help a replanted plant bloom. */
  replantedAt?: number;
  today: string;
}

const isClean = (a: AnswerRecord) => !a.lastAssisted && !a.lastRetest && !a.lastGame;

/** A full, timed mock with nothing unanswered (same rule as the Dress Rehearsal badge). */
export function isDressMock(m: PlantMock, fullSize: number): boolean {
  return m.total >= fullSize && m.timing !== 'untimed' && m.unanswered === 0;
}

/** Works out PlantFacts from saved progress. Pure: the caller passes `today` and the outline. */
export function plantFacts(i: PlantFactsInput): PlantFacts {
  const clean: Record<string, AnswerRecord> = {};
  for (const [id, a] of Object.entries(i.answers)) if (isClean(a)) clean[id] = a;
  const cert = i.cert as Certification;
  const dm = domainMastery(cert, clean);
  // `low` is the readiness range's lower bound from CLEAN answers only (Phase
  // 4a owner rule: growth never comes from games). Today's range counts game
  // answers too, so a game round could otherwise open Bough or Crown.
  const range = readinessRange(cert, computeReadiness(cert, clean));
  const held = readyHoldDays([...(i.readinessLog ?? [])], i.today) >= READY_DAYS;
  const seen = i.readySeenAt !== undefined && i.readySeenAt > (i.replantedAt ?? 0);
  // The log and the panel count every answer, games and Coach me included. The
  // plant also needs the CLEAN low end at the exam-ready line right now, so a
  // week of games can never open Elder (code review B2). Growth is a stored
  // max: a later dip never takes Elder back.
  const cleanReady = range.enough && range.low >= READY_LOW;
  return {
    cleanAnswered: dm.reduce((s, d) => s + d.answered, 0),
    cleanByDomain: dm.map((d) => d.answered),
    cleanMastery: dm.map((d) => d.mastery),
    low: range.enough ? range.low : null,
    spread: outlineSpread(
      i.cert.domains.map((d) => d.weight),
      i.subtopicsByDomain,
      i.mastery,
    ),
    mock50: i.mocks.some((m) => m.total >= CROWN_MOCK),
    dress: i.mocks.some((m) => isDressMock(m, i.cert.exam.questions)),
    readyHeld: (held || seen) && cleanReady,
  };
}

// ── The saved state ────────────────────────────────────────────────────

/** A look id (colourway, ground, planter, visitor, keepsake): one of engine/plantLooks.ts LOOK_ITEMS. */
export type LookId = string;
export const MAX_KEEPSAKES = 3;
export const MAX_KEPT = 64;

export interface PlantLook {
  /**
   * Mobile 1.40: how the plant is drawn ('botanical', 'storybook',
   * 'storybook-face'). A NEW field beside the old ones: a plant saved before
   * 1.40 has none and keeps its storybook art (plantLooks.ts resolveStyle).
   */
  style?: LookId;
  colourway?: LookId;
  ground?: LookId;
  /** Mobile 1.14: the pot or planter ("native" = the species' own ground). */
  planter?: LookId;
  visitor?: LookId;
  /** At most MAX_KEEPSAKES, all different. */
  keepsakes?: LookId[];
}

/**
 * One certification's plant (CertProgress.plant, optional: old saves have
 * none until the learner plants). Small and serialisable.
 */
export interface CertPlant {
  species: PlantSpecies;
  /** cleanPlantName() output, 0..MAX_NAME code points. '' = no name ("Your oak"). */
  name: string;
  /** When it was first planted (epoch ms). Kept across a Reset. */
  plantedAt: number;
  /** The last Reset (epoch ms). */
  replantedAt?: number;
  /** The HIGHEST growth reached, 1..6. Only Reset or a restore clamp lowers it. */
  growth: GrowthLevel;
  /** When each growth above Seed was reached (epoch ms). Skipped growths share a time. */
  reached?: Partial<Record<GrowthId, number>>;
  /** A grow-up waiting for its one moment on Today (the highest new growth). */
  pending?: GrowthLevel;
  /** The quiet first-plant back-fill for existing learners: one summary line. */
  backfill?: { at: number; growth: GrowthLevel; seen?: boolean };
  look?: PlantLook;
  /** Unlocks carried across a Reset (cosmetics carry no readiness claim). */
  kept?: LookId[];
  /** "YYYY-MM-DD", self-reported pass (the ribbon keepsake, later). */
  passedOn?: string;
}

/**
 * App-wide plant settings (store/progress.ts `plantSettings`, so a backup
 * carries them with the plants). Unset = the default.
 */
export interface PlantSettings {
  /** "Show my plant". Default on. Off: no plant anywhere, no prompts; growth is still worked out quietly. */
  showPlant?: boolean;
  /**
   * "Quiet look": the plant without a face. Default off (the face shows).
   * Mobile 1.40: the switch moved into Your plant › Change its look › Style.
   * It is still read for plants saved before then (no `look.style`), and
   * kept in backups; a plant's own style wins over it.
   */
  quietLook?: boolean;
  /**
   * The one quiet "Plant a companion…" line on Today was dismissed (or the
   * onboarding step was skipped): it never shows again. You keeps its
   * "Plant yours" entry, so planting later is always one tap away.
   */
  promptHidden?: boolean;
}
export const plantShown = (s: PlantSettings | undefined) => s?.showPlant !== false;
export const plantHasFace = (s: PlantSettings | undefined) => s?.quietLook !== true;
/** Mobile 1.40: does THIS plant draw a face? Its own style first; a plant saved before 1.40 follows Quiet look. */
export const plantFace = (plant: Pick<CertPlant, 'look'> | null | undefined, s: PlantSettings | undefined) => styleHasFace(resolveStyle(plant?.look, s));

// ── Names ──────────────────────────────────────────────────────────────

export const MAX_NAME = 20;

/*
 * Name cleaning (code review M3, QA 2–5). Every pattern is written with
 * escapes, never literal invisible characters, so an editor can't mangle it.
 *
 * - WHITESPACE: any whitespace (newline, tab, no-break space, line separator…)
 *   becomes ONE plain space first, so "Kai⏎Lee" saves as "Kai Lee". U+FEFF
 *   (the byte-order mark) is whitespace to JavaScript, but it is an invisible
 *   format character, so it is stripped below instead.
 * - INVISIBLE: every control (Cc) and format (Cf) character (zero-width
 *   spaces, bidi marks and overrides, the word joiner, the soft hyphen, the
 *   Arabic letter mark, tags…), plus the blank-looking fillers that aren't
 *   Cf (Hangul fillers U+115F, U+1160, U+3164, U+FFA0 and the blank braille
 *   cell U+2800). A name made only of these cleans to '' ("Your oak").
 * - Kept on purpose: the zero-width joiner and non-joiner (U+200D, U+200C)
 *   BETWEEN two visible characters (emoji like 👩‍💻 and 🏳️‍🌈, and the
 *   spelling of Persian, Malayalam and other scripts), and a subdivision
 *   flag's tag run (🏴 + tags + U+E007F). Anywhere else they go.
 */
const WHITESPACE = /[^\S\uFEFF]+/gu;
const INVISIBLE = /[\p{Cc}\p{Cf}\u115F\u1160\u2800\u3164\uFFA0]/u;
const JOINERS = new Set(['\u200C', '\u200D']);
const BLACK_FLAG = '\u{1F3F4}';
const FLAG_TAGS = /^[\u{E0020}-\u{E007E}]+\u{E007F}/u;
/** Parts that never start a character of their own (marks, variation selectors, skin tones, tags). */
const CLUSTER_TAIL = /^[\p{M}\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}]$/u;

/** Strips the invisible characters, keeping joiners between visible characters and a flag's tags. */
function stripInvisible(s: string): string {
  const cps = Array.from(s);
  const out: string[] = [];
  const visible = (ch: string | undefined) => ch !== undefined && ch !== ' ' && !INVISIBLE.test(ch);
  for (let i = 0; i < cps.length; i++) {
    const ch = cps[i];
    if (JOINERS.has(ch)) {
      // Kept only between two visible characters (a double joiner keeps one).
      if (visible(out[out.length - 1]) && visible(cps[i + 1])) out.push(ch);
      continue;
    }
    if (ch === BLACK_FLAG) {
      out.push(ch);
      const tags = FLAG_TAGS.exec(cps.slice(i + 1).join(''));
      if (tags) {
        out.push(tags[0]);
        i += Array.from(tags[0]).length;
      }
      continue;
    }
    if (!INVISIBLE.test(ch)) out.push(ch);
  }
  return out.join('');
}

const isRegional = (ch: string | undefined) => {
  const cp = ch?.codePointAt(0) ?? 0;
  return cp >= 0x1f1e6 && cp <= 0x1f1ff;
};
/** True when a cut before cps[i] would split a two-letter flag (🇵🇭 is two regional indicators). */
function midFlag(cps: readonly string[], i: number): boolean {
  if (!isRegional(cps[i]) || !isRegional(cps[i - 1])) return false;
  let run = 0;
  for (let k = i - 1; k >= 0 && isRegional(cps[k]); k--) run++;
  return run % 2 === 1;
}

/** The first `max` code points, never cutting a character in half (an accent, an emoji sequence, a flag). */
function cutWhole(s: string, max: number): string {
  const cps = Array.from(s);
  if (cps.length <= max) return s;
  let end = 0; // the end of the last whole character that fits
  for (let i = 1; i <= max; i++) {
    const next = cps[i];
    // A cut before `next` is safe unless `next` belongs to the character before it.
    const joined = next !== undefined && (CLUSTER_TAIL.test(next) || JOINERS.has(next) || JOINERS.has(cps[i - 1]) || midFlag(cps, i));
    if (!joined) end = i;
  }
  return cps.slice(0, end).join('');
}

/**
 * Cleans a learner-typed name: whitespace to single spaces, no controls or
 * invisible marks, NFC, at most MAX_NAME code points (never cutting a
 * character in half). Idempotent: cleaning a clean name changes nothing, so
 * a saved name always passes isValidPlantState.
 */
export function cleanPlantName(raw: string): string {
  // Strip FIRST, then normalise: a stripped mark between a letter and its
  // accent would otherwise leave a name that isn't NFC (QA 4).
  const s = stripInvisible(raw.replace(WHITESPACE, ' ')).normalize('NFC').replace(/ +/g, ' ').trim();
  return cutWhole(s, MAX_NAME).trim();
}

/** Characters of right-to-left scripts (Hebrew, Arabic, Syriac, Thaana, N'Ko…). */
const RTL = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFC\u{10800}-\u{10FFF}\u{1E800}-\u{1EFFF}]/u;

/**
 * A name as it is SHOWN inside a sentence: a right-to-left name is wrapped
 * in a first-strong isolate (U+2068 … U+2069), so "שלום grew to Crown."
 * keeps the sentence's own direction. Display only: never stored.
 */
export function shownName(name: string): string {
  return RTL.test(name) ? `\u2068${name}\u2069` : name;
}

/** A name idea for the picker. `pick` is any 0..1 number (Math.random() in the app, fixed in tests). */
export function suggestName(species: PlantSpecies, pick: number): string {
  const list = SPECIES_INFO[species].suggestions;
  return list[Math.min(list.length - 1, Math.max(0, Math.floor(pick * list.length)))];
}

/** "Kai" or "Your oak" (the name a coach line uses). */
export function plantCallName(p: Pick<CertPlant, 'name' | 'species'>): string {
  return p.name ? shownName(p.name) : `Your ${SPECIES_INFO[p.species].lower}`;
}

// ── Life cycle ─────────────────────────────────────────────────────────

/** A new plant: a seed. `growth` lets an existing learner's study set it quietly (the back-fill). */
export function plantNew(species: PlantSpecies, rawName: string, now: number, backfillGrowth: GrowthLevel = 1): CertPlant {
  // Mobile 1.40: a new plant is written down as botanical at birth, so the
  // rule "no style = planted before 1.40" stays true for every saved plant.
  const p: CertPlant = { species, name: cleanPlantName(rawName), plantedAt: now, growth: 1, look: { style: NEW_PLANT_STYLE } };
  if (backfillGrowth > 1) {
    const reached: Partial<Record<GrowthId, number>> = {};
    for (let g = 2; g <= backfillGrowth; g++) reached[growthId(g as GrowthLevel)] = now;
    p.growth = backfillGrowth;
    p.reached = reached;
    p.backfill = { at: now, growth: backfillGrowth };
  }
  return p;
}

/**
 * Applies the facts: growth goes up when a gate opens, never down. Skipped
 * growths get the same `reached` time; only the highest becomes `pending`
 * (one moment). Returns the SAME object when nothing changed.
 */
export function advance(plant: CertPlant, facts: PlantFacts, now: number): { plant: CertPlant; grew: GrowthLevel | null } {
  const next = nextGrowth(plant.growth, growthFor(facts));
  if (next === plant.growth) return { plant, grew: null };
  const reached = { ...plant.reached };
  for (let g = plant.growth + 1; g <= next; g++) reached[growthId(g as GrowthLevel)] = now;
  return { plant: { ...plant, growth: next, reached, pending: next }, grew: next };
}

/**
 * The growth a grow-up started from (mobile 1.14: the growth sequence plays
 * from it). Skipped growths share a `reached` time, so it is the highest
 * growth reached BEFORE `to` was; Seed when there is none.
 */
export function growthBefore(plant: Pick<CertPlant, 'reached'>, to: GrowthLevel): GrowthLevel {
  const at = plant.reached?.[growthId(to)];
  let best: GrowthLevel = 1;
  for (let g = 2; g < to; g++) {
    const t = plant.reached?.[growthId(g as GrowthLevel)];
    if (t !== undefined && (at === undefined || t < at)) best = g as GrowthLevel;
  }
  return best;
}

/** The grow-up moment was shown: clear `pending`. */
export function clearPending(plant: CertPlant): CertPlant {
  if (plant.pending === undefined) return plant;
  const { pending: _drop, ...rest } = plant;
  return rest;
}

/**
 * Reset (the learner's own choice, per cert): growth back to a seed. The
 * name, species, look and planted date stay; every unlock the learner had
 * is copied into `kept`, so the look survives.
 */
export function resetPlant(plant: CertPlant, now: number, unlocked: readonly LookId[] = []): CertPlant {
  const kept = [...new Set([...(plant.kept ?? []), ...unlocked].filter(isKeepable))].slice(0, MAX_KEPT);
  const out: CertPlant = {
    species: plant.species,
    name: plant.name,
    plantedAt: plant.plantedAt,
    replantedAt: now,
    growth: 1,
    backfill: { at: now, growth: 1, seen: true }, // marked done: a reset plant never back-fills
  };
  if (plant.look) out.look = plant.look;
  if (kept.length) out.kept = kept;
  if (plant.passedOn) out.passedOn = plant.passedOn;
  return out;
}

/**
 * Mobile 1.14 (UX review H1): a plant that never chose its keepsakes shows
 * the first three earned. A Reset takes badges away, which would reorder
 * that default, so just before one the keepsakes on show are written down
 * as the plant's own choice: the plant looks exactly as it did.
 */
export function freezeKeepsakes(plant: CertPlant, marks: readonly CertMarks[]): CertPlant {
  if (plant.look?.keepsakes !== undefined) return plant;
  // Mobile 1.40: a botanical plant shows no keepsakes until some are picked,
  // so there is nothing to freeze. (Quiet look never matters here: both
  // storybook styles show the first three earned.)
  if (resolveStyle(plant.look, undefined) === 'botanical') return plant;
  const shown = defaultKeepsakes(plant, marks);
  return shown.length ? { ...plant, look: { ...plant.look, keepsakes: shown } } : plant;
}

/**
 * Resetting one exam, seen from ANOTHER exam's plant (code review M6):
 * badges are the learner's, not one plant's, so the reset exam's badge and
 * set unlocks go into this plant's `kept` as well. Its growth and look are
 * untouched and it draws exactly what it drew before. Same object when
 * nothing changes.
 */
export function keepThroughOtherReset(plant: CertPlant, marks: readonly CertMarks[], resetMarks: CertMarks): CertPlant {
  const p = freezeKeepsakes(plant, marks);
  const add = keepOnReset({ growth: 1 }, [resetMarks]).filter((id) => !p.kept?.includes(id));
  if (!add.length) return p;
  return { ...p, kept: [...(p.kept ?? []), ...add].filter(isKeepable).slice(0, MAX_KEPT) };
}

/** Change species: no cost, no cooldown, and the growth stays. The colourway goes back to the species' default. */
export function switchSpecies(plant: CertPlant, species: PlantSpecies): CertPlant {
  if (plant.species === species) return plant;
  const out: CertPlant = { ...plant, species };
  if (plant.look?.colourway !== undefined) {
    const { colourway: _drop, ...look } = plant.look;
    out.look = look;
  }
  return out;
}

/**
 * Mobile 1.14: change the look (the Look screen). Only catalogue ids of the
 * right slot are taken; `null` puts a slot back to its default. Keepsakes
 * stay distinct and at most MAX_KEEPSAKES. Same object when nothing changes.
 * The choice is stored even if a later restore makes its unlock vanish (the
 * art then falls back, engine/plantLooks.ts resolveLook).
 */
export function withLook(plant: CertPlant, change: { [K in keyof PlantLook]?: PlantLook[K] | null }): CertPlant {
  const look: PlantLook = { ...plant.look };
  for (const [k, slot] of LOOK_SLOTS) {
    if (!(k in change)) continue;
    const v = change[k];
    if (v === null) delete look[k];
    else if (isLookOfSlot(v, slot)) look[k] = v;
  }
  if ('keepsakes' in change) {
    // null: back to the default (the first three earned). An empty list is
    // the learner's own choice ("none on show") and is kept as such.
    if (change.keepsakes === null || change.keepsakes === undefined) delete look.keepsakes;
    else look.keepsakes = [...new Set(change.keepsakes.filter((x) => isLookOfSlot(x, 'keepsake')))].slice(0, MAX_KEEPSAKES);
  }
  const before = JSON.stringify(plant.look ?? {});
  if (JSON.stringify(look) === before) return plant;
  const out: CertPlant = { ...plant };
  if (Object.keys(look).length) out.look = look;
  else delete out.look;
  return out;
}

/** Rename: the cleaned name ('' = no name). */
export function renamePlant(plant: CertPlant, rawName: string): CertPlant {
  const name = cleanPlantName(rawName);
  return name === plant.name ? plant : { ...plant, name };
}

// ── Restore: clamp to what the data supports ───────────────────────────
/*
 * The restore principle (PR #43 review): a restore must NEVER lower growth
 * that an honest file earned. The clamp only blocks inflation beyond what
 * the file's own evidence could support.
 *
 * So the clamp runs the SAME gates as live growth (growthFor), on the most
 * generous facts the evidence allows (bestCaseFacts). Every live fact is at
 * most its best case, and every best case only ever goes up as a learner
 * studies, so whatever the plant grew to live, at any time, survives its own
 * backup. Evidence a save can lose (mocks past the newest MAX_MOCKS, readiness
 * days past the log's window, subtopic ids a notes rewrite renamed) is read
 * generously: when it may have scrolled away, it never refutes.
 */

/** What a restored file can prove, each value only ever going up as the learner studies. */
export interface SupportEvidence {
  /** Unique questions answered (any kind: generous). */
  answered: number;
  answeredByDomain: number[];
  /** outlineSpread() of the restored mastery dates (permanent), with renamed ids read generously. */
  spread: number;
  /** A mock of CROWN_MOCK+ questions, a Dress Rehearsal mark, or a full mock history (older mocks may have scrolled away). */
  mock50: boolean;
  /** A dress-rehearsal mock, its badge, or a full mock history. */
  dress: boolean;
  /** readySeenAt is set, a logged day reached 80, or study older than the log's window (its days may have scrolled away). */
  readyEver: boolean;
}

/**
 * The most generous PlantFacts the evidence allows. Each field is an upper
 * bound of the live fact:
 * - clean answers ≤ all answers;
 * - clean mastery = credit / max(n, MIN_SAMPLE) ≤ n / max(n, MIN_SAMPLE);
 * - the clean low end exists only with RANGE_MIN_ANSWERS answers, and is ≤ 100.
 */
export function bestCaseFacts(e: SupportEvidence): PlantFacts {
  return {
    cleanAnswered: e.answered,
    cleanByDomain: e.answeredByDomain,
    cleanMastery: e.answeredByDomain.map((n) => Math.min(1, n / MIN_SAMPLE)),
    low: e.answered >= RANGE_MIN_ANSWERS ? 100 : null,
    spread: e.spread,
    mock50: e.mock50,
    dress: e.dress,
    readyHeld: e.readyEver,
  };
}

/** The highest growth the restored data can support: the live gates, on the best-case facts. */
export function maxSupportedGrowth(e: SupportEvidence): GrowthLevel {
  return growthFor(bestCaseFacts(e));
}

export interface SupportInput extends Omit<PlantFactsInput, 'today' | 'replantedAt'> {
  /** Milestone marks in the file (CertMilestones.earned, already checked): "dress-rehearsal" proves a dress mock. */
  earned?: Record<string, number>;
}

/** SupportEvidence from restored progress (pure). */
export function supportEvidence(i: SupportInput): SupportEvidence {
  const dm = domainMastery(i.cert as Certification, i.answers);
  // recordMock keeps the newest MAX_MOCKS: with a full history, an older big mock may be gone.
  const capped = i.mocks.length >= MAX_MOCKS;
  const dressMark = Object.keys(i.earned ?? {}).some((k) => k === 'dress-rehearsal' || k.startsWith('dress-rehearsal:'));
  const dress = capped || dressMark || i.mocks.some((m) => isDressMock(m, i.cert.exam.questions));
  return {
    answered: dm.reduce((s, d) => s + d.answered, 0),
    answeredByDomain: dm.map((d) => d.answered),
    spread: supportSpread(
      i.cert.domains.map((d) => ({ id: d.id, weight: d.weight })),
      i.subtopicsByDomain,
      i.mastery,
    ),
    mock50: capped || (dressMark && i.cert.exam.questions >= CROWN_MOCK) || i.mocks.some((m) => m.total >= CROWN_MOCK),
    dress,
    readyEver: readyEvidence(i),
  };
}

/**
 * outlineSpread for a restore, generous where the outline changed since the
 * file was made. A mastered subtopic id the outline no longer lists (a notes
 * rewrite renamed it, or its questions moved) still counts as known in its
 * domain (read from the id's domain prefix, "4B1.2" → domain 4), capped at
 * the domain's size. An id whose domain can't be read, or an outline that
 * isn't known at all, can't be compared, so it never refutes (spread 1).
 * There is no alias table for renamed ids, so this is the safe reading.
 */
export function supportSpread(
  domains: readonly { id: string; weight: number }[],
  outline: readonly (readonly string[])[],
  mastery: Record<string, SubtopicMastery> | undefined,
): number {
  const mastered = Object.entries(mastery ?? {}).filter(([, m]) => !!m?.masteredAt).map(([id]) => id);
  if (!mastered.length) return 0;
  const listed = new Set(outline.flat());
  if (!listed.size) return 1;
  const extra = domains.map(() => 0);
  for (const id of mastered) {
    if (listed.has(id)) continue;
    const d = domains.findIndex((x) => id.startsWith(x.id) && !/[0-9]/.test(id.charAt(x.id.length)));
    if (d < 0) return 1;
    extra[d]++;
  }
  let wSum = 0;
  let acc = 0;
  domains.forEach((dom, i) => {
    const subs = outline[i] ?? [];
    if (!subs.length || !(dom.weight > 0)) return;
    const known = Math.min(subs.length, subs.filter((s) => !!mastery?.[s]?.masteredAt).length + extra[i]);
    wSum += dom.weight;
    acc += (dom.weight * known) / subs.length;
  });
  return wSum > 0 ? acc / wSum : 0;
}

/**
 * Could the exam-ready gate ever have held? The panel was seen, or a logged
 * day reached the line (its lowest or its last reading: a day's last reading
 * carries forward), or there was study before the log's oldest day (the log
 * keeps only its newest LOG_KEEP_DAYS, so older days may have scrolled away).
 */
function readyEvidence(i: SupportInput): boolean {
  if (i.readySeenAt !== undefined) return true;
  const log = i.readinessLog ?? [];
  if (log.some((d) => (d.min ?? -1) >= READY_LOW || (d.last ?? -1) >= READY_LOW)) return true;
  if (!log.length) return false;
  const oldest = log.reduce((a, d) => (d.day < a ? d.day : a), log[0].day);
  return (
    Object.values(i.mastery ?? {}).some((m) => !!m?.firstDay && m.firstDay < oldest) ||
    i.mocks.some((m) => m.day < oldest) ||
    Object.values(i.answers).some((a) => typeof a.lastAt === 'number' && dayKey(a.lastAt) < oldest)
  );
}

/** Lowers growth (and `reached`, `pending`, the back-fill) to what the data supports. Same object when nothing changes. */
export function clampToSupported(plant: CertPlant, max: GrowthLevel): CertPlant {
  if (plant.growth <= max && (plant.pending ?? 0) <= max && (plant.backfill?.growth ?? 0) <= max && !reachedAbove(plant.reached, max)) return plant;
  const out: CertPlant = { ...plant, growth: Math.min(plant.growth, max) as GrowthLevel };
  if (plant.reached) {
    const r: Partial<Record<GrowthId, number>> = {};
    for (const [k, v] of Object.entries(plant.reached)) if (GROWTH_IDS.indexOf(k as GrowthId) + 1 <= out.growth) r[k as GrowthId] = v;
    out.reached = r;
  }
  if (out.pending !== undefined && out.pending > out.growth) delete out.pending;
  if (out.backfill && out.backfill.growth > out.growth) out.backfill = { ...out.backfill, growth: out.growth };
  return out;
}

function reachedAbove(reached: CertPlant['reached'], max: number): boolean {
  return !!reached && Object.keys(reached).some((k) => GROWTH_IDS.indexOf(k as GrowthId) + 1 > max);
}

// ── Validation (backup restore) ────────────────────────────────────────

const isTs = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0;
const isDate = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const onlyKeys = (o: Record<string, unknown>, keys: readonly string[]) => Object.keys(o).every((k) => keys.includes(k));
const isLook = isCatalogLook;
/** The look's single-choice slots and the catalogue slot each must hold (mobile 1.14). */
const LOOK_SLOTS = [
  ['style', 'style'],
  ['colourway', 'colourway'],
  ['ground', 'ground'],
  ['planter', 'planter'],
  ['visitor', 'visitor'],
] as const;

/**
 * True when `x` is a well-formed CertPlant: known species, a clean name, a
 * growth 1..6 with nothing reached or pending above it, keepsakes ≤ 3 and
 * distinct, no unknown keys. A backup that fails this is refused (bad data),
 * never half-loaded.
 */
export function isValidPlantState(x: unknown): x is CertPlant {
  if (!isObj(x)) return false;
  if (!onlyKeys(x, ['species', 'name', 'plantedAt', 'replantedAt', 'growth', 'reached', 'pending', 'backfill', 'look', 'kept', 'passedOn'])) return false;
  if (!isPlantSpecies(x.species)) return false;
  if (typeof x.name !== 'string' || cleanPlantName(x.name) !== x.name) return false;
  if (!isTs(x.plantedAt)) return false;
  if (x.replantedAt !== undefined && !isTs(x.replantedAt)) return false;
  if (!isGrowthLevel(x.growth)) return false;
  const growth = x.growth;
  if (x.reached !== undefined) {
    if (!isObj(x.reached)) return false;
    for (const [k, v] of Object.entries(x.reached)) {
      const lvl = GROWTH_IDS.indexOf(k as GrowthId) + 1;
      if (lvl < 1 || lvl > growth || !isTs(v)) return false;
    }
  }
  if (x.pending !== undefined && !(isGrowthLevel(x.pending) && x.pending > 1 && x.pending <= growth)) return false;
  if (x.backfill !== undefined) {
    const b = x.backfill;
    if (!isObj(b) || !onlyKeys(b, ['at', 'growth', 'seen']) || !isTs(b.at) || !isGrowthLevel(b.growth) || b.growth > growth) return false;
    if (b.seen !== undefined && typeof b.seen !== 'boolean') return false;
  }
  if (x.look !== undefined) {
    const l = x.look;
    if (!isObj(l) || !onlyKeys(l, ['style', 'colourway', 'ground', 'planter', 'visitor', 'keepsakes'])) return false;
    for (const [k, slot] of LOOK_SLOTS) if (l[k] !== undefined && !isLookOfSlot(l[k], slot)) return false;
    if (l.keepsakes !== undefined) {
      const ks = l.keepsakes;
      if (!Array.isArray(ks) || ks.length > MAX_KEEPSAKES || !ks.every((k) => isLookOfSlot(k, 'keepsake')) || new Set(ks).size !== ks.length) return false;
    }
  }
  // `kept` holds only what a Reset can carry (code review M4): never a free item, never the ribbon.
  if (x.kept !== undefined && !(Array.isArray(x.kept) && x.kept.length <= MAX_KEPT && x.kept.every(isKeepable))) return false;
  if (x.passedOn !== undefined && !isDate(x.passedOn)) return false;
  return true;
}

const PLANT_SETTING_KEYS = ['showPlant', 'quietLook', 'promptHidden'] as const;

/** True when `x` is a well-formed PlantSettings (every field an optional boolean, nothing else). */
export function isValidPlantSettings(x: unknown): x is PlantSettings {
  if (!isObj(x) || !onlyKeys(x, PLANT_SETTING_KEYS)) return false;
  return PLANT_SETTING_KEYS.every((k) => x[k] === undefined || typeof x[k] === 'boolean');
}

/** A look id as saved: one of the catalogue's (mobile 1.14; 4a only checked it was a slug). */
export function isLookId(x: unknown): x is LookId {
  return isLook(x);
}

/**
 * The phone's own plant, made to fit the rules a restore checks (the backup
 * "fit" mode): the name cleaned, nothing reached or pending above the growth,
 * the back-fill no higher, a pending Seed dropped, keepsakes distinct and at
 * most MAX_KEEPSAKES, look and kept ids the catalogue doesn't have (or a
 * slot that doesn't fit) dropped. A plant
 * that is already valid comes back unchanged (the same object).
 */
export function repairPlant(p: CertPlant): CertPlant {
  const valid: boolean = isValidPlantState(p); // a plain boolean: keep `p` typed below
  if (valid) return p;
  let out: CertPlant = { ...p, name: cleanPlantName(typeof p.name === 'string' ? p.name : '') };
  out = clampToSupported(out, out.growth);
  if (out.pending !== undefined && out.pending <= 1) delete out.pending;
  if (out.look) {
    const look: PlantLook = {};
    for (const [k, slot] of LOOK_SLOTS) if (isLookOfSlot(out.look[k], slot)) look[k] = out.look[k];
    if (out.look.keepsakes) look.keepsakes = [...new Set(out.look.keepsakes.filter((k) => isLookOfSlot(k, 'keepsake')))].slice(0, MAX_KEEPSAKES);
    out.look = look;
  }
  if (out.kept) out.kept = [...new Set(out.kept.filter(isKeepable))].slice(0, MAX_KEPT);
  return out;
}

// ── Domain organs ──────────────────────────────────────────────────────

/** An organ's fullness from domain mastery: 62% (a young, budding part) to 108%. Never bare. */
export const ORGAN_MIN = 0.62;
export const ORGAN_SPAN = 0.46;
/**
 * How much the blueprint weight changes an organ's size. 0.5 = halfway
 * between "all equal" and "exactly proportional", so a 12% domain is 0.8× and
 * a 26% domain 1.15× the average: the weight reads, the plant stays balanced.
 */
export const ORGAN_WEIGHT_PULL = 0.5;

export function organFullness(mastery: number | null | undefined): number {
  const m = typeof mastery === 'number' && Number.isFinite(mastery) ? Math.max(0, Math.min(1, mastery)) : 0;
  return ORGAN_MIN + ORGAN_SPAN * m;
}

/** 0 not started · 1 budding · 2 growing · 3 full · 4 lush (r = mastery / DOMAIN_TARGET). */
export type OrganStep = 0 | 1 | 2 | 3 | 4;
export const ORGAN_STEP_WORDS: Record<OrganStep, string> = { 0: 'not started yet', 1: 'budding', 2: 'growing', 3: 'full', 4: 'lush' };

export function organStep(answered: number, mastery: number): OrganStep {
  if (answered <= 0) return 0;
  const r = mastery / DOMAIN_TARGET;
  return r < 1 / 3 ? 1 : r < 2 / 3 ? 2 : r < 1 ? 3 : 4;
}

export interface Organ {
  /** Size factor from the blueprint weight (1 = an average domain). */
  weightScale: number;
  /** 0.62..1.08 from mastery. */
  fullness: number;
  /** What the renderer draws: weightScale × fullness. */
  scale: number;
  step: OrganStep;
}

/**
 * One organ per domain, in domain order, from the SAME data as the rings
 * (readiness.domains[d].mastery), so the plant never disagrees with them.
 */
export function organs(weights: readonly number[], domains: readonly { answered: number; mastery: number }[]): Organ[] {
  const mean = weights.reduce((s, w) => s + w, 0) / (weights.length || 1) || 1;
  return weights.map((w, i) => {
    const d = domains[i] ?? { answered: 0, mastery: 0 };
    const weightScale = 1 + ORGAN_WEIGHT_PULL * (w / mean - 1);
    const fullness = organFullness(d.mastery);
    return { weightScale, fullness, scale: weightScale * fullness, step: organStep(d.answered, d.mastery) };
  });
}

/** The renderer's input: just the scales. */
export const organScales = (os: readonly Organ[]) => os.map((o) => o.scale);

/** Every species is drawn with exactly this many organ slots (the CISA blueprint's five domains). */
export const PLANT_SLOTS = 5;

/**
 * The slot (0..PLANT_SLOTS-1) a domain is drawn in. Up to five domains map
 * one to one. More than five merge into the nearest slot by order (8 domains:
 * 0,1,1,2,2,3,3,4), so D1 stays lowest and the last domain stays last.
 */
export function slotOf(index: number, domainCount: number): number {
  if (domainCount <= PLANT_SLOTS) return index;
  return Math.round((index * (PLANT_SLOTS - 1)) / (domainCount - 1));
}

/**
 * Exactly PLANT_SLOTS organs for the renderer, for a cert with any number of
 * domains (owner decision 5):
 * - 5 domains: the same as organs();
 * - more: domains sharing a slot merge (weights add; mastery is the
 *   weight-averaged mastery; answers add), so the picture stays balanced;
 * - fewer: the missing slots show as YOUNG organs (average size, the
 *   youngest fullness), never bare and never a gap.
 */
export function organSlots(weights: readonly number[], domains: readonly { answered: number; mastery: number }[]): Organ[] {
  const n = weights.length;
  if (n === PLANT_SLOTS) return organs(weights, domains);
  const w: number[] = Array.from({ length: PLANT_SLOTS }, () => 0);
  const m: number[] = Array.from({ length: PLANT_SLOTS }, () => 0);
  const a: number[] = Array.from({ length: PLANT_SLOTS }, () => 0);
  const used: boolean[] = Array.from({ length: PLANT_SLOTS }, () => false);
  weights.forEach((wt, i) => {
    const k = slotOf(i, n);
    const d = domains[i] ?? { answered: 0, mastery: 0 };
    const ww = wt > 0 ? wt : 0;
    m[k] = w[k] + ww > 0 ? (m[k] * w[k] + (Number.isFinite(d.mastery) ? d.mastery : 0) * ww) / (w[k] + ww) : 0;
    w[k] += ww;
    a[k] += d.answered;
    used[k] = true;
  });
  const real = w.filter((x, k) => used[k] && x > 0);
  const mean = real.length ? real.reduce((s, x) => s + x, 0) / real.length : 1;
  // A missing slot weighs like an average domain and reads as young.
  const slotWeights = w.map((x, k) => (used[k] ? x : mean));
  const out = organs(
    slotWeights,
    slotWeights.map((_, k) => (used[k] ? { answered: a[k], mastery: m[k] } : { answered: 0, mastery: 0 })),
  );
  return out;
}

/**
 * "Next to grow": the domain with the most exam points still on the table
 * ((1 − mastery) × weight), the same rule as readiness' focus. Never framed
 * as "your weakest".
 */
export function nextToGrow(weights: readonly number[], mastery: readonly number[]): number {
  let best = 0;
  let gap = -1;
  weights.forEach((w, i) => {
    const g = (1 - (mastery[i] ?? 0)) * w;
    if (g > gap) {
      gap = g;
      best = i;
    }
  });
  return best;
}

// ── Small daily life and rest ──────────────────────────────────────────

/** A mock's score that counts as a "first flower" (or one that beats every earlier mock of 50+). */
export const FLOWER_SCORE = 0.75;
/** The first flower lasts the day of the mock and the next FLOWER_DAYS − 1 days. */
export const FLOWER_DAYS = 3;
/** No study for this many days (or a planned rest day): the calm resting look. A look, never a loss. */
export const REST_AFTER_DAYS = 3;
/** Back after this many days: one welcome line, once ("kept your place"). It never counts the days. */
export const RETURN_DAYS = 7;

export interface DailyInput {
  today: string;
  /** The last study day for this cert (milestones.lastDay). */
  lastStudyDay?: string;
  /** Today's plan is cleared. */
  planCleared: boolean;
  mocks: readonly PlantMock[];
  /** milestones.earned keys ("firm-footing:4", "rooted:30"…). */
  earned: Record<string, number>;
  domainIds: readonly string[];
  /** A planned break, the weekly rest day, or the exam eve. */
  plannedRest?: boolean;
}

export interface DailySignals {
  /** Studied today: light new tips on every part. Says nothing about other days. */
  newGrowth: boolean;
  /** The plan is cleared: a visitor perches. */
  visitor: boolean;
  /** A strong mock in the last FLOWER_DAYS days: one early flower. Ends quietly, never "fades". */
  firstFlower: boolean;
  /** Firm Footing earned, per domain (a permanent part mark). */
  partMarks: boolean[];
  /** Rooted tiers earned: 0 none, 1 moss, 2 ferns, 3 wildflowers. Permanent. */
  undergrowth: 0 | 1 | 2 | 3;
  /** The calm resting look (dusk, a small moon). Growth and parts are unchanged. */
  resting: boolean;
}

/** Derived, true, and impossible to farm: nothing here counts volume or punishes absence. */
export function dailySignals(i: DailyInput): DailySignals {
  const flower = (() => {
    const big = i.mocks.filter((m) => m.total >= CROWN_MOCK).sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
    return big.some((m, k) => {
      const age = daysBetween(m.day, i.today);
      if (age < 0 || age >= FLOWER_DAYS) return false;
      const score = m.correct / m.total;
      const earlier = big.slice(0, k);
      return score >= FLOWER_SCORE || (earlier.length > 0 && earlier.every((e) => score > e.correct / e.total));
    });
  })();
  const rooted = [10, 30, 60].filter((n) => i.earned[`rooted:${n}`] !== undefined).length as 0 | 1 | 2 | 3;
  return {
    newGrowth: i.lastStudyDay === i.today,
    visitor: i.planCleared,
    firstFlower: flower,
    partMarks: i.domainIds.map((d) => i.earned[`firm-footing:${d}`] !== undefined),
    undergrowth: rooted,
    resting: isResting(i.lastStudyDay, i.today, i.plannedRest),
  };
}

/**
 * Resting = a calm look on a planned rest day, or after REST_AFTER_DAYS
 * without study. It changes the scene, never the plant: no wilting, no colour
 * loss, no smaller parts. A plant with no study day yet is simply new, not resting.
 */
export function isResting(lastStudyDay: string | undefined, today: string, plannedRest = false): boolean {
  if (plannedRest) return true;
  if (!lastStudyDay) return false;
  return daysBetween(lastStudyDay, today) >= REST_AFTER_DAYS;
}

/** The exam eve and exam day say their own calm line (UX review P2): planned rest, never a nudge. */
export const EXAM_REST_LINES = {
  eve: 'Rest day. Sleep and time off help memory settle.',
  day: "Good luck. You've done the work.",
} as const;

/**
 * The one line under a resting or returning plant. It never says how long
 * the learner was away. `exam` ("eve" / "day", engine/examDay.ts examMoment)
 * gives the exam's own line instead.
 */
export function restLine(p: Pick<CertPlant, 'name' | 'species'>, lastStudyDay: string | undefined, today: string, exam?: 'eve' | 'day' | null): string | null {
  if (exam) return EXAM_REST_LINES[exam];
  const who = plantCallName(p);
  if (lastStudyDay && daysBetween(lastStudyDay, today) >= RETURN_DAYS) return `${who} kept your place. Pick up where you left off.`;
  if (isResting(lastStudyDay, today)) return `${who} is resting. Pick up whenever you're ready.`;
  return null;
}

// ── Spoken labels (spec §12, with "growth" for "stage") ─────────────────

export interface LabelInput {
  name?: string;
  species: PlantSpecies;
  growth: GrowthLevel;
  resting?: boolean;
  newGrowth?: boolean;
  /** Mobile 1.14: the face's mood, spoken as a few words ("Looking happy."). */
  mood?: PlantMood;
  /** Mobile 1.14: the visitor perched today ("wren", "robin"). */
  visitor?: string;
}

/**
 * The plant's one screen-reader label: "Kai, your oak. Growth: Bough, 4 of 6. New growth today."
 * Name first when there is one. Never a bank size, never "stage".
 */
export function plantLabel(i: LabelInput): string {
  const sp = SPECIES_INFO[i.species].lower;
  const who = i.name ? `${shownName(i.name)}, your ${sp}` : `Your ${sp}`;
  const extra = [i.newGrowth ? 'New growth today.' : '', i.resting ? 'Resting.' : '', i.mood ? MOOD_WORDS[i.mood] : '', i.visitor ? `A ${i.visitor} is visiting.` : ''].filter(Boolean).join(' ');
  return `${who}. Growth: ${GROWTH_NAMES[i.growth]}, ${i.growth} of 6.${extra ? ` ${extra}` : ''}`;
}

/** The quiet back-fill line when an existing learner plants: "Your study so far grew Kai to Bough." */
export function backfillLine(p: Pick<CertPlant, 'name' | 'species'>, growth: GrowthLevel): string {
  return growth > 1 ? `Your study so far grew ${p.name ? shownName(p.name) : `your ${SPECIES_INFO[p.species].lower}`} to ${GROWTH_NAMES[growth]}.` : `Planted. Your first ${SPROUT_ANSWERS} answers give it its first sprout.`;
}

/** "Bough · growth 4 of 6": the short growth line beside the plant. Never "stage". */
export function growthShort(growth: GrowthLevel): string {
  return `${GROWTH_NAMES[growth]} · growth ${growth} of ${MAX_GROWTH}`;
}

/** The grow-up line, announced once: "Kai grew to Crown." */
export function grewLabel(p: Pick<CertPlant, 'name' | 'species'>, growth: GrowthLevel): string {
  return `${plantCallName(p)} grew to ${GROWTH_NAMES[growth]}.`;
}

/** One domain organ as a text row or a screen-reader stop: "Domain 4, IS Operations…, 30 percent, budding. Next to grow." */
export function organLabel(index: number, domainName: string, mastery: number, step: OrganStep, next = false): string {
  const pc = Math.round(Math.max(0, Math.min(1, mastery)) * 100);
  return `Domain ${index + 1}, ${domainName}, ${pc} percent, ${ORGAN_STEP_WORDS[step]}.${next ? ' Next to grow.' : ''}`;
}
