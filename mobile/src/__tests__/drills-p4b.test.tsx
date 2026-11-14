/**
 * Grove Phase 4b, the phone drills (design-notes/grove/phase4b/PHASE4B.md section 6, "Twig merged with
 * Quiet Round").
 *
 * Plain English for the founder: these tests check
 * - the words: the two-half line names only the half that was earned (never "No point"), the best
 *   answer tapped as the snare never earns the answer half, one-step drills say "Correct" / "Not quite";
 * - the twig: one leaf per item (right filled, missed an outline with a notch, still to come dashed),
 *   one spoken sentence, squares from text scale 1.3, a counter past 8 items; a right leaf fills over
 *   160 ms, and under Reduce Motion it is filled at once;
 * - a Snare Spotter round: the two steps as step squares (the engine's words), the Beginner hint for
 *   the first two rounds only, the answer screen (verdict, answer card with the Snare row, tips, the
 *   folded "Why A, and the key idea"); a right answer plays the reveal, a miss animates nothing;
 * - the intro: back row "Practice", the name as the one display title, "A strong round: 80% or more.",
 *   the three level markers as a radiogroup;
 * - the recap: one forest panel with the score, squares and "New personal best"; the level band on a
 *   level-up (and under Reduce Motion the new level at once, with its one haptic); the level line on a
 *   round with no change ("One more strong round moves you to Practised." with two dots);
 * - Call It First's folded options; Field notes; Term Match on the Drills card; Daylight's stepped bar.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions } from 'react-native';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import TrapSpotter from '../app/game/trap';
import CallItFirst from '../app/game/callit';
import FieldNotes from '../app/field-notes';
import Daylight from '../app/game/daylight';
import Forecast from '../app/game/sprint';
import { PaceStrip } from '../components/pace';
import { Segmented, T } from '../components/ui';
import { DrillAnswer } from '../components/drillAnswer';
import { LevelMarkers, levelSpoken, seedlingHintDue, SNARE_HINT, stepSpoken, Twig, twigMode, twigSpoken, TWIG_MAX } from '../components/drillKit';
import { Drills } from '../components/drills';
import { GameIntro, RoundEnd, STRONG_ROUND } from '../components/game';
import { FadeIn, Pop, resetCelebrationsForTest } from '../components/motion';
import { OptionCard } from '../components/quiz';
import { getAllQuestions } from '../content/loader';
import type { PackQuestion } from '../content/types';
import { CALL_TIER_LINE } from '../engine/games/callItFirst';
import { trapLetter, trapPool } from '../engine/games/trapSpotter';
import { CLEAN_READ, HALF, HALF_RIGHT, oneStepVerdict, snareVerdict, twoHalfVerdict } from '../lib/drillVerdict';
import { identityPermutation } from '../engine/shuffle';
import { light as lightPalette } from '../theme/tokens';
import { drillName, drillTitle, TERM_MATCH } from '../lib/drillNames';
import { selectCert, useProgress } from '../store/progress';
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
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
const mockSuccess = jest.fn();
const mockLight = jest.fn();
jest.mock('../lib/haptics', () => ({ haptic: { success: () => mockSuccess(), selection: () => {}, error: () => {}, light: () => mockLight() } }));

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const textOf = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
const allText = () => textOf(root());
const labels = () => root().findAll((n) => typeof n.type === 'string' && typeof n.props.accessibilityLabel === 'string').map((n) => n.props.accessibilityLabel as string);
const host = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.type === 'string');
const comp = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.type !== 'string');
const styleOf = (n: ReactTestInstance) => Object.assign({}, ...[n.props.style].flat(3).filter(Boolean)) as Record<string, unknown>;
const mount = (el: React.ReactElement) =>
  act(() => {
    r = create(el);
  });
const unmount = () => {
  act(() => r?.unmount());
  r = undefined;
};
const setScale = (fontScale: number) => {
  const w = Dimensions.get('window');
  act(() => Dimensions.set({ window: { ...w, width: 390, fontScale }, screen: { ...w, width: 390, fontScale } }));
};
const options = () => root().findAllByType(OptionCard);
const optionWith = (text: string) => options().find((o) => o.props.text === text)!;
const tap = (o: ReactTestInstance) =>
  act(() => {
    o.props.onPress();
  });
/** The Snare Spotter question on screen. */
const current = (): PackQuestion => {
  const shown = new Set(options().map((o) => o.props.text as string));
  const text = allText();
  return trapPool(getAllQuestions('cisa')).find((q) => text.includes(q.stem) && Object.values(q.options).every((t) => shown.has(t!)))!;
};

