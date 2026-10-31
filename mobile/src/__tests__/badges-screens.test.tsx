/**
 * Mobile 1.10 badge collection, on the real screens and stores:
 * - the case: a grid of medallion buttons (3 columns, 2 at ×1.3 text, a list
 *   at ×1.6), each spoken in full; filters; the Sort kept on this phone;
 * - the detail sheet: rule, how to earn it or what it means, effort, and
 *   "Study for this" spoken with the badge's name, which opens what earns it;
 * - after the exam: no "Next for your exam", no progress (a keepsake album);
 * - the "new" dot on You (row and tab) until the case is opened;
 * - Settings → Show badges: off hides the moments, the row and the dot while
 *   badges are still earned; back on says how many arrived, in one line;
 * - the unlock moment: after the review actions on Results; at most three
 *   moments in any 7 days, then a quiet line; a higher tier plays short.
 */
import { groveLight } from '../theme/grove';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions, Modal, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Badges from '../app/milestones';
import You from '../app/(tabs)/you';
import Results from '../app/results';
import Settings from '../app/settings';
import { BadgeCell, BadgeListRow, NextPanel } from '../components/badges';
import { YouIcon } from '../app/(tabs)/_layout';
import * as a11y from '../lib/a11y';
import { light, space } from '../theme/tokens';
import { Medallion } from '../components/medallion';
import { MilestoneMomentView, resetBadgeMomentsForTest } from '../components/milestones';
import { resetCelebrationsForTest } from '../components/motion';
import { getDomainQuestions } from '../content/loader';
import { finishSession } from '../lib/finishSession';
import { hasNewBadge, initCaseSeen, showBadgesAgain, shownAgainLine } from '../lib/badges';
import { ensureBackfill, type MilestoneMoment } from '../lib/milestones';
import { startFromIds } from '../lib/sessions';
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
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null }));
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  // The case counts as seen while focused: a mounted screen is focused here.
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(cb, [cb]),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
const mockSuccess = jest.fn();
jest.mock('../lib/haptics', () => ({ haptic: { success: () => mockSuccess(), selection: () => {}, error: () => {}, light: () => {} } }));

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const labels = () => root().findAll((n) => typeof n.props.accessibilityLabel === 'string').map((n) => n.props.accessibilityLabel as string);
const press = (label: RegExp) => {
  const n = root().findAll((x) => typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string' && label.test(x.props.accessibilityLabel))[0];
  if (!n) throw new Error(`no button ${label}`);
  act(() => n.props.onPress());
};
const mount = (el: React.ReactElement) =>
  act(() => {
    r = create(el);
  });
const setScale = (fontScale: number) => {
  const w = Dimensions.get('window');
  act(() => Dimensions.set({ window: { ...w, fontScale }, screen: { ...w, fontScale } }));
};
const T0 = new Date(2026, 9, 12, 10, 0, 0).getTime();
const DAY = 86_400_000;
const d4 = getDomainQuestions('cisa', '4').map((q) => q.id);
const cp = () => selectCert(useProgress.getState(), 'cisa');
const answer = (id: string) => useProgress.getState().recordAnswer('cisa', id, true);
const earn = (key: string, at = Date.now()) =>
  act(() => {
    useProgress.getState().updateMilestones('cisa', (m) => ({ milestones: { ...(m ?? { earned: {} }), earned: { ...(m?.earned ?? {}), [key]: at } } }));
  });

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  mockSuccess.mockClear();
  (router.push as jest.Mock).mockClear();
  setMockReducedMotion(true);
  resetCelebrationsForTest();
  resetBadgeMomentsForTest();
  useProgress.setState({ byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {} });
  useSession.getState().clear();
  useSettings.setState({ onboarded: true, activeCertId: 'cisa', examDates: {}, practiceTimer: false, badgesHidden: false });
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {}, badgeSort: undefined });
  setScale(1);
  mockParams = {};
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
  setScale(2);
  jest.useRealTimers();
});

