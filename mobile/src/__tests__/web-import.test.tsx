/**
 * Mobile 1.42: "Restore from a backup" accepts the KaiSip website's export and
 * ADDS it (lib/webImport.ts), rendered against the real stores.
 *
 * - The website file is recognised (before 1.42: "This file isn't a KaiSip
 *   backup"), even when bigger than an app backup, and never refused as "from
 *   a newer app" (its version is the website's, like "v12.32").
 * - App backups read exactly as before, older 1.x ones included.
 * - The sheet says what will be added and what is left out; "Add to my
 *   progress" merges, keeps today's plan and a paused quiz, offers Undo.
 * - Importing the same file twice changes nothing more.
 * - A file with several profiles asks which one.
 *
 * Gotcha: never write `act(() => store.action())`; use braces.
 */
import { Dimensions } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import Onboarding from '../app/onboarding';
import { YourData } from '../components/yourData';
import { getAllQuestions } from '../content/loader';
import { fitForBackup } from '../engine/backup';
import { stableStringify } from '../engine/syncMerge';
import { WEB_IMPORT_ERROR_COPY } from '../engine/webImport';
import { checkBackupText, currentBackup } from '../lib/backup';
import { checkAnyText, importWebProgress, pickAnyBackup } from '../lib/webImport';
import { useBackup } from '../store/backup';
import { completeCert, selectCert, useProgress } from '../store/progress';
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
// After the beta reset the app is 1.0 again: a website file must still read (its version is the website's).
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.0.0' } } }));
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
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => ({}),
}));
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => true, shareAsync: async () => {} }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: async () => mockPick }));

const WEB = JSON.stringify(fixture, null, 2);
const pickFile = (text: string) => {
  mockFiles.set('file:///picked/w.json', text);
  mockPick = { canceled: false, assets: [{ uri: 'file:///picked/w.json', name: 'kaisip-web-progress.json', size: text.length, lastModified: 0 }] };
};

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const button = (label: string) =>
  root().findAll((n) => (n.props.accessibilityLabel === label || String(n.props.accessibilityLabel).startsWith(`${label}, `)) && typeof n.props.onPress === 'function')[0];
const press = async (label: string) => {
  await act(async () => {
    await button(label).props.onPress();
  });
};

/** A phone that studied a little: one answer, a saved question, today's plan with one item ticked. */
function studied() {
  useSettings.getState().completeOnboarding('cisa', '2026-12-01');
  const q = getAllQuestions('cisa').find((x) => !(x.id in fixture.profile.state.answerLog))!;
  useProgress.getState().recordAnswer('cisa', q.id, true, 'sure');
  useProgress.getState().toggleBookmark('cisa', q.id);
  const today = useProgress.getState().today.day;
  useProgress.getState().startDay({ day: today, certId: 'cisa', items: [{ kind: 'review', count: 2 }], done: [true], start: { score: 0, domains: {} }, answered: 1, correct: 1, minutes: 2 });
  return q.id;
}

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  mockFiles.clear();
  useSettings.setState({ ...useSettings.getInitialState(), onboarded: true, theme: 'light' });
  useProgress.setState(useProgress.getInitialState());
  useBackup.setState({ lastBackupAt: null, undo: null });
  useSession.getState().clear();
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