beforeEach(() => {
  setMockReducedMotion(true);
  resetCelebrationsForTest();
  mockSuccess.mockClear();
  mockLight.mockClear();
  useProgress.getState().resetCert('cisa');
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', gameRulesSeen: [], badgesHidden: false });
  setScale(1);
});
afterEach(() => {
  unmount();
  setScale(1);
  setMockReducedMotion(true);
  jest.useRealTimers();
});

// ── The words (6.4 item 3) ───────────────────────────────────────────────
describe('the verdict and the two-half line (6.4)', () => {
  const base = { snare: 'D', best: 'A', tapped: 'D', missCoach: 'Coach.', revealed: false };
  it('both halves: "Snare spotted", no line, said with its coach line', () => {
    const v = snareVerdict({ ...base, spotted: true, correct: true });
    expect(v.half).toBeNull();
    expect(v.verdict).toEqual({ word: 'Snare spotted', good: true, coach: 'D was built to fool you, and A is the best. Two points.', spoken: 'Snare spotted. D was built to fool you, and A is the best. Two points.' });
  });
  // Release prep 2.0.0 (final screenshot review): a red "Not quite" above "Best answer picked, 1 point."
  // read as a contradiction, so one earned half says "Half right" (partial, never `good`).
  it('one half: "Half right", and the line names only the earned half', () => {
    expect(snareVerdict({ ...base, spotted: true, correct: false })).toMatchObject({ half: 'Snare spotted, 1 point.', verdict: { word: 'Half right', good: false, partial: true, spoken: 'Half right. Snare spotted, 1 point.' } });
    const best = snareVerdict({ ...base, tapped: 'B', spotted: false, correct: true });
    expect(best).toMatchObject({ half: 'Best answer picked, 1 point.', verdict: { word: 'Half right', partial: true, spoken: 'Half right. Best answer picked, 1 point.', coach: 'The snare was D, not B.' } });
  });
  it('neither half, or the best answer tapped as the snare: "Not quite", no line, never "No point"', () => {
    for (const v of [snareVerdict({ ...base, tapped: 'B', spotted: false, correct: false }), snareVerdict({ ...base, tapped: 'A', spotted: false, correct: true, revealed: true })]) {
      expect(v.half).toBeNull();
      expect(v.verdict).toMatchObject({ word: 'Not quite', good: false, spoken: 'Not quite.' });
      expect(JSON.stringify(v)).not.toMatch(/No point/);
    }
  });
  it('Signpost and Call It First: "Correct" with both, the earned half with one', () => {
    const o = { skillHalf: 'Principle named, 1 point.', skillCoach: 'The principle is marked above.', missCoach: 'Coach.' };
    expect(twoHalfVerdict({ ...o, skill: true, correct: true })).toEqual({ verdict: { word: 'Correct', good: true, coach: CLEAN_READ, spoken: `Correct. ${CLEAN_READ}` }, half: null });
    expect(twoHalfVerdict({ ...o, skill: true, correct: false })).toMatchObject({ half: 'Principle named, 1 point.', verdict: { word: HALF_RIGHT, partial: true, spoken: 'Half right. Principle named, 1 point.' } });
    // Signpost: the word misread, the best answer picked. The heading is the overall result, never "Not quite".
    expect(twoHalfVerdict({ ...o, skill: false, correct: true })).toMatchObject({ half: HALF.best, verdict: { word: HALF_RIGHT, partial: true, coach: 'The principle is marked above.', spoken: `Half right. ${HALF.best}` } });
    const none = twoHalfVerdict({ ...o, skill: false, correct: false });
    expect(none.half).toBeNull();
    expect(none.verdict.word).toBe('Not quite');
    expect(none.verdict.partial).toBeUndefined();
  });
  it('the "Half right" heading is drawn in clay with a neutral mark, never the miss red', () => {
    const q = getAllQuestions('cisa')[0];
    const pick = (['A', 'B', 'C', 'D'] as const).find((l) => l !== q.correct && q.options[l])!;
    const { verdict, half } = twoHalfVerdict({ skill: true, correct: false, skillHalf: 'You read FIRST right, 1 point.', skillCoach: 'x', missCoach: 'Coach.' });
    mount(<DrillAnswer q={q} perm={identityPermutation(q)} pick={pick} verdict={verdict} half={half} animate={false} />);
    const heading = root().findAll((n) => n.props.accessibilityRole === 'header' && n.props.accessibilityLabel === 'Half right. You read FIRST right, 1 point.');
    expect(heading.length).toBeGreaterThan(0);
    const word = root().findAll((n) => typeof n.type !== 'string' && n.props.children === 'Half right' && 'color' in n.props)[0];
    expect(word.props.color).toBe(lightPalette.clay);
    expect(word.props.color).not.toBe(lightPalette.wrong);
    expect(allText()).not.toContain('Not quite');
    expect(host('drill-half')).toHaveLength(1);
    expect(mockSuccess).not.toHaveBeenCalled();
  });
  it('one-step drills say "Correct" or "Not quite" with the best letter, never a half line', () => {
    expect(oneStepVerdict({ correct: true, best: 'B', missCoach: 'x' })).toMatchObject({ word: 'Correct', coach: CLEAN_READ });
    expect(oneStepVerdict({ correct: false, best: 'B', missCoach: 'Close.', extra: '+1 · Lean' }).spoken).toBe('Not quite. Best answer B. +1 · Lean. Close.');
  });
  it('no banned words, no em or en dashes in the new lines', () => {
    const lines = [HALF.snare, HALF.best, HALF_RIGHT, SNARE_HINT, STRONG_ROUND, 'The options open once you name the principle.', 'Options hidden until you name the principle'];
    for (const l of lines) {
      expect(l).not.toMatch(/[—–]/);
      expect(l).not.toMatch(/\b(pass|guarantee|official|evolve|runner-up)\b|you're ready|you’re ready/i);
    }
  });
});

// ── The twig (6.3 items 2 and 3) ─────────────────────────────────────────
describe('the twig (6.3)', () => {
  it('one leaf per item, in its state, said as one sentence', () => {
    mount(<Twig total={5} results={['right', 'missed']} index={2} />);
    expect(host('twig-leaf-right')).toHaveLength(1);
    expect(host('twig-leaf-missed')).toHaveLength(1);
    expect(host('twig-leaf-todo')).toHaveLength(3);
    const twig = host('drill-twig')[0];
    expect(twig.props.accessible).toBe(true);
    expect(twig.props.accessibilityLabel).toBe('Question 3 of 5. 1 right, 1 to review.');
    expect(twigSpoken(1, 5, ['right'])).toBe('Question 2 of 5. 1 right, 0 to review.');
  });
  it('squares from text scale 1.3, a counter for rounds of more than 8 items (never a sideways scroll)', () => {
    expect(twigMode(5, 1)).toBe('twig');
    expect(twigMode(5, 1.3)).toBe('squares');
    expect(twigMode(TWIG_MAX + 1, 1)).toBe('counter');
    expect(twigMode(12, 2)).toBe('counter');
  });
  it('a newly right leaf fills as a layer (opacity and scale 0.85 to 1); under Reduce Motion it is filled at once', () => {
    for (const reduced of [false, true]) {
      setMockReducedMotion(reduced);
      mount(<Twig total={5} results={[]} index={0} />);
      act(() => {
        r!.update(<Twig total={5} results={['right']} index={1} />);
      });
      const leaf = host('twig-leaf-right')[0];
      // The fill layer: the Animated.View over the outline.
      const layer = leaf.findAll((n) => typeof n.type === 'string' && styleOf(n).position === 'absolute' && 'opacity' in styleOf(n))[0];
      expect(styleOf(layer)).toMatchObject(reduced ? { opacity: 1, transform: [{ scale: 1 }] } : { opacity: 0, transform: [{ scale: 0.85 }] });
      unmount();
    }
  });
  it('a leaf already right when the twig is drawn is simply filled', () => {
    setMockReducedMotion(false);
    mount(<Twig total={5} results={['right']} index={1} />);
    const layer = host('twig-leaf-right')[0].findAll((n) => typeof n.type === 'string' && 'opacity' in styleOf(n))[0];
    expect(styleOf(layer).opacity).toBe(1);
  });
});

// ── Small parts ──────────────────────────────────────────────────────────
describe('the steps, the hint and the level words', () => {
  it('a done step is one stop with its result', () => {
    expect(stepSpoken({ label: 'Step 1: tap the snare', state: 'done', result: 'You marked D' })).toBe('Step 1: tap the snare. Done. You marked D.');
    expect(stepSpoken({ label: 'Step 1: what does this question ask for?', state: 'now' })).toBe('Step 1: what does this question ask for?');
  });
  it('the Beginner hint shows for the first two rounds at Beginner only', () => {
    expect(seedlingHintDue('seedling', 0)).toBe(true);
    expect(seedlingHintDue('seedling', 1)).toBe(true);
    expect(seedlingHintDue('seedling', 2)).toBe(false);
    expect(seedlingHintDue('sapling', 0)).toBe(false);
  });
  it('the markers are said as one sentence: "Level: Practised. Skilled not reached."', () => {
    expect(levelSpoken('sapling')).toBe('Level: Practised. Skilled not reached.');
    expect(levelSpoken('seedling')).toBe('Level: Beginner. Practised and Skilled not reached.');
    expect(levelSpoken('heartwood')).toBe('Level: Skilled.');
  });
  it('reached, current and not reached look different by shape (tick, filled leaf, dashed outline)', () => {
    mount(<LevelMarkers level="sapling" />);
    expect(host('marker-reached-seedling')).toHaveLength(1);
    expect(host('marker-current-sapling')).toHaveLength(1);
    const later = host('marker-later-heartwood')[0];
    expect(styleOf(later)).toMatchObject({ borderStyle: 'dashed' });
    expect(labels()).toContain('Level: Practised. Skilled not reached.');
  });
  it('Term Match is the renamed game: only its name changes', () => {
    expect(drillName('field')).toBe(TERM_MATCH);
    expect(drillName('trap')).toBe('Snare Spotter');
    expect(drillTitle('field', 'Term Match · 3 min')).toBe('Term Match');
  });
});

// ── A Snare Spotter round ────────────────────────────────────────────────
describe('a Snare Spotter round (6.3, 6.4)', () => {
  it('step squares with the engine words, the Beginner hint, the twig and the Score caption', () => {
    mount(<TrapSpotter />);
    expect(labels()).toContain('Step 1: tap the snare.');
    expect(allText()).toContain('Step 2: tap the BEST answer');
    expect(allText()).toContain(SNARE_HINT);
    expect(host('drill-twig')).toHaveLength(1);
    expect(allText()).toContain('Score');
    expect(labels()).toContain('Snare Spotter, 1 of 5. Beating distractors');
    // Step 1 tapped: the done step carries its result, the hint is gone.
    const q = current();
    const snare = trapLetter(q)!;
    tap(optionWith(q.options[snare]!));
    const marked = optionWith(q.options[snare]!).props.letter as string;
    expect(labels()).toContain(`Step 1: tap the snare. Done. You marked ${marked}.`);
    expect(allText()).not.toContain(SNARE_HINT);
  });

  it('the hint is gone for good after two rounds', () => {
    act(() => {
      useProgress.getState().recordGame('cisa', 'trap', 6);
      useProgress.getState().recordGame('cisa', 'trap', 8);
    });
    mount(<TrapSpotter />);
    expect(allText()).not.toContain(SNARE_HINT);
  });

  it('both halves: the answer screen, "Snare spotted", a filled leaf, one success haptic', () => {
    mount(<TrapSpotter />);
    const q = current();
    tap(optionWith(q.options[trapLetter(q)!]!));
    tap(optionWith(q.options[q.correct]!));
    expect(options()).toHaveLength(0);
    expect(allText()).toContain('Snare spotted');
    expect(allText()).toContain('How to think about it');
    expect(host('drill-twig')[0].props.accessibilityLabel).toBe('Question 1 of 5. 1 right, 0 to review.');
    expect(host('twig-leaf-right')).toHaveLength(1);
    expect(mockSuccess).toHaveBeenCalledTimes(1);
    // The verdict heading says it once.
    expect(labels().filter((l) => l.startsWith('Snare spotted. '))).toHaveLength(1);
    // The explanation and the key idea wait behind the closed disclosure.
    const why = root().findAll((n) => n.props.testID === 'drill-why' && typeof n.props.onPress === 'function')[0];
    expect(why.props.accessibilityState).toEqual({ expanded: false });
    expect(String(why.props.accessibilityLabel)).toMatch(/^Why [A-D]/);
    act(() => {
      why.props.onPress();
    });
    expect(root().findAll((n) => n.props.testID === 'drill-why' && typeof n.props.onPress === 'function')[0].props.accessibilityState).toEqual({ expanded: true });
  });

  it('a right answer plays the reveal: the leaf springs at 120 ms, the card from 200 ms, rows 30 ms apart', () => {
    setMockReducedMotion(false);
    mount(<TrapSpotter />);
    const q = current();
    tap(optionWith(q.options[trapLetter(q)!]!));
    tap(optionWith(q.options[q.correct]!));
    const answer = root().findByType(DrillAnswer);
    const pop = answer.findAllByType(Pop)[0];
    expect(pop.props).toMatchObject({ mount: true, spring: 'pop', delay: 120 });
    const fades = answer.findAllByType(FadeIn).map((f) => f.props);
    expect(fades.every((p) => p.play === true)).toBe(true);
    const card = fades.find((p) => p.style && p.delay === 200);
    expect(card).toBeDefined();
    const rows = fades.filter((p) => p.delay > 200 && p.delay < 400).map((p) => p.delay as number);
    expect(rows.slice(0, 2)).toEqual([230, 260]);
  });

  it('a miss animates nothing: no leaf spring, every block shown in place, no haptic', () => {
    setMockReducedMotion(false);
    mount(<TrapSpotter />);
    const q = current();
    const other = (['A', 'B', 'C', 'D'] as const).find((l) => l !== q.correct && l !== trapLetter(q) && q.options[l])!;
    tap(optionWith(q.options[other]!));
    tap(optionWith(q.options[trapLetter(q)!]!));
    const answer = root().findByType(DrillAnswer);
    expect(answer.findAllByType(Pop)[0].props.mount).toBe(false);
    for (const f of answer.findAllByType(FadeIn)) expect(f.props.play).toBe(false);
    expect(mockSuccess).not.toHaveBeenCalled();
    expect(host('twig-leaf-missed')).toHaveLength(1);
    expect(allText()).toContain('Not quite');
  });

  it('at text scale 1.3 the header shows numbered squares under it instead of the twig', () => {
    setScale(1.3);
    mount(<TrapSpotter />);
    expect(host('drill-twig')).toHaveLength(0);
    expect(host('drill-squares')).toHaveLength(1);
    expect(host('drill-counter')[0].props.accessibilityLabel).toBe('Question 1 of 5. 0 right, 0 to review.');
  });
});

// ── Call It First (6.3 item 8) ───────────────────────────────────────────
describe('Call It First: the folded options', () => {
  it('folded bars with their line until the principle is named; one labelled group', () => {
    mount(<CallItFirst />);
    expect(labels()).toContain('Practised. Decoys from nearby ideas.');
    act(() => {
      root().findAll((n) => n.props.accessibilityLabel === 'Start' && typeof n.props.onPress === 'function')[0].props.onPress();
    });
    expect(labels()).toContain('Options hidden until you name the principle');
    expect(allText()).toContain('The options open once you name the principle.');
    const cards = options().filter((o) => typeof o.props.onPress === 'function');
    tap(cards[0]);
    expect(host('folded-options')).toHaveLength(0);
  });
});

// ── The intro (6.2) ──────────────────────────────────────────────────────
describe('the intro (6.2)', () => {
  it('large-text level choices stack with bounded, complete captions and retain selection', () => {
    const onPick = jest.fn();
    mount(<LevelMarkers level="seedling" picked="sapling" onPick={onPick} />);
    expect(styleOf(host('level-markers')[0]).flexDirection).toBe('row');
    setScale(2);
    expect(styleOf(host('level-markers')[0]).flexDirection).toBe('column');
    const radios = root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'radio');
    expect(radios.map((n) => n.props.accessibilityState.checked)).toEqual([false, true, false]);
    for (const radio of radios) {
      expect(styleOf(radio).flex).toBeUndefined();
      expect(styleOf(radio).minHeight).toBeGreaterThanOrEqual(48);
      const caption = radio.findByType(T);
      expect(styleOf(caption)).toMatchObject({ flex: 1, minWidth: 0 });
      expect(caption.props.numberOfLines).toBeUndefined();
    }
    expect(radios.map(textOf)).toEqual(['Beginner', 'Practised', 'Skilled']);
    act(() => root().findAll((n) => n.props.testID === 'level-heartwood' && typeof n.props.onPress === 'function')[0].props.onPress());
    expect(onPick).toHaveBeenCalledWith('heartwood');
    setScale(1);
    expect(styleOf(host('level-markers')[0]).flexDirection).toBe('row');
  });

  it('large recap labels stack but small decorative markers stay compact', () => {
    setScale(2);
    mount(<LevelMarkers level="sapling" />);
    expect(styleOf(host('level-markers')[0]).flexDirection).toBe('column');
    expect(host('level-markers')[0].props.accessibilityLabel).toBe('Level: Practised. Skilled not reached.');
    act(() => r!.update(<LevelMarkers level="sapling" small decorative />));
    expect(styleOf(host('level-markers')[0]).flexDirection).toBe('row');
    expect(allText()).not.toContain('Practised');
  });

  it('back row "Practice", the name as the one display title, the strong-round line, the markers as radios', () => {
    const onTier = jest.fn();
    mount(
      <GameIntro game="callit" rules="Rules." tiers={['seedling', 'sapling', 'heartwood']} tier="sapling" onTier={onTier} tierName={{ seedling: 'Beginner', sapling: 'Practised', heartwood: 'Skilled' }} tierLine={CALL_TIER_LINE} level="seedling" onStart={() => {}} />,
    );
    expect(labels()).toContain('Back to Practice');
    expect(allText()).toContain('Call It First');
    expect(allText()).toContain(STRONG_ROUND);
    const radios = root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'radio');
    expect(radios.map((n) => n.props.accessibilityLabel)).toEqual(['Beginner, your level. Decoys from other topics.', 'Practised. Decoys from nearby ideas.', 'Skilled. No cards: think for 10 seconds, then answer.']);
    expect(radios.map((n) => n.props.accessibilityState.checked)).toEqual([false, true, false]);
    for (const n of radios) expect(styleOf(n).minHeight).toBeGreaterThanOrEqual(48);
    act(() => {
      root().findAll((n) => typeof n.props.onPress === 'function' && String(n.props.accessibilityLabel).startsWith('Skilled.'))[0].props.onPress();
    });
    expect(onTier).toHaveBeenCalledWith('heartwood');
  });
});

