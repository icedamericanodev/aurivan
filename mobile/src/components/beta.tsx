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
 *   from the day after the first study day. Mobile 1.44: the field ("Name or
 *   nickname", the same field as Settings → Your name) is in the card, with
 *   Save and Not now; after Save, "Saved on this device" stays for the visit.
 *   "Not now" puts it away for good.
 */
import { useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { markAnswered, skipToday, switchTester, testerEmail, weekLine, type TesterCard } from '../engine/betaTester';
import { cleanDisplayName } from '../engine/displayName';
import { mailtoUrl } from '../engine/support';
import { ANNOUNCE_DELAY, moveFocus, sayLater } from '../lib/a11y';
import { config } from '../lib/config';
import { appInfo, emailAsText, openEmail, shareEmail } from '../lib/support';
import { useSeen } from '../store/seen';
import { useSettings } from '../store/settings';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { DisplayNameField } from './displayName';
import { Check, ICON_STROKE, UserRound } from './icons';
import { Button, Card, ICON_SIZE, IconCircle, Row, T } from './ui';

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

/** Mobile 1.44 (the owner's "Version 3" mockup): the card's words. */
export const NAME_ASK_TITLE = 'What should we call you?';
export const NAME_ASK_BODY = 'Optional. A first name or a nickname, kept on this device only.';
/** The field's words, inside it and spoken. */
export const NAME_ASK_FIELD = 'Name or nickname';
/** Under the field after Save with nothing typed. */
export const NAME_ASK_EMPTY = 'Type a name or nickname first, or choose Not now.';
/** What replaces the card for the rest of the visit once a name is saved. */
export const NAME_SAVED_TITLE = 'Saved on this device';
export const NAME_SAVED_BODY = 'Change or clear it any time in Settings.';

/**
 * Mobile 1.44: the field sits IN the card (one tap less than 1.41's sheet):
 * "Name or nickname", then Save and Not now. Saving updates the greeting at
 * once, and for the rest of this visit a "Saved on this device" line takes the
 * card's place (Today unmounts it when the learner leaves). "Not now" puts it
 * away for good. Today decides when it shows (engine/firstRun.ts nameAskDue).
 */
export function NameAskCard({ onGone }: { onGone?: () => void }) {
  const { c } = useTheme();
  const [draft, setDraft] = useState('');
  const [state, setState] = useState<'ask' | 'saved' | 'gone'>('ask');
  // Save with nothing typed: one plain line under the field (the field's live region says it), nothing saved.
  const [empty, setEmpty] = useState(false);
  // UX review P1: the field unmounts on Save, so screen-reader focus moves to the saved line, which says it all.
  const savedRef = useRef<View>(null);
  const [savedName, setSavedName] = useState('');
  if (state === 'gone') return null;
  if (state === 'saved') {
    return (
      // The InviteRow's shape; ONE stop that is spoken when focus lands on it (no live region: said once).
      <View
        ref={savedRef}
        testID="name-saved"
        accessible
        accessibilityLabel={`Saved. Hello, ${savedName}. ${NAME_SAVED_TITLE}. ${NAME_SAVED_BODY}`}
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingVertical: space.md }}
      >
        <IconCircle>
          <Check size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />
        </IconCircle>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="label">{NAME_SAVED_TITLE}</T>
          <T v="small" color={c.ink2} style={{ marginTop: space.xs }}>{NAME_SAVED_BODY}</T>
        </View>
      </View>
    );
  }
  const clean = cleanDisplayName(draft);
  const save = () => {
    // Nothing typed: say what to do. A link or an email is left out: the field already says why.
    if (clean === '') {
      if (draft.trim() === '') {
        setEmpty(true);
        // UX review P2: iOS has no live regions, so it is said here.
        if (Platform.OS === 'ios') sayLater(NAME_ASK_EMPTY);
      }
      return;
    }
    useSettings.getState().setDisplayName(clean);
    setSavedName(clean);
    setState('saved');
    moveFocus(savedRef, ANNOUNCE_DELAY);
  };
  const notNow = () => {
    setState('gone');
    sayLater('No name. You can add one any time in Settings.');
    onGone?.();
  };
  return (
    // The InviteRow's shape (an icon circle, the words, then the actions under them), with the field in it.
    <View testID="name-ask" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingVertical: space.md }}>
      <IconCircle>
        <UserRound size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />
      </IconCircle>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View accessible accessibilityLabel={`${NAME_ASK_TITLE} ${NAME_ASK_BODY}`}>
          <T v="label">{NAME_ASK_TITLE}</T>
          <T v="small" color={c.ink2} style={{ marginTop: space.xs }}>{NAME_ASK_BODY}</T>
        </View>
        <View style={{ marginTop: space.md }}>
          <DisplayNameField
            value={draft}
            onChange={(v) => {
              setDraft(v);
              setEmpty(false);
            }}
            onSubmit={save}
            label={NAME_ASK_FIELD}
            helper={empty ? NAME_ASK_EMPTY : null}
          />
        </View>
        <Row gap={0} style={{ flexWrap: 'wrap', marginLeft: -space.sm, marginTop: space.xs }}>
          <Button kind="ghost" label="Save" accessibilityLabel="Save my name" onPress={save} />
          <Button kind="ghost" label="Not now" accessibilityLabel="Not now, no name" onPress={notNow} />
        </Row>
      </View>
    </View>
  );
}
