/**
 * The readiness report (mobile 1.16, PHASE5.md §3.1): what the readiness
 * range is built from, laid out so a learner can see whether they are
 * improving and where.
 *
 *   mockTrend        the mocks, oldest → newest (up to 10), mini and full told apart
 *   trendWords       "Up 6 points over your last 3 mocks." (words, never colour alone)
 *   domainBreakdown  every domain side by side: weight, domain readiness, evidence,
 *                    and the last two mocks' results in it
 *   raiseLowerBound  up to 3 concrete things that would raise the low end of the range
 *   lowSeries        the low end over the last 30 days, carried forward over gaps
 *   PATH_STEPS       the six steps of "Your path", one line each
 *
 * Honest numbers: nothing here predicts an exam result. Readiness stays a
 * range from the learner's answers in this app; a mock's percentage is a
 * practice score, not a scaled exam score; a fall is said plainly.
 *
 * Pure TypeScript: no React, no storage.
 */
import type { Certification, DomainInfo } from '../content/types';
import { shiftDay, type ReadinessDay } from './examReady';
import { STAGE_LABEL, type Stage } from './journey';
import { timingOf, type MockTiming } from './pace';
import { MIN_SAMPLE, type Readiness } from './readiness';
import type { ReadinessRange } from './readinessRange';
import { REVIEW_SESSION_CAP } from './srs';

/** What the report reads from a saved mock (store/progress.ts MockResult). */
export interface MockLike {
  id: string;
  finishedAt: number;
  total: number;
  correct: number;
  byDomain?: Record<string, { total: number; correct: number }>;
  timing?: MockTiming;
}

// ── Mock trend ───────────────────────────────────────────────────────────

/** The trend shows at most this many mocks (the newest). */
export const TREND_MAX = 10;
/** A change within this many points either way reads "about level". */
export const LEVEL_POINTS = 2;
/** Trend words look back over at most this many mocks. */
export const TREND_WINDOW = 3;

export type MockKind = 'full' | 'mini' | 'other';

export interface TrendPoint {
  id: string;
  at: number;
  /** The practice score, whole percent. */
  pct: number;
  kind: MockKind;
  /** False for an untimed mock (drawn with a dashed outline). */
  timed: boolean;
}

/** Full = the exam's length; mini = a third of it (Practice's mini mock); anything else = other. */
export function mockKind(total: number, examQuestions: number): MockKind {
  if (total === examQuestions) return 'full';
  if (total === Math.round(examQuestions / 3)) return 'mini';
  return 'other';
}

/** A mock's score as a whole percent (0 for an empty one: never NaN). */
export function mockPct(m: Pick<MockLike, 'total' | 'correct'>): number {
  return m.total > 0 ? Math.round((Math.min(m.correct, m.total) / m.total) * 100) : 0;
}

/** Newest first, whatever order they were saved in. */
const newestFirst = <M extends MockLike>(mocks: readonly M[]) => [...mocks].sort((a, b) => b.finishedAt - a.finishedAt);

/** The newest TREND_MAX mocks as points, oldest → newest. */
export function mockTrend(mocks: readonly MockLike[], examQuestions: number): TrendPoint[] {
  return newestFirst(mocks)
    .slice(0, TREND_MAX)
    .reverse()
    .map((m) => ({ id: m.id, at: m.finishedAt, pct: mockPct(m), kind: mockKind(m.total, examQuestions), timed: timingOf(m.timing) !== 'untimed' }));
}

/** Said after a fall: one mock is one sample. */
const FALL_NOTE = 'One mock can swing; look at the domains below.';
/** Said when the mocks compared are of both lengths (UX review O1). */
export const MIXED_NOTE = 'Mini and full mocks are mixed here; a mini mock swings more.';

/**
 * The trend in words, over the last 2 or 3 mocks; null for fewer than 2.
 * Up, about level (within ±2 points) or down. A fall is stated plainly and
 * points to the domains: one mock can swing.
 *
 * The newest mock is compared with the one before FIRST (code review M1): a
 * recent fall is never smoothed over by an older, lower score ("60 → 70 → 58"
 * reads "Down 12 points since your last mock", not "About level").
 */