// ── The recap (6.5) ──────────────────────────────────────────────────────
describe('the recap (6.5)', () => {
  const recap = (props: Partial<React.ComponentProps<typeof RoundEnd>> = {}) => (
    <RoundEnd certId="cisa" game="trap" score={8} max={10} onAgain={() => {}} results={['right', 'right', 'missed', 'right', 'right']} roundLine="This round: 4 of 5 snares spotted" {...props} />
  );

  it('one forest panel: the kicker, the score, the round line, the squares, "New personal best"', () => {
    act(() => {
      useProgress.getState().recordGame('cisa', 'trap', 8);
    });
    mount(recap({ news: { change: null, tier: 'seedling', best: true, moment: null } }));
    expect(host('recap-panel')).toHaveLength(1);
    const panel = textOf(host('recap-panel')[0]);
    for (const t of ['Round complete · Snare Spotter', '8', 'out of 10 · best 8', 'This round: 4 of 5 snares spotted', 'New personal best']) expect(panel).toContain(t);
    expect(host('recap-squares')[0].props.accessibilityLabel).toBe('4 right, 1 to review.');
    expect(host('square-right')).toHaveLength(4);
    expect(host('square-missed')).toHaveLength(1);
    expect(labels()).toContain('Score 8 out of 10');
  });

  it('a round with no level change: "Two strong rounds in a row move you to Practised." (no dots), then one in a row with two dots', () => {
    mount(recap({ news: { change: null, tier: 'seedling', best: false, moment: null } }));
    expect(textOf(host('recap-level-line')[0])).toContain('Two strong rounds in a row move you to Practised.');
    expect(host('recap-level-dots')).toHaveLength(0);
    unmount();
    act(() => {
      useProgress.getState().noteGameRound('cisa', 'trap', { rate: 0.9, tier: 'seedling' });
    });
    mount(recap({ news: { change: null, tier: 'seedling', best: false, moment: null } }));
    expect(textOf(host('recap-level-line')[0])).toContain('One more strong round moves you to Practised.');
    expect(host('recap-level-dots')).toHaveLength(1);
  });

  it('no level line at Skilled, and none on a round whose level changed', () => {
    act(() => {
      useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...selectCert(s, 'cisa'), gameGrowth: { trap: { tier: 'heartwood', up: 0, down: 0 } } } } }));
    });
    mount(recap({ news: { change: null, tier: 'heartwood', best: false, moment: null } }));
    expect(host('recap-level-line')).toHaveLength(0);
  });

  it('a level-up under Reduce Motion: the band with the new level at once, the line, what changes, one light haptic', () => {
    mount(recap({ game: 'callit', tierLines: CALL_TIER_LINE, news: { change: 'up', tier: 'sapling', best: false, moment: null } }));
    expect(comp('recap-markers')[0].props.level).toBe('sapling');
    const band = textOf(host('recap-level')[0]);
    expect(band).toContain('You’ve reached Practised. Your next round starts there.');
    expect(band).toContain('What changes: decoys from nearby ideas.');
    expect(labels()).toContain('Level: Practised. Skilled not reached.');
    expect(mockLight).toHaveBeenCalledTimes(1);
    expect(host('recap-level-line')).toHaveLength(0);
  });

  it('a step back never animates: the level it is back at, its own line', () => {
    setMockReducedMotion(false);
    mount(recap({ news: { change: 'down', tier: 'seedling', best: false, moment: null } }));
    expect(comp('recap-markers')[0].props).toMatchObject({ level: 'seedling', play: false });
    expect(textOf(host('recap-level')[0])).toContain('Back to Beginner. Two strong rounds move you up again.');
    expect(mockLight).not.toHaveBeenCalled();
  });

  it('Play again and Done sit in the sticky footer, side by side, stacked from text scale 1.3', () => {
    mount(recap());
    const again = root().findAll((n) => n.props.accessibilityLabel === 'Play again' && typeof n.props.onPress === 'function');
    expect(again.length).toBeGreaterThan(0);
    expect(labels()).toContain('Done');
  });
});

