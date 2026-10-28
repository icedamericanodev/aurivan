/**
 * Home-screen widgets (mobile 1.47; the "Study card" redesign and three new
 * jobs in 1.48): the one small snapshot the app writes, and what every widget
 * says when it draws.
 *
 * Mobile 1.48 gave three widgets a new job; their Android names stay (so
 * widgets already on a home screen keep working):
 * - QuickQuestion → Recall card: a question the learner answered RIGHT at
 *   least 14 days ago; "Show the answer" reveals only the correct answer and
 *   its Exam cue, then Had it / Not yet (kept on the phone, never progress).
 * - Revisit → Key term: one term a day from the notes' glossary for today's
 *   topic; "Show the meaning" reveals its one-line meaning.
 * - ExamCountdown → Road to exam: the weeks as a road (behind, this week,
 *   ahead) and this week's focus in words. No Start button.
 *
 * Plain English:
 * - The app writes ONE small record, `aurivan.widget.v1` (under 8 KB), after
 *   a session, on app open, after a restore and after a settings change. A
 *   widget never reads the big progress stores: it draws only from this record.
 * - The record holds only what a widget shows. Never the learner's own name,
 *   never answers or mistakes, never a readiness figure unless the learner
 *   added the readiness widget and chose to see it.
 * - "Today" is worked out when the widget DRAWS, from the phone's clock, so a
 *   widget left alone overnight rolls over to the new day by itself.
 * - Safety rules every face follows (docs/mobile/DESIGN_SYSTEM.md §20):
 *     1. nothing gets more urgent during the day (no hour of the day is read);
 *        faces change with the calendar (the day, the week, the exam date).
 *        One exception, asked for by the owner: after 3 or more days with no
 *        study, today's plan offers 5 questions as its main button (it never
 *        says how long it has been);
 *     2. no name anywhere. "Details on widgets" off: general words only on
 *        every face (no topic, count, question or exam word);
 *     3. exam timing (weeks to go, final week, the eve, exam day) shows only
 *        when the learner turned exam timing on, and details are on. Every
 *        widget reads ONE wording table for the exam phases (EXAM_COPY), so two
 *        widgets never contradict each other;
 *     4. a widget tap earns nothing: it only opens the app;
 *     5. readiness is a range called "a study estimate", never a pass word,
 *        never a deficit label; the countdown counts calendar weeks.
 *
 * Pure TypeScript: no React, no storage, no widget library. The Android
 * layouts (widgets/layouts.android.tsx) draw these faces; an iOS widget can
 * draw the same faces later.
 */
import { addDays, daysToExam } from './examDay';
import { aboutMin, spokenMin } from './pace';
import { daysBetween, dayKey } from './streak';

// ── Keys, kinds and names ────────────────────────────────────────────────
/** The snapshot's AsyncStorage key (the app's usual key style; never renamed once shipped). */
export const WIDGET_KEY = 'aurivan.widget.v1';
/** Today's rule: reveal marks, self-check answers and local counts (written by the widget itself). */
export const REVEAL_KEY = 'aurivan.widget.reveal.v1';
/** The snapshot's size cap, in bytes of JSON (8 KB since 1.48: the recall cards and key terms ride along). */
export const SNAPSHOT_MAX_BYTES = 8192;
export const SNAPSHOT_VERSION = 1;

/**
 * Every widget kind in this native build, recommended ones first (Settings →
 * Add a widget lists them in this order). The lock-screen accessory is
 * designed, not built: see lockFace.
 */
export const WIDGET_KINDS = ['plan', 'plant', 'think', 'week', 'question', 'revisit', 'countdown', 'readiness'] as const;
export type WidgetKind = (typeof WIDGET_KINDS)[number];
/** The four the app recommends (the one suggestion offers the first). */
export const RECOMMENDED_KINDS: readonly WidgetKind[] = ['plan', 'plant', 'think', 'week'];

/** The Android widget provider names (app.json plugin entries). Never rename once shipped: launchers keep placed widgets by name. */
export const WIDGET_NAMES: Record<WidgetKind, string> = {
  plan: 'TodayPlan',
  plant: 'YourPlant',
  think: 'TodaysRule',
  week: 'ThisWeek',
  question: 'QuickQuestion',
  revisit: 'Revisit',
  countdown: 'ExamCountdown',
  readiness: 'Readiness',
};

/** Each widget's name in the app (Settings → Add a widget, the tester numbers), since 1.48. */
export const WIDGET_TITLES: Record<WidgetKind, string> = {
  plan: 'Today’s plan',
  plant: 'Your plant',
  think: 'Today’s rule',
  week: 'This week',
  question: 'Recall card',
  revisit: 'Key term',
  countdown: 'Road to exam',
  readiness: 'Readiness',
};

/**
 * The names Android's widget picker shows in THIS native build (app.json
 * plugin labels). They are native: changing them needs a new store build, so
 * the three renamed widgets keep their 1.47 picker names until then
 * (src/__tests__/widgets-guard.test.ts checks app.json against this).
 */
export const PICKER_LABELS: Record<WidgetKind, string> = {
  ...WIDGET_TITLES,
  question: 'Quick question',
  revisit: 'Questions to revisit',
  countdown: 'Exam countdown',
};

export function kindOfName(name: string): WidgetKind | null {
  return (Object.keys(WIDGET_NAMES) as WidgetKind[]).find((k) => WIDGET_NAMES[k] === name) ?? null;
}

// ── Learner choices (Settings → Home-screen widgets) ─────────────────────
export type DetailsPref = 'show' | 'hide';
export type ReadinessPref = 'off' | 'show' | 'private';
export interface WidgetPrefs {
  /** "Details on widgets": topics, counts, questions, rules and exam timing. Hide = general words only. */
  details: DetailsPref;
  /** The readiness widget: off until the learner adds it and chooses (Private is the first choice). */
  readiness: ReadinessPref;
  /** Exam timing on widgets (the countdown, final week, the eve, exam day): off until the learner turns it on. */
  timing: boolean;
}
export const DEFAULT_WIDGET_PREFS: WidgetPrefs = { details: 'show', readiness: 'off', timing: false };

// ── The snapshot (v1) ────────────────────────────────────────────────────
export interface PlanSnap {
  /** The plan's own day ("YYYY-MM-DD"): a plan from another day is never shown as today's. */
  day: string;
  /** Open minutes left (0 when done). */
  left: number;
  done: boolean;
  /** Day 1: the first set. */
  first: boolean;
  /** The current item's name, in plain words ("Operations", "Questions to revisit", a lesson title). */
  title: string;
  /** A short form of it (12 characters or so), for a small widget at large text. */
  short: string;
  /** Its detail line ("12 questions, most points to gain"). */
  meta: string;
  /** Today's share of questions to revisit still in the plan (the plan's own number). */
  back: number;
  /** Every one of those was a miss ("Starts with 2 you missed before"). */
  backMissed: boolean;
  /** "Short on time? 5 questions" is on offer (before the day's plan starts). */
  shortSet: boolean;
  /** The next plan's first item, in plain words: the done face, and the next morning before the app opens. */
  next: string | null;
  /** About how long the next plan is (minutes). */
  nextMin: number;
  /** The final review week's day for today, in plain words (shown only with exam timing). */
  finalDay: string | null;
  /** 1.48: the current item's question count ("12 questions"); 0 for a lesson, a game or a mock. */
  count: number;
  /** 1.48: the plan's items (the step pips) and how many are done. Older snapshots: 0 (no pips). */
  steps: number;
  stepsDone: number;
}

export interface PlantSnap {
  species: string;
  /** The friendly name ("cherry blossom"). */
  name: string;
  growth: number;
  /** The day the plant last grew ("New growth today" shows only on that day). */
  grew: string | null;
  /** Its look (the learner's style and colours), resolved by the app. */
  style?: string;
  palette?: string;
  ground?: string;
  planter?: string;
}

export interface ThinkSnap {
  day: string;
  id: string;
  /** The prompt, in an exam question's voice ("Management asks the auditor to set up the control. What should the auditor do?"). */
  ask: string;
  /** Its short form for a small widget. */
  short: string;
  title: string;
  rule: string;
  /** A bank question that tests this rule ("Try one"), if any. */
  try?: string;
}

/**
 * The Recall card (1.48): a question the learner answered RIGHT at least 14
 * days ago, its correct answer and its Exam cue tip. Never a wrong option,
 * never a question the learner hasn't met.
 */
export interface RecallSnap {
  day: string;
  id: string;
  stem: string;
  /** The correct option's words only. */
  answer: string;
  /** The question's "Exam cue:" tip, without its label. */
  cue: string;
  /** Whole weeks since it was answered right (2 or more). */
  weeks: number;
  /** The topic's short plain name (hidden with details off). */
  topic: string;
}

/** The Key term (1.48): one glossary term a day for today's topic, and the note that teaches it. */
export interface TermSnap {
  day: string;
  id: string;
  term: string;
  /** Its abbreviation, when it has one ("RPO"). */
  short?: string;
  meaning: string;
  topic: string;
  /** A study-notes subtopic id ("4B1.2") or a domain id ("4"). */
  note: string;
}

/** Road to exam's focus, from the plan engine's stage (engine/journey.ts). */
export const ROAD_STAGES = ['diagnose', 'learn', 'practice', 'mock', 'ready'] as const;
export type RoadStage = (typeof ROAD_STAGES)[number];
/** Road to exam (1.48): the Monday the road starts (the first study week on record) and this week's focus. */
export interface RoadSnap {
  from: string;
  stage: RoadStage;
}

/** Rings only (single colour): the range only when the learner chose to see it. `grew`: the topic whose ring grew most this week, if any. */
export type ReadySnap =
  | { enough: true; low: number; high: number; rings: number[]; weights: number[]; grew?: string }
  | { enough: false; needed: number; rings: number[]; weights: number[]; grew?: string };

