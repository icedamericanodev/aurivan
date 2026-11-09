/**
 * RunningHead (Field Guide §21.2): a short line on the left (the date on
 * Today and You, a set's name on Results), one more on the right or one
 * action (You: Settings), over a hairline. Above the screen's title; the
 * title below is the screen's heading, so the head itself is plain text.
 * No book labels (labels decision, 31 Oct 2026): never "Field guide" or
 * "Field record" on screen or in a spoken label.
 *
 * Grove Phase 1: a `boxed` action is the kit's 44pt rounded-square button
 * with its own edge (You's Settings cog); with it the head has no hairline.
 *
 * The hairline is the view's own border, never tied to a text baseline, so it
 * holds at 200% text; there the right side wraps under the left.
 */
import type { ReactNode, Ref } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { groveRadius, grovePlate } from '../../theme/grove';
import { LARGE_TEXT, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { AnimatedPressable, usePressScale } from '../motion';
import { useFontScale } from '../ui';
import { FieldText } from './FieldText';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "Thu 29 Oct", and how it is said: "Thursday 29 October". */
export function headDate(ms: number): { shown: string; spoken: string } {
  const d = new Date(ms);
  return {
    shown: `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`,
    spoken: `${DAYS_LONG[d.getDay()]} ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`,
  };
}

export interface HeadAction {
  label: string;
  onPress: () => void;
  icon?: (color: string) => ReactNode;
  hint?: string;
  /** The icon alone; the label is still its spoken name. */
  compact?: boolean;
  /** The Grove kit's 44pt rounded-square button with its own edge (You's Settings). Icon only; `label` is its spoken name. */
  boxed?: boolean;
}

/** The boxed action's size: the kit's 44pt square, with 2pt of hit slop all round for a 48pt target. */
export const BOXED_ACTION = 44;

export function RunningHead({
  section,
  sectionLabel,
  aside,
  asideLabel,
  action,
  actionRef,
  style,
}: {
  /** The left line ("Sat 31 Oct"); its " · " is said as a comma unless `sectionLabel` says it. */
  section: string;
  /** How the left line is said, when it differs ("Saturday 31 October"). */
  sectionLabel?: string;
  /** Plain words on the right ("Thu 29 Oct"); `asideLabel` is how they are said. */
  aside?: string;
  asideLabel?: string;
  /** One control on the right (You: Settings), at least 48pt to the finger. */
  action?: HeadAction;
  /** The action, for moving screen-reader focus back to it (lib/a11y.ts moveFocus). */
  actionRef?: Ref<View>;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const large = useFontScale() >= LARGE_TEXT;
  const boxed = Boolean(action?.boxed);
  const press = usePressScale({ scale: 1, tint: c.soft, tintRadius: boxed ? groveRadius.square : 24 });
  return (
    <View
      testID="running-head"
      style={[
        {
          flexDirection: 'row',
          flexWrap: large ? 'wrap' : 'nowrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          columnGap: space.md,
          minHeight: action ? 48 : 32,
          paddingBottom: action ? 0 : space.sm,
          // The kit's You header has no rule under it.
          borderBottomWidth: boxed ? 0 : 1,
          borderBottomColor: c.line,
        },
        style,
      ]}
    >
      <FieldText v="head" accessibilityLabel={sectionLabel ?? section.replace(/ · /g, ', ')} style={{ flexShrink: 1 }}>
        {section}
      </FieldText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 }}>
        {aside ? (
          <FieldText v="head" accessibilityLabel={asideLabel}>
            {aside}
          </FieldText>
        ) : null}
        {action && (
          <AnimatedPressable
            ref={actionRef}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityHint={action.hint}
            onPress={() => {
              // It opens another screen: the pressed tint rests at once (the 1.43 gear rule).
              press.settle();
              action.onPress();
            }}
            onPressIn={press.onPressIn}
            onPressOut={press.onPressOut}
            hitSlop={boxed ? 2 : 4}
            style={[
              boxed
                ? {
                    width: BOXED_ACTION,
                    height: BOXED_ACTION,
                    borderRadius: groveRadius.square,
                    backgroundColor: c.raised,
                    borderWidth: grovePlate.edge,
                    borderColor: c.line,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }
                : [{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, minWidth: 48, justifyContent: 'flex-end', paddingHorizontal: space.sm }, large ? { marginLeft: -space.sm } : { marginRight: -space.sm }],
              press.style,
            ]}
          >
            {press.layer}
            {!action.compact && !boxed && (
              <FieldText v="head" color={c.ink}>
                {action.label}
              </FieldText>
            )}
            {action.icon?.(boxed ? c.ink2 : c.ink)}
          </AnimatedPressable>
        )}
      </View>
    </View>
  );
}
