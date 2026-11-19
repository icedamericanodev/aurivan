/**
 * Phone 2.2, the practice answer screen (owner direction, 19 Nov 2026; learner report R-ZXUQ).
 *
 * Plain English for the founder: after a practice answer the screen is the short one again (your
 * answer and the best answer, the key idea, the tips, then why), and the whole question lives
 * behind ONE switch, "Show question & choices". These tests check
 *  1. the first view after a right and after a wrong answer: summary, Key idea, tips, Why, in that
 *     order, with no list of every choice's reason and the switch closed;
 *  2. the reported question (d4_134): one switch that shows the whole question and exactly four
 *     choices; no stem-only "Show question", no "Show all options", no "Compare all options";
 *  3. every one of the 24 ways four choices can be shuffled: the letters stay A to D, each row holds
 *     the choice that was on screen there, exactly one is the best, the learner's pick is marked on
 *     the letter they tapped, and every reason names letters as the learner saw them. Opening,
 *     closing and reopening never changes the order or the marks;
 *  4. nothing about the right answer is in the screen before "Check answer";
 *  5. each new question starts closed, with nothing left over from the one before; opening and
 *     closing changes neither the saved answers nor the saved progress;
 *  6. screen readers: both switches are buttons that say what they do and whether they are open;
 *     closed content is not there at all; each choice is one stop that says its letter;
 *  7. lessons and drills keep the stem-only "Show question"; a mock never shows any of this while
 *     the exam is being answered.
 *
 * Real content and real stores. Grading is on ORIGINAL letters; everything shown is DISPLAY letters.
 */
import { Dimensions, ScrollView, StyleSheet } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import LessonPlayer from '../app/lesson/[id]';
import SessionScreen from '../app/session';
import { DrillAnswer } from '../components/drillAnswer';
import { AnswerContext, AnswerPlate, KeyIdea, OptionCard, QuestionRecap, StemRecap, TipsCard, Verdict, WhyBlock, type RecapChoice } from '../components/quiz';
import { CISA_LESSONS } from '../content/lessons/cisa';
import { getAllQuestions } from '../content/loader';
import { LETTERS, type Letter, type PackQuestion } from '../content/types';
import { displayToOriginal, identityPermutation, renderText, type Permutation } from '../engine/shuffle';
import { oneStepVerdict } from '../lib/drillVerdict';
import { startFromIds, startMock } from '../lib/sessions';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { moreRowLabels } from '../../jest/answerMore';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  const { Pinwheel, Rings, Sprig, Sprout } = jest.requireActual('../components/glyphs');
  return new Proxy({ __esModule: true, ICON_STROKE: 2, Pinwheel, Rings, Sprig, Sprout } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn(), navigate: jest.fn(), canGoBack: jest.fn(() => true), canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => mockParams,
  useIsFocused: () => true,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: jest.fn(), selection: jest.fn(), error: jest.fn(), light: jest.fn() } }));
jest.mock('../lib/a11y', () => ({ ...jest.requireActual('../lib/a11y'), moveFocus: jest.fn() }));

// ── Content ──────────────────────────────────────────────────────────
const bank = getAllQuestions('cisa');
const byId = (id: string) => bank.find((q) => q.id === id)!;
const hasEveryReason = (q: PackQuestion) => LETTERS.every((l) => (l === q.correct ? Boolean(q.explanation) : Boolean(q.wrongExplanations[l])));
/** The question in learner report R-ZXUQ. */
const reported = byId('d4_134');
/** The full v2 tip set, a key idea, a long explanation (so "Why" folds after a miss) and a reason for every choice. */
const rich = bank.find(
  (q) =>
    q.id !== reported.id &&
    q.keyConcept &&
    q.tips.some((t) => t.startsWith('Eliminate:')) &&
    q.tips.some((t) => t.startsWith('Final two:')) &&
    q.tips.some((t) => t.startsWith('Exam cue:')) &&
    q.explanation.length > 220 &&
    hasEveryReason(q),
)!;
/** A second, different question for "the next question", with a reason for every choice. */
const second = bank.find((q) => q.id !== rich.id && q.id !== reported.id && hasEveryReason(q))!;
/** A bank question whose explanation names an option letter ({{B}}): it must be shown in DISPLAY letters. */
const lettered = bank.find((q) => /\{\{[A-D]\}\}/.test(q.explanation) && q.explanation.replace(/\{\{[A-D]\}\}/g, '').length > 0 && hasEveryReason(q));
/**
 * A made-up question whose every reason names option letters, for the 24-shuffle check (the bank's
 * own reasons for wrong choices name none today, so they could not show a letter left unmapped).
 */
const fixture: PackQuestion = {
  id: 'fx_recap_1',
  certId: 'cisa',
  domainId: '1',
  subtopic: 'Fixture',
  difficulty: 'application',
  stem: 'An IS auditor finds that the audit charter was approved by the CIO. Which action should the auditor take FIRST?',
  options: { A: 'Alpha: ask the CIO to sign again', B: 'Bravo: report it to the audit committee', C: 'Charlie: note it in the working papers', D: 'Delta: begin the fieldwork as planned' },
  correct: 'B',
  explanation: '{{B}} is best: it fixes the authority that {{A}}, {{C}} and {{D}} leave untouched.',
  wrongExplanations: {
    A: '{{A}} repeats the flaw that {{B}} removes.',
    C: '{{C}} records the gap but, unlike {{B}}, reports it to nobody; {{D}} is worse.',
    D: '{{D}} ignores the gap; even {{A}} does more.',
  },
  tips: [],
  related: [],
};

/** All 24 orders of A, B, C, D. perm[i] is the ORIGINAL letter shown in display slot i. */
const PERMS: Permutation[] = (() => {
  const out: Permutation[] = [];
  const walk = (left: Letter[], done: Letter[]) => {
    if (!left.length) out.push(done);
    left.forEach((l, i) => walk([...left.slice(0, i), ...left.slice(i + 1)], [...done, l]));
  };
  walk([...LETTERS], []);
  return out;
})();

// ── Oracles (written without the app's own mapping helpers, so a bug there cannot hide here) ──
/** The DISPLAY letter of an ORIGINAL letter: its place in the shuffle. */
const shownAs = (original: Letter, perm: Permutation): Letter => LETTERS[perm.indexOf(original)];
/** Content text with every {{X}} as the letter the learner saw. */
const inDisplayLetters = (text: string, perm: Permutation) => text.replace(/\{\{([A-D])\}\}/g, (_, l: Letter) => shownAs(l, perm));
const reasonOf = (q: PackQuestion, original: Letter, perm: Permutation) => inDisplayLetters((original === q.correct ? q.explanation : q.wrongExplanations[original]) ?? '', perm);

