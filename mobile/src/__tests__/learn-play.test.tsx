/**
 * Mobile 1.12 "Learn and Play" (motion.md M4/M5, ui.md §1.2, §1.3, §1.7).
 *
 * - The new primitives land on their end state under Reduce Motion (the
 *   shared mock's default) and never move on mount: Collapse, Turn,
 *   DrawLine, CheckDraw, TierLeafMorph.
 * - Pure helpers: the sparkline's points, the lesson branch, the lesson's
 *   map, the cover's reason, the part delays, the practice ids.
 * - Every scene of every lesson renders (cover, layers, steps, timeline,
 *   key idea, checks), and the timeline flows are the time-shaped ones.
 * - The lesson player: the cover, the check's verdict leaf, Lesson complete
 *   (a fresh lesson has its one moment, a repeat is just shown), the footer.
 * - Play: one original glyph per game; the round header names the game and
 *   rolls its score; Learn's trail says each lesson's state.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import LessonPlayer, { lessonPracticeIds } from '../app/lesson/[id]';
import Learn, { upNextMeta, upNextReason } from '../app/(tabs)/learn';
import Play from '../app/(tabs)/play';
import { branchLeaves, DomainRing, GAME_GLYPHS, GameGlyph, LeafBig, LessonBranch, sparkPoints, TierLeaf, TierLeafMorph } from '../components/glyphs';
import { T } from '../components/ui';
import { GameFrame, RoundEnd, RoundScore } from '../components/game';
import { lessonMap, partDelay, SceneView } from '../components/lesson';
import { CheckDraw, Collapse, DrawLine, FadeIn, Pop, resetCelebrationsForTest, Turn } from '../components/motion';
import { Verdict } from '../components/quiz';
import { getCertification } from '../content/certifications';
import { CISA_LESSONS } from '../content/lessons/cisa';
import { findQuestion } from '../content/loader';
import { GAME_ORDER, GAMES } from '../engine/games/registry';
import { useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSettings } from '../store/settings';
import { motion } from '../theme/tokens';

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
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, canDismiss: () => false, setParams: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View: V } = jest.requireActual('react-native');
  return { SafeAreaView: V, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
const mockLight = jest.fn();
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => mockLight() } }));

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const root = () => r!.root;
const textOf = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
const allText = () => textOf(root());
const press = (label: string | RegExp) => {
  const b = root()
    .findAll((n) => typeof n.props.onPress === 'function' && [n.props.label, n.props.accessibilityLabel].some((l) => typeof l === 'string' && (typeof label === 'string' ? l === label : label.test(l))))
    .at(0);
  if (!b) throw new Error(`No button "${String(label)}"`);
  act(() => {
    b.props.onPress();
  });
};
const style = (n: ReactTestInstance) => StyleSheet.flatten(n.props.style) ?? {};

beforeEach(() => {
  useProgress.getState().resetCert('cisa');
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', shuffleOptions: false, motion: 'system', gameRulesSeen: [] });
  useSeen.setState({ moments: {} });
  resetCelebrationsForTest();
  setMockReducedMotion(true);
  mockLight.mockClear();
  mockParams = {};
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
});

// ── Primitives ──────────────────────────────────────────────────────────
describe('Collapse', () => {
  it('open at mount: shown in place (nothing moves on mount); closed: not rendered', () => {
    mount(
      <Collapse open rows>
        <Text key="a">Row A</Text>
        <Text key="b">Row B</Text>
      </Collapse>,
    );
    expect(allText()).toBe('Row A Row B');
    // Each row is its own group, at its end state.
    const groups = root().findAllByType(FadeIn);
    expect(groups.length).toBe(2);
    expect(groups.every((g) => g.props.play === false)).toBe(true);
    act(() => {
      r!.update(
        <Collapse open={false} rows>
          <Text key="a">Row A</Text>
        </Collapse>,
      );
    });
    expect(allText()).toBe('');
  });

  it('a later opening plays: rows 30 ms apart, the first six, and the rest with the sixth', () => {
    mount(<Collapse open={false} rows>{[0, 1, 2, 3, 4, 5, 6, 7].map((k) => <Text key={k}>{`R${k}`}</Text>)}</Collapse>);
    const opened = () => <Collapse open rows>{[0, 1, 2, 3, 4, 5, 6, 7].map((k) => <Text key={k}>{`R${k}`}</Text>)}</Collapse>;
    act(() => {
      r!.update(opened());
    });
    // Re-render once more: animated styles show where their animations ended.
    act(() => {
      r!.update(opened());
    });
    const groups = root().findAllByType(FadeIn);
    expect(groups.every((g) => g.props.play === true)).toBe(true);
    expect(groups.map((g) => g.props.delay)).toEqual([0, 30, 60, 90, 120, 150, 150, 150]);
    // Reduced: every row lands fully visible, no rise.
    for (const g of groups) expect(style(g.findByType(View))).toMatchObject({ opacity: 1 });
  });
});

describe('Turn, DrawLine and CheckDraw', () => {
  it('Turn points where it is told, and turns there when told again', () => {
    mount(<Turn deg={-90}><Text>›</Text></Turn>);
    expect(style(root().findByType(View)).transform).toEqual([{ rotate: '-90deg' }]);
    act(() => {
      r!.update(<Turn deg={0}><Text>›</Text></Turn>);
    });
    act(() => {
      r!.update(<Turn deg={0}><Text>›</Text></Turn>);
    });
    expect(style(root().findByType(View)).transform).toEqual([{ rotate: '0deg' }]);
  });

  it('a line is simply drawn under Reduce Motion, and when told not to play', () => {
    mount(<DrawLine axis="y" />);
    expect(style(root().findByType(View)).transform).toEqual([{ scaleY: 1 }]);
    act(() => {
      r!.update(<DrawLine axis="x" play={false} />);
    });
    expect(style(root().findByType(View)).transform).toEqual([{ scaleX: 1 }]);
  });

  it('a ✓ that plays lands drawn and fully visible (reduced: a fade, never a cut)', () => {
    mount(<CheckDraw play color="#000000" />);
    act(() => {
      r!.update(<CheckDraw play color="#000000" />);
    });
    const path = root().findByType(Path);
    expect(path.props.animatedProps.strokeDashoffset).toBeCloseTo(0);
    expect(style(root().findByType(View)).opacity).toBe(1);
    // Hidden from screen readers: the row or button says the state.
    expect(root().findByType(View).props.importantForAccessibility).toBe('no-hide-descendants');
  });
});

describe('TierLeafMorph', () => {
  it('shows the tier; a new tier morphs to the new leaf', () => {
    mount(<TierLeafMorph tier="seedling" color="#000000" />);
    expect(root().findByType(TierLeaf).props.tier).toBe('seedling');
    act(() => {
      r!.update(<TierLeafMorph tier="sapling" color="#000000" />);
    });
    expect(root().findAllByType(TierLeaf).map((t) => t.props.tier)).toEqual(['sapling']);
  });

  it('a level up starts on the level before and grows once, then says so once (the round end’s haptic)', () => {
    jest.useFakeTimers();
    const grown = jest.fn();
    mount(<TierLeafMorph tier="sapling" color="#000000" grow={{ from: 'seedling', delay: 500 }} onGrown={grown} />);
    expect(root().findByType(TierLeaf).props.tier).toBe('seedling');
    expect(grown).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(root().findByType(TierLeaf).props.tier).toBe('sapling');
    expect(grown).toHaveBeenCalledTimes(1);
    // It never buzzes itself: the round end owns the one haptic.
    expect(mockLight).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});

describe('TierLeafMorph, a level-up cut short', () => {
  it('a grow that goes away before it grew (skipped, or the moment ended) shows the new level, still, and still says it arrived once', () => {
    jest.useFakeTimers();
    const grown = jest.fn();
    mount(<TierLeafMorph tier="sapling" color="#000000" grow={{ from: 'seedling', delay: 500 }} onGrown={grown} />);
    expect(root().findByType(TierLeaf).props.tier).toBe('seedling');
    act(() => {
      r!.update(<TierLeafMorph tier="sapling" color="#000000" onGrown={grown} />);
    });
    expect(root().findByType(TierLeaf).props.tier).toBe('sapling');
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    // QA PR #42 bug 3: a skip never loses the level-up's one haptic.
    expect(grown).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('the level before fades out as the leaf grows (its exit is set on its last render, like a morph)', () => {
    jest.useFakeTimers();
    mount(<TierLeafMorph tier="sapling" color="#000000" grow={{ from: 'seedling', delay: 500 }} />);
    const from = root().findAll((n) => n.props.exiting !== undefined && typeof n.type !== 'string');
    expect(from.length).toBeGreaterThan(0);
    jest.useRealTimers();
  });

  it('a grow that starts after mount (the moment decided before paint) goes back to the level before, then grows', () => {
    jest.useFakeTimers();
    const grown = jest.fn();
    mount(<TierLeafMorph tier="heartwood" color="#000000" onGrown={grown} />);
    act(() => {
      r!.update(<TierLeafMorph tier="heartwood" color="#000000" grow={{ from: 'sapling', delay: 300 }} onGrown={grown} />);
    });
    expect(root().findByType(TierLeaf).props.tier).toBe('sapling');
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(root().findAllByType(TierLeaf).map((t) => t.props.tier)).toEqual(['heartwood']);
    expect(grown).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('a level shown from the start (the intro picker) never says it grew', () => {
    const grown = jest.fn();
    mount(<TierLeafMorph tier="seedling" color="#000000" onGrown={grown} />);
    act(() => {
      r!.update(<TierLeafMorph tier="sapling" color="#000000" onGrown={grown} />);
    });
    expect(grown).not.toHaveBeenCalled();
  });
});

// ── Pure helpers ────────────────────────────────────────────────────────
describe('helpers', () => {
  it('sparkPoints spreads the rounds across, highest at the top, a flat run in the middle', () => {
    const pts = sparkPoints([2, 8, 5], 100, 40);
    expect(pts.map((p) => Math.round(p[0]))).toEqual([6, 50, 94]);
    expect(pts[1][1]).toBeLessThan(pts[2][1]);
    expect(pts[0][1]).toBeGreaterThan(pts[2][1]);
    const flat = sparkPoints([4, 4, 4], 100, 40);
    expect(new Set(flat.map((p) => p[1])).size).toBe(1);
  });

  it('the lesson branch has one leaf per lesson', () => {
    for (const n of [1, 5, 10]) expect(branchLeaves(n, 300, 112).d.split('|')).toHaveLength(n);
  });

  it('parts arrive 120 ms apart, the first six', () => {
    expect([0, 1, 2, 5, 6, 9].map(partDelay)).toEqual([0, 120, 240, 600, 600, 600]);
    expect(motion.stagger.scene).toBe(120);
  });

  it('the cover’s map lists each scene once, in order, with one quick check', () => {
    const charter = CISA_LESSONS.find((l) => l.id === 'cisa-l-d1-charter')!;
    expect(lessonMap(charter)).toEqual(['What a charter does', 'Think of a referee', 'The reporting lines', 'The exam trap', 'Exam-day shortcut', 'Quick check']);
    for (const l of CISA_LESSONS) expect(lessonMap(l).filter((x) => x === 'Quick check')).toHaveLength(1);
  });

  it('the cover’s reason (a code since 1.21): the readiness focus once there are answers, else the next in order', () => {
    const lesson = CISA_LESSONS.find((l) => l.domainId === '4')!;
    expect(upNextReason(lesson, { focusDomainId: '4', hasAnswers: true })).toBe('focus');
    expect(upNextReason(lesson, { focusDomainId: '4', hasAnswers: false })).toBe('next');
    expect(upNextReason(lesson, { focusDomainId: '2', hasAnswers: true })).toBe('next');
    // Asked for by name (Today's "Learn IS Operations"): the domain, not the focus.
    expect(upNextReason(lesson, { askedDomain: '4', focusDomainId: '4', hasAnswers: true })).toBe('next');
  });

  it('the cover’s meta line says its length and why, and speaks "minute" for one', () => {
    expect(upNextMeta(5, 'focus', 'lesson 2 of 7')).toEqual({ meta: '5 min · picked where you can gain the most', spoken: '5 minutes, picked where you can gain the most' });
    expect(upNextMeta(1, 'next', 'lesson 2 of 7')).toEqual({ meta: '1 min · lesson 2 of 7', spoken: '1 minute, lesson 2 of 7' });
  });

  it('"Practice this topic" draws only questions that exist, never twice', () => {
    for (const l of CISA_LESSONS) {
      const ids = lessonPracticeIds(l, 7);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(findQuestion('cisa', id)).toBeDefined();
    }
    expect(CISA_LESSONS.some((l) => lessonPracticeIds(l, 7).length > 0)).toBe(true);
  });
});

// ── Lessons ─────────────────────────────────────────────────────────────
describe('every scene of every lesson renders', () => {
  it('cover, layers, steps, timeline, key idea, trap, compare and checks, with motion on and off', () => {
    for (const reduced of [true, false]) {
      setMockReducedMotion(reduced);
      for (const lesson of CISA_LESSONS) {
        for (const scene of lesson.scenes) {
          mount(<SceneView scene={scene} lesson={lesson} art="branch0" tone="#7FA9C9" />);
          expect(allText().length).toBeGreaterThan(0);
          act(() => {
            r!.unmount();
          });
          r = undefined;
        }
      }
    }
  });

  it('nothing springs as a scene mounts: diagrams only fade, rise and draw (the one spring is the check’s verdict, on a tap)', () => {
    setMockReducedMotion(false);
    for (const lesson of CISA_LESSONS) {
      for (const scene of lesson.scenes.filter((x) => x.type !== 'check')) {
        mount(<SceneView scene={scene} lesson={lesson} />);
        expect(root().findAllByType(Pop)).toHaveLength(0);
        act(() => {
          r!.unmount();
        });
        r = undefined;
      }
    }
  });

  it('the timelines are the time-shaped flows (life cycles, cutovers, closure)', () => {
    const timelines = CISA_LESSONS.flatMap((l) => l.scenes).filter((s) => s.type === 'flow' && s.layout === 'timeline');
    expect(timelines.map((s) => (s.type === 'flow' ? s.heading : ''))).toEqual(
      expect.arrayContaining(['From exit meeting to closure', 'The asset life cycle', 'Joiner, mover, leaver']),
    );
    // Steps stay the default.
    expect(CISA_LESSONS.flatMap((l) => l.scenes).filter((s) => s.type === 'flow' && s.layout !== 'timeline').length).toBeGreaterThan(5);
  });

  it('"The IS auditor’s lens" is the key-idea recipe: a caption over the italic voice on a green rule', () => {
    const lesson = CISA_LESSONS.find((l) => l.scenes.some((s) => s.type === 'idea' && s.heading === 'The IS auditor’s lens'))!;
    const scene = lesson.scenes.find((s) => s.type === 'idea' && s.heading === 'The IS auditor’s lens')!;
    mount(<SceneView scene={scene} lesson={lesson} />);
    expect(allText()).toContain('The IS auditor’s lens');
    // The body is the italic `quote` voice (not the bold serif paragraph it used to be)…
    const quote = root().findAll((n) => n.type === T && n.props.v === 'quote');
    expect(quote.map((q) => q.props.children)).toEqual([scene.type === 'idea' ? scene.body : '']);
    // …on a 3pt green rule, under a caption with the big leaf.
    expect(root().findAll((n) => typeof n.type !== 'string' && style(n).borderLeftWidth === 3).length).toBeGreaterThan(0);
    expect(root().findAllByType(LeafBig)).toHaveLength(1);
  });
});

describe('the lesson player', () => {
  const charter = CISA_LESSONS.find((l) => l.id === 'cisa-l-d1-charter')!;
  const toCheck = () => {
    for (let k = 0; k < charter.scenes.length - 1; k++) press('Next');
  };

  it('opens on the cover: the panel, the length and the lesson’s map', () => {
    mockParams = { id: charter.id };
    mount(<LessonPlayer />);
    expect(allText()).toContain('The audit charter');
    expect(allText()).toContain(`${charter.minutes} min · ${charter.scenes.length} scenes`);
    expect(allText()).toContain('In this lesson');
    expect(root().findAll((n) => n.props.accessibilityLabel?.startsWith?.('In this lesson: What a charter does')).length).toBeGreaterThan(0);
    // No Back on the cover.
    expect(root().findAll((n) => n.props.label === 'Back')).toHaveLength(0);
  });

  it('a check shows the session’s verdict leaf and its coach line', () => {
    mockParams = { id: charter.id };
    mount(<LessonPlayer />);
    toCheck();
    press(/^Option [A-D]: The audit committee/);
    const verdict = root().findByType(Verdict);
    expect(verdict.props.correct).toBe(true);
    expect(allText()).toContain('That’s the answer the exam wants.');
  });

  it('finishing a lesson for the first time: Lesson complete, a new leaf in words, one celebration, one light haptic', () => {
    mockParams = { id: charter.id };
    mount(<LessonPlayer />);
    toCheck();
    press(/^Option [A-D]: The audit committee/);
    press('Finish lesson');
    expect(useProgress.getState().byCert.cisa.lessonsDone).toContain(charter.id);
    expect(allText()).toContain('Lesson complete');
    const inDomain = CISA_LESSONS.filter((l) => l.domainId === charter.domainId).length;
    expect(allText()).toContain(`A new leaf on your IS Audit branch: 1 of ${inDomain} lessons.`);
    expect(root().findByType(LessonBranch).props.fresh).toBe(0);
    expect(useSeen.getState().moments['lesson-done']).toBe(1);
    expect(mockLight).toHaveBeenCalledTimes(1);
    // What next: practise it, or the next lesson.
    expect(root().findAll((n) => n.props.label === 'Practice this topic' || n.props.label === 'Practice IS Audit').length).toBeGreaterThan(0);
    expect(root().findAll((n) => n.props.label === 'Next lesson').length).toBeGreaterThan(0);
  });

  it('a lesson done before is just shown: no moment, no new leaf', () => {
    useProgress.getState().completeLesson('cisa', charter.id);
    mockParams = { id: charter.id };
    mount(<LessonPlayer />);
    toCheck();
    press(/^Option [A-D]: The audit committee/);
    press('Finish lesson');
    expect(allText()).toContain('IS Audit: 1 of');
    expect(root().findByType(LessonBranch).props.fresh).toBeNull();
    expect(useSeen.getState().moments['lesson-done']).toBeUndefined();
    expect(mockLight).not.toHaveBeenCalled();
  });
});

// ── Learn ───────────────────────────────────────────────────────────────
describe('Learn', () => {
  it('each domain shows its status ring; a lesson trail says done, up next or its length; the cover says why', () => {
    useProgress.getState().completeLesson('cisa', 'cisa-l-d1-charter');
    mockParams = { domain: '1' };
    mount(<Learn />);
    // Mobile 1.21: the cover's one meta line, its length and its place on the trail (the caption names the domain).
    expect(allText()).toMatch(/\d+ min · lesson 2 of \d+/);
    expect(allText()).toContain('Up next · IS Audit');
    expect(root().findAllByType(DomainRing).length).toBe(getCertification('cisa')!.domains.length);
    const rows = root()
      .findAll((n) => typeof n.props.onPress === 'function' && /^IS Audit lesson \d+:/.test(String(n.props.accessibilityLabel)))
      .map((n) => n.props.accessibilityLabel as string);
    expect(rows[0]).toMatch(/, done$/);
    expect(rows[1]).toMatch(/, up next$/);
    expect(rows[2]).toMatch(/, \d+ min$/);
    // Mobile 1.24: "Up next" is said once, on the cover. The trail row has no caption and no card.
    expect(allText().match(/Up next/g)).toHaveLength(1);
    // …and its row is not a raised card that bleeds past the page gutter (no negative margin, no fill).
    const upRow = root().findAll((n) => n.props.accessibilityRole === 'button' && /, up next$/.test(String(n.props.accessibilityLabel)))[0];
    const flat = StyleSheet.flatten(upRow.props.style) ?? {};
    expect(flat.marginHorizontal ?? 0).toBeGreaterThanOrEqual(0);
    expect(flat.backgroundColor).toBeUndefined();
  });

  it('a domain with nothing done draws no empty track (five grey bars read as five failures)', () => {
    mount(<Learn />);
    // Nothing done anywhere: every ring is one quiet `track` ring (no centre dot,
    // never the `control` outline that reads as a radio button), and no progress bar.
    const rings = root().findAllByType(DomainRing);
    expect(rings.every((x) => x.props.done === 0)).toBe(true);
    for (const ring of rings) {
      expect(ring.findAllByType(Circle).length).toBe(1);
      expect(ring.props.outline).toBe(ring.props.track);
    }
  });
});

// ── Play ────────────────────────────────────────────────────────────────
describe('Play identity', () => {
  it('every game has its own glyph, and no two are drawn the same', () => {
    expect(Object.keys(GAME_GLYPHS).sort()).toEqual([...GAME_ORDER].sort());
    const drawings = GAME_ORDER.map((g) => GAME_GLYPHS[g].map((p) => p.d).join(' '));
    expect(new Set(drawings).size).toBe(GAME_ORDER.length);
    for (const g of GAME_ORDER) {
      mount(<GameGlyph game={g} color="#000000" rise={g === 'daylight'} />);
      expect(root().findAllByType(Svg).length).toBeGreaterThan(0);
      act(() => {
        r!.unmount();
      });
      r = undefined;
    }
  });

  it('Play shows each game with its glyph; the Sure Footing game is now Forecast, same id', () => {
    mount(<Play />);
    expect(root().findAllByType(GameGlyph).length).toBeGreaterThanOrEqual(2);
    expect(GAMES.sprint.name).toBe('Forecast');
    expect(allText()).not.toContain('Sure Footing');
  });

  it('a round’s header names the game (one stop) and its score rolls up but never animates a fall', () => {
    mount(
      <GameFrame game="trap" index={0} total={5} score={0}>
        <Text>Q</Text>
      </GameFrame>,
    );
    const head = root().find((n) => n.props.accessibilityRole === 'header' && n.props.accessible === true);
    expect(head.props.accessibilityLabel).toBe('Snare Spotter, 1 of 5');
    expect(root().findAllByType(GameGlyph)).toHaveLength(1);
    act(() => {
      r!.update(
        <GameFrame game="trap" index={1} total={5} score={2}>
          <Text>Q</Text>
        </GameFrame>,
      );
    });
    expect(root().findByType(RoundScore).props.value).toBe(2);
    // On a HOST node (what a screen reader reads), not just a component's props (CR PR #42 B1).
    expect(root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityLabel === 'Score 2' && n.props.accessible === true)).toHaveLength(1);
  });
});

describe('the round end’s level up', () => {
  it('is a celebration (the budget, once per round): reduced, the new level shows still, with one light haptic', () => {
    mount(<RoundEnd certId="cisa" game="stones" score={15} max={15} onAgain={() => {}} news={{ change: 'up', tier: 'sapling', best: true, moment: null }} />);
    expect(useSeen.getState().moments['level-up']).toBe(1);
    expect(root().findByType(TierLeaf).props.tier).toBe('sapling');
    expect(allText()).toContain('Sapling');
    expect(mockLight).toHaveBeenCalledTimes(1);
  });

  it('in full: the leaf starts on the level before and grows once, after the score has rolled', () => {
    setMockReducedMotion(false);
    jest.useFakeTimers();
    mount(<RoundEnd certId="cisa" game="stones" score={15} max={15} onAgain={() => {}} news={{ change: 'up', tier: 'sapling', best: true, moment: null }} />);
    expect(root().findByType(TierLeaf).props.tier).toBe('seedling');
    act(() => {
      jest.advanceTimersByTime(motion.dur.enter + motion.dur.grow + motion.dur.quick);
    });
    expect(root().findAllByType(TierLeaf).map((t) => t.props.tier)).toContain('sapling');
    expect(mockLight).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('a step back is no celebration, and neither is a level up beside a milestone moment (that one is the moment)', () => {
    mount(<RoundEnd certId="cisa" game="rumor" score={3} max={12} onAgain={() => {}} news={{ change: 'down', tier: 'seedling', best: false, moment: null }} />);
    expect(useSeen.getState().moments['level-up']).toBeUndefined();
    act(() => {
      r!.unmount();
    });
    mount(
      <RoundEnd
        certId="cisa"
        game="trap"
        score={9}
        max={10}
        onAgain={() => {}}
        news={{ change: 'up', tier: 'sapling', best: false, moment: { key: 'snare-wise', label: 'Snare-wise', rule: 'Spot the snare.', kind: 'skill', set: 'fieldNotes', setName: 'Field notes', unlock: 'You spot the snare 8 times in 10.' } }}
      />,
    );
    expect(useSeen.getState().moments['level-up']).toBeUndefined();
    expect(mockLight).not.toHaveBeenCalled();
  });
});

describe('Lesson complete for screen readers', () => {
  it('is one header stop that says the whole moment (the Finish button is gone, so focus goes there)', () => {
    const charter = CISA_LESSONS.find((l) => l.id === 'cisa-l-d1-charter')!;
    mockParams = { id: charter.id };
    mount(<LessonPlayer />);
    for (let k = 0; k < charter.scenes.length - 1; k++) press('Next');
    press(/^Option [A-D]: The audit committee/);
    press('Finish lesson');
    const head = root().find((n) => n.props.accessible === true && n.props.accessibilityRole === 'header' && String(n.props.accessibilityLabel).startsWith('Lesson complete: '));
    expect(head.props.accessibilityLabel).toMatch(/^Lesson complete: The audit charter.*\. A new leaf on your IS Audit branch: 1 of \d+ lessons\.$/);
  });
});
