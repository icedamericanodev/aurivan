/**
 * Game screens, rendered against the real stores.
 *
 * Snare Spotter: the dead end is gone. Tapping the BEST answer as
 * the snare used to disable it in step 2, so the question could not be
 * answered and scored 0 with no explanation. Now the screen says it is
 * the best answer, keeps it open, and a right answer still scores.
 *
 * Forecast (was Sure Footing): the scoring rules show in its intro on the first play, then live
 * behind the info button; the chips say their points.
 *
 * Gotcha (see session-screen.regression.test.tsx): never write
 * `act(() => store.action())` — use braces.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AccessibilityInfo, Dimensions, ScrollView, StyleSheet } from 'react-native';
import { OptionCard } from '../components/quiz';
import { getAllQuestions } from '../content/loader';
import type { PackQuestion } from '../content/types';
import { trapLetter, trapPool } from '../engine/games/trapSpotter';
import { selectCert, useProgress } from '../store/progress';
import { useSettings } from '../store/settings';
import TrapSpotter from '../app/game/trap';
import * as registry from '../engine/games/registry';
import Forecast from '../app/game/sprint';
import Signpost from '../app/game/priority';

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
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const options = () => root().findAllByType(OptionCard);
/** The question on screen: the snare question whose options are the ones shown. */
const current = (): PackQuestion => {
  const shown = new Set(options().map((o) => o.props.text as string));
  const text = allText();
  return trapPool(getAllQuestions('cisa')).find((q) => text.includes(q.stem) && Object.values(q.options).every((t) => shown.has(t!)))!;
};
/** The question on screen, from the whole bank (Forecast draws from all of it). */
const currentAny = (): PackQuestion => {
  const shown = new Set(options().map((o) => o.props.text as string));
  // Match the stem too: a few bank questions share the same option texts.
  const text = allText();
  return getAllQuestions('cisa').find((q) => text.includes(q.stem) && Object.values(q.options).every((t) => shown.has(t!)))!;
};
const optionWith = (text: string) => options().find((o) => o.props.text === text)!;
const tap = (o: ReactTestInstance) =>
  act(() => {
    o.props.onPress();
  });

const mount = (el: React.ReactElement) =>
  act(() => {
    r = create(el);
  });
const press = (label: string) =>
  act(() => {
    root().findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0].props.onPress();
  });

beforeEach(() => {
  useProgress.getState().resetCert('cisa');
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', gameRulesSeen: [] });
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
});

