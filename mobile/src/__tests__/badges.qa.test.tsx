/**
 * QA, PR #40 "Badge collection" (mobile 1.10.0): the learner journeys, on
 * real CISA content and the real stores and screens.
 *
 * 1. Upgrade from a 1.9 save that already holds badges: dates kept, no
 *    "new" dot for old badges, set counts right, a completed set's planter
 *    saved, nothing lost on a backup round trip.
 * 2. Earning a badge in a session: the Results moment sits after the review
 *    actions, waits until it is scrolled into view, a new drag skips it; the
 *    "new" dot on the You row and the You tab clears once the case is
 *    opened; at most 3 moments in 7 days, then the quiet line.
 * 3. "Next for your exam" at each journey stage: slot 1 as the spec says, no
 *    duplicates, nothing gated, no mock badge too early; every "Study for
 *    this" opens a real session or screen.
 * 4. The case: All / Earned / Not yet × every sort; the detail sheet (open,
 *    gated, earned); the Rooted ladder; the after-exam album.
 * 5. Show badges off and on again, and in backups.
 * 6. Restore validation: edited backups can't claim higher tiers or planters.
 * 7. Reset.
 * 8. Regressions: Field notes and game levels; the /milestones route.
 *
 * Tests marked `it.failing` pin a bug found in this QA pass: they pass while
 * the bug is there and start failing (so the marker must go) once it is fixed.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions, Modal, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Badges from '../app/milestones';
import FieldNotes from '../app/field-notes';
import TabsLayout from '../app/(tabs)/_layout';
import You from '../app/(tabs)/you';
import Results from '../app/results';
import Settings from '../app/settings';
import { BadgeCell, BadgeSheet, NextPanel } from '../components/badges';
import { MilestoneMomentView, resetBadgeMomentsForTest } from '../components/milestones';
import { resetCelebrationsForTest } from '../components/motion';
import { Screen } from '../components/ui';
import { getCertification } from '../content/certifications';
import { lessonsFor } from '../content/lessons';
import { getDomainQuestions } from '../content/loader';
import {
  CASE_SORTS,
  COUNTED_SETS,
  mockTime,
  nextForExam,
  passesFilter,
  setCountLine,
  sortMarks,
  studyTarget,
  type CaseFilter,
  type CaseMark,
  type NextForExam,
} from '../engine/badgeCatalog';
import { computeReadiness } from '../engine/readiness';
import { dueIds } from '../engine/srs';
import { dayKey } from '../engine/streak';
import { space } from '../theme/tokens';
import { checkBackupText, currentBackup, restoreBackup } from '../lib/backup';
import { caseStage, hasNewBadge, initCaseSeen, showBadgesAgain, studyFor, weakestDomain } from '../lib/badges';
import { finishSession } from '../lib/finishSession';
import { finishGameRound } from '../lib/gameRounds';
import { badgeCase, checkMilestones, ensureBackfill, momentFor, syncPlanters } from '../lib/milestones';
import { startFromIds } from '../lib/sessions';
import { daysUntil } from '../lib/useActiveCert';
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
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null }));
// The tab bar, drawn flat: each tab's icon and its spoken label (the real Tabs needs a navigator).
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  const Tabs = ({ children }: { children: unknown }) => React.createElement(React.Fragment, null, children);
  Tabs.Screen = function TabScreen({ name, options }: { name: string; options: { tabBarIcon?: (p: object) => unknown; tabBarAccessibilityLabel?: string } }) {
    return React.createElement('TabScreen', { name, tabLabel: options.tabBarAccessibilityLabel }, options.tabBarIcon ? React.createElement(options.tabBarIcon, { color: '#000', focused: false, size: 24 }) : null);
  };
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), dismissTo: jest.fn(), canGoBack: () => true, canDismiss: () => false },
    // The case counts as seen while focused: a mounted screen is focused here.
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(cb, [cb]),
    useLocalSearchParams: () => ({}),
    Tabs,
  };
});
jest.mock('expo-router/react-navigation', () => ({ PlatformPressable: () => null }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
const mockSuccess = jest.fn();
jest.mock('../lib/haptics', () => ({ haptic: { success: () => mockSuccess(), selection: () => {}, error: () => {}, light: () => {}, warning: () => {} } }));

// ── Harness ──────────────────────────────────────────────────────────────
let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const textOf = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
const allText = () => textOf(root());
/** The You tab as the (mocked) tab bar draws it. */
const youTab = () => root().findAll((n) => (n.type as unknown) === 'TabScreen' && n.props.name === 'you')[0];
const labels = () => root().findAll((n) => typeof n.props.accessibilityLabel === 'string').map((n) => n.props.accessibilityLabel as string);
const press = (label: RegExp, scope?: ReactTestInstance) => {
  const n = (scope ?? root()).findAll((x) => typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string' && label.test(x.props.accessibilityLabel))[0];
  if (!n) throw new Error(`no button ${label}`);
  act(() => {
    n.props.onPress();
  });
};
const mount = (el: React.ReactElement) =>
  act(() => {
    r = create(el);
  });
const unmount = () => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
};

/** The medallions inside a node (Medallion is memoised, so it is found by its props). */
const medallions = (n: ReactTestInstance) => n.findAll((x) => typeof x.type !== 'string' && typeof x.props.badge === 'string' && typeof x.props.state === 'string' && typeof x.props.size === 'number');
const setScale = (fontScale: number) => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, fontScale }, screen: { ...w, fontScale } });
  });
};

const T0 = new Date(2026, 9, 12, 10, 0, 0).getTime();
const DAY = 86_400_000;
const cert = getCertification('cisa')!;
const ids = (domain: string, from: number, n: number) => getDomainQuestions('cisa', domain).slice(from, from + n).map((q) => q.id);
const cp = () => selectCert(useProgress.getState(), 'cisa');
const answer = (id: string, correct = true, at = Date.now()) => useProgress.getState().recordAnswer('cisa', id, correct, undefined, { at });
/** n answers in a domain, `right` of them right. */
const answerDomain = (d: string, n: number, right = n, at = Date.now()) => ids(d, 0, n).forEach((id, i) => answer(id, i < right, at));
const setMilestones = (m: object) =>
  act(() => {
    useProgress.getState().updateMilestones('cisa', (prev) => ({ milestones: { earned: {}, ...prev, ...m } }));
  });
const examIn = (days: number) => useSettings.setState({ examDates: { cisa: dayKey(T0 + days * DAY) } });
const fullMock = (id: string, at: number): MockResult => ({
  id,
  finishedAt: at,
  total: cert.exam.questions,
  correct: 120,
  minutesUsed: 200,
  byDomain: {},
  timing: 'standard',
  minutesAllowed: cert.exam.minutes,
  unanswered: 0,
});
const addMocks = (...mocks: MockResult[]) =>
  act(() => {
    useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...selectCert(s, 'cisa'), mocks } } }));
  });

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  mockSuccess.mockClear();
  for (const f of Object.values(router)) if (typeof f === 'function' && 'mockClear' in f) (f as jest.Mock).mockClear();
  setMockReducedMotion(true);
  resetCelebrationsForTest();
  resetBadgeMomentsForTest();
  useProgress.setState({ byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {} });
  useSession.getState().clear();
  useSettings.setState({ onboarded: true, activeCertId: 'cisa', examDates: {}, practiceTimer: false, badgesHidden: false });
  useSeen.setState({ values: {}, moments: {}, days: {}, badgeMoments: [], caseSeen: {}, badgeSort: undefined });
  setScale(1);
});
afterEach(() => {
  unmount();
  setScale(2);
  jest.useRealTimers();
});

