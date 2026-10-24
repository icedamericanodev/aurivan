/**
 * useRestoreFlow — pick a backup → preview → confirm → message, shared by
 * Settings → Your data and the welcome screen (lib/backup.ts does the work).
 *
 * Mobile 1.42: the same pick also accepts a file exported from the KaiSip
 * website. That opens its own sheet (`web`): which profile, when the file has
 * several, and what will be ADDED; "Add to my progress" merges it in
 * (lib/webImport.ts), never replacing what the phone has.
 *
 * Messages are spoken once by screen readers, a moment after they appear
 * (so they don't cut off the button's own feedback), and queued on iOS.
 */
import { useState } from 'react';
import { BACKUP_ERROR_COPY, UNDO_DAYS } from '../engine/backup';
import { examDateLabel } from '../engine/examDay';
import { dayKey } from '../engine/streak';
import { WEB_IMPORT_ERROR_COPY } from '../engine/webImport';
import { sayLater } from './a11y';
import { haptic } from './haptics';
import { restoreBackup, type ReadyToRestore, type ReminderOutcome } from './backup';
import { importWebProgress, pickAnyBackup, type WebReady } from './webImport';

export type Busy = null | 'save' | 'pick' | 'restore' | 'undo' | 'web';
export type FlowMessage = { tone: 'ok' | 'problem'; title: string; text: string };

/**
 * Speak a message once, ~600 ms after it appears; queued behind other speech
 * on iOS. Through sayLater, so a test can never leave it waiting (lib/a11y.ts).
 */
export function announce(text: string) {
  sayLater(text, 600, { queue: true });
}

/** One extra sentence about reminders after a restore or undo. */
export function reminderLine(r: ReminderOutcome): string {
  if (r === 'on') return ' Your study reminder is set again.';
  if (r === 'blocked') return ' Reminders are off because notifications aren’t allowed for KaiSip. You can turn them on in Settings.';
  return '';
}

/**
 * `onboard`: used on the welcome screen (a restore also finishes onboarding).
 * `onWebAdded`: website progress was added (the welcome screen goes on to its next step: an
 * import never finishes onboarding, so the learner still sets an exam date and daily time).
 */
export function useRestoreFlow(opts: { onRestored?: () => void; onboard?: boolean; onWebAdded?: () => void } = {}) {
  const [busy, setBusy] = useState<Busy>(null);
  const [message, setMessage] = useState<FlowMessage | null>(null);
  const [ready, setReady] = useState<ReadyToRestore | null>(null);
  // Mobile 1.42: a website export, read and waiting for "Add to my progress".
  const [web, setWeb] = useState<WebReady | null>(null);

  const say = (m: FlowMessage) => {
    setMessage(m);
    announce(`${m.title}. ${m.text}`);
  };

  /** Open the file picker; a good file opens the preview, a bad one shows why. */
  const pick = async () => {
    setMessage(null);
    setBusy('pick');
    try {
      const out = await pickAnyBackup();
      if (out.kind === 'error') say({ tone: 'problem', title: 'Couldn’t restore', text: BACKUP_ERROR_COPY[out.code] });
      else if (out.kind === 'web-error') say({ tone: 'problem', title: 'Couldn’t add your website progress', text: WEB_IMPORT_ERROR_COPY[out.code] });
      else if (out.kind === 'web') setWeb(out);
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
          text: 'KaiSip couldn’t keep a copy of this phone’s progress to undo with, so it didn’t replace anything. Nothing was changed.',
        });
      } else {
        // The write failed and the old data was written back (lib/backup.ts writeAll).
        say({
          tone: 'problem',
          title: 'Restore didn’t finish',
          text: 'Something went wrong while saving the backup to this phone, so it wasn’t restored and your progress was put back as it was. If anything looks wrong, close and reopen KaiSip.',
        });
      }
    } finally {
      setBusy(null);
    }
  };

  /** "Add to my progress" on the website sheet, for the chosen profile. */
  const confirmWeb = async (index: number) => {
    const profile = web?.profiles[index];
    if (!profile) return;
    setBusy('web');
    try {
      const out = await importWebProgress(profile);
      setWeb(null);
      if (out.kind === 'ok') {
        haptic.success();
        // Undo keeps the EARLIEST copy still inside its 7 days (review 1.42 L3): say which.
        const undo = out.earlierUndo
          ? ` Undo still goes back to how it was on ${examDateLabel(dayKey(out.undoFrom))}, before your earlier change.`
          : ` You can undo this for ${UNDO_DAYS} days.`;
        say({ tone: 'ok', title: 'Added', text: `Your website progress is on this phone now, together with what was already here.${undo}` });
        (opts.onWebAdded ?? opts.onRestored)?.();
      } else if (out.kind === 'too-big') {
        say({ tone: 'problem', title: 'Couldn’t add your website progress', text: 'Together, the two would be too large to save on this phone. Nothing was changed.' });
      } else if (out.kind === 'no-snapshot') {
        say({
          tone: 'problem',
          title: 'Couldn’t add your website progress',
          text: 'KaiSip couldn’t keep a copy of this phone’s progress to undo with, so it didn’t add anything. Nothing was changed.',
        });
      } else {
        say({
          tone: 'problem',
          title: 'Adding didn’t finish',
          text: 'Something went wrong while saving, so nothing was added and your progress was put back as it was. If anything looks wrong, close and reopen KaiSip.',
        });
      }
    } finally {
      setBusy(null);
    }
  };

  return { busy, setBusy, message, setMessage, say, ready, pick, confirm, cancel: () => setReady(null), web, confirmWeb, cancelWeb: () => setWeb(null) };
}
