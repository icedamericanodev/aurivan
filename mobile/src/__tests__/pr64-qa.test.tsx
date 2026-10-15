/**
 * QA for PR #64 (mobile 1.24): gaps the PR's own tests do not cover.
 *
 * 1. Android Back on the Day-1 closing screen should behave like "Done for
 *    today": go to Today AND end the finished first set.
 * 2. The retest rule: a right answer under 4 hours after a previous RIGHT
 *    answer should not take readiness credit away (answering right again must
 *    never make the range go down).
 * 3. Upgrade from 1.23: a day plan saved before the update may still hold a
 *    "Starting check: N mixed questions" item. The word "check" must not reach
 *    the screen (decision D6), in the hero, the checklist OR the "Also today" rows.
 *
 * Kept as a regression suite after the fixes (integrator's decisions), with more cases:
 * - a retest is ONLY a right answer under 4 hours after a MISS, due at the start of the next day;
 * - Guided ignores retests; a first set ended early is honest and resumes with only the rest;
 * - Day 1 shows no percent; "Also today" never repeats a checklist row; Back on the closing screen;
 * - every reminder path skips today once the plan is cleared; the ask never sticks on "working";
 * - You: "+N" only for domains that show a number; both labels when words and numbers mix.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Alert, BackHandler } from 'react-native';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Results from '../app/results';
import Today from '../app/(tabs)/home';
import You from '../app/(tabs)/you';
import { ReminderAsk } from '../components/firstSet';
import { BANDS_LINE, LATEST_TRIES_LABEL } from '../engine/domainBand';
import { lastUnassisted } from '../engine/studyPath';
import { startOfNextDay } from '../engine/srs';
import { reapplyReminders } from '../lib/backup';
import { startFromIds } from '../lib/sessions';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { getAllQuestions } from '../content/loader';
import type { DayPlan } from '../engine/dayPlan';
import type { PlanItem } from '../engine/planner';
import { answerCredit } from '../engine/readiness';
import { dayKey } from '../engine/streak';
import { buildTodayPlan } from '../lib/activity';
import { runPlanItem } from '../lib/actions';
import { finishSession } from '../lib/finishSession';
import { startFirstSet } from '../lib/firstSet';
import { completeCert, selectCert, useProgress } from '../store/progress';
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
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null }));
// `mockFocused` false = another screen is on top (e.g. the plant picker over the closing screen).
let mockFocused = true;
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false, dismissTo: jest.fn() },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => (mockFocused ? cb() : undefined), [cb]),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));
const mockEnsure = jest.fn(async () => true);
const mockSchedule = jest.fn(async (..._a: unknown[]) => {});
jest.mock('../lib/reminders', () => ({
  remindersSupported: true,
  ensurePermission: () => mockEnsure(),
  scheduleReminders: (...a: unknown[]) => mockSchedule(...a),
  cancelReminders: async () => {},
  initNotifications: () => {},
}));

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const unmount = () => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
};
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(r!.root);
  return out.join(' ');
};

const NOW = new Date(2026, 9, 15, 21, 40, 0);
const CERT = 'cisa';
const HOUR = 3_600_000;

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  useSeen.setState(useSeen.getInitialState(), true);
  act(() => {
    useProgress.getState().resetCert(CERT);
    useProgress.setState({ plantSettings: { promptHidden: true }, days: {}, byCert: {}, streak: { current: 0, best: 0, lastDay: null } });
  });
  useSession.getState().clear();
  useSettings.setState(useSettings.getInitialState(), true);
  useSettings.setState({ theme: 'light', activeCertId: CERT, onboarded: true, motion: 'system', fitPrompt: 'answered', dailyMinutes: 20, familiarity: 'some', examDates: { cisa: '2026-11-26' } });
  jest.mocked(router.replace).mockClear();
  mockFocused = true;
  mockEnsure.mockClear();
  mockSchedule.mockClear();
});
afterEach(() => {
  unmount();
  jest.restoreAllMocks();
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('Day-1 closing screen: Android Back', () => {
  it('ends the finished first set, like "Done for today" (BackHandler calls the LAST listener added first)', () => {
    act(() => {
      buildTodayPlan(CERT, false);
    });
    const s = startFirstSet(CERT)!;
    act(() => {
      s.questionIds.forEach((id, i) => {
        useSession.getState().answer(id, { display: 'A', correct: i < 3, ms: 20_000 });
        useProgress.getState().recordAnswer(CERT, id, i < 3, undefined, { ms: 20_000 });
      });
      finishSession();
    });
    // Record every listener in the order it was added; Android calls them newest first and stops at the first `true`.
    const listeners: (() => boolean | null | undefined)[] = [];
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation(((_: string, h: () => boolean) => {
      listeners.push(h);
      return { remove: () => listeners.splice(listeners.indexOf(h), 1) };
    }) as never);
    mount(<Results />);
    act(() => {
      for (const h of [...listeners].reverse()) if (h()) break;
    });
    expect(router.replace).toHaveBeenCalledWith('/home');
    // "Done for today" clears the session; Back should too.
    expect(useSession.getState().active).toBeNull();
  });
});

describe('Day 1 on Today, after "Done for today"', () => {
  it('the clearing card states a count, never a percentage of five answers (the closing screen said "3 of 5", no percent)', () => {
    act(() => {
      buildTodayPlan(CERT, false);
    });
    const s = startFirstSet(CERT)!;
    act(() => {
      s.questionIds.forEach((id, i) => {
        useSession.getState().answer(id, { display: 'A', correct: i < 3, ms: 20_000 });
        useProgress.getState().recordAnswer(CERT, id, i < 3, undefined, { ms: 20_000 });
      });
      finishSession();
      useSession.getState().clear();
    });
    mount(<Today />);
    expect(allText()).toContain('Today’s clearing');
    expect(allText()).not.toMatch(/Accuracy \d+ ?%/);
    // The count, in Results' words.
    expect(allText()).toContain('3 of 5 right');
  });
});

describe('a first set ended early', () => {
  it('after "Done for today", Today does not start the same five again from question 1', async () => {
    act(() => {
      buildTodayPlan(CERT, false);
    });
    const s = startFirstSet(CERT)!;
    // Two answers, then X → End: the closing screen says "2 of 2" and offers "Done for today".
    act(() => {
      s.questionIds.slice(0, 2).forEach((id) => {
        useSession.getState().answer(id, { display: 'A', correct: true, ms: 20_000 });
        useProgress.getState().recordAnswer(CERT, id, true, undefined, { ms: 20_000 });
      });
      finishSession({ celebrate: false });
    });
    act(() => {
      useSession.getState().clear(); // "Done for today"
    });
    jest.setSystemTime(NOW.getTime() + 10 * 60_000);
    const plan = useProgress.getState().days[CERT]!;
    // Either the day is treated as done, or Start must not re-ask the questions already answered.
    if (!plan.done[0]) {
      await act(async () => {
        runPlanItem(plan.items[0], CERT);
      });
      const again = useSession.getState().active!;
      expect(again.questionIds).not.toContain(s.questionIds[0]);
    }
  });
});

describe('the retest rule never makes a right answer cost readiness', () => {
  it('right, then right again 1 hour later: credit stays at 1 (it is not lowered to half)', () => {
    const q = getAllQuestions(CERT)[0].id;
    act(() => {
      useProgress.getState().recordAnswer(CERT, q, true, 'sure', { at: NOW.getTime() - HOUR });
    });
    const before = answerCredit(selectCert(useProgress.getState(), CERT).answers[q]);
    act(() => {
      useProgress.getState().recordAnswer(CERT, q, true, 'sure', { at: NOW.getTime() });
    });
    const after = answerCredit(selectCert(useProgress.getState(), CERT).answers[q]);
    expect(before).toBe(1);
    expect(after).toBeGreaterThanOrEqual(before);
  });
});

describe('Today declutter: each plan item is said once', () => {
  it('an item in the forest-panel checklist is not listed again under "Also today"', () => {
    const REVIEW: PlanItem = { kind: 'review', count: 4, due: 4 };
    const LESSON: PlanItem = { kind: 'lesson', lessonId: 'cisa-l-d1-charter', title: 'Business impact analysis', minutes: 5 };
    const WARM: PlanItem = { kind: 'practice', count: 5, label: 'Warm-up · 5 questions' };
    const plan: DayPlan = { day: dayKey(NOW.getTime()), certId: CERT, budget: 20, items: [REVIEW, LESSON, WARM], done: [false, false, false], start: { score: 0, domains: {} }, answered: 0, correct: 0, minutes: 0 };
    act(() => {
      useProgress.getState().startDay(plan);
    });
    mount(<Today />);
    const t = allText();
    // The checklist shows "Lesson · Business impact analysis"; "Also today" should hold only the optional mock and paused sessions.
    expect(t.match(/Business impact analysis/g)?.length ?? 0).toBe(1);
    expect(t).not.toContain('Also today');
  });
});

describe('upgrade from 1.23: an old "Starting check" plan item', () => {
  it('never shows the word "check" on Today, including the "Also today" rows', () => {
    // 8 answers so far (a 1.23 learner part-way through the starting check), and today's plan saved by 1.23.
    act(() => {
      const answers: Record<string, { attempts: number; correctCount: number; lastCorrect: boolean; lastAt: number }> = {};
      getAllQuestions(CERT)
        .slice(0, 8)
        .forEach((q) => (answers[q.id] = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: NOW.getTime() - 2 * 86_400_000 }));
      useProgress.setState((s) => ({ byCert: { ...s.byCert, [CERT]: completeCert({ ...selectCert(s, CERT), answers }) } }));
    });
    const REVIEW: PlanItem = { kind: 'review', count: 4, due: 4 };
    const OLD: PlanItem = { kind: 'practice', count: 12, label: 'Starting check: 12 mixed questions', why: 'check' };
    const plan: DayPlan = { day: dayKey(NOW.getTime()), certId: CERT, budget: 20, items: [REVIEW, OLD], done: [false, false], start: { score: 0, domains: {} }, answered: 0, correct: 0, minutes: 0 };
    act(() => {
      useProgress.getState().startDay(plan);
    });
    mount(<Today />);
    expect(allText()).not.toMatch(/Starting check/i);
  });
});

// ── Added with the fixes (kept as regressions) ──────────────────────────
/** Finish the first set's first `n` questions (all right), then X → End. */
const endFirstSetAfter = (n: number) => {
  act(() => {
    buildTodayPlan(CERT, false);
  });
  const s = startFirstSet(CERT)!;
  act(() => {
    s.questionIds.slice(0, n).forEach((id) => {
      useSession.getState().answer(id, { display: 'A', correct: true, ms: 20_000 });
      useProgress.getState().recordAnswer(CERT, id, true, undefined, { ms: 20_000 });
    });
    finishSession({ celebrate: false });
  });
  return s;
};
const spyBack = () => {
  const listeners: (() => boolean | null | undefined)[] = [];
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation(((_: string, h: () => boolean) => {
    listeners.push(h);
    return { remove: () => listeners.splice(listeners.indexOf(h), 1) };
  }) as never);
  return listeners;
};
const buttonLabels = () =>
  r!.root.findAll((n) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function').map((n) => {
    const out: string[] = [];
    const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
    walk(n);
    return out.join(' ').trim();
  });

