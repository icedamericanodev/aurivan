/**
 * Share cards: a portrait 4:5 image (exported at 1080 × 1350 px) of ONE honest
 * progress number that a learner can post or send to a friend.
 *
 * - The words come from engine/shareCard.ts (pure, tested): never a pass
 *   claim, never the bank size, readiness only as a range once it exists.
 * - The card is always the forest panel (the brand moment) in FIXED colours
 *   (tokens.ts cardInk, never the theme's), so the image is the same in
 *   light and dark mode. The preview sheet itself follows the theme.
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
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Platform, ScrollView, Share, useWindowDimensions, View } from 'react-native';
import { moveFocus } from '../lib/a11y';
import { useMotion } from './motion';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import type { Certification } from '../content/types';
import type { Readiness } from '../engine/readiness';
import { shareMessage, shareOptions, type BadgeCardText, type ShareHeadline, type ShareInput, type ShareKind } from '../engine/shareCard';
import { cardInk, cardType, radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { KaisipLockup } from './brand';
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
  return (
    <View
      style={{
        // A constant size (height, not minHeight) at every font scale and screen width.
        width: CARD_W,
        height: CARD_H,
        // Square corners and a solid fill: the PNG has no transparent corners.
        // (The preview rounds them with a wrapper that is NOT captured.)
        backgroundColor: cardInk.field,
        padding: space.xl,
        justifyContent: 'space-between',
        overflow: 'hidden',
      }}
    >
      {/* Lockup (dark tone: it sits on forest) and cert name. The lockup is
          a drawing, so it never scales with the font size either. Decorative:
          the wrapper's accessibilityLabel already says "KaiSip". */}
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <KaisipLockup tone="dark" height={30} decorative />
        <T v="caption" color={cardInk.sap} maxFontSizeMultiplier={FIXED}>{cert.name}</T>
      </Row>

      {/* Growth rings: one per domain, in sap on the forest (decorative here).
          The compact preset keeps everything inside the fixed 400 pt height. */}
      <View style={{ alignItems: 'center' }}>
        <GrowthRings
          preset="today"
          mastery={readiness.domains.map((d) => d.mastery)}
          weights={cert.domains.map((d) => d.weight)}
          colors={cardInk.sap}
          track={cardInk.line}
        />
      </View>

      {/* The one headline. */}
      <View>
        {headline.value && <T v="number" num color={cardInk.ink} maxFontSizeMultiplier={FIXED}>{headline.value}</T>}
        <T
          v={headline.value ? 'headline' : 'hero'}
          color={cardInk.ink}
          maxFontSizeMultiplier={FIXED}
          style={{ marginTop: headline.value ? space.sm : 0 }}
        >
          {headline.label}
        </T>
        {headline.note && (
          <T v="meta" color={cardInk.ink2} maxFontSizeMultiplier={FIXED} style={{ marginTop: space.xs }}>
            {headline.note}
          </T>
        )}
      </View>

      {/* Trademark-safe footer: the cert's full notice (compliance review §5). */}
      <View style={{ paddingTop: space.md, borderTopWidth: 1, borderTopColor: cardInk.line }}>
        <T v="caption" color={cardInk.ink2} maxFontSizeMultiplier={FIXED} style={NOTICE}>{cert.trademarkNotice}</T>
      </View>
    </View>
  );
}

/** The notice on a card: small, but every word legible (two lines at most at 320 pt). */
const NOTICE = cardType.notice;

/** Image sharing needs a native share sheet (iOS/Android); web gets text. */
const IMAGE_SHARE = Platform.OS !== 'web';

/**
 * Capture a card and open the system share sheet with the image. Falls back
 * to sharing `text` when image sharing is unavailable. Never throws: a
 * cancelled sheet or a failed capture simply does nothing.
 */
async function shareImage(view: View | null, text: string, title: string) {
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
        dialogTitle: title,
      });
      return;
    }
    // Fallback (web, or no share sheet): React Native's Share sends text only.
    await Share.share({ message: text, title }, { dialogTitle: title });
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
  const { reduced: reduceMotion } = useMotion();
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
      await shareImage(cardRef.current, shareMessage(headline, cert.trademarkNotice), 'Share progress');
    } finally {
      busy.current = false;
      setSharing(false);
    }
  };
  // The card is always 320 × 400; on very narrow screens the preview is scaled
  // down to fit (a visual transform only: the captured image is unchanged).
  const scale = Math.min(1, (screenWidth - space.gutter * 2) / CARD_W);

  return (
    <Modal visible={visible} animationType={reduceMotion ? 'fade' : 'slide'} presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.raised2 }}>
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
                accessibilityLabel={`Share card preview. KaiSip, ${cert.name}. ${headline.spoken} ${cert.trademarkNotice}`}
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