/** The recap's rows, built the way app/session.tsx builds them (displayToOriginal and renderText). */
function choicesFor(q: PackQuestion, perm: Permutation, pickedOriginal: Letter): RecapChoice[] {
  return LETTERS.slice(0, perm.length).map((d) => {
    const original = displayToOriginal(d, perm);
    const best = original === q.correct;
    const why = best ? q.explanation : q.wrongExplanations[original];
    return { letter: d, text: q.options[original] ?? '', pick: original === pickedOriginal, best, why: why ? renderText(why, perm) : undefined };
  });
}

// ── Tree helpers ─────────────────────────────────────────────────────
let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const mount = (el: React.ReactElement) =>
  act(() => {
    r = create(el);
  });
const unmount = () => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
};
const strings = (n: ReactTestInstance | string, out: string[] = []): string[] => {
  if (typeof n === 'string') out.push(n);
  else n.children.forEach((c) => strings(c, out));
  return out;
};
const textOf = (n: ReactTestInstance | string): string => strings(n).join(' ');
const allText = () => textOf(root());
/** How many times `part` is on screen. */
const times = (part: string, text = allText()) => text.split(part).length - 1;
/** What a screen reader and the screen meet: host elements only (one per control). */
const host = (id: string | RegExp) => root().findAll((n) => typeof n.type === 'string' && typeof n.props.testID === 'string' && (typeof id === 'string' ? n.props.testID === id : id.test(n.props.testID)));
const hostLabelled = (re: RegExp) => root().findAll((n) => typeof n.type === 'string' && typeof n.props.accessibilityLabel === 'string' && re.test(n.props.accessibilityLabel));
const press = (label: string) => {
  const b = root().findAll((n) => (n.props.label === label || n.props.accessibilityLabel === label) && typeof n.props.onPress === 'function')[0];
  if (!b) throw new Error(`no button "${label}"`);
  act(() => {
    b.props.onPress();
  });
};
/** Tap a host control by its testID (the two switches). */
const tap = (id: string) => {
  const [b] = root().findAll((n) => n.props.testID === id && typeof n.props.onPress === 'function');
  if (!b) throw new Error(`nothing to tap with testID "${id}"`);
  act(() => {
    b.props.onPress();
  });
};
const flat = (n: ReactTestInstance) => StyleSheet.flatten(n.props.style) as Record<string, unknown>;

const ROW = /^recap-choice-[A-D]$/;
const WHY = /^recap-why-[A-D]$/;
/** Anything the answer screen adds once an answer is checked. */
const REVEALED = /^(question-recap|recap-|answer-|all-options|feedback-vine|go-deeper)/;
const rows = () => host(ROW);
const whys = () => host(WHY);
const toggle = () => host('recap-toggle');
const whyToggle = () => host('recap-why-toggle');
/** The one accessible stop of a choice row (its letter, words and option). */
const rowStops = (row: ReactTestInstance) => row.findAll((n) => typeof n.type === 'string' && n.props.accessible === true);
/** What the open recap shows, row by row: enough to see any reorder or any mark that moved. */
const seen = () =>
  rows().map((row) => ({
    id: row.props.testID as string,
    text: textOf(row),
    spoken: rowStops(row).map((s) => s.props.accessibilityLabel as string),
  }));

// ── Session helpers ──────────────────────────────────────────────────
/** Start a practice set on these ids (the first with this shuffle, when given) and open the screen. */
function open(ids: string[], perm?: Permutation) {
  startFromIds('cisa', ids, 'T');
  if (perm) {
    act(() => {
      const a = useSession.getState().active!;
      useSession.setState({ active: { ...a, perms: { ...a.perms, [ids[0]]: perm } } });
    });
  }
  mount(<SessionScreen />);
}
/** The question on screen and its SAVED shuffle. */
function current() {
  const s = useSession.getState().active!;
  const id = s.questionIds[s.index];
  return { q: byId(id), perm: s.perms[id] };
}
/** Tap an option (by ORIGINAL letter, or simply the right / a wrong one) without checking it. */
function select(pick: 'right' | 'wrong' | Letter) {
  const { q, perm } = current();
  const original = pick === 'right' ? q.correct : pick === 'wrong' ? LETTERS.find((l) => l !== q.correct && q.options[l])! : pick;
  const picked = shownAs(original, perm);
  const card = root().findAllByType(OptionCard).find((n) => n.props.letter === picked)!;
  act(() => {
    card.props.onPress();
  });
  return { q, perm, original, picked, best: shownAs(q.correct, perm) };
}
/** Tap an option and check it. */
function answer(pick: 'right' | 'wrong' | Letter) {
  const out = select(pick);
  press('Check answer');
  return out;
}
/** The answer page (the header above it repeats the verdict once it scrolls away). */
const pageText = () => textOf(root().findAllByType(ScrollView)[0]);
/** The answer's blocks, in tree order (which is reading order). */
const blocks = () => {
  const kinds = new Map<unknown, string>([
    [QuestionRecap, 'recap'],
    [Verdict, 'verdict'],
    [AnswerPlate, 'card'],
    [KeyIdea, 'key idea'],
    [TipsCard, 'tips'],
    [WhyBlock, 'why'],
    [AnswerContext, 'compare all options'],
    [StemRecap, 'stem-only recap'],
  ]);
  return root()
    .findAll((n) => kinds.has(n.type))
    .map((n) => kinds.get(n.type));
};
/** Deep copies of everything saved: the session (answers, shuffles, flags, place) and the progress store. */
const saved = () => ({
  session: JSON.parse(JSON.stringify(useSession.getState().active)),
  progress: JSON.parse(JSON.stringify(useProgress.getState())),
});

const window0 = Dimensions.get('window');
const setWindow = (over: Partial<typeof window0>) => act(() => Dimensions.set({ window: { ...window0, ...over }, screen: { ...window0, ...over } }));

beforeEach(() => {
  jest.useFakeTimers();
  mockParams = {};
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
});
afterEach(() => {
  unmount();
  setWindow({});
  jest.useRealTimers();
});

it('the content this file needs is in the bank', () => {
  expect(reported).toBeDefined();
  expect(rich).toBeDefined();
  expect(second).toBeDefined();
  expect(PERMS).toHaveLength(24);
  expect(new Set(PERMS.map((p) => p.join(''))).size).toBe(24);
});