// ── 1. Upgrade from a 1.9 save ───────────────────────────────────────────
describe('1. upgrade from a 1.9 save with earned milestones', () => {
  // A 1.9 learner: 25 answers per domain (IS Operations all right, the rest
  // half right), one lesson, 12 study days, six badges earned over a month,
  // and the Build F back-fill long done. No planters, no case-seen time.
  const A = T0 - 30 * DAY;
  const SAVED: Record<string, number> = {
    'first-foothold': A,
    'topic-clear': A + 2 * DAY,
    'ten-topics': A + 9 * DAY,
    'firm-footing:4': A + 12 * DAY,
    'rooted:10': A + 20 * DAY,
    'fresh-start': A + 25 * DAY,
    'snare-wise': A + 26 * DAY,
  };
  const nineSave = () => {
    for (const d of ['1', '2', '3', '5']) answerDomain(d, 25, 13, A);
    answerDomain('4', 25, 25, A);
    act(() => {
      useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...selectCert(s, 'cisa'), lessonsDone: [lessonsFor('cisa')[0].id] } } }));
    });
    // A real Snare-wise round (its 10 hits are the evidence a restore checks).
    jest.setSystemTime(A + 26 * DAY);
    finishGameRound('cisa', 'trap', { score: 10, rate: 1, tier: 'seedling', hits: Array(10).fill(true) });
    jest.setSystemTime(T0);
    // The 1.9 save as it was: exactly these badges, nothing queued, the back-fill long done.
    setMilestones({ earned: { ...SAVED }, queue: [], backfill: { at: A, count: 3, seen: true }, days: 12, lastDay: dayKey(T0 - 5 * DAY) });
  };
  /** What the app does at launch (app/_layout.tsx): the back-fill (already done), then the case-seen time and the planters. */
  const launch = () => {
    expect(ensureBackfill('cisa', T0)).toBeNull();
    initCaseSeen('cisa', T0);
    syncPlanters('cisa', T0);
  };

  it('every badge keeps its exact date and lands in its set', () => {
    nineSave();
    launch();
    const { marks } = badgeCase('cisa', cp());
    const setOf: Record<string, string> = {
      'first-foothold': 'groundwork',
      'topic-clear': 'groundwork',
      'ten-topics': 'groundwork',
      'firm-footing:4': 'domains',
      'rooted:10': 'rooted',
      'fresh-start': 'moments',
      'snare-wise': 'fieldNotes',
    };
    for (const [key, at] of Object.entries(SAVED)) {
      const m = marks.find((x) => x.key === key);
      expect([key, m?.status, m?.earnedAt, m?.set]).toEqual([key, 'earned', at, setOf[key]]);
    }
    // The saved map itself is untouched by the launch.
    expect(cp().milestones!.earned).toEqual(SAVED);
  });

  it('no "new" dot for badges held before the update: not on the You row, not on the tab', () => {
    nineSave();
    launch();
    expect(hasNewBadge('cisa')).toBe(false);
    mount(<You />);
    expect(root().findAll((n) => n.props.testID === 'new-badge-dot')).toHaveLength(0);
    expect(labels().some((l) => l.startsWith(`Badges, ${Object.keys(SAVED).length} earned.`))).toBe(true);
    unmount();
    mount(<TabsLayout />);
    expect(root().findAll((n) => n.props.testID === 'you-new-dot')).toHaveLength(0);
    expect(youTab().props.tabLabel).toBe('You');
  });

  it('each set has its own count; Moments has none; no grand total anywhere', () => {
    nineSave();
    launch();
    const { sets } = badgeCase('cisa', cp());
    const line = Object.fromEntries(sets.map((s) => [s.info.id, setCountLine(s)]));
    expect(line).toEqual({
      groundwork: '3 of 3 · Complete',
      domains: '1 of 6',
      evergreen: '0 of 3',
      judgement: '0 of 3',
      examDay: '0 of 2',
      rooted: '1 of 3',
      moments: undefined,
      fieldNotes: '1 of 7',
    });
    expect(sets.find((s) => s.info.id === 'groundwork')!.completeAt).toBe(SAVED['ten-topics']);
    mount(<Badges />);
    // Never a grand total: no "n of 20" (the counted marks) or "n of 28" (every mark) for badges.
    expect(allText()).not.toMatch(/\d+ of (20|28) (badges|earned)|of 28\b/);
  });

  // Fixed in review; was a bug (Minor now; Major once slice C adds a badge to a set): a set completed
  // before 1.10 has no planter saved at launch. withPlanters only runs when a
  // NEW badge is earned (checkMilestones) or in the one-time back-fill, which
  // a 1.9 save has already had.
  it('a set completed before the update has its planter saved at launch', () => {
    nineSave();
    launch();
    expect(cp().milestones!.planters?.groundwork).toBe(SAVED['ten-topics']);
  });

  it('the next badge earned saves the planter of every complete set, dated by its last badge (and says "That completes")', () => {
    nineSave();
    launch();
    // Rooted · 30 and · 60 were earned in 1.9 too; the 60th study day lands now.
    setMilestones({ earned: { ...SAVED, 'rooted:30': A + 28 * DAY }, days: 60 });
    jest.setSystemTime(T0 + DAY);
    act(() => {
      checkMilestones('cisa');
    });
    const m = cp().milestones!;
    expect(m.earned['rooted:60']).toBe(T0 + DAY);
    expect(m.planters).toEqual({ groundwork: SAVED['ten-topics'], rooted: T0 + DAY });
    const moment = momentFor('cisa', 'rooted:60')!;
    expect(moment.completes).toBe(true);
    expect(moment.tierUp).toBe(true);
    expect(moment.setName).toBe('Rooted');
  });

  it('nothing is lost on a backup round trip: every badge, date and planter', async () => {
    nineSave();
    launch();
    setMilestones({ earned: { ...SAVED, 'rooted:30': A + 28 * DAY }, days: 60 });
    act(() => {
      checkMilestones('cisa');
    });
    const before = cp().milestones!;
    expect(Object.keys(before.planters ?? {})).toEqual(['groundwork', 'rooted']);
    const read = checkBackupText(JSON.stringify(currentBackup(T0)));
    if (read.kind !== 'ok') throw new Error(read.code);
    // Wipe the phone, then restore.
    act(() => {
    useProgress.getState().resetCert('cisa');
  });
    expect(cp().milestones!.earned).toEqual({});
    await act(async () => {
      await restoreBackup(read.data, T0);
    });
    const after = cp().milestones!;
    expect(after.earned).toEqual(before.earned);
    expect(after.planters).toEqual(before.planters);
    expect(after.days).toBe(before.days);
    // Restored badges are not "new" (they were earned before the case was last opened).
    expect(hasNewBadge('cisa')).toBe(false);
  });

  // Fixed in review; was a bug (Minor): restoring a backup from before Build F (no back-fill yet)
  // runs the back-fill AFTER the launch set the case-seen time, so every
  // back-filled badge is dated "now" and shows the "new" dot.
  it('badges back-filled after a restore of an older backup do not show the "new" dot', async () => {
    // A backup made before badges existed: answers, no milestones.
    answerDomain('4', 25, 25, T0 - 20 * DAY);
    const old = currentBackup(T0 - 10 * DAY);
    delete (old.stores.progress.state as unknown as { byCert: Record<string, { milestones?: unknown }> }).byCert.cisa.milestones;
    act(() => {
      useProgress.setState({ byCert: {} });
    });
    initCaseSeen('cisa', T0); // this phone's launch
    jest.setSystemTime(T0 + 60_000);
    const read = checkBackupText(JSON.stringify(old));
    if (read.kind !== 'ok') throw new Error(read.code);
    await act(async () => {
      await restoreBackup(read.data, T0 + 60_000);
    });
    // app/_layout.tsx: the restored cert has no back-fill yet, so it runs now.
    expect(ensureBackfill('cisa')).toBeGreaterThan(0);
    expect(hasNewBadge('cisa')).toBe(false);
  });
});

