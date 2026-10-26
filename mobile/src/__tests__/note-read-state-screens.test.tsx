/**
 * Mobile 1.25, "fill the circle", on screen.
 *
 * Plain English for the founder, what this file checks:
 * - the mark: an empty `track` ring, a half circle, a full disc (no ✓);
 *   hidden from screen readers; the old `read` prop still works;
 * - the note page: 10 s open with the app in front = started (paused in the
 *   background or out of view); a flick to the end before 20 s is not read;
 *   reading tells the list row (and the domain row, for a domain's last note)
 *   to fill once;
 * - the lists: words and labels for the three states; a just-read row fills
 *   once, only when its screen is in view, and never again;
 * - Settings: "Reset reading progress" asks first, then clears only notes.
 *
 * Real content and real stores. Never `act(() => store.action())`: use braces.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Alert, AppState, Dimensions, ScrollView, View, type AppStateStatus } from 'react-native';
import { Circle } from 'react-native-svg';
import NotesDomain from '../app/notes/[domain]';
import NotesHome from '../app/notes/index';
import NoteSubtopicScreen from '../app/notes/subtopic/[id]';
import Settings from '../app/settings';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import { setSystemReducedMotionForTest } from '../components/motion';
import { ReadMark } from '../components/notes';
import { noteSubtopics } from '../content/notes';
import { clearJustRead, justReadFrom, noteJustRead, readMarkKey } from '../lib/noteNews';
import { resetNoteDwellForTest } from '../lib/useNoteDwell';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { light } from '../theme/tokens';

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
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null }));
let mockParams: Record<string, string> = {};
// Whether the screen under test is the one in view (the navigator's answer).
let mockFocused = true;
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
  useIsFocused: () => mockFocused,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View: RNView } = jest.requireActual('react-native');
  return { SafeAreaView: RNView, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
const mockSay = jest.fn();
jest.mock('../lib/a11y', () => ({
  ...jest.requireActual('../lib/a11y'),
  sayLater: (...args: unknown[]) => mockSay(...args),
  moveFocus: () => {},
}));
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

// AppState: the test decides when the app goes to the background and back.
let appListeners: ((s: AppStateStatus) => void)[] = [];
const setAppState = (s: AppStateStatus) =>
  act(() => {
    Object.defineProperty(AppState, 'currentState', { value: s, configurable: true });
    appListeners.forEach((l) => l(s));
  });

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
const wait = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });
const cert = () => selectCert(useProgress.getState(), 'cisa');
const byLabel = (label: string) => root().findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function');
/** The circles of every mark on screen (each mark is one 24×24 hidden View). */
const marks = () =>
  root().findAll((n) => n.type === View && n.props.importantForAccessibility === 'no-hide-descendants' && n.props.style?.width === 24 && n.props.style?.height === 24);
const circlesOf = (m: ReactTestInstance) => m.findAllByType(Circle);
/** The mark inside the row with this spoken label. */
const markIn = (label: string) => {
  const row = byLabel(label)[0];
  if (!row) throw new Error(`no row ${label}`);
  const m = row.findAll((n) => n.type === View && n.props.importantForAccessibility === 'no-hide-descendants' && n.props.style?.width === 24)[0];
  if (!m) throw new Error(`no mark in ${label}`);
  return m;
};
const isFilling = (m: ReactTestInstance) => circlesOf(m).some((x) => x.props.animatedProps !== undefined);
const layoutAll = (box: { y: number; height: number }) =>
  act(() => {
    for (const n of root().findAll((x) => typeof x.props.onLayout === 'function' && x.type === View)) {
      n.props.onLayout({ nativeEvent: { layout: { x: 0, width: 390, ...box } } });
    }
  });
const drag = () =>
  act(() => {
    root().findAllByType(ScrollView).find((s) => typeof s.props.onScrollBeginDrag === 'function')!.props.onScrollBeginDrag({ nativeEvent: {} });
  });
