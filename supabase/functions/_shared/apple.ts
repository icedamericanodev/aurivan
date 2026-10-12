// Sign in with Apple token revocation, for account deletion (Apple: "Apps that
// support Sign in with Apple should use the Sign in with Apple REST API to
// revoke user tokens"). Runs only on the server: the .p8 key is a Function
// secret and never reaches the app.
//
// Flow: the app re-authenticates with Apple and sends the fresh
// authorizationCode; we exchange it at /auth/token for a refresh token, then
// revoke that at /auth/revoke. Both calls use a short-lived client secret: an
// ES256 JWT signed with the .p8 key. Pure apart from the injected fetch.

export interface AppleConfig {
  teamId: string;
  keyId: string;
  /** The app's bundle id: a code from native Sign in with Apple is issued to it. */
  clientId: string;
  /** The .p8 key, PEM (PKCS#8). */
  privateKeyPem: string;
}

export interface AppleRevoker {
  /** true when Apple confirmed the revoke. Never throws. */
  revokeWithCode(code: string): Promise<boolean>;
}

type FetchFn = (input: string, init: RequestInit) => Promise<Response>;

const APPLE = 'https://appleid.apple.com';
const SECRET_TTL_SEC = 5 * 60;
const TIMEOUT_MS = 8000;

/** Apple authorization codes are short printable tokens (dots, dashes, underscores). */
export function isAppleCode(x: unknown): x is string {
  return typeof x === 'string' && /^[A-Za-z0-9._~+/=-]{8,1024}$/.test(x);
}

/** Reads the four Function secrets. null when any is missing (not configured yet). */
export function appleConfigFromEnv(get: (key: string) => string | undefined): AppleConfig | null {
  const teamId = get('APPLE_TEAM_ID')?.trim();
  const keyId = get('APPLE_KEY_ID')?.trim();
  const clientId = get('APPLE_CLIENT_ID')?.trim();
  const privateKeyPem = get('APPLE_PRIVATE_KEY')?.replace(/\\n/g, '\n').trim();
  if (!teamId || !keyId || !clientId || !privateKeyPem) return null;
  return { teamId, keyId, clientId, privateKeyPem };
}

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlJson(x: unknown): string {
  return b64url(new TextEncoder().encode(JSON.stringify(x)));
}

function pemToDer(pem: string): Uint8Array<ArrayBuffer> {
  const bin = atob(pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, ''));
  const der = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i);
  return der;
}

/** The ES256 client-secret JWT Apple's token and revoke endpoints expect. */
export async function appleClientSecret(cfg: AppleConfig, nowSec: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(cfg.privateKeyPem),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const header = b64urlJson({ alg: 'ES256', kid: cfg.keyId, typ: 'JWT' });
  const payload = b64urlJson({
    iss: cfg.teamId,
    iat: nowSec,
    exp: nowSec + SECRET_TTL_SEC,
    aud: APPLE,
    sub: cfg.clientId,
  });
  const signingInput = `${header}.${payload}`;
  // WebCrypto returns the raw r||s form, which is exactly what JWS ES256 uses.
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${b64url(new Uint8Array(sig))}`;
}

async function postForm(fetchFn: FetchFn, path: string, form: Record<string, string>): Promise<Response> {
  return await fetchFn(`${APPLE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

export function makeAppleRevoker(
  cfg: AppleConfig,
  fetchFn: FetchFn = fetch,
  nowSec: () => number = () => Math.floor(Date.now() / 1000),
): AppleRevoker {
  return {
    async revokeWithCode(code: string): Promise<boolean> {
      try {
        if (!isAppleCode(code)) return false;
        const secret = await appleClientSecret(cfg, nowSec());
        const tokenRes = await postForm(fetchFn, '/auth/token', {
          client_id: cfg.clientId,
          client_secret: secret,
          code,
          grant_type: 'authorization_code',
        });
        if (!tokenRes.ok) return false;
        const tokens = await tokenRes.json() as { refresh_token?: unknown; access_token?: unknown };
        const [token, hint] = typeof tokens.refresh_token === 'string'
          ? [tokens.refresh_token, 'refresh_token']
          : typeof tokens.access_token === 'string'
          ? [tokens.access_token, 'access_token']
          : [null, ''];
        if (!token) return false;
        const revokeRes = await postForm(fetchFn, '/auth/revoke', {
          client_id: cfg.clientId,
          client_secret: secret,
          token,
          token_type_hint: hint,
        });
        return revokeRes.ok;
      } catch {
        return false;
      }
    },
  };
}