// ── 2. Earning a new badge in a session ──────────────────────────────────
describe('2. earning a new badge in a session', () => {
  /** A 20-question session, all right: First Foothold (and Firm Footing · IS Operations) are earned. */
  const diagnosticSession = () => {
    ensureBackfill('cisa', T0 - DAY);
    initCaseSeen('cisa', T0 - DAY);
    const list = ids('4', 0, 20);
    startFromIds('cisa', list, 'Twenty');
    act(() => {
      useSession.setState((s) => ({ active: s.active && { ...s.active, responses: Object.fromEntries(list.map((id) => [id, { display: 'A', correct: true, ms: 40_000 }])) } }));
    });
    list.forEach((id) => answer(id));
    act(() => {
      finishSession();
    });
  };
  /** The two scroll anchors around the moment: its own block, then the stats block it sits in. */
  const layoutMoment = (statsY: number, momentY: number) => {
    const fns: ((e: object) => void)[] = [];
    let n: ReactTestInstance | null = root().findByType(MilestoneMomentView).parent;
    while (n && fns.length < 2) {
      if (typeof n.props.onLayout === 'function' && !fns.includes(n.props.onLayout)) fns.push(n.props.onLayout);
      n = n.parent;
    }
    act(() => {
    fns[0]({ nativeEvent: { layout: { y: momentY, height: 200 } } });
  });
    act(() => {
    fns[1]({ nativeEvent: { layout: { y: statsY, height: 600 } } });
  });
  };

  it('the moment sits after the score and the review actions, before the answer list', () => {
    diagnosticSession();
    mount(<Results />);
    const t = allText();
    const at = (s: string) => t.indexOf(s);
    expect(at('A new badge · Groundwork')).toBeGreaterThan(at('Done'));
    expect(at('A new badge · Groundwork')).toBeLessThan(at('Review answers'));
    expect(t).toContain('First Foothold');
    expect(t).toContain('You’ve mapped where you stand.');
    press(/^See it in your badges/);
    // It opens the case with this badge's sheet up (UX O7).
    expect(router.push).toHaveBeenCalledWith({ pathname: '/milestones', params: { open: 'first-foothold' } });
  });

  it('it waits until it is scrolled into view (the success tap comes with it), then a new drag skips it', () => {
    setMockReducedMotion(false);
    diagnosticSession();
    mount(<Results />);
    act(() => {
    jest.advanceTimersByTime(3000);
  }); // the rings settle
    layoutMoment(900, 300); // the moment's top is 1200pt down the scroll
    const screen = () => root().findByType(Screen);
    act(() => {
    screen().props.onScroll(0, 700);
  }); // still below the fold
    expect(mockSuccess).not.toHaveBeenCalled();
    const cel = () => root().findAll((n) => n.props.celebration !== undefined)[0].props.celebration as { mode: string; settled: boolean; run: number };
    expect(cel().run).toBe(0);
    act(() => {
    screen().props.onScroll(700, 700);
  }); // 1200 < 700 + 700 − 96: in view
    expect(mockSuccess).toHaveBeenCalledTimes(1);
    expect(cel().mode).toBe('full');
    expect(cel().settled).toBe(false);
    act(() => {
    screen().props.onScrollBeginDrag();
  });
    expect(cel().settled).toBe(true);
    expect(mockSuccess).toHaveBeenCalledTimes(1);
  });

  it('the "new" dot shows on the You row and the You tab (spoken), and clears once the case is opened', () => {
    diagnosticSession();
    jest.setSystemTime(T0 + 60_000);
    expect(hasNewBadge('cisa')).toBe(true);
    mount(<You />);
    expect(root().findAll((n) => n.props.testID === 'new-badge-dot').length).toBeGreaterThan(0);
    expect(labels().some((l) => l.startsWith('Badges, new badge, 2 earned.'))).toBe(true);
    unmount();
    mount(<TabsLayout />);
    expect(root().findAll((n) => n.props.testID === 'you-new-dot').length).toBeGreaterThan(0);
    expect(youTab().props.tabLabel).toBe('You, new badge');
    unmount();
    mount(<Badges />);
    unmount();
    expect(hasNewBadge('cisa')).toBe(false);
    mount(<TabsLayout />);
    expect(root().findAll((n) => n.props.testID === 'you-new-dot')).toHaveLength(0);
    expect(youTab().props.tabLabel).toBe('You');
    unmount();
    mount(<You />);
    expect(root().findAll((n) => n.props.testID === 'new-badge-dot')).toHaveLength(0);
  });

  it('three moments in the last 7 days: the next badge is the quiet line, with no tap; a day later than a week, moments play again', () => {
    useSeen.setState({ badgeMoments: [T0 - 6 * DAY, T0 - 2 * DAY, T0 - DAY] });
    diagnosticSession();
    mount(<Results />);
    expect(allText()).toContain('New in your badges: First Foothold');
    expect(allText()).not.toContain('A new badge');
    expect(allText()).toContain('See it in your badges ›');
    expect(mockSuccess).not.toHaveBeenCalled();
    expect(useSeen.getState().badgeMoments).toEqual([T0 - 6 * DAY, T0 - 2 * DAY, T0 - DAY]);
    unmount();
    // The oldest moment is now more than 7 days old: the next one plays.
    jest.setSystemTime(T0 + DAY + 1);
    resetBadgeMomentsForTest();
    const m = momentFor('cisa', 'firm-footing:4')!;
    mount(<MilestoneMomentView moment={m} once="later" />);
    expect(allText()).toContain('A new badge · The Five Domains');
    expect(useSeen.getState().badgeMoments).toHaveLength(3);
  });

  // Fixed in review; was a bug (Minor, copy): when one session earns several badges of the same set
  // and that completes it, EVERY one of their moments (one now, the others in
  // later sessions) says "That completes The Five Domains." momentFor treats
  // any badge dated at the completion time as the one that completed it.
  it('only one moment says "That completes" a set, even when its last badges arrive together', () => {
    for (const d of ['1', '2', '3', '4', '5']) answerDomain(d, 20);
    setMilestones({ earned: { 'firm-footing:1': T0 - 9 * DAY, 'firm-footing:2': T0 - 8 * DAY, 'firm-footing:3': T0 - 7 * DAY } });
    act(() => {
      checkMilestones('cisa'); // Firm Footing · IS Operations and · Info Protection, and Whole Map, at once
    });
    const done = ['firm-footing:4', 'firm-footing:5', 'whole-map'].filter((k) => momentFor('cisa', k)?.completes);
    expect(done).toHaveLength(1);
  });

  // Fixed in review; was a bug (Minor): the weekly budget is charged when the Results screen renders
  // the moment (decideQuiet in a useState initialiser), not when it plays. A
  // learner who taps Done without scrolling down never sees the moment, yet
  // it uses one of the 3 moments for the week; and reopening the same Results
  // after the app restarts charges it again.
  it('a moment that was never scrolled into view does not use up the weekly budget', () => {
    diagnosticSession();
    mount(<Results />);
    unmount();
    expect(useSeen.getState().badgeMoments).toEqual([]);
  });
});

