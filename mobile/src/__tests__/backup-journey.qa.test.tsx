/**
 * QA Build C — the new-phone journey, end to end through the real screens.
 *
 * Learner A studies for a week (practice, Coach me, games, a mock, notes,
 * bookmarks, a lesson, an exam date, reminders on), then saves a backup.
 * A brand-new install (already onboarded for a different exam, reminders
 * not yet allowed) restores the file the next day.
 *
 * Then, rendered with react-test-renderer against the real stores:
 * - Today, Practice, Play, You and Settings show exactly the same text on
 *   both phones (every number, date and label), apart from the "Your data"
 *   lines that are about THIS phone's backups;
 * - the review queue is due on the same days for the next 90 days;
 * - the study reminder is scheduled exactly as on A (same ids, times, days,
 *   copy), after one permission prompt.
 *
 * Also here: restore validation and undo, driven through Settings → Your
 * data the way a learner would (corrupted file, newer app, another app's
 * file, undo within and after 7 days).
 *
 * Gotcha (see session-screen.regression.test.tsx): never write
 * `act(() => store.action())` — use braces.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import Today from '../app/(tabs)/home';
import Play from '../app/(tabs)/play';
import Practice from '../app/(tabs)/practice';
import You from '../app/(tabs)/you';
import Settings from '../app/settings';
import { getAllQuestions } from '../content/loader';
import { noteSubtopics } from '../content/notes';
import { BACKUP_ERROR_COPY, BACKUP_SCHEMA, UNDO_DAYS } from '../engine/backup';
import { PROGRESS_VERSION, SETTINGS_VERSION } from '../engine/saveMigrations';
import { dueIds } from '../engine/srs';
import { originalToDisplay } from '../engine/shuffle';
import { finishSession } from '../lib/finishSession';
import { scheduleReminders } from '../lib/reminders';
import { startMock } from '../lib/sessions';
import { useBackup } from '../store/backup';
import { selectCert, useProgress } from '../store/progress';
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
    useSharedValue: (v: unknown) => ({ value: v, set: () => {} }),
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
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), setParams: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('expo', () => ({ ...jest.requireActual('expo'), isRunningInExpoGo: () => false }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.3.0' } } }));

// expo-notifications: an in-memory schedule and a permission we control.
const mockScheduled = new Map<string, { identifier: string; content?: unknown; trigger?: unknown }>();
const mockPermission = { granted: true, grantOnAsk: true, asked: 0 };
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
  setNotificationChannelAsync: async () => null,
  setNotificationHandler: () => {},
  getPermissionsAsync: async () => ({ granted: mockPermission.granted }),
  requestPermissionsAsync: async () => {
    mockPermission.asked += 1;
    mockPermission.granted = mockPermission.grantOnAsk;
    return { granted: mockPermission.granted };
  },
  getAllScheduledNotificationsAsync: async () => [...mockScheduled.values()],
  cancelScheduledNotificationAsync: async (id: string) => {
    mockScheduled.delete(id);
  },
  scheduleNotificationAsync: async (req: { identifier: string; content: unknown; trigger: unknown }) => {
    mockScheduled.set(req.identifier, req);
    return req.identifier;
  },
}));

// expo-file-system / expo-sharing / expo-document-picker: tiny fakes.
const mockFiles = new Map<string, string>();
const mockShared: string[] = [];
let mockPick: unknown = { canceled: true, assets: null };
jest.mock('expo-file-system', () => ({
  File: class {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    }
    create() {
      mockFiles.set(this.uri, '');
    }
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
jest.mock('expo-sharing', () => ({
  isAvailableAsync: async () => true,
  shareAsync: async (uri: string) => {
    mockShared.push(uri);
  },
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: async () => mockPick }));

const DAY = 24 * 3_600_000;
// Learner A starts on Sat 3 Oct 2026, 08:00 local, and studies for a week.
const D1 = new Date(2026, 9, 3, 8, 0, 0).getTime();
const SAVED_AT = D1 + 6 * DAY + 12 * 3_600_000; // Fri 9 Oct, 20:00: backup saved
const RESTORE_AT = D1 + 7 * DAY + 2 * 3_600_000; // Sat 10 Oct, 10:00: the new phone

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
/** Every text node on screen, in order. */
const texts = (): string[] => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out;
};
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
/** Wait for queued promises (reminder scheduling) to settle. */
const settle = async () => {
  await act(async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });
};

