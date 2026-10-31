/**
 * Plate, FigCaption and KeyCaption (Field Guide §21.2, Grove Phase 1).
 *
 * - Plate: the one focal figure of a screen, drawn as a Grove card: `raised`,
 *   24 corners, one hairline edge, no shadow (it was a square double-hairline
 *   mount before Grove). Never a button itself.
 * - FigCaption: the italic caption inside the card's top-left, "Five areas,
 *   one scale". A header, so screen-reader users can move from card to card.
 *   No book labels (labels decision, 31 Oct 2026): it never says "Fig. 5" or
 *   "Figure 5"; a figure's number is kept in the data only, never shown or said.
 * - KeyCaption: the line under a plate, a tracked key ("KEY", "NOTE") before
 *   an italic sentence: what the marks mean, in words.
 */
import type { ReactNode } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { grovePlate } from '../../theme/grove';
import { fieldMaxScale, fieldType, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { groveCard } from '../ui';
import { FieldText } from './FieldText';

export interface Fig {
  /** The figure's old number in the guide ("5"). Kept for the callers' data; never shown or said since Grove. */
  n?: number | string;
  title: string;
  /** How it is said, when the words need more than the title (Today: "Shoot, stage 3 of 6"). */
  spoken?: string;
}

/** The caption as shown: the title alone ("Five areas, one scale"). */
export const figLine = (f: Fig) => f.title;
/** The caption as said: its spoken form, else the title. */
export const figSpoken = (f: Fig) => f.spoken ?? f.title;

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
  tight,
  style,
  innerStyle,
  testID,
}: {
  fig?: Fig;
  children?: ReactNode;
  /** The empty card: its edge is dashed ("Nothing here yet"). */
  dashed?: boolean;
  /** A chart that wants the whole width: 4pt inside the edge instead of 16. */
  tight?: boolean;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { c } = useTheme();
  return (
    <View
      testID={testID}
      style={[
        groveCard(c),
        { padding: grovePlate.pad, paddingHorizontal: tight ? grovePlate.padTight : grovePlate.pad },
        // The empty card keeps `control` (3:1) for its dashed edge: an empty plate is a real state, not decoration.
        dashed && { borderColor: c.control, borderStyle: 'dashed', borderWidth: 1.5 },
        style,
        innerStyle,
      ]}
    >
      {/* `tight` keeps the caption in line with the other cards' text (4 + 12 = 16). */}
      {fig && <FigCaption fig={fig} style={{ marginBottom: space.sm, marginLeft: tight ? space.md : 0 }} />}
      {children}
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
