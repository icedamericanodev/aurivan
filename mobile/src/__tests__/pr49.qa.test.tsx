/**
 * QA for PR #49 (mobile 1.17, "a tidy Settings"): the journeys the PR's own
 * tests leave open.
 *
 *   A. The calendar's edges: today, days before today, the far end (two
 *      years), month and year navigation, the leap day, the end of a month.
 *   B. The features that read the exam date (countdown, exam eve / exam day,
 *      exam week, today's plan) read a calendar-picked date the same way as
 *      a preset one: the saved format is unchanged ("YYYY-MM-DD").
 *   C. An older save with an exam date (past, this month, beyond two years)
 *      still loads, shows, and survives opening and saving the calendar.
 *   D. Choice sheets (theme, daily time, starting point, default mode, motion).
 *   E. Reset progress asks first, and keeps settings (exam date, theme).
 *   F. Onboarding with and without a date, quick choice then calendar.
 *   G. Deep links: open=exam-date saves, an unknown value opens nothing,
 *      section=plant scrolls to the plant group.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Dimensions } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Settings, { LINK_OPEN_FALLBACK_MS } from '../app/settings';
import Onboarding from '../app/onboarding';
import ExamWeek from '../app/exam-week';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { calendarBounds, daysInMonth, monthGrid, spokenDate } from '../engine/calendar';
import { dateInMonths, daysToExam, examMoment } from '../engine/examDay';
import { examWeekCardDue, examWeekOf } from '../engine/examWeek';
import { dayKey } from '../engine/streak';
import { daysUntil } from '../lib/useActiveCert';
import { selectCert, useProgress } from '../store/progress';
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
jest.mock('../components/brand', () => ({ KaisipLockup: () => null, KaisipMark: () => null, PillarList: () => null }));
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

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
const hosts = (pred: (n: ReactTestInstance) => boolean) => root().findAll((n) => typeof n.props.onPress === 'function' && pred(n));
const byLabel = (label: string | RegExp) => hosts((n) => (typeof label === 'string' ? n.props.accessibilityLabel === label : label.test(String(n.props.accessibilityLabel))));
const press = (label: string | RegExp) => {
  const n = byLabel(label)[0];
  if (!n) throw new Error(`nothing to press: ${label}`);
  act(() => {
    n.props.onPress();
  });
};
const row = (title: string) => hosts((n) => n.props.accessibilityRole === 'button' && String(n.props.accessibilityLabel).startsWith(`${title}, `))[0];
const openRow = (title: string) => {
  const n = row(title);
  if (!n) throw new Error(`no row ${title}`);
  act(() => {
    n.props.onPress();
  });
};
const day = (spoken: string) => hosts((n) => String(n.props.accessibilityLabel).startsWith(spoken))[0];
const radio = (title: string) => hosts((n) => n.props.accessibilityRole === 'radio' && String(n.props.accessibilityLabel).startsWith(title))[0];
const modals = () => root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityViewIsModal === true);
const sheetOpen = () => modals().length > 0;
/** Press inside the open sheet only (onboarding has its own quick-choice chips behind it). */
const pressInSheet = (label: string) => {
  const n = modals()[0].findAll((x) => typeof x.props.onPress === 'function' && x.props.accessibilityLabel === label)[0];
  if (!n) throw new Error(`nothing to press in the sheet: ${label}`);
  act(() => {
    n.props.onPress();
  });
};
/** Press a day by its spoken date (today's label ends ", today"). */
const pressDay = (spoken: string) => {
  const n = day(spoken);
  if (!n) throw new Error(`no day ${spoken}`);
  act(() => {
    n.props.onPress();
  });
};
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** The calendar's month header ("January 2027") as a month count. */
const shownMonth = () => {
  const h = root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'header' && n.children.length === 1 && /^[A-Z][a-z]+ \d{4}$/.test(String(n.children[0])))[0];
  const [m, y] = String(h.children[0]).split(' ');
  return Number(y) * 12 + MONTHS.indexOf(m);
};
/** Step the calendar to a month ("February 2028") with its own buttons. */
const goTo = (label: string) => {
  const [m, y] = label.split(' ');
  const want = Number(y) * 12 + MONTHS.indexOf(m);
  for (let i = 0; i < 40 && shownMonth() !== want; i++) press(shownMonth() < want ? 'Next month' : 'Previous month');
  expect(shownMonth()).toBe(want);
};
const setWindow = (width: number, fontScale = 1) => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, width, fontScale }, screen: { ...w, width, fontScale } });
  });
};

