/**
 * Milestones — quiet badges that INFORM about mastery (behaviour review §4,
 * games review §5, Build F).
 *
 * Plain English for the founder:
 * - 15 milestone badges (You → Milestones) and 7 game skill badges
 *   (You → Field notes). Each has ONE plain rule, shown before it is earned.
 *   No mystery badges, no rarity, no leaderboards.
 * - Rules, from the behaviour review:
 *   1. Answers given after "Coach me" never count. Neither do game answers
 *      for the mastery badges (games never count toward mastery).
 *   2. No badge for raw question counts, minutes, taps or "% of the bank"
 *      (that would also leak the bank size). The diagnostic's 20 questions
 *      are the one fixed number, and it is the diagnostic itself.
 *   3. Once earned, never taken away. Live state (a domain dipping) shows
 *      elsewhere; the badge stays.
 * - Some badges have leaves or tiers: Firm Footing has one leaf per domain
 *   ("firm-footing:4"), Rooted has 10, 30 and 60 study days ("rooted:30").
 *   Each leaf or tier is a "mark"; a badge is earned once any mark is.
 * - This file only decides. The numbers it needs (MilestoneFacts) are worked
 *   out by lib/milestones.ts from the saved progress, and the progress store
 *   keeps the few counters that can't be worked out later (afterAnswer).
 *
 * Pure TypeScript: no React, no storage.
 */
import { GAMES } from './games/registry';
import { share } from './games/growth';
import { DIAGNOSTIC_SIZE, DOMAIN_TARGET, MOCK_DOMAIN_FLOOR } from './journey';
import { CHECKPOINTS, PACE_TOLERANCE, type MockTiming } from './pace';
import { domainOf, type AnswerRecord } from './readiness';
import type { Confidence } from './srs';
import { dayKey, daysBetween } from './streak';

// ── The rules' numbers (each one appears in its badge's rule text) ───────
export const TEN_TOPICS = 10;
export const FIRM_MASTERY = DOMAIN_TARGET; // 70%
export const FIRM_ANSWERS = 20;
export const WHOLE_MAP_FLOOR = MOCK_DOMAIN_FLOOR; // 65%
export const LOOP_FIXES = 10;
export const SLIP_TAGS = 10;
export const LONG_RECALLS = 25;
export const LONG_GAP_DAYS = 7;
export const GRADUATES = 50;
export const SURE_WINDOW = 50;
export const SURE_MIN = 20;
export const SURE_RIGHT = 0.85;
export const ROOTED_DAYS = [10, 30, 60] as const;
export const FRESH_GAP_DAYS = 7;
// Skill badges (games review §5).
export const SNARE_WINDOW = 10;
export const SNARE_RIGHT = 8;
export const KEEL_ROUNDS = 3;
export const SIGNPOST_FIRSTS = 10;
export const MYTHS = 25;
export const PACE_ROUNDS = 3;
export const GAME_FIXES = 10;

const DAY_MS = 86_400_000;

export type MilestoneId =
  | 'first-foothold'
  | 'topic-clear'
  | 'ten-topics'
  | 'firm-footing'
  | 'whole-map'
  | 'loop-closed'
  | 'slip-spotter'
  | 'long-memory'
  | 'graduate'
  | 'know-what-you-know'
  | 'dress-rehearsal'
  | 'on-pace'
  | 'mindset-shift'
  | 'rooted'
  | 'fresh-start';

export type SkillBadgeId = 'snare-wise' | 'even-keel' | 'signpost-reader' | 'myth-clearer' | 'sure-footed-pace' | 'whole-grove' | 'back-on-path';

export type BadgeId = MilestoneId | SkillBadgeId;

/** The quiet counters the store keeps (they only ever go up). */
export type CounterId = 'longRecall' | 'graduated' | 'loopFixed' | 'gameFixes' | 'mythsCleared' | 'signpostFirst' | 'paceRounds';