// ── 1. The first view ────────────────────────────────────────────────
describe('1. the first view after an answer: the short summary, nothing else open', () => {
  it.each([
    ['a wrong answer', 'wrong' as const],
    ['a right answer', 'right' as const],
  ])('after %s: card, Key idea, tips, then Why, in that order; no list of every choice\'s reason; the recap closed', (_name, pick) => {
    open([rich.id, second.id]);
    const { q, perm, original, picked, best } = answer(pick);
    const missed = pick === 'wrong';

    // The blocks, in reading order. No "Compare all options" and no stem-only recap among them.
    expect(blocks()).toEqual(['recap', 'verdict', 'card', 'key idea', 'tips', 'why']);
    // The same order in the words on the page.
    const t = pageText();
    const words = missed
      ? ['Show question & choices', 'Not quite', '✗ Your answer', `Why not ${picked}`, '✓ Best answer', 'Key idea', 'How to think about it', 'Eliminate two', 'Final two', 'Exam cue', `Why ${best}`]
      : ['Show question & choices', 'Correct', '✓ Your answer · the best', 'Key idea', 'How to think about it', 'Eliminate two', 'Final two', 'Exam cue', `Why ${best}`];
    const at = words.map((w) => t.indexOf(w));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);

    // The recap is closed: its choices, its reasons and its second switch are not in the tree at all.
    expect(toggle()).toHaveLength(1);
    expect(toggle()[0].props.accessibilityState).toMatchObject({ expanded: false });
    expect(root().findAll((n) => n.props.testID === 'recap-choices')).toHaveLength(0);
    expect(rows()).toHaveLength(0);
    expect(whys()).toHaveLength(0);
    expect(whyToggle()).toHaveLength(0);

    // No per-choice reason list. After a miss the ONE "Why not" is the pick's own, on the card; after
    // a right answer there is none. The other choices' reasons are nowhere on the screen.
    expect(root().findAll((n) => n.props.testID === 'answer-context' || /^answer-context-/.test(n.props.testID ?? ''))).toHaveLength(0);
    expect(allText()).not.toContain('Compare all options');
    const whyNots = allText().match(/Why not [A-D]\b/g) ?? [];
    expect(whyNots).toEqual(missed ? [`Why not ${picked}`] : []);
    expect(host('answer-why-not')).toHaveLength(missed ? 1 : 0);
    for (const l of LETTERS.filter((x) => x !== q.correct)) {
      const reason = reasonOf(q, l, perm);
      expect(times(reason)).toBe(missed && l === original ? 1 : 0);
    }
    // The best answer's explanation is there once, under the one "Why D".
    expect(times(reasonOf(q, q.correct, perm))).toBe(1);
    expect(allText().match(/Why [A-D]\b/g)).toEqual([`Why ${best}`]);
    // After a miss the long Why folds ("Read more"); after a right answer nothing folds.
    expect(hostLabelled(/^Read more of the explanation$/)).toHaveLength(missed ? 1 : 0);
    // The two choices that are neither the pick nor the best are not on the first view.
    for (const l of LETTERS.filter((x) => x !== q.correct && x !== original)) expect(times(q.options[l]!)).toBe(0);
  });

  it('a review set gets the same recap as practice', () => {
    startFromIds('cisa', [rich.id, second.id], 'T');
    act(() => {
      useSession.setState((s) => ({ active: { ...s.active!, mode: 'review' } }));
    });
    mount(<SessionScreen />);
    answer('wrong');
    expect(blocks()).toEqual(['recap', 'verdict', 'card', 'key idea', 'tips', 'why']);
    expect(toggle()).toHaveLength(1);
  });
});

// ── 2. The reported question ─────────────────────────────────────────
describe('2. question d4_134 (learner report R-ZXUQ): ONE switch for the whole question and its four choices', () => {
  // A shuffled order (not A B C D), so a row that showed the content file's order would be caught.
  const SHUFFLED: Permutation = ['C', 'A', 'D', 'B'];

  it.each([
    ['a wrong answer', 'wrong' as const],
    ['a right answer', 'right' as const],
  ])('after %s: the switch shows the scenario (if any), the whole stem and exactly four choices', (_name, pick) => {
    open([reported.id, second.id], SHUFFLED);
    const { q, perm, original } = answer(pick);
    expect(q.id).toBe('d4_134');
    expect(perm).toEqual(SHUFFLED);
    const others = LETTERS.filter((l) => l !== q.correct && l !== original);

    // One switch, closed.
    expect(toggle()).toHaveLength(1);
    expect(hostLabelled(/^Show question and choices$/)).toHaveLength(1);
    expect(rows()).toHaveLength(0);
    for (const l of others) expect(times(q.options[l]!)).toBe(0);

    tap('recap-toggle');
    const recap = root().findByType(QuestionRecap);
    // The whole stem, with no line limit (and the scenario above it, when the question has one).
    const whole = recap.findAll((n) => typeof n.type === 'string' && n.props.children === q.stem);
    expect(whole).toHaveLength(1);
    expect(whole[0].props.numberOfLines).toBeUndefined();
    expect(recap.findAll((n) => typeof n.props.children === 'string' && typeof n.props.numberOfLines === 'number')).toHaveLength(0);
    if (q.scenario) {
      expect(textOf(recap)).toContain(q.scenario);
      expect(textOf(recap).indexOf(q.scenario)).toBeLessThan(textOf(recap).indexOf(q.stem));
    }
    // Exactly four choices, A to D, each the option that was on screen under that letter.
    expect(host('recap-choices')).toHaveLength(1);
    expect(rows().map((n) => n.props.testID)).toEqual(['recap-choice-A', 'recap-choice-B', 'recap-choice-C', 'recap-choice-D']);
    rows().forEach((row, i) => expect(textOf(row)).toContain(q.options[SHUFFLED[i]]!));
    // Each choice that is neither the pick nor the best is on the screen exactly once: ONE surface.
    for (const l of others) expect(times(q.options[l]!)).toBe(1);
  });

  it('there is no stem-only switch and no second all-choices surface, closed or open', () => {
    open([reported.id, second.id], SHUFFLED);
    answer('wrong');
    const check = () => {
      // No stem-only "Show question" (the lesson and drill recap), as a label or as words.
      expect(root().findAllByType(StemRecap)).toHaveLength(0);
      expect(root().findAll((n) => /^(Show|Hide) question$/.test(n.props.accessibilityLabel ?? ''))).toHaveLength(0);
      expect(strings(root()).filter((s) => /^(Show|Hide) question$/.test(s.trim()))).toHaveLength(0);
      // No "Show all options" sheet (it was in More) and no inline "Compare all options".
      expect(strings(root()).filter((s) => /show all options|compare all options|^all options$/i.test(s.trim()))).toHaveLength(0);
      expect(root().findAll((n) => /all options/i.test(n.props.accessibilityLabel ?? '') || /all options/i.test(n.props.title ?? ''))).toHaveLength(0);
      expect(root().findAll((n) => /^(all-options|answer-context)/.test(n.props.testID ?? ''))).toHaveLength(0);
      expect(root().findAllByType(AnswerContext)).toHaveLength(0);
      expect(root().findAllByType(QuestionRecap)).toHaveLength(1);
    };
    check();
    // More's rows: the note, the principle, your note, the report. Nothing about options or choices.
    const more = moreRowLabels(root());
    expect(more.some((l) => /options|choices/i.test(l))).toBe(false);
    expect(more[more.length - 1]).toBe('Report a problem with this question');
    tap('recap-toggle');
    check();
    expect(host('recap-choices')).toHaveLength(1);
    tap('recap-why-toggle');
    check();
  });

  it('"Show why for each choice" gives each of the four its own reason, under the letter it was shown with', () => {
    open([reported.id, second.id], SHUFFLED);
    const { q, perm, picked, best } = answer('wrong');
    tap('recap-toggle');
    // Closed by default.
    expect(whyToggle()[0].props.accessibilityState).toMatchObject({ expanded: false });
    expect(whys()).toHaveLength(0);
    tap('recap-why-toggle');
    expect(whys().map((n) => n.props.testID)).toEqual(['recap-why-A', 'recap-why-B', 'recap-why-C', 'recap-why-D']);
    whys().forEach((w, i) => {
      const d = LETTERS[i];
      const head = d === best ? `Why ${d}` : `Why not ${d}`;
      expect(w.props.accessibilityLabel).toBe(`${head}: ${reasonOf(q, perm[i], perm)}`);
      // Inside its own row.
      expect(rows()[i].findAll((n) => n.props.testID === `recap-why-${d}` && typeof n.type === 'string')).toHaveLength(1);
    });
    expect(picked).not.toBe(best);
  });
});

