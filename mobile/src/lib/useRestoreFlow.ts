/**
 * useRestoreFlow — pick a backup → preview → confirm → message, shared by
 * Settings → Your data and the welcome screen (lib/backup.ts does the work).
 *
 * Messages are spoken once by screen readers, a moment after they appear
 * (so they don't cut off the button's own feedback), and queued on iOS.
 */
import { useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { BACKUP_ERROR_COPY, UNDO_DAYS } from '../engine/backup';
import { haptic } from './haptics';
import { pickBackup, restoreBackup, type ReadyToRestore, type ReminderOutcome } from './backup';

export type Busy = null | 'save' | 'pick' | 'restore' | 'undo';
export type FlowMessage = { tone: 'ok' | 'problem'; title: string; text: string };

/** Speak a message once, ~600 ms after it appears; queued behind other speech on iOS. */
export function announce(text: string) {
  setTimeout(() => {
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibilityWithOptions(text, { queue: true });
    else AccessibilityInfo.announceForAccessibility(text);
  }, 600);
}

/** One extra sentence about reminders after a restore or undo. */
export function reminderLine(r: ReminderOutcome): string {
  if (r === 'on') return ' Your study reminder is set again.';
  if (r === 'blocked') return ' Reminders are off because notifications aren’t allowed for Aurivan. You can turn them on in Settings.';
  return '';
}

/** `onboard`: used on the welcome screen (the restore also finishes onboarding). */
export function useRestoreFlow(opts: { onRestored?: () => void; onboard?: boolean } = {}) {
  const [busy, setBusy] = useState<Busy>(null);
  const [message, setMessage] = useState<FlowMessage | null>(null);
  const [ready, setReady] = useState<ReadyToRestore | null>(null);

  const say = (m: FlowMessage) => {
    setMessage(m);
    announce(`${m.title}. ${m.text}`);
  };

  /** Open the file picker; a good file opens the preview, a bad one shows why. */
  const pick = async () => {
    setMessage(null);
    setBusy('pick');
    try {
      const out = await pickBackup();
      if (out.kind === 'error') say({ tone: 'problem', title: 'Couldn’t restore', text: BACKUP_ERROR_COPY[out.code] });
      // The "fresh" preview (backup values only, no undo) is for the welcome
      // screen only. In Settings the learner has already chosen an exam date
      // and reminders that a restore replaces, so it always compares and keeps Undo.
      else if (out.kind === 'ok') setReady({ ...out, fresh: opts.onboard === true && out.fresh });
    } finally {
      setBusy(null);
    }
  };

  /** "Replace my progress" / "Restore my progress". */
  const confirm = async () => {
    if (!ready) return;
    setBusy('restore');
    try {
      const out = await restoreBackup(ready.data, { fresh: ready.fresh, onboard: opts.onboard });
      setReady(null);
      if (out.kind === 'ok') {
        haptic.success();
        const undo = ready.fresh ? '' : ` You can undo this for ${UNDO_DAYS} days.`;
        say({ tone: 'ok', title: 'Restored', text: `Your progress from the backup is on this phone now.${undo}${reminderLine(out.reminders)}` });
        opts.onRestored?.();
      } else if (out.kind === 'no-snapshot') {
        say({
          tone: 'problem',
          title: 'Couldn’t restore',
          text: 'Aurivan couldn’t keep a copy of this phone’s progress to undo with, so it didn’t replace anything. Nothing was changed.',
        });
      } else {
        // The write failed and the old data was written back (lib/backup.ts writeAll).
        say({
          tone: 'problem',
          title: 'Restore didn’t finish',
          text: 'Something went wrong while saving the backup to this phone, so it wasn’t restored and your progress was put back as it was. If anything looks wrong, close and reopen Aurivan.',
        });
      }
    } finally {
      setBusy(null);
    }
  };

  return { busy, setBusy, message, setMessage, say, ready, pick, confirm, cancel: () => setReady(null) };
}
