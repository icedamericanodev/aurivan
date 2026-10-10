/**
 * Settings → Your data, rendered against the real stores and lib/backup.
 *
 * - "Last backup: never", then the date once a backup is saved.
 * - A bad file: one calm message, nothing changes, no preview.
 * - A good file: a preview of what changes (never the bank size), then
 *   "Replace my progress" or Cancel. Cancel changes nothing.
 * - After a restore: a success message and "Undo restore" (7 days).
 * - At 200% text the preview rows stack, so nothing is cut off.
 *
 * Gotcha (see session-screen.regression.test.tsx): never write
 * `act(() => store.action())` — use braces.
 */
import { Alert, Dimensions } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Button } from '../components/ui';
import { RestorePreview, YourData } from '../components/yourData';
import { useRestoreFlow } from '../lib/useRestoreFlow';
import { getAllQuestions } from '../content/loader';
import { BACKUP_ERROR_COPY } from '../engine/backup';
import { currentBackup } from '../lib/backup';
import { selectCert, useProgress } from '../store/progress';
import { useBackup } from '../store/backup';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

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
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/reminders', () => ({
  remindersSupported: true,
  ensurePermission: async () => true,
  scheduleReminders: async () => {},
  cancelReminders: async () => {},
}));
const mockFiles = new Map<string, string>();
let mockPick: unknown = { canceled: true, assets: null };
jest.mock('expo-file-system', () => ({
  File: class {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    }
    create() {}
    write(t: string) {
      mockFiles.set(this.uri, t);
    }
    get size() {
      return (mockFiles.get(this.uri) ?? '').length;
    }
    async text() {
      return mockFiles.get(this.uri) ?? '';
    }
  },
  Paths: { cache: { uri: 'file:///cache' } },
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => true, shareAsync: async () => {} }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: async () => mockPick }));

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const button = (label: string) => root().findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
const press = async (label: string) => {
  await act(async () => {
    await button(label).props.onPress();
  });
};
const pickFile = (text: string) => {
  mockFiles.set('file:///picked/b.json', text);
  mockPick = { canceled: false, assets: [{ uri: 'file:///picked/b.json', name: 'b.json', size: text.length, lastModified: 0 }] };
};
const setFontScale = (fontScale: number) => {
  const w = Dimensions.get('window');
  Dimensions.set({ window: { ...w, fontScale }, screen: { ...w, fontScale } });
};

/** A backup from an "old phone" with 4 answers and a December exam. */
function oldPhoneBackup(): string {
  useSettings.getState().completeOnboarding('cisa', '2026-12-01');
  for (const q of getAllQuestions('cisa').slice(0, 4)) useProgress.getState().recordAnswer('cisa', q.id, true);
  const text = JSON.stringify(currentBackup());
  // This phone: a fresh start with no answers and no exam date.
  useSettings.setState({ ...useSettings.getInitialState(), onboarded: true });
  useProgress.setState(useProgress.getInitialState());
  return text;
}

/** This phone has studied a little (one answer), so the preview compares. */
function thisPhoneStudied() {
  useProgress.getState().recordAnswer('cisa', getAllQuestions('cisa')[10].id, true);
}

beforeEach(() => {
  // Messages are announced ~600 ms later (useRestoreFlow): fake timers keep that inside the test.
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  setFontScale(1);
  mockFiles.clear();
  useSettings.setState({ ...useSettings.getInitialState(), onboarded: true, theme: 'light' });
  useProgress.setState(useProgress.getInitialState());
  useBackup.setState({ lastBackupAt: null, undo: null });
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  useSession.getState().clear();
  jest.clearAllTimers();
  jest.useRealTimers();
});

const render = () =>
  act(() => {
    r = create(<YourData />);
  });