describe('recognising the file', () => {
  it('a website export is read as one (before 1.42 it was "not a KaiSip backup")', () => {
    expect(checkBackupText(WEB)).toEqual({ kind: 'error', code: 'not-kaisip' });
    const out = checkAnyText(WEB);
    expect(out.kind).toBe('web');
  });

  it('its version is the website’s, so it is never refused as "from a newer app" (the app may be 1.0 after the beta reset)', () => {
    const withVersion = JSON.stringify({ ...fixture, appVersion: 'v12.32', app: 'kaisip-web' });
    expect(checkAnyText(withVersion).kind).toBe('web');
  });

  it('a website export bigger than an app backup is still read; an app backup that big is not', () => {
    const big = JSON.parse(WEB);
    big.profile.state.missedQuestions = Array.from({ length: 600 }, () => ({ ...getAllQuestions('cisa')[0] }));
    const text = JSON.stringify(big);
    expect(text.length).toBeGreaterThan(1024 * 1024);
    expect(checkAnyText(text).kind).toBe('web');
    const appBig = JSON.stringify({ ...currentBackup(), pad: 'x'.repeat(1024 * 1024) });
    expect(checkAnyText(appBig)).toEqual({ kind: 'error', code: 'too-big' });
  });

  it('app backups read as before', () => {
    studied();
    expect(checkAnyText(JSON.stringify(currentBackup())).kind).toBe('ok');
    // OWNER DECISION (flagged in the 1.42 report): if expo.version is reset to 1.0 for the beta, a backup
    // made by 1.1–1.42 compares as "made by a newer version" (engine/backup.ts compareVersions on
    // major.minor) and is refused until the app passes that number again. Shown here with the app at 1.0.0.
    expect(checkAnyText(JSON.stringify({ ...currentBackup(), appVersion: '1.39.0' }))).toEqual({ kind: 'error', code: 'newer' });
  });

  it('a note that merely mentions the website’s marker doesn’t turn an app backup into a website file', () => {
    studied();
    const qid = getAllQuestions('cisa')[3].id;
    useProgress.getState().setQuestionNote('cisa', qid, 'I exported "cisaMindsetExport" from the site');
    expect(checkAnyText(JSON.stringify(currentBackup())).kind).toBe('ok');
  });

  it('a damaged or newer website file says why, and nothing changes', () => {
    expect(checkAnyText(JSON.stringify({ ...fixture, version: 3 }))).toEqual({ kind: 'web-error', code: 'newer' });
    expect(checkAnyText(JSON.stringify({ cisaMindsetExport: true, version: 1, profile: { state: {} } }))).toEqual({ kind: 'web-error', code: 'empty' });
    expect(checkAnyText(JSON.stringify({ cisaMindsetExport: true, version: 1 }))).toEqual({ kind: 'web-error', code: 'bad-data' });
  });

  it('picking the file goes the same way', async () => {
    pickFile(WEB);
    expect((await pickAnyBackup()).kind).toBe('web');
  });
});

