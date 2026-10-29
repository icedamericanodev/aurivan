/**
 * RunningHead (Field Guide §21.2): "Field guide · Today" on the left, the
 * date (or one action, Settings) on the right, over a hairline. On every
 * Field Guide screen, above its title. It says where you are; the title
 * below is the screen's heading, so the head itself is plain text.
 *
 * The hairline is the view's own border, never tied to a text baseline, so it
 * holds at 200% text; there the right side wraps under the left.
 */
import type { ReactNode, Ref } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
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
}

export function RunningHead({
  section,
  aside,
  asideLabel,
  action,
  actionRef,
  style,
}: {
  /** "Field guide · Today": said as "Field guide, Today". */
  section: string;
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
  const press = usePressScale({ scale: 1, tint: c.soft, tintRadius: 24 });
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
          borderBottomWidth: 1,
          borderBottomColor: c.line,
        },
        style,
      ]}
    >
      <FieldText v="head" accessibilityLabel={section.replace(/ · /g, ', ')} style={{ flexShrink: 1 }}>
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
            hitSlop={4}
            style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, minWidth: 48, justifyContent: 'flex-end', paddingHorizontal: space.sm, marginRight: -space.sm }, press.style]}
          >
            {press.layer}
            <FieldText v="head" color={c.ink}>
              {action.label}
            </FieldText>
            {action.icon?.(c.ink)}
          </AnimatedPressable>
        )}
      </View>
    </View>
  );
}
