/**
 * runPlanItem — what happens when a learner taps an item in "Today's plan".
 * One place, so Journey, Learn and Practice all behave the same way.
 */
import { router } from 'expo-router';
import type { PlanItem } from '../engine/planner';
import { guardedStart, startMock, startPractice, startReview } from './sessions';

const openSession = () => router.push('/session');

export function runPlanItem(item: PlanItem, certId: string) {
  switch (item.kind) {
    case 'review':
      // A labelled review is the exam eve's light review: stop at its count.
      return guardedStart(() => startReview(certId, item.label ? item.count : undefined), openSession);
    case 'lesson':
      return router.push(`/lesson/${item.lessonId}`);
    case 'practice':
      return guardedStart(
        () => startPractice(certId, { count: item.count, domainId: item.domainId, title: item.label }),
        openSession,
      );
    case 'game':
      return router.push(`/game/${item.gameId}`);
    case 'mock':
      return guardedStart(() => startMock(certId, item.questions), openSession);
  }
}
