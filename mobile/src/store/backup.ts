/**
 * Backup store — facts ABOUT backups, saved on-device:
 * - when the learner last saved a backup ("Last backup: 6 Oct"), and
 * - the ONE automatic snapshot taken just before a restore, so Settings can
 *   offer "Undo restore" for 7 days (engine/backup.ts UNDO_DAYS).
 *
 * Kept apart from the progress and settings stores on purpose: a backup
 * file holds those two, and restoring one must not overwrite these facts.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UndoSnapshot } from '../engine/backup';
import { persistStorage } from './storage';

interface BackupState {
  /** When a backup was last saved (epoch ms), or null if never. */
  lastBackupAt: number | null;
  /** The snapshot from before the last restore (null when none, or after an undo). */
  undo: UndoSnapshot | null;

  setLastBackup: (at: number) => void;
  setUndo: (snap: UndoSnapshot | null) => void;
}

export const useBackup = create<BackupState>()(
  persist(
    (set) => ({
      lastBackupAt: null,
      undo: null,
      setLastBackup: (lastBackupAt) => set({ lastBackupAt }),
      setUndo: (undo) => set({ undo }),
    }),
    { name: 'aurivan.backup.v1', storage: persistStorage, version: 1 },
  ),
);
