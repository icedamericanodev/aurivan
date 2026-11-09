import { HttpError, json, type Logger, readJsonObject, requirePost, serveWeb } from '../_shared/http.ts';

type Dependencies = {
  verifyCaptcha: (token: string) => Promise<boolean>;
  isAllowed: (email: string) => Promise<boolean>;
  sendCode: (email: string) => Promise<void>;
  log: Logger;
};

export function handleSignIn(req: Request, deps: Dependencies): Promise<Response> {
  return serveWeb(req, deps.log, async () => {
    requirePost(req);
    if (req.headers.get('origin') !== 'https://kaisip.com') throw new HttpError(403, 'forbidden');
    const body = await readJsonObject(req, { maxBytes: 4096 });
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, 'invalid');
    const token = typeof body.captcha_token === 'string' ? body.captcha_token : '';
    // Return only fixed codes, never provider responses or private configuration.
    if (!token || token.length > 2048 || !await deps.verifyCaptcha(token)) {
      return json(400, { error: 'captcha_failed' });
    }
    if (!await deps.isAllowed(email)) return json(403, { error: 'not_admin' });
    await deps.sendCode(email);
    return json(200, { sent: true });
  });
}
