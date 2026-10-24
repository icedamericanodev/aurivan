/**
 * Mobile 1.41: two quiet cards on Today, below the day's study.
 *
 * Plain English for the founder:
 * - `TesterQuestionCard`: only for learners who turned on "I'm a beta tester"
 *   in Help. One short question on some test days (engine/betaTester.ts has
 *   the schedule). "Answer by email" opens the learner's own email app with
 *   the question filled in; nothing is sent until they press Send there.
 *   "Not today" hides it until tomorrow. On the week check-ins it shows "You
 *   studied on N of the last 7 days", on this screen only (never in the email).
 *   No badge, no plant growth, no streak for answering.
 * - `NameAskCard`: onboarding no longer asks for a name. This card asks once,
 *   from the day after the first study day. "Add a name" opens a small sheet
 *   (the same field as Settings → Your name); "Not now" puts it away for good.
 */
import { useState } from 'react';
import { View } from 'react-native';
import { markAnswered, skipToday, switchTester, testerEmail, weekLine, type TesterCard } from '../engine/betaTester';
import { cleanDisplayName } from '../engine/displayName';
import { mailtoUrl } from '../engine/support';
import { sayLater } from '../lib/a11y';
import { config } from '../lib/config';
import { appInfo, emailAsText, openEmail, shareEmail } from '../lib/support';
import { useSeen } from '../store/seen';
import { useSettings } from '../store/settings';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { DisplayNameField } from './displayName';
import { ICON_STROKE, UserRound } from './icons';
import { Sheet } from './settings';
import { Button, Card, ICON_SIZE, InviteRow, Row, T } from './ui';

/** What the card shows after "Answer by email" (for this visit). */
type Sent = 'idle' | 'opened' | 'failed';

export function TesterQuestionCard({
  card,
  today,
  onGone,
}: {
  card: TesterCard;
  /** Today's local day ("YYYY-MM-DD"), for "Not today". */
  today: string;
  /** The card went away under the focused button: move screen-reader focus somewhere that still exists. */
  onGone?: () => void;
}) {
  const { c } = useTheme();
  const [sent, setSent] = useState<Sent>('idle');
  const [gone, setGone] = useState(false);
  const email = testerEmail(card, appInfo());
  if (gone) return null;

  const answer = async () => {
    const result = await openEmail(email, mailtoUrl(config.feedbackEmail, email));
    if (result === 'opened') {
      // Asked once: the email app opened (we can't know if it was sent, and never claim it was).
      const s = useSeen.getState();
      s.setTester(markAnswered(s.tester ?? {}, card.id));
    }
    setSent(result);
  };
  const notToday = () => {
    const s = useSeen.getState();
    s.setTester(skipToday(s.tester ?? {}, today));
    setGone(true);
    sayLater('Hidden until tomorrow.');
    onGone?.();
  };
  const stop = () => {
    useSeen.getState().setTester(switchTester(false, today));
    setGone(true);
    sayLater('Tester questions are off. You can turn them on again in Help.');
    onGone?.();
  };

  return (
    <View
      testID="tester-card"
      // A named screen-reader action, so the questions can be stopped without finding Help.
      accessibilityActions={[{ name: 'stop', label: 'Stop tester questions' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'stop') stop();
      }}
    >
      {/* An L1 plate: an invitation, not a choice (spec §5 rule 3). */}
      <Card variant="plate" style={{ gap: space.sm }}>
        <T v="caption" color={c.accentText} accessibilityRole="header">{card.caption}</T>
        <T v="body">{card.body}</T>
        {/* Never "You studied on 0 of the last 7 days" (review 1.41): the line is left out at 0. */}
        {card.studiedOfLast7 !== undefined && card.studiedOfLast7 > 0 && (
          // On screen only: the email never carries it.
          <View accessible accessibilityLabel={`${weekLine(card.studiedOfLast7)} Counted on this phone only, and not put in the email.`}>
            <T v="small">{weekLine(card.studiedOfLast7)}</T>
            <T v="meta">Counted on this phone only, and not put in the email.</T>
          </View>
        )}
        {card.closing && <T v="small" color={c.ink2}>{card.closing}</T>}
        {sent === 'opened' ? (
          <View accessibilityLiveRegion="polite">
            <T v="small" color={c.ink2}>Your email app opened with the question. Nothing is sent until you press Send.</T>
          </View>
        ) : sent === 'failed' ? (
          <View accessibilityLiveRegion="polite" style={{ gap: space.xs }}>
            <T v="small" color={c.ink2}>No email app opened. You can send this to:</T>
            <T v="label" selectable color={c.accentText}>{config.feedbackEmail}</T>
            <T v="meta" selectable>{emailAsText(email)}</T>
            <Row gap={0} style={{ flexWrap: 'wrap', marginLeft: -space.sm }}>
              <Button kind="ghost" label="Share instead" accessibilityHint="Opens the share sheet with the question" onPress={() => shareEmail(email)} />
              <Button kind="ghost" label="Try again" onPress={answer} />
            </Row>
          </View>
        ) : (
          <Row gap={space.sm} style={{ flexWrap: 'wrap', marginTop: space.xs }}>
            <Button kind="secondary" label="Answer by email" accessibilityHint="Opens your email app with this question. Nothing is sent until you press Send." onPress={answer} />
            <Button kind="ghost" label="Not today" accessibilityLabel="Not today, hide this question" onPress={notToday} />
          </Row>
        )}
        <T v="meta">Turn these off any time in Help.</T>
      </Card>
    </View>
  );
}

export function NameAskCard({ onGone }: { onGone?: () => void }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [gone, setGone] = useState(false);
  if (gone) return null;
  const close = (said: string) => {
    setOpen(false);
    setGone(true);
    sayLater(said);
    onGone?.();
  };
  const save = () => {
    const clean = cleanDisplayName(draft);
    // A link or an email is left out: the sheet stays open and the field says why.
    if (clean === '' && draft.trim() !== '') return;
    if (clean) useSettings.getState().setDisplayName(clean);
    close(clean ? `Saved. Hello, ${clean}.` : 'No name saved. You can add one in Settings.');
  };
  return (
    <>
      <InviteRow
        testID="name-ask"
        icon={<UserRound size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
        title="What should we call you?"
        body="Optional. A first name or a nickname, kept on this phone."
        actions={
          <>
            <Button kind="ghost" label="Add a name" accessibilityHint="Opens a box for your name" onPress={() => setOpen(true)} />
            <Button kind="ghost" label="Not now" accessibilityLabel="Not now, no name" onPress={() => close('No name. You can add one any time in Settings.')} />
          </>
        }
      />
      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Your name"
        intro="A first name or a nickname, whatever you like."
        closeLabel="Cancel"
        footer={<Button label="Save" onPress={save} />}
      >
        <DisplayNameField value={draft} onChange={setDraft} onSubmit={save} />
      </Sheet>
    </>
  );
}
