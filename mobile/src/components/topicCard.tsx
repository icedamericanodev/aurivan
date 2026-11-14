import { createContext, useContext, useState } from 'react';
import { View, useWindowDimensions, type ViewProps } from 'react-native';
import { grovePlate } from '../theme/grove';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { groveCard } from './ui';

export const TOPIC_CARD_INSET = grovePlate.pad + grovePlate.edge;
const TopicWidth = createContext<number | undefined>(undefined);

/** Figures need the reading surface's actual width, not the whole screen. */
export function useTopicCardWidth() {
  return useContext(TopicWidth);
}

/** One topic, question or lesson scene, with its related reading and actions. */
export function TopicCard({ children, style, ...props }: ViewProps) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState<number>();
  const fallback = Math.max(1, Math.min(width - space.gutter * 2, 560) - TOPIC_CARD_INSET * 2);
  return (
    <View {...props} style={[groveCard(c), { padding: grovePlate.pad }, style]}>
      <View onLayout={({ nativeEvent }) => {
        if (nativeEvent.layout.width > 0) setMeasuredWidth(nativeEvent.layout.width);
      }}>
        <TopicWidth.Provider value={measuredWidth ?? fallback}>{children}</TopicWidth.Provider>
      </View>
    </View>
  );
}
