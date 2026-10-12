import { strict as assert } from 'node:assert';
import { appleClientSecret, type AppleConfig, appleConfigFromEnv, isAppleCode, makeAppleRevoker } from './apple.ts';

const CODE = 'c1a2b3c4d5e6f7.0.abcd.Ef_12-34';

/** A throwaway P-256 key, made per run: no key material is committed. */
async function testKey(): Promise<{ pem: string; publicKey: CryptoKey }> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  let bin = '';
  for (const b of der) bin += String.fromCharCode(b);
  const body = btoa(bin).replace(/(.{64})/g, '$1\n');
  return { pem: `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`, publicKey: pair.publicKey };
}

function b64urlDecode(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function config(): Promise<{ cfg: AppleConfig; publicKey: CryptoKey }> {
  const { pem, publicKey } = await testKey();
  return {
    cfg: { teamId: 'TEAM123456', keyId: 'KEY1234567', clientId: 'app.example.test', privateKeyPem: pem },
    publicKey,
  };
}

Deno.test('the client secret is a valid ES256 JWT with Apple’s claims', async () => {
  const { cfg, publicKey } = await config();
  const jwt = await appleClientSecret(cfg, 1_800_000_000);
  const [h, p, s] = jwt.split('.');
  assert.deepEqual(JSON.parse(new TextDecoder().decode(b64urlDecode(h))), {
    alg: 'ES256',
    kid: 'KEY1234567',
    typ: 'JWT',
  });
  assert.deepEqual(JSON.parse(new TextDecoder().decode(b64urlDecode(p))), {
    iss: 'TEAM123456',
    iat: 1_800_000_000,
    exp: 1_800_000_300,
    aud: 'https://appleid.apple.com',
    sub: 'app.example.test',
  });
  const ok = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    b64urlDecode(s),
    new TextEncoder().encode(`${h}.${p}`),
  );
  assert.equal(ok, true);
});

Deno.test('appleConfigFromEnv needs all four secrets', () => {
  const env: Record<string, string> = {
    APPLE_TEAM_ID: 'T',
    APPLE_KEY_ID: 'K',
    APPLE_CLIENT_ID: 'C',
    APPLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----',
  };
  const cfg = appleConfigFromEnv((k) => env[k]);
  assert.equal(cfg?.privateKeyPem, '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----');
  for (const k of Object.keys(env)) assert.equal(appleConfigFromEnv((x) => (x === k ? '' : env[x])), null);
});

Deno.test('isAppleCode', () => {
  assert.equal(isAppleCode(CODE), true);
  for (const bad of ['', 'short', 'has space here', 42, null, 'x'.repeat(2000)]) assert.equal(isAppleCode(bad), false);
});

type Sent = { url: string; form: URLSearchParams };

function fakeFetch(responses: Response[]): { fetchFn: (u: string, i: RequestInit) => Promise<Response>; sent: Sent[] } {
  const sent: Sent[] = [];
  return {
    sent,
    fetchFn: (url, init) => {
      sent.push({ url, form: new URLSearchParams(String(init.body)) });
      const next = responses.shift();
      return next ? Promise.resolve(next) : Promise.reject(new Error('no more responses'));
    },
  };
}

Deno.test('revoke: exchanges the code, then revokes the refresh token', async () => {
  const { cfg } = await config();
  const { fetchFn, sent } = fakeFetch([
    Response.json({ access_token: 'at', refresh_token: 'rt', token_type: 'Bearer' }),
    new Response(null, { status: 200 }),
  ]);
  assert.equal(await makeAppleRevoker(cfg, fetchFn, () => 1_800_000_000).revokeWithCode(CODE), true);
  assert.equal(sent[0].url, 'https://appleid.apple.com/auth/token');
  assert.equal(sent[0].form.get('code'), CODE);
  assert.equal(sent[0].form.get('grant_type'), 'authorization_code');
  assert.equal(sent[0].form.get('client_id'), 'app.example.test');
  assert.equal(sent[1].url, 'https://appleid.apple.com/auth/revoke');
  assert.equal(sent[1].form.get('token'), 'rt');
  assert.equal(sent[1].form.get('token_type_hint'), 'refresh_token');
  assert.equal(sent[1].form.get('client_secret'), sent[0].form.get('client_secret'));
});

Deno.test('revoke falls back to the access token when Apple returns no refresh token', async () => {
  const { cfg } = await config();
  const { fetchFn, sent } = fakeFetch([Response.json({ access_token: 'at' }), new Response(null, { status: 200 })]);
  assert.equal(await makeAppleRevoker(cfg, fetchFn).revokeWithCode(CODE), true);
  assert.equal(sent[1].form.get('token_type_hint'), 'access_token');
});

Deno.test('revoke never throws: a refused code, a refused revoke or a network error is false', async () => {
  const { cfg } = await config();
  const refusedCode = fakeFetch([Response.json({ error: 'invalid_grant' }, { status: 400 })]);
  assert.equal(await makeAppleRevoker(cfg, refusedCode.fetchFn).revokeWithCode(CODE), false);
  assert.equal(refusedCode.sent.length, 1, 'no revoke call after a refused code');
  const refusedRevoke = fakeFetch([Response.json({ refresh_token: 'rt' }), new Response(null, { status: 400 })]);
  assert.equal(await makeAppleRevoker(cfg, refusedRevoke.fetchFn).revokeWithCode(CODE), false);
  const offline = fakeFetch([]);
  assert.equal(await makeAppleRevoker(cfg, offline.fetchFn).revokeWithCode(CODE), false);
  const noTokens = fakeFetch([Response.json({})]);
  assert.equal(await makeAppleRevoker(cfg, noTokens.fetchFn).revokeWithCode(CODE), false);
  const badCode = fakeFetch([]);
  assert.equal(await makeAppleRevoker(cfg, badCode.fetchFn).revokeWithCode('bad code'), false);
  assert.equal(badCode.sent.length, 0);
  const badKey = fakeFetch([]);
  assert.equal(await makeAppleRevoker({ ...cfg, privateKeyPem: 'nope' }, badKey.fetchFn).revokeWithCode(CODE), false);
});
