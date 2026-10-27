/**
 * Content packs, Phase A: CI and the phone-update job run whenever any data
 * file the app's content pack is built from changes (not only the questions).
 */
import fs from 'fs';
import path from 'path';

const REPO = path.join(__dirname, '..', '..', '..');
const SOURCES = ["'data/domain*.json'", "'data/cisa_notes.json'", "'data/mindset/**'", "'data/exam/**'", "'data/lessons/**'"];

it.each(['mobile.yml', 'eas-update.yml'])('%s watches every content source', (wf) => {
  const yml = fs.readFileSync(path.join(REPO, '.github', 'workflows', wf), 'utf8');
  // Each `paths:` list (pull request and push in mobile.yml; push in eas-update.yml).
  const lists = [...yml.matchAll(/^\s*paths: \[(.*)\]$/gm)].map((m) => m[1]);
  expect(lists.length).toBeGreaterThan(0);
  for (const list of lists) for (const p of SOURCES) expect(list).toContain(p);
});