// ── 3. All 24 shuffles ───────────────────────────────────────────────
describe('3. every shuffle: letters, texts, the best, the pick and the reasons all go through the saved permutation', () => {
  it.each(PERMS.map((p) => [p.join(''), p] as const))('order %s: A to D top to bottom, the right text and marks on every row; reopening changes nothing', (_name, perm) => {
    for (const pickedOriginal of LETTERS) {
      mount(<QuestionRecap stem={fixture.stem} choices={choicesFor(fixture, perm, pickedOriginal)} />);
      const bestAt = perm.indexOf(fixture.correct);
      const pickAt = perm.indexOf(pickedOriginal);
      expect(rows()).toHaveLength(0);

      tap('recap-toggle');
      // The letters stay A to D, top to bottom, on the badge and in the testID.
      expect(rows().map((n) => n.props.testID)).toEqual(LETTERS.map((l) => `recap-choice-${l}`));
      rows().forEach((row, i) => {
        const d = LETTERS[i];
        const t = textOf(row);
        const option = fixture.options[perm[i]]!;
        // The badge letter, then the option the permutation put in this slot, and no other option.
        expect(strings(row)[0]).toBe(d);
        expect(t).toContain(option);
        for (const l of LETTERS) if (l !== perm[i]) expect(t).not.toContain(fixture.options[l]!);
        // The marks, in words: the best, the pick, both, or neither.
        const caption = i === bestAt && i === pickAt ? '✓ Your answer · the best' : i === bestAt ? '✓ Best answer' : i === pickAt ? '✗ Your answer' : null;
        expect(strings(row).filter((s) => /Your answer|Best answer|the best/.test(s))).toEqual(caption ? [caption] : []);
        // One stop, with the display letter and the same words.
        const spoken = i === bestAt && i === pickAt ? `${d}, your answer, the best: ${option}` : i === bestAt ? `${d}, best answer: ${option}` : i === pickAt ? `${d}, your answer, not the best: ${option}` : `${d}: ${option}`;
        expect(rowStops(row).map((s) => s.props.accessibilityLabel)).toEqual([spoken]);
      });
      // Exactly one row is the best, and it holds the right answer's text.
      const bestRows = rows().filter((row) => /✓/.test(textOf(row)));
      expect(bestRows.map((n) => n.props.testID)).toEqual([`recap-choice-${LETTERS[bestAt]}`]);
      expect(textOf(bestRows[0])).toContain(fixture.options[fixture.correct]!);
      // The pick mark is on the letter the learner tapped, and nowhere else.
      expect(rows().filter((row) => /Your answer/.test(textOf(row))).map((n) => n.props.testID)).toEqual([`recap-choice-${LETTERS[pickAt]}`]);
      const openOnce = seen();

      // The reasons: each under its own row, naming letters as the learner saw them.
      tap('recap-why-toggle');
      expect(whys().map((n) => n.props.testID)).toEqual(LETTERS.map((l) => `recap-why-${l}`));
      whys().forEach((w, i) => {
        const d = LETTERS[i];
        const reason = reasonOf(fixture, perm[i], perm);
        expect(w.props.accessibilityLabel).toBe(`${i === bestAt ? 'Why' : 'Why not'} ${d}: ${reason}`);
        expect(textOf(w)).toContain(reason);
        expect(textOf(w)).not.toMatch(/\{\{|\}\}/);
        // It opens with its own display letter (every fixture reason starts with the letter it is about).
        expect(reason.startsWith(`${d} `)).toBe(true);
      });
      const withWhys = seen();
      // The reasons are extra lines: the rows above them did not move.
      expect(withWhys.map((x) => x.id)).toEqual(openOnce.map((x) => x.id));
      expect(withWhys.map((x) => x.spoken[0])).toEqual(openOnce.map((x) => x.spoken[0]));

      // Close: all of it leaves the tree. Reopen: the same rows and marks, and the reasons closed again.
      tap('recap-toggle');
      expect(rows()).toHaveLength(0);
      expect(whys()).toHaveLength(0);
      tap('recap-toggle');
      expect(seen()).toEqual(openOnce);
      expect(whys()).toHaveLength(0);
      tap('recap-why-toggle');
      expect(seen()).toEqual(withWhys);
      // And once more, the reasons alone.
      tap('recap-why-toggle');
      expect(seen()).toEqual(openOnce);
      unmount();
    }
  });

  // The same through the real screen and the real session store, so app/session.tsx's own mapping is the one checked.
  it.each(PERMS.map((p) => [p.join(''), p] as const))('order %s on the answer screen: the rows are the saved shuffle, the pick is the tapped letter', (name, perm) => {
    const q = lettered ?? rich;
    // A different pick for each order, right answers included.
    const pickedOriginal = LETTERS[PERMS.findIndex((p) => p.join('') === name) % 4];
    open([q.id, second.id], perm);
    const { picked, best } = answer(pickedOriginal);
    expect(useSession.getState().active!.perms[q.id]).toEqual(perm);
    // Graded on the ORIGINAL letter.
    expect(useSession.getState().active!.responses[q.id]).toMatchObject({ display: picked, correct: pickedOriginal === q.correct });

    tap('recap-toggle');
    tap('recap-why-toggle');
    expect(rows().map((n) => n.props.testID)).toEqual(LETTERS.map((l) => `recap-choice-${l}`));
    rows().forEach((row, i) => {
      const d = LETTERS[i];
      const option = q.options[perm[i]]!;
      const isBest = perm[i] === q.correct;
      const isPick = perm[i] === pickedOriginal;
      expect(d === best).toBe(isBest);
      expect(d === picked).toBe(isPick);
      const spoken = isBest && isPick ? `${d}, your answer, the best: ${option}` : isBest ? `${d}, best answer: ${option}` : isPick ? `${d}, your answer, not the best: ${option}` : `${d}: ${option}`;
      expect(rowStops(row)[0].props.accessibilityLabel).toBe(spoken);
      const why = row.findAll((n) => typeof n.type === 'string' && n.props.testID === `recap-why-${d}`);
      expect(why).toHaveLength(1);
      expect(why[0].props.accessibilityLabel).toBe(`${isBest ? 'Why' : 'Why not'} ${d}: ${reasonOf(q, perm[i], perm)}`);
      expect(textOf(row)).not.toMatch(/\{\{|\}\}/);
    });
    // The card above agrees with the recap: same letters, same texts.
    const plate = root().findByType(AnswerPlate);
    expect(plate.props.best).toEqual({ letter: best, text: q.options[q.correct] });
    if (pickedOriginal === q.correct) expect(plate.props.pick).toBeUndefined();
    else expect(plate.props.pick).toEqual({ letter: picked, text: q.options[pickedOriginal], why: reasonOf(q, pickedOriginal, perm) });
    // "Why D" is the best answer's DISPLAY letter and its explanation in display letters.
    expect(root().findByType(WhyBlock).props).toMatchObject({ letter: best, text: reasonOf(q, q.correct, perm) });
  });

  it('the bank has a question whose explanation names an option letter (so the screen check above can see a letter left unmapped)', () => {
    expect(lettered).toBeDefined();
  });
});

