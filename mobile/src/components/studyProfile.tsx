/**
 * "Your study profile" (mobile 1.44, the owner's "Version 3"): the first block
 * on You, and the leaf-shaped initial it uses.
 *
 * Plain English for the founder:
 * - `LeafAvatar`: Grove's leaf mark (the answer screen's verdict leaf: a
 *   circle with its top-right corner squared) with the learner's initial in
 *   Fraunces. Without a name, a soft leaf with the person glyph. The owner
 *   chose to keep it (26 Oct 2026). It is decoration only: screen readers skip it.
 * - `StudyProfile`: the name (or "Your study profile" and an "Add your name"
 *   line), "Studying for CISA since 26 Oct", "Exam 14 Feb · about 20 min most
 *   days" and "Started with: …". Every word comes from engine/studyProfile.ts.
 * - The whole block is ONE button. It opens Settings → Your name (the same
 *   editor, never a second one), and screen readers hear it as one sentence.
 * - It sits on the paper, no card (an L1 summary, nothing to choose between),
 *   with a hairline under it, and it wraps at 200% text.
 */
import { memo } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { PROFILE_ADD_NAME, type ProfileLines } from '../engine/studyProfile';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ChevronRight, ICON_STROKE, UserRound } from './icons';
import { AnimatedPressable, usePressScale } from './motion';
import { T } from './ui';

/** The leaf mark with an initial (or the person glyph). Decorative: hidden from screen readers. */
export function LeafAvatar({ initial, size = 56 }: { initial: string; size?: number }) {
  const { c } = useTheme();
  const named = initial !== '';
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size} height={size} viewBox="0 0 38 38" style={{ position: 'absolute' }}>
        <Path d="M35.5 2.5V19A16.5 16.5 0 1 1 19 2.5z" fill={named ? c.forest : c.soft} />
        {/* A short sap midrib from the squared corner, like the Kasama leaf. */}
        {named && <Path d="M33 5 L27.5 10.5" stroke={c.sap} strokeWidth={1.6} strokeLinecap="round" />}
      </Svg>
      {named ? (
        // Text inside a fixed-size picture does not grow with the phone's text size (the block's label says it all).
        <T v={size >= 48 ? 'hero' : 'label'} color={c.onForest} maxFontSizeMultiplier={1} style={{ marginTop: size * 0.04 }}>
          {initial}
        </T>
      ) : (
        // In a View, so the glyph is drawn over the leaf on the web too (a bare svg sits under an absolute one).
        <View>
          <UserRound size={Math.round(size * 0.42)} color={c.accentText} strokeWidth={ICON_STROKE} />
        </View>
      )}
    </View>
  );
}

/** Memoised: You re-renders on every answer, but these words rarely change (the perf-tabs render budget). */
export const StudyProfile = memo(function StudyProfile({ lines, initial, onPress }: { lines: ProfileLines; initial: string; onPress: () => void }) {
  const { c } = useTheme();
  const press = usePressScale({ scale: 1, tint: c.soft, tintRadius: radius.md });
  const named = lines.name !== '';
  return (
    <AnimatedPressable
      testID="study-profile"
      accessibilityRole="button"
      accessibilityLabel={lines.spoken}
      accessibilityHint={named ? 'Opens Settings to change or clear your name' : 'Opens Settings to add your name'}
      onPress={() => {
        // Back to rest at once: this opens another screen (the 1.43 gear fix).
        press.settle();
        onPress();
      }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[{ flexDirection: 'row', alignItems: 'flex-start', gap: space.lg, paddingVertical: space.md, borderRadius: radius.md }, press.style]}
    >
      {press.layer}
      <LeafAvatar initial={initial} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="headline">{lines.title}</T>
        <T v="body" style={{ marginTop: 2 }}>{lines.since}</T>
        {lines.plan && <T v="meta" style={{ marginTop: 2 }}>{lines.plan}</T>}
        {lines.started && <T v="meta" style={{ marginTop: 2 }}>{lines.started}</T>}
        {/* No name: the row's action, in link colour (the whole row is the button). */}
        {!named && <T v="label" color={c.accentText} style={{ marginTop: space.md }}>{PROFILE_ADD_NAME}</T>}
      </View>
      <View style={{ alignSelf: 'center' }}>
        <ChevronRight size={18} color={c.muted} strokeWidth={ICON_STROKE} />
      </View>
    </AnimatedPressable>
  );
});
