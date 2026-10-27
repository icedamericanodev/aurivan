/**
 * Mobile 1.22 (premium round 2): the lesson player recomposed, the answer
 * screen after a miss, Results, the study-note page and native diagrams.
 *
 * - Lesson scenes: a kicker naming the scene kind over a `hero` heading; a
 *   heading that only repeats the kicker is left out; a flag ("Report a
 *   problem") in the header on every scene; a round "Previous step" (a full
 *   "Back" on checks); the sources line says "Oct 2026".
 * - After a miss: the note row and the lesson row say what they do in a
 *   kicker; once the verdict has scrolled away the header shows "Not quite ·
 *   Best answer D" instead of the segments.
 * - Results: a one-domain session shows its ring alone with one line under it.
 * - Note page: the header title appears only once the hero title is under
 *   it; reaching the end marks the note read once; the toggle undoes it and
 *   sticks.
 * - Native diagrams: the registry, 4B1.2's timeline in place of the web SVG.
 * - The Play glyph: the plan's game item uses the tab's Pinwheel.
 *
 * Real content and real stores. Never `act(() => store.action())`: use braces.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AppState, Dimensions, ScrollView, View, type AppStateStatus } from 'react-native';
import LessonPlayer from '../app/lesson/[id]';
import NoteSubtopicScreen from '../app/notes/subtopic/[id]';
import Results from '../app/results';
import SessionScreen from '../app/session';
import { Pinwheel } from '../components/glyphs';
import { DomainRings, planIcon } from '../components/journey';
import { headingRepeatsKicker, sceneKicker, sceneLabel, SceneView } from '../components/lesson';
import { CrossFade } from '../components/motion';
import { IllustrationView, NoteBody } from '../components/notes';
import { NATIVE_FIGURE_IDS, nativeFigureFor, RecoveryTimeline } from '../components/noteFigures';
import { AnswerRecap } from '../components/quiz';
import { IconButton, PushedHeader, Screen } from '../components/ui';
import { CISA_LESSONS } from '../content/lessons/cisa';
import type { Scene } from '../content/lessons/types';
import { findQuestion } from '../content/loader';
import { findNote } from '../content/notes';
import { LETTERS } from '../content/types';
import { displayToOriginal } from '../engine/shuffle';
import { finishSession } from '../lib/finishSession';
import { monthYear } from '../lib/format';
import { startFromIds } from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  // The house glyphs stay real (the Play glyph is checked by identity).
  const { Pinwheel, Rings, Sprig, Sprout } = jest.requireActual('../components/glyphs');
  return new Proxy({ __esModule: true, ICON_STROKE: 2, Pinwheel, Rings, Sprig, Sprout } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null }));
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
    dismissAll: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: () => true,
    canDismiss: jest.fn(() => false),
    setParams: jest.fn(),
  },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams,
  useIsFocused: () => true,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View: RNView } = jest.requireActual('react-native');
  return { SafeAreaView: RNView, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
const mockSay = jest.fn();
const mockMoveFocus = jest.fn();
jest.mock('../lib/a11y', () => ({
  ...jest.requireActual('../lib/a11y'),
  sayLater: (...args: unknown[]) => mockSay(...args),
  moveFocus: (...args: unknown[]) => mockMoveFocus(...args),
}));
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const root = () => r!.root;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const pressables = (label: string | RegExp) => {
  const hits = root().findAll(
    (n) =>
      typeof n.props.onPress === 'function' &&
      typeof n.props.accessibilityLabel === 'string' &&
      (typeof label === 'string' ? n.props.accessibilityLabel === label : label.test(n.props.accessibilityLabel)),
  );
  const set = new Set(hits);
  return hits.filter((n) => {
    for (let p = n.parent; p; p = p.parent) if (set.has(p)) return false;
    return true;
  });
};
const press = (label: string | RegExp) =>
  act(() => {
    pressables(label)[0].props.onPress();
  });
/** Every layout handler gets this box (enough for a screen that measures where things are). */
const layoutAll = (box: { y: number; height: number }) =>
  act(() => {
    for (const n of root().findAll((x) => typeof x.props.onLayout === 'function' && x.type === View)) {
      n.props.onLayout({ nativeEvent: { layout: { x: 0, width: 390, ...box } } });
    }
  });
