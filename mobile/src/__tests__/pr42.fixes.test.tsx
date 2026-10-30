/**
 * PR #42 review fixes (mobile 1.12 "Learn and Play"): CR_42, UX_42 and the
 * QA bugs. The jest Reanimated mock lands every animation on its end state,
 * so these pin the RULES: what a screen reader reads (host nodes, not
 * component props), what springs and when, what the footer shows while a
 * page is leaving, and which haptics fire.
 *
 * - CR B1: the round header's score says "Score N" at all times (probe P1).
 * - CR B2 / UX P3: a tile's ✓ / ✗ pops when its state changes on screen,
 *   never on the screen's first paint (probe P2).
 * - CR minor 1: finishing a lesson (full motion) keeps the Finish button
 *   until Lesson complete is placed (probe P3); the counter follows the page.
 * - CR minors 2, 3, 6, 7 / QA bugs 1–3: one haptic per moment, after commit.
 * - CR minors 4, 5, 11: Learn's ✓ waits empty out of view, then draws; a
 *   still ✓ has no animated nodes; reduced, a late play fades in.
 * - UX H1, P2, P4, P7, O3 and the Forecast rename guard.
 */
import fs from 'fs';
import path from 'path';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions, StyleSheet, Text } from 'react-native';
import * as Re from 'react-native-reanimated';
import { Path } from 'react-native-svg';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import LessonPlayer from '../app/lesson/[id]';
import Learn from '../app/(tabs)/learn';
import { LEAF_SETTLE_MS, MatchTile, RoundEnd, RoundScore, SparkScores } from '../components/game';
import { SPARK, TierLeafMorph } from '../components/glyphs';
import { SceneView } from '../components/lesson';
import { CheckDraw, FadeIn, Pop, resetCelebrationsForTest } from '../components/motion';
import { PushedHeader } from '../components/ui';
import { CISA_LESSONS } from '../content/lessons/cisa';
import { clearFinishedLessons, noteLessonFinished, wasJustFinished } from '../lib/lessonNews';
import { useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSettings } from '../store/settings';
import { light, motion } from '../theme/tokens';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
let mockParams: Record<string, string | undefined> = {};
// Tab focus we control: Learn draws its ✓ when it comes back into view.
let mockFocused = true;
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), setParams: jest.fn(), canGoBack: () => true, canDismiss: () => false },
    useFocusEffect: (cb: () => void | (() => void)) => {
      const f = mockFocused;
      React.useEffect(() => (f ? cb() : undefined), [cb, f]);
    },
    useIsFocused: () => mockFocused,
    useLocalSearchParams: () => mockParams,
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
const mockLight = jest.fn();
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => mockLight() } }));
// "Practice this topic" draws its ids when Lesson complete's footer mounts: a spy says when.
const mockInterleave = jest.fn();
jest.mock('../engine/studyModes', () => {
  const actual = jest.requireActual('../engine/studyModes');
  return {
    ...actual,
    interleaveTopic: (...a: unknown[]) => {
      mockInterleave();
      return actual.interleaveTopic(...a);
    },
  };
});

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const root = () => r!.root;
const isHost = (n: ReactTestInstance) => typeof n.type === 'string';
/** Host nodes (what a screen reader reads) with this label. */
const hostLabelled = (label: string) => root().findAll((n) => isHost(n) && n.props.accessibilityLabel === label);
/** The Button components with this label (one per button: not its inner Pressable too). */
const buttons = (label: string | RegExp) =>
  root().findAll(
    (n) =>
      typeof n.props.onPress === 'function' &&
      !isHost(n) &&
      n.props.accessibilityRole !== 'button' &&
      [n.props.label, n.props.accessibilityLabel].some((l) => typeof l === 'string' && (typeof label === 'string' ? l === label : label.test(l))),
  );
const press = (label: string | RegExp) => {
  const b = buttons(label).at(0);
  if (!b) throw new Error(`No button "${String(label)}"`);
  act(() => {
    b.props.onPress();
  });
};
const advance = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });
const counter = () =>
  root()
    .findAll((n) => isHost(n) && /^Scene \d+ of \d+$/.test(String(n.props.accessibilityLabel)))
    .at(0)?.props.accessibilityLabel as string | undefined;
