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
      // The card says "Review N due": the session asks exactly N, even if more
      // fell due since the plan was made. If the queue was cleared elsewhere,
      // open "caught up" (as the Practice and You rows do), not an error.
      return guardedStart(() => startReview(certId, item.count), openSession, () => router.push('/caught-up'));
    case 'lesson':
      // The id goes in as a route param, never pasted into the path.
      return router.push({ pathname: '/lesson/[id]', params: { id: item.lessonId } });
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
