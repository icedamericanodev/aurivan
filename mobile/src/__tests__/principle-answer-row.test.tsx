/**
 * Mobile 1.31: the answer screen's "Read the principle" row.
 *
 * - After a checked answer (right or wrong) on a question tagged with a
 *   principle: a row in the next-steps area that reads "Read the principle"
 *   over the principle's title, says "Read the principle: <title>" to a
 *   screen reader (role button), and opens /principles/<id>.
 * - An untagged question shows no such row, nor does the first set or a set
 *   started from that same principle.
 * - A mock exam never shows it: no answer screen while the exam runs, and
 *   the Results review has no per-question links (the note row's rule).
 * - The principle page and the list both render the 21st principle,
 *   fit-method-to-objective, with its full count.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import { getAllQuestions } from '../content/loader';
import { findPrinciple } from '../content/principles';
import { identityPermutation } from '../engine/shuffle';
import { questionsForPrinciple } from '../lib/principleQuestions';
import { finishSession } from '../lib/finishSession';
import { startFromIds, startMock } from '../lib/sessions';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import SessionScreen from '../app/session';
import Results from '../app/results';
import PrinciplesHome from '../app/principles';
import PrincipleScreen from '../app/principles/[id]';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true), canDismiss: () => false, dismissAll: jest.fn(), setParams: jest.fn() },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: jest.fn(), selection: jest.fn(), error: jest.fn(), light: jest.fn() } }));

const bank = getAllQuestions('cisa');
const tagged = bank.find((q) => q.principleId)!;
const untagged = bank.find((q) => !q.principleId)!;
const principle = findPrinciple('cisa', tagged.principleId!)!;
const filler = bank.filter((q) => q.id !== tagged.id && q.id !== untagged.id).slice(0, 2).map((q) => q.id);

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const root = () => r!.root;
const textOf = (n: ReactTestInstance | string): string => (typeof n === 'string' ? n : n.children.map(textOf).join(' '));
const press = (label: string) => {
  const b = root().findAll((n) => (n.props.label === label || n.props.accessibilityLabel === label) && typeof n.props.onPress === 'function')[0];
  if (!b) throw new Error(`no button "${label}"`);
  act(() => {
    b.props.onPress();
  });
};
/** The rows (ListRow, the component itself) whose spoken label starts "Read the principle:". */
const principleRows = () =>
  root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Read the principle:') && typeof n.props.kicker === 'string');
/** What the screen reader meets: the host element with the label, and its role. */
const principleHosts = () =>
  root().findAll((n) => typeof n.type === 'string' && typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Read the principle:'));
/** Tap the first option that is right (or wrong) by its ORIGINAL letter. */
function pickBy(right: boolean) {
  const s = useSession.getState().active!;
  const qid = s.questionIds[s.index];
  const q = bank.find((x) => x.id === qid)!;
  const perm = s.perms[qid];
  const card = root()
    .findAll((n) => n.props.letter !== undefined && n.props.state !== undefined && typeof n.props.text === 'string')
    .find((n) => (perm[['A', 'B', 'C', 'D'].indexOf(n.props.letter)] === q.correct) === right)!;
  act(() => {
    card.props.onPress();
  });
}
const answerFirst = (ids: string[], right: boolean) => {
  startFromIds('cisa', ids, 'T');
  mount(<SessionScreen />);
  pickBy(right);
  press('Check answer');
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.mocked(router.push).mockClear();
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  mockParams = {};
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.useRealTimers();
});

describe('the answer screen Principle row', () => {
  it.each([
    ['a miss', false],
    ['a right answer', true],
  ])('shows for a tagged question after %s, and opens its principle', (_label, right) => {
    answerFirst([tagged.id, ...filler], right);
    const rows = principleRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].props.accessibilityLabel).toBe(`Read the principle: ${principle.title}, how to think it through`);
    expect(rows[0].props.kicker).toBe('Read the principle');
    expect(rows[0].props.title).toBe(principle.title);
    // A screen reader hears it as a button.
    expect(principleHosts().length).toBeGreaterThan(0);
    expect(principleHosts().every((h) => h.props.accessibilityRole === 'button')).toBe(true);
    // On screen: the kicker "Read the principle" over the principle's own title.
    const t = textOf(root());
    expect(t).toContain('Read the principle');
    expect(t).toContain(principle.title);
    act(() => {
      rows[0].props.onPress();
    });
    expect(router.push).toHaveBeenCalledWith(`/principles/${encodeURIComponent(principle.id)}`);
  });

  it('is not there before the answer is checked', () => {
    startFromIds('cisa', [tagged.id, ...filler], 'T');
    mount(<SessionScreen />);
    expect(principleRows()).toEqual([]);
  });

  it('hides in the first set', () => {
    startFromIds('cisa', [tagged.id, ...filler], 'T', { firstSet: true, timed: false });
    mount(<SessionScreen />);
    pickBy(false);
    press('Check answer');
    expect(principleRows()).toEqual([]);
  });

  it('hides inside a set started from that same principle', () => {
    startFromIds('cisa', [tagged.id, ...filler], principle.title);
    mount(<SessionScreen />);
    pickBy(false);
    press('Check answer');
    expect(principleRows()).toEqual([]);
  });

  it('hides for an untagged question', () => {
    answerFirst([untagged.id, ...filler], false);
    expect(principleRows()).toEqual([]);
    expect(root().findAll((n) => n.props.testID === 'answer-principle-row')).toEqual([]);
  });
});

describe('mock exams', () => {
  it('never show the row: not while answering, not in the Results review', () => {
    startMock('cisa', 3);
    // Put the tagged question first, so the test does not hang on the random draw.
    const s = useSession.getState().active!;
    const ids = [tagged.id, ...s.questionIds.filter((id) => id !== tagged.id).slice(0, 2)];
    act(() => {
      useSession.setState({ active: { ...s, questionIds: ids, perms: { ...s.perms, [tagged.id]: identityPermutation(tagged) } } });
    });
    mount(<SessionScreen />);
    pickBy(false);
    expect(principleRows()).toEqual([]);
    act(() => {
      r?.unmount();
    });
    act(() => {
      finishSession({ celebrate: false });
    });
    mount(<Results />);
    expect(principleRows()).toEqual([]);
  });
});

describe('the 21st principle, fit-method-to-objective', () => {
  const fit = findPrinciple('cisa', 'fit-method-to-objective')!;

  it('is in the Principles list and opens', () => {
    mount(<PrinciplesHome />);
    expect(textOf(root())).toContain(fit.title);
    expect(textOf(root())).toContain(fit.rule);
  });

  it('its page renders, with the full count of questions that test it', () => {
    mockParams = { id: fit.id };
    mount(<PrincipleScreen />);
    const t = textOf(root());
    expect(t).toContain(fit.title);
    const n = questionsForPrinciple('cisa', fit).length;
    expect(n).toBeGreaterThan(fit.practiceIds.length);
    expect(t).toContain(`${n} questions on this idea.`);
    press('Practice this principle');
    const active = useSession.getState().active!;
    expect(active.questionIds).toHaveLength(Math.min(10, n));
  });
});