// ── 3. Next for your exam, at each journey stage ─────────────────────────
describe('3. "Next for your exam" at each journey stage', () => {
  const MOCK_BADGES = new Set(['dress-rehearsal', 'on-pace']);
  /** The panel exactly as the case computes it, from the saved progress now. */
  const next = (): NextForExam & { stage: string; daysLeft: number | null } => {
    act(() => {
      checkMilestones('cisa');
    });
    const p = cp();
    const daysLeft = daysUntil(useSettings.getState().examDates.cisa);
    const stage = caseStage('cisa', p, computeReadiness(cert, p.answers), daysLeft);
    const { marks, mastery } = badgeCase('cisa', p);
    return { ...nextForExam({ marks, stage, daysLeft, mastery }), stage, daysLeft };
  };
  /** The rules every panel keeps, at every stage. */
  const sane = (n: ReturnType<typeof next>) => {
    const all = [...(n.best ? [n.best] : []), ...n.nearest];
    expect(n.nearest.length).toBeLessThanOrEqual(2);
    expect(new Set(all.map((m) => m.badge)).size).toBe(all.length); // one per badge, slot 1's not repeated
    for (const m of all) {
      expect([m.key, m.status]).not.toEqual([m.key, 'earned']);
      expect([m.key, m.status]).not.toEqual([m.key, 'gated']);
      expect([m.key, COUNTED_SETS.includes(m.set)]).toEqual([m.key, true]); // never Moments or Field notes
      if (MOCK_BADGES.has(m.badge)) expect([m.key, mockTime(n.stage as never, n.daysLeft)]).toEqual([m.key, true]);
    }
  };

  it('diagnose (nothing answered): First Foothold', () => {
    const n = next();
    expect(n.stage).toBe('diagnose');
    expect(n.best?.key).toBe('first-foothold');
    sane(n);
  });

  it('learn (20+ answered, lessons to do, readiness low): the heaviest domain’s Firm Footing gap (IS Operations wins the tie with Info Protection)', () => {
    for (const d of ['1', '2', '3', '4', '5']) answerDomain(d, 5, 0);
    const n = next();
    expect(n.stage).toBe('learn');
    expect(cp().milestones!.earned['first-foothold']).toBeDefined();
    expect(n.best?.key).toBe('firm-footing:4');
    sane(n);
  });

  it('practice (one domain under 65%): Firm Footing where weight × gap is largest', () => {
    // IS Operations and Info Protection strong; IT Governance weakest of the 18% domains.
    answerDomain('4', 10);
    answerDomain('5', 10);
    answerDomain('1', 10, 6);
    answerDomain('2', 10, 3);
    answerDomain('3', 10, 3);
    const n = next();
    expect(n.stage).toBe('practice');
    // 18% × (0.70 − 0.30) beats 12% × (0.70 − 0.30) and 18% × (0.70 − 0.60).
    expect(n.best?.key).toBe('firm-footing:2');
    sane(n);
  });

  it('mock (every domain at 65%, fewer than 2 mocks): Dress Rehearsal, then On Pace once it is earned', () => {
    for (const d of ['1', '2', '3', '4', '5']) answerDomain(d, 10);
    let n = next();
    expect(n.stage).toBe('mock');
    expect(cp().milestones!.earned['whole-map']).toBeDefined();
    expect(n.best?.key).toBe('dress-rehearsal');
    sane(n);
    addMocks(fullMock('m1', T0 - DAY));
    n = next();
    expect(cp().milestones!.earned['dress-rehearsal']).toBeDefined();
    expect(n.best?.key).toBe('on-pace');
    sane(n);
  });

  it('ready (2 mocks, readiness 80+): Long Memory, then Graduate', () => {
    for (const d of ['1', '2', '3', '4', '5']) answerDomain(d, 20);
    addMocks(fullMock('m1', T0 - 9 * DAY), fullMock('m2', T0 - DAY));
    const n = next();
    expect(n.stage).toBe('ready');
    expect(n.best?.key).toBe('long-memory');
    sane(n);
  });

  it('exam week and the final three weeks: the mock rule leads, whatever the stage', () => {
    answerDomain('4', 10);
    answerDomain('5', 10);
    answerDomain('1', 10, 6);
    answerDomain('2', 10, 3);
    answerDomain('3', 10, 3);
    examIn(15);
    let n = next();
    expect(n.stage).toBe('practice');
    expect(n.best?.key).toBe('dress-rehearsal');
    sane(n);
    examIn(5);
    n = next();
    expect(n.stage).toBe('examDay');
    expect(n.best?.key).toBe('dress-rehearsal');
    sane(n);
  });

  // Fixed in review; was a bug (Minor, spec reading): §4.3 lists `stage 'diagnose' → First Foothold`
  // first; the code checks "daysLeft ≤ 21" first, so a learner who starts two
  // weeks before the exam is told the best thing for the exam is a 4-hour mock,
  // before the 20-question diagnostic.
  it('a learner who starts in the final three weeks is pointed at the diagnostic first', () => {
    examIn(15);
    const n = next();
    expect(n.stage).toBe('diagnose');
    expect(n.best?.key).toBe('first-foothold');
  });

  it('after the exam: no panel at all', () => {
    for (const d of ['1', '2', '3', '4', '5']) answerDomain(d, 10);
    useSettings.setState({ examDates: { cisa: dayKey(T0 - 3 * DAY) } });
    const n = next();
    expect(n.stage).toBe('afterExam');
    expect(n.best).toBeUndefined();
    expect(n.nearest).toEqual([]);
    mount(<Badges />);
    expect(root().findAllByType(NextPanel)).toHaveLength(0);
  });

  it('the screen shows slot 1 in the forest panel, with its button spoken with the badge name', () => {
    for (const d of ['1', '2', '3', '4', '5']) answerDomain(d, 5, 0);
    checkMilestones('cisa');
    mount(<Badges />);
    const panel = root().findByType(NextPanel);
    expect(panel.props.best.key).toBe('firm-footing:4');
    expect(textOf(panel)).toContain('Next for your exam');
    expect(textOf(panel)).toContain('Firm Footing · IS Operations');
    expect(textOf(panel)).toContain('26% of the exam');
    expect(panel.props.nearest.map((m: CaseMark) => m.badge)).not.toContain('firm-footing');
  });

  /** What a "Study for this" tap opened: a started session, or a screen that exists in src/app. */
  const APP = join(__dirname, '..', 'app');
  const routeExists = (path: string) => [`${path}.tsx`, `(tabs)${path}.tsx`, `${path}/index.tsx`].some((f) => existsSync(join(APP, f)));
  const opened = (): string => {
    const calls = [...(router.push as jest.Mock).mock.calls, ...(router.navigate as jest.Mock).mock.calls];
    expect(calls).toHaveLength(1);
    const to = calls[0][0] as string | { pathname: string; params?: Record<string, string> };
    const path = typeof to === 'string' ? to : to.pathname;
    expect([path, routeExists(path)]).toEqual([path, true]);
    if (path === '/session') {
      const s = useSession.getState().active;
      expect(s?.questionIds.length ?? 0).toBeGreaterThan(0);
      return `session:${s!.title}`;
    }
    if (path === '/mock-start') expect((to as { params: Record<string, string> }).params.questions).toBe(String(cert.exam.questions));
    return path;
  };

  it('every "Study for this", on every badge not yet earned, opens a working session or screen', () => {
    // A learner part-way: some answers, two misses due for review today.
    answerDomain('4', 12, 10, T0 - 3 * DAY);
    const p = cp();
    const { marks, mastery } = badgeCase('cisa', p);
    const due = dueIds(p.review, T0).length;
    expect(due).toBeGreaterThan(0);
    const results: Record<string, string> = {};
    for (const m of marks) {
      const target = studyTarget(m, weakestDomain(mastery));
      if (!target) {
        // Only earned, gated and Moments have no button.
        expect([m.key, m.status === 'earned' || m.status === 'gated' || m.set === 'moments']).toEqual([m.key, true]);
        continue;
      }
      (router.push as jest.Mock).mockClear();
      (router.navigate as jest.Mock).mockClear();
      useSession.getState().clear();
      act(() => {
        studyFor(target, 'cisa', due);
      });
      results[m.key] = opened();
    }
    expect(results['first-foothold']).toBe('session:Diagnostic');
    expect(results['firm-footing:5']).toBe('session:Smart · Info Protection');
    expect(results['whole-map']).toBe('session:Smart · IS Audit'); // the weakest domain (nothing answered yet)
    expect(results['dress-rehearsal']).toBe('/mock-start');
    expect(results['rooted:10']).toBe('/home');
    expect(results['snare-wise']).toBe('/game/trap');
    expect(results['whole-grove']).toBe('/play');
    expect(results['loop-closed']).toBe('/mistakes');
    expect(results['topic-clear']).toBe('/guided');
    expect(results['long-memory']).toBe('session:Review'); // two misses are due
    expect(results['know-what-you-know']).toBe('session:Smart · All domains');
    expect(Object.keys(results)).toHaveLength(26); // every badge but Fresh Start (a moment) and Mindset Shift (gated)
  });
});

