/**
 * A full pushed screen for an empty list (spec §11 "Empty state"):
 * header → seedling → one-line title → ≤2 lines of body → optional teaching
 * tags → sticky primary action + optional ghost action. Copy is factual and
 * forward-looking ("Nothing open right now"), never "Yay!".
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { StickyFooter } from './quiz';
import { Button, EmptyState, PushedHeader } from './ui';

export function EmptyScreen({
  header,
  title,
  body,
  tags,
  primary,
  secondary,
}: {
  header: string;
  title: string;
  body: string;
  tags?: string[];
  primary?: { label: string; onPress: () => void };
  secondary?: { label: string; onPress: () => void };
}) {
  const { c } = useTheme();
  const [footerH, setFooterH] = useState(140);
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: footerH + space.xl }}>
        <PushedHeader title={header} onBack={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
        <EmptyState title={title} body={body} tags={tags} />
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
