/**
 * Report a problem, Send feedback and Contact support (mobile 1.7).
 * Spec: Uplift Phase 1 "Ask and fix" (support.md §3–6), DESIGN_SYSTEM.md.
 *
 * The pieces:
 * - useReportFlow(certId, target): the "Report a problem" link for ONE item
 *   (a question, note, lesson step, game recap card or the app), its page
 *   sheet, and the calm note shown after the email app opened. Every entry
 *   point uses it, so they all look, speak and behave the same.
 * - ReportRow: the trust-line layout (a hairline, a meta line on the left,
 *   the link on the right), used under answers and notes.
 * - useContactFlow(certId): the Send feedback and Contact support sheets.
 *
 * How sending works (lib/support.ts): the learner's own email app opens
 * with everything filled in. If no email app opens, or the learner taps
 * "Copy or share instead", the sheet shows the address and the whole
 * message as text they can select, plus "Share details". We never say
 * "sent": the email app can't tell us. So the link after a report says
 * "Report started 11 Oct", never "Reported".
 *
 * Every send is guarded by a ref (not state), so two taps in one frame open
 * ONE email, and a try/finally always frees the button.
 *
 * Calm and honest: no confetti, no XP for reporting, no guilt. The note
 * after sending says "Finished in your email app?" and "We read every
 * report"; no reply-time promise until the owner approves one.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useMotion } from './motion';
import { CLOUD } from '../cloud/flag';
import { PostPubliclyLine } from './boardLink';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ASKS_FOR_ANSWER,
  buildFeedbackEmail,
  buildSupportEmail,
  FEEDBACK_KINDS,
  fitReport,
  itemRef,
  lastReportFor,
  MAX_NOTE,
  PARTS,
  parseVersion,
  REASONS,
  reportDetails,
  SUPPORT_TOPICS,
  type DisplayDetails,
  type Email,
  type FeedbackKind,
  type ReportTarget,
  type SupportTopic,
} from '../engine/support';
import type { Letter } from '../content/types';
import { ANNOUNCE_DELAY, moveFocus, sayLater } from '../lib/a11y';
import { config } from '../lib/config';
import { shortDate } from '../lib/format';
import { appInfo, certName, emailAsText, makeRef, openEmail, shareEmail } from '../lib/support';
import { useProgress } from '../store/progress';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Check, ChevronDown, ICON_STROKE } from './icons';
import { Button, Chip, Gap, NoteField, PushedHeader, RadioRow, T, ToggleRow } from './ui';

// ── Copy (support.md §15) ────────────────────────────────────────────────
export const REPORT_LABEL = 'Report a problem';
const SEND_HINT = 'Opens your email app with the report filled in.';
const DISCLOSURE =
  'Your email app opens with this filled in. You can read and change it before sending. We’ll see your email address so we can reply. Nothing else about you is included.';
const NO_EXAM_CONTENT = 'Please don’t include questions from the real exam.';
const REPORT_DONE = { title: 'Finished in your email app?', body: 'If you sent it, thank you. We read every report, and fixes show up in What’s new.' };
const MESSAGE_DONE = { title: 'Finished in your email app?', body: 'If you sent it, thank you. We read every message.' };
/** Shown once the sheet's send failed: no email app on this phone. */
const NO_APP = 'We couldn’t open an email app.';
/** Shown when the learner chose "Copy or share instead". */
const OWN_WAY = 'Send it your own way';
const OWN_WAY_LABEL = 'Copy or share instead';
const OWN_WAY_HINT = 'Shows the address and the whole message, to copy or share with any app';
/** Under a disabled "Write the email", so a sighted learner knows why. */
const PICK_FIRST = 'Choose what’s wrong to continue.';

/** What a screen reader says for the link: "Report a problem with question d4_217". */
export function reportA11yLabel(t: ReportTarget): string {
  switch (t.kind) {
    case 'question':
      return `${REPORT_LABEL} with question ${t.id}`;
    case 'note':
      return `${REPORT_LABEL} with note ${t.id}`;
    case 'lesson':
      // Lesson complete reports the whole lesson (no step); a check names its step.
      return t.step ? `${REPORT_LABEL} with this lesson step` : `${REPORT_LABEL} with this lesson`;
    case 'card':
      return `${REPORT_LABEL} with this card`;
    case 'principle':
      return `${REPORT_LABEL} with principle ${t.id}`;
    case 'app':
      return `${REPORT_LABEL} with the app`;
  }
}

