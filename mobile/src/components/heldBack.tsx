/**
 * The held-back full form on screen (engine/heldBack.ts, CIA_BANK_PLAN.md section 11 item 7).
 *
 * - HeldBackCard: Today's one card, once the form is due (every section has
 *   30 or more first tries and a short mock is done, or the exam is 3 weeks
 *   away or less). Calm: no date, no countdown, no "last chance". Hide keeps
 *   it hidden on this phone; the form stays in Practice.
 * - HeldBackRow: Practice's row under the mock tiles: "Full exam", or
 *   "Full exam (seen)" once taken (never hidden, never locked).
 *
 * Both only render for a course that has a held-back form, so CISA never sees them.
 */
import { router } from 'expo-router';
import { View } from 'react-native';
import { CARD_CAPTION, CARD_LINE, FORM_TITLE, SEEN_TITLE } from '../engine/heldBack';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Button, ListRow, Row, T } from './ui';

/** Opens the form's start sheet (the intro and timing come first; nothing starts on this tap). */
export const openHeldBack = () => router.push({ pathname: '/mock-start', params: { form: 'held' } });

/** Today's one card (no notification) for the held-back form. */
export function HeldBackCard({ onHide }: { onHide: () => void }) {
  const { c } = useTheme();
  return (
    <View testID="held-back-card" style={{ borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
      <View accessible accessibilityLabel={`${CARD_CAPTION}. ${CARD_LINE}`}>
        <T v="caption" color={c.accentText}>{CARD_CAPTION}</T>
        <T v="small" style={{ marginTop: space.xs }}>{CARD_LINE}</T>
      </View>
      <Row gap={space.xs} style={{ flexWrap: 'wrap', marginLeft: -space.sm }}>
        <Button kind="ghost" label="See the full exam" accessibilityHint="Opens what it is and the timing choices first" onPress={openHeldBack} />
        <Button kind="ghost" label="Hide" accessibilityLabel="Hide this card. The full exam stays in Practice." onPress={onHide} />
      </Row>
    </View>
  );
}

/** Practice's row for the held-back form, under the mock tiles. */
export function HeldBackRow({ questions, hours, taken }: { questions: number; hours: number; taken: boolean }) {
  const title = taken ? SEEN_TITLE : FORM_TITLE;
  const subtitle = taken ? `${questions} questions · seen before, not counted in readiness` : `${questions} questions · ${hours} hours · the same for everyone`;
  return (
    <ListRow
      testID="practice-held-back"
      title={title}
      subtitle={subtitle}
      accessibilityLabel={`${title}, ${subtitle}`}
      accessibilityHint="Opens what it is and the timing choices first"
      onPress={openHeldBack}
      last
    />
  );
}
