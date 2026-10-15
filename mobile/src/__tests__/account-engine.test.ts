/**
 * Uplift Phase 6 (accounts, built OFF): the pure account rules in
 * engine/account.ts and the SHA-256 they use (engine/sha256.ts).
 */
import {
  accountExportFileName,
  accountHash,
  appleNonce,
  cleanCode,
  clockLabel,
  clockSpoken,
  createNonceGuard,
  deleteGate,
  deleteStep,
  isRelayEmail,
  maskEmail,
  parseProviders,
  providersFor,
  reauthProvider,
  recentAuth,
  RESEND_WAIT_MS,
  resendWaitMs,
  TERMS_VERSION,
  typedDelete,
  validCode,
  validEmail,
} from '../engine/account';
import { sha256Hex, toHex, utf8 } from '../engine/sha256';

describe('sha256 (FIPS 180-4 test vectors)', () => {
  it('hashes the standard vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
    // Over one 64-byte block, and exactly at the padding edge (55 and 56 bytes).
    expect(sha256Hex('a'.repeat(1000))).toBe('41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3');
    expect(sha256Hex('a'.repeat(55))).toBe('9f4390f8d30c2dd92ec9f095b65e2b9ae9b0a925a5258e241c9f1e910f734318');
    expect(sha256Hex('a'.repeat(56))).toBe('b35439a4ac6f0948b6d6f9e3c6af0f5f590ce20f1bde7090ef7970686ec6738a');
  });

  it('encodes UTF-8 like TextEncoder (accents, emoji, a lone surrogate)', () => {
    for (const s of ['é', '€', '😀', 'KaiSip · 16+', '\ud800']) {
      expect(toHex(utf8(s))).toBe(toHex(new TextEncoder().encode(s)));
    }
  });

  it('agrees with Node’s crypto on 200 random strings', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createHash } = require('crypto') as typeof import('crypto');
    let seed = 7;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    for (let i = 0; i < 200; i++) {
      const s = Array.from({ length: Math.floor(rnd() * 150) }, () => String.fromCodePoint(Math.floor(rnd() * 0x2fff) + 32)).join('');
      expect(sha256Hex(s)).toBe(createHash('sha256').update(s, 'utf8').digest('hex'));
    }
  });
});

describe('emails and codes', () => {
  it('accepts plausible addresses, trimmed and in any case', () => {
    expect(validEmail('maya@example.com')).toBe(true);
    expect(validEmail('  Maya.Lee+cisa@Example.CO.uk ')).toBe(true);
    for (const bad of ['', 'maya', 'maya@', '@example.com', 'maya@example', 'maya @example.com', `${'a'.repeat(250)}@x.co`]) {
      expect(validEmail(bad)).toBe(false);
    }
  });

  it('a code is exactly 6 digits; a pasted "123 456" is cleaned', () => {
    expect(validCode('123456')).toBe(true);
    expect(validCode('12345')).toBe(false);
    expect(validCode('1234567')).toBe(false);
    expect(validCode('12a456')).toBe(false);
    expect(cleanCode('123 456')).toBe('123456');
    expect(cleanCode('12-34-56-78')).toBe('123456');
  });

  it('masks an email as first letter, •••, then the domain', () => {
    expect(maskEmail('jane.doe@gmail.com')).toBe('j•••@gmail.com');
    expect(maskEmail(' Maya@Example.com ')).toBe('m•••@example.com');
    // A one-letter local part still hides nothing more than the letter.
    expect(maskEmail('j@x.io')).toBe('j•••@x.io');
    expect(maskEmail('not-an-email')).toBeNull();
    expect(maskEmail(null)).toBeNull();
  });

  it('never shows an Apple relay address', () => {
    expect(isRelayEmail('abc123@privaterelay.appleid.com')).toBe(true);
    expect(isRelayEmail('ABC@PrivateRelay.AppleID.com')).toBe(true);
    expect(isRelayEmail('maya@example.com')).toBe(false);
    expect(maskEmail('abc123@privaterelay.appleid.com')).toBeNull();
  });
});

describe('sign-in methods', () => {
  it('reads the build sub-flags: unset = all three; unknown words ignored', () => {
    expect(parseProviders(undefined)).toEqual(['email', 'apple', 'google']);
    expect(parseProviders('')).toEqual(['email', 'apple', 'google']);
    expect(parseProviders('email')).toEqual(['email']);
    expect(parseProviders(' Google , email, facebook')).toEqual(['email', 'google']);
  });

  it('Apple only on iOS (and the web screenshot build); never on Android', () => {
    expect(providersFor('ios', ['email', 'apple', 'google'])).toEqual(['apple', 'google', 'email']);
    expect(providersFor('android', ['email', 'apple', 'google'])).toEqual(['google', 'email']);
    expect(providersFor('web', ['email', 'apple', 'google'])).toEqual(['apple', 'google', 'email']);
    expect(providersFor('android', ['email'])).toEqual(['email']);
  });

  it('App Store 4.8: on iOS, if Google shows, Apple shows', () => {
    for (const enabled of [['google'], ['google', 'email'], ['apple', 'google'], ['email', 'apple', 'google']] as const) {
      const shown = providersFor('ios', enabled);
      if (shown.includes('google')) expect(shown).toContain('apple');
    }
    expect(providersFor('ios', ['email'])).toEqual(['email']);
  });
});

