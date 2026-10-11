/**
 * The badge collection (mobile 1.10, badges_game.md slice A): the same
 * badges and rules as Build F, arranged as a COLLECTION of small sets.
 *
 * Plain English for the founder:
 * - Six counted sets, in journey order: Groundwork, The Five Domains,
 *   Evergreen, Sound Judgement, Exam Day and Rooted. Each set has its own
 *   "2 of 3". There is NO grand total and no "collect them all" trophy:
 *   a global count would pull study toward whichever badge is cheapest.
 * - Two shelves that are not counted with them:
 *   - Moments (Fresh Start): under a collection, counting it would reward a
 *     week away, so it is a personal moment, never a target.
 *   - Field notes (the 7 game skill badges): counted on their own, so play
 *     never pulls study off the exam's blueprint.
 * - "Next for your exam" (`nextForExam`): slot 1 is the badge that helps the
 *   exam most at this stage (a heavy domain's gap, then the mocks, then
 *   long-term memory); slots 2 and 3 are the nearest by progress. Each has a
 *   "Study for this" target. Gated badges are never suggested.
 * - No rarity. Each badge carries an EFFORT fact worked out from its rule
 *   ("Needs at least 8 days…"), and the effort sort uses the minimum days.
 * - Every rule is unchanged (engine/milestones.ts decides them). Every
 *   earned key keeps its exact meaning, so nothing a learner earned moves
 *   or disappears.
 *
 * Pure TypeScript: no React, no storage, no dates formatted here.
 */
import { GAMES, type GameId } from './games/registry';
import { DIAGNOSTIC_SIZE, MOCK_DOMAIN_FLOOR, type Stage } from './journey';
import {
  badgeDef,
  DRESS_GAP_DAYS,
  FIRM_ANSWERS,
  FIRM_DEEP,
  FIRM_MASTERY,
  FRESH_GAP_DAYS,
  GRADUATES,
  LONG_GAP_DAYS,
  LONG_LADDER,
  LOOP_FIXES,
  markBadge,
  DRESS_TIERS,
  ROOTED_DAYS,
  SLIP_TAGS,
  SURE_MIN,
  type BadgeId,
  type MarkState,
} from './milestones';
import { GROWTH_MIN_DAYS, GROWTH_WINDOW } from './mindsetGrowth';
import { INTERVAL_DAYS, MAX_BOX } from './srs';

// ── Sets ─────────────────────────────────────────────────────────────────
export type SetId = 'groundwork' | 'domains' | 'evergreen' | 'judgement' | 'examDay' | 'rooted' | 'moments' | 'fieldNotes';

/** Journey order: shelves show in this order on the case. */
export const SET_ORDER: readonly SetId[] = ['groundwork', 'domains', 'evergreen', 'judgement', 'examDay', 'rooted', 'moments', 'fieldNotes'];

/** The six counted sets (the ones with a "2 of 3" and a set reward). */
export const COUNTED_SETS: readonly SetId[] = ['groundwork', 'domains', 'evergreen', 'judgement', 'examDay', 'rooted'];

/** Which set each badge sits in. Within a set, the order below is exam value. */
export const BADGE_SET: Record<BadgeId, SetId> = {
  'first-foothold': 'groundwork',
  'topic-clear': 'groundwork',
  'ten-topics': 'groundwork',
  'firm-footing': 'domains',
  'whole-map': 'domains',
  'long-memory': 'evergreen',
  graduate: 'evergreen',
  'loop-closed': 'evergreen',
  'took-root': 'evergreen',
  'know-what-you-know': 'judgement',
  'slip-spotter': 'judgement',
  'mindset-shift': 'judgement',
  'dress-rehearsal': 'examDay',
  'on-pace': 'examDay',
  rooted: 'rooted',
  'fresh-start': 'moments',
  'snare-wise': 'fieldNotes',
  'even-keel': 'fieldNotes',
  'signpost-reader': 'fieldNotes',
  'myth-clearer': 'fieldNotes',
  'sure-footed-pace': 'fieldNotes',
  'whole-grove': 'fieldNotes',
  'back-on-path': 'fieldNotes',
};

/** Badge order inside its set (exam value first). Firm Footing's leaves sort by domain weight. */
const BADGE_ORDER: BadgeId[] = [
  'first-foothold',
  'topic-clear',
  'ten-topics',
  'firm-footing',
  'whole-map',
  'long-memory',
  'graduate',
  'loop-closed',
  'took-root',
  'know-what-you-know',
  'slip-spotter',
  'mindset-shift',
  'dress-rehearsal',
  'on-pace',
  'rooted',
  'fresh-start',
  'snare-wise',
  'even-keel',
  'signpost-reader',
  'myth-clearer',
  'sure-footed-pace',
  'whole-grove',
  'back-on-path',
];

/** The exam facts the copy reads (a cert's `exam`, and how many domains it has). */
export interface ExamFacts {
  questions: number;
  minutes: number;
}

/** One domain, as the case needs it (from the cert's domains). */
export interface CaseDomain {
  id: string;
  short: string;
  /** Blueprint weight, in percent. */
  weight: number;
  tone: number;
  /** Firm Footing's own emblem for this domain (components/medallion.tsx), when the exam has one. */
  emblem?: string;
}

export interface SetInfo {
  id: SetId;
  name: string;
  /** The exam purpose line under the set's header. */
  purpose: string;
  /** In the six counted sets (a "2 of 3" and a set reward). */
  counted: boolean;
  /** Field notes keeps its own "2 of 7"; Moments has no counter at all. */
  counter: boolean;
}

const NUMBER_WORD = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

