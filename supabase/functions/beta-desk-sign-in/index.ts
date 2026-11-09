import { HttpError, makeLogger } from '../_shared/http.ts';
import { serviceKeyFromEnv } from '../_shared/serviceKey.ts';
import { handleSignIn } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL');
const key = serviceKeyFromEnv((name) => Deno.env.get(name));
const captchaSecret = Deno.env.get('BETA_DESK_TURNSTILE_SECRET');
const log = makeLogger('beta-desk-sign-in');

function serverPost(path: string, body: unknown): Promise<Response> {
  if (!url || !key) throw new HttpError(503, 'server');
  return fetch(url + path, {
    method: 'POST',
    headers: { apikey: key, authorization: 'Bearer ' + key, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
}

Deno.serve((req) =>
  handleSignIn(req, {
    log,
    async verifyCaptcha(token) {
      if (!captchaSecret || !url || !key) throw new HttpError(503, 'server');
      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: new URLSearchParams({ secret: captchaSecret, response: token }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new HttpError(503, 'server');
      const result = await res.json();
      return result.success === true && result.hostname === 'kaisip.com' && result.action === 'beta-desk-sign-in';
    },
    async isAllowed(email) {
      const res = await serverPost('/rest/v1/rpc/beta_desk_email_is_allowed', { candidate_email: email });
      if (!res.ok) throw new HttpError(503, 'server');
      const allowed = await res.json();
      if (typeof allowed !== 'boolean') throw new HttpError(503, 'server');
      return allowed;
    },
    async sendCode(email) {
      // Server credentials bypass Auth CAPTCHA because we already consumed the
      // single-use token above. Do not create accounts through this admin page.
      const res = await serverPost('/auth/v1/otp', { email, create_user: false });
      if (res.status === 429) throw new HttpError(429, 'rate_limited');
      if (!res.ok) throw new HttpError(503, 'server');
    },
  })
);
