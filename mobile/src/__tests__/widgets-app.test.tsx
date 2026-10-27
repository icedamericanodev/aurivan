/**
 * Mobile 1.47, home-screen widgets: the app's side.
 *
 * - collectSnapshot reads the real stores: no name ever (even with one saved),
 *   readiness only when the widget is on, Think first from the real
 *   principles, Quick question from the real bank (short stems, kept once
 *   picked), the plant's look, today's plan.
 * - lib/widgets.android.ts: writes the key and asks for a redraw of every
 *   kind after a change (settings, a finished session, a restore), never in
 *   the middle of a quiz, never throws, and uses no network.
 * - lib/widgetOpen.ts: each tap opens the right place; counts stay local.
 * - On iOS, the web and in Jest's default platform, lib/widgets does nothing.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWidgetInfo, requestPinWidget, requestWidgetUpdate } from 'react-native-android-widget';
import { findQuestion } from '../content/loader';
import { getPrinciples } from '../content/principles';
import { RULE_PROMPTS } from '../content/principles/widgetPrompts';
import { addDays } from '../engine/examDay';
import { dayKey } from '../engine/streak';
import { parseSnapshot, REVEAL_KEY, snapshotBytes, SNAPSHOT_MAX_BYTES, widgetFace, WIDGET_KEY, WIDGET_KINDS, WIDGET_NAMES, type WidgetTap } from '../engine/widgets';
import { collectSnapshot, QUIZ_STEM_MAX, quizDays, thinkDays } from '../lib/widgetData';
import * as defaultWidgets from '../lib/widgets';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { useWidgetStore } from '../store/widgets';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo', () => ({ ...jest.requireActual('expo'), isRunningInExpoGo: () => false }));
// The icon set ships ES modules Jest can't load (the same stand-in as the other screen tests).
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
const mockRouter = { push: jest.fn(), replace: jest.fn(), canDismiss: jest.fn(() => false), dismissAll: jest.fn() };
jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
}));

const NOW = new Date(2026, 9, 29, 9, 0).getTime();
const TODAY = dayKey(NOW);

function setUp(opts: { name?: string; answers?: number } = {}) {
  useSettings.setState(useSettings.getInitialState(), true);
  useProgress.setState(useProgress.getInitialState(), true);
  useWidgetStore.setState(useWidgetStore.getInitialState(), true);
  useSession.setState({ active: null });
  useSettings.getState().completeOnboarding('cisa', addDays(TODAY, 21), { familiarity: 'some', dailyMinutes: 20 }, opts.name);
  const ids = ['d1_001', 'd1_002', 'd2_001', 'd4_010', 'd5_020'].slice(0, opts.answers ?? 5);
  ids.forEach((id, i) => useProgress.getState().recordAnswer('cisa', id, i % 2 === 0, 'sure'));
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());

describe('collectSnapshot', () => {
  it('never holds the learner’s name, even with one saved', () => {
    setUp({ name: 'Maya' });
    expect(useSettings.getState().displayName).toBe('Maya');
    const s = collectSnapshot(NOW);
    expect(JSON.stringify(s)).not.toContain('Maya');
    expect(s.onboarded).toBe(true);
    expect(s).not.toHaveProperty('cert');
    expect(snapshotBytes(s)).toBeLessThanOrEqual(SNAPSHOT_MAX_BYTES);
  });

  it('readiness only when the readiness widget is on', () => {
    setUp();
    expect(collectSnapshot(NOW).ready).toBeNull();
    useWidgetStore.getState().setReadiness('private');
    const r = collectSnapshot(NOW).ready;
    expect(r).not.toBeNull();
    expect(r!.weights).toEqual([18, 18, 12, 26, 26]);
  });

  it('today’s plan, from the plan Today would show (never saved by the widget)', () => {
    setUp();
    const before = useProgress.getState().days.cisa;
    const s = collectSnapshot(NOW);
    expect(s.plan?.day).toBe(TODAY);
    expect(s.plan?.title.length).toBeGreaterThan(0);
    expect(useProgress.getState().days.cisa).toBe(before);
    for (const kind of WIDGET_KINDS) expect(widgetFace(kind, s, { now: NOW }).label.length).toBeGreaterThan(5);
    // The next plan's first item and minutes ride along, for the done face and the next morning.
    expect(typeof s.plan?.nextMin).toBe('number');
  });

  it('seeds the tester numbers’ study days from the app’s own recent days (on this phone only)', () => {
    setUp();
    useProgress.setState((st) => ({ streak: { ...st.streak, recentDays: [addDays(TODAY, -3), addDays(TODAY, -1)] } }));
    collectSnapshot(NOW);
    expect(useWidgetStore.getState().stats.studyDays).toEqual(expect.arrayContaining([addDays(TODAY, -3), addDays(TODAY, -1)]));
  });

  it('Today’s rule starts at the first rule on the first widget day, then one a day; exam week leads with reading the question', () => {
    const pack = getPrinciples('cisa')!;
    const { think } = thinkDays('cisa', TODAY, { anchor: TODAY });
    expect(think.map((d) => d.id)).toEqual(pack.principles.slice(0, 4).map((p) => p.id));
    expect(think[0].ask).toBe(RULE_PROMPTS[pack.principles[0].id].ask);
    expect(think[0].rule).not.toMatch(/\bIS auditor/);
    for (const t of think) {
      expect(t.rule.endsWith('…')).toBe(false);
      if (t.try) expect(findQuestion('cisa', t.try)).toBeTruthy();
    }
    const examWeek = thinkDays('cisa', TODAY, { anchor: TODAY, examDay: addDays(TODAY, 5) }).think;
    for (const d of examWeek) expect(pack.principles.find((p) => p.id === d.id)?.family).toBe('reading');
  });

  it('Today’s rule: a "Not yet" rule comes back first (from 2 days later), then a rule a recent miss tested', () => {
    const pack = getPrinciples('cisa')!;
    const later = pack.principles[10].id;
    const slip = pack.principles[15].id;
    const self = { [later]: { had: 0, notYet: 1, last: 'notyet' as const, on: addDays(TODAY, -2) } };
    const { think } = thinkDays('cisa', TODAY, { anchor: TODAY, self, slips: [slip] });
    expect(think[0].id).toBe(later);
    expect(think[1].id).toBe(slip);
    // "Had it" spaces a rule out: it is skipped for a week.
    const had = { [pack.principles[0].id]: { had: 1, notYet: 0, last: 'had' as const, on: addDays(TODAY, -1) } };
    expect(thinkDays('cisa', TODAY, { anchor: TODAY, self: had }).think[0].id).not.toBe(pack.principles[0].id);
  });

  it('Quick question: a short stem with no case study, the same all day once picked', () => {
    const { quiz, picks } = quizDays('cisa', TODAY, {}, {});
    expect(quiz).toHaveLength(4);
    for (const q of quiz) expect(q.stem.length).toBeLessThanOrEqual(QUIZ_STEM_MAX);
    // Answering it later in the day doesn't change today's pick; it marks it answered.
    const again = quizDays('cisa', TODAY, picks, { [quiz[0].id]: { lastAt: NOW + 3_600_000 } });
    expect(again.quiz[0].id).toBe(quiz[0].id);
    expect(again.quiz[0].done).toBe(true);
    for (const q of quiz) expect(q.stem).not.toMatch(/\bBIA\b/);
  });

  it('Quick question prefers the day’s first question to revisit, when it fits a widget', () => {
    const fits = quizDays('cisa', TODAY, {}, {}).quiz.map((q) => q.id);
    const due = fits[2];
    const { quiz } = quizDays('cisa', TODAY, {}, {}, [due]);
    expect(quiz[0].id).toBe(due);
  });

  it('the plant: none, off, and its growth', () => {
    setUp();
    expect(collectSnapshot(NOW).plant).toBeNull();
    useProgress.getState().setPlantSettings({ showPlant: false });
    expect(collectSnapshot(NOW).plant).toEqual({ off: true });
  });
});

describe('lib/widgets on Android', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const android = require('../lib/widgets.android') as typeof import('../lib/widgets.android');

  beforeEach(() => {
    android.resetWidgetsForTest();
    (requestWidgetUpdate as jest.Mock).mockClear();
  });

  it('writes the snapshot key and asks every kind to redraw', async () => {
    setUp();
    await android.refreshWidgets();
    const saved = parseSnapshot(await AsyncStorage.getItem(WIDGET_KEY));
    expect(saved?.onboarded).toBe(true);
    const names = (requestWidgetUpdate as jest.Mock).mock.calls.map((c) => c[0].widgetName).sort();
    expect(names).toEqual(Object.values(WIDGET_NAMES).sort());
    // Each redraw builds a light and a dark layout.
    const render = (requestWidgetUpdate as jest.Mock).mock.calls[0][0].renderWidget;
    const out = render({ widgetId: 1, widgetName: 'TodayPlan', width: 376, height: 184, screenInfo: { fontScale: 1 } });
    expect(out.light).toBeTruthy();
    expect(out.dark).toBeTruthy();
  });

  it('never throws, even when storage fails', async () => {
    setUp();
    // The storage mock's setItem is itself a mock: keep its own behaviour and put it back after.
    const setItem = AsyncStorage.setItem as jest.Mock;
    const impl = setItem.getMockImplementation()!;
    setItem.mockImplementation((k: string, v: string) => (k === WIDGET_KEY ? Promise.reject(new Error('disk full')) : impl(k, v)));
    await expect(android.refreshWidgets()).resolves.toBeUndefined();
    setItem.mockImplementation(impl);
  });

  it('uses no network', async () => {
    setUp();
    const fetchSpy = jest.fn(() => {
      throw new Error('no network in widgets');
    });
    const was = global.fetch;
    global.fetch = fetchSpy as unknown as typeof fetch;
    await android.refreshWidgets();
    global.fetch = was;
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refreshes after a settings change and after a quiz ends, never in the middle of one', async () => {
    setUp();
    await Promise.resolve();
    const stop = android.startWidgetSync();
    await jest.advanceTimersByTimeAsync(3000);
    (requestWidgetUpdate as jest.Mock).mockClear();
    // A settings change: one merged refresh.
    useWidgetStore.getState().setDetails('hide');
    await jest.advanceTimersByTimeAsync(3000);
    expect((requestWidgetUpdate as jest.Mock).mock.calls.length).toBe(8);
    expect(parseSnapshot(await AsyncStorage.getItem(WIDGET_KEY))?.prefs.details).toBe('hide');
    (requestWidgetUpdate as jest.Mock).mockClear();
    // Mid-quiz answers wait.
    useSession.setState({ active: { id: 's', mode: 'practice', certId: 'cisa', title: 'x', questionIds: ['d1_003'], perms: {}, index: 0, responses: {}, flagged: [], startedAt: NOW } as never });
    useProgress.getState().recordAnswer('cisa', 'd1_003', true, 'sure');
    await jest.advanceTimersByTimeAsync(3000);
    expect(requestWidgetUpdate).not.toHaveBeenCalled();
    // The quiz ends: the widgets catch up.
    useSession.setState({ active: null });
    await jest.advanceTimersByTimeAsync(3000);
    expect((requestWidgetUpdate as jest.Mock).mock.calls.length).toBe(8);
    stop();
  });

  it('a restore (the stores replaced) refreshes too', async () => {
    setUp();
    const stop = android.startWidgetSync();
    await jest.advanceTimersByTimeAsync(3000);
    (requestWidgetUpdate as jest.Mock).mockClear();
    useProgress.setState(useProgress.getInitialState());
    await jest.advanceTimersByTimeAsync(3000);
    expect(requestWidgetUpdate).toHaveBeenCalled();
    stop();
  });

  it('pins a widget through the launcher, and records which kinds are placed (on this phone only)', async () => {
    setUp();
    (requestPinWidget as jest.Mock).mockResolvedValueOnce(true);
    await expect(android.pinWidget('plan')).resolves.toBe(true);
    expect(requestPinWidget).toHaveBeenCalledWith({ widgetName: 'TodayPlan' });
    (getWidgetInfo as jest.Mock).mockImplementation(async (name: string) => (name === 'YourPlant' ? [{ widgetId: 3 }] : []));
    await expect(android.placedKinds()).resolves.toEqual(['plant']);
  });

  it('Think first reveal marks live in their own key, never in a study store', async () => {
    setUp();
    await AsyncStorage.setItem(REVEAL_KEY, JSON.stringify({ day: TODAY, ids: [5], counts: { x: 1 } }));
    const before = JSON.stringify(useProgress.getState().byCert);
    await android.refreshWidgets();
    expect(JSON.stringify(useProgress.getState().byCert)).toBe(before);
  });
});

describe('the counters for the beta (on this phone only)', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const stats = require('../lib/widgetStats') as typeof import('../lib/widgetStats');
  beforeEach(() => {
    setUp();
    stats.resetWidgetStatsForTest();
  });

  it('a start is claimed once, within a minute of the tap', () => {
    stats.armWidgetStart('plan');
    expect(stats.claimWidgetStart(NOW + 1000)).toBe('plan');
    expect(stats.claimWidgetStart(NOW + 2000)).toBeUndefined();
    stats.armWidgetStart('week');
    expect(stats.claimWidgetStart(NOW + stats.ARM_MS + 1)).toBeUndefined();
    expect(useWidgetStore.getState().stats.started).toEqual({ plan: 1 });
  });

  it('completed: at least 3 answers (or every question of a shorter set)', () => {
    stats.noteWidgetSessionEnd('plan', 3, 10);
    stats.noteWidgetSessionEnd('plan', 2, 10);
    stats.noteWidgetSessionEnd('question', 1, 1);
    stats.noteWidgetSessionEnd(undefined, 10, 10);
    expect(useWidgetStore.getState().stats.completed).toEqual({ plan: 1, question: 1 });
  });

  it('a cleared plan counts for the widget that started the day, once a day', () => {
    stats.armWidgetStart('week');
    stats.claimWidgetStart(NOW);
    stats.noteWidgetStudy(true, NOW);
    stats.noteWidgetStudy(true, NOW + 60_000);
    expect(useWidgetStore.getState().stats.cleared).toEqual({ week: 1 });
    expect(useWidgetStore.getState().stats.studyDays).toContain(TODAY);
  });

  it('a widget counts as removed only after it is missing on 2 app opens in a row', () => {
    const ws = () => useWidgetStore.getState();
    ws().noteSeen(['plan'], TODAY);
    ws().noteSeen([], TODAY);
    expect(ws().stats.seen.plan?.gone).toBeUndefined();
    ws().noteSeen(['plan'], TODAY);
    ws().noteSeen([], TODAY);
    expect(ws().stats.seen.plan?.gone).toBeUndefined();
    ws().noteSeen([], addDays(TODAY, 1));
    expect(ws().stats.seen.plan?.gone).toBe(addDays(TODAY, 1));
  });
});

describe('lib/widgets elsewhere (iOS, web, Jest default)', () => {
  it('does nothing', async () => {
    expect(defaultWidgets.widgetsSupported).toBe(false);
    expect(typeof defaultWidgets.startWidgetSync()).toBe('function');
    await expect(defaultWidgets.pinWidget('plan')).resolves.toBe(false);
    await expect(defaultWidgets.placedKinds()).resolves.toEqual([]);
  });
});

describe('a widget tap', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { openFromWidget } = require('../lib/widgetOpen') as typeof import('../lib/widgetOpen');
  const tap = (over: Partial<WidgetTap>): WidgetTap => ({ kind: 'plan', go: 'today', id: null, fromWidget: true, ...over });

  it('Start opens today’s live plan in a session, with Today underneath; it counts as started only when a session starts', () => {
    setUp();
    expect(openFromWidget(tap({ go: 'start' }))).toBe(true);
    expect(mockRouter.replace).toHaveBeenCalledWith('/home');
    expect(useWidgetStore.getState().stats.opens.plan).toBe(1);
    const active = useSession.getState().active;
    expect(useWidgetStore.getState().stats.started.plan ?? 0).toBe(active ? 1 : 0);
    if (active) expect(active.widget).toBe('plan');
  });

  it('a tap that starts nothing is never counted as started (nothing to revisit, a screen, a missing question)', () => {
    setUp();
    useProgress.setState((st) => ({ byCert: { ...st.byCert, cisa: { ...st.byCert.cisa!, review: {} } } }));
    openFromWidget(tap({ kind: 'revisit', go: 'review' }));
    openFromWidget(tap({ kind: 'plant', go: 'plant' }));
    openFromWidget(tap({ kind: 'question', go: 'question', id: 'nope_999' }));
    expect(useWidgetStore.getState().stats.started).toEqual({});
    expect(useWidgetStore.getState().stats.opens).toEqual({ revisit: 1, plant: 1, question: 1 });
  });

  it('an open quiz is never closed by a link: a study tap resumes it', () => {
    setUp();
    useSession.setState({ active: { id: 's', mode: 'practice', certId: 'cisa', title: 'x', questionIds: ['d1_003'], perms: {}, index: 0, responses: {}, flagged: [], startedAt: NOW } as never });
    expect(openFromWidget(tap({ go: 'start' }))).toBe(false);
    expect(mockRouter.push).toHaveBeenLastCalledWith('/session');
    expect(useSession.getState().active?.id).toBe('s');
  });

  it('a quick question opens that question (answered in the app); a missing one just opens Today', () => {
    setUp();
    expect(openFromWidget(tap({ kind: 'question', go: 'question', id: 'd1_001' }))).toBe(true);
    expect(useSession.getState().active?.questionIds).toEqual(['d1_001']);
    useSession.setState({ active: null });
    expect(openFromWidget(tap({ kind: 'question', go: 'question', id: 'nope_999' }))).toBe(false);
  });

  it('plain goals open their screen; a principle by id, else the list', () => {
    setUp();
    openFromWidget(tap({ kind: 'plant', go: 'plant' }));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/plant');
    openFromWidget(tap({ kind: 'think', go: 'principle', id: 'final-two' }));
    expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/principles/[id]', params: { id: 'final-two' } });
    openFromWidget(tap({ kind: 'think', go: 'principle', id: 'not-a-principle' }));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/principles');
    openFromWidget(tap({ kind: 'readiness', go: 'settings' }));
    expect(mockRouter.push).toHaveBeenLastCalledWith('/settings?section=widgets');
  });

  it('a tap earns nothing: no answer, no study day, no growth', () => {
    setUp();
    const before = JSON.stringify({ p: useProgress.getState().byCert, s: useProgress.getState().streak });
    openFromWidget(tap({ kind: 'plant', go: 'plant' }));
    openFromWidget(tap({ kind: 'readiness', go: 'readiness' }));
    expect(JSON.stringify({ p: useProgress.getState().byCert, s: useProgress.getState().streak })).toBe(before);
  });

  it('before onboarding it goes to the start', () => {
    useSettings.setState(useSettings.getInitialState(), true);
    openFromWidget(tap({ go: 'start' }));
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  it('a link not from a widget is never counted', () => {
    setUp();
    openFromWidget(tap({ kind: 'plant', go: 'plant', fromWidget: false }));
    expect(useWidgetStore.getState().stats.opens.plant).toBeUndefined();
  });
});