/** "1.6": minutes per question, one decimal, no trailing ".0". */
function perQuestion(exam: ExamFacts): string {
  const x = Math.round((exam.minutes / exam.questions) * 10) / 10;
  return String(x);
}
/** "4 hours", "3 hours 30 minutes", "90 minutes". */
export function examLength(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} minutes`;
  const hours = `${h} ${h === 1 ? 'hour' : 'hours'}`;
  return m ? `${hours} ${m} minutes` : hours;
}

/** A set's name and purpose line. The domains set follows the exam: "The Four Domains" for a four-domain exam. */
export function setInfo(id: SetId, exam: ExamFacts, domainCount: number): SetInfo {
  const counted = COUNTED_SETS.includes(id);
  switch (id) {
    case 'groundwork':
      return { id, name: 'Groundwork', purpose: 'Start broad: diagnose, then clear topics.', counted, counter: true };
    case 'domains':
      return {
        id,
        name: `The ${NUMBER_WORD[domainCount] ?? domainCount} Domains`,
        purpose: 'Cover the exam as it’s weighted.',
        counted,
        counter: true,
      };
    case 'evergreen':
      return { id, name: 'Evergreen', purpose: 'Remember it on exam day, not just today.', counted, counter: true };
    case 'judgement':
      return { id, name: 'Sound Judgement', purpose: 'Choose the exam’s best answer, and know when you’re sure.', counted, counter: true };
    case 'examDay':
      return {
        id,
        name: 'Exam Day',
        purpose: `Practise the full sitting: ${exam.questions} questions in ${examLength(exam.minutes)}, about ${perQuestion(exam)} minutes each.`,
        counted,
        counter: true,
      };
    case 'rooted':
      return { id, name: 'Rooted', purpose: 'Little and often beats cramming.', counted, counter: true };
    case 'moments':
      return { id, name: 'Moments', purpose: 'Personal moments. Not counted.', counted, counter: false };
    case 'fieldNotes':
      return { id, name: 'Field notes', purpose: 'Game skills, counted on their own.', counted, counter: true };
  }
}

// ── Copy and effort (badges_game.md §3 and §8) ───────────────────────────
/**
 * What a badge needs that isn't the rule itself: Mindset Shift needs enough
 * answers to judge; the Stretch tiers and the spaced mocks open once Whole
 * Map is earned (every domain at the floor).
 */
export type Gate = 'mindsetData' | 'wholeMap';

/**
 * The badge catalogue's version (mobile 1.11 = 2: the tiers and Took Root).
 * A cert whose badges were filled in for an older one earns what its saved
 * study already shows, once and quietly (lib/milestones.ts ensureCatalog).
 */
export const CATALOG_VERSION = 2;

/** The words a Stretch tier always carries (never only a colour or a ring). */
export const STRETCH = 'Stretch: beyond exam need';

/** Graduate's shortest path: right on each review box's interval, then once more from the last box. */
const GRADUATE_MIN_DAYS = Object.entries(INTERVAL_DAYS)
  .filter(([box]) => Number(box) < MAX_BOX)
  .reduce((s, [, d]) => s + d, 0) + INTERVAL_DAYS[MAX_BOX] + 1;

interface Copy {
  /** Encouraging, with an action (shown before it is earned). */
  howTo: string;
  /** What you can now do, and why it matters (the moment and the earned sheet). */
  unlock: string;
  /** One honest fact derived from the rule (never rarity). */
  effort: string;
  /** The share line (slice D); empty when it isn't shareable. */
  skill: string;
  /** The fewest calendar days the rule can take (the Effort sort). */
  minDays: number;
  gate?: Gate;
}

const g = (id: GameId) => GAMES[id].name;
const ROOTED_UNLOCK: Record<number, string> = {
  10: 'Ten study days. Little and often is how it sticks.',
  30: 'Thirty study days. Spaced study is what makes it last.',
  60: 'Sixty study days. That’s a habit, and it shows on exam day.',
};
const TIER_WORD: Record<number, string> = { 10: 'Ten', 30: 'Thirty', 60: 'Sixty' };

function copyFor(key: string, badge: BadgeId, exam: ExamFacts, domain?: CaseDomain): Copy {
  const hours = examLength(exam.minutes);
  switch (badge) {
    case 'first-foothold':
      return {
        howTo: `${DIAGNOSTIC_SIZE} mixed questions show where to start. No score to beat.`,
        unlock: 'You’ve mapped where you stand. Your plan now starts from it.',
        effort: 'About half an hour: the diagnostic.',
        skill: 'Mapped my starting point',
        minDays: 0,
      };
    case 'topic-clear':
      return {
        howTo: 'Pick one topic in Guided: read the lesson, then answer until 4 of 5 land.',
        unlock: 'Your first topic is clear: learned, then shown.',
        effort: 'One sitting: a lesson, then a few questions on its topic.',
        skill: 'Cleared a first topic',
        minDays: 0,
      };
    case 'ten-topics':
      return {
        howTo: 'One topic at a time in Guided. Each one adds to the ten.',
        unlock: 'Ten topics clear. That’s real breadth.',
        effort: 'Several sittings: each topic needs its lesson and 4 of 5 right.',
        skill: 'Cleared ten topics',
        minDays: 0,
      };
    case 'firm-footing': {
      const name = domain?.short ?? 'this domain';
      if (key.endsWith(':80')) {
        return {
          howTo: 'A stretch. Breadth wins exams, so keep the other domains moving too.',
          unlock: `${Math.round(FIRM_DEEP * 100)}% in ${name}: depth beyond what the exam needs.`,
          effort: `${STRETCH}. The exam needs breadth more than one strong domain.`,
          skill: `Went deep in ${name}`,
          minDays: 0,
          gate: 'wholeMap',
        };
      }
      return {
        howTo: domain
          ? `${name} is ${domain.weight}% of the exam. Practise it in Smart until ${Math.round(FIRM_MASTERY * 100)}% holds.`
          : `Practise this domain in Smart until ${Math.round(FIRM_MASTERY * 100)}% holds.`,
        unlock: `Firm footing in ${name}: ${Math.round(FIRM_MASTERY * 100)}% mastery across ${FIRM_ANSWERS} or more questions.`,
        effort: `Needs ${FIRM_ANSWERS} or more of its questions answered, at ${Math.round(FIRM_MASTERY * 100)}% mastery.`,
        skill: `Firm footing in ${name}`,
        minDays: 0,
      };
    }
    case 'whole-map':
      return {
        howTo: 'Your weakest domain is the shortest path. Study for this opens it.',
        unlock: `Every domain is at ${Math.round(MOCK_DOMAIN_FLOOR * 100)}%. Time to rehearse with mocks.`,
        effort: `Needs every domain at ${Math.round(MOCK_DOMAIN_FLOOR * 100)}% at the same time.`,
        skill: `Reached ${Math.round(MOCK_DOMAIN_FLOOR * 100)}% in every exam domain in practice`,
        minDays: 0,
      };
    case 'long-memory': {
      const n = Number(key.split(':')[1]) || LONG_LADDER[0];
      const top = n === LONG_LADDER[LONG_LADDER.length - 1];
      return {
        howTo: 'Spaced review brings questions back after a gap. Answer them cold, without Coach me.',
        unlock: `You recalled ${n} questions a week or more after you last saw them. That’s what holds on exam day.`,
        effort: `Needs at least ${LONG_GAP_DAYS + 1} days: a recall counts a week after you last saw the question.${top ? ` ${STRETCH}.` : ''}`,
        skill: 'Recalls answers a week or more later',
        minDays: LONG_GAP_DAYS + 1,
      };
    }
    case 'graduate':
      return {
        howTo: 'Keep up with review. Each right answer moves a question a box further on.',
        unlock: `${GRADUATES === 50 ? 'Fifty' : GRADUATES} questions graduated: you’ve shown them again and again, weeks apart.`,
        effort: 'Needs several weeks: a question graduates from the last review box.',
        skill: `Moved ${GRADUATES} questions through spaced review`,
        minDays: GRADUATE_MIN_DAYS,
      };
    case 'loop-closed':
      return {
        howTo: 'Open Mistakes tomorrow, not today. A fix counts on a later day.',
        unlock: `${LOOP_FIXES === 10 ? 'Ten' : LOOP_FIXES} mistakes fixed for good. You learned from them.`,
        effort: 'Needs 2 days or more: a fix counts on a later day than the miss.',
        skill: 'Turns mistakes into knowledge',
        minDays: 2,
      };
    case 'took-root':
      return {
        howTo: 'Clear a topic, then come back to it on another day. Review brings it back.',
        unlock: 'A whole topic took root: every part of it right, on two different days.',
        effort: 'Needs 2 days or more: every part right on two different days.',
        skill: 'Made a whole topic stick',
        minDays: 2,
      };
    case 'know-what-you-know':
      return {
        howTo: 'Mark “sure” only when you’d bet on it. Honest confidence is the skill.',
        unlock: 'When you say sure, you’re right. That’s calibration, and it saves time on the exam.',
        effort: `Needs ${SURE_MIN} or more “sure” answers.`,
        skill: 'Knows when to be sure',
        minDays: 0,
      };
    case 'slip-spotter':
      return {
        howTo: 'After a miss, tag the thinking slip behind it in your Mistake journal.',
        unlock: 'You can name your own thinking slips. That’s how they stop.',
        effort: `Needs ${SLIP_TAGS} logged mistakes, each tagged.`,
        skill: 'Names my thinking slips',
        minDays: 0,
      };
    case 'mindset-shift':
      return {
        howTo: 'Read every tip’s “Final two” line. It shows why the runner-up loses.',
        unlock: 'You fall for the runner-up much less than you did. That’s the exam mindset.',
        effort: `Needs ${GROWTH_MIN_DAYS / 7} weeks or more between your first and latest answers.`,
        skill: 'Thinks like the exam',
        minDays: GROWTH_MIN_DAYS + 1,
        gate: 'mindsetData',
      };
    case 'dress-rehearsal': {
      const n = Number(key.split(':')[1]) || 1;
      if (n === 1) {
        return {
          howTo: `Block out ${hours}, or pause and finish later. Answer every question; guessing is free.`,
          unlock: 'A full sitting, every question answered. Exam day will feel familiar.',
          effort: `Needs a full mock: ${exam.questions} questions, ${hours}, which you can pause.`,
          skill: 'Sat a full timed practice exam',
          minDays: 0,
        };
      }
      // Each spaced mock is a week after the last: 2 need 8 days, 3 need 15.
      const days = (n - 1) * DRESS_GAP_DAYS + 1;
      const top = n === DRESS_TIERS[DRESS_TIERS.length - 1];
      return {
        howTo: `Sit another full mock ${DRESS_GAP_DAYS} days or more after your last one. Mocks from before every domain reached ${Math.round(MOCK_DOMAIN_FLOOR * 100)}% don’t count here.`,
        unlock: top
          ? `${NUMBER_WORD[n]} full sittings, each a week apart. That’s all the rehearsal the exam needs.`
          : `${NUMBER_WORD[n]} full sittings, a week apart. The exam’s length won’t surprise you.`,
        effort: `Needs at least ${days} days and ${n} full mocks.${top ? ` ${STRETCH}.` : ''}`,
        skill: `Sat ${n} full timed practice exams, a week apart`,
        minDays: days,
        gate: 'wholeMap',
      };
    }
    case 'on-pace':
      return {
        howTo: 'Flag anything past 2 minutes and move on. The pace checks keep you honest.',
        unlock: 'On pace at every check. You know the rhythm now.',
        effort: 'Needs one timed mock. A mini mock counts.',
        skill: 'Kept exam pace in a practice mock',
        minDays: 0,
      };
    case 'rooted': {
      const n = Number(key.split(':')[1]) || ROOTED_DAYS[0];
      return {
        howTo: 'Little and often. Missed days never count against you.',
        unlock: ROOTED_UNLOCK[n] ?? `${n} study days. Spaced study is what makes it last.`,
        effort: `Needs ${n} study days. They don’t need to be in a row.`,
        skill: `${TIER_WORD[n] ?? n} days of steady study`,
        minDays: n,
      };
    }
    case 'fresh-start':
      return {
        howTo: '',
        unlock: 'Welcome back. Picking up again is the skill.',
        // Never shareable (and never a goal): a moment, not an achievement.
        effort: 'A moment, never a goal.',
        skill: '',
        minDays: FRESH_GAP_DAYS + 1,
      };
    case 'snare-wise':
      return {
        howTo: `Play ${g('trap')}: find the tempting wrong answer before you pick.`,
        unlock: 'You spot the snare 8 times in 10. That’s the trap the exam sets.',
        effort: `Needs 10 ${g('trap')} questions in a row of play.`,
        skill: 'Spots the exam’s snares',
        minDays: 0,
      };
    case 'even-keel':
      return {
        howTo: `Play ${g('sprint')}: say “sure” only when you are.`,
        unlock: 'Well calibrated, three rounds in a row. Your “sure” means sure.',
        effort: `Needs 3 ${g('sprint')} rounds.`,
        skill: 'Steady, honest confidence',
        minDays: 0,
      };
    case 'signpost-reader':
      return {
        howTo: `Play ${g('priority')}: find the word that decides the question first.`,
        unlock: 'You read the deciding word right 8 times in 10. FIRST and BEST change the answer.',
        effort: `Needs 10 different FIRST questions in ${g('priority')}.`,
        skill: 'Reads the deciding word',
        minDays: 0,
      };
    case 'myth-clearer':
      return {
        howTo: `Play ${g('rumor')}: sort the true notes from the half-truths.`,
        unlock: 'Twenty of your last 25 rumors cleared. Half-truths don’t fool you.',
        effort: `Needs 25 different rumors in ${g('rumor')}.`,
        skill: 'Clears common myths',
        minDays: 0,
      };
    case 'sure-footed-pace':
      return {
        howTo: `Play ${g('daylight')} at Sapling or faster, and keep most answers right.`,
        unlock: 'Three rounds at pace, inside the light. Speed without guessing.',
        effort: `Needs 3 ${g('daylight')} rounds.`,
        skill: 'Answers at exam pace',
        minDays: 0,
      };
    case 'whole-grove':
      return {
        howTo: 'Try each game once. Each trains a different exam skill.',
        unlock: 'You’ve played every game. Each one trains a different exam skill.',
        effort: 'Needs one round of each game.',
        skill: 'Played every game',
        minDays: 0,
      };
    case 'back-on-path':
      return {
        howTo: 'Answer your game misses again on a later day, in review or a later round.',
        unlock: 'Ten game misses fixed on a later day. Play turned into learning.',
        effort: 'Needs 2 days or more: a fix counts on a later day than the miss.',
        skill: 'Turns misses into knowledge',
        minDays: 2,
      };
  }
}

/** The gate's line (no progress bar while gated: "Opens when…", never an empty bar). */
export const GATE_LINE: Record<Gate, string> = {
  mindsetData: `Opens after ${GROWTH_WINDOW * 2} first tries spread over ${GROWTH_MIN_DAYS / 7} weeks or more.`,
  wholeMap: `Opens when every domain reaches ${Math.round(MOCK_DOMAIN_FLOOR * 100)}%.`,
};

/** Mock badges are earnable any time, but suggested only once every domain is at the floor. */
export const MOCK_SUGGEST_LINE = `Best once every domain reaches ${Math.round(MOCK_DOMAIN_FLOOR * 100)}%.`;
const MOCK_BADGES = new Set<BadgeId>(['dress-rehearsal', 'on-pace']);

// ── Marks on the case ────────────────────────────────────────────────────
export type MarkStatus = 'earned' | 'started' | 'open' | 'gated';

/** One medallion on the case. */
export interface CaseMark {
  key: string;
  badge: BadgeId;
  set: SetId;
  /** "Firm Footing · IS Operations", "Rooted · 30 days", or the badge name. */
  name: string;
  /** The grid caption (≤ 2 lines): "IS Operations", "Rooted · 30 days", or the badge name. */
  caption: string;
  /**
   * A tiered badge's step (Rooted, Long Memory, Dress Rehearsal, Firm Footing):
   * 1, 2 or 3, with its metal; always printed and spoken with its number.
   */
  tier?: number;
  /** How many tiers its ladder has (3; Firm Footing: 2). */
  tiers?: number;
  /** The tier in words: "30 days", "75 recalls", "2 mocks", "80%". */
  tierLabel?: string;
  /** The marks of one ladder share this ("rooted", "firm-footing:4"); the sheet shows them together. */
  ladder?: string;
  /** A Stretch tier: beyond what the exam needs. Never in its set's core count, never suggested while the core is open. */
  stretch?: boolean;
  status: MarkStatus;
  earnedAt?: number;
  /** 0..1, how close (1 once earned). */
  progress: number;
  /** The progress line ("14 of 20 answered"). */
  detail: string;
  rule: string;
  /** "Opens when…" (gated marks only). */
  gateLine?: string;
  howTo: string;
  unlock: string;
  effort: string;
  skill: string;
  minDays: number;
  /** Firm Footing's domain (its weight, tone dot and emblem). */
  domain?: CaseDomain;
  /** Counted in its set's "n of m" (false: an earned mark the catalogue no longer lists). */
  counted: boolean;
  /** Catalogue order (the tie-break everywhere). */
  order: number;
}

export interface SetView {
  info: SetInfo;
  marks: CaseMark[];
  /** Core marks earned / core marks (Stretch tiers are counted on their own). */
  earned: number;
  total: number;
  /** When the last core mark was earned, once every one is. */
  completeAt?: number;
  /** The set's Stretch row: earned / total (0 / 0 when it has none). */
  stretch: { earned: number; total: number };
}

export interface CaseInput {
  marks: readonly MarkState[];
  earned: Record<string, number> | undefined;
  domains: readonly CaseDomain[];
  exam: ExamFacts;
  /** Mindset Shift has enough answers to be judged (100 first tries, 2+ weeks apart). */
  mindsetData: boolean;
}

/** Firm Footing's leaves, heaviest domain first (ties: the domain order). */
function domainRank(domains: readonly CaseDomain[]): Map<string, number> {
  const sorted = domains.map((d, i) => ({ d, i })).sort((a, b) => b.d.weight - a.d.weight || a.i - b.i);
  return new Map(sorted.map((x, k) => [x.d.id, k]));
}

/** A tiered key's step: which ladder, which tier of how many, its words, and whether it is a Stretch tier. */
interface TierInfo {
  tier: number;
  tiers: number;
  tierLabel: string;
  ladder: string;
  stretch: boolean;
}

/** The tier a key names (none for a badge with one mark, or a key no version defines). */
export function tierOf(key: string): TierInfo | undefined {
  const [badge, part, extra] = key.split(':');
  const n = Number(part);
  const isNum = part !== undefined && String(n) === part;
  switch (badge) {
    case 'rooted': {
      const i = (ROOTED_DAYS as readonly number[]).indexOf(n);
      return isNum && extra === undefined && i >= 0 ? { tier: i + 1, tiers: ROOTED_DAYS.length, tierLabel: `${n} days`, ladder: 'rooted', stretch: false } : undefined;
    }
    case 'long-memory': {
      // "long-memory" is 25; only 75 and 150 take a part ("long-memory:25" is no key, as markSupported says).
      const count = part === undefined ? LONG_LADDER[0] : isNum && extra === undefined && n !== LONG_LADDER[0] ? n : NaN;
      const i = (LONG_LADDER as readonly number[]).indexOf(count);
      return i >= 0 ? { tier: i + 1, tiers: LONG_LADDER.length, tierLabel: `${count} recalls`, ladder: 'long-memory', stretch: i === LONG_LADDER.length - 1 } : undefined;
    }
    case 'dress-rehearsal': {
      const count = part === undefined ? 1 : isNum && extra === undefined && (DRESS_TIERS as readonly number[]).includes(n) ? n : NaN;
      if (!(count >= 1)) return undefined;
      return { tier: count, tiers: 1 + DRESS_TIERS.length, tierLabel: count === 1 ? '1 mock' : `${count} mocks`, ladder: 'dress-rehearsal', stretch: count === DRESS_TIERS[DRESS_TIERS.length - 1] };
    }
    case 'firm-footing': {
      if (!part || (extra !== undefined && extra !== '80')) return undefined;
      const deep = extra === '80';
      return { tier: deep ? 2 : 1, tiers: 2, tierLabel: deep ? `${Math.round(FIRM_DEEP * 100)}%` : `${Math.round(FIRM_MASTERY * 100)}%`, ladder: `firm-footing:${part}`, stretch: deep };
    }
    default:
      return undefined;
  }
}

/**
 * Does the case show this earned key? Exactly the keys some catalogue mark
 * has: plain badges, a Firm Footing leaf (70%) and its 80% Stretch tier, a
 * Rooted tier, Long Memory's 75 and 150, Dress Rehearsal's 2 and 3, Took
 * Root, plus an earned plain or Firm Footing key the list no longer has (a
 * dropped domain). Anything else (a key from a newer version, a malformed
 * one) is kept, but never shown, counted on You, or lights the "new" dot.
 * It accepts the same key shapes as engine/milestones.ts markSupported.
 */
export function caseKey(key: string): boolean {
  const parts = key.split(':');
  const def = badgeDef(markBadge(key));
  if (!def || parts.some((p) => p === '')) return false;
  // Rooted and Firm Footing have no plain key: every Rooted mark is a tier, every Firm Footing mark a domain's leaf.
  if (parts.length === 1) return def.id !== 'rooted' && def.id !== 'firm-footing';
  if (parts.length > 3) return false;
  return tierOf(key) !== undefined;
}

/** Every medallion on the case, in shelf order, with its state, copy and effort. */
export function caseMarks(input: CaseInput): CaseMark[] {
  const { marks, earned = {}, domains, exam } = input;
  const rank = domainRank(domains);
  const byId = new Map(domains.map((d) => [d.id, d]));
  const wholeMap = earned['whole-map'] !== undefined;
  const out: CaseMark[] = [];
  /** The shared parts of a mark, earned or not. */
  const base = (key: string, badge: BadgeId, name: string, rule: string, at: number | undefined) => {
    const def = badgeDef(badge)!;
    const domainId = badge === 'firm-footing' ? key.split(':')[1] : undefined;
    const domain = domainId ? byId.get(domainId) : undefined;
    const copy = copyFor(key, badge, exam, domain);
    const t = tierOf(key);
    // Firm Footing's leaves sort by domain weight, its Stretch row after them; ladders by tier.
    const within = domainId !== undefined ? (t?.stretch ? 50 : 0) + (rank.get(domainId) ?? 40) : (t?.tier ?? 0);
    return {
      copy,
      domain,
      fields: {
        key,
        badge,
        set: BADGE_SET[badge],
        name,
        caption: domain ? domain.short : t ? `${def.name} · ${t.tierLabel}` : def.name,
        ...(t ? { tier: t.tier, tiers: t.tiers, tierLabel: t.tierLabel, ladder: t.ladder } : {}),
        ...(t?.stretch ? { stretch: true } : {}),
        rule,
        howTo: copy.howTo,
        unlock: copy.unlock,
        effort: copy.effort,
        skill: copy.skill,
        minDays: copy.minDays,
        ...(domain ? { domain } : {}),
        order: BADGE_ORDER.indexOf(badge) * 100 + within,
        ...(at !== undefined ? { earnedAt: at } : {}),
      },
    };
  };
  for (const m of marks) {
    if (!badgeDef(m.badge)) continue;
    const at = earned[m.key];
    const { copy, domain, fields } = base(m.key, m.badge, m.label, m.rule ?? badgeDef(m.badge)!.rule, at);
    const gate = at !== undefined ? undefined : copy.gate === 'mindsetData' && !input.mindsetData ? 'mindsetData' : copy.gate === 'wholeMap' && !wholeMap ? 'wholeMap' : undefined;
    const status: MarkStatus = at !== undefined ? 'earned' : gate ? 'gated' : m.progress > 0 ? 'started' : 'open';
    out.push({
      ...fields,
      status,
      progress: at !== undefined ? 1 : gate ? 0 : m.progress,
      detail: at !== undefined ? '' : gate ? GATE_LINE[gate] : markDetail(m, domain),
      ...(gate ? { gateLine: GATE_LINE[gate] } : {}),
      counted: true,
    });
  }
  // An earned mark the list no longer has (a domain the exam dropped) still
  // shows, earned, in its badge's set: once earned, a badge stays. Keys this
  // version doesn't define are left for the version that does.
  for (const [key, at] of Object.entries(earned)) {
    if (out.some((m) => m.key === key)) continue;
    const def = badgeDef(markBadge(key));
    if (!def || !caseKey(key)) continue;
    const { fields } = base(key, def.id, def.name, def.rule, at);
    out.push({ ...fields, caption: def.name, status: 'earned', progress: 1, detail: '', counted: false, order: BADGE_ORDER.indexOf(def.id) * 100 + 99 });
  }
  return out.sort((a, b) => a.order - b.order);
}

/** The case's progress line for a mark (Firm Footing: its weight and gap; the rest as the rule engine says). */
function markDetail(m: MarkState, domain?: CaseDomain): string {
  if (m.badge === 'firm-footing' && domain) {
    // "62% → 70% · 14 of 20 answered": the gap first (it is what Smart closes).
    // Already at 70% but short of answers: the answers are what's left.
    const [mastery, answered] = m.detail.split(' · ');
    const pctNow = Number(mastery.replace('% mastery', ''));
    // Each tier against its own target: 70%, or 80% for the Stretch tier.
    const target = Math.round((m.key.endsWith(':80') ? FIRM_DEEP : FIRM_MASTERY) * 100);
    return pctNow >= target ? `${answered} · at ${target}%+` : `${mastery.replace(' mastery', '')} → ${target}% · ${answered}`;
  }
  return m.detail;
}

/** The case's shelves, in journey order, with each set's own count. No grand total. */
export function caseSets(marks: readonly CaseMark[], exam: ExamFacts, domainCount: number): SetView[] {
  return SET_ORDER.map((id) => {
    const info = setInfo(id, exam, domainCount);
    const mine = marks.filter((m) => m.set === id);
    const core = mine.filter((m) => m.counted && !m.stretch);
    const stretch = mine.filter((m) => m.counted && m.stretch);
    const earned = core.filter((m) => m.status === 'earned');
    const complete = core.length > 0 && earned.length === core.length;
    return {
      info,
      marks: mine,
      earned: earned.length,
      total: core.length,
      ...(complete ? { completeAt: Math.max(...earned.map((m) => m.earnedAt!)) } : {}),
      stretch: { earned: stretch.filter((m) => m.status === 'earned').length, total: stretch.length },
    };
  });
}

/** "2 of 3", "3 of 3 · Complete" (Moments: nothing). Never a grand total. */
export function setCountLine(s: SetView): string | undefined {
  if (!s.info.counter || s.total === 0) return undefined;
  return s.completeAt !== undefined ? `${s.earned} of ${s.total} · Complete` : `${s.earned} of ${s.total}`;
}

/** A set's Stretch row caption: "Stretch · beyond exam need · 1 of 5" (none when it has no Stretch tiers). */
export function stretchLine(s: SetView): string | undefined {
  if (!s.info.counter || s.stretch.total === 0) return undefined;
  return `Stretch · beyond exam need · ${s.stretch.earned} of ${s.stretch.total}`;
}

/**
 * A set that was complete (it gave its planter) and has since gained badges
 * (a newer version added a tier or Took Root): "New in Evergreen: 2 more to
 * earn". The planter it gave stays. None otherwise.
 */
export function grownLine(s: SetView, planters: Record<string, number> | undefined): string | undefined {
  if (!s.info.counted || planters?.[s.info.id] === undefined || s.completeAt !== undefined) return undefined;
  const more = s.total - s.earned;
  return more > 0 ? `New in ${s.info.name}: ${more} more to earn` : undefined;
}

/**
 * The ONE mark that completed a set: the last earned. Two marks earned in the
 * same session share that time, so the later one in catalogue order takes it
 * ("That completes Groundwork" is said once, never on two badges).
 */
export function completingMark(s: SetView): string | undefined {
  if (!s.info.counted || s.completeAt === undefined) return undefined;
  const last = s.marks.filter((m) => m.counted && !m.stretch && m.status === 'earned' && m.earnedAt === s.completeAt);
  return last.sort((a, b) => b.order - a.order)[0]?.key;
}

/** The counted sets whose every mark is earned (each unlocks its planter, Phase 4). */
export function completeSets(sets: readonly SetView[]): SetId[] {
  return sets.filter((s) => s.info.counted && s.completeAt !== undefined).map((s) => s.info.id);
}

/**
 * The set reward for completing a counted set (badges_game.md §7, owner
 * decision: yes). The plant shows it in Phase 4; until then it is only saved.
 */
export const SET_PLANTER: Partial<Record<SetId, string>> = {
  groundwork: 'Fieldstone planter',
  domains: 'Five-stone planter',
  evergreen: 'Celadon pot',
  judgement: 'Compass-rose planter',
  examDay: 'Banded planter',
  rooted: 'Root-woven basket',
};

// ── Sorting and filtering (the case's chips and Sort menu) ───────────────
export type CaseFilter = 'all' | 'earned' | 'open';
export type CaseSort = 'set' | 'recent' | 'closest' | 'effort';
export const CASE_SORTS: readonly CaseSort[] = ['set', 'recent', 'closest', 'effort'];

/**
 * Is this mark on the case at all? A Moments mark only once it happened:
 * an unearned Fresh Start would read as a goal (a week away), so the Moments
 * shelf appears with its first moment, and never in Closest, Effort or Not yet.
 */
export function onCase(m: CaseMark): boolean {
  return m.set !== 'moments' || m.status === 'earned';
}

export function passesFilter(m: CaseMark, f: CaseFilter): boolean {
  return f === 'all' || (f === 'earned' ? m.status === 'earned' : m.status !== 'earned');
}

/**
 * A flat order for the non-set sorts (each a total order, so any filter works):
 * - recent: earned newest first, then the rest in shelf order;
 * - closest: open marks by progress (gated last), then the earned ones;
 * - effort: least to most minimum days, then shelf order.
 * Closest and Effort rank the exam's own (counted) core badges first, then
 * its Stretch tiers, then Field notes and Moments: a game skill or a Stretch
 * tier never outranks what the exam needs (behaviour review §2a, §2b).
 */
export function sortMarks(marks: readonly CaseMark[], sort: Exclude<CaseSort, 'set'>): CaseMark[] {
  const list = marks.filter(onCase);
  const earned = (m: CaseMark) => m.status === 'earned';
  if (sort === 'recent') {
    return list.sort((a, b) => Number(earned(b)) - Number(earned(a)) || (b.earnedAt ?? 0) - (a.earnedAt ?? 0) || a.order - b.order);
  }
  // The exam's core badges first, then its Stretch tiers, then Field notes and Moments.
  const game = (m: CaseMark) => (COUNTED_SETS.includes(m.set) ? (m.stretch ? 1 : 0) : 2);
  if (sort === 'closest') {
    const rank = (m: CaseMark) => (earned(m) ? 2 : m.status === 'gated' ? 1 : 0);
    return list.sort(
      (a, b) =>
        game(a) - game(b) || rank(a) - rank(b) || (rank(a) === 0 ? b.progress - a.progress : 0) || (b.earnedAt ?? 0) - (a.earnedAt ?? 0) || a.order - b.order,
    );
  }
  return list.sort((a, b) => game(a) - game(b) || a.minDays - b.minDays || a.order - b.order);
}

// ── Next for your exam (badges_game.md §4.3) ─────────────────────────────
export interface NextInput {
  marks: readonly CaseMark[];
  stage: Stage;
  /** Days to the exam (null: no date). */
  daysLeft: number | null;
  /** Each domain's mastery now (0..1), for slot 1's weight × gap. */
  mastery: Record<string, number>;
}

/** The final three weeks: mocks are suggested whatever the stage. */
export const FINAL_WEEKS_DAYS = 21;

export interface NextForExam {
  /** Slot 1, "Best for your exam" (none when nothing eligible fits a rule). */
  best?: CaseMark;
  /** Slots 2 and 3: the nearest eligible marks, one per badge, not slot 1's badge. */
  nearest: CaseMark[];
}

/** Could this mark be suggested now? Never Moments or Field notes, a gated mark, or a mock badge before its time. */
export function suggestable(m: CaseMark, stage: Stage, daysLeft: number | null, wholeMap = false): boolean {
  if (m.status === 'earned' || m.status === 'gated' || !m.counted) return false;
  if (!COUNTED_SETS.includes(m.set)) return false;
  if (MOCK_BADGES.has(m.badge) && !mockTime(stage, daysLeft, wholeMap)) return false;
  return true;
}

/**
 * Mock badges are suggested from the mock stage on, in the final three weeks,
 * or once Whole Map is earned (every domain at the floor: the mock gate itself,
 * so a learner past it keeps the mock badges even if the stage reads
 * "practice" again after a couple of mocks).
 */
export function mockTime(stage: Stage, daysLeft: number | null, wholeMap = false): boolean {
  const late = daysLeft !== null && daysLeft >= 0 && daysLeft <= FINAL_WEEKS_DAYS;
  return wholeMap || late || stage === 'mock' || stage === 'ready' || stage === 'examDay';
}

/** Whole Map is earned: every domain reached the mock floor. */
export const hasWholeMap = (marks: readonly CaseMark[]) => marks.some((m) => m.badge === 'whole-map' && m.status === 'earned');

/**
 * Slot 1 by stage (each rule falls through to the next one down when it has
 * nothing eligible), then the two nearest. After the exam: nothing at all.
 */
export function nextForExam({ marks, stage, daysLeft, mastery }: NextInput): NextForExam {
  if (stage === 'afterExam') return { nearest: [] };
  const wholeMap = hasWholeMap(marks);
  // A Stretch tier waits while any core badge of its set is open: depth never
  // jumps the queue ahead of what the exam needs (behaviour review §2b).
  const coreOpen = new Set(marks.filter((m) => m.counted && !m.stretch && m.status !== 'earned').map((m) => m.set));
  const ok = marks.filter((m) => suggestable(m, stage, daysLeft, wholeMap) && !(m.stretch && coreOpen.has(m.set)));
  // Slot 1 is "Best for your exam": never a Stretch tier (beyond exam need).
  // Those can still be among the nearest, once their set's core is done.
  const core = ok.filter((m) => !m.stretch);
  const find = (badge: BadgeId) => core.find((m) => m.badge === badge);
  const findKey = (key: string) => core.find((m) => m.key === key);
  const firmFooting = () => {
    // The 70% leaves only: an 80% Stretch leaf is never "best for your exam".
    const leaves = ok.filter((m) => m.badge === 'firm-footing' && m.domain && !m.stretch);
    // Largest blueprint weight × gap to 70%; ties go to the heavier domain (then the catalogue order).
    const score = (m: CaseMark) => (m.domain!.weight / 100) * Math.max(0, FIRM_MASTERY - (mastery[m.domain!.id] ?? 0));
    return [...leaves].sort((a, b) => score(b) - score(a) || b.domain!.weight - a.domain!.weight || a.order - b.order)[0];
  };
  const rules: (() => CaseMark | undefined)[] = [
    () => find('first-foothold'),
    firmFooting,
    // Exam Day: the first full mock, then pace, then the second spaced mock.
    () => findKey('dress-rehearsal') ?? find('on-pace') ?? findKey('dress-rehearsal:2'),
    // The next Long Memory tier (Stretch only once Evergreen's core is done), then Graduate.
    () => find('long-memory') ?? find('graduate'),
  ];
  // The mock rule leads at the mock stage and in the final three weeks; once
  // past it ('ready'), long-term memory does (the mocks stay eligible). The
  // diagnostic always comes first while it is undone: it is one short sitting,
  // and every plan (a mock's included) starts from it.
  const late = daysLeft !== null && daysLeft >= 0 && daysLeft <= FINAL_WEEKS_DAYS;
  const first = stage === 'diagnose' ? 0 : stage === 'mock' || stage === 'examDay' || late ? 2 : stage === 'learn' || stage === 'practice' ? 1 : 3;
  let best: CaseMark | undefined;
  for (let i = first; i < rules.length && !best; i++) best = rules[i]();
  // Slots 2–3: the nearest by progress, one per badge, never slot 1's badge.
  const used = new Set<BadgeId>(best ? [best.badge] : []);
  const nearest: CaseMark[] = [];
  // The core before any Stretch tier, then the nearest by progress.
  for (const m of [...ok].sort((a, b) => Number(Boolean(a.stretch)) - Number(Boolean(b.stretch)) || b.progress - a.progress || a.order - b.order)) {
    if (nearest.length >= 2) break;
    if (used.has(m.badge)) continue;
    used.add(m.badge);
    nearest.push(m);
  }
  return { ...(best ? { best } : {}), nearest };
}

/** Before its time, a mock badge says when it is best (not suggested yet). */
export function suggestLine(m: CaseMark, stage: Stage, daysLeft: number | null, wholeMap = false): string | undefined {
  return m.status !== 'earned' && MOCK_BADGES.has(m.badge) && !mockTime(stage, daysLeft, wholeMap) ? MOCK_SUGGEST_LINE : undefined;
}

/** The one Results line under a moment: "Next: Firm Footing · IS Operations, 62% → 70% · 14 of 20 answered". */
export function nextLine(m: CaseMark): string {
  return m.detail ? `Next: ${m.name}, ${m.detail}` : `Next: ${m.name}`;
}

// ── Study for this (badges_game.md §4.4) ─────────────────────────────────
export type StudyTarget =
  | { kind: 'diagnostic' }
  | { kind: 'guided' }
  | { kind: 'smart'; domainId?: string }
  | { kind: 'review' }
  | { kind: 'mistakes' }
  | { kind: 'mock' }
  | { kind: 'today' }
  | { kind: 'game'; game: GameId }
  | { kind: 'play' };

const SKILL_GAME: Partial<Record<BadgeId, GameId>> = {
  'snare-wise': 'trap',
  'even-keel': 'sprint',
  'signpost-reader': 'priority',
  'myth-clearer': 'rumor',
  'sure-footed-pace': 'daylight',
};

/**
 * Where "Study for this" goes. `weakest`: the domain with the lowest mastery
 * (Whole Map). Earned, gated and Moments marks have none.
 */
export function studyTarget(m: CaseMark, weakest?: string): StudyTarget | null {
  if (m.status === 'earned' || m.status === 'gated') return null;
  switch (m.badge) {
    case 'first-foothold':
      return { kind: 'diagnostic' };
    case 'topic-clear':
    case 'ten-topics':
      return { kind: 'guided' };
    case 'firm-footing':
      return { kind: 'smart', ...(m.domain ? { domainId: m.domain.id } : {}) };
    case 'whole-map':
      return { kind: 'smart', ...(weakest ? { domainId: weakest } : {}) };
    case 'long-memory':
    case 'graduate':
    case 'back-on-path':
      return { kind: 'review' };
    case 'took-root':
      // A topic clear today; review brings it back on another day.
      return { kind: 'guided' };
    case 'loop-closed':
    case 'slip-spotter':
      return { kind: 'mistakes' };
    case 'know-what-you-know':
    case 'mindset-shift':
      return { kind: 'smart' };
    case 'dress-rehearsal':
    case 'on-pace':
      return { kind: 'mock' };
    case 'rooted':
      return { kind: 'today' };
    case 'whole-grove':
      return { kind: 'play' };
    case 'fresh-start':
      return null;
    default: {
      const game = SKILL_GAME[m.badge];
      return game ? { kind: 'game', game } : null;
    }
  }
}

/** The quiet line some targets carry, so the button never surprises. */
export function studyNote(m: CaseMark, target: StudyTarget, dueCount: number): string | undefined {
  if (target.kind === 'review' && dueCount === 0) return 'Nothing due today. Smart mixes in older questions.';
  if (m.badge === 'know-what-you-know') return 'Mark “sure” only when you’d bet on it.';
  return undefined;
}

// ── Words a screen reader hears ──────────────────────────────────────────
/**
 * A progress line as it is spoken: "62% → 70% · 14 of 20 answered" becomes
 * "62% now, aiming for 70%, 14 of 20 answered" (a screen reader says "→" as
 * "right arrow", and "of" would change the meaning).
 */
export function spokenDetail(detail: string): string {
  return detail.replace(/\s*→\s*/g, ' now, aiming for ').replace(/ · /g, ', ');
}

/**
 * One medallion's spoken label: name, state, rule, progress (or the date),
 * gate, set. `date` is the earned date already formatted ("11 Oct").
 */
export function markSpoken(m: CaseMark, setName: string, date?: string): string {
  const parts = [m.name];
  if (m.stretch) parts.push('Stretch, beyond exam need');
  if (m.status === 'earned') parts.push(date ? `Earned ${date}` : 'Earned');
  else parts.push('Not yet');
  parts.push(m.rule.replace(/\.$/, ''));
  if (m.status === 'gated') parts.push(m.gateLine!.replace(/\.$/, ''));
  else if (m.status !== 'earned' && m.detail) parts.push(spokenDetail(m.detail));
  parts.push(setName);
  return `${parts.join('. ')}.`;
}

/** A shelf header, spoken with its count: "Groundwork, 3 of 3, complete". */
export function setSpoken(s: SetView): string {
  const line = setCountLine(s);
  return line ? `${s.info.name}, ${line.replace(' · Complete', ', complete')}` : s.info.name;
}

/**
 * The new dot: any badge the case shows, earned since the case was last
 * viewed. Badges a back-fill saved quietly (stamped with its time,
 * `quietAt`) were already held, so they are never new, even when the
 * back-fill ran after the case was last viewed (a restore of an older backup).
 */
export function hasNewSince(earned: Record<string, number> | undefined, seenAt: number | undefined, quiet: readonly number[] = []): boolean {
  if (seenAt === undefined) return false;
  return Object.entries(earned ?? {}).some(([key, at]) => at > seenAt && !quiet.includes(at) && caseKey(key));
}

/**
 * The times badges were saved QUIETLY for a cert: the first back-fill and
 * the catalogue fill. A badge stamped with one of them was already held
 * then ("By 11 Oct"), so it is never "new" and never dated as if earned that day.
 */
export function quietTimes(m: { backfill?: { at: number }; catalogFill?: { at: number } } | undefined): number[] {
  return [m?.backfill?.at, m?.catalogFill?.at].filter((x): x is number => typeof x === 'number');
}

/** How many badges the case shows as earned (You's count): a key it doesn't show is never counted. */
export function caseEarnedCount(earned: Record<string, number> | undefined): number {
  return Object.keys(earned ?? {}).filter(caseKey).length;
}