/** The meta line under the sheet's title ("Question d4_217 · IS Operations"). */
function sheetMeta(t: ReportTarget): string {
  switch (t.kind) {
    case 'question':
      return [`Question ${t.id}`, t.name].filter(Boolean).join(' · ');
    case 'note':
      return [`Note ${t.id}`, t.name].filter(Boolean).join(' · ');
    case 'lesson':
      return [t.name, t.step && t.steps ? `Step ${t.step} of ${t.steps}` : undefined].filter(Boolean).join(' · ');
    case 'card':
      return [t.name, 'game card'].filter(Boolean).join(' · ');
    case 'principle':
      return [`Principle ${t.id}`, t.name].filter(Boolean).join(' · ');
    case 'app':
      return `The app · ${t.where}`;
  }
}

/** Theme, text size and Reduce Motion: only added when the learner ticks the box. */
function useDisplayDetails(): DisplayDetails {
  const { isDark } = useTheme();
  const { fontScale } = useWindowDimensions();
  const { reduced: reduceMotion } = useMotion();
  return { theme: isDark ? 'dark' : 'light', textScale: fontScale, reduceMotion };
}

// ── Building blocks ──────────────────────────────────────────────────────
/**
 * "Finished in your email app?": a quiet tinted block (the "Backup file
 * ready" pattern), `soft` because nothing went right or wrong that we know
 * of. Announced once when the learner comes back from their email app (or
 * after ~600 ms if the app never left), never as a live region. It stays
 * until the screen changes: no timer to beat.
 */
export function SentNote({ title, body }: { title: string; body: string }) {
  const { c } = useTheme();
  useEffect(() => {
    const text = `${title} ${body}`;
    let said = false;
    const say = () => {
      if (said) return;
      said = true;
      sayLater(text, 600);
    };
    let left = AppState.currentState !== 'active';
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') left = true;
      else if (left) say();
    });
    // The email app may open without KaiSip ever leaving the screen (a
    // chooser, a tablet split view, the web build): announce anyway.
    const t = setTimeout(() => {
      if (!left) say();
    }, 1500);
    return () => {
      sub.remove();
      clearTimeout(t);
    };
  }, [title, body]);
  return (
    <View accessible style={{ backgroundColor: c.soft, borderRadius: radius.md, padding: space.md, marginTop: space.sm }}>
      <T v="caption" color={c.ink}>{title}</T>
      <T v="small" style={{ marginTop: space.xs }}>{body}</T>
    </View>
  );
}

/**
 * The quiet text link: "Report a problem", or "✓ Report started 11 Oct"
 * once this phone has a report about it. "Started", not "Reported": the
 * learner may have closed the draft or the fallback without sending.
 */
function ReportLinkButton({ target, reportedAt, onPress }: { target: ReportTarget; reportedAt?: number; onPress: () => void }) {
  const { c } = useTheme();
  const label = reportA11yLabel(target);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={reportedAt ? `Report started ${shortDate(reportedAt)}. ${label}` : label}
      accessibilityHint="Opens a short form, then your email app"
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
    >
      {reportedAt ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <Check size={14} color={c.muted} strokeWidth={2.5} />
          <T v="label" color={c.muted}>{`Report started ${shortDate(reportedAt)}`}</T>
        </View>
      ) : (
        <T v="label" color={c.accentText}>{REPORT_LABEL}</T>
      )}
    </Pressable>
  );
}

/**
 * A page sheet (the restore-preview pattern): slides up, a short fade under
 * Reduce Motion, a ✕ to close, the keyboard never covers the note, and the
 * buttons sit at the end of the scroll, not in a sticky footer.
 *
 * Keyboard (UX review P5): inside an iOS page sheet, KeyboardAvoidingView's
 * "padding" measures the sheet, not the window, and can leave the note under
 * the keyboard. So on iOS the ScrollView moves its own insets
 * (automaticallyAdjustKeyboardInsets, an iOS-only prop); on Android, where
 * an edge-to-edge Modal may not resize, the view shrinks ("height").
 * Check on a device: the note field and "Write the email" stay reachable.
 */
function SheetFrame({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const { c } = useTheme();
  const { reduced: reduceMotion } = useMotion();
  return (
    <Modal visible={visible} animationType={reduceMotion ? 'fade' : 'slide'} presentationStyle="pageSheet" onRequestClose={onClose}>
      {/* Sheets sit one surface tier above the screen behind them (raised2, mobile 1.9). */}
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.raised2 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? undefined : 'height'}>
          <ScrollView
            automaticallyAdjustKeyboardInsets
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.xxxl }}
          >
            <PushedHeader icon="close" onBack={onClose} />
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

