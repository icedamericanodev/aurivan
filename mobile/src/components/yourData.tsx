/**
 * Settings → Your data: save a backup file, restore from one, and undo a
 * restore for 7 days (lib/backup.ts does the work; lib/useRestoreFlow.ts
 * runs pick → preview → confirm, shared with the welcome screen).
 *
 * The restore is never a surprise: after the learner picks a file we show a
 * preview of what will change (exam, exam date, questions answered, last
 * studied, best streak, study reminder; never the bank size) and wait for
 * "Replace my progress". A bad file shows one calm message and changes nothing.
 *
 * The preview and the messages are drawn in the screen, so they read the
 * same on iOS, Android and the web build, and stay readable at 200% text
 * (every row stacks at large sizes). Undo asks first with a system alert,
 * like Reset.
 */
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { previewRows, UNDO_DAYS, undoAvailable, undoExpiresAt } from '../engine/backup';
import { examDateLabel } from '../engine/examDay';
import { dayKey } from '../engine/streak';
import { pruneUndo, saveBackup, sweepBackupFiles, undoRestore, type ReadyToRestore } from '../lib/backup';
import { reminderLine, useRestoreFlow, type FlowMessage } from '../lib/useRestoreFlow';
import { useBackup } from '../store/backup';
import { LARGE_TEXT, radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Button, Gap, Section, T, useFontScale } from './ui';

/** "6 Oct 2026" for a timestamp, in the phone's local time. */
const dateOf = (ms: number) => examDateLabel(dayKey(ms));

