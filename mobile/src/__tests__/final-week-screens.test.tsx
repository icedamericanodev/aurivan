/**
 * The exam guide and the final review week, on screen (react-test-renderer,
 * real stores, the real exam pack):
 * - About the exam: every section renders with its sources, the one
 *   "check before you book" line and the last-checked date; a source opens
 *   in the browser; the Learn and Help rows open it.
 * - Final review week (app/exam-week.tsx with a plan): seven day cards,
 *   today's open; task buttons route to the right screen; "Mark this day
 *   done" persists (and lands in a backup); the checklist ticks are kept;
 *   no exam date still reads, without ticks.
 * - The cheat sheet: the whole sheet, only the parts a task asks for, cover
 *   mode, principles by title.
 * - Today: the card shows only from 8 days out to the eve, names the day,
 *   opens the plan, and Hide says where it went.
 * - Light, dark and about 200% text render without errors.
 *
 * Gotcha (see session-screen.regression.test.tsx): never write
 * `act(() => store.action())` — use braces.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AccessibilityInfo, Dimensions, Linking } from 'react-native';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import Learn from '../app/(tabs)/learn';
import CheatSheet from '../app/cheat-sheet';
import ExamGuide from '../app/exam-guide';
import ExamWeek from '../app/exam-week';
import PrinciplesHome from '../app/principles';
import { HelpRows } from '../components/help';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import * as examContent from '../content/exam';
import { getExamGuide, getFinalWeek } from '../content/exam';
import { getAllQuestions } from '../content/loader';
import { getPrinciples } from '../content/principles';
import { addDays } from '../engine/examDay';
import { dayKey } from '../engine/streak';
import { runnerUp } from '../engine/tips';
import * as a11y from '../lib/a11y';
import { flushSayLaterForTest } from '../lib/a11y';
import { checkBackupText, currentBackup } from '../lib/backup';
import { selectCert, useProgress, type ThinkingSlip } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
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
const mockPush = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: {
    push: (...a: unknown[]) => mockPush(...a),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
    dismissAll: jest.fn(),
    setParams: jest.fn(),
    canGoBack: () => true,
    canDismiss: () => false,
  },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

const guide = getExamGuide('cisa')!;
const week = getFinalWeek('cisa')!;
const today = () => dayKey(Date.now());

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
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const pressables = (label: string | RegExp) =>
  root().findAll(
    (n) =>
      typeof n.props.onPress === 'function' &&
      typeof n.props.accessibilityLabel === 'string' &&
      (typeof label === 'string' ? n.props.accessibilityLabel === label : label.test(n.props.accessibilityLabel)),
  );
const press = (label: string | RegExp, i = 0) => {
  const n = pressables(label)[i];
  if (!n) throw new Error(`no button ${label}`);
  act(() => {
    n.props.onPress();
  });
};
const byTestId = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.type !== 'string');
const has = (id: string) => root().findAll((n) => n.props.testID === id).length > 0;
const setFontScale = (fontScale: number) => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, width: 393, fontScale }, screen: { ...w, width: 393, fontScale } });
  });
};
const setDaysLeft = (n: number | null) => {
  act(() => {
    useSettings.setState({ examDates: n === null ? {} : { cisa: addDays(today(), n) } });
  });
};
const weekSaved = () => selectCert(useProgress.getState(), 'cisa').moments?.examWeek;

beforeEach(() => {
  setFontScale(1);
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {} });
  act(() => {
    useProgress.getState().resetCert('cisa');
    useProgress.setState((s) => ({ plantSettings: { promptHidden: true }, days: {}, byCert: { ...s.byCert, cisa: { ...s.byCert.cisa, moments: undefined } } }));
  });
  useSession.getState().clear();
  useSettings.setState(useSettings.getInitialState(), true);
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', fitPrompt: 'answered', dailyMinutes: 20 });
  setDaysLeft(6);
  mockPush.mockClear();
  mockParams = {};
});
afterEach(() => {
  unmount();
  jest.restoreAllMocks();
});

// ── About the exam ───────────────────────────────────────────────────────
describe('About the CISA exam', () => {
  it('renders every section with its summary, items and sources, the check line and the date', () => {
    mount(<ExamGuide />);
    const text = allText();
    expect(text).toContain('About the CISA exam');
    expect(text).toContain(guide.checkBeforeBooking);
    expect(text).toContain('Last checked 19 Oct 2026');
    expect(text).toContain(guide.disclaimer);
    for (const s of guide.sections) {
      expect([s.id, has(`guide-section-${s.id}`)]).toEqual([s.id, true]);
      expect([s.id, text.includes(s.items[0])]).toEqual([s.id, true]);
      for (const src of s.sources) expect(pressables(src.label).length).toBeGreaterThan(0);
    }
    // The domain weights, spoken as one line each.
    expect(root().findAll((n) => n.props.accessibilityLabel === 'Domain 4, Information Systems Operations and Business Resilience, 26 percent of the exam').length).toBeGreaterThan(0);
    // The check line is said once, not per item.
    expect(text.split('check isaca.org before you book').length - 1).toBe(1);
  });

  it('a source is a link that opens in the browser; "On this page" rows jump to a section', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    mount(<ExamGuide />);
    const src = guide.sections[0].sources[0];
    const link = pressables(src.label)[0];
    expect(link.props.accessibilityRole).toBe('link');
    expect(link.props.accessibilityHint).toBe('Opens in your browser');
    act(() => {
      link.props.onPress();
    });
    expect(open).toHaveBeenCalledWith(src.url);
    // A jump row is a 48pt+ button per section (it scrolls; nothing to route).
    press(`${guide.sections[4].title}. Section 5 of ${guide.sections.length}`);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('opens at ?section= without trouble, and renders in dark and at 200% text', () => {
    mockParams = { section: 'exam-day' };
    useSettings.setState({ theme: 'dark' });
    setFontScale(2);
    mount(<ExamGuide />);
    expect(allText()).toContain('Exam day');
  });

  it('no guide for this exam: a calm screen instead', () => {
    jest.spyOn(examContent, 'getExamGuide').mockReturnValue(null);
    mount(<ExamGuide />);
    expect(allText()).toContain('Not in the app yet');
  });
});

describe('entry rows', () => {
  it('Learn → Look it up: About the CISA exam and Final review week, under Principles', () => {
    mount(<Learn />);
    const text = allText();
    expect(text.indexOf('The thinking the exam rewards')).toBeLessThan(text.indexOf('About the CISA exam'));
    expect(text.indexOf('About the CISA exam')).toBeLessThan(text.indexOf('Final review week'));
    press(/^About the CISA exam/);
    expect(mockPush).toHaveBeenLastCalledWith('/exam-guide');
    press(/^Final review week/);
    expect(mockPush).toHaveBeenLastCalledWith('/exam-week');
  });

  it('Learn hides both rows for an exam without the files', () => {
    jest.spyOn(examContent, 'hasExamGuide').mockReturnValue(false);
    jest.spyOn(examContent, 'hasFinalWeek').mockReturnValue(false);
    mount(<Learn />);
    expect(allText()).not.toContain('About the CISA exam');
    expect(allText()).not.toContain('Final review week');
  });

  it('Help → Get help: About the CISA exam, after Common questions', () => {
    mount(<HelpRows certId="cisa" />);
    const text = allText();
    expect(text.indexOf('Common questions')).toBeLessThan(text.indexOf('About the CISA exam'));
    press(/^About the CISA exam/);
    expect(mockPush).toHaveBeenLastCalledWith('/exam-guide');
  });
});

// ── Final review week ───────────────────────────────────────────────────
describe('Final review week', () => {
  const header = (title: string) => pressables(new RegExp(`^${title}\\. `))[0];
  const openDay = (title: string) => {
    act(() => {
      header(title).props.onPress();
    });
  };
  const dayBoxes = () => root().findAll((n) => n.props.accessibilityRole === 'checkbox' && n.props.accessibilityLabel === 'Mark this day done' && typeof n.props.onPress === 'function');

  it('seven day cards counting down; today’s (6 days out) is open and says Today', () => {
    mount(<ExamWeek />);
    const text = allText();
    expect(text).toContain('Final review week');
    expect(text).toContain(week.intro);
    for (const d of week.days) expect([d.id, has(`week-${d.id}`)]).toEqual([d.id, true]);
    const six = week.days.find((d) => d.daysBefore === 6)!;
    expect(header(six.title).props.accessibilityState).toEqual({ expanded: true });
    expect(header(six.title).props.accessibilityLabel).toContain('Today · 6 days before your exam');
    expect(header(week.days[0].title).props.accessibilityState).toEqual({ expanded: false });
    expect(text).toContain(six.tasks[0].text);
    expect(text).toContain(six.remember);
    expect(text).toContain('0 of 7 days done');
    // The other parts: cheat sheet row, the kept checklist, the eve and morning lists, why it works.
    for (const id of ['week-eve', 'week-morning', 'week-how']) expect(has(id)).toBe(true);
    expect(text).toContain('Before the day');
    expect(text).toContain('If you blank');
  });

  it('task buttons route: the journal, the top slip, a family, the cheat-sheet parts', () => {
    mount(<ExamWeek />);
    press(/^Open the mistake journal\. /);
    expect(mockPush).toHaveBeenLastCalledWith('/mistakes');
    // No tagged slips yet: the principles library.
    press(/^Open the principles\. /);
    expect(mockPush).toHaveBeenLastCalledWith('/principles');
    press(/^Read the principles\. /);
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/principles', params: { family: 'response' } });
    press(/^Check the list\. /);
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/cheat-sheet', params: { parts: '4,5' } });
  });

  it('mocks, a note, practice in the focus domain and the notes search', () => {
    mount(<ExamWeek />);
    openDay('Full rehearsal');
    press(/^Start a full mock\. /);
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/mock-start', params: { questions: '150' } });
    openDay('Pace check');
    press(/^Start a mini mock\. /);
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/mock-start', params: { questions: '50' } });
    press(/^Open the note\. /);
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/notes/subtopic/[id]', params: { id: '1B3.2' } });
    // Day 5: "focus" with no answers is the heaviest domain, 4 (IS Operations).
    openDay('Your biggest gap');
    press(/^Practice IS Operations\. /);
    expect(mockPush).toHaveBeenLastCalledWith('/session');
    const s = useSession.getState().active!;
    expect(s.title).toBe('Final week · IS Operations');
    expect(s.questionIds.length).toBe(10);
    expect(s.questionIds.every((id) => id.startsWith('d4_'))).toBe(true);
    act(() => {
      useSession.getState().clear();
    });
    openDay('Light review and logistics');
    press(/^Open the notes\. /, pressables(/^Open the notes\. /).length - 1);
    expect(mockPush).toHaveBeenLastCalledWith('/notes');
  });

  it('top slip "Didn’t know it": the note for the topic missed most, not an empty principles view', () => {
    act(() => {
      const qs = getAllQuestions('cisa').filter((q) => q.domainId === '5').slice(0, 5);
      for (const q of qs) {
        const ru = runnerUp(q.tips, q.correct);
        const wrong = (['A', 'B', 'C', 'D'] as const).find((l) => l !== q.correct && l !== ru)!;
        useProgress.getState().recordMistake('cisa', q.id, wrong);
        useProgress.getState().tagMistake('cisa', q.id, 'knowledge' as ThinkingSlip);
      }
    });
    mount(<ExamWeek />);
    press(/^Open the note\. /);
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/notes/subtopic/[id]', params: { id: expect.stringMatching(/^5/) } });
  });

  it('"Mark this day done" saves for this exam date, keeps the ticks, and is in a backup', () => {
    mount(<ExamWeek />);
    // The checklist's six ticks are still here, plus today's day box.
    const ticks = root().findAll((n) => n.props.accessibilityRole === 'checkbox' && typeof n.props.onPress === 'function');
    expect(ticks).toHaveLength(7);
    act(() => {
      ticks.find((t) => /Confirm your exam date/.test(t.props.accessibilityLabel))!.props.onPress();
    });
    expect(dayBoxes()).toHaveLength(1);
    expect(dayBoxes()[0].props.accessibilityHint).toBe('Learn from every miss');
    act(() => {
      dayBoxes()[0].props.onPress();
    });
    const date = addDays(today(), 6);
    expect(weekSaved()).toEqual({ for: date, done: ['booking'], days: ['day-6'] });
    expect(dayBoxes()[0].props.accessibilityState.checked).toBe(true);
    expect(allText()).toContain('1 of 7 days done');
    const read = checkBackupText(JSON.stringify(currentBackup(Date.now())));
    if (read.kind !== 'ok') throw new Error(read.code);
    expect(read.data.progress.byCert.cisa.moments?.examWeek).toEqual({ for: date, done: ['booking'], days: ['day-6'] });
    // Undo.
    act(() => {
      dayBoxes()[0].props.onPress();
    });
    expect(weekSaved()).toEqual({ for: date, done: ['booking'] });
  });

  it('no exam date: the plan still reads, asks for a date, and offers no ticks', () => {
    setDaysLeft(null);
    mount(<ExamWeek />);
    expect(has('week-set-date')).toBe(true);
    expect(dayBoxes()).toHaveLength(0);
    expect(root().findAll((n) => n.props.accessibilityRole === 'checkbox')).toHaveLength(0);
    // The first day starts open, so the plan reads from the top.
    expect(header(week.days[0].title).props.accessibilityState).toEqual({ expanded: true });
    press('Set exam date');
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/settings', params: { open: 'exam-date' } });
  });

  it('8 days out: "starts tomorrow", the first day open; never late or overdue words', () => {
    setDaysLeft(8);
    mount(<ExamWeek />);
    expect(allText()).toContain('Your week starts tomorrow.');
    expect(header(week.days[0].title).props.accessibilityState).toEqual({ expanded: true });
    // Past days (7…4 when 3 are left) carry no late or overdue state: only the app's own words are
    // checked (the authored plan itself says "Missed a day? Skip it and carry on", which is the rule).
    setDaysLeft(3);
    // Each header is spoken "<title>. <caption>. <goal>": the caption is the app's own state line.
    const labels = week.days.map((d) => (header(d.title).props.accessibilityLabel as string).slice(d.title.length + 2).split('. ')[0]).join(' | ');
    expect(labels).not.toMatch(/overdue|late|missed|behind/i);
    expect(labels).toContain('Today · 3 days before your exam');
  });

  it.each(['light', 'dark'] as const)('renders in %s and at 200%% text', (theme) => {
    useSettings.setState({ theme });
    setFontScale(2);
    mount(<ExamWeek />);
    expect(allText()).toContain(week.days[1].title);
  });
});

// ── The cheat sheet ──────────────────────────────────────────────────────
describe('the cheat sheet', () => {
  it('the whole sheet: five domains, principles by title, priority words, routine, pace', () => {
    mount(<CheatSheet />);
    for (const d of ['1', '2', '3', '4', '5']) expect(has(`sheet-domain-${d}`)).toBe(true);
    for (const id of ['sheet-principles', 'sheet-priority-words', 'sheet-routine', 'sheet-pace']) expect(has(id)).toBe(true);
    const text = allText();
    // Each principle by its own title and rule (never copied into the exam file).
    for (const p of getPrinciples('cisa')!.principles) expect([p.id, text.includes(p.title)]).toEqual([p.id, true]);
    press(new RegExp(`^${getPrinciples('cisa')!.principles[0].title},`));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/principles/[id]', params: { id: getPrinciples('cisa')!.principles[0].id } });
    // A point opens its note.
    const point = week.cheatSheet.domains[0].points[0];
    press(new RegExp(`^${point.text.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/notes/subtopic/[id]', params: { id: point.note } });
  });

  it('only the parts a task asks for ("focus" is the learner’s domain), then the whole sheet', () => {
    mockParams = { parts: 'focus,routine' };
    mount(<CheatSheet />);
    expect(has('sheet-domain-4')).toBe(true);
    expect(has('sheet-domain-1')).toBe(false);
    expect(has('sheet-routine')).toBe(true);
    expect(has('sheet-pace')).toBe(false);
    expect(allText()).toContain('Showing Domain 4, Answering routine');
    press('Show the whole sheet');
    expect(has('sheet-domain-1')).toBe(true);
    expect(has('sheet-pace')).toBe(true);
  });

  it('cover mode hides each point until tapped (recall first, then check)', () => {
    mockParams = { parts: '3' };
    mount(<CheatSheet />);
    const first = week.cheatSheet.domains[2].points[0].text;
    expect(allText()).toContain(first);
    const toggle = root().findAll((n) => n.props.accessibilityLabel === 'Cover the points' && typeof n.props.onValueChange === 'function')[0];
    act(() => {
      toggle.props.onValueChange(true);
    });
    expect(allText()).not.toContain(first);
    const n = week.cheatSheet.domains[2].points.length;
    expect(pressables(/^Point \d+ of \d+, covered/)).toHaveLength(n);
    press(`Point 1 of ${n}, covered. Show it`);
    expect(allText()).toContain(first);
    expect(pressables(/^Point \d+ of \d+, covered/)).toHaveLength(n - 1);
  });
});

describe('principles: one family from a link', () => {
  it('?family=response shows that family, then "See all principles" shows them all', () => {
    mockParams = { family: 'response' };
    mount(<PrinciplesHome />);
    const families = getPrinciples('cisa')!.families;
    const response = families.find((f) => f.id === 'response')!;
    const other = families.find((f) => f.id !== 'response')!;
    expect(allText()).toContain(response.title);
    expect(allText()).not.toContain(other.question);
    press('See all principles');
    expect(allText()).toContain(other.question);
  });
});

// ── Today ───────────────────────────────────────────────────────────────
describe('Today: the final review week card', () => {
  const card = () => byTestId('exam-week-card').length > 0;

  it('shows from 8 days out to 2; never at 9, on the eve (the eve card links instead) or on exam day', () => {
    // UX review H1: the eve's own card shows the day before, so the plan card waits (no two eve cards).
    for (const [d, shown] of [[10, false], [9, false], [8, true], [7, true], [4, true], [2, true], [1, false], [0, false]] as const) {
      setDaysLeft(d);
      act(() => {
        useProgress.setState({ days: {} });
      });
      mount(<Today />);
      expect([d, card()]).toEqual([d, shown]);
      unmount();
    }
  });

  it('names the day, counts days done, opens the plan; Hide says where it went', () => {
    setDaysLeft(4);
    mount(<Today />);
    const text = allText();
    expect(text).toContain('Final review week');
    expect(text).toContain('Today: Pace check.');
    expect(text).toContain('0 of 7 days done');
    press('Open the plan');
    expect(mockPush).toHaveBeenLastCalledWith('/exam-week');
    const spoken = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    press('Hide this card. The plan stays in Learn and your readiness report.');
    flushSayLaterForTest();
    expect(card()).toBe(false);
    expect(spoken).toHaveBeenCalledWith('Hidden. The plan stays in Learn and your readiness report.');
  });

  it('8 days out it says the week starts tomorrow', () => {
    setDaysLeft(8);
    mount(<Today />);
    expect(allText()).toContain(`Starts tomorrow: ${week.days[0].title}.`);
  });
});

// ── Review fixes (UX H1, H2, P3–P7; observations) ────────────────────────
describe('review fixes', () => {
  it('the eve: one card only, the eve card, with "Tonight’s list" to the plan’s eve checklist', () => {
    setDaysLeft(1);
    mount(<Today />);
    expect(byTestId('exam-week-card')).toHaveLength(0);
    expect(allText()).toContain('Tomorrow. You’ve done the work.');
    press(/^Tonight’s list$/);
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/exam-week', params: { section: 'eve' } });
  });

  it('?section=eve opens the week at the eve list and moves focus there', () => {
    jest.useFakeTimers();
    const focus = jest.spyOn(a11y, 'moveFocus');
    mockParams = { section: 'eve' };
    setDaysLeft(1);
    mount(<ExamWeek />);
    act(() => {
      jest.advanceTimersByTime(300);
    });
    jest.useRealTimers();
    expect(focus).toHaveBeenCalled();
    const ref = focus.mock.calls[0][0] as { current: unknown };
    expect(ref.current).toBeTruthy();
  });

  it('cover mode: "Show point N" moves focus onto the point it shows', () => {
    const focus = jest.spyOn(a11y, 'moveFocus');
    mockParams = { parts: '3' };
    mount(<CheatSheet />);
    const toggle = root().findAll((n) => n.props.accessibilityLabel === 'Cover the points' && typeof n.props.onValueChange === 'function')[0];
    act(() => {
      toggle.props.onValueChange(true);
    });
    const n = week.cheatSheet.domains[2].points.length;
    press(`Point 2 of ${n}, covered. Show it`);
    expect(focus).toHaveBeenCalledTimes(1);
    // The ref now holds the shown point's row.
    const ref = focus.mock.calls[0][0] as { current: unknown };
    expect(ref.current).toBeTruthy();
    expect(allText()).toContain(week.cheatSheet.domains[2].points[1].text);
  });

  it('each task is one stop, "Task i of n. …"; repeated button names say what they open', () => {
    mount(<ExamWeek />);
    const six = week.days.find((d) => d.daysBefore === 6)!;
    const labels = root()
      .findAll((n) => typeof n.props.accessibilityLabel === 'string' && /^Task \d+ of \d+\. /.test(n.props.accessibilityLabel))
      .map((n) => n.props.accessibilityLabel);
    expect(labels).toContain(`Task 1 of ${six.tasks.length}. ${six.tasks[0].text}`);
    // Every action button's spoken name is unique on the open day.
    // Open a second day too, so "Read the principles" appears more than once.
    press(new RegExp(`^${week.days.find((d) => d.daysBefore === 4)!.title}\\. `));
    const buttons = root().findAll((n) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function' && /^(Open|Read|Start|Practice|Check)\b.*\. /.test(n.props.accessibilityLabel ?? ''));
    const names = [...new Set(buttons)].map((b) => b.props.accessibilityLabel as string);
    const reads = names.filter((x) => x.startsWith('Read the principles. '));
    expect(reads.length).toBeGreaterThan(1);
    expect(new Set(reads).size).toBe(reads.length);
  });

  it('a past exam date: the plan reads, with one line asking for a new date', () => {
    setDaysLeft(-2);
    mount(<ExamWeek />);
    expect(allText()).toContain('Your exam date has passed. Set a new one to plan again.');
    expect(allText()).not.toContain('days done');
  });

  it('principles ?family=: "Showing one family" up top, with "See all principles"', () => {
    mockParams = { family: 'reading' };
    mount(<PrinciplesHome />);
    const reading = getPrinciples('cisa')!.families.find((f) => f.id === 'reading')!;
    expect(has('principles-one-family')).toBe(true);
    expect(allText()).toContain(`Showing one family: ${reading.title}`);
    const text = allText();
    expect(text.indexOf('See all principles')).toBeLessThan(text.indexOf(reading.question));
  });

  it('the guide: "Back to contents" after each section; a section date only when it differs', () => {
    const focus = jest.spyOn(a11y, 'moveFocus');
    mount(<ExamGuide />);
    expect(pressables(/^Back to contents$/)).toHaveLength(guide.sections.length);
    press(/^Back to contents$/, 3);
    expect(focus).toHaveBeenCalled();
    // Every section was checked on the page's date: no per-section date repeats it.
    expect(allText()).not.toContain('Checked 19 Oct 2026');
    expect(allText()).toContain('Last checked 19 Oct 2026');
  });
});
