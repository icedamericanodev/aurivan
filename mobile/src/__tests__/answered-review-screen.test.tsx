/**
 * Look back at an answered question (mobile 2.2): the read-only page
 * (app/answered/[id].tsx) and the Question bank's Answered filter.
 *
 * What these tests prove, in plain English:
 *  - the page shows, in this order, the last result and its date, the whole
 *    question, ONE switch ("Show why the other options are wrong", closed on
 *    every visit), the options in ORIGINAL A to D order with the best answer
 *    marked, the Key idea, the tips, "Why B" whole, and a line saying the
 *    explanations are the latest version;
 *  - the switch comes BEFORE the rows (on screen and for a screen reader), so
 *    the reasons appear after the control that reveals them;
 *  - a WRONG option's reason is NOT on the page until that switch is pressed
 *    (the one exception: a saved miss pick's own "Why not B"). The BEST
 *    answer's reason is never under its row: it is "Why B", once, lower down;
 *  - it NEVER says which option the learner picked, except for a miss whose
 *    pick the Mistake journal kept for that same attempt (both branches,
 *    seeded through the real store, the way the session screen writes them).
 *    After any other miss it says the pick was not saved; after a right answer
 *    it says nothing about the pick;
 *  - the old "Compare all options" list (AnswerContext) is not on this page;
 *    mock review still has it;
 *  - opening, scrolling, expanding and leaving it changes NOTHING in the
 *    progress, session or settings stores, and saves nothing to the phone;
 *  - only the "Practice this question" button starts a session, and it asks
 *    first when another session is paused;
 *  - a bad link, an unanswered question or a question in an unsubmitted mock
 *    gets a calm empty screen, and the mock one leaks no answer;
 *  - in the bank, an Answered row opens this page; every other filter still
 *    starts a one-question practice.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Dimensions, StyleSheet } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import AnsweredQuestion, { LOOK_BACK_TITLE, PRACTICE_THIS_LABEL } from '../app/answered/[id]';
import BankDomain, { ANSWERED_HELP } from '../app/bank/[domain]';
import Results from '../app/results';
import { AnswerContext, OptionsWithWhy, TIPS_HEADING, WHY_FOLD_CHARS, type OptionWithWhy } from '../components/quiz';
import { CERTIFICATIONS } from '../content/certifications';
import { findQuestion, getAllQuestions, getDomainQuestions, hasContent } from '../content/loader';
import { REWRITTEN_QUESTIONS } from '../content/rewrittenQuestions';
import { LETTERS, type Letter, type PackQuestion } from '../content/types';
import { CURRENT_EXPLANATIONS_LINE, LAST_CORRECT_LINE, LAST_MISSED_LINE, PICK_NOT_SAVED_LINE, READ_ONLY_LINE } from '../engine/answeredReview';
import { dropRewritten } from '../engine/rewrittenQuestions';
import { identityPermutation, renderText } from '../engine/shuffle';
import { finishSession } from '../lib/finishSession';
import { haptic } from '../lib/haptics';
import { startFromIds, startMock } from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { light } from '../theme/tokens';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
// The route's params, set by each test (a link can put anything in `id`).
const mockRoute = { params: {} as Record<string, unknown> };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), canDismiss: () => false, dismissTo: jest.fn() },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => mockRoute.params,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: jest.fn(), selection: jest.fn(), error: jest.fn(), light: jest.fn() } }));
// The real bank, plus one made-up question with a long scenario (the bank has none to fold open).
const mockExtra: Record<string, unknown> = {};
jest.mock('../content/loader', () => {
  const actual = jest.requireActual('../content/loader');
  return { ...actual, findQuestion: (certId: string, id: string) => (certId === 'cisa' && Object.prototype.hasOwnProperty.call(mockExtra, id) ? mockExtra[id] : actual.findQuestion(certId, id)) };
});

// ── Questions from the real bank ────────────────────────────────────────
const bank = getAllQuestions('cisa');
const fourOptions = (q: PackQuestion) => LETTERS.every((l) => typeof q.options[l] === 'string');
/** The full v2 tip set, a key idea, a long explanation (it would fold on the answer screen) and a reason for every wrong option. */
const rich = bank.find(
  (q) =>
    fourOptions(q) &&
    q.keyConcept &&
    q.tips.length === 3 &&
    q.tips.some((t) => t.startsWith('Eliminate:')) &&
    q.tips.some((t) => t.startsWith('Final two:')) &&
    q.tips.some((t) => t.startsWith('Exam cue:')) &&
    q.explanation.length > WHY_FOLD_CHARS &&
    LETTERS.filter((l) => l !== q.correct).every((l) => q.wrongExplanations[l]),
)!;
/** A made-up question with a long scenario, so "Read full scenario" can be opened. */
const SCENARIO = `${'An auditor reviews a payment system after a change. '.repeat(6)}The last control was never tested.`;
const withScenario: PackQuestion = { ...rich, id: 'test_scenario_1', scenario: SCENARIO };
mockExtra[withScenario.id] = withScenario;
const wrongLetter = (q: PackQuestion): Letter => LETTERS.find((l) => l !== q.correct)!;
/** An option's reason as the page prints it (ORIGINAL order, so `{{B}}` reads "B"). */
const reasonOf = (q: PackQuestion, l: Letter) => renderText(l === q.correct ? q.explanation : q.wrongExplanations[l]!, identityPermutation(q));

// 6 Oct 2026, 10:00 local: the page should print "6 Oct 2026".
const T0 = new Date(2026, 9, 6, 10, 0, 0).getTime();
const DAY = 86_400_000;

// ── Harness ─────────────────────────────────────────────────────────────
let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const unmount = () => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
};
const root = () => r!.root;
const textOf = (n: ReactTestInstance | string): string => (typeof n === 'string' ? n : n.children.map(textOf).join(' '));
const allText = () => textOf(root());
/** Everything a screen reader could say on the page. */
const allSpoken = () =>
  root()
    .findAll((n) => typeof n.props.accessibilityLabel === 'string' || typeof n.props.accessibilityHint === 'string')
    .map((n) => `${n.props.accessibilityLabel ?? ''} ${n.props.accessibilityHint ?? ''}`)
    .join(' | ');
