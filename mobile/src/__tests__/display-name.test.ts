/**
 * Mobile 1.23, "What should we call you?": the optional name.
 *
 * - cleanDisplayName: trim, collapse spaces, 24 characters at most, no
 *   control or direction-changing characters, no web addresses or emails,
 *   empty = none;
 * - the settings store keeps it (and cleans a bad saved value as it loads);
 *   saves from 1.19 to 1.22 have none and load as before;
 * - it is part of the learner's own backup file and round-trips, and an old
 *   backup (no name) keeps the name already on the phone;
 * - it never leaves the phone otherwise: not synced, not in any support
 *   email, share card text or board handle, and no file outside a short list
 *   even reads it (the source guard at the end).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { cleanDisplayName, greetingForHour, greetingWithName, MAX_DISPLAY_NAME } from '../engine/displayName';
import { DEVICE_LOCAL_SETTINGS, SYNCED_SETTINGS } from '../engine/syncMerge';
import { buildFeedbackEmail, buildReportEmail, buildSupportEmail } from '../engine/support';
import { getCertification } from '../content/certifications';
import { badgeCardText } from '../engine/shareCard';
import { checkBackupText, currentBackup, restoreBackup } from '../lib/backup';
import { useBackup } from '../store/backup';
import { useProgress } from '../store/progress';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo', () => ({ isRunningInExpoGo: () => false }));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.23.0' } } }));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
  setNotificationChannelAsync: async () => null,
  getPermissionsAsync: async () => ({ granted: true }),
  requestPermissionsAsync: async () => ({ granted: true }),
  getAllScheduledNotificationsAsync: async () => [],
  cancelScheduledNotificationAsync: async () => {},
  scheduleNotificationAsync: async () => 'id',
}));
jest.mock('expo-file-system', () => ({ File: class {}, Paths: { cache: { uri: 'file:///cache' } } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => true, shareAsync: async () => {} }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: async () => ({ canceled: true, assets: null }) }));

const NOW = new Date(2026, 9, 15, 9, 0, 0).getTime();
// Escapes built at run time, so this file stays plain text.
const ch = (...codes: number[]) => String.fromCharCode(...codes);
const RLO = ch(0x202e); // right-to-left override
const LRI = ch(0x2066); // left-to-right isolate
const ZWSP = ch(0x200b);
const BOM = ch(0xfeff);

describe('cleanDisplayName', () => {
  it('keeps an ordinary name as typed', () => {
    for (const n of ['Maya', 'Mary Jane', "O'Neil", 'Ana-Lyn', 'José', 'Zoë Ng', 'J.R.', 'Mei Ling 李', 'Alex_7']) expect(cleanDisplayName(n)).toBe(n);
  });

  it('trims and collapses every kind of space to one', () => {
    expect(cleanDisplayName('  Maya  ')).toBe('Maya');
    expect(cleanDisplayName('Mary    Jane')).toBe('Mary Jane');
    expect(cleanDisplayName('Mary\t\n Jane')).toBe('Mary Jane');
    expect(cleanDisplayName(`Mary${ch(0xa0)}${ch(0x3000)}Jane`)).toBe('Mary Jane');
  });

  it('empty, spaces only and "not text" all mean no name', () => {
    for (const v of ['', '   ', '\n\t', undefined, null, 42, {}, [], true]) expect(cleanDisplayName(v)).toBe('');
  });

  it('cuts at 24 characters, never in the middle of an emoji, and never leaves a trailing space', () => {
    expect(MAX_DISPLAY_NAME).toBe(24);
    expect(cleanDisplayName('a'.repeat(24))).toBe('a'.repeat(24));
    expect(cleanDisplayName('a'.repeat(40))).toBe('a'.repeat(24));
    const emoji = String.fromCodePoint(0x1f33f);
    expect(Array.from(cleanDisplayName(emoji.repeat(40)))).toHaveLength(24);
    expect(cleanDisplayName(emoji.repeat(40))).toBe(emoji.repeat(24));
    // The cut lands on a space: it is trimmed.
    expect(cleanDisplayName(`${'a'.repeat(23)} bbbbb`)).toBe('a'.repeat(23));
  });

  it('strips control characters and the ones that hide or reverse text', () => {
    expect(cleanDisplayName(`Ma${ch(0)}${ch(7)}ya${ch(0x7f)}`)).toBe('Maya');
    expect(cleanDisplayName(`${RLO}Maya`)).toBe('Maya');
    expect(cleanDisplayName(`Ma${LRI}ya${ch(0x2069)}`)).toBe('Maya');
    expect(cleanDisplayName(`${BOM}Ma${ZWSP}ya${ch(0x200e)}${ch(0x200f)}`)).toBe('Maya');
    expect(cleanDisplayName(`Ma${ch(0x202a)}${ch(0x202b)}${ch(0x202c)}${ch(0x202d)}ya`)).toBe('Maya');
    expect(cleanDisplayName(`Ma${ch(0xad)}ya`)).toBe('Maya');
    // A name made only of such characters is no name.
    expect(cleanDisplayName(`${RLO}${ZWSP}${BOM}`)).toBe('');
    // A lone half of an emoji is dropped.
    expect(cleanDisplayName(`Ma${ch(0xd83c)}ya`)).toBe('Maya');
  });

  it('no web addresses and no emails (hidden characters do not get one past)', () => {
    for (const bad of [
      'maya@example.com',
      '@maya',
      'https://example.com',
      'http://x.y',
      'www.example.com',
      'example.com',
      'visit mysite.io now',
      'mailto:a',
      'javascript:alert(1)',
      `ww${ZWSP}w.evil.com`,
      `ht${ZWSP}tps://evil.com`,
      `evil${RLO}.com`,
    ]) {
      expect(cleanDisplayName(bad)).toBe('');
    }
  });

  it('stays fast on huge hostile text (a restored file cannot freeze the app)', () => {
    const t0 = Date.now();
    expect(cleanDisplayName('a-'.repeat(100_000))).toBe('a-a-a-a-a-a-a-a-a-a-a-a-');
    expect(cleanDisplayName(`Maya ${'x'.repeat(500_000)}`)).toBe('Maya xxxxxxxxxxxxxxxxxxx');
    expect(Date.now() - t0).toBeLessThan(500);
  });

  it('is the same result when run twice (so saving a cleaned value changes nothing)', () => {
    for (const v of ['  Mary   Jane ', `${RLO}Ma${ZWSP}ya`, 'x'.repeat(60), 'ok']) {
      const once = cleanDisplayName(v);
      expect(cleanDisplayName(once)).toBe(once);
    }
  });
});

describe('the greeting', () => {
  it('has the hour part alone, and with the name after a comma', () => {
    expect(greetingForHour(0)).toBe('Good morning');
    expect(greetingForHour(11)).toBe('Good morning');
    expect(greetingForHour(12)).toBe('Good afternoon');
    expect(greetingForHour(17)).toBe('Good afternoon');
    expect(greetingForHour(18)).toBe('Good evening');
    expect(greetingWithName(9, 'Maya')).toBe('Good morning, Maya');
    expect(greetingWithName(13, 'Maya')).toBe('Good afternoon, Maya');
    expect(greetingWithName(21, 'Maya')).toBe('Good evening, Maya');
  });

  it('no name, an empty one or a bad one gives the plain greeting (and never a stray comma)', () => {
    for (const n of [undefined, null, '', '   ', 'a@b.co', `${RLO}`]) expect(greetingWithName(9, n)).toBe('Good morning');
  });

  it('cleans a name it is handed, so a bad saved value can never show', () => {
    expect(greetingWithName(9, `  ${RLO}Maya   Jane `)).toBe('Good morning, Maya Jane');
  });
});

describe('the settings store', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useSettings.setState(useSettings.getInitialState(), true);
  });

  it('has no name to begin with, saves a clean one, and clears it', () => {
    expect(useSettings.getState().displayName).toBeUndefined();
    useSettings.getState().setDisplayName('  Maya  ');
    expect(useSettings.getState().displayName).toBe('Maya');
    useSettings.getState().setDisplayName('   ');
    expect(useSettings.getState().displayName).toBeUndefined();
    useSettings.getState().setDisplayName('Maya');
    useSettings.getState().setDisplayName(undefined);
    expect(useSettings.getState().displayName).toBeUndefined();
    // Something that is not a name saves nothing.
    useSettings.getState().setDisplayName('me@example.com');
    expect(useSettings.getState().displayName).toBeUndefined();
  });

  it('completeOnboarding saves a typed name, and leaves the saved one alone when none is passed', () => {
    useSettings.getState().completeOnboarding('cisa', undefined, { dailyMinutes: 20 }, '  Maya ');
    expect(useSettings.getState().displayName).toBe('Maya');
    expect(useSettings.getState().onboarded).toBe(true);
    useSettings.getState().completeOnboarding('cisa', undefined, { dailyMinutes: 20 });
    expect(useSettings.getState().displayName).toBe('Maya');
    useSettings.getState().completeOnboarding('cisa', undefined, { dailyMinutes: 20 }, '');
    expect(useSettings.getState().displayName).toBeUndefined();
  });

  it('a save from 1.19 to 1.22 (no name) loads as before, and the name is saved under the same key', async () => {
    const old = {
      state: { onboarded: true, activeCertId: 'cisa', examDates: { cisa: '2027-01-08' }, theme: 'dark', motion: 'reduced', shuffleOptions: false, dailyGoal: 20, haptics: false, familiarity: 'some', dailyMinutes: 30, fitPrompt: 'answered' },
      version: 1,
    };
    await AsyncStorage.setItem('aurivan.settings.v1', JSON.stringify(old));
    await useSettings.persist.rehydrate();
    const s = useSettings.getState();
    expect(s.displayName).toBeUndefined();
    expect(s).toMatchObject({ onboarded: true, theme: 'dark', motion: 'reduced', familiarity: 'some', dailyMinutes: 30, shuffleOptions: false, haptics: false });
    // Saving a name writes it with the rest, under the same key and version.
    s.setDisplayName('Maya');
    await new Promise((r) => setTimeout(r, 20));
    const raw = JSON.parse((await AsyncStorage.getItem('aurivan.settings.v1'))!);
    expect(raw.version).toBe(1);
    expect(raw.state.displayName).toBe('Maya');
    expect(raw.state.familiarity).toBe('some');
  });

  it('a name read from the save is cleaned again (an edited or damaged value never reaches the screen)', async () => {
    const save = (displayName: unknown) =>
      AsyncStorage.setItem('aurivan.settings.v1', JSON.stringify({ state: { onboarded: true, activeCertId: 'cisa', displayName }, version: 1 }));
    await save(`  ${RLO}Maya   Jane  `);
    await useSettings.persist.rehydrate();
    expect(useSettings.getState().displayName).toBe('Maya Jane');
    await save('https://example.com');
    await useSettings.persist.rehydrate();
    expect(useSettings.getState().displayName).toBeUndefined();
    await save(12345);
    await useSettings.persist.rehydrate();
    expect(useSettings.getState().displayName).toBeUndefined();
    await save('x'.repeat(500));
    await useSettings.persist.rehydrate();
    expect(useSettings.getState().displayName).toBe('x'.repeat(24));
  });
});

describe('the backup file (the learner’s own copy)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useSettings.setState(useSettings.getInitialState(), true);
    useSettings.setState({ onboarded: true, activeCertId: 'cisa' });
    useBackup.setState({ undo: null, lastBackupAt: null });
    useProgress.getState().resetCert('cisa');
  });

  it('has the name, writes the new "kaisip" marker, and the name comes back after a restore', async () => {
    useSettings.getState().setDisplayName('Maya');
    const file = currentBackup(NOW);
    expect(file.app).toBe('kaisip');
    expect(file.stores.settings.state.displayName).toBe('Maya');
    const text = JSON.stringify(file);

    useSettings.getState().setDisplayName(undefined);
    const checked = checkBackupText(text);
    expect(checked.kind).toBe('ok');
    if (checked.kind !== 'ok') return;
    expect(await restoreBackup(checked.data, { now: NOW + 1000 })).toMatchObject({ kind: 'ok' });
    expect(useSettings.getState().displayName).toBe('Maya');
  });

  it('no name set: the file simply has none', () => {
    const file = currentBackup(NOW);
    expect(file.stores.settings.state).not.toHaveProperty('displayName');
    expect(JSON.stringify(file)).not.toContain('displayName');
  });

  it('a file with a name that is not clean restores with no name, and is not refused', async () => {
    useSettings.getState().setDisplayName('Maya');
    const file = JSON.parse(JSON.stringify(currentBackup(NOW)));
    file.stores.settings.state.displayName = 'me@example.com';
    useSettings.getState().setDisplayName(undefined);
    const checked = checkBackupText(JSON.stringify(file));
    expect(checked.kind).toBe('ok');
    if (checked.kind !== 'ok') return;
    await restoreBackup(checked.data, { now: NOW + 1000 });
    expect(useSettings.getState().displayName).toBeUndefined();
  });

  it('an older backup (no name) keeps the name already on this phone', async () => {
    const file = JSON.parse(JSON.stringify(currentBackup(NOW)));
    delete file.stores.settings.state.displayName;
    useSettings.getState().setDisplayName('Maya');
    const checked = checkBackupText(JSON.stringify(file));
    expect(checked.kind).toBe('ok');
    if (checked.kind !== 'ok') return;
    await restoreBackup(checked.data, { now: NOW + 1000 });
    expect(useSettings.getState().displayName).toBe('Maya');
  });
});

describe('the name stays on the phone', () => {
  const NAME = 'Zyxwvut Quillfeather';

  it('is never synced: it is on the device-only list, and every setting is on exactly one list', () => {
    expect(DEVICE_LOCAL_SETTINGS).toContain('displayName');
    expect(SYNCED_SETTINGS as readonly string[]).not.toContain('displayName');
  });

  it('is in no support, feedback or report email, whatever the phone holds', () => {
    useSettings.setState({ displayName: NAME });
    const app = { version: '1.23.0', os: 'Android 15' };
    const emails = [
      buildReportEmail({
        target: { kind: 'question', id: 'd4_217', name: 'IS Operations', where: 'Practice review · Quick 10' },
        reason: 'key',
        certName: 'CISA',
        note: 'The key looks wrong.',
        app,
        contentReviewed: 'Oct 2026',
        ref: 'R-7K2Q',
      }),
      buildFeedbackEmail({ kind: 'idea', message: 'More diagrams please.', certName: 'CISA', app, from: 'Help' }),
      buildSupportEmail({ topic: 'backup', certName: 'CISA', app, from: 'Common questions' }),
    ];
    for (const e of emails) {
      const all = `${e.subject}\n${e.body}`;
      expect(all).not.toContain(NAME);
      expect(all).not.toContain('Zyxwvut');
      expect(all).toMatch(/KaiSip/);
    }
    expect(emails[0].body).toContain('Hi KaiSip team,');
    expect(emails[0].subject).toMatch(/^KaiSip · Report · /);
    expect(emails[1].subject).toMatch(/^KaiSip · Feedback · /);
    expect(emails[2].subject).toMatch(/^KaiSip · Support · /);
  });

  it('is not on a share card or in its caption (they carry no learner data at all)', () => {
    useSettings.setState({ displayName: NAME });
    const cisa = getCertification('cisa')!;
    const t = badgeCardText(
      { badge: 'long-memory', name: 'Long Memory', tierLine: 'Lichen · tier 2 of 3', skill: 'Recalled 75 answers a week or more later', set: 'evergreen', status: 'earned', earnedOn: '3 Nov 2026' },
      cisa,
    );
    expect(JSON.stringify(t)).not.toContain('Zyxwvut');
    expect(t.caption).toBe('KaiSip study badge · Earned 3 Nov 2026');
    expect(t.message).toContain('study badge from KaiSip');
  });

  // The strongest guard: only the files that must read the name do. A new
  // file that reads it (an email, a share card, a log) fails here until it is
  // looked at on purpose and added to this list.
  it('is read by a short list of files only', () => {
    const allowed = new Set([
      'app/(tabs)/home.tsx', // the greeting
      'app/(tabs)/you.tsx', // mobile 1.44: "Your study profile" (the only other place the name shows)
      'app/onboarding.tsx', // the optional step
      'app/settings.tsx', // Your name
      'components/beta.tsx', // mobile 1.41: Today's one name ask (onboarding no longer asks)
      'components/displayName.tsx', // the text field
      'engine/backup.ts', // the learner's own backup file
      'engine/displayName.ts', // the one rule
      'engine/studyProfile.ts', // mobile 1.44: the profile block's words (cleans the name again)
      'engine/syncMerge.ts', // listed as device-only
      'engine/webImport.ts', // mobile 1.44: the website file's name, read as hostile text, add-only
      'lib/backup.ts', // restore
      'lib/webImport.ts', // mobile 1.44: sets the website's name only when this phone has none
      'components/webImport.tsx', // mobile 1.44: "Your name: Maya" in the confirm sheet (on this phone only)
      'store/settings.ts', // the store
    ]);
    const root = join(__dirname, '..');
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) {
          if (f !== '__tests__' && f !== 'generated') walk(p);
        } else if (/\.tsx?$/.test(f) && /displayName|DisplayName|cleanDisplayName/.test(readFileSync(p, 'utf8'))) {
          found.push(p.slice(root.length + 1).split('\\').join('/'));
        }
      }
    };
    walk(root);
    expect(found.filter((f) => !allowed.has(f))).toEqual([]);
  });
});
