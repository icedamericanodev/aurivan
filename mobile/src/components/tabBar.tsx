/**
 * The floating tab bar (Grove Phase 1, design-notes/grove/GROVE_HANDOFF.md section 6.1,
 * decisions 4 and 5 in design-notes/grove/DECISIONS.md).
 *
 * Plain English: the four tabs (Today, Learn, Practice, You) sit on one rounded bar that
 * floats 16pt above the bottom of the screen. Every tab shows its word under its icon
 * (the owner's choice: icons alone are guessed at, a word is learned once) and the four
 * share the width equally. The current tab has a soft green pill behind its icon, and its
 * word is in ink, so the state is never shown by colour alone.
 *
 * - In dark mode the pill alone is only 1.89:1 on the bar, so it carries a sap outline
 *   (10:1). With the phone's high contrast setting on (Android "High contrast text", iOS
 *   "Increase contrast") the outline shows in light mode too.
 * - Every tab is at least 48pt tall. Larger text makes the bar taller instead of cutting a
 *   word off (the word is capped at x1.2, like every tab label).
 * - The bar hides while the keyboard is up, so it never rides on top of it.
 * - Only the pill fades when the tab changes (120 ms); under Reduce Motion it just appears.
 *
 * The navigator itself (routing, tab press events, the scene fade) is Expo Router's; this
 * file only draws the bar (the `tabBar` prop of Tabs, expo-router SDK 58).
 */
import { memo, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Keyboard, Platform, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { grovePlate, groveRadius, navShadow } from '../theme/grove';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { AnimatedPressable, FadeIn, useMotion } from './motion';
import { TabHeightContext } from './tabSpace';
import { ICON_SIZE, T } from './ui';

export { TabHeightContext, TabSpaceContext } from './tabSpace';

/** The bar's measures (the kit's floating bar, phone sized). */
export const TAB_BAR = {
  height: 64, // the least height (kit); larger text makes it taller
  item: 48, // each tab's least height (the touch target)
  pad: 8, // inside the bar
  gap: 4, // between tabs
  side: 16, // from the screen's left and right edges, plus the side insets
  floor: 16, // the least space under the bar (the kit's 16 with no inset)
  lift: 8, // above the bottom safe-area inset
  maxWidth: 520, // wide windows (tablets, the web export): the bar stays phone sized, centred
  pillW: 52, // the current tab's pill, behind its icon (the web's 52 by 30)
  pillH: 30,
} as const;

/**
 * Space under the bar. With a home indicator (34pt) or a gesture bar (24pt) a further 16
 * would float the bar too high, so it sits 8pt above the inset; with no inset, the kit's 16.
 */
export const tabBarBottom = (insetBottom: number) => Math.max(TAB_BAR.floor, insetBottom + TAB_BAR.lift);
/** What the bar covers at the bottom of the screen: its height and the space under it. */
export const tabBarSpace = (insetBottom: number, height: number = TAB_BAR.height) => height + tabBarBottom(insetBottom);


/**
 * The bar's lift: a soft boxShadow, except Android 7 and 8 (API under 28), which draw no
 * outset boxShadow, so the bar takes elevation there (the cardLiftFor pattern).
 */
export function navLiftFor(os: string, version: string | number, isDark: boolean): ViewStyle {
  if (os === 'android' && Number(version) < 28) return { elevation: 8 };
  return { boxShadow: isDark ? navShadow.dark : navShadow.light };
}

/**
 * The phone's high contrast setting: Android "High contrast text", iOS "Increase contrast".
 * Read once and followed live. False where the platform has no such setting (or in tests).
 */
export function useHighContrast(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    const ios = Platform.OS === 'ios';
    const read = ios ? AccessibilityInfo.isDarkerSystemColorsEnabled : AccessibilityInfo.isHighTextContrastEnabled;
    if (Platform.OS === 'web' || typeof read !== 'function') return;
    read()
      .then((v) => alive && setOn(Boolean(v)))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.(ios ? 'darkerSystemColorsChanged' : 'highTextContrastChanged', (v: boolean) => setOn(Boolean(v)));
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);
  return on;
}

