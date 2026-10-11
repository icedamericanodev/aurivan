/**
 * Help and feedback screens (mobile 1.7), against the real stores:
 * - Settings → Help and feedback: every row opens what it says, and the
 *   address and the not-affiliated line are there as selectable text;
 * - the Help deep link (aurivan://help?open=…) opens the right sheet, and
 *   ignores anything else;
 * - Common questions: each answer ends with "Still stuck? Email us", which
 *   opens Contact support with the right topic chosen;
 * - What's next: Suggest an idea opens Send feedback with "An idea";
 * - Your reports + the bundled fixes: "Updated after your report" with the
 *   fix's note; What's new says "Your report helped" ONCE; Today and You
 *   show the quiet line until it's seen.
 */
import { Alert, Linking } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { RadioRow } from '../components/ui';
import { FAQ } from '../content/support';
import { getAllQuestions } from '../content/loader';
import type { Fix, ReportEntry } from '../engine/support';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import Settings from '../app/settings';
import Help from '../app/help';
import Faq from '../app/faq';
import WhatsNext from '../app/whats-next';
import WhatsNew from '../app/whats-new';
import Reports from '../app/reports';
import Today from '../app/(tabs)/home';
import You from '../app/(tabs)/you';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-reanimated', () => {
  const { View, Text, ScrollView } = jest.requireActual('react-native');
  const builder: object = new Proxy({}, { get: () => () => builder });
  const id = (v: unknown) => v;
  return {
    __esModule: true,
    default: { View, Text, ScrollView, createAnimatedComponent: (c: unknown) => c },
    createAnimatedComponent: (c: unknown) => c,
    useReducedMotion: () => true,
    useSharedValue: (v: unknown) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    useAnimatedProps: () => ({}),
    withTiming: id,
    withDelay: (_d: number, v: unknown) => v,
    withSpring: id,
    withRepeat: id,
    withSequence: (...v: unknown[]) => v[v.length - 1],
    cancelAnimation: () => {},
    Easing: new Proxy({}, { get: () => () => id }),
    ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
    FadeIn: builder,
    FadeInDown: builder,
    FadeOut: builder,
  };
});
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null }));
const mockPush = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.7.0' } } }));
jest.mock('../lib/reminders', () => ({
  remindersSupported: true,
  ensurePermission: async () => true,
  scheduleReminders: async () => {},
  cancelReminders: async () => {},
}));
jest.mock('expo-file-system', () => ({ File: class {}, Directory: class { list() { return []; } }, Paths: { cache: { uri: 'file:///cache' } } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => true, shareAsync: async () => {} }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: async () => ({ canceled: true, assets: null }) }));
// The bundled fixes list is empty until the first fix ships: tests supply their own.
let mockFixes: Fix[] = [];
jest.mock('../content/support', () => {
  const actual = jest.requireActual('../content/support');
  return new Proxy(actual, { get: (t, k: string) => (k === 'FIXES' ? mockFixes : t[k]) });
});

const NOW = new Date(2026, 10, 3, 9, 0, 0).getTime();
const DAY = 86_400_000;
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
const pressables = (label: string) =>
  root().findAll(
    (n) => typeof n.props.onPress === 'function' && typeof n.type !== 'string' && (n.props.accessibilityLabel === label || n.props.label === label || n.props.title === label),
  );
const press = (label: string) => act(() => { pressables(label)[0].props.onPress(); });
const pressAsync = async (label: string) => {
  await act(async () => {
    await pressables(label)[0].props.onPress();
  });
};
const openUrl = Linking.openURL as jest.Mock;
const lastEmail = () => {
  const url = String(openUrl.mock.calls.at(-1)![0]);
  return { subject: decodeURIComponent(url.split('subject=')[1].split('&body=')[0]), body: decodeURIComponent(url.split('&body=')[1]) };
};
const checkedRadio = () => root().findAllByType(RadioRow).find((n) => n.props.checked)?.props.title;

const q = getAllQuestions('cisa')[30];
const report = (over: Partial<ReportEntry> = {}): ReportEntry => ({ ref: 'R-7K2Q', item: `q:${q.id}`, reason: 'key', at: NOW - 20 * DAY, cert: 'cisa', ...over });
const fix = (over: Partial<Fix> = {}): Fix => ({ ref: `q:${q.id}`, cert: 'cisa', date: '2026-10-30', kind: 'corrected', publicNote: 'The answer key was corrected.', ...over });