export function trendWords(points: readonly TrendPoint[]): string | null {
  if (points.length < 2) return null;
  const mixed = (window: readonly TrendPoint[]) =>
    window.some((p) => p.kind === 'mini') && window.some((p) => p.kind === 'full') ? ` ${MIXED_NOTE}` : '';
  const last = points[points.length - 1].pct;
  const fall = points[points.length - 2].pct - last;
  if (fall > LEVEL_POINTS) return `Down ${fall} points since your last mock. ${FALL_NOTE}${mixed(points.slice(-2))}`;
  const n = Math.min(TREND_WINDOW, points.length);
  const delta = last - points[points.length - n].pct;
  const span = n === 2 ? 'since your last mock' : `over your last ${n} mocks`;
  const note = mixed(points.slice(-n));
  if (delta > LEVEL_POINTS) return `Up ${delta} points ${span}.${note}`;
  if (delta < -LEVEL_POINTS) return `Down ${-delta} points ${span}. ${FALL_NOTE}${note}`;
  return `About level ${span}.${note}`;
}

/**
 * The trend chart's spoken label: every score with its kind (code review
 * M3c), so mini and full mocks are told apart by ear too: "56 mini, 59 mini
 * untimed, 62 full".
 */
export function trendSpoken(points: readonly TrendPoint[]): string {
  const said = points.map((p) => `${p.pct}${p.kind === 'full' ? ' full' : p.kind === 'mini' ? ' mini' : ''}${p.timed ? '' : ' untimed'}`);
  return `Your last ${points.length} mocks, oldest first, in percent: ${said.join(', ')}.`;
}

// ── Domain by domain ─────────────────────────────────────────────────────

/** A domain's result in one mock; null = that mock has no entry for it (an older save), shown "–". */
export type MockTally = { total: number; correct: number } | null;

export interface DomainRow {
  domain: DomainInfo;
  /** Its share of the exam, whole percent. */
  weightPct: number;
  /** Domain readiness (mastery), whole percent. */
  readinessPct: number;
  /** Questions answered in this domain (unique). */
  answered: number;
  /** Enough answers that the domain's number means something (MIN_SAMPLE). */
  firm: boolean;
  /** The newest mock's result here; undefined when there is no mock at all. */
  lastMock?: MockTally;
  /** The mock before that; undefined when there is none. */
  prevMock?: MockTally;
}

const tallyIn = (m: MockLike | undefined, domainId: string): MockTally | undefined => (m ? mockTally(m, domainId) : undefined);

/** One row per domain, in the certification's order (any number of domains). */
export function domainBreakdown(cert: Certification, readiness: Readiness, mocks: readonly MockLike[]): DomainRow[] {
  const total = cert.domains.reduce((s, d) => s + d.weight, 0) || 1;
  const [last, prev] = newestFirst(mocks);
  return cert.domains.map((domain) => {
    const dm = readiness.domains.find((x) => x.domainId === domain.id);
    const answered = dm?.answered ?? 0;
    const lastMock = tallyIn(last, domain.id);
    const prevMock = tallyIn(prev, domain.id);
    return {
      domain,
      weightPct: Math.round((domain.weight / total) * 100),
      readinessPct: Math.round((dm?.mastery ?? 0) * 100),
      answered,
      firm: answered >= MIN_SAMPLE,
      ...(lastMock !== undefined ? { lastMock } : {}),
      ...(prevMock !== undefined ? { prevMock } : {}),
    };
  });
}

/** A tally's share, whole percent (the total is never 0: tallyIn drops those). */
const tallyPct = (t: { total: number; correct: number }) => Math.round((Math.min(t.correct, t.total) / t.total) * 100);

