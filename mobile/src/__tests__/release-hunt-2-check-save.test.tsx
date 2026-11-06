/**
 * Release bug hunt round 2: a wrong answer + Check answer in practice saved the whole progress file
 * TWICE (the answer, then the Mistake journal entry), which is about 730 KB of JSON on a large save.
 * Now Check answer saves it once (store/storage.ts batchSaves), and that one save holds both the answer
 * and the mistake, with the ORIGINAL letter picked.
 *
 * Counts saves, never milliseconds.
 */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import SessionScreen from '../app/session';
import { getAllQuestions } from '../content/loader';
import { displayToOriginal } from '../engine/shuffle';
import { startFromIds } from '../lib/sessions';
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
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

const KEY = 'aurivan.progress.v1';
let calls: { key: string; value: string }[] = [];
beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@react-native-async-storage/async-storage');
  const AS = mod.default ?? mod;
  const real = AS.setItem;
  AS.setItem = (k: string, v: string) => {
    calls.push({ key: k, value: v });
    return real(k, v);
  };
});
const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

let r: ReactTestRenderer | undefined;
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});

it('a wrong answer + Check answer saves progress once, with the answer and the mistake (ORIGINAL letter)', async () => {
  useSettings.setState({ ...useSettings.getInitialState(), onboarded: true, activeCertId: 'cisa' });
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  const bank = getAllQuestions('cisa');
  startFromIds('cisa', bank.slice(0, 3).map((q) => q.id), 'T');
  act(() => {
    r = create(<SessionScreen />);
  });
  const s = useSession.getState().active!;
  const qid = s.questionIds[0];
  const q = bank.find((x) => x.id === qid)!;
  const perm = s.perms[qid];
  const card = r!.root
    .findAll((n) => n.props.letter !== undefined && n.props.state !== undefined && typeof n.props.text === 'string' && typeof n.props.onPress === 'function')
    .find((n) => displayToOriginal(n.props.letter, perm) !== q.correct)!;
  act(() => card.props.onPress());
  await flush();
  calls = [];
  act(() => {
    r!.root.findAll((n) => n.props.label === 'Check answer' && typeof n.props.onPress === 'function')[0].props.onPress();
  });
  await flush();
  const saves = calls.filter((c) => c.key === KEY);
  expect(saves).toHaveLength(1);
  const saved = JSON.parse(saves[0].value).state.byCert.cisa;
  expect(saved.answers[qid].lastCorrect).toBe(false);
  const picked = useSession.getState().active!.responses[qid].display;
  expect(saved.mistakes[qid].picked).toBe(displayToOriginal(picked, perm));
});
