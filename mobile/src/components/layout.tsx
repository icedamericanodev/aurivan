/**
 * Large screens (mobile 2.2): tablets, foldables, Chromebooks and tablets held
 * sideways.
 *
 * WHY: phones stay portrait, but since Android 16 a tablet ignores the app's
 * portrait lock (targetSdk 36, smallest width 600dp or more), so the app can
 * open 1280pt wide. Stretched edge to edge, a question ran ~1250pt per line and
 * buttons were as wide as the screen. Grove's rule (DESIGN_SYSTEM.md §2) is
 * "never wider on tablets (cap content at 560)".
 *
 * HOW (one place, not every screen):
 *   - `ContentColumn` wraps the whole screen stack in app/_layout.tsx: every
 *     screen draws inside a centred column at most COLUMN_MAX wide. The paper
 *     colour fills the sides, so it reads as one page.
 *   - Pop-up sheets (React Native `Modal`) draw over the whole window, outside
 *     that column, so each wraps its content in `ContentColumn` too.
 *   - A component that sizes itself from the screen width uses
 *     `useContentWidth()` instead of `useWindowDimensions().width`, so it sizes
 *     to the column, not the window.
 *
 * On a phone (narrower than COLUMN_MAX) none of this changes anything: the
 * column is the whole screen and useContentWidth() is the window width.
 */
import { type ReactNode } from 'react';
import { useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { space } from '../theme/tokens';

/** The widest a text block or card gets: the reading measure (Grove §2). */
export const CONTENT_MAX = 560;
/** The widest a screen gets: the reading measure plus the two side gutters. */
export const COLUMN_MAX = CONTENT_MAX + space.gutter * 2;

/** The screen column's width for a window this wide (pure, for tests). */
export const columnWidth = (windowWidth: number): number => Math.min(windowWidth, COLUMN_MAX);

/**
 * The width a screen's content has: the window on a phone, the centred column
 * on a tablet. Use it wherever a component used `useWindowDimensions().width`.
 */
export function useContentWidth(): number {
  return columnWidth(useWindowDimensions().width);
}

/**
 * A centred column at most COLUMN_MAX wide that fills the height. `bg` paints
 * the full width behind it (a sheet's own colour); leave it out when the
 * parent already has the colour. Clipped, so a screen's push animation never
 * slides across the side margins.
 */
export function ContentColumn({ children, bg, style }: { children: ReactNode; bg?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View testID="content-column" style={[{ flex: 1, width: '100%', maxWidth: COLUMN_MAX, alignSelf: 'center', overflow: 'hidden' }, style]}>
        {children}
      </View>
    </View>
  );
}