/** "14 of 20 (70%)", or "–" for a mock with no entry for the domain (UX review P7: tallies of different sizes compare at a glance). */
export const tallyText = (t: MockTally) => (t ? `${t.correct} of ${t.total} (${tallyPct(t)}%)` : '–');

/** Spoken: "14 of 20, 70 percent", or "not recorded". */
export const tallySpoken = (t: MockTally | undefined) => (t ? `${t.correct} of ${t.total}, ${tallyPct(t)} percent` : 'not recorded');

/** A mock's own per-domain entry, as a tally (null when it has none, or an empty one). */
export const mockTally = (m: Pick<MockLike, 'byDomain'>, domainId: string): MockTally => {
  const t = m.byDomain?.[domainId];
  return t && t.total > 0 ? { total: t.total, correct: Math.min(t.correct, t.total) } : null;
};

/** True when either of the last two mocks has a result for this domain. */
export const mockCovers = (r: DomainRow) => Boolean(r.lastMock || r.prevMock);

/**
 * Line 1: "26% of the exam · domain readiness 68%". A domain with no answers
 * has no readiness to show, so it never reads "0%" (UX review H2): "26% of
 * the exam · not started yet".
 */
export function readinessLine(r: DomainRow): string {
  return `${r.weightPct}% of the exam · ${r.answered === 0 ? 'not started yet' : `domain readiness ${r.readinessPct}%`}`;
}

/** Line 2: "Based on 120 answers", or "Based on 6 answers: still firming up"; none yet: "No answers here yet". */
export function evidenceLine(r: DomainRow): string {
  if (r.answered === 0) return 'No answers here yet';
  const n = `${r.answered} ${r.answered === 1 ? 'answer' : 'answers'}`;
  return r.firm ? `Based on ${n}` : `Based on ${n}: still firming up`;
}

/** Line 3, when a mock covers the domain: "Last mock 14 of 20 · the one before 11 of 18". */
export function mockLine(r: DomainRow): string | null {
  if (!mockCovers(r)) return null;
  const last = `Last mock ${tallyText(r.lastMock ?? null)}`;
  return r.prevMock !== undefined ? `${last} · the one before ${tallyText(r.prevMock)}` : last;
}

/** One spoken stop per domain (full words, no symbols). */
export function domainSpoken(r: DomainRow): string {
  const mocks = mockCovers(r) ? ` Last mock ${tallySpoken(r.lastMock)}.${r.prevMock !== undefined ? ` The one before ${tallySpoken(r.prevMock)}.` : ''}` : '';
  const n = `${r.answered} ${r.answered === 1 ? 'answer' : 'answers'}`;
  const readiness = r.answered === 0 ? 'Not started yet.' : `Domain readiness ${r.readinessPct} percent, based on ${n}${r.firm ? '' : ', still firming up'}.`;
  return `Domain ${r.domain.id}, ${r.domain.short}, ${r.weightPct} percent of the exam. ${readiness}${mocks}`;
}

// ── What would raise your low end ───────────────────────────────────────

export type RaiseAction =
  /** Not enough data yet: answers unlock the range itself. */
  | { kind: 'unlock'; more: number; text: string; button: string }
  /** The domain with the fewest answers, under MIN_SAMPLE: more evidence narrows the range. */
  | { kind: 'answer'; domainId: string; more: number; text: string; button: string }
  /** The focus domain (the most points to gain, weighted by the exam). */
  | { kind: 'focus'; domainId: string; text: string; button: string }
  /** Reviews due: revisiting steadies the range. */
  | { kind: 'review'; count: number; text: string; button: string }
  /** Nothing stands out: the steady habit. No button. */
  | { kind: 'mix'; text: string };

/** At most this many actions. */
export const RAISE_MAX = 3;

/**
 * Up to 3 concrete actions, in a stable order: firm up the thinnest domain,
 * then the one with the most to gain (if it is a different one), then the
 * reviews due. Before there is a range, only the "answer more" row.
 */