/** What the progress store saves per certification (all optional for old saves). */
export interface CertMilestones {
  /** Earned marks → when (epoch ms). Never removed by the app. */
  earned: Record<string, number>;
  /** Marks waiting for their one quiet moment (oldest first). */
  queue?: string[];
  /** The launch back-fill: when it ran, how many badges it found, and whether its summary was seen. */
  backfill?: { at: number; count: number; seen?: boolean };
  counts?: Partial<Record<CounterId, number>>;
  /** The last SURE_WINDOW unassisted, non-game "sure" answers, oldest first (true = right). */
  sure?: boolean[];
  /** Questions missed in a game, waiting to be fixed later outside games: id → day missed. */
  gameMisses?: Record<string, string>;
  /** Study days for this certification (cumulative), and the last day counted. */
  days?: number;
  lastDay?: string;
  /** The day the learner came back after FRESH_GAP_DAYS or more away. */
  returnedOn?: string;
}

/** A mock result, as far as the milestones need it. */
export interface MockFacts {
  total: number;
  timing?: MockTiming;
  unanswered?: number;
  checkpoints?: number[];
}

/** Every number the rules read, worked out by lib/milestones.ts. */
export interface MilestoneFacts {
  /** Unique questions whose last answer was given without Coach me. */
  cleanAnswered: number;
  topicsClear: number;
  /** Per domain, from unassisted answers only. */
  domains: { id: string; short: string; answered: number; mastery: number }[];
  loopFixed: number;
  slipsTagged: number;
  longRecall: number;
  graduated: number;
  sure: readonly boolean[];
  mocks: readonly MockFacts[];
  /** Questions in a full mock (the exam's length). */
  fullMockSize: number;
  mindsetShift: boolean;
  studyDays: number;
  freshStart: boolean;
  // Skill badges.
  gamesPlayed: number;
  gamesTotal: number;
  snareHits: readonly boolean[];
  keelRun: number;
  signpostFirst: number;
  mythsCleared: number;
  paceRounds: number;
  gameFixes: number;
}

export interface BadgeDef {
  id: BadgeId;
  kind: 'milestone' | 'skill';
  name: string;
  /** The exact rule, in plain words, shown before and after it is earned. */
  rule: string;
}

/** One mark's state: met or not, and how close (0..1), with a short progress line. */
export interface MarkState {
  key: string;
  badge: BadgeId;
  /** "Firm Footing · IS Operations", "Rooted · 30 days", or the badge name. */
  label: string;
  met: boolean;
  progress: number;
  detail: string;
}

const g = (id: keyof typeof GAMES) => GAMES[id].name;

