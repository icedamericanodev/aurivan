/**
 * Tab performance harness (mobile-performance-engineer).
 *
 * Plain English: this mounts the five tab screens side by side, the way the
 * tab navigator keeps them (every visited tab stays mounted), with a HEAVY
 * save (months of study, every badge, a dressed plant; jest/perf/heavySave.ts),
 * and measures what a learner's taps cost:
 * - mounting each tab the first time it is opened;
 * - switching tabs once all are open (the focus change re-renders screens);
 * - one answer recorded while a tab is open (every mounted tab that reads
 *   the changed data re-renders);
 * - any store write at all (every subscription's selector runs).
 * React's <Profiler> gives the render time; jest/perf/renderCounter.ts
 * counts the components that actually re-rendered, per tab.
 *
 * `PERF_REPORT=1 npx jest perf-tabs -t report` prints the numbers (and writes
 * them to $PERF_OUT when set). The budget tests below pin the fixes with
 * render COUNTS and call counts, never milliseconds, so they can't flake.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
// First: the render counter must be in place before React's renderer loads.
import { renderNames, renders, resetRenders } from '../../jest/perf/renderCounter';
import { Profiler, useSyncExternalStore, type ComponentType, type ReactElement, type ProfilerOnRenderCallback } from 'react';
import { View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { FocusEmitter, FocusScope } from '../../jest/perf/focusRouter';
import { buildHeavySave, type HeavySaveInfo } from '../../jest/perf/heavySave';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { useSeen } from '../store/seen';

jest.mock('expo-router', () => require('../../jest/perf/focusRouter').routerMock());
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => {
  const { View: V } = jest.requireActual('react-native');
  return { SafeAreaView: V, SafeAreaProvider: V, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
// Lucide ships ESM that jest can't load: a stand-in of about the same cost (one SVG, two paths).
jest.mock('../components/icons', () => {
  const { createElement } = jest.requireActual('react');
  const { default: Svg, Path } = jest.requireActual('react-native-svg');
  const Icon = ({ size = 24, color = '#000' }: { size?: number; color?: string }) =>
    createElement(Svg, { width: size, height: size, viewBox: '0 0 24 24' }, createElement(Path, { d: 'M4 4h16', stroke: color }), createElement(Path, { d: 'M4 20h16', stroke: color }));
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, { get: (t, k: string) => (k in t ? t[k] : Icon) });
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {}, medium: () => {} } }));

// Real motion (not Reduce Motion): what most learners run.
const REDUCED = process.env.PERF_REDUCED === '1';

const TABS = ['home', 'learn', 'practice', 'play', 'you'] as const;
type Tab = (typeof TABS)[number];
const SCREENS: Record<Tab, () => ComponentType> = {
  home: () => require('../app/(tabs)/home').default,
  learn: () => require('../app/(tabs)/learn').default,
  practice: () => require('../app/(tabs)/practice').default,
  play: () => require('../app/(tabs)/play').default,
  you: () => require('../app/(tabs)/you').default,
};

// ── Profiler bookkeeping ────────────────────────────────────────────────
let profile: Record<string, { commits: number; ms: number }> = {};
const onRender: ProfilerOnRenderCallback = (id, _phase, actual) => {
  const p = (profile[id] ??= { commits: 0, ms: 0 });
  p.commits++;
  p.ms += actual;
};
// Saves to the phone (zustand persist → AsyncStorage) and their size.
let saves = { n: 0, bytes: 0 };
function countSaves() {
  const mod = require('@react-native-async-storage/async-storage');
  const AS = mod.default ?? mod;
  const real = AS.setItem;
  AS.setItem = (k: string, v: string) => {
    saves.n++;
    saves.bytes += v.length;
    return real(k, v);
  };
}
const routerCalls = () => require('../../jest/perf/focusRouter').routerCalls as { setParams: number };
function snapshot() {
  const r = renders();
  const out: Record<string, { renders: number; commits: number; ms: number }> = {};
  for (const t of TABS) out[t] = { renders: r[t] ?? 0, commits: profile[t]?.commits ?? 0, ms: Math.round((profile[t]?.ms ?? 0) * 10) / 10 };
  return out;
}
function startMeasure(names = false) {
  profile = {};
  saves = { n: 0, bytes: 0 };
  routerCalls().setParams = 0;
  resetRenders({ names });
}
const total = (s: ReturnType<typeof snapshot>) => ({
  saves: saves.n,
  savedKB: Math.round(saves.bytes / 1024),
  setParams: routerCalls().setParams,
  renders: Object.values(s).reduce((n, x) => n + x.renders, 0),
  ms: Math.round(Object.values(s).reduce((n, x) => n + x.ms, 0) * 10) / 10,
});

// ── The tab host: screens mount on first visit and stay mounted ────────
const emitters = Object.fromEntries(TABS.map((t) => [t, new FocusEmitter(false)])) as Record<Tab, FocusEmitter>;
let openTabs: Tab[] = [];
const hostSubs = new Set<() => void>();
function mountTab(t: Tab) {
  if (openTabs.includes(t)) return;
  openTabs = [...openTabs, t];
  hostSubs.forEach((cb) => cb());
}
const subscribeHost = (cb: () => void) => {
  hostSubs.add(cb);
  return () => hostSubs.delete(cb);
};
// One element per tab, made once: like the navigator's StaticContainer, opening
// another tab never re-renders the tabs already open.
const elements = new Map<Tab, ReactElement>();
function tabElement(t: Tab): ReactElement {
  let el = elements.get(t);
  if (!el) {
    const S = SCREENS[t]();
    el = (
      <FocusScope key={t} emitter={emitters[t]}>
        <Profiler id={t} onRender={onRender}>
          <S />
        </Profiler>
      </FocusScope>
    );
    elements.set(t, el);
  }
  return el;
}
function Host() {
  const open = useSyncExternalStore(subscribeHost, () => openTabs);
  return <View>{open.map(tabElement)}</View>;
}

let r: ReactTestRenderer | undefined;
let current: Tab | null = null;
/** A tap on a tab: the old one blurs, the new one mounts (first visit) or regains focus. Returns wall ms. */
function tapTab(t: Tab): number {
  const t0 = performance.now();
  // The tab press: the navigation state (and each screen's focus context) changes, then the focus events fire.
  act(() => {
    if (current) emitters[current].setContext(false);
    emitters[t].setContext(true);
    mountTab(t);
  });
  act(() => {
    if (current) emitters[current].fireEvents();
    emitters[t].fireEvents();
  });
  current = t;
  return Math.round((performance.now() - t0) * 10) / 10;
}

