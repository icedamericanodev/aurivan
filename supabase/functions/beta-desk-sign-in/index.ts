import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { serviceKeyFromEnv } from '../_shared/serviceKey.ts';
import { handleSignIn } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL');
const secret = serviceKeyFromEnv((key) => Deno.env.get(key));
const anon = Deno.env.get('SUPABASE_ANON_KEY');
const client = url && secret
  ? createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

Deno.serve((req) =>
  handleSignIn(req, {
    async eligibility(email) {
      if (!client || !anon) throw new Error('not_configured');
      const { data, error } = await client.rpc('beta_desk_sign_in_check', { p_email: email });
      if (error) throw new Error('eligibility_unavailable');
      return data;
    },
    send(email, captcha) {
      // Use the public Auth key, never the service key: preserve Auth CAPTCHA/rate limits.
      return fetch(url + '/auth/v1/otp', {
        method: 'POST',
        headers: { apikey: anon!, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          create_user: false,
          ...(captcha ? { gotrue_meta_security: { captcha_token: captcha } } : {}),
        }),
        signal: AbortSignal.timeout(10000),
      });
    },
  })
);