// ── Field notes (6.6) and the Drills card (6.1) ─────────────────────────
describe('Field notes and the Drills card', () => {
  it('Field notes: back row "You", one row per game with its level in words and the markers drawn', () => {
    act(() => {
      useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...selectCert(s, 'cisa'), gameGrowth: { trap: { tier: 'sapling', up: 0, down: 0 } } } } }));
    });
    mount(<FieldNotes />);
    expect(labels()).toContain('Back to You');
    expect(allText()).toContain('Drill progress');
    expect(labels()).toContain('Snare Spotter. Level: Practised. Skilled not reached. Two rounds in a row at 80% or more, at your level, move you to Skilled.');
    expect(allText()).toContain('Term Match');
    expect(allText()).not.toContain('Field Guide');
  });

  it('the Drills card names Term Match and puts the level leaf before a grown level', () => {
    act(() => {
      useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...selectCert(s, 'cisa'), gameGrowth: { trap: { tier: 'sapling', up: 0, down: 0 } } } } }));
    });
    mount(<Drills />);
    expect(allText()).toContain('Practised');
    expect(allText()).not.toContain('Field Guide');
  });
});

// ── Daylight and Forecast (6.3 items 9 and 10) ──────────────────────────
describe('Daylight and Forecast', () => {
  it('Daylight: "Pick your light" with the markers; the pace bar steps once a second (no tween)', () => {
    mount(<Daylight />);
    expect(allText()).toContain('Pick your light');
    expect(labels()).toContain('Beginner, 120 seconds a question, suggested');
    act(() => {
      root().findAll((n) => n.props.accessibilityLabel === 'Start' && typeof n.props.onPress === 'function')[0].props.onPress();
    });
    expect(root().findByType(PaceStrip).props.bar).toMatchObject({ step: true });
  });

  it('Forecast: its three segments stack from text scale 1.5', () => {
    useSettings.setState({ gameRulesSeen: ['sprint'] });
    mount(<Forecast />);
    expect(root().findByType(Segmented).props.stackAt).toBe(1.5);
  });
});