const byTestID = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.type === 'string');
const btn = (label: string) =>
  root().findAll((n) => (n.props.label === label || n.props.accessibilityLabel === label) && typeof n.props.onPress === 'function')[0];
/** Everything on the page that can be tapped (the outermost part of each, so one tap is one tap). */
const tappables = () => {
  const inside = (n: ReactTestInstance) => {
    for (let p = n.parent; p; p = p.parent) if (typeof p.props.onPress === 'function') return true;
    return false;
  };
  return root().findAll((n) => typeof n.props.onPress === 'function' && !inside(n));
};
const press = (label: string) => {
  const b = btn(label);
  if (!b) throw new Error(`no button "${label}"`);
  act(() => {
    b.props.onPress();
  });
};
const open = (id: unknown) => {
  mockRoute.params = { id };
  mount(<AnsweredQuestion />);
};
// The switch above the options, and the letters whose reason is in the tree right now.
const WHY_SHOW = 'Show why the other options are wrong';
const WHY_HIDE = 'Hide why the other options are wrong';
const whySwitch = () => byTestID('recap-why-toggle');
const openReasons = () => LETTERS.filter((l) => byTestID(`recap-why-${l}`).length > 0);
/** The switch, the rows and the open reasons, in tree order (which is the order a screen reader reads them in). */
const optionOrder = () =>
  root()
    .findAll((n) => typeof n.type === 'string' && /^recap-(why-toggle|choice-[A-D]|why-[A-D])$/.test(n.props.testID ?? ''))
    .map((n) => n.props.testID as string);
/** The best answer's reason is on the page once ("Why B", lower down) and never under its own row. */
const bestReasonOnlyBelow = (q: PackQuestion) => {
  expect(byTestID(`recap-why-${q.correct}`)).toHaveLength(0);
  const row = byTestID(`recap-choice-${q.correct}`)[0];
  expect(textOf(row)).not.toContain(reasonOf(q, q.correct));
  expect(textOf(row)).not.toMatch(/Why/);
  expect(row.findAll((n) => typeof n.type === 'string' && n.props.accessible === true)).toHaveLength(1);
  expect(times(allText(), reasonOf(q, q.correct))).toBe(1);
  expect(allSpoken()).not.toContain(`Why ${q.correct}: `);
  expect(allText().match(/Why [A-D]\b/g)).toEqual([`Why ${q.correct}`]);
};
/** How many times `part` is in `whole`. */
const times = (whole: string, part: string) => whole.split(part).length - 1;

/** Answer the way the session screen does: the answer first, then (after a miss) the Mistake journal entry. */
function answer(id: string, correct: boolean, picked?: Letter) {
  const p = useProgress.getState();
  p.recordAnswer('cisa', id, correct);
  if (!correct) useProgress.getState().recordMistake('cisa', id, picked);
}

