/**
 * A random but PLAUSIBLE learner state, seeded (the same seed always gives
 * the same state). Extracted from backup-always-restorable.test.ts for the
 * Uplift Phase 7 sync merge property tests (spec §3.1 S1): the backup export
 * test and the merge tests throw the same states at their code.
 *
 * It lives in jest/ (not src/__tests__/, where Jest runs every file as a
 * test), next to the other test helpers. Import it from a test.
 */
import { getAllQuestions } from '../src/content/loader';
import { MAX_ANSWER_MS } from '../src/engine/answerClock';
import { GROWTH_IDS, PLANT_SPECIES, type CertPlant, type GrowthLevel } from '../src/engine/plant';
import { createRng } from '../src/engine/random';
import { dayKey } from '../src/engine/streak';
import { MAX_SESSION_MINUTES } from '../src/lib/finishSession';
import type { CertProgress, MockResult } from '../src/store/progress';

/** The fixed "now" the states are built around (12 Oct 2026, 09:00 local). */
export const T0 = new Date(2026, 9, 12, 9, 0, 0).getTime();
export const MIN = 60_000;
export const DAY = 24 * 60 * MIN;
/** Every CISA question id. */
export const ids = getAllQuestions('cisa').map((q) => q.id);

/** A random but plausible cert, with the edges real use can reach. */
export function randomCert(seed: number): CertProgress {
  const rng = createRng(seed);
  const n = (max: number) => Math.floor(rng() * max);
  const pick = <T,>(xs: T[]) => xs[n(xs.length)];
  const answers: CertProgress['answers'] = {};
  for (let i = 0; i < 40; i++) {
    const attempts = 1 + n(5);
    answers[pick(ids)] = {
      attempts,
      correctCount: n(attempts + 1),
      lastCorrect: rng() < 0.6,
      lastAt: T0 - n(400) * DAY,
      // Daylight extended many times, or an old build that never capped.
      ...(rng() < 0.7 ? { ms: pick([0, 1, 45_000, MAX_ANSWER_MS, MAX_ANSWER_MS + 1, 3 * 3_600_000, 12.7 * 1000]) } : {}),
      // Build F: the last answer came from a game (skipped by milestones).
      ...(rng() < 0.3 ? { lastGame: true as const } : {}),
    };
  }
  // Logged mistakes, some already fixed on a later day (Loop Closed).
  const mistakes: CertProgress['mistakes'] = {};
  for (const qid of Object.keys(answers).slice(0, n(10))) {
    mistakes[qid] = { at: T0 - n(30) * DAY, ...(rng() < 0.5 ? { resolved: true } : {}), ...(rng() < 0.5 ? { fixedLater: true } : {}) };
  }
  const hitsOf = (len: number) => Array.from({ length: len }, (_, k) => ({ id: `card${k}`, ok: rng() < 0.8 }));
  const mocks: MockResult[] = Array.from({ length: n(8) }, (_, i) => {
    const total = pick([12, 50, 150]);
    return {
      id: `m${i}`,
      finishedAt: T0 - n(30) * DAY,
      total,
      correct: n(total + 1),
      // Long untimed mocks from 1.4.0: days of wall time.
      minutesUsed: pick([1, 80, 240, MAX_SESSION_MINUTES, 2 * DAY / MIN, 9 * DAY / MIN]),
      byDomain: { '1': { total: 10, correct: n(11) } },
      ...(rng() < 0.5 ? { timing: pick(['standard', 'plus25', 'plus50', 'untimed'] as const) } : {}),
      ...(rng() < 0.5 ? { minutesAllowed: pick([80, 360, 2000]) } : {}),
      ...(rng() < 0.5 ? { medianSec: pick([0, 90, 1800, 50_000]) } : {}),
      ...(rng() < 0.5 ? { unanswered: n(total + 1) } : {}),
      ...(rng() < 0.5 ? { checkpoints: Array.from({ length: n(14) }, () => pick([-3000, -2, 0, 0.15, 1, 4])) } : {}),
    };
  });
  return {
    answers,
    review: {},
    bookmarks: [],
    mocks,
    lessonsDone: [],
    mistakes,
    gameBest: { trap: n(10), sprint: pick([-40, 14, 2_000_000]), daylight: n(7) },
    gameRecent: { sprint: Array.from({ length: n(70) }, () => pick([-5000, 3, 9])) },
    notesRead: [],
    // Build F: game levels with their hit history and verdict runs (any length the
    // store could hold, plus an older build's over-long list and huge counts).
    ...(rng() < 0.7
      ? {
          gameGrowth: {
            trap: { tier: pick(['seedling', 'sapling', 'heartwood'] as const), up: n(3), down: n(3), hits: Array.from({ length: n(45) }, () => rng() < 0.5) },
            sprint: { tier: 'sapling' as const, up: pick([0, 2, 500]), down: 0, run: pick([0, 3, 2_000_000_000]) },
          },
        }
      : {}),
    // Build F: milestones (earned marks, the queue, counters, sure answers,
    // game misses, study days) and note cards of every Build F kind.
    ...(rng() < 0.7
      ? {
          milestones: {
            earned: Object.fromEntries(
              [
                'first-foothold',
                'firm-footing:4',
                'rooted:10',
                'rooted:60',
                'graduate',
                'whole-grove',
                'snare-wise',
                // Mobile 1.11: the tiers and Took Root (kept or dropped on restore, never refused).
                'whole-map',
                'long-memory:75',
                'long-memory:150',
                'dress-rehearsal:2',
                'dress-rehearsal:3',
                'firm-footing:4:80',
                'took-root',
              ]
                .filter(() => rng() < 0.5)
                .map((k) => [k, T0 - n(90) * DAY]),
            ),
            ...(rng() < 0.5 ? { queue: ['rooted:10', 'graduate'] } : {}),
            ...(rng() < 0.5 ? { backfill: { at: T0 - n(30) * DAY, count: n(15), ...(rng() < 0.5 ? { seen: true } : {}) } } : {}),
            counts: { longRecall: n(40), graduated: pick([0, 50, 3_000_000_000]), loopFixed: n(12), gameFixes: n(12), paceRounds: n(4) },
            // Rolling windows and Long Memory's counted ids (an older build's
            // over-long lists too: export keeps the newest).
            ...(rng() < 0.6 ? { myths: hitsOf(pick([0, 3, 25, 40])), signposts: hitsOf(pick([0, 10, 18])) } : {}),
            // Up to the 150 Long Memory now keeps (mobile 1.11), and past it.
            ...(rng() < 0.5 ? { longIds: Object.keys(answers).slice(0, pick([n(26), 150, 170])) } : {}),
            sure: Array.from({ length: n(70) }, () => rng() < 0.8),
            gameMisses: Object.fromEntries(Array.from({ length: n(6) }, () => [pick(ids), dayKey(T0 - n(20) * DAY)])),
            ...(rng() < 0.5 ? { cardMisses: { 'kt:D4:abc123': dayKey(T0 - n(5) * DAY), 'role:1A1.3:r001': dayKey(T0) } } : {}),
            days: n(100),
            lastDay: dayKey(T0 - n(5) * DAY),
            ...(rng() < 0.3 ? { returnedOn: dayKey(T0) } : {}),
            // Mobile 1.10: completed sets' planters (kept or dropped on restore, never refused).
            ...(rng() < 0.5 ? { planters: { rooted: T0 - n(20) * DAY, groundwork: T0, examDay: T0 - DAY } } : {}),
            // Mobile 1.11: the catalogue version filled in, and its one line.
            ...(rng() < 0.5 ? { catalog: pick([1, 2]) } : {}),
            ...(rng() < 0.5 ? { catalogFill: { at: T0 - n(9) * DAY, count: n(4), ...(rng() < 0.5 ? { seen: true } : {}) } } : {}),
          },
        }
      : {}),
    // Mobile 1.16: the exam-week checklist (any ticks, hidden or not; an
    // older build or a newer one could hold ids this app doesn't know).
    ...(rng() < 0.6
      ? {
          moments: {
            examWeek: {
              for: pick(['2026-10-20', '2027-01-05']),
              done: pick([[], ['booking'], ['pace', 'sleep', 'guide'], ['booking', 'guide', 'online', 'centre', 'pace', 'sleep'], ['sleep', 'nap', 'sleep']]) as never,
              ...(rng() < 0.5 ? { hidden: true } : {}),
            },
          },
        }
      : {}),
    ...(rng() < 0.5
      ? {
          cards: {
            'role:1A1.3:r001': { box: 1, dueAt: T0, lastSeen: T0, reps: 1 },
            'seq:1A3.1:s001': { box: 2, dueAt: T0 + DAY, lastSeen: T0, reps: 2 },
            'flow:cisa-l-d1-engagement': { box: 1, dueAt: T0, lastSeen: T0, reps: 1 },
            'kt:D4:abc123': { box: pick([1, 3, 400]), dueAt: T0, lastSeen: T0, reps: 1 },
          },
        }
      : {}),
  };
}

