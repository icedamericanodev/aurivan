/**
 * Release bug hunt round 1: the Mistake journal and Saved questions on a LARGE save.
 *
 * Before the fix the journal drew every mistake at once (about 13,800 components for a few
 * hundred open ones) and every tag tap redrew all of them; Saved did the same for every saved
 * question. Now both are FlatLists of memoised rows: only the rows near the screen are drawn,
 * and a tap redraws only its own row.
 *
 * Counts components that rendered (jest/perf/renderCounter.ts), never milliseconds, so it
 * cannot flake.
 */
// MUST load before react-test-renderer (React reads the devtools hook once).
import { renders, resetRenders } from '../../jest/perf/renderCounter';
import { Profiler } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { buildHeavySave } from '../../jest/perf/heavySave';
import Mistakes from '../app/mistakes';
import Saved from '../app/saved';
import { getAllQuestions } from '../content/loader';
import { selectCert, useProgress } from '../store/progress';
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
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

let r: ReactTestRenderer | undefined;
const count = () => renders().screen ?? 0;
const mount = (S: () => React.ReactElement | null) => {
  resetRenders();
  act(() => {
    r = create(
      <Profiler id="screen" onRender={() => {}}>
        <S />
      </Profiler>,
    );
  });
  return count();
};
const pressFirst = (label: string) => {
  const n = r!.root.findAll((x) => typeof x.props.onPress === 'function' && (x.props.label === label || x.props.accessibilityLabel === label))[0];
  if (!n) throw new Error(`no button ${label}`);
  resetRenders();
  act(() => {
    n.props.onPress();
  });
  return count();
};

beforeAll(() => {
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', haptics: true } as never);
  act(() => {
    buildHeavySave(Date.now(), 200);
  });
  // A large saved set too (150 saved questions).
  const ids = getAllQuestions('cisa').slice(0, 150).map((q) => q.id);
  useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...selectCert(s, 'cisa'), bookmarks: ids } } }));
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});

describe('the Mistake journal on a large save', () => {
  it('opens with only the cards near the screen, and a tag tap redraws one card', () => {
    const open = Object.values(selectCert(useProgress.getState(), 'cisa').mistakes).filter((m) => !m.resolved).length;
    expect(open).toBeGreaterThan(100); // a real large journal
    expect(mount(Mistakes)).toBeLessThan(1500);
    // "Tag why you slipped" on one card opens its chips: that card, the page header and the footer redraw
    // (about 200), never the other cards (before the fix: about 13,900).
    expect(pressFirst('Tag why you slipped')).toBeLessThan(300);
    // A tag chip: saved for that card, which closes its chips; the others are not redrawn.
    expect(pressFirst('Tag: Missed FIRST or BEST')).toBeLessThan(300);
  });
});

describe('Saved questions on a large save', () => {
  it('opens with only the rows near the screen, and a remove tap redraws one row', () => {
    expect(mount(Saved)).toBeLessThan(1500);
    expect(pressFirst('Remove from saved')).toBeLessThan(200);
  });
});