/** A deep copy of everything the stores hold (their actions drop out), to compare before and after. */
const snapshot = () =>
  JSON.parse(
    JSON.stringify({
      progress: useProgress.getState(),
      session: useSession.getState(),
      settings: useSettings.getState(),
      seen: useSeen.getState(),
    }),
  );

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(T0);
  jest.mocked(router.push).mockClear();
  jest.mocked(router.back).mockClear();
  jest.mocked(router.replace).mockClear();
  jest.mocked(haptic.selection).mockClear();
  useSettings.setState({ activeCertId: 'cisa', theme: 'light', shuffleOptions: true });
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  mockRoute.params = {};
});
afterEach(() => {
  unmount();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ── What the page shows ─────────────────────────────────────────────────
describe('the look-back page', () => {
  it('shows the question, the options in ORIGINAL order, the best answer, the key idea, the tips and the best answer’s explanation', () => {
    answer(rich.id, true);
    open(rich.id);
    const t = allText();
    expect(t).toContain(LOOK_BACK_TITLE);
    expect(t).toContain(rich.stem);
    // Original order A, B, C, D: each row holds that ORIGINAL letter's own wording (no shuffle is made up).
    const rows = LETTERS.map((l) => byTestID(`recap-choice-${l}`)[0]);
    rows.forEach((row, i) => expect(textOf(row)).toContain(rich.options[LETTERS[i]]!));
    const order = LETTERS.map((l) => t.indexOf(rich.options[l]!));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // The best answer is marked, once, on the right row; no other row has a caption ("Not the best" is gone).
    expect(textOf(byTestID(`recap-choice-${rich.correct}`)[0])).toContain('✓ Best answer');
    expect(t.match(/Best answer/g)).toHaveLength(1);
    expect(t).not.toMatch(/Not the best/i);
    expect(t).not.toContain('Compare all options');
    // Each row is one screen-reader stop that says its letter and its words.
    for (const l of LETTERS) {
      const said = l === rich.correct ? `${l}, best answer: ${rich.options[l]}` : `${l}: ${rich.options[l]}`;
      expect(root().findAll((n) => n.props.accessible === true && n.props.accessibilityLabel === said && typeof n.type === 'string')).toHaveLength(1);
    }
    // The best answer's explanation, whole (a long one: the answer screen would fold it), under a "Why B" heading.
    expect(rich.explanation.length).toBeGreaterThan(WHY_FOLD_CHARS);
    const whyHead = root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'header' && textOf(n).trim() === `Why ${rich.correct}`);
    expect(whyHead).toHaveLength(1);
    const whyText = root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityLabel === reasonOf(rich, rich.correct));
    expect(whyText).toHaveLength(1);
    expect(whyText[0].props.numberOfLines).toBeUndefined();
    expect(allSpoken()).not.toMatch(/Read more/);
    expect(t).not.toContain('Read more');
    // The Key idea and the three tips.
    expect(t).toContain('Key idea');
    expect(t).toContain(rich.keyConcept!);
    for (const label of ['Eliminate two', 'Final two', 'Exam cue']) expect(t).toContain(label);
    expect(root().findAll((n) => n.props.testID === 'answer-tip-row' && typeof n.type === 'string')).toHaveLength(3);
    // The explanations are today's, and the page says so; it also says it changes nothing.
    expect(t).toContain(CURRENT_EXPLANATIONS_LINE);
    expect(t).toContain(READ_ONLY_LINE);
    // No {{B}} token left in what is shown.
    expect(t).not.toMatch(/\{\{[A-D]\}\}/);
  });

  it('the order: question, the why switch, options, Key idea, tips, Why best, then the latest-version line', () => {
    answer(rich.id, true);
    open(rich.id);
    const t = allText();
    const parts = [
      LAST_CORRECT_LINE,
      READ_ONLY_LINE,
      rich.stem,
      WHY_SHOW,
      ...LETTERS.map((l) => rich.options[l]!),
      'Key idea',
      rich.keyConcept!,
      TIPS_HEADING,
      'Exam cue',
      `Why ${rich.correct}`,
      reasonOf(rich, rich.correct),
      CURRENT_EXPLANATIONS_LINE,
      PRACTICE_THIS_LABEL,
    ];
    // Each part is on the page exactly once (so its place is not in doubt), and they come in this order.
    for (const part of parts) expect([part, times(t, part)]).toEqual([part, 1]);
    const at = parts.map((part) => t.indexOf(part));
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    // The caption over the stem is a heading, in the quiet ink (the answer screen's), not the accent.
    const caption = root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'header' && textOf(n).trim() === 'Question');
    expect(caption).toHaveLength(1);
    expect(StyleSheet.flatten(caption[0].props.style).color).toBe(light.ink2);
    expect(light.ink2).not.toBe(light.accentText);
  });

  it('the switch comes BEFORE the rows in the tree: a screen reader reaches it, then each row and its reason', () => {
    answer(rich.id, true);
    open(rich.id);
    const rowIds = LETTERS.map((l) => `recap-choice-${l}`);
    // Closed: the switch, then the four rows.
    expect(optionOrder()).toEqual(['recap-why-toggle', ...rowIds]);
    // Open: the switch is still first; each wrong row is followed by its own reason, the best row by none.
    press(WHY_SHOW);
    expect(optionOrder()).toEqual(['recap-why-toggle', ...LETTERS.flatMap((l) => (l === rich.correct ? [`recap-choice-${l}`] : [`recap-choice-${l}`, `recap-why-${l}`]))]);
    // The switch is a sibling above the list, not inside it, and it is still above the Key idea.
    expect(byTestID('recap-choices')[0].findAll((n) => n.props.testID === 'recap-why-toggle')).toHaveLength(0);
    const t = allText();
    expect(t.indexOf(WHY_HIDE)).toBeGreaterThan(t.indexOf(rich.stem));
    expect(t.indexOf(WHY_HIDE)).toBeLessThan(t.indexOf(rich.options.A!));
  });

  it('the wrong options\' reasons are NOT on the page until "Show why the other options are wrong" is pressed; closed again on every visit', () => {
    answer(rich.id, true);
    open(rich.id);
    const wrong = LETTERS.filter((l) => l !== rich.correct);
    // Closed: a button that says so, and no option's reason anywhere a reader or a screen reader could find it.
    expect(whySwitch()).toHaveLength(1);
    expect(whySwitch()[0].props.accessibilityRole).toBe('button');
    expect(whySwitch()[0].props.accessibilityLabel).toBe(WHY_SHOW);
    expect(whySwitch()[0].props.accessibilityState).toMatchObject({ expanded: false });
    expect(textOf(whySwitch()[0]).trim()).toBe(WHY_SHOW);
    expect(openReasons()).toEqual([]);
    expect(allText()).not.toContain('Why not');
    for (const l of wrong) {
      expect(allText()).not.toContain(reasonOf(rich, l));
      expect(allSpoken()).not.toContain(reasonOf(rich, l));
    }
    // The best answer's reason is on the page already, once, as "Why B" lower down (never under its row).
    bestReasonOnlyBelow(rich);
    // Pressed: every WRONG option has its own reason under it, as "Why not X". The best row gets none.
    press(WHY_SHOW);
    expect(whySwitch()[0].props.accessibilityLabel).toBe(WHY_HIDE);
    expect(whySwitch()[0].props.accessibilityState).toMatchObject({ expanded: true });
    expect(textOf(whySwitch()[0]).trim()).toBe(WHY_HIDE);
    expect(openReasons()).toEqual(wrong);
    expect(allText().match(/Why not [A-D]\b/g)).toEqual(wrong.map((l) => `Why not ${l}`));
    bestReasonOnlyBelow(rich);
    for (const l of wrong) {
      const reason = byTestID(`recap-why-${l}`)[0];
      expect(reason.props.accessibilityLabel).toBe(`Why not ${l}: ${reasonOf(rich, l)}`);
      expect(reason.props.accessibilityRole).toBeUndefined(); // one more stop, never a heading
      expect(textOf(byTestID(`recap-choice-${l}`)[0])).toContain(reasonOf(rich, l));
    }
    // Pressed again: gone again.
    press(WHY_HIDE);
    expect(openReasons()).toEqual([]);
    bestReasonOnlyBelow(rich);
    // Left open, then the page is opened again: closed.
    press(WHY_SHOW);
    expect(openReasons()).toEqual(wrong);
    unmount();
    open(rich.id);
    expect(whySwitch()[0].props.accessibilityState).toMatchObject({ expanded: false });
    expect(openReasons()).toEqual([]);
  });

  it('the old "Compare all options" list is not on this page; mock review still has it', () => {
    answer(rich.id, false, wrongLetter(rich));
    open(rich.id);
    expect(root().findAllByType(AnswerContext)).toHaveLength(0);
    expect(root().findAll((n) => typeof n.props.testID === 'string' && n.props.testID.startsWith('answer-context'))).toHaveLength(0);
    expect(byTestID('recap-choices')).toHaveLength(1);
    unmount();

    // A submitted mock, one question opened in its review: the full list, as before.
    startMock('cisa', 10);
    act(() => finishSession({ celebrate: false }));
    mockRoute.params = {};
    mount(<Results />);
    const first = root().findAll((n) => n.props.accessibilityLabel === 'Question 1, Skipped.' && typeof n.props.onPress === 'function')[0];
    act(() => first.props.onPress());
    expect(root().findAllByType(AnswerContext)).toHaveLength(1);
    expect(allText()).toContain('Compare all options');
  });

  it('the last result and its date come from the saved answer', () => {
    answer(rich.id, true);
    open(rich.id);
    expect(allText()).toContain(LAST_CORRECT_LINE);
    expect(allText()).toContain('6 Oct 2026');
    expect(allText()).toContain('Answered once');
    // One screen-reader stop, a heading, with the date said in full.
    const head = byTestID('look-back-result')[0];
    expect(head.props.accessibilityRole).toBe('header');
    expect(head.props.accessibilityLabel).toBe(`${LAST_CORRECT_LINE}, 6 October 2026. Answered once.`);
    unmount();

    // Two days later: a miss. The count is the learner's own.
    jest.setSystemTime(T0 + 2 * DAY);
    answer(rich.id, false, wrongLetter(rich));
    open(rich.id);
    expect(allText()).toContain(LAST_MISSED_LINE);
    expect(allText()).not.toContain(LAST_CORRECT_LINE);
    expect(allText()).toContain('8 Oct 2026');
    expect(allText()).toContain('Answered 2 times, 1 correct');
  });

  it('never shows the size of the bank or of a domain', () => {
    answer(rich.id, true);
    open(rich.id);
    const sizes = [bank.length, ...CERTIFICATIONS[0].domains.map((d) => getDomainQuestions('cisa', d.id).length)];
    // The page's own words (not the question's): the header, the result block and the notes.
    const own = `${textOf(byTestID('look-back-result')[0])} ${allSpoken()}`;
    for (const n of sizes) expect(own).not.toMatch(new RegExp(`\\b${n}\\b`));
    expect(allText()).not.toMatch(/\bof \d+\b/);
  });

  it('holds together at 200% text, in dark', () => {
    const w = Dimensions.get('window');
    act(() => Dimensions.set({ window: { ...w, fontScale: 2 }, screen: { ...w, fontScale: 2 } }));
    useSettings.setState({ theme: 'dark' });
    answer(rich.id, false, wrongLetter(rich));
    open(rich.id);
    expect(allText()).toContain(LAST_MISSED_LINE);
    expect(byTestID('recap-choices')).toHaveLength(1);
    for (const l of LETTERS) expect(byTestID(`recap-choice-${l}`)).toHaveLength(1);
    // Every pressable on the page has a role and a name.
    expect(tappables().length).toBeGreaterThanOrEqual(3); // Back, the why switch and "Practice this question"
    for (const n of tappables()) {
      expect(n.findAll((x) => x.props.accessibilityRole === 'button').length).toBeGreaterThan(0);
    }
    // The switch keeps its 48pt target; opened, each reason lines up with the words (the letter badge
    // sits above them at this size, so no indent is left over from the side-by-side layout).
    expect(Number(StyleSheet.flatten(whySwitch()[0].props.style).minHeight)).toBeGreaterThanOrEqual(48);
    press(WHY_SHOW);
    expect(openReasons()).toHaveLength(3);
    for (const l of openReasons()) expect(StyleSheet.flatten(byTestID(`recap-why-${l}`)[0].props.style).marginLeft).toBe(0);
    act(() => Dimensions.set({ window: w, screen: w }));
  });
});

