/**
 * Mobile 1.24: the first set on the question screen.
 * - no timer and no "How confident are you?" chips (they come in with the next set);
 * - the answer is still graded and recorded like any other practice answer;
 * - the last answer's button is "See results", and finishing does not spend a queued badge moment
 *   (the closing screen shows none, so the badge waits for the next Results);
 * - an ordinary set still shows the chips and finishes the usual way.
 */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import SessionScreen from '../app/session';
import { OptionCard, Verdict } from '../components/quiz';
import { firstSetIds } from '../content/firstSet';
import { getAllQuestions } from '../content/loader';
import * as finish from '../lib/finishSession';
import { startFirstSet } from '../lib/firstSet';
import { startFromIds } from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a), back: jest.fn(), push: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/finishSession', () => {
  const actual = jest.requireActual('../lib/finishSession');
  return { ...actual, finishSession: jest.fn(actual.finishSession) };
});

let r: ReactTestRenderer | undefined;
const mount = () => {
  act(() => {
    r = create(<SessionScreen />);
  });
};
const root = () => r!.root;
const text = () => JSON.stringify(r!.toJSON());
const btn = (label: string) => root().findAll((n) => (n.props.label === label || n.props.accessibilityLabel === label) && typeof n.props.onPress === 'function')[0];
const press = (label: string) => act(() => btn(label).props.onPress());
const pickFirstOption = () => act(() => root().findAllByType(OptionCard)[0].props.onPress());

beforeEach(() => {
  jest.useFakeTimers();
  mockReplace.mockClear();
  jest.mocked(finish.finishSession).mockClear();
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.useRealTimers();
});

describe('the first set on the question screen', () => {
  it('has no confidence chips and no timer, and the answer is recorded like any other', () => {
    startFirstSet('cisa');
    mount();
    pickFirstOption();
    expect(text()).not.toMatch(/How confident are you\?|Sure|Unsure|Guessing/);
    expect(text()).not.toMatch(/Time left|timer/i);
    press('Check answer');
    expect(root().findAllByType(Verdict)).toHaveLength(1);
    const id = firstSetIds('cisa')[0];
    expect(useSession.getState().active!.responses[id].confidence).toBeUndefined();
    expect(selectCert(useProgress.getState(), 'cisa').answers[id].attempts).toBe(1);
  });

  it('the last answer says "See results", and finishing the first set keeps a queued badge for later', () => {
    startFirstSet('cisa');
    mount();
    for (let i = 0; i < 5; i++) {
      pickFirstOption();
      press('Check answer');
      press(i === 4 ? 'See results' : 'Next question');
    }
    expect(useSession.getState().active!.finishedAt).toBeDefined();
    expect(finish.finishSession).toHaveBeenCalledWith({ celebrate: false });
    expect(useSession.getState().active!.milestone).toBeUndefined();
    expect(mockReplace).toHaveBeenCalledWith('/results');
  });

  it('an ordinary set still offers the confidence chips and finishes the usual way', () => {
    startFromIds('cisa', getAllQuestions('cisa').slice(0, 2).map((q) => q.id), 'T');
    mount();
    pickFirstOption();
    expect(text()).toMatch(/How confident are you\?/);
    press('Check answer');
    press('Next question');
    pickFirstOption();
    press('Check answer');
    press('See results');
    expect(finish.finishSession).toHaveBeenCalledWith({ celebrate: true });
  });
});