/** A visible group name over a set of controls ("What's wrong?"). */
function GroupLabel({ children }: { children: string }) {
  return (
    <T v="caption" accessibilityRole="header" style={{ marginTop: space.xl, marginBottom: space.sm }}>
      {children}
    </T>
  );
}

/**
 * The message, to send another way: the address and the whole message as
 * text to select, "Share details" (the system Share sheet, which also has
 * Copy), "Try again" (back to the form, everything kept) and Close.
 * - why 'failed': no email app opened ("We couldn't open an email app.").
 * - why 'chosen': the learner tapped "Copy or share instead".
 * Screen-reader focus moves to the headline, because the button the learner
 * just pressed is gone (UX review P2).
 */
function FallbackPanel({ email, why, onRetry, onClose }: { email: Email; why: 'failed' | 'chosen'; onRetry: () => void; onClose: () => void }) {
  const { c, isDark } = useTheme();
  const headline = why === 'failed' ? NO_APP : OWN_WAY;
  // T doesn't forward refs, so the headline sits in a focusable View.
  const head = useRef<View>(null);
  useEffect(() => {
    sayLater(`${headline} The address and your message are shown, with a Share details button.`, ANNOUNCE_DELAY);
    moveFocus(head, ANNOUNCE_DELAY);
  }, [headline]);
  return (
    <View style={{ marginTop: space.xl }}>
      <View ref={head} accessible accessibilityRole="header" accessibilityLabel={headline}>
        <T v="headline">{headline}</T>
      </View>
      <T v="small" style={{ marginTop: space.sm }}>Send it from any email account to:</T>
      <T v="label" selectable color={c.accentText} style={{ marginTop: space.xs }}>{config.feedbackEmail}</T>
      <T v="small" style={{ marginTop: space.md }}>Tap “Share details” to send the message through the app you use, or select the text below.</T>
      <View style={{ marginTop: space.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: isDark ? c.line : c.control, backgroundColor: c.raised, padding: space.md }}>
        <T v="meta" selectable color={c.ink}>{emailAsText(email)}</T>
      </View>
      <Gap h={space.xl} />
      <Button label="Share details" accessibilityHint="Opens your phone’s share sheet with the whole message" onPress={() => shareEmail(email)} />
      <Gap h={space.sm} />
      <Button
        kind="secondary"
        label={why === 'failed' ? 'Try again' : 'Back to the form'}
        accessibilityHint="Goes back to the form, with everything you chose kept"
        onPress={onRetry}
      />
      <Gap h={space.sm} />
      <Button kind="ghost" label="Close" onPress={onClose} />
    </View>
  );
}

/** The quiet second way out under "Write the email" (code review #6: e.g. Mail deleted on iOS). */
function OwnWayButton({ disabled, onPress }: { disabled: boolean; onPress: () => void }) {
  return <Button kind="ghost" label={OWN_WAY_LABEL} accessibilityHint={OWN_WAY_HINT} disabled={disabled} onPress={onPress} style={{ alignSelf: 'center' }} />;
}

/**
 * A send that can't run twice: a ref (read and set in the same tick, so two
 * taps in one frame can't both pass), state for the disabled look, and a
 * try/finally so an error never leaves the button disabled for good.
 */