function resetStores() {
  for (const t of TABS) emitters[t].set(false);
  current = null;
  useSeen.setState({ values: {}, moments: {}, days: {}, badgeMoments: [], caseSeen: {}, quietGrowth: {} } as never);
  useProgress.setState({ byCert: {}, days: {}, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, reports: [], plantSettings: undefined } as never);
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', haptics: true } as never);
}

let save: HeavySaveInfo;
const NOW = Date.now();
beforeAll(() => {
  setMockReducedMotion(REDUCED);
  resetStores();
  const t0 = performance.now();
  act(() => {
    save = buildHeavySave(NOW);
  });
  buildMs = Math.round(performance.now() - t0);
  countSaves();
});
let buildMs = 0;
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
  for (const t of TABS) emitters[t].set(false);
  current = null;
});

/** Mounts the host, opens Today, then every tab once (the lazy first visits). */
function openAll() {
  openTabs = [];
  elements.clear();
  act(() => {
    r = create(<Host />);
  });
  const mount: Record<string, unknown> = {};
  for (const t of TABS) {
    startMeasure(true);
    const DBG: string[] = [];
    const u1 = useProgress.subscribe((n, o) => {
      const keys = Object.keys(n).filter((k) => (n as never)[k] !== (o as never)[k]);
      const ck = n.byCert.cisa && o.byCert.cisa ? Object.keys(n.byCert.cisa).filter((k) => (n.byCert.cisa as never)[k] !== (o.byCert.cisa as never)[k]) : [];
      DBG.push(`P:${keys.join('+')}[${ck.join('+')}]`);
    });
    const u2 = useSettings.subscribe((n, o) => DBG.push(`S:${Object.keys(n).filter((k) => (n as never)[k] !== (o as never)[k]).join('+')}`));
    const u3 = useSeen.subscribe((n, o) => DBG.push(`seen:${Object.keys(n).filter((k) => (n as never)[k] !== (o as never)[k]).join('+')}`));
    const wall = tapTab(t);
    u1();
    u2();
    u3();
    if (process.env.PERF_DEBUG) console.log('MOUNT', t, DBG.join(' '));
    const s = snapshot();
    mount[t] = { wallMs: wall, ...total(s), perTab: Object.fromEntries(TABS.map((x) => [x, s[x].renders])), top: topNames(renderNames(), 25)[t] };
  }
  return mount;
}

