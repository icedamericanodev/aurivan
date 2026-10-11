/**
 * QA for PR #41 (mobile 1.11.0): stats in plain words, badge tiers, Took
 * Root, the one-time catalogue fill, sets that grow, domain emblems and the
 * badge share card. Spec: BADGES_C.md slices C + D, COMPL_B.md §5.
 *
 * Every journey runs on the real content pack and the real stores. Bugs that
 * still reproduce on the branch are pinned with `it.failing`: each one turns
 * red (and must be flipped back to `it`) once the fix lands.
 *
 * Gotcha: never `act(() => store.action())` — use braces.
 */
import { Modal, Share } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import * as Sharing from 'expo-sharing';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Results from '../app/results';
import Badges from '../app/milestones';
import You from '../app/(tabs)/you';
import { ClearingBody } from '../components/journey';
import { PacingPanel } from '../components/pace';
import { MilestoneMomentView, resetBadgeMomentsForTest } from '../components/milestones';
import { resetCelebrationsForTest } from '../components/motion';
import { BadgeShareCard } from '../components/shareCard';
import { getCertification } from '../content/certifications';
import { getAllQuestions, getDomainQuestions } from '../content/loader';
import { CATALOG_VERSION, caseKey, caseMarks, caseSets, grownLine, nextForExam, setCountLine, type CaseInput, type CaseMark } from '../engine/badgeCatalog';
import { newDayPlan, type DayPlan } from '../engine/dayPlan';
import type { Stage } from '../engine/journey';
import { allMarks, keepSupported, markSupported, type CertMilestones, type MarkEvidence, type MilestoneFacts, type MockFacts } from '../engine/milestones';
import { aboutSeconds, PACE_LINE_MIN, pacingStats, pacingStatsLine, practicePaceLine, timeStat } from '../engine/pace';
import { computeReadiness } from '../engine/readiness';
import { readinessRange } from '../engine/readinessRange';
import { badgeCardText, badgeShareable, isHonestShareText, studyingFor } from '../engine/shareCard';
import { dayKey } from '../engine/streak';
import { hasNewBadge } from '../lib/badges';
import { checkBackupText, currentBackup, restoreBackup } from '../lib/backup';
import { finishSession } from '../lib/finishSession';
import { catalogFillLine, checkMilestones, ensureCatalog, momentFor } from '../lib/milestones';
import { certOutline, questionExists } from '../lib/outline';
import { startFromIds, startMock, startReview } from '../lib/sessions';
import { selectCert, useProgress, type MockResult } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => {}) }));
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(async () => '/tmp/card.png'), releaseCapture: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), setParams: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(cb, [cb]),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));
jest.mock('expo', () => ({ ...jest.requireActual('expo'), isRunningInExpoGo: () => false }));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
  setNotificationChannelAsync: async () => null,
  setNotificationHandler: () => {},
  getPermissionsAsync: async () => ({ granted: false }),
  requestPermissionsAsync: async () => ({ granted: false }),
  getAllScheduledNotificationsAsync: async () => [],
  cancelScheduledNotificationAsync: async () => {},
  scheduleNotificationAsync: async (req: { identifier: string }) => req.identifier,
}));

// ── Shared helpers ───────────────────────────────────────────────────────
const T0 = new Date(2026, 9, 12, 10, 0, 0).getTime();
const DAY = 86_400_000;
const MIN = 60_000;
const cisa = getCertification('cisa')!;
const ALL = getAllQuestions('cisa').map((q) => q.id);

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const textOf = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
const allText = () => textOf(root());
/** Spoken labels of host views whose label starts with one of these words, once each. */
const spoken = (re: RegExp) =>
  root()
    .findAll((n) => typeof n.type === 'string' && typeof n.props.accessibilityLabel === 'string' && re.test(n.props.accessibilityLabel))
    .map((n) => n.props.accessibilityLabel as string);
const resultStats = () => spoken(/^(Correct|Missed|Time): /);
const buttons = (label: RegExp) =>
  root().findAll((x) => typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string' && label.test(x.props.accessibilityLabel));
const press = (label: RegExp) => {
  const n = buttons(label)[0];
  if (!n) throw new Error(`no button ${label}`);
  act(() => n.props.onPress());
};
const cp = () => selectCert(useProgress.getState(), 'cisa');
const ms = () => cp().milestones!;

function freshStores() {
  useProgress.setState({ byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {} });
  useSession.getState().clear();
  useSettings.setState({ onboarded: true, activeCertId: 'cisa', examDates: {}, badgesHidden: false });
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {}, badgeSort: undefined });
}
/** Badges already filled for this catalogue, so no launch back-fill runs inside a journey. */
function filled(extra: Partial<CertMilestones> = {}) {
  act(() => {
    useProgress.getState().updateMilestones('cisa', (m) => ({
      milestones: { ...(m ?? { earned: {} }), backfill: { at: T0 - 90 * DAY, count: 0, seen: true }, catalog: CATALOG_VERSION, ...extra },
    }));
  });
}
/** Saved answers (all right unless said), as records, without going through a session. */
function seedAnswers(ids: readonly string[], lastAt: number, correct = true) {
  act(() => {
    useProgress.setState((s) => {
      const c = selectCert(s, 'cisa');
      const add = Object.fromEntries(ids.map((id) => [id, { attempts: 1, correctCount: correct ? 1 : 0, lastCorrect: correct, lastAt }]));
      return { byCert: { ...s.byCert, cisa: { ...c, answers: { ...c.answers, ...add } } } };
    });
  });
}
function seedMocks(mocks: MockResult[]) {
  act(() => {
    useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...selectCert(s, 'cisa'), mocks } } }));
  });
}
const fullMock = (id: string, finishedAt: number, over: Partial<MockResult> = {}): MockResult => ({
  id,
  finishedAt,
  total: 150,
  correct: 110,
  minutesUsed: 200,
  byDomain: {},
  timing: 'standard',
  unanswered: 0,
  ...over,
});
const perDomain = (n: number) => cisa.domains.flatMap((d) => getDomainQuestions('cisa', d.id).slice(0, n).map((q) => q.id));

/** Answer the active session's questions: the first `right` correct, each in `ms`. */
function answer(ids: readonly string[], right: number, msEach: number | undefined) {
  act(() => {
    ids.forEach((id, i) => useSession.getState().answer(id, { display: 'A', correct: i < right, ...(msEach !== undefined ? { ms: msEach } : {}), at: Date.now() }));
  });
}
function finishAt(at: number) {
  jest.setSystemTime(at);
  act(() => {
    finishSession();
  });
}

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  setMockReducedMotion(true);
  resetCelebrationsForTest();
  resetBadgeMomentsForTest();
  jest.clearAllMocks();
  freshStores();
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
  jest.useRealTimers();
});

