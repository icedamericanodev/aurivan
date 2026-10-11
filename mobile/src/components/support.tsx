/**
 * Report a problem, Send feedback and Contact support (mobile 1.7).
 * Spec: Uplift Phase 1 "Ask and fix" (support.md §3–6), DESIGN_SYSTEM.md.
 *
 * The pieces:
 * - useReportFlow(certId, target): the "Report a problem" link for ONE item
 *   (a question, note, lesson step, game card or the app), its page sheet,
 *   and the calm note shown after the email app opened. Every entry point
 *   uses it, so they all look, speak and behave the same.
 * - ReportRow: the trust-line layout (a hairline, a meta line on the left,
 *   the link on the right), used under answers and notes.
 * - useContactFlow(certId): the Send feedback and Contact support sheets.
 *
 * How sending works (lib/support.ts): the learner's own email app opens
 * with everything filled in. If no email app opens, the sheet shows the
 * address and the whole message as text they can select, plus "Share
 * details". We never say "sent": the email app can't tell us.
 *
 * Calm and honest: no confetti, no XP for reporting, no guilt. The note
 * after sending says "Finished in your email app?" and "We read every
 * report"; no reply-time promise until the owner approves one.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { AppState, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
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
import { ANNOUNCE_DELAY, sayLater } from '../lib/a11y';
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

/** What a screen reader says for the link: "Report a problem with question d4_217". */
export function reportA11yLabel(t: ReportTarget): string {
  switch (t.kind) {
    case 'question':
      return `${REPORT_LABEL} with question ${t.id}`;
    case 'note':
      return `${REPORT_LABEL} with note ${t.id}`;
    case 'lesson':
      return `${REPORT_LABEL} with this lesson step`;
    case 'card':
      return `${REPORT_LABEL} with this card`;
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
    case 'app':
      return `The app · ${t.where}`;
  }
}

/** Theme, text size and Reduce Motion: only added when the learner ticks the box. */
function useDisplayDetails(): DisplayDetails {
  const { isDark } = useTheme();
  const { fontScale } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
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
    // The email app may open without Aurivan ever leaving the screen (a
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

/** The quiet text link: "Report a problem", or "✓ Reported 11 Oct" once this phone has a report about it. */
function ReportLinkButton({ target, reportedAt, onPress }: { target: ReportTarget; reportedAt?: number; onPress: () => void }) {
  const { c } = useTheme();
  const label = reportA11yLabel(target);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={reportedAt ? `Reported ${shortDate(reportedAt)}. ${label}` : label}
      accessibilityHint="Opens a short form, then your email app"
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
    >
      {reportedAt ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <Check size={14} color={c.muted} strokeWidth={2.5} />
          <T v="label" color={c.muted}>{`Reported ${shortDate(reportedAt)}`}</T>
        </View>
      ) : (
        <T v="label" color={c.accentText}>{REPORT_LABEL}</T>
      )}
    </Pressable>
  );
}

/**
 * A page sheet (the restore-preview pattern): slides up, no motion under
 * Reduce Motion, a ✕ to close, the keyboard never covers the note, and the
 * buttons sit at the end of the scroll, not in a sticky footer.
 */