describe('Settings → Your data', () => {
  it('says when the last backup was saved', async () => {
    render();
    expect(allText()).toContain('No backup file yet');
    await press('Save a backup');
    // "Made", not "saved": the share sheet can't tell us where it went.
    expect(allText()).toMatch(/Last backup file made: \d{1,2} [A-Z][a-z]{2} \d{4}/);
    expect(allText()).toContain('Backup file ready');
    expect(allText()).toContain('If you saved it, you’re set.');
  });

  it('every action is a labelled button with a hint', () => {
    render();
    for (const label of ['Save a backup', 'Restore from a backup']) {
      const b = button(label);
      expect(b.props.accessibilityRole).toBe('button');
      expect(b.props.accessibilityHint).toBeTruthy();
    }
  });

  it('a bad file shows a clear message, no preview, and changes nothing', async () => {
    const before = useProgress.getState().byCert;
    pickFile('{"app":"something-else"}');
    render();
    await press('Restore from a backup');
    expect(allText()).toContain('Couldn’t restore');
    expect(allText()).toContain(BACKUP_ERROR_COPY['not-aurivan']);
    expect(allText()).not.toContain('Replace my progress');
    expect(useProgress.getState().byCert).toBe(before);
  });

  it('a good file shows what will change; Cancel changes nothing', async () => {
    pickFile(oldPhoneBackup());
    thisPhoneStudied();
    render();
    await press('Restore from a backup');
    const text = allText();
    expect(text).toContain('Restore this backup?');
    for (const label of ['Exam', 'Exam date', 'Questions answered', 'Last studied', 'Best streak', 'Study reminder']) expect(text).toContain(label);
    expect(text).toContain('1 Dec 2026');
    expect(text).toContain('4 questions');
    // Never the size of the bank.
    expect(text).not.toContain(String(getAllQuestions('cisa').length));
    await press('Cancel');
    expect(allText()).not.toContain('Restore this backup?');
    expect(Object.keys(selectCert(useProgress.getState(), 'cisa').answers)).toHaveLength(1);
  });

  it('"Replace my progress" restores, says so, and offers Undo restore', async () => {
    pickFile(oldPhoneBackup());
    thisPhoneStudied();
    render();
    await press('Restore from a backup');
    const confirm = button('Replace my progress');
    // Destructive style (danger) and a 56pt-high button (Button recipe).
    expect(confirm.props.accessibilityRole).toBe('button');
    expect(confirm.props.accessibilityHint).toBe('Replaces the progress on this phone with the backup. You can undo this for 7 days.');
    await press('Replace my progress');
    expect(Object.keys(selectCert(useProgress.getState(), 'cisa').answers)).toHaveLength(4);
    expect(useSettings.getState().examDates.cisa).toBe('2026-12-01');
    expect(allText()).toContain('Restored');
    expect(allText()).toContain('Undo restore');
    // The header now names the backup that was restored.
    expect(allText()).toMatch(/Restored from a backup saved on \d{1,2} [A-Z][a-z]{2} \d{4}/);
    // Undo asks first (and says what is lost), then puts this phone's data back.
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await press('Undo restore');
    expect(alert.mock.calls[0][1]).toMatch(/Anything you studied since then will be replaced\.$/);
    const buttons = alert.mock.calls[0][2]!;
    await act(async () => {
      await buttons.find((b) => b.style === 'destructive')!.onPress!();
    });
    expect(Object.keys(selectCert(useProgress.getState(), 'cisa').answers)).toHaveLength(1);
    expect(allText()).toContain('Restore undone');
    expect(allText()).not.toContain('Available until');
    alert.mockRestore();
  });

  it('at 200% text the preview rows stack instead of squeezing side by side', async () => {
    pickFile(oldPhoneBackup());
    thisPhoneStudied();
    setFontScale(2);
    render();
    await press('Restore from a backup');
    const rows = root().findAll((n) => (n.type as unknown) === 'View' && typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.includes('On this phone:'));
    expect(rows).toHaveLength(6);
    const pairs = root().findAll((n) => (n.type as unknown) === 'View' && n.props.style?.flexDirection === 'column' && n.props.style?.gap !== undefined);
    expect(pairs.length).toBeGreaterThanOrEqual(6);
    // The "Your data" header stacks too (title over meta).
    const header = root().findAll((n) => (n.type as unknown) === 'View' && n.props.style?.some?.((x: { flexDirection?: string }) => x?.flexDirection === 'column'));
    expect(header.length).toBeGreaterThan(0);
    // Each row is ONE screen-reader stop that says both values.
    expect(rows[0].props.accessibilityLabel).toMatch(/^Exam\. On this phone: CISA\. In the backup: CISA\. No change\.$/);
  });

  it('Settings on a phone with no progress still compares and keeps Undo (fresh is for the welcome screen)', async () => {
    pickFile(oldPhoneBackup());
    render();
    await press('Restore from a backup');
    expect(allText()).toContain('This phone');
    await press('Replace my progress');
    expect(useBackup.getState().undo).not.toBeNull();
  });

  it('the welcome screen gets the fresh preview: backup values only, "Restore my progress", no undo, onboarding done', async () => {
    const text = oldPhoneBackup();
    useSettings.setState({ onboarded: false });
    pickFile(text);
    function Welcome() {
      const f = useRestoreFlow({ onboard: true });
      return (
        <>
          <Button kind="ghost" label="Restore from a backup" onPress={f.pick} />
          <RestorePreview ready={f.ready} busy={f.busy === 'restore'} onConfirm={f.confirm} onCancel={f.cancel} />
        </>
      );
    }
    act(() => {
      r = create(<Welcome />);
    });
    await press('Restore from a backup');
    const shown = allText();
    expect(shown).toContain('This puts the progress from your backup on this phone.');
    expect(shown).not.toContain('This phone');
    expect(button('Replace my progress')).toBeUndefined();
    await press('Restore my progress');
    expect(Object.keys(selectCert(useProgress.getState(), 'cisa').answers)).toHaveLength(4);
    expect(useBackup.getState().undo).toBeNull();
    expect(useSettings.getState().onboarded).toBe(true);
  });

  it('an older backup is flagged before replacing newer progress', async () => {
    const text = oldPhoneBackup(); // 4 answers
    for (const q of getAllQuestions('cisa').slice(20, 30)) useProgress.getState().recordAnswer('cisa', q.id, true); // this phone: 10
    pickFile(text);
    render();
    await press('Restore from a backup');
    expect(allText()).toContain('This backup is older than this phone. Restoring it replaces the newer progress here.');
  });

  it('a paused quiz on this phone: the preview says it will end, and the restore ends it', async () => {
    const text = oldPhoneBackup();
    thisPhoneStudied();
    useSession.getState().start({ id: 's', mode: 'practice', certId: 'cisa', title: 'x', questionIds: ['d1_001'], perms: { d1_001: ['A', 'B', 'C', 'D'] }, index: 0, responses: {}, flagged: [], startedAt: Date.now() });
    pickFile(text);
    render();
    await press('Restore from a backup');
    expect(allText()).toContain('Your paused session will end.');
    await press('Replace my progress');
    expect(useSession.getState().active).toBeNull();
  });
});