// ── Rule: never infer the learner's pick ────────────────────────────────
describe('the learner’s pick', () => {
  const yourAnswer = /your (answer|pick)/i;

  it('a RIGHT answer: no option is called "Your answer", and the page says nothing about a pick "not saved"', () => {
    answer(rich.id, true);
    open(rich.id);
    expect(allText()).toContain(LAST_CORRECT_LINE);
    // Beside "Last time: correct" the not-saved line read as an error: it is not there, shown or spoken.
    expect(allText()).not.toContain(PICK_NOT_SAVED_LINE);
    expect(allSpoken()).not.toContain(PICK_NOT_SAVED_LINE);
    expect(allText()).not.toMatch(/not saved|saved your result/i);
    expect(allText()).not.toMatch(yourAnswer);
    expect(allSpoken()).not.toMatch(yourAnswer);
    expect(byTestID('tip-pick-chip')).toHaveLength(0);
    // The same with the wrong options' reasons open: still no "Your answer".
    press(WHY_SHOW);
    expect(openReasons()).toEqual(LETTERS.filter((l) => l !== rich.correct));
    expect(allText()).not.toMatch(yourAnswer);
    expect(allSpoken()).not.toMatch(yourAnswer);
    expect(allText()).not.toContain(PICK_NOT_SAVED_LINE);
  });

  it('a MISS the Mistake journal kept for the same attempt: that option, and only that one, is "Your answer"', () => {
    const picked = wrongLetter(rich);
    answer(rich.id, false, picked);
    // How the store wrote the two: the same attempt.
    const cp = selectCert(useProgress.getState(), 'cisa');
    expect(cp.mistakes[rich.id].at - cp.answers[rich.id].lastAt).toBe(0);
    open(rich.id);
    const row = byTestID(`recap-choice-${picked}`)[0];
    expect(textOf(row)).toContain('✗ Your answer');
    expect(textOf(row)).toContain(rich.options[picked]!);
    expect(allText().match(/Your answer/g)).toHaveLength(1);
    expect(root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityLabel === `${picked}, your answer, not the best: ${rich.options[picked]}`)).toHaveLength(1);
    expect(allText()).not.toContain(PICK_NOT_SAVED_LINE);
    // The best answer is still marked as the best, not as theirs.
    expect(textOf(byTestID(`recap-choice-${rich.correct}`)[0])).toContain('✓ Best answer');
    expect(textOf(byTestID(`recap-choice-${rich.correct}`)[0])).not.toMatch(yourAnswer);
    expect(allText()).toContain(LAST_MISSED_LINE);
  });

  it('a saved miss pick: its own "Why not" is open while the switch is closed, and the switch shows the rest', () => {
    const picked = wrongLetter(rich);
    answer(rich.id, false, picked);
    open(rich.id);
    // The switch is closed, yet the pick's reason is there, in its own row, as on the answer card.
    expect(whySwitch()[0].props.accessibilityState).toMatchObject({ expanded: false });
    expect(openReasons()).toEqual([picked]);
    expect(byTestID(`recap-why-${picked}`)[0].props.accessibilityLabel).toBe(`Why not ${picked}: ${reasonOf(rich, picked)}`);
    expect(textOf(byTestID(`recap-choice-${picked}`)[0])).toContain(reasonOf(rich, picked));
    // No other wrong option's reason yet.
    for (const l of LETTERS.filter((x) => x !== picked && x !== rich.correct)) expect(allText()).not.toContain(reasonOf(rich, l));
    expect(allText().match(/Why not/g)).toHaveLength(1);
    // The switch is above the rows, and the pick's open reason sits under its own row.
    expect(optionOrder()).toEqual(['recap-why-toggle', ...LETTERS.flatMap((l) => (l === picked ? [`recap-choice-${l}`, `recap-why-${l}`] : [`recap-choice-${l}`]))]);
    bestReasonOnlyBelow(rich);
    // The switch reveals the other WRONG options' reasons (never one under the best row); closing it
    // leaves the pick's own reason where it was.
    press(WHY_SHOW);
    expect(openReasons()).toEqual(LETTERS.filter((l) => l !== rich.correct));
    bestReasonOnlyBelow(rich);
    press(WHY_HIDE);
    expect(openReasons()).toEqual([picked]);
    expect(whySwitch()[0].props.accessibilityLabel).toBe(WHY_SHOW);
  });

  it('a MISS with no journal entry: "not saved", once, right above the switch, and every reason closed', () => {
    useProgress.getState().recordAnswer('cisa', rich.id, false);
    open(rich.id);
    const t = allText();
    expect(t).toContain(LAST_MISSED_LINE);
    expect(times(t, PICK_NOT_SAVED_LINE)).toBe(1);
    // Its place: after the question, directly above the switch (nothing between the two), and the
    // switch directly above the rows (so the line never comes between the switch and what it opens).
    expect(t.indexOf(PICK_NOT_SAVED_LINE)).toBeGreaterThan(t.indexOf(rich.stem));
    expect(t.indexOf(WHY_SHOW)).toBeGreaterThan(t.indexOf(PICK_NOT_SAVED_LINE));
    expect(t.slice(t.indexOf(PICK_NOT_SAVED_LINE) + PICK_NOT_SAVED_LINE.length, t.indexOf(WHY_SHOW)).trim()).toBe('');
    expect(t.slice(t.indexOf(WHY_SHOW) + WHY_SHOW.length, t.indexOf(rich.options.A!)).trim()).toBe('A');
    expect(t.indexOf('Key idea')).toBeGreaterThan(t.indexOf(rich.options.D!));
    expect(optionOrder()).toEqual(['recap-why-toggle', ...LETTERS.map((l) => `recap-choice-${l}`)]);
    // No pick is known, so no reason is open and no row is "Your answer".
    expect(whySwitch()[0].props.accessibilityState).toMatchObject({ expanded: false });
    expect(openReasons()).toEqual([]);
    expect(t).not.toContain('Why not');
    expect(t).not.toMatch(yourAnswer);
    expect(allSpoken()).not.toMatch(yourAnswer);
    // The line stays (once) with the wrong options' reasons open; the best row still has none.
    press(WHY_SHOW);
    expect(openReasons()).toEqual(LETTERS.filter((l) => l !== rich.correct));
    bestReasonOnlyBelow(rich);
    expect(times(allText(), PICK_NOT_SAVED_LINE)).toBe(1);
    expect(allText()).not.toMatch(yourAnswer);
  });

  it('a MISS whose journal entry is from an OLDER attempt: not saved (the old pick is never reused)', () => {
    answer(rich.id, false, wrongLetter(rich));
    // A later miss that left the old journal entry as it was.
    jest.setSystemTime(T0 + DAY);
    useProgress.getState().recordAnswer('cisa', rich.id, false);
    open(rich.id);
    expect(allText()).toContain(PICK_NOT_SAVED_LINE);
    expect(allText()).not.toMatch(yourAnswer);
    expect(openReasons()).toEqual([]); // the old pick's reason is not opened either
  });

  it('a right answer after a miss: the old pick is never shown as this answer’s', () => {
    answer(rich.id, false, wrongLetter(rich));
    jest.setSystemTime(T0 + DAY);
    answer(rich.id, true);
    open(rich.id);
    expect(allText()).toContain(LAST_CORRECT_LINE);
    // A right answer: nothing about the pick at all, and the old miss's reason is not opened.
    expect(allText()).not.toContain(PICK_NOT_SAVED_LINE);
    expect(allText()).not.toMatch(yourAnswer);
    expect(allSpoken()).not.toMatch(yourAnswer);
    expect(openReasons()).toEqual([]);
  });

  /** Start a mini mock and answer its first question wrong. Returns that question and the ORIGINAL letter picked. */
  function missInMock() {
    const s = startMock('cisa', 10)!;
    const qid = s.questionIds[0];
    const q = findQuestion('cisa', qid)!;
    const perm = s.perms[qid];
    const slot = perm.findIndex((l) => l !== q.correct);
    useSession.getState().answer(qid, { display: LETTERS[slot], correct: false });
    return { s, q, original: perm[slot] };
  }

  it('a mock submitted in time: the miss and its pick are one attempt, so the pick shows', () => {
    const { q, original } = missInMock();
    jest.setSystemTime(T0 + 5 * 60_000);
    act(() => finishSession({ celebrate: false }));
    open(q.id);
    expect(textOf(byTestID(`recap-choice-${original}`)[0])).toContain('✗ Your answer');
    expect(allText().match(/Your answer/g)).toHaveLength(1);
    expect(allText()).not.toContain(PICK_NOT_SAVED_LINE);
  });

  it('a mock recorded hours after its time ran out: the times cannot prove one attempt, so "not saved"', () => {
    const { s, q } = missInMock();
    jest.setSystemTime(s.deadline! + 3 * 3_600_000);
    act(() => finishSession({ celebrate: false }));
    const cp = selectCert(useProgress.getState(), 'cisa');
    expect(cp.answers[q.id].lastAt).toBe(s.deadline);
    expect(cp.mistakes[q.id].at).toBeGreaterThan(s.deadline!);
    open(q.id);
    expect(allText()).toContain(LAST_MISSED_LINE);
    expect(allText()).toContain(PICK_NOT_SAVED_LINE);
    expect(allText()).not.toMatch(yourAnswer);
  });
});