// ── 4. Nothing before the answer ─────────────────────────────────────
describe('4. before "Check answer": nothing about the right answer is in the tree', () => {
  const nothingRevealed = (q: PackQuestion, perm: Permutation) => {
    expect(root().findAllByType(QuestionRecap)).toHaveLength(0);
    expect(root().findAllByType(AnswerPlate)).toHaveLength(0);
    expect(root().findAllByType(WhyBlock)).toHaveLength(0);
    expect(root().findAllByType(KeyIdea)).toHaveLength(0);
    expect(root().findAllByType(TipsCard)).toHaveLength(0);
    expect(root().findAllByType(AnswerContext)).toHaveLength(0);
    expect(root().findAll((n) => REVEALED.test(n.props.testID ?? ''))).toHaveLength(0);
    // No option is marked right or wrong.
    expect(root().findAllByType(OptionCard).map((n) => n.props.state).filter((s) => s === 'correct' || s === 'wrong')).toEqual([]);
    // No marker words and no reason, on screen or spoken.
    const t = allText();
    for (const w of ['✓', '✗', 'Best answer', 'Your answer', 'Key idea', 'How to think about it', 'Show question', 'Why not']) expect(t).not.toContain(w);
    expect(t).not.toMatch(/Why [A-D]\b/);
    for (const l of LETTERS) {
      const reason = reasonOf(q, l, perm);
      if (reason) expect(t).not.toContain(reason);
    }
    if (q.keyConcept) expect(t).not.toContain(q.keyConcept);
    const spoken = root()
      .findAll((n) => typeof n.props.accessibilityLabel === 'string')
      .map((n) => n.props.accessibilityLabel as string);
    expect(spoken.filter((l) => /best answer|your answer|not the best|^Why |question and choices|^Key idea/i.test(l))).toEqual([]);
  };

  it('on a fresh question, and after an option is tapped but not checked', () => {
    open([rich.id, second.id]);
    const { q, perm } = current();
    nothingRevealed(q, perm);
    select('right');
    nothingRevealed(q, perm);
    // More, before the answer: the report only.
    expect(moreRowLabels(root())).toEqual(['Report a problem with this question']);
    // Changing the pick still reveals nothing.
    select('wrong');
    nothingRevealed(q, perm);
    expect(useSession.getState().active!.responses).toEqual({});
  });

  it('the next question is as closed as the first, right after an answer with everything open', () => {
    open([rich.id, second.id]);
    answer('wrong');
    tap('recap-toggle');
    tap('recap-why-toggle');
    expect(whys()).toHaveLength(4);
    press('Next question');
    const { q, perm } = current();
    expect(q.id).toBe(second.id);
    nothingRevealed(q, perm);
  });
});