// ── 4. The case ──────────────────────────────────────────────────────────
describe('4. the case', () => {
  /** A mix: earned (dated apart), started, open and gated marks. */
  const midLearner = () => {
    answerDomain('4', 25);
    answerDomain('5', 12, 9);
    setMilestones({ days: 15 });
    checkMilestones('cisa');
    setMilestones({
      earned: { ...cp().milestones!.earned, 'rooted:10': T0 - 10 * DAY, 'first-foothold': T0 - 20 * DAY, 'snare-wise': T0 - 5 * DAY },
    });
  };
  const SORT_LABEL = { set: 'By set', recent: 'Recently earned', closest: 'Closest', effort: 'Effort' } as const;
  // The chips are spoken as what they show (UX P9): "All badges", "Earned badges", "Badges not yet earned".
  const FILTER_LABEL: Record<CaseFilter, string> = { all: 'All badges', earned: 'Earned badges', open: 'Badges not yet earned' };

  it.each(CASE_SORTS.flatMap((s) => (['all', 'earned', 'open'] as CaseFilter[]).map((f) => [s, f] as const)))(
    'sort %s × filter %s: exactly the badges that pass, each once, in the sort’s order',
    (sort, filter) => {
      midLearner();
      useSeen.setState({ badgeSort: sort });
      mount(<Badges />);
      press(new RegExp(`^${FILTER_LABEL[filter]}$`));
      expect(labels()).toContain(`Sort badges, ${SORT_LABEL[sort]}`);
      const { marks } = badgeCase('cisa', cp());
      const want = marks.filter((m) => passesFilter(m, filter));
      // A Fresh Start not yet earned may stay off the case (it is a moment, never a goal).
      const must = want.filter((m) => !(m.set === 'moments' && m.status !== 'earned')).map((m) => m.key);
      const shown = root().findAllByType(BadgeCell).map((c) => c.props.mark.key as string);
      expect(new Set(shown).size).toBe(shown.length); // each once
      expect(shown.filter((k) => !want.some((m) => m.key === k))).toEqual([]); // nothing the filter excludes
      expect(must.filter((k) => !shown.includes(k))).toEqual([]); // nothing missing
      if (sort !== 'set') expect(shown).toEqual(sortMarks(want, sort).map((m) => m.key));
      else expect(shown).toEqual(want.map((m) => m.key).filter((k) => shown.includes(k))); // shelf order
      expect(must.length).toBeGreaterThan(0);
    },
  );

  it('flat sorts: recently earned is newest first; closest puts open by progress, gated after, earned last; effort by fewest days', () => {
    midLearner();
    const { marks } = badgeCase('cisa', cp());
    const recent = sortMarks(marks, 'recent');
    expect(recent.slice(0, 3).map((m) => m.key)).toEqual(['firm-footing:4', 'snare-wise', 'rooted:10']);
    // Within the exam's own (counted) badges; Field notes may follow them as a block.
    const study = (list: CaseMark[]) => list.filter((m) => COUNTED_SETS.includes(m.set));
    const closest = study(sortMarks(marks, 'closest'));
    const rank = (m: CaseMark) => (m.status === 'earned' ? 2 : m.status === 'gated' ? 1 : 0);
    expect(closest.map(rank)).toEqual([...closest.map(rank)].sort((a, b) => a - b));
    const open = closest.filter((m) => rank(m) === 0).map((m) => m.progress);
    expect(open).toEqual([...open].sort((a, b) => b - a));
    const effort = study(sortMarks(marks, 'effort')).map((m) => m.minDays);
    expect(effort).toEqual([...effort].sort((a, b) => a - b));
  });

  it('by set, "Not yet" on a complete set says "All earned."; "Earned" on an empty set says "Nothing earned here yet."', () => {
    midLearner();
    setMilestones({ earned: { ...cp().milestones!.earned, 'topic-clear': T0 - 9 * DAY, 'ten-topics': T0 - 8 * DAY } });
    mount(<Badges />);
    press(/^Badges not yet earned$/);
    expect(allText()).toContain('All earned.');
    press(/^Earned badges$/);
    expect(allText()).toContain('Nothing earned here yet.');
  });

  it('detail sheet, not yet: rule, progress, how to earn it, effort, and Study for this', () => {
    midLearner();
    mount(<Badges />);
    press(/^Firm Footing · Info Protection\. Not yet/);
    const sheet = root().findByType(Modal);
    const t = textOf(sheet);
    expect(t).toContain('The rule');
    // 9 of 12 right is already past 70%: what's left is the answers.
    expect(t).toContain('12 of 20 answered · at 70%+');
    expect(t).toContain('How to earn it');
    expect(t).toContain('Info Protection is 26% of the exam.');
    expect(sheet.findAll((n) => n.props.accessibilityLabel === 'Study for Firm Footing · Info Protection' && typeof n.props.onPress === 'function').length).toBeGreaterThan(0);
  });

  it('detail sheet, gated (Mindset Shift): when it opens, no progress bar, no Study button, never a padlock or "?"', () => {
    midLearner();
    mount(<Badges />);
    press(/^Mindset Shift\. Not yet/);
    const sheet = root().findByType(Modal);
    const t = textOf(sheet);
    expect(t).toContain('Opens after 100 first tries spread over 2 weeks or more.');
    expect(t).not.toMatch(/\?|locked|padlock/i);
    expect(sheet.findAll((n) => /^Study for/.test(n.props.accessibilityLabel ?? ''))).toHaveLength(0);
    expect(medallions(sheet)[0].props.state).toBe('gated');
  });

  it('detail sheet, earned: the date and what it means, no How to earn, no Study button', () => {
    midLearner();
    mount(<Badges />);
    press(/^First Foothold\. Earned 22 Sep/);
    const sheet = root().findByType(Modal);
    const t = textOf(sheet);
    expect(t).toContain('Earned 22 Sep');
    expect(t).toContain('You’ve mapped where you stand.');
    expect(t).not.toContain('How to earn it');
    expect(sheet.findAll((n) => /^Study for/.test(n.props.accessibilityLabel ?? ''))).toHaveLength(0);
  });

  it('the Rooted ladder: three tiers in shape and words, the earned one dated, progress on the rest', () => {
    midLearner();
    mount(<Badges />);
    press(/^Rooted · 30 days, Lichen\. Not yet/);
    const sheet = root().findByType(BadgeSheet);
    expect(sheet.props.ladder.map((m: CaseMark) => m.key)).toEqual(['rooted:10', 'rooted:30', 'rooted:60']);
    const spoken = labels().find((l) => l.startsWith('10 days, Clay: '))!;
    expect(spoken).toContain('10 days, Clay: earned 2 Oct');
    expect(spoken).toContain('30 days, Lichen: 15 of 30 study days');
    expect(spoken).toContain('60 days, Gold leaf: 15 of 60 study days');
    expect(textOf(sheet)).toContain('Lichen, tier 2 of 3');
    expect(textOf(sheet)).toMatch(/30 days\s+· next/);
  });

  // Fixed in review; was a bug (Minor, copy): the ladder tags the tier you OPENED as "next", not the
  // next tier to earn. Opening Rooted · 60 days with only 10 days earned says
  // "60 days · next" while 30 days is the real next step.
  it('the ladder marks the real next tier, whichever tier was opened', () => {
    midLearner();
    mount(<Badges />);
    press(/^Rooted · 60 days, Gold leaf\. Not yet/);
    const t = textOf(root().findByType(BadgeSheet));
    expect(t).toMatch(/30 days\s+· next/);
    expect(t).not.toMatch(/60 days\s+· next/);
  });

  it('in the final three weeks the case opens at Exam Day (by set); not before, and not in a flat sort', () => {
    const spy = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
    const openAt = () => {
      mount(<Badges />);
      // The shelf's OUTER view reports its place in the scroll content (code review B1: the
      // header's own y was relative to that view, so the jump always landed at the top).
      const shelf = root().findAll((n) => n.props.testID === 'shelf-examDay' && typeof n.props.onLayout === 'function')[0];
      if (shelf) {
        act(() => {
          shelf.props.onLayout({ nativeEvent: { layout: { x: 0, y: 1400, width: 353, height: 300 } } });
        });
      }
      const calls = spy.mock.calls.map((c) => c[0]);
      spy.mockClear();
      unmount();
      return calls;
    };
    examIn(15);
    expect(openAt()).toEqual([{ y: 1400 - space.lg, animated: false }]);
    examIn(40);
    expect(openAt()).toEqual([]);
    examIn(15);
    useSeen.getState().setBadgeSort('closest');
    expect(openAt()).toEqual([]);
    spy.mockRestore();
  });

  it('after the exam (album mode): no Next panel, no progress lines in cells, rows or the sheet', () => {
    midLearner();
    useSettings.setState({ examDates: { cisa: dayKey(T0 - 2 * DAY) } });
    mount(<Badges />);
    expect(allText()).not.toContain('Next for your exam');
    for (const c of root().findAllByType(BadgeCell)) expect(c.props.showProgress).toBe(false);
    expect(allText()).not.toMatch(/\d+ of \d+ (answered|study days)/);
    press(/^Firm Footing · Info Protection\. Not yet/);
    const sheet = root().findByType(Modal);
    expect(textOf(sheet)).not.toContain('12 of 20 answered');
    expect(medallions(sheet)[0].props.progress).toBe(0);
  });

  // Fixed in review; was a bug (Minor): in album mode the cells still draw each started badge's
  // progress arc on its rim (BadgeCell passes medallionProps' progress
  // whatever showProgress says). The spec hides all progress after the exam.
  it('after the exam, no medallion in the grid draws a progress arc', () => {
    midLearner();
    useSettings.setState({ examDates: { cisa: dayKey(T0 - 2 * DAY) } });
    mount(<Badges />);
    const arcs = root()
      .findAllByType(BadgeCell)
      .flatMap((c) => medallions(c))
      .filter((m) => (m.props.progress ?? 0) > 0);
    expect(arcs.map((m) => m.props.badge)).toEqual([]);
  });
});

