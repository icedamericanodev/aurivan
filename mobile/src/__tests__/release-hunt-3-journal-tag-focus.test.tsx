/**
 * Release bug hunt round 3 (TalkBack): in the Mistake journal, "Tag why you slipped" and each tag chip
 * vanish when pressed, so screen-reader focus was lost with nothing said. Now opening the tags moves
 * focus to the tag group, and picking one says "Tagged: <tag>" and moves focus to the "Why you
 * slipped" line. The saved slip is unchanged.
 */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
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
const mockSay = jest.fn();
const mockMoveFocus = jest.fn();
jest.mock('../lib/a11y', () => ({
  ...jest.requireActual('../lib/a11y'),
  sayLater: (...args: unknown[]) => mockSay(...args),
  moveFocus: (...args: unknown[]) => mockMoveFocus(...args),
}));

let r: ReactTestRenderer | undefined;
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});

it('opening the tags moves focus to them; picking one says it and moves focus to the saved line', () => {
  const q = getAllQuestions('cisa')[100];
  useSettings.setState({ ...useSettings.getInitialState(), onboarded: true, activeCertId: 'cisa' });
  useProgress.setState({
    byCert: {
      cisa: {
        answers: { [q.id]: { attempts: 1, correctCount: 0, lastCorrect: false, lastAt: Date.now() } },
        review: {},
        bookmarks: [],
        mocks: [],
        lessonsDone: [],
        mistakes: { [q.id]: { picked: q.correct === 'A' ? 'B' : 'A', at: Date.now(), resolved: false } },
        gameBest: {},
        gameRecent: {},
        notesRead: [],
      },
    },
  } as never);
  act(() => {
    r = create(<Mistakes />);
  });
  // The screen opening moves no focus by itself.
  expect(mockMoveFocus).not.toHaveBeenCalled();
  const press = (label: string) =>
    act(() => {
      r!.root.findAll((n) => (n.props.accessibilityLabel === label || n.props.label === label) && typeof n.props.onPress === 'function')[0].props.onPress();
    });

  press('Tag why you slipped');
  expect(mockMoveFocus).toHaveBeenCalledTimes(1);
  const groupRef = mockMoveFocus.mock.calls[0][0];

  press('Tag: Acted as the wrong person');
  expect(useProgress.getState().byCert.cisa!.mistakes[q.id].slip).toBe('role');
  expect(mockSay).toHaveBeenCalledWith('Tagged: Acted as the wrong person');
  // Focus goes to the line that replaced the chips (another ref than the tag group's).
  expect(mockMoveFocus).toHaveBeenCalledTimes(2);
  expect(mockMoveFocus.mock.calls[1][0]).not.toBe(groupRef);
  expect(mockMoveFocus.mock.calls[1][0].current).toBeTruthy();
  expect(r!.root.findAll((n) => n.children.includes('Why you slipped: Acted as the wrong person')).length).toBeGreaterThan(0);
});
