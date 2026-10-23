/**
 * lib/config.ts: the Privacy policy and Terms of use links (mobile 1.40.1).
 *
 * Google Play requires the privacy policy link inside the app. Before 1.40.1
 * an empty EXPO_PUBLIC_PRIVACY_URL hid the Settings row; now the live
 * kaisip.com pages are built-in defaults, so the rows can never disappear.
 */
import { config, DEFAULT_PRIVACY_URL, DEFAULT_TERMS_URL, linkFrom } from '../lib/config';

describe('privacy and terms links', () => {
  it('the defaults are the live kaisip.com pages', () => {
    expect(DEFAULT_PRIVACY_URL).toBe('https://kaisip.com/privacy');
    expect(DEFAULT_TERMS_URL).toBe('https://kaisip.com/terms');
  });

  it('a build without the settings still has both links (Jest sets neither)', () => {
    expect(process.env.EXPO_PUBLIC_PRIVACY_URL ?? '').toBe('');
    expect(config.privacyUrl).toBe(DEFAULT_PRIVACY_URL);
    expect(config.termsUrl).toBe(DEFAULT_TERMS_URL);
  });

  it('an empty, blank or non-https value falls back to the default', () => {
    for (const bad of [undefined, '', '   ', 'kaisip.com/privacy', 'http://kaisip.com/privacy', 'https://', 'https://a b', 'javascript:alert(1)']) {
      expect(linkFrom(bad, DEFAULT_PRIVACY_URL)).toBe(DEFAULT_PRIVACY_URL);
    }
  });

  it('a real https link from the build settings wins (trimmed)', () => {
    expect(linkFrom(' https://example.com/kaisip/privacy.html ', DEFAULT_PRIVACY_URL)).toBe('https://example.com/kaisip/privacy.html');
    expect(linkFrom('https://kaisip.com/terms', DEFAULT_TERMS_URL)).toBe('https://kaisip.com/terms');
  });
});
