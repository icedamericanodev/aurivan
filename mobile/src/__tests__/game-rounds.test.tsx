/**
 * QA Build 1: every game played to its recap, against the real stores.
 *
 * Each game is played for a whole round, once all right and once all
 * wrong, and the recap must agree with what happened:
 * - the score, its maximum, and one history entry per round;
 * - "What caught you" lists every miss (and nothing on a clean round);
 * - "Missed questions are in your review." only when an ANSWER was wrong,
 *   and those questions really are due in spaced review;
 * - Sure Footing: a right Guess or Lean comes back tomorrow, not now.
 *
 * Gotcha (see session-screen.regression.test.tsx): never write
 * `act(() => store.action())` — use braces.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { OptionCard } from '../components/quiz';
import { getAllQuestions } from '../content/loader';
import type { Letter, PackQuestion } from '../content/types';
import { ASK_FOR, ASK_LABEL, ASKS, priorityPool, priorityWord } from '../engine/games/priorityLens';
import { REVIEW_LINE } from '../engine/games/recap';
import { trapLetter, trapPool } from '../engine/games/trapSpotter';
import { DAY_MS, dueIds } from '../engine/srs';
import { selectCert, useProgress } from '../store/progress';
import { useSettings } from '../store/settings';
import TrapSpotter from '../app/game/trap';
import SureFooting from '../app/game/sprint';
import Signpost from '../app/game/priority';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-reanimated', () => {
  const { View, Text, ScrollView } = jest.requireActual('react-native');
  const builder: object = new Proxy({}, { get: () => () => builder });
  const id = (v: unknown) => v;
  return {
    __esModule: true,
    default: { View, Text, ScrollView, createAnimatedComponent: (c: unknown) => c },
    createAnimatedComponent: (c: unknown) => c,
    useReducedMotion: () => true,
    useSharedValue: (v: unknown) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    useAnimatedProps: () => ({}),
    withTiming: id,
    withDelay: (_d: number, v: unknown) => v,
    withSpring: id,
    withRepeat: id,
    withSequence: (...v: unknown[]) => v[v.length - 1],
    cancelAnimation: () => {},
    Easing: new Proxy({}, { get: () => () => id }),
    ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
    FadeIn: builder,
    FadeInDown: builder,
    FadeOut: builder,
  };
});
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

const BANK = getAllQuestions('cisa');
let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const options = () => root().findAllByType(OptionCard);
const optionWith = (text: string) => options().find((o) => o.props.text === text)!;
/** The question on screen: stem shown and every option shown (a few questions share option texts). */
const onScreen = (pool: PackQuestion[]): PackQuestion => {
  const shown = new Set(options().map((o) => o.props.text as string));
  const text = allText();
  const q = pool.find((x) => text.includes(x.stem) && Object.values(x.options).every((t) => shown.has(t!)));
  if (!q) throw new Error('question on screen not found');
  return q;
};
const tap = (o: ReactTestInstance) =>
  act(() => {
    o.props.onPress();
  });
const press = (label: string) => {
  const hits = root().findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function');
  if (!hits.length) throw new Error(`no control labelled "${label}"`);
  act(() => {
    hits[0].props.onPress();
  });
};
const hasLabel = (label: string) => root().findAll((n) => n.props.accessibilityLabel === label).length > 0;
const mount = (el: React.ReactElement) =>
  act(() => {
    r = create(el);
  });
const wrongLetters = (q: PackQuestion) => (Object.keys(q.options) as Letter[]).filter((l) => l !== q.correct);
const cisa = () => selectCert(useProgress.getState(), 'cisa');

beforeEach(() => {
  useProgress.getState().resetCert('cisa');
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', gameRulesSeen: ['sprint'] });
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
});