describe('Day-1 closing screen: one Back handler, only while it is in front', () => {
  it('Results registers none of its own for a first set: the closing screen’s is the only one', () => {
    act(() => {
      buildTodayPlan(CERT, false);
    });
    const s = startFirstSet(CERT)!;
    act(() => {
      s.questionIds.forEach((id) => {
        useSession.getState().answer(id, { display: 'A', correct: true, ms: 20_000 });
        useProgress.getState().recordAnswer(CERT, id, true, undefined, { ms: 20_000 });
      });
      finishSession();
    });
    const listeners = spyBack();
    mount(<Results />);
    expect(listeners).toHaveLength(1);
  });

  it('with the plant picker on top, no Back handler of the closing screen is active (Back closes the picker)', () => {
    endFirstSetAfter(5);
    mockFocused = false;
    const listeners = spyBack();
    mount(<Results />);
    expect(listeners).toHaveLength(0);
  });
});

describe('a first set ended early: honest, and resumed with only the rest', () => {
  it('the closing screen says "2 answered" and "3 left", offers "Back to Today", never "Done for today" or "Do 5 more"', () => {
    endFirstSetAfter(2);
    mount(<Results />);
    const t = allText();
    expect(t).toContain('2 answered');
    expect(t).toContain('3 left');
    expect(t).not.toMatch(/2 of 2/);
    const labels = buttonLabels();
    expect(labels).toContain('Back to Today');
    expect(labels).not.toContain('Done for today');
    expect(labels).not.toContain('Do 5 more');
  });

  it('Today says "Continue", and the set resumes with exactly the 3 unanswered questions, in order', () => {
    const s = endFirstSetAfter(2);
    act(() => {
      useSession.getState().clear();
    });
    mount(<Today />);
    expect(allText()).toContain('Continue');
    unmount();
    const plan = useProgress.getState().days[CERT]!;
    expect(plan.done[0]).toBe(false);
    act(() => {
      runPlanItem(plan.items[0], CERT);
    });
    expect(useSession.getState().active!.questionIds).toEqual(s.questionIds.slice(2));
    expect(useSession.getState().active!.firstSet).toBe(true);
  });

  it('Today says "Continue" for a paused first set too', () => {
    act(() => {
      buildTodayPlan(CERT, false);
    });
    const s = startFirstSet(CERT)!;
    act(() => {
      useSession.getState().answer(s.questionIds[0], { display: 'A', correct: true, ms: 20_000 });
      useProgress.getState().recordAnswer(CERT, s.questionIds[0], true, undefined, { ms: 20_000 });
    });
    mount(<Today />);
    expect(allText()).toContain('Continue');
  });

  it('once all five are answered, the closing screen is the normal "Done for today" one', () => {
    endFirstSetAfter(2);
    act(() => {
      useSession.getState().clear();
    });
    jest.setSystemTime(NOW.getTime() + 10 * 60_000);
    const rest = startFirstSet(CERT)!;
    act(() => {
      rest.questionIds.forEach((id) => {
        useSession.getState().answer(id, { display: 'A', correct: true, ms: 20_000 });
        useProgress.getState().recordAnswer(CERT, id, true, undefined, { ms: 20_000 });
      });
      finishSession();
    });
    expect(useProgress.getState().days[CERT]!.done[0]).toBe(true);
    mount(<Results />);
    expect(buttonLabels()).toContain('Done for today');
    expect(allText()).not.toMatch(/answered|left\./);
  });

  it('a paused first set of ANOTHER certification is never resumed for this one', () => {
    act(() => {
      buildTodayPlan(CERT, false);
    });
    startFirstSet(CERT);
    act(() => {
      useSession.setState((st) => ({ active: { ...st.active!, certId: 'other-cert' } }));
    });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const plan = useProgress.getState().days[CERT]!;
    act(() => {
      runPlanItem(plan.items[0], CERT);
    });
    // It goes through the usual "Replace your unfinished session?" question, not straight into the other set.
    expect(alert).toHaveBeenCalledWith('Replace your unfinished session?', expect.any(String), expect.any(Array));
  });
});