// ── 5. Each question starts closed; nothing saved changes ────────────
describe('5. the recap starts closed on each new question, and opening it changes nothing saved', () => {
  it('open it and its reasons, go to the next question, answer it: closed, with nothing from the question before', () => {
    open([rich.id, second.id]);
    const first = answer('wrong');
    tap('recap-toggle');
    tap('recap-why-toggle');
    expect(toggle()[0].props.accessibilityState).toMatchObject({ expanded: true });
    expect(whyToggle()[0].props.accessibilityState).toMatchObject({ expanded: true });
    expect(rows()).toHaveLength(4);
    expect(whys()).toHaveLength(4);

    press('Next question');
    const next = answer('right');
    expect(next.q.id).toBe(second.id);

    // Closed: the choices, the reasons and the second switch are not in the tree.
    expect(toggle()).toHaveLength(1);
    expect(toggle()[0].props.accessibilityState).toMatchObject({ expanded: false });
    expect(root().findAll((n) => n.props.testID === 'recap-choices')).toHaveLength(0);
    expect(rows()).toHaveLength(0);
    expect(whys()).toHaveLength(0);
    expect(whyToggle()).toHaveLength(0);
    // It is this question's recap.
    const recap = root().findAllByType(QuestionRecap);
    expect(recap).toHaveLength(1);
    expect(recap[0].props.stem).toBe(second.stem);
    expect(hostLabelled(/^Question: /).map((n) => n.props.accessibilityLabel)).toEqual([`Question: ${second.stem}`]);
    // Nothing of the question before is left anywhere: its stem, its options, its reasons.
    const leftovers = () => {
      const t = allText();
      const spoken = root()
        .findAll((n) => typeof n.props.accessibilityLabel === 'string')
        .map((n) => n.props.accessibilityLabel as string)
        .join(' | ');
      const old = [first.q.stem, ...LETTERS.map((l) => first.q.options[l]!), ...LETTERS.map((l) => reasonOf(first.q, l, first.perm))];
      return old.filter((s) => t.includes(s) || spoken.includes(s));
    };
    expect(leftovers()).toEqual([]);

    // Opened, it holds this question's choices in this question's saved order, the reasons still closed.
    tap('recap-toggle');
    expect(rows()).toHaveLength(4);
    rows().forEach((row, i) => expect(textOf(row)).toContain(next.q.options[next.perm[i]]!));
    expect(whys()).toHaveLength(0);
    expect(whyToggle()[0].props.accessibilityState).toMatchObject({ expanded: false });
    expect(leftovers()).toEqual([]);
    tap('recap-why-toggle');
    whys().forEach((w, i) => expect(w.props.accessibilityLabel).toContain(reasonOf(next.q, next.perm[i], next.perm)));
    expect(leftovers()).toEqual([]);
  });

  it('closing the recap closes its reasons too: reopened, it is the plain question again', () => {
    open([rich.id, second.id]);
    answer('wrong');
    tap('recap-toggle');
    tap('recap-why-toggle');
    expect(whys()).toHaveLength(4);
    tap('recap-toggle');
    expect(rows()).toHaveLength(0);
    expect(whys()).toHaveLength(0);
    tap('recap-toggle');
    expect(rows()).toHaveLength(4);
    expect(whys()).toHaveLength(0);
    expect(whyToggle()[0].props.accessibilityState).toMatchObject({ expanded: false });
  });

  it.each([
    ['a wrong answer', 'wrong' as const],
    ['a right answer', 'right' as const],
  ])('after %s: opening, closing and reopening changes neither the saved answers nor the saved progress', (_name, pick) => {
    open([rich.id, second.id]);
    const { q, picked } = answer(pick);
    const before = saved();
    expect(before.session.responses[q.id]).toMatchObject({ display: picked, correct: pick === 'right' });
    const first = (() => {
      tap('recap-toggle');
      return seen();
    })();
    expect(saved()).toEqual(before);
    tap('recap-why-toggle');
    expect(saved()).toEqual(before);
    tap('recap-why-toggle');
    tap('recap-toggle');
    expect(saved()).toEqual(before);
    tap('recap-toggle');
    // The same rows, in the same order, with the same marks.
    expect(seen()).toEqual(first);
    tap('recap-toggle');
    expect(saved()).toEqual(before);
    // The verdict did not change either.
    expect(root().findByType(Verdict).props.correct).toBe(pick === 'right');
    expect(useSession.getState().active!.index).toBe(0);
  });
});