/**
 * Mobile 1.13: a plant as the phone could hold it, edges included: names
 * with bidi marks, zero-widths, emoji and over-long text (an older build or
 * a direct store write), growth with `reached`, `pending` and a back-fill
 * that don't agree, duplicate keepsakes, odd look ids. Export must repair
 * every one into a plant the restore accepts.
 */
export function randomPlant(seed: number): CertPlant | undefined {
  const rng = createRng(seed * 977);
  if (rng() < 0.25) return undefined;
  const n = (max: number) => Math.floor(rng() * max);
  const pick = <T,>(xs: readonly T[]) => xs[n(xs.length)];
  const growth = (1 + n(6)) as GrowthLevel;
  const reached: Partial<Record<(typeof GROWTH_IDS)[number], number>> = {};
  for (const g of GROWTH_IDS) if (rng() < 0.5) reached[g] = T0 - n(60) * DAY;
  const names = ['Kai', '', 'Hana 🌸', '\u202Eevil\u202C', 'zero\u200Bwidth', '  spaced   out  ', 'Ledger', 'Ａｔｌａｓ', '🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳🌳', 'é'.normalize('NFD'), 'A'.repeat(60)];
  return {
    species: pick(PLANT_SPECIES),
    name: pick(names),
    plantedAt: T0 - n(90) * DAY,
    growth,
    ...(rng() < 0.6 ? { reached } : {}),
    ...(rng() < 0.4 ? { replantedAt: T0 - n(10) * DAY } : {}),
    ...(rng() < 0.4 ? { pending: (1 + n(6)) as GrowthLevel } : {}),
    ...(rng() < 0.4 ? { backfill: { at: T0 - n(20) * DAY, growth: (1 + n(6)) as GrowthLevel, ...(rng() < 0.5 ? { seen: true } : {}) } } : {}),
    // Mobile 1.14: catalogue ids in every slot (a planter too), plus ids an older or tampered build could hold.
    ...(rng() < 0.5
      ? {
          look: {
            // Mobile 1.40: the style (unset = a plant saved before 1.40), plus ids of another slot.
            ...(rng() < 0.5 ? { style: pick(['botanical', 'storybook', 'storybook-face', 'meadow', 'Bad Id']) } : {}),
            ...(rng() < 0.6 ? { colourway: pick(['oak-autumn', 'lotus-white', 'cactus-red', 'Bad Id', 'meadow']) } : {}),
            ground: pick(['meadow', 'stone-ring', 'trail-blaze', 'lantern']),
            ...(rng() < 0.6 ? { planter: pick(['native', 'celadon', 'five-stone', 'root-woven', 'wren']) } : {}),
            ...(rng() < 0.5 ? { visitor: pick(['wren', 'robin', 'no-visitor', 'owl']) } : {}),
            keepsakes: pick([[], ['lantern'], ['fox', 'fox', 'jay'], ['a', 'b', 'c', 'd', 'e'], ['sundial', 'clear-dawn', 'ribbon', 'cairn']]),
          },
        }
      : {}),
    // PR #44 code review M4: `kept` may only hold what a Reset can carry (never the ribbon, never a free item).
    ...(rng() < 0.3 ? { kept: pick([['robin'], ['robin', 'robin'], ['stone-ring', 'fieldstone', 'oak-autumn', 'lantern'], ['ribbon', 'lantern'], ['meadow', 'wren', 'robin'], Array.from({ length: 80 }, (_, k) => `kept-${k}`)]) } : {}),
    ...(rng() < 0.2 ? { passedOn: '2026-09-30' } : {}),
  } as CertPlant;
}

/** Mobile 1.7: Your reports, from none to more than the cap (an older build could hold any length). */
export function randomReports(seed: number) {
  const rng = createRng(seed * 31);
  const len = [0, 1, 5, 200, 260][Math.floor(rng() * 5)];
  return Array.from({ length: len }, (_, i) => ({
    ref: `R-${'ABCDEFGH'[i % 8]}${'23456789'[Math.floor(i / 8) % 8]}QQ`,
    item: ['q:d4_217', 'note:4A2.3', 'lesson:cisa-l-d1-charter#3', 'card:rumor:4B1.2:k1x9', 'app:settings', 'q:d9_999'][i % 6],
    reason: ['key', 'typo', 'other', 'freeze'][i % 4],
    at: T0 - i * DAY,
    cert: 'cisa',
    ...(rng() < 0.3 ? { creditSeen: true } : {}),
  }));
}
