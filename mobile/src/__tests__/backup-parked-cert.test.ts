/**
 * Release bug hunt round 1: a backup whose chosen exam is a parked course (CRISC, AAIA,
 * CC, CSOE) is studied as CISA after a restore (effectiveCertId). The preview must
 * describe that: "CISA", the CISA date, the CISA answer count, and no "Older backup"
 * warning. Before the fix it said "CRISC" (or the raw id "cc"), "Not set", "0 questions"
 * and behind = true. The stored choice in the file is never changed.
 */
import { getAllQuestions } from '../content/loader';
import { checkBackupText, currentBackup } from '../lib/backup';
import { useProgress } from '../store/progress';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const T0 = Date.UTC(2026, 10, 5, 12);

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  useProgress.setState(useProgress.getInitialState(), true);
  useSettings.setState(useSettings.getInitialState(), true);
  useSettings.setState({ onboarded: true, activeCertId: 'cisa', examDates: { cisa: '2027-02-01' } });
  for (const q of getAllQuestions('cisa').slice(0, 30)) useProgress.getState().recordAnswer('cisa', q.id, true);
});
afterEach(() => jest.useRealTimers());

describe('restore preview of a file whose chosen exam is parked', () => {
  it.each(['crisc', 'aaia', 'cc', 'csoe'])('%s: the preview describes CISA, with no "Older backup"', (id) => {
    const file = currentBackup(Date.now()) as unknown as { stores: { settings: { state: { activeCertId: string } } } };
    file.stores.settings.state.activeCertId = id;
    const read = checkBackupText(JSON.stringify(file));
    if (read.kind !== 'ok') throw new Error(`refused: ${read.code}`);
    expect(read.backup.exam).toBe('CISA');
    expect(read.backup.examDate).not.toBe('Not set');
    expect(read.backup.answered).toBe('30 questions');
    expect(read.behind).toBe(false);
    // The file itself still holds the stored choice (nothing renamed or rewritten).
    expect(read.data.settings.activeCertId).toBe(id);
  });

  it('the phone side: a stored parked choice also reads as CISA', () => {
    useSettings.setState({ activeCertId: 'crisc' });
    const read = checkBackupText(JSON.stringify(currentBackup(Date.now())));
    if (read.kind !== 'ok') throw new Error(`refused: ${read.code}`);
    expect(read.now.exam).toBe('CISA');
    expect(read.now.answered).toBe('30 questions');
  });
});