// ═════════════════════════════════════════════════════════════════════════
// Journey 1: Results stats in plain words
// ═════════════════════════════════════════════════════════════════════════
describe('Journey 1 · Results stats', () => {
  beforeEach(() => filled());
  const IDS = ALL.slice(40, 80);

  it('a 1-question, 5-second practice: "1 of 1", "None", "Under a minute"; no pace line, no Median', () => {
    act(() => {
      startFromIds('cisa', IDS.slice(0, 1), 'Practice');
    });
    answer(IDS.slice(0, 1), 1, 5_000);
    finishAt(T0 + 5_000);
    mount(<Results />);
    expect(resultStats()).toEqual(['Correct: 1 of 1', 'Missed: none', 'Time: under a minute']);
    expect(allText()).not.toMatch(/per question|median|exam pace|to review/i);
  });

  it('the pace line needs 3 timed answers: 2 timed (plus untimed ones) say nothing', () => {
    expect(PACE_LINE_MIN).toBe(3);
    expect(practicePaceLine([5_000, 6_000], cisa.exam)).toBeNull();
    expect(practicePaceLine([5_000, undefined, 6_000, undefined, NaN], cisa.exam)).toBeNull();
    expect(practicePaceLine([5_000, 6_000, 7_000], cisa.exam)).toBe('About 6 seconds per question. The exam gives you about 96.');
    // Through Results: 3 questions, 2 with a time → no line.
    act(() => {
      startFromIds('cisa', IDS.slice(0, 3), 'Practice');
    });
    answer(IDS.slice(0, 2), 2, 30_000);
    answer(IDS.slice(2, 3), 1, undefined);
    finishAt(T0 + 2 * MIN);
    mount(<Results />);
    expect(allText()).not.toMatch(/per question/);
  });

  it('a 20-question practice with misses: counts, time, the missed button and one plain pace sentence', () => {
    act(() => {
      startFromIds('cisa', IDS.slice(0, 20), 'Practice');
    });
    answer(IDS.slice(0, 20), 13, 74_000);
    finishAt(T0 + 25 * MIN);
    mount(<Results />);
    expect(resultStats()).toEqual(['Correct: 13 of 20', 'Missed: 7', 'Time: 25 minutes']);
    const t = allText();
    expect(t).toContain('About 74 seconds per question. The exam gives you about 96.');
    expect(buttons(/^Practice the 7 you missed$/)).toHaveLength(1);
    expect(t).not.toMatch(/median/i);
  });

  it('a practice ended early counts only what was answered', () => {
    act(() => {
      startFromIds('cisa', IDS.slice(0, 20), 'Practice');
    });
    answer(IDS.slice(0, 12), 8, 50_000);
    finishAt(T0 + 11 * MIN);
    mount(<Results />);
    expect(resultStats()).toEqual(['Correct: 8 of 12', 'Missed: 4', 'Time: 11 minutes']);
  });

  it('a review: same stats, same pace sentence', () => {
    act(() => {
      useProgress.getState().queueForReview('cisa', IDS.slice(0, 5));
    });
    act(() => {
      startReview('cisa');
    });
    const ids = useSession.getState().active!.questionIds;
    expect(useSession.getState().active!.mode).toBe('review');
    expect(ids).toHaveLength(5);
    answer(ids, 3, 40_000);
    finishAt(T0 + 4 * MIN);
    mount(<Results />);
    expect(resultStats()).toEqual(['Correct: 3 of 5', 'Missed: 2', 'Time: 4 minutes']);
    expect(allText()).toContain('About 40 seconds per question. The exam gives you about 96.');
  });

  it('a timed full mock submitted at 3 h 31 min: hours read plainly; the pacing panel says "typical", never "median"', () => {
    act(() => {
      startMock('cisa');
    });
    const ids = useSession.getState().active!.questionIds;
    expect(ids).toHaveLength(150);
    answer(ids.slice(0, 146), 100, 80_000);
    finishAt(T0 + 211 * MIN);
    mount(<Results />);
    expect(resultStats()).toEqual(['Correct: 100 of 150', 'Missed: 46', 'Time: 3 hours 31 minutes']);
    const t = allText();
    expect(t).toContain('Typical time per question');
    expect(t).toContain('About 80 seconds');
    expect(t).toContain('Unanswered at submit');
    expect(t).toMatch(/3 h 31 min of 4 h/);
    // A mock never shows the practice pace sentence, and never "median" or a bare "s".
    expect(t).not.toMatch(/The exam gives you|median/i);
    expect(textOf(root().findByType(PacingPanel))).not.toMatch(/\d s\b/);
  });

  it('a timed mock reopened hours after its deadline ends AT the deadline: "4 hours"', () => {
    act(() => {
      startMock('cisa');
    });
    const ids = useSession.getState().active!.questionIds;
    answer(ids.slice(0, 10), 7, 90_000);
    finishAt(T0 + 6 * 60 * MIN);
    mount(<Results />);
    expect(resultStats()).toEqual(['Correct: 7 of 150', 'Missed: 3', 'Time: 4 hours']);
    expect(allText()).toContain('Unanswered when time ran out');
    expect(cp().mocks[0].minutesUsed).toBe(240);
  });

  it('an untimed mock left open for days: time is the answer time (1 h 5 min), labelled, no pacing panel', () => {
    act(() => {
      startMock('cisa', undefined, { timing: 'untimed' });
    });
    const ids = useSession.getState().active!.questionIds;
    expect(useSession.getState().active!.deadline).toBeUndefined();
    answer(ids.slice(0, 50), 40, 78_000); // 50 × 78 s = 65 min
    finishAt(T0 + 3 * DAY);
    mount(<Results />);
    expect(resultStats()).toEqual(['Correct: 40 of 150', 'Missed: 10', 'Time: 1 hour 5 minutes']);
    const t = allText();
    expect(t).toContain('Untimed mock: your answers count toward readiness, and pacing stats leave it out.');
    expect(t).not.toContain('Typical time per question');
    expect(t).not.toMatch(/median/i);
    expect(cp().mocks[0]).toMatchObject({ timing: 'untimed', minutesUsed: 65 });
  });

  it('hour-long and boundary durations read plainly', () => {
    expect(timeStat(59_999)).toEqual({ word: 'Under a minute', spoken: 'under a minute' });
    expect(timeStat(NaN).word).toBe('Under a minute');
    expect(timeStat(60 * MIN)).toEqual({ value: '1', unit: 'h', spoken: '1 hour' });
    expect(timeStat(59.6 * MIN)).toEqual({ value: '1', unit: 'h', spoken: '1 hour' });
    expect(timeStat(211 * MIN)).toEqual({ value: '3', unit: 'h 31 min', spoken: '3 hours 31 minutes' });
    expect(timeStat(1440 * MIN)).toEqual({ value: '24', unit: 'h', spoken: '24 hours' });
    expect(aboutSeconds(0.2)).toBe('about 1 second');
    expect(aboutSeconds(150)).toBe('about 2.5 minutes');
    // Slow practice (over 2 min a question): both figures switch to minutes together.
    expect(practicePaceLine([150_000, 150_000, 150_000], cisa.exam)).toBe('About 2.5 minutes per question. The exam gives you about 1.6.');
  });

  // BUG (Minor): same screen, two answers. Results says "Under a minute"
  // but the pacing panel under it says "Time used 1 min of 1 h 20 min".
  it.failing('a timed mini mock submitted after 30 s: the pacing panel agrees with "Under a minute"', () => {
    act(() => {
      startMock('cisa', 50);
    });
    finishAt(T0 + 30_000);
    mount(<Results />);
    expect(resultStats()).toContain('Time: under a minute');
    expect(allText()).not.toMatch(/Time used\s+1 min of/);
  });

  // BUG (Minor): on a mock, unanswered questions count as wrong in "Correct
  // 0 of 50", but "Missed" counts only answered-wrong ones, so a blank mock
  // reads "Correct 0 of 50 · Missed None" (app/results.tsx:113 and :206).
  it.failing('a mock submitted with every question blank never says "Missed: None"', () => {
    act(() => {
      startMock('cisa', 50);
    });
    finishAt(T0 + 2 * MIN);
    mount(<Results />);
    expect(resultStats()[0]).toBe('Correct: 0 of 50');
    expect(resultStats()).not.toContain('Missed: none');
  });
});

