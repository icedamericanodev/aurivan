/**
 * A full pushed screen for an empty list (spec §11 "Empty state"):
 * header → its own drawing (mobile 1.9) → one-line title → ≤2 lines of body → optional teaching
 * tags → sticky primary action + optional ghost action. Copy is factual and
 * forward-looking ("Nothing open right now"), never "Yay!".
 */
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { backOr, type TabHref } from '../lib/actions';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { StickyFooter } from './quiz';
import type { EmptyArtKind } from './glyphs';
import { Button, EmptyState, PushedHeader } from './ui';

export function EmptyScreen({
  header,
  title,
  body,
  tags,
  primary,
  secondary,
  fallback = '/home',
  art,
  next,
}: {
  header: string;
  /** Where Back goes when there is no back history (a cold start from a link): this screen's own tab. */
  fallback?: TabHref;
  title: string;
  body: string;
  tags?: string[];
  /** Mobile 1.9: this place's own drawing (glyphs.tsx EmptyArt), and what comes next here. */
  art?: EmptyArtKind;
  next?: string;
  primary?: { label: string; onPress: () => void };
  secondary?: { label: string; onPress: () => void };
}) {
  const { c } = useTheme();
  const [footerH, setFooterH] = useState(140);
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: footerH + space.xl }}>
        <PushedHeader title={header} onBack={() => backOr(fallback)} />
        <EmptyState title={title} body={body} tags={tags} art={art} next={next} />
      </ScrollView>
      {(primary || secondary) && (
        <StickyFooter onHeight={setFooterH}>
          {primary && <Button label={primary.label} onPress={primary.onPress} />}
          {secondary && <Button kind="ghost" label={secondary.label} onPress={secondary.onPress} />}
        </StickyFooter>
      )}
    </SafeAreaView>
  );
}
