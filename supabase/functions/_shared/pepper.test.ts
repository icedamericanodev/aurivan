import { strict as assert } from 'node:assert';
import { deletionHash, hmacSha256Hex, MIN_PEPPER_LENGTH, pepperFromEnv } from './pepper.ts';

Deno.test('HMAC-SHA-256 matches RFC 4231 test case 2', async () => {
  assert.equal(
    await hmacSha256Hex('Jefe', 'what do ya want for nothing?'),
    '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
  );
});

Deno.test('the pepper is read from DELETION_PEPPER, and a missing or short one counts as none', () => {
  const long = 'p'.repeat(MIN_PEPPER_LENGTH);
  assert.equal(pepperFromEnv((k) => (k === 'DELETION_PEPPER' ? long : undefined)), long);
  assert.equal(pepperFromEnv(() => undefined), null);
  assert.equal(pepperFromEnv(() => ''), null);
  assert.equal(pepperFromEnv(() => 'p'.repeat(MIN_PEPPER_LENGTH - 1)), null);
});

Deno.test('deletionHash: 64 hex characters, one per id whatever its case, different per pepper', async () => {
  const pepper = 'test-pepper-not-a-secret-0123456789abcdef';
  const id = '00000000-0000-4000-8000-00000000000a';
  const h = await deletionHash(pepper, id);
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.equal(await deletionHash(pepper, id.toUpperCase()), h);
  assert.notEqual(await deletionHash(`${pepper}x`, id), h);
  assert.notEqual(await deletionHash(pepper, '00000000-0000-4000-8000-00000000000b'), h);
  assert.equal(h.includes(id), false);
});
