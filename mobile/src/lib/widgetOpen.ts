/**
 * What a widget tap does once the app is open (mobile 1.47, app/widget.tsx).
 *
 * Every widget link is `kaisip://widget?kind=…&go=…&from=widget`. This file
 * turns the (untrusted) link into one place in the app:
 * - Start / 5 questions: today's plan as it is NOW (the app's live plan,
 *   never the widget's possibly older copy), the same as Today's Start;
 * - Revisit: today's plan's own review item, so the count matches the
 *   widget's (the whole due queue only when the plan has none left); a Quick
 *   question or "Try one": that one question, answered in the app with every
 *   option explained;
 * - everything else opens its screen, with Today underneath so Back works.
 * - A quiz still open is never closed by a link (any app can send one): a
 *   study tap resumes it, and a screen opens on top of it. Either way the
 *   blank /widget screen is cleared first (1.47.1), so Back never lands on it.
 *
 * A tap earns nothing: it only opens. Local counts (store/widgets.ts): an
 * open per widget kind, and "started" only when a session really starts
 * (lib/widgetStats.ts claims it in the session factory).
 */
import { router, type Href } from 'expo-router';
import { findQuestion } from '../content/loader';
import { findPrinciple } from '../content/principles';
import { currentIndex, planComplete, shortSetItem } from '../engine/dayPlan';
import { GOAL_ROUTES, type WidgetTap } from '../engine/widgets';
import { dayKey } from '../engine/streak';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { examDateOf, useSettings } from '../store/settings';
import { effectiveCertId } from './activeCert';
import { useWidgetStore } from '../store/widgets';
import { runPlanItem, runShortSet } from './actions';
import { ensureTodayPlan } from './activity';
import { daysUntil } from './useActiveCert';
import { guardedStart, startFromIds, startReview } from './sessions';
import { armWidgetStart } from './widgetStats';

const openSession = () => router.push('/session');

/** Back to Today first (a widget link can arrive on a cold start, with nothing underneath). */
function home() {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/home');
}

/** Open the place a widget tap names. Returns whether it asked for a session (the count waits for a real start). */
export function openFromWidget(tap: WidgetTap): boolean {
  const settings = useSettings.getState();
  if (!settings.onboarded) {
    router.replace('/');
    return false;
  }
  if (tap.fromWidget) useWidgetStore.getState().noteOpen(tap.kind, dayKey(Date.now()));
  const certId = effectiveCertId(settings.activeCertId);
  const active = useSession.getState().active;
  const busy = Boolean(active && !active.finishedAt);
  const study = tap.go === 'start' || tap.go === 'short' || tap.go === 'review' || tap.go === 'question';
  // A quiz is open: never close it from a link. A study tap resumes it; a screen opens on top of it.
  // Today goes underneath first (home() also removes /widget), then the quiz (it restores from the
  // store), so Back goes screen → quiz → Today, never to a blank screen or a second quiz.
  if (busy) {
    home();
    openSession();
    if (study || tap.go === 'today') return false;
    if (tap.go === 'principle') router.push(tap.id && findPrinciple(certId, tap.id) ? { pathname: '/principles/[id]', params: { id: tap.id } } : '/principles');
    else router.push(GOAL_ROUTES[tap.go as keyof typeof GOAL_ROUTES] as Href);
    return false;
  }
  if (tap.fromWidget && study) armWidgetStart(tap.kind);
  switch (tap.go) {
    case 'start':
    case 'short': {
      ensureTodayPlan(certId);
      const plan = useProgress.getState().days[certId];
      home();
      if (!plan || plan.items.length === 0 || planComplete(plan)) return false;
      const left = daysUntil(examDateOf(settings.examDates, certId));
      const i = tap.go === 'short' ? shortSetItem(plan, { examWeek: left !== null && left >= 0 && left <= 7 }) : -1;
      if (i >= 0) runShortSet(plan.items[i], certId);
      else runPlanItem(plan.items[currentIndex(plan)], certId);
      return true;
    }
    case 'review': {
      // The widget shows today's plan's review count: run that item (it asks exactly its count).
      ensureTodayPlan(certId);
      const plan = useProgress.getState().days[certId];
      const ri = plan ? plan.items.findIndex((it, i) => it.kind === 'review' && !plan.done[i]) : -1;
      home();
      if (plan && ri >= 0) runPlanItem(plan.items[ri], certId);
      else guardedStart(() => startReview(certId), openSession, () => router.push('/caught-up'));
      return true;
    }
    case 'question':
      home();
      if (tap.id && findQuestion(certId, tap.id)) {
        guardedStart(() => startFromIds(certId, [tap.id as string], 'Quick question'), openSession);
        return true;
      }
      return false;
    case 'principle':
      home();
      if (tap.id && findPrinciple(certId, tap.id)) router.push({ pathname: '/principles/[id]', params: { id: tap.id } });
      else router.push('/principles');
      return false;
    case 'today':
      home();
      return false;
    default:
      home();
      router.push(GOAL_ROUTES[tap.go] as Href);
      return false;
  }
}