beforeEach(() => {
  jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  openUrl.mockReset();
  openUrl.mockResolvedValue(true);
  mockPush.mockClear();
  mockParams = {};
  mockFixes = [];
  useSettings.setState({ ...useSettings.getInitialState(), onboarded: true, activeCertId: 'cisa', examDates: { cisa: '2026-12-20' } });
  // `reports` is optional (not in the initial state) and setState merges: clear it by hand.
  useProgress.setState({ ...useProgress.getInitialState(), reports: undefined });
  useSession.getState().clear();
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('Settings → Help and feedback', () => {
  it('lists every row, the address and the not-affiliated line (selectable)', () => {
    mount(<Settings />);
    for (const t of ['Common questions', 'Report a problem', 'Suggest an idea', 'Contact support', 'Your reports', 'What’s new', 'What’s next']) {
      expect(pressables(t).length).toBeGreaterThan(0);
    }
    const footer = root().findAll((n) => n.props.selectable === true && typeof n.props.children === 'string' && n.props.children.includes('certprep.support@gmail.com'));
    expect(footer.length).toBeGreaterThan(0);
    expect(allText()).toContain('Aurivan is independent and not affiliated with ISACA.');
    expect(allText()).toContain('Version 1.7');
  });

  it('rows open the right screens', () => {
    mount(<Settings />);
    press('Common questions');
    press('Your reports');
    press('What’s new');
    press('What’s next');
    expect(mockPush.mock.calls.map((c) => c[0])).toEqual(['/faq', '/reports', '/whats-new', '/whats-next']);
  });

  it('Report a problem reports the app itself', async () => {
    mount(<Settings />);
    press('Report a problem');
    expect(allText()).toContain('Something didn’t load or froze');
    press('Text is cut off or hard to read');
    await pressAsync('Write the email');
    expect(lastEmail().subject).toBe('Aurivan · Report · CISA · app:settings · display');
    expect(lastEmail().body).toContain('Item: The app (Settings)');
  });

  it('Suggest an idea opens Send feedback with “An idea” chosen', async () => {
    mount(<Settings />);
    press('Suggest an idea');
    expect(allText()).toContain('Send feedback');
    expect(pressables('An idea')[0].props.selected).toBe(true);
    act(() => { root().findAll((n) => n.props.accessibilityLabel === 'Your message' && typeof n.props.onChangeText === 'function')[0].props.onChangeText('A dark-mode timer'); });
    await pressAsync('Write the email');
    expect(lastEmail().subject).toBe('Aurivan · Feedback · Idea · CISA');
    expect(lastEmail().body).toContain('A dark-mode timer');
    expect(lastEmail().body).not.toContain('Display:'); // only if ticked
    expect(allText()).toContain('If you sent it, thank you. We read every message.');
  });

  it('Contact support waits for a topic, then writes a tagged email', async () => {
    mount(<Settings />);
    press('Contact support');
    expect(allText()).toContain('We’re a small independent team. We read every message.');
    expect(pressables('Write the email')[0].props.disabled).toBe(true);
    press('Backup, restore or a new phone');
    await pressAsync('Write the email');
    expect(lastEmail().subject).toBe('Aurivan · Support · Backup · CISA');
    expect(lastEmail().body).toContain('Topic: Backup, restore or a new phone');
  });
});

describe('the Help deep link: aurivan://help?open=…', () => {
  it.each([
    ['support', 'Contact support', 'We’re a small independent team.'],
    ['idea', 'Send feedback', 'Tell us what helps'],
    ['feedback', 'Send feedback', 'Tell us what helps'],
    ['report', 'Report a problem', 'Something didn’t load or froze'],
  ])('open=%s opens %s', (open, _title, text) => {
    mockParams = { open };
    mount(<Help />);
    expect(allText()).toContain(text);
  });

  it('anything else just shows the screen', () => {
    mockParams = { open: 'javascript:alert(1)' };
    mount(<Help />);
    expect(allText()).toContain('Help and feedback');
    expect(allText()).not.toContain('What’s it about?');
    expect(allText()).not.toContain('What’s wrong?');
    expect(allText()).not.toContain('What kind?');
  });
});

describe('Common questions', () => {
  it('every answer opens in place and ends with “Still stuck? Email us”', () => {
    mount(<Faq />);
    for (const f of FAQ) {
      press(f.question);
      expect(allText()).toContain(f.answer[0]);
      // One open answer at a time, each with its own way to write to us.
      expect(root().findAll((n) => n.props.label === 'Still stuck? Email us' && typeof n.type !== 'string')).toHaveLength(1);
    }
  });

  it('“Still stuck?” opens Contact support with the entry’s topic chosen', async () => {
    mount(<Faq />);
    const backup = FAQ.find((f) => f.topic === 'backup')!;
    press(backup.question);
    press('Still stuck? Email us');
    expect(checkedRadio()).toBe('Backup, restore or a new phone');
    await pressAsync('Write the email');
    expect(lastEmail().body).toContain(`From: Common questions: ${backup.question}`);
  });
});

describe('What’s next', () => {
  it('shows the three lists and Suggest an idea', async () => {
    mount(<WhatsNext />);
    for (const t of ['In progress', 'Planned', 'Recently shipped']) expect(allText()).toContain(t);
    press('Suggest an idea');
    expect(pressables('An idea')[0].props.selected).toBe(true);
    await pressAsync('Write the email');
    expect(lastEmail().body).toContain('From: What’s next');
  });
});

describe('Your reports and the credit loop', () => {
  it('empty: says what the list is for', () => {
    mount(<Reports />);
    expect(allText()).toContain('No reports yet');
  });

  it('names reports by topic, shows "Updated after your report" with the fix’s note', () => {
    mockFixes = [fix()];
    useProgress.setState({ reports: [report(), report({ ref: 'R-ABCD', item: 'q:d9_999', reason: 'typo' }), report({ ref: 'R-EFGH', item: `q:${q.id}`, at: NOW - DAY })] });
    mount(<Reports />);
    const text = allText();
    expect(text).toMatch(/Question in [A-Za-z ]+/);
    expect(text).toContain('Updated after your report · 30 Oct 2026');
    expect(text).toContain('The answer key was corrected.');
    // A report made AFTER the fix shipped isn't credited.
    expect(text).toContain(`Started ${new Date(NOW - DAY).getDate()} Nov`);
    // A question that is no longer in the app says so.
    expect(text).toContain('No longer in the app');
    expect(text).toContain('Ref R-7K2Q');
  });

  it('Clear this list asks first, then clears', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    useProgress.setState({ reports: [report()] });
    mount(<Reports />);
    press('Clear this list');
    const buttons = alert.mock.calls[0][2]!;
    act(() => { buttons.find((b) => b.text === 'Clear')!.onPress!(); });
    expect(useProgress.getState().reports).toEqual([]);
    alert.mockRestore();
  });

  it('What’s new says “Your report helped” once, then never again', () => {
    mockFixes = [fix()];
    useProgress.setState({ reports: [report()] });
    mount(<WhatsNew />);
    expect(allText()).toContain('Your report helped');
    expect(allText()).toContain('Fixed after learner reports');
    expect(allText()).toContain('The answer key was corrected.');
    expect(useProgress.getState().reports![0].creditSeen).toBe(true);
    act(() => { r!.unmount(); });
    mount(<WhatsNew />);
    expect(allText()).not.toContain('Your report helped');
  });

  it('with no fixes yet, What’s new explains how the loop works', () => {
    mount(<WhatsNew />);
    expect(allText()).toContain('Version 1.7');
    expect(allText()).toContain('Nothing yet. When a learner’s report leads to a fix, it’s listed here.');
  });

  it('Today and You show the quiet line until What’s new is opened', () => {
    mockFixes = [fix()];
    useProgress.setState({ reports: [report()] });
    mount(<Today />);
    expect(allText()).toContain('Your report helped');
    press('See what’s new');
    expect(mockPush).toHaveBeenCalledWith('/whats-new');
    act(() => { r!.unmount(); });
    mount(<You />);
    expect(allText()).toContain('Something you reported was updated');
    act(() => { useProgress.getState().markCreditSeen(['R-7K2Q']); });
    expect(allText()).not.toContain('Something you reported was updated');
    act(() => { r!.unmount(); });
    mount(<Today />);
    expect(allText()).not.toContain('Your report helped');
  });

  it('You has one entry to Help and feedback', () => {
    mount(<You />);
    press('Get help or send feedback');
    expect(mockPush).toHaveBeenCalledWith('/help');
  });
});
