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
import { useMemo } from 'react';
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
import { computeReadiness } from '../engine/readiness';
import { dayKey } from '../engine/streak';
import { selectCert, useProgress, type CertProgress, type MockResult } from '../store/progress';
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
  let grew: GrowthLevel | null = null;
  useProgress.getState().updatePlant(certId, (p, cp) => {
    if (!p) return p;
    const facts = plantFactsFor(certId, cp, now);
    if (!facts) return p;
    const r = advance(p, facts, now);
    grew = r.grew;
    return r.plant;
  });
  return grew;
}

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

/** Pure: the view for one cert's progress (tests call this directly). */
export function plantView(cert: Certification, cp: CertProgress, settings: PlantSettings | undefined, today: string, plannedRest = false): PlantView {
  const shown = plantShown(settings);
  const readiness = computeReadiness(cert, cp.answers);
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

/** The plant view for the active cert (Today, You, Your plant). */
export function usePlantView(): PlantView & { cert: Certification; certId: string } {
  const certId = useSettings((s) => s.activeCertId);
  const examDate = useSettings((s) => s.examDates[certId]);
  const cp = useProgress((s) => selectCert(s, certId));
  const settings = useProgress((s) => s.plantSettings);
  const cert = getCertification(certId) ?? CERTIFICATIONS[0];
  // Today's date, read once per render of a screen that is already re-rendering.
  // eslint-disable-next-line react-hooks/purity -- the day only matters at day granularity
  const now = Date.now();
  const today = dayKey(now);
  // The day before the exam and exam day are planned rest: the calm look, never a nudge.
  const plannedRest = examMoment(examDate, now) !== null;
  const view = useMemo(() => plantView(cert, cp, settings, today, plannedRest), [cert, cp, settings, today, plannedRest]);
  return { ...view, cert, certId };
}
