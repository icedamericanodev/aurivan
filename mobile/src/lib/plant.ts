/**
 * "Your plant" glue (mobile 1.13, Phase 4a) — between the saved progress
 * and the pure growth rules in engine/plant.ts.
 *
 * Plain English for the founder:
 * - `plantFactsFor` turns one exam's saved progress into the few numbers
 *   the growth rules read: clean answers per domain, readiness' low end,
 *   how much of the outline is known (mastered on two different days),
 *   mocks and the exam-ready hold. Nothing else: never taps, minutes,
 *   streaks or games.
 * - `checkPlant` runs after every finished session and game round (beside
 *   the milestones) and when Today comes into view. Growth only goes up; a
 *   grow-up waits as `pending` for its one calm line on Today.
 * - `plantFor` plants a seed. An existing learner's study sets its growth
 *   QUIETLY (the back-fill), with one summary line instead of a moment.
 * - `usePlantView` gives Today, You and the Your plant screen everything
 *   they draw, and says when the plant is hidden (Settings → Show my plant).
 */
import { useEffect, useMemo } from 'react';
import { CERTIFICATIONS, getCertification } from '../content/certifications';
import type { Certification } from '../content/types';
import { examMoment } from '../engine/examDay';
import {
  advance,
  clearPending,
  growthFor,
  nextToGrow,
  organSlots,
  organScales,
  organs,
  plantFacts,
  plantHasFace,
  plantLabel,
  plantNew,
  plantShown,
  isResting,
  type CertPlant,
  type GrowthLevel,
  type Organ,
  type PlantFacts,
  type PlantMock,
  type PlantSettings,
  type PlantSpecies,
} from '../engine/plant';
import { planComplete } from '../engine/dayPlan';
import { defaultKeepsakes, plantMood, resolveLook, unlockedLooks, type ArtLook, type CertMarks, type PlantMood, type ResolvedLook } from '../engine/plantLooks';
import { growthOccasions, keepsakeOccasions, proudReactionId, proudToday, type ProudMarks, type ProudOccasion } from '../engine/proud';
import { readinessFor } from '../engine/readiness';
import { dayKey } from '../engine/streak';
import { selectCert, useProgress, type CertProgress, type MockResult, type ProgressState } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSettings } from '../store/settings';
import { certOutline, questionExists } from './outline';

// ── Facts ────────────────────────────────────────────────────────────────
const subtopicCache = new Map<string, string[][]>();

/**
 * The outline subtopics that have at least one practice question, per domain
 * in the cert's order: what "know X% of the outline" counts. Built once per cert.
 */
export function plantSubtopics(certId: string): string[][] {
  let s = subtopicCache.get(certId);
  if (!s) {
    const cert = getCertification(certId);
    const exists = questionExists(certId);
    const topics = certOutline(certId).topics;
    s = (cert?.domains ?? []).map((d) =>
      topics.filter((t) => t.domainId === d.id).flatMap((t) => t.subtopics.filter((x) => x.questionIds.some(exists)).map((x) => x.id)),
    );
    subtopicCache.set(certId, s);
  }
  return s;
}

/** A saved mock as the plant reads it (the day it finished, on this phone's calendar). */
export function plantMock(m: MockResult): PlantMock {
  return { total: m.total, correct: m.correct, day: dayKey(m.finishedAt), ...(m.timing ? { timing: m.timing } : {}), ...(m.unanswered !== undefined ? { unanswered: m.unanswered } : {}) };
}

/** The growth facts for one exam's progress. null when the cert is unknown. */
export function plantFactsFor(certId: string, cp: CertProgress, now: number): PlantFacts | null {
  const cert = getCertification(certId);
  if (!cert) return null;
  return plantFacts({
    cert,
    answers: cp.answers,
    mastery: cp.mastery,
    subtopicsByDomain: plantSubtopics(certId),
    mocks: cp.mocks.map(plantMock),
    readinessLog: cp.moments?.readiness,
    readySeenAt: cp.moments?.readySeenAt,
    replantedAt: cp.plant?.replantedAt,
    today: dayKey(now),
  });
}

// ── Actions ──────────────────────────────────────────────────────────────
/**
 * Re-check a cert's plant: growth goes up when a gate opens (never down).
 * Returns the new growth when it grew, else null. Growth is worked out even
 * while the plant is hidden, so turning it back on shows the truth.
 */