export interface WidgetSnapshot {
  v: 1;
  /** When it was written (ms). No exam or certification name: nothing draws one (security review L6). */
  at: number;
  onboarded: boolean;
  prefs: WidgetPrefs;
  /** The exam date. Faces need it for the plan's light days and calm phases; words about it show only with exam timing on. */
  examDay: string | null;
  /** The learner's daily minutes (for a face drawn before the next plan is known). */
  minutes: number;
  plan: PlanSnap | null;
  /** Study days (the last 14) and how many study days ever (capped). */
  week: { days: string[]; total: number };
  /** True once anything was ever answered (the "Missed questions come back here" face goes). */
  answered: boolean;
  /** Null: no plant planted yet. `{ off: true }`: Settings → Show my plant is off. */
  plant: PlantSnap | { off: true } | null;
  think: ThinkSnap[];
  /** 1.48: Recall cards by day (was the Quick question's `quiz`). */
  recall: RecallSnap[];
  /** 1.48: Key terms by day. */
  terms: TermSnap[];
  /** 1.48: Road to exam (only the start week and the focus; the weeks come from the exam date). */
  road: RoadSnap | null;
  /** Only when the readiness widget is on (show or private); otherwise null. */
  ready: ReadySnap | null;
}

/** Days of Today's rule, Recall card and Key term kept ahead, so they rotate without the app opening. */
export const DAYS_AHEAD = 4;
/** Study days ever, capped (the widget only needs "fewer than 2"). */
export const TOTAL_CAP = 99;
/** After this many whole days with no study, today's plan offers 5 questions as its main button. */
export const LAPSE_DAYS = 3;
/** The short set: 5 questions, about 6 minutes (engine/dayPlan.ts SHORT_SET_SIZE, at study pace). */
export const SHORT_SET = { questions: 5, minutes: 6 } as const;

const MAX = { title: 60, short: 16, meta: 90, stem: 220, rule: 160, ask: 110, askShort: 50, topic: 16, next: 40, name: 24, answer: 120, cue: 160, term: 48, abbr: 12, meaning: 200 } as const;
/** A study-notes subtopic id ("4B1.2") or a domain id ("4"): a plain id that may hold dots. */
export const NOTE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/;

/** Text cut to `n` characters on a word boundary, with an ellipsis when cut. */
export function clip(s: string, n: number): string {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > n * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,.;:–-]+$/, '')}…`;
}

const isDay = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
const num = (x: unknown, lo: number, hi: number, d = 0): number => (typeof x === 'number' && Number.isFinite(x) ? Math.max(lo, Math.min(hi, Math.round(x))) : d);
const str = (x: unknown, n: number): string => (typeof x === 'string' ? clip(x, n) : '');
const arr = <T>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);

// ── Building the snapshot (the app side) ─────────────────────────────────
export interface SnapshotInput {
  now: number;
  onboarded: boolean;
  prefs: WidgetPrefs;
  examDay?: string | null;
  dailyMinutes: number;
  plan: PlanSnap | null;
  studyDays: readonly string[];
  studyDaysTotal: number;
  answeredAny: boolean;
  plant: PlantSnap | { off: true } | null;
  think: readonly ThinkSnap[];
  recall?: readonly RecallSnap[];
  terms?: readonly TermSnap[];
  road?: RoadSnap | null;
  ready: ReadySnap | null;
}

/**
 * The snapshot, from what the app knows now. Readiness is dropped unless its
 * widget is on; every text is cut to size, and it always fits the size cap
 * (fitSnapshot). Pure: same input, same output.
 */
export function buildSnapshot(i: SnapshotInput): WidgetSnapshot {
  return fitSnapshot(rawSnapshot(i));
}

function cleanPlan(p: Record<string, unknown>): PlanSnap | null {
  if (!isDay(p.day)) return null;
  return {
    day: p.day,
    left: num(p.left, 0, 1440),
    done: p.done === true,
    first: p.first === true,
    title: str(p.title, MAX.title),
    short: str(p.short, MAX.short),
    meta: str(p.meta, MAX.meta),
    back: num(p.back, 0, 999),
    backMissed: p.backMissed === true,
    shortSet: p.shortSet === true,
    next: typeof p.next === 'string' && p.next ? str(p.next, MAX.next) : null,
    nextMin: num(p.nextMin, 0, 600),
    finalDay: typeof p.finalDay === 'string' && p.finalDay ? str(p.finalDay, MAX.title) : null,
    count: num(p.count, 0, 999),
    steps: num(p.steps, 0, 12),
    stepsDone: Math.min(num(p.steps, 0, 12), num(p.stepsDone, 0, 12)),
  };
}

function cleanThink(e: Record<string, unknown>): ThinkSnap | null {
  if (!e || !isDay(e.day) || typeof e.id !== 'string' || !LINK_ID.test(e.id)) return null;
  const t: ThinkSnap = { day: e.day, id: e.id, ask: str(e.ask, MAX.ask), short: str(e.short, MAX.askShort), title: str(e.title, MAX.title), rule: str(e.rule, MAX.rule) };
  if (typeof e.try === 'string' && LINK_ID.test(e.try)) t.try = e.try;
  return t;
}

function cleanRecall(e: Record<string, unknown>): RecallSnap | null {
  if (!e || !isDay(e.day) || typeof e.id !== 'string' || !LINK_ID.test(e.id)) return null;
  const r = { day: e.day, id: e.id, stem: str(e.stem, MAX.stem), answer: str(e.answer, MAX.answer), cue: str(e.cue, MAX.cue), weeks: num(e.weeks, 2, 520, 2), topic: str(e.topic, MAX.topic) };
  return r.stem && r.answer ? r : null;
}

function cleanTerm(e: Record<string, unknown>): TermSnap | null {
  if (!e || !isDay(e.day) || typeof e.id !== 'string' || !LINK_ID.test(e.id) || typeof e.note !== 'string' || !NOTE_ID.test(e.note)) return null;
  const t: TermSnap = { day: e.day, id: e.id, term: str(e.term, MAX.term), meaning: str(e.meaning, MAX.meaning), topic: str(e.topic, MAX.topic), note: e.note };
  if (typeof e.short === 'string' && e.short) t.short = str(e.short, MAX.abbr);
  return t.term && t.meaning ? t : null;
}

function cleanRoad(r: unknown): RoadSnap | null {
  if (!r || typeof r !== 'object') return null;
  const o = r as Record<string, unknown>;
  if (!isDay(o.from)) return null;
  return { from: o.from, stage: (ROAD_STAGES as readonly unknown[]).includes(o.stage) ? (o.stage as RoadStage) : 'practice' };
}

function cleanPlant(pt: Record<string, unknown> | null | undefined): WidgetSnapshot['plant'] {
  if (!pt || typeof pt !== 'object') return null;
  if (pt.off === true) return { off: true };
  if (typeof pt.species !== 'string') return null;
  return {
    species: str(pt.species, MAX.name),
    name: str(pt.name ?? pt.species, MAX.name),
    growth: num(pt.growth, 1, 6, 1),
    grew: isDay(pt.grew) ? pt.grew : null,
    ...(typeof pt.style === 'string' ? { style: str(pt.style, MAX.name) } : {}),
    ...(typeof pt.palette === 'string' ? { palette: str(pt.palette, MAX.name) } : {}),
    ...(typeof pt.ground === 'string' ? { ground: str(pt.ground, MAX.name) } : {}),
    ...(typeof pt.planter === 'string' ? { planter: str(pt.planter, MAX.name) } : {}),
  };
}

function cleanPrefs(p: Record<string, unknown> | undefined): WidgetPrefs {
  const o = p ?? {};
  return {
    details: o.details === 'hide' ? 'hide' : 'show',
    readiness: o.readiness === 'show' || o.readiness === 'private' ? o.readiness : 'off',
    timing: o.timing === true,
  };
}

function rawSnapshot(i: SnapshotInput): WidgetSnapshot {
  const prefs = cleanPrefs(i.prefs as unknown as Record<string, unknown>);
  return {
    v: SNAPSHOT_VERSION,
    at: i.now,
    onboarded: i.onboarded,
    prefs,
    examDay: isDay(i.examDay) ? i.examDay : null,
    minutes: num(i.dailyMinutes, 1, 600, 20),
    plan: i.plan ? cleanPlan(i.plan as unknown as Record<string, unknown>) : null,
    week: { days: [...new Set(i.studyDays.filter(isDay))].sort().slice(-14), total: num(i.studyDaysTotal, 0, TOTAL_CAP) },
    answered: i.answeredAny,
    plant: cleanPlant(i.plant as unknown as Record<string, unknown> | null),
    think: i.think.slice(0, DAYS_AHEAD).map((t) => cleanThink(t as unknown as Record<string, unknown>)).filter((t): t is ThinkSnap => t !== null),
    recall: (i.recall ?? []).slice(0, DAYS_AHEAD).map((q) => cleanRecall(q as unknown as Record<string, unknown>)).filter((q): q is RecallSnap => q !== null),
    terms: (i.terms ?? []).slice(0, DAYS_AHEAD).map((t) => cleanTerm(t as unknown as Record<string, unknown>)).filter((t): t is TermSnap => t !== null),
    road: cleanRoad(i.road),
    ready: prefs.readiness === 'off' ? null : parseReady(i.ready),
  };
}

/** The snapshot's size in bytes (UTF-8 JSON). */
export function snapshotBytes(s: WidgetSnapshot): number {
  const json = JSON.stringify(s);
  let bytes = 0;
  for (const ch of json) {
    const c = ch.codePointAt(0) ?? 0;
    bytes += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  return bytes;
}

/** The snapshot as saved: if it ever went over the cap, the days ahead go first, so it always fits. */
export function fitSnapshot(s: WidgetSnapshot): WidgetSnapshot {
  let out = s;
  const steps: ((x: WidgetSnapshot) => WidgetSnapshot)[] = [
    (x) => ({ ...x, recall: x.recall.slice(0, 2), terms: x.terms.slice(0, 2), think: x.think.slice(0, 2) }),
    (x) => ({ ...x, recall: x.recall.slice(0, 1), terms: x.terms.slice(0, 1), think: x.think.slice(0, 1) }),
    (x) => ({ ...x, week: { ...x.week, days: x.week.days.slice(-7) } }),
  ];
  for (const step of steps) {
    if (snapshotBytes(out) <= SNAPSHOT_MAX_BYTES) break;
    out = step(out);
  }
  return out;
}

/**
 * Read a saved snapshot back, checking every field (it is plain text on the
 * phone: anything odd is dropped, never trusted). Null when it is not a v1 snapshot.
 */
export function parseSnapshot(raw: unknown): WidgetSnapshot | null {
  let x: unknown = raw;
  if (typeof x === 'string') {
    try {
      x = JSON.parse(x);
    } catch {
      return null;
    }
  }
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
  const o = x as Record<string, unknown>;
  if (o.v !== SNAPSHOT_VERSION) return null;
  const prefs = cleanPrefs(o.prefs as Record<string, unknown> | undefined);
  const wk = (o.week ?? {}) as Record<string, unknown>;
  return {
    v: SNAPSHOT_VERSION,
    at: num(o.at, 0, Number.MAX_SAFE_INTEGER),
    onboarded: o.onboarded === true,
    prefs,
    examDay: isDay(o.examDay) ? o.examDay : null,
    minutes: num(o.minutes, 1, 600, 20),
    plan: o.plan && typeof o.plan === 'object' ? cleanPlan(o.plan as Record<string, unknown>) : null,
    week: { days: arr<unknown>(wk.days).filter(isDay).slice(-14), total: num(wk.total, 0, TOTAL_CAP) },
    answered: o.answered === true,
    plant: cleanPlant(o.plant as Record<string, unknown> | null | undefined),
    think: arr<Record<string, unknown>>(o.think).slice(0, DAYS_AHEAD).map(cleanThink).filter((t): t is ThinkSnap => t !== null),
    // A 1.47 snapshot has `quiz` instead: it is ignored (the Recall card waits for the app's next write).
    recall: arr<Record<string, unknown>>(o.recall).slice(0, DAYS_AHEAD).map(cleanRecall).filter((q): q is RecallSnap => q !== null),
    terms: arr<Record<string, unknown>>(o.terms).slice(0, DAYS_AHEAD).map(cleanTerm).filter((t): t is TermSnap => t !== null),
    road: cleanRoad(o.road),
    ready: prefs.readiness === 'off' ? null : parseReady(o.ready),
  };
}

function parseReady(x: unknown): ReadySnap | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  const nums = (a: unknown, hi: number) => arr<unknown>(a).slice(0, 8).map((n) => num(n, 0, hi));
  const rings = nums(r.rings, 100);
  const weights = nums(r.weights, 100);
  const grew = typeof r.grew === 'string' && r.grew ? { grew: clip(r.grew, MAX.topic) } : {};
  if (r.enough === true) {
    const low = num(r.low, 0, 100);
    const high = num(r.high, 0, 100);
    if (high < low) return null;
    return { enough: true, low, high, rings, weights, ...grew };
  }
  return { enough: false, needed: num(r.needed, 0, 999), rings, weights, ...grew };
}

// ── Links (every tap opens the app at the matching place) ────────────────
/** Where a widget tap goes. The app's /widget screen maps each to a real screen (app/widget.tsx). */
export const WIDGET_GOALS = ['today', 'start', 'short', 'review', 'question', 'principle', 'principles', 'note', 'notes', 'plant', 'plant-pick', 'plant-settings', 'readiness', 'exam-week', 'settings', 'readiness-setting', 'timing-setting', 'exam-date'] as const;
export type WidgetGoal = (typeof WIDGET_GOALS)[number];

/** A safe id for a link (question and principle ids): letters, digits, "_" and "-" only. */
export const LINK_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** The id rule for a goal: a study note's id may hold dots ("4B1.2"); every other id may not. */
const idRule = (go: WidgetGoal) => (go === 'note' ? NOTE_ID : LINK_ID);

/** `kaisip://widget?kind=plan&go=start&from=widget` (+ `&id=` for a question, a principle or a study note). */
export function widgetLink(kind: WidgetKind, go: WidgetGoal, id?: string): string {
  const q = [`kind=${kind}`, `go=${go}`, ...(id && idRule(go).test(id) ? [`id=${id}`] : []), 'from=widget'];
  return `kaisip://widget?${q.join('&')}`;
}