// ── 6. Accessibility ─────────────────────────────────────────────────
describe('6. accessibility: two buttons that say their state, one stop per choice, closed content not in the tree', () => {
  it('"Show question & choices": a 48pt button, spoken "Show / Hide question and choices", expanded false / true', () => {
    open([rich.id, second.id]);
    answer('wrong');
    const closed = toggle()[0];
    expect(closed.props.accessibilityRole).toBe('button');
    expect(closed.props.accessibilityLabel).toBe('Show question and choices');
    expect(closed.props.accessibilityState).toMatchObject({ expanded: false });
    expect(textOf(closed).trim()).toBe('Show question & choices');
    expect(Number(flat(closed).minHeight)).toBeGreaterThanOrEqual(48);
    // Closed content is not in the tree (not merely hidden).
    expect(root().findAll((n) => /^recap-(choices|choice-|why-)/.test(n.props.testID ?? ''))).toHaveLength(0);

    tap('recap-toggle');
    const opened = toggle()[0];
    expect(opened.props.accessibilityRole).toBe('button');
    expect(opened.props.accessibilityLabel).toBe('Hide question and choices');
    expect(opened.props.accessibilityState).toMatchObject({ expanded: true });
    expect(textOf(opened).trim()).toBe('Hide question & choices');
    // One switch of each kind, never two.
    expect(hostLabelled(/question and choices$/)).toHaveLength(1);

    tap('recap-toggle');
    expect(toggle()[0].props.accessibilityLabel).toBe('Show question and choices');
    expect(toggle()[0].props.accessibilityState).toMatchObject({ expanded: false });
    expect(root().findAll((n) => /^recap-(choices|choice-|why-)/.test(n.props.testID ?? ''))).toHaveLength(0);
  });

  it('the question is one stop that says the whole question, folded or open', () => {
    open([rich.id, second.id]);
    const { q } = answer('wrong');
    const whole = `Question: ${q.scenario ? `${q.scenario} ` : ''}${q.stem}`;
    expect(hostLabelled(/^Question: /).map((n) => [n.props.accessible, n.props.accessibilityLabel])).toEqual([[true, whole]]);
    tap('recap-toggle');
    expect(hostLabelled(/^Question: /).map((n) => [n.props.accessible, n.props.accessibilityLabel])).toEqual([[true, whole]]);
  });

  it('each choice is one stop: its display letter, then (for the pick and the best) the words, then the option', () => {
    open([rich.id, second.id]);
    const { q, perm, picked, best } = answer('wrong');
    tap('recap-toggle');
    rows().forEach((row, i) => {
      const d = LETTERS[i];
      const option = q.options[perm[i]]!;
      const stops = rowStops(row);
      expect(stops).toHaveLength(1);
      const label = stops[0].props.accessibilityLabel as string;
      expect(label.startsWith(`${d}`)).toBe(true);
      if (d === best) expect(label).toBe(`${d}, best answer: ${option}`);
      else if (d === picked) expect(label).toBe(`${d}, your answer, not the best: ${option}`);
      else expect(label).toBe(`${d}: ${option}`);
      // Read-only: nothing in a row can be tapped, and no row is a heading.
      expect(row.findAll((n) => typeof n.props.onPress === 'function')).toHaveLength(0);
      expect(row.findAll((n) => n.props.accessibilityRole === 'header')).toHaveLength(0);
      // Colour is never alone: the mark is also a sign and words.
      if (d === best) expect(textOf(row)).toContain('✓ Best answer');
      if (d === picked) expect(textOf(row)).toContain('✗ Your answer');
    });
  });

  it('after a right answer the one row says "your answer, the best"', () => {
    open([rich.id, second.id]);
    const { q, best } = answer('right');
    tap('recap-toggle');
    const said = rows().map((row) => rowStops(row)[0].props.accessibilityLabel as string);
    expect(said.filter((l) => /your answer|best/.test(l))).toEqual([`${best}, your answer, the best: ${q.options[q.correct]}`]);
    expect(textOf(rows()[LETTERS.indexOf(best)])).toContain('✓ Your answer · the best');
    expect(allText()).not.toContain('✗');
  });

  it('"Show why for each choice": a 48pt button with its state; each reason is one more stop in its row, never a heading', () => {
    open([rich.id, second.id]);
    const { q, perm, best } = answer('wrong');
    tap('recap-toggle');
    const closed = whyToggle()[0];
    expect(closed.props.accessibilityRole).toBe('button');
    expect(closed.props.accessibilityLabel).toBe('Show why for each choice');
    expect(closed.props.accessibilityState).toMatchObject({ expanded: false });
    expect(textOf(closed).trim()).toBe('Show why for each choice');
    expect(Number(flat(closed).minHeight)).toBeGreaterThanOrEqual(48);
    expect(root().findAll((n) => WHY.test(n.props.testID ?? ''))).toHaveLength(0);
    // In reading order it comes after the four choices.
    const order = root()
      .findByType(QuestionRecap)
      .findAll((n) => typeof n.type === 'string' && /^recap-(toggle|choice-[A-D]|why-toggle)$/.test(n.props.testID ?? ''))
      .map((n) => n.props.testID);
    expect(order).toEqual(['recap-toggle', 'recap-choice-A', 'recap-choice-B', 'recap-choice-C', 'recap-choice-D', 'recap-why-toggle']);

    tap('recap-why-toggle');
    const opened = whyToggle()[0];
    expect(opened.props.accessibilityLabel).toBe('Hide why for each choice');
    expect(opened.props.accessibilityState).toMatchObject({ expanded: true });
    expect(textOf(opened).trim()).toBe('Hide why for each choice');
    rows().forEach((row, i) => {
      const d = LETTERS[i];
      const stops = rowStops(row);
      // Two stops now: the choice, then its reason.
      expect(stops).toHaveLength(2);
      expect(stops[1].props.testID).toBe(`recap-why-${d}`);
      expect(stops[1].props.accessibilityLabel).toBe(`${d === best ? 'Why' : 'Why not'} ${d}: ${reasonOf(q, perm[i], perm)}`);
      expect(row.findAll((n) => n.props.accessibilityRole === 'header')).toHaveLength(0);
    });
    // "Why D" under the tips is still the screen's one Why heading.
    const whyHeads = root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'header' && typeof n.props.children === 'string' && /^Why /.test(n.props.children));
    expect(whyHeads.map((n) => n.props.children)).toEqual([`Why ${best}`]);

    tap('recap-why-toggle');
    expect(whyToggle()[0].props.accessibilityState).toMatchObject({ expanded: false });
    expect(root().findAll((n) => WHY.test(n.props.testID ?? ''))).toHaveLength(0);
  });

  it('a choice with no reason gets no empty stop, and with no reasons at all there is no second switch', () => {
    const some = choicesFor(fixture, ['A', 'B', 'C', 'D'], 'A').map((ch) => (ch.letter === 'C' ? { ...ch, why: undefined } : ch));
    mount(<QuestionRecap stem={fixture.stem} choices={some} />);
    tap('recap-toggle');
    tap('recap-why-toggle');
    expect(whys().map((n) => n.props.testID)).toEqual(['recap-why-A', 'recap-why-B', 'recap-why-D']);
    unmount();
    mount(<QuestionRecap stem={fixture.stem} choices={some.map((ch) => ({ ...ch, why: undefined }))} />);
    tap('recap-toggle');
    expect(rows()).toHaveLength(4);
    expect(whyToggle()).toHaveLength(0);
  });

  it('a scenario: said in the one question stop, on screen only when open, above the stem', () => {
    const scenario = 'A retail bank moved its payments platform to a new provider last quarter.';
    mount(<QuestionRecap stem={fixture.stem} scenario={scenario} choices={choicesFor(fixture, ['D', 'C', 'B', 'A'], 'D')} />);
    expect(hostLabelled(/^Question: /)[0].props.accessibilityLabel).toBe(`Question: ${scenario} ${fixture.stem}`);
    expect(allText()).not.toContain(scenario);
    tap('recap-toggle');
    const t = allText();
    expect(t.indexOf(scenario)).toBeGreaterThan(-1);
    expect(t.indexOf(scenario)).toBeLessThan(t.indexOf(fixture.stem));
    expect(t.indexOf(fixture.stem)).toBeLessThan(t.indexOf(fixture.options.D!));
    tap('recap-toggle');
    expect(allText()).not.toContain(scenario);
  });

  it('200% text: the letter badge sits above its words, and the row is still one stop', () => {
    const choices = choicesFor(fixture, ['B', 'D', 'A', 'C'], 'D');
    setWindow({ fontScale: 1 });
    mount(<QuestionRecap stem={fixture.stem} choices={choices} />);
    tap('recap-toggle');
    expect(rows().map((row) => flat(rowStops(row)[0]).flexDirection)).toEqual(['row', 'row', 'row', 'row']);
    unmount();
    setWindow({ fontScale: 2 });
    mount(<QuestionRecap stem={fixture.stem} choices={choices} />);
    tap('recap-toggle');
    tap('recap-why-toggle');
    expect(rows().map((row) => flat(rowStops(row)[0]).flexDirection)).toEqual(['column', 'column', 'column', 'column']);
    expect(rows().map((row) => rowStops(row).length)).toEqual([2, 2, 2, 2]);
    // The reasons line up with the words (no indent left over from the side-by-side badge).
    expect(whys().map((w) => flat(w).marginLeft)).toEqual([0, 0, 0, 0]);
    expect(Number(flat(toggle()[0]).minHeight)).toBeGreaterThanOrEqual(48);
  });

  it('a small phone (320pt wide): the folded stem is shorter, still cut at a whole word with one "…"', () => {
    const folded = () => {
      const [line] = root().findAll((n) => typeof n.type === 'string' && n.props.numberOfLines === 2);
      return textOf(line);
    };
    const long = `${fixture.stem} ${fixture.stem}`;
    setWindow({ width: 390, fontScale: 1 });
    mount(<QuestionRecap stem={long} choices={choicesFor(fixture, ['A', 'B', 'C', 'D'], 'A')} />);
    const wide = folded();
    unmount();
    setWindow({ width: 320, fontScale: 1 });
    mount(<QuestionRecap stem={long} choices={choicesFor(fixture, ['A', 'B', 'C', 'D'], 'A')} />);
    const narrow = folded();
    for (const shown of [wide, narrow]) {
      expect(shown.endsWith('…')).toBe(true);
      expect(shown).not.toMatch(/[\s,;:.]…$/);
      expect(long.startsWith(shown.slice(0, -1))).toBe(true);
      // Cut between words, never inside one.
      expect(long.charAt(shown.length - 1)).toMatch(/[\s,;:.]/);
    }
    expect(narrow.length).toBeLessThan(wide.length);
    // Open, the whole stem is there whatever the width.
    tap('recap-toggle');
    expect(root().findAll((n) => typeof n.type === 'string' && n.props.children === long)).toHaveLength(1);
  });
});