describe('the case', () => {
  it('a grid of medallion buttons, three across; each spoken in full, the art hidden', () => {
    d4.slice(0, 20).forEach(answer);
    ensureBackfill('cisa', T0);
    mount(<Badges />);
    const cells = root().findAllByType(BadgeCell);
    // The six counted sets hold 23 core marks in CISA (3 + 6 + 5 + 3 + 3 + 3) and 7 Stretch tiers
    // (5 + 1 + 1), then the 7 skills. Fresh Start (Moments) is not on the case until it happens:
    // a week away is never shown as a goal.
    expect(cells.length).toBe(23 + 7 + 7);
    expect(cells.filter((c) => c.props.mark.stretch).length).toBe(7);
    expect(cells.some((c) => c.props.mark.set === 'moments')).toBe(false);
    const widths = new Set(cells.map((c) => c.props.width));
    expect(widths.size).toBe(1);
    const w = [...widths][0] as number;
    expect(w * 3).toBeLessThanOrEqual(Dimensions.get('window').width - 40);
    for (const c of cells.slice(0, 3)) {
      const button = c.findAll((n) => n.props.accessibilityRole === 'button')[0];
      expect(button.props.accessibilityHint).toBe('Opens its details');
    }
    // Medallions are decorative to screen readers (the button carries the words).
    for (const m of root().findAllByType(Medallion).slice(0, 3)) {
      const box = m.findAll((n) => n.props.importantForAccessibility === 'no-hide-descendants')[0];
      expect(box.props.accessible).toBe(false);
    }
    // Back-filled (saved quietly when badges arrived): "by" that date, never as if earned that day (UX P6).
    expect(labels()).toContain('First Foothold. Pressed by 12 October. Answer your first 20 questions. Groundwork.');
    expect(labels().some((l) => l.startsWith('Firm Footing · IS Operations, Clay. Pressed by 12 October.') && l.endsWith('26% of the exam. The Five Domains.'))).toBe(true);
    expect(allText()).toContain('Pressed by 12 Oct');
    expect(labels().some((l) => l.startsWith('Mindset Shift. Not yet.') && l.includes('Opens after 100 first tries'))).toBe(true);
  });

  it('two columns at ×1.3 text, a list of rows at ×1.6', () => {
    setScale(1.3);
    mount(<Badges />);
    const two = root().findAllByType(BadgeCell)[0].props.width as number;
    expect(two * 2).toBeLessThanOrEqual(Dimensions.get('window').width - 40);
    expect(two * 3).toBeGreaterThan(Dimensions.get('window').width - 40);
    act(() => r!.unmount());
    setScale(1.6);
    mount(<Badges />);
    expect(root().findAllByType(BadgeCell)).toHaveLength(0);
    expect(root().findAllByType(BadgeListRow).length).toBeGreaterThan(20);
  });

  it('filters within shelves; an empty shelf says so', () => {
    d4.slice(0, 20).forEach(answer);
    ensureBackfill('cisa', T0);
    mount(<Badges />);
    press(/^Earned badges$/);
    const shown = root().findAllByType(BadgeCell).map((c) => c.props.mark.key).sort();
    expect(shown).toEqual(Object.keys(cp().milestones!.earned).sort());
    expect(allText()).toContain('Nothing pressed on this sheet yet.');
  });

  it('Sort: by set, recently earned, closest, effort; the choice is kept on this phone', () => {
    earn('rooted:10', T0 - 3 * DAY);
    earn('first-foothold', T0 - DAY);
    mount(<Badges />);
    press(/^Sort badges, By set$/);
    expect(labels()).toEqual(expect.arrayContaining([expect.stringMatching(/^Recently earned/)]));
    const radio = root().findAll((n) => n.props.accessibilityRole === 'radio' && /^Recently earned/.test(n.props.accessibilityLabel ?? ''))[0];
    act(() => radio.props.onPress());
    expect(useSeen.getState().badgeSort).toBe('recent');
    const order = root().findAllByType(BadgeCell).map((c) => c.props.mark.key);
    expect(order.slice(0, 2)).toEqual(['first-foothold', 'rooted:10']);
    // Flat sorts say each badge's set under it.
    expect(root().findAllByType(BadgeCell)[0].props.showSet).toBe(true);
    act(() => r!.unmount());
    mount(<Badges />);
    expect(labels()).toContain('Sort badges, Recently earned');
  });

  it('after the exam: no "Next for your exam" and no progress lines', () => {
    useSettings.setState({ examDates: { cisa: '2026-10-01' } });
    d4.slice(0, 20).forEach(answer);
    mount(<Badges />);
    expect(allText()).not.toContain('Next for your exam');
    expect(allText()).not.toMatch(/\d+ of \d+ (study days|remembered|left review)/);
  });
});

