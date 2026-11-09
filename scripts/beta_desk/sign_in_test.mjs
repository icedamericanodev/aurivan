import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = fs.readFileSync(new URL('../../assets/beta-desk.js', import.meta.url), 'utf8');
const auth = source.slice(source.indexOf('var Auth = (function'), source.indexOf('})();', source.indexOf('var Auth = (function')) + 5);
for (const [status, body] of [[403, { error: 'not_admin' }], [503, { error: 'server' }], [200, { sent: true }]]) {
  test('browser calls only gated endpoint, status ' + status, async () => {
    const calls = [];
    const ctx = { SUPABASE_URL: 'https://test.invalid', PUBLISHABLE_KEY: 'public-test', fetch: async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return new Response(JSON.stringify(body), { status });
    }};
    vm.createContext(ctx); vm.runInContext(auth, ctx);
    if (status === 200) await ctx.Auth.sendCode('owner@example.com', 'captcha');
    else await assert.rejects(ctx.Auth.sendCode('owner@example.com', 'captcha'), status === 403 ? /not an admin account/ : /Sign-in failed/);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://test.invalid/functions/v1/beta-desk-sign-in');
    assert.deepEqual(calls[0].body, { email: 'owner@example.com', captcha_token: 'captcha' });
  });
}
test('public denial contains no internal onboarding instructions', () => {
  const html = fs.readFileSync(new URL('../../beta-desk.html', import.meta.url), 'utf8');
  assert(!html.includes('docs/beta/') && !html.includes('Adding an admin'));
  assert(!source.includes('docs/beta/') && !source.includes('Adding an admin'));
});
