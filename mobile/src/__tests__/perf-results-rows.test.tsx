/**
 * Release bug hunt round 2: after a full 150-question mock, each tap that opened or closed a row in
 * Review answers redrew the whole Results screen and all 150 rows (about 2,150 components). The rows
 * are now memoised (results.tsx ReviewRow): a tap redraws only the row that opened or closed.
 *
 * Counts components that rendered (jest/perf/renderCounter.ts), never milliseconds.
 */
// MUST load before react-test-renderer (React reads the devtools hook once).
import { renderNames, resetRenders } from '../../jest/perf/renderCounter';
import { Profiler } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import Results from '../app/results';
import { getAllQuestions } from '../content/loader';
import { finishSession } from '../lib/finishSession';
import { startMock } from '../lib/sessions';
import { useProgress } from '../store/progress';
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
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
  useNavigation: () => ({ addListener: () => () => {} }),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

let r: ReactTestRenderer | undefined;
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
  jest.useRealTimers();
});

describe('Review answers after a full mock', () => {
  it('a tap on one row redraws only that row (not all 150), and the row still opens and closes', () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 7, 9, 0, 0) });
    useSettings.setState({ ...useSettings.getInitialState(), onboarded: true, activeCertId: 'cisa' });
    useProgress.getState().resetCert('cisa');
    useSession.getState().clear();
    startMock('cisa', 150);
    const s = useSession.getState().active!;
    const bank = getAllQuestions('cisa');
    s.questionIds.forEach((id, i) => {
      const q = bank.find((x) => x.id === id)!;
      const k = s.perms[id].findIndex((o) => (i % 3 === 0 ? o !== q.correct : o === q.correct));
      useSession.getState().answer(id, { display: (['A', 'B', 'C', 'D'] as const)[k], correct: i % 3 !== 0, ms: 30_000 });
    });
    finishSession();
    act(() => {
      r = create(
        <Profiler id="screen" onRender={() => {}}>
          <Results />
        </Profiler>,
      );
    });
    act(() => { jest.advanceTimersByTime(3000); });
    const row = () =>
      r!.root.findAll((n) => typeof n.props.onPress === 'function' && typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Question 5,'))[0];
    expect(row().props.accessibilityState).toEqual({ expanded: false });

    resetRenders({ names: true });
    act(() => { row().props.onPress(); });
    let names = renderNames().screen ?? {};
    expect(names.ReviewRow ?? 0).toBe(1);
    expect(names.Results ?? 0).toBeLessThanOrEqual(1);
    expect(row().props.accessibilityState).toEqual({ expanded: true });

    resetRenders({ names: true });
    act(() => { row().props.onPress(); });
    names = renderNames().screen ?? {};
    expect(names.ReviewRow ?? 0).toBe(1);
    expect(row().props.accessibilityState).toEqual({ expanded: false });
  });
});
