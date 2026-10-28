/**
 * Home-screen widgets in the app (mobile 1.47, Android only):
 *
 * - WidgetSettingsGroup: Settings → Home-screen widgets.
 *   - Details on widgets: one switch for every widget. Off = general words
 *     only: no topic, count, question, rule or exam word on any widget.
 *   - Exam timing on widgets: off until the learner turns it on (adding the
 *     Exam countdown widget asks the same question).
 *   - Readiness widget: Rings only (first and recommended), the range, or Off.
 *   - Add a widget: one button per widget, recommended ones first.
 *   A widget's "Tap to choose" opens the exact choice here, then goes back.
 * - WidgetOfferCard: the one "add a widget" suggestion on Today.
 * - ReadinessAskCard: the one re-ask, 30 days after choosing to show the number.
 * - WidgetTesterCard / WidgetNumbersRow: beta testers only (Help's switch).
 *
 * These choices stay on this phone (store/widgets.ts): not in the backup file,
 * never synced. Hidden where widgets aren't supported (iOS for now, the web, Expo Go).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState, type Ref } from 'react';
import { View } from 'react-native';
import { PICKER_LABELS, readReveal, REVEAL_KEY, WIDGET_KINDS, WIDGET_TITLES, type ReadinessPref, type WidgetKind } from '../engine/widgets';
import { widgetNumbers, widgetTesterEmail, type WidgetTesterCard as TesterCardData } from '../engine/widgetTester';
import { mailtoUrl } from '../engine/support';
import { dayKey } from '../engine/streak';
import { moveFocus, sayLater } from '../lib/a11y';
import { config } from '../lib/config';
import { appInfo, openEmail } from '../lib/support';
import { pinWidget, widgetsSupported } from '../lib/widgets';
import { useWidgetStore } from '../store/widgets';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ICON_STROKE, LayoutGrid } from './icons';
import { ChoiceSheet, SettingsGroup, SettingsRow, Sheet } from './settings';
import { Button, Card, ICON_SIZE, InviteRow, Row, T, ToggleRow } from './ui';

const READINESS_LABEL: Record<ReadinessPref, string> = { off: 'Off', show: 'Rings and range', private: 'Rings only' };

/** The words the Details switch uses: exactly what it hides. */
export const DETAILS_SUBTITLE = 'Topics, counts, questions, rules and exam timing. Off: every widget uses general words only.';
export const TIMING_SUBTITLE = 'Weeks to your exam, the final week, the eve and exam day. Off: no widget mentions your exam.';

/** One line per widget kind in the "Add a widget" list (what it shows, in plain words). */
const ADD_LINES: Record<WidgetKind, string> = {
  plan: 'What to study today, and one tap to start',
  plant: 'Your plant, growing as answers stick',
  think: 'One exam rule a day: think, then check',
  week: 'The days you studied this week, as leaves',
  question: 'A question you got right before: recall it, then check',
  revisit: 'One key term a day, and its meaning',
  countdown: 'Your weeks to the exam as a road (asks first)',
  readiness: 'Your study estimate, rings only to start (asks first)',
};

/**
 * The line under a widget in the list. Mobile 1.48 renamed three widgets; the
 * phone's own widget list keeps the old names until the next store build, so
 * the line says what to look for (it goes once the names match).
 */
export function addWidgetLine(k: WidgetKind): string {
  return PICKER_LABELS[k] === WIDGET_TITLES[k] ? ADD_LINES[k] : `${ADD_LINES[k]}. In your phone’s widget list: ${PICKER_LABELS[k]}`;
}

