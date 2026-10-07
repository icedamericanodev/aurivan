/**
 * Share cards: a portrait (4:5, exported at 1080 px wide) image of ONE honest
 * progress number that a learner can post or send to a friend.
 *
 * - The words come from engine/shareCard.ts (pure, tested): never a pass
 *   claim, never the bank size, readiness only as a range once it exists.
 * - The card is always the forest panel (the brand moment), so it looks the
 *   same in light and dark mode. The preview sheet itself follows the theme.
 * - Sharing (react-native-view-shot + React Native's built-in Share):
 *     iOS:     the card is captured to a temporary PNG and shared as an image.
 *     Android: RN's Share can only send text, so the same honest sentence is
 *              shared as text. (Image sharing on Android needs expo-sharing:
 *              not installed, see docs/mobile/ARCHITECTURE.md.)
 *   Cancelling or any error is ignored quietly: sharing is never worth a crash.
 */
import { useRef, useState } from 'react';
import { Modal, Platform, ScrollView, Share, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import type { Certification } from '../content/types';
import type { Readiness } from '../engine/readiness';
import { notAffiliated, shareMessage, shareOptions, type ShareHeadline, type ShareInput, type ShareKind } from '../engine/shareCard';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { GrowthRings } from './glyphs';
import { ICON_STROKE, Share2 } from './icons';
import { Button, Chip, ChipRow, ICON_SIZE, Row, T } from './ui';

/** The exported image width in pixels (LinkedIn's portrait post is 1080 × 1350). */
export const SHARE_IMAGE_WIDTH = 1080;
/** Largest preview width on screen (points). */
const CARD_MAX = 360;

/** Short chip names for each headline kind. */
const KIND_LABEL: Record<ShareKind, string> = {
  range: 'Readiness range',
  streak: 'Streak',
  days: 'Days studied',
  answered: 'Answers',
  start: 'Getting started',
};

// ── The card itself ───────────────────────────────────────────────────
function ShareCard({
  cert,
  readiness,
  headline,
  width,
}: {
  cert: Certification;
  readiness: Readiness;
  headline: ShareHeadline;
  width: number;
}) {
  const { c } = useTheme();
  return (
    <View
      style={{
        width,
        // 4:5 portrait. minHeight (not a fixed height) so very large text grows
        // the card instead of clipping it; the export keeps whatever shape it has.
        minHeight: Math.round(width * 1.25),
        backgroundColor: c.forest,
        borderRadius: radius.lg,
        padding: space.xl,
        justifyContent: 'space-between',
      }}
    >
      {/* Wordmark and cert name. */}
      <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <T v="hero" color={c.onForest}>Aurivan</T>
        <T v="caption" color={c.sap}>{cert.name}</T>
      </Row>

      {/* Growth rings: one per domain, in sap on the forest (decorative here). */}
      <View style={{ alignItems: 'center', marginVertical: space.lg }}>
        <GrowthRings
          preset="you"
          mastery={readiness.domains.map((d) => d.mastery)}
          weights={cert.domains.map((d) => d.weight)}
          colors={c.sap}
          track={c.forestTrack}
        />
      </View>

      {/* The one headline. */}
      <View>
        {headline.value && <T v="number" num color={c.onForest}>{headline.value}</T>}
        <T v={headline.value ? 'headline' : 'hero'} color={c.onForest} style={{ marginTop: headline.value ? space.sm : 0 }}>
          {headline.label}
        </T>
        {headline.note && <T v="meta" color={c.onForest2} style={{ marginTop: space.xs }}>{headline.note}</T>}
      </View>

      {/* Trademark-safe footer. */}
      <View style={{ marginTop: space.xl, paddingTop: space.md, borderTopWidth: 1, borderTopColor: c.forestTrack }}>
        <T v="caption" color={c.onForest2}>{notAffiliated(cert.issuer)}</T>
      </View>
    </View>
  );
}

/**
 * Capture the card and open the platform share sheet. Never throws:
 * a cancelled sheet or a failed capture simply does nothing.
 */
async function shareCard(view: View | null, size: { w: number; h: number } | null, h: ShareHeadline, issuer: string) {
  const message = shareMessage(h, issuer);
  try {
    if (Platform.OS === 'ios' && view && size) {
      const uri = await captureRef(view, {
        format: 'png',
        result: 'tmpfile',
        width: SHARE_IMAGE_WIDTH,
        height: Math.round((SHARE_IMAGE_WIDTH * size.h) / size.w),
      });
      // iOS shares a file URL as an image (the card already carries every word).
      await Share.share({ url: uri.startsWith('file://') ? uri : `file://${uri}` });
      return;
    }
    // Android (and web): React Native's Share sends text only.
    await Share.share({ message, title: 'My study progress' }, { dialogTitle: 'Share progress' });
  } catch {
    // Cancelled, no share target, or capture failed: stay quiet.
  }
}

// ── The preview sheet (opened from You) ───────────────────────────────
export function ShareProgressSheet({
  visible,
  onClose,
  cert,
  readiness,
  input,
}: {
  visible: boolean;
  onClose: () => void;
  cert: Certification;
  readiness: Readiness;
  input: ShareInput;
}) {
  const { c } = useTheme();
  const reduceMotion = useReducedMotion();
  const screenWidth = useWindowDimensions().width;
  const options = shareOptions(input);
  const [kind, setKind] = useState<ShareKind | null>(null);
  // The learner's pick, if it still applies; otherwise the best honest option.
  const headline = options.find((o) => o.kind === kind) ?? options[0];
  const cardRef = useRef<View>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const imageShare = Platform.OS === 'ios';
  // Fits small phones: never wider than the screen minus its side padding.
  const cardWidth = Math.min(CARD_MAX, screenWidth - space.gutter * 2);

  return (
    <Modal visible={visible} animationType={reduceMotion ? 'none' : 'slide'} presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <ScrollView contentContainerStyle={{ padding: space.gutter, paddingBottom: space.xxxl }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="hero" accessibilityRole="header">Share progress</T>
            <Button kind="ghost" label="Close" onPress={onClose} accessibilityLabel="Close share preview" />
          </Row>
          <T v="meta" style={{ marginTop: space.xs }}>Only what is on the card is shared.</T>

          {options.length > 1 && (
            <View style={{ marginTop: space.lg }}>
              <T v="caption" color={c.ink2} style={{ marginBottom: space.sm }}>Headline</T>
              <ChipRow>
                {options.map((o) => (
                  <Chip key={o.kind} label={KIND_LABEL[o.kind]} selected={o.kind === headline.kind} onPress={() => setKind(o.kind)} />
                ))}
              </ChipRow>
            </View>
          )}

          {/* The preview IS the image: what you see is what gets captured. */}
          <View style={{ alignItems: 'center', marginTop: space.xl }}>
            <View
              ref={cardRef}
              collapsable={false} // Android must keep this view to capture it
              onLayout={onLayout}
              accessible
              accessibilityRole="image"
              accessibilityLabel={`Share card preview. Aurivan, ${cert.name}. ${headline.spoken} ${notAffiliated(cert.issuer)}`}
            >
              <ShareCard cert={cert} readiness={readiness} headline={headline} width={cardWidth} />
            </View>
          </View>

          <Button
            label={imageShare ? 'Share image' : 'Share'}
            onPress={() => shareCard(cardRef.current, size, headline, cert.issuer)}
            accessibilityHint={imageShare ? 'Opens the share sheet with this card as an image' : 'Opens the share sheet with this progress as text'}
            icon={(col) => <Share2 size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />}
            style={{ marginTop: space.xl }}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