function useOneAtATime(): [boolean, (task: () => Promise<void>) => Promise<void>] {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const run = async (task: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      await task();
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  return [busy, run];
}

// ── The report sheet ─────────────────────────────────────────────────────
interface ReportSheetProps {
  visible: boolean;
  certId: string;
  target: ReportTarget;
  /** This phone already has a report about this item (its time). */
  reportedAt?: number;
  /** `restart` = the message panel was showing: next time, start a fresh form. */
  onClose: (restart: boolean) => void;
  /** The email app opened: the caller closes the sheet and shows the note. */
  onOpened: () => void;
}

export function ReportSheet({ visible, certId, target, reportedAt, onClose, onOpened }: ReportSheetProps) {
  const { c, isDark } = useTheme();
  const logReport = useProgress((s) => s.logReport);
  const display = useDisplayDetails();
  const reasons = REASONS[target.kind];
  const partChoices = PARTS[target.kind];
  const [parts, setParts] = useState<string[]>(target.part ? [target.part] : []);
  const [reason, setReason] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<Letter | null>(null);
  const [note, setNote] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  // The app's own problems often depend on the display: ticked by default there (support.md §5.1).
  const [withDisplay, setWithDisplay] = useState(target.kind === 'app');
  // The message panel: no email app opened, or the learner chose another way.
  const [panel, setPanel] = useState<{ email: Email; why: 'failed' | 'chosen' } | null>(null);
  const [busy, run] = useOneAtATime();
  // One reference per report, made once (lazy initialiser), so the preview and the email agree.
  const [ref] = useState(makeRef);
  // Logged once per sheet: "Try again" or a second way out doesn't add a second entry.
  const logged = useRef(false);

  const titleRef = useRef<View>(null);
  useEffect(() => {
    if (visible) moveFocus(titleRef, 500);
  }, [visible]);

  const askAnswer = Boolean(target.options?.length && target.perm && reason && ASKS_FOR_ANSWER.has(reason));
  const input = {
    target,
    // Before a reason is chosen, the preview says so instead of guessing one.
    reason: reason ?? 'not chosen yet',
    parts,
    suggestedDisplay: askAnswer ? (suggested ?? undefined) : undefined,
    certName: certName(certId),
    app: appInfo(),
    contentReviewed: config.contentReviewed,
    ref,
    display: target.kind === 'app' && withDisplay ? display : undefined,
  };

  /** Remember the report (once): the item, the reason, and the app version for the credit match. */
  const log = (why: string) => {
    if (logged.current) return;
    logged.current = true;
    const version = parseVersion(input.app.version) ? input.app.version : undefined;
    logReport({ ref, item: itemRef(target), reason: why, cert: certId, ...(version ? { version } : {}) });
  };

  const send = () =>
    run(async () => {
      if (!reason) return;
      const { email, url } = fitReport(config.feedbackEmail, { ...input, note });
      const result = await openEmail(email, url);
      // Logged either way: the learner started this report (support.md §4.6).
      log(reason);
      if (result === 'opened') onOpened();
      else setPanel({ email, why: 'failed' });
    });

  /** "Copy or share instead": the same message, shown to copy or share. */
  const ownWay = () => {
    if (!reason) return;
    log(reason);
    setPanel({ email: fitReport(config.feedbackEmail, { ...input, note }).email, why: 'chosen' });
  };

  const toggle = (code: string) => setParts((p) => (p.includes(code) ? p.filter((x) => x !== code) : [...p, code]));

  return (
    <SheetFrame visible={visible} onClose={() => onClose(panel !== null)}>
      {/* The first stop is the title, not the Close button (mobile 1.24): focus moves here as the sheet opens. */}
      <View ref={titleRef} accessible accessibilityRole="header" accessibilityLabel={REPORT_LABEL}>
        <T v="display">{REPORT_LABEL}</T>
      </View>
      <T v="meta" style={{ marginTop: space.xs }}>{sheetMeta(target)}</T>
      {reportedAt !== undefined && !panel && (
        <T v="small" color={c.ink2} style={{ marginTop: space.md }}>
          {`You started a report about this on ${shortDate(reportedAt)}. Send another if something else is wrong.`}
        </T>
      )}

      {panel ? (
        <FallbackPanel email={panel.email} why={panel.why} onRetry={() => setPanel(null)} onClose={() => onClose(true)} />
      ) : (
        <>
          {partChoices.length > 0 && (
            <>
              <GroupLabel>Which part? (optional)</GroupLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {partChoices.map((p) => (
                  <Chip key={p.code} checkbox label={p.label} selected={parts.includes(p.code)} onPress={() => toggle(p.code)} />
                ))}
              </View>
            </>
          )}

          <GroupLabel>What’s wrong?</GroupLabel>
          {/* The hint sits HERE, with the choice it is about (mobile 1.24), not under the disabled button far below. */}
          {!reason && <T v="meta" style={{ marginBottom: space.xs }}>{PICK_FIRST}</T>}
          <View accessibilityRole="radiogroup" accessibilityLabel="What’s wrong?">
            {reasons.map((r, i) => (
              <RadioRow key={r.code} title={r.label} checked={reason === r.code} onPress={() => setReason(r.code)} last={i === reasons.length - 1} />
            ))}
          </View>

          {askAnswer && target.options && (
            <>
              <GroupLabel>Which answer do you think is best? (optional)</GroupLabel>
              <View accessibilityRole="radiogroup" accessibilityLabel="Which answer do you think is best?">
                <RadioRow title="I’m not sure" checked={suggested === null} onPress={() => setSuggested(null)} />
                {target.options.map((o, i) => (
                  <RadioRow
                    key={o.display}
                    title={`${o.display}. ${o.text}`}
                    checked={suggested === o.display}
                    onPress={() => setSuggested(o.display)}
                    last={i === target.options!.length - 1}
                  />
                ))}
              </View>
            </>
          )}

          <GroupLabel>Add a note (optional)</GroupLabel>
          <NoteField
            value={note}
            onChangeText={setNote}
            placeholder="What did you expect to see?"
            accessibilityLabel="Add a note"
            maxLength={MAX_NOTE}
          />
          <T v="meta" style={{ marginTop: space.xs }}>{NO_EXAM_CONTENT}</T>

          {target.kind === 'app' && (
            <ToggleRow
              title="Include display details"
              subtitle="Theme, text size and Reduce Motion. Helps with layout problems."
              value={withDisplay}
              onValueChange={setWithDisplay}
              last
            />
          )}

          {/* "What we'll send": the exact lines, so the learner can check nothing about them is in it. */}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showDetails }}
            accessibilityLabel="What we’ll send"
            onPress={() => setShowDetails(!showDetails)}
            style={({ pressed }) => ({ marginTop: space.lg, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, opacity: pressed ? 0.7 : 1 })}
          >
            <View style={showDetails ? { transform: [{ rotate: '180deg' }] } : undefined}>
              <ChevronDown size={18} color={c.accentText} strokeWidth={ICON_STROKE} />
            </View>
            <T v="label" color={c.accentText}>What we’ll send</T>
          </Pressable>
          {showDetails && (
            <View style={{ borderRadius: radius.md, borderWidth: 1.5, borderColor: isDark ? c.line : c.control, backgroundColor: c.raised, padding: space.md }}>
              <T v="meta" selectable color={c.ink}>{reportDetails(input).join('\n')}</T>
              <T v="meta" style={{ marginTop: space.sm }}>Plus your note, if you add one.</T>
            </View>
          )}

          <T v="small" color={c.ink2} style={{ marginTop: space.lg }}>{DISCLOSURE}</T>
          <Gap h={space.xl} />
          <Button
            label="Write the email"
            accessibilityHint={reason ? SEND_HINT : 'Choose what’s wrong first.'}
            disabled={!reason || busy}
            onPress={send}
          />
          <Gap h={space.sm} />
          <Button kind="secondary" label="Cancel" onPress={() => onClose(false)} />
          <OwnWayButton disabled={!reason || busy} onPress={ownWay} />
          {/* Cloud builds, signed in, an app problem: it can go on the feedback board instead (Phase 8). */}
          {CLOUD && target.kind === 'app' && <PostPubliclyLine kind="app" text={note} onGo={() => onClose(false)} />}
        </>
      )}
    </SheetFrame>
  );
}