const style = (n: ReactTestInstance) => StyleSheet.flatten(n.props.style) ?? {};

const charter = CISA_LESSONS.find((l) => l.id === 'cisa-l-d1-charter')!;

beforeEach(() => {
  useProgress.getState().resetCert('cisa');
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', shuffleOptions: false, motion: 'system', gameRulesSeen: [] });
  useSeen.setState({ moments: {} });
  resetCelebrationsForTest();
  clearFinishedLessons();
  setMockReducedMotion(true);
  mockLight.mockClear();
  mockInterleave.mockClear();
  mockParams = {};
  mockFocused = true;
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ── CR B1 (probe P1) ────────────────────────────────────────────────────
describe('the round header score (CR B1)', () => {
  it('reduced: the still score is one host stop that says "Score 4"', () => {
    mount(<RoundScore value={4} />);
    expect(hostLabelled('Score 4')).toHaveLength(1);
    expect(hostLabelled('Score 4')[0].props.accessible).toBe(true);
  });

  it('full motion: "Score 3" during the roll AND after it ends (one stop, never a bare number)', () => {
    setMockReducedMotion(false);
    jest.useFakeTimers();
    mount(<RoundScore value={0} />);
    expect(hostLabelled('Score 0')).toHaveLength(1);
    act(() => {
      r!.update(<RoundScore value={3} />);
    });
    const during = hostLabelled('Score 3').length;
    advance(2000);
    expect({ during, after: hostLabelled('Score 3').length }).toEqual({ during: 1, after: 1 });
    // A fall just shows, still labelled.
    act(() => {
      r!.update(<RoundScore value={1} />);
    });
    expect(hostLabelled('Score 1')).toHaveLength(1);
  });
});

// ── CR B2 / UX P3 (probe P2) ────────────────────────────────────────────
describe('a tile’s ✓ / ✗ (CR B2)', () => {
  const tile = (state: 'idle' | 'selected' | 'matched' | 'wrong' | 'correct') => <MatchTile text="Owner" state={state} onPress={() => {}} spoken="Owner" />;

  it('springs in when the tile becomes matched on screen', () => {
    setMockReducedMotion(false);
    const spy = jest.spyOn(Re, 'withSpring');
    mount(tile('selected'));
    spy.mockClear();
    act(() => {
      r!.update(tile('matched'));
    });
    expect(spy).toHaveBeenCalled();
  });

  it('springs again when a wrong ✗ becomes a right ✓ (the same mark, a new state)', () => {
    setMockReducedMotion(false);
    const spy = jest.spyOn(Re, 'withSpring');
    mount(tile('idle'));
    act(() => {
      r!.update(tile('wrong'));
    });
    spy.mockClear();
    act(() => {
      r!.update(tile('correct'));
    });
    expect(spy).toHaveBeenCalled();
  });

  it('never on a screen’s first paint: a tile drawn matched just shows its ✓', () => {
    setMockReducedMotion(false);
    const spy = jest.spyOn(Re, 'withSpring');
    mount(tile('matched'));
    expect(root().findByType(Pop).props.mount).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('reduced: the mark fades in, nothing springs', () => {
    const spy = jest.spyOn(Re, 'withSpring');
    mount(tile('selected'));
    act(() => {
      r!.update(tile('matched'));
    });
    expect(spy).not.toHaveBeenCalled();
    expect(root().findByType(Pop).props.mount).toBe(true);
  });
});

// ── CR minor 1 (probe P3), CR minor 10: the lesson player at full motion ─
describe('the lesson player at full motion (CR minors 1, 2, 10)', () => {
  const toLastScene = () => {
    for (let k = 0; k < charter.scenes.length - 1; k++) {
      press('Next');
      advance(500);
    }
  };

  it('the counter and footer follow the page: while the cover leaves they still describe it', () => {
    setMockReducedMotion(false);
    jest.useFakeTimers();
    mockParams = { id: charter.id };
    mount(<LessonPlayer />);
    const total = charter.scenes.length;
    press('Next');
    // The cover is leaving (120 ms): still "1 of N", still no Back.
    expect(counter()).toBe(`Scene 1 of ${total}`);
    // Mobile 1.22: Back is the round "Previous step" beside Next (a full "Back" only on checks).
    expect(buttons('Previous step')).toHaveLength(0);
    advance(motion.dur.select + 10);
    expect(counter()).toBe(`Scene 2 of ${total}`);
    expect(buttons('Previous step')).toHaveLength(1);
  });

  it('Finish keeps its button (and focus) until Lesson complete is placed; then one moment, one haptic', () => {
    setMockReducedMotion(false);
    jest.useFakeTimers();
    mockParams = { id: charter.id };
    mount(<LessonPlayer />);
    toLastScene();
    press(/^Option [A-D]: The audit committee/);
    mockInterleave.mockClear();
    press('Finish lesson');
    // The last scene is leaving: Lesson complete's footer has not mounted (nor drawn its practice ids).
    expect(mockInterleave).not.toHaveBeenCalled();
    expect(buttons('Finish lesson')).toHaveLength(1);
    expect(buttons('Practice this topic')).toHaveLength(0);
    expect(mockLight).not.toHaveBeenCalled();
    advance(motion.dur.select + 10);
    expect(buttons('Finish lesson')).toHaveLength(0);
    expect(buttons('Practice this topic')).toHaveLength(1);
    expect(mockInterleave).toHaveBeenCalledTimes(1);
    advance(motion.dur.celebrate * 2);
    expect(mockLight).toHaveBeenCalledTimes(1);
  });

  it('a lesson finished here is the news Learn shows; a repeat finish is not', () => {
    mockParams = { id: charter.id };
    mount(<LessonPlayer />);
    for (let k = 0; k < charter.scenes.length - 1; k++) press('Next');
    press(/^Option [A-D]: The audit committee/);
    press('Finish lesson');
    expect(wasJustFinished(charter.id)).toBe(true);
    clearFinishedLessons();
    act(() => {
      r!.unmount();
    });
    mount(<LessonPlayer />);
    for (let k = 0; k < charter.scenes.length - 1; k++) press('Next');
    press(/^Option [A-D]: The audit committee/);
    press('Finish lesson');
    expect(wasJustFinished(charter.id)).toBe(false);
    expect(mockLight).toHaveBeenCalledTimes(1);
  });
});

// ── CR minors 3, 4, 5, 11 and QA bugs 1–2: Learn's ✓ ───────────────────
describe('Learn’s ✓ for a lesson just finished', () => {
  const draws = () => root().findAll((n) => n.type === CheckDraw);
  const rowCheck = (id: string) => {
    const title = CISA_LESSONS.find((l) => l.id === id)!.title;
    const row = root().find((n) => typeof n.props.onPress === 'function' && String(n.props.accessibilityLabel).includes(`: ${title},`));
    return row.findByType(CheckDraw);
  };

  it('out of view it waits EMPTY (never drawn, emptied, drawn again); back in view it draws, with no haptic of its own', () => {
    setMockReducedMotion(false);
    mockParams = { domain: '1' };
    mount(<Learn />);
    mockFocused = false;
    act(() => {
      r!.update(<Learn />);
    });
    // The player finishes the lesson while Learn is out of view.
    act(() => {
      noteLessonFinished(charter.id);
      useProgress.getState().completeLesson('cisa', charter.id);
    });
    expect(rowCheck(charter.id).props).toMatchObject({ hold: true, play: false });
    // Empty: the stroke is all dash offset (nothing drawn yet).
    expect(rowCheck(charter.id).findByType(Path).props.animatedProps.strokeDashoffset).toBeGreaterThan(1);
    mockFocused = true;
    act(() => {
      r!.update(<Learn />);
    });
    expect(rowCheck(charter.id).props).toMatchObject({ hold: false, play: true });
    expect(mockLight).not.toHaveBeenCalled();
    // The news is shown once: away and back again, the ✓ is simply done.
    mockFocused = false;
    act(() => {
      r!.update(<Learn />);
    });
    mockFocused = true;
    act(() => {
      r!.update(<Learn />);
    });
    expect(rowCheck(charter.id).props).toMatchObject({ hold: false, play: false });
  });

  it('a lesson that arrives any other way (restore, sync, another certification) is simply done', () => {
    mockParams = { domain: '1' };
    mount(<Learn />);
    mockFocused = false;
    act(() => {
      r!.update(<Learn />);
    });
    act(() => {
      useProgress.getState().completeLesson('cisa', charter.id);
    });
    expect(rowCheck(charter.id).props).toMatchObject({ hold: false, play: false });
    mockFocused = true;
    act(() => {
      r!.update(<Learn />);
    });
    expect(draws().every((d) => !d.props.play && !d.props.hold)).toBe(true);
  });

  it('a done ✓ that is not news is a plain SVG (no animated path: a group can hold many done rows)', () => {
    mount(<CheckDraw color="#000000" />);
    expect(root().findByType(Path).props.animatedProps).toBeUndefined();
    act(() => {
      r!.update(<CheckDraw play color="#000000" />);
    });
    expect(root().findByType(Path).props.animatedProps).toBeDefined();
  });

  it('reduced: a ✓ held and then played fades in from 0 (never a hard cut)', () => {
    const seq = jest.spyOn(Re, 'withSequence');
    mount(<CheckDraw hold color="#000000" />);
    expect(style(root().find((n) => isHost(n) && n.props.importantForAccessibility === 'no-hide-descendants')).opacity).toBe(0);
    seq.mockClear();
    act(() => {
      r!.update(<CheckDraw hold play color="#000000" />);
    });
    expect(seq).toHaveBeenCalled();
    act(() => {
      r!.update(<CheckDraw hold play color="#000000" />);
    });
    expect(style(root().find((n) => isHost(n) && n.props.importantForAccessibility === 'no-hide-descendants')).opacity).toBe(1);
  });

  it('the Up next row (no card since mobile 1.24) takes the same `soft` press tint as every row', () => {
    mockParams = { domain: '1' };
    mount(<Learn />);
    const tints = root()
      .findAll((n) => (n.type as { name?: string }).name === 'PressTint')
      .map((n) => n.props.color as string);
    expect(tints).toContain(light.soft);
    expect(tints).not.toContain(light.track);
  });
});

// ── CR minors 6, 7 and QA bug 3: the round end's level up ──────────────
describe('the round end’s level up', () => {
  const levelUp = () => (
    <RoundEnd certId="cisa" game="stones" score={15} max={15} onAgain={() => {}} news={{ change: 'up', tier: 'sapling', best: false, moment: null }} />
  );

  it('in full, the grow starts after the recap arrives and the leaf settles within the 1.2 s ceiling', () => {
    setMockReducedMotion(false);
    jest.useFakeTimers();
    mount(levelUp());
    const grow = root().findByType(TierLeafMorph).props.grow as { delay: number };
    expect(grow.delay).toBeGreaterThanOrEqual(motion.dur.enter);
    expect(grow.delay + LEAF_SETTLE_MS).toBeLessThanOrEqual(motion.dur.celebrate);
    advance(grow.delay);
    expect(mockLight).toHaveBeenCalledTimes(1);
    advance(motion.dur.celebrate * 2);
    expect(mockLight).toHaveBeenCalledTimes(1);
  });
});

// ── UX H1, P2, P7, O3 ──────────────────────────────────────────────────
describe('UX fixes', () => {
  it('H1: the lesson counter is capped at ×1.3 and says "Scene n of m"; the header’s right slot grows from 44pt', () => {
    mockParams = { id: charter.id };
    mount(<LessonPlayer />);
    const text = root().find((n) => isHost(n) && n.props.accessibilityLabel === `Scene 1 of ${charter.scenes.length}`);
    expect(text.props.maxFontSizeMultiplier).toBe(1.3);
    act(() => {
      r!.unmount();
    });
    mount(<PushedHeader onBack={() => {}} right={<Text>10/11</Text>} />);
    const slot = root().find((n) => isHost(n) && n.findAllByType(Text).some((t) => t.props.children === '10/11') && style(n).minWidth !== undefined);
    expect(style(slot)).toMatchObject({ minWidth: 44 });
    expect(style(slot).width).toBeUndefined();
  });

  it('P2: each recap score sits under its own point (one slot per round, the points’ spacing); large text keeps one line', () => {
    const w = Dimensions.get('window');
    const setScale = (fontScale: number) => act(() => Dimensions.set({ window: { ...w, fontScale }, screen: { ...w, fontScale } }));
    setScale(1);
    mount(<SparkScores values={[4, 7, 6, -5, 9]} />);
    const rowNode = root().find((n) => isHost(n) && n.props.testID === 'spark-scores');
    const slot = (SPARK.width - 2 * SPARK.pad) / 4;
    expect(style(rowNode).width).toBeCloseTo(slot * 5);
    expect(rowNode.children).toHaveLength(5);
    expect(rowNode.findAllByType(Text).map((t) => t.props.children)).toEqual(['4', '7', '6', '−5', '9']);
    act(() => {
      r!.unmount();
    });
    setScale(1.3);
    mount(<SparkScores values={[4, 7, 6, -5, 9]} />);
    expect(root().findAll((n) => isHost(n) && n.props.testID === 'spark-scores')).toHaveLength(0);
    expect(root().findAllByType(Text).map((t) => t.props.children)).toEqual(['4  ·  7  ·  6  ·  −5  ·  9']);
    setScale(w.fontScale);
  });

  it('P7: each step and each layer is one screen-reader stop: "Step 2 of 4: label. note"', () => {
    const scenes = CISA_LESSONS.flatMap((l) => l.scenes.map((s) => ({ l, s })));
    const steps = scenes.find(({ s }) => s.type === 'flow' && s.layout !== 'timeline')!;
    const layers = scenes.find(({ s }) => s.type === 'stack')!;
    mount(<SceneView scene={steps.s} lesson={steps.l} />);
    if (steps.s.type !== 'flow') throw new Error('flow');
    const n = steps.s.steps.length;
    steps.s.steps.forEach((st, i) => expect(hostLabelled(`Step ${i + 1} of ${n}: ${st.label}. ${st.note}`)).toHaveLength(1));
    act(() => {
      r!.unmount();
    });
    mount(<SceneView scene={layers.s} lesson={layers.l} />);
    if (layers.s.type !== 'stack') throw new Error('stack');
    const m = layers.s.layers.length;
    layers.s.layers.forEach((ly, i) => {
      const stop = hostLabelled(`Layer ${i + 1} of ${m}: ${ly.label}. ${ly.note}`);
      expect(stop).toHaveLength(1);
      expect(stop[0].props.accessible).toBe(true);
    });
  });

  it('O3 (mobile 1.49): no "Report a problem" row in a check’s body, before or after the answer (the header flag reports it)', () => {
    mockParams = { id: charter.id };
    mount(<LessonPlayer />);
    const says = (n: ReactTestInstance, text: string) => n.findAll((x) => isHost(x) && x.children.some((ch) => typeof ch === 'string' && ch.includes(text))).length > 0;
    const reportFade = () => root().findAll((n) => n.type === FadeIn && n.props.build === true && n.props.rise === false && says(n, 'Report a problem'));
    // A plain scene has no link now (it was on every scene before mobile 1.20).
    expect(reportFade()).toHaveLength(0);
    for (let k = 0; k < charter.scenes.length - 1; k++) press('Next');
    expect(reportFade()).toHaveLength(0);
    press(/^Option [A-D]: The audit committee/);
    expect(reportFade()).toHaveLength(0);
    expect(root().findAll((n) => n.props.accessibilityLabel === 'Report a problem with this step' && typeof n.props.onPress === 'function').length).toBeGreaterThan(0);
  });
});

// ── The rename guard (UX decision: keep "Forecast" for the game only) ──
describe('Forecast is only the game’s name', () => {
  // Readiness, the share card, Today and You never say "forecast" in their copy, so the
  // game's name can't be mistaken for a pass prediction. Comments are not copy.
  const files = [
    'engine/readiness.ts',
    'engine/readinessRange.ts',
    'engine/examReady.ts',
    'engine/shareCard.ts',
    'components/shareCard.tsx',
    'app/(tabs)/home.tsx',
    'app/(tabs)/you.tsx',
    // Mobile 1.16: the readiness report and the exam week.
    'engine/readinessReport.ts',
    'engine/examWeek.ts',
    'components/readinessReport.tsx',
    'app/readiness.tsx',
    'app/exam-week.tsx',
  ];
  const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');

  it.each(files)('%s has no "forecast" in its copy', (file) => {
    const src = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    expect(stripComments(src)).not.toMatch(/forecast/i);
  });
});
