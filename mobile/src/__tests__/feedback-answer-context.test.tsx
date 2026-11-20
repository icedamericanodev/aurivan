import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { getAllQuestions } from '../content/loader';
import { AnswerContext, QuestionRecap, type RecapChoice } from '../components/quiz';
import { displayToOriginal, renderText, type Permutation } from '../engine/shuffle';
import { startFromIds, startMock } from '../lib/sessions';
import { finishSession } from '../lib/finishSession';
import { useSession } from '../store/session';
import SessionScreen from '../app/session';
import Results from '../app/results';
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
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true), canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: jest.fn(), selection: jest.fn(), error: jest.fn(), light: jest.fn() } }));
jest.mock('../lib/a11y', () => ({ ...jest.requireActual('../lib/a11y'), moveFocus: jest.fn() }));

const q = getAllQuestions('cisa').find(q => q.id === 'd1_002')!;
const perm: Permutation = ['A', 'D', 'B', 'C'];
const textOf = (n: ReactTestInstance | string): string => typeof n === 'string' ? n : n.children.map(textOf).join(' ');
let tree: ReactTestRenderer;
afterEach(() => { act(() => tree?.unmount()); });

it.each(['A', 'B', 'C', 'D', undefined] as const)('keeps reported shuffled wording and every rationale with pick %s', picked => {
  act(() => { tree = create(<AnswerContext question={q} perm={perm} picked={picked} />); });
  const rows = tree.root.findAll(n => typeof n.type === 'string' && /^answer-context-[A-D]$/.test(n.props.testID ?? ''));
  expect(rows.map(n => n.props.testID)).toEqual(['answer-context-A', 'answer-context-B', 'answer-context-C', 'answer-context-D']);
  rows.forEach((row, i) => {
    const original = perm[i];
    const letter = ['A', 'B', 'C', 'D'][i];
    const best = original === q.correct;
    const caption = best ? (letter === picked ? 'Your answer · the best' : 'Best answer') : letter === picked ? 'Your answer · not the best' : 'Not the best';
    const spoken = `${letter}, ${caption}: ${q.options[original]}`;
    expect(row.findAll(n => typeof n.type === 'string' && n.props.accessibilityLabel === spoken)).toHaveLength(1);
    expect(textOf(row)).toContain(`${letter} · ${best ? '✓' : '✗'} ${caption}`);
    expect(textOf(row)).toContain(q.options[original]);
    expect(textOf(row)).toContain(renderText(original === q.correct ? q.explanation : q.wrongExplanations[original], perm));
    expect(textOf(row)).not.toMatch(/\{\{[A-D]\}\}/);
  });
});

// Phone 2.2 (owner direction, 19 Nov 2026): the practice answer no longer lists every option's reason
// ("Compare all options"). The question and its four options are on request, under "Show question &
// options", still built from the session's SAVED shuffle, so the reported wording stays under the
// letter it had. The recap is handed NO reasons (they are on the look-back page and in mock review).
it('practice never mounts the full comparison; nothing about the answer is in the tree until Check answer', () => {
  startFromIds('cisa', [q.id], 'Feedback regression');
  act(() => { tree = create(<SessionScreen />); });
  const revealed = () => tree.root.findAll(n => typeof n.props.testID === 'string' && /^(answer-context|recap-|question-recap)/.test(n.props.testID));
  expect(tree.root.findAllByType(AnswerContext)).toHaveLength(0);
  expect(tree.root.findAllByType(QuestionRecap)).toHaveLength(0);
  expect(revealed()).toHaveLength(0);
  const option = tree.root.findAll(n => n.props.letter === 'D' && typeof n.props.onPress === 'function' && n.props.state !== undefined)[0];
  act(() => option.props.onPress());
  expect(tree.root.findAllByType(AnswerContext)).toHaveLength(0);
  expect(tree.root.findAllByType(QuestionRecap)).toHaveLength(0);
  expect(revealed()).toHaveLength(0);
  const check = tree.root.findAll(n => n.props.accessibilityLabel === 'Check answer' && typeof n.props.onPress === 'function')[0];
  act(() => check.props.onPress());
  // Checked: still no inline comparison in practice (it lives in mock review only).
  expect(tree.root.findAllByType(AnswerContext)).toHaveLength(0);
  expect(textOf(tree.root)).not.toContain('Compare all options');
  // The recap holds every choice instead, mapped through the saved permutation, and starts closed.
  const saved = useSession.getState().active!.perms[q.id];
  const choices = tree.root.findByType(QuestionRecap).props.choices as RecapChoice[];
  expect(choices.map(c => c.letter)).toEqual(['A', 'B', 'C', 'D']);
  choices.forEach(c => {
    const original = displayToOriginal(c.letter, saved);
    expect(c.text).toBe(q.options[original]);
    expect(c.best).toBe(original === q.correct);
    expect(c.pick).toBe(c.letter === 'D');
    // Exactly these four fields: the screen passes the recap no reason for any option.
    expect(Object.keys(c).sort()).toEqual(['best', 'letter', 'pick', 'text']);
  });
  expect(choices.filter(c => c.best)).toHaveLength(1);
  expect(tree.root.findAll(n => n.props.testID === 'recap-choices')).toHaveLength(0);
});

it('keeps an active mock private, including when Results is opened early; finished skipped questions get context', () => {
  startMock('cisa', 3);
  act(() => { tree = create(<SessionScreen />); });
  expect(tree.root.findAllByType(AnswerContext)).toHaveLength(0);
  act(() => tree.unmount());
  act(() => { tree = create(<Results />); });
  expect(tree.root.findAllByType(AnswerContext)).toHaveLength(0);
  act(() => tree.unmount());
  finishSession({ celebrate: false });
  act(() => { tree = create(<Results />); });
  const review = tree.root.findAll(n => n.props.accessibilityLabel === 'Question 1, Skipped.' && typeof n.props.onPress === 'function')[0];
  act(() => review.props.onPress());
  expect(tree.root.findAllByType(AnswerContext)).toHaveLength(1);
  const active = useSession.getState().active!;
  expect(tree.root.findByType(AnswerContext).props.perm).toEqual(active.perms[active.questionIds[0]]);
});