/** The learner starts a drag of their own (auto-read waits for one). */
const drag = () =>
  act(() => {
    const sv = root().findAllByType(ScrollView).find((s) => typeof s.props.onScrollBeginDrag === 'function')!;
    sv.props.onScrollBeginDrag({ nativeEvent: {} });
  });
const scrollTo = (y: number, height = 800) =>
  act(() => {
    const sv = root().findAllByType(ScrollView).find((s) => typeof s.props.onScroll === 'function')!;
    sv.props.onScroll({ nativeEvent: { contentOffset: { x: 0, y }, layoutMeasurement: { width: 390, height }, contentSize: { width: 390, height: 4000 } } });
  });

beforeEach(() => {
  jest.useFakeTimers();
  // The app is in front (the note's open-time clock runs only then; mobile 1.25).
  Object.defineProperty(AppState, 'currentState', { value: 'active' as AppStateStatus, configurable: true });
  mockSay.mockClear();
  mockMoveFocus.mockClear();
  const w = Dimensions.get('window');
  Dimensions.set({ window: { ...w, fontScale: 1 }, screen: { ...w, fontScale: 1 } });
  mockParams = {};
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.useRealTimers();
});

// ── Lesson scenes ───────────────────────────────────────────────────────
describe('lesson scenes: kicker + hero heading', () => {
  const idea: Scene = { type: 'idea', heading: 'What a charter does', body: 'x' };
  it('names every scene kind', () => {
    expect(sceneKicker(idea)).toBe('The idea');
    expect(sceneKicker({ type: 'idea', heading: 'The IS auditor’s lens', body: 'x' })).toBe('The IS auditor’s lens');
    expect(sceneKicker({ type: 'analogy', heading: 'A leaking roof', body: 'x' })).toBe('Think of it like');
    // Never "Think of it like / Think of a referee".
    expect(sceneKicker({ type: 'analogy', heading: 'Think of a referee', body: 'x' })).toBe('An analogy');
    expect(sceneKicker({ type: 'flow', heading: 'h', steps: [] })).toBe('How it flows');
    expect(sceneKicker({ type: 'stack', heading: 'h', layers: [] })).toBe('The layers');
    // Parallel items (an opt-in flag) are not called layers.
    expect(sceneKicker({ type: 'stack', heading: 'h', layers: [], unordered: true })).toBe('The parts');
    expect(sceneKicker({ type: 'compare', heading: 'h', left: { title: 'a', points: [] }, right: { title: 'b', points: [] } })).toBe('Side by side');
    expect(sceneKicker({ type: 'trap', heading: 'h', trap: 't', why: 'w' })).toBe('The trap');
    expect(sceneKicker({ type: 'tip', body: 'x' })).toBe('Exam-day shortcut');
    expect(sceneKicker({ type: 'check', question: 'q', options: ['a', 'b'], correctIndex: 0, explanation: 'e' })).toBe('Quick check');
    expect(sceneKicker({ type: 'title', kicker: 'k', title: 't', subtitle: 's' })).toBeNull();
    // The cover's map still lists headings (and the two fixed names).
    expect(sceneLabel(idea)).toBe('What a charter does');
    expect(sceneLabel({ type: 'tip', body: 'x' })).toBe('Exam-day shortcut');
  });

  it('a heading that only repeats its kicker is left out', () => {
    expect(headingRepeatsKicker('The idea', 'The core idea')).toBe(true);
    expect(headingRepeatsKicker('The trap', 'The exam trap')).toBe(true);
    expect(headingRepeatsKicker('The trap', 'The second trap')).toBe(false);
    expect(headingRepeatsKicker('The idea', 'What a charter does')).toBe(false);
    const lesson = CISA_LESSONS[0];
    mount(<SceneView scene={{ type: 'idea', heading: 'The core idea', body: 'Body.' }} lesson={lesson} />);
    const headers = root().findAll((n) => n.props.accessibilityRole === 'header' && n.type === View);
    expect(headers.map((h) => h.props.accessibilityLabel)).toEqual(['The idea']);
    act(() => {
      r!.update(<SceneView scene={idea} lesson={lesson} />);
    });
    const after = root().findAll((n) => n.props.accessibilityRole === 'header' && n.type === View);
    expect(after.map((h) => h.props.accessibilityLabel)).toEqual(['The idea: What a charter does']);
    // The heading is the serif hero.
    expect(root().findAll((n) => n.props.v === 'hero').map((n) => n.props.children)).toContain('What a charter does');
  });
});