describe('the detail sheet', () => {
  it('not yet: the rule, progress, how to earn it, effort, and "Study for this" that starts Smart on that domain', () => {
    d4.slice(0, 12).forEach(answer);
    mount(<Badges />);
    press(/^Firm Footing · IS Operations, Clay\. Not yet/);
    const sheet = root().findByType(Modal);
    const text = () => {
      const out: string[] = [];
      const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
      walk(sheet);
      return out.join(' ');
    };
    expect(text()).toContain('The rule');
    expect(text()).toContain('Reach 70% mastery in a domain, with 20 or more of its questions answered. One leaf per domain.');
    expect(text()).toContain('12 of 20 answered');
    expect(text()).toContain('How to earn it');
    expect(text()).toContain('IS Operations is 26% of the exam. Practise it in Smart until 70% holds.');
    expect(text()).toContain('Needs 20 or more of its questions answered, at 70% mastery.');
    // The title is the sheet's header, spoken with its state.
    expect(sheet.findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'header' && /^Firm Footing · IS Operations\. Not yet\./.test(n.props.accessibilityLabel ?? '')).length).toBe(1);
    // Its ladder: 70% (Clay) and the 80% Stretch tier (Lichen), in words.
    expect(labels().some((l) => l.startsWith('70%, Clay: ') && l.includes('80%, Lichen, Stretch: opens when every domain reaches 65%'))).toBe(true);
    const study = sheet.findAll((n) => n.props.accessibilityLabel === 'Study for Firm Footing · IS Operations' && typeof n.props.onPress === 'function')[0];
    act(() => study.props.onPress());
    // The sheet slides away first; only then does the session open (a push under a closing sheet can stall on iOS).
    expect(root().findByType(Modal).props.visible).toBe(false);
    expect(router.push).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(700));
    expect(useSession.getState().active?.title).toBe('Smart · IS Operations');
    expect(router.push).toHaveBeenCalledWith('/session');
    expect(root().findAllByType(Modal)).toHaveLength(0); // gone
  });

  it('earned: what it means (not how to earn it), its date, and no Study button', () => {
    earn('first-foothold', T0 - DAY);
    mount(<Badges />);
    press(/^First Foothold\. Pressed/);
    const sheet = root().findByType(Modal);
    const words = sheet.findAll((n) => typeof n.props.children === 'string').map((n) => n.props.children as string);
    expect(words).toContain('Earned 11 Oct');
    expect(words).toContain('You’ve mapped where you stand. Your plan now starts from it.');
    expect(words).not.toContain('How to earn it');
    expect(sheet.findAll((n) => /^Study for/.test(n.props.accessibilityLabel ?? ''))).toHaveLength(0);
    // Mobile 1.51 (UX review P1): the date is said in full, never "Oct".
    expect(sheet.findAll((n) => typeof n.type === 'string' && /^Earned 11 October\. You’ve mapped where you stand/.test(n.props.accessibilityLabel ?? ''))).toHaveLength(1);
  });

  it('a mock badge opens the full mock’s start sheet; Rooted shows its tiers in words', () => {
    mount(<Badges />);
    press(/^Dress Rehearsal · 1 mock, Clay\. Not yet/);
    expect(allText()).toContain('Best once every domain reaches 65%. It counts whenever you do it.');
    press(/^Study for Dress Rehearsal · 1 mock$/);
    act(() => jest.advanceTimersByTime(700));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/mock-start', params: { questions: '150' } });
    press(/^Rooted · 30 days, Lichen\. Not yet/);
    expect(labels().some((l) => l.startsWith('10 days, Clay: ') && l.includes('30 days, Lichen: ') && l.includes('60 days, Gold leaf: '))).toBe(true);
  });
});

describe('the "new" dot', () => {
  it('shows on You for a badge earned since the case was opened, spoken, and clears when the case is opened', () => {
    initCaseSeen('cisa', T0 - DAY);
    earn('first-foothold', T0);
    expect(hasNewBadge('cisa')).toBe(true);
    mount(<You />);
    expect(labels().some((l) => l.startsWith('Herbarium: badges and field notes, new badge, 1 earned.'))).toBe(true);
    expect(root().findAll((n) => n.props.testID === 'new-badge-dot').length).toBeGreaterThan(0);
    act(() => r!.unmount());
    jest.setSystemTime(T0 + 1000);
    mount(<Badges />);
    expect(hasNewBadge('cisa')).toBe(false);
  });

  it('badges already held when this version first opens never show as new', () => {
    earn('first-foothold', T0 - DAY);
    initCaseSeen('cisa', T0);
    expect(hasNewBadge('cisa')).toBe(false);
  });
});

