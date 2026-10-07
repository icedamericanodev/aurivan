/**
 * Share cards: a portrait 4:5 image (exported at 1080 × 1350 px) of ONE honest
 * progress number that a learner can post or send to a friend.
 *
 * - The words come from engine/shareCard.ts (pure, tested): never a pass
 *   claim, never the bank size, readiness only as a range once it exists.
 * - The card is always the forest panel (the brand moment), so it looks the
 *   same in light and dark mode. The preview sheet itself follows the theme.
 * - The card is a fixed 320 × 400 pt "picture": its text does NOT grow with the
 *   phone's font size (maxFontSizeMultiplier 1), so the image is identical on
 *   every phone and never clips. Screen readers get the full text from the
 *   wrapper's accessibilityLabel instead. On narrow screens the PREVIEW is
 *   scaled down to fit; the captured image is unaffected.
 * - Sharing (react-native-view-shot + expo-sharing), iOS and Android alike:
 *   the card is captured to a temporary PNG and handed to the system share
 *   sheet as an image. Where expo-sharing is unavailable (web), the same honest
 *   sentence is shared as text with React Native's Share instead.
 *   Cancelling or any error is ignored quietly: sharing is never worth a crash.
 */
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { Modal, Platform, ScrollView, Share, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import type { Certification } from '../content/types';
import type { Readiness } from '../engine/readiness';
import { notAffiliated, shareMessage, shareOptions, type ShareHeadline, type ShareInput, type ShareKind } from '../engine/shareCard';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { BrandLockup } from './brand';
import { GrowthRings } from './glyphs';
import { ICON_STROKE, Share2 } from './icons';
import { Button, Chip, ChipRow, ICON_SIZE, Row, T } from './ui';

/** The card's fixed size on screen (points). 4:5 portrait. */
export const CARD_W = 320;
export const CARD_H = 400;
/** The exported image size in pixels (LinkedIn's portrait post is 1080 × 1350, also 4:5). */
export const SHARE_IMAGE_WIDTH = 1080;
export const SHARE_IMAGE_HEIGHT = 1350;
/** Card text never scales with the system font size: the card is a picture. */
const FIXED = 1;

/** Short chip names for each headline kind. */
const KIND_LABEL: Record<ShareKind, string> = {
  range: 'Readiness range',
  streak: 'Streak',
  days: 'Days studied',
  answered: 'Answers',
  start: 'Getting started',
};

// ── The card itself ───────────────────────────────────────────────────
function ShareCard({ cert, readiness, headline }: { cert: Certification; readiness: Readiness; headline: ShareHeadline }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        // A constant size (height, not minHeight) at every font scale and screen width.
        width: CARD_W,
        height: CARD_H,
        // Square corners and a solid fill: the PNG has no transparent corners.
        // (The preview rounds them with a wrapper that is NOT captured.)
        backgroundColor: c.forest,
        padding: space.xl,
        justifyContent: 'space-between',
        overflow: 'hidden',
      }}
    >
      {/* Lockup (dark tone: it sits on forest) and cert name. The lockup is
          a drawing, so it never scales with the font size either. Decorative:
          the wrapper's accessibilityLabel already says "Aurivan". */}
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <BrandLockup tone="dark" height={30} decorative />
        <T v="caption" color={c.sap} maxFontSizeMultiplier={FIXED}>{cert.name}</T>
      </Row>

      {/* Growth rings: one per domain, in sap on the forest (decorative here).
          The compact preset keeps everything inside the fixed 400 pt height. */}
      <View style={{ alignItems: 'center' }}>
        <GrowthRings
          preset="today"
          mastery={readiness.domains.map((d) => d.mastery)}
          weights={cert.domains.map((d) => d.weight)}
          colors={c.sap}
          track={c.forestTrack}
        />
      </View>

      {/* The one headline. */}
      <View>
        {headline.value && <T v="number" num color={c.onForest} maxFontSizeMultiplier={FIXED}>{headline.value}</T>}
        <T
          v={headline.value ? 'headline' : 'hero'}
          color={c.onForest}
          maxFontSizeMultiplier={FIXED}
          style={{ marginTop: headline.value ? space.sm : 0 }}
        >
          {headline.label}
        </T>
        {headline.note && (
          <T v="meta" color={c.onForest2} maxFontSizeMultiplier={FIXED} style={{ marginTop: space.xs }}>
            {headline.note}
          </T>
        )}
      </View>

      {/* Trademark-safe footer. */}
      <View style={{ paddingTop: space.md, borderTopWidth: 1, borderTopColor: c.forestTrack }}>
        <T v="caption" color={c.onForest2} maxFontSizeMultiplier={FIXED}>{notAffiliated(cert.issuer)}</T>
      </View>
    </View>
  );
}