function SheetFrame({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const { c } = useTheme();
  const reduceMotion = useReducedMotion();
  return (
    <Modal visible={visible} animationType={reduceMotion ? 'none' : 'slide'} presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.xxxl }}>
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
 * No email app on this phone: the address and the whole message as text to
 * select, and "Share details" (the system Share sheet) to paste it anywhere.
 */
function FallbackPanel({ email, onClose }: { email: Email; onClose: () => void }) {
  const { c, isDark } = useTheme();
  useEffect(() => {
    sayLater(`${NO_APP} The address and your message are shown, with a Share details button.`, ANNOUNCE_DELAY);
  }, []);
  return (
    <View style={{ marginTop: space.xl }}>
      <T v="headline" accessibilityRole="header">{NO_APP}</T>
      <T v="small" style={{ marginTop: space.sm }}>Send it from any email account to:</T>
      <T v="label" selectable color={c.accentText} style={{ marginTop: space.xs }}>{config.feedbackEmail}</T>
      <T v="small" style={{ marginTop: space.md }}>Tap “Share details” to copy the message into the app you use, or select the text below.</T>
      <View style={{ marginTop: space.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: isDark ? c.line : c.control, backgroundColor: c.raised, padding: space.md }}>
        <T v="meta" selectable color={c.ink}>{emailAsText(email)}</T>
      </View>
      <Gap h={space.xl} />
      <Button label="Share details" accessibilityHint="Opens your phone’s share sheet with the whole message" onPress={() => shareEmail(email)} />
      <Gap h={space.sm} />
      <Button kind="secondary" label="Close" onPress={onClose} />
    </View>
  );
}

// ── The report sheet ─────────────────────────────────────────────────────
interface ReportSheetProps {
  visible: boolean;
  certId: string;
  target: ReportTarget;
  /** This phone already has a report about this item (its time). */
  reportedAt?: number;
  onClose: () => void;
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
  const [failed, setFailed] = useState<Email | null>(null);
  const [busy, setBusy] = useState(false);
  // One reference per report, made once (lazy initialiser), so the preview and the email agree.
  const [ref] = useState(makeRef);

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

  const send = async () => {
    if (!reason || busy) return;
    setBusy(true);
    const { email, url } = fitReport(config.feedbackEmail, { ...input, note });
    const result = await openEmail(email, url);
    // Logged either way: the learner started this report (support.md §4.6).
    logReport({ ref, item: itemRef(target), reason, cert: certId });
    setBusy(false);
    if (result === 'opened') onOpened();
    else setFailed(email);
  };

  const toggle = (code: string) => setParts((p) => (p.includes(code) ? p.filter((x) => x !== code) : [...p, code]));

  return (
    <SheetFrame visible={visible} onClose={onClose}>
      <T v="display" accessibilityRole="header">{REPORT_LABEL}</T>
      <T v="meta" style={{ marginTop: space.xs }}>{sheetMeta(target)}</T>
      {reportedAt !== undefined && !failed && (
        <T v="small" color={c.ink2} style={{ marginTop: space.md }}>
          {`You started a report about this on ${shortDate(reportedAt)}. Send another if something else is wrong.`}
        </T>
      )}

      {failed ? (
        <FallbackPanel email={failed} onClose={onClose} />
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
          <Button kind="secondary" label="Cancel" onPress={onClose} />
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
}

export function useReportFlow(certId: string, target: ReportTarget): ReportFlow {
  const item = itemRef(target);
  const reported = useProgress((s) => lastReportFor(s.reports, certId, item));
  const [visible, setVisible] = useState(false);
  // The item whose email app just opened. Keyed by item, so if the screen
  // moves on to another item (the next question), the note doesn't follow.
  const [doneFor, setDoneFor] = useState<string | null>(null);
  // A new key after each report, so the next one starts with a fresh form and reference.
  const [round, setRound] = useState(0);
  const open = () => {
    setDoneFor(null);
    setVisible(true);
  };
  return {
    link: <ReportLinkButton target={target} reportedAt={reported?.at} onPress={open} />,
    block: doneFor === item ? <SentNote {...REPORT_DONE} /> : null,
    open,
    sheet: (
      <ReportSheet
        key={`${item}:${round}`}
        visible={visible}
        certId={certId}
        target={target}
        reportedAt={reported?.at}
        onClose={() => setVisible(false)}
        onOpened={() => {
          setVisible(false);
          setDoneFor(item);
          setRound((r) => r + 1);
        }}
      />
    ),
  };
}

/**
 * The trust-line layout under an answer or a note: a hairline, the meta
 * line on the left and the report link on the right (it wraps under at
 * large text), an optional second meta line, then the note after sending.
 */
export function ReportRow({ certId, target, meta, sub }: { certId: string; target: ReportTarget; meta: string; sub?: string }) {
  const { c } = useTheme();
  const flow = useReportFlow(certId, target);
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: c.line, marginTop: space.xs, paddingTop: space.xs }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: space.sm }}>
        <T v="meta" style={{ flexShrink: 1 }}>{meta}</T>
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
  onClose: () => void;
  onOpened: () => void;
}) {
  const { c } = useTheme();
  const display = useDisplayDetails();
  const [kind, setKind] = useState<FeedbackKind>(initialKind);
  const [message, setMessage] = useState('');
  const [withDisplay, setWithDisplay] = useState(false);
  const [failed, setFailed] = useState<Email | null>(null);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (busy) return;
    setBusy(true);
    const email = buildFeedbackEmail({ kind, message, certName: certName(certId), app: appInfo(), from, display: withDisplay ? display : undefined });
    const result = await openEmail(email);
    setBusy(false);
    if (result === 'opened') onOpened();
    else setFailed(email);
  };
  return (
    <SheetFrame visible={visible} onClose={onClose}>
      <T v="display" accessibilityRole="header">Send feedback</T>
      <T v="body" color={c.ink2} style={{ marginTop: space.sm }}>
        Tell us what helps, what’s missing, or what feels off. It goes to the people who build Aurivan.
      </T>
      {failed ? (
        <FallbackPanel email={failed} onClose={onClose} />
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
            placeholder={kind === 'idea' ? 'What would help you most?' : 'What would you like to tell us?'}
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
          <Button kind="secondary" label="Cancel" onPress={onClose} />
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
  onClose: () => void;
  onOpened: () => void;
}) {
  const { c } = useTheme();
  const [topic, setTopic] = useState<SupportTopic | null>(initialTopic ?? null);
  const [failed, setFailed] = useState<Email | null>(null);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!topic || busy) return;
    setBusy(true);
    const email = buildSupportEmail({ topic, certName: certName(certId), app: appInfo(), from });
    const result = await openEmail(email);
    setBusy(false);
    if (result === 'opened') onOpened();
    else setFailed(email);
  };
  return (
    <SheetFrame visible={visible} onClose={onClose}>
      <T v="display" accessibilityRole="header">Contact support</T>
      <T v="body" color={c.ink2} style={{ marginTop: space.sm }}>We’re a small independent team. We read every message.</T>
      {failed ? (
        <FallbackPanel email={failed} onClose={onClose} />
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
          <T v="meta" style={{ marginTop: space.md }}>
            Or write to us at
          </T>
          <T v="label" selectable color={c.accentText}>{config.feedbackEmail}</T>
          <T v="meta" style={{ marginTop: space.lg }}>
            Found a problem in a question or note? Use “Report a problem” under it, so we know exactly which one.
          </T>
          <Gap h={space.lg} />
          <Button kind="secondary" label="Cancel" onPress={onClose} />
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
  /** Both sheets: render once anywhere in the screen. */
  sheets: ReactNode;
}

export function useContactFlow(certId: string): ContactFlow {
  const [open, setOpen] = useState<null | { sheet: 'feedback'; kind: FeedbackKind; from?: string } | { sheet: 'support'; topic?: SupportTopic; from?: string }>(null);
  const [done, setDone] = useState(false);
  // A new key per opening: each sheet starts fresh with its preselected choice.
  const [round, setRound] = useState(0);
  const show = (next: NonNullable<typeof open>) => {
    setDone(false);
    setRound((r) => r + 1);
    setOpen(next);
  };
  const close = () => setOpen(null);
  const opened = () => {
    setOpen(null);
    setDone(true);
  };
  return {
    openFeedback: (kind = 'idea', from) => show({ sheet: 'feedback', kind, from }),
    openSupport: (topic, from) => show({ sheet: 'support', topic, from }),
    block: done ? <SentNote {...MESSAGE_DONE} /> : null,
    sheets: (
      <>
        {open?.sheet === 'feedback' && (
          <FeedbackSheet key={round} visible certId={certId} kind={open.kind} from={open.from} onClose={close} onOpened={opened} />
        )}
        {open?.sheet === 'support' && (
          <SupportSheet key={round} visible certId={certId} topic={open.topic} from={open.from} onClose={close} onOpened={opened} />
        )}
      </>
    ),
  };
}
