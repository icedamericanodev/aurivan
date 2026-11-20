/**
 * Mobile 2.2, "Rate this app" and "Share this app" (lib/rateShare.ts): the links and the text they
 * build, the Google Play app → browser → plain message fallback, and cancel and failure for sharing.
 * The share text is checked WORD FOR WORD: it is the same for everyone and carries nothing about
 * the learner.
 */
import { Linking, Share } from 'react-native';
import appJson from '../../app.json';
import {
  openStorePage,
  playStoreAppUrl,
  playStoreWebUrl,
  PUBLIC_SITE_URL,
  RATE_FAILED_LINE,
  rateLinks,
  SHARE_APP_TEXT,
  SHARE_FAILED_LINE,
  shareApp,
  shareAppContent,
  STORE_PACKAGE,
} from '../lib/rateShare';

const APP = 'market://details?id=com.kaisip.app';
const WEB = 'https://play.google.com/store/apps/details?id=com.kaisip.app';
const APPROVED_TEXT = 'KaiSip: CISA exam practice that explains why the best answer wins. https://kaisip.com';

afterEach(() => jest.restoreAllMocks());

describe('the links', () => {
  it('the package is the one the store build ships (app.json)', () => {
    expect(STORE_PACKAGE).toBe('com.kaisip.app');
    expect(STORE_PACKAGE).toBe(appJson.expo.android.package);
  });

  it('builds the Google Play app link and its web fallback', () => {
    expect(playStoreAppUrl()).toBe(APP);
    expect(playStoreWebUrl()).toBe(WEB);
    // A strange id can never add a second parameter to the link.
    expect(playStoreAppUrl('a b&c=d')).toBe('market://details?id=a%20b%26c%3Dd');
    expect(playStoreWebUrl('a b&c=d')).toBe('https://play.google.com/store/apps/details?id=a%20b%26c%3Dd');
  });

  it('only Android has a place to rate; iPhone, the web and anything else have none', () => {
    expect(rateLinks('android')).toEqual({ app: APP, web: WEB });
    for (const os of ['ios', 'web', 'windows', 'macos', '']) expect(rateLinks(os)).toBeNull();
  });
});

describe('the share text', () => {
  it('is exactly the approved line and the public link', () => {
    expect(PUBLIC_SITE_URL).toBe('https://kaisip.com');
    expect(SHARE_APP_TEXT).toBe(APPROVED_TEXT);
  });

  it('is the whole payload: a message, and no title, url, file or anything else', () => {
    expect(shareAppContent()).toStrictEqual({ message: APPROVED_TEXT });
    expect(Object.keys(shareAppContent())).toEqual(['message']);
  });

  it('carries one link (the website), no store link, and no promise that the app is out', () => {
    expect(SHARE_APP_TEXT.match(/https?:\/\/\S+/g)).toEqual(['https://kaisip.com']);
    expect(SHARE_APP_TEXT).not.toMatch(/play\.google|market:|apps\.apple/i);
    expect(SHARE_APP_TEXT).not.toMatch(/download|install|available|get it|out now|free/i);
  });

  it('the failure lines are plain and never claim success', () => {
    expect(RATE_FAILED_LINE).toBe('Google Play could not be opened on this phone.');
    expect(SHARE_FAILED_LINE).toBe('Sharing is not available on this phone. The link is kaisip.com.');
  });
});

describe('Rate this app: opening Google Play', () => {
  it('opens the Google Play app when the phone has it (one try, no browser)', async () => {
    const open = jest.fn().mockResolvedValue(undefined);
    await expect(openStorePage(rateLinks('android'), open)).resolves.toBe('store');
    expect(open.mock.calls).toEqual([[APP]]);
  });

  it('falls back to the web page when no store app takes the link', async () => {
    const open = jest.fn().mockRejectedValueOnce(new Error('No Activity found to handle Intent')).mockResolvedValueOnce(undefined);
    await expect(openStorePage(rateLinks('android'), open)).resolves.toBe('browser');
    expect(open.mock.calls).toEqual([[APP], [WEB]]);
  });

  it('says failed (and never throws) when neither opens', async () => {
    const open = jest.fn().mockRejectedValue(new Error('nothing can open this'));
    await expect(openStorePage(rateLinks('android'), open)).resolves.toBe('failed');
    expect(open.mock.calls).toEqual([[APP], [WEB]]);
  });

  it('a phone with no rating page (iPhone, web) opens nothing', async () => {
    const open = jest.fn().mockResolvedValue(undefined);
    await expect(openStorePage(rateLinks('ios'), open)).resolves.toBe('failed');
    await expect(openStorePage(rateLinks('web'), open)).resolves.toBe('failed');
    expect(open).not.toHaveBeenCalled();
  });

  it('on the phone it uses Linking.openURL, and never asks canOpenURL first', async () => {
    // mockReset first: React Native's Jest setup already makes these jest.fn()s, and their calls outlive a test.
    const openURL = jest.spyOn(Linking, 'openURL').mockReset().mockRejectedValueOnce(new Error('no store')).mockResolvedValueOnce(undefined);
    const canOpenURL = jest.spyOn(Linking, 'canOpenURL').mockReset();
    await expect(openStorePage(rateLinks('android'))).resolves.toBe('browser');
    expect(openURL.mock.calls).toEqual([[APP], [WEB]]);
    expect(canOpenURL).not.toHaveBeenCalled();
  });
});

describe('Share this app: the share sheet', () => {
  it('hands the share sheet the approved text and nothing else', async () => {
    const share = jest.spyOn(Share, 'share').mockReset().mockResolvedValue({ action: Share.sharedAction, activityType: undefined });
    await expect(shareApp()).resolves.toBe('shared');
    // One call, ONE argument (no options: no subject, no dialog title), exactly this object.
    expect(share.mock.calls).toEqual([[{ message: APPROVED_TEXT }]]);
    expect(share.mock.calls[0]).toHaveLength(1);
    expect(share.mock.calls[0][0]).toStrictEqual({ message: APPROVED_TEXT });
  });

  it('cancel is a normal answer: dismissed, not a failure', async () => {
    const share = jest.fn().mockResolvedValue({ action: Share.dismissedAction });
    await expect(shareApp(share)).resolves.toBe('dismissed');
    expect(share).toHaveBeenCalledTimes(1);
  });

  it('a browser’s "closed by the user" error is a cancel too (web build)', async () => {
    const share = jest.fn().mockRejectedValue(Object.assign(new Error('Share canceled'), { name: 'AbortError' }));
    await expect(shareApp(share)).resolves.toBe('dismissed');
  });

  it('no share sheet: failed, and never throws', async () => {
    await expect(shareApp(jest.fn().mockRejectedValue(new Error('Share is not supported in this browser')))).resolves.toBe('failed');
    await expect(shareApp(jest.fn().mockRejectedValue('odd'))).resolves.toBe('failed');
    await expect(shareApp(jest.fn().mockRejectedValue(null))).resolves.toBe('failed');
  });

  it('an answer with no action (a browser resolves with nothing) counts as shared', async () => {
    await expect(shareApp(jest.fn().mockResolvedValue(undefined))).resolves.toBe('shared');
  });
});
