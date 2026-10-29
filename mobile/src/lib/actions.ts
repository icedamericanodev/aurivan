/**
 * runPlanItem — what happens when a learner taps an item in "Today's plan".
 * One place, so Journey, Learn and Practice all behave the same way.
 */
import { router } from 'expo-router';
import { SHORT_SET_SIZE } from '../engine/dayPlan';
import type { PlanItem } from '../engine/planner';
import { useSession } from '../store/session';
import { startFirstSet } from './firstSet';
import { guardedStart, startPractice, startReview } from './sessions';

const openSession = () => router.push('/session');

/**
 * Open a set that was just started from a screen deep in the root stack: a
 * study note, a notes domain page, Lesson complete (mobile 1.20). Those can sit
 * on top of an old session or its Results (Session → miss → note, Results →
 * "Read the notes…" → note, Session → "Review the lesson"). Pushing /session
 * there would leave two session screens on one `active` (both would finish it
 * and open Results twice), or an old Results re-rendering under the new set.
 * So: back to the tabs first, then the session. expo-router queues both and
 * works out the push after the pop. Guided keeps a plain push on purpose:
 * its Results returns to the Guided screen under the session.
 */
/**
 * Go to a tab (Today, Learn, Practice…) from a screen in the root stack (mobile
 * 1.20). The tabs sit at the bottom of that stack; push and navigate would
 * both stack a NEW tab navigator on top (expo-router 57), so dismiss back to
 * the one already there. Nothing under this screen (a deep link): replace.
 */
/** Practice, opened at Drills: where every old Play link lands (app/play.tsx, lib/legacyLinks.ts, a badge's "Study for this"). */
export const DRILLS_SECTION = 'drills';
export const DRILLS_HREF = { pathname: '/practice', params: { section: DRILLS_SECTION } } as const;
export const DRILLS_PATH = `/practice?section=${DRILLS_SECTION}`;

export function openTab(href: TabHref) {
  if (router.canDismiss()) router.dismissTo(href);
  else router.replace(href);
}
type TabHref =
  | '/home'
  | '/learn'
  | '/practice'
  | '/you'
  | { pathname: '/learn'; params: { domain: string } }
  // Mobile 1.51: Practice opened at Drills (where the Play tab's links land now).
  | { readonly pathname: '/practice'; readonly params: { readonly section: 'drills' } };

/**
 * A route param decoded for lookup. A malformed one (a lone "%" in a link)
 * makes decodeURIComponent throw, which would crash the screen: use it as
 * it came instead, so the screen shows its calm "not found".
 */
export function safeDecode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function openSessionFromStack() {
  if (router.canDismiss()) router.dismissAll();
  router.push('/session');
}

/**
 * "Short on time? 5 questions" on Today (mobile 1.41): the plan's review or
 * practice item, at five questions. Same mode and the same domain as the
 * item, so its answers bank on it (engine/dayPlan.ts logActivity) and count
 * toward today's plan. Anything else just runs the item as usual.
 */
export function runShortSet(item: PlanItem, certId: string) {
  if (item.kind === 'review') {
    return guardedStart(() => startReview(certId, Math.min(SHORT_SET_SIZE, item.count)), openSession, () => router.push('/caught-up'));
  }
  if (item.kind === 'practice' && item.why !== 'first') {
    return guardedStart(
      () => startPractice(certId, { count: SHORT_SET_SIZE, domainId: item.domainId, title: item.label }),
      openSession,
    );
  }
  return runPlanItem(item, certId);
}

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
      // Day 1's item is the fixed first set (the same five questions for everyone), not a random draw.
      // A first set that was left half-done is resumed where it stopped (never restarted behind an alert).
      if (item.why === 'first') {
        const paused = useSession.getState().active;
        // Only this certification's paused set (a learner who switched certs starts this cert's own).
        if (paused?.firstSet && !paused.finishedAt && paused.certId === certId) return openSession();
        // A set ended early starts again with only the questions still unanswered (lib/firstSet.ts).
        return guardedStart(() => startFirstSet(certId), openSession);
      }
      return guardedStart(
        () => startPractice(certId, { count: item.count, domainId: item.domainId, title: item.label }),
        openSession,
      );
    case 'game':
      return router.push(`/game/${item.gameId}`);
    case 'mock':
      // The start sheet first (timing and "hide the clock"); it starts the session.
      return router.push({ pathname: '/mock-start', params: { questions: String(item.questions) } });
  }
}
