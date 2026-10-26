/**
 * QA for PR #48 (mobile 1.16.1, "Faster tab switching"). A performance
 * refactor that must change NO behaviour.
 *
 * What changed under the tabs: readiness and the due-review count are now
 * shared caches (engine/readiness.ts readinessFor, engine/srs.ts dueCountFor),
 * Learn / Play / You render memoised parts from narrow store selectors,
 * Today keeps its clock unless the day (or a timed mock) changes,
 * checkPlant skips when the progress object and the day are the same, and
 * the persist adapter (store/storage.ts) skips a save whose top-level fields
 * are all the very same objects as the last save.
 *
 * The oracle: the five tabs stay mounted side by side (like the navigator),
 * and after every real change each long-lived tab must show EXACTLY what a
 * freshly mounted copy of the same tab shows (every text and every
 * screen-reader label, in order). A stale memo, a stale cache or a missed
 * subscription shows up as a difference. Because the fresh copy reads the
 * same caches, the key numbers are ALSO checked against the engine computed
 * from scratch (computeReadiness, dueIds), never through the caches.
 *
 * Bugs: one Minor, found here and fixed in the PR (a no-op save made while
 * a real write was still in flight was skipped, so a failed write was only
 * healed by the save after it); its test now pins the fix. Everything else
 * matched main: the freshness tests here pass on origin/main as well.
 *
 * Gotcha: never `act(() => store.action())` — use braces.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import { type ComponentType } from 'react';
import { AppState, View } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FocusEmitter, FocusScope, routeParams } from '../../jest/perf/focusRouter';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import { CERTIFICATIONS, getCertification } from '../content/certifications';
import { lessonsFor } from '../content/lessons';
import { domainFigure } from '../engine/domainBand';
import { daysToExam } from '../engine/examDay';
import { grewLabel } from '../engine/plant';
import { computeReadiness } from '../engine/readiness';
import { readinessRange } from '../engine/readinessRange';
import { dueIds } from '../engine/srs';
import { dayKey } from '../engine/streak';
import { caseEarnedCount } from '../engine/badgeCatalog';
import { hasNewBadge, initCaseSeen, useNewBadge } from '../lib/badges';
import { checkBackupText, currentBackup, restoreBackup } from '../lib/backup';
import { finishSession } from '../lib/finishSession';
import { checkMilestones } from '../lib/milestones';
import { questionExists } from '../lib/outline';
import { checkPlant, plantFor } from '../lib/plant';
import { startMock, startPractice } from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { persistStorage, resetSavedForTest } from '../store/storage';

jest.mock('expo-router', () => require('../../jest/perf/focusRouter').routerMock());
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => {
  const { View: V } = jest.requireActual('react-native');
  return { SafeAreaView: V, SafeAreaProvider: V, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, { get: (t, k: string) => (k in t ? t[k] : Icon) });
});
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null, BadgeShareCard: () => null }));
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {}, medium: () => {} } }));
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

// ── Clock and AppState ────────────────────────────────────────────────────
// Only Date is faked (timers stay real, so act() and the motion mocks behave).
const DAY = 86_400_000;
// A Tuesday, mid-morning local time: a whole day ahead before midnight.
const T0 = new Date(2026, 9, 13, 10, 0, 0).getTime();
let clock = T0;
function setClock(t: number) {
  clock = t;
  jest.setSystemTime(t);
}
const appListeners = new Set<(s: string) => void>();
/** The app comes back to the foreground (useActiveCert and useJourney refresh their clocks). */
function foreground() {
  act(() => {
    for (const l of [...appListeners]) l('active');
  });
}

// ── The tab host: all five tabs mounted side by side ──────────────────────
const TABS = ['home', 'learn', 'practice', 'play', 'you'] as const;
type Tab = (typeof TABS)[number];
const SCREENS: Record<Tab, () => ComponentType> = {
  home: () => require('../app/(tabs)/home').default,
  learn: () => require('../app/(tabs)/learn').default,
  practice: () => require('../app/(tabs)/practice').default,
  play: () => require('../app/(tabs)/play').default,
  you: () => require('../app/(tabs)/you').default,
};
const emitters = Object.fromEntries(TABS.map((t) => [t, new FocusEmitter(false)])) as Record<Tab, FocusEmitter>;
let r: ReactTestRenderer | undefined;
let current: Tab | null = null;

