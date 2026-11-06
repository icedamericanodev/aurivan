/**
 * Release bug hunt round 1: Today's readiness ring rebuilt its 50 ticks (51 SVG lines with fresh
 * transform strings) on every render, and Today redraws each time it gains or loses focus, so a
 * lap through the tabs redrew about 100 SVG elements more than it needed to. The marks are now
 * built once per look (useMemo on mode, dots, range and theme).
 *
 * Counts components that rendered (jest/perf/renderCounter.ts), never milliseconds.
 */
// MUST load before react-test-renderer (React reads the devtools hook once).
import { renderNames, resetRenders } from '../../jest/perf/renderCounter';
import { Profiler } from 'react';
import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ReadinessRing } from '../components/groveToday';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});

const plant = <Text>plant</Text>;
function Host({ low, high, n = 0 }: { low: number; high: number; n?: number }) {
  return (
    <Profiler id="ring" onRender={() => {}}>
      <Text>{n}</Text>
      <ReadinessRing mode="ticks" on={0} low={low} high={high} size={200}>
        {plant}
      </ReadinessRing>
    </Profiler>
  );
}

let r: ReactTestRenderer | undefined;
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});

describe('the readiness ring', () => {
  it('a redraw of Today (same range) does not rebuild the ticks', () => {
    act(() => {
      r = create(<Host low={55} high={68} />);
    });
    resetRenders({ names: true });
    act(() => r!.update(<Host low={55} high={68} n={1} />));
    const names = renderNames().ring ?? {};
    expect(names.ReadinessRing).toBe(1);
    expect(names.Line ?? 0).toBe(0);
    // Each Svg draws its own root group; the tick groups themselves are skipped.
    expect(names.G ?? 0).toBeLessThanOrEqual(names.Svg ?? 0);
  });

  it('a new range still redraws its ticks (what the ring shows is unchanged)', () => {
    act(() => {
      r = create(<Host low={55} high={68} />);
    });
    const lit = () => r!.root.findAll((n) => n.props.testID === 'ring-ticks')[0].findAll((n) => typeof n.props.stroke === 'string' && n.props.x1 === 100).length;
    const before = lit();
    act(() => r!.update(<Host low={70} high={80} />));
    expect(lit()).toBeGreaterThan(before);
  });
});