// ── Lesson player ───────────────────────────────────────────────────────
describe('lesson player: header flag, round Back, sources date', () => {
  const lesson = CISA_LESSONS.find((l) => l.id === 'cisa-l-d1-charter')!;

  it('the flag is on every scene; Back is the round "Previous step" (a full Back on a check)', () => {
    mockParams = { id: lesson.id };
    mount(<LessonPlayer />);
    expect(pressables('Report a problem with this step')).toHaveLength(1);
    expect(pressables('Previous step')).toHaveLength(0);
    press('Next');
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(pressables('Report a problem with this step')).toHaveLength(1);
    const prev = root().findAll((n) => n.type === IconButton && n.props.label === 'Previous step');
    expect(prev).toHaveLength(1);
    expect(prev[0].props.outline).toBe(true);
    // Walk to the check: there Back is the full pill again.
    const checkAt = lesson.scenes.findIndex((s) => s.type === 'check');
    for (let i = 1; i < checkAt; i++) {
      press('Next');
      act(() => {
        jest.runOnlyPendingTimers();
      });
    }
    expect(pressables('Back')).toHaveLength(1);
    expect(pressables('Previous step')).toHaveLength(0);
    // The flag opens the report sheet for this step.
    press('Report a problem with this step');
    expect(allText()).toContain('Report a problem');
  });

  it('Back hands screen-reader focus to the new Back when it changes shape (check ↔ another scene)', () => {
    mockParams = { id: lesson.id };
    mount(<LessonPlayer />);
    const checkAt = lesson.scenes.findIndex((s) => s.type === 'check');
    expect(lesson.scenes[checkAt - 1].type).not.toBe('check');
    for (let i = 0; i < checkAt; i++) {
      press('Next');
      act(() => {
        jest.runOnlyPendingTimers();
      });
    }
    // On the check, Back is the pill; back on the scene before, it is the round "Previous step".
    expect(pressables('Back')).toHaveLength(1);
    mockMoveFocus.mockClear();
    press('Back');
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(pressables('Previous step')).toHaveLength(1);
    expect(mockMoveFocus).toHaveBeenCalledTimes(1);
    const target = mockMoveFocus.mock.calls[0][0] as { current: unknown };
    expect(target.current).toBeTruthy();
  });

  it('the last scene says when it was reviewed as "Oct 2026"', () => {
    expect(monthYear('2026-10-06')).toBe('Oct 2026');
    expect(monthYear('2026-01-31')).toBe('Jan 2026');
    expect(monthYear('soon')).toBe('soon');
    mockParams = { id: lesson.id };
    mount(<LessonPlayer />);
    const last = lesson.scenes.length - 1;
    for (let i = 0; i < last; i++) {
      const scene = lesson.scenes[i];
      if (scene.type === 'check') {
        // Any option opens Next.
        act(() => {
          root().findAll((n) => n.props.letter === 'A' && typeof n.props.onPress === 'function')[0].props.onPress();
        });
      }
      press('Next');
      act(() => {
        jest.runOnlyPendingTimers();
      });
    }
    expect(allText()).toContain(`Last reviewed ${monthYear(lesson.lastReviewed)}.`);
    expect(allText()).not.toContain(lesson.lastReviewed);
  });
});

// ── After a miss ────────────────────────────────────────────────────────
const answerOnScreen = (right: boolean) => {
  const a = useSession.getState().active!;
  const qid = a.questionIds[a.index];
  const q = findQuestion('cisa', qid)!;
  const display = LETTERS.find((d) => {
    const orig = displayToOriginal(d, a.perms[qid]);
    return q.options[orig] !== undefined && (orig === q.correct) === right;
  })!;
  act(() => {
    useSession.getState().answer(qid, { display, correct: right });
  });
};

