/**
 * Mobile 1.19 "Check for updates": the pure part (engine/updates.ts) and the
 * step runner in lib/updates.ts with a stand-in client. What each result
 * from expo-updates means, what the row says, the stamp under the version,
 * and that a failure never leaks the error's text.
 */
import { phaseAfterCheck, phaseAfterFetch, RUNTIME_CHARS, spokenUpdate, UPDATE_ID_CHARS, UPDATE_WORDS, updateBusy, updateDownloaded, updateStamp, type UpdatePhase } from '../engine/updates';
import { checkAndDownload, restartToUpdate, type UpdatesClient } from '../lib/updates';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const PHASES: UpdatePhase[] = ['idle', 'checking', 'downloading', 'ready', 'current', 'check-failed', 'download-failed', 'restart-failed'];

describe('what a result means', () => {
  it('a check: something to download, or up to date', () => {
    expect(phaseAfterCheck({ isAvailable: true, isRollBackToEmbedded: false })).toBe('downloading');
    // A roll back to the built-in version is also something to download.
    expect(phaseAfterCheck({ isAvailable: false, isRollBackToEmbedded: true })).toBe('downloading');
    expect(phaseAfterCheck({ isAvailable: false, isRollBackToEmbedded: false })).toBe('current');
  });

  it('a download: ready to restart, or nothing new after all', () => {
    expect(phaseAfterFetch({ isNew: true, isRollBackToEmbedded: false })).toBe('ready');
    expect(phaseAfterFetch({ isNew: false, isRollBackToEmbedded: true })).toBe('ready');
    expect(phaseAfterFetch({ isNew: false, isRollBackToEmbedded: false })).toBe('current');
  });

  it('busy only while checking or downloading; downloaded once ready or after a failed restart', () => {
    expect(PHASES.filter(updateBusy)).toEqual(['checking', 'downloading']);
    expect(PHASES.filter(updateDownloaded)).toEqual(['ready', 'restart-failed']);
  });
});

describe('the words', () => {
  it('every phase but idle has a short state; the states the owner asked for are there', () => {
    for (const p of PHASES) {
      if (p === 'idle') expect(UPDATE_WORDS[p].state).toBeUndefined();
      else expect(UPDATE_WORDS[p].state).toMatch(/\S/);
    }
    expect(UPDATE_WORDS.checking.state).toBe('Checking…');
    expect(UPDATE_WORDS.downloading.state).toBe('Downloading…');
    expect(UPDATE_WORDS.ready.state).toBe('Ready to restart');
    expect(UPDATE_WORDS.current.state).toBe('Up to date');
    expect(UPDATE_WORDS['check-failed'].state).toBe('Couldn’t check');
  });

  it('is honest: no promises, and failures say "may be offline" or what to do', () => {
    const all = PHASES.flatMap((p) => [UPDATE_WORDS[p].state, UPDATE_WORDS[p].note]).filter(Boolean).join(' ');
    expect(all).not.toMatch(/\bwill\b/i);
    expect(all).not.toMatch(/error|exception|failed:/i);
    expect(UPDATE_WORDS['check-failed'].note).toMatch(/offline/);
    expect(UPDATE_WORDS['download-failed'].note).toMatch(/offline/);
    expect(UPDATE_WORDS['restart-failed'].note).toMatch(/Close the app fully/);
  });

  it('speaks state and note as one sentence; nothing for idle', () => {
    expect(spokenUpdate('idle')).toBe('');
    expect(spokenUpdate('checking')).toBe('Checking…');
    expect(spokenUpdate('check-failed')).toBe('Couldn’t check. You may be offline. Try again later.');
  });
});