describe('Snare Spotter: picking the best answer as the snare', () => {
  beforeEach(() => mount(<TrapSpotter />));

  it('explains it, keeps the best answer open, and scores 0 because it was revealed', () => {
    const q = current();
    const best = q.options[q.correct]!;
    tap(optionWith(best));
    expect(allText()).toContain('That’s the best answer, not the snare');
    const shownAs = optionWith(best).props.letter as string;
    expect(allText()).toContain(`You picked ${shownAs}, the best one.`);
    // Not a dead end: the best answer can still be chosen in step 2.
    expect(optionWith(best).props.disabled).toBe(false);
    tap(optionWith(best));
    expect(root().findAll((n) => n.props.accessibilityLabel === 'Score 0').length).toBeGreaterThan(0);
    // Grove 4b (PHASE4B 6.4 item 3): the answer half is never credited once it was revealed: "Not quite", no line.
    expect(allText()).toContain('Not quite');
    expect(allText()).toContain(`not ${shownAs}.`);
    expect(allText()).not.toContain('Best answer picked, 1 point.');
    expect(allText()).not.toContain('Snare spotted, 1 point.');
    expect(root().findAll((n) => n.props.testID === 'drill-row-best' && typeof n.props.accessibilityLabel === 'string')[0].props.accessibilityLabel).toContain(`Your answer, ${shownAs}, the best`);
    // We told them which option was best, so the answer counts as assisted.
    expect(selectCert(useProgress.getState(), 'cisa').answers[q.id].lastAssisted).toBe(true);
  });

  it('the answer card: your wrong pick ✗, the real snare as a "Snare" row (outline badge, never clay), the best ✓, and the earned half', () => {
    const q = current();
    const snare = trapLetter(q)!;
    const other = (['A', 'B', 'C', 'D'] as const).find((l) => l !== q.correct && l !== snare && q.options[l])!;
    tap(optionWith(q.options[snare]!)); // step 1: spotted
    tap(optionWith(q.options[other]!)); // step 2: a wrong answer that is NOT the snare
    const row = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.props.accessibilityLabel === 'string')[0];
    expect(row('drill-row-pick').props.accessibilityLabel).toMatch(new RegExp(`^Your answer, [A-D], not the best: ${q.options[other]!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    expect(row('drill-row-snare').props.accessibilityLabel).toContain(q.options[snare]!);
    expect(row('drill-row-best').props.accessibilityLabel).toContain(`: ${q.options[q.correct]!}`);
    expect(allText()).toContain('Snare spotted, 1 point.');
    expect(allText()).toContain('Not quite');
  });

  it('taking the snare as your answer: one row says "Your answer · the snare" (no second snare row)', () => {
    const q = current();
    const snare = trapLetter(q)!;
    const other = (['A', 'B', 'C', 'D'] as const).find((l) => l !== q.correct && l !== snare && q.options[l])!;
    tap(optionWith(q.options[other]!)); // step 1: missed the snare
    tap(optionWith(q.options[snare]!)); // step 2: fell for it
    expect(allText()).toContain('✗ Your answer · the snare');
    expect(root().findAll((n) => n.props.testID === 'drill-row-snare')).toHaveLength(0);
    // Neither half: "Not quite", no two-half line.
    expect(allText()).not.toContain('1 point.');
  });

  it('a wrong (non-best) snare pick is still closed in step 2', () => {
    const q = current();
    const other = (['A', 'B', 'C', 'D'] as const).find((l) => l !== q.correct && l !== trapLetter(q) && q.options[l])!;
    tap(optionWith(q.options[other]!));
    expect(allText()).not.toContain('That’s the best answer, not the snare');
    expect(optionWith(q.options[other]!).props.disabled).toBe(true);
    expect(optionWith(q.options[q.correct]!).props.disabled).toBe(false);
  });
});

describe('Forecast (was Sure Footing): rules and chips', () => {
  it('shows the rules in its intro on the first play (never on top of a question), then only behind the info button', () => {
    mount(<Forecast />);
    // The intro: the game's tagline as the hero, the scoring rules, and Start. No question yet.
    expect(allText()).toContain('How scoring works');
    expect(allText()).toContain('How sure are you, really? Honest confidence scores best.');
    expect(allText()).not.toContain('First: how sure are you?');
    press('Start');
    expect(allText()).not.toContain('How scoring works');
    expect(allText()).toContain('First: how sure are you?');
    expect(useSettings.getState().gameRulesSeen).toContain('sprint');
    act(() => {
      r!.unmount();
    });
    // The next play starts on the first question.
    mount(<Forecast />);
    expect(allText()).not.toContain('How scoring works');
    expect(allText()).toContain('First: how sure are you?');
    const info = () => root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityLabel === 'How scoring works' && n.props.accessibilityRole === 'button')[0];
    // It shows/hides a panel, so it is "collapsed" / "expanded", not "selected".
    expect(info().props.accessibilityState).toEqual({ expanded: false });
    press('How scoring works');
    expect(allText()).toContain('How scoring works');
    expect(info().props.accessibilityState).toEqual({ expanded: true });
  });

  it('offers Guess, Lean and Sure as one radio group, shows the points once, and scores Sure −5 on a miss', () => {
    useSettings.setState({ gameRulesSeen: ['sprint'] });
    mount(<Forecast />);
    // The game's own words only (question content may say "high-stakes").
    const group = root().findAll((n) => n.props.accessibilityRole === 'radiogroup' && n.props.accessibilityLabel === 'How sure are you?');
    expect(group.length).toBeGreaterThan(0);
    const chips = root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'radio' && /^(Guess|Lean|Sure)\b/.test(String(n.props.accessibilityLabel)));
    expect(chips.length).toBe(3);
    for (const c of chips) expect(c.props.accessibilityState).toEqual({ checked: false });
    // Pills show the word only; no points until one is chosen.
    expect(allText()).not.toContain('if wrong');
    for (const c of chips) expect(String(c.props.accessibilityLabel)).not.toMatch(/\b(bet|stake)/i);
    expect(allText()).toContain('First: how sure are you?');
    press('Sure: plus 3 if right, minus 5 if wrong');
    expect(allText()).toContain('+3 if right · −5 if wrong');
    const wrong = options().find((o) => o.props.text !== currentAny().options[currentAny().correct])!;
    tap(wrong);
    // −5 on the first question: the running score shows 0 (display only, never negative).
    expect(root().findAll((n) => n.props.accessibilityLabel === 'Score 0').length).toBeGreaterThan(0);
  });

  it('at 200% text the rules rows wrap: the points drop under the label, left-aligned', () => {
    const w = Dimensions.get('window');
    const rowOf = () => {
      const payoff = root().findAll((n) => typeof n.type === 'string' && n.children.includes('+3 right · −5 wrong'))[0];
      let p = payoff.parent;
      while (p && !(typeof p.type === 'string' && StyleSheet.flatten(p.props.style)?.flexWrap)) p = p.parent;
      return { row: StyleSheet.flatten(p!.props.style), text: StyleSheet.flatten(payoff.props.style) };
    };
    // Jest's default screen reports fontScale 2: start from 100%.
    act(() => {
      Dimensions.set({ window: { ...w, fontScale: 1 }, screen: { ...w, fontScale: 1 } });
    });
    mount(<Forecast />);
    expect(rowOf().row).toMatchObject({ flexDirection: 'row', flexWrap: 'wrap' });
    expect(rowOf().text.flexShrink).toBe(1);
    act(() => {
      r!.unmount();
    });
    act(() => {
      Dimensions.set({ window: { ...w, fontScale: 2 }, screen: { ...w, fontScale: 2 } });
    });
    mount(<Forecast />);
    expect(rowOf().row).toMatchObject({ flexDirection: 'column', alignItems: 'flex-start' });
    expect(rowOf().text.textAlign).not.toBe('right');
    act(() => {
      Dimensions.set({ window: { ...w, fontScale: 1 }, screen: { ...w, fontScale: 1 } });
    });
  });
});

describe('Forecast rules panel', () => {
  it('each rule row is one stop with the points AND when to choose it', () => {
    mount(<Forecast />);
    const row = root().findAll((n) => typeof n.type === 'string' && String(n.props.accessibilityLabel).startsWith('Sure: plus 3'));
    expect(row[0].props.accessibilityLabel).toBe('Sure: plus 3 if right, minus 5 if wrong. You would put your name to it.');
  });

  it('opened from the info button mid-question, screen-reader focus moves to its heading', () => {
    useSettings.setState({ gameRulesSeen: ['sprint'] });
    const focus = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation(() => {});
    // Refs on host views are null in the test renderer unless we hand it a fake native node.
    act(() => {
      r = create(<Forecast />, { createNodeMock: () => ({}) });
    });
    expect(allText()).not.toContain('How scoring works');
    // The game's ScrollView (Jest's mock instance): spy on its scrollTo.
    const scrollTo = jest.spyOn(root().findByType(ScrollView).instance as { scrollTo: (o: object) => void }, 'scrollTo');
    focus.mockClear();
    press('How scoring works');
    expect(focus).toHaveBeenCalledTimes(1);
    const [target, event] = focus.mock.calls[0] as unknown as [{ props: { accessibilityLabel: string } }, string];
    expect(event).toBe('focus');
    expect(target.props.accessibilityLabel).toBe('How scoring works');
    // …and the question scrolls back up to the panel.
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
    focus.mockRestore();
  });
});

describe('Signpost step 1', () => {
  it('asks its question as a heading (the step square on screen) above the four meanings, said once', () => {
    mount(<Signpost />);
    const prompt = 'Step 1: what does this question ask for?';
    const heading = root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'header' && n.props.accessibilityLabel === prompt);
    expect(heading).toHaveLength(1);
    // Grove 4b: the step squares carry the prompt; the footer no longer repeats it.
    const copies = root().findAll((n) => typeof n.type === 'string' && n.children.includes(prompt));
    expect(copies).toHaveLength(1);
    // The heading comes before the first meaning button.
    const text = allText();
    expect(text.indexOf(prompt)).toBeLessThan(text.indexOf('The step that must come before the others'));
  });
});

describe('a game this exam cannot play', () => {
  it('shows "on the way" with a way to Practice instead of an empty round', () => {
    const spy = jest.spyOn(registry, 'isPlayable').mockReturnValue(false);
    mount(<TrapSpotter />);
    expect(allText()).toContain('This game is on the way');
    expect(options()).toHaveLength(0);
    expect(root().findAll((n) => n.props.accessibilityLabel === 'Go to Practice').length).toBeGreaterThan(0);
    spy.mockRestore();
  });
});
