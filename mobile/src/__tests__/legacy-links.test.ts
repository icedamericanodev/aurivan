/**
 * Links to removed screens land somewhere sane (mobile 1.17.1).
 * "What's next" was removed; an old kaisip://whats-next link must open
 * Help, not Expo Router's blank "unmatched route" screen. Every other link
 * passes through unchanged, so Help's own deep links keep working.
 */
import { redirectSystemPath } from '../app/+native-intent';
import { redirectLegacyPath } from '../lib/legacyLinks';

describe('old links', () => {
  it.each([
    '/whats-next',
    'whats-next',
    'kaisip://whats-next',
    'kaisip:///whats-next/',
    'exp://192.168.1.2:8081/--/whats-next',
    '/whats-next?from=email',
    'kaisip://whats-next#top',
  ])('%s opens Help', (path) => {
    expect(redirectLegacyPath(path)).toBe('/help');
    expect(redirectSystemPath({ path, initial: true })).toBe('/help');
    expect(redirectSystemPath({ path, initial: false })).toBe('/help');
  });

  it.each(['/', '/help', 'kaisip://help?open=idea', '/whats-new', 'kaisip://whats-new', '/notes/subtopic/1A2.4', '/lesson/cisa-l-d1-charter'])(
    '%s passes through unchanged',
    (path) => {
      expect(redirectSystemPath({ path, initial: false })).toBe(path);
    },
  );
});