describe('answer screen after a miss', () => {
  it('the rows say what they do; the header recap swaps in once the verdict has scrolled away', () => {
    startFromIds('cisa', ['d4_062'], 'T');
    answerOnScreen(false);
    mount(<SessionScreen />);
    const note = findNote('cisa', '4B1.2')!;
    expect(allText()).toContain(`Read the note ${note.name}`);
    expect(allText()).toContain('the idea this question tests');
    expect(allText()).toContain('Take the lesson');
    expect(allText()).not.toContain('Replay the lesson');
    // The recap: hidden (and silent) until the verdict is under the header.
    const swap = () => root().findAllByType(CrossFade)[0];
    expect(swap().props.showSecond).toBe(false);
    expect(root().findAllByType(AnswerRecap)).toHaveLength(1);
    const a = useSession.getState().active!;
    const best = LETTERS.find((d) => displayToOriginal(d, a.perms.d4_062) === findQuestion('cisa', 'd4_062')!.correct)!;
    expect(root().findByType(AnswerRecap).props).toMatchObject({ correct: false, letter: best });
    layoutAll({ y: 0, height: 120 });
    scrollTo(60);
    expect(swap().props.showSecond).toBe(false);
    scrollTo(400);
    expect(swap().props.showSecond).toBe(true);
    expect(allText()).toContain(`Not quite · Best answer ${best}`);
    // Hysteresis: resting just above the line (within 8pt) keeps it; past 8pt the segments return.
    scrollTo(115);
    expect(swap().props.showSecond).toBe(true);
    scrollTo(110);
    expect(swap().props.showSecond).toBe(false);
    scrollTo(121);
    expect(swap().props.showSecond).toBe(true);
    // Back up: the segments return.
    scrollTo(10);
    expect(swap().props.showSecond).toBe(false);
  });

  it('the recap shortens at large text ("Not quite · D"), the spoken label keeps every word', () => {
    const w = Dimensions.get('window');
    act(() => {
      Dimensions.set({ window: { ...w, fontScale: 1.5 }, screen: { ...w, fontScale: 1.5 } });
    });
    mount(<AnswerRecap correct={false} letter="D" />);
    expect(allText()).toBe('Not quite · D');
    expect(root().findAll((n) => n.props.accessibilityLabel === 'Not quite. Best answer D').length).toBeGreaterThan(0);
  });

  it('the hidden half of a cross-fade is hidden from screen readers', () => {
    mount(<CrossFade showSecond={false} first={<View testID="a" />} second={<View testID="b" />} />);
    const layer = (id: string) => {
      let n: ReactTestInstance | null = root().findByProps({ testID: id }).parent;
      while (n && n.props.accessibilityElementsHidden === undefined && n.parent) n = n.parent;
      return n!;
    };
    expect(layer('b').props.accessibilityElementsHidden).toBe(true);
    expect(layer('a').props.accessibilityElementsHidden).toBeUndefined();
  });
});

// ── Results ─────────────────────────────────────────────────────────────
describe('results: one domain', () => {
  it('no ring (mobile 1.39: rings only for mixed sets and mocks); Done is the one solid button, Practice the missed is secondary', () => {
    const ids = ['d1_001', 'd1_002', 'd1_003'].filter((id) => findQuestion('cisa', id));
    startFromIds('cisa', ids, 'T');
    ids.forEach((_, i) => {
      act(() => {
        useSession.getState().goTo(i);
      });
      answerOnScreen(i > 0);
    });
    act(() => {
      finishSession();
    });
    mount(<Results />);
    // Mobile 1.39: a one-domain set has no ring; it said nothing the headline doesn't.
    expect(root().findAllByType(DomainRings)).toHaveLength(0);
    // Three questions is a handful (mobile 1.24, UX review S7): the headline holds the count once,
    // and there is no "All IS Audit · 2 of 3" line repeating it.
    expect(allText()).toContain(`${ids.length - 1} of ${ids.length} right`);
    expect(allText()).not.toContain('All IS Audit ·');
    // Mobile 1.24: Done is the one solid button. 1.43: "Practice the one you missed" is a quiet link
    // (a miss re-answered minutes later is a retest and earns no spacing credit; it comes back tomorrow).
    const kindOf = (label: string) => root().findAll((n) => n.props.label === label && typeof n.props.onPress === 'function')[0].props.kind ?? 'primary';
    expect(kindOf('Done')).toBe('primary');
    expect(kindOf('Practice the one you missed')).toBe('ghost');
  });
});