/** Lines that are about THIS phone's backups, not the learner's progress. */
const BACKUP_LINE = /Last backup|Undo restore|Available until|Restored|Your progress from the backup|undo this for/;

const SCREENS: [string, () => React.ReactElement][] = [
  ['Today', () => <Today />],
  ['Practice', () => <Practice />],
  ['Play', () => <Play />],
  ['You', () => <You />],
  ['Settings', () => <Settings />],
];

/** What each screen shows right now (backup-only lines left out). */
function screenTexts(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [name, el] of SCREENS) {
    mount(el());
    out[name] = texts().filter((t) => !BACKUP_LINE.test(t));
    unmount();
  }
  return out;
}

function freshInstall() {
  useSettings.setState(useSettings.getInitialState());
  useProgress.setState(useProgress.getInitialState());
  useSession.setState({ active: null });
  useBackup.setState({ lastBackupAt: null, undo: null });
}

/** A week of real-looking study on phone A. */
async function learnerAStudies() {
  freshInstall();
  jest.setSystemTime(D1);
  useSettings.getState().completeOnboarding('cisa', '2026-12-04');
  useSettings.setState({ theme: 'light', dailyGoal: 40, haptics: false, shuffleOptions: true });
  const all = getAllQuestions('cisa');
  const note = noteSubtopics('cisa').find((s) => (s.practiceIds ?? []).length >= 3)!;
  const [n1, n2, n3] = note.practiceIds!;
  for (let day = 0; day < 6; day++) {
    jest.setSystemTime(D1 + day * DAY + 3_600_000 * (day % 3));
    const p = useProgress.getState();
    const batch = all.slice(day * 12, day * 12 + 12);
    batch.forEach((q, i) => {
      const correct = (i + day) % 3 !== 0;
      const conf = (['sure', 'unsure', 'guessing'] as const)[(i + day) % 3];
      p.recordAnswer('cisa', q.id, correct, conf, { ms: 20_000 + i * 1000, assisted: i === 5 });
      if (!correct) p.recordMistake('cisa', q.id, 'A', conf);
    });
    // Same subtopic on two days: mastered on day 2.
    if (day === 0) p.recordAnswer('cisa', n1, true, 'sure', { ms: 31_000 });
    if (day === 1) p.recordAnswer('cisa', n2, true, 'sure', { ms: 28_000 });
    if (day === 2) {
      // A game round, and a second answer to a first-day question (moves its review).
      p.recordAnswer('cisa', n3, true, 'sure', { ms: 9_000, mastery: false });
      p.recordGame('cisa', 'trap', 7);
      p.recordGame('cisa', 'sprint', 12);
      p.recordAnswer('cisa', all[1].id, true, 'sure', { ms: 15_000 });
    }
    if (day === 3) {
      p.toggleBookmark('cisa', all[40].id);
      p.toggleBookmark('cisa', all[41].id);
      p.setNoteRead('cisa', note.id, true);
      p.completeLesson('cisa', 'cisa-l-d1-engagement');
      p.tagMistake('cisa', all[0].id, 'priority');
    }
  }
  // Day 7: a short mock (answered on screen, then submitted).
  jest.setSystemTime(D1 + 6 * DAY + 9 * 3_600_000);
  const s = startMock('cisa', 12)!;
  s.questionIds.slice(0, 9).forEach((id, i) => {
    const q = all.find((x) => x.id === id)!;
    const right = originalToDisplay(q.correct, s.perms[id]);
    const display = i % 4 === 0 ? (right === 'A' ? 'B' : 'A') : right;
    useSession.getState().answer(id, { display, correct: display === right, ms: 40_000 + i * 500 });
  });
  jest.setSystemTime(D1 + 6 * DAY + 9 * 3_600_000 + 20 * 60_000);
  finishSession();
  useSession.getState().clear();
  // Reminders on: weekdays at 07:30, scheduled the way Settings does it.
  useSettings.getState().setReminder({ enabled: true, hour: 7, minute: 30, days: [1, 2, 3, 4, 5] });
  await scheduleReminders(useSettings.getState().reminder, 'CISA');
}