/** Monday 12 October 2026, 10:00 local (the same "now" as the PR's own tests). */
const NOW = new Date(2026, 9, 12, 10, 0);

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  setWindow(393);
  mockParams = {};
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {} });
  act(() => {
    useProgress.getState().resetCert('cisa');
    useProgress.setState({ plantSettings: { promptHidden: true }, days: {} });
  });
  useSession.getState().clear();
  useSettings.setState(useSettings.getInitialState(), true);
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', examDates: { cisa: '2027-01-08' } });
  jest.mocked(router.push).mockClear();
});
afterEach(() => {
  unmount();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ══ A. The calendar's edges ═══════════════════════════════════════════
describe('A. Calendar edges', () => {
  it('today can be picked and saved: the exam-day card and countdown follow it', () => {
    mount(<Settings />);
    openRow('Exam date');
    goTo('October 2026');
    pressDay('Monday 12 October 2026');
    expect(allText()).toContain('Mon 12 Oct 2026 · Today');
    press('Save');
    expect(useSettings.getState().examDates.cisa).toBe('2026-10-12');
    expect(daysUntil(useSettings.getState().examDates.cisa)).toBe(0);
    expect(examMoment(useSettings.getState().examDates.cisa, Date.now())).toBe('day');
    expect(row('Exam date').props.accessibilityLabel).toBe('Exam date, Monday 12 October 2026');
  });

  it('tomorrow reads "Tomorrow" and gives the exam-eve card', () => {
    mount(<Settings />);
    openRow('Exam date');
    goTo('October 2026');
    pressDay('Tuesday 13 October 2026');
    expect(allText()).toContain('Tue 13 Oct 2026 · Tomorrow');
    press('Save');
    expect(examMoment(useSettings.getState().examDates.cisa, Date.now())).toBe('eve');
  });

  it('every day before today is disabled for touch, and there is no month before this one', () => {
    mount(<Settings />);
    openRow('Exam date');
    goTo('October 2026');
    for (let d = 1; d <= 11; d++) {
      const n = day(spokenDate(`2026-10-${String(d).padStart(2, '0')}`));
      expect(n.props.disabled).toBe(true);
      expect(n.props.accessibilityState).toMatchObject({ disabled: true, selected: false });
    }
    // Today and later are open.
    expect(day('Monday 12 October 2026').props.disabled).toBe(false);
    expect(day('Saturday 31 October 2026').props.disabled).toBe(false);
    expect(byLabel('Previous month')[0].props.accessibilityState).toMatchObject({ disabled: true });
    // "Not sure yet" leaves the grid where it is (it clears, it doesn't move).
    press('Not sure yet');
    expect(shownMonth()).toBe(2026 * 12 + 9);
  });

  it('months step across the year boundary both ways, and the header says which month', () => {
    mount(<Settings />);
    openRow('Exam date');
    goTo('October 2026');
    press('Next month');
    press('Next month');
    expect(allText()).toContain('December 2026');
    press('Next month');
    expect(allText()).toContain('January 2027');
    expect(day('Friday 1 January 2027')).toBeDefined();
    press('Previous month');
    expect(allText()).toContain('December 2026');
    expect(day('Thursday 31 December 2026').props.disabled).toBe(false);
  });

  it('the far end: two years ahead can be saved, the day after cannot be picked', () => {
    mount(<Settings />);
    openRow('Exam date');
    goTo('October 2028');
    expect(byLabel('Next month')[0].props.accessibilityState).toMatchObject({ disabled: true });
    expect(day('Friday 13 October 2028').props.disabled).toBe(true);
    pressDay('Thursday 12 October 2028');
    press('Save');
    expect(useSettings.getState().examDates.cisa).toBe('2028-10-12');
    expect(daysUntil('2028-10-12')).toBe(731);
    // Reopening starts on the saved (far) month.
    openRow('Exam date');
    expect(allText()).toContain('October 2028');
    expect(day('Thursday 12 October 2028').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('the leap day: February 2028 shows 29 days and 29 February can be saved', () => {
    expect(daysInMonth({ year: 2028, month: 1 })).toBe(29);
    expect(monthGrid({ year: 2028, month: 1 }).flat().filter(Boolean).pop()).toBe('2028-02-29');
    mount(<Settings />);
    openRow('Exam date');
    goTo('February 2028');
    expect(day('Tuesday 29 February 2028').props.disabled).toBe(false);
    expect(day('Wednesday 1 March 2028')).toBeUndefined();
    pressDay('Tuesday 29 February 2028');
    press('Save');
    expect(useSettings.getState().examDates.cisa).toBe('2028-02-29');
    expect(row('Exam date').props.accessibilityLabel).toBe('Exam date, Tuesday 29 February 2028');
    expect(allText()).toContain('29 Feb 2028');
    expect(daysToExam('2028-02-29', '2028-02-28')).toBe(1);
    // February 2027 has no 29th.
    expect(monthGrid({ year: 2027, month: 1 }).flat()).not.toContain('2027-02-29');
  });

  it('the end of a month: 30 November is the last November day', () => {
    mount(<Settings />);
    openRow('Exam date');
    goTo('November 2026');
    expect(day('Monday 30 November 2026').props.disabled).toBe(false);
    expect(day('Tuesday 31 November 2026')).toBeUndefined();
    expect(day('Tuesday 1 December 2026')).toBeUndefined();
    pressDay('Monday 30 November 2026');
    press('Save');
    expect(useSettings.getState().examDates.cisa).toBe('2026-11-30');
    expect(daysUntil('2026-11-30')).toBe(49);
  });

  it('the bounds follow the clock: just before midnight today is still today', () => {
    expect(calendarBounds(new Date(2026, 9, 12, 23, 59).getTime()).min).toBe('2026-10-12');
    expect(calendarBounds(new Date(2026, 9, 13, 0, 1).getTime()).min).toBe('2026-10-13');
  });
});

// ══ B. Features read a calendar date the same way as a preset one ══════
describe('B. Readiness, plan and exam week read the new date', () => {
  it('a calendar date and the same preset date are saved identically', () => {
    mount(<Settings />);
    openRow('Exam date');
    press('In 2 months');
    press('Save');
    const viaPreset = useSettings.getState().examDates.cisa!;
    expect(viaPreset).toBe(dateInMonths(2, Date.now()));
    // The same day picked on the grid lights the preset chip (one value, two ways in).
    openRow('Exam date');
    press('Not sure yet');
    pressDay(spokenDate(viaPreset));
    expect(byLabel('In 2 months')[0].props.accessibilityState).toMatchObject({ selected: true });
    press('Save');
    expect(useSettings.getState().examDates.cisa).toBe(viaPreset);
  });

  it('saving a new date rebuilds today’s plan; saving the same date does not', () => {
    mount(<Settings />);
    openRow('Exam date');
    press('Save'); // unchanged
    expect(useProgress.getState().days.cisa).toBeUndefined();
    openRow('Exam date');
    pressDay('Friday 15 January 2027');
    press('Save');
    expect(useProgress.getState().days.cisa?.day).toBe('2026-10-12');
  });

  it('exam week: ticks belong to the old date; a calendar move starts a fresh list and the card timing follows', () => {
    useSettings.setState({ examDates: { cisa: '2026-10-17' } }); // 5 days out: exam-week window
    act(() => {
      useProgress.getState().tickExamWeek('cisa', '2026-10-17', 'booking');
    });
    const saved = () => selectCert(useProgress.getState(), 'cisa').moments?.examWeek;
    expect(examWeekOf(saved(), '2026-10-17').done).toEqual(['booking']);
    expect(examWeekCardDue(daysUntil('2026-10-17'), saved(), '2026-10-17')).toBe(true);
    mount(<Settings />);
    openRow('Exam date');
    goTo('December 2026');
    pressDay('Friday 18 December 2026');
    press('Save');
    const next = useSettings.getState().examDates.cisa;
    expect(next).toBe('2026-12-18');
    expect(examWeekOf(saved(), next).done).toEqual([]);
    expect(examWeekCardDue(daysUntil(next), saved(), next)).toBe(false);
  });
});

// ══ C. An older save with an exam date ════════════════════════════════
describe('C. Older saves load and keep their date', () => {
  async function loadOldSettings(examDate: string) {
    useSettings.setState(useSettings.getInitialState(), true);
    await AsyncStorage.clear();
    // A 1.16-shaped settings save (version 1): no field the calendar added.
    await AsyncStorage.setItem(
      'aurivan.settings.v1',
      JSON.stringify({
        state: { onboarded: true, activeCertId: 'cisa', examDates: { cisa: examDate }, theme: 'dark', motion: 'system', shuffleOptions: true, dailyGoal: 20, haptics: true, gameRulesSeen: [], practiceTimer: false, badgesHidden: false },
        version: 1,
      }),
    );
    await useSettings.persist.rehydrate();
  }

  it('a past date loads, shows on the row, and Save without a change keeps it (and builds no plan)', async () => {
    await loadOldSettings('2026-03-01');
    expect(useSettings.getState().examDates.cisa).toBe('2026-03-01');
    expect(useSettings.getState().theme).toBe('dark');
    mount(<Settings />);
    expect(row('Exam date').props.accessibilityLabel).toBe('Exam date, Sunday 1 March 2026');
    expect(allText()).toContain('1 Mar 2026');
    openRow('Exam date');
    // Opens on today's month (the past month can't be shown); no quick choice lit; no "In N days".
    expect(allText()).toContain('October 2026');
    for (const p of ['In 1 month', 'In 2 months', 'In 3 months', 'Not sure yet']) expect(byLabel(p)[0].props.accessibilityState).toMatchObject({ selected: false });
    // Fix round (UX P6, QA nit 2): the line says the date has passed, shown and spoken, with no stray ". ".
    // (This test used to pin the bare "Sun 1 Mar 2026" with nothing after it.)
    expect(allText()).toContain('Sun 1 Mar 2026 · Date passed');
    expect(allText()).not.toMatch(/In -?\d+ days/);
    const line = root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityLabel === 'Chosen: Sunday 1 March 2026. Date passed');
    expect(line.length).toBeGreaterThan(0);
    press('Save');
    expect(useSettings.getState().examDates.cisa).toBe('2026-03-01');
    expect(useProgress.getState().days.cisa).toBeUndefined();
    expect(daysUntil('2026-03-01')).toBeLessThan(0);
  });

  it('a past date earlier this month is shown selected but cannot be re-picked', async () => {
    await loadOldSettings('2026-10-05');
    mount(<Settings />);
    openRow('Exam date');
    expect(allText()).toContain('October 2026');
    const d = day('Monday 5 October 2026');
    expect(d.props.accessibilityState).toMatchObject({ selected: true, disabled: true });
  });

  it('a date beyond two years (from a backup) loads and survives an untouched Save', async () => {
    await loadOldSettings('2031-05-20');
    mount(<Settings />);
    expect(row('Exam date').props.accessibilityLabel).toBe('Exam date, Tuesday 20 May 2031');
    openRow('Exam date');
    expect(allText()).toContain('October 2026');
    press('Save');
    expect(useSettings.getState().examDates.cisa).toBe('2031-05-20');
  });
});

// ══ D. Choice sheets ══════════════════════════════════════════════════
describe('D. Options through sheets', () => {
  it('Theme: Light → System → Dark, each saves and closes, the row follows', () => {
    mount(<Settings />);
    expect(row('Theme').props.accessibilityLabel).toBe('Theme, Light');
    openRow('Theme');
    expect(radio('Light').props.accessibilityState).toMatchObject({ checked: true });
    act(() => radio('System').props.onPress());
    expect(useSettings.getState().theme).toBe('system');
    expect(sheetOpen()).toBe(false);
    expect(row('Theme').props.accessibilityLabel).toBe('Theme, System');
    openRow('Theme');
    act(() => radio('Dark').props.onPress());
    expect(useSettings.getState().theme).toBe('dark');
    expect(row('Theme').props.accessibilityLabel).toBe('Theme, Dark');
  });

  it('Daily time, Starting point and Default mode save through their sheets', () => {
    mount(<Settings />);
    openRow('Daily time');
    act(() => radio('45 minutes').props.onPress());
    expect(useSettings.getState().dailyMinutes).toBe(45);
    expect(row('Daily time').props.accessibilityLabel).toBe('Daily time, 45 minutes a day');
    openRow('Starting point');
    // Nothing chosen yet: no radio checked.
    expect(hosts((n) => n.props.accessibilityRole === 'radio' && n.props.accessibilityState?.checked === true)).toHaveLength(0);
    act(() => radio('Experienced').props.onPress());
    expect(useSettings.getState().familiarity).toBe('experienced');
    expect(row('Starting point').props.accessibilityLabel).toMatch(/^Starting point, Experienced/);
    openRow('Default mode');
    act(() => radio('Guided').props.onPress());
    expect(useSettings.getState().studyMode).toBe('guided');
    openRow('Default mode');
    act(() => radio('Let the app choose').props.onPress());
    expect(useSettings.getState().studyMode).toBeUndefined();
    expect(row('Default mode').props.accessibilityLabel).toBe('Default mode, Let the app choose');
  });

  it('Motion: Reduced then Match my phone', () => {
    mount(<Settings />);
    openRow('Motion');
    act(() => radio('Reduced').props.onPress());
    expect(useSettings.getState().motion).toBe('reduced');
    expect(row('Motion').props.accessibilityLabel).toBe('Motion, Reduced');
    openRow('Motion');
    act(() => radio('Match my phone').props.onPress());
    expect(useSettings.getState().motion).toBe('system');
  });

  it('only one sheet is open at a time; a Cancel on the calendar leaves no draft behind', () => {
    mount(<Settings />);
    openRow('Exam date');
    pressDay('Friday 29 January 2027');
    press('Cancel, Exam date');
    expect(sheetOpen()).toBe(false);
    openRow('Theme');
    expect(modals()).toHaveLength(1);
    press('Close, Theme');
    expect(useSettings.getState().examDates.cisa).toBe('2027-01-08');
  });
});

// ══ E. Reset progress ═════════════════════════════════════════════════
describe('E. Reset progress', () => {
  it('asks first; Cancel keeps everything; Reset clears study but keeps the exam date and theme', () => {
    act(() => {
      useProgress.getState().tickExamWeek('cisa', '2027-01-08', 'guide');
    });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mount(<Settings />);
    press('Reset CISA progress');
    expect(alert).toHaveBeenCalledTimes(1);
    const [title, , buttons] = alert.mock.calls[0];
    expect(title).toBe('Reset CISA progress?');
    const btns = buttons as { text: string; style?: string; onPress?: () => void }[];
    expect(btns.map((b) => b.text)).toEqual(['Cancel', 'Reset']);
    expect(btns[1].style).toBe('destructive');
    // Nothing happened yet.
    expect(useSettings.getState().examDates.cisa).toBe('2027-01-08');
    act(() => btns[1].onPress!());
    expect(useSettings.getState().examDates.cisa).toBe('2027-01-08');
    expect(useSettings.getState().theme).toBe('light');
    expect(row('Exam date').props.accessibilityLabel).toBe('Exam date, Friday 8 January 2027');
  });
});

// ══ F. Onboarding ═════════════════════════════════════════════════════
describe('F. Onboarding’s date step', () => {
  const toDateStep = () => {
    useSettings.setState({ onboarded: false, examDates: {} });
    mount(<Onboarding />);
    press('Get started');
    press('Skip this question'); // mobile 1.24: no exam step, so this is "Where are you starting from?"
    expect(allText()).toContain('When is your exam?');
  };
  const finish = () => {
    press('Start my first questions');
  };

  it('a quick choice saves its date', () => {
    toDateStep();
    press('In 2 months');
    finish();
    expect(useSettings.getState().examDates.cisa).toBe(dateInMonths(2, NOW.getTime()));
    expect(useSettings.getState().onboarded).toBe(true);
  });

  it('a quick choice, then the calendar opens on it; Cancel keeps the quick choice', () => {
    toDateStep();
    press('In 2 months');
    press('Pick the exact date');
    expect(allText()).toContain('December 2026');
    expect(day('Saturday 12 December 2026').props.accessibilityState).toMatchObject({ selected: true });
    pressDay('Saturday 19 December 2026');
    press('Cancel, Exam date');
    expect(sheetOpen()).toBe(false);
    expect(byLabel('In 2 months')[0].props.accessibilityState).toMatchObject({ selected: true });
    finish();
    expect(useSettings.getState().examDates.cisa).toBe('2026-12-12');
  });

  it('a calendar date, then "Not sure yet" in the calendar clears it', () => {
    toDateStep();
    press('Pick the exact date');
    pressDay('Tuesday 20 October 2026');
    pressInSheet('Save');
    expect(allText()).toContain('Tue 20 Oct 2026 · In 8 days');
    press('Pick the exact date');
    expect(day('Tuesday 20 October 2026').props.accessibilityState).toMatchObject({ selected: true });
    pressInSheet('Not sure yet');
    pressInSheet('Save');
    expect(sheetOpen()).toBe(false);
    expect(allText()).not.toContain('Tue 20 Oct 2026');
    expect(byLabel('Not sure yet')[0].props.accessibilityState).toMatchObject({ selected: true });
    finish();
    expect(useSettings.getState().examDates.cisa).toBeUndefined();
  });

  it('today can be the exam date from onboarding', () => {
    toDateStep();
    press('Pick the exact date');
    pressDay('Monday 12 October 2026');
    pressInSheet('Save');
    expect(allText()).toContain('Mon 12 Oct 2026 · Today');
    finish();
    expect(useSettings.getState().examDates.cisa).toBe(dayKey(NOW.getTime()));
  });
});

// ══ G. Deep links ═════════════════════════════════════════════════════
describe('G. Deep links into Settings', () => {
  // Fix round (code review 4): on iOS (Jest's platform) the link's calendar opens once the push
  // transition ends. This stand-in router has no transition events, so the short fallback opens it.
  const afterPush = () =>
    act(() => {
      jest.advanceTimersByTime(LINK_OPEN_FALLBACK_MS);
    });

  it('?open=exam-date: pick and Save closes the calendar, saves, and goes back (UX O5)', () => {
    jest.mocked(router.back).mockClear();
    mockParams = { open: 'exam-date' };
    mount(<Settings />);
    expect(sheetOpen()).toBe(false);
    afterPush();
    expect(sheetOpen()).toBe(true);
    pressDay('Friday 22 January 2027');
    press('Save');
    expect(sheetOpen()).toBe(false);
    expect(useSettings.getState().examDates.cisa).toBe('2027-01-22');
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('?open=exam-date with no date yet opens on this month with "Not sure yet" chosen', () => {
    useSettings.setState({ examDates: {} });
    mockParams = { open: 'exam-date' };
    mount(<Settings />);
    afterPush();
    expect(shownMonth()).toBe(2026 * 12 + 9);
    expect(byLabel('Not sure yet')[0].props.accessibilityState).toMatchObject({ selected: true });
  });

  it('an unknown ?open value opens nothing', () => {
    mockParams = { open: 'theme' };
    mount(<Settings />);
    afterPush();
    expect(sheetOpen()).toBe(false);
  });

  it('?section=plant scrolls to Badges and your plant once', () => {
    mockParams = { section: 'plant' };
    mount(<Settings />);
    const sv = root().findAll((n) => n.instance && typeof n.instance.scrollTo === 'function')[0];
    const scrollTo = jest.mocked(sv.instance.scrollTo as jest.Mock);
      const holder = root().findAll((n) => typeof n.type === 'string' && typeof n.props.onLayout === 'function' && n.findAll((x) => x.children.includes('Badges and your plant')).length > 0);
    const target = holder[0];
    act(() => target.props.onLayout({ nativeEvent: { layout: { x: 0, y: 1200, width: 393, height: 300 } } }));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo.mock.calls[0][0].y).toBeGreaterThan(1100);
    act(() => target.props.onLayout({ nativeEvent: { layout: { x: 0, y: 1300, width: 393, height: 300 } } }));
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('exam week with no date: "Set exam date" opens the calendar deep link', () => {
    useSettings.setState({ examDates: {} });
    mount(<ExamWeek />);
    press('Set exam date');
    expect(router.push).toHaveBeenCalledWith({ pathname: '/settings', params: { open: 'exam-date' } });
  });
});