export function checkPlant(certId: string, now = Date.now()): GrowthLevel | null {
  // Performance: Today calls this every time it comes into view. Growth
  // depends only on the exam's saved progress and the day, so the same
  // progress (the very same object: the store never mutates it) on the same
  // day can't open a new gate. Skip the facts scan and the store write then.
  const day = dayKey(now);
  const before = useProgress.getState().byCert[certId];
  const last = lastCheck.get(certId);
  if (before && last && last.cp === before && last.day === day) return null;
  let grew: GrowthLevel | null = null;
  useProgress.getState().updatePlant(certId, (p, cp) => {
    if (!p) return p;
    const facts = plantFactsFor(certId, cp, now);
    if (!facts) return p;
    const r = advance(p, facts, now);
    grew = r.grew;
    return r.plant;
  });
  const after = useProgress.getState().byCert[certId];
  if (after) lastCheck.set(certId, { cp: after, day });
  return grew;
}
/** The progress (by identity) and day each cert's plant was last checked against. */
const lastCheck = new Map<string, { cp: CertProgress; day: string }>();

/**
 * Plant a seed for this cert. An existing learner's study sets the growth
 * quietly (one summary line on the Your plant screen, never a moment).
 * A plant that already exists is left alone (a double tap plants once).
 */
export function plantFor(certId: string, species: PlantSpecies, name: string, now = Date.now()): void {
  useProgress.getState().updatePlant(certId, (p, cp) => {
    if (p) return p;
    const facts = plantFactsFor(certId, cp, now);
    return plantNew(species, name, now, facts ? growthFor(facts) : 1);
  });
  // Planted: Today's quiet "Plant a companion" line has done its job.
  useProgress.getState().setPlantSettings({ promptHidden: true });
}

/** The grow-up moment was shown on Today. */
export function seeGrowth(certId: string): void {
  useProgress.getState().updatePlant(certId, (p) => (p ? clearPending(p) : p));
}

/**
 * The grow-up arrived on a visit that already has its one moment (the
 * exam-ready panel: Elder and "Your readiness is holding" come from the same
 * week; code review M1). The growth is applied silently: no sequence on a
 * hidden plant, no second haptic. Your plant says it in one calm line next
 * time (store/seen.ts `quietGrowth`, this phone only).
 */
export function growQuietly(certId: string, growth: GrowthLevel): void {
  useSeen.getState().noteQuietGrowth(certId, growth);
  seeGrowth(certId);
}

/** The back-fill line was shown (once). */
export function seePlantBackfill(certId: string): void {
  useProgress.getState().updatePlant(certId, (p) => (p?.backfill && !p.backfill.seen ? { ...p, backfill: { ...p.backfill, seen: true } } : p));
}

/**
 * After a restore: a backup with no plant for a cert must not make a
 * learner re-plant. The phone's plant identity (species, name, look,
 * planted date) carries over, and its growth is worked out QUIETLY from the
 * restored data, like a first planting's back-fill.
 */
export function carryPlantIdentity(certId: string, restored: CertProgress, phone: CertPlant | undefined, now: number): CertPlant | undefined {
  if (restored.plant || !phone) return restored.plant;
  const facts = plantFactsFor(certId, { ...restored, plant: undefined }, now);
  const g = facts ? growthFor(facts) : 1;
  const fresh = plantNew(phone.species, phone.name, now, g);
  return {
    ...fresh,
    plantedAt: phone.plantedAt,
    ...(phone.look ? { look: phone.look } : {}),
    ...(phone.kept ? { kept: phone.kept } : {}),
    ...(phone.passedOn ? { passedOn: phone.passedOn } : {}),
  };
}

// ── What the screens draw ────────────────────────────────────────────────
export interface PlantView {
  /** Settings → Show my plant (on by default). Off: no plant and no prompts anywhere. */
  shown: boolean;
  settings: PlantSettings;
  /** The plant, when there is one AND it is shown. */
  plant: CertPlant | null;
  /** The face (off with Quiet look). */
  face: boolean;
  /** The calm resting look: a planned rest day, or 3+ days without study. */
  resting: boolean;
  /** Studied this exam today. */
  newGrowth: boolean;
  /** One organ per domain (text rows), and exactly five slots for the drawing. */
  organs: Organ[];
  scales: number[];
  /** The domain with the most exam points still to gain. */
  next: number;
  /** The plant's one spoken label. */
  label: string;
}