describe('Snare Spotter: a whole round to the recap', () => {
  const POOL = trapPool(BANK);
  const playRound = (turn: (q: PackQuestion) => { snare: Letter; answer: Letter }) => {
    mount(<TrapSpotter />);
    const played: PackQuestion[] = [];
    for (let k = 0; k < 5; k++) {
      const q = onScreen(POOL);
      played.push(q);
      const { snare, answer } = turn(q);
      tap(optionWith(q.options[snare]!));
      tap(optionWith(q.options[answer]!));
      press(k === 4 ? 'See results' : 'Next question');
    }
    expect(allText()).toContain('Round complete');
    return played;
  };

  it('all right: 10 of 10, nothing caught you, no review line', () => {
    const played = playRound((q) => ({ snare: trapLetter(q)!, answer: q.correct }));
    expect(hasLabel('Score 10 out of 10')).toBe(true);
    expect(allText()).not.toContain('What caught you');
    expect(allText()).not.toContain(REVIEW_LINE);
    expect(cisa().gameRecent.trap).toEqual([10]);
    expect(cisa().gameBest.trap).toBe(10);
    // Never-missed questions answered right are not scheduled.
    for (const q of played) expect(cisa().review[q.id]).toBeUndefined();
  });

  it('all wrong: 0 of 10, every miss listed with its real snare, and all of them due in review', () => {
    const played = playRound((q) => {
      // Name a wrong option that is NOT the snare, then answer with the snare.
      const other = wrongLetters(q).find((l) => l !== trapLetter(q))!;
      return { snare: other, answer: trapLetter(q)! };
    });
    expect(hasLabel('Score 0 out of 10')).toBe(true);
    expect(allText()).toContain('What caught you');
    expect(allText()).toContain(REVIEW_LINE);
    // One "Snare: …" tag per question, naming the REAL snare.
    expect(allText().split('Snare: ').length - 1).toBe(5);
    const due = dueIds(cisa().review, Date.now());
    for (const q of played) {
      expect(due).toContain(q.id);
      expect(cisa().mistakes[q.id].picked).toBe(trapLetter(q));
    }
    expect(cisa().gameRecent.trap).toEqual([0]);
  });

  it('the best answer named as the snare every time: still answerable, 1 point each, assisted, no review line', () => {
    const played = playRound((q) => ({ snare: q.correct, answer: q.correct }));
    expect(hasLabel('Score 5 out of 10')).toBe(true);
    // Every snare was missed (so each is listed), but no ANSWER was wrong.
    expect(allText()).toContain('What caught you');
    expect(allText()).not.toContain(REVIEW_LINE);
    for (const q of played) expect(cisa().answers[q.id].lastAssisted).toBe(true);
  });

  it('Play again starts a fresh round and the next recap shows a two-round trend', () => {
    playRound((q) => ({ snare: trapLetter(q)!, answer: q.correct }));
    press('Play again');
    expect(allText()).not.toContain('Round complete');
    expect(hasLabel('Score 0')).toBe(true);
    for (let k = 0; k < 5; k++) {
      const q = onScreen(POOL);
      tap(optionWith(q.options[q.correct]!));
      tap(optionWith(q.options[q.correct]!));
      press(k === 4 ? 'See results' : 'Next question');
    }
    expect(cisa().gameRecent.trap).toEqual([10, 5]);
    expect(allText()).toContain('Last 2 rounds');
    expect(hasLabel('Your last 2 rounds: 10, 5. Best 10.')).toBe(true);
  });
});

describe('Sure Footing: a whole round to the recap', () => {
  const play = (footing: (k: number) => 'Guess' | 'Lean' | 'Sure', right: boolean) => {
    mount(<SureFooting />);
    const played: PackQuestion[] = [];
    const spoken = { Guess: 'Guess: plus 1 if right, nothing if wrong', Lean: 'Lean: plus 2 if right, minus 1 if wrong', Sure: 'Sure: plus 3 if right, minus 5 if wrong' };
    for (let k = 0; k < 8; k++) {
      const q = onScreen(BANK);
      played.push(q);
      press(spoken[footing(k)]);
      tap(optionWith(q.options[right ? q.correct : wrongLetters(q)[0]]!));
      press(k === 7 ? 'See how sure you were' : 'Next question');
    }
    expect(allText()).toContain('Round complete');
    return played;
  };

  it('all right on Guess and Lean: scores 12 of 24, no misses, and every one comes back TOMORROW', () => {
    const before = Date.now();
    const played = play((k) => (k < 4 ? 'Guess' : 'Lean'), true);
    // 4 × Guess (+1) + 4 × Lean (+2) = 12; the max is 8 × 3.
    expect(hasLabel('Score 12 out of 24')).toBe(true);
    expect(allText()).not.toContain('What caught you');
    expect(allText()).toContain('You were right more often than you believed.');
    const review = cisa().review;
    // Not due now (the learner has just seen the answer)…
    expect(played.filter((q) => dueIds(review, Date.now()).includes(q.id))).toEqual([]);
    played.forEach((q, k) => {
      const e = review[q.id];
      // …but due a day later: Guess → Box 1, Lean (unsure) → Box 2.
      expect(e.box).toBe(k < 4 ? 1 : 2);
      expect(e.dueAt).toBeGreaterThanOrEqual(before + DAY_MS);
      expect(e.dueAt).toBeLessThanOrEqual(Date.now() + DAY_MS);
    });
    expect(dueIds(review, Date.now() + DAY_MS + 1).length).toBe(8);
  });

  it('all right on Sure: 24 of 24 and nothing is scheduled', () => {
    const played = play(() => 'Sure', true);
    expect(hasLabel('Score 24 out of 24')).toBe(true);
    for (const q of played) expect(cisa().review[q.id]).toBeUndefined();
  });

  it('all wrong on Sure: −40, eight misses, the over-confidence note, and all eight due now', () => {
    const played = play(() => 'Sure', false);
    expect(hasLabel('Score -40 out of 24')).toBe(true);
    expect(allText()).toContain('What caught you');
    expect(allText()).toContain(REVIEW_LINE);
    expect(allText()).toContain('Some of your Sure answers missed.');
    const due = dueIds(cisa().review, Date.now());
    for (const q of played) {
      expect(due).toContain(q.id);
      expect(cisa().mistakes[q.id].confidence).toBe('sure');
    }
    expect(cisa().gameBest.sprint).toBe(-40);
    expect(cisa().gameRecent.sprint).toEqual([-40]);
  });
});

