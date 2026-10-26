/**
 * Mobile 1.44, the owner's "Version 3" name and study profile, on screen:
 * - Today's card: never on a welcome-back day, in exam week, or beside
 *   another Today invitation (the first readiness range card);
 * - You: "Your study profile" first, with and without a name, one spoken
 *   sentence, a decorative leaf, the 200% text layout, and one button that
 *   opens the one name editor (Settings ?open=name), which goes back on Save;
 * - "Add your website progress?": "Your name: Maya" and its note, and the
 *   import sets the name only when this phone has none.
 *
 * Gotcha: never write `act(() => store.action())`; use braces.
 */
import { Dimensions } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import Today from '../app/(tabs)/home';
import You from '../app/(tabs)/you';
import Settings, { LINK_OPEN_FALLBACK_MS } from '../app/settings';
import { WebImportPreview } from '../components/webImport';
import { getAllQuestions } from '../content/loader';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { checkAnyText, importWebProgress, type WebReady } from '../lib/webImport';
import { useBackup } from '../store/backup';
import { completeCert, selectCert, useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import fixture from './fixtures/web-export-v12.json';

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
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null }));
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useNavigation: () => ({ addListener: () => () => {} }),
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));
jest.mock('../lib/reminders', () => ({
  remindersSupported: true,
  ensurePermission: async () => true,
  scheduleReminders: async () => {},
  cancelReminders: async () => {},
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => true, shareAsync: async () => {} }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: async () => ({ canceled: true, assets: null }) }));

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const unmount = () =>
  act(() => {
    r?.unmount();
    r = undefined;
  });
const root = () => r!.root;
const textOf = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
const allText = () => textOf(root());
const byTestID = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.type === 'string');
const setScale = (fontScale: number) => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, width: 393, fontScale }, screen: { ...w, width: 393, fontScale } });
  });
};