export interface WidgetTap {
  kind: WidgetKind | null;
  go: WidgetGoal;
  id: string | null;
  /** The link said it came from a widget (local counters only; any app could say so, so they are indicative). */
  fromWidget: boolean;
}

/**
 * Read a widget link's params. Any app on the phone can send a kaisip://
 * link, so nothing is trusted: an unknown kind is dropped, an unknown goal
 * means Today, and an id is kept only if it is a plain id.
 */
export function parseWidgetTap(params: Record<string, unknown>): WidgetTap {
  const one = (v: unknown) => (Array.isArray(v) ? v[0] : v);
  const kind = one(params.kind);
  const go = one(params.go);
  const id = one(params.id);
  const goal = (WIDGET_GOALS as readonly string[]).includes(go as string) ? (go as WidgetGoal) : 'today';
  const cleanId = typeof id === 'string' && idRule(goal).test(id) ? id : null;
  // A goal that needs an id falls back to its list when the id is missing.
  const fixed: WidgetGoal = goal === 'question' && !cleanId ? 'today' : goal === 'principle' && !cleanId ? 'principles' : goal === 'note' && !cleanId ? 'notes' : goal;
  return {
    kind: (WIDGET_KINDS as readonly string[]).includes(kind as string) ? (kind as WidgetKind) : null,
    go: fixed,
    id: fixed === 'question' || fixed === 'principle' || fixed === 'note' ? cleanId : null,
    fromWidget: one(params.from) === 'widget',
  };
}

/**
 * The screen each plain goal opens (the ones that start a session are done
 * by app/widget.tsx itself, with the app's live plan). Every value is a real route.
 * The two `*-setting` goals open the exact choice, then return.
 */
export const GOAL_ROUTES: Record<Exclude<WidgetGoal, 'start' | 'short' | 'review' | 'question' | 'principle' | 'note'>, string> = {
  today: '/home',
  principles: '/principles',
  notes: '/notes',
  plant: '/plant',
  'plant-pick': '/plant-pick',
  'plant-settings': '/settings?section=plant',
  readiness: '/readiness',
  'exam-week': '/exam-week',
  settings: '/settings?section=widgets',
  'readiness-setting': '/settings?open=widget-readiness',
  'timing-setting': '/settings?open=widget-timing',
  'exam-date': '/settings?open=exam-date',
};

// ── Calendar helpers (local calendar days, never hours) ──────────────────
/** 0 = Monday … 6 = Sunday for a "YYYY-MM-DD" day. */
export function weekdayIndex(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}
/** The Monday of the week holding `day`. */
export function mondayOf(day: string): string {
  return addDays(day, -weekdayIndex(day));
}
export const LEAF_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

/**
 * "Exam in 3 weeks": CALENDAR weeks (Monday to Monday), so the number changes
 * only on a Monday. Counted from 8 days out; under that the exam-week words
 * take over (no count). Null for no date, exam week, or after.
 */
export function weeksToExam(examDay: string | null, today: string): number | null {
  const left = daysToExam(examDay ?? undefined, today);
  if (left === null || left < 8 || !examDay) return null;
  return Math.max(1, Math.round(daysBetween(mondayOf(today), mondayOf(examDay)) / 7));
}
export function weeksText(weeks: number): string {
  return `${weeks} week${weeks === 1 ? '' : 's'}`;
}

/** Where the exam date sits for `today`. */
export type ExamPhase = 'none' | 'far' | 'week' | 'eve' | 'day' | 'after';
export function examPhase(examDay: string | null, today: string): ExamPhase {
  const left = daysToExam(examDay ?? undefined, today);
  if (left === null) return 'none';
  if (left < 0) return 'after';
  if (left === 0) return 'day';
  if (left === 1) return 'eve';
  if (left <= 7) return 'week';
  return 'far';
}

/**
 * THE wording for the exam phases. Every widget reads this table, so two
 * widgets on one screen never say different things. The eve follows the
 * app's own eve (the final review week's day 1, and the planner's light
 * review): a light touch, then rest. Never "You've done the work".
 */
export const EXAM_COPY = {
  week: { caption: 'Final week', title: 'Settle in. Don’t cram.', line: 'Short, light sessions this week.' },
  eve: { caption: 'Exam tomorrow', title: 'Light review, then rest.', line: 'Sleep helps memory settle.' },
  day: { caption: 'Exam day', title: 'Good luck.', line: 'One question at a time.' },
  after: { caption: 'Your exam', title: 'Exam done', line: 'Your progress stays on this phone.' },
} as const;

/**
 * The final review week's day titles, in plain words for a glance (the app's
 * own titles, such as "Pace check", need their page to make sense).
 */
export const FINAL_DAY_PLAIN: Record<number, string> = {
  7: 'A full practice exam, timed',
  6: 'Go over that exam’s misses',
  5: 'Work on your biggest gap',
  4: 'A short timed set, for pace',
  3: 'Practise reading questions closely',
  2: 'A light review, then plan the day',
};

// ── Faces ────────────────────────────────────────────────────────────────
/** The size a widget is drawn at, from its width and height in dp. */
export type SizeClass = 'tiny' | 'strip' | 'small' | 'medium' | 'large';
export function sizeClass(width: number, height: number): SizeClass {
  if (width < 125 && height < 125) return 'tiny';
  if (height < 115) return 'strip';
  if (width < 250) return 'small';
  if (height < 250) return 'medium';
  return 'large';
}
/** The learner's font size is large: layouts drop to fewer, shorter lines. */
export const BIG_TEXT = 1.3;

export interface FaceAction {
  label: string;
  /** Empty for an on-widget action (see `widgetAction`). */
  link: string;
  /** An action handled by the widget itself, no app opens (the reveal cards: reveal, self-check). */
  widgetAction?: 'REVEAL' | 'HAD' | 'NOTYET';
}
export type FaceArt =
  | { type: 'mark' }
  | { type: 'leaves'; filled: boolean[]; today: number }
  | { type: 'rings'; rings: number[]; weights: number[]; faint: boolean }
  | { type: 'plant'; plant: PlantSnap };

/**
 * The card each widget is drawn on (1.48 "Study card"): `forest` is Today's
 * plan only (the "do this now" signal); `card` is the ruled index card of the
 * two question widgets; `plate` the plant's botanical plate; `ink` the Road
 * to exam card; `paper` the rest.
 */
export type FaceTone = 'paper' | 'forest' | 'plate' | 'card' | 'ink';