/** The 15 milestones, then the 7 skill badges, in display order. */
export const BADGES: BadgeDef[] = [
  { id: 'first-foothold', kind: 'milestone', name: 'First Foothold', rule: `Finish the ${DIAGNOSTIC_SIZE}-question diagnostic.` },
  { id: 'topic-clear', kind: 'milestone', name: 'Topic Clear', rule: 'Clear your first topic: its lesson done, and 4 of your last 5 answers there right.' },
  { id: 'ten-topics', kind: 'milestone', name: 'Ten Topics Clear', rule: `Clear ${TEN_TOPICS} topics.` },
  {
    id: 'firm-footing',
    kind: 'milestone',
    name: 'Firm Footing',
    rule: `Reach ${Math.round(FIRM_MASTERY * 100)}% mastery in a domain, with ${FIRM_ANSWERS} or more of its questions answered. One leaf per domain.`,
  },
  { id: 'whole-map', kind: 'milestone', name: 'Whole Map', rule: `Reach ${Math.round(WHOLE_MAP_FLOOR * 100)}% mastery in every domain.` },
  { id: 'loop-closed', kind: 'milestone', name: 'Loop Closed', rule: `Fix ${LOOP_FIXES} logged mistakes: answer each one right, without a hint, on a later day.` },
  { id: 'slip-spotter', kind: 'milestone', name: 'Slip Spotter', rule: `Tag ${SLIP_TAGS} mistakes with the thinking slip behind them.` },
  { id: 'long-memory', kind: 'milestone', name: 'Long Memory', rule: `Get ${LONG_RECALLS} questions right, without a hint, a week or more after you last saw them.` },
  { id: 'graduate', kind: 'milestone', name: 'Graduate', rule: `Graduate ${GRADUATES} questions out of spaced review: right again from the last box.` },
  {
    id: 'know-what-you-know',
    kind: 'milestone',
    name: 'Know What You Know',
    rule: `Of your last ${SURE_WINDOW} “sure” answers, get ${Math.round(SURE_RIGHT * 100)}% or more right (after at least ${SURE_MIN}).`,
  },
  { id: 'dress-rehearsal', kind: 'milestone', name: 'Dress Rehearsal', rule: 'Finish a full, timed mock with every question answered.' },
  { id: 'on-pace', kind: 'milestone', name: 'On Pace', rule: `Finish a timed mock with every pace check within ${Math.round(PACE_TOLERANCE * 100)}% of the target.` },
  { id: 'mindset-shift', kind: 'milestone', name: 'Mindset Shift', rule: 'Pick the tempting runner-up clearly less often than in your first weeks.' },
  {
    id: 'rooted',
    kind: 'milestone',
    name: 'Rooted',
    rule: `Study on ${ROOTED_DAYS[0]} days in all, then ${ROOTED_DAYS[1]}, then ${ROOTED_DAYS[2]}. Days add up; they don’t need to be in a row.`,
  },
  { id: 'fresh-start', kind: 'milestone', name: 'Fresh Start', rule: `Come back after ${FRESH_GAP_DAYS} days or more away and finish a session.` },
  // Skill badges: "pressed leaves" in You → Field notes.
  { id: 'snare-wise', kind: 'skill', name: 'Snare-wise', rule: `Spot the snare in ${SNARE_RIGHT} of your last ${SNARE_WINDOW} ${g('trap')} questions.` },
  { id: 'even-keel', kind: 'skill', name: 'Even Keel', rule: `${g('sprint')} says “well calibrated” ${KEEL_ROUNDS} rounds in a row.` },
  { id: 'signpost-reader', kind: 'skill', name: 'Signpost Reader', rule: `Read the deciding word right in ${SIGNPOST_FIRSTS} FIRST questions in ${g('priority')}.` },
  { id: 'myth-clearer', kind: 'skill', name: 'Myth Clearer', rule: `Clear ${MYTHS} rumors in ${g('rumor')}.` },
  { id: 'sure-footed-pace', kind: 'skill', name: 'Sure-Footed Pace', rule: `Finish ${PACE_ROUNDS} ${g('daylight')} rounds at Sapling pace or faster, inside the light.` },
  { id: 'whole-grove', kind: 'skill', name: 'Whole Grove', rule: 'Play every game at least once.' },
  { id: 'back-on-path', kind: 'skill', name: 'Back on the Path', rule: `Fix ${GAME_FIXES} game misses later: right on a later day, in review or a later round.` },
];

export const MILESTONES = BADGES.filter((b) => b.kind === 'milestone');
export const SKILL_BADGES = BADGES.filter((b) => b.kind === 'skill');

export function badgeDef(id: string): BadgeDef | undefined {
  return BADGES.find((b) => b.id === id);
}

/** The badge a mark belongs to ("firm-footing:4" → "firm-footing"). */
export function markBadge(key: string): string {
  return key.split(':')[0];
}

const frac = (have: number, need: number) => (need <= 0 ? 1 : Math.max(0, Math.min(1, have / need)));
const pct = (x: number) => `${Math.round(x * 100)}%`;
const of = (have: number, need: number, unit: string) => `${Math.min(have, need)} of ${need} ${unit}`;
const one = (b: BadgeId, met: boolean, progress: number, detail: string): MarkState[] => [
  { key: b, badge: b, label: badgeDef(b)!.name, met, progress: met ? 1 : progress, detail },
];

/** Know What You Know: the right-share of the last SURE_WINDOW sure answers. */
export function sureShare(sure: readonly boolean[]): { n: number; right: number } {
  const last = sure.slice(-SURE_WINDOW);
  return { n: last.length, right: share(last) };
}

