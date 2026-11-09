import { HttpError, json, readJsonObject, requirePost, serveWeb } from '../_shared/http.ts';

export interface SignInPort {
  eligibility(email: string): Promise<string>;
  send(email: string, captcha: string): Promise<Response>;
}

/** No user identifiers, provider messages or admin setup details leave this handler. */
export function handleSignIn(req: Request, port: SignInPort): Promise<Response> {
  return serveWeb(req, () => {}, async () => {
    requirePost(req);
    const origin = req.headers.get('origin');
    if (origin && origin !== 'https://kaisip.com') throw new HttpError(403, 'forbidden');
    const body = await readJsonObject(req, { maxBytes: 4096 });
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError(400, 'invalid');
    }
    const captcha = typeof body.captcha_token === 'string' ? body.captcha_token : '';
    // The service-only RPC rate-limits before looking up membership, across all instances.
    const result = await port.eligibility(email);
    if (result === 'rate_limited') throw new HttpError(429, 'rate_limited', undefined, 300);
    if (result === 'not_admin') return json(403, { error: 'not_admin' });
    if (result !== 'allowed') throw new HttpError(503, 'server');
    const sent = await port.send(email, captcha);
    if (!sent.ok) {
      if (sent.status === 429) throw new HttpError(429, 'rate_limited');
      const data = await sent.json().catch(() => ({}));
      if (/captcha/i.test(String(data.error_code ?? data.code ?? ''))) {
        return json(400, { error: 'captcha_failed' });
      }
      throw new HttpError(503, 'server');
    }
    return json(200, { sent: true });
  });
}