// ── 7. Regression: what did NOT change ───────────────────────────────
describe('7. lessons, drills and mocks are unchanged', () => {
  it('a lesson quick check still folds to the stem-only "Show question" (StemRecap), not the practice recap', () => {
    const lesson = CISA_LESSONS.find((l) => l.id === 'cisa-l-d1-charter')!;
    const scene = lesson.scenes.find((s) => s.type === 'check')! as Extract<(typeof lesson.scenes)[number], { type: 'check' }>;
    const wrong = scene.options.find((_, i) => i !== scene.correctIndex)!;
    mockParams = { id: lesson.id };
    mount(<LessonPlayer />);
    // Walk to the check (the lesson's last scene), as lesson-check-reveal.test.tsx does.
    expect(lesson.scenes[lesson.scenes.length - 1]).toBe(scene);
    for (let k = 0; k < lesson.scenes.length - 1; k++) {
      press('Next');
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }
    // Before the pick: the question in full, no recap of either kind.
    expect(root().findAllByType(StemRecap)).toHaveLength(0);
    expect(root().findAllByType(QuestionRecap)).toHaveLength(0);
    const option = root().findAll((n) => typeof n.props.onPress === 'function' && typeof n.props.accessibilityLabel === 'string' && /^Option [A-D]: /.test(n.props.accessibilityLabel) && n.props.accessibilityLabel.includes(wrong.slice(0, 20)))[0];
    act(() => {
      option.props.onPress();
    });
    const recap = root().findAllByType(StemRecap);
    expect(recap).toHaveLength(1);
    expect(recap[0].props).toMatchObject({ stem: scene.question, caption: 'The question' });
    expect(hostLabelled(/^The question: /)).toHaveLength(1);
    expect(root().findAllByType(QuestionRecap)).toHaveLength(0);
    expect(root().findAll((n) => /^(question-recap|recap-)/.test(n.props.testID ?? ''))).toHaveLength(0);
    expect(hostLabelled(/question and choices$/)).toHaveLength(0);
    // A stem this long keeps its own stem-only switch.
    expect(hostLabelled(/^Show question$/)).toHaveLength(scene.question.length > 90 ? 1 : 0);
  });

  it.each([
    ['a miss', false],
    ['a right answer', true],
  ])('a drill answer (%s) still shows the stem-only "Show question" (StemRecap), not the practice recap', (_name, right) => {
    const q = rich;
    const perm = identityPermutation(q);
    const pick = right ? q.correct : LETTERS.find((l) => l !== q.correct && q.options[l])!;
    mount(<DrillAnswer q={q} perm={perm} pick={pick} verdict={oneStepVerdict({ correct: right, best: q.correct, missCoach: 'Coach.' })} animate={false} />);
    const recap = root().findAllByType(StemRecap);
    expect(recap).toHaveLength(1);
    expect(recap[0].props).toMatchObject({ stem: q.stem, field: true });
    expect(hostLabelled(/^Show question$/).map((n) => n.props.accessibilityState)).toEqual([{ expanded: false }]);
    expect(root().findAllByType(QuestionRecap)).toHaveLength(0);
    expect(root().findAll((n) => /^(question-recap|recap-)/.test(n.props.testID ?? ''))).toHaveLength(0);
    expect(hostLabelled(/question and choices$/)).toHaveLength(0);
    // Its own switch still opens the stem only: no choice rows appear.
    press('Show question');
    expect(hostLabelled(/^Hide question$/)).toHaveLength(1);
    expect(rows()).toHaveLength(0);
  });

  it('a mock never renders the recap (or anything else about the answer) while it is being answered', () => {
    startMock('cisa', 3);
    mount(<SessionScreen />);
    const quiet = () => {
      expect(root().findAllByType(QuestionRecap)).toHaveLength(0);
      expect(root().findAllByType(StemRecap)).toHaveLength(0);
      expect(root().findAllByType(AnswerContext)).toHaveLength(0);
      expect(root().findAllByType(AnswerPlate)).toHaveLength(0);
      expect(root().findAllByType(WhyBlock)).toHaveLength(0);
      expect(root().findAllByType(Verdict)).toHaveLength(0);
      expect(root().findAll((n) => REVEALED.test(n.props.testID ?? ''))).toHaveLength(0);
      expect(root().findAllByType(OptionCard).map((n) => n.props.state).filter((s) => s === 'correct' || s === 'wrong')).toEqual([]);
      expect(allText()).not.toMatch(/Show question|Best answer|✓ |✗ |Why not [A-D]\b|Why [A-D]\b/);
      expect(hostLabelled(/question and choices$|^(Show|Hide) question$/)).toHaveLength(0);
    };
    const total = useSession.getState().active!.questionIds.length;
    expect(total).toBe(3);
    for (let k = 0; k < total; k++) {
      expect(useSession.getState().active!.index).toBe(k);
      quiet();
      // A right answer on the first, wrong ones after: neither shows feedback.
      const { q } = select(k === 0 ? 'right' : 'wrong');
      expect(useSession.getState().active!.responses[q.id]).toBeDefined();
      quiet();
      if (k < total - 1) press('Next');
    }
    // Back to an answered question: still no feedback.
    press('Previous question');
    expect(useSession.getState().active!.index).toBe(total - 2);
    quiet();
  });
});
