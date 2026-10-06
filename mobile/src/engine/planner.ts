/**
 * Today's plan — a short, achievable list built from the learner's real
 * situation: reviews due, the weakest high-weight domain, lessons not yet
 * done, and how close the exam is. Never more than ~4 items: one screen,
 * one clear next step, no guilt.
 */
import type { Stage } from './journey';

export type PlanItem =
  | { kind: 'review'; count: number }
  | { kind: 'lesson'; lessonId: string; title: string }
  | { kind: 'practice'; domainId?: string; count: number; label: string }
  | { kind: 'game'; gameId: 'trap' | 'sprint' | 'priority'; label: string }
  | { kind: 'mock'; questions: number; label: string };

export interface PlanInput {
  stage: Stage;
  dueReviews: number;
  dailyGoal: number;
  focusDomain?: { id: string; short: string };
  nextLesson?: { id: string; title: string };
  daysLeft: number | null;
  examQuestions: number; // full mock length for this certification
}

export function todaysPlan(p: PlanInput): PlanItem[] {
  const plan: PlanItem[] = [];
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
      plan.push({ kind: 'game', gameId: 'trap', label: 'Trap Spotter · 2 min' });
      break;
    case 'mock': {
      const mini = Math.round(p.examQuestions / 3);
      plan.push({ kind: 'mock', questions: mini, label: `Mini mock · ${mini} questions` });
      break;
    }
    case 'ready':
      plan.push({ kind: 'game', gameId: 'sprint', label: 'Calibrated Sprint · check your confidence' });
      plan.push({ kind: 'practice', count: 10, label: '10 mixed questions to stay sharp' });
      break;
    case 'examDay':
      plan.push({ kind: 'practice', count: 10, label: 'Light review · 10 questions' });
      plan.push({ kind: 'game', gameId: 'priority', label: 'Priority Lens · read like the examiner' });
      break;
    case 'afterExam':
      break;
  }

  // Spaced reviews always come first when due — they are the cheapest wins.
  if (p.dueReviews > 0 && p.stage !== 'afterExam') {
    plan.unshift({ kind: 'review', count: Math.min(p.dueReviews, 20) });
  }
  return plan.slice(0, 4);
}
