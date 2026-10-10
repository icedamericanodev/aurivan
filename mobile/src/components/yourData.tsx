/**
 * Settings → Your data: save a backup file, restore from one, and undo a
 * restore for 7 days (lib/backup.ts does the work).
 *
 * The restore is never a surprise: after the learner picks a file we show a
 * preview of what will change (exam, exam date, questions answered, last
 * studied, best streak; never the bank size) and wait for "Replace my
 * progress". A bad file shows one calm message and changes nothing.
 *
 * Confirmations and messages are drawn in the screen (not system alerts),
 * so they read the same on iOS, Android and the web build, and stay
 * readable at 200% text: every row stacks at large text sizes.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Alert, Modal, ScrollView, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BACKUP_ERROR_COPY, previewRows, UNDO_DAYS, undoAvailable, undoExpiresAt } from '../engine/backup';
import { examDateLabel } from '../engine/examDay';
import { dayKey } from '../engine/streak';
import { pickBackup, pruneUndo, restoreBackup, saveBackup, undoRestore, type PickOutcome, type ReminderOutcome } from '../lib/backup';
import { haptic } from '../lib/haptics';
import { useBackup } from '../store/backup';
import { LARGE_TEXT, radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Button, Gap, Section, T, useFontScale } from './ui';

type Busy = null | 'save' | 'pick' | 'restore' | 'undo';
type Message = { tone: 'ok' | 'problem'; title: string; text: string };
type Ready = Extract<PickOutcome, { kind: 'ok' }>;

/** "6 Oct 2026" for a timestamp, in the phone's local time. */
const dateOf = (ms: number) => examDateLabel(dayKey(ms));

/** One extra sentence about reminders after a restore or undo. */
function reminderLine(r: ReminderOutcome): string {
  if (r === 'on') return ' Your study reminder is set again.';
  if (r === 'blocked') return ' Reminders are off because notifications aren’t allowed for Aurivan. You can turn them on under Study.';
  return '';
}