// ── Badge cards (mobile 1.11, badges_game.md §6, compliance review §5) ──
/**
 * One earned badge, as a 320 × 400 forest card (exported at 1080 × 1350):
 * the KaiSip lockup, the medallion, its caption "KaiSip study badge ·
 * Earned 3 Nov 2026" (so it reads as ours, never as an issuer's credential),
 * the badge's name and tier, its skill line, then at the foot, apart from the
 * medallion, "Studying for the CISA® exam" and the cert's full notice.
 * No cert name on or directly above the medallion, no issuer marks or
 * colours, no verification ID, URL or "add to profile". A picture: its text
 * never scales with the phone's font size (screen readers get `spoken`).
 */
export function BadgeShareCard({ text, art }: { text: BadgeCardText; art: ReactNode }) {
  return (
    <View style={{ width: CARD_W, height: CARD_H, backgroundColor: cardInk.field, paddingHorizontal: space.xl, paddingVertical: space.lg, overflow: 'hidden' }}>
      <KaisipLockup tone="dark" height={22} decorative />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View accessible={false} importantForAccessibility="no-hide-descendants">
          {art}
        </View>
        <T v="caption" center color={cardInk.ink2} maxFontSizeMultiplier={FIXED} style={{ marginTop: space.xs }}>{text.caption}</T>
        <T v="hero" center color={cardInk.ink} maxFontSizeMultiplier={FIXED} style={[cardType.name, { marginTop: space.sm }]}>{text.name}</T>
        {text.tierLine && (
          <T v="caption" center color={cardInk.sap} maxFontSizeMultiplier={FIXED} style={{ marginTop: 2 }}>{text.tierLine}</T>
        )}
        <T v="quote" center color={cardInk.ink} maxFontSizeMultiplier={FIXED} style={[cardType.skill, { marginTop: space.xs }]}>{text.skill}</T>
      </View>
      <View style={{ paddingTop: space.sm, borderTopWidth: 1, borderTopColor: cardInk.line }}>
        <T v="caption" color={cardInk.ink} maxFontSizeMultiplier={FIXED}>{text.headline}</T>
        <T v="caption" color={cardInk.ink2} maxFontSizeMultiplier={FIXED} style={[NOTICE, { marginTop: 2 }]}>{text.notice}</T>
      </View>
    </View>
  );
}

/**
 * The badge card's preview and its one action, shown inside the badge's
 * sheet (never a sheet over a sheet). Opened only by the learner's tap on
 * Share; "Share image" hands the picture to the system share sheet. Sharing
 * earns nothing and there is no "add to profile" option. `text` is built by
 * the sheet before Share is offered (engine/shareCard.ts badgeCardText), so
 * nothing here can throw while rendering.
 */
export function BadgeSharePanel({ text, art, onBack }: { text: BadgeCardText; art: ReactNode; onBack: () => void }) {
  const { c } = useTheme();
  const screenWidth = useWindowDimensions().width;
  const cardRef = useRef<View>(null);
  const title = useRef<View>(null);
  const busy = useRef(false);
  const [sharing, setSharing] = useState(false);
  useEffect(() => moveFocus(title, 300), []);
  const onShare = async () => {
    if (busy.current) return;
    busy.current = true;
    setSharing(true);
    try {
      await shareImage(cardRef.current, text.message, 'Share badge');
    } finally {
      busy.current = false;
      setSharing(false);
    }
  };
  const scale = Math.min(1, (screenWidth - space.gutter * 2) / CARD_W);
  return (
    <View>
      <View ref={title} accessible accessibilityRole="header" style={{ marginTop: space.md }}>
        <T v="hero">Share this badge</T>
      </View>
      <T v="meta" style={{ marginTop: space.xs }}>Only what is on the card is shared.</T>
      <View style={{ alignItems: 'center', marginTop: space.xl }}>
        <View style={{ width: CARD_W * scale, height: CARD_H * scale, borderRadius: radius.lg, overflow: 'hidden' }}>
          <View
            ref={cardRef}
            collapsable={false}
            accessible
            accessibilityRole="image"
            accessibilityLabel={text.spoken}
            style={{ width: CARD_W, height: CARD_H, transform: [{ translateX: (CARD_W * (scale - 1)) / 2 }, { translateY: (CARD_H * (scale - 1)) / 2 }, { scale }] }}
          >
            <BadgeShareCard text={text} art={art} />
          </View>
        </View>
      </View>
      <Button
        label={sharing ? 'Sharing…' : IMAGE_SHARE ? 'Share image' : 'Share'}
        onPress={onShare}
        disabled={sharing}
        accessibilityHint={IMAGE_SHARE ? 'Opens the share sheet with this card as an image' : 'Opens the share sheet with this badge as text'}
        icon={(col) => <Share2 size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />}
        style={{ marginTop: space.xl }}
      />
      <Button kind="ghost" label="Back to the badge" onPress={onBack} style={{ alignSelf: 'center', marginTop: space.sm }} />
      <T v="meta" color={c.ink2} style={{ marginTop: space.md }}>
        Nothing is posted for you. You choose where it goes.
      </T>
    </View>
  );
}