// ── 5. Show badges ───────────────────────────────────────────────────────
describe('5. Settings → Show badges', () => {
  const toggle = () => root().findAll((n) => typeof n.props.onValueChange === 'function' && n.props.accessibilityLabel === 'Show badges')[0];

  it('off: no moment on Results or a game round end, no row, no dot, no Field notes link; badges are still earned', () => {
    ensureBackfill('cisa', T0 - DAY);
    initCaseSeen('cisa', T0 - DAY);
    mount(<Settings />);
    act(() => {
    toggle().props.onValueChange(false);
  });
    unmount();
    // A session that earns two badges.
    const list = ids('4', 0, 20);
    startFromIds('cisa', list, 'Twenty');
    list.forEach((id) => answer(id));
    act(() => {
      finishSession();
    });
    expect(Object.keys(cp().milestones!.earned).sort()).toEqual(['firm-footing:4', 'first-foothold']);
    mount(<Results />);
    expect(allText()).not.toMatch(/A new badge|New in your badges|Next: /);
    unmount();
    // A game round that earns a skill badge.
    const news = finishGameRound('cisa', 'daylight', { score: 6, rate: 0.6, tier: 'sapling', counts: { paceRounds: 3 } });
    expect(cp().milestones!.earned['sure-footed-pace']).toBeDefined();
    expect(news.moment).toBeNull();
    // No row, no dot (the badges ARE new since the case was last seen).
    jest.setSystemTime(T0 + 60_000);
    expect(hasNewBadge('cisa')).toBe(false);
    mount(<You />);
    expect(labels().some((l) => l.startsWith('Badges'))).toBe(false);
    expect(root().findAll((n) => n.props.testID === 'new-badge-dot')).toHaveLength(0);
    unmount();
    mount(<TabsLayout />);
    expect(root().findAll((n) => n.props.testID === 'you-new-dot')).toHaveLength(0);
    unmount();
    mount(<FieldNotes />);
    expect(allText()).not.toContain('Your skill badges');
  });

  it('on again: ONE summary line, and no burst of moments in the sessions after', () => {
    ensureBackfill('cisa', T0 - DAY);
    initCaseSeen('cisa', T0 - DAY);
    mount(<Settings />);
    act(() => {
    toggle().props.onValueChange(false);
  });
    unmount();
    const list = ids('4', 0, 20);
    startFromIds('cisa', list, 'Twenty');
    list.forEach((id) => answer(id));
    act(() => {
      finishSession();
    });
    useSession.getState().clear();
    mount(<Settings />);
    act(() => {
    toggle().props.onValueChange(true);
  });
    const lines = allText().match(/Badges are on again\.[^.]*\./g) ?? [];
    expect(lines).toEqual(['Badges are on again. 2 badges arrived while they were hidden: see You → Badges.']);
    unmount();
    // The next session earns nothing new: its Results show no moment for the two that waited.
    const more = ids('4', 20, 5);
    startFromIds('cisa', more, 'Five');
    more.forEach((id) => answer(id));
    act(() => {
      finishSession();
    });
    expect(useSession.getState().active?.milestone).toBeUndefined();
    // And the row is back, with its dot (two badges arrived since the case was last opened).
    jest.setSystemTime(T0 + 60_000);
    mount(<You />);
    expect(labels().some((l) => l.startsWith('Badges, new badge, 2 earned.'))).toBe(true);
  });

  it('the choice travels in a backup; an older backup (no such field) keeps this phone’s choice', async () => {
    answerDomain('4', 20);
    useSettings.setState({ badgesHidden: true });
    const file = currentBackup(T0);
    expect((file.stores.settings.state as { badgesHidden?: boolean }).badgesHidden).toBe(true);
    // Restored onto a phone that shows badges: the file's "hidden" wins.
    useSettings.setState({ badgesHidden: false });
    const read = checkBackupText(JSON.stringify(file));
    if (read.kind !== 'ok') throw new Error(read.code);
    await act(async () => {
      await restoreBackup(read.data, T0);
    });
    expect(useSettings.getState().badgesHidden).toBe(true);
    // An older file has no field: this phone's "shown" stays.
    useSettings.setState({ badgesHidden: false });
    const older = currentBackup(T0);
    delete (older.stores.settings.state as { badgesHidden?: boolean }).badgesHidden;
    const read2 = checkBackupText(JSON.stringify(older));
    if (read2.kind !== 'ok') throw new Error(read2.code);
    await act(async () => {
      await restoreBackup(read2.data, T0);
    });
    expect(useSettings.getState().badgesHidden).toBe(false);
  });

  it('showBadgesAgain with nothing waiting says just "Badges are on again."', () => {
    useSettings.setState({ badgesHidden: true });
    expect(showBadgesAgain()).toBe(0);
  });
});

