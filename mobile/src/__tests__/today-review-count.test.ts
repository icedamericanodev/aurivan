/**
 * QA Build 1: Today's review item and the session it starts.
 *
 * Today's plan is frozen the first time Today is shown each day, and the
 * review item's title is "Review N due" with N taken at that moment. The
 * session it starts must ask the same N questions the card promised.
 *
 * Gotcha (see session-screen.regression.test.tsx): never write
 * `act(() => store.action())` — use braces.
 */
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { getAllQuestions } from '../content/loader';
import { DAY_MS, type ReviewEntry } from '../engine/srs';
import { ensureTodayPlan } from '../lib/activity';
import { runPlanItem } from '../lib/actions';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));

const ids = getAllQuestions('cisa').map((q) => q.id);
const T0 = new Date(2026, 9, 12, 8, 0, 0).getTime(); // 08:00 local
const HOUR = 3_600_000;

/** Reviews: `dueNow` already due at T0, `dueLater` falling due at 12:00 the same day. */
function seed(dueNow: number, dueLater: number) {
  const review: Record<string, ReviewEntry> = {};
  ids.slice(0, dueNow).forEach((id) => (review[id] = { box: 2, dueAt: T0 - DAY_MS, lastSeen: T0 - 2 * DAY_MS, reps: 1 }));
  ids.slice(dueNow, dueNow + dueLater).forEach((id) => (review[id] = { box: 2, dueAt: T0 + 4 * HOUR, lastSeen: T0 - DAY_MS + 4 * HOUR, reps: 1 }));
  useProgress.getState().resetCert('cisa');
  useProgress.setState((s) => ({
    days: {},
    byCert: { ...s.byCert, cisa: { ...s.byCert.cisa, review } },
  }));
}

let now = T0;
beforeEach(() => {
  now = T0;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  useSettings.setState({ activeCertId: 'cisa', examDates: {}, dailyGoal: 20 });
  useSession.getState().clear();
});
afterEach(() => {
  jest.restoreAllMocks();
  useSession.getState().clear();
});

const todayReview = () => {
  const plan = useProgress.getState().days.cisa;
  const item = plan.items.find((i) => i.kind === 'review');
  if (!item || item.kind !== 'review') throw new Error('no review item on Today');
  return item;
};

describe("Today's review item", () => {
  it('asks exactly as many questions as the card says, when nothing changed since the plan was made', () => {
    seed(5, 0);
    ensureTodayPlan('cisa');
    const item = todayReview();
    // Today shows it as "Review 5 due" (components/journey.tsx planText).
    expect(item).toEqual({ kind: 'review', count: 5 });
    runPlanItem(item, 'cisa');
    expect(useSession.getState().active!.questionIds).toHaveLength(5);
  });

  // KNOWN BUG (QA Build 1): the plan is frozen at 08:00 with "Review 5 due";
  // four more reviews fall due at 12:00; at 13:00 the same card starts a
  // 9-question session. Flip `it.failing` to `it` once the card and the
  // session agree (see lib/actions.ts runPlanItem, case 'review').
  it.failing('still asks the number on the card after more reviews fall due later the same day', () => {
    seed(5, 4);
    ensureTodayPlan('cisa');
    const item = todayReview();
    expect(item).toEqual({ kind: 'review', count: 5 });
    now = T0 + 5 * HOUR; // 13:00: the four later reviews are now due too
    runPlanItem(item, 'cisa');
    expect(useSession.getState().active!.questionIds).toHaveLength(item.count);
  });

  // KNOWN BUG (QA Build 1): the card still says "Review 3 due" after those
  // reviews were done elsewhere (e.g. from Practice → Spaced review, or
  // answered right in a practice set). Tapping it shows "Nothing to
  // practice yet · Try a different filter, or answer a few questions
  // first", which is the wrong message for a cleared queue. Practice and
  // You open the "caught up" screen instead. Flip `it.failing` to `it`
  // once runPlanItem passes the same empty handler (lib/actions.ts).
  it.failing('an emptied queue opens "caught up", like the Practice and You rows', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    seed(3, 0);
    ensureTodayPlan('cisa');
    const item = todayReview();
    useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...s.byCert.cisa, review: {} } } }));
    runPlanItem(item, 'cisa');
    expect(alert).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith('/caught-up');
  });
});