function mountAll() {
  act(() => {
    r = create(
      <View>
        {TABS.map((t) => {
          const S = SCREENS[t]();
          return (
            <FocusScope key={t} emitter={emitters[t]}>
              <View testID={`tab-${t}`}>
                <S />
              </View>
            </FocusScope>
          );
        })}
      </View>,
    );
  });
  // Visit every tab once (the navigator's lazy first visits), ending on Today.
  for (const t of TABS) tap(t);
  tap('home');
}

/** A tab press: the navigation state (focus context) changes, then the focus / blur events fire. */
function tap(t: Tab) {
  act(() => {
    if (current && current !== t) emitters[current].setContext(false);
    emitters[t].setContext(true);
  });
  act(() => {
    if (current && current !== t) emitters[current].fireEvents();
    emitters[t].fireEvents();
  });
  current = t;
}
/** A screen pushed over the tabs (a session, Results): the current tab blurs. */
function pushOver() {
  if (!current) return;
  act(() => emitters[current!].set(false));
  current = null;
}

/** Every text and host screen-reader label under a node, in order. */
function collect(node: ReactTestInstance, out: string[] = []): string[] {
  for (const ch of node.children) {
    if (typeof ch === 'string') out.push(ch);
    else {
      if (typeof ch.type === 'string' && typeof ch.props.accessibilityLabel === 'string') out.push(`[${ch.props.accessibilityLabel}]`);
      if (typeof ch.type === 'string' && ch.props.testID === 'you-new-dot') out.push('<you-new-dot>');
      collect(ch, out);
    }
  }
  return out;
}
const textOf = (t: Tab) => collect(r!.root.findByProps({ testID: `tab-${t}` }));
const joined = (t: Tab) => textOf(t).join(' | ');

/** The same tab, mounted fresh and focused in its own tree: the oracle. */
function freshText(t: Tab): string[] {
  const em = new FocusEmitter(true);
  const S = SCREENS[t]();
  let fr: ReactTestRenderer | undefined;
  act(() => {
    fr = create(
      <FocusScope emitter={em}>
        <View testID="fresh">
          <S />
        </View>
      </FocusScope>,
    );
  });
  const out = collect(fr!.root.findByProps({ testID: 'fresh' }));
  act(() => fr!.unmount());
  return out;
}

/**
 * Today's "Your plant grew" line is shown for ONE visit (by design: the
 * pending mark is cleared as it shows), so a fresh mount after that visit
 * never has it. It is left out of the comparison; the plant tests below
 * check it on its own.
 */
const GREW_BLOCK = /^(\[Your plant grew\. .*\]|Your plant grew|.* grew to .*\.|\[What grows it next\]|What grows it next)$/;
const comparable = (t: Tab, xs: string[]) => (t === 'home' ? xs.filter((x) => !GREW_BLOCK.test(x)) : xs);

/**
 * "Since you last looked" (useGrowth): the FIRST view after a change shows
 * what went up (+50 on a ring) and marks it seen, so a fresh mount right
 * after never has it. On that first view those deltas are left out; on a
 * second view (away and back) the tab must match the fresh mount exactly.
 */
const sinceLast = (xs: string[]) =>
  // Mobile 1.24: You says "Since you last looked: IS Operations +4 · …" once under the rings (no "+N" on each row).
  xs.filter((x) => !/^\+\d+$/.test(x) && !/^Since you last looked: /.test(x)).map((x) => x.replace(/ Since you last looked: [^\]]*?\.(?=\]$)/, ''));

/** Each tab, opened from the tab bar, shows what a fresh mount shows (first view and second view). */
function expectTabsFresh(tabs: readonly Tab[] = TABS) {
  for (const t of tabs) {
    tap(t);
    const first = sinceLast(comparable(t, textOf(t)));
    expect({ tab: t, view: 1, text: first }).toEqual({ tab: t, view: 1, text: sinceLast(comparable(t, freshText(t))) });
    tap(t === 'play' ? 'learn' : 'play');
    tap(t);
    expect({ tab: t, view: 2, text: comparable(t, textOf(t)) }).toEqual({ tab: t, view: 2, text: comparable(t, freshText(t)) });
  }
}

