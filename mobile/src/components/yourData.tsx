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
 *
 * Cloud builds only (Uplift Phase 7): the intro no longer says "kept only on
 * this phone", and the undo copy taken before a first sync is offered as
 * "Undo sync" (it turns sync off). With the flag off this screen is exactly
 * what it was: the old intro, and only ever "Undo restore".
 */
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, View } from 'react-native';
import { useMotion } from './motion';
import { SafeAreaView } from 'react-native-safe-area-context';
import { previewRows, UNDO_DAYS, undoAvailable, undoExpiresAt } from '../engine/backup';
import { examDateLabel } from '../engine/examDay';
import { dayKey } from '../engine/streak';
import { shortDate } from '../lib/format';
import { CLOUD } from '../cloud/flag';
import { copy } from '../content/cloud/copy';
import { pruneUndo, saveBackup, sweepBackupFiles, undoRestore, type ReadyToRestore } from '../lib/backup';
import { undoSync, useSyncing } from '../lib/sync';
import { reminderLine, useRestoreFlow, type FlowMessage } from '../lib/useRestoreFlow';
import { useBackup } from '../store/backup';
import { LARGE_TEXT, radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { SettingsGroup, SettingsRow } from './settings';
import { WebImportPreview } from './webImport';
import { Button, Gap, T, useFontScale } from './ui';

/** "6 Oct 2026" for a timestamp, in the phone's local time. */
const dateOf = (ms: number) => examDateLabel(dayKey(ms));

/** Said when the learner's data is too large for one backup file (security review). */
export const BACKUP_TOO_BIG_LINE = 'Your study data is too large for one backup file, so none was made. Deleting or shortening some of your notes on questions makes it smaller. Nothing was changed.';

export function YourData() {
  const lastBackupAt = useBackup((s) => s.lastBackupAt);
  const restoredSavedAt = useBackup((s) => s.restoredSavedAt ?? null);
  const undo = useBackup((s) => s.undo);
  // "Now" is read once per visit (render stays pure). A snapshot taken
  // during this visit is still offered: undoAvailable only checks expiry.
  const [now] = useState(() => Date.now());
  const flow = useRestoreFlow();
  const { busy, setBusy, message, say } = flow;
  const canUndo = undoAvailable(undo, now);
  const syncing = useSyncing();
  // Only a cloud build ever takes a "sync" undo copy.
  const syncUndo = CLOUD && undo?.kind === 'sync';
  // Mobile 1.42: a copy taken just before website progress was added is "the import", not "the restore".
  const what = undo?.kind === 'import' ? 'import' : 'restore';

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
      } else if (out === 'too-big') {
        // Over the 1 MB a restore accepts: a file that could never be restored is not made.
        say({ tone: 'problem', title: 'Backup not made', text: BACKUP_TOO_BIG_LINE });
      } else {
        say({ tone: 'problem', title: 'Can’t share from here', text: 'This device can’t open the share sheet, so no backup file was made.' });
      }
    } catch {
      say({ tone: 'problem', title: 'Backup not made', text: 'Something went wrong while making the backup file. Please try again.' });
    } finally {
      setBusy(null);
    }
  };

  const confirmUndoSync = () => {
    Alert.alert(copy('undo.confirm.title'), copy('undo.confirm.body'), [
      { text: copy('cancel'), style: 'cancel' },
      {
        text: copy('undo.row'),
        style: 'destructive',
        onPress: async () => {
          setBusy('undo');
          try {
            const r = await undoSync();
            if (r.kind === 'ok') say({ tone: 'ok', title: copy('undo.done.title'), text: `${copy('undo.done.body')}${reminderLine(r.reminders)}` });
            else if (r.kind === 'none') say({ tone: 'problem', title: copy('undo.none.title'), text: copy('undo.none.body') });
            else if (r.kind === 'invalid') say({ tone: 'problem', title: copy('undo.invalid.title'), text: copy('undo.invalid.body') });
            else say({ tone: 'problem', title: copy('undo.failed.title'), text: copy('undo.failed.body') });
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  const confirmUndo = () => {
    if (!undo) return;
    if (syncUndo) return confirmUndoSync();
    Alert.alert(
      `Undo the ${what}?`,
      `Your progress goes back to how it was on ${dateOf(undo.takenAt)}, before the ${what}. Anything you studied since then will be replaced.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: what === 'import' ? 'Undo import' : 'Undo restore',
          style: 'destructive',
          onPress: async () => {
            setBusy('undo');
            try {
              const r = await undoRestore();
              if (r.kind === 'ok') say({ tone: 'ok', title: what === 'import' ? 'Import undone' : 'Restore undone', text: `Your progress is back to how it was before.${reminderLine(r.reminders)}` });
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

  // "Made", not "saved": the share sheet can't tell us where the file went.
  // After a restore (and no newer file made), the restored backup is the learner's latest copy.
  const status =
    restoredSavedAt && (!lastBackupAt || restoredSavedAt > lastBackupAt)
      ? `Restored from a backup saved on ${dateOf(restoredSavedAt)}`
      : lastBackupAt
        ? `Last backup file made: ${dateOf(lastBackupAt)}`
        : 'No backup file yet';
  const saveLabel = busy === 'save' ? 'Saving…' : 'Save a backup';
  const pickLabel = busy === 'pick' ? 'Opening…' : 'Restore from a backup';
  return (
    <>
      <SettingsGroup
        title="Your data"
        cat="data"
        intro={
          CLOUD
            ? copy(syncing ? 'data.intro.sync' : 'data.intro.on')
            : 'Your progress is kept only on this phone. A backup file keeps it safe and moves it to a new phone. You choose where the file goes.'
        }
      >
        {/* Action rows: no chevron (they act; they don't open a list). The status is part of the
            name, so it is read even with hints off; the hint says only what a tap does. */}
        <SettingsRow
          title={saveLabel}
          subtitle={status}
          accessibilityLabel={`${saveLabel}, ${status}`}
          accessibilityHint="Opens the share sheet to save a file with your progress."
          disabled={busy !== null}
          onPress={save}
          chevron={false}
        />
        <SettingsRow
          title={pickLabel}
          subtitle="An app backup, or a progress file from the KaiSip website. You see what changes first."
          accessibilityLabel={pickLabel}
          accessibilityHint="Choose a backup file, or a progress file exported from the KaiSip website. You will see what changes before anything is changed."
          disabled={busy !== null}
          onPress={flow.pick}
          last={!(canUndo && undo)}
          chevron={false}
        />
        {canUndo && undo && !syncUndo && (
          <SettingsRow
            title={what === 'import' ? 'Undo last import' : 'Undo restore'}
            subtitle={`Available until ${dateOf(undoExpiresAt(undo))}.`}
            accessibilityLabel={`${what === 'import' ? 'Undo last import' : 'Undo restore'}, available until ${dateOf(undoExpiresAt(undo))}`}
            accessibilityHint={`Puts back your progress from before the ${what}.`}
            disabled={busy !== null}
            onPress={confirmUndo}
            last
            chevron={false}
          />
        )}
        {canUndo && undo && syncUndo && (
          <SettingsRow
            title={copy('undo.row')}
            subtitle={copy('undo.row.sub', { 'd MMM': shortDate(undoExpiresAt(undo)) })}
            accessibilityHint={copy('hint.undo')}
            disabled={busy !== null}
            onPress={confirmUndo}
            last
            chevron={false}
          />
        )}
      </SettingsGroup>
      {/* The result of the last action, right under the rows that started it. */}
      {message && <DataMessage message={message} />}
      <RestorePreview ready={flow.ready} busy={busy === 'restore'} onConfirm={flow.confirm} onCancel={flow.cancel} />
      {/* Mobile 1.42: a file exported from the KaiSip website is added, never a replacement. */}
      <WebImportPreview web={flow.web} busy={busy === 'web'} onConfirm={flow.confirmWeb} onCancel={flow.cancelWeb} />
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
  const { reduced: reduceMotion } = useMotion();
  const large = useFontScale() >= LARGE_TEXT;
  // Cloud builds only (UX H2): while this phone syncs, progress the backup doesn't have can come back. Always false with the flag off.
  const syncing = useSyncing();
  const rows = ready ? previewRows(ready.now, ready.backup) : [];
  const saved = ready ? Date.parse(ready.data.exportedAt) : NaN;
  const fresh = ready?.fresh === true;
  return (
    // While the restore is saving, swipe-down and Back do nothing.
    <Modal visible={ready !== null} animationType={reduceMotion ? 'fade' : 'slide'} presentationStyle="pageSheet" onRequestClose={busy ? () => {} : onCancel}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.raised2 }}>
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
          {syncing && !fresh && <T v="small" color={c.ink} style={{ marginTop: space.md }}>{copy('reset.sync')}</T>}
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
