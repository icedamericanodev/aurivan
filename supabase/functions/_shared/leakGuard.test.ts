// Guard G8 (Uplift Phase 8): the server's copy of the leak guard and the
// moderation rules gives exactly the app's verdicts. The fixture holds 200
// seeded strings, a small made-up bank and the answers the app's engine gave
// (written by mobile/src/__tests__/board-shared.test.ts), with the server's
// squashed-letters fingerprint and the answer-talk fold (fix round P8).
import { strict as assert } from 'node:assert';
import fixture from './leakGuard.fixture.json' with { type: 'json' };
import { buildFingerprint, leakItem, leakMatch, recallScore, talksAboutAnswer } from './leakGuard.ts';
import { checkHandle, moderateText, normalizeText } from './moderation.ts';

Deno.test('the server copy gives the app engine’s verdict on all 200 strings', () => {
  const fp = buildFingerprint(fixture.bank.map(leakItem), { squash: true });
  assert.equal(fixture.cases.length, 200);
  for (const c of fixture.cases) {
    assert.deepEqual(leakMatch(fp, c.text), c.leak, c.text);
    assert.equal(recallScore(c.text, c.ref), c.recall, c.text);
    assert.equal(talksAboutAnswer(c.text, c.ref), c.answer, c.text);
    assert.deepEqual(moderateText(c.text, { newMember: c.newMember }), c.moderation, c.text);
  }
});

// RR_P8 R2 and R4: the server copy refuses the same names, and removes the
// same blank-looking characters, as the app's engine.
Deno.test('the server copy gives the app engine’s verdict on every name and blank character in the fixture', () => {
  assert.ok(fixture.handles.length >= 20);
  for (const h of fixture.handles) assert.equal(checkHandle(h.handle), h.problem, h.handle);
  assert.ok(fixture.blanks.length >= 10);
  for (const b of fixture.blanks) {
    assert.equal(normalizeText(b.text), b.normalized, b.codePoint);
    assert.deepEqual(moderateText(b.text, { newMember: false }), b.moderation, b.codePoint);
  }
});