export function YourData() {
  const { c } = useTheme();
  const lastBackupAt = useBackup((s) => s.lastBackupAt);
  const undo = useBackup((s) => s.undo);
  // "Now" is read once per visit (render stays pure).
  const [now] = useState(() => Date.now());
  const [busy, setBusy] = useState<Busy>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [preview, setPreview] = useState<Ready | null>(null);
  // A restore made during this visit is newer than `now`: count from whichever is later.
  const canUndo = undoAvailable(undo, Math.max(now, undo?.takenAt ?? 0));

  // An undo snapshot older than 7 days is dropped when Settings opens.
  useEffect(() => pruneUndo(), []);

  const say = (m: Message) => {
    setMessage(m);
    AccessibilityInfo.announceForAccessibility(`${m.title}. ${m.text}`);
  };

  const save = async () => {
    setMessage(null);
    setBusy('save');
    try {
      const out = await saveBackup();
      if (out === 'unavailable') say({ tone: 'problem', title: 'Can’t save here', text: 'This device can’t open the share sheet, so no backup was saved.' });
    } catch {
      say({ tone: 'problem', title: 'Backup not saved', text: 'Something went wrong while saving. Please try again.' });
    } finally {
      setBusy(null);
    }
  };

  const pick = async () => {
    setMessage(null);
    setBusy('pick');
    try {
      const out = await pickBackup();
      if (out.kind === 'error') say({ tone: 'problem', title: 'Couldn’t restore', text: BACKUP_ERROR_COPY[out.code] });
      else if (out.kind === 'ok') setPreview(out);
    } finally {
      setBusy(null);
    }
  };

  const confirmRestore = async () => {
    if (!preview) return;
    setBusy('restore');
    try {
      const r = await restoreBackup(preview.data);
      setPreview(null);
      haptic.success();
      say({ tone: 'ok', title: 'Restored', text: `Your progress from the backup is on this phone now. You can undo this for ${UNDO_DAYS} days.${reminderLine(r)}` });
    } catch {
      setPreview(null);
      say({ tone: 'problem', title: 'Couldn’t restore', text: BACKUP_ERROR_COPY['bad-data'] });
    } finally {
      setBusy(null);
    }
  };

  const confirmUndo = () => {
    if (!undo) return;
    Alert.alert('Undo the restore?', `Your progress goes back to how it was on ${dateOf(undo.takenAt)}, before the restore.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Undo restore',
        style: 'destructive',
        onPress: async () => {
          setBusy('undo');
          try {
            const r = await undoRestore();
            if (r === null) say({ tone: 'problem', title: 'Nothing to undo', text: 'The restore can only be undone for 7 days.' });
            else say({ tone: 'ok', title: 'Restore undone', text: `Your progress is back to how it was before.${reminderLine(r)}` });
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  return (
    <>
      <Section title="Your data" meta={lastBackupAt ? `Last backup: ${dateOf(lastBackupAt)}` : 'Last backup: never'} />
      <T v="small" color={c.ink2} style={{ marginTop: space.xs }}>
        Your progress is kept only on this phone. A backup file keeps it safe and moves it to a new phone. You choose where the file goes.
      </T>
      <Gap h={space.md} />
      <Button
        kind="secondary"
        label={busy === 'save' ? 'Saving…' : 'Save a backup'}
        accessibilityHint="Opens the share sheet to save a file with your progress."
        disabled={busy !== null}
        onPress={save}
      />
      <Gap h={space.sm} />
      <Button
        kind="secondary"
        label={busy === 'pick' ? 'Opening…' : 'Restore from a backup'}
        accessibilityHint="Choose a backup file. You will see what changes before anything is replaced."
        disabled={busy !== null}
        onPress={pick}
      />
      {/* The result first ("Restored… you can undo"), then the undo it mentions. */}
      {message && <DataMessage message={message} />}
      {canUndo && undo && (
        <View style={{ marginTop: space.sm }}>
          <Button
            kind="ghost"
            label="Undo restore"
            accessibilityHint={`Puts back your progress from before the restore. Available until ${dateOf(undoExpiresAt(undo))}.`}
            disabled={busy !== null}
            onPress={confirmUndo}
            style={{ alignSelf: 'flex-start' }}
          />
          <T v="meta">{`Available until ${dateOf(undoExpiresAt(undo))}.`}</T>
        </View>
      )}
      <RestorePreview ready={preview} busy={busy === 'restore'} onConfirm={confirmRestore} onCancel={() => setPreview(null)} />
    </>
  );
}

/** The result of an action: a tinted feedback block (spec §5: tinted blocks are feedback only). */
function DataMessage({ message }: { message: Message }) {
  const { c } = useTheme();
  const ok = message.tone === 'ok';
  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      style={{ marginTop: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: ok ? c.correctBg : c.tipBg }}
    >
      <T v="caption" color={ok ? c.correct : c.tip}>{message.title}</T>
      <T v="small" color={c.ink} style={{ marginTop: 2 }}>{message.text}</T>
    </View>
  );
}

/**
 * The restore preview: what is on this phone now, next to what the backup
 * would put back, then "Replace my progress" (destructive) or Cancel.
 */
export function RestorePreview({
  ready,
  busy,
  onConfirm,
  onCancel,
}: {
  ready: Ready | null;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { c } = useTheme();
  const reduceMotion = useReducedMotion();
  const large = useFontScale() >= LARGE_TEXT;
  const rows = ready ? previewRows(ready.now, ready.backup) : [];
  const saved = ready ? Date.parse(ready.data.exportedAt) : NaN;
  return (
    <Modal visible={ready !== null} animationType={reduceMotion ? 'none' : 'slide'} presentationStyle="pageSheet" onRequestClose={onCancel}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
        <ScrollView contentContainerStyle={{ padding: space.gutter, paddingBottom: space.xl }}>
          <T v="display" accessibilityRole="header">Restore this backup?</T>
          {Number.isFinite(saved) && <T v="meta" style={{ marginTop: space.xs }}>{`Saved on ${dateOf(saved)}`}</T>}
          <T v="body" color={c.ink2} style={{ marginTop: space.md }}>
            {`The progress on this phone will be replaced by the backup. You can undo this for ${UNDO_DAYS} days.`}
          </T>
          <Gap h={space.lg} />
          {rows.map((row, i) => (
            <View
              key={row.label}
              accessible
              accessibilityLabel={`${row.label}. On this phone: ${row.now}. In the backup: ${row.backup}.${row.changes ? '' : ' No change.'}`}
              style={{ paddingVertical: space.md, borderTopWidth: i === 0 ? 1 : 0, borderBottomWidth: 1, borderColor: c.line }}
            >
              <T v="label">{row.label}</T>
              {/* Side by side on a normal phone; stacked at large text so nothing is cut off. */}
              <View style={{ flexDirection: large ? 'column' : 'row', gap: large ? space.xs : space.md, marginTop: space.xs }}>
                <View style={{ flex: large ? undefined : 1 }}>
                  <T v="meta">This phone</T>
                  <T v="body" color={c.ink2}>{row.now}</T>
                </View>
                <View style={{ flex: large ? undefined : 1 }}>
                  <T v="meta">Backup</T>
                  {/* A value that changes is drawn in ink and bold; one that stays says so. */}
                  <T v={row.changes ? 'label' : 'body'} color={row.changes ? c.ink : c.ink2}>
                    {row.changes ? row.backup : `${row.backup} (same)`}
                  </T>
                </View>
              </View>
            </View>
          ))}
          <Gap h={space.xl} />
          <Button kind="danger" label={busy ? 'Restoring…' : 'Replace my progress'} disabled={busy} onPress={onConfirm} />
          <Gap h={space.sm} />
          <Button kind="secondary" label="Cancel" disabled={busy} onPress={onCancel} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