describe('Journey 1 · You stats and the mock summary', () => {
  beforeEach(() => filled());
  const statsOnYou = () => spoken(/^(Answered|Accuracy|Streak): /);

  it('a new learner: "Answered 0", "Accuracy Not yet", "Streak 0 days"', () => {
    mount(<You />);
    expect(statsOnYou()).toEqual(['Answered: 0', 'Accuracy: not yet, answer a question first', 'Streak: 0 days']);
  });

  it('after 10 answers today (7 right): "70 percent" and "1 day"', () => {
    act(() => {
      ALL.slice(0, 10).forEach((id, i) => useProgress.getState().recordAnswer('cisa', id, i < 7));
    });
    mount(<You />);
    expect(statsOnYou()).toEqual(['Answered: 10', 'Accuracy: 70 percent', 'Streak: 1 day']);
  });

  it('the summary under Mock exams has no "median" and reads in words', () => {
    expect(pacingStatsLine(pacingStats([{ timing: 'standard', medianSec: 80, unanswered: 4 }]))).toBe(
      'In your timed mock you took about 80 seconds per question. Some questions were left unanswered.',
    );
    expect(pacingStatsLine(pacingStats([{ timing: 'standard', medianSec: 80, unanswered: 0 }, { timing: 'plus25', medianSec: 90, unanswered: 2 }]))).toBe(
      'In your 2 timed mocks you took about 85 seconds per question. You answered every question in 1 of 2.',
    );
    // Untimed mocks never count.
    expect(pacingStatsLine(pacingStats([{ timing: 'untimed', medianSec: 80, unanswered: 0 }]))).toBeNull();
  });

  // BUG (Minor): Results says "3 h 31 min" for a mock; You → Mock exams lists the
  // same mock as "211 min" (app/(tabs)/you.tsx:259 prints minutesUsed raw).
  it.failing('You → Mock exams lists a long mock in hours, like Results does', () => {
    seedMocks([fullMock('m1', T0 - DAY, { minutesUsed: 211 })]);
    mount(<You />);
    expect(allText()).toContain('3 h 31 min');
    expect(allText()).not.toContain('211 min');
  });
});

