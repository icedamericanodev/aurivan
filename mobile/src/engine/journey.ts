/**
 * The Exam Journey — where is this learner, and what is their ONE next step?
 *
 * Stages (docs/mobile/PRODUCT_VISION.md §2):
 *   diagnose → learn → practice → mock → ready → examDay → afterExam
 * Pure logic: give it the learner's numbers, get back a stage and a step.
 */
import type { Readiness } from './readiness';

export type Stage = 'diagnose' | 'learn' | 'practice' | 'mock' | 'ready' | 'examDay' | 'afterExam';

export interface JourneyInput {
  readiness: Readiness;
  answeredTotal: number;
  lessonsDone: number;
  lessonsAvailable: number;
  mocksTaken: number;
  daysLeft: number | null; // null = no exam date set
}

export const STAGE_ORDER: Stage[] = ['diagnose', 'learn', 'practice', 'mock', 'ready', 'examDay', 'afterExam'];

export const STAGE_LABEL: Record<Stage, string> = {
  diagnose: 'Find your gaps',
  learn: 'Learn the concepts',
  practice: 'Make it stick',
  mock: 'Rehearse the exam',
  ready: 'Ready check',
  examDay: 'Exam week',
  afterExam: 'After the exam',
};

/** Questions to answer before readiness says anything useful. */
export const DIAGNOSTIC_SIZE = 20;
export const DOMAIN_TARGET = 0.7;
export const MOCK_DOMAIN_FLOOR = 0.65;
export const READY_SCORE = 80;

export function journeyStage(j: JourneyInput): Stage {
  if (j.daysLeft !== null && j.daysLeft < 0) return 'afterExam';
  if (j.daysLeft !== null && j.daysLeft <= 7) return 'examDay';
  if (j.answeredTotal < DIAGNOSTIC_SIZE) return 'diagnose';

  const domains = j.readiness.domains;
  const lessonsShort = j.lessonsAvailable > 0 && j.lessonsDone < Math.min(j.lessonsAvailable, domains.length);
  if (lessonsShort && j.readiness.score < 50) return 'learn';

  const allAbove = (floor: number) => domains.every((d) => d.mastery >= floor);
  if (!allAbove(MOCK_DOMAIN_FLOOR)) return 'practice';
  if (j.mocksTaken < 2) return 'mock';
  if (j.readiness.score >= READY_SCORE) return 'ready';
  return 'practice';
}

/** Progress through the journey as 0..1 (for the journey bar). */
export function stageProgress(stage: Stage): number {
  return STAGE_ORDER.indexOf(stage) / (STAGE_ORDER.length - 1);
}
