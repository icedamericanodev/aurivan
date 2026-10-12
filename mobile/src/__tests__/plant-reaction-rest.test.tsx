/**
 * PR #44 code review M2 (probe P1): a reaction cut off mid-way puts the
 * plant back at rest. On a device, cancelAnimation freezes a shared value
 * wherever it is; the plant must never stay lifted or leaning for the rest
 * of the session (Today blurs mid-reaction, Reduce Motion turns on).
 *
 * The shared Reanimated mock lands every animation on its END value, which
 * would hide the bug. Here withSequence returns its FIRST step instead: the
 * reaction "cancelled at its peak". Only this file needs that, so it is on
 * its own.
 */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import { LivePlant, resetPlantReactionsForTest } from '../components/plant/LivePlant';
import { resetCelebrationsForTest, setSystemReducedMotionForTest } from '../components/motion';
import type { GrowthLevel } from '../engine/plant';

jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const real = require('../../jest/reanimated-mock');
  return { ...real, __esModule: true, default: real.default, withSequence: (...a: unknown[]) => a[0] };
});
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({ useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]) }));

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) =>
  act(() => {
    r = create(el);
  });
const plantLayer = () => r!.root.findAll((n) => typeof n.type === 'string' && Array.isArray(n.props.style) && JSON.stringify(n.props.style).includes('transformOrigin'))[0];
const transform = () => {
  const st = (plantLayer().props.style as unknown[]).flat().find((s) => s && typeof s === 'object' && 'transform' in (s as object)) as { transform: Record<string, unknown>[] };
  return Object.assign({}, ...st.transform) as { translateY: number; rotate: string; scaleX: number; scaleY: number };
};
const atRest = () => {
  const t = transform();
  expect(Math.abs(t.translateY)).toBe(0);
  expect(t.rotate).toBe('0deg');
  expect(t.scaleX).toBe(1);
  expect(t.scaleY).toBe(1);
};

beforeEach(() => {
  setMockReducedMotion(false);
  setSystemReducedMotionForTest(false);
  resetCelebrationsForTest();
  resetPlantReactionsForTest();
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});

const props = { testID: 'live', species: 'oak' as const, stage: 4 as GrowthLevel, size: 104, theme: 'light' as const };

describe('a reaction cut off mid-way', () => {
  it.each(['happy', 'proud', 'curious'] as const)('%s: Today blurs at its peak and comes back: the plant is at rest', (mood) => {
    mount(<LivePlant {...props} reaction={{ id: `cisa:${mood}:d`, mood }} />);
    // Caught at the peak (a re-render draws the shared value the effect set), it is off its rest pose.
    act(() => r!.update(<LivePlant {...props} reaction={{ id: `cisa:${mood}:d`, mood }} />));
    expect(JSON.stringify(transform())).not.toBe(JSON.stringify({ translateY: 0, rotate: '0deg', scaleX: 1, scaleY: 1 }));
    // Blur: Today passes no reaction. The cleanup snaps back.
    act(() => r!.update(<LivePlant {...props} reaction={null} />));
    atRest();
    // Focus again, the same occasion: it already played, so nothing runs, and nothing is left over.
    act(() => r!.update(<LivePlant {...props} reaction={{ id: `cisa:${mood}:d`, mood }} />));
    atRest();
  });

  it('Reduce Motion turning on mid-reaction: back at rest at once', () => {
    mount(<LivePlant {...props} reaction={{ id: 'cisa:happy:d', mood: 'happy' }} />);
    act(() => {
      setMockReducedMotion(true);
      setSystemReducedMotionForTest(true);
    });
    act(() => r!.update(<LivePlant {...props} reaction={{ id: 'cisa:happy:d', mood: 'happy' }} />));
    atRest();
  });

  it('happy is a stretch from the base, never a hop (UX review P5): the plant stays rooted', () => {
    mount(<LivePlant {...props} reaction={{ id: 'cisa:happy:peak', mood: 'happy' }} />);
    act(() => r!.update(<LivePlant {...props} reaction={{ id: 'cisa:happy:peak', mood: 'happy' }} />));
    const t = transform();
    expect(Math.abs(t.translateY)).toBe(0);
    expect(t.scaleY).toBeGreaterThan(1);
    expect(t.scaleX).toBeLessThan(1);
  });
});
