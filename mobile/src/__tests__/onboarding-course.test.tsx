/**
 * Onboarding's exam choice is data-driven (product review, 28 Nov 2026).
 *
 * - One course on offer (CISA, the app today): no course step at all. The welcome is the first
 *   screen and reads CISA's lines word for word, exactly as before.
 * - Two or more (proved here with a made-up second course, "XYZ Part 1"): "Which exam are you
 *   preparing for?" comes first, nothing chosen; Continue waits for a choice; the welcome then
 *   speaks for the chosen course (headline, sub line, trademark line), and back returns to the choice.
 * - Screen-reader focus follows the page (course question ⇄ welcome headline), and a new phone can
 *   restore a backup (or add website progress) from the course step too.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { BackHandler, Dimensions } from 'react-native';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Onboarding, { COURSE_QUESTION, onboardingCourses } from '../app/onboarding';
import { setSystemReducedMotionForTest } from '../components/motion';
import { AI_DISCLAIMER_LINE, EXAM_TRADEMARK_LINE, WELCOME_HEADLINE, WELCOME_LINE } from '../content/brand';
import { CERTIFICATIONS, getCertification } from '../content/certifications';
import type { Certification } from '../content/types';
import * as a11y from '../lib/a11y';
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
  Redirect: () => null,
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));
// The fake course "has its content on this phone"; every real course keeps the real answer.
jest.mock('../content/loader', () => {
  const actual = jest.requireActual('../content/loader');
  return { ...actual, hasContent: (id: string) => id === 'xyz1' || actual.hasContent(id) };
});

/** A made-up second course (no real issuer): available, with its own lines and a family mark. */
const cisa = getCertification('cisa')!;
const FAKE: Certification = {
  ...cisa,
  id: 'xyz1',
  name: 'XYZ Part 1',
  fullName: 'XYZ Fundamentals',
  mark: 'XYZ',
  issuer: { id: 'xyz', name: 'The XYZ Board', site: 'xyz.example' },
  welcomeHeadline: 'Think like an XYZ reviewer.',
  trademarkNotice: 'Not affiliated with or endorsed by The XYZ Board. XYZ® is a registered trademark of The XYZ Board.',
  status: 'available',
};

let r: ReactTestRenderer | undefined;
const mount = () => {
  act(() => {
    r = create(<Onboarding />);
  });
};
const root = () => r!.root;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const press = (label: string) => {
  const n = root().findAll((x) => typeof x.props.onPress === 'function' && x.props.accessibilityLabel === label)[0];
  if (!n) throw new Error(`no button ${label}`);
  act(() => {
    n.props.onPress();
  });
};
const continueBtn = () => root().findAll((x) => x.props.label === 'Continue' && x.props.onPress)[0];
const hasCourseStep = () => root().findAll((x) => x.props.testID === 'course-step').length > 0;
const hasWelcome = () => root().findAll((x) => x.props.testID === 'welcome-page').length > 0;

let handler: (() => boolean | null | undefined) | undefined;
beforeEach(() => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, width: 393, fontScale: 1 }, screen: { ...w, width: 393, fontScale: 1 } });
  });
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  useSettings.setState(useSettings.getInitialState(), true);
  useSettings.setState({ onboarded: false, activeCertId: 'cisa', theme: 'light' });
  type BackListener = Parameters<typeof BackHandler.addEventListener>[1];
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_e, h: BackListener) => {
    handler = () => h({} as Parameters<BackListener>[0]);
    return { remove: () => {} };
  });
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
  jest.restoreAllMocks();
});

describe('one course on offer (the app today)', () => {
  it('has no course step: the welcome is first and reads CISA’s lines word for word', () => {
    expect(onboardingCourses().map((c) => c.id)).toEqual(['cisa']);
    mount();
    expect(hasCourseStep()).toBe(false);
    expect(hasWelcome()).toBe(true);
    const t = allText();
    expect(t).not.toContain(COURSE_QUESTION);
    for (const line of [WELCOME_HEADLINE, WELCOME_LINE, AI_DISCLAIMER_LINE, EXAM_TRADEMARK_LINE]) expect(t).toContain(line);
    // No extra Back on the welcome, and Android back leaves the app as before.
    expect(root().findAll((x) => x.props.label === 'Back' && x.props.onPress)).toHaveLength(0);
    expect(handler!()).toBe(false);
  });
});