// ── One item's report flow ───────────────────────────────────────────────
export interface ReportFlow {
  /** The link ("Report a problem" / "✓ Reported 11 Oct"). */
  link: ReactNode;
  /** The note after the email app opened, or null. Put it under the row. */
  block: ReactNode;
  /** The sheet (a Modal): render it anywhere in the screen. */
  sheet: ReactNode;
  /** Opens the sheet (for a button that isn't the link). */
  open: () => void;
  /** When this phone last started a report about this item (for a row that says so), or undefined. */
  reportedAt?: number;
}

/**
 * `onClosed` (mobile 1.49): runs each time the sheet goes away (closed, or the
 * email app opened), so a screen that opened it from somewhere other than the
 * link (the answer screen's ⋯ sheet) can put screen-reader focus back there.
 */
export function useReportFlow(certId: string, target: ReportTarget | null, opts: { onClosed?: () => void } = {}): ReportFlow {
  // `null` (mobile 1.49): nothing to report yet (a screen that calls this before it has its item). Opens nothing.
  const item = target ? itemRef(target) : '';
  const reported = useProgress((s) => (item ? lastReportFor(s.reports, certId, item) : undefined));
  const [visible, setVisible] = useState(false);
  // The sheet mounts on the first open and then stays (hidden), so a closed
  // sheet keeps the note; a list of 20 cards doesn't mount 20 sheets up front.
  const [mounted, setMounted] = useState(false);
  // The item whose email app just opened. Keyed by item, so if the screen
  // moves on to another item (the next question), the note doesn't follow.
  const [doneFor, setDoneFor] = useState<string | null>(null);
  // A new key after each report, so the next one starts with a fresh form and reference.
  const [round, setRound] = useState(0);
  const open = () => {
    if (!target) return;
    setDoneFor(null);
    setMounted(true);
    setVisible(true);
  };
  return {
    link: target ? <ReportLinkButton target={target} reportedAt={reported?.at} onPress={open} /> : null,
    block: doneFor === item ? <SentNote {...REPORT_DONE} /> : null,
    open,
    reportedAt: reported?.at,
    sheet: mounted && target && (
      <ReportSheet
        key={`${item}:${round}`}
        visible={visible}
        certId={certId}
        target={target}
        reportedAt={reported?.at}
        onClose={(restart) => {
          setVisible(false);
          // After the message panel, the next tap starts a fresh form (with
          // "You started a report about this…"), never the old panel.
          if (restart) setRound((r) => r + 1);
          opts.onClosed?.();
        }}
        onOpened={() => {
          setVisible(false);
          setDoneFor(item);
          setRound((r) => r + 1);
          opts.onClosed?.();
        }}
      />
    ),
  };
}