/** Image sharing needs a native share sheet (iOS/Android); web gets text. */
const IMAGE_SHARE = Platform.OS !== 'web';

/**
 * Capture the card and open the system share sheet with the image.
 * Falls back to sharing the sentence as text when image sharing is unavailable.
 * Never throws: a cancelled sheet or a failed capture simply does nothing.
 */
async function shareCard(view: View | null, h: ShareHeadline, issuer: string) {
  let uri: string | null = null;
  try {
    if (IMAGE_SHARE && view && (await Sharing.isAvailableAsync())) {
      uri = await captureRef(view, {
        format: 'png',
        result: 'tmpfile',
        width: SHARE_IMAGE_WIDTH,
        height: SHARE_IMAGE_HEIGHT,
      });
      // The card already carries every word, so the image travels alone.
      await Sharing.shareAsync(uri.startsWith('file://') ? uri : `file://${uri}`, {
        mimeType: 'image/png', // Android: lets the share sheet offer image apps
        UTI: 'public.png', // iOS: the same, as a Uniform Type Identifier
        dialogTitle: 'Share progress',
      });
      return;
    }
    // Fallback (web, or no share sheet): React Native's Share sends text only.
    await Share.share({ message: shareMessage(h, issuer), title: 'My study progress' }, { dialogTitle: 'Share progress' });
  } catch {
    // Cancelled, no share target, or capture failed: stay quiet.
  } finally {
    // Delete the temporary PNG once the sheet is done with it.
    if (uri) {
      try {
        releaseCapture(uri);
      } catch {
        // Already gone: nothing to clean up.
      }
    }
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
  // In-flight flag: a ref blocks a double tap at once (state updates are async);
  // the state copy disables the button so the learner sees it is busy.
  const busy = useRef(false);
  const [sharing, setSharing] = useState(false);
  const onShare = async () => {
    if (busy.current) return;
    busy.current = true;
    setSharing(true);
    try {
      await shareCard(cardRef.current, headline, cert.issuer);
    } finally {
      busy.current = false;
      setSharing(false);
    }
  };
  // The card is always 320 × 400; on very narrow screens the preview is scaled
  // down to fit (a visual transform only: the captured image is unchanged).
  const scale = Math.min(1, (screenWidth - space.gutter * 2) / CARD_W);

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
            {/* Outer box: takes the scaled size in the layout and rounds the
                preview's corners. Not captured, so the PNG stays square. */}
            <View style={{ width: CARD_W * scale, height: CARD_H * scale, borderRadius: radius.lg, overflow: 'hidden' }}>
              <View
                ref={cardRef}
                collapsable={false} // Android must keep this view to capture it
                accessible
                accessibilityRole="image"
                accessibilityLabel={`Share card preview. Aurivan, ${cert.name}. ${headline.spoken} ${notAffiliated(cert.issuer)}`}
                style={{
                  width: CARD_W,
                  height: CARD_H,
                  // Scale around the top-left corner so it fills the outer box exactly.
                  transform: [{ translateX: (CARD_W * (scale - 1)) / 2 }, { translateY: (CARD_H * (scale - 1)) / 2 }, { scale }],
                }}
              >
                <ShareCard cert={cert} readiness={readiness} headline={headline} />
              </View>
            </View>
          </View>

          <Button
            label={sharing ? 'Sharing…' : IMAGE_SHARE ? 'Share image' : 'Share'}
            onPress={onShare}
            disabled={sharing}
            accessibilityHint={IMAGE_SHARE ? 'Opens the share sheet with this card as an image' : 'Opens the share sheet with this progress as text'}
            icon={(col) => <Share2 size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />}
            style={{ marginTop: space.xl }}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