// ── Engine timings with the heavy save ──────────────────────────────────
function med(fn: () => unknown, n = 15): number {
  const xs: number[] = [];
  fn(); // warm
  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    fn();
    xs.push(performance.now() - t0);
  }
  xs.sort((a, b) => a - b);
  return Math.round(xs[Math.floor(n / 2)] * 100) / 100;
}
function optional<T>(load: () => T): T | undefined {
  try {
    return load();
  } catch {
    return undefined;
  }
}
function engineTimings() {
  const cert = require('../content/certifications').getCertification('cisa');
  const cp = useProgress.getState().byCert.cisa!;
  const out: Record<string, number> = {};
  const readiness = require('../engine/readiness').computeReadiness(cert, cp.answers);
  out.computeReadiness = med(() => require('../engine/readiness').computeReadiness(cert, cp.answers));
  out.readinessRange = med(() => require('../engine/readinessRange').readinessRange(cert, readiness));
  const exists = require('../lib/outline').questionExists('cisa');
  out.dueIds = med(() => require('../engine/srs').dueIds(cp.review, NOW, exists));
  const uj = require('../lib/useJourney');
  if (uj.buildJourney) {
    out.buildJourney = med(() =>
      uj.buildJourney({ cert, progress: cp, readiness, dueCount: 40, daysLeft: 40, dailyGoal: 20, dailyMinutes: 30, familiarity: 'some', streak: useProgress.getState().streak, now: NOW }),
    );
  }
  const plant = optional(() => require('../lib/plant'));
  if (plant?.plantFactsFor) out.plantFactsFor = med(() => plant.plantFactsFor('cisa', cp, NOW));
  if (plant?.plantView) out.plantView = med(() => plant.plantView(cert, cp, useProgress.getState().plantSettings, require('../engine/streak').dayKey(NOW)));
  if (plant?.plantLookView && cp.plant) {
    out.plantLookView = med(() =>
      plant.plantLookView(cp.plant, { marks: plant.allCertMarks(useProgress.getState().byCert), face: true, resting: false, planCleared: false, newTopicToday: false, newKeepsakeToday: false, today: '2026-01-01' }),
    );
  }
  if (plant?.newKeepsakeOn) out.newKeepsakeOn = med(() => plant.newKeepsakeOn(useProgress.getState().byCert, '2026-01-01'));
  const ms = optional(() => require('../lib/milestones'));
  if (ms?.badgeCase) out.badgeCase = med(() => ms.badgeCase('cisa', cp, NOW), 5);
  const mg = optional(() => require('../engine/mindsetGrowth'));
  const loader = require('../content/loader');
  if (mg?.firstTries) out.mindsetGrowth = med(() => mg.mindsetGrowth(mg.firstTries(cp.answers, cp.mistakes, (id: string) => loader.findQuestion('cisa', id)), NOW));
  const pace = optional(() => require('../engine/pace'));
  if (pace?.pacingStats) out.pacingStats = med(() => pace.pacingStats(cp.mocks));
  const badgesLib = optional(() => require('../lib/badges'));
  if (badgesLib?.hasNewBadge) out.hasNewBadge = med(() => badgesLib.hasNewBadge('cisa'));
  return out;
}

