/** Android SAF save: the learner grants access to one chosen folder, never all storage. */
import { Directory } from 'expo-file-system';
import { Platform } from 'react-native';
import { backupFileName, backupTooBig } from '../engine/backup';
import { useBackup } from '../store/backup';
import { currentBackup } from './backup';

export type DeviceSaveOutcome = 'saved' | 'cancelled' | 'too-big' | 'unavailable';

/** Save a new document, retaining the same backup format and restore validation. */
export async function saveBackupOnDevice(now = Date.now()): Promise<DeviceSaveOutcome> {
  if (Platform.OS !== 'android' || typeof Directory?.pickDirectoryAsync !== 'function') return 'unavailable';
  const text = JSON.stringify(currentBackup(now));
  if (backupTooBig(text)) return 'too-big';
  let directory: Directory;
  try {
    directory = await Directory.pickDirectoryAsync();
  } catch (error) {
    // SDK 58's native folder picker rejects only cancellation with this code.
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_PICKER_CANCELLED') return 'cancelled';
    throw error;
  }
  // createFile uses SAF createDocument, not an overwrite of an existing URI.
  // A distinct name also keeps repeated backups easy to tell apart.
  const name = backupFileName(now).replace('.json', `-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}.json`);
  const file = directory.createFile(name, 'application/json');
  try {
    await file.write(text);
    // Do not claim success for a provider that accepted a write but returned a partial file.
    if (await file.text() !== text) throw new Error('Backup read-back did not match');
  } catch (error) {
    // Only the new document is ours to remove; never touch any pre-existing backup.
    try { file.delete(); } catch { /* The UI warns an incomplete file may remain. */ }
    throw error;
  }
  useBackup.getState().setLastBackup(now);
  return 'saved';
}