export function YourData() {
  const { c } = useTheme();
  const lastBackupAt = useBackup((s) => s.lastBackupAt);
  const restoredSavedAt = useBackup((s) => s.restoredSavedAt ?? null);
  const undo = useBackup((s) => s.undo);
  // "Now" is read once per visit (render stays pure). A snapshot taken
  // during this visit is still offered: undoAvailable only checks expiry.
  const [now] = useState(() => Date.now());
  const flow = useRestoreFlow();
  const { busy, setBusy, message, say } = flow;
  const canUndo = undoAvailable(undo, now);

  // Tidy up when Settings opens: an expired undo snapshot, and backup files
  // we made more than an hour ago in the app's cache.
  useEffect(() => {
    pruneUndo();
    sweepBackupFiles();
  }, []);

  const save = async () => {
    flow.setMessage(null);
    setBusy('save');
    try {
      const out = await saveBackup();
      // The share sheet can't tell us whether the file was really saved, so the copy says "if".
      if (out === 'shared') {
        say({ tone: 'ok', title: 'Backup file ready', text: 'If you saved it, you’re set. On a new phone, choose “Restore from a backup” and pick this file.' });
      } else {
        say({ tone: 'problem', title: 'Can’t share from here', text: 'This device can’t open the share sheet, so no backup file was made.' });
      }
    } catch {
      say({ tone: 'problem', title: 'Backup not made', text: 'Something went wrong while making the backup file. Please try again.' });
    } finally {
      setBusy(null);
    }
  };

  const confirmUndo = () => {
    if (!undo) return;
    Alert.alert(
      'Undo the restore?',
      `Your progress goes back to how it was on ${dateOf(undo.takenAt)}, before the restore. Anything you studied since then will be replaced.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Undo restore',
          style: 'destructive',
          onPress: async () => {
            setBusy('undo');
            try {
              const r = await undoRestore();
              if (r.kind === 'ok') say({ tone: 'ok', title: 'Restore undone', text: `Your progress is back to how it was before.${reminderLine(r.reminders)}` });
              else if (r.kind === 'none') say({ tone: 'problem', title: 'Nothing to undo', text: `A restore can only be undone for ${UNDO_DAYS} days.` });
              else if (r.kind === 'invalid') {
                say({ tone: 'problem', title: 'Can’t undo', text: 'The copy kept from before the restore is damaged, so it can’t be used. Your progress stays as it is now.' });
              } else {
                say({ tone: 'problem', title: 'Undo didn’t finish', text: 'Something went wrong while saving, so your progress was put back as it was. Please try again.' });
              }
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  return (
    <>
      {/* "Made", not "saved": the share sheet can't tell us where the file went.
          After a restore (and no newer file made), the restored backup is the learner's latest copy. */}
      <Section
        title="Your data"
        meta={
          restoredSavedAt && (!lastBackupAt || restoredSavedAt > lastBackupAt)
            ? `Restored from a backup saved on ${dateOf(restoredSavedAt)}`
            : lastBackupAt
              ? `Last backup file made: ${dateOf(lastBackupAt)}`
              : 'No backup file yet'
        }
      />
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
        onPress={flow.pick}
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
            // Ghost buttons pad their label; pull it back so it lines up with the text below.
            style={{ alignSelf: 'flex-start', marginLeft: -space.sm }}
          />
          <T v="meta">{`Available until ${dateOf(undoExpiresAt(undo))}.`}</T>
        </View>
      )}
      <RestorePreview ready={flow.ready} busy={busy === 'restore'} onConfirm={flow.confirm} onCancel={flow.cancel} />
    </>
  );
}

/**
 * The result of an action: a tinted feedback block (spec §5: tinted blocks
 * are feedback only). Announced once by useRestoreFlow, so it is not a live
 * region (that would read it twice).
 */
export function DataMessage({ message }: { message: FlowMessage }) {
  const { c } = useTheme();
  const ok = message.tone === 'ok';
  return (
    <View accessible style={{ marginTop: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: ok ? c.correctBg : c.tipBg }}>
      <T v="caption" color={ok ? c.correct : c.tip}>{message.title}</T>
      <T v="small" color={c.ink} style={{ marginTop: space.xs }}>{message.text}</T>
    </View>
  );
}

/**
 * The restore preview.
 * - Normal: what is on this phone now next to what the backup would put
 *   back, then "Replace my progress" (destructive) or Cancel. A warning
 *   when the backup looks older than the phone, and a line when a paused
 *   quiz will end.
 * - Fresh (the welcome screen, when the phone has no progress yet): only
 *   the backup's values, and a primary "Restore my progress"; no undo.
 */
export function RestorePreview({
  ready,
  busy,
  onConfirm,
  onCancel,
}: {
  ready: ReadyToRestore | null;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { c } = useTheme();
  const reduceMotion = useReducedMotion();
  const large = useFontScale() >= LARGE_TEXT;
  const rows = ready ? previewRows(ready.now, ready.backup) : [];
  const saved = ready ? Date.parse(ready.data.exportedAt) : NaN;
  const fresh = ready?.fresh === true;
  return (
    // While the restore is saving, swipe-down and Back do nothing.
    <Modal visible={ready !== null} animationType={reduceMotion ? 'none' : 'slide'} presentationStyle="pageSheet" onRequestClose={busy ? () => {} : onCancel}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
        <ScrollView contentContainerStyle={{ padding: space.gutter, paddingBottom: space.xl }}>
          <T v="display" accessibilityRole="header">Restore this backup?</T>
          {Number.isFinite(saved) && <T v="meta" style={{ marginTop: space.xs }}>{`Saved on ${dateOf(saved)}`}</T>}
          <T v="body" color={c.ink2} style={{ marginTop: space.md }}>
            {fresh
              ? 'This puts the progress from your backup on this phone.'
              : `The progress on this phone will be replaced by the backup. You can undo this for ${UNDO_DAYS} days.`}
          </T>
          {ready?.behind && !fresh && (
            <View accessible style={{ marginTop: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: c.tipBg }}>
              <T v="caption" color={c.tip}>Older backup</T>
              <T v="small" color={c.ink} style={{ marginTop: space.xs }}>
                {`This backup is older than this phone. Restoring it replaces the newer progress here. You can undo this for ${UNDO_DAYS} days.`}
              </T>
            </View>
          )}
          {ready?.pausedSession && (
            <T v="small" color={c.ink} style={{ marginTop: space.md }}>Your paused session will end.</T>
          )}
          <Gap h={space.lg} />
          {rows.map((row, i) => (
            <View
              key={row.label}
              accessible
              accessibilityLabel={
                fresh
                  ? `${row.label}: ${row.backup}.`
                  : `${row.label}. On this phone: ${row.now}. In the backup: ${row.backup}.${row.changes ? '' : ' No change.'}`
              }
              style={{ paddingVertical: space.md, borderTopWidth: i === 0 ? 1 : 0, borderBottomWidth: 1, borderColor: c.line }}
            >
              <T v="label">{row.label}</T>
              {fresh ? (
                <T v="body" color={c.ink} style={{ marginTop: space.xs }}>{row.backup}</T>
              ) : (
                // Side by side on a normal phone; stacked at large text so nothing is cut off.
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
              )}
            </View>
          ))}
          <Gap h={space.xl} />
          {fresh ? (
            <Button
              label={busy ? 'Restoring…' : 'Restore my progress'}
              accessibilityHint="Puts the progress from the backup on this phone."
              disabled={busy}
              onPress={onConfirm}
            />
          ) : (
            <Button
              kind="danger"
              label={busy ? 'Restoring…' : 'Replace my progress'}
              accessibilityHint={`Replaces the progress on this phone with the backup. You can undo this for ${UNDO_DAYS} days.`}
              disabled={busy}
              onPress={onConfirm}
            />
          )}
          <Gap h={space.sm} />
          <Button kind="secondary" label="Cancel" disabled={busy} onPress={onCancel} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