// ── Study helpers (the same store calls as the session screen) ──────────
const cert = getCertification('cisa')!;
const cp = () => selectCert(useProgress.getState(), 'cisa');
/** A practice session of `n` questions (`right(i)` decides each answer), then finished (Results on top). */
function studySession(n: number, right: (i: number) => boolean = (i) => i % 2 === 0, certId = 'cisa') {
  pushOver();
  setClock(clock + 60_000);
  act(() => {
    startPractice(certId, { count: n });
  });
  const s = useSession.getState().active!;
  act(() => {
    s.questionIds.forEach((id, i) => {
      const ok = right(i);
      useSession.getState().answer(id, { display: 'A', correct: ok, confidence: 'sure', ms: 30_000 });
      useProgress.getState().recordAnswer(certId, id, ok, 'sure', { ms: 30_000 });
      if (!ok) useProgress.getState().recordMistake(certId, id, 'A', 'sure');
    });
  });
  act(() => {
    finishSession();
  });
  act(() => {
    useSession.getState().clear();
  });
  return s.questionIds;
}
/** A mini mock (50), every answer right for the first `right` questions, submitted. */
function mockExam(right: number, total = 50) {
  pushOver();
  setClock(clock + 60_000);
  act(() => {
    startMock('cisa', total, { timing: 'standard' });
  });
  const s = useSession.getState().active!;
  act(() => {
    s.questionIds.forEach((id, i) => useSession.getState().answer(id, { display: 'A', correct: i < right, ms: 60_000 }));
  });
  act(() => {
    finishSession();
  });
  act(() => {
    useSession.getState().clear();
  });
}
/** Independent of the PR's caches: the engine, computed from scratch. */
const engineDue = () => dueIds(cp().review, Date.now(), questionExists('cisa')).length;
/** The review row's spoken start: "N due." or, with nothing due yet (mobile 1.43: fresh misses wait for tomorrow), "all caught up". */
const revisitLabel = (due: number) => (due > 0 ? `[Questions to revisit, ${due} due.` : '[Questions to revisit, all caught up');
const engineRange = () => readinessRange(cert, computeReadiness(cert, cp().answers));

// ── Saves (AsyncStorage writes per key) ──────────────────────────────────
const writes: Record<string, number> = {};
const writeCount = (key: string) => writes[key] ?? 0;
function countWrites() {
  for (const k of Object.keys(writes)) delete writes[k];
}

beforeAll(() => {
  jest.useFakeTimers({
    now: T0,
    doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'performance', 'hrtime'],
  });
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_type: string, fn: (s: string) => void) => {
    appListeners.add(fn);
    return { remove: () => appListeners.delete(fn) };
  }) as never);
  const AS = AsyncStorage as unknown as { setItem: (k: string, v: string) => Promise<void> };
  const real = AS.setItem.bind(AS);
  AS.setItem = (k: string, v: string) => {
    writes[k] = (writes[k] ?? 0) + 1;
    return real(k, v);
  };
});
afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  setClock(T0);
  setMockReducedMotion(true);
  for (const k of Object.keys(routeParams)) delete routeParams[k];
  act(() => {
    useSession.getState().clear();
    useSeen.setState({ values: {}, moments: {}, days: {}, badgeMoments: [], caseSeen: {}, quietGrowth: {} } as never);
    useProgress.setState(useProgress.getInitialState(), true);
    // Whole initial states: the clock moves back between tests, so nothing dated may carry over.
    useSettings.setState({ ...useSettings.getInitialState(), activeCertId: 'cisa', onboarded: true, examDates: { cisa: '2027-06-01' } }, true);
  });
  // The launch back-fill and badge-case clock (app/_layout.tsx runs them): badges from here on are earned live.
  act(() => {
    checkMilestones('cisa', { now: T0 });
    initCaseSeen('cisa', T0);
    plantFor('cisa', 'oak', 'Kai', T0);
  });
  countWrites();
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
  for (const t of TABS) emitters[t].set(false);
  current = null;
});