// ── Note page ───────────────────────────────────────────────────────────
describe('note page: title collapse and reading to the end', () => {
  it('the header title shows only once the hero title is under it', () => {
    mockParams = { id: '4B1.2' };
    mount(<NoteSubtopicScreen />);
    const header = () => root().findByType(PushedHeader);
    expect(header().props.title).toBe(findNote('cisa', '4B1.2')!.name);
    expect(header().props.showTitle).toBe(false);
  
    // Mobile 1.43: words, not codes (the code stays in the source row).
    expect(allText()).toContain('IS Operations · Business Impact Analysis');
    expect(allText()).not.toContain('IS Operations · 4B1');
    expect(allText()).toContain(`About ${findNote('cisa', '4B1.2')!.minutes} min read`);
    layoutAll({ y: 0, height: 100 });
    scrollTo(50);
    expect(header().props.showTitle).toBe(false);
    scrollTo(300);
    expect(header().props.showTitle).toBe(true);
    // 8pt of hysteresis on the way back up.
    scrollTo(110);
    expect(header().props.showTitle).toBe(true);
    scrollTo(100);
    expect(header().props.showTitle).toBe(false);
    // The collapsed title never reaches a screen reader: it repeats the hero heading.
    const hidden = root().findByType(PushedHeader).findAll((n) => n.props.accessibilityElementsHidden === true && n.props.importantForAccessibility === 'no-hide-descendants');
    expect(hidden.some((h) => h.findAll((t) => t.props.children === findNote('cisa', '4B1.2')!.name).length > 0)).toBe(true);
  });

  it('a layout pass reports the last scroll offset, never 0 (a rotation keeps the header as it was)', () => {
    const seen = jest.fn();
    mount(
      <Screen onScroll={seen}>
        <View />
      </Screen>,
    );
    scrollTo(300);
    act(() => {
      root().findAllByType(ScrollView)[0].props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 700 } } });
    });
    expect(seen).toHaveBeenLastCalledWith(300, 700);
  });

  it('the topic tag is one line, and wraps at large text', () => {
    mockParams = { id: '4B1.2' };
    mount(<NoteSubtopicScreen />);
    const tagLines = () => root().findAll((n) => typeof n.props.children === 'string' && n.props.children.startsWith('IS Operations · Business') && n.props.v === 'meta')[0].props.numberOfLines;
    expect(tagLines()).toBe(1);
    act(() => {
      r?.unmount();
    });
    const w = Dimensions.get('window');
    act(() => {
      Dimensions.set({ window: { ...w, fontScale: 1.5 }, screen: { ...w, fontScale: 1.5 } });
    });
    mount(<NoteSubtopicScreen />);
    expect(tagLines()).toBeUndefined();
  });

  it('reaching the end marks the note read once; "Mark as not read" sticks for the visit', () => {
    mockParams = { id: '4B1.2' };
    mount(<NoteSubtopicScreen />);
    const read = () => selectCert(useProgress.getState(), 'cisa').notesRead;
    layoutAll({ y: 3000, height: 300 });
    scrollTo(0);
    expect(read()).toEqual([]);
    // A jump (or an iOS bounce) to the end without the learner's own drag never marks it.
    scrollTo(2400);
    expect(read()).toEqual([]);
    drag();
    scrollTo(1000);
    expect(read()).toEqual([]);
    expect(mockSay).not.toHaveBeenCalled();
    // Mobile 1.25: a quick flick to the end (under 20 s open) does not count…
    scrollTo(2400);
    expect(read()).toEqual([]);
    expect(mockSay).not.toHaveBeenCalled();
    // …the same end, once the note has been open for 20 s, does.
    act(() => {
      jest.advanceTimersByTime(20_000);
    });
    scrollTo(2400);
    expect(read()).toEqual(['4B1.2']);
    expect(allText()).toContain('About 3 min read · Read');
    // Said once, with where the undo is.
    expect(mockSay.mock.calls).toEqual([['Note marked as read. Mark as not read is at the end of the note.']]);
    scrollTo(2450);
    expect(mockSay).toHaveBeenCalledTimes(1);
    expect(root().findAll((n) => n.props.accessibilityLabel === `About ${findNote('cisa', '4B1.2')!.minutes} minutes to read. Marked as read`).length).toBeGreaterThan(0);
    press('Mark as not read');
    expect(read()).toEqual([]);
    expect(mockSay).toHaveBeenLastCalledWith('Marked as not read');
    scrollTo(2500);
    expect(read()).toEqual([]);
    press('Mark as read');
    expect(mockSay).toHaveBeenLastCalledWith('Marked as read');
    expect(mockSay).toHaveBeenCalledTimes(3);
  });
});

