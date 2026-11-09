import { handleSignIn } from './handler.ts';

function assert(value: unknown): asserts value {
  if (!value) throw new Error('assertion failed');
}
function request(body: unknown = { email: ' Owner@Example.com ' }, origin = 'https://kaisip.com') {
  return new Request('https://example.invalid', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin },
    body: JSON.stringify(body),
  });
}
for (const result of ['not_admin', 'rate_limited', 'unexpected']) {
  Deno.test('never sends OTP for ' + result, async () => {
    let sends = 0;
    const res = await handleSignIn(request(), {
      eligibility: () => Promise.resolve(result),
      send: () => {
        sends++;
        return Promise.resolve(new Response('{}'));
      },
    });
    assert(sends === 0);
    assert(res.status === (result === 'not_admin' ? 403 : result === 'rate_limited' ? 429 : 503));
    assert(res.headers.get('cache-control') === 'no-store');
    assert(res.headers.get('access-control-allow-origin') === 'https://kaisip.com');
  });
}
Deno.test('only eligible admin sends normalized address and CAPTCHA', async () => {
  let sends = 0;
  const res = await handleSignIn(request({ email: ' Owner@Example.com ', captcha_token: 'test-token' }), {
    eligibility: (email) => {
      assert(email === 'owner@example.com');
      return Promise.resolve('allowed');
    },
    send: (email, captcha) => {
      assert(email === 'owner@example.com' && captcha === 'test-token');
      sends++;
      return Promise.resolve(new Response('{}'));
    },
  });
  assert(res.status === 200 && sends === 1);
});
Deno.test('lookup outage fails closed without exposing exception details', async () => {
  const res = await handleSignIn(request(), {
    eligibility: () => Promise.reject(new Error('private database details')),
    send: () => Promise.reject(new Error('must not send')),
  });
  assert(res.status === 500 && (await res.text()) === '{"error":"server"}');
});
for (
  const [status, body, expected] of [
    [400, { error_code: 'captcha_failed', msg: 'internal' }, 'captcha_failed'],
    [429, { msg: 'internal' }, 'rate_limited'],
    [500, { msg: 'internal' }, 'server'],
  ] as const
) {
  Deno.test('Auth error is sanitized: ' + expected, async () => {
    const res = await handleSignIn(request(), {
      eligibility: () => Promise.resolve('allowed'),
      send: () => Promise.resolve(new Response(JSON.stringify(body), { status })),
    });
    assert((await res.json()).error === expected);
  });
}
Deno.test('invalid body, foreign origin and preflight never check eligibility', async () => {
  let checks = 0;
  const port = {
    eligibility: () => {
      checks++;
      return Promise.resolve('allowed');
    },
    send: () => Promise.resolve(new Response('{}')),
  };
  assert((await handleSignIn(request({ email: 'invalid' }), port)).status === 400);
  assert((await handleSignIn(request({}, 'https://attacker.invalid'), port)).status === 403);
  assert((await handleSignIn(request({ email: 'x'.repeat(5000) }), port)).status === 413);
  assert(
    (await handleSignIn(
      new Request('https://example.invalid', {
        method: 'OPTIONS',
        headers: { origin: 'https://kaisip.com' },
      }),
      port,
    )).status === 204,
  );
  assert(checks === 0);
});