/** A full mock, timed (standard or extra time), with nothing unanswered. Older results with no count can't show it. */
export function isDressRehearsal(m: MockFacts, fullSize: number): boolean {
  return m.total >= fullSize && m.timing !== 'untimed' && m.unanswered === 0;
}

/** A timed mock with every pace check (all three) within the tolerance. */
export function isOnPace(m: MockFacts): boolean {
  const cps = m.checkpoints ?? [];
  return m.timing !== 'untimed' && cps.length >= CHECKPOINTS.length && cps.every((d) => Math.abs(d) <= PACE_TOLERANCE + 1e-9);
}

/** Every badge's marks, in display order. */
export function allMarks(f: MilestoneFacts): MarkState[] {
  const out: MarkState[] = [];
  const firstFoothold = f.cleanAnswered >= DIAGNOSTIC_SIZE;
  out.push(...one('first-foothold', firstFoothold, frac(f.cleanAnswered, DIAGNOSTIC_SIZE), of(f.cleanAnswered, DIAGNOSTIC_SIZE, 'answered without a hint')));
  out.push(...one('topic-clear', f.topicsClear >= 1, 0, f.topicsClear >= 1 ? 'A topic is clear' : 'No topic clear yet'));
  out.push(...one('ten-topics', f.topicsClear >= TEN_TOPICS, frac(f.topicsClear, TEN_TOPICS), of(f.topicsClear, TEN_TOPICS, 'topics clear')));
  for (const d of f.domains) {
    const met = d.answered >= FIRM_ANSWERS && d.mastery >= FIRM_MASTERY - 1e-9;
    out.push({
      key: `firm-footing:${d.id}`,
      badge: 'firm-footing',
      label: `Firm Footing · ${d.short}`,
      met,
      progress: met ? 1 : Math.min(frac(d.answered, FIRM_ANSWERS), frac(d.mastery, FIRM_MASTERY)),
      detail: `${pct(d.mastery)} mastery · ${of(d.answered, FIRM_ANSWERS, 'answered')}`,
    });
  }
  const atFloor = f.domains.filter((d) => d.mastery >= WHOLE_MAP_FLOOR - 1e-9).length;
  const wholeMap = f.domains.length > 0 && atFloor === f.domains.length;
  const mapProgress = f.domains.length ? f.domains.reduce((s, d) => s + frac(d.mastery, WHOLE_MAP_FLOOR), 0) / f.domains.length : 0;
  out.push(...one('whole-map', wholeMap, mapProgress, `${atFloor} of ${f.domains.length} domains at ${pct(WHOLE_MAP_FLOOR)}`));
  out.push(...one('loop-closed', f.loopFixed >= LOOP_FIXES, frac(f.loopFixed, LOOP_FIXES), of(f.loopFixed, LOOP_FIXES, 'fixed')));
  out.push(...one('slip-spotter', f.slipsTagged >= SLIP_TAGS, frac(f.slipsTagged, SLIP_TAGS), of(f.slipsTagged, SLIP_TAGS, 'tagged')));
  out.push(...one('long-memory', f.longRecall >= LONG_RECALLS, frac(f.longRecall, LONG_RECALLS), of(f.longRecall, LONG_RECALLS, 'remembered')));
  out.push(...one('graduate', f.graduated >= GRADUATES, frac(f.graduated, GRADUATES), of(f.graduated, GRADUATES, 'graduated')));
  const s = sureShare(f.sure);
  const kwyk = s.n >= SURE_MIN && s.right >= SURE_RIGHT - 1e-9;
  out.push(
    ...one(
      'know-what-you-know',
      kwyk,
      s.n < SURE_MIN ? frac(s.n, SURE_MIN) * 0.5 : 0.5 + 0.5 * frac(s.right, SURE_RIGHT),
      s.n < SURE_MIN ? of(s.n, SURE_MIN, '“sure” answers so far') : `${pct(s.right)} right on your last ${s.n} “sure” answers`,
    ),
  );
  const dress = f.mocks.some((m) => isDressRehearsal(m, f.fullMockSize));
  out.push(...one('dress-rehearsal', dress, 0, dress ? 'Done' : 'Not yet'));
  const onPace = f.mocks.some(isOnPace);
  out.push(...one('on-pace', onPace, 0, onPace ? 'Done' : 'Not yet'));
  out.push(...one('mindset-shift', f.mindsetShift, 0, f.mindsetShift ? 'Done' : 'Not yet'));
  for (const n of ROOTED_DAYS) {
    out.push({ key: `rooted:${n}`, badge: 'rooted', label: `Rooted · ${n} days`, met: f.studyDays >= n, progress: frac(f.studyDays, n), detail: of(f.studyDays, n, 'study days') });
  }
  out.push(...one('fresh-start', f.freshStart, 0, f.freshStart ? 'Done' : 'Not yet'));
  // Skill badges.
  const snares = f.snareHits.slice(-SNARE_WINDOW);
  const snareRight = snares.filter(Boolean).length;
  out.push(
    ...one(
      'snare-wise',
      snares.length >= SNARE_WINDOW && snareRight >= SNARE_RIGHT,
      snares.length < SNARE_WINDOW ? frac(snares.length, SNARE_WINDOW) * 0.5 : frac(snareRight, SNARE_RIGHT),
      snares.length < SNARE_WINDOW ? of(snares.length, SNARE_WINDOW, 'questions played') : `${snareRight} of your last ${SNARE_WINDOW} snares spotted`,
    ),
  );
  out.push(...one('even-keel', f.keelRun >= KEEL_ROUNDS, frac(f.keelRun, KEEL_ROUNDS), of(f.keelRun, KEEL_ROUNDS, 'rounds in a row')));
  out.push(...one('signpost-reader', f.signpostFirst >= SIGNPOST_FIRSTS, frac(f.signpostFirst, SIGNPOST_FIRSTS), of(f.signpostFirst, SIGNPOST_FIRSTS, 'FIRST questions read right')));
  out.push(...one('myth-clearer', f.mythsCleared >= MYTHS, frac(f.mythsCleared, MYTHS), of(f.mythsCleared, MYTHS, 'rumors cleared')));
  out.push(...one('sure-footed-pace', f.paceRounds >= PACE_ROUNDS, frac(f.paceRounds, PACE_ROUNDS), of(f.paceRounds, PACE_ROUNDS, 'rounds')));
  out.push(
    ...one('whole-grove', f.gamesTotal > 0 && f.gamesPlayed >= f.gamesTotal, frac(f.gamesPlayed, f.gamesTotal), of(f.gamesPlayed, f.gamesTotal, 'games played')),
  );
  out.push(...one('back-on-path', f.gameFixes >= GAME_FIXES, frac(f.gameFixes, GAME_FIXES), of(f.gameFixes, GAME_FIXES, 'fixed')));
  return out;
}