// ── The report ──────────────────────────────────────────────────────────
const report = process.env.PERF_REPORT === '1' ? describe : describe.skip;
report('report', () => {
  it('measures mount, tab switches, one answer, any store write, and the engine', () => {
    const result: Record<string, unknown> = { save, buildMs, reduced: REDUCED };
    result.engine = engineTimings();
    // Mount: each tab's first visit.
    result.mount = openAll();
    // Switching tabs once every tab is open: 7 laps. Lap 0 settles; lap 1
    // gives the render counts (the steady state); times are the median of laps 1-6.
    const laps: Record<string, unknown>[] = [];
    const times: Record<string, { wall: number[]; ms: number[] }> = {};
    for (let lap = 0; lap < 7; lap++) {
      const lapOut: Record<string, unknown> = {};
      for (const t of [...TABS.slice(1), TABS[0]]) {
        startMeasure(lap === 1);
        const wall = tapTab(t);
        const s = snapshot();
        if (lap >= 1) {
          const tt = (times[t] ??= { wall: [], ms: [] });
          tt.wall.push(wall);
          tt.ms.push(total(s).ms);
        }
        lapOut[t] = { wallMs: wall, ...total(s), perTab: Object.fromEntries(TABS.map((x) => [x, s[x].renders])) };
        if (lap === 1) (lapOut[t] as Record<string, unknown>).top = topNames(renderNames(), 40);
      }
      if (lap <= 1) laps.push(lapOut);
    }
    const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    for (const [t, v] of Object.entries(times)) Object.assign(laps[1][t] as object, { wallMs: median(v.wall), ms: median(v.ms) });
    result.switch = laps;
    // One answer recorded while Practice is open (the other tabs are mounted, hidden).
    tapTab('practice');
    const q = require('../content/loader').getAllQuestions('cisa')[7];
    startMeasure(true);
    let t0 = performance.now();
    act(() => {
      useProgress.getState().recordAnswer('cisa', q.id, true, 'sure');
    });
    const ans = snapshot();
    result.oneAnswer = { wallMs: Math.round((performance.now() - t0) * 10) / 10, ...total(ans), perTab: Object.fromEntries(TABS.map((x) => [x, ans[x].renders])), top: topNames(renderNames(), 8) };
    // Any store write: a no-op write still runs every subscription's selector.
    startMeasure();
    t0 = performance.now();
    for (let i = 0; i < 20; i++) act(() => void useProgress.setState({}));
    const w = snapshot();
    result.anyWrite = { wallMsPer: Math.round(((performance.now() - t0) / 20) * 100) / 100, ...total(w) };
    console.log(`PERF ${JSON.stringify(result, null, 1)}`);
    if (process.env.PERF_OUT) require('fs').writeFileSync(process.env.PERF_OUT, JSON.stringify(result, null, 1));
  });
});

function topNames(n: Record<string, Record<string, number>>, k: number) {
  const out: Record<string, string> = {};
  for (const [tab, byName] of Object.entries(n)) {
    out[tab] = Object.entries(byName)
      .sort((a, b) => b[1] - a[1])
      .slice(0, k)
      .map(([name, c]) => `${name}×${c}`)
      .join(' ');
  }
  return out;
}

it('builds the heavy save', () => {
  expect(save.answers).toBeGreaterThan(3000);
  expect(save.mocks).toBe(12);
});

/**
 * Budgets (mobile 1.15.x performance work), in components re-rendered and
 * saves, never milliseconds. Generous: about twice what the fixes reached,
 * and well under 1.15.0 (in brackets).
 */
describe('budgets with the heavy save', () => {
  const LAP: Tab[] = ['learn', 'practice', 'play', 'you', 'home'];
  function lap() {
    startMeasure();
    for (const t of LAP) tapTab(t);
    return { ...total(snapshot()) };
  }

  it('tapping through every open tab', () => {
    openAll();
    lap(); // settles each tab's first view of the day
    const l = lap();
    expect(l.renders).toBeLessThan(2500); // 1.15.0: 6,112 (now ~1,200)
    expect(l.saves).toBe(0); // 1.15.0: 7 saves of the whole store (~310 KB on each Today tap)
    expect(l.setParams).toBe(0); // 1.15.0: 1 (leaving Learn set params on the next tab)
  });

  it('one answer recorded while the tabs are open', () => {
    openAll();
    tapTab('practice');
    startMeasure();
    act(() => {
      useProgress.getState().recordAnswer('cisa', 'd3_005', true, 'sure');
    });
    const s = snapshot();
    expect(total(s).renders).toBeLessThan(1600); // 1.15.0: 2,308 (now ~1,070)
    expect(s.learn.renders).toBe(0); // 1.15.0: 634
    expect(s.play.renders).toBe(0); // 1.15.0: 459
    expect(total(s).saves).toBe(1); // the answer itself
  });

  it('a store write that changes nothing re-renders nothing and saves nothing', () => {
    openAll();
    startMeasure();
    act(() => {
      useProgress.setState((x) => x);
      useProgress.setState({});
    });
    expect(total(snapshot()).renders).toBe(0);
    expect(total(snapshot()).saves).toBe(0);
  });
});