export function WidgetSettingsGroup({ openOnMount, onLinkDone, headRef }: { openOnMount?: 'readiness' | 'timing'; onLinkDone?: () => void; headRef?: Ref<View> }) {
  const { c } = useTheme();
  const prefs = useWidgetStore((s) => s.prefs);
  const [sheet, setSheet] = useState<'readiness' | 'timing' | 'add' | null>(openOnMount ?? null);
  const [addLine, setAddLine] = useState<string | null>(null);
  const fromLink = useRef(Boolean(openOnMount));
  const readinessRow = useRef<View>(null);
  const timingRow = useRef<View>(null);
  const addRow = useRef<View>(null);
  if (!widgetsSupported) return null;
  const close = () => {
    const back = sheet === 'readiness' ? readinessRow : sheet === 'timing' ? timingRow : addRow;
    setSheet(null);
    // Opened from a widget's "Tap to choose": go back where the learner came from.
    if (fromLink.current) {
      fromLink.current = false;
      onLinkDone?.();
      return;
    }
    moveFocus(back, 300);
  };
  return (
    <>
      <SettingsGroup headRef={headRef} cat="widgets" title="Home-screen widgets" intro="Others may see your home screen. Widgets never show your name, and nothing leaves this phone.">
        <ToggleRow title="Details on widgets" subtitle={DETAILS_SUBTITLE} value={prefs.details === 'show'} onValueChange={(on) => useWidgetStore.getState().setDetails(on ? 'show' : 'hide')} />
        <ToggleRow
          ref={timingRow as never}
          title="Exam timing on widgets"
          subtitle={TIMING_SUBTITLE}
          value={prefs.timing}
          onValueChange={(on) => useWidgetStore.getState().setTiming(on)}
        />
        <SettingsRow ref={readinessRow} title="Readiness widget" subtitle="Your study estimate on the home screen." value={READINESS_LABEL[prefs.readiness]} onPress={() => setSheet('readiness')} />
        <SettingsRow ref={addRow} title="Add a widget" subtitle="Choose one for your home screen" onPress={() => setSheet('add')} last />
        {addLine ? (
          <T v="meta" color={c.accentText} style={{ marginTop: space.xs, marginBottom: space.sm }}>
            {addLine}
          </T>
        ) : null}
      </SettingsGroup>
      <ChoiceSheet<ReadinessPref>
        visible={sheet === 'readiness'}
        onClose={close}
        title="Readiness widget"
        intro="Anyone who sees your phone can see this widget. You can change it any time."
        options={[
          { value: 'private', title: 'Rings only', subtitle: 'No number on your home screen. Tap the widget to see it in KaiSip.', badge: 'Recommended' },
          { value: 'show', title: 'Rings and your range', subtitle: 'The range shows, called a study estimate. It rests in the 3 weeks before your exam.' },
          { value: 'off', title: 'Off', subtitle: 'The widget asks you to choose, and shows nothing.' },
        ]}
        value={prefs.readiness}
        onChange={(v) => useWidgetStore.getState().setReadiness(v, dayKey(Date.now()))}
      />
      <ChoiceSheet<'on' | 'off'>
        visible={sheet === 'timing'}
        onClose={close}
        title="Exam timing on widgets"
        intro="Anyone who sees your phone can see your widgets."
        options={[
          { value: 'on', title: 'Show it', subtitle: 'Weeks to your exam (never the date), and calm words for the final week, the eve and exam day.' },
          { value: 'off', title: 'Don’t show it', subtitle: 'No widget mentions your exam.' },
        ]}
        value={prefs.timing ? 'on' : 'off'}
        onChange={(v) => useWidgetStore.getState().setTiming(v === 'on')}
      />
      {/* A list of actions, not a choice: buttons, not radio buttons. Recommended first. */}
      <Sheet visible={sheet === 'add'} onClose={close} title="Add a widget" intro="Your launcher asks before it adds one. You can also long-press your home screen and choose Widgets.">
        {WIDGET_KINDS.map((k, i) => (
          <SettingsRow
            key={k}
            title={WIDGET_TITLES[k]}
            subtitle={addWidgetLine(k)}
            accessibilityLabel={`Add ${WIDGET_TITLES[k]}. ${addWidgetLine(k)}`}
            chevron={false}
            last={i === WIDGET_KINDS.length - 1}
            onPress={() => {
              setSheet(null);
              void pinWidget(k).then((asked) => {
                const line = asked ? `Your launcher is asking to add ${WIDGET_TITLES[k]}.` : 'This launcher can’t add widgets from the app. Long-press your home screen and choose Widgets.';
                setAddLine(line);
                sayLater(line);
                moveFocus(addRow, 300);
              });
            }}
          />
        ))}
      </Sheet>
    </>
  );
}

/**
 * The one "add a widget" suggestion on Today (engine/widgets.ts widgetOfferDue):
 * on a cleared day, from the 3rd study day, never in exam week, once ever.
 * Either answer ends it for good; nothing is earned by adding one.
 */
