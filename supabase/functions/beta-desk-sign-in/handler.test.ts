import { handleSignIn } from './handler.ts';

function assert(value: unknown, message = 'assertion failed'): asserts value {
  if (!value) throw new Error(message);
}
function setup(options: { allowed?: boolean; captcha?: boolean; fail?: string } = {}) {
  const calls: string[] = [];
  const deps = {
    log() {},
    verifyCaptcha() {
      calls.push('captcha');
      return Promise.resolve(options.captcha !== false);
    },
    isAllowed(email: string) {
      calls.push('lookup:' + email);
      if (options.fail === 'lookup') throw new Error('private database detail');
      return Promise.resolve(options.allowed !== false);
    },
    sendCode(email: string) {
      calls.push('send:' + email);
      if (options.fail === 'send') throw new Error('private provider detail');
      return Promise.resolve();
    },
  };
  const request = (
    body: unknown = { email: ' ADMIN@example.com ', captcha_token: 'test' },
    origin = 'https://kaisip.com',
  ) =>
    handleSignIn(
      new Request('https://example.com', {
        method: 'POST',
        headers: { origin, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
      deps,
    );
  return { calls, request, deps };
}

Deno.test('non-admin rejected before any email is sent', async () => {
  const t = setup({ allowed: false });
  const r = await t.request();
  assert(r.status === 403 && (await r.json()).error === 'not_admin');
  assert(t.calls.join(',') === 'captcha,lookup:admin@example.com');
});
Deno.test('admin normalized and code sent only after CAPTCHA and eligibility', async () => {
  const t = setup();
  const r = await t.request();
  assert(r.status === 200 && (await r.json()).sent === true);
  assert(t.calls.join(',') === 'captcha,lookup:admin@example.com,send:admin@example.com');
  assert(r.headers.get('cache-control') === 'no-store');
});
Deno.test('missing or invalid CAPTCHA never looks up membership', async () => {
  for (const body of [{ email: 'a@example.com' }, { email: 'a@example.com', captcha_token: 'bad' }]) {
    const t = setup({ captcha: false });
    const r = await t.request(body);
    assert(r.status === 400 && (await r.json()).error === 'captcha_failed');
    assert(!t.calls.some((c) => c.startsWith('lookup') || c.startsWith('send')));
  }
});
Deno.test('backend errors fail closed and disclose no internal message', async () => {
  for (const fail of ['lookup', 'send']) {
    const t = setup({ fail });
    const r = await t.request();
    assert(r.status === 500 && await r.text() === '{"error":"server"}');
    if (fail === 'lookup') assert(!t.calls.some((c) => c.startsWith('send')));
  }
});
Deno.test('invalid input and foreign origins are refused without lookup', async () => {
  const t = setup();
  assert((await t.request({ email: 'broken' })).status === 400);
  assert((await t.request(undefined, 'https://evil.example')).status === 403);
  assert((await t.request({ email: 'a@example.com', captcha_token: 'x'.repeat(5000) })).status === 413);
  assert(t.calls.length === 0);
});
Deno.test('preflight allowed only for KaiSip', async () => {
  const t = setup();
  const r = await handleSignIn(
    new Request('https://example.com', { method: 'OPTIONS', headers: { origin: 'https://kaisip.com' } }),
    t.deps,
  );
  assert(r.status === 204 && r.headers.get('access-control-allow-origin') === 'https://kaisip.com');
  assert(t.calls.length === 0);
});