/** Pure: the view for one cert's progress (tests call this directly). Reads only answers, the plant and the last study day. */
export function plantView(cert: Certification, cp: Pick<CertProgress, 'answers' | 'plant' | 'milestones'>, settings: PlantSettings | undefined, today: string, plannedRest = false): PlantView {
  const shown = plantShown(settings);
  const readiness = readinessFor(cert, cp.answers);
  const weights = cert.domains.map((d) => d.weight);
  const domains = readiness.domains.map((d) => ({ answered: d.answered, mastery: d.mastery }));
  const lastDay = cp.milestones?.lastDay;
  const plant = shown && cp.plant ? cp.plant : null;
  const resting = isResting(lastDay, today, plannedRest);
  const newGrowth = lastDay === today;
  return {
    shown,
    settings: settings ?? {},
    plant,
    face: plantHasFace(settings),
    resting,
    newGrowth,
    organs: organs(weights, domains),
    scales: organScales(organSlots(weights, domains)),
    next: nextToGrow(
      weights,
      domains.map((d) => d.mastery),
    ),
    label: plant ? plantLabel({ name: plant.name, species: plant.species, growth: plant.growth, resting, newGrowth }) : '',
  };
}

// ── The look (mobile 1.14) ──────────────────────────────────────────────
/** Every cert's saved marks: badges and set planters dress any plant (they are the learner's, not the plant's). */
export function allCertMarks(byCert: ProgressState['byCert']): CertMarks[] {
  return Object.values(byCert).map((c) => ({ earned: c?.milestones?.earned, planters: c?.milestones?.planters }));
}

/** Every cert's marks as the proud rules read them (the quiet fills' times too, so those never count). */
function proudMarks(byCert: ProgressState['byCert']): ProudMarks[] {
  return Object.values(byCert).map((c) => ({ earned: c?.milestones?.earned, backfill: c?.milestones?.backfill, catalogFill: c?.milestones?.catalogFill }));
}

/**
 * True when a keepsake first came today from a LEARNING badge: its FIRST
 * tier, on any exam, earned today and live (QA BUG-2: a higher tier brings no
 * new keepsake; mobile 1.18: never a game-only badge, Fresh Start or a mark
 * saved quietly by a back-fill). The cap is applied later (engine/proud.ts).
 */
export function newKeepsakeOn(byCert: ProgressState['byCert'], today: string): boolean {
  return keepsakeOccasions(proudMarks(byCert), today).length > 0;
}

/** What the look screens and the plant need from the marks: a stable string, so a store change elsewhere never redraws the plant. */
function marksKey(s: ProgressState, today: string): string {
  const keys: string[] = [];
  for (const c of Object.values(s.byCert)) {
    const m = c?.milestones;
    // With the time: the default keepsakes are the first three EARNED.
    for (const [k, at] of Object.entries(m?.earned ?? {})) keys.push(`${k}@${at}`);
    for (const set of Object.keys(m?.planters ?? {})) keys.push(`set:${set}`);
  }
  return JSON.stringify([keepsakeOccasions(proudMarks(s.byCert), today), [...new Set(keys)].sort()]);
}

export interface PlantLookView {
  /** Every look id open now (derived; nothing stored). */
  unlocked: Set<string>;
  /** The look as chosen, with anything not open (or not this species') back to its default. */
  resolved: ResolvedLook;
  /** What the art draws (the visitor only on a day the plan is cleared). */
  art: ArtLook;
  /** The face's mood (none with Quiet look). */
  mood: PlantMood;
  /** The visitor is here today. */
  visiting: boolean;
}

export interface LookInput {
  marks: readonly CertMarks[];
  face: boolean;
  resting: boolean;
  planCleared: boolean;
  newTopicToday: boolean;
  newKeepsakeToday: boolean;
  today: string;
}

/** Pure: the look and mood for one plant (tests call this directly). */
export function plantLookView(plant: CertPlant, i: LookInput): PlantLookView {
  const unlocked = new Set(unlockedLooks(plant, i.marks));
  const resolved = resolveLook(plant.species, plant.look, unlocked, defaultKeepsakes(plant, i.marks));
  const visiting = i.planCleared && resolved.visitor !== 'no-visitor' && !i.resting;
  // A back-filled growth (planting, or a restore with no plant) is one quiet
  // line, never a moment, so it is no reason to look proud (code review M5).
  const grewToday = Object.values(plant.reached ?? {}).some((at) => typeof at === 'number' && dayKey(at) === i.today && at !== plant.backfill?.at);
  const mood = plantMood({ face: i.face, resting: i.resting, grewToday, newKeepsakeToday: i.newKeepsakeToday, planCleared: i.planCleared, newTopicToday: i.newTopicToday });
  return {
    unlocked,
    resolved,
    art: { palette: resolved.palette, ground: resolved.ground, planter: resolved.planter, visitor: visiting ? resolved.visitor : undefined, keepsakes: resolved.keepsakes },
    mood,
    visiting,
  };
}

