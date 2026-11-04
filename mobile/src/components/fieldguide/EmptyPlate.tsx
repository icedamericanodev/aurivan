/**
 * EmptyPlate (Field Guide §21.2): the empty card. A plate with a dashed
 * edge and two lines in its middle, "Nothing here yet" and what
 * will draw it ("IS Acquisition needs a few more answers before it is measured."). Calm: it says what comes next, never what is missing. One
 * screen-reader stop.
 */
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { T } from '../ui';
import { FieldText } from './FieldText';
import { Plate, type Fig, FigCaption } from './Plate';

/** Plain words, no book label (labels decision, 31 Oct 2026; was "Plate not yet drawn"). */
export const EMPTY_PLATE_TITLE = 'Nothing here yet';

export function EmptyPlate({ body, title = EMPTY_PLATE_TITLE, fig, style }: { body: string; title?: string; fig?: Fig; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <Plate dashed style={style} innerStyle={{ paddingVertical: space.xl }} testID="empty-plate">
      {fig && <FigCaption fig={fig} style={{ marginBottom: space.md }} />}
      <View accessible accessibilityLabel={`${title}. ${body}`} style={{ alignItems: 'center', paddingHorizontal: space.md }}>
        <FieldText v="sub" center>{title}</FieldText>
        {/* TYPE_SCALE: an empty plate's sentence is reading text, not a chart label: meta 14/20 in ink2, as the web's .fg-empty-m. */}
        <T v="meta" color={c.ink2} center style={{ marginTop: space.xs }}>
          {body}
        </T>
      </View>
    </Plate>
  );
}
