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
 * "was the last answer to this question a miss" and "which rule did a recent
 * miss test", email or account data. Readiness only when its widget is on.
 */
import { getCertification, getDomain, CERTIFICATIONS } from '../content/certifications';
import { getAllQuestions, findQuestion } from '../content/loader';
import { findLesson } from '../content/lessons';
import { getPrinciples } from '../content/principles';
import { RULE_PROMPTS } from '../content/principles/widgetPrompts';
import { planHero, todayMinutes } from '../components/journey';
import { currentIndex, itemMinutes, newDayPlan, planComplete, shortSetItem, type DayPlan } from '../engine/dayPlan';
import { addDays, daysToExam } from '../engine/examDay';
import { growthBefore, plantShown, SPECIES_INFO, isPlantSpecies } from '../engine/plant';
import type { PlanItem } from '../engine/planner';
import { readinessFor } from '../engine/readiness';
import { readinessRange } from '../engine/readinessRange';
import { resolveStyle } from '../engine/plantLooks';
import { dueIds } from '../engine/srs';
import { dayKey, daysBetween } from '../engine/streak';
import { buildSnapshot, DAYS_AHEAD, FINAL_DAY_PLAIN, readReveal, ruleDueFrom, type PlanSnap, type PlantSnap, type QuizSnap, type ReadySnap, type RevealState, type ThinkSnap, type WidgetSnapshot } from '../engine/widgets';
import { selectCert, useProgress } from '../store/progress';
import { dailyMinutesOf, examDateOf, useSettings } from '../store/settings';
import { effectiveCertId } from './activeCert';
import { useWidgetStore } from '../store/widgets';
import { questionExists } from './outline';
import { allCertMarks, plantLookView } from './plant';
import { questionsForPrinciple } from './principleQuestions';
import { daysUntil } from './useActiveCert';
import { buildJourney } from './useJourney';

/** Quick question: a stem this short fits a 4×2 at normal text with its question sentence. */
export const QUIZ_STEM_MAX = 150;
/** A priority word: a stem without one can be answered without the options, which is the point here. */
const PRIORITY = /\b(BEST|FIRST|MOST|LEAST|PRIMARY|GREATEST|MAIN|NOT|PRIMARILY|MOST LIKELY)\b/;
/** Capital-letter acronyms a glance can't decode (the priority words and "IS"/"IT" aside). */
const ACRONYM = /\b[A-Z][A-Z0-9]{1,6}s?\b/g;

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
      return { title: item.title, short: topic ? `${topic} lesson`.slice(0, 16) : 'A lesson' };
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
  };
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

/** A stem that works on a home screen: short, no case study, its priority word kept, no acronym a glance can't decode. */
export function quizFit(q: { stem: string; scenario?: string }): boolean {
  // Measured as drawn: with "IS" spelled out.
  if (q.scenario || spellOutIs(q.stem).length > QUIZ_STEM_MAX || !PRIORITY.test(q.stem)) return false;
  const acronyms = (q.stem.match(ACRONYM) ?? []).filter((a) => !PRIORITY.test(a) && a !== 'IS' && a !== 'IT');
  return acronyms.length === 0;
}

/**
 * The Quick question for today and the next few days, kept once picked.
 * Today: the plan's first question to revisit when it fits a widget (spaced
 * practice of something met before); otherwise a fitting question not yet answered.
 */
export function quizDays(
  certId: string,
  today: string,
  picks: Record<string, string>,
  answers: Record<string, { lastAt: number }>,
  due: readonly string[] | ((day: string) => readonly string[]) = [],
): { quiz: QuizSnap[]; picks: Record<string, string> } {
  const cert = getCertification(certId);
  const bank = getAllQuestions(certId).filter(quizFit);
  if (!cert || bank.length === 0) return { quiz: [], picks: {} };
  const fresh = bank.filter((q) => !answers[q.id]);
  const pool = fresh.length ? fresh : bank;
  const dueOn = typeof due === 'function' ? due : (day: string) => (day === today ? due : []);
  const chosen: Record<string, string> = {};
  const quiz: QuizSnap[] = [];
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const day = addDays(today, d);
    const kept = picks[day];
    // The day's first question to revisit that fits a widget (not one already picked this window).
    const taken = new Set(Object.values(chosen));
    const fromPlan = dueOn(day)
      .map((id) => bank.find((q) => q.id === id))
      .find((q) => q !== undefined && !taken.has(q.id));
    const q = (kept && bank.find((x) => x.id === kept)) || fromPlan || pool[hash(`${certId}:${day}`) % pool.length];
    chosen[day] = q.id;
    const at = answers[q.id]?.lastAt;
    quiz.push({ day, id: q.id, stem: spellOutIs(q.stem), topic: topicName(certId, q.domainId), done: typeof at === 'number' && dayKey(at) === day });
  }
  return { quiz, picks: chosen };
}

function readySnap(certId: string): ReadySnap | null {
  const cert = getCertification(certId);
  if (!cert) return null;
  const readiness = readinessFor(cert, selectCert(useProgress.getState(), certId).answers);
  const range = readinessRange(cert, readiness);
  const rings = cert.domains.map((d) => Math.round((readiness.domains.find((x) => x.domainId === d.id)?.mastery ?? 0) * 100));
  const weights = cert.domains.map((d) => d.weight);
  if (!range.enough) return { enough: false, needed: range.needed, rings, weights };
  return { enough: true, low: range.low, high: range.high, rings, weights };
}

/**
 * The snapshot for right now. Remembers the day's Quick question and rule
 * picks and the rotation's first day (on this phone only). `reveal`: Today's
 * rule self-checks (the widget writes them; lib/widgets reads them first).
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
  const exists = questionExists(cert.id);
  // Each day's questions to revisit (as of that day's noon), so a day's Quick question can be one of them.
  const dueFor = (day: string) => {
    const [y, m, d] = day.split('-').map(Number);
    return dueIds(progress.review, day === today ? now : new Date(y, m - 1, d, 12).getTime(), exists);
  };
  const { quiz, picks } = quizDays(cert.id, today, ws.quizPicks, progress.answers, dueFor);
  ws.rememberPicks(picks);
  const rules = thinkDays(cert.id, today, { anchor, examDay, picks: ws.thinkPicks, self: reveal.self, slips: slipRules(cert.id, progress.answers, now) });
  ws.rememberRules(rules.picks);
  const studyDays = state.streak.recentDays ?? (state.streak.lastDay ? [state.streak.lastDay] : []);
  // The beta tester numbers count study days from before the first widget too (kept on this phone).
  ws.seedStudyDays(studyDays, today);
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
    quiz,
    ready: ws.prefs.readiness === 'off' ? null : readySnap(cert.id),
  });
}