// ── The switch and its rows on their own (components/quiz.tsx OptionsWithWhy) ──
describe('the options with their "why" switch', () => {
  const four = (over: Partial<Record<Letter, Partial<OptionWithWhy>>> = {}): OptionWithWhy[] =>
    LETTERS.map((l) => ({ letter: l, text: `Option ${l}`, pick: false, best: l === 'B', why: l === 'B' ? 'B is best.' : `${l} is wrong.`, ...over[l] }));

  it('the switch only ever reveals WRONG options: a reason handed in for the best row is never shown', () => {
    mount(<OptionsWithWhy choices={four()} />);
    expect(optionOrder()).toEqual(['recap-why-toggle', 'recap-choice-A', 'recap-choice-B', 'recap-choice-C', 'recap-choice-D']);
    expect(allText()).not.toContain('B is best.');
    press(WHY_SHOW);
    expect(openReasons()).toEqual(['A', 'C', 'D']);
    expect(optionOrder()).toEqual(['recap-why-toggle', 'recap-choice-A', 'recap-why-A', 'recap-choice-B', 'recap-choice-C', 'recap-why-C', 'recap-choice-D', 'recap-why-D']);
    expect(allText()).not.toContain('B is best.');
    expect(allSpoken()).not.toContain('B is best.');
    expect(allSpoken()).not.toContain('Why B');
    // Even when the best row is asked to start open.
    unmount();
    mount(<OptionsWithWhy choices={four()} startWhyOpenFor={['B']} />);
    expect(openReasons()).toEqual([]);
    expect(allText()).not.toContain('B is best.');
  });

  it('a wrong option with no reason gets no empty stop', () => {
    mount(<OptionsWithWhy choices={four({ C: { why: undefined } })} />);
    press(WHY_SHOW);
    expect(openReasons()).toEqual(['A', 'D']);
    expect(byTestID('recap-choice-C')[0].findAll((n) => typeof n.type === 'string' && n.props.accessible === true)).toHaveLength(1);
  });

  it('when nothing is left to reveal, the switch hides itself', () => {
    // No wrong option has a reason (the best one's does not count: it is never shown here).
    mount(<OptionsWithWhy choices={four({ A: { why: undefined }, C: { why: undefined }, D: { why: undefined } })} />);
    expect(whySwitch()).toHaveLength(0);
    expect(LETTERS.map((l) => byTestID(`recap-choice-${l}`).length)).toEqual([1, 1, 1, 1]);
    expect(openReasons()).toEqual([]);
    unmount();
    // The only wrong reason is the saved pick's, already open.
    mount(<OptionsWithWhy choices={four({ A: { why: undefined }, C: { pick: true }, D: { why: undefined } })} startWhyOpenFor={['C']} />);
    expect(whySwitch()).toHaveLength(0);
    expect(openReasons()).toEqual(['C']);
    expect(byTestID('recap-why-C')[0].props.accessibilityLabel).toBe('Why not C: C is wrong.');
  });
});