describe('two courses on offer (a made-up second course)', () => {
  beforeEach(() => {
    CERTIFICATIONS.push(FAKE);
  });
  afterEach(() => {
    CERTIFICATIONS.splice(CERTIFICATIONS.indexOf(FAKE), 1);
  });

  it('asks which exam first, nothing chosen, and Continue waits for a choice', () => {
    expect(onboardingCourses().map((c) => c.id)).toEqual(['cisa', 'xyz1']);
    mount();
    expect(hasCourseStep()).toBe(true);
    expect(hasWelcome()).toBe(false);
    expect(allText()).toContain(COURSE_QUESTION);
    const radios = root().findAll((x) => x.props.accessibilityRole === 'radio' && typeof x.props.onPress === 'function');
    expect(radios.map((x) => x.props.accessibilityLabel)).toEqual(['CISA, Certified Information Systems Auditor', 'XYZ Part 1, XYZ Fundamentals']);
    expect(radios.every((x) => !x.props.accessibilityState.checked)).toBe(true);
    expect(continueBtn().props.disabled).toBe(true);
    // Both courses' marks are named under the list, each issuer its own.
    expect(allText()).toMatch(/ISACA/);
    expect(allText()).toMatch(/The XYZ Board/);
  });

  it('the welcome then speaks for the chosen course, and back returns to the choice', () => {
    mount();
    press('XYZ Part 1, XYZ Fundamentals');
    expect(continueBtn().props.disabled).toBe(false);
    act(() => continueBtn().props.onPress());
    expect(hasWelcome()).toBe(true);
    const t = allText();
    expect(t).toContain('Think like an XYZ reviewer.');
    expect(t).toContain('Your XYZ® Part 1 exam study, one day at a time.');
    expect(t).toContain(FAKE.trademarkNotice);
    expect(t).not.toContain(WELCOME_LINE);
    expect(t).not.toContain(EXAM_TRADEMARK_LINE);

    // Android back on the welcome: back to the choice (kept), then the app's default.
    let handled: boolean | null | undefined;
    act(() => {
      handled = handler!();
    });
    expect(handled).toBe(true);
    expect(hasCourseStep()).toBe(true);
    expect(handler!()).toBe(false);

    // Choosing CISA instead: CISA's welcome, word for word.
    press('CISA, Certified Information Systems Auditor');
    act(() => continueBtn().props.onPress());
    const t2 = allText();
    for (const line of [WELCOME_HEADLINE, WELCOME_LINE, EXAM_TRADEMARK_LINE]) expect(t2).toContain(line);
    // The welcome's own Back (only with a course step) returns to the choice too.
    act(() => root().findAll((x) => x.props.label === 'Back' && x.props.onPress)[0].props.onPress());
    expect(hasCourseStep()).toBe(true);
  });

  it('screen-reader focus moves to the new page’s header when the course step and the welcome swap', () => {
    // Each host view's ref is a stand-in that carries its label, so the focus target can be read.
    const focused: (string | undefined)[] = [];
    jest.spyOn(a11y, 'moveFocus').mockImplementation((ref) => {
      const node = (ref as { current: { label?: string; props?: { accessibilityLabel?: string } } | null }).current;
      focused.push(node?.label ?? node?.props?.accessibilityLabel);
      return () => {};
    });
    act(() => {
      r = create(<Onboarding />, { createNodeMock: (el) => ({ label: (el.props as { accessibilityLabel?: string }).accessibilityLabel }) });
    });
    // Nothing is moved on the first frame.
    expect(focused).toEqual([]);
    press('XYZ Part 1, XYZ Fundamentals');
    act(() => continueBtn().props.onPress());
    expect(focused).toEqual(['Welcome to KaiSip. Think like an XYZ reviewer.']);
    act(() => {
      handler!();
    });
    expect(focused).toEqual(['Welcome to KaiSip. Think like an XYZ reviewer.', COURSE_QUESTION]);
  });

  it('offers Restore from a backup on the course step too (the welcome keeps it)', () => {
    mount();
    expect(hasCourseStep()).toBe(true);
    const restore = () => root().findAll((x) => x.props.label === 'Restore from a backup' && x.props.onPress);
    expect(restore()).toHaveLength(1);
    expect(restore()[0].props.disabled).toBe(false);
    press('CISA, Certified Information Systems Auditor');
    act(() => continueBtn().props.onPress());
    expect(hasWelcome()).toBe(true);
    expect(restore()).toHaveLength(1);
  });
});