describe('adding it', () => {
  it('merges into the phone: the phone’s own study, today’s plan and a paused quiz stay; Undo is offered', async () => {
    const mine = studied();
    act(() => {
      useSession.setState({ active: { id: 's1', mode: 'practice', certId: 'cisa', title: 'Practice', questionIds: [mine], perms: { [mine]: ['A', 'B', 'C', 'D'] }, index: 0, responses: {}, flagged: [], startedAt: Date.now() } });
    });
    const days = useProgress.getState().days;
    const ready = checkAnyText(WEB);
    if (ready.kind !== 'web') throw new Error('not web');
    expect(ready.summaries[0]).toMatchObject({ answers: 10, saved: 2, nothingNew: false });
    expect(ready.pausedSession).toBe(true);
    const out = await importWebProgress(ready.profiles[0]);
    expect(out).toMatchObject({ kind: 'ok' });
    const cp = selectCert(useProgress.getState(), 'cisa');
    expect(cp.answers[mine]).toBeDefined();
    for (const id of Object.keys(fixture.profile.state.answerLog)) expect(cp.answers[id]).toBeDefined();
    expect(cp.bookmarks).toEqual(expect.arrayContaining([mine, 'd2_010', 'd4_050']));
    expect(useProgress.getState().days).toEqual(days);
    expect(useSession.getState().active?.id).toBe('s1');
    expect(useBackup.getState().undo?.file.app).toBe('kaisip');
  });

  it('twice changes nothing more, and the second time the sheet says it is all here already', async () => {
    studied();
    const first = checkAnyText(WEB);
    if (first.kind !== 'web') throw new Error('not web');
    await importWebProgress(first.profiles[0]);
    const after = stableStringify(fitForBackup({ settings: {}, progress: { ...useProgress.getState() } }).progress);
    const second = checkAnyText(WEB);
    if (second.kind !== 'web') throw new Error('not web');
    expect(second.summaries[0].nothingNew).toBe(true);
    await importWebProgress(second.profiles[0]);
    expect(stableStringify(fitForBackup({ settings: {}, progress: { ...useProgress.getState() } }).progress)).toBe(after);
  });

  it('on a fresh phone it never finishes onboarding on its own (review 1.42)', async () => {
    useSettings.setState({ ...useSettings.getInitialState(), onboarded: false });
    const ready = checkAnyText(WEB);
    if (ready.kind !== 'web') throw new Error('not web');
    await importWebProgress(ready.profiles[0]);
    expect(useSettings.getState().onboarded).toBe(false);
    expect(Object.keys(selectCert(useProgress.getState(), 'cisa').answers)).toHaveLength(10);
  });

  it('takes its own Undo copy, marked as an import', async () => {
    studied();
    const ready = checkAnyText(WEB);
    if (ready.kind !== 'web') throw new Error('not web');
    const out = await importWebProgress(ready.profiles[0]);
    expect(out).toMatchObject({ kind: 'ok', earlierUndo: false });
    expect(useBackup.getState().undo?.kind).toBe('import');
  });

  it('keeps an earlier Undo copy that is still inside its 7 days, so Undo goes back to before the first change', async () => {
    studied();
    const earlier = { takenAt: Date.now() - 2 * 86_400_000, file: currentBackup(Date.now() - 2 * 86_400_000) };
    act(() => {
      useBackup.setState({ undo: earlier });
    });
    const ready = checkAnyText(WEB);
    if (ready.kind !== 'web') throw new Error('not web');
    const out = await importWebProgress(ready.profiles[0]);
    expect(out).toMatchObject({ kind: 'ok', earlierUndo: true, undoFrom: earlier.takenAt });
    expect(useBackup.getState().undo).toEqual(earlier);
  });

  it('a note already on the phone is kept, even when the website’s is newer', async () => {
    studied();
    act(() => {
      useProgress.getState().setQuestionNote('cisa', 'd1_010', 'My phone note');
    });
    const f = JSON.parse(WEB);
    f.profile.state.qNotes.d1_010.ts = Date.now() - 1000;
    const ready = checkAnyText(JSON.stringify(f));
    if (ready.kind !== 'web') throw new Error('not web');
    expect(ready.summaries[0].qNotes).toBe(0);
    await importWebProgress(ready.profiles[0]);
    expect(selectCert(useProgress.getState(), 'cisa').qNotes?.d1_010.text).toBe('My phone note');
  });

  it('a merge too large to save changes nothing', async () => {
    studied();
    // A phone already near the save limit: long notes on many questions.
    const notes: Record<string, { text: string; ts: number }> = {};
    for (const q of getAllQuestions('cisa').slice(0, 1400)) notes[q.id] = { text: 'n'.repeat(1000), ts: Date.now() };
    act(() => {
      useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: completeCert({ ...selectCert(s, 'cisa'), qNotes: notes }) } }));
    });
    const before = stableStringify(useProgress.getState().byCert);
    const ready = checkAnyText(WEB);
    if (ready.kind !== 'web') throw new Error('not web');
    const out = await importWebProgress(ready.profiles[0]);
    expect(['too-big', 'no-snapshot']).toContain(out.kind);
    expect(stableStringify(useProgress.getState().byCert)).toBe(before);
  });
});

