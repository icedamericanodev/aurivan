/**
 * The public Google Play build bundles only the free question sample
 * (docs/mobile/SAMPLE_QUESTION_PACK.md). Everything a new learner is sent to
 * by name must be in it, or a fresh install would open a missing question.
 */
import fs from 'node:fs';
import path from 'node:path';
import { FIRST_SET } from '../content/firstSet';

const repo = path.join(__dirname, '..', '..', '..');
const sample = new Set<string>(JSON.parse(fs.readFileSync(path.join(repo, 'data/free/cisa_sample_ids.json'), 'utf8')).ids);

it('the first five questions are all in the free sample', () => {
  for (const id of FIRST_SET.cisa) expect(sample.has(id)).toBe(true);
});

it('the free-sample builder pins the same first five', () => {
  const py = fs.readFileSync(path.join(repo, 'scripts/build_free_sample.py'), 'utf8');
  const pinned = /^FIRST_SET = \[(.*)\]$/m.exec(py)?.[1] ?? '';
  expect(pinned.split(',').map((s) => s.trim().replace(/"/g, ''))).toEqual([...FIRST_SET.cisa]);
});