/**
 * Just the link (right-aligned), its note and its sheet: for lists where
 * every card would otherwise carry its own meta lines (the mistake journal,
 * UX review O8).
 */
export function ReportLink({ certId, target }: { certId: string; target: ReportTarget }) {
  const flow = useReportFlow(certId, target);
  return (
    <View>
      <View style={{ alignItems: 'flex-end' }}>{flow.link}</View>
      {flow.block}
      {flow.sheet}
    </View>
  );
}

/**
 * The trust-line layout under an answer or a note: a hairline, the meta
 * line on the left and the report link on the right (it wraps under at
 * large text), an optional second meta line, then the note after sending.
 */
export function ReportRow({
  certId,
  target,
  meta,
  sub,
  action,
}: {
  certId: string;
  target: ReportTarget;
  meta: string;
  sub?: string;
  /**
   * Mobile 1.22: a quiet text button after the meta ("Code 4B1.2 · Mark as
   * not read"), 48pt tall. A study note's read toggle lives here now that the
   * page reads itself as read at its end.
   */
  action?: { label: string; onPress: () => void; hint?: string };
}) {
  const { c } = useTheme();
  const flow = useReportFlow(certId, target);
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: c.line, marginTop: space.xs, paddingTop: space.xs }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: space.sm }}>
        {action ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', flexShrink: 1, columnGap: space.xs }}>
            <T v="meta">{`${meta} ·`}</T>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={action.label}
              accessibilityHint={action.hint}
              onPress={action.onPress}
              hitSlop={4}
              style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
            >
              <T v="meta" color={c.accentText}>{action.label}</T>
            </Pressable>
          </View>
        ) : (
          <T v="meta" style={{ flexShrink: 1 }}>{meta}</T>
        )}
        {flow.link}
      </View>
      {sub ? <T v="meta" color={c.muted}>{sub}</T> : null}
      {flow.block}
      {flow.sheet}
    </View>
  );
}