// ══════════════════════════════════════════════════════════════════════════
describe('answering, then switching tabs: every tab shows fresh numbers', () => {
  it('a practice session: Today plan + readiness, due reviews, You lists and rings, Learn, Practice', () => {
    mountAll();
    const before = Object.fromEntries(TABS.map((t) => [t, joined(t)]));
    // Enough answers for a readiness range (40+), spread over every domain.
    studySession(30);
    studySession(30, (i) => i % 3 !== 0);
    expectTabsFresh();

    // The numbers moved (the oracle is not comparing two empty screens)...
    expect(joined('you')).not.toBe(before.you);
    expect(joined('practice')).not.toBe(before.practice);
    // ...and match the engine computed from scratch.
    const due = engineDue();
    // Mobile 1.43: the misses are in review, due from the start of tomorrow (none due this minute).
    expect(Object.keys(cp().review).length).toBeGreaterThan(0);
    expect(joined('practice')).toContain(revisitLabel(due));
    expect(joined('you')).toContain(revisitLabel(due));
    const range = engineRange();
    expect(range.enough).toBe(true);
    if (range.enough) {
      // Today says it in its clearing ("Readiness grew to 45–61%", a word joiner inside); You in its rings label.
      expect(joined('home').replace(/\u2060/g, '')).toContain(`${range.low}–${range.high}`);
      expect(joined('you')).toContain(`[Estimated readiness between ${range.low} and ${range.high} percent.`);
    }
    const answered = Object.keys(cp().answers).length;
    expect(joined('you')).toContain(`[Answered: ${answered}]`);
    // Rings: each domain's mastery, spoken.
    const rd = computeReadiness(cert, cp().answers);
    for (const d of rd.domains) {
      const short = cert.domains.find((x) => x.id === d.domainId)!.short;
      // Mobile 1.24: a word below 30 answers in the domain, the number (with "latest tries") from 30.
      expect(joined('you')).toContain(`${short} ${domainFigure(d.answered, Math.round(d.mastery * 100)).spoken}`);
    }
    // Learn's "Up next" follows the focus domain.
    const focus = cert.domains.find((d) => d.id === rd.focusDomainId)!;
    expect(joined('learn')).toContain(`Up next · ${focus.short}`);
    // Today's plan: the session ticked it.
    const plan = useProgress.getState().days.cisa;
    const doneN = plan.done.filter(Boolean).length;
    // Mobile 1.23: the checklist's progress is said once, at the end of the plan caption's spoken label.
    expect(joined('home')).toMatch(new RegExp(`(, |\\[)${doneN} of ${plan.items.length} done\\]`));
  });

  it('answers recorded while a tab is ON VIEW (no switch) update it in place', () => {
    mountAll();
    tap('you');
    act(() => {
      for (let i = 1; i <= 6; i++) {
        const id = `d4_${String(i).padStart(3, '0')}`;
        useProgress.getState().recordAnswer('cisa', id, false, 'sure');
        useProgress.getState().recordMistake('cisa', id, 'A', 'sure');
      }
    });
    expect(textOf('you')).toEqual(freshText('you'));
    expect(joined('you')).toContain(revisitLabel(engineDue()));
    expect(joined('you')).toContain('[Mistake journal, 6 open]');
    // A hidden tab (never switched to) is fresh too, the moment it is opened.
    expectTabsFresh(['practice', 'learn', 'home']);
  });

  it('a question already right, answered right again (Learn and Play stay still) still leaves every tab fresh', () => {
    studySession(12, () => true);
    mountAll();
    act(() => {
      useProgress.getState().recordAnswer('cisa', Object.keys(cp().answers)[0], true, 'sure');
    });
    expectTabsFresh();
  });

  it('a lesson finished and a game played reach Learn and Play (their narrow selectors)', () => {
    mountAll();
    tap('learn');
    const lesson = require('../content/lessons').lessonsFor('cisa')[0];
    act(() => {
      useProgress.getState().completeLesson('cisa', lesson.id);
      useProgress.getState().recordGame('cisa', 'trap', 7);
    });
    expect(joined('learn')).toContain(`1 of ${lessonsFor('cisa').length} done`); // the course total, never a hard-coded count
    expectTabsFresh(['learn', 'play']);
  });

  it('a review falling due later (the shared count’s time cache) shows once the clock passes it', () => {
    // Eight misses, all due now; then two of them reviewed right and sure (promoted: due later).
    const ids = studySession(8, () => false);
    act(() => {
      useProgress.getState().recordAnswer('cisa', ids[0], true, 'sure');
      useProgress.getState().recordAnswer('cisa', ids[1], true, 'sure');
    });
    mountAll();
    const dueNow = engineDue();
    expect(joined('practice')).toContain(revisitLabel(dueNow));
    const later = Math.min(...Object.values(cp().review).map((e) => e.dueAt).filter((d) => d > Date.now()));
    expect(Number.isFinite(later)).toBe(true);
    // The app comes back just after the next review fell due.
    setClock(later + 1000);
    foreground();
    expect(engineDue()).toBeGreaterThan(dueNow);
    expect(joined('practice')).toContain(revisitLabel(engineDue()));
    expect(joined('you')).toContain(revisitLabel(engineDue()));
    expectTabsFresh(['practice', 'you', 'home']);
  });
});

