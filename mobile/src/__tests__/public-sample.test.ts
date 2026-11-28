/**
 * The public Google Play build bundles only the free question sample
 * (docs/mobile/SAMPLE_QUESTION_PACK.md). Everything a new learner is sent to
 * by name must be in it, or a fresh install would open a missing question.
 */
import fs from 'node:fs';
import path from 'node:path';
import { getCertification } from '../content/certifications';
import { FIRST_SET } from '../content/firstSet';
import { allocate } from '../engine/blueprint';
import { miniMockSize } from '../engine/finalWeek';

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

/**
 * CRISC and AAIA (bundled 28 Nov 2026, docs/WEB_LAUNCH_PLAN.md stream D): the public build carries
 * only each course's free sample. Each list must belong to its course, name real questions, and
 * hold enough per domain for the course's free short mock (a third of the exam, split by weight),
 * so a free learner's mini mock never runs short.
 */
describe.each([
  ['crisc', 4],
  ['aaia', 3],
])('%s free sample', (certId, domains) => {
  const doc = JSON.parse(fs.readFileSync(path.join(repo, `data/free/${certId}_sample_ids.json`), 'utf8'));
  const ids = new Set<string>(doc.ids);
  const bank = (d: number): { id: string; retired?: boolean }[] =>
    JSON.parse(fs.readFileSync(path.join(repo, `data/${certId}/originals/d${d}.json`), 'utf8')).questions;

  it('is this course’s own list of its own questions, never the whole bank', () => {
    expect(doc.cert).toBe(certId);
    expect(ids.size).toBe(doc.ids.length);
    const all = new Set(Array.from({ length: domains }, (_, i) => bank(i + 1).map((q) => q.id)).flat());
    for (const id of ids) expect(all.has(id)).toBe(true);
    expect(ids.size).toBeLessThan(all.size);
    expect(ids.size).toBeGreaterThanOrEqual(100); // both plans: never fewer than 100
  });

  it('holds the free short mock in every domain', () => {
    const cert = getCertification(certId)!;
    const need = allocate(miniMockSize(cert.exam.questions), cert.domains.map((d) => d.weight));
    cert.domains.forEach((d, i) => {
      const free = bank(Number(d.id)).filter((q) => ids.has(q.id) && !q.retired).length;
      expect([d.id, free >= need[i]]).toEqual([d.id, true]);
    });
  });
});
