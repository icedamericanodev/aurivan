/**
 * Uplift Phase 8, guard G8: the server's copies of the board's text rules
 * (supabase/functions/_shared/{leakGuard,moderation}.ts) are exactly the
 * engine files, and give the same verdicts.
 *
 * - `sync-shared.mjs --check` passes (byte-for-byte, apart from the header
 *   and the `.ts` import endings).
 * - The shared fixture (supabase/functions/_shared/leakGuard.fixture.json):
 *   200 seeded strings against a small made-up bank, with the verdicts this
 *   engine gives. The Deno test (_shared/leakGuard.test.ts) runs the server
 *   copy on the same strings and must get the same answers.
 *   To refresh it after a deliberate rule change:
 *     UPDATE_SHARED_FIXTURE=1 npx jest board-shared
 */
import { execFileSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { buildFingerprint, leakItem, leakMatch, recallScore } from '../engine/leakGuard';
import { moderateText } from '../engine/moderation';
import { createRng } from '../engine/random';

const MOBILE = join(__dirname, '..', '..');
const FIXTURE = join(MOBILE, '..', 'supabase', 'functions', '_shared', 'leakGuard.fixture.json');

/** A made-up bank (never the real one): 20 questions built from audit-flavoured phrases. */
function madeUpBank(): { stem: string; options: Record<string, string>; explanation: string; wrongExplanations: Record<string, string>; tips: string[] }[] {
  const subjects = ['the change board', 'a payroll clerk', 'the vendor', 'the backup operator', 'an internal auditor', 'the network team', 'the data owner', 'a project sponsor', 'the help desk', 'the database administrator'];
  const acts = ['approves emergency fixes after release', 'edits master records without review', 'stores tapes in the same building', 'reuses one shared administrator password', 'signs off on test results alone'];
  const out = [];
  for (let i = 0; i < 20; i++) {
    const s = subjects[i % subjects.length];
    const a = acts[i % acts.length];
    out.push({
      stem: `During review number ${i} the team learns that ${s} ${a}. What should be done before anything else in case ${i}?`,
      options: { A: `Escalate case ${i} to the steering group`, B: `Retest control ${i} with a fresh sample`, C: `Document finding ${i} in the working papers`, D: `Ask ${s} to explain case ${i} in writing` },
      explanation: `For case ${i} the root cause sits with ${s}, so the first step is to understand why ${a} before choosing a fix.`,
      wrongExplanations: { A: `Escalating case ${i} too early skips the facts.`, C: `Writing up finding ${i} comes after the facts are known.` },
      tips: [`Case ${i}: look for the step that gathers facts first.`, `The word FIRST in case ${i} points to understanding before acting.`],
    });
  }
  return out;
}

const VOCAB = 'audit control risk evidence sample policy owner board backup review change access test plan report finding manager system data vendor'.split(' ');

function strings(): { text: string; ref: boolean; newMember: boolean }[] {
  const rng = createRng(2026);
  const bank = madeUpBank();
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rng() * xs.length)];
  const out: { text: string; ref: boolean; newMember: boolean }[] = [];
  const zw = String.fromCharCode(0x200b);
  for (let i = 0; i < 200; i++) {
    const q = pick(bank);
    const full = [q.stem, ...Object.values(q.options), q.explanation, ...Object.values(q.wrongExplanations), ...q.tips].join(' ');
    const words = full.split(' ');
    let text: string;
    switch (i % 8) {
      case 0: // a verbatim span
        text = words.slice(Math.floor(rng() * 5), 8 + Math.floor(rng() * 20)).join(' ');
        break;
      case 1: // mutated
        text = words.map((w) => (rng() < 0.15 ? pick(VOCAB) : w)).join(' ');
        break;
      case 2: // random words
        text = Array.from({ length: 5 + Math.floor(rng() * 30) }, () => pick(VOCAB)).join(' ');
        break;
      case 3: // recall-ish
        text = pick(['On my exam I got one about', 'Anyone selling brain dumps for', 'I remember a question on', 'Which of the following is BEST for']) + ' ' + pick(VOCAB) + '?';
        break;
      case 4: // option lists
        text = `${q.stem}\nA) ${q.options.A}\nB) ${q.options.B}\nC) ${q.options.C}`;
        break;
      case 5: // zero-width tricks
        text = q.stem.split('').join(rng() < 0.5 ? zw : '');
        break;
      case 6: // moderation words and links
        text = pick(['see bit.ly/x', 'call +1 415 555 0100', 'what the f u c k', 'kind words only', 'www.example.org has it', 'add me on telegram']) + ' ' + pick(VOCAB);
        break;
      default: // the tail of the full text
        text = words.slice(-(10 + Math.floor(rng() * 15))).join(' ');
    }
    out.push({ text, ref: rng() < 0.2, newMember: rng() < 0.5 });
  }
  return out;
}

function verdicts() {
  const fp = buildFingerprint(madeUpBank().map(leakItem));
  return strings().map((s) => ({
    ...s,
    leak: leakMatch(fp, s.text),
    recall: recallScore(s.text, s.ref),
    moderation: moderateText(s.text, { newMember: s.newMember }),
  }));
}

describe('guard G8: the server copies are the engine', () => {
  it('sync-shared --check passes', () => {
    const out = execFileSync('node', [join(MOBILE, 'scripts', 'sync-shared.mjs'), '--check'], { encoding: 'utf8' });
    expect(out).toContain('match');
  });

  it('the shared verdict fixture is what this engine says (the Deno test checks the server copy against it)', () => {
    const want = { about: 'Generated by mobile/src/__tests__/board-shared.test.ts. Checked by supabase/functions/_shared/leakGuard.test.ts.', bank: madeUpBank(), cases: verdicts() };
    const text = `${JSON.stringify(want, null, 2)}\n`;
    if (process.env.UPDATE_SHARED_FIXTURE === '1' || !existsSync(FIXTURE)) writeFileSync(FIXTURE, text);
    expect(readFileSync(FIXTURE, 'utf8')).toBe(text);
    // The cases cover every kind of answer.
    const kinds = new Set(want.cases.map((c) => `${c.leak.verdict}:${c.moderation.verdict}`));
    expect(kinds.has('block:ok')).toBe(true);
    expect(kinds.has('ok:ok')).toBe(true);
    expect(want.cases.some((c) => c.moderation.verdict === 'reject')).toBe(true);
    expect(want.cases.some((c) => c.moderation.verdict === 'hold')).toBe(true);
    expect(want.cases.some((c) => c.recall >= 3)).toBe(true);
  });
});
