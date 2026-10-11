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
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions, Modal } from 'react-native';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Badges from '../app/milestones';
import You from '../app/(tabs)/you';
import Results from '../app/results';
import Settings from '../app/settings';
import { BadgeCell, BadgeListRow } from '../components/badges';
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
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: jest.fn(),
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
    // The six counted sets hold 20 marks in CISA (3 + 6 + 3 + 3 + 2 + 3), then Fresh Start and the 7 skills.
    expect(cells.length).toBe(20 + 1 + 7);
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
    expect(labels()).toContain('First Foothold. Earned 12 Oct. Finish the 20-question diagnostic. Groundwork.');
    expect(labels().some((l) => l.startsWith('Firm Footing · IS Operations. Earned 12 Oct.') && l.endsWith('26% of the exam. The Five Domains.'))).toBe(true);
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
    press(/^Show earned badges$/);
    const shown = root().findAllByType(BadgeCell).map((c) => c.props.mark.key).sort();
    expect(shown).toEqual(Object.keys(cp().milestones!.earned).sort());
    expect(allText()).toContain('Nothing earned here yet.');
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
    expect(allText()).not.toMatch(/\d+ of \d+ (study days|remembered|graduated)/);
  });
});

describe('the detail sheet', () => {
  it('not yet: the rule, progress, how to earn it, effort, and "Study for this" that starts Smart on that domain', () => {
    d4.slice(0, 12).forEach(answer);
    mount(<Badges />);
    press(/^Firm Footing · IS Operations\. Not yet/);
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
    const study = sheet.findAll((n) => n.props.accessibilityLabel === 'Study for Firm Footing · IS Operations' && typeof n.props.onPress === 'function')[0];
    act(() => study.props.onPress());
    expect(useSession.getState().active?.title).toBe('Smart · IS Operations');
    expect(router.push).toHaveBeenCalledWith('/session');
    expect(root().findAllByType(Modal)).toHaveLength(0); // closed
  });

  it('earned: what it means (not how to earn it), its date, and no Study button', () => {
    earn('first-foothold', T0 - DAY);
    mount(<Badges />);
    press(/^First Foothold\. Earned/);
    const sheet = root().findByType(Modal);
    const words = sheet.findAll((n) => typeof n.props.children === 'string').map((n) => n.props.children as string);
    expect(words).toContain('Earned 11 Oct');
    expect(words).toContain('You’ve mapped where you stand. Your plan now starts from it.');
    expect(words).not.toContain('How to earn it');
    expect(sheet.findAll((n) => /^Study for/.test(n.props.accessibilityLabel ?? ''))).toHaveLength(0);
  });

  it('a mock badge opens the full mock’s start sheet; Rooted shows its tiers in words', () => {
    mount(<Badges />);
    press(/^Dress Rehearsal\. Not yet/);
    expect(allText()).toContain('Best once every domain reaches 65%. It counts whenever you do it.');
    press(/^Study for Dress Rehearsal$/);
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
    expect(labels().some((l) => l.startsWith('Badges, new badge, 1 earned.'))).toBe(true);
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
    expect(shownAgainLine(n)).toBe('Badges are on again. 2 badges arrived while they were hidden: see You → Badges.');
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
