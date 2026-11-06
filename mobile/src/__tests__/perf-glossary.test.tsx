/**
 * Release bug hunt round 2: the Glossary drew every term inline in the screen that owns the search.
 * The first search letter redrew about 4,700 components (the urgent render re-created every row, then
 * the deferred pass drew them again), and a hidden Glossary (open under a note and a practice set)
 * redrew all of its rows on every recorded answer, though it shows no progress.
 *
 * Now the screen reads only the exam's id, and the list and its rows are memoised.
 * Counts components that rendered (jest/perf/renderCounter.ts), never milliseconds.
 */
// MUST load before react-test-renderer (React reads the devtools hook once).
import { renderNames, renders, resetRenders } from '../../jest/perf/renderCounter';
import { Profiler } from 'react';
import { Dimensions, TextInput } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import Glossary from '../app/glossary';
import { getAllQuestions } from '../content/loader';
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
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), setParams: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

let r: ReactTestRenderer | undefined;
let mountCount = 0;
beforeEach(() => {
  const w = Dimensions.get('window');
  act(() => Dimensions.set({ window: { ...w, width: 393, fontScale: 1 }, screen: { ...w, width: 393, fontScale: 1 } }));
  act(() => {
    useProgress.getState().resetCert('cisa');
    useProgress.setState({ plantSettings: { promptHidden: true } });
  });
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true });
  resetRenders({ names: true });
  act(() => {
    r = create(
      <Profiler id="screen" onRender={() => {}}>
        <Glossary />
      </Profiler>,
    );
  });
  mountCount = renders().screen ?? 0;
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});

describe('Glossary render budget', () => {
  it('a recorded answer redraws nothing in the Glossary', () => {
    expect(mountCount).toBeGreaterThan(300);
    const id = getAllQuestions('cisa')[0].id;
    resetRenders({ names: true });
    act(() => {
      useProgress.getState().recordAnswer('cisa', id, true);
    });
    expect(renders().screen ?? 0).toBe(0);
  });

  it('typing one letter redraws far fewer components than the mount, and no row twice', () => {
    resetRenders({ names: true });
    act(() => {
      r!.root.findByType(TextInput).props.onChangeText('r');
    });
    const typed = renders().screen ?? 0;
    // Before the fix: about twice the mount (every row drawn in the urgent render, then again).
    expect(typed).toBeLessThan(mountCount / 2);
    // Narrowing the list draws no new rows (the ones still shown are the same terms).
    expect(renderNames().screen?.TermRow ?? 0).toBe(0);
  });
});