describe('re-auth before deleting', () => {
  const now = Date.UTC(2026, 9, 12, 10);
  it('a sign-in under 10 minutes old is recent; 11 minutes is not', () => {
    expect(recentAuth(now - 9 * 60_000, now)).toBe(true);
    expect(recentAuth(now - 11 * 60_000, now)).toBe(false);
    expect(deleteGate(now - 60_000, now)).toBe('type');
    expect(deleteGate(now - 11 * 60_000, now)).toBe('reauth');
  });

  it('a sign-in time in the future (a wrong clock) is not recent', () => {
    expect(recentAuth(now + 5 * 60_000, now)).toBe(false);
    expect(recentAuth(Number.NaN, now)).toBe(false);
  });

  it('confirms with Apple first, then Google, then email, only where this phone shows it', () => {
    expect(reauthProvider(['email', 'apple'], ['apple', 'google', 'email'])).toBe('apple');
    expect(reauthProvider(['email', 'apple'], ['google', 'email'])).toBe('email');
    expect(reauthProvider(['google', 'email'], ['google', 'email'])).toBe('google');
    expect(reauthProvider(['apple'], ['google', 'email'])).toBe('apple');
  });

  it('the word DELETE confirms, in any case (the keyboard may not start in capitals)', () => {
    expect(typedDelete('DELETE')).toBe(true);
    expect(typedDelete(' DELETE ')).toBe(true);
    expect(typedDelete('delete')).toBe(true);
    expect(typedDelete('Delete')).toBe(true);
    expect(typedDelete('DELET')).toBe(false);
    expect(typedDelete('DELETE IT')).toBe(false);
    expect(typedDelete('')).toBe(false);
  });

  it('deleteStep: an Apple account on a phone that shows Apple always confirms with Apple, even just signed in', () => {
    const ios = ['apple', 'google', 'email'] as const;
    const android = ['google', 'email'] as const;
    expect(deleteStep(['apple'], ios, now - 60_000, now)).toEqual({ gate: 'reauth', provider: 'apple' });
    expect(deleteStep(['email', 'apple'], ios, now - 60_000, now)).toEqual({ gate: 'reauth', provider: 'apple' });
    // Android: the usual rule (Apple can't show there); the server deletes without the Apple revoke.
    expect(deleteStep(['apple', 'email'], android, now - 60_000, now)).toEqual({ gate: 'type', provider: 'email' });
    expect(deleteStep(['apple', 'email'], android, now - 11 * 60_000, now)).toEqual({ gate: 'reauth', provider: 'email' });
    // No Apple: recent → type; old → confirm with the best shown method.
    expect(deleteStep(['google', 'email'], ios, now - 60_000, now)).toEqual({ gate: 'type', provider: 'google' });
    expect(deleteStep(['email'], ios, now - 30 * 60_000, now)).toEqual({ gate: 'reauth', provider: 'email' });
  });
});

describe('the resend timer', () => {
  it('waits 60 seconds after a send, shown as m:ss and spoken in words', () => {
    const sent = 1_000_000;
    expect(resendWaitMs(null, sent)).toBe(0);
    expect(resendWaitMs(sent, sent)).toBe(RESEND_WAIT_MS);
    expect(resendWaitMs(sent, sent + 18_000)).toBe(42_000);
    expect(resendWaitMs(sent, sent + 70_000)).toBe(0);
    expect(clockLabel(42_000)).toBe('0:42');
    expect(clockLabel(60_000)).toBe('1:00');
    expect(clockLabel(41_100)).toBe('0:42');
    expect(clockSpoken(42_000)).toBe('42 seconds');
    expect(clockSpoken(60_000)).toBe('1 minute');
    expect(clockSpoken(1_000)).toBe('1 second');
  });
});

describe('ids, nonces and files', () => {
  it('remembers the synced account as a SHA-256 hash, never the id', () => {
    const h = accountHash('3f6b5c1e-1111-4222-8333-444455556666');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain('3f6b5c1e');
  });

  it('Apple gets the hashed nonce, the backend the raw one', () => {
    const bytes = Uint8Array.from({ length: 32 }, (_, i) => i * 7);
    const n = appleNonce(bytes);
    expect(n.raw).toMatch(/^[0-9a-f]{64}$/);
    expect(n.hashed).toBe(sha256Hex(n.raw));
    expect(n.hashed).not.toBe(n.raw);
    expect(() => appleNonce(new Uint8Array(8))).toThrow();
  });

  it('a nonce is used once: a replayed or unknown one is refused', () => {
    const guard = createNonceGuard();
    guard.issue('n1');
    expect(guard.consume('n1')).toBe(true);
    expect(guard.consume('n1')).toBe(false);
    expect(guard.consume('never-issued')).toBe(false);
  });

  it('names the data file with the local date', () => {
    expect(accountExportFileName(new Date(2026, 9, 12, 23, 30).getTime())).toBe('kaisip-account-2026-10-12.json');
  });

  it('terms version is YYYY-MM (the database checks the same pattern)', () => {
    expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}$/);
  });
});