// ── 6. Restore validation ────────────────────────────────────────────────
describe('6. restore validation: edited backups', () => {
  /** A genuine learner: 45 IS Operations answers, 2 full mocks, 30 long recalls, 60 study days. */
  const genuine = () => {
    answerDomain('4', 45);
    for (const d of ['1', '2', '3', '5']) answerDomain(d, 20);
    addMocks(fullMock('m1', T0 - 20 * DAY), fullMock('m2', T0 - 5 * DAY));
    setMilestones({ days: 60, counts: { longRecall: 30 } });
    act(() => {
      checkMilestones('cisa');
    });
  };
  /** The phone's backup, with the cert's milestones edited, read and restored. */
  const restoreEdited = async (edit: (m: Record<string, unknown> & { earned: Record<string, number> }) => void) => {
    const file = currentBackup(T0);
    const state = file.stores.progress.state as unknown as { byCert: Record<string, { milestones: Record<string, unknown> & { earned: Record<string, number> } }> };
    edit(state.byCert.cisa.milestones);
    const read = checkBackupText(JSON.stringify(file));
    if (read.kind !== 'ok') throw new Error(read.code);
    await act(async () => {
      await restoreBackup(read.data, T0);
    });
    return cp().milestones!;
  };

  it('claims on lower-tier evidence are dropped: long-memory:75, dress-rehearsal:3, firm-footing:5:80; genuine marks stay', async () => {
    genuine();
    const before = { ...cp().milestones!.earned };
    expect(before['long-memory']).toBeDefined();
    expect(before['dress-rehearsal']).toBeDefined();
    const m = await restoreEdited((x) => {
      x.earned['long-memory:75'] = T0 - DAY; // 30 recalls, not 75
      x.earned['dress-rehearsal:3'] = T0 - DAY; // 2 mocks, not 3
      x.earned['firm-footing:5:80'] = T0 - DAY; // 20 Info Protection answers, not 40
      x.earned['long-memory:999'] = T0 - DAY; // no such tier
      x.earned['rooted:90'] = T0 - DAY;
    });
    expect(m.earned).toEqual(before);
  });

  it('dress-rehearsal:2 on a single mock is dropped', async () => {
    answerDomain('4', 25);
    addMocks(fullMock('m1', T0 - DAY));
    act(() => {
      checkMilestones('cisa');
    });
    const m = await restoreEdited((x) => {
      x.earned['dress-rehearsal:2'] = T0 - DAY;
    });
    expect(m.earned['dress-rehearsal:2']).toBeUndefined();
    expect(m.earned['dress-rehearsal']).toBeDefined();
  });

  it('genuine higher tiers (from a later version) are kept when the data shows them', async () => {
    genuine();
    setMilestones({ counts: { longRecall: 80 } });
    const m = await restoreEdited((x) => {
      x.earned['long-memory:75'] = T0 - DAY;
      x.earned['dress-rehearsal:2'] = T0 - DAY;
      x.earned['firm-footing:4:80'] = T0 - DAY;
    });
    expect(m.earned['long-memory:75']).toBe(T0 - DAY);
    expect(m.earned['dress-rehearsal:2']).toBe(T0 - DAY);
    expect(m.earned['firm-footing:4:80']).toBe(T0 - DAY);
  });

  it('fake planters are refused; a genuine one is kept', async () => {
    genuine();
    // Genuine: every domain at Firm Footing plus Whole Map (earned in genuine()), and all three Rooted tiers.
    expect(cp().milestones!.planters?.domains).toBe(T0);
    setMilestones({ earned: { ...cp().milestones!.earned, 'rooted:10': T0 - 50 * DAY, 'rooted:30': T0 - 30 * DAY, 'rooted:60': T0 - DAY }, planters: { ...cp().milestones!.planters, rooted: T0 - DAY } });
    const m = await restoreEdited((x) => {
      x.planters = { ...(x.planters as object), groundwork: T0, evergreen: T0, moments: T0, fieldNotes: T0, gold: T0 };
    });
    expect(m.planters).toEqual({ domains: T0, rooted: T0 - DAY });
  });

  it('a planter whose badges an edit made up is dropped with them', async () => {
    answerDomain('4', 25);
    act(() => {
      checkMilestones('cisa');
    });
    const m = await restoreEdited((x) => {
      Object.assign(x.earned, { 'rooted:10': T0, 'rooted:30': T0, 'rooted:60': T0 });
      x.planters = { rooted: T0 };
    });
    expect(m.earned['rooted:60']).toBeUndefined();
    expect(m.planters ?? {}).toEqual({});
  });

  // Fixed in review; was a bug (Minor): the Five Domains planter is checked against "Firm Footing in
  // every domain the ANSWERS cover", not every domain of the exam. An edited
  // backup with 20 answers in ONE domain can claim Whole Map (whose own check
  // is only 20 answers), that domain's Firm Footing, and the planter.
  it('the Five Domains planter needs Firm Footing in every exam domain, not just the domains answered', async () => {
    answerDomain('4', 25);
    act(() => {
      checkMilestones('cisa');
    });
    const m = await restoreEdited((x) => {
      x.earned['whole-map'] = T0;
      x.planters = { domains: T0 };
    });
    expect(m.planters?.domains).toBeUndefined();
  });

  // Fixed in review; was a bug (Minor): Dress Rehearsal · 2 is checked as "2 mock records", but the
  // rule needs 2 FULL, timed, fully answered mocks 7+ days apart (after Whole
  // Map). Two 10-question minis on the same day pass. The mock records hold
  // total, timing, unanswered and finishedAt, so the check could read them.
  it('dress-rehearsal:2 needs two full mocks a week apart, not any two mock records', async () => {
    answerDomain('4', 25);
    const mini = (id: string): MockResult => ({ ...fullMock(id, T0 - DAY), total: 10, minutesAllowed: 16 });
    addMocks(mini('a'), mini('b'));
    const m = await restoreEdited((x) => {
      x.earned['dress-rehearsal:2'] = T0;
    });
    expect(m.earned['dress-rehearsal:2']).toBeUndefined();
  });
});

