/**
 * KeyList (Field Guide §21.2): numbered rows with dotted leaders, like the
 * key to a plate: "1  ✗ Emergency override payments ········ question 3".
 * For misses and plan steps. The number is italic serif, the leader a
 * dotted `control` rule (drawn, never a dotted border: iOS can't dot one
 * side), and the right-hand words close the row. A row with `onPress` is a
 * button (48pt at least) with the chevron's job done by its hint.
 * At 200% text the leader goes and the right-hand words drop under the title.
 */
import { View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { LARGE_TEXT, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { AnimatedPressable, usePressScale } from '../motion';
import { T, useFontScale } from '../ui';
import { FieldText } from './FieldText';

export interface KeyItem {
  key: string;
  title: string;
  /** The words at the end of the leader ("yours B · best D", "questions 3 and 7"). */
  right?: string;
  /** A ✗ or ✓ before the title, always with words beside it (never the only signal). */
  mark?: 'missed' | 'right';
  spoken: string;
  onPress?: () => void;
  hint?: string;
}

function Leader({ color }: { color: string }) {
  return (
    <View style={{ flex: 1, minWidth: 12, height: 4, marginHorizontal: space.sm, alignSelf: 'center', marginTop: 6 }}>
      <Svg width="100%" height={4}>
        <Line x1={1} y1={2} x2="100%" y2={2} stroke={color} strokeWidth={1.5} strokeDasharray="1.5 3.5" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

function KeyRow({ item, n, first }: { item: KeyItem; n: number; first: boolean }) {
  const { c } = useTheme();
  const large = useFontScale() >= LARGE_TEXT;
  const press = usePressScale({ scale: 1, tint: c.soft });
  const body = (
    <>
      {press.layer}
      <FieldText v="keyNo" style={{ width: 22 }}>{String(n)}</FieldText>
      <View style={{ flex: 1, minWidth: 0, flexDirection: large ? 'column' : 'row', alignItems: large ? 'flex-start' : 'center' }}>
        <T v="label" style={{ flexShrink: 1 }}>
          {item.mark ? <T v="label" color={item.mark === 'missed' ? c.wrong : c.correct}>{item.mark === 'missed' ? '✗ ' : '✓ '}</T> : null}
          {item.title}
        </T>
        {item.right ? (
          <>
            {!large && <Leader color={c.control} />}
            <T v="meta" style={{ flexShrink: 0 }}>{item.right}</T>
          </>
        ) : null}
      </View>
    </>
  );
  const style = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: space.sm, minHeight: 48, paddingVertical: space.md, borderTopWidth: first ? 0 : 1, borderTopColor: c.line };
  if (!item.onPress) {
    return (
      <View accessible accessibilityLabel={item.spoken} style={style}>
        {body}
      </View>
    );
  }
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={item.spoken}
      accessibilityHint={item.hint}
      onPress={item.onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[style, press.style]}
    >
      {body}
    </AnimatedPressable>
  );
}

export function KeyList({ items, testID }: { items: readonly KeyItem[]; testID?: string }) {
  return (
    <View testID={testID}>
      {items.map((item, i) => (
        <KeyRow key={item.key} item={item} n={i + 1} first={i === 0} />
      ))}
    </View>
  );
}