/** True while the on-screen keyboard is up (never on the web, where there is none to hide behind). */
export function useKeyboardUp(): boolean {
  const [up, setUp] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const show = Keyboard.addListener('keyboardDidShow', () => setUp(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return up;
}

/** The current tab's outline colour: sap in dark (the pill alone is 1.89:1), ink in light with high contrast, else none. */
export function pillEdge(isDark: boolean, highContrast: boolean, c: { sap: string; ink: string }): string {
  if (isDark) return c.sap;
  return highContrast ? c.ink : 'transparent';
}

interface ItemProps {
  label: string;
  spoken: string;
  focused: boolean;
  icon: (p: { focused: boolean; color: string; size: number }) => ReactNode;
  onPress: () => void;
  onLongPress: () => void;
  testID?: string;
}

/** One tab: the icon (with the pill behind it when current) over its word. */
const TabItem = memo(function TabItem({ label, spoken, focused, icon, onPress, onLongPress, testID }: ItemProps) {
  const { c, isDark } = useTheme();
  const { reduced } = useMotion();
  const hc = useHighContrast();
  const iconColor = focused ? c.sap : c.muted;
  return (
    <AnimatedPressable
      testID={testID}
      role="tab"
      accessibilityRole="tab"
      aria-selected={focused}
      accessibilityState={{ selected: focused }}
      accessibilityLabel={spoken}
      // iOS Large Content Viewer: with very large text, a long press shows the tab's name enlarged.
      accessibilityShowsLargeContentViewer
      accessibilityLargeContentTitle={label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={{ flex: 1, minWidth: 0, minHeight: TAB_BAR.item, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: groveRadius.tile }}
    >
      <View style={{ width: TAB_BAR.pillW, height: TAB_BAR.pillH, alignItems: 'center', justifyContent: 'center' }}>
        {focused && (
          // The pill fades in (120 ms) when its tab becomes current; under Reduce Motion it is just there.
          <FadeIn rise={false} dur="select" play={!reduced} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <View
              testID="tab-pill"
              style={{
                flex: 1,
                borderRadius: TAB_BAR.pillH / 2,
                backgroundColor: c.forestTrack,
                borderWidth: 1.5,
                borderColor: pillEdge(isDark, hc, c),
              }}
            />
          </FadeIn>
        )}
        {/* Its own layer above the pill (on the web a positioned pill would otherwise paint over a bare icon). */}
        <View style={{ zIndex: 1 }}>{icon({ focused, color: iconColor, size: ICON_SIZE.row + 2 })}</View>
      </View>
      <T v="tab" color={focused ? c.ink : c.muted} numberOfLines={1} center>
        {label}
      </T>
    </AnimatedPressable>
  );
});

/**
 * The bar Expo Router draws in place of its own (Tabs `tabBar`). Absolutely placed, so the
 * scenes keep the whole screen and scroll under it; each tab screen pads its end by
 * TabSpaceContext (components/ui.tsx Screen).
 */
export function FloatingTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { c, g, isDark } = useTheme();
  const keyboard = useKeyboardUp();
  const report = useContext(TabHeightContext);
  const onLayout = useCallback((e: LayoutChangeEvent) => report(Math.round(e.nativeEvent.layout.height)), [report]);
  if (keyboard) return null;
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: TAB_BAR.side + insets.left, right: TAB_BAR.side + insets.right, bottom: tabBarBottom(insets.bottom), alignItems: 'center' }}
    >
      <View
        testID="tab-bar"
        role="tablist"
        accessibilityRole="tablist"
        onLayout={onLayout}
        style={[
          {
            width: '100%',
            maxWidth: TAB_BAR.maxWidth,
            minHeight: TAB_BAR.height,
            padding: TAB_BAR.pad,
            gap: TAB_BAR.gap,
            flexDirection: 'row',
            alignItems: 'stretch',
            borderRadius: groveRadius.bar,
            backgroundColor: g.navFloat,
            borderWidth: grovePlate.edge,
            borderColor: c.line,
          },
          navLiftFor(Platform.OS, Platform.Version, isDark),
        ]}
      >
        {state.routes.map((route, index) => {
          const focused = index === state.index;
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const tabIcon = options.tabBarIcon;
          return (
            <TabItem
              key={route.key}
              testID={`tab-${route.name}`}
              label={label}
              spoken={options.tabBarAccessibilityLabel ?? label}
              focused={focused}
              icon={({ focused: f, color, size }) => (tabIcon ? tabIcon({ focused: f, color, size }) : null)}
              onPress={() => {
                // The navigator's contract: a press can be prevented; the current tab is never navigated to again.
                const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) navigateToTab(route.key);
              }}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
            />
          );
        })}
      </View>
    </View>
  );
}

/** Space between the bar and the last thing on a tab screen. */
export const TAB_END_ROOM = space.xl;
