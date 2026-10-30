/**
 * Mobile 1.49: static skeletons (components/skeleton.tsx, after Bluesky's
 * MIT-licensed approach, written fresh).
 *  - A text bar takes exactly the room the text will: lineHeight × 0.7 tall,
 *    lineHeight × 0.15 above and below, at the text's own capped font scale.
 *  - Nothing shows for the first 300 ms (a fast load flashes nothing).
 *  - Screen readers meet one "Loading" stop marked busy; the shapes are hidden.
 *  - Static: no Reanimated view anywhere in it, so Reduce Motion has nothing to undo.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ListSkeleton, SKELETON_DELAY_MS, textBar } from '../components/skeleton';
import { type } from '../theme/tokens';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});

let r: ReactTestRenderer | undefined;
beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.useRealTimers();
});

describe('textBar: sized from the real type metrics', () => {
  it('a bar 0.7 of the line, with 0.15 of it above and below (the whole line)', () => {
    const line = type.body.lineHeight!;
    const { height, pad } = textBar('body', 1);
    expect(height).toBe(Math.round(line * 0.7));
    expect(pad).toBe(Math.round(line * 0.15));
    expect(Math.abs(height + 2 * pad - line)).toBeLessThanOrEqual(1);
  });

  it('grows with the font scale, up to the variant’s cap, and never below 1×', () => {
    expect(textBar('body', 2).height).toBeGreaterThan(textBar('body', 1).height);
    expect(textBar('hero', 3).height).toBe(textBar('hero', 1.3).height); // titles cap at ×1.3
    expect(textBar('body', 0.8).height).toBe(textBar('body', 1).height);
  });
});

describe('Skeleton', () => {
  it('shows nothing for the first 300 ms, then one busy "Loading" stop with its shapes hidden', () => {
    act(() => {
      r = create(<ListSkeleton rows={3} label="Loading posts" />);
    });
    expect(r!.root.findAll((n) => n.props.testID === 'skeleton')).toHaveLength(0);
    act(() => {
      jest.advanceTimersByTime(SKELETON_DELAY_MS);
    });
    const box = r!.root.findAll((n) => typeof n.type === 'string' && n.props.testID === 'skeleton');
    expect(box).toHaveLength(1);
    expect(box[0].props).toMatchObject({ accessible: true, accessibilityLabel: 'Loading posts', accessibilityState: { busy: true } });
    const hidden = box[0].findAll((n) => n.type === View && n.props.importantForAccessibility === 'no-hide-descendants');
    expect(hidden.length).toBeGreaterThan(0);
    expect(hidden[0].props.accessibilityElementsHidden).toBe(true);
  });

  it('is static: it uses no animation at all (nothing for Reduce Motion to undo)', () => {
    const src = readFileSync(join(__dirname, '..', 'components', 'skeleton.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src).not.toMatch(/react-native-reanimated|Animated|withTiming|withRepeat|LinearGradient/);
  });
});

describe('where lists load', () => {
  it('the feedback board’s list, notices, blocked members and post show a skeleton while loading, not a blank', () => {
    for (const f of ['index.tsx', 'activity.tsx', 'blocked.tsx', '[id].tsx']) {
      const src = readFileSync(join(__dirname, '..', 'app', '(cloud)', 'board', f), 'utf8');
      expect(src).toMatch(/state === 'loading'[^\n]*(ListSkeleton|\(\s*$)/m);
      expect(src).toMatch(/<(ListSkeleton|Skeleton)\b/);
    }
  });
});