// ── Rule: the page changes nothing ──────────────────────────────────────
describe('read-only', () => {
  /** Open, lay out, scroll, expand everything, wait, go back and leave. */
  function useThePage(id: string) {
    open(id);
    // Layout and scroll events, as a phone would send them.
    for (const n of root().findAll((x) => typeof x.props.onLayout === 'function')) {
      act(() => n.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 400 } } }));
    }
    for (const n of root().findAll((x) => typeof x.props.onScroll === 'function')) {
      act(() => n.props.onScroll({ nativeEvent: { contentOffset: { x: 0, y: 900 }, contentSize: { width: 360, height: 3000 }, layoutMeasurement: { width: 360, height: 700 } } }));
    }
    // Tap everything that can be tapped, except the one button that is allowed to start something.
    const taps = tappables().filter((x) => x.props.label !== PRACTICE_THIS_LABEL && x.props.accessibilityLabel !== PRACTICE_THIS_LABEL);
    expect(taps.length).toBeGreaterThanOrEqual(1); // at least Back
    const hadWhySwitch = whySwitch().length > 0;
    if (id === rich.id || id === withScenario.id) expect(hadWhySwitch).toBe(true);
    for (const n of taps) act(() => n.props.onPress({ nativeEvent: {} }));
    expect(router.back).toHaveBeenCalled(); // "leaving" by the Back button
    // "Show why the other options are wrong" really was opened (so that tap is covered too).
    if (hadWhySwitch) {
      expect(whySwitch()[0].props.accessibilityState).toMatchObject({ expanded: true });
      expect(openReasons().length).toBe(3);
    }
    // The long scenario really was folded open (so "expanding" is covered).
    if (id === withScenario.id) expect(allText()).toContain('The last control was never tested.');
    act(() => {
      jest.advanceTimersByTime(5 * 60_000);
    });
    unmount();
  }

  it('opening, scrolling, expanding and leaving changes no store and saves nothing', () => {
    const scenarioQ = withScenario;
    // A learner with history: right answers, misses (one tagged), a saved question, a review queue, a streak.
    const others = bank.filter((q) => q.id !== rich.id && q.id !== scenarioQ.id).slice(0, 6);
    answer(rich.id, false, wrongLetter(rich));
    answer(scenarioQ.id, true);
    others.forEach((q, i) => answer(q.id, i % 2 === 0, wrongLetter(q)));
    useProgress.getState().tagMistake('cisa', rich.id, 'misread');
    useProgress.getState().toggleBookmark('cisa', rich.id);
    // A paused practice session with one answer in it (not on the questions we open).
    const paused = startFromIds('cisa', others.slice(0, 3).map((q) => q.id), 'Paused set', { timed: true })!;
    useSession.getState().answer(paused.questionIds[0], { display: 'A', correct: false, ms: 4000 });
    useSession.getState().goTo(1);

    const before = snapshot();
    const refs = { byCert: useProgress.getState().byCert, streak: useProgress.getState().streak, today: useProgress.getState().today, active: useSession.getState().active };
    const writes = jest.mocked(AsyncStorage.setItem).mock.calls.length;
    const changes = { progress: jest.fn(), session: jest.fn(), settings: jest.fn() };
    const stop = [useProgress.subscribe(changes.progress), useSession.subscribe(changes.session), useSettings.subscribe(changes.settings)];

    useThePage(rich.id); // a miss with a saved pick
    useThePage(scenarioQ.id); // a right answer, with a long scenario to fold open
    useThePage('no_such_question'); // an empty state
    stop.forEach((f) => f());

    // Not one store change, not one write to the phone, and every value deep-equal.
    expect(changes.progress).not.toHaveBeenCalled();
    expect(changes.session).not.toHaveBeenCalled();
    expect(changes.settings).not.toHaveBeenCalled();
    expect(jest.mocked(AsyncStorage.setItem).mock.calls.length).toBe(writes);
    expect(snapshot()).toEqual(before);
    expect(useProgress.getState().byCert).toBe(refs.byCert);
    expect(useProgress.getState().streak).toBe(refs.streak);
    expect(useProgress.getState().today).toBe(refs.today);
    expect(useSession.getState().active).toBe(refs.active);
    // Spot checks in plain words: attempts, the review queue, the journal and the paused set.
    const cp = selectCert(useProgress.getState(), 'cisa');
    expect(cp.answers[rich.id].attempts).toBe(1);
    expect(cp.mistakes[rich.id].slip).toBe('misread');
    expect(Object.keys(cp.review).sort()).toEqual(Object.keys(before.progress.byCert.cisa.review).sort());
    expect(useSession.getState().active!.index).toBe(1);
    expect(useSession.getState().active!.startedAt).toBe(paused.startedAt);
    // No "new answer" buzz either, and no session screen was opened.
    expect(haptic.selection).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('a paused MOCK and its clock are untouched (the question opened is not in it)', () => {
    const mock = startMock('cisa', 10)!;
    const outside = bank.find((q) => !mock.questionIds.includes(q.id) && fourOptions(q))!;
    answer(outside.id, true);
    useSession.getState().answer(mock.questionIds[0], { display: 'A', correct: false });
    const before = snapshot();
    const active = useSession.getState().active;
    useThePage(outside.id);
    expect(snapshot()).toEqual(before);
    expect(useSession.getState().active).toBe(active);
    expect(useSession.getState().active!.deadline).toBe(mock.deadline);
    expect(useSession.getState().active!.finishedAt).toBeUndefined();
  });

  it('merely opening never starts a session; only the Practice button does', () => {
    answer(rich.id, true);
    const before = snapshot();
    open(rich.id);
    expect(useSession.getState().active).toBeNull();
    expect(router.push).not.toHaveBeenCalled();
    expect(snapshot()).toEqual(before);

    press(PRACTICE_THIS_LABEL);
    const s = useSession.getState().active!;
    expect(s.mode).toBe('practice');
    expect(s.questionIds).toEqual([rich.id]);
    expect(router.push).toHaveBeenCalledWith('/session');
    // Starting is not answering: the saved answer is still the old one.
    expect(snapshot().progress).toEqual(before.progress);
  });

  it('the Practice button asks before replacing a paused session', () => {
    answer(rich.id, true);
    const other = bank.find((q) => q.id !== rich.id)!;
    const paused = startFromIds('cisa', [other.id], 'Paused set')!;
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    open(rich.id);
    press(PRACTICE_THIS_LABEL);
    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert.mock.calls[0][0]).toBe('Replace your unfinished session?');
    // Nothing replaced until the learner says so.
    expect(useSession.getState().active!.id).toBe(paused.id);
    expect(router.push).not.toHaveBeenCalled();
  });
});