describe('Settings → Show badges', () => {
  it('off: no moment on Results, no Badges row, no dot; badges are still earned; on again: one line', () => {
    ensureBackfill('cisa', T0 - DAY); // the launch back-fill (nothing yet)
    initCaseSeen('cisa', T0 - DAY);
    mount(<Settings />);
    const sw = () => root().findAll((n) => typeof n.props.onValueChange === 'function' && n.props.accessibilityLabel === 'Show badges')[0];
    expect(sw()).toBeDefined();
    act(() => sw().props.onValueChange(false));
    expect(useSettings.getState().badgesHidden).toBe(true);
    act(() => r!.unmount());
    // Earned quietly: First Foothold from a 20-question session, with no moment.
    startFromIds('cisa', d4.slice(0, 20), 'Twenty');
    d4.slice(0, 20).forEach(answer);
    finishSession();
    expect(cp().milestones!.earned['first-foothold']).toBeDefined();
    expect(cp().milestones!.queue).toEqual(['first-foothold', 'firm-footing:4']); // waiting, never shown
    expect(useSession.getState().active?.milestone).toBeUndefined();
    expect(hasNewBadge('cisa')).toBe(false);
    mount(<You />);
    expect(labels().some((l) => l.startsWith('Badges'))).toBe(false);
    act(() => r!.unmount());
    // Back on: the waiting moments are cleared (no burst) and counted in one line.
    const n = showBadgesAgain();
    expect(n).toBe(2); // First Foothold and Firm Footing · IS Operations
    expect(cp().milestones!.queue).toEqual([]);
    expect(shownAgainLine(n)).toBe('Badges are on again. 2 badges arrived while they were hidden: see You → Herbarium.');
    expect(useSettings.getState().badgesHidden).toBe(false);
  });
});

describe('the unlock moment', () => {
  const moment = (over: Partial<MilestoneMoment> = {}): MilestoneMoment => ({
    key: 'long-memory',
    label: 'Long Memory',
    rule: 'Get 25 questions right…',
    kind: 'milestone',
    set: 'evergreen',
    setName: 'Evergreen',
    unlock: 'You recalled 25 questions a week or more after you last saw them. That’s what holds on exam day.',
    ...over,
  });

  it('on Results it comes after the score and the review actions, before the answer list', () => {
    ensureBackfill('cisa', T0);
    startFromIds('cisa', d4.slice(0, 20), 'Twenty');
    d4.slice(0, 20).forEach(answer);
    finishSession();
    mount(<Results />);
    const text = allText();
    expect(text.indexOf('Done')).toBeLessThan(text.indexOf('A new badge · Groundwork'));
    expect(text.indexOf('A new badge · Groundwork')).toBeLessThan(text.indexOf('Review answers'));
    expect(text).toContain('See it in your badges ›');
    expect(text).toMatch(/Next: Firm Footing · /);
  });

  it('at most three moments in any 7 days: the fourth is a quiet line, with no tap', () => {
    setMockReducedMotion(false);
    for (let i = 0; i < 3; i++) {
      resetCelebrationsForTest(); // a new session each time: each plays in full (only full moments count)
      mount(<MilestoneMomentView moment={moment({ key: `k${i}` })} once={`s${i}`} />);
      expect(allText()).toContain('A new badge · Evergreen');
      act(() => r!.unmount());
    }
    mockSuccess.mockClear();
    mount(<MilestoneMomentView moment={moment({ key: 'took-four', label: 'Graduate' })} once="s4" />);
    expect(allText()).toContain('New in your badges: Graduate');
    expect(allText()).not.toContain('A new badge');
    expect(mockSuccess).not.toHaveBeenCalled();
    act(() => r!.unmount());
    // A week later, moments play again.
    jest.setSystemTime(T0 + 7 * DAY + 1);
    mount(<MilestoneMomentView moment={moment({ key: 'k5' })} once="s5" />);
    expect(allText()).toContain('A new badge · Evergreen');
  });

  it('a higher tier always plays short; it names its tier in words', () => {
    setMockReducedMotion(false);
    mount(<MilestoneMomentView moment={moment({ key: 'rooted:30', label: 'Rooted · 30 days', set: 'rooted', setName: 'Rooted', tier: 2, tierUp: true })} once="t1" />);
    const cel = root().findAll((n) => n.props.celebration !== undefined)[0].props.celebration as { mode: string };
    expect(cel.mode).toBe('short');
    expect(allText()).toContain('Rooted · 30 days · Lichen');
  });

  it('says "That completes Evergreen." only when it does', () => {
    mount(<MilestoneMomentView moment={moment({ completes: true })} once="c1" />);
    expect(allText()).toContain('That completes Evergreen.');
    expect(labels().some((l) => l.endsWith('That completes Evergreen.'))).toBe(true);
  });
});

