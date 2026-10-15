/**
 * QA for PR #50 (mobile 1.17.1): edge cases of the old-link redirect.
 * legacy-links.test.ts covers the main forms; this file adds case, the
 * root link, query/hash that merely mention the old screen, and every deep
 * link the app relies on today (exam date, plant section, Help's open=…),
 * in all three URL shapes Expo Router hands to +native-intent.
 *
 * It also pins a fixed bug: a link whose last part is an Object.prototype
 * key (kaisip://constructor, kaisip://__proto__) once returned a function
 * or an object instead of a string.
 */
import { redirectSystemPath } from '../app/+native-intent';
import { redirectLegacyPath } from '../lib/legacyLinks';

const both = (path: string) => [
  redirectSystemPath({ path, initial: true }),
  redirectSystemPath({ path, initial: false }),
];

describe('old What’s next links: more shapes', () => {
  it.each([
    'kaisip://WHATS-NEXT',
    '/Whats-Next',
    'kaisip://whats-next/',
    '/whats-next//',
    'kaisip://whats-next?utm_source=email#x',
    'exp://10.0.2.2:8081/--/whats-next?x=1',
    'exp+kaisip://whats-next',
  ])('%s opens Help', (path) => {
    expect(both(path)).toEqual(['/help', '/help']);
  });
});

describe('links that must pass through untouched', () => {
  it.each([
    // Camel-case prototype keys are lowercased first, so they miss MOVED.
    'kaisip://toString',
    '/hasOwnProperty',
    // Root and dev-client launches.
    'kaisip://',
    'kaisip:///',
    '',
    'exp://192.168.1.2:8081',
    'exp://192.168.1.2:8081/--/',
    'exp+kaisip://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8081',
    // Only the query or hash mentions the old screen.
    '/help?from=whats-next',
    'kaisip://help#whats-next',
    'kaisip://settings?back=/whats-next',
    // Look-alikes.
    '/whats-next-thing',
    'kaisip://whats-new',
    'kaisip://whats-new/',
    // Deep links the app uses today.
    '/settings?open=exam-date',
    'kaisip://settings?open=exam-date',
    'exp://192.168.1.2:8081/--/settings?open=exam-date',
    '/settings?section=plant',
    'kaisip://settings?section=plant',
    'kaisip://help?open=support',
    'kaisip://help?open=feedback',
    'kaisip://help?open=idea',
    'kaisip://help?open=report',
    'kaisip://milestones?open=firm-footing',
    'kaisip://plant-pick?mode=change',
    'kaisip://notes/subtopic/1A2.4',
    'kaisip://bank/d1',
  ])('%s is unchanged', (path) => {
    expect(both(path)).toEqual([path, path]);
  });
});

describe('the hook never hands Expo Router a non-string', () => {
  // Fixed: inherited keys of the lookup object must never match.
  it.each(['kaisip://constructor', 'kaisip://CONSTRUCTOR', 'kaisip://__proto__', '/notes/__proto__'])(
    '%s comes back as the same string',
    (path) => {
      for (const out of both(path)) expect(typeof out).toBe('string');
      expect(redirectLegacyPath(path)).toBe(path);
    },
  );
});