// ── Bad links and questions that can't be shown ─────────────────────────
describe('what can’t be opened', () => {
  const noAnswerShown = (q: PackQuestion) => {
    expect(byTestID('recap-choices')).toHaveLength(0);
    expect(whySwitch()).toHaveLength(0);
    expect(byTestID('answer-context')).toHaveLength(0);
    expect(allText()).not.toContain('Best answer');
    expect(allText()).not.toContain(q.explanation.slice(0, 40));
    expect(btn(PRACTICE_THIS_LABEL)).toBeUndefined();
  };

  it('an unknown, malformed or missing id: "Question not found", never a crash', () => {
    answer(rich.id, true);
    for (const id of ['no_such_question', 'constructor', '__proto__', 'toString', '', '%', '%E0%A4%A', '../session', undefined, ['a', 'b'], 42]) {
      open(id);
      expect(allText()).toContain('Question not found');
      expect(allText()).toContain(LOOK_BACK_TITLE);
      noAnswerShown(rich);
      unmount();
    }
  });

  it('an id from another exam is not found in this one', () => {
    const other = CERTIFICATIONS.find((c) => c.id !== 'cisa' && hasContent(c.id));
    const foreign = other ? getAllQuestions(other.id).find((q) => !findQuestion('cisa', q.id)) : undefined;
    // Its answer exists, but under the other exam: this exam has no such question.
    const id = foreign?.id ?? 'cc_d9_001';
    if (other && foreign) useProgress.getState().recordAnswer(other.id, id, true);
    open(id);
    expect(allText()).toContain('Question not found');
    if (other) useProgress.getState().resetCert(other.id);
  });

  it('a real question that was never answered, or only saved: "Not answered yet"', () => {
    open(rich.id);
    expect(allText()).toContain('Not answered yet');
    noAnswerShown(rich);
    unmount();
    useProgress.getState().toggleBookmark('cisa', rich.id);
    open(rich.id);
    expect(allText()).toContain('Not answered yet');
    noAnswerShown(rich);
  });

  it('a question whose old record was dropped when it was rewritten has no record: it is not brought back', () => {
    const [id, rewrittenAt] = Object.entries(REWRITTEN_QUESTIONS.cisa)[0];
    const q = findQuestion('cisa', id);
    if (!q) return; // the rewritten question left the bank: nothing to open
    // An answer and a miss saved for the OLD wording, the day before the rewrite.
    jest.setSystemTime(rewrittenAt - DAY);
    answer(id, false, wrongLetter(q));
    // What every app start does (store/progress.ts `merge`).
    const kept = dropRewritten({ byCert: useProgress.getState().byCert }, REWRITTEN_QUESTIONS);
    useProgress.setState({ byCert: kept.byCert });
    jest.setSystemTime(T0);
    open(id);
    expect(allText()).toContain('Not answered yet');
    noAnswerShown(q);
  });

  it('a question in an UNSUBMITTED mock: "Finish your mock first", and no answer leaks', () => {
    const mock = startMock('cisa', 10)!;
    const q = findQuestion('cisa', mock.questionIds[3])!;
    // Answered before, in practice: it would otherwise open.
    answer(q.id, true);
    open(q.id);
    expect(allText()).toContain('Finish your mock first');
    noAnswerShown(q);
    expect(allText()).not.toContain(LAST_CORRECT_LINE);
    for (const l of LETTERS) expect(allText()).not.toContain(q.options[l]!);
    if (q.keyConcept) expect(allText()).not.toContain(q.keyConcept);
    unmount();

    // Submitted: now it opens (the mock recorded no answer for it, so the practice answer stands).
    act(() => finishSession({ celebrate: false }));
    open(q.id);
    expect(allText()).not.toContain('Finish your mock first');
    expect(byTestID('recap-choices')).toHaveLength(1);
    expect(allText()).toContain('✓ Best answer');
  });
});