describe('the retest rule, as decided', () => {
  it('a miss, then right 1 hour later: a retest, due at the START of the next local day (not +24 h)', () => {
    const q = getAllQuestions(CERT)[0].id;
    act(() => {
      useProgress.getState().recordAnswer(CERT, q, false, 'sure', { at: NOW.getTime() - HOUR });
      useProgress.getState().recordAnswer(CERT, q, true, 'sure', { at: NOW.getTime() });
    });
    const cp = selectCert(useProgress.getState(), CERT);
    expect(cp.answers[q].lastRetest).toBe(true);
    expect(cp.review[q].dueAt).toBe(startOfNextDay(NOW.getTime()));
    expect(new Date(cp.review[q].dueAt).getHours()).toBe(0);
  });

  it('right after right is a normal answer: no retest mark (so the answer screen never says "Back in your review tomorrow.")', () => {
    const q = getAllQuestions(CERT)[1].id;
    act(() => {
      useProgress.getState().recordAnswer(CERT, q, true, 'sure', { at: NOW.getTime() - HOUR });
      useProgress.getState().recordAnswer(CERT, q, true, 'sure', { at: NOW.getTime() });
    });
    expect(selectCert(useProgress.getState(), CERT).answers[q].lastRetest).toBeUndefined();
  });

  it('Guided ignores retests: a miss fixed from working memory does not count toward "clear"', () => {
    const at = NOW.getTime();
    const answers = {
      a: { attempts: 2, correctCount: 1, lastCorrect: true, lastAt: at, lastRetest: true },
      b: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: at - 1 },
      c: { attempts: 1, correctCount: 0, lastCorrect: false, lastAt: at - 2 },
    };
    expect(lastUnassisted(['a', 'b', 'c'], answers)).toEqual([true, false]);
  });
});