describe('the stamp under the version line', () => {
  it('shows the first 8 of the update id and the first 7 of the runtime', () => {
    expect(UPDATE_ID_CHARS).toBe(8);
    expect(RUNTIME_CHARS).toBe(7);
    expect(updateStamp('1a2b3c4d-9999-4000-8000-000000000000', '5e26d4b961113941199b725cff5ff30a66bf0ac1', false)).toBe('Update 1a2b3c4d · 5e26d4b');
  });

  it('says built-in for the code shipped inside the APK, and copes with missing values', () => {
    expect(updateStamp('1a2b3c4d-9999-4000-8000-000000000000', '5e26d4b961113941199b725cff5ff30a66bf0ac1', true)).toBe('Update built-in · 5e26d4b');
    expect(updateStamp(null, '5e26d4b961113941199b725cff5ff30a66bf0ac1', false)).toBe('Update built-in · 5e26d4b');
    expect(updateStamp(null, null, false)).toBe('Update built-in');
    expect(updateStamp(undefined, '', false)).toBe('Update built-in');
  });

  it('carries nothing personal: only the two ids', () => {
    expect(updateStamp('1a2b3c4d-9999-4000-8000-000000000000', 'abcdefghijk', false)).toBe('Update 1a2b3c4d · abcdefg');
  });
});

/** A stand-in phone whose answers the test chooses. */
function fakeClient(over: Partial<UpdatesClient> = {}): UpdatesClient & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    check: async () => {
      calls.push('check');
      return { isAvailable: true, isRollBackToEmbedded: false };
    },
    fetch: async () => {
      calls.push('fetch');
      return { isNew: true, isRollBackToEmbedded: false };
    },
    reload: async () => {
      calls.push('reload');
    },
    ...over,
  };
}

describe('one check, step by step', () => {
  it('an update: checking → downloading → ready, one call each', async () => {
    const seen: UpdatePhase[] = [];
    const c = fakeClient();
    expect(await checkAndDownload(c, (p) => seen.push(p))).toBe('ready');
    expect(seen).toEqual(['checking', 'downloading', 'ready']);
    expect(c.calls).toEqual(['check', 'fetch']);
  });

  it('up to date: checking → current, and nothing is downloaded', async () => {
    const seen: UpdatePhase[] = [];
    const c = fakeClient({ check: async () => ({ isAvailable: false, isRollBackToEmbedded: false }) });
    expect(await checkAndDownload(c, (p) => seen.push(p))).toBe('current');
    expect(seen).toEqual(['checking', 'current']);
    expect(c.calls).toEqual([]);
  });

  it('offline: the check rejects → check-failed, the error text goes nowhere', async () => {
    const seen: UpdatePhase[] = [];
    const c = fakeClient({
      check: async () => {
        throw new Error('java.net.UnknownHostException: u.expo.dev');
      },
    });
    expect(await checkAndDownload(c, (p) => seen.push(p))).toBe('check-failed');
    expect(seen).toEqual(['checking', 'check-failed']);
    expect(JSON.stringify(seen) + JSON.stringify(UPDATE_WORDS)).not.toMatch(/UnknownHost|u\.expo\.dev/);
  });

  it('the download rejects → download-failed', async () => {
    const seen: UpdatePhase[] = [];
    const c = fakeClient({
      fetch: async () => {
        throw new Error('timeout');
      },
    });
    expect(await checkAndDownload(c, (p) => seen.push(p))).toBe('download-failed');
    expect(seen).toEqual(['checking', 'downloading', 'download-failed']);
  });

  it('the download finds nothing new → current', async () => {
    const c = fakeClient({ fetch: async () => ({ isNew: false, isRollBackToEmbedded: false }) });
    expect(await checkAndDownload(c, () => {})).toBe('current');
  });

  it('restart: reload is called once; a rejection becomes restart-failed', async () => {
    const seen: UpdatePhase[] = [];
    const ok = fakeClient();
    await restartToUpdate(ok, (p) => seen.push(p));
    expect(ok.calls).toEqual(['reload']);
    expect(seen).toEqual([]);
    const bad = fakeClient({
      reload: async () => {
        throw new Error('no runtime');
      },
    });
    await restartToUpdate(bad, (p) => seen.push(p));
    expect(seen).toEqual(['restart-failed']);
  });
});
