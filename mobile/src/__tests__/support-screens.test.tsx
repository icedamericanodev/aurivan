/**
 * Help and feedback screens (mobile 1.7), against the real stores:
 * - Settings has ONE Help and feedback row; the Help screen groups its rows
 *   (Get help, Updates), every row opens what it says, and the address is
 *   its own selectable line above the not-affiliated line;
 * - Send feedback and Contact support keep what was typed across Cancel;
 * - the Help deep link (aurivan://help?open=…) opens the right sheet, also
 *   when Help is already open, and ignores anything else;
 * - Common questions: each answer ends with "Still stuck? Email us", which
 *   opens Contact support with the right topic chosen;
 * - What's next: Suggest an idea opens Send feedback with "An idea";
 * - Your reports + the bundled fixes: "Updated after your report" with the
 *   fix's note; What's new and Today say "Updated after your report" ONCE
 *   (whichever comes first), Today's line has a Dismiss; the plural counts
 *   different things, not reports.
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
  router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, setParams: jest.fn() },
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
  return { subject: decodeURIComponent(url.split('subject=')[1].split('&body=')[0]), body: decodeURIComponent(url.split('&body=')[1]).replace(/\r\n/g, '\n') };
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
  it('Settings has ONE row, and it opens the Help screen', () => {
    mount(<Settings />);
    expect(pressables('Get help or send feedback, Common questions, reports and what’s new')).toHaveLength(1);
    for (const t of ['Common questions', 'Contact support', 'Suggest an idea', 'Your reports', 'What’s next']) expect(pressables(t)).toHaveLength(0);
    press('Get help or send feedback, Common questions, reports and what’s new');
    expect(mockPush).toHaveBeenCalledWith('/help');
  });
});

describe('the Help screen', () => {
  it('groups its rows: Get help, then Updates; the address is its own selectable line', () => {
    mount(<Help />);
    const text = allText();
    expect(text.indexOf('Get help')).toBeLessThan(text.indexOf('Common questions'));
    expect(text.indexOf('Suggest an idea')).toBeLessThan(text.indexOf('Updates'));
    expect(text.indexOf('Updates')).toBeLessThan(text.indexOf('Your reports'));
    for (const t of ['Common questions', 'Contact support', 'Report a problem with the app', 'Suggest an idea', 'Your reports', 'What’s new', 'What’s next']) {
      expect(pressables(t).length).toBeGreaterThan(0);
    }
    // iOS copies a whole selectable Text: the address must be alone in its own (UX P6).
    const address = root().findAll((n) => n.props.selectable === true && typeof n.type !== 'string' && n.props.children === 'certprep.support@gmail.com');
    expect(address.length).toBeGreaterThan(0);
    expect(text).toContain('Aurivan is independent and not affiliated with or endorsed by ISACA.');
    expect(text).toContain('Version 1.7');
  });

  it('rows open the right screens', () => {
    mount(<Help />);
    press('Common questions');
    press('Your reports');
    press('What’s new');
    press('What’s next');
    expect(mockPush.mock.calls.map((c) => c[0])).toEqual(['/faq', '/reports', '/whats-new', '/whats-next']);
  });

  it('Report a problem with the app reports the app itself, and the note shows under that row', async () => {
    mount(<Help />);
    press('Report a problem with the app');
    expect(allText()).toContain('Something didn’t load or froze');
    press('Text is cut off or hard to read');
    await pressAsync('Write the email');
    expect(lastEmail().subject).toBe('Aurivan · Report · CISA · app:help · display');
    expect(lastEmail().body).toContain('Item: The app (Help)');
    const text = allText();
    expect(text.indexOf('Finished in your email app?')).toBeGreaterThan(text.indexOf('Report a problem with the app'));
    expect(text.indexOf('Finished in your email app?')).toBeLessThan(text.indexOf('Suggest an idea'));
  });

  it('Suggest an idea opens a sheet called “Suggest an idea” with “An idea” chosen', async () => {
    mount(<Help />);
    press('Suggest an idea');
    expect(allText()).toContain('Tell us what helps');
    expect(root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'header' && n.props.children === 'Suggest an idea')).toHaveLength(1);
    expect(pressables('An idea')[0].props.selected).toBe(true);
    act(() => { root().findAll((n) => n.props.accessibilityLabel === 'Your message' && typeof n.props.onChangeText === 'function')[0].props.onChangeText('A dark-mode timer'); });
    await pressAsync('Write the email');
    expect(lastEmail().subject).toBe('Aurivan · Feedback · Idea · CISA');
    expect(lastEmail().body).toContain('A dark-mode timer');
    expect(lastEmail().body).not.toContain('Display:'); // only if ticked
    expect(lastEmail().body).toContain('From: Help');
    expect(allText()).toContain('If you sent it, thank you. We read every message.');
  });

  it('Cancel keeps what the learner typed; a sent message starts fresh next time (UX P3)', async () => {
    mount(<Help />);
    const typeMessage = (t: string) =>
      act(() => { root().findAll((n) => n.props.accessibilityLabel === 'Your message' && typeof n.props.onChangeText === 'function')[0].props.onChangeText(t); });
    const message = () => root().findAll((n) => n.props.accessibilityLabel === 'Your message' && typeof n.props.onChangeText === 'function')[0].props.value;
    press('Suggest an idea');
    typeMessage('Half an idea');
    press('Cancel');
    expect(allText()).not.toContain('What kind?');
    press('Suggest an idea');
    expect(message()).toBe('Half an idea');
    await pressAsync('Write the email');
    press('Suggest an idea');
    expect(message()).toBe('');
  });

  it('Contact support waits for a topic (and says so), then writes a tagged email', async () => {
    mount(<Help />);
    press('Contact support');
    expect(allText()).toContain('We’re a small independent team. We read every message.');
    expect(pressables('Write the email')[0].props.disabled).toBe(true);
    expect(allText()).toContain('Choose what it’s about to continue.');
    press('Backup, restore or a new phone');
    await pressAsync('Write the email');
    expect(lastEmail().subject).toBe('Aurivan · Support · Backup · CISA');
    expect(lastEmail().body).toContain('Topic: Backup, restore or a new phone');
  });
});

describe('the Help deep link: aurivan://help?open=…', () => {
  it.each([
    ['support', 'Contact support', 'We’re a small independent team.'],
    ['idea', 'Suggest an idea', 'Tell us what helps'],
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

  it('a link that arrives while Help is open opens its sheet, and the param is cleared once handled', () => {
    const { router } = jest.requireMock('expo-router') as { router: { setParams: jest.Mock } };
    router.setParams.mockClear();
    mount(<Help />);
    expect(allText()).not.toContain('What’s it about?');
    mockParams = { open: 'support' };
    act(() => { r!.update(<Help />); });
    expect(allText()).toContain('What’s it about?');
    expect(router.setParams).toHaveBeenCalledWith({ open: undefined });
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
    // The note sits under that entry, before the next question (UX O3).
    const text = allText();
    const next = FAQ[FAQ.indexOf(backup) + 1];
    expect(text.indexOf('Finished in your email app?')).toBeGreaterThan(text.indexOf(backup.question));
    if (next) expect(text.indexOf('Finished in your email app?')).toBeLessThan(text.indexOf(next.question));
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

  it('What’s new says “Updated after your report” once, then never again; fixes sit above the versions', () => {
    mockFixes = [fix()];
    useProgress.setState({ reports: [report()] });
    mount(<WhatsNew />);
    const text = allText();
    expect(text).toContain('Updated after your report');
    expect(text).not.toContain('Your report helped'); // another learner's report may have led to the fix
    expect(text).toContain('The answer key was corrected.');
    // "Fixed after learner reports" comes before Version 1.7, so a fix never reads as part of it (UX P8).
    expect(text.indexOf('Fixed after learner reports')).toBeLessThan(text.indexOf('Version 1.7'));
    expect(useProgress.getState().reports![0].creditSeen).toBe(true);
    act(() => { r!.unmount(); });
    mount(<WhatsNew />);
    expect(allText()).not.toContain('Updated after your report');
  });

  it('two reports about ONE thing are “Something you reported”, not “Things”', () => {
    mockFixes = [fix()];
    useProgress.setState({ reports: [report(), report({ ref: 'R-ABCD', at: NOW - 21 * DAY })] });
    mount(<You />);
    expect(allText()).toContain('Something you reported was updated');
    act(() => { r!.unmount(); });
    mount(<WhatsNew />);
    expect(allText()).toContain('Something you reported has been updated since.');
    expect(allText()).not.toContain('Things you reported');
  });

  it('with no fixes yet, What’s new explains how the loop works', () => {
    mount(<WhatsNew />);
    expect(allText()).toContain('Version 1.7');
    expect(allText()).toContain('Nothing yet. When a learner’s report leads to a fix, it’s listed here.');
  });

  it('You shows the quiet line until the credit is seen', () => {
    mockFixes = [fix()];
    useProgress.setState({ reports: [report()] });
    mount(<You />);
    expect(allText()).toContain('Something you reported was updated');
    act(() => { useProgress.getState().markCreditSeen(['R-7K2Q']); });
    expect(allText()).not.toContain('Something you reported was updated');
  });

  it('Today shows the line ONCE (seen as soon as it shows), with a Dismiss and a way to Your reports', () => {
    mockFixes = [fix()];
    useProgress.setState({ reports: [report()] });
    mount(<Today />);
    expect(allText()).toContain('Updated after your report');
    expect(useProgress.getState().reports![0].creditSeen).toBe(true);
    // Kept for this visit, even though it is already marked seen.
    expect(allText()).toContain('Something you reported was updated.');
    press('See your reports');
    expect(mockPush).toHaveBeenCalledWith('/reports');
    press('Dismiss this note');
    expect(allText()).not.toContain('Updated after your report');
    act(() => { r!.unmount(); });
    mount(<Today />);
    expect(allText()).not.toContain('Updated after your report');
  });

  it('You has one entry to Help and feedback', () => {
    mount(<You />);
    press('Get help or send feedback');
    expect(mockPush).toHaveBeenCalledWith('/help');
  });
});