/**
 * One widget's face: plain words and at most two actions. The layouts choose
 * the arrangement for the size; `short` and `shortLine` are the words for a
 * small widget or large text.
 */
export interface WidgetFace {
  kind: WidgetKind;
  tone: FaceTone;
  /** The small spaced label at the top ("Today · Operations", "Key term"). */
  caption: string;
  /** The main words (or, with titleStyle "number", the big figure). */
  title: string;
  /** How the title is set: serif (Fraunces), italic (a rule, an answer, calm words), number (a big figure), sans. */
  titleStyle: 'serif' | 'italic' | 'number' | 'sans';
  /** A unit after a number ("questions", "%"). */
  unit?: string;
  /** A shorter TITLE for a small widget or large text (never a detail line). */
  short?: string;
  /** An italic line right under the title (a key term's full name). */
  sub?: string;
  line?: string;
  /** A shorter detail LINE for a small widget (never a title). */
  shortLine?: string;
  /** A third, quiet line (medium and up). */
  line2?: string;
  /** A quiet italic note at the right of the top row, on wide widgets ("step 2 of 3", "6 weeks to go"). */
  aside?: string;
  /** A quiet chip ("New growth today"). */
  badge?: string;
  art?: FaceArt;
  /** Today's plan: its items as pips, and how many are done. */
  steps?: { total: number; done: number };
  /** Road to exam: weeks studied on the road so far, and weeks to go (the exam's week is the last). */
  road?: { behind: number; ahead: number };
  /**
   * The reveal cards (Today's rule, Recall card, Key term): hidden or shown.
   * The layouts put the reveal button and the Had it / Not yet pair in
   * different places, so a quick second tap can't land on the pair.
   */
  reveal?: 'hidden' | 'shown';
  /** The main pill. */
  action?: FaceAction;
  /** A second pill or quiet action (medium and up, or the self-check pair). */
  action2?: FaceAction;
  /** Tapping anywhere else. */
  link: string;
  /** Tapping anywhere else is an on-widget action (Today's rule before the reveal). */
  widgetAction?: FaceAction['widgetAction'];
  /** The word that must survive every size and text scale (the topic, the stage, the count). */
  key: string;
  /** One spoken summary for TalkBack, with the widget's state (minutes in full: see spokenMin). */
  label: string;
}