describe('review fixes (PR #40)', () => {
  const sheetText = () => {
    const out: string[] = [];
    const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
    walk(root().findByType(Modal));
    return out.join(' ');
  };

  it('Still to collect (1.51; was the forest "Next for your exam"): a header, the first row spoken "For your exam: …" with its gap in full', () => {
    d4.slice(0, 12).forEach(answer);
    mount(<Badges />);
    const panel = root().findByType(NextPanel);
    expect(panel.findAll((n) => n.props.accessibilityRole === 'header' && n.props.children === 'Still to collect · for your exam').length).toBeGreaterThan(0);
    expect(labels().some((l) => l.startsWith(`For your exam: ${panel.props.best.name}.`))).toBe(true);
    expect(labels().some((l) => /now, aiming for 70%/.test(l))).toBe(true);
    expect(labels().some((l) => /→| of 70%/.test(l))).toBe(false);
  });

  it('Sort: the button says expanded or collapsed, and focus comes back to it after a choice', () => {
    const focus = jest.spyOn(a11y, 'moveFocus');
    mount(<Badges />);
    const button = () => root().findAll((n) => n.props.accessibilityLabel === 'Sort badges, By set' && n.props.accessibilityRole === 'button')[0];
    expect(button().props.accessibilityState.expanded).toBe(false);
    press(/^Sort badges, By set$/);
    expect(button().props.accessibilityState.expanded).toBe(true);
    const radio = root().findAll((n) => n.props.accessibilityRole === 'radio' && /^Effort/.test(n.props.accessibilityLabel ?? ''))[0];
    focus.mockClear();
    act(() => radio.props.onPress());
    expect(focus).toHaveBeenCalledTimes(1);
    expect(focus.mock.calls[0][0]).toEqual({ current: expect.anything() });
    focus.mockRestore();
  });

  it('filter chips are spoken as what they show', () => {
    mount(<Badges />);
    expect(labels()).toEqual(expect.arrayContaining(['All badges', 'Earned badges', 'Badges not yet earned']));
  });

  it('flat sorts keep Firm Footing’s name; Closest and Effort put the exam’s badges before Field notes', () => {
    d4.slice(0, 20).forEach(answer);
    ensureBackfill('cisa', T0);
    useSeen.setState({ badgeSort: 'effort' });
    mount(<Badges />);
    expect(allText()).toContain('Firm Footing · IS Operations');
    const sets = root().findAllByType(BadgeCell).map((c) => c.props.mark.set as string);
    const firstGame = sets.indexOf('fieldNotes');
    expect(firstGame).toBeGreaterThan(0);
    expect(sets.slice(firstGame).every((x) => x === 'fieldNotes')).toBe(true);
  });

  it('opened from Field notes: the case opens at that shelf, by set for this visit, measured on the shelf itself', () => {
    const spy = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
    useSeen.setState({ badgeSort: 'closest' });
    mockParams = { shelf: 'fieldNotes' };
    mount(<Badges />);
    expect(labels()).toContain('Sort badges, By set');
    const shelf = root().findAll((n) => n.props.testID === 'shelf-fieldNotes' && typeof n.props.onLayout === 'function')[0];
    act(() => shelf.props.onLayout({ nativeEvent: { layout: { x: 0, y: 2200, width: 353, height: 400 } } }));
    expect(spy).toHaveBeenCalledWith({ y: 2200 - space.lg, animated: false });
    // The saved choice is untouched.
    expect(useSeen.getState().badgeSort).toBe('closest');
    spy.mockRestore();
  });

  it('opened from a badge moment: that badge’s sheet is up', () => {
    earn('first-foothold', T0 - DAY);
    mockParams = { open: 'first-foothold' };
    mount(<Badges />);
    expect(sheetText()).toContain('You’ve mapped where you stand.');
  });

  it('after the exam: no How to earn it, no Study for this, no progress trace, and no Closest sort', () => {
    useSettings.setState({ examDates: { cisa: '2026-10-01' } });
    d4.slice(0, 12).forEach(answer);
    mount(<Badges />);
    for (const m of root().findAll((n) => typeof n.type !== 'string' && typeof n.props.badge === 'string' && typeof n.props.state === 'string')) expect(m.props.progress ?? 0).toBe(0);
    press(/^Sort badges/);
    expect(labels().some((l) => /^Closest/.test(l))).toBe(false);
    press(/^Firm Footing · IS Operations, Clay\. Not yet/);
    expect(sheetText()).not.toContain('How to earn it');
    expect(root().findByType(Modal).findAll((n) => /^Study for/.test(n.props.accessibilityLabel ?? ''))).toHaveLength(0);
  });

  it('a back-filled badge says when badges arrived, and never "This completed" (the order is unknown)', () => {
    d4.slice(0, 20).forEach(answer);
    ensureBackfill('cisa', T0);
    mount(<Badges />);
    press(/^First Foothold\. Pressed by/);
    expect(sheetText()).toContain('Already earned when this badge arrived (by 12 Oct)');
    expect(sheetText()).not.toContain('This completed');
  });

  it('a new badge presses in once: switching the sort does not replay it', () => {
    initCaseSeen('cisa', T0 - DAY);
    earn('first-foothold', T0 - 1000);
    mount(<Badges />);
    const cell = () => root().findAllByType(BadgeCell).find((c) => c.props.mark.key === 'first-foothold')!;
    expect(cell().props.press).toBeDefined();
    act(() => jest.advanceTimersByTime(1));
    press(/^Sort badges/);
    const radio = root().findAll((n) => n.props.accessibilityRole === 'radio' && /^Recently earned/.test(n.props.accessibilityLabel ?? ''))[0];
    act(() => radio.props.onPress());
    expect(cell().props.press).toBeUndefined();
  });

  it('the You tab’s new mark is a ring (the bar inside an accent outline), never a filled dot', () => {
    mount(<YouIcon color="#000" size={24} dot />);
    const ring = root().findAll((n) => n.props.testID === 'you-new-dot')[0];
    // Grove: the floating bar's own colour inside (the pill's when You is the current tab).
    expect(ring.props.style).toEqual(expect.objectContaining({ backgroundColor: groveLight.navFloat, borderColor: light.accent, borderWidth: 2 }));
    act(() => r!.unmount());
    mount(<YouIcon color="#000" size={24} dot focused />);
    expect(root().findAll((n) => n.props.testID === 'you-new-dot')[0].props.style).toEqual(expect.objectContaining({ backgroundColor: light.forestTrack }));
    act(() => r!.unmount());
    mount(<YouIcon color="#000" size={24} dot={false} />);
    expect(root().findAll((n) => n.props.testID === 'you-new-dot')).toHaveLength(0);
  });

  it('You counts only badges the case shows (a kept newer tier never adds one)', () => {
    earn('first-foothold', T0 - DAY);
    earn('long-memory:999', T0 - DAY);
    mount(<You />);
    expect(labels().some((l) => l.startsWith('Herbarium: badges and field notes, 1 earned.'))).toBe(true);
  });

  it('Show badges back on counts the active exam’s waiting moments only', () => {
    act(() => {
      useProgress.getState().updateMilestones('cisa', () => ({ milestones: { earned: { 'first-foothold': T0 }, queue: ['first-foothold'] } }));
      useProgress.getState().updateMilestones('cism', () => ({ milestones: { earned: { 'first-foothold': T0 }, queue: ['first-foothold'] } }));
    });
    expect(showBadgesAgain()).toBe(1);
    expect(selectCert(useProgress.getState(), 'cism').milestones!.queue).toEqual([]);
  });

  it('a moment already on screen before it plays settles from .9, not .4', () => {
    setMockReducedMotion(false);
    const m: MilestoneMoment = { key: 'long-memory', label: 'Long Memory', rule: 'r', kind: 'milestone', set: 'evergreen', setName: 'Evergreen', unlock: 'u' };
    mount(<MilestoneMomentView moment={m} once="p1" inView={false} />);
    act(() => r!.update(<MilestoneMomentView moment={m} once="p1" inView />));
    const pop = root().findAll((n) => n.props.from !== undefined && n.props.trigger !== undefined)[0];
    expect(pop.props.from).toBe(0.9);
    act(() => r!.unmount());
    resetCelebrationsForTest(); // a new session: it plays in full again
    mount(<MilestoneMomentView moment={m} once="p2" />);
    expect(root().findAll((n) => n.props.from !== undefined && n.props.trigger !== undefined)[0].props.from).toBe(0.4);
  });
});
