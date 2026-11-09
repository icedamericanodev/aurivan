/**
 * Release bug hunt round 2: the Mistake journal's "Drill it" follows the same unlock rule as Practice >
 * Drills. Before the fix a learner under 50 answers with a "wrong person" pattern was offered
 * "Drill it: Role Check", a drill Drills still kept locked (opening it quietly unlocked it for good).
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import Mistakes from '../app/mistakes';
import { getAllQuestions } from '../content/loader';
import { useProgress } from '../store/progress';
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
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});
const labels = () =>
  r!.root
    .findAll((x: ReactTestInstance) => typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string')
    .map((x) => x.props.accessibilityLabel as string);

/** `answered` answers (all right), plus 6 open mistakes tagged "Acted as the wrong person". */
function seed(answered: number, played: Record<string, number> = {}) {
  const qs = getAllQuestions('cisa');
  const answers: Record<string, { correct: number; wrong: number; lastCorrect: boolean; lastAt: number }> = {};
  for (const q of qs.slice(0, answered)) answers[q.id] = { correct: 1, wrong: 0, lastCorrect: true, lastAt: Date.now() };
  const mistakes: Record<string, { picked: string; at: number; slip: 'role'; resolved: boolean }> = {};
  for (const q of qs.slice(100, 106)) mistakes[q.id] = { picked: q.correct === 'A' ? 'B' : 'A', at: Date.now(), slip: 'role', resolved: false };
  useSettings.setState({ ...useSettings.getInitialState(), onboarded: true, activeCertId: 'cisa' });
  useProgress.setState({
    byCert: { cisa: { answers, review: {}, bookmarks: [], mocks: [], lessonsDone: [], mistakes, gameBest: played, gameRecent: {}, notesRead: [] } },
  } as never);
  act(() => {
    r = create(<Mistakes />);
  });
}

describe('the journal offers a drill only when Drills has it open', () => {
  it('12 answers, no games played: no "Drill it: Role Check", the review button instead', () => {
    seed(12);
    expect(labels().some((l) => /^Drill it/.test(l))).toBe(false);
    expect(labels()).toContain('Review these mistakes');
  });
  it('50 answers: the drill is offered', () => {
    seed(50);
    expect(labels()).toContain('Drill it: Role Check');
  });
  it('under 50 answers but Role Check already played: offered (a played game is never taken away)', () => {
    seed(12, { canopy: 3 });
    expect(labels()).toContain('Drill it: Role Check');
  });
});