export function raiseLowerBound(cert: Certification, readiness: Readiness, range: ReadinessRange, dueCount: number): RaiseAction[] {
  if (!range.enough) {
    const more = range.needed;
    return [{ kind: 'unlock', more, text: `Answer ${more} more ${more === 1 ? 'question' : 'questions'} to see your range`, button: 'Practice a mixed set' }];
  }
  const out: RaiseAction[] = [];
  const short = (id: string) => cert.domains.find((d) => d.id === id)?.short ?? id;
  // The thinnest domain under MIN_SAMPLE (ties: the exam's order).
  const thin = cert.domains
    .map((d) => ({ id: d.id, answered: readiness.domains.find((x) => x.domainId === d.id)?.answered ?? 0 }))
    .filter((d) => d.answered < MIN_SAMPLE)
    .reduce<{ id: string; answered: number } | null>((best, d) => (!best || d.answered < best.answered ? d : best), null);
  if (thin) {
    const more = MIN_SAMPLE - thin.answered;
    out.push({ kind: 'answer', domainId: thin.id, more, text: `Answer ${more} more in ${short(thin.id)} to firm up your range`, button: `Practice ${short(thin.id)}` });
  }
  const focusId = readiness.focusDomainId;
  const focus = focusId ? cert.domains.find((d) => d.id === focusId) : undefined;
  const focusMastery = readiness.domains.find((x) => x.domainId === focusId)?.mastery ?? 0;
  if (focus && focus.id !== thin?.id && focusMastery < 1) {
    const total = cert.domains.reduce((s, d) => s + d.weight, 0) || 1;
    out.push({ kind: 'focus', domainId: focus.id, text: `${focus.short} has the most to gain: ${Math.round((focus.weight / total) * 100)}% of the exam`, button: 'Practice weak spots' });
  }
  if (dueCount > 0) {
    const count = Math.min(dueCount, REVIEW_SESSION_CAP);
    out.push({ kind: 'review', count, text: `Clear ${count} ${count === 1 ? 'review' : 'reviews'}: revisiting steadies your range`, button: 'Start review' });
  }
  if (out.length === 0) out.push({ kind: 'mix', text: 'Keep a steady mix: reviews first, then your weakest domain.' });
  return out.slice(0, RAISE_MAX);
}

// ── The low end over time ────────────────────────────────────────────────

/** How many days the low-end line looks back (the readiness log keeps 30). */
export const LOW_DAYS = 30;
/** Fewer days than this with a reading, and the line waits ("This fills in…"). */
export const LOW_MIN_DAYS = 3;

export interface LowDay {
  day: string;
  /** The low end at the end of that day (carried forward over days with no entry); null = not enough data then. */
  low: number | null;
  /** True when the day has its own entry (the learner opened Today or answered). */
  logged: boolean;
}

/**
 * The last `days` calendar days, ending `today`, from the first logged day
 * in that window: each day's end-of-day low end, carried forward over gaps
 * (readiness only moves when you answer, as examReady.readyHoldDays reads it).
 */
export function lowSeries(log: readonly ReadinessDay[] | undefined, today: string, days = LOW_DAYS): LowDay[] {
  const sorted = [...(log ?? [])].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  const out: LowDay[] = [];
  for (let k = days - 1; k >= 0; k--) {
    const day = shiftDay(today, k);
    const own = sorted.find((e) => e.day === day);
    if (own) {
      out.push({ day, low: own.last, logged: true });
      continue;
    }
    const before = sorted.filter((e) => e.day < day);
    // Before the first entry there is no evidence: those days are left out.
    if (before.length === 0) continue;
    out.push({ day, low: before[before.length - 1].last, logged: false });
  }
  return out;
}

export interface LowSummary {
  /** The values to draw, oldest → newest (days with a reading only). */
  values: number[];
  /** Days with their own reading (not carried forward). */
  daysWithData: number;
  /** Enough to draw a line (LOW_MIN_DAYS). */
  enough: boolean;
  first: number | null;
  last: number | null;
  /** Calendar days the line spans, first reading to today. */
  span: number;
}

