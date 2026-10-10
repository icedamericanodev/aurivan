/**
 * Today's plan — a short, achievable list built from the learner's real
 * situation: reviews due, the weakest high-weight domain, lessons not yet
 * done, and how close the exam is. Never more than ~4 items: one screen,
 * one clear next step, no guilt.
 */
import { GAMES, type GameId } from './games/registry';
import type { Stage } from './journey';
import { REVIEW_SESSION_CAP } from './srs';

/** A game's plan label: its registry name and honest length (e.g. "Snare Spotter · 6 min"). */
const gameItem = (gameId: GameId): PlanItem => ({ kind: 'game', gameId, label: `${GAMES[gameId].name} · ${GAMES[gameId].minutes} min` });

export type PlanItem =
  /** `label` is optional: older saved plans have none, and Today then says "Review N due". */
  /**
   * `capped`: more were due than one session asks (REVIEW_SESSION_CAP), so
   * Today says "reviews come 20 at a time". Written only when true (older
   * saves and uncapped items keep the old shape).
   */
  | { kind: 'review'; count: number; label?: string; capped?: boolean }
  | { kind: 'lesson'; lessonId: string; title: string }
  | { kind: 'practice'; domainId?: string; count: number; label: string }
  /** `label` is saved with the day's plan; screens show the registry name, so old labels never show an old name. */
  | { kind: 'game'; gameId: GameId; label: string }
  | { kind: 'mock'; questions: number; label: string };

export interface PlanInput {
  stage: Stage;
  dueReviews: number;
  dailyGoal: number;
  focusDomain?: { id: string; short: string };
  nextLesson?: { id: string; title: string };
  daysLeft: number | null;
  examQuestions: number; // full mock length for this certification
  /**
   * Whether a game has enough questions for this certification
   * (registry isPlayable). Optional: leaving it out treats every game as playable.
   */
  playable?: (id: GameId) => boolean;
}

/** The most the exam eve asks for: a light review, never a cram. */
export const EVE_MAX = 10;
/** Exam day: an optional warm-up only. */
export const WARM_UP = 5;

export function todaysPlan(p: PlanInput): PlanItem[] {
  // The day before the exam and exam day are for rest, not cramming
  // (the eve card says "Rest tonight rather than cram"; the plan must agree).
  // Eve: ONE light item, due reviews if any, else practice. No game, no mock.
  if (p.daysLeft === 1) {
    const label = `Light review · up to ${EVE_MAX}`;
    return p.dueReviews > 0
      ? [{ kind: 'review', count: Math.min(p.dueReviews, EVE_MAX), label }]
      : [{ kind: 'practice', count: EVE_MAX, label }];
  }
  // Exam day: only an optional five-question warm-up.
  if (p.daysLeft === 0) {
    return [{ kind: 'practice', count: WARM_UP, label: `Optional warm-up · ${WARM_UP} questions` }];
  }

  const plan: PlanItem[] = [];
  // A game is only planned when it can be played (small banks hide it).
  const addGame = (id: GameId) => {
    if (!p.playable || p.playable(id)) plan.push(gameItem(id));
  };
  const practiceCount = Math.max(5, Math.min(p.dailyGoal, 20));

  switch (p.stage) {
    case 'diagnose':
      plan.push({ kind: 'practice', count: 20, label: 'Diagnostic: 20 mixed questions' });
      break;
    case 'learn':
      if (p.nextLesson) plan.push({ kind: 'lesson', lessonId: p.nextLesson.id, title: p.nextLesson.title });
      plan.push({
        kind: 'practice',
        domainId: p.focusDomain?.id,
        count: 10,
        label: p.focusDomain ? `10 questions · ${p.focusDomain.short}` : '10 mixed questions',
      });
      break;
    case 'practice':
      plan.push({
        kind: 'practice',
        domainId: p.focusDomain?.id,
        count: practiceCount,
        label: p.focusDomain ? `${practiceCount} questions · ${p.focusDomain.short}` : `${practiceCount} mixed questions`,
      });
      if (p.nextLesson) plan.push({ kind: 'lesson', lessonId: p.nextLesson.id, title: p.nextLesson.title });
      addGame('trap');
      break;
    case 'mock': {
      const mini = Math.round(p.examQuestions / 3);
      plan.push({ kind: 'mock', questions: mini, label: `Mini mock · ${mini} questions` });
      break;
    }
    case 'ready':
      addGame('sprint');
      plan.push({ kind: 'practice', count: 10, label: '10 mixed questions to stay sharp' });
      break;
    case 'examDay':
      plan.push({ kind: 'practice', count: 10, label: 'Light review · 10 questions' });
      addGame('priority');
      break;
    case 'afterExam':
      break;
  }

  // Spaced reviews always come first when due — they are the cheapest wins.
  if (p.dueReviews > 0 && p.stage !== 'afterExam') {
    const capped = p.dueReviews > REVIEW_SESSION_CAP;
    plan.unshift({ kind: 'review', count: Math.min(p.dueReviews, REVIEW_SESSION_CAP), ...(capped ? { capped } : {}) });
  }
  return plan.slice(0, 4);
}
