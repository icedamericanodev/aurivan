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

  // Was a known bug (QA Build 1): the plan was frozen at 08:00 with "Review
  // 5 due", four more fell due at 12:00, and at 13:00 the card started a
  // 9-question session. Fixed: the session asks the card's count.
  it('still asks the number on the card after more reviews fall due later the same day', () => {
    seed(5, 4);
    ensureTodayPlan('cisa');
    const item = todayReview();
    expect(item).toEqual({ kind: 'review', count: 5 });
    now = T0 + 5 * HOUR; // 13:00: the four later reviews are now due too
    runPlanItem(item, 'cisa');
    expect(useSession.getState().active!.questionIds).toHaveLength(item.count);
  });

  // Was a known bug (QA Build 1): after the queue was cleared elsewhere, the
  // card showed "Nothing to practice yet". Fixed: it opens "caught up".
  it('an emptied queue opens "caught up", like the Practice and You rows', () => {
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