// ── The bank's Answered filter ──────────────────────────────────────────
describe('the Question bank’s Answered filter', () => {
  const d1 = getDomainQuestions('cisa', '1');
  const chip = (label: string) => root().findAll((n) => n.props.label === label && typeof n.props.onPress === 'function' && n.props.selected !== undefined)[0];
  const rows = () => root().findAll((n) => typeof n.type === 'function' && (n.type as { name?: string }).name === 'BankQuestionRow');
  const openBank = () => {
    mockRoute.params = { domain: '1' };
    mount(<BankDomain />);
  };

  it('lists only answered questions; a tap opens the look-back page and starts no session', () => {
    answer(d1[0].id, true);
    answer(d1[1].id, false, wrongLetter(d1[1]));
    useProgress.getState().toggleBookmark('cisa', d1[2].id); // saved only: must not appear
    const before = snapshot();
    openBank();
    act(() => chip('Answered').props.onPress());
    expect(rows()).toHaveLength(2);
    expect(allText()).toContain(ANSWERED_HELP);
    // The help line no longer promises "You won't answer it again" right above "Practice these again".
    expect(ANSWERED_HELP).toBe('Tap a question to look back at it without answering.');
    expect(btn('Practice these again')).toBeDefined();
    expect(allText()).not.toContain(d1[2].stem.split('\n')[0].slice(0, 30));
    // The row says what the tap does.
    const row = rows()[0];
    expect(row.props.hint).toMatch(/look back/);
    act(() => row.props.onPress());
    expect(router.push).toHaveBeenCalledTimes(1);
    const [target] = jest.mocked(router.push).mock.calls[0] as unknown as [{ pathname: string; params: { id: string } }];
    expect(target.pathname).toBe('/answered/[id]');
    expect([d1[0].id, d1[1].id]).toContain(target.params.id);
    expect(useSession.getState().active).toBeNull();
    expect(snapshot()).toEqual(before);
  });

  it('every other filter keeps its tap: a one-question practice', () => {
    answer(d1[0].id, true);
    openBank();
    for (const label of ['All', 'Missed', 'Saved', 'Not yet answered']) expect(chip(label)).toBeDefined();
    expect(allText()).not.toContain(ANSWERED_HELP);
    expect(rows()[0].props.hint).toBeUndefined();
    act(() => rows()[0].props.onPress());
    expect(useSession.getState().active!.questionIds).toHaveLength(1);
    expect(router.push).toHaveBeenCalledWith('/session');
  });

  it('nothing answered: a clear empty state, with no bank size and no "Practice these"', () => {
    useProgress.getState().toggleBookmark('cisa', d1[0].id);
    openBank();
    act(() => chip('Answered').props.onPress());
    expect(rows()).toHaveLength(0);
    expect(allText()).toContain('Nothing answered here yet');
    expect(allText()).not.toContain(ANSWERED_HELP);
    expect(btn('Practice these')).toBeUndefined();
    expect(allText()).not.toMatch(new RegExp(`\\b${d1.length}\\b`));
  });

  it('a long answered list stays a virtualised list (only the rows near the screen are drawn)', () => {
    d1.slice(0, 60).forEach((q, i) => answer(q.id, i % 3 !== 0, wrongLetter(q)));
    openBank();
    act(() => chip('Answered').props.onPress());
    expect(rows().length).toBeGreaterThan(0);
    expect(rows().length).toBeLessThan(60);
  });
});