/** The plant view for the active cert (Today, You, Your plant). */
export function usePlantView(): PlantView & { cert: Certification; certId: string; exam: 'eve' | 'day' | null; look: PlantLookView | null; reactionId: string | null } {
  const certId = useSettings((s) => s.activeCertId);
  const examDate = useSettings((s) => s.examDates[certId]);
  // Only what the view reads (code review M6c): a review, a bookmark or a
  // session save elsewhere in the cert never rebuilds the plant on a mounted tab.
  const answers = useProgress((s) => selectCert(s, certId).answers);
  const plant = useProgress((s) => selectCert(s, certId).plant);
  const lastDay = useProgress((s) => selectCert(s, certId).milestones?.lastDay);
  const settings = useProgress((s) => s.plantSettings);
  const cert = getCertification(certId) ?? CERTIFICATIONS[0];
  // Today's date, read once per render of a screen that is already re-rendering.
  // eslint-disable-next-line react-hooks/purity -- the day only matters at day granularity
  const now = Date.now();
  const today = dayKey(now);
  // The day before the exam and exam day are planned rest: the calm look, never a nudge.
  const exam = examMoment(examDate, now);
  const plannedRest = exam !== null;
  const view = useMemo(
    () => plantView(cert, { answers, plant, milestones: lastDay ? { earned: {}, lastDay } : undefined }, settings, today, plannedRest),
    [cert, answers, plant, lastDay, settings, today, plannedRest],
  );
  // Mobile 1.14: the look and the mood, from small, stable selections.
  const marks = useProgress((s) => marksKey(s, today));
  const planCleared = useProgress((s) => {
    const d = s.days[certId];
    return !!d && d.day === today && planComplete(d);
  });
  const newTopicToday = useProgress((s) => Object.values(selectCert(s, certId).mastery ?? {}).some((m) => m?.firstDay === today));
  // Mobile 1.18: today's proud occasions (a growth step, a new learning
  // keepsake), judged against what this phone wrote down (store/seen.ts), so
  // the keepsake cap holds and nothing replays after a relaunch.
  const proudLog = useSeen((s) => s.proud);
  const occasions = useMemo<ProudOccasion[]>(() => {
    const [keepsakes] = JSON.parse(marks) as [ProudOccasion[], string[]];
    return [...growthOccasions(certId, view.plant, today), ...keepsakes];
  }, [marks, certId, view.plant, today]);
  const proud = useMemo(() => proudToday(proudLog ?? {}, occasions, now), [proudLog, occasions, now]);
  const occasionKey = occasions.map((o) => o.id).join(',');
  useEffect(() => {
    // Write down the new occasions (the cap applies once, here). No save when nothing is new.
    if (occasionKey) useSeen.getState().noteProud(occasions, Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by the occasions' ids
  }, [occasionKey]);
  const look = useMemo(() => {
    if (!view.plant) return null;
    return plantLookView(view.plant, { marks: allCertMarks(useProgress.getState().byCert), face: view.face, resting: view.resting, planCleared, newTopicToday, newKeepsakeToday: proud.keepsake, today });
    // `marks` changes when a badge or planter does: the unlocks are read fresh from the store then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.plant, view.face, view.resting, marks, planCleared, newTopicToday, proud.keepsake, today]);
  // The reaction's occasion: proud is keyed by its earned occasions (once ever,
  // and a new occasion later today is a new reason); the others by mood and day.
  const reactionId = look ? (look.mood === 'proud' ? (proudReactionId(proud.ids) ?? `${certId}:proud:${today}`) : `${certId}:${look.mood}:${today}`) : null;
  // The spoken label says the mood and the visitor too.
  const label = view.plant && look ? plantLabel({ name: view.plant.name, species: view.plant.species, growth: view.plant.growth, resting: view.resting, newGrowth: view.newGrowth, mood: look.mood, visitor: look.visiting ? look.resolved.visitor : undefined }) : view.label;
  return { ...view, label, cert, certId, exam, look, reactionId };
}
