/**
 * Static skeletons: quiet grey shapes that hold a list's place while it loads
 * (premium pass, mobile 1.49), in place of a blank screen or a spinner.
 *
 * The approach is adapted from Bluesky's social-app `src/components/Skeleton.tsx`
 * (https://github.com/bluesky-social/social-app, MIT licence, © Bluesky PBC).
 * This file is written fresh for KaiSip's Grove tokens; no code is copied.
 * What we took from it:
 * - A text bar is sized from the REAL text style: `lineHeight × 0.7` tall with
 *   `lineHeight × 0.15` above and below, so it takes exactly the room the text
 *   will. Nothing jumps when the content arrives.
 * - No shimmer and no pulse. A plain `soft` fill, corners `radius.sm`.
 *   Nothing moves, so Reduce Motion has nothing to undo (and NN/g notes that
 *   animated skeletons can distract and cause accessibility problems).
 *
 * Plain English:
 * - `<Skeleton>` waits 300 ms before it shows anything, so a fast load flashes
 *   nothing at all.
 * - Screen readers: the shapes are hidden; the container is one stop that says
 *   "Loading" and is marked busy. Only the finished content is read.
 * - `ListSkeleton` draws rows shaped like `ListRow` (icon circle, title,
 *   subtitle, hairline), for lists such as the feedback board.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { View, type DimensionValue } from 'react-native';
import { maxScale, radius, space, type, type TypeVariant } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { useFontScale } from './ui';

/** Nothing shows for this long: a load faster than this flashes no placeholder (NN/g: no indicator under ~1 s). */
export const SKELETON_DELAY_MS = 300;

/** The bar for one line of `v` text, at the text's own (capped) font scale: [bar height, gap above and below]. */
export function textBar(v: TypeVariant, fontScale: number): { height: number; pad: number } {
  const line = (type[v].lineHeight ?? type[v].fontSize ?? 16) * Math.min(Math.max(fontScale, 1), maxScale[v]);
  return { height: Math.round(line * 0.7), pad: Math.round(line * 0.15) };
}

/** One or more lines of `v` text. The last line is shorter, as a paragraph's is. */
export function SkelText({ v = 'body', width = '100%', lines = 1 }: { v?: TypeVariant; width?: DimensionValue; lines?: number }) {
  const { c } = useTheme();
  const { height, pad } = textBar(v, useFontScale());
  return (
    <View>
      {Array.from({ length: lines }, (_, i) => (
        <View key={i} style={{ paddingVertical: pad }}>
          <View style={{ height, width: lines > 1 && i === lines - 1 ? '62%' : width, borderRadius: radius.sm, backgroundColor: c.soft }} />
        </View>
      ))}
    </View>
  );
}

/** A plain block (an option plate, a card). */
export function SkelBlock({ height, width = '100%', corner = radius.sm }: { height: number; width?: DimensionValue; corner?: number }) {
  const { c } = useTheme();
  return <View style={{ height, width, borderRadius: corner, backgroundColor: c.soft }} />;
}

/** A circle (a row's icon disc, an avatar). */
export function SkelCircle({ size }: { size: number }) {
  const { c } = useTheme();
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.soft }} />;
}

/**
 * The container: shows its shapes after SKELETON_DELAY_MS, hides them from
 * screen readers, and is one "Loading" stop marked busy.
 */
export function Skeleton({ children, label = 'Loading' }: { children: ReactNode; label?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), SKELETON_DELAY_MS);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <View testID="skeleton" accessible accessibilityLabel={label} accessibilityState={{ busy: true }}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {children}
      </View>
    </View>
  );
}

/** A loading list: `rows` SkelRows inside one Skeleton (the 300 ms wait, the "Loading" stop). */
export function ListSkeleton({ rows = 4, label }: { rows?: number; label?: string }) {
  return (
    <Skeleton label={label}>
      <SkelRows rows={rows} />
    </Skeleton>
  );
}

/** `rows` bare list rows shaped like ListRow (a 40pt icon disc, a title and a subtitle line, a hairline between), for use inside a Skeleton. */
export function SkelRows({ rows = 4 }: { rows?: number }) {
  const { c } = useTheme();
  // Uneven widths, so the shapes read as text, not as a grid of bars.
  const widths: DimensionValue[] = ['72%', '58%', '80%', '64%', '70%'];
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            minHeight: 64,
            paddingVertical: space.md,
            borderBottomWidth: i === rows - 1 ? 0 : 1,
            borderBottomColor: c.line,
          }}
        >
          <SkelCircle size={40} />
          <View style={{ flex: 1 }}>
            <SkelText v="label" width={widths[i % widths.length]} />
            <SkelText v="meta" width="44%" />
          </View>
        </View>
      ))}
    </>
  );
}
