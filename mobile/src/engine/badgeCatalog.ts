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
  FIRM_ANSWERS,
  FIRM_MASTERY,
  FRESH_GAP_DAYS,
  GRADUATES,
  LONG_GAP_DAYS,
  LONG_RECALLS,
  LOOP_FIXES,
  markBadge,
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
/** What a badge needs that isn't the rule itself. */
export type Gate = 'mindsetData';

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
        effort: 'About 25 minutes: the diagnostic.',
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
        unlock: `Every domain is at ${Math.round(MOCK_DOMAIN_FLOOR * 100)}%. You’re ready to rehearse with mocks.`,
        effort: `Needs every domain at ${Math.round(MOCK_DOMAIN_FLOOR * 100)}% at the same time.`,
        skill: 'Covered every exam domain',
        minDays: 0,
      };
    case 'long-memory':
      return {
        howTo: 'Spaced review brings questions back after a gap. Answer them cold, without Coach me.',
        unlock: `You recalled ${LONG_RECALLS} questions a week or more after you last saw them. That’s what holds on exam day.`,
        effort: `Needs at least ${LONG_GAP_DAYS + 1} days: a recall counts a week after you last saw the question.`,
        skill: 'Remembers answers weeks later',
        minDays: LONG_GAP_DAYS + 1,
      };
    case 'graduate':
      return {
        howTo: 'Keep up with review. Each right answer moves a question a box further on.',
        unlock: `${GRADUATES === 50 ? 'Fifty' : GRADUATES} questions graduated: you’ve shown them again and again, weeks apart.`,
        effort: 'Needs several weeks: a question graduates from the last review box.',
        skill: `Graduated ${GRADUATES} questions from review`,
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
    case 'know-what-you-know':
      return {
        howTo: 'Mark “sure” only when you’d bet on it. Honest confidence is the skill.',
        unlock: 'When you say sure, you’re right. That’s calibration, and it saves time on the exam.',
        effort: `Needs ${SURE_MIN} or more “sure” answers.`,
        skill: 'Knows when I’m sure',
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
    case 'dress-rehearsal':
      return {
        howTo: `Block out ${hours}, or pause and finish later. Answer every question; guessing is free.`,
        unlock: 'A full sitting, every question answered. Exam day will feel familiar.',
        effort: `Needs a full mock: ${exam.questions} questions, ${hours}, which you can pause.`,
        skill: 'Sat a full timed practice exam',
        minDays: 0,
      };
    case 'on-pace':
      return {
        howTo: 'Flag anything past 2 minutes and move on. The pace checks keep you honest.',
        unlock: 'On pace at every check. Time won’t be the problem.',
        effort: 'Needs one timed mock. A mini mock counts.',
        skill: 'Kept exam pace',
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
  /** The grid caption (≤ 2 lines): "IS Operations", "30 days", or the badge name. */
  caption: string;
  /** Rooted's tier (1, 2, 3): labelled by number, never a metal. */
  tier?: number;
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
  /** Firm Footing's domain (its weight and tone dot). */
  domain?: CaseDomain;
  /** Counted in its set's "n of m" (false: an earned mark the catalogue no longer lists). */
  counted: boolean;
  /** Catalogue order (the tie-break everywhere). */
  order: number;
}

export interface SetView {
  info: SetInfo;
  marks: CaseMark[];
  /** Counted marks earned / counted marks. */
  earned: number;
  total: number;
  /** When the last counted mark was earned, once every one is. */
  completeAt?: number;
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

/** Every medallion on the case, in shelf order, with its state, copy and effort. */
export function caseMarks(input: CaseInput): CaseMark[] {
  const { marks, earned = {}, domains, exam } = input;
  const rank = domainRank(domains);
  const byId = new Map(domains.map((d) => [d.id, d]));
  const out: CaseMark[] = [];
  for (const m of marks) {
    const badge = m.badge;
    const def = badgeDef(badge);
    if (!def) continue;
    const domainId = badge === 'firm-footing' ? m.key.split(':')[1] : undefined;
    const domain = domainId ? byId.get(domainId) : undefined;
    const copy = copyFor(m.key, badge, exam, domain);
    const at = earned[m.key];
    const gated = copy.gate === 'mindsetData' && !input.mindsetData && at === undefined;
    const tierN = badge === 'rooted' ? Number(m.key.split(':')[1]) : undefined;
    const tier = tierN !== undefined ? (ROOTED_DAYS as readonly number[]).indexOf(tierN) + 1 || undefined : undefined;
    const status: MarkStatus = at !== undefined ? 'earned' : gated ? 'gated' : m.progress > 0 ? 'started' : 'open';
    out.push({
      key: m.key,
      badge,
      set: BADGE_SET[badge],
      name: m.label,
      caption: domain ? domain.short : tierN !== undefined ? `${def.name} · ${tierN} days` : def.name,
      ...(tier ? { tier } : {}),
      status,
      ...(at !== undefined ? { earnedAt: at } : {}),
      progress: at !== undefined ? 1 : gated ? 0 : m.progress,
      detail: at !== undefined ? '' : gated ? GATE_LINE.mindsetData : markDetail(m, domain),
      rule: def.rule,
      ...(gated ? { gateLine: GATE_LINE.mindsetData } : {}),
      howTo: copy.howTo,
      unlock: copy.unlock,
      effort: copy.effort,
      skill: copy.skill,
      minDays: copy.minDays,
      ...(domain ? { domain } : {}),
      counted: true,
      order: BADGE_ORDER.indexOf(badge) * 100 + (domainId !== undefined ? (rank.get(domainId) ?? 50) : (tier ?? 0)),
    });
  }
  // An earned mark the list no longer has (a domain the exam dropped) still
  // shows, earned, in its badge's set: once earned, a badge stays. Tier keys
  // this version doesn't define yet are left for the version that does.
  for (const [key, at] of Object.entries(earned)) {
    if (out.some((m) => m.key === key)) continue;
    const parts = key.split(':');
    const def = badgeDef(markBadge(key));
    if (!def || !(parts.length === 1 || (def.id === 'firm-footing' && parts.length === 2))) continue;
    const copy = copyFor(key, def.id, exam);
    out.push({
      key,
      badge: def.id,
      set: BADGE_SET[def.id],
      name: def.name,
      caption: def.name,
      status: 'earned',
      earnedAt: at,
      progress: 1,
      detail: '',
      rule: def.rule,
      howTo: copy.howTo,
      unlock: copy.unlock,
      effort: copy.effort,
      skill: copy.skill,
      minDays: copy.minDays,
      counted: false,
      order: BADGE_ORDER.indexOf(def.id) * 100 + 99,
    });
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
    const target = Math.round(FIRM_MASTERY * 100);
    return pctNow >= target ? `${answered} · at ${target}%+` : `${mastery.replace(' mastery', '')} → ${target}% · ${answered}`;
  }
  return m.detail;
}

/** The case's shelves, in journey order, with each set's own count. No grand total. */
export function caseSets(marks: readonly CaseMark[], exam: ExamFacts, domainCount: number): SetView[] {
  return SET_ORDER.map((id) => {
    const info = setInfo(id, exam, domainCount);
    const mine = marks.filter((m) => m.set === id);
    const counted = mine.filter((m) => m.counted);
    const earned = counted.filter((m) => m.status === 'earned');
    const complete = counted.length > 0 && earned.length === counted.length;
    return {
      info,
      marks: mine,
      earned: earned.length,
      total: counted.length,
      ...(complete ? { completeAt: Math.max(...earned.map((m) => m.earnedAt!)) } : {}),
    };
  });
}

/** "2 of 3", "3 of 3 · Complete" (Moments: nothing). Never a grand total. */
export function setCountLine(s: SetView): string | undefined {
  if (!s.info.counter || s.total === 0) return undefined;
  return s.completeAt !== undefined ? `${s.earned} of ${s.total} · Complete` : `${s.earned} of ${s.total}`;
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

export function passesFilter(m: CaseMark, f: CaseFilter): boolean {
  return f === 'all' || (f === 'earned' ? m.status === 'earned' : m.status !== 'earned');
}

/**
 * A flat order for the non-set sorts (each a total order, so any filter works):
 * - recent: earned newest first, then the rest in shelf order;
 * - closest: open marks by progress (gated last), then the earned ones;
 * - effort: least to most minimum days, then shelf order.
 */
export function sortMarks(marks: readonly CaseMark[], sort: Exclude<CaseSort, 'set'>): CaseMark[] {
  const list = [...marks];
  const earned = (m: CaseMark) => m.status === 'earned';
  if (sort === 'recent') {
    return list.sort((a, b) => Number(earned(b)) - Number(earned(a)) || (b.earnedAt ?? 0) - (a.earnedAt ?? 0) || a.order - b.order);
  }
  if (sort === 'closest') {
    const rank = (m: CaseMark) => (earned(m) ? 2 : m.status === 'gated' ? 1 : 0);
    return list.sort((a, b) => rank(a) - rank(b) || (rank(a) === 0 ? b.progress - a.progress : 0) || (b.earnedAt ?? 0) - (a.earnedAt ?? 0) || a.order - b.order);
  }
  return list.sort((a, b) => a.minDays - b.minDays || a.order - b.order);
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

/** Could this mark be suggested now? Never Moments or Field notes, a gated mark, or a mock badge before its stage. */
export function suggestable(m: CaseMark, stage: Stage, daysLeft: number | null): boolean {
  if (m.status === 'earned' || m.status === 'gated' || !m.counted) return false;
  if (!COUNTED_SETS.includes(m.set)) return false;
  if (MOCK_BADGES.has(m.badge) && !mockTime(stage, daysLeft)) return false;
  return true;
}

/** Mock badges are suggested from the mock stage on, or in the final three weeks. */
export function mockTime(stage: Stage, daysLeft: number | null): boolean {
  const late = daysLeft !== null && daysLeft >= 0 && daysLeft <= FINAL_WEEKS_DAYS;
  return late || stage === 'mock' || stage === 'ready' || stage === 'examDay';
}

/**
 * Slot 1 by stage (each rule falls through to the next one down when it has
 * nothing eligible), then the two nearest. After the exam: nothing at all.
 */
export function nextForExam({ marks, stage, daysLeft, mastery }: NextInput): NextForExam {
  if (stage === 'afterExam') return { nearest: [] };
  const ok = marks.filter((m) => suggestable(m, stage, daysLeft));
  const find = (badge: BadgeId) => ok.find((m) => m.badge === badge);
  const firmFooting = () => {
    const leaves = ok.filter((m) => m.badge === 'firm-footing' && m.domain);
    // Largest blueprint weight × gap to 70%; ties go to the heavier domain (then the catalogue order).
    const score = (m: CaseMark) => (m.domain!.weight / 100) * Math.max(0, FIRM_MASTERY - (mastery[m.domain!.id] ?? 0));
    return [...leaves].sort((a, b) => score(b) - score(a) || b.domain!.weight - a.domain!.weight || a.order - b.order)[0];
  };
  const rules: (() => CaseMark | undefined)[] = [
    () => find('first-foothold'),
    firmFooting,
    () => find('dress-rehearsal') ?? find('on-pace'),
    () => find('long-memory') ?? find('graduate'),
  ];
  // The mock rule leads at the mock stage and in the final three weeks; once
  // past it ('ready'), long-term memory does (the mocks stay eligible).
  const late = daysLeft !== null && daysLeft >= 0 && daysLeft <= FINAL_WEEKS_DAYS;
  const first = stage === 'mock' || stage === 'examDay' || late ? 2 : stage === 'diagnose' ? 0 : stage === 'learn' || stage === 'practice' ? 1 : 3;
  let best: CaseMark | undefined;
  for (let i = first; i < rules.length && !best; i++) best = rules[i]();
  // Slots 2–3: the nearest by progress, one per badge, never slot 1's badge.
  const used = new Set<BadgeId>(best ? [best.badge] : []);
  const nearest: CaseMark[] = [];
  for (const m of [...ok].sort((a, b) => b.progress - a.progress || a.order - b.order)) {
    if (nearest.length >= 2) break;
    if (used.has(m.badge)) continue;
    used.add(m.badge);
    nearest.push(m);
  }
  return { ...(best ? { best } : {}), nearest };
}

/** Before the mock stage, a mock badge says when it is best (not suggested yet). */
export function suggestLine(m: CaseMark, stage: Stage, daysLeft: number | null): string | undefined {
  return m.status !== 'earned' && MOCK_BADGES.has(m.badge) && !mockTime(stage, daysLeft) ? MOCK_SUGGEST_LINE : undefined;
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
 * One medallion's spoken label: name, state, rule, progress (or the date),
 * gate, set. `date` is the earned date already formatted ("11 Oct").
 */
export function markSpoken(m: CaseMark, setName: string, date?: string): string {
  const parts = [m.name];
  if (m.status === 'earned') parts.push(date ? `Earned ${date}` : 'Earned');
  else parts.push('Not yet');
  parts.push(m.rule.replace(/\.$/, ''));
  if (m.status === 'gated') parts.push(m.gateLine!.replace(/\.$/, ''));
  else if (m.status !== 'earned' && m.detail) parts.push(m.detail.replace(/→/g, 'of').replace(/ · /g, ', '));
  parts.push(setName);
  return `${parts.join('. ')}.`;
}

/** A shelf header, spoken with its count: "Groundwork, 3 of 3, complete". */
export function setSpoken(s: SetView): string {
  const line = setCountLine(s);
  return line ? `${s.info.name}, ${line.replace(' · Complete', ', complete')}` : s.info.name;
}

/** The new dot: any badge earned since the case was last viewed. */
export function hasNewSince(earned: Record<string, number> | undefined, seenAt: number | undefined): boolean {
  if (seenAt === undefined) return false;
  return Object.values(earned ?? {}).some((at) => at > seenAt);
}