describe('Settings → Your data, with a website file', () => {
  const render = () =>
    act(() => {
      r = create(<YourData />);
    });

  it('shows what will be added, then adds it with one tap', async () => {
    studied();
    render();
    pickFile(WEB);
    await press('Restore from a backup');
    const t = allText();
    expect(t).toContain('Add your website progress?');
    expect(t).toContain('Nothing here is replaced or deleted.');
    expect(t).toContain('10 questions you answered on the website');
    expect(t).toContain('2 saved questions');
    expect(t).toContain('1 mock exam result');
    expect(t).toMatch(/doesn’t include your exam date, plant or settings/);
    expect(t).not.toMatch(/isn’t a KaiSip backup/);
    await press('Add to my progress');
    expect(allText()).toContain('Added');
    expect(allText()).toContain('Your website progress is on this phone now');
    expect(allText()).toContain('Undo last import');
  });

  it('Cancel adds nothing', async () => {
    studied();
    const before = stableStringify(useProgress.getState().byCert);
    render();
    pickFile(WEB);
    await press('Restore from a backup');
    await press('Cancel');
    expect(stableStringify(useProgress.getState().byCert)).toBe(before);
    expect(allText()).not.toContain('Add your website progress?');
  });

  it('a file with several profiles asks which one, then adds that one', async () => {
    const work = { ...fixture.profile, id: 'p_work', name: 'Work laptop', state: { ...fixture.profile.state, bookmarks: [], answerLog: { d1_010: fixture.profile.state.answerLog.d1_010 } } };
    render();
    pickFile(JSON.stringify({ cisaMindsetExport: true, version: 1, profiles: { p_home: fixture.profile, p_work: work } }));
    await press('Restore from a backup');
    expect(allText()).toContain('Which progress?');
    const radios = root().findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function');
    expect(radios.map((n) => n.props.accessibilityState.checked)).toEqual([true, false]);
    await act(async () => {
      radios[1].props.onPress();
    });
    expect(allText()).toContain('1 question you answered on the website');
    await press('Add to my progress');
    expect(Object.keys(selectCert(useProgress.getState(), 'cisa').answers)).toEqual(['d1_010']);
  });

  it('a damaged website file shows one calm message', async () => {
    render();
    pickFile(JSON.stringify({ cisaMindsetExport: true, version: 9, profile: fixture.profile }));
    await press('Restore from a backup');
    expect(allText()).toContain(WEB_IMPORT_ERROR_COPY.newer);
    expect(allText()).not.toContain('Add your website progress?');
  });

  it('at 200% text the sheet keeps every line and both buttons', async () => {
    const w = Dimensions.get('window');
    Dimensions.set({ window: { ...w, fontScale: 2 }, screen: { ...w, fontScale: 2 } });
    try {
      render();
      pickFile(WEB);
      await press('Restore from a backup');
      expect(allText()).toContain('10 questions you answered on the website');
      expect(button('Add to my progress')).toBeDefined();
      expect(button('Cancel')).toBeDefined();
      const capped = root().findAll((n) => typeof n.type === 'string' && n.props.testID === 'web-import');
      expect(capped).toHaveLength(1);
    } finally {
      Dimensions.set({ window: { ...w, fontScale: 1 }, screen: { ...w, fontScale: 1 } });
    }
  });
});

describe('the welcome screen with a website file (review 1.42)', () => {
  it('adds it, then goes on to the starting point: onboarding is not skipped; the end goes to Today, not the first set', async () => {
    useSettings.setState({ ...useSettings.getInitialState(), onboarded: false, theme: 'light' });
    act(() => {
      r = create(<Onboarding />);
    });
    pickFile(WEB);
    await press('Restore from a backup');
    expect(allText()).toContain('Next, you choose your starting point, exam date and daily time.');
    await press('Add to my progress');
    expect(useSettings.getState().onboarded).toBe(false);
    expect(allText()).toContain('Where are you starting from?');
    expect(allText()).toContain('Your website progress is on this phone now');
    await press('Skip this question');
    await press('Start my first questions');
    expect(useSettings.getState().onboarded).toBe(true);
    expect(router.replace).toHaveBeenCalledWith('/home');
    expect(router.replace).not.toHaveBeenCalledWith('/session');
  });
});
