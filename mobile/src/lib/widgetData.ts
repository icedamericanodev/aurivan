/**
 * The widget snapshot, from the app's own saved data (mobile 1.47).
 *
 * The app side of the widgets: it reads the stores ONCE, works out what each
 * widget may show, and hands the engine plain values (engine/widgets.ts
 * buildSnapshot does the cutting, the privacy rules and the size cap).
 * The widget itself never imports this file or any store
 * (src/__tests__/widgets-guard.test.ts checks that).
 *
 * Never read here: the learner's own name, answers or mistakes beyond
 * "was the last answer to this question a miss", "which rule did a recent
 * miss test" and (1.48) "which questions were last answered RIGHT, and when"
 * (the Recall card shows only those), email or account data. Readiness only
 * when its widget is on. Nothing here writes study progress.
 */
import { getCertification, getDomain, CERTIFICATIONS } from '../content/certifications';
import { findQuestion } from '../content/loader';
import { termsFor } from '../content/terms';
import { findLesson } from '../content/lessons';
import { getPrinciples } from '../content/principles';
import { RULE_PROMPTS } from '../content/principles/widgetPrompts';
import { planHero, todayMinutes } from '../components/journey';
import { currentIndex, isOptional, itemMinutes, newDayPlan, planComplete, shortSetItem, type DayPlan } from '../engine/dayPlan';
import { addDays, daysToExam } from '../engine/examDay';
import { growthBefore, plantShown, SPECIES_INFO, isPlantSpecies } from '../engine/plant';
import type { PlanItem } from '../engine/planner';
import { readinessFor } from '../engine/readiness';
import { readinessRange } from '../engine/readinessRange';
import { resolveStyle } from '../engine/plantLooks';
import { dueIds } from '../engine/srs';
import { dayKey, daysBetween } from '../engine/streak';
import {
  buildSnapshot,
  DAYS_AHEAD,
  FINAL_DAY_PLAIN,
  mondayOf,
  readReveal,
  recallDueFrom,
  ROAD_STAGES,
  ruleDueFrom,
  type PlanSnap,
  type PlantSnap,
  type ReadySnap,
  type RecallSnap,
  type RevealState,
  type RoadSnap,
  type RoadStage,
  type TermSnap,
  type ThinkSnap,
  type WidgetSnapshot,
} from '../engine/widgets';
import type { AnswerRecord } from '../engine/readiness';
import { selectCert, useProgress } from '../store/progress';
import { dailyMinutesOf, examDateOf, useSettings } from '../store/settings';
import { effectiveCertId } from './activeCert';
import { useWidgetStore } from '../store/widgets';
import { questionExists } from './outline';
import { allCertMarks, plantLookView } from './plant';
import { questionsForPrinciple } from './principleQuestions';
import { daysUntil } from './useActiveCert';
import { buildJourney } from './useJourney';

/**
 * The Recall card: a stem, answer and cue this short fit a 4×2 widget on a
 * 360 dp phone at every text size (measured in widgets-layout.test.tsx).
 */
export const RECALL_FIT = { stem: 170, answer: 80, cue: 130 } as const;
/** A question comes back as a Recall card this many days after it was answered right. */
export const RECALL_AFTER_DAYS = 14;

/**
 * Short plain topic names per domain (about 12 characters), for small widgets
 * and learners new to the field: no "IS" abbreviation. Other certifications
 * fall back to their domain short names.
 */
export const WIDGET_TOPICS: Record<string, Record<string, string>> = {
  cisa: { '1': 'Audit process', '2': 'Governance', '3': 'New systems', '4': 'Operations', '5': 'Security' },
};
export function topicName(certId: string, domainId: string | undefined): string {
  if (!domainId) return '';
  const cert = getCertification(certId);
  return WIDGET_TOPICS[certId]?.[domainId] ?? (cert ? (getDomain(cert, domainId)?.short ?? '') : '');
}

/** "An IS auditor" → "An information systems (IS) auditor", once: a widget has no glossary beside it. */
export function spellOutIs(stem: string): string {
  return stem.replace(/\bIS\b/, 'information systems (IS)');
}

