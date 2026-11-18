/**
 * fullVersion: the Play version name may be two parts ("2.1"), but every
 * saved file (backups, problem reports, sync) uses "major.minor.patch".
 */
import appJson from '../../app.json';
import { compareVersions } from '../engine/backup';
import { fixMatches, fullVersion, parseVersion, type Fix, type ReportEntry } from '../engine/support';

describe('fullVersion', () => {
  it.each([
    ['2.1', '2.1.0'],
    ['2.1.0', '2.1.0'],
    ['2', '2.0.0'],
    ['2.10.3', '2.10.3'],
    [' 2.1 ', '2.1.0'],
  ])('%s → %s', (input, out) => {
    expect(fullVersion(input)).toBe(out);
    expect(parseVersion(fullVersion(input))).not.toBeNull();
  });

  it.each([[undefined], [null], [''], ['unknown'], ['2.1.0.4'], ['v2.1'], ['2..1']])('%s is unreadable', (input) => {
    expect(fullVersion(input)).toBeUndefined();
  });

  it('turns this app version into one every saved file accepts', () => {
    expect(parseVersion(fullVersion(appJson.expo.version))).not.toBeNull();
  });

  it('a 2.1 phone counts as newer than 2.0.0 and the same as 2.1.0', () => {
    expect(compareVersions(fullVersion('2.1')!, '2.0.0', 2)).toBeGreaterThan(0);
    expect(compareVersions(fullVersion('2.1')!, '2.1.0')).toBe(0);
  });

  it('a report made on 2.0.0 is credited by a fix that ships in 2.1.0', () => {
    const fix: Fix = { ref: 'q:d5_205', cert: 'cisa', date: '2026-11-18', fixedIn: '2.1.0', kind: 'clarified', publicNote: 'A note.' };
    const report = { item: 'q:d5_205', cert: 'cisa', at: Date.parse('2026-11-13T00:00:00Z'), version: '2.0.0' } as ReportEntry;
    expect(fixMatches(fix, report)).toBe(true);
    expect(fixMatches(fix, { ...report, version: fullVersion('2.1')! })).toBe(false);
  });
});