/** Marks met now that were not earned before, in display order. */
export function newlyMet(marks: readonly MarkState[], earned: Record<string, number> | undefined): string[] {
  return marks.filter((m) => m.met && !earned?.[m.key]).map((m) => m.key);
}

/** How many different badges a list of marks belongs to (Firm Footing's leaves count once). */
export function badgeCount(keys: readonly string[]): number {
  return new Set(keys.map(markBadge)).size;
}

/** One badge on the Milestones / Field notes screen. */
export interface BadgeView {
  def: BadgeDef;
  /** Earned marks, oldest first, with when. */
  earned: { key: string; label: string; at: number }[];
  /** The next mark to earn (none when every mark is earned). */
  next?: MarkState;
}

/** Every badge of a kind with its earned marks and the next mark to earn. */
export function badgeViews(marks: readonly MarkState[], earned: Record<string, number> | undefined, kind: BadgeDef['kind']): BadgeView[] {
  return BADGES.filter((b) => b.kind === kind).map((def) => {
    const mine = marks.filter((m) => m.badge === def.id);
    const got = mine.filter((m) => earned?.[m.key]).map((m) => ({ key: m.key, label: m.label, at: earned![m.key] }));
    // A mark earned before but no longer in the list (a domain removed) still shows.
    for (const [k, at] of Object.entries(earned ?? {})) {
      if (markBadge(k) === def.id && !got.some((x) => x.key === k)) got.push({ key: k, label: def.name, at });
    }
    got.sort((a, b) => a.at - b.at);
    // The next mark: the closest one not earned (Rooted: the next tier).
    const open = mine.filter((m) => !earned?.[m.key]);
    const next = def.id === 'rooted' ? open[0] : [...open].sort((a, b) => b.progress - a.progress)[0];
    return { def, earned: got, ...(next ? { next } : {}) };
  });
}