/** A small stable hash (FNV-1a), so a day's pick is the same on every phone and every run. */
function hash(s: string): number {
  let h = 2166136261;
  for (const ch of s) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A plan item's name in plain words, and its short form. */
export function itemName(certId: string, item: PlanItem): { title: string; short: string } {
  switch (item.kind) {
    case 'review':
      // An exam-week labelled review ("Light review · 8 questions") keeps its own words.
      return item.label && !/^Review \d/.test(item.label) ? { title: item.label.split(' · ')[0], short: 'Review' } : { title: 'Questions to revisit', short: 'Revisit' };
    case 'practice': {
      if (item.why === 'first') return { title: 'Your first 5 questions', short: 'First 5' };
      const topic = topicName(certId, item.domainId);
      return topic ? { title: topic, short: topic } : { title: 'Mixed questions', short: 'Mixed' };
    }
    case 'lesson': {
      const topic = topicName(certId, findLesson(item.lessonId)?.domainId);
      // "Security lesson", or just the topic when that would be too long (never cut mid-word: "New systems less").
      return { title: item.title, short: topic ? (`${topic} lesson`.length <= 16 ? `${topic} lesson` : topic) : 'A lesson' };
    }
    case 'game':
      return { title: planHero(item).title, short: 'A game' };
    case 'mock':
      return { title: 'Practice exam', short: 'Practice exam' };
  }
}

/** Today's plan: the one Today stored, or (before Today has opened today) the plan Today would store. Never saved here. */
function planFor(certId: string, now: number): { plan: DayPlan; live: ReturnType<typeof buildJourney> } | null {
  const cert = getCertification(certId);
  if (!cert) return null;
  const state = useProgress.getState();
  const settings = useSettings.getState();
  const progress = selectCert(state, certId);
  const readiness = readinessFor(cert, progress.answers);
  const live = buildJourney({
    cert,
    progress,
    readiness,
    dueCount: dueIds(progress.review, now, questionExists(certId)).length,
    daysLeft: daysUntil(examDateOf(settings.examDates, certId)),
    dailyMinutes: dailyMinutesOf(settings),
    familiarity: settings.familiarity,
    examFocused: settings.examFocused,
    streak: state.streak,
    now,
  });
  const stored = state.days[certId];
  const today = dayKey(now);
  const plan = stored && stored.day === today ? stored : newDayPlan(today, certId, live.plan, readiness, dailyMinutesOf(settings));
  return { plan, live };
}

function planSnap(certId: string, now: number): PlanSnap | null {
  const got = planFor(certId, now);
  if (!got || got.plan.items.length === 0) return null;
  const { plan, live } = got;
  const progress = selectCert(useProgress.getState(), certId);
  const due = dueIds(progress.review, now, questionExists(certId));
  const done = planComplete(plan);
  const item = plan.items[currentIndex(plan)];
  const name = item ? itemName(certId, item) : { title: '', short: '' };
  const hero = item ? planHero(item, due.length) : null;
  // The open items' minutes (a mock is left out: it is optional and says its own length).
  const left = todayMinutes(plan.items, plan.done);
  // Today's share of questions to revisit still in the plan (the plan's own number, never the queue).
  const ri = plan.items.findIndex((it) => it.kind === 'review');
  const reviewItem = ri >= 0 && !plan.done[ri] ? plan.items[ri] : null;
  const back = reviewItem && reviewItem.kind === 'review' ? Math.min(reviewItem.count, due.length) : 0;
  const backMissed = back > 0 && due.slice(0, back).every((id) => progress.answers[id]?.lastCorrect === false);
  const daysLeft = daysToExam(examDateOf(useSettings.getState().examDates, certId), plan.day);
  const examWeek = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
  // What comes next: the live plan (as Today's own "Tomorrow" preview does), and about how long.
  const nextItems = live.plan;
  const nextItem = nextItems.find((it) => it.kind !== 'mock') ?? nextItems[0];
  const nextMin = Math.round(nextItems.reduce((n, it) => n + (it.kind === 'mock' ? 0 : itemMinutes(it)), 0));
  return {
    day: plan.day,
    left: done ? 0 : left,
    done,
    first: item?.kind === 'practice' && item.why === 'first',
    title: name.title,
    short: name.short,
    meta: hero?.meta ?? '',
    back,
    backMissed,
    shortSet: !done && shortSetItem(plan, { examWeek }) >= 0,
    next: nextItem ? itemName(certId, nextItem).title : null,
    nextMin,
    finalDay: daysLeft !== null ? (FINAL_DAY_PLAIN[daysLeft] ?? null) : null,
    // The real task ("12 questions") and the day's steps (an optional practice exam isn't a step).
    count: !done && item && (item.kind === 'practice' || item.kind === 'review') ? item.count : 0,
    ...planSteps(plan),
  };
}

/** The day's steps for the pips: the plan's items, without an optional one, and how many are done. */
export function planSteps(plan: DayPlan): { steps: number; stepsDone: number } {
  const idx = plan.items.map((_, i) => i).filter((i) => !isOptional(plan.items, i));
  return { steps: idx.length, stepsDone: idx.filter((i) => plan.done[i]).length };
}

function plantSnap(certId: string, today: string): PlantSnap | { off: true } | null {
  const state = useProgress.getState();
  if (!plantShown(state.plantSettings)) return { off: true };
  const plant = selectCert(state, certId).plant;
  if (!plant) return null;
  // A growth the learner hasn't seen yet in the app stays off the widget until they have (the moment is the app's).
  const growth = plant.pending ? growthBefore(plant, plant.pending) : plant.growth;
  const reachedAt = !plant.pending ? Object.values(plant.reached ?? {}).filter((t): t is number => typeof t === 'number' && t !== plant.backfill?.at) : [];
  const grewAt = reachedAt.length ? Math.max(...reachedAt) : null;
  const look = plantLookView(plant, {
    marks: allCertMarks(state.byCert),
    style: resolveStyle(plant.look, state.plantSettings),
    resting: false,
    planCleared: false,
    newTopicToday: false,
    newKeepsakeToday: false,
    today,
  }).art;
  return {
    species: plant.species,
    name: isPlantSpecies(plant.species) ? SPECIES_INFO[plant.species].lower : 'plant',
    growth,
    grew: grewAt !== null ? dayKey(grewAt) : null,
    ...(look.style ? { style: look.style } : {}),
    ...(look.palette ? { palette: look.palette } : {}),
    ...(look.ground ? { ground: look.ground } : {}),
    ...(look.planter ? { planter: look.planter } : {}),
  };
}

/** Rules a recent miss tested (last 14 days), most missed first: they lead the rotation. */
function slipRules(certId: string, answers: Record<string, { lastCorrect: boolean; lastAt: number }>, now: number): string[] {
  const counts = new Map<string, number>();
  for (const [id, a] of Object.entries(answers)) {
    if (a.lastCorrect || now - a.lastAt > 14 * 86_400_000) continue;
    const p = findQuestion(certId, id)?.principleId;
    if (p) counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

/**
 * Today's rule for today and the next few days. Kept once picked (it never
 * changes mid-day). Each new day picks, in order:
 *   1. a rule the learner said "Not yet" to, from 2 days later (back within 3 days);
 *   2. a rule a recent miss tested;
 *   3. the next in the rotation (families in order from the first widget day; in
 *      exam week the "Reading the question" family);
 * skipping a rule shown in the last 5 days, and one still spaced out by "Had it".
 */
export function thinkDays(
  certId: string,
  today: string,
  opts: { anchor: string; examDay?: string; picks?: Record<string, string>; self?: RevealState['self']; slips?: readonly string[] },
): { think: ThinkSnap[]; picks: Record<string, string> } {
  const pack = getPrinciples(certId);
  if (!pack || pack.principles.length === 0) return { think: [], picks: {} };
  const all = pack.principles;
  const reading = all.filter((p) => p.family === 'reading');
  const answers = selectCert(useProgress.getState(), certId).answers;
  const shown: Record<string, string> = { ...(opts.picks ?? {}) };
  const chosen: Record<string, string> = {};
  const think: ThinkSnap[] = [];
  const recent = (id: string, day: string) => Object.entries(shown).some(([d, pid]) => pid === id && d < day && daysBetween(d, day) < 5);
  const spaced = (id: string, day: string) => {
    const due = ruleDueFrom(opts.self?.[id]);
    return Boolean(due && !due.priority && due.from > day);
  };
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const day = addDays(today, d);
    let id = shown[day] && all.some((p) => p.id === shown[day]) ? shown[day] : undefined;
    if (!id) {
      const left = daysToExam(opts.examDay, day);
      const pool = left !== null && left >= 2 && left <= 7 && reading.length ? reading : all;
      const notYet = pool.find((p) => {
        const due = ruleDueFrom(opts.self?.[p.id]);
        return due?.priority && due.from <= day && !recent(p.id, day);
      });
      const slip = (opts.slips ?? []).map((sid) => pool.find((p) => p.id === sid)).find((p) => p && !recent(p.id, day) && !spaced(p.id, day));
      const n = Math.max(0, daysBetween(opts.anchor, day));
      let rot: (typeof pool)[number] | undefined;
      for (let k = 0; k < pool.length && !rot; k++) {
        const p = pool[(n + k) % pool.length];
        if (!recent(p.id, day) && !spaced(p.id, day)) rot = p;
      }
      id = (notYet ?? slip ?? rot ?? pool[n % pool.length]).id;
      shown[day] = id;
    }
    chosen[day] = id;
    const p = all.find((x) => x.id === id)!;
    const prompt = RULE_PROMPTS[p.id] ?? { ask: `${pack.families.find((f) => f.id === p.family)?.question ?? 'What is the rule?'}`, short: p.title };
    // "Try one": a question that tests this rule, one the learner hasn't answered (or the one answered longest ago).
    const ids = questionsForPrinciple(certId, p).filter((q) => questionExists(certId)(q));
    const fresh = ids.filter((q) => !answers[q]);
    const pickFrom = fresh.length ? fresh : [...ids].sort((a, b) => (answers[a]?.lastAt ?? 0) - (answers[b]?.lastAt ?? 0)).slice(0, 3);
    const tryId = pickFrom.length ? pickFrom[hash(`${certId}:${day}:${p.id}`) % pickFrom.length] : undefined;
    think.push({ day, id: p.id, ask: prompt.ask, short: prompt.short, title: p.title, rule: spellOutIs(p.rule), ...(tryId ? { try: tryId } : {}) });
  }
  return { think, picks: chosen };
}

/** The "Exam cue:" tip of a question, without its label ('' when it has none). */
export function examCue(tips: readonly string[] | undefined): string {
  const t = (tips ?? []).find((x) => /^\s*Exam cue:/i.test(x));
  return t ? t.replace(/^\s*Exam cue:\s*/i, '').trim() : '';
}

/**
 * A question that works as a Recall card: no case study, short enough to fit,
 * an Exam cue to show, and an answer that stands on its own (never "All of the
 * above", never a letter, never a shuffled-letter token).
 */
export function recallFit(q: { stem: string; scenario?: string; options: Partial<Record<string, string>>; correct: string; tips?: string[]; retired?: boolean }): boolean {
  const answer = q.options[q.correct] ?? '';
  const cue = examCue(q.tips);
  if (q.retired || q.scenario || !answer || !cue) return false;
  if (q.stem.length > RECALL_FIT.stem || answer.length > RECALL_FIT.answer || cue.length > RECALL_FIT.cue) return false;
  if (/{{|\b(all|none|both) of the\b|\b[A-D] and [A-D]\b/i.test(`${answer} ${cue}`)) return false;
  return !/\b(option|answer|choice) [A-D]\b|\([A-D]\)/.test(cue);
}

/**
 * The Recall card for today and the next few days, kept once picked. Only a
 * question the learner answered RIGHT (its last answer) at least 14 days
 * before that day, and never one they haven't met. Each day picks, in order:
 *   1. one the learner said "Not yet" to, from 3 days later;
 *   2. otherwise the day's pick among the ones answered right longest ago;
 * skipping one picked in the last 7 days and one still resting after "Had it".
 * Reads answers only; writes nothing to progress.
 */
export function recallDays(
  certId: string,
  today: string,
  picks: Record<string, string>,
  answers: Record<string, Pick<AnswerRecord, 'lastCorrect' | 'lastAt'>>,
  self: RevealState['recall'] = {},
): { recall: RecallSnap[]; picks: Record<string, string> } {
  if (!getCertification(certId)) return { recall: [], picks: {} };
  // Right answers only, oldest first (the longest since it was last answered right).
  const right = Object.entries(answers)
    .filter(([, a]) => a && a.lastCorrect === true && typeof a.lastAt === 'number')
    .sort((x, y) => x[1].lastAt - y[1].lastAt);
  const fits = new Map<string, NonNullable<ReturnType<typeof findQuestion>>>();
  for (const [id] of right) {
    const q = findQuestion(certId, id);
    if (q && recallFit(q)) fits.set(id, q);
  }
  const chosen: Record<string, string> = {};
  const recall: RecallSnap[] = [];
  const shown: Record<string, string> = { ...picks };
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const day = addDays(today, d);
    const ok = (id: string) => {
      const a = answers[id];
      if (!a || !a.lastCorrect || !fits.has(id)) return false;
      // Answered right at least 14 calendar days before this day.
      if (daysBetween(dayKey(a.lastAt), day) < RECALL_AFTER_DAYS) return false;
      const due = recallDueFrom(self?.[id]);
      return !due || due.from <= day;
    };
    const recent = (id: string) => Object.entries(shown).some(([k, v]) => v === id && k < day && daysBetween(k, day) < 7);
    let id = shown[day] && ok(shown[day]) ? shown[day] : undefined;
    if (!id) {
      const pool = [...fits.keys()].filter((x) => ok(x) && !recent(x) && !Object.values(chosen).includes(x));
      const notYet = pool.find((x) => recallDueFrom(self?.[x])?.priority);
      // The day's pick among the 12 answered right longest ago, so a fresh right answer waits its turn.
      const oldest = pool.slice(0, 12);
      id = notYet ?? (oldest.length ? oldest[hash(`${certId}:recall:${day}`) % oldest.length] : undefined);
    }
    if (!id) continue;
    shown[day] = id;
    chosen[day] = id;
    const q = fits.get(id)!;
    const weeks = Math.max(2, Math.floor(daysBetween(dayKey(answers[id].lastAt), day) / 7));
    recall.push({ day, id, stem: q.stem, answer: q.options[q.correct] as string, cue: examCue(q.tips), weeks, topic: topicName(certId, q.domainId) });
  }
  return { recall, picks: chosen };
}

/**
 * The Key term for today and the next few days: one term a day from the
 * notes' glossary for today's plan topic (`domainId`: its first item with a
 * domain), or, with none, a domain chosen by the day. The same term all day,
 * the same on every phone (a hash of the day), and never the day before's again.
 */
export function termDays(certId: string, today: string, domainId?: string): TermSnap[] {
  const cert = getCertification(certId);
  if (!cert) return [];
  const out: TermSnap[] = [];
  let prev = '';
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const day = addDays(today, d);
    const dom = domainId && termsFor(certId, domainId).length ? domainId : cert.domains[hash(`${certId}:domain:${day}`) % cert.domains.length]?.id;
    const list = dom ? termsFor(certId, dom) : [];
    if (!list.length) continue;
    let i = hash(`${certId}:term:${day}`) % list.length;
    if (list[i].id === prev && list.length > 1) i = (i + 1) % list.length;
    const t = list[i];
    prev = t.id;
    out.push({ day, id: t.id, term: t.term, ...(t.short ? { short: t.short } : {}), meaning: t.meaning, topic: topicName(certId, dom), note: t.note });
  }
  return out;
}

/** The day plan's topic: its first item that names a domain (stable all day, whatever is done). */
export function planDomain(plan: DayPlan | null | undefined): string | undefined {
  for (const it of plan?.items ?? []) {
    if (it.kind === 'practice' && it.domainId) return it.domainId;
    if (it.kind === 'lesson') {
      const dom = findLesson(it.lessonId)?.domainId;
      if (dom) return dom;
    }
  }
  return undefined;
}

/** A ring must grow this many points in a week before the widget says so. */
export const RING_GREW = 3;

/** The topic whose ring grew most since this week's start (at least RING_GREW points), if any. Never one that shrank. */
export function grewTopic(certId: string, domainIds: readonly string[], start: readonly number[] | undefined, now: readonly number[]): string | undefined {
  if (!start || start.length !== now.length) return undefined;
  let best = -1;
  let gain = RING_GREW - 1;
  now.forEach((v, i) => {
    if (v - start[i] > gain) {
      gain = v - start[i];
      best = i;
    }
  });
  return best >= 0 ? topicName(certId, domainIds[best]) || undefined : undefined;
}

function readySnap(certId: string, today: string): ReadySnap | null {
  const cert = getCertification(certId);
  if (!cert) return null;
  const readiness = readinessFor(cert, selectCert(useProgress.getState(), certId).answers);
  const range = readinessRange(cert, readiness);
  const rings = cert.domains.map((d) => Math.round((readiness.domains.find((x) => x.domainId === d.id)?.mastery ?? 0) * 100));
  const weights = cert.domains.map((d) => d.weight);
  // This week's starting rings (kept on this phone), so the widget can say what grew.
  const monday = mondayOf(today);
  useWidgetStore.getState().noteRings(monday, rings);
  const base = useWidgetStore.getState().ringWeek;
  const grew = base?.monday === monday ? grewTopic(certId, cert.domains.map((d) => d.id), base.rings, rings) : undefined;
  const extra = grew ? { grew } : {};
  if (!range.enough) return { enough: false, needed: range.needed, rings, weights, ...extra };
  return { enough: true, low: range.low, high: range.high, rings, weights, ...extra };
}

/** Road to exam: where the road starts (the first study week this phone knows of) and this week's focus (the plan engine's stage). */
function roadSnap(certId: string, now: number, studyDays: readonly string[]): RoadSnap {
  const today = dayKey(now);
  const ws = useWidgetStore.getState();
  const known = [...studyDays, ...ws.stats.studyDays].filter((d) => d <= today).sort();
  ws.noteRoadFrom(mondayOf(known[0] ?? today));
  const from = useWidgetStore.getState().roadFrom ?? mondayOf(today);
  const stage = planFor(certId, now)?.live.stage;
  return { from, stage: stage && (ROAD_STAGES as readonly string[]).includes(stage) ? (stage as RoadStage) : 'practice' };
}

/**
 * The snapshot for right now. Remembers the day's Recall card and rule picks
 * and the rotation's first day (on this phone only). `reveal`: the reveal
 * cards' self-checks (the widget writes them; lib/widgets reads them first).
 * Never throws for missing data: an empty or new install gives the "Open
 * KaiSip to begin" faces.
 */
export function collectSnapshot(now = Date.now(), reveal: RevealState = readReveal(null, dayKey(now))): WidgetSnapshot {
  const settings = useSettings.getState();
  const state = useProgress.getState();
  const ws = useWidgetStore.getState();
  const cert = getCertification(effectiveCertId(settings.activeCertId)) ?? CERTIFICATIONS[0];
  const progress = selectCert(state, cert.id);
  const today = dayKey(now);
  if (!ws.anchorDay) ws.setAnchor(today);
  const anchor = useWidgetStore.getState().anchorDay ?? today;
  const examDay = examDateOf(settings.examDates, cert.id);
  // The Recall card: questions answered right 2+ weeks ago (its picks keep the Quick question's key).
  const { recall, picks } = recallDays(cert.id, today, ws.quizPicks, progress.answers, reveal.recall);
  ws.rememberPicks(picks);
  const rules = thinkDays(cert.id, today, { anchor, examDay, picks: ws.thinkPicks, self: reveal.self, slips: slipRules(cert.id, progress.answers, now) });
  ws.rememberRules(rules.picks);
  const studyDays = state.streak.recentDays ?? (state.streak.lastDay ? [state.streak.lastDay] : []);
  // The beta tester numbers count study days from before the first widget too (kept on this phone).
  ws.seedStudyDays(studyDays, today);
  // Today's plan as Today has it (or would make it), for the Key term's topic.
  const stored = state.days[cert.id];
  const dayPlan = stored && stored.day === today ? stored : settings.onboarded ? planFor(cert.id, now)?.plan : null;
  return buildSnapshot({
    now,
    onboarded: settings.onboarded,
    prefs: ws.prefs,
    examDay: examDay ?? null,
    dailyMinutes: dailyMinutesOf(settings),
    plan: settings.onboarded ? planSnap(cert.id, now) : null,
    studyDays,
    studyDaysTotal: progress.milestones?.days ?? studyDays.length,
    answeredAny: Object.keys(progress.answers).length > 0,
    plant: plantSnap(cert.id, today),
    think: rules.think,
    recall,
    terms: termDays(cert.id, today, planDomain(dayPlan)),
    // Road to exam reads the plan engine's stage only when exam timing is on (it shows nothing otherwise).
    road: settings.onboarded && ws.prefs.timing ? roadSnap(cert.id, now, studyDays) : null,
    ready: ws.prefs.readiness === 'off' ? null : readySnap(cert.id, today),
  });
}
