/**
 * EmptyPlate (Field Guide §21.2): the empty mount. A plate with a dashed
 * inner edge and two lines in its middle, "Plate not yet drawn" and what
 * will draw it ("IS Acquisition needs a few more answers before it is measured."). Calm: it says what comes next, never what is missing. One
 * screen-reader stop.
 */
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { space } from '../../theme/tokens';
import { FieldText } from './FieldText';
import { Plate, type Fig, FigCaption } from './Plate';

export const EMPTY_PLATE_TITLE = 'Plate not yet drawn';

export function EmptyPlate({ body, title = EMPTY_PLATE_TITLE, fig, style }: { body: string; title?: string; fig?: Fig; style?: StyleProp<ViewStyle> }) {
  return (
    <Plate dashed style={style} innerStyle={{ paddingVertical: space.xl }} testID="empty-plate">
      {fig && <FigCaption fig={fig} style={{ marginBottom: space.md }} />}
      <View accessible accessibilityLabel={`${title}. ${body}`} style={{ alignItems: 'center', paddingHorizontal: space.md }}>
        <FieldText v="sub" center>{title}</FieldText>
        <FieldText v="small" center style={{ marginTop: space.xs }}>{body}</FieldText>
      </View>
    </Plate>
  );
}
