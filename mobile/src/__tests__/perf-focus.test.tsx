/**
 * Performance (1.15.x): what a tab switch costs the screens that use focus.
 * Uses the perf harness's expo-router stand-in (jest/perf/focusRouter.tsx),
 * which follows React Navigation 7 in two steps: the focus context changes
 * in the tab press's commit, then the focus / blur events fire.
 * Pinned by commit counts, never milliseconds.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
// First: the render counter must be in place before React's renderer loads.
import { renderNames, renders, resetRenders } from '../../jest/perf/renderCounter';
import { Profiler, type ComponentType } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { FocusEmitter, FocusScope, routeParams, routerCalls } from '../../jest/perf/focusRouter';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import { plantFor } from '../lib/plant';
import { useProgress } from '../store/progress';
import { useSettings } from '../store/settings';

jest.mock('expo-router', () => require('../../jest/perf/focusRouter').routerMock());
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, SafeAreaProvider: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, { get: (t, k: string) => (k in t ? t[k] : Icon) });
});
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null }));
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

let r: ReactTestRenderer | undefined;
const em = new FocusEmitter(true);

function mount(Screen: ComponentType) {
  act(() => {
    r = create(
      <FocusScope emitter={em}>
        <Profiler id="tab" onRender={() => {}}>
          <Screen />
        </Profiler>
      </FocusScope>,
    );
  });
}
/** A tab press away (or back): the context commit, then the events. Components re-rendered in each. */
function flip(focused: boolean): { press: number; events: number } {
  resetRenders();
  act(() => em.setContext(focused));
  const press = renders().tab ?? 0;
  resetRenders();
  act(() => em.fireEvents());
  return { press, events: renders().tab ?? 0 };
}

beforeEach(() => {
  setMockReducedMotion(false);
  em.set(true);
  for (const k of Object.keys(routeParams)) delete routeParams[k];
  routerCalls.setParams = 0;
  routerCalls.routerSetParams = 0;
  act(() => {
    useProgress.getState().resetCert('cisa');
    for (let i = 1; i <= 25; i++) useProgress.getState().recordAnswer('cisa', `d1_${String(i).padStart(3, '0')}`, i % 3 !== 0, 'sure');
    // A planted plant (a learner without one has the "Plant yours" line, which is put away on leaving Today: one more commit, by design).
    plantFor('cisa', 'oak', 'Kai');
  });
  useSettings.setState({ activeCertId: 'cisa', onboarded: true, examDates: { cisa: '2027-06-01' } });
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});

describe('Learn on blur: ?domain= is cleared on Learn itself, and only when there is one', () => {
  const Learn = () => require('../app/(tabs)/learn').default;

  it('no param: leaving Learn changes no route (it used to set params on the NEXT tab, restarting its fade)', () => {
    mount(Learn());
    flip(false);
    flip(true);
    flip(false);
    expect(routerCalls.setParams).toBe(0);
  });

  it('with ?domain=: cleared once, through Learn’s own navigation (never router.setParams, which targets the focused tab)', () => {
    routeParams.domain = 'nope';
    mount(Learn());
    flip(false);
    expect(routerCalls.setParams).toBe(1);
    expect(routerCalls.routerSetParams).toBe(0);
    expect(routeParams.domain).toBeUndefined();
  });
});

describe('a tab switch re-renders a focus-aware tab once, not twice', () => {
  // Before 1.15.x: once with the tab press (the navigator's focus context),
  // then all over again when the focus event set a copy of it held in state
  // (useScreenFocus), on the tab left AND the tab opened.
  for (const [name, load] of [
    ['Today', () => require('../app/(tabs)/home').default],
    ['Learn', () => require('../app/(tabs)/learn').default],
    ['You', () => require('../app/(tabs)/you').default],
  ] as const) {
    it(`${name}: re-rendered with the press, and nothing more when the focus events arrive`, () => {
      mount(load());
      // Settle anything the first visit left behind (a first view of the day).
      flip(false);
      flip(true);
      const away = flip(false);
      const back = flip(true);
      expect(away.press).toBeGreaterThan(0);
      expect(back.press).toBeGreaterThan(0);
      expect(away.events).toBe(0);
      expect(back.events).toBe(0);
    });
  }
});

describe('what a hidden tab re-renders', () => {
  /** Mounts several tabs side by side (as the navigator keeps them), each in its own Profiler. */
  function mountTabs(tabs: Record<string, ComponentType>) {
    act(() => {
      r = create(
        <FocusScope emitter={em}>
          {Object.entries(tabs).map(([id, S]) => (
            <Profiler key={id} id={id} onRender={() => {}}>
              <S />
            </Profiler>
          ))}
        </FocusScope>,
      );
    });
  }

  it('one answer (a session on top): Play and Learn do not re-render at all', () => {
    mountTabs({ learn: require('../app/(tabs)/learn').default, play: require('../app/(tabs)/play').default });
    flip(false);
    resetRenders();
    // A question already answered right, right again: Learn's focus domain stays where it was.
    act(() => {
      useProgress.getState().recordAnswer('cisa', 'd1_001', true, 'sure');
    });
    expect(renders().learn ?? 0).toBe(0);
    expect(renders().play ?? 0).toBe(0);
    // A game round does reach Play (its best scores).
    act(() => {
      useProgress.getState().recordGame('cisa', 'trap', 7);
    });
    expect(renders().play ?? 0).toBeGreaterThan(0);
  });

  it('coming back into view: Learn re-renders no lesson row, You none of its lists', () => {
    mountTabs({ learn: require('../app/(tabs)/learn').default, you: require('../app/(tabs)/you').default });
    flip(false);
    flip(true);
    resetRenders({ names: true });
    flip(false);
    flip(true);
    const names = renderNames();
    expect(names.learn?.LessonRow ?? 0).toBe(0);
    expect(names.learn?.LessonGroups ?? 0).toBe(0);
    expect(names.you?.YouLists ?? 0).toBe(0);
  });
});
