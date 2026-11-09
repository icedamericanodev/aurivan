/**
 * Links to removed screens land somewhere sane (mobile 1.17.1).
 * "What's next" was removed; an old kaisip://whats-next link must open
 * Help, not Expo Router's blank "unmatched route" screen. Every other link
 * passes through unchanged, so Help's own deep links keep working.
 */
import { redirectSystemPath } from '../app/+native-intent';
import { redirectLegacyPath } from '../lib/legacyLinks';
import { useSettings } from '../store/settings';

// Release bug hunt round 3: a link to a real screen goes to "/" until onboarding is done
// (release-hunt-3-links.test.ts). These links are for a learner who has finished it.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
beforeAll(() => {
  useSettings.setState({ onboarded: true });
});

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

  it.each([
    ['kaisip://progress', '/you'],
    ['/progress', '/you'],
    ['kaisip://mock', '/practice'],
    ['exp://192.168.1.2:8081/--/mock?from=email', '/practice'],
  ])('%s (a removed tab) opens %s', (path, to) => {
    expect(redirectSystemPath({ path, initial: true })).toBe(to);
  });

  it.each(['/', '/help', '/mock-start', 'kaisip://help?open=idea', '/whats-new', 'kaisip://whats-new', '/notes/subtopic/1A2.4', '/lesson/cisa-l-d1-charter'])(
    '%s passes through unchanged',
    (path) => {
      expect(redirectSystemPath({ path, initial: false })).toBe(path);
    },
  );
});