const NOW = new Date(2026, 9, 26, 9, 0, 0);
const key = (daysAgo: number) => {
  const d = new Date(2026, 9, 26 - daysAgo, 12);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
/** The learner has studied on `days` days, the last one `lastDay` days ago, and the streak agrees. */
const studied = (days: number, lastDay: number) =>
  act(() => {
    useProgress.setState((st) => ({
      byCert: { ...st.byCert, cisa: completeCert({ ...selectCert(st, 'cisa'), milestones: { earned: {}, days, lastDay: key(lastDay) } }) },
      streak: { current: 1, best: 1, lastDay: key(lastDay), recentDays: [key(lastDay)] },
    }));
  });

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  jest.setSystemTime(NOW);
  setScale(1);
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  mockParams = {};
  useSeen.setState(useSeen.getInitialState(), true);
  act(() => {
    useProgress.getState().resetCert('cisa');
    useProgress.setState({ plantSettings: { promptHidden: true }, days: {}, streak: { current: 0, best: 0, lastDay: null } });
  });
  useSession.getState().clear();
  useBackup.setState({ lastBackupAt: null, undo: null });
  useSettings.setState(useSettings.getInitialState(), true);
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', fitPrompt: 'answered', dailyMinutes: 20, examDates: { cisa: '2027-02-14' } });
  useSeen.setState({ nameAsk: 'due' });
  jest.mocked(router.push).mockClear();
  jest.mocked(router.back).mockClear();
});
afterEach(() => {
  unmount();
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('Today’s name card: when it never shows', () => {
  const card = () => byTestID('name-ask');

  it('shows on an ordinary second study day', () => {
    studied(1, 1);
    mount(<Today />);
    expect(card()).toHaveLength(1);
  });

  it('never on a welcome-back day (3+ days away), and it stays due for a later day', () => {
    studied(4, 5);
    mount(<Today />);
    expect(card()).toHaveLength(0);
    expect(useSeen.getState().nameAsk).toBe('due');
  });

  it('never in exam week', () => {
    act(() => {
      useSettings.setState({ examDates: { cisa: key(-5) } });
    });
    studied(4, 1);
    mount(<Today />);
    expect(card()).toHaveLength(0);
    expect(useSeen.getState().nameAsk).toBe('due');
  });

  it('never beside another Today invitation (the first readiness range card)', () => {
    studied(3, 1);
    // Enough answers for the first range (but under 100, so its one-time card shows), from every area.
    act(() => {
      useProgress.setState((st) => {
        const cp = selectCert(st, 'cisa');
        const answers: Record<string, { attempts: number; correctCount: number; lastCorrect: boolean; lastAt: number }> = {};
        const all: { id: string; domainId: string }[] = getAllQuestions('cisa');
        for (const d of ['1', '2', '3', '4', '5']) {
          for (const q of all.filter((x) => x.domainId === d).slice(0, 14)) {
            answers[q.id] = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: NOW.getTime() - 86_400_000 };
          }
        }
        return { byCert: { ...st.byCert, cisa: completeCert({ ...cp, answers }) } };
      });
    });
    mount(<Today />);
    expect(allText()).toContain('Your first readiness range');
    expect(card()).toHaveLength(0);
    // It stays due for a later visit (showing nothing never counts as asked).
    expect(useSeen.getState().nameAsk).toBe('due');
  });
});

describe('You: "Your study profile"', () => {
  const block = () => root().findAll((n) => n.props.testID === 'study-profile' && n.props.accessibilityRole === 'button' && typeof n.type === 'string')[0];
  const seed = () => {
    studied(2, 1);
    act(() => {
      useSettings.setState({ familiarity: 'some' });
      useProgress.setState((st) => ({
        byCert: { ...st.byCert, cisa: completeCert({ ...selectCert(st, 'cisa'), mastery: { 'IS Audit': { firstDay: '2026-10-12' } } }) },
      }));
    });
  };

  it('with a name: the first block, above Readiness, word for word', () => {
    seed();
    useSettings.setState({ displayName: 'Maya' });
    mount(<You />);
    const t = allText();
    expect(t.indexOf('Maya')).toBeGreaterThan(-1);
    expect(t.indexOf('Maya')).toBeLessThan(t.indexOf('Readiness'));
    expect(t).toContain('Studying for CISA since 12 Oct');
    expect(t).toContain('Exam 14 Feb · about 20 min most days');
    expect(t).toContain('Started with: Some IT audit experience');
    expect(t).not.toContain('Add your name');
    // The leaf initial is there for the eye only.
    expect(textOf(block())).toContain('M');
  });

  it('is ONE button with ONE spoken sentence; the leaf is hidden from screen readers', () => {
    seed();
    useSettings.setState({ displayName: 'Maya' });
    mount(<You />);
    const b = block();
    expect(b.props.accessibilityLabel).toBe(
      'Your study profile: Maya, studying for CISA since 12 October, exam on 14 February, about 20 minutes most days, started with some IT audit experience.',
    );
    expect(b.props.accessibilityHint).toBe('Opens Settings to change or clear your name');
    const hidden = b.findAll((n) => n.props.importantForAccessibility === 'no-hide-descendants' && n.props.accessibilityElementsHidden === true);
    expect(hidden.length).toBeGreaterThan(0);
    // Nothing inside it is a second button.
    expect(b.findAll((n) => n !== b && typeof n.type === 'string' && n.props.accessibilityRole === 'button')).toHaveLength(0);
  });

  it('without a name: "Your study profile" and "Add your name", which opens the one name editor', () => {
    seed();
    mount(<You />);
    expect(allText()).toContain('Your study profile');
    expect(allText()).toContain('Add your name');
    expect(block().props.accessibilityHint).toBe('Opens Settings to add your name');
    const pressable = root().findAll((n) => n.props.testID === 'study-profile' && typeof n.props.onPress === 'function')[0];
    act(() => {
      pressable.props.onPress();
    });
    expect(router.push).toHaveBeenCalledWith({ pathname: '/settings', params: { open: 'name' } });
  });

  it('a name saved anywhere shows here at once', () => {
    seed();
    mount(<You />);
    act(() => {
      useSettings.getState().setDisplayName('Maya');
    });
    expect(allText()).not.toContain('Add your name');
    expect(block().props.accessibilityLabel).toMatch(/^Your study profile: Maya,/);
  });

  it('at 200% text every line wraps (nothing is cut to a line count)', () => {
    setScale(2);
    seed();
    useSettings.setState({ displayName: 'Wolfeschlegelstein Hausen' });
    mount(<You />);
    const texts = block().findAll((n) => typeof n.props.children === 'string' && n.props.style !== undefined);
    expect(texts.length).toBeGreaterThan(3);
    for (const t of texts) expect(t.props.numberOfLines).toBeUndefined();
    setScale(1);
  });
});

describe('Settings ?open=name (the profile’s link)', () => {
  const field = () => root().findAll((n) => n.props.accessibilityLabel === 'Your name' && typeof n.props.onChangeText === 'function')[0];
  // On iOS (Jest's platform) the linked sheet opens once the push ends; this stand-in router has no
  // transition events, so the short fallback opens it.
  const afterPush = () =>
    act(() => {
      jest.advanceTimersByTime(LINK_OPEN_FALLBACK_MS);
    });
  const press = (label: string) => {
    const n = root().findAll((x) => x.props.accessibilityLabel === label && typeof x.props.onPress === 'function')[0];
    act(() => {
      n.props.onPress();
    });
  };

  it('opens Your name, starting from the saved name; Save goes back to You', () => {
    useSettings.setState({ displayName: 'Maya' });
    mockParams = { open: 'name' };
    mount(<Settings />);
    afterPush();
    expect(field()).toBeTruthy();
    expect(field().props.value).toBe('Maya');
    act(() => {
      field().props.onChangeText('Mai');
    });
    press('Save');
    expect(useSettings.getState().displayName).toBe('Mai');
    expect(router.back).toHaveBeenCalled();
  });

  it('Cancel changes nothing and goes back too', () => {
    useSettings.setState({ displayName: 'Maya' });
    mockParams = { open: 'name' };
    mount(<Settings />);
    afterPush();
    press('Cancel, Your name');
    expect(useSettings.getState().displayName).toBe('Maya');
    expect(router.back).toHaveBeenCalled();
  });
});

describe('"Add your website progress?" with a name', () => {
  const file = (displayName: unknown) => JSON.stringify({ ...fixture, displayName });
  const ready = (text: string) => {
    const out = checkAnyText(text, fixture.profile.lastActive + 60_000);
    if (out.kind !== 'web') throw new Error(`not read: ${out.kind}`);
    return out as WebReady;
  };

  it('lists "Your name: Maya" with its note when this phone has none', () => {
    const web = ready(file('Maya'));
    expect(web.summaries[0].displayName).toBe('Maya');
    mount(<WebImportPreview web={web} busy={false} onConfirm={() => {}} onCancel={() => {}} />);
    expect(allText()).toContain('Your name:');
    expect(allText()).toContain('Maya');
    expect(allText()).toContain('Your name stays on this phone only. If you already set one here, that one is kept.');
    expect(byTestID('web-import-name')).toHaveLength(1);
  });

  it('a phone with its own name keeps it, and the sheet says so', () => {
    useSettings.setState({ displayName: 'Mai' });
    const web = ready(file('Maya'));
    mount(<WebImportPreview web={web} busy={false} onConfirm={() => {}} onCancel={() => {}} />);
    expect(allText()).not.toContain('Your name:');
    expect(allText()).toContain('This phone already has a name, so it stays as it is.');
    expect(byTestID('web-import-name')).toHaveLength(0);
  });

  it('adding sets the name only when this phone has none (checked again at write time)', async () => {
    const [p] = ready(file('Maya')).profiles;
    // The learner typed a name on Today while the sheet was open: theirs wins.
    act(() => {
      useSettings.getState().setDisplayName('Mai');
    });
    await act(async () => {
      expect((await importWebProgress(p, { now: fixture.profile.lastActive + 60_000 })).kind).toBe('ok');
    });
    expect(useSettings.getState().displayName).toBe('Mai');
  });

  it('adding to a phone with no name sets the website’s', async () => {
    const [p] = ready(file('  Maya ')).profiles;
    await act(async () => {
      expect((await importWebProgress(p, { now: fixture.profile.lastActive + 60_000 })).kind).toBe('ok');
    });
    expect(useSettings.getState().displayName).toBe('Maya');
  });

  it('a hostile name in the file is never offered or set', async () => {
    for (const bad of ['<script>x</script>', 'a'.repeat(400), 7, `${String.fromCharCode(0x202e)}`]) {
      const web = ready(file(bad));
      expect(web.summaries[0].displayName).toBeUndefined();
      await act(async () => {
        await importWebProgress(web.profiles[0], { now: fixture.profile.lastActive + 60_000 });
      });
      expect(useSettings.getState().displayName).toBeUndefined();
    }
  });
});