export function lowSummary(series: readonly LowDay[]): LowSummary {
  const withValue = series.filter((d): d is LowDay & { low: number } => d.low !== null);
  const daysWithData = series.filter((d) => d.logged && d.low !== null).length;
  return {
    values: withValue.map((d) => d.low),
    daysWithData,
    enough: daysWithData >= LOW_MIN_DAYS,
    first: withValue[0]?.low ?? null,
    last: withValue[withValue.length - 1]?.low ?? null,
    span: withValue.length,
  };
}

/** "From 58% to 66% over 30 days." (shown) */
export function lowWords(s: LowSummary): string | null {
  if (!s.enough || s.first === null || s.last === null) return null;
  const days = `${s.span} ${s.span === 1 ? 'day' : 'days'}`;
  return s.first === s.last ? `Held at ${s.last}% over ${days}.` : `From ${s.first}% to ${s.last}% over ${days}.`;
}

/** "Your low end went from 58 to 66 percent over 30 days." (spoken) */
export function lowSpoken(s: LowSummary): string | null {
  if (!s.enough || s.first === null || s.last === null) return null;
  const days = `${s.span} ${s.span === 1 ? 'day' : 'days'}`;
  return s.first === s.last
    ? `Your low end held at ${s.last} percent over ${days}.`
    : `Your low end went from ${s.first} to ${s.last} percent over ${days}.`;
}

/**
 * A chart's vertical range for these values: at least `minSpan` points tall
 * (so a 2-point wobble never fills the chart and reads as a cliff), within 0–100.
 */
export function chartScale(values: readonly number[], minSpan = 20): { lo: number; hi: number } {
  if (values.length === 0) return { lo: 0, hi: 100 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.min(100, Math.max(minSpan, max - min + 10));
  const lo = Math.max(0, Math.min(100 - span, (min + max) / 2 - span / 2));
  return { lo, hi: lo + span };
}

// ── Your path: the six steps ─────────────────────────────────────────────

/** The six steps, in order, each with one plain line (PHASE5.md §3.1, item 8). */
export const PATH_STEPS: readonly { stage: Exclude<Stage, 'afterExam'>; line: string }[] = [
  { stage: 'diagnose', line: 'Your first questions: a short look at where you are.' },
  { stage: 'learn', line: 'Lessons for the domains you need.' },
  { stage: 'practice', line: 'Practice and spaced review.' },
  { stage: 'mock', line: 'Mocks at exam pace.' },
  { stage: 'ready', line: 'Light review, one mock a week.' },
  { stage: 'examDay', line: 'Rest, a checklist, light review.' },
];

/**
 * Why the plan is at this step, said under the current one (UX review O8).
 * True to engine/journey.ts journeyStage, in plain words.
 */
export const PATH_REASON: Record<Exclude<Stage, 'afterExam'>, string> = {
  diagnose: 'A first look comes before anything else, so the plan knows where to start.',
  learn: 'While the basics are new, lessons come first.',
  practice: 'Until every domain is steady, practice leads.',
  mock: 'Every domain is steady, so mocks build your exam pace.',
  ready: 'Your numbers are steady, so light review keeps them there.',
  examDay: 'The exam is close: rest and light review help more than cramming.',
};

/** Under the steps: the path is not a ladder you can fall off (UX review P1). */
export const PATH_NOTE =
  'The plan moves between these as you go. If a domain slips, practice leads again for a while; mocks and lessons are always one tap away.';

/**
 * "Now: Make it stick"; after the exam, "After the exam". No "Step N of 6"
 * counter (UX review P1, decided): the plan can move back a step, and a
 * number that goes down reads like a score.
 */
export function stepLabel(stage: Stage): string {
  const i = PATH_STEPS.findIndex((s) => s.stage === stage);
  return i < 0 ? STAGE_LABEL[stage] : `Now: ${STAGE_LABEL[stage]}`;
}