// ── Send feedback and Contact support ────────────────────────────────────
function FeedbackSheet({
  visible,
  certId,
  kind: initialKind,
  from,
  onClose,
  onOpened,
}: {
  visible: boolean;
  certId: string;
  kind: FeedbackKind;
  from?: string;
  onClose: (restart: boolean) => void;
  onOpened: () => void;
}) {
  const { c } = useTheme();
  const display = useDisplayDetails();
  const [kind, setKind] = useState<FeedbackKind>(initialKind);
  const [message, setMessage] = useState('');
  const [withDisplay, setWithDisplay] = useState(false);
  const [panel, setPanel] = useState<{ email: Email; why: 'failed' | 'chosen' } | null>(null);
  const [busy, run] = useOneAtATime();
  const email = () => buildFeedbackEmail({ kind, message, certName: certName(certId), app: appInfo(), from, display: withDisplay ? display : undefined });
  const send = () =>
    run(async () => {
      const e = email();
      const result = await openEmail(e);
      if (result === 'opened') onOpened();
      else setPanel({ email: e, why: 'failed' });
    });
  return (
    <SheetFrame visible={visible} onClose={() => onClose(panel !== null)}>
      {/* "Suggest an idea" opens this sheet with "An idea" chosen: the title says so. */}
      <T v="display" accessibilityRole="header">{initialKind === 'idea' ? 'Suggest an idea' : initialKind === 'confused' ? 'What confused you?' : 'Send feedback'}</T>
      <T v="body" color={c.ink2} style={{ marginTop: space.sm }}>
        Tell us what helps, what’s missing, or what feels off. It goes to the people who build KaiSip.
      </T>
      {panel ? (
        <FallbackPanel email={panel.email} why={panel.why} onRetry={() => setPanel(null)} onClose={() => onClose(true)} />
      ) : (
        <>
          <GroupLabel>What kind?</GroupLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {FEEDBACK_KINDS.map((k) => (
              <Chip key={k.code} label={k.label} selected={kind === k.code} onPress={() => setKind(k.code)} />
            ))}
          </View>
          <GroupLabel>Your message (optional)</GroupLabel>
          <NoteField
            value={message}
            onChangeText={setMessage}
            placeholder={
              kind === 'idea' ? 'What would help you most?' : kind === 'confused' ? 'What confused you, and on which screen?' : 'What would you like to tell us?'
            }
            accessibilityLabel="Your message"
            maxLength={MAX_NOTE}
          />
          <T v="meta" style={{ marginTop: space.xs }}>{NO_EXAM_CONTENT}</T>
          <ToggleRow
            title="Include display details"
            subtitle="Theme, text size and Reduce Motion. Helps with layout problems."
            value={withDisplay}
            onValueChange={setWithDisplay}
            last
          />
          <T v="small" color={c.ink2} style={{ marginTop: space.md }}>
            Your email app opens with this filled in. You can read and change it before sending. Please leave out personal details we don’t need.
          </T>
          <Gap h={space.xl} />
          <Button label="Write the email" accessibilityHint="Opens your email app with your message filled in." disabled={busy} onPress={send} />
          <Gap h={space.sm} />
          <Button kind="secondary" label="Cancel" onPress={() => onClose(false)} />
          <OwnWayButton disabled={busy} onPress={() => setPanel({ email: email(), why: 'chosen' })} />
          {/* Cloud builds, signed in, an idea: it can go on the feedback board instead (Phase 8). */}
          {CLOUD && kind === 'idea' && <PostPubliclyLine kind="idea" text={message} onGo={() => onClose(false)} />}
        </>
      )}
    </SheetFrame>
  );
}

function SupportSheet({
  visible,
  certId,
  topic: initialTopic,
  from,
  onClose,
  onOpened,
}: {
  visible: boolean;
  certId: string;
  topic?: SupportTopic;
  from?: string;
  onClose: (restart: boolean) => void;
  onOpened: () => void;
}) {
  const { c } = useTheme();
  const [topic, setTopic] = useState<SupportTopic | null>(initialTopic ?? null);
  const [panel, setPanel] = useState<{ email: Email; why: 'failed' | 'chosen' } | null>(null);
  const [busy, run] = useOneAtATime();
  const send = () =>
    run(async () => {
      if (!topic) return;
      const email = buildSupportEmail({ topic, certName: certName(certId), app: appInfo(), from });
      const result = await openEmail(email);
      if (result === 'opened') onOpened();
      else setPanel({ email, why: 'failed' });
    });
  return (
    <SheetFrame visible={visible} onClose={() => onClose(panel !== null)}>
      <T v="display" accessibilityRole="header">Contact support</T>
      <T v="body" color={c.ink2} style={{ marginTop: space.sm }}>We’re a small independent team. We read every message.</T>
      {panel ? (
        <FallbackPanel email={panel.email} why={panel.why} onRetry={() => setPanel(null)} onClose={() => onClose(true)} />
      ) : (
        <>
          <GroupLabel>What’s it about?</GroupLabel>
          <View accessibilityRole="radiogroup" accessibilityLabel="What’s it about?">
            {SUPPORT_TOPICS.map((t, i) => (
              <RadioRow key={t.code} title={t.label} checked={topic === t.code} onPress={() => setTopic(t.code)} last={i === SUPPORT_TOPICS.length - 1} />
            ))}
          </View>
          <T v="small" color={c.ink2} style={{ marginTop: space.lg }}>
            Your email app opens with the topic and the app version filled in. You write the rest.
          </T>
          <T v="meta" style={{ marginTop: space.sm }}>{NO_EXAM_CONTENT}</T>
          <Gap h={space.xl} />
          <Button
            label="Write the email"
            accessibilityHint={topic ? 'Opens your email app.' : 'Choose what it’s about first.'}
            disabled={!topic || busy}
            onPress={send}
          />
          {!topic && (
            <T v="meta" center style={{ marginTop: space.xs }}>Choose what it’s about to continue.</T>
          )}
          <T v="meta" style={{ marginTop: space.md }}>
            Or write to us at
          </T>
          <T v="label" selectable color={c.accentText}>{config.feedbackEmail}</T>
          <T v="meta" style={{ marginTop: space.lg }}>
            Found a problem in a question or note? Use “Report a problem” under it, so we know exactly which one.
          </T>
          <Gap h={space.lg} />
          <Button kind="secondary" label="Cancel" onPress={() => onClose(false)} />
        </>
      )}
    </SheetFrame>
  );
}