export function WidgetOfferCard({ onGone }: { onGone?: () => void }) {
  const { c } = useTheme();
  const answer = (a: 'added' | 'not-now', line: string) => {
    useWidgetStore.getState().answerOffer(a);
    sayLater(line);
    onGone?.();
  };
  return (
    <InviteRow
      testID="widget-offer"
      icon={<LayoutGrid size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
      title="A glance instead of a reminder"
      body="Add Today’s plan to your home screen: the day’s plan and one tap to start. It never shows your name."
      actions={
        <>
          <Button
            kind="ghost"
            label="Add widget"
            onPress={() => {
              void pinWidget('plan').then((asked) =>
                answer('added', asked ? 'Your launcher is asking to add the widget.' : 'Long-press your home screen and choose Widgets to add it.'),
              );
            }}
          />
          <Button kind="ghost" label="Not now" accessibilityLabel="Not now. This won’t be suggested again." onPress={() => answer('not-now', 'Hidden. You can add a widget from Settings any time.')} />
        </>
      }
    />
  );
}

/** "Keep your readiness number on your home screen?": asked once, 30 days after choosing to show it. */
export function ReadinessAskCard({ onGone }: { onGone?: () => void }) {
  const { c } = useTheme();
  const answer = (keep: boolean) => {
    useWidgetStore.getState().answerReadinessAsk(keep);
    sayLater(keep ? 'Kept. You can change it in Settings.' : 'The widget now shows rings only.');
    onGone?.();
  };
  return (
    <InviteRow
      testID="readiness-ask"
      icon={<LayoutGrid size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
      title="Keep your readiness number on your home screen?"
      body="It has shown your range for a month. Rings only keeps the widget without the number."
      actions={
        <>
          <Button kind="ghost" label="Keep it" onPress={() => answer(true)} />
          <Button kind="ghost" label="Rings only" onPress={() => answer(false)} />
        </>
      }
    />
  );
}

/** A widget tester card (beta testers only): the 14-day check-in, or why a widget was removed. */
export function WidgetTesterCard({ card, today, onGone }: { card: TesterCardData; today: string; onGone?: () => void }) {
  const { c } = useTheme();
  const [sent, setSent] = useState<'idle' | 'opened' | 'failed'>('idle');
  const email = widgetTesterEmail(card, appInfo());
  const answer = async () => {
    const result = await openEmail(email, mailtoUrl(config.feedbackEmail, email));
    if (result === 'opened') useWidgetStore.getState().answerTester(card.id);
    setSent(result === 'opened' ? 'opened' : 'failed');
  };
  return (
    <View testID="widget-tester-card">
      <Card variant="plate" style={{ gap: space.sm }}>
        <T v="caption" color={c.accentText} accessibilityRole="header">{card.caption}</T>
        {card.removed ? <T v="small" color={c.ink2}>{`Removed: ${card.removed}`}</T> : null}
        {card.questions.map((q) => (
          <T key={q} v="body">{q}</T>
        ))}
        {card.countLine ? (
          <View accessible accessibilityLabel={`${card.countLine} Not put in the email.`}>
            <T v="small">{card.countLine}</T>
            <T v="meta">Not put in the email.</T>
          </View>
        ) : null}
        {sent === 'opened' ? (
          <T v="small" color={c.ink2}>Your email app opened with the questions. Nothing is sent until you press Send.</T>
        ) : (
          <Row gap={space.sm} style={{ flexWrap: 'wrap', marginTop: space.xs }}>
            <Button kind="secondary" label="Answer by email" accessibilityHint="Opens your email app with these questions. Nothing is sent until you press Send." onPress={answer} />
            <Button
              kind="ghost"
              label="Not today"
              onPress={() => {
                useWidgetStore.getState().skipTester(today);
                sayLater('Hidden until tomorrow.');
                onGone?.();
              }}
            />
          </Row>
        )}
        {sent === 'failed' ? <T v="small" color={c.ink2}>{`No email app opened. You can write to ${config.feedbackEmail}.`}</T> : null}
      </Card>
    </View>
  );
}

/** Help → "Widget numbers on this phone" (beta testers only): read-only lines, never sent. */
export function WidgetNumbersRow() {
  const [open, setOpen] = useState(false);
  const [self, setSelf] = useState<Record<string, { had: number; notYet: number }>>({});
  const stats = useWidgetStore((s) => s.stats);
  const [today] = useState(() => dayKey(Date.now()));
  useEffect(() => {
    if (!open) return;
    void AsyncStorage.getItem(REVEAL_KEY).then((raw) => setSelf(readReveal(raw, today).self));
  }, [open, today]);
  if (!widgetsSupported) return null;
  const lines = widgetNumbers(stats, self, today);
  return (
    <>
      <SettingsRow title="Widget numbers on this phone" subtitle="For your tester emails. Never sent by the app." last onPress={() => setOpen(true)} />
      <Sheet visible={open} onClose={() => setOpen(false)} title="Widget numbers on this phone" intro="Counted on this phone only. Copy any you want into a tester email.">
        {lines.map((l) => (
          <T key={l} v="small" selectable style={{ marginBottom: space.sm }}>{l}</T>
        ))}
      </Sheet>
    </>
  );
}