/**
 * The 3 nearest unearned marks (goal clarity), closest first; ties keep the
 * display order. Only badges with nothing earned yet, plus the next tier or
 * leaf of a badge already started, can appear, one per badge.
 */
export function nearest(views: readonly BadgeView[], n = 3): BadgeView[] {
  return views
    .filter((v) => v.next)
    .map((v, i) => ({ v, i }))
    .sort((a, b) => b.v.next!.progress - a.v.next!.progress || a.i - b.i)
    .slice(0, n)
    .map((x) => x.v);
}

/** What a mark is called in its moment ("Firm Footing · IS Operations"). */
export function markLabel(key: string, marks: readonly MarkState[]): string {
  return marks.find((m) => m.key === key)?.label ?? badgeDef(markBadge(key))?.name ?? key;
}

// ── Recording: the few facts that can't be worked out later ──────────────

/** One answer, as the progress store sees it, for the counters. */
export interface AnswerEvent {
  questionId: string;
  correct: boolean;
  assisted: boolean;
  /** A game answer (never counts toward the mastery badges). */
  game: boolean;
  confidence?: Confidence;
  at: number;
  /** When this question was last answered before (none = first time). */
  prevLastAt?: number;
  /** The logged mistake for this question, if one exists and isn't fixed later yet. */
  openMistakeAt?: number;
  /** The answer took the question out of spaced review from the last box. */
  graduated: boolean;
}

const bump = (m: CertMilestones, id: CounterId, by = 1): CertMilestones => ({ ...m, counts: { ...m.counts, [id]: (m.counts?.[id] ?? 0) + by } });
/** Most game misses we track (a hostile backup or years of play can't grow it forever). */
export const GAME_MISSES_CAP = 2_000;

/** Count a study day (and notice a return after a long gap). Same object when nothing changed. */
export function noteStudyDay(m: CertMilestones, day: string): CertMilestones {
  if (m.lastDay && day <= m.lastDay) return m;
  const back = m.lastDay && daysBetween(m.lastDay, day) >= FRESH_GAP_DAYS;
  return { ...m, days: (m.days ?? 0) + 1, lastDay: day, ...(back ? { returnedOn: day } : {}) };
}

/**
 * Update the counters for one answer. Returns the new milestones and
 * whether the logged mistake now counts as fixed on a later day (the store
 * marks it, so it is counted once).
 */
export function afterAnswer(prev: CertMilestones | undefined, a: AnswerEvent): { milestones: CertMilestones; fixedLater: boolean } {
  const day = dayKey(a.at);
  let m = noteStudyDay(prev ?? { earned: {} }, day);
  let fixedLater = false;
  const clean = !a.game && !a.assisted;
  if (clean && a.correct) {
    if (a.prevLastAt !== undefined && a.at - a.prevLastAt >= LONG_GAP_DAYS * DAY_MS) m = bump(m, 'longRecall');
    if (a.openMistakeAt !== undefined && day > dayKey(a.openMistakeAt)) {
      m = bump(m, 'loopFixed');
      fixedLater = true;
    }
    if (a.graduated) m = bump(m, 'graduated');
    const missedOn = m.gameMisses?.[a.questionId];
    if (missedOn && day > missedOn) {
      const gameMisses = { ...m.gameMisses };
      delete gameMisses[a.questionId];
      m = bump({ ...m, gameMisses }, 'gameFixes');
    }
  }
  if (clean && a.confidence === 'sure') m = { ...m, sure: [...(m.sure ?? []), a.correct].slice(-SURE_WINDOW) };
  if (a.game && !a.correct && !m.gameMisses?.[a.questionId] && Object.keys(m.gameMisses ?? {}).length < GAME_MISSES_CAP) {
    m = { ...m, gameMisses: { ...m.gameMisses, [a.questionId]: day } };
  }
  return { milestones: m, fixedLater };
}