/** What the widget knows when it draws. */
export interface DrawContext {
  /** The phone's clock when the widget draws (only its calendar day is used). */
  now: number;
  /** A reveal card (rule, recall card, key term): this widget was revealed today. */
  revealed?: boolean;
  /** Today's rule or the Recall card: the learner's self-check today ("had" / "notyet"), if any. */
  judged?: 'had' | 'notyet';
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** "Start · 12 min": the minutes on the pill itself. */
const startLabel = (mins: number) => `Start · ${Math.max(1, Math.round(mins))} min`;
const SHORT_LINE = `${SHORT_SET.questions} questions · about ${SHORT_SET.minutes} min`;
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
/** "Monday, Tuesday and Wednesday". */
export function listWords(xs: readonly string[]): string {
  return xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

/** A face for a widget placed before the app has written anything (or before onboarding). */
function setupFace(kind: WidgetKind): WidgetFace {
  return {
    kind,
    tone: 'paper',
    caption: 'KaiSip',
    title: 'Open KaiSip to begin',
    short: 'Open KaiSip',
    titleStyle: 'serif',
    line: 'This fills in after your first visit.',
    art: { type: 'mark' },
    link: widgetLink(kind, 'today'),
    key: 'Open KaiSip',
    label: `${WIDGET_TITLES[kind]}. Open KaiSip to begin.`,
  };
}

/** The face for one widget kind, from the snapshot and the clock. */
export function widgetFace(kind: WidgetKind, s: WidgetSnapshot | null, ctx: DrawContext): WidgetFace {
  if (!s || !s.onboarded) return setupFace(kind);
  const today = dayKey(ctx.now);
  switch (kind) {
    case 'plan':
      return planFace(s, today);
    case 'week':
      return weekFace(s, today);
    case 'readiness':
      return readinessFace(s, today);
    case 'think':
      return thinkFace(s, today, ctx);
    case 'question':
      return recallFace(s, today, ctx);
    case 'revisit':
      return termFace(s, today, ctx);
    case 'plant':
      return plantFace(s, today);
    case 'countdown':
      return roadFace(s, today);
  }
}

/** Details off: general words only on every face. */
const hidden = (s: WidgetSnapshot) => s.prefs.details === 'hide';
/** Exam words may show: the learner turned exam timing on, and details are on. */
export const showsTiming = (s: WidgetSnapshot) => s.prefs.timing && !hidden(s);
/** Today's plan from the snapshot, only if it IS today's (yesterday's plan is never shown as today's). */
const todaysPlan = (s: WidgetSnapshot, today: string) => (s.plan && s.plan.day === today ? s.plan : null);
/** The day before today's, if the snapshot's plan is from then: its `next` is this morning's plan. */
const yesterdaysPlan = (s: WidgetSnapshot, today: string) => (s.plan && s.plan.day === addDays(today, -1) ? s.plan : null);
/** Whole days with no study before today (calendar), or null with no study day on record. */
export function daysSinceStudy(s: WidgetSnapshot, today: string): number | null {
  const before = s.week.days.filter((d) => d < today);
  if (s.week.days.includes(today)) return 0;
  if (!before.length) return null;
  return daysBetween(before[before.length - 1], today) - 1;
}

/** Which days of THIS week (Monday first) had study, and today's place in it. */
export function weekLeaves(days: readonly string[], today: string): { filled: boolean[]; today: number; count: number } {
  const monday = mondayOf(today);
  const set = new Set(days);
  const filled = Array.from({ length: 7 }, (_, i) => set.has(addDays(monday, i)) && daysBetween(addDays(monday, i), today) >= 0);
  return { filled, today: weekdayIndex(today), count: filled.filter(Boolean).length };
}

// 1. Today's plan (the one forest card, and the only Start) ──────────────
function planFace(s: WidgetSnapshot, today: string): WidgetFace {
  const kind: WidgetKind = 'plan';
  const phase = examPhase(s.examDay, today);
  const timing = showsTiming(s);
  const base = { kind, tone: 'forest' as const, titleStyle: 'serif' as const, link: widgetLink(kind, 'today') };
  const shortAction = { label: SHORT_LINE.replace(' · about ', ' · '), link: widgetLink(kind, 'short') };
  // Exam day (with exam timing): the shared words, no Start. After the exam the plan is the plan again.
  if (timing && phase === 'day') {
    const c = EXAM_COPY.day;
    return { ...base, caption: c.caption, title: c.title, titleStyle: 'italic', line: c.line, key: 'Good', label: `Today’s plan. ${c.caption}. ${c.title} ${c.line}` };
  }
  const plan = todaysPlan(s, today);
  const lapsed = (daysSinceStudy(s, today) ?? 0) >= LAPSE_DAYS;
  if (!plan) {
    // The app has not opened yet today. The plan written yesterday names what comes next.
    const prev = yesterdaysPlan(s, today);
    const mins = prev?.nextMin || s.minutes;
    const title = !hidden(s) && prev?.next ? prev.next : 'Your plan is ready';
    // The tap never runs the short set in the exam's final days (lib/widgetOpen.ts), so don't offer it then.
    const canShort = phase !== 'week' && phase !== 'eve' && phase !== 'day';
    const shortFirst = lapsed && canShort;
    const main = shortFirst ? shortAction : { label: startLabel(mins), link: widgetLink(kind, 'start') };
    return {
      ...base,
      caption: 'Today',
      title,
      short: !hidden(s) && prev?.next ? undefined : 'Plan ready',
      line: aboutMin(mins),
      action: main,
      action2: shortFirst
        ? { label: `Full plan · ${mins} min`, link: widgetLink(kind, 'start') }
        : canShort
          ? { label: `Short on time? ${SHORT_SET.questions} questions`, link: widgetLink(kind, 'short') }
          : undefined,
      key: title === 'Your plan is ready' ? 'Plan' : title.split(' ')[0],
      label: spokenMin(`Today’s plan, ready: ${title}, about ${mins} min.${shortFirst ? ` Or start with ${SHORT_SET.questions} questions.` : ''}`),
    };
  }
  const steps = plan.steps > 1 ? { total: plan.steps, done: Math.min(plan.stepsDone, plan.steps) } : undefined;
  if (plan.done) {
    // "Plan done": still true after midnight, and the next line is the next morning's plan.
    const next = !hidden(s) && plan.next ? `Next: ${plan.next}${plan.nextMin ? `, about ${plan.nextMin} min` : ''}.` : 'Rest now. The next plan will be here.';
    return {
      ...base,
      caption: 'Today',
      title: 'Plan done.',
      titleStyle: 'italic',
      line: next,
      steps,
      key: 'done',
      label: spokenMin(`Today’s plan, done. ${next}`),
    };
  }
  const mins = plan.left || s.minutes;
  const start = { label: startLabel(mins), link: widgetLink(kind, 'start') };
  const stepWords = steps ? `step ${Math.min(steps.done + 1, steps.total)} of ${steps.total}` : '';
  if (plan.first) {
    return {
      ...base,
      caption: 'Start here',
      title: 'Your first 5 questions',
      short: 'First 5',
      line: 'No timer. Just see where you start.',
      action: start,
      key: 'first',
      label: spokenMin(`Today’s plan, start here: your first 5 questions, about ${mins} min. No timer.`),
    };
  }
  // "5 questions" leads only when the tap can really run it (the plan's own shortSet: never in exam week).
  const shortFirst = lapsed && plan.shortSet;
  if (hidden(s)) {
    return {
      ...base,
      caption: 'Today',
      title: 'Your study plan',
      short: 'Study plan',
      line: aboutMin(mins),
      steps,
      aside: stepWords || undefined,
      action: shortFirst ? shortAction : start,
      key: 'plan',
      label: spokenMin(`Today’s plan${stepWords ? `, ${stepWords}` : ''}: your study plan, about ${mins} min.`),
    };
  }
  // The eve (with exam timing): the shared words; Start is the plan's own light review.
  if (timing && phase === 'eve') {
    const c = EXAM_COPY.eve;
    return { ...base, caption: c.caption, title: c.title, titleStyle: 'italic', line: c.line, action: start, key: 'rest', label: spokenMin(`Today’s plan. ${c.caption}. ${c.title} ${c.line} About ${mins} min.`) };
  }
  // On a shared screen the plan names what comes back, never what was missed.
  const back = plan.back > 0 ? `Starts with ${plural(plan.back, 'question')} to revisit.` : null;
  const weekLine = timing && phase === 'week' && plan.finalDay ? plan.finalDay : null;
  const line = weekLine ?? back ?? plan.meta;
  const weeks = timing ? weeksToExam(s.examDay, today) : null;
  const examLine = weeks ? `Exam in ${weeksText(weeks)}` : undefined;
  const topic = plan.short || plan.title;
  const counted = plan.count > 0;
  const task = counted ? `${plural(plan.count, 'question')}` : plan.title || 'Your study plan';
  return {
    ...base,
    caption: timing && phase === 'week' ? EXAM_COPY.week.caption : topic ? `Today · ${topic}` : 'Today',
    title: counted ? String(plan.count) : task,
    titleStyle: counted ? 'number' : 'serif',
    unit: counted ? (plan.count === 1 ? 'question' : 'questions') : undefined,
    short: counted ? task : plan.short || undefined,
    line: `About ${mins} min left. ${line}`.trim(),
    shortLine: aboutMin(mins),
    line2: examLine,
    steps,
    aside: stepWords || undefined,
    action: shortFirst ? shortAction : start,
    action2: shortFirst
      ? { label: `Full plan · ${mins} min`, link: widgetLink(kind, 'start') }
      : plan.shortSet && phase !== 'week'
        ? { label: `Short on time? ${SHORT_SET.questions} questions`, link: widgetLink(kind, 'short') }
        : undefined,
    key: counted ? String(plan.count) : plan.short || plan.title.split(' ')[0] || 'plan',
    label: spokenMin(`Today’s plan${stepWords ? `, ${stepWords}` : ''}: ${task}${counted && topic ? ` in ${plan.title || topic}` : ''}, about ${mins} min. ${line}${examLine ? ` ${examLine}.` : ''}`),
  };
}

// 2. This week (the only leaves) ──────────────────────────────────────────
/** The week's line: it changes as the week fills, and is only ever neutral or kind. */
export function weekLine(count: number, studiedToday: boolean): string {
  if (count >= 6 && !studiedToday) return 'Today can be your rest day.';
  if (count >= 6) return 'A full week of leaves.';
  if (count >= 4) return 'A steady week.';
  if (count >= 2) return 'Short days count too.';
  return 'A first leaf this week.';
}

function weekFace(s: WidgetSnapshot, today: string): WidgetFace {
  const kind: WidgetKind = 'week';
  const phase = examPhase(s.examDay, today);
  // No Start here (Today's plan is the one place that starts): a tap opens Today.
  const base = { kind, tone: 'paper' as const, titleStyle: 'serif' as const, caption: 'This week', link: widgetLink(kind, 'today') };
  // From 7 days out to exam day the leaves rest: exam week stays calm. Exam words only with timing.
  // After the exam, the week is a normal week again.
  if (phase === 'week' || phase === 'eve' || phase === 'day') {
    if (showsTiming(s)) {
      const c = EXAM_COPY[phase];
      return { ...base, caption: c.caption, title: c.title, titleStyle: 'italic', line: c.line, art: { type: 'mark' }, key: c.title.split(' ')[0], label: `This week. ${c.caption}. ${c.title} ${c.line}` };
    }
    return { ...base, title: 'A calm week', line: 'Short days count too.', art: { type: 'mark' }, key: 'calm', label: 'This week. A calm week. Short days count too.' };
  }
  // Fewer than 2 study days ever: the first-set line, no leaves (the Today rule).
  if (s.week.total < 2) {
    const first = Boolean(todaysPlan(s, today)?.first) || s.week.total === 0;
    const title = first ? 'Your first 5 questions' : 'Your week starts here';
    return { ...base, title, short: first ? 'First 5' : 'Start here', line: SHORT_LINE, art: { type: 'mark' }, key: first ? '5' : 'week', label: `This week. ${title}. ${SHORT_LINE}.` };
  }
  const { filled, today: ti, count } = weekLeaves(s.week.days, today);
  // Never an empty row: a week with no study yet says so in words.
  if (count === 0) {
    const monday = ti === 0;
    const title = monday ? 'A new week' : 'A short start';
    return { ...base, title, line: SHORT_LINE, art: { type: 'mark' }, key: monday ? 'new' : 'short', label: `This week. ${title}. ${SHORT_LINE}.` };
  }
  const leaves: FaceArt = { type: 'leaves', filled, today: ti };
  const studied = DAY_NAMES.filter((_, i) => filled[i]);
  if (hidden(s)) {
    return { ...base, title: 'Your week', short: 'Week', line: 'A leaf for each day you studied.', shortLine: 'Leaf = a study day', art: leaves, key: 'week', label: `This week: you studied ${listWords(studied)}.` };
  }
  const line = weekLine(count, filled[ti]);
  return {
    ...base,
    title: String(count),
    titleStyle: 'number',
    unit: count === 1 ? 'study day' : 'study days',
    short: `${count} this week`,
    line,
    aside: line,
    art: leaves,
    key: String(count),
    label: `This week: ${plural(count, 'study day')}. You studied ${listWords(studied)}. ${line}`,
  };
}

// 3. Readiness (opt-in on add; rings only by default) ─────────────────────
/** From this many days before the exam the number rests (rings only), whatever was chosen. */
export const READINESS_REST_DAYS = 21;
/** The rings' changing line: what grew this week, or a plain note. Never what shrank. */
export function ringsLine(grew: string | undefined, topics: boolean): string {
  if (!grew) return 'Each ring is one area.';
  return topics ? `${grew} grew this week.` : 'Your rings grew this week.';
}

function readinessFace(s: WidgetSnapshot, today: string): WidgetFace {
  const kind: WidgetKind = 'readiness';
  const base = { kind, tone: 'paper' as const, titleStyle: 'serif' as const, caption: 'Readiness', link: widgetLink(kind, 'readiness') };
  const r = s.ready;
  if (s.prefs.readiness === 'off' || !r) {
    return {
      ...base,
      title: 'Choose how it shows',
      short: 'Choose',
      line: 'Rings only, or with your range. Tap to choose.',
      shortLine: 'Tap to choose.',
      art: { type: 'mark' },
      link: widgetLink(kind, 'readiness-setting'),
      key: 'Choose',
      label: 'Readiness widget. Choose how it shows: rings only, or with your range.',
    };
  }
  const rings: FaceArt = { type: 'rings', rings: r.rings, weights: r.weights, faint: !r.enough };
  if (!r.enough) {
    const more = `${plural(r.needed, 'more answer')} to a first estimate`;
    return { ...base, title: 'Your rings grow as you answer', short: 'Rings grow', line: `${more}. Any topic counts.`, shortLine: more, art: rings, key: 'Rings', label: `Readiness, a study estimate: ${more}. Any topic counts.` };
  }
  const grew = ringsLine(r.grew, !hidden(s));
  const left = daysToExam(s.examDay ?? undefined, today);
  const resting = left !== null && left >= 0 && left <= READINESS_REST_DAYS;
  if (s.prefs.readiness === 'private' || hidden(s) || resting) {
    const why = resting
      ? showsTiming(s)
        ? 'The number rests until your exam.'
        : 'The number rests for now.'
      : hidden(s)
        ? 'You chose to hide details.'
        : 'You chose to hide the number.';
    // The face doesn't repeat the learner's own choice back at every glance; TalkBack still says it.
    // "Rings growing" only when one really grew this week; otherwise a calm, neutral title (never a false claim).
    return { ...base, title: r.grew ? 'Rings growing' : 'Your rings', line: resting ? why : grew, line2: resting ? grew : undefined, art: rings, key: 'Rings', label: `Readiness, a study estimate, rings only. ${why} ${grew} Tap to see it.` };
  }
  return {
    ...base,
    title: `${r.low}–${r.high}`,
    titleStyle: 'number',
    unit: '%',
    line: 'A study estimate, not a prediction.',
    // The qualifier the range always keeps, at every size and text scale (DESIGN_SYSTEM §20.3).
    shortLine: 'A study estimate',
    line2: grew,
    art: rings,
    key: `${r.low}–${r.high}`,
    label: `Readiness between ${r.low} and ${r.high} percent. A study estimate, not a prediction. ${grew}`,
  };
}

// 4. Today's rule (was Think first) ───────────────────────────────────────
/** A word (4+ letters) the prompt and its short form share, so the key survives whichever one is drawn. */
export function sharedWord(ask: string, short: string): string {
  const words = short.match(/[A-Za-z’']{4,}/g) ?? [];
  return words.find((w) => ask.toLowerCase().includes(w.toLowerCase())) ?? '';
}
/** TalkBack: the reveal is its own button on the Recall card and the Key term (the card itself opens the app). */
export const NEXT_BUTTON = (label: string) => `${label} is the next button.`;

/** The calm line on the exam eve and exam day (no new material then). */
export const EXAM_CUE_TITLE = 'One question at a time.';
export const EXAM_CUE_LINE = 'Read the last sentence first: it says what is being asked.';

function thinkFace(s: WidgetSnapshot, today: string, ctx: DrawContext): WidgetFace {
  const kind: WidgetKind = 'think';
  const phase = examPhase(s.examDay, today);
  const base = { kind, tone: 'card' as const, caption: 'Today’s rule' };
  if (phase === 'eve' || phase === 'day') {
    return { ...base, caption: showsTiming(s) ? EXAM_COPY[phase].caption : 'Today’s rule', title: EXAM_CUE_TITLE, titleStyle: 'italic', line: EXAM_CUE_LINE, shortLine: 'Read the last sentence first.', link: widgetLink(kind, 'today'), key: 'One', label: `Today’s rule. ${EXAM_CUE_TITLE} ${EXAM_CUE_LINE}` };
  }
  const e = s.think.find((t) => t.day === today);
  if (!e) {
    return { ...base, title: 'A new rule each morning', titleStyle: 'italic', line: 'Open KaiSip once to load the next few.', link: widgetLink(kind, 'principles'), key: 'rule', label: 'Today’s rule. A new rule each morning: open KaiSip once to load the next few.' };
  }
  const card = widgetLink(kind, 'principle', e.id);
  if (hidden(s)) {
    return { ...base, title: 'Today’s rule is ready', titleStyle: 'serif', short: 'Rule ready', line: 'Open it in KaiSip.', link: card, key: 'rule', label: 'Today’s rule is ready. Open it in KaiSip.' };
  }
  if (!ctx.revealed) {
    // One prompt per face, at every size: the question itself (its short form on a small widget).
    return {
      ...base,
      title: e.ask,
      short: e.short,
      titleStyle: 'serif',
      reveal: 'hidden',
      action: { label: 'Show the rule', link: '', widgetAction: 'REVEAL' },
      link: '',
      widgetAction: 'REVEAL',
      key: sharedWord(e.ask, e.short),
      label: `Today’s rule, hidden. ${e.ask} Double-tap to show the rule.`,
    };
  }
  const tryOne = e.try ? { label: 'Try one', link: widgetLink(kind, 'question', e.try) } : { label: 'See the card', link: card };
  if (!ctx.judged) {
    // The self-check: no app opens, nothing is earned, never shown as progress.
    return {
      ...base,
      title: `${e.title}.`,
      titleStyle: 'italic',
      line: e.rule,
      reveal: 'shown',
      action: { label: 'Had it', link: '', widgetAction: 'HAD' },
      action2: { label: 'Not yet', link: '', widgetAction: 'NOTYET' },
      link: card,
      key: e.title.split(' ')[0],
      label: `Today’s rule, shown: ${e.title}. ${e.rule} Did you have it?`,
    };
  }
  return {
    ...base,
    title: `${e.title}.`,
    titleStyle: 'italic',
    line: e.rule,
    line2: ctx.judged === 'notyet' ? 'It comes back in a few days.' : 'A new one each morning.',
    reveal: 'shown',
    action: tryOne,
    link: card,
    key: e.title.split(' ')[0],
    label: `Today’s rule, checked: ${e.title}. ${e.rule}`,
  };
}

// 5. Recall card (was Quick question): something answered right, 2+ weeks ago ──
/** The Recall card for today, if the snapshot has one. */
export function recallFor(s: WidgetSnapshot | null, now: number): RecallSnap | null {
  const today = dayKey(now);
  return s?.recall.find((r) => r.day === today) ?? null;
}

function recallFace(s: WidgetSnapshot, today: string, ctx: DrawContext): WidgetFace {
  const kind: WidgetKind = 'question';
  const phase = examPhase(s.examDay, today);
  const base = { kind, tone: 'card' as const, caption: 'Recall card', titleStyle: 'serif' as const, link: widgetLink(kind, 'today') };
  if (phase === 'eve' || phase === 'day') {
    return { ...base, title: 'Nothing to recall today', short: 'Nothing today', line: 'Rest is part of the plan.', key: 'Nothing', label: 'Recall card. Nothing to recall today. Rest is part of the plan.' };
  }
  if (s.recall.length === 0) {
    // Nothing answered right long enough ago yet: a calm promise, never a gap.
    return { ...base, title: 'Questions you get right come back here', short: 'Right answers return', line: 'About two weeks later, to recall.', key: 'come back', label: 'Recall card. Questions you get right come back here about two weeks later, to recall.' };
  }
  const r = s.recall.find((x) => x.day === today);
  if (!r) {
    return { ...base, title: 'A new card each morning', short: 'New each morning', line: 'Open KaiSip once to load the next few.', key: 'card', label: 'Recall card. A new card each morning: open KaiSip once to load the next few.' };
  }
  const open = widgetLink(kind, 'question', r.id);
  if (hidden(s)) {
    return { ...base, title: 'A recall card is ready', short: 'Card ready', line: 'Open it in KaiSip.', link: open, key: 'card', label: 'Recall card. A card is ready: open it in KaiSip.' };
  }
  const ago = `${r.weeks} weeks ago`;
  if (!ctx.revealed) {
    return {
      ...base,
      title: r.stem,
      aside: ago,
      reveal: 'hidden',
      action: { label: 'Show the answer', link: '', widgetAction: 'REVEAL' },
      link: open,
      key: r.stem.split(' ')[0],
      // TalkBack: double-tapping the card opens the app; "Show the answer" is its own button (forNarrowStrip rewrites this where the whole card reveals).
      label: `Recall card, answer hidden, from ${ago}. ${r.stem} Think of the answer. ${NEXT_BUTTON('Show the answer')} Double-tap the card to open it in KaiSip.`,
    };
  }
  const cue = r.cue ? `Exam cue: ${r.cue}` : undefined;
  if (!ctx.judged) {
    return {
      ...base,
      title: r.answer,
      titleStyle: 'italic',
      line: cue,
      aside: ago,
      reveal: 'shown',
      action: { label: 'Had it', link: '', widgetAction: 'HAD' },
      action2: { label: 'Not yet', link: '', widgetAction: 'NOTYET' },
      link: open,
      key: r.answer.split(' ')[0],
      label: `Recall card, shown. The answer: ${r.answer}.${cue ? ` ${cue}` : ''} Did you have it?`,
    };
  }
  return {
    ...base,
    title: r.answer,
    titleStyle: 'italic',
    line: cue,
    line2: ctx.judged === 'notyet' ? 'It comes back in a few days.' : 'A new card tomorrow.',
    reveal: 'shown',
    action: { label: 'See why', link: open },
    link: open,
    key: r.answer.split(' ')[0],
    label: `Recall card, checked. The answer: ${r.answer}.${cue ? ` ${cue}` : ''}`,
  };
}

// 6. Key term (was Questions to revisit): the exam's language, one term a day ──
function termFace(s: WidgetSnapshot, today: string, ctx: DrawContext): WidgetFace {
  const kind: WidgetKind = 'revisit';
  const phase = examPhase(s.examDay, today);
  const base = { kind, tone: 'paper' as const, caption: 'Key term', titleStyle: 'serif' as const, link: widgetLink(kind, 'notes') };
  if (phase === 'eve' || phase === 'day') {
    return { ...base, title: 'Nothing new today', short: 'Nothing new', line: 'Rest is part of the plan.', link: widgetLink(kind, 'today'), key: 'Nothing', label: 'Key term. Nothing new today. Rest is part of the plan.' };
  }
  const t = s.terms.find((x) => x.day === today);
  if (!t) {
    return { ...base, title: 'A new term each morning', short: 'New each morning', line: 'Open KaiSip once to load the next few.', key: 'term', label: 'Key term. A new term each morning: open KaiSip once to load the next few.' };
  }
  const note = widgetLink(kind, 'note', t.note);
  if (hidden(s)) {
    // A term names today's topic: with details off it stays in the app.
    return { ...base, title: 'Today’s key term is ready', short: 'Term ready', line: 'Open it in KaiSip.', link: note, key: 'term', label: 'Key term. Today’s term is ready: open it in KaiSip.' };
  }
  const full = t.short ? `${t.term} (${t.short})` : t.term;
  if (!ctx.revealed) {
    return {
      ...base,
      title: t.short ?? t.term,
      sub: t.short ? t.term : undefined,
      aside: t.topic || undefined,
      reveal: 'hidden',
      action: { label: 'Show the meaning', link: '', widgetAction: 'REVEAL' },
      link: note,
      key: t.short ?? t.term.split(' ')[0],
      label: `Key term, meaning hidden: ${full}. ${NEXT_BUTTON('Show the meaning')} Double-tap the card to open its note in KaiSip.`,
    };
  }
  return {
    ...base,
    title: t.term,
    sub: t.short,
    line: t.meaning,
    line2: 'A new term each morning.',
    aside: t.topic || undefined,
    reveal: 'shown',
    link: note,
    key: t.short ?? t.term.split(' ')[0],
    label: `Key term, shown: ${full}. ${t.meaning}`,
  };
}

// 7. Your plant (never the resting look) ──────────────────────────────────
export const GROWTH_WORDS = ['Seed', 'Sprout', 'Shoot', 'Bough', 'Crown', 'Elder'] as const;
/** The plant's one line, said at most once on a face. */
export const PLANT_LINE = 'Grows as answers stick';

function plantFace(s: WidgetSnapshot, today: string): WidgetFace {
  const kind: WidgetKind = 'plant';
  const base = { kind, tone: 'plate' as const, titleStyle: 'serif' as const, caption: 'Your plant' };
  const p = s.plant;
  if (!p) {
    return { ...base, title: 'Choose your plant', short: 'Choose a plant', line: 'It grows only from real progress.', art: { type: 'mark' }, link: widgetLink(kind, 'plant-pick'), key: 'plant', label: 'Your plant. Choose your plant: it grows only from real progress.' };
  }
  if ('off' in p) {
    return { ...base, title: 'Plant is off', short: 'Plant off', line: 'You can turn it on in Settings.', art: { type: 'mark' }, link: widgetLink(kind, 'plant-settings'), key: 'off', label: 'Your plant is off. You can turn it on in Settings.' };
  }
  const stage = Math.max(1, Math.min(6, p.growth));
  const word = GROWTH_WORDS[stage - 1];
  const grewToday = p.grew === today;
  // The line moves with the plant: the next stage, and the day it grew.
  const next = stage < 6 ? `${GROWTH_WORDS[stage]} is next` : 'Fully grown';
  return {
    ...base,
    caption: `Your ${p.name}`,
    title: word,
    sub: `Fig. ${stage}`,
    line: `${next}.`,
    badge: grewToday ? 'New growth today' : undefined,
    art: { type: 'plant', plant: p },
    link: widgetLink(kind, 'plant'),
    key: word,
    label: `Your ${p.name}, at stage ${stage}, ${word.toLowerCase()}.${grewToday ? ' New growth today.' : ''} ${next}. ${PLANT_LINE}.`,
  };
}

// 8. Road to exam (was Exam countdown; exam timing on; calendar weeks) ─────
/** This week's focus in words, from the plan engine's stage. Plain, and never a deficit. */
export const ROAD_FOCUS: Record<RoadStage, { title: string; line: string }> = {
  diagnose: { title: 'Find your starting point', line: 'A few questions from every area.' },
  learn: { title: 'Learn the concepts', line: 'Short lessons, then a few questions.' },
  practice: { title: 'Make it stick', line: 'Mixed practice across every area.' },
  mock: { title: 'Rehearse the exam', line: 'A timed practice exam this week.' },
  ready: { title: 'Keep it steady', line: 'Short sets keep it fresh.' },
};
/** The road shows at most this many weeks behind (the rest are folded away). */
export const ROAD_BEHIND_MAX = 12;

function roadFace(s: WidgetSnapshot, today: string): WidgetFace {
  const kind: WidgetKind = 'countdown';
  const base = { kind, tone: 'ink' as const, titleStyle: 'serif' as const, caption: 'Road to exam', link: widgetLink(kind, 'today') };
  if (!s.prefs.timing) {
    // Exam timing is off (turned off in Settings after adding): no exam word on the screen, one tap to choose.
    return { ...base, tone: 'paper', caption: 'KaiSip', title: 'Choose what this shows', short: 'Choose', line: 'Tap to choose in KaiSip.', shortLine: 'Tap to choose.', art: { type: 'mark' }, link: widgetLink(kind, 'timing-setting'), key: 'Choose', label: 'KaiSip widget. Tap to choose what it shows.' };
  }
  const plan = todaysPlan(s, today);
  const mins = plan && !plan.done ? plan.left || s.minutes : s.minutes;
  // Details off: no exam on the screen, today's plan only (no Start: Today's plan has the one Start).
  if (hidden(s)) {
    return { ...base, caption: 'Your plan', title: plan?.done ? 'Plan done' : `About ${mins} min today`, short: plan?.done ? 'Done' : `${mins} min`, key: plan?.done ? 'done' : 'min', label: plan?.done ? 'Your plan. Plan done.' : spokenMin(`Your plan. About ${mins} min today.`) };
  }
  const phase = examPhase(s.examDay, today);
  if (phase === 'none') {
    return { ...base, caption: 'Your exam', title: 'No exam date yet', short: 'No date', line: 'Add one in Settings when you know it.', link: widgetLink(kind, 'exam-date'), key: 'date', label: 'Road to exam. No exam date yet: add one in Settings when you know it.' };
  }
  if (phase === 'after' || phase === 'day' || phase === 'eve' || phase === 'week') {
    const c = EXAM_COPY[phase];
    return {
      ...base,
      caption: c.caption,
      title: c.title,
      titleStyle: phase === 'after' ? 'serif' : 'italic',
      line: c.line,
      link: widgetLink(kind, phase === 'week' ? 'exam-week' : 'today'),
      key: c.title.split(' ')[0],
      label: `Road to exam. ${c.caption}. ${c.title} ${c.line}`,
    };
  }
  const weeks = weeksToExam(s.examDay, today) ?? 1;
  const behind = s.road ? Math.max(0, Math.min(ROAD_BEHIND_MAX, Math.round(daysBetween(mondayOf(s.road.from), mondayOf(today)) / 7))) : 0;
  const focus = ROAD_FOCUS[s.road?.stage ?? 'practice'];
  const togo = `${weeksText(weeks)} to go`;
  return {
    ...base,
    title: focus.title,
    short: focus.title,
    line: focus.line,
    aside: togo,
    road: { behind, ahead: weeks },
    key: weeksText(weeks),
    label: `Road to exam: ${togo}${behind ? `, ${plural(behind, 'week')} on the road so far` : ''}. This week: ${focus.title.toLowerCase()}. ${focus.line}`,
  };
}

// 9. Lock-screen accessory (designed; built later for iOS, and Android 16 QPR2+) ──
/**
 * The lock screen is the most public surface: only "KaiSip", the plan's
 * minutes and abstract leaves. Never readiness, the exam, a topic, a count or a name.
 */
export interface LockFace {
  /** iOS accessoryInline: the line above the clock. */
  inline: string;
  /** iOS accessoryCircular: the week's seven leaves, or the mark (never an empty ring). */
  circular: { type: 'leaves'; filled: boolean[]; today: number } | { type: 'mark' };
}
export function lockFace(s: WidgetSnapshot | null, now: number): LockFace {
  if (!s || !s.onboarded) return { inline: 'KaiSip', circular: { type: 'mark' } };
  const today = dayKey(now);
  const phase = examPhase(s.examDay, today);
  const plan = todaysPlan(s, today);
  const calm = phase === 'week' || phase === 'eve' || phase === 'day' || phase === 'after';
  const inline = phase === 'day' || phase === 'after' ? 'KaiSip' : plan?.done ? 'KaiSip · plan done' : `KaiSip · about ${plan?.left || s.minutes} min`;
  const { filled, today: ti, count } = weekLeaves(s.week.days, today);
  const leavesOk = count > 0 && s.week.total >= 2 && !calm;
  return { inline, circular: leavesOk ? { type: 'leaves', filled, today: ti } : { type: 'mark' } };
}

/** Every link a face can hold (for tests: each must open a real screen). */
export function faceLinks(f: WidgetFace): string[] {
  return [f.link, f.action?.link, f.action2?.link].filter((l): l is string => typeof l === 'string' && l.length > 0);
}

// ── The one "add a widget" suggestion ──────────────────────────────────────
/** From this many study days, a cleared day may suggest a widget (behavior.md rule 10b). */
export const OFFER_FROM_STUDY_DAYS = 3;

/**
 * The app suggests a home-screen widget AT MOST ONCE, ever: on Today's
 * clearing (today's plan done) from the 3rd study day, never in exam week,
 * never beside another Today invitation, and never to a learner who already
 * has a widget. Once shown it never comes back, whatever the answer.
 */
export function widgetOfferDue(i: { supported: boolean; shown: boolean; studyDays: number; cleared: boolean; daysLeft: number | null; placed: boolean; otherSetup: boolean }): boolean {
  if (!i.supported || i.shown || i.placed || i.otherSetup || !i.cleared) return false;
  if (i.studyDays < OFFER_FROM_STUDY_DAYS) return false;
  return i.daysLeft === null || i.daysLeft > 7;
}

/** "Keep your readiness number on your home screen?" asked ONCE, this many days after choosing to show it. */
export const READINESS_REASK_DAYS = 30;
export function readinessReaskDue(i: { pref: ReadinessPref; shownSince?: string; asked: boolean; today: string; placed: boolean }): boolean {
  if (i.pref !== 'show' || i.asked || !i.placed || !i.shownSince) return false;
  return daysBetween(i.shownSince, i.today) >= READINESS_REASK_DAYS;
}

// ── The reveal cards: reveal marks and the self-check (written by the widget, never a study store) ──
/**
 * Which reveal widgets (Today's rule, and since 1.48 the Recall card and the
 * Key term) were revealed TODAY (a new day starts hidden again; widget ids are
 * unique across all widgets), the learner's "Had it" / "Not yet" per rule and
 * (1.48) per recall question, and a local count of reveals per rule for the
 * beta measurement plan. None of it is progress, and none is shown as a score.
 */
export interface SelfCheck {
  had: number;
  notYet: number;
  /** The last answer and its day. */
  last: 'had' | 'notyet';
  on: string;
}
export interface RevealState {
  day: string;
  ids: number[];
  counts: Record<string, number>;
  self: Record<string, SelfCheck>;
  /**
   * When each widget (by id) was revealed today, in ms (mobile 1.47.1). Lets
   * the widget ignore a quick second tap on "Show the rule", which lands on
   * "Had it" in the same spot. Optional: marks saved by 1.47.0 have none.
   */
  at?: Record<string, number>;
  /**
   * The Recall card's "Had it" / "Not yet", per question id (mobile 1.48).
   * Optional and added beside `self`: marks saved by 1.47 have none.
   */
  recall?: Record<string, SelfCheck>;
  /**
   * Which card each revealed widget (by id) showed when it was revealed today
   * (mobile 1.48): a rule id, a recall question id or a term id. A reveal
   * belongs to its card, so a widget whose card changes starts hidden again.
   * Optional: marks saved by 1.47 have none (they stay revealed, as before).
   */
  cards?: Record<string, string>;
}

/** Self-checks kept per field (the newest ones); older ones drop off. */
export const SELF_CHECKS_KEPT = 64;
/**
 * A self-check older than this many days is forgotten: well past the longest
 * rest (60 days for a recall card checked twice), so it no longer changes anything.
 */
export const SELF_CHECK_DAYS = 120;

/** "Had it" / "Not yet" this soon after the same widget's reveal is the reveal's double tap, not an answer. */
export const REVEAL_TAP_GUARD_MS = 2000;

/** The saved marks, read safely; reveal marks from another day are dropped (counts and self-checks stay). */
export function readReveal(raw: unknown, today: string): RevealState {
  let x: unknown = raw;
  if (typeof x === 'string') {
    try {
      x = JSON.parse(x);
    } catch {
      x = null;
    }
  }
  const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
  const counts: Record<string, number> = {};
  if (o.counts && typeof o.counts === 'object') {
    for (const [k, v] of Object.entries(o.counts as Record<string, unknown>).slice(0, 64)) {
      if (LINK_ID.test(k) && typeof v === 'number' && Number.isFinite(v)) counts[k] = Math.max(0, Math.min(9999, Math.round(v)));
    }
  }
  // The self-checks: only well-formed ones, none older than SELF_CHECK_DAYS, and the
  // NEWEST SELF_CHECKS_KEPT (by day). Keeping the oldest instead would lose every new
  // check once the list was full (fixed in 1.48 QA).
  const checks = (field: unknown): Record<string, SelfCheck> => {
    const valid: [string, SelfCheck][] = [];
    if (!field || typeof field !== 'object' || Array.isArray(field)) return {};
    for (const [k, v] of Object.entries(field as Record<string, unknown>)) {
      const e = v as Record<string, unknown>;
      if (!LINK_ID.test(k) || !e || typeof e !== 'object' || !isDay(e.on) || (e.last !== 'had' && e.last !== 'notyet')) continue;
      if (e.on <= today && daysBetween(e.on, today) > SELF_CHECK_DAYS) continue;
      valid.push([k, { had: num(e.had, 0, 9999), notYet: num(e.notYet, 0, 9999), last: e.last, on: e.on }]);
    }
    // Newest day first; on the same day, the later-saved one first. Then back to oldest-first order.
    const kept = valid
      .map((x, i) => ({ x, i }))
      .sort((a, b) => (a.x[1].on === b.x[1].on ? b.i - a.i : a.x[1].on < b.x[1].on ? 1 : -1))
      .slice(0, SELF_CHECKS_KEPT)
      .sort((a, b) => a.i - b.i);
    return Object.fromEntries(kept.map(({ x }) => x));
  };
  const self = checks(o.self);
  const recall = checks(o.recall);
  const ids = o.day === today ? arr<unknown>(o.ids).filter((n): n is number => Number.isInteger(n)).slice(0, 32) : [];
  // Reveal times are today's only, like the marks; anything odd is dropped.
  const at: Record<string, number> = {};
  if (o.day === today && o.at && typeof o.at === 'object') {
    for (const [k, v] of Object.entries(o.at as Record<string, unknown>).slice(0, 32)) {
      if (/^-?\d{1,10}$/.test(k) && typeof v === 'number' && Number.isFinite(v)) at[k] = v;
    }
  }
  // Which card each widget revealed: today's only, like the marks (1.48 QA).
  const cards: Record<string, string> = {};
  if (o.day === today && o.cards && typeof o.cards === 'object') {
    for (const [k, v] of Object.entries(o.cards as Record<string, unknown>).slice(0, 32)) {
      if (/^-?\d{1,10}$/.test(k) && typeof v === 'string' && LINK_ID.test(v)) cards[k] = v;
    }
  }
  return { day: today, ids, counts, self, at, recall, cards };
}

/** The reveal counts with one more for this rule (unchanged without a valid rule id). */
const counted = (counts: Record<string, number>, principleId: string | null) =>
  principleId && LINK_ID.test(principleId) ? { ...counts, [principleId]: (counts[principleId] ?? 0) + 1 } : counts;

/**
 * Mark one widget revealed today, and count the reveal for its rule (once per
 * widget per day). `now`: the reveal's time, kept so a quick second tap is ignored.
 * `cardId` (1.48 QA): the card it showed, so the reveal belongs to that card only.
 */
export function withReveal(s: RevealState, widgetId: number, principleId: string | null, now?: number, cardId?: string | null): RevealState {
  const key = String(widgetId);
  const card = cardId && LINK_ID.test(cardId) ? cardId : undefined;
  if (s.ids.includes(widgetId)) {
    // Already revealed today. Only a NEW card on the same widget is a new reveal (it gets its own card and time).
    if (!card || s.cards?.[key] === undefined || s.cards[key] === card) return s;
    return { ...s, counts: counted(s.counts, principleId), cards: { ...s.cards, [key]: card }, at: now === undefined ? s.at : { ...s.at, [key]: now } };
  }
  const counts = counted(s.counts, principleId);
  const at = now === undefined ? s.at : { ...s.at, [key]: now };
  const cards = card ? { ...s.cards, [key]: card } : s.cards;
  return { ...s, ids: [...s.ids, widgetId], counts, at, ...(cards ? { cards } : {}) };
}

/**
 * Is this widget's CURRENT card revealed? A reveal belongs to the card it
 * showed (1.48 QA): if the widget's card has changed since, it starts hidden.
 * Marks saved by 1.47 name no card, and stay revealed as they always did.
 */
export function cardRevealed(s: RevealState, widgetId: number, cardId: string | null): boolean {
  if (!s.ids.includes(widgetId)) return false;
  const was = s.cards?.[String(widgetId)];
  return was === undefined || was === cardId;
}

/** True within REVEAL_TAP_GUARD_MS of this widget's reveal: a "Had it" / "Not yet" tap then is ignored. */
export function tooSoonAfterReveal(s: RevealState, widgetId: number, now: number): boolean {
  const t = s.at?.[String(widgetId)];
  return typeof t === 'number' && now >= t && now - t < REVEAL_TAP_GUARD_MS;
}

/** Where a self-check is kept: per rule (`self`, Today's rule) or per question (`recall`, the Recall card). */
export type CheckField = 'self' | 'recall';

/** The learner's self-check for a rule (or a recall question) today (once a day; a second tap the same day changes nothing). */
export function withSelfCheck(s: RevealState, id: string | null, answer: 'had' | 'notyet', field: CheckField = 'self'): RevealState {
  if (!id || !LINK_ID.test(id)) return s;
  const map = s[field] ?? {};
  const was = map[id];
  if (was && was.on === s.day) return s;
  const next: SelfCheck = { had: (was?.had ?? 0) + (answer === 'had' ? 1 : 0), notYet: (was?.notYet ?? 0) + (answer === 'notyet' ? 1 : 0), last: answer, on: s.day };
  return { ...s, [field]: { ...map, [id]: next } };
}

/** Today's self-check for this rule (or recall question), if any. */
export function judgedToday(s: RevealState, id: string | null, field: CheckField = 'self'): 'had' | 'notyet' | undefined {
  const e = id ? s[field]?.[id] : undefined;
  return e && e.on === s.day ? e.last : undefined;
}

/** A widget was removed: forget its mark. */
export function withoutWidget(s: RevealState, widgetId: number): RevealState {
  if (!s.ids.includes(widgetId)) return s;
  const at = { ...s.at };
  delete at[String(widgetId)];
  const cards = s.cards ? { ...s.cards } : undefined;
  if (cards) delete cards[String(widgetId)];
  return { ...s, ids: s.ids.filter((i) => i !== widgetId), at, ...(cards ? { cards } : {}) };
}

/**
 * How long until just after the next local midnight (5 s past it, so "today"
 * has surely turned). The app redraws the widgets then while it is open
 * (lib/widgets.android.ts), so a new day never waits for Android's 3-hourly update.
 */
export function msToNextMidnight(now: number): number {
  const d = new Date(now);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 5).getTime();
  return Math.max(1000, next - now);
}

/** Today's rule id, if the snapshot has one. */
export function thinkIdFor(s: WidgetSnapshot | null, now: number): string | null {
  const today = dayKey(now);
  return s?.think.find((t) => t.day === today)?.id ?? null;
}

/** Today's Recall card question id, if the snapshot has one. */
export function recallIdFor(s: WidgetSnapshot | null, now: number): string | null {
  return recallFor(s, now)?.id ?? null;
}

/** Today's Key term id, if the snapshot has one. */
export function termIdFor(s: WidgetSnapshot | null, now: number): string | null {
  const today = dayKey(now);
  return s?.terms.find((t) => t.day === today)?.id ?? null;
}

/** The card a reveal widget shows right now (its rule, recall question or term id), if any. */
export function revealCardFor(kind: WidgetKind, s: WidgetSnapshot | null, now: number): string | null {
  if (kind === 'think') return thinkIdFor(s, now);
  if (kind === 'question') return recallIdFor(s, now);
  if (kind === 'revisit') return termIdFor(s, now);
  return null;
}

/** The widget kinds whose card reveals on the widget itself. */
export const REVEAL_KINDS: readonly WidgetKind[] = ['think', 'question', 'revisit'];

/**
 * When a recall question may come back, from its self-checks: "Not yet" brings
 * it back from 3 days later (first in line); "Had it" rests it for 30 days, then
 * 60 after two or more. Null = no self-check yet.
 */
export function recallDueFrom(e: SelfCheck | undefined): { from: string; priority: boolean } | null {
  if (!e) return null;
  if (e.last === 'notyet') return { from: addDays(e.on, 3), priority: true };
  return { from: addDays(e.on, e.had >= 2 ? 60 : 30), priority: false };
}

/**
 * When a rule may come back, from its self-checks: "Not yet" brings it back
 * within 3 days (from 2 days later); "Had it" spaces it out (7 days, then 16
 * after two or more). Null = no self-check yet (the normal rotation).
 */
export function ruleDueFrom(e: SelfCheck | undefined): { from: string; priority: boolean } | null {
  if (!e) return null;
  if (e.last === 'notyet') return { from: addDays(e.on, 2), priority: true };
  return { from: addDays(e.on, e.had >= 2 ? 16 : 7), priority: false };
}

// ── Adding Readiness or Exam countdown: the launcher opens a short "choose" screen first ──
/**
 * Adding one of these two widgets IS the opt-in: Android opens KaiSip's
 * choose screen (components/widgetConfigScreen.android.tsx) before the widget lands.
 * Choosing sets the same switch as Settings; "Not now" cancels the add.
 */
export interface ConfigChoice<V extends string> {
  value: V;
  label: string;
  hint: string;
  recommended?: boolean;
}
export interface ConfigCopy<V extends string> {
  title: string;
  intro: string;
  choices: ConfigChoice<V>[];
  /** A plain note when the choice won't show yet (Details off, no exam date). */
  note?: string;
}
export type ConfigKind = 'readiness' | 'countdown';
export const CONFIG_KINDS: readonly ConfigKind[] = ['readiness', 'countdown'];

export function readinessConfigCopy(prefs: WidgetPrefs): ConfigCopy<'private' | 'show'> {
  return {
    title: 'How should Readiness show?',
    intro: 'Anyone who sees your phone can see this widget. You can change it any time in Settings.',
    choices: [
      { value: 'private', label: 'Rings only', hint: 'No number on your home screen. Tap the widget to see it in KaiSip.', recommended: true },
      { value: 'show', label: 'Rings and your range', hint: 'Your range shows, called a study estimate. It rests in the 3 weeks before your exam.' },
    ],
    note: prefs.details === 'hide' ? 'Details on widgets is off, so the widget shows rings only for now.' : undefined,
  };
}

export function countdownConfigCopy(prefs: WidgetPrefs, examDay: string | null): ConfigCopy<'on'> {
  return {
    title: 'Show weeks to your exam?',
    intro: 'Anyone who sees your phone can see this widget. It shows the weeks to your exam as a road, this week’s focus, and calm words in the final week.',
    choices: [{ value: 'on', label: 'Show weeks to my exam', hint: 'This also lets Today’s plan mention your exam. Change it any time in Settings.', recommended: true }],
    note:
      prefs.details === 'hide'
        ? 'Details on widgets is off, so the widget shows today’s plan only until you turn Details on.'
        : examDay
          ? undefined
          : 'No exam date yet. Add one in Settings when you know it.',
  };
}