beforeEach(() => {
  jest.useFakeTimers({ now: D1 });
  mockScheduled.clear();
  mockFiles.clear();
  mockShared.length = 0;
  mockPick = { canceled: true, assets: null };
  Object.assign(mockPermission, { granted: true, grantOnAsk: true, asked: 0 });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => {
  unmount();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ── Journey 1: a new phone ───────────────────────────────────────────────
describe('new-phone journey: A saves a backup, a fresh install restores it', () => {
  it('every screen, the review queue and the reminder match A', async () => {
    await learnerAStudies();
    const cpA = selectCert(useProgress.getState(), 'cisa');
    // Sanity: A really has every kind of data the screens show.
    expect(Object.keys(cpA.answers).length).toBeGreaterThan(70);
    expect(cpA.mocks).toHaveLength(1);
    expect(Object.values(cpA.mastery ?? {}).some((m) => m.masteredAt)).toBe(true);
    expect(Object.values(cpA.answers).some((a) => a.ms && a.lastConfidence)).toBe(true);
    expect(useProgress.getState().streak.current).toBeGreaterThanOrEqual(6);

    // A saves a backup from Settings → Your data.
    jest.setSystemTime(SAVED_AT);
    mount(<Settings />);
    await press('Save a backup');
    unmount();
    expect(mockShared).toEqual(['file:///cache/aurivan-backup-2026-10-09.json']);
    const fileText = mockFiles.get(mockShared[0])!;
    const scheduledA = JSON.parse(JSON.stringify([...mockScheduled.values()].sort((a, b) => a.identifier.localeCompare(b.identifier))));
    expect(scheduledA.length).toBe(5);

    // The next morning A's phone still shows these screens (nothing studied since).
    jest.setSystemTime(RESTORE_AT);
    const reviewA = JSON.parse(JSON.stringify(selectCert(useProgress.getState(), 'cisa').review));
    const onA = screenTexts();
    const progressA = JSON.parse(JSON.stringify({ ...useProgress.getState() }));

    // ── The new phone: a fresh install, onboarded with a different exam date, no permission yet.
    await act(async () => {
      await AsyncStorage.clear();
    });
    freshInstall();
    mockScheduled.clear();
    Object.assign(mockPermission, { granted: false, grantOnAsk: true, asked: 0 });
    useSettings.getState().completeOnboarding('cisa', '2027-01-15');
    expect(selectCert(useProgress.getState(), 'cisa').answers).toEqual({});

    // Settings → Restore from a backup → preview → Replace my progress.
    mount(<Settings />);
    pickFile(fileText);
    await press('Restore from a backup');
    expect(texts().join(' ')).toContain('Restore this backup?');
    await press('Replace my progress');
    await settle();
    const after = texts().join(' ');
    expect(after).toContain('Restored');
    unmount();

    // Every visible number on Today, Practice, Play, You and Settings matches A.
    const onB = screenTexts();
    for (const [name] of SCREENS) expect({ screen: name, text: onB[name] }).toEqual({ screen: name, text: onA[name] });

    // The review queue is due on the same days.
    const reviewB = selectCert(useProgress.getState(), 'cisa').review;
    expect(reviewB).toEqual(reviewA);
    for (let d = 0; d <= 90; d++) {
      const at = RESTORE_AT + d * DAY;
      expect(dueIds(reviewB, at).sort()).toEqual(dueIds(reviewA, at).sort());
    }

    // Everything the stores hold matches (the plan Today stored for the new day included).
    const progressB = JSON.parse(JSON.stringify({ ...useProgress.getState() }));
    expect(progressB).toEqual(progressA);

    // Reminders were re-applied exactly as on A, after one permission prompt.
    expect(mockPermission.asked).toBe(1);
    const scheduledB = [...mockScheduled.values()].sort((a, b) => a.identifier.localeCompare(b.identifier));
    expect(JSON.parse(JSON.stringify(scheduledB))).toEqual(scheduledA);

    // The restore survives an app restart (the stores wrote it to the phone).
    const savedProgress = JSON.parse((await AsyncStorage.getItem('aurivan.progress.v1'))!);
    expect(savedProgress.version).toBe(PROGRESS_VERSION);
    expect(Object.keys(savedProgress.state.byCert.cisa.answers).length).toBe(Object.keys(cpA.answers).length);
    const savedSettings = JSON.parse((await AsyncStorage.getItem('aurivan.settings.v1'))!);
    expect(savedSettings.state).toMatchObject({ activeCertId: 'cisa', examDates: { cisa: '2026-12-04' }, dailyGoal: 40 });
  });
});

// ── Journey 2: restore validation and undo, through Settings ─────────────
describe('restore validation: nothing changes and the message is clear', () => {
  /** A learner on this phone, and a good backup of them. */
  async function phoneWithBackup() {
    await learnerAStudies();
    jest.setSystemTime(SAVED_AT);
    mount(<Settings />);
    await press('Save a backup');
    const good = JSON.parse(mockFiles.get(mockShared[0])!) as Record<string, unknown> & { stores: { progress: { version: number; state: Record<string, unknown> } } };
    return good;
  }
  const stores = () => JSON.stringify({ s: { ...useSettings.getState() }, p: { ...useProgress.getState() } });

  async function tryRestore(text: string) {
    const before = stores();
    pickFile(text);
    await press('Restore from a backup');
    const shown = texts().join(' ');
    // No preview, nothing replaced, no undo snapshot taken.
    expect(shown).not.toContain('Restore this backup?');
    expect(stores()).toBe(before);
    expect(useBackup.getState().undo).toBeNull();
    return shown;
  }

  it('a corrupted file (cut off half-way)', async () => {
    const good = await phoneWithBackup();
    const text = JSON.stringify(good);
    const shown = await tryRestore(text.slice(0, Math.floor(text.length / 2)));
    expect(shown).toContain('Couldn’t restore');
    expect(shown).toContain('Nothing was changed.');
  });

  it('a damaged value inside a real backup', async () => {
    const good = await phoneWithBackup();
    (good.stores.progress.state.streak as Record<string, unknown>).best = 'lots';
    expect(await tryRestore(JSON.stringify(good))).toContain(BACKUP_ERROR_COPY['bad-data']);
  });

  it('a backup from a newer version of the app (newer file format or newer store)', async () => {
    const good = await phoneWithBackup();
    expect(await tryRestore(JSON.stringify({ ...good, schema: BACKUP_SCHEMA + 1, appVersion: '2.0.0' }))).toContain(BACKUP_ERROR_COPY.newer);
    const newerStore = JSON.parse(JSON.stringify(good));
    newerStore.stores.progress.version = PROGRESS_VERSION + 1;
    expect(await tryRestore(JSON.stringify(newerStore))).toContain(BACKUP_ERROR_COPY.newer);
    const newerSettings = JSON.parse(JSON.stringify(good));
    newerSettings.stores.settings.version = SETTINGS_VERSION + 1;
    expect(await tryRestore(JSON.stringify(newerSettings))).toContain(BACKUP_ERROR_COPY.newer);
  });

  // BUG (Minor): a real Aurivan backup that was cut off (a failed download or
  // sync) is told "This file isn't an Aurivan backup. Pick the file that starts
  // with “aurivan-backup”" — but the learner DID pick that file. It should say
  // the backup is damaged. engine/backup.ts readBackup maps every JSON.parse
  // failure to 'not-json'.
  it.failing('a cut-off Aurivan backup says it is damaged, not that it is not a backup', async () => {
    const good = await phoneWithBackup();
    const text = JSON.stringify(good);
    const shown = await tryRestore(text.slice(0, Math.floor(text.length / 2)));
    expect(shown).toContain(BACKUP_ERROR_COPY['bad-data']);
  });

  // BUG (Minor): a backup from a NEWER app that adds a value this version does
  // not know (a fourth game in Today's plan) without bumping a store version —
  // the project's usual way to add optional data — is called "damaged". The file
  // says which app version made it (appVersion 1.4.0 > 1.3.0), so the learner
  // should be told to update the app.
  it.failing('a backup from a newer app with a value this version does not know says "update the app"', async () => {
    const good = await phoneWithBackup();
    const newer = JSON.parse(JSON.stringify(good));
    newer.appVersion = '1.4.0';
    newer.stores.progress.state.days.cisa.items.push({ kind: 'game', gameId: 'match', label: 'Match Up' });
    newer.stores.progress.state.days.cisa.done.push(false);
    expect(await tryRestore(JSON.stringify(newer))).toContain(BACKUP_ERROR_COPY.newer);
  });

  it('a file from another app (JSON, plain text, a picture)', async () => {
    await phoneWithBackup();
    const notOurs = BACKUP_ERROR_COPY['not-aurivan'];
    expect(await tryRestore(JSON.stringify({ app: 'other-quiz', schema: 1, stores: {} }))).toContain(notOurs);
    expect(await tryRestore(JSON.stringify({ version: 2, state: { byCert: {} } }))).toContain(notOurs); // a raw store blob
    expect(await tryRestore('Meeting notes, Tuesday')).toContain(BACKUP_ERROR_COPY['not-json']);
    expect(await tryRestore('\u0089PNG\r\n\u001a\n\u0000\u0000')).toContain(BACKUP_ERROR_COPY['not-json']);
  });
});

describe('undo restore, through Settings', () => {
  /**
   * Both stores as plain data. A Today plan from an EARLIER day is left out:
   * no screen shows it (Today builds a new plan for the new day), so a
   * restore or undo may keep or drop it.
   */
  const plainData = () => ({ s: JSON.parse(JSON.stringify({ ...useSettings.getState() })), p: JSON.parse(JSON.stringify({ ...useProgress.getState() })) });
  /** Drop plans from before today (a copy). */
  const dropStale = (d: ReturnType<typeof plainData>) => {
    const today = new Date(Date.now());
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const out = JSON.parse(JSON.stringify(d));
    for (const [id, plan] of Object.entries(out.p.days ?? {})) if ((plan as { day: string }).day !== key) delete out.p.days[id];
    return out;
  };

  async function restoreOverA() {
    // The backup: an older, smaller history (one answer, a March exam).
    freshInstall();
    jest.setSystemTime(D1);
    useSettings.getState().completeOnboarding('cisa', '2027-03-01');
    useProgress.getState().recordAnswer('cisa', 'd1_001', true);
    mount(<Settings />);
    await press('Save a backup');
    unmount();
    const older = mockFiles.get(mockShared[0])!;
    // The phone now: learner A's full week.
    await learnerAStudies();
    jest.setSystemTime(SAVED_AT);
    const before = plainData();
    mount(<Settings />);
    pickFile(older);
    await press('Restore from a backup');
    await press('Replace my progress');
    await settle();
    unmount();
    expect(useSettings.getState().examDates.cisa).toBe('2027-03-01');
    return before;
  }

  it('within 7 days: Undo restore is offered and brings back A exactly', async () => {
    const before = await restoreOverA();
    jest.setSystemTime(SAVED_AT + (UNDO_DAYS - 1) * DAY);
    mount(<Settings />);
    expect(texts().join(' ')).toContain('Undo restore');
    await press('Undo restore');
    // The confirmation, then its destructive button.
    const call = (Alert.alert as jest.Mock).mock.calls.find((c) => c[0] === 'Undo the restore?')!;
    const undoBtn = (call[2] as { text: string; onPress?: () => Promise<void> }[]).find((b) => b.text === 'Undo restore')!;
    await act(async () => {
      await undoBtn.onPress!();
    });
    await settle();
    expect(texts().join(' ')).toContain('Restore undone');
    expect(dropStale(plainData())).toEqual(dropStale(before));
    expect(useBackup.getState().undo).toBeNull();
  });

  it('after 7 days: Undo restore is gone, and the snapshot is dropped', async () => {
    await restoreOverA();
    jest.setSystemTime(SAVED_AT + UNDO_DAYS * DAY + 1);
    mount(<Settings />);
    expect(texts().join(' ')).not.toContain('Undo restore');
    expect(useBackup.getState().undo).toBeNull();
  });
});
