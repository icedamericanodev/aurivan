/**
 * Mobile 1.23: the app is called KaiSip. Nothing a learner can read says
 * "Aurivan" any more, except the few places that exist BECAUSE of the old
 * name: the backup file compatibility, the reserved board names. (Mobile 1.24
 * removed the "Moving from Aurivan?" words from the welcome screen, About,
 * Your data, Help and What's new.) The identifiers that must never change (saved-data
 * keys "aurivan.*", EXPO_PUBLIC_AURIVAN_* variables, __AURIVAN_* globals,
 * the notification ids) are fine anywhere.
 *
 * Also checks the app's identity in app.json and that the old True North
 * logo code is gone (components/brand.tsx draws the Kasama mark only).
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import appJson from '../../app.json';
import * as brand from '../components/brand';
import { NOT_AFFILIATED } from '../components/help';

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

const SRC = join(__dirname, '..');
/** Where the old name may appear in words or code, and why. */
const ALLOWED_FILES: Record<string, string> = {
  'engine/backup.ts': 'old backups (marker "aurivan", file name "aurivan-backup") still restore',
  'engine/moderation.ts': '"aurivan" stays a reserved board name',
  'lib/backup.ts': 'cleans up old aurivan-backup files',
  'lib/account.ts': 'cleans up old aurivan-account files',
  'cloud/memory/backend.ts': 'mirrors the server’s export marker',
  'webcloud/config.ts': 'names the website’s saved keys that keep the old name on purpose',
  'webcloud/device.ts': 'reads the website’s exam date, saved as aurivan_exam_date',
};
/** Identifiers that keep their old spelling on purpose. */
const IDENTIFIER = /aurivan\.[A-Za-z]|AURIVAN/;
/** The content pack's lessons are another team's files; they are checked by their own tests. */
const SKIP_DIRS = new Set(['__tests__', 'generated', 'lessons']);

const files: string[] = [];
const walk = (dir: string) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) {
      if (!SKIP_DIRS.has(f)) walk(p);
    } else if (/\.(tsx?|json)$/.test(f)) files.push(p);
  }
};
walk(SRC);
const rel = (p: string) => p.slice(SRC.length + 1).split('\\').join('/');

describe('the old name', () => {
  it('appears only where it has to', () => {
    const stray: string[] = [];
    for (const p of files) {
      if (rel(p) in ALLOWED_FILES) continue;
      readFileSync(p, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (/aurivan/i.test(line) && !IDENTIFIER.test(line)) stray.push(`${rel(p)}:${i + 1}: ${line.trim().slice(0, 100)}`);
        });
    }
    expect(stray).toEqual([]);
  });

  it('the places that may name it are real files', () => {
    const present = new Set(files.map(rel));
    for (const f of Object.keys(ALLOWED_FILES)) expect(present.has(f)).toBe(true);
  });
});

describe('the app’s identity', () => {
  const e = appJson.expo;
  it('is KaiSip, with the new package id and link scheme', () => {
    expect(e.name).toBe('KaiSip');
    expect(e.scheme).toBe('kaisip');
    expect(e.ios.bundleIdentifier).toBe('com.kaisip.app');
    expect(e.android.package).toBe('com.kaisip.app');
    expect(e.ios.infoPlist.NSPhotoLibraryAddUsageDescription).toContain('KaiSip');
    expect(JSON.stringify(e)).not.toMatch(/Aurivan/);
  });

  it('keeps the EAS project, slug and owner (changing them needs a new EAS project)', () => {
    expect(e.slug).toBe('aurivan');
    expect(e.owner).toBe('icedamericanodev');
    expect(e.extra.eas.projectId).toBe('992746e8-946f-49c0-8a95-67e1e80b2272');
  });

  it('the not-affiliated line is the agreed words', () => {
    expect(NOT_AFFILIATED).toBe('KaiSip is independent and not affiliated with or endorsed by ISACA.');
  });
});

describe('the logo code', () => {
  it('only the Kasama mark and lockup are exported (the True North ones are gone)', () => {
    expect(Object.keys(brand).sort()).toEqual(['KAISIP_LOCKUP_RATIO', 'KaisipLockup', 'KaisipMark', 'PillarGlyph', 'PillarList']);
  });
});