describe('Today: "Also today" holds only the optional mock and paused sessions', () => {
  it('the optional mock is listed there (and only there)', () => {
    const REVIEW: PlanItem = { kind: 'review', count: 4, due: 4 };
    const WARM: PlanItem = { kind: 'practice', count: 5, label: 'Warm-up · 5 questions' };
    const MOCK: PlanItem = { kind: 'mock', questions: 50, label: 'Mini mock · 50 questions', minutes: 60 };
    const plan: DayPlan = { day: dayKey(NOW.getTime()), certId: CERT, budget: 20, items: [REVIEW, WARM, MOCK], done: [false, false, false], start: { score: 0, domains: {} }, answered: 0, correct: 0, minutes: 0 };
    act(() => {
      useProgress.getState().startDay(plan);
    });
    mount(<Today />);
    const t = allText();
    expect(t).toContain('Also today');
    expect(t.match(/Mini mock/g)?.length ?? 0).toBe(1);
    expect(t.match(/Warm-up/g)?.length ?? 0).toBe(1);
  });

  it('a session paused in 1.23 reads "Mixed practice" in its Resume row and in the replace alert', () => {
    const ids = getAllQuestions(CERT).slice(0, 12).map((q) => q.id);
    startFromIds(CERT, ids, 'Starting check: 12 mixed questions');
    act(() => {
      buildTodayPlan(CERT, false);
    });
    mount(<Today />);
    expect(allText()).toContain('Resume: Mixed practice');
    expect(allText()).not.toMatch(/Starting check/);
    unmount();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    act(() => {
      runPlanItem({ kind: 'practice', count: 5, label: 'Warm-up · 5 questions' }, CERT);
    });
    expect(String(alert.mock.calls[0][1])).toContain('"Mixed practice"');
  });
});

