/**
 * Security audit L1 (21 Oct 2026): a link from outside the app must not
 * pre-fill the board's composer. kaisip://board/new?body=... opens an EMPTY
 * composer; every other link (and its query) passes through unchanged.
 */
import { redirectSystemPath } from '../app/+native-intent';
import { dropComposerPrefill } from '../lib/linkPrefill';

describe('outside links to the composer lose their prefill', () => {
  it.each([
    ['kaisip://board/new?kind=content&body=Contact%20me%20at%20x', 'kaisip://board/new'],
    ['kaisip://board/new?body=hi#top', 'kaisip://board/new'],
    ['kaisip://board/new/?body=hi', 'kaisip://board/new'],
    ['kaisip:///board/new?body=hi', 'kaisip:///board/new'],
    ['/board/new?body=hi&kind=bug', '/board/new'],
    ['board/new?body=hi', 'board/new'],
    ['/(cloud)/board/new?body=hi', '/(cloud)/board/new'],
    ['exp://192.168.1.2:8081/--/board/new?body=hi', 'exp://192.168.1.2:8081/--/board/new'],
    // Case and %-escapes can't hide the composer.
    ['kaisip://board/NEW?body=hi', 'kaisip://board/NEW'],
    ['kaisip://board/n%65w?body=hi', 'kaisip://board/n%65w'],
    ['kaisip://board%2Fnew?body=hi', 'kaisip://board%2Fnew'],
    // An edit link from outside opens a plain composer too.
    ['kaisip://board/new?edit=10000000-0000-4000-8000-000000000001', 'kaisip://board/new'],
  ])('%s opens %s', (path, expected) => {
    expect(dropComposerPrefill(path)).toBe(expected);
    expect(redirectSystemPath({ path, initial: true })).toBe(expected);
    expect(redirectSystemPath({ path, initial: false })).toBe(expected);
  });

  it.each([
    'kaisip://board?q=timer',
    'kaisip://board/10000000-0000-4000-8000-000000000001?from=email',
    'kaisip://board/moderation',
    'kaisip://board/newest?body=hi',
    'kaisip://myboard/new?body=hi',
    'kaisip://help?open=idea',
    '/notes/subtopic/1A2.4',
    // A broken %-escape is compared as raw text and never throws.
    'kaisip://board/%E0%A4%A?body=hi',
  ])('%s passes through unchanged', (path) => {
    expect(dropComposerPrefill(path)).toBe(path);
    expect(redirectSystemPath({ path, initial: false })).toBe(path);
  });

  it('old links still go to their new screen', () => {
    expect(redirectSystemPath({ path: 'kaisip://whats-next?from=email', initial: true })).toBe('/help');
  });
});