export interface ContactFlow {
  openFeedback: (kind?: FeedbackKind, from?: string) => void;
  openSupport: (topic?: SupportTopic, from?: string) => void;
  /** "Finished in your email app?" after either sheet, or null. */
  block: ReactNode;
  /**
   * The same note, only for the place that opened the sheet: put it under
   * that row or answer (UX review O3). `sheet` + `from` as passed to open…().
   */
  blockFor: (sheet: 'feedback' | 'support', from?: string) => ReactNode;
  /** Both sheets: render once anywhere in the screen. */
  sheets: ReactNode;
}

type ContactRequest = { sheet: 'feedback'; kind: FeedbackKind; from?: string } | { sheet: 'support'; topic?: SupportTopic; from?: string };
/** What a sheet was opened FOR: the same request keeps the learner's half-written text. */
const requestKey = (r: ContactRequest) => (r.sheet === 'feedback' ? `feedback:${r.kind}:${r.from ?? ''}` : `support:${r.topic ?? ''}:${r.from ?? ''}`);

/**
 * Send feedback and Contact support for one screen.
 * Both sheets stay mounted once opened (hidden when closed), like the report
 * sheet, so Cancel, a swipe down or Android back keeps what the learner
 * typed (UX review P3). A sheet starts fresh only when it is opened for
 * something else (another kind, topic or place), after the email app
 * opened, or after the message panel was shown.
 */
export function useContactFlow(certId: string): ContactFlow {
  const [open, setOpen] = useState<'feedback' | 'support' | null>(null);
  const [feedback, setFeedback] = useState<{ req: Extract<ContactRequest, { sheet: 'feedback' }>; round: number } | null>(null);
  const [support, setSupport] = useState<{ req: Extract<ContactRequest, { sheet: 'support' }>; round: number } | null>(null);
  // The request whose email app just opened (for the note under its row).
  const [done, setDone] = useState<ContactRequest | null>(null);
  const show = (next: ContactRequest) => {
    setDone(null);
    if (next.sheet === 'feedback') setFeedback((f) => (f && requestKey(f.req) === requestKey(next) ? f : { req: next, round: (f?.round ?? 0) + 1 }));
    else setSupport((p) => (p && requestKey(p.req) === requestKey(next) ? p : { req: next, round: (p?.round ?? 0) + 1 }));
    setOpen(next.sheet);
  };
  /** Start that sheet fresh next time (a new key). */
  const restart = (sheet: 'feedback' | 'support') => {
    if (sheet === 'feedback') setFeedback((f) => (f ? { ...f, round: f.round + 1 } : f));
    else setSupport((p) => (p ? { ...p, round: p.round + 1 } : p));
  };
  const close = (sheet: 'feedback' | 'support') => (again: boolean) => {
    setOpen(null);
    if (again) restart(sheet);
  };
  const opened = (req: ContactRequest) => () => {
    setOpen(null);
    setDone(req);
    restart(req.sheet);
  };
  const note = <SentNote {...MESSAGE_DONE} />;
  return {
    openFeedback: (kind = 'idea', from) => show({ sheet: 'feedback', kind, from }),
    openSupport: (topic, from) => show({ sheet: 'support', topic, from }),
    block: done ? note : null,
    blockFor: (sheet, from) => (done && done.sheet === sheet && (done.from ?? '') === (from ?? '') ? note : null),
    sheets: (
      <>
        {feedback && (
          <FeedbackSheet
            key={`f${feedback.round}`}
            visible={open === 'feedback'}
            certId={certId}
            kind={feedback.req.kind}
            from={feedback.req.from}
            onClose={close('feedback')}
            onOpened={opened(feedback.req)}
          />
        )}
        {support && (
          <SupportSheet
            key={`s${support.round}`}
            visible={open === 'support'}
            certId={certId}
            topic={support.req.topic}
            from={support.req.from}
            onClose={close('support')}
            onOpened={opened(support.req)}
          />
        )}
      </>
    ),
  };
}