describe('Signpost: step 1 and a whole round to the recap', () => {
  const POOL = priorityPool(BANK);
  /** The question whose stem is on screen (options are hidden in step 1). */
  const stemOnScreen = () => {
    const text = allText();
    const qs = POOL.filter((q) => text.includes(q.stem));
    if (!qs.length) throw new Error('stem not found');
    return qs;
  };

  it('step 1 shows four meanings, never the capital word, and hides the options until one is chosen', () => {
    mount(<Signpost />);
    expect(allText()).toContain('Step 1: what does this question ask for?');
    expect(options()).toHaveLength(0);
    for (const a of ASKS) expect(hasLabel(ASK_LABEL[a])).toBe(true);
    for (const a of ASKS) expect(ASK_LABEL[a]).not.toMatch(/\b(FIRST|BEST|MOST|PRIMARY|GREATEST)\b/);
    const word = priorityWord(stemOnScreen()[0].stem)!;
    press(ASK_LABEL[ASK_FOR[word]]);
    expect(allText()).toContain(`${word}: you read it right`);
    expect(options().length).toBeGreaterThanOrEqual(3);
    expect(allText()).toContain('Step 2: answer with that in mind');
  });

  const play = (right: boolean) => {
    mount(<Signpost />);
    const played: PackQuestion[] = [];
    for (let k = 0; k < 5; k++) {
      const candidates = stemOnScreen();
      const word = priorityWord(candidates[0].stem)!;
      const ask = right ? ASK_FOR[word] : ASKS.find((a) => a !== ASK_FOR[word])!;
      press(ASK_LABEL[ask]);
      // The stem is now split by the highlighted word: match on the options.
      const shown = new Set(options().map((o) => o.props.text as string));
      const q = candidates.find((x) => Object.values(x.options).every((t) => shown.has(t!)))!;
      played.push(q);
      tap(optionWith(q.options[right ? q.correct : wrongLetters(q)[0]]!));
      press(k === 4 ? 'See results' : 'Next question');
    }
    expect(allText()).toContain('Round complete');
    return played;
  };

  it('all right: 10 of 10, nothing caught you', () => {
    play(true);
    expect(hasLabel('Score 10 out of 10')).toBe(true);
    expect(allText()).not.toContain('What caught you');
    expect(allText()).not.toContain(REVIEW_LINE);
    expect(cisa().gameRecent.priority).toEqual([10]);
  });

  it('all wrong: 0 of 10, each miss names its deciding word, all due in review', () => {
    const played = play(false);
    expect(hasLabel('Score 0 out of 10')).toBe(true);
    expect(allText()).toContain('What caught you');
    expect(allText()).toContain(REVIEW_LINE);
    for (const q of played) expect(allText()).toContain(`Signpost word: ${priorityWord(q.stem)}`);
    const due = dueIds(cisa().review, Date.now());
    for (const q of played) expect(due).toContain(q.id);
  });
});

describe('Sure Footing: rules on the first play only', () => {
  // KNOWN BUG (QA Build 1): the rules are only marked seen by "Got it" (or
  // the info button). A learner who plays the whole first round without
  // tapping it keeps the rules panel above every question, and sees it
  // again on the next play. Flip `it.failing` to `it` once the rules count
  // as seen when the first answer is given (app/game/sprint.tsx).
  it.failing('a first round played without tapping "Got it" still counts as seeing the rules', () => {
    useSettings.setState({ gameRulesSeen: [] });
    mount(<SureFooting />);
    expect(allText()).toContain('How Sure Footing scores');
    const q = onScreen(BANK);
    press('Guess: plus 1 if right, nothing if wrong');
    tap(optionWith(q.options[q.correct]!));
    press('Next question');
    // The panel no longer sits above the second question…
    expect(allText()).not.toContain('How Sure Footing scores');
    // …and the next play starts without it.
    expect(useSettings.getState().gameRulesSeen).toContain('sprint');
  });
});