describe('reminders: every path skips today once the plan is cleared', () => {
  beforeEach(() => {
    useSettings.setState({ reminder: { enabled: true, hour: 22, minute: 0, days: [0, 1, 2, 3, 4, 5, 6] } });
  });

  it('clearing the plan re-plans them at once (no visit to Today needed)', () => {
    act(() => {
      buildTodayPlan(CERT, false);
    });
    mockSchedule.mockClear();
    const s = startFirstSet(CERT)!;
    act(() => {
      s.questionIds.forEach((id) => {
        useSession.getState().answer(id, { display: 'A', correct: true, ms: 20_000 });
        useProgress.getState().recordAnswer(CERT, id, true, undefined, { ms: 20_000 });
      });
      finishSession();
    });
    expect(mockSchedule).toHaveBeenCalledWith(expect.anything(), expect.any(String), expect.objectContaining({ skipToday: true, minutes: 20 }));
  });

  it('a restore re-applies them the same way (skip today, the minutes title)', async () => {
    const plan: DayPlan = { day: dayKey(NOW.getTime()), certId: CERT, budget: 20, items: [{ kind: 'review', count: 4, due: 4 }], done: [true], start: { score: 0, domains: {} }, answered: 4, correct: 4, minutes: 5 };
    act(() => {
      useProgress.getState().startDay(plan);
    });
    await act(async () => {
      expect(await reapplyReminders()).toBe('on');
    });
    expect(mockSchedule).toHaveBeenCalledWith(expect.anything(), expect.any(String), expect.objectContaining({ skipToday: true, minutes: 20 }));
  });
});

describe('the reminder ask never sticks on "working"', () => {
  it('a native error while asking falls back to the calm "Not now" state', async () => {
    mockEnsure.mockRejectedValueOnce(new Error('permissions module failed'));
    mount(<ReminderAsk which="first" />);
    const b = r!.root.findAll((n) => typeof n.props.onPress === 'function' && typeof n.props.accessibilityLabel === 'string' && /^Tomorrow I’ll study at /.test(n.props.accessibilityLabel))[0];
    await act(async () => {
      await b.props.onPress();
    });
    expect(useSeen.getState().reminderAsk.first).toBe('later');
    expect(allText()).not.toMatch(/Tomorrow I’ll study at/);
    expect(useSettings.getState().reminder.enabled).toBe(false);
  });
});

describe('You: words and numbers', () => {
  /** `n` answers in a domain, the first `right` right, three days ago (no retests). */
  const seedDomain = (d: string, n: number, right: number) =>
    act(() => {
      getAllQuestions(CERT)
        .filter((q) => q.domainId === d)
        .slice(0, n)
        .forEach((q, i) => useProgress.getState().recordAnswer(CERT, q.id, i < right, undefined, { at: NOW.getTime() - 3 * 86_400_000 }));
    });

  it('mixed: both the band line and the "latest tries" label', () => {
    seedDomain('1', 10, 9); // a word
    seedDomain('4', 40, 30); // a number
    mount(<You />);
    expect(allText()).toContain(BANDS_LINE);
    expect(allText()).toContain(LATEST_TRIES_LABEL);
  });

  it('"Since you last looked" leaves out a domain shown as a word', () => {
    seedDomain('1', 10, 9);
    seedDomain('4', 40, 30);
    useSeen.setState({ values: { 'you:rings:cisa': [0, 0, 0, 0, 0] } });
    mount(<You />);
    const t = allText();
    expect(t).toMatch(/Since you last looked: IS Operations \+\d+/);
    expect(t).not.toMatch(/IS Audit \+\d+/);
  });
});
