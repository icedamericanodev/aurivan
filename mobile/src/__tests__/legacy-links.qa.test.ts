/**
 * QA for PR #50 (mobile 1.17.1): edge cases of the old-link redirect.
 * legacy-links.test.ts covers the main forms; this file adds case, the
 * root link, query/hash that merely mention the old screen, and every deep
 * link the app relies on today (exam date, plant section, Help's open=…),
 * in all three URL shapes Expo Router hands to +native-intent.
 *
 * One real bug is pinned with `it.failing` (passes while the bug exists,
 * starts failing once it is fixed; then drop `.failing`): MOVED is a plain
 * object, so a link whose last part is an Object.prototype key
 * (aurivan://constructor, aurivan://__proto__) returns a function or an
 * object instead of a string.
 */
import { redirectSystemPath } from '../app/+native-intent';
import { redirectLegacyPath } from '../lib/legacyLinks';

const both = (path: string) => [
  redirectSystemPath({ path, initial: true }),
  redirectSystemPath({ path, initial: false }),
];

describe('old What’s next links: more shapes', () => {
  it.each([
    'aurivan://WHATS-NEXT',
    '/Whats-Next',
    'aurivan://whats-next/',
    '/whats-next//',
    'aurivan://whats-next?utm_source=email#x',
    'exp://10.0.2.2:8081/--/whats-next?x=1',
    'exp+aurivan://whats-next',
  ])('%s opens Help', (path) => {
    expect(both(path)).toEqual(['/help', '/help']);
  });
});

describe('links that must pass through untouched', () => {
  it.each([
    // Camel-case prototype keys are lowercased first, so they miss MOVED.
    'aurivan://toString',
    '/hasOwnProperty',
    // Root and dev-client launches.
    'aurivan://',
    'aurivan:///',
    '',
    'exp://192.168.1.2:8081',
    'exp://192.168.1.2:8081/--/',
    'exp+aurivan://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8081',
    // Only the query or hash mentions the old screen.
    '/help?from=whats-next',
    'aurivan://help#whats-next',
    'aurivan://settings?back=/whats-next',
    // Look-alikes.
    '/whats-next-thing',
    'aurivan://whats-new',
    'aurivan://whats-new/',
    // Deep links the app uses today.
    '/settings?open=exam-date',
    'aurivan://settings?open=exam-date',
    'exp://192.168.1.2:8081/--/settings?open=exam-date',
    '/settings?section=plant',
    'aurivan://settings?section=plant',
    'aurivan://help?open=support',
    'aurivan://help?open=feedback',
    'aurivan://help?open=idea',
    'aurivan://help?open=report',
    'aurivan://milestones?open=firm-footing',
    'aurivan://plant-pick?mode=change',
    'aurivan://notes/subtopic/1A2.4',
    'aurivan://bank/d1',
  ])('%s is unchanged', (path) => {
    expect(both(path)).toEqual([path, path]);
  });
});

describe('the hook never hands Expo Router a non-string', () => {
  // Bug: legacyLinks.ts reads MOVED[last] on a plain object literal, so
  // inherited keys resolve. "aurivan://constructor" returns Object itself.
  // (The last part is lowercased first, so camel-case keys like toString
  // miss; "constructor" and "__proto__" hit, in any case.)
  it.failing.each(['aurivan://constructor', 'aurivan://CONSTRUCTOR', 'aurivan://__proto__', '/notes/__proto__'])(
    '%s comes back as the same string',
    (path) => {
      for (const out of both(path)) expect(typeof out).toBe('string');
      expect(redirectLegacyPath(path)).toBe(path);
    },
  );
});