/** A missed note card (box 1) answered right on a later day: a game miss fixed. */
export function afterCard(prev: CertMilestones | undefined, wasMissed: boolean, missedAt: number | undefined, correct: boolean, at: number): CertMilestones | undefined {
  if (!wasMissed || !correct || missedAt === undefined || dayKey(at) <= dayKey(missedAt)) return prev;
  return bump(prev ?? { earned: {} }, 'gameFixes');
}

/** Add a counter (game rounds: rumors cleared, FIRST words read, Daylight rounds at pace). */
export function addCount(prev: CertMilestones | undefined, id: CounterId, by: number): CertMilestones | undefined {
  if (!(by > 0)) return prev;
  return bump(prev ?? { earned: {} }, id, Math.round(by));
}

/** Mark these as earned at `at` (never re-dated), and queue them for their moment unless quiet. */
export function earn(prev: CertMilestones | undefined, keys: readonly string[], at: number, queue: boolean): CertMilestones {
  const m = prev ?? { earned: {} };
  const fresh = keys.filter((k) => !m.earned[k]);
  if (!fresh.length) return m;
  const earned = { ...m.earned };
  for (const k of fresh) earned[k] = at;
  return { ...m, earned, ...(queue ? { queue: [...(m.queue ?? []), ...fresh] } : {}) };
}

/** The next mark to celebrate and the queue without it. */
export function takeNext(m: CertMilestones | undefined): { key?: string; milestones?: CertMilestones } {
  const [key, ...rest] = m?.queue ?? [];
  if (!m || !key) return { milestones: m };
  return { key, milestones: { ...m, queue: rest } };
}

// ── Back-fill at launch ──────────────────────────────────────────────────

/** The saved data a back-fill reads (a cert's progress plus the streak's days). */
export interface BackfillInput {
  answers: Record<string, AnswerRecord>;
  mistakes: Record<string, { at: number; resolved?: boolean; fixedLater?: boolean }>;
  mocks: { finishedAt: number }[];
  mastery?: Record<string, { firstDay: string; masteredAt?: string }>;
  recentDays?: readonly string[];
}

/**
 * Work out, once, what older saves can still tell us:
 * - mistakes already fixed on a later day (resolved, and the last answer was
 *   right, unassisted, on a later day than the miss) — a lower bound;
 * - the last 50 unassisted "sure" answers (each question's last answer);
 * - the study days we can still see (answers, mocks, mastery dates, the
 *   streak's recent days) — again a lower bound, never an overcount;
 * - whether any gap of a week or more was followed by more study.
 * Answer counts that were never kept (long gaps, graduations) start at 0.
 */
export function inferFromSaves(i: BackfillInput): { loopFixed: string[]; sure: boolean[]; days: string[]; returned: boolean } {
  const loopFixed: string[] = [];
  for (const [id, m] of Object.entries(i.mistakes)) {
    const a = i.answers[id];
    if (m.resolved && !m.fixedLater && a && a.lastCorrect && !a.lastAssisted && dayKey(a.lastAt) > dayKey(m.at)) loopFixed.push(id);
  }
  const sure = Object.values(i.answers)
    .filter((a) => a.lastConfidence === 'sure' && !a.lastAssisted)
    .sort((a, b) => a.lastAt - b.lastAt)
    .slice(-SURE_WINDOW)
    .map((a) => a.lastCorrect);
  const days = new Set<string>(i.recentDays ?? []);
  for (const a of Object.values(i.answers)) days.add(dayKey(a.lastAt));
  for (const m of i.mocks) days.add(dayKey(m.finishedAt));
  for (const s of Object.values(i.mastery ?? {})) {
    days.add(s.firstDay);
    if (s.masteredAt) days.add(s.masteredAt);
  }
  const sorted = [...days].sort();
  const returned = sorted.some((d, k) => k > 0 && daysBetween(sorted[k - 1], d) >= FRESH_GAP_DAYS);
  return { loopFixed, sure, days: sorted, returned };
}

