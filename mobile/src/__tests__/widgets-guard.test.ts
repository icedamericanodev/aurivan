/**
 * Mobile 1.47, home-screen widgets: source guards.
 *
 * - The widget library loads ONLY from `.android.ts(x)` files (it has a native
 *   part iOS, the web and Expo Go don't have).
 * - The widget's background code (src/widgets/*) never imports a store or the
 *   learner's name rule: it draws from the small snapshot only, so it can
 *   never load (or save over) the progress stores in the background.
 * - No widget file reads the learner's own name (the display-name guard in
 *   display-name.test.ts covers this too; widget files are not on its list).
 * - Nothing in the widget path talks to the network.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');
const mobile = join(root, '..');
function files(dir: string): string[] {
  const out: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) {
      if (f !== '__tests__' && f !== 'generated' && f !== 'node_modules') out.push(...files(p));
    } else if (/\.tsx?$/.test(f)) out.push(p);
  }
  return out;
}
const rel = (p: string) => p.slice(mobile.length + 1).split('\\').join('/');

describe('widget source guards', () => {
  it('the widget library is imported only from .android files', () => {
    const offenders = [...files(root), join(mobile, 'index.ts')]
      .filter((p) => /from 'react-native-android-widget'|require\('react-native-android-widget/.test(readFileSync(p, 'utf8')))
      .map(rel)
      .filter((p) => !/\.android\.tsx?$/.test(p));
    expect(offenders).toEqual([]);
  });

  it('the background widget code imports no store, no lib and no name rule', () => {
    const widgetFiles = files(join(root, 'widgets'));
    expect(widgetFiles.length).toBeGreaterThanOrEqual(6);
    for (const p of widgetFiles) {
      const src = readFileSync(p, 'utf8');
      const imports = [...src.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
      for (const i of imports) {
        expect([rel(p), i]).not.toEqual([rel(p), expect.stringMatching(/\/store\/|\/lib\/|displayName|\/cloud\/|expo-router/)]);
      }
    }
  });

  it('no widget file mentions the learner’s own name, the network or analytics', () => {
    const paths = [...files(join(root, 'widgets')), join(root, 'engine/widgets.ts'), join(root, 'lib/widgetData.ts'), join(root, 'lib/widgets.android.ts'), join(root, 'lib/widgetOpen.ts'), join(root, 'store/widgets.ts'), join(root, 'lib/widgetStats.ts'), join(root, 'engine/widgetTester.ts'), join(root, 'components/widgetConfig.android.tsx'), join(root, 'components/widgetSettings.tsx')];
    for (const p of paths) {
      const src = readFileSync(p, 'utf8');
      expect([rel(p), /displayName|DisplayName|greetingWithName/.test(src)]).toEqual([rel(p), false]);
      expect([rel(p), /\bfetch\(|XMLHttpRequest|https?:\/\/(?!schemas)|analytics|sentry/i.test(src.replace(/http:\/\/www\.w3\.org\/2000\/svg/g, ''))]).toEqual([rel(p), false]);
    }
  });

  it('the app entry is Expo Router’s, plus the widget registration', () => {
    const entry = readFileSync(join(mobile, 'index.ts'), 'utf8');
    expect(entry).toMatch(/import 'expo-router\/entry';/);
    expect(entry).toMatch(/import '\.\/src\/widgets\/register';/);
    expect(entry).toMatch(/import '\.\/src\/components\/widgetConfig';/);
    const pkg = JSON.parse(readFileSync(join(mobile, 'package.json'), 'utf8'));
    expect(pkg.main).toBe('index.ts');
  });

  it('app.json declares every widget kind once, with the 3-hour refresh, and the fonts the layouts use', () => {
    const app = JSON.parse(readFileSync(join(mobile, 'app.json'), 'utf8'));
    const entry = app.expo.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'react-native-android-widget');
    expect(entry).toBeTruthy();
    const { widgets, fonts } = entry[1];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { WIDGET_NAMES } = require('../engine/widgets');
    expect(widgets.map((w: { name: string }) => w.name).sort()).toEqual(Object.values(WIDGET_NAMES).sort());
    for (const w of widgets) {
      expect(w.updatePeriodMillis).toBe(3 * 60 * 60 * 1000);
      expect(w.widgetCategory ?? 'home_screen').toBe('home_screen');
      expect(statSync(join(mobile, w.previewImage)).size).toBeGreaterThan(1000);
      expect(statSync(join(mobile, w.previewImage)).size).toBeLessThan(60_000);
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { WIDGET_FONTS } = require('../widgets/art');
    const bundled = fonts.map((f: string) => f.split('/').pop()!.replace('.ttf', ''));
    for (const name of Object.values(WIDGET_FONTS)) expect(bundled).toContain(name);
  });

  it('the picker: plain names and descriptions (no designer notes), a preview per kind, recommended first', () => {
    const app = JSON.parse(readFileSync(join(mobile, 'app.json'), 'utf8'));
    const { widgets } = app.expo.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'react-native-android-widget')[1];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { WIDGET_KINDS, WIDGET_NAMES, WIDGET_TITLES } = require('../engine/widgets');
    expect(widgets.map((w: { name: string }) => w.name)).toEqual(WIDGET_KINDS.map((k: string) => WIDGET_NAMES[k]));
    for (const k of WIDGET_KINDS) {
      const w = widgets.find((x: { name: string }) => x.name === WIDGET_NAMES[k]);
      expect(w.label).toBe(WIDGET_TITLES[k]);
      expect(w.previewImage).toBe(`./assets/widgets/${k}.png`);
      expect(w.description.length).toBeLessThanOrEqual(70);
      expect(`${w.label} ${w.description}`).not.toMatch(/never the date|no streak to lose|Reviews|came back|Think first|\bpass\b|guarantee|you're ready/i);
    }
  });

  it('adding Readiness or Exam countdown opens the choose screen (and only those two)', () => {
    const app = JSON.parse(readFileSync(join(mobile, 'app.json'), 'utf8'));
    const { widgets } = app.expo.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'react-native-android-widget')[1];
    const configurable = widgets.filter((w: { widgetFeatures?: string }) => w.widgetFeatures).map((w: { name: string }) => w.name);
    expect(configurable.sort()).toEqual(['ExamCountdown', 'Readiness']);
    // Not "configuration_optional": the choose screen must open when the widget is added.
    for (const w of widgets) if (w.widgetFeatures) expect(w.widgetFeatures).toBe('reconfigurable');
  });

  it('Auto Backup leaves out the widget library’s pictures and sizes (and nothing else)', () => {
    const app = JSON.parse(readFileSync(join(mobile, 'app.json'), 'utf8'));
    expect(app.expo.plugins).toContain('./plugins/withWidgetBackupRules');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const plugin = require('../../plugins/withWidgetBackupRules');
    const backup = plugin.backupXml('com.kaisip.app');
    const transfer = plugin.extractionXml('com.kaisip.app');
    for (const xml of [backup, transfer]) {
      expect(xml).toContain('<exclude domain="file" path="widget_images/" />');
      expect(xml).toContain('<exclude domain="sharedpref" path="com.kaisip.app.WIDGET_SIZES.xml" />');
      expect(xml).not.toContain('<include');
    }
    expect(transfer).toContain('<cloud-backup>');
    expect(transfer).toContain('<device-transfer>');
  });
});
