/**
 * Release bug hunt round 1: TalkBack must never read a glyph by its Unicode name.
 * - Every Button whose visible label ends in "›" has a spoken name without it (two badge-case
 *   links, "See game levels ›" and "See it in your badges ›", had none).
 * - The mock navigator's legend ("● answered · ○ not answered · ⚑ flagged") is spoken in words.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { resultsKey, resultsKeySpoken } from '../app/results';
import SessionScreen from '../app/session';
import { KeyCaption } from '../components/fieldguide';
import { WHATS_NEW } from '../content/support';
import { startMock } from '../lib/sessions';
import { useSession } from '../store/session';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.tsx') ? [p] : [];
  });

describe('no glyph read aloud', () => {
  it('every Button labelled with "›" has a spoken name without the glyph', () => {
    const missing: string[] = [];
    for (const f of [...files(join(__dirname, '..', 'app')), ...files(join(__dirname, '..', 'components'))]) {
      const src = readFileSync(f, 'utf8');
      for (let i = src.indexOf('<Button'); i >= 0; i = src.indexOf('<Button', i + 1)) {
        const tag = src.slice(i, src.indexOf('/>', i));
        const label = /\blabel=(?:"([^"]*)"|\{`([^`]*)`\})/.exec(tag);
        if (!label || !(label[1] ?? label[2]).includes('›')) continue;
        const spoken = /\baccessibilityLabel=(?:"([^"]*)"|\{([^}]*)\})/.exec(tag);
        if (!spoken || (spoken[1] ?? spoken[2]).includes('›')) missing.push(`${f.split('src')[1]}: ${label[1] ?? label[2]}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('the mock navigator legend is spoken in words', () => {
    jest.useFakeTimers();
    useSession.getState().clear();
    startMock('cisa', 10);
    let r: ReactTestRenderer | undefined;
    act(() => {
      r = create(<SessionScreen />);
    });
    const nav = r!.root.findAll((x) => typeof x.props.onPress === 'function' && x.props.accessibilityLabel === 'Questions, question navigator')[0];
    act(() => nav.props.onPress());
    const legend = r!.root.findAll((x) => x.props.accessibilityLabel === 'Filled means answered, empty means not answered, a flag means flagged');
    expect(legend.length).toBeGreaterThan(0);
    act(() => r!.unmount());
    jest.useRealTimers();
  });

  // Release bug hunt round 2: the chart keys on You and Results said "upwards arrow", and a What's new
  // entry said "midline horizontal ellipsis".
  it('a chart key with a glyph is spoken in words; the visible key keeps its glyph', () => {
    const plain = (s: string) => !/[↑↓⋯]/.test(s);
    for (const mock of [false, true]) {
      expect(resultsKey(mock)).toContain('↑');
      expect(plain(resultsKeySpoken(mock))).toBe(true);
    }
    let r: ReactTestRenderer | undefined;
    act(() => {
      r = create(<KeyCaption label="KEY" spoken={resultsKeySpoken(true)}>{resultsKey(true)}</KeyCaption>);
    });
    const stop = r!.root.findAll((x) => typeof x.type === 'string' && typeof x.props.accessibilityLabel === 'string')[0];
    expect(stop.props.accessibilityLabel).toBe(`Key: ${resultsKeySpoken(true)}`);
    act(() => r!.unmount());
  });

  it('every KeyCaption showing a glyph key passes a spoken version', () => {
    const missing: string[] = [];
    for (const f of [...files(join(__dirname, '..', 'app')), ...files(join(__dirname, '..', 'components'))]) {
      const src = readFileSync(f, 'utf8');
      for (let i = src.indexOf('<KeyCaption'); i >= 0; i = src.indexOf('<KeyCaption', i + 1)) {
        const tag = src.slice(i, src.indexOf('</KeyCaption>', i));
        if (/resultsKey\(|[↑↓⋯]/.test(tag) && !/\bspoken=/.test(tag)) missing.push(f.split('src')[1]);
      }
    }
    expect(missing).toEqual([]);
  });

  it('no What\'s new line reads a glyph by its name', () => {
    const lines = WHATS_NEW.flatMap((e) => Object.values(e).flatMap((v) => (Array.isArray(v) ? v : [])) as string[]);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.filter((l) => /[↑↓⋯]/.test(l))).toEqual([]);
  });
});