// ══════════════════════════════════════════════════════════════════════════
describe('midnight rollover', () => {
  it('Today builds the new day’s plan; the other tabs follow the new day', () => {
    studySession(20);
    mountAll();
    const dayBefore = useProgress.getState().days.cisa.day;
    expect(dayBefore).toBe(dayKey(T0));
    // The phone sat overnight with Today open; the app comes back the next morning.
    setClock(T0 + DAY);
    foreground();
    tap('practice');
    tap('home');
    expect(useProgress.getState().days.cisa.day).toBe(dayKey(T0 + DAY));
    const plan = useProgress.getState().days.cisa;
    expect(plan.done.every((d) => !d)).toBe(true);
    expect(joined('home')).toContain(`, 0 of ${plan.items.length} done]`);
    // The countdown moved by one day too.
    expect(joined('home')).toContain(`${daysToExam('2027-06-01', dayKey(T0 + DAY))} days to CISA`);
    expectTabsFresh();
  });

  it('checkPlant: skipped for the same progress on the same day, run again on a new day', () => {
    studySession(20, () => true);
    const real = useProgress.getState().updatePlant;
    let calls = 0;
    useProgress.setState({ updatePlant: (...a: Parameters<typeof real>) => (calls++, real(...a)) } as never);
    try {
      checkPlant('cisa', T0);
      calls = 0;
      expect(checkPlant('cisa', T0 + 60_000)).toBeNull();
      expect(calls).toBe(0);
      checkPlant('cisa', T0 + DAY);
      expect(calls).toBe(1);
      // A real change of progress the same day: checked again.
      act(() => {
        useProgress.getState().recordAnswer('cisa', 'd5_001', true, 'sure');
      });
      checkPlant('cisa', T0 + DAY + 1000);
      expect(calls).toBe(2);
    } finally {
      useProgress.setState({ updatePlant: real } as never);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
describe('switching certification', () => {
  it('every tab shows the other exam, then CISA again, with no number carried over', () => {
    studySession(30);
    mockExam(30);
    mountAll();
    const cisaText = Object.fromEntries(TABS.map((t) => [t, joined(t)]));
    const other = CERTIFICATIONS.find((c) => c.id !== 'cisa')!;
    act(() => {
      useSettings.setState({ activeCertId: other.id });
    });
    expectTabsFresh();
    expect(joined('you')).toContain('No mocks yet');
    expect(joined('you')).toContain('[Answered: 0]');
    act(() => {
      useSettings.setState({ activeCertId: 'cisa' });
    });
    expectTabsFresh();
    // Back on CISA: the same numbers as before the round trip (Today's fit card aside, all tabs).
    for (const t of ['learn', 'practice', 'play', 'you'] as const) expect(joined(t)).toBe(cisaText[t]);
  });
});

// ══════════════════════════════════════════════════════════════════════════
describe('backup restore', () => {
  it('restoring an older backup: every tab shows the restored data, and it is on the phone', async () => {
    studySession(12, () => false);
    const file = currentBackup(T0);
    const answeredThen = Object.keys(cp().answers).length;
    studySession(40);
    mockExam(40);
    mountAll();
    expect(joined('you')).not.toContain('No mocks yet');
    const read = checkBackupText(JSON.stringify(file));
    if (read.kind !== 'ok') throw new Error(read.code);
    pushOver();
    await act(async () => {
      await restoreBackup(read.data, { now: T0 });
    });
    expectTabsFresh();
    expect(joined('you')).toContain(`[Answered: ${answeredThen}]`);
    expect(joined('you')).toContain('No mocks yet');
    expect(joined('practice')).toContain(revisitLabel(engineDue()));
    // The phone's saved progress is the restored data (a later no-op never skips it back).
    const saved = JSON.parse((await AsyncStorage.getItem('aurivan.progress.v1'))!);
    expect(Object.keys(saved.state.byCert.cisa.answers)).toHaveLength(answeredThen);
    expect(saved.state.byCert.cisa.mocks).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════
describe('Reset', () => {
  it('resetting the exam: every tab is back to a fresh start', () => {
    studySession(30);
    mockExam(35);
    act(() => {
      useProgress.getState().completeLesson('cisa', require('../content/lessons').lessonsFor('cisa')[0].id);
      useProgress.getState().recordGame('cisa', 'trap', 9);
    });
    mountAll();
    tap('you');
    act(() => {
      useProgress.getState().resetCert('cisa');
    });
    expectTabsFresh();
    expect(joined('you')).toContain('No mocks yet');
    expect(joined('you')).toContain('[Answered: 0]');
    expect(joined('practice')).toContain('[Questions to revisit, all caught up]');
    expect(joined('learn')).toContain(`0 of ${lessonsFor('cisa').length} done`);
    expect(engineDue()).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════
describe('changing the exam date', () => {
  it('Today’s countdown and every tab follow the new date', () => {
    studySession(10);
    mountAll();
    expect(joined('home')).toContain(`${daysToExam('2027-06-01', dayKey(T0))} days to CISA`);
    tap('you');
    act(() => {
      useSettings.setState({ examDates: { cisa: '2026-12-01' } });
    });
    expectTabsFresh();
    expect(joined('home')).toContain(`${daysToExam('2026-12-01', dayKey(T0))} days to CISA`);
  });
});

// ══════════════════════════════════════════════════════════════════════════
describe('finishing a mock', () => {
  it('the mock appears in You (list, See report) and in the readiness report', () => {
    studySession(10);
    mountAll();
    expect(joined('you')).toContain('No mocks yet');
    mockExam(35);
    expectTabsFresh();
    const m = cp().mocks[0];
    expect(m.total).toBe(50);
    const pct = Math.round((m.correct / m.total) * 100);
    expect(joined('you')).toContain(`[50 questions, score ${pct} percent`);
    expect(joined('you')).toContain('[See report, your readiness report]');
    expect(joined('you')).not.toContain('No mocks yet');
    // A second mock: the newest first, both listed.
    mockExam(20);
    tap('you');
    expect(textOf('you').filter((x) => x.startsWith('[50 questions, score'))).toHaveLength(2);
    expectTabsFresh(['you', 'home', 'practice']);
    // The readiness report (a pushed screen) lists both mocks.
    const Readiness = require('../app/readiness').default as ComponentType;
    let rr: ReactTestRenderer | undefined;
    act(() => {
      rr = create(<Readiness />);
    });
    const report = collect(rr!.root).join(' | ');
    for (const mm of cp().mocks) expect(report).toContain(`${Math.round((mm.correct / mm.total) * 100)}%`);
    act(() => rr!.unmount());
  });
});

// ══════════════════════════════════════════════════════════════════════════
describe('a badge earned: the tab dot and the count', () => {
  function Dot() {
    const n = useNewBadge();
    const { YouIcon } = require('../app/(tabs)/_layout');
    return <YouIcon color="#000" size={24} dot={n} />;
  }
  it('the You dot appears with the new badge and the Badges row counts it', () => {
    mountAll();
    let dot: ReactTestRenderer | undefined;
    act(() => {
      dot = create(<Dot />);
    });
    expect(dot!.root.findAllByProps({ testID: 'you-new-dot' })).toHaveLength(0);
    expect(joined('you')).toContain('[Badges and field notes, none yet.');
    // A finished mock of 50 earns a badge live (after the launch back-fill).
    mockExam(40);
    const earned = caseEarnedCount(cp().milestones?.earned);
    expect(earned).toBeGreaterThan(0);
    expect(hasNewBadge('cisa')).toBe(true);
    expect(dot!.root.findAllByProps({ testID: 'you-new-dot' }).length).toBeGreaterThan(0);
    expectTabsFresh(['you']);
    expect(joined('you')).not.toContain('[Badges and field notes, none yet.');
    act(() => dot!.unmount());
  });
});

// ══════════════════════════════════════════════════════════════════════════
describe('the plant growing', () => {
  it('Today’s growth line shows once, then never again on later visits', () => {
    mountAll();
    // 20 clean answers open Sprout; finishing the session checks the plant (Results on top).
    studySession(20, () => true);
    expect(cp().plant!.growth).toBe(2);
    const line = grewLabel(cp().plant!, 2);
    tap('home');
    const shows = textOf('home').filter((x) => x.includes(line)).length;
    expect(shows).toBeGreaterThan(0);
    expect(cp().plant!.pending).toBeUndefined();
    tap('you');
    tap('home');
    expect(textOf('home').filter((x) => x.includes(line))).toHaveLength(0);
    tap('learn');
    tap('home');
    expect(textOf('home').filter((x) => x.includes(line))).toHaveLength(0);
    // The plant on You shows the new growth.
    expect(joined('you')).toContain('Sprout');
  });
});

// ══════════════════════════════════════════════════════════════════════════
describe('Today’s kept clock (performance: setNow keeps the old value the same day)', () => {
  it('a paused TIMED mock: the minutes left follow the clock on each return to Today', () => {
    mountAll();
    pushOver();
    act(() => {
      startMock('cisa', 50, { timing: 'standard' });
    });
    // Paused (the learner went back to the tabs).
    tap('practice');
    tap('home');
    const t1 = textOf('home');
    setClock(T0 + 70 * 60_000);
    tap('you');
    tap('home');
    expect(textOf('home')).not.toEqual(t1);
    expect(textOf('home')).toEqual(freshText('home'));
  });
});

// ══════════════════════════════════════════════════════════════════════════
describe('progress is still SAVED after real changes (store/storage.ts)', () => {
  const P = 'aurivan.progress.v1';

  it('an answer writes the progress row; the written JSON holds it', async () => {
    countWrites();
    act(() => {
      useProgress.getState().recordAnswer('cisa', 'd2_010', true, 'sure');
    });
    expect(writeCount(P)).toBe(1);
    const saved = JSON.parse((await AsyncStorage.getItem(P))!);
    expect(saved.state.byCert.cisa.answers.d2_010).toBeDefined();
  });

  it('every real change in a session is written; a no-op set is not', () => {
    countWrites();
    studySession(5);
    const afterSession = writeCount(P);
    expect(afterSession).toBeGreaterThanOrEqual(5);
    countWrites();
    act(() => {
      // Nothing changes: same settings, a plant update that returns the same plant, a plain set of the same state.
      useProgress.getState().setPlantSettings({});
      useProgress.getState().updatePlant('cisa', (p) => p);
      useProgress.setState({});
    });
    expect(writeCount(P)).toBe(0);
    act(() => {
      useProgress.getState().toggleBookmark('cisa', 'd3_005');
    });
    expect(writeCount(P)).toBe(1);
  });

  it('switching tabs with nothing new writes no progress; studying between switches does', () => {
    studySession(10);
    mountAll();
    for (const t of TABS) tap(t);
    countWrites();
    for (const t of [...TABS, ...TABS]) tap(t);
    expect(writeCount(P)).toBe(0);
    act(() => {
      useProgress.getState().recordAnswer('cisa', 'd1_050', false, 'unsure');
    });
    expect(writeCount(P)).toBe(1);
  });

  it('the other stores still save their real changes (settings, session, seen)', () => {
    countWrites();
    act(() => {
      useSettings.setState({ examDates: { cisa: '2026-11-30' } });
      startPractice('cisa', { count: 3 });
      useSeen.getState().forgetValues();
    });
    expect(writeCount('aurivan.settings.v1')).toBe(1);
    expect(writeCount('aurivan.session.v1')).toBeGreaterThanOrEqual(1);
    countWrites();
    act(() => {
      useSettings.setState({});
    });
    expect(writeCount('aurivan.settings.v1')).toBe(0);
  });

  it('a failed write is tried again on the next save, even an unchanged one', async () => {
    const AS = AsyncStorage as unknown as { setItem: (k: string, v: string) => Promise<void> };
    const ok = AS.setItem;
    const version = useProgress.persist.getOptions().version;
    // A real change (a new byCert object) whose write fails.
    const changed = { ...useProgress.getState(), byCert: { ...useProgress.getState().byCert } };
    AS.setItem = () => Promise.reject(new Error('disk full'));
    try {
      await expect(persistStorage.setItem(P, { state: changed, version })).rejects.toThrow('disk full');
    } finally {
      AS.setItem = ok;
    }
    countWrites();
    // The very same state again: written (the failed one is not remembered as saved)...
    await persistStorage.setItem(P, { state: changed, version });
    expect(writeCount(P)).toBe(1);
    // ...and once it IS saved, the same state again is skipped.
    await persistStorage.setItem(P, { state: changed, version });
    expect(writeCount(P)).toBe(1);
  });

  it('a no-op save made WHILE a real write is still in flight shares it, and writes again by itself if that write fails', async () => {
    const AS = AsyncStorage as unknown as { setItem: (k: string, v: string) => Promise<void> };
    const ok = AS.setItem;
    const version = useProgress.persist.getOptions().version;
    const changed = { ...useProgress.getState(), byCert: { ...useProgress.getState().byCert } };
    let rejectWrite: (e: Error) => void = () => {};
    AS.setItem = () =>
      new Promise<void>((_res, rej) => {
        rejectWrite = rej;
      });
    const first = persistStorage.setItem(P, { state: changed, version });
    // The write is still pending; the store saves the same state again (e.g. a no-op set).
    AS.setItem = ok;
    countWrites();
    const second = persistStorage.setItem(P, { state: changed, version });
    // Shared with the write on its way: the same state is not written twice.
    expect(writeCount(P)).toBe(0);
    rejectWrite(new Error('disk full'));
    await expect(first).rejects.toThrow('disk full');
    // Fixed (was QA-BUG, PR #48 store/storage.ts setItem): a write counts as
    // saved only once it succeeds, so the shared save writes again at once and
    // a transient failure heals, as on main.
    await second;
    expect(writeCount(P)).toBe(1);
    const saved = JSON.parse((await AsyncStorage.getItem(P))!);
    expect(saved.state.byCert.cisa).toBeDefined();
    // Once that write is confirmed, the same state again is skipped.
    await persistStorage.setItem(P, { state: changed, version });
    expect(writeCount(P)).toBe(1);
  });

  it('after a read (launch or rehydrate) the next save always goes through', async () => {
    act(() => {
      useProgress.getState().recordAnswer('cisa', 'd1_002', true, 'sure');
    });
    countWrites();
    act(() => {
      useProgress.setState({});
    });
    expect(writeCount(P)).toBe(0);
    await persistStorage.getItem(P);
    act(() => {
      useProgress.setState({});
    });
    expect(writeCount(P)).toBe(1);
    // A fresh launch (the adapter's memory forgotten): the same.
    resetSavedForTest();
    countWrites();
    act(() => {
      useProgress.setState({});
    });
    expect(writeCount(P)).toBe(1);
  });
});