// ── Native diagrams ─────────────────────────────────────────────────────
describe('native note diagrams', () => {
  it('each registered id is a real note with a diagram', () => {
    expect(NATIVE_FIGURE_IDS).toEqual(expect.arrayContaining(['4B1.2', '4A7.2', '4A8.3', '4A6.2', '4B5.4']));
    for (const id of NATIVE_FIGURE_IDS) {
      const note = findNote('cisa', id);
      expect(note?.illustrations?.length).toBeGreaterThan(0);
      expect(nativeFigureFor(id)!.label.length).toBeGreaterThan(20);
    }
    expect(nativeFigureFor('1A1.1')).toBeUndefined();
  });

  it('4B1.2 draws the timeline in place of the web SVG, with the note’s caption, as one image', () => {
    const note = findNote('cisa', '4B1.2')!;
    mount(<NoteBody note={note} />);
    expect(root().findAllByType(RecoveryTimeline)).toHaveLength(1);
    expect(root().findAllByType(IllustrationView)).toHaveLength(note.illustrations!.length - 1);
    const image = root().findAll((n) => n.props.accessibilityRole === 'image' && n.type === View && /^Recovery timeline/.test(n.props.accessibilityLabel ?? ''));
    expect(image).toHaveLength(1);
    expect(allText()).toContain('Data lost ≤ RPO');
    expect(allText()).toContain('Downtime ≤ RTO');
    expect(allText()).toContain('MTD: the outer limit');
    expect(allText()).toContain('Last good backup');
    expect(image[0].props.accessibilityLabel).toContain('the last good backup, then the disruption');
    const caption = note.illustrations![0].caption ?? '';
    if (caption.includes('RPO and RTO on one timeline.')) {
      expect(allText()).toContain('RPO, RTO and MTD on one timeline.');
      expect(allText()).toContain('The MTD is the outer limit, and the RTO must fit inside it.');
    }
  });

  it('a caption that describes the web layout is adapted (4A7.2 runs top to bottom here)', () => {
    const note = findNote('cisa', '4A7.2')!;
    mount(<NoteBody note={note} />);
    const caption = note.illustrations![0].caption ?? '';
    if (caption.includes('An operational incident runs left to right:')) {
      expect(allText()).toContain('Read the steps top to bottom. In an operational incident,');
      expect(allText()).not.toContain('runs left to right');
    }
    // The content's own caption is untouched (the web keeps it).
    expect(findNote('cisa', '4A7.2')!.illustrations![0].caption).toBe(caption);
    const plan = nativeFigureFor('4B5.4')!.label;
    expect(plan.startsWith('Recovery plan tests, from least to most thorough: 1, Checklist: Contents checked, nothing moved.')).toBe(true);
    expect(plan.endsWith('5, Full interruption: Production moved; the riskiest.')).toBe(true);
  });
});

// ── Play glyph ──────────────────────────────────────────────────────────
describe('the Play glyph', () => {
  it('a plan game item uses the tab’s Pinwheel, not a gamepad', () => {
    const el = planIcon({ kind: 'game', gameId: 'trap', label: 'Snare Spotter' } as Parameters<typeof planIcon>[0], '#000') as React.ReactElement;
    expect(el.type).toBe(Pinwheel);
  });
});