// ── Restore: a badge must be backed by the data it came from ─────────────

/** The parts of a restored cert the support check reads. */
export interface MarkEvidence {
  answers?: Record<string, unknown>;
  mistakes?: Record<string, { slip?: string }>;
  mocks?: unknown[];
  lessonsDone?: string[];
  notesRead?: string[];
  gameBest?: Record<string, unknown>;
  gameGrowth?: Record<string, { hits?: boolean[] } | undefined>;
  milestones?: Pick<CertMilestones, 'counts' | 'sure' | 'days'>;
}

/**
 * True when the restored data could have earned this mark. These are the
 * plain necessary conditions (the data a rule reads must be there), so a
 * genuine backup always passes and a mark the data can't support (an edited
 * file, or one cut short) is dropped. Unknown marks are never supported.
 */
export function markSupported(key: string, e: MarkEvidence): boolean {
  const answers = Object.keys(e.answers ?? {});
  const n = answers.length;
  const studied = (e.lessonsDone?.length ?? 0) + (e.notesRead?.length ?? 0);
  const c = (id: CounterId) => e.milestones?.counts?.[id] ?? 0;
  const days = e.milestones?.days ?? 0;
  const [badge, part] = key.split(':');
  switch (badge) {
    case 'first-foothold':
      return n >= DIAGNOSTIC_SIZE;
    case 'topic-clear':
      return n >= 4 && studied >= 1;
    case 'ten-topics':
      return n >= 4 * TEN_TOPICS && studied >= 1;
    case 'firm-footing':
      return Boolean(part) && answers.filter((id) => domainOf(id) === part).length >= FIRM_ANSWERS;
    case 'whole-map':
      return n >= FIRM_ANSWERS;
    case 'loop-closed':
      return c('loopFixed') >= LOOP_FIXES;
    case 'slip-spotter':
      return Object.values(e.mistakes ?? {}).filter((m) => m.slip).length >= SLIP_TAGS;
    case 'long-memory':
      return c('longRecall') >= LONG_RECALLS;
    case 'graduate':
      return c('graduated') >= GRADUATES;
    case 'know-what-you-know':
      return (e.milestones?.sure?.length ?? 0) >= SURE_MIN;
    case 'dress-rehearsal':
    case 'on-pace':
      return (e.mocks?.length ?? 0) >= 1;
    case 'mindset-shift':
      return n >= 100;
    case 'rooted':
      return (ROOTED_DAYS as readonly number[]).includes(Number(part)) && days >= Number(part);
    case 'fresh-start':
      return days >= 2;
    case 'snare-wise':
      return (e.gameGrowth?.trap?.hits?.length ?? 0) >= SNARE_WINDOW;
    case 'even-keel':
      return e.gameBest?.sprint !== undefined;
    case 'signpost-reader':
      return c('signpostFirst') >= SIGNPOST_FIRSTS;
    case 'myth-clearer':
      return c('mythsCleared') >= MYTHS;
    case 'sure-footed-pace':
      return c('paceRounds') >= PACE_ROUNDS;
    case 'whole-grove':
      return Object.keys(e.gameBest ?? {}).length >= 2;
    case 'back-on-path':
      return c('gameFixes') >= GAME_FIXES;
    default:
      return false;
  }
}

/** A restored cert's milestones with only the marks its data supports (and a queue of earned marks only). */
export function keepSupported(m: CertMilestones, e: MarkEvidence): CertMilestones {
  const earned = Object.fromEntries(Object.entries(m.earned).filter(([k]) => markSupported(k, e)));
  const queue = m.queue?.filter((k) => earned[k] !== undefined);
  return { ...m, earned, ...(m.queue ? { queue } : {}) };
}