const scrollTo = (y: number) =>
  act(() => {
    root()
      .findAllByType(ScrollView)
      .find((s) => typeof s.props.onScroll === 'function')!
      .props.onScroll({ nativeEvent: { contentOffset: { x: 0, y }, layoutMeasurement: { width: 390, height: 800 }, contentSize: { width: 390, height: 4000 } } });
  });

const D4 = noteSubtopics('cisa', '4').map((s) => s.id);
const NOTE = '4B1.2';
const noteName = () => noteSubtopics('cisa', '4').find((s) => s.id === NOTE)!.name;

// Where every view sits in the window (a just-read row plays only inside it). Jest's View
// never answers measureInWindow by itself, so the test gives the answer.
let mockRowY = 100;
beforeEach(() => {
  jest.useFakeTimers();
  mockRowY = 100;
  jest.spyOn(View.prototype, 'measureInWindow').mockImplementation((cb) => cb(0, mockRowY, 24, 24));
  appListeners = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, l) => {
    appListeners.push(l as (s: AppStateStatus) => void);
    return { remove: () => (appListeners = appListeners.filter((x) => x !== l)) } as ReturnType<typeof AppState.addEventListener>;
  });
  Object.defineProperty(AppState, 'currentState', { value: 'active' as AppStateStatus, configurable: true });
  mockSay.mockClear();
  mockFocused = true;
  const w = Dimensions.get('window');
  Dimensions.set({ window: { ...w, fontScale: 1 }, screen: { ...w, fontScale: 1 } });
  mockParams = {};
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  clearJustRead();
  resetNoteDwellForTest();
});
afterEach(() => {
  unmount();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

// ── The mark ───────────────────────────────────────────────────────────
describe('ReadMark: fill the circle', () => {
  it('none: one 2pt ring in track; started: accent ring + half pie; read: ONE solid accent disc (no seam); no check', () => {
    mount(
      <View>
        <ReadMark state="none" />
        <ReadMark state="started" />
        <ReadMark state="read" />
        <ReadMark read />
        <ReadMark read={false} />
      </View>,
    );
    const [none, started, read, oldRead, oldNone] = marks();
    expect(circlesOf(none).map((x) => [x.props.r, x.props.stroke, x.props.strokeWidth])).toEqual([[11, light.track, 2]]);
    const [ring, pie] = circlesOf(started);
    expect([ring.props.r, ring.props.stroke, ring.props.fill]).toEqual([11, light.accent, 'none']);
    expect(pie.props).toMatchObject({ cx: 12, cy: 12, r: 5.5, fill: 'none', stroke: light.accent, strokeWidth: 11, strokeDasharray: '17.279 34.558', rotation: -90, origin: '12,12' });
    expect(circlesOf(read).map((x) => [x.props.cx, x.props.cy, x.props.r, x.props.fill, x.props.stroke])).toEqual([[12, 12, 12, light.accent, undefined]]);
    // The older two-state prop still draws the same.
    expect(circlesOf(oldRead).map((x) => [x.props.r, x.props.fill])).toEqual([[12, light.accent]]);
    expect(circlesOf(oldNone)).toHaveLength(1);
    // Hidden from screen readers and never a control.
    for (const m of marks()) {
      expect(m.props.accessible).toBe(false);
      expect(m.findAll((n) => typeof n.props.onPress === 'function')).toHaveLength(0);
    }
  });
});

// ── The note page ──────────────────────────────────────────────────────
describe('note page: started after 10 s, read only after 20 s', () => {
  it('10 s open with the app in front marks it started; background time does not count', () => {
    mockParams = { id: NOTE };
    mount(<NoteSubtopicScreen />);
    wait(6_000);
    expect(cert().notesViewed).toEqual([]);
    // Locked phone for a minute: the clock pauses.
    setAppState('background');
    wait(60_000);
    expect(cert().notesViewed).toEqual([]);
    setAppState('active');
    wait(3_900);
    expect(cert().notesViewed).toEqual([]);
    wait(200);
    expect(cert().notesViewed).toEqual([NOTE]);
    expect(cert().notesRead).toEqual([]);
  });

  it('the 10 s add up across visits in the same session (6 s, leave, 4 s more = started)', () => {
    mockParams = { id: NOTE };
    mount(<NoteSubtopicScreen />);
    wait(6_000);
    unmount();
    expect(cert().notesViewed).toEqual([]);
    mount(<NoteSubtopicScreen />);
    wait(3_900);
    expect(cert().notesViewed).toEqual([]);
    wait(200);
    expect(cert().notesViewed).toEqual([NOTE]);
    // A new app launch (memory cleared) starts from 0 for another note.
    resetNoteDwellForTest();
  });

  it('a jump link that lands at the end never marks it read, even after an earlier drag', () => {
    mockParams = { id: NOTE };
    mount(<NoteSubtopicScreen />);
    layoutAll({ y: 3000, height: 300 });
    wait(25_000);
    drag();
    scrollTo(500);
    // "On this page" jumps (the page scrolls for the learner), and the scroll lands at the end.
    const jump = root().findAll((n) => typeof n.props.onPress === 'function' && /^On this page: /.test(String(n.props.accessibilityLabel)))[0];
    expect(jump).toBeDefined();
    act(() => {
      jump.props.onPress();
    });
    scrollTo(2400);
    expect(cert().notesRead).toEqual([]);
    // The learner's own drag that reaches the end does.
    drag();
    scrollTo(2450);
    expect(cert().notesRead).toEqual([NOTE]);
  });

  it('out of view (another screen on top) does not count either', () => {
    mockParams = { id: NOTE };
    mockFocused = false;
    mount(<NoteSubtopicScreen />);
    wait(30_000);
    expect(cert().notesViewed).toEqual([]);
  });

  it('a flick to the end before 20 s is not read; the end after 20 s is, and tells the row to fill from half', () => {
    mockParams = { id: NOTE };
    mount(<NoteSubtopicScreen />);
    layoutAll({ y: 3000, height: 300 });
    drag();
    wait(2_000);
    scrollTo(2400);
    expect(cert().notesRead).toEqual([]);
    wait(18_000);
    scrollTo(2400);
    expect(cert().notesRead).toEqual([NOTE]);
    // It was started (open 10 s) before it became read.
    expect(justReadFrom(readMarkKey('cisa', 'note', NOTE))).toBe(0.5);
    // Not the domain's last note: the domain row has nothing to play.
    expect(justReadFrom(readMarkKey('cisa', 'domain', '4'))).toBeUndefined();
  });

  it('"Mark as read" is not held back by 20 s; "Mark as not read" goes back to started and drops the news', () => {
    mockParams = { id: NOTE };
    mount(<NoteSubtopicScreen />);
    act(() => {
      byLabel('Mark as read')[0].props.onPress();
    });
    expect(cert().notesRead).toEqual([NOTE]);
    // Read at once, never started first: the fill starts from empty.
    expect(justReadFrom(readMarkKey('cisa', 'note', NOTE))).toBe(0);
    act(() => {
      byLabel('Mark as not read')[0].props.onPress();
    });
    expect(cert().notesRead).toEqual([]);
    expect(cert().notesViewed).toEqual([NOTE]);
    expect(justReadFrom(readMarkKey('cisa', 'note', NOTE))).toBeUndefined();
  });

  it("the domain's last note also tells the domain row to fill", () => {
    const others = D4.filter((id) => id !== NOTE);
    for (const id of others) useProgress.getState().setNoteRead('cisa', id, true);
    mockParams = { id: NOTE };
    mount(<NoteSubtopicScreen />);
    act(() => {
      byLabel('Mark as read')[0].props.onPress();
    });
    expect(justReadFrom(readMarkKey('cisa', 'domain', '4'))).toBe(0.5);
  });
});

// ── The lists ──────────────────────────────────────────────────────────
describe('lists: words, labels and the one-time fill', () => {
  const openTopicOf = (noteId: string) => {
    const topicId = noteId.split('.')[0];
    const header = root().findAll((n) => typeof n.props.onPress === 'function' && n.props.accessibilityState?.expanded === false && String(n.props.accessibilityLabel).startsWith(`${topicId} `))[0];
    if (header)
      act(() => {
        header.props.onPress();
      });
  };

  it('a domain page says "Not read yet" / "Started" / "Read" and labels each row the same way', () => {
    useProgress.getState().markNoteViewed('cisa', NOTE);
    mockParams = { domain: '4' };
    mount(<NotesDomain />);
    openTopicOf(NOTE);
    const name = noteName();
    expect(byLabel(`${name}, started, not finished`).length).toBeGreaterThan(0);
    expect(circlesOf(markIn(`${name}, started, not finished`))[1].props.strokeDasharray).toBe('17.279 34.558');
    unmount();
    useProgress.getState().setNoteRead('cisa', NOTE, true);
    mount(<NotesDomain />);
    openTopicOf(NOTE);
    expect(byLabel(`${name}, read`).length).toBeGreaterThan(0);
    // Read some other way (no news): full at once, no motion.
    expect(isFilling(markIn(`${name}, read`))).toBe(false);
  });

  it('a just-read row waits out of view, fills once when its screen is in view, then never again', () => {
    useProgress.getState().markNoteViewed('cisa', NOTE);
    useProgress.getState().setNoteRead('cisa', NOTE, true);
    noteJustRead(readMarkKey('cisa', 'note', NOTE), 0.5);
    mockParams = { domain: '4' };
    // The note screen is still on top: the list row must wait.
    mockFocused = false;
    mount(<NotesDomain />);
    openTopicOf(NOTE);
    const label = `${noteName()}, read`;
    expect(isFilling(markIn(label))).toBe(true);
    expect(justReadFrom(readMarkKey('cisa', 'note', NOTE))).toBe(0.5); // still waiting
    // Back in view: it plays and takes the news.
    mockFocused = true;
    act(() => {
      r!.update(<NotesDomain />);
    });
    expect(justReadFrom(readMarkKey('cisa', 'note', NOTE))).toBeUndefined();
    expect(isFilling(markIn(label))).toBe(true); // keeps its circle to finish the motion
    // Next visit: just full.
    unmount();
    mount(<NotesDomain />);
    openTopicOf(NOTE);
    expect(isFilling(markIn(label))).toBe(false);
  });

  it('a just-read row scrolled off screen waits; it plays when the page comes to rest with it in the window', () => {
    useProgress.getState().setNoteRead('cisa', NOTE, true);
    const key = readMarkKey('cisa', 'note', NOTE);
    noteJustRead(key, 0.5);
    mockParams = { domain: '4' };
    // First far below the screen.
    mockRowY = 5000;
    const windowH = Dimensions.get('window').height;
    mount(<NotesDomain />);
    openTopicOf(NOTE);
    const label = `${noteName()}, read`;
    expect(isFilling(markIn(label))).toBe(true);
    expect(justReadFrom(key)).toBe(0.5); // below the window: still waiting
    // The learner scrolls; the page comes to rest with the row on screen.
    mockRowY = Math.min(400, windowH - 100);
    const sv = root().findAllByType(ScrollView)[0];
    act(() => {
      sv.props.onScrollEndDrag?.({ nativeEvent: {} });
    });
    expect(justReadFrom(key)).toBeUndefined(); // played, once
    // Above the window counts as off screen too.
    noteJustRead(key, 0.5);
    unmount();
    mockRowY = -200;
    mount(<NotesDomain />);
    openTopicOf(NOTE);
    expect(justReadFrom(key)).toBe(0.5);
    mockRowY = 100;
    act(() => {
      root().findAllByType(ScrollView)[0].props.onMomentumScrollEnd?.({ nativeEvent: {} });
    });
    expect(justReadFrom(key)).toBeUndefined();
  });

  it('motion on: the pie sweeps (dash offset to 0), then the solid disc takes over; Reduce Motion: the disc cross-fades in instead', () => {
    const playOnce = (reduced: boolean) => {
      setSystemReducedMotionForTest(reduced);
      setMockReducedMotion(reduced);
      clearJustRead();
      noteJustRead('k', 0.5);
      mount(<ReadMark state="read" play="k" />);
      const m = marks()[0];
      const pie = circlesOf(m).find((x) => x.props.r === 5.5 && x.props.animatedProps)!;
      // The mock finishes an animation at once; a re-render shows its end state.
      act(() => {
        r!.update(<ReadMark state="read" play="k" />);
      });
      const overlay = m.findAll((n) => Array.isArray(n.props.style) && n.props.style.some((s: { opacity?: number } | undefined) => s && typeof s.opacity === 'number'))[0];
      const opacity = (overlay.props.style as ({ opacity?: number } | undefined)[]).find((s) => s && typeof s.opacity === 'number')!.opacity;
      const offset = circlesOf(marks()[0]).find((x) => x.props.r === 5.5 && x.props.animatedProps)!.props.animatedProps.strokeDashoffset;
      expect(pie).toBeDefined();
      unmount();
      return { opacity, offset };
    };
    const moving = playOnce(false);
    expect(moving.offset).toBeCloseTo(0);
    // The solid disc (no seam) is on top once the sweep has ended.
    expect(moving.opacity).toBe(1);
    const calm = playOnce(true);
    // Reduced: the pie stays where it was (half) and the full disc fades in over it.
    expect(calm.offset).toBeCloseTo(17.279);
    expect(calm.opacity).toBe(1);
    setSystemReducedMotionForTest(null);
    setMockReducedMotion(true);
  });

  it('the notes home: a domain is empty, then half once anything is started (with words), then full', () => {
    mount(<NotesHome />);
    const d4 = () => root().findAll((n) => typeof n.props.onPress === 'function' && String(n.props.accessibilityLabel).startsWith('Domain 4,'))[0];
    const domainMark = () => d4().findAll((n) => n.type === View && n.props.importantForAccessibility === 'no-hide-descendants' && n.props.style?.width === 24)[0];
    expect(circlesOf(domainMark())).toHaveLength(1);
    unmount();
    useProgress.getState().markNoteViewed('cisa', NOTE);
    mount(<NotesHome />);
    expect(circlesOf(domainMark())[1].props.strokeDasharray).toBe('17.279 34.558');
    expect(d4().props.accessibilityLabel).toMatch(/ Started\.$/);
    unmount();
    for (const id of D4) useProgress.getState().setNoteRead('cisa', id, true);
    mount(<NotesHome />);
    expect(circlesOf(domainMark()).map((x) => [x.props.r, x.props.fill])).toEqual([[12, light.accent]]);
    expect(d4().props.accessibilityLabel).toMatch(/All read\.$/);
  });
});

// ── Settings → Reset reading progress ──────────────────────────────────
describe('Settings: Reset reading progress', () => {
  it('is hidden with nothing read (mobile 1.43: a greyed row read like a heading); asks first; clears only the notes', () => {
    mount(<Settings />);
    const row = () => root().findAll((n) => typeof n.props.onPress === 'function' && String(n.props.accessibilityLabel).startsWith('Reset reading progress'))[0];
    expect(row()).toBeUndefined();
    unmount();
    useProgress.getState().recordAnswer('cisa', 'd1_001', true);
    useProgress.getState().setNoteRead('cisa', NOTE, true);
    useProgress.getState().markNoteViewed('cisa', '1A1.1');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mount(<Settings />);
    expect(row().props.disabled).toBeFalsy();
    act(() => {
      row().props.onPress();
    });
    const [title, body, buttons] = alert.mock.calls[0] as [string, string, { text: string; onPress?: () => void }[]];
    expect(title).toBe('Reset reading progress?');
    // Names the exam; the sync warning is added only while a cloud build syncs (off here).
    expect(body).toBe('Every CISA note goes back to not read. Your answers and scores stay.');
    expect(buttons.map((b) => b.text)).toEqual(['Cancel', 'Reset reading']);
    // Nothing happens until "Reset" is tapped.
    expect(cert().notesRead).toEqual([NOTE]);
    act(() => {
      buttons.find((b) => b.text === 'Reset reading')!.onPress!();
    });
    expect(cert().notesRead).toEqual([]);
    expect(cert().notesViewed).toEqual([]);
    expect(cert().answers).toHaveProperty('d1_001');
  });
});
