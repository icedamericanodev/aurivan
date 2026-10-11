/**
 * The committed badge art (content/badgeArt.json) is exactly what its sources
 * build (scripts/badge-art/*.mjs): an edit to the geometry or an emblem that
 * forgot `node scripts/badge-art/build.mjs` fails here, not on a phone.
 * (Code review minor 15: the build is deterministic, byte for byte.)
 */
import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

it('badgeArt.json matches a fresh build of its sources', () => {
  const dir = mkdtempSync(join(tmpdir(), 'badge-art-'));
  try {
    const out = join(dir, 'badgeArt.json');
    execFileSync(process.execPath, [join(__dirname, '../../scripts/badge-art/build.mjs'), out], { stdio: 'pipe' });
    expect(readFileSync(out, 'utf8')).toBe(readFileSync(join(__dirname, '../content/badgeArt.json'), 'utf8'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