describe('Journey 1 · Today clearing card', () => {
  const readiness = computeReadiness(cisa, {});
  const range = readinessRange(cisa, readiness);
  const plan = (over: Partial<DayPlan>): DayPlan => ({ ...newDayPlan(dayKey(T0), 'cisa', [{ kind: 'review', count: 1 }], readiness), done: [true], ...over });
  const clearing = () => spoken(/^(Questions|Correct|Time): /);

  it('Questions, Correct and Time each read on their own', () => {
    mount(<ClearingBody plan={plan({ answered: 31, correct: 25, minutes: 24 })} readiness={readiness} range={range} cert={cisa} />);
    expect(clearing()).toEqual(['Questions: 31', 'Correct: 81 percent', 'Time: 24 minutes']);
    act(() => r!.unmount());
    mount(<ClearingBody plan={plan({ answered: 0, correct: 0, minutes: 75 })} readiness={readiness} range={range} cert={cisa} />);
    expect(clearing()).toEqual(['Questions: 0', 'Correct: none yet', 'Time: 1 hour 15 minutes']);
  });

  // BUG (Minor): the owner's "1 minute for a 5-second session" is fixed on
  // Results but not on Today. finishSession logs minutesUsed() (rounded UP to
  // at least 1) into the day plan, so the clearing card says "1 min" for the
  // same 5-second session Results calls "Under a minute".
  it.failing('a 5-second review that clears the day: the clearing card says "Under a minute", like Results', () => {
    filled();
    act(() => {
      useProgress.getState().queueForReview('cisa', ALL.slice(0, 1));
    });
    act(() => {
      useProgress.getState().startDay(newDayPlan(dayKey(T0), 'cisa', [{ kind: 'review', count: 1 }], readiness));
    });
    act(() => {
      startReview('cisa');
    });
    answer(ALL.slice(0, 1), 1, 5_000);
    finishAt(T0 + 5_000);
    mount(<Results />);
    expect(resultStats()).toContain('Time: under a minute');
    act(() => r!.unmount());
    const today = useProgress.getState().days.cisa!;
    expect(today.done).toEqual([true]);
    mount(<ClearingBody plan={today} readiness={readiness} range={range} cert={cisa} />);
    expect(clearing()).toContain('Time: under a minute');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Journey 2: a 1.10 save meets 1.11 (badges, Long Memory at 25)
// ═════════════════════════════════════════════════════════════════════════
/** A topic with 2+ parts that have questions, and one question per part. */
function topicParts() {
  const has = questionExists('cisa');
  const topic = certOutline('cisa').topics.find((t) => t.subtopics.filter((s) => s.questionIds.some(has)).length >= 2)!;
  const parts = topic.subtopics.filter((s) => s.questionIds.some(has));
  return { topic, parts, oneEach: parts.map((s) => s.questionIds.find(has)!) };
}

/**
 * A learner on 1.10: back-filled (summary seen), no catalogue version yet.
 * 20 right answers in every domain (Whole Map and all five Firm Footings),
 * Long Memory at 25 (its counted list full at the old cap), Graduate and
 * Loop Closed: Evergreen complete with its planter. Two full timed mocks 10
 * days apart after Whole Map (Exam Day complete), and a whole topic mastered.
 */
function save110() {
  seedAnswers(perDomain(20), T0 - 40 * DAY);
  const { parts } = topicParts();
  seedMocks([fullMock('m20', T0 - 20 * DAY, { checkpoints: [0, 0.05, -0.05] }), fullMock('m10', T0 - 10 * DAY)]);
  act(() => {
    useProgress.setState((s) => ({
      byCert: {
        ...s.byCert,
        cisa: {
          ...selectCert(s, 'cisa'),
          mastery: Object.fromEntries(parts.map((p) => [p.id, { firstDay: '2026-09-01', masteredAt: '2026-09-03' }])),
          milestones: {
            earned: {
              'first-foothold': T0 - 50 * DAY,
              'whole-map': T0 - 30 * DAY,
              ...Object.fromEntries(cisa.domains.map((d) => [`firm-footing:${d.id}`, T0 - 31 * DAY])),
              'long-memory': T0 - 40 * DAY,
              graduate: T0 - 35 * DAY,
              'loop-closed': T0 - 30 * DAY,
              'dress-rehearsal': T0 - 20 * DAY,
              'on-pace': T0 - 20 * DAY,
            },
            backfill: { at: T0 - 60 * DAY, count: 3, seen: true },
            counts: { longRecall: 25, graduated: 50, loopFixed: 10 },
            longIds: Array.from({ length: 25 }, (_, i) => ALL[400 + i]),
            planters: { evergreen: T0 - 30 * DAY, domains: T0 - 30 * DAY, examDay: T0 - 20 * DAY },
          },
        },
      },
    }));
  });
}

describe('Journey 2 · upgrading a 1.10 save', () => {
  it('the quiet fill runs once: Took Root and Dress Rehearsal · 2, no moments, no inflation, planters kept', () => {
    save110();
    const before = ms();
    expect(before.catalog).toBeUndefined();
    let found: number | null = null;
    act(() => {
      found = ensureCatalog('cisa', T0);
    });
    expect(found).toBe(2);
    const m = ms();
    expect(Object.keys(m.earned).filter((k) => !before.earned[k]).sort()).toEqual(['dress-rehearsal:2', 'took-root']);
    expect(m.earned['took-root']).toBe(T0);
    expect(m.queue ?? []).toEqual([]);
    // No inflation: 25 recalls stay 25; no 75.
    expect(m.counts!.longRecall).toBe(25);
    expect(m.earned['long-memory:75']).toBeUndefined();
    expect(m.catalogFill).toEqual({ at: T0, count: 2 });
    expect(m.planters).toEqual(before.planters);
    // Once only; a session afterwards queues nothing old.
    act(() => {
      expect(ensureCatalog('cisa', T0 + DAY)).toBeNull();
    });
    let fresh: string[] = [];
    act(() => {
      fresh = checkMilestones('cisa', { now: T0 + DAY });
    });
    expect(fresh).toEqual([]);
    expect(ms().queue ?? []).toEqual([]);
    // Quietly filled badges never light the "new" dot.
    act(() => {
      useSeen.setState({ caseSeen: { cisa: T0 - DAY } });
    });
    expect(hasNewBadge('cisa')).toBe(false);
  });

  it('the case shows ONE summary line, once; Evergreen says "New in Evergreen: 1 more to earn"', () => {
    save110();
    act(() => {
      ensureCatalog('cisa', T0);
    });
    mount(<Badges />);
    const line = catalogFillLine(2)!;
    const t = allText();
    expect(t.split(line).length - 1).toBe(1);
    expect(t).not.toContain('You’d already earned');
    expect(t).toContain('New in Evergreen: 1 more to earn');
    // Exam Day grew too, but Dress Rehearsal · 2 is already earned: complete again, no line.
    expect(t).not.toContain('New in Exam Day');
    act(() => r!.unmount());
    mount(<Badges />);
    expect(allText()).not.toContain(line);
    expect(ms().catalogFill!.seen).toBe(true);
  });

  it('old recalls never count twice; a new long recall makes 26', () => {
    save110();
    act(() => {
      ensureCatalog('cisa', T0);
    });
    const old = ms().longIds![0];
    const fresh = ALL[600];
    seedAnswers([old, fresh], T0 - 9 * DAY);
    act(() => {
      useProgress.getState().recordAnswer('cisa', old, true);
    });
    expect(ms().counts!.longRecall).toBe(25);
    act(() => {
      useProgress.getState().recordAnswer('cisa', fresh, true);
    });
    expect(ms().counts!.longRecall).toBe(26);
  });

  it('backup → restore round trip keeps every badge, planter and the fill exactly; nothing fills twice', async () => {
    save110();
    act(() => {
      ensureCatalog('cisa', T0);
    });
    const saved = JSON.parse(JSON.stringify(ms())) as CertMilestones;
    const read = checkBackupText(JSON.stringify(currentBackup(T0)));
    if (read.kind !== 'ok') throw new Error(read.code);
    expect(read.data.progress.byCert.cisa.milestones).toEqual(saved);
    freshStores();
    await act(async () => {
      await restoreBackup(read.data, { now: T0, fresh: true });
    });
    expect(ms()).toEqual(saved);
    expect(ensureCatalog('cisa', T0 + DAY)).toBeNull();
  });

  it('restoring a 1.10 BACKUP (no catalogue fields) fills quietly on restore, once', async () => {
    save110();
    const file = currentBackup(T0);
    expect(JSON.stringify(file)).not.toMatch(/"catalog"/);
    const read = checkBackupText(JSON.stringify(file));
    if (read.kind !== 'ok') throw new Error(read.code);
    // Nothing a 1.10 file holds is dropped by the restore check.
    expect(Object.keys(read.data.progress.byCert.cisa.milestones!.earned).sort()).toEqual(Object.keys(ms().earned).sort());
    expect(read.data.progress.byCert.cisa.milestones!.planters).toEqual(ms().planters);
    freshStores();
    await act(async () => {
      await restoreBackup(read.data, { now: T0, fresh: true });
    });
    const m = ms();
    expect(m.catalog).toBe(CATALOG_VERSION);
    expect(m.catalogFill).toMatchObject({ count: 2 });
    expect(m.earned['took-root']).toBeDefined();
    expect(m.earned['dress-rehearsal:2']).toBeDefined();
    expect(m.earned['long-memory:75']).toBeUndefined();
    expect(m.queue ?? []).toEqual([]);
    expect(m.planters).toMatchObject({ evergreen: T0 - 30 * DAY, examDay: T0 - 20 * DAY });
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Journey 3: earning each tier
// ═════════════════════════════════════════════════════════════════════════
const domainsAt = (answered: number, mastery: number) => cisa.domains.map((d) => ({ id: d.id, short: d.short, answered, mastery }));
function facts(over: Partial<MilestoneFacts> = {}): MilestoneFacts {
  return {
    cleanAnswered: 0,
    topicsClear: 0,
    domains: domainsAt(0, 0),
    loopFixed: 0,
    slipsTagged: 0,
    longRecall: 0,
    graduated: 0,
    sure: [],
    mocks: [],
    fullMockSize: 150,
    mindsetShift: false,
    mindsetData: false,
    studyDays: 0,
    freshStart: false,
    gamesPlayed: 0,
    gamesTotal: 9,
    snareHits: [],
    keelRun: 0,
    signposts: [],
    myths: [],
    paceRounds: 0,
    gameFixes: 0,
    ...over,
  };
}
const met = (f: MilestoneFacts) => allMarks(f).filter((m) => m.met).map((m) => m.key);
const full = (days: number, over: Partial<MockFacts> = {}): MockFacts => ({ total: 150, timing: 'standard', unanswered: 0, finishedAt: T0 + days * DAY, ...over });
const celebration = () => root().findAll((n) => n.props.celebration !== undefined)[0].props.celebration as { mode: string };

describe('Journey 3 · Long Memory · 75', () => {
  it('74 long recalls: not yet; the 75th earns it, as a short tier-up moment', () => {
    const ids = ALL.slice(200, 250);
    filled({ earned: { 'first-foothold': T0 - 30 * DAY, 'long-memory': T0 - 30 * DAY }, counts: { longRecall: 25 }, longIds: Array.from({ length: 25 }, (_, i) => ALL[400 + i]) });
    seedAnswers(ids, T0 - 8 * DAY);
    // A recall only 6 days on doesn't count.
    seedAnswers([ALL[300]], T0 - 6 * DAY);
    act(() => {
      useProgress.getState().recordAnswer('cisa', ALL[300], true);
    });
    expect(ms().counts!.longRecall).toBe(25);
    act(() => {
      ids.slice(0, 49).forEach((id) => useProgress.getState().recordAnswer('cisa', id, true));
    });
    expect(ms().counts!.longRecall).toBe(74);
    expect(checkMilestones('cisa', { now: T0, finished: true })).not.toContain('long-memory:75');
    act(() => {
      useProgress.getState().recordAnswer('cisa', ids[49], true);
    });
    let fresh: string[] = [];
    act(() => {
      fresh = checkMilestones('cisa', { now: T0, finished: true });
    });
    expect(fresh).toContain('long-memory:75');
    expect(fresh).not.toContain('long-memory:150');
    expect(ms().queue).toContain('long-memory:75');
    const moment = momentFor('cisa', 'long-memory:75')!;
    expect(moment).toMatchObject({ label: 'Long Memory · 75 recalls', tier: 2, tierUp: true, set: 'evergreen' });
    expect(moment.stretch).toBeUndefined();
    setMockReducedMotion(false);
    mount(<MilestoneMomentView moment={moment} once="lm75" />);
    expect(celebration().mode).toBe('short');
    expect(allText()).toContain('Long Memory · 75 recalls');
  });
});

describe('Journey 3 · Dress Rehearsal · 2', () => {
  it('needs two full timed mocks 7+ days apart, both after Whole Map; 6.9 days is not a week', () => {
    const wm = { wholeMapAt: T0, domains: domainsAt(30, 0.7) };
    expect(met(facts({ ...wm, mocks: [full(1), full(1 + 6.9)] }))).not.toContain('dress-rehearsal:2');
    expect(met(facts({ ...wm, mocks: [full(1), full(8)] }))).toContain('dress-rehearsal:2'); // exactly 7 days
    expect(met(facts({ ...wm, mocks: [full(1), full(8, { timing: 'plus50' })] }))).toContain('dress-rehearsal:2');
    // Untimed, a mini mock, or one left unanswered never count.
    expect(met(facts({ ...wm, mocks: [full(1), full(9, { timing: 'untimed' })] }))).not.toContain('dress-rehearsal:2');
    expect(met(facts({ ...wm, mocks: [full(1), full(9, { total: 50 })] }))).not.toContain('dress-rehearsal:2');
    expect(met(facts({ ...wm, mocks: [full(1), full(9, { unanswered: 1 })] }))).not.toContain('dress-rehearsal:2');
    // A mock finished before Whole Map was earned never counts.
    expect(met(facts({ ...wm, mocks: [full(-8), full(1)] }))).not.toContain('dress-rehearsal:2');
    // Three, each a week on: · 3 (Stretch).
    expect(met(facts({ ...wm, mocks: [full(1), full(8), full(15)] }))).toContain('dress-rehearsal:3');
  });

  it('earned through the stores as a short tier-up moment', () => {
    seedAnswers(perDomain(12), T0 - 40 * DAY);
    seedMocks([fullMock('a', T0 - 9 * DAY), fullMock('b', T0 - 2 * DAY)]);
    filled({ earned: { 'first-foothold': T0 - 40 * DAY, 'whole-map': T0 - 20 * DAY, 'dress-rehearsal': T0 - 9 * DAY } });
    let fresh: string[] = [];
    act(() => {
      fresh = checkMilestones('cisa', { now: T0, finished: true });
    });
    expect(fresh).toContain('dress-rehearsal:2');
    expect(fresh).not.toContain('dress-rehearsal:3');
    expect(momentFor('cisa', 'dress-rehearsal:2')).toMatchObject({ tier: 2, tierUp: true, label: 'Dress Rehearsal · 2 mocks' });
  });

  // BUG (Major): "nothing before Whole Map counts" only holds once Whole Map is
  // SAVED. In the check where Whole Map is first met, wholeMapAt is still
  // undefined and engine/milestones.ts:454 filters with `?? 0`, so every
  // older mock counts and Dress Rehearsal · 2 is earned in the same moment.
  it('engine: Whole Map met for the first time; two spaced mocks from before it do not count', () => {
    expect(met(facts({ domains: domainsAt(30, 0.7), mocks: [full(-20), full(-10)] }))).not.toContain('dress-rehearsal:2');
  });

  it('stores: the session that first reaches Whole Map does not also hand out Dress Rehearsal · 2', () => {
    seedAnswers(perDomain(12), T0 - 40 * DAY); // every domain at 100%: Whole Map met, not yet saved
    seedMocks([fullMock('a', T0 - 20 * DAY), fullMock('b', T0 - 10 * DAY)]);
    filled({ earned: { 'first-foothold': T0 - 40 * DAY, 'dress-rehearsal': T0 - 20 * DAY } });
    let fresh: string[] = [];
    act(() => {
      fresh = checkMilestones('cisa', { now: T0, finished: true });
    });
    expect(fresh).toContain('whole-map');
    expect(fresh).not.toContain('dress-rehearsal:2');
  });
});

describe('Journey 3 · Firm Footing · 80% (Stretch)', () => {
  it('needs Whole Map, 40 answers and 80% in that domain; plays short and says Stretch', () => {
    const d4 = getDomainQuestions('cisa', '4').slice(0, 40).map((q) => q.id);
    seedAnswers(d4, T0 - 10 * DAY);
    seedAnswers(cisa.domains.filter((d) => d.id !== '4').flatMap((d) => getDomainQuestions('cisa', d.id).slice(0, 12).map((q) => q.id)), T0 - 10 * DAY);
    filled({ earned: { 'first-foothold': T0 - 20 * DAY, 'whole-map': T0 - 5 * DAY } });
    let fresh: string[] = [];
    act(() => {
      fresh = checkMilestones('cisa', { now: T0, finished: true });
    });
    expect(fresh).toContain('firm-footing:4:80');
    expect(fresh.filter((k) => k.endsWith(':80'))).toEqual(['firm-footing:4:80']); // 12 answers elsewhere: not enough
    const moment = momentFor('cisa', 'firm-footing:4:80')!;
    expect(moment).toMatchObject({ tier: 2, tierUp: true, stretch: true, emblem: 'domain-operations' });
    setMockReducedMotion(false);
    mount(<MilestoneMomentView moment={moment} once="ff80" />);
    expect(celebration().mode).toBe('short');
  });

  it('never before Whole Map (one domain under 65%), however deep the domain', () => {
    const lopsided = domainsAt(60, 0.9).map((d) => (d.id === '3' ? { ...d, mastery: 0.5 } : d));
    expect(met(facts({ domains: lopsided })).filter((k) => k.endsWith(':80'))).toEqual([]);
  });
});

describe('Journey 3 · Took Root', () => {
  it('every part of one topic right on two different days earns it (a full moment, not a tier)', () => {
    const { oneEach } = topicParts();
    filled({ earned: { 'first-foothold': T0 - 20 * DAY } });
    act(() => {
      oneEach.forEach((id) => useProgress.getState().recordAnswer('cisa', id, true));
    });
    expect(checkMilestones('cisa', { now: T0 })).not.toContain('took-root');
    jest.setSystemTime(T0 + DAY);
    // All parts but one on day 2: not yet.
    act(() => {
      oneEach.slice(0, -1).forEach((id) => useProgress.getState().recordAnswer('cisa', id, true));
    });
    expect(checkMilestones('cisa', { now: T0 + DAY })).not.toContain('took-root');
    act(() => {
      useProgress.getState().recordAnswer('cisa', oneEach[oneEach.length - 1], true);
    });
    let fresh: string[] = [];
    act(() => {
      fresh = checkMilestones('cisa', { now: T0 + DAY, finished: true });
    });
    expect(fresh).toContain('took-root');
    const moment = momentFor('cisa', 'took-root')!;
    expect(moment).toMatchObject({ set: 'evergreen', label: 'Took Root' });
    expect(moment.tierUp).toBeUndefined();
  });

  it('a Coach me answer never roots a part', () => {
    const { oneEach } = topicParts();
    filled({ earned: { 'first-foothold': T0 - 20 * DAY } });
    act(() => {
      oneEach.forEach((id) => useProgress.getState().recordAnswer('cisa', id, true));
    });
    jest.setSystemTime(T0 + DAY);
    act(() => {
      oneEach.forEach((id) => useProgress.getState().recordAnswer('cisa', id, true, undefined, { assisted: true }));
    });
    expect(checkMilestones('cisa', { now: T0 + DAY })).not.toContain('took-root');
  });
});

describe('Journey 3 · tier-ups always play the short moment', () => {
  const tierUp = () => momentFor('cisa', 'rooted:30')!;
  // BUG (Minor): the week's cap (3 FULL moments in 7 days) also silences a
  // tier-up, which only ever plays SHORT and never counts toward the cap.
  // components/milestones.tsx:64 decideQuiet ignores moment.tierUp.
  it.failing('after three full moments this week, a tier-up still plays short (it is not a fourth full moment)', () => {
    filled({ earned: { 'rooted:10': T0 - 30 * DAY, 'rooted:30': T0 }, days: 30 });
    setMockReducedMotion(false);
    for (let i = 0; i < 3; i++) {
      resetCelebrationsForTest();
      mount(<MilestoneMomentView moment={{ ...momentFor('cisa', 'took-root')!, key: `full${i}` }} once={`w${i}`} />);
      expect(celebration().mode).toBe('full');
      act(() => r!.unmount());
    }
    resetCelebrationsForTest();
    const m = tierUp();
    expect(m.tierUp).toBe(true);
    mount(<MilestoneMomentView moment={m} once="w4" />);
    expect(allText()).toContain('A new badge');
    expect(celebration().mode).toBe('short');
  });
});

describe('Journey 3 · Stretch is never slot 1 of "Next for your exam"', () => {
  const DOMAINS = cisa.domains.map((d) => ({ id: d.id, short: d.short, weight: d.weight, tone: d.tone, ...(d.emblem ? { emblem: d.emblem } : {}) }));
  const EXAM = { questions: cisa.exam.questions, minutes: cisa.exam.minutes };
  const STAGES: Stage[] = ['diagnose', 'learn', 'practice', 'mock', 'ready', 'examDay'];

  it('with every core badge earned, only Stretch tiers left: no slot 1 at all, in any stage', () => {
    const f = facts({ cleanAnswered: 400, longRecall: 120, domains: domainsAt(45, 0.78), wholeMapAt: T0, mocks: [full(1), full(8)] });
    const marks0 = allMarks(f);
    const core = caseMarks({ marks: marks0, earned: {}, domains: DOMAINS, exam: EXAM, mindsetData: true }).filter((m) => !m.stretch && m.set !== 'moments' && m.set !== 'fieldNotes');
    const earned = Object.fromEntries(core.map((m) => [m.key, T0]));
    const marks = caseMarks({ marks: marks0, earned, domains: DOMAINS, exam: EXAM, mindsetData: true });
    for (const stage of STAGES) {
      for (const daysLeft of [null, 10, 90]) {
        const n = nextForExam({ marks, stage, daysLeft, mastery: Object.fromEntries(cisa.domains.map((d) => [d.id, 0.78])) });
        expect([stage, daysLeft, n.best?.key]).toEqual([stage, daysLeft, undefined]);
        expect(n.nearest.every((m) => m.stretch)).toBe(true);
      }
    }
  });

  it('random learners (seeded, 400 runs): slot 1 is never a Stretch tier, a gated mark, or Fresh Start', () => {
    let seed = 41;
    const rnd = () => ((seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648) / 2_147_483_648);
    for (let run = 0; run < 400; run++) {
      const mastery = cisa.domains.map(() => rnd());
      const wholeMap = rnd() < 0.5;
      const f = facts({
        cleanAnswered: Math.floor(rnd() * 400),
        topicsClear: Math.floor(rnd() * 12),
        longRecall: Math.floor(rnd() * 160),
        graduated: Math.floor(rnd() * 60),
        loopFixed: Math.floor(rnd() * 12),
        studyDays: Math.floor(rnd() * 70),
        tookRoot: rnd(),
        domains: cisa.domains.map((d, i) => ({ id: d.id, short: d.short, answered: Math.floor(rnd() * 60), mastery: mastery[i] })),
        ...(wholeMap ? { wholeMapAt: T0 } : {}),
        mocks: rnd() < 0.5 ? [full(1), full(1 + rnd() * 20)] : [],
      });
      const marks0 = allMarks(f);
      const earned: Record<string, number> = wholeMap ? { 'whole-map': T0 } : {};
      for (const m of marks0) if (m.met && rnd() < 0.7) earned[m.key] = T0;
      const input: CaseInput = { marks: marks0, earned, domains: DOMAINS, exam: EXAM, mindsetData: rnd() < 0.5 };
      const marks = caseMarks(input);
      const stage = STAGES[Math.floor(rnd() * STAGES.length)];
      const daysLeft = rnd() < 0.3 ? null : Math.floor(rnd() * 120);
      const n = nextForExam({ marks, stage, daysLeft, mastery: Object.fromEntries(cisa.domains.map((d, i) => [d.id, mastery[i]])) });
      if (n.best) {
        expect([run, n.best.key, Boolean(n.best.stretch)]).toEqual([run, n.best.key, false]);
        expect([run, n.best.status]).not.toEqual([run, 'gated']);
        expect(n.best.set).not.toBe('moments');
      }
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Journey 4: a set grows after it completed
// ═════════════════════════════════════════════════════════════════════════
describe('Journey 4 · a set grows after completing', () => {
  it('"New in Evergreen" while the new marks are open; complete again later; the planter keeps its first date', () => {
    save110();
    act(() => {
      ensureCatalog('cisa', T0);
    });
    const caseNow = () => {
      const marks = caseMarks({
        marks: allMarks(facts({ longRecall: ms().counts!.longRecall ?? 0 })),
        earned: ms().earned,
        domains: cisa.domains.map((d) => ({ id: d.id, short: d.short, weight: d.weight, tone: d.tone })),
        exam: cisa.exam,
        mindsetData: false,
      });
      return caseSets(marks, cisa.exam, cisa.domains.length).find((s) => s.info.id === 'evergreen')!;
    };
    expect(setCountLine(caseNow())).toBe('4 of 5');
    expect(grownLine(caseNow(), ms().planters)).toBe('New in Evergreen: 1 more to earn');
    // Earn Long Memory · 75 later: Evergreen is complete again, the line goes, the planter's date stays.
    act(() => {
      useProgress.getState().updateMilestones('cisa', (m) => ({ milestones: { ...m!, counts: { ...m!.counts, longRecall: 75 } } }));
    });
    act(() => {
      checkMilestones('cisa', { now: T0 + 3 * DAY, finished: true });
    });
    expect(ms().earned['long-memory:75']).toBe(T0 + 3 * DAY);
    expect(setCountLine(caseNow())).toBe('5 of 5 · Complete');
    expect(grownLine(caseNow(), ms().planters)).toBeUndefined();
    expect(ms().planters!.evergreen).toBe(T0 - 30 * DAY);
  });

  it('a restore keeps the planter of a set that grew (its needs are frozen at 1.10)', () => {
    const m: CertMilestones = {
      earned: { 'long-memory': T0, graduate: T0, 'loop-closed': T0, 'dress-rehearsal': T0, 'on-pace': T0 },
      counts: { longRecall: 25, graduated: 50, loopFixed: 10 },
      longIds: ALL.slice(0, 25),
      planters: { evergreen: T0, examDay: T0 },
    };
    const kept = keepSupported(m, { answers: {}, mocks: [fullMock('a', T0)], milestones: m });
    expect(kept.planters).toEqual({ evergreen: T0, examDay: T0 });
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Journey 5: the badge share card
// ═════════════════════════════════════════════════════════════════════════
describe('Journey 5 · share card', () => {
  const NOTICE = 'Not affiliated with or endorsed by ISACA®. CISA® is a registered trademark of ISACA.';
  const DOMAINS = cisa.domains.map((d) => ({ id: d.id, short: d.short, weight: d.weight, tone: d.tone, ...(d.emblem ? { emblem: d.emblem } : {}) }));
  /** Every catalogue mark, earned. */
  const everyMark = () => {
    const marks0 = allMarks(facts());
    return caseMarks({ marks: marks0, earned: Object.fromEntries(marks0.map((m) => [m.key, T0])), domains: DOMAINS, exam: cisa.exam, mindsetData: true });
  };
  const shareOf = (m: CaseMark) => ({ name: m.name, skill: m.skill, set: m.set, status: m.status, earnedOn: '3 Nov 2026' });

  it('only earned badges are shareable; Fresh Start never; unearned never', () => {
    const marks = everyMark();
    for (const m of marks) expect([m.key, badgeShareable(m)]).toEqual([m.key, m.key !== 'fresh-start']);
    const unearned = caseMarks({ marks: allMarks(facts()), earned: {}, domains: DOMAINS, exam: cisa.exam, mindsetData: true });
    expect(unearned.filter((m) => badgeShareable(m))).toEqual([]);
    expect(() => badgeCardText(shareOf(marks.find((m) => m.key === 'fresh-start')!), cisa)).toThrow();
    // A hand-made skill line with a credential word is refused.
    for (const skill of ['Certified IS auditor', 'Graduated 50 questions', 'Official CISA practice', 'Passed the exam', 'Earned a credential'])
      expect([skill, badgeShareable({ status: 'earned', set: 'evergreen', skill })]).toEqual([skill, false]);
  });

  it('every card: "Studying for the CISA® exam", the full notice, the Aurivan caption, and no credential words', () => {
    for (const m of everyMark().filter((x) => badgeShareable(x))) {
      const t = badgeCardText(shareOf(m), cisa, null);
      expect(t.headline).toBe('Studying for the CISA® exam');
      expect(t.caption).toBe('Aurivan study badge · Earned 3 Nov 2026');
      expect(t.notice).toBe(NOTICE);
      expect(t.message.endsWith(NOTICE)).toBe(true);
      expect(t.spoken).toContain(NOTICE);
      // What WE write (everything but the badge's cleared name and the notice) makes no claim.
      const ours = t.message.replace(NOTICE, '').replace(m.name, '');
      expect([m.key, isHonestShareText(ours)]).toEqual([m.key, true]);
      expect(t.message).not.toMatch(/linkedin|licen[cs]e|verif|https?:|utm_|ref=/i);
    }
    expect(studyingFor({ name: 'AAIA', trademarkNotice: '', trademarkRegistered: false })).toBe('Studying for the AAIA exam');
  });

  it('on the card, the cert name sits only at the foot, after the medallion, caption, name and skill line', () => {
    const lm = everyMark().find((m) => m.key === 'long-memory:75')!;
    const text = badgeCardText({ ...shareOf(lm), tierLine: 'Lichen · tier 2 of 3' }, cisa, null);
    mount(<BadgeShareCard text={text} art={null} />);
    const strings: string[] = [];
    const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? strings.push(x) : x.children.forEach(walk));
    walk(root());
    const at = (s: string) => strings.indexOf(s);
    expect(at('Aurivan study badge · Earned 3 Nov 2026')).toBeGreaterThanOrEqual(0);
    expect(at(text.caption)).toBeLessThan(at(text.name));
    expect(at(text.name)).toBeLessThan(at(text.skill));
    const firstCert = strings.findIndex((s) => /CISA|ISACA/.test(s));
    expect(firstCert).toBe(at('Studying for the CISA® exam'));
    expect(firstCert).toBeGreaterThan(at(text.skill));
  });

  /** Open an earned badge's sheet, then its share panel. */
  function openShare() {
    filled({ earned: { 'long-memory': new Date(2026, 10, 3, 9).getTime() } });
    mount(<Badges />);
    press(/^Long Memory · 25 recalls, Clay\. Earned/);
    press(/^Share Long Memory · 25 recalls$/);
    expect(root().findAllByType(Modal)).toHaveLength(1);
  }
  const shareButton = () => buttons(/^Share image$|^Share$/).find((b) => typeof b.props.accessibilityHint === 'string' && b.props.accessibilityHint.includes('share sheet'))!;

  it('a capture failure is caught: nothing shared, no crash, the button comes back; sharing earns nothing', async () => {
    openShare();
    const before = JSON.stringify(ms());
    (captureRef as jest.Mock).mockImplementationOnce(async () => {
      throw new Error('capture failed');
    });
    const shareSpy = jest.spyOn(Share, 'share');
    await act(async () => {
      await shareButton().props.onPress();
    });
    expect(captureRef).toHaveBeenCalledTimes(1);
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
    expect(releaseCapture).not.toHaveBeenCalled();
    expect(shareSpy).not.toHaveBeenCalled();
    expect(shareButton().props.disabled).toBeFalsy();
    expect(JSON.stringify(ms())).toBe(before);
    // A second try works.
    await act(async () => {
      await shareButton().props.onPress();
    });
    expect(Sharing.shareAsync).toHaveBeenCalledTimes(1);
    expect(releaseCapture).toHaveBeenCalledWith('/tmp/card.png');
    shareSpy.mockRestore();
  });

  it('no image share sheet: the text goes instead, with the trademark notice', async () => {
    openShare();
    (Sharing.isAvailableAsync as jest.Mock).mockImplementationOnce(async () => false);
    const shareSpy = jest.spyOn(Share, 'share').mockImplementation(async () => ({ action: 'sharedAction' }));
    await act(async () => {
      await shareButton().props.onPress();
    });
    expect(captureRef).not.toHaveBeenCalled();
    expect(shareSpy).toHaveBeenCalledTimes(1);
    const msg = (shareSpy.mock.calls[0][0] as { message: string }).message;
    expect(msg).toContain('Studying for the CISA® exam');
    expect(msg).toContain(NOTICE);
    expect(msg).toContain('earned 3 Nov 2026');
    shareSpy.mockRestore();
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Journey 6: restore validation
// ═════════════════════════════════════════════════════════════════════════
describe('Journey 6 · restore validation', () => {
  const answers = Object.fromEntries(perDomain(60).map((id) => [id, {}]));
  // A real save keeps Long Memory's counted questions beside its counter (both since 1.6), so the evidence does too.
  const richMilestones: CertMilestones = {
    earned: {},
    counts: { longRecall: 150, graduated: 60, loopFixed: 12, gameFixes: 12, paceRounds: 3 },
    longIds: ALL.slice(0, 150),
    sure: Array(30).fill(true),
    days: 70,
    myths: Array(25).fill({ id: 'm', ok: true }),
    signposts: Array(10).fill({ id: 's', ok: true }),
  };
  const rich: MarkEvidence = {
    answers,
    mistakes: Object.fromEntries(Object.keys(answers).slice(0, 12).map((id) => [id, { slip: 'misread' }])),
    mocks: [0, 8, 16].map((d) => ({ total: 150, timing: 'standard', unanswered: 0, finishedAt: T0 + d * DAY })),
    lessonsDone: ['l1'],
    notesRead: ['n1'],
    gameBest: { trap: 1, sprint: 1, priority: 1 },
    gameGrowth: { trap: { hits: Array(12).fill(true) } },
    milestones: richMilestones,
    mastery: { '4A1.1': { masteredAt: '2026-10-02' } },
    exam: { domains: cisa.domains.map((d) => d.id), fullMockSize: 150 },
    earned: { 'whole-map': T0 },
  };
  const catalogue = allMarks(facts()).map((m) => m.key);

  it('every catalogue key is shown by the case and accepted by a restore', () => {
    expect(catalogue).toHaveLength(new Set(catalogue).size);
    for (const k of catalogue) {
      expect([k, caseKey(k)]).toEqual([k, true]);
      expect([k, markSupported(k, rich)]).toEqual([k, true]);
    }
  });

  it('malformed or unknown keys are refused by both', () => {
    for (const k of ['long-memory:25', 'long-memory:75:1', 'long-memory:075', 'dress-rehearsal:1', 'dress-rehearsal:2.0', 'rooted:010', 'rooted:30:x', 'firm-footing:4:70', 'firm-footing:4:', 'took-root:1', 'whole-map:1', 'graduate:2', 'Long-memory', 'constructor', '__proto__']) {
      expect([k, caseKey(k)]).toEqual([k, false]);
      expect([k, markSupported(k, rich)]).toEqual([k, false]);
    }
  });

  // BUG (Minor): caseKey accepts a plain "firm-footing" (no domain), which no
  // catalogue mark has and markSupported refuses. engine/badgeCatalog.ts
  // caseKey: `if (parts.length === 1) return def.id !== 'rooted'`.
  it('a bare "firm-footing" key: the case and the restore check agree', () => {
    expect(caseKey('firm-footing')).toBe(markSupported('firm-footing', rich));
  });

  it('forged tiers in a backup are refused on their own evidence; genuine ones survive', () => {
    filled();
    seedAnswers(perDomain(25), T0 - 30 * DAY); // 25 per domain: Firm Footing 70% evidence, not 80%'s 40
    seedMocks([fullMock('a', T0 - 10 * DAY), fullMock('b', T0 - 7 * DAY)]); // 3 days apart
    act(() => {
      useProgress.getState().updateMilestones('cisa', (m) => ({
        milestones: {
          ...m!,
          counts: { longRecall: 25 },
          longIds: ALL.slice(500, 525),
          days: 30,
          earned: {
            'whole-map': T0 - 20 * DAY,
            'firm-footing:4': T0 - 20 * DAY,
            'long-memory': T0 - 20 * DAY,
            'rooted:30': T0 - 5 * DAY,
            'dress-rehearsal': T0 - 10 * DAY,
            // Forged: each claims a tier its own evidence doesn't reach.
            'long-memory:75': T0,
            'long-memory:150': T0,
            'dress-rehearsal:2': T0,
            'dress-rehearsal:3': T0,
            'firm-footing:4:80': T0,
            'rooted:60': T0,
            'took-root': T0,
          },
          queue: ['long-memory:75', 'rooted:30'],
        },
      }));
    });
    const read = checkBackupText(JSON.stringify(currentBackup(T0)));
    if (read.kind !== 'ok') throw new Error(read.code);
    const back = read.data.progress.byCert.cisa.milestones!;
    expect(Object.keys(back.earned).sort()).toEqual(['dress-rehearsal', 'firm-footing:4', 'long-memory', 'rooted:30', 'whole-map']);
    expect(back.queue).toEqual(['rooted:30']);
  });

  it('a Stretch 80% tier without Whole Map is refused even with 40+ answers in the domain', () => {
    const e: MarkEvidence = { ...rich, earned: undefined };
    const kept = keepSupported({ earned: { 'firm-footing:4': T0, 'firm-footing:4:80': T0, 'dress-rehearsal': T0, 'dress-rehearsal:2': T0 } }, e);
    expect(Object.keys(kept.earned).sort()).toEqual(['dress-rehearsal', 'firm-footing:4']);
  });
});
