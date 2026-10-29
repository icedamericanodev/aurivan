/**
 * Plate, FigCaption and KeyCaption (Field Guide §21.2).
 *
 * - Plate: the one focal figure of a screen, a double-hairline mount: an
 *   outer `line` edge, 6pt of `raised2`, an inner `line` edge. No shadow and
 *   no radius (the guide's pages are cut square). Never a button itself.
 * - FigCaption: the italic "Fig. 5 · Five areas, one scale" inside the
 *   plate's top-left. Spoken "Figure 5, Five areas, one scale", and a header,
 *   so screen-reader users can move from plate to plate.
 * - KeyCaption: the line under a plate, a tracked key ("KEY", "PLATE",
 *   "NOTE") before an italic sentence: what the marks mean, in words.
 */
import type { ReactNode } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { fieldMaxScale, fieldType, plate, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { FieldText } from './FieldText';

export interface Fig {
  /** The figure's number in the guide ("5"); left out, the caption is the title alone. */
  n?: number | string;
  title: string;
}

/** "Fig. 5 · Five areas, one scale", and its spoken form. */
export const figLine = (f: Fig) => (f.n !== undefined && f.n !== '' ? `Fig. ${f.n} · ${f.title}` : f.title);
export const figSpoken = (f: Fig) => (f.n !== undefined && f.n !== '' ? `Figure ${f.n}, ${f.title}` : f.title);

export function FigCaption({ fig, style }: { fig: Fig; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <FieldText v="fig" accessibilityRole="header" accessibilityLabel={figSpoken(fig)}>
        {figLine(fig)}
      </FieldText>
    </View>
  );
}

export function Plate({
  fig,
  children,
  dashed,
  style,
  innerStyle,
  testID,
}: {
  fig?: Fig;
  children?: ReactNode;
  /** The empty mount: the inner edge is dashed ("Plate not yet drawn"). */
  dashed?: boolean;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { c } = useTheme();
  return (
    <View testID={testID} style={[{ backgroundColor: c.raised2, borderWidth: 1, borderColor: c.line, padding: plate.mount }, style]}>
      <View style={[{ borderWidth: 1, borderColor: dashed ? c.control : c.line, borderStyle: dashed ? 'dashed' : 'solid', padding: space.md }, innerStyle]}>
        {fig && <FigCaption fig={fig} style={{ marginBottom: space.sm }} />}
        {children}
      </View>
    </View>
  );
}

/** "KEY  One stem per area…": the key is tracked caps in ink, the sentence italic. One stop for screen readers. */
export function KeyCaption({ label, children, style }: { label: string; children: string; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View accessible accessibilityLabel={`${label[0]}${label.slice(1).toLowerCase()}: ${children}`} style={[{ marginTop: space.sm }, style]}>
      <Text maxFontSizeMultiplier={fieldMaxScale.fig} style={[fieldType.fig, { color: c.ink2 }]}>
        <Text maxFontSizeMultiplier={fieldMaxScale.head} style={[fieldType.head, { color: c.ink }]}>{`${label}  `}</Text>
        {children}
      </Text>
    </View>
  );
}