// ── 7. Reset ─────────────────────────────────────────────────────────────
describe('7. reset', () => {
  it('clears the cert’s badges and planters, never re-awards them from older data, and the next badge is new again', () => {
    answerDomain('4', 25);
    setMilestones({ days: 60, earned: { 'rooted:10': T0 - 50 * DAY, 'rooted:30': T0 - 30 * DAY } });
    act(() => {
      checkMilestones('cisa');
    });
    expect(cp().milestones!.planters?.rooted).toBeDefined();
    initCaseSeen('cisa', T0);
    useSeen.getState().setBadgeSort('effort');
    act(() => {
    useProgress.getState().resetCert('cisa');
  });
    const m = cp().milestones!;
    expect(m.earned).toEqual({});
    expect(m.planters).toBeUndefined();
    expect(ensureBackfill('cisa', T0)).toBeNull(); // the launch back-fill never runs again
    expect(checkMilestones('cisa')).toEqual([]);
    const { sets } = badgeCase('cisa', cp());
    expect(sets.every((s) => s.earned === 0)).toBe(true);
    expect(hasNewBadge('cisa')).toBe(false);
    mount(<You />);
    expect(labels().some((l) => l.startsWith('Badges, none yet.'))).toBe(true);
    unmount();
    // The phone's own choices (the Sort) stay; a new badge after the reset is new.
    expect(useSeen.getState().badgeSort).toBe('effort');
    jest.setSystemTime(T0 + 60_000);
    answerDomain('4', 20);
    act(() => {
      checkMilestones('cisa');
    });
    expect(hasNewBadge('cisa')).toBe(true);
  });

  it('the reset warning names badges', () => {
    mount(<Settings />);
    expect(readFileSync(join(__dirname, '..', 'app', 'settings.tsx'), 'utf8')).toContain('mock history, badges and game levels');
  });
});

// ── 8. Regressions ───────────────────────────────────────────────────────
describe('8. regressions', () => {
  it('Field notes still lists every game’s level, and links to the skill badges with the same count as the case', () => {
    finishGameRound('cisa', 'daylight', { score: 6, rate: 0.6, tier: 'sapling', counts: { paceRounds: 3 } });
    mount(<FieldNotes />);
    const t = allText();
    expect(t).toContain('Game levels');
    for (const name of ['Sapling', 'Seedling']) expect(t.includes(name) || t.includes('Heartwood')).toBe(true);
    const shelf = badgeCase('cisa', cp()).sets.find((s) => s.info.id === 'fieldNotes')!;
    expect(t).toContain(`${shelf.earned} of ${shelf.total} earned, in your badges`);
    press(/^Your skill badges/);
    // It opens the case at the Field notes shelf (UX P11).
    expect(router.push).toHaveBeenCalledWith({ pathname: '/milestones', params: { shelf: 'fieldNotes' } });
  });

  it('/milestones is still a route, registered in the stack, and it opens the badge case', () => {
    expect(existsSync(join(__dirname, '..', 'app', 'milestones.tsx'))).toBe(true);
    expect(readFileSync(join(__dirname, '..', 'app', '_layout.tsx'), 'utf8')).toMatch(/<Stack\.Screen name="milestones"/);
    mount(<Badges />);
    expect(allText()).toMatch(/^Badges /);
    expect(allText()).toContain('Earned by what you’ve mastered.');
  });

  it('every link to the badges in the app uses /milestones (nothing points at a /badges route that does not exist)', () => {
    const files = ['(tabs)/you.tsx', 'results.tsx', 'field-notes.tsx'].map((f) => readFileSync(join(__dirname, '..', 'app', f), 'utf8'));
    files.push(readFileSync(join(__dirname, '..', 'components', 'game.tsx'), 'utf8'));
    for (const src of files) expect(src).not.toMatch(/['"]\/badges['"]/);
    expect(files.join('\n').match(/'\/milestones'/g)!.length).toBeGreaterThanOrEqual(4);
  });
});
