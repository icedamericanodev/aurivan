/**
 * The "Rate this app" and "Share this app" rows of Settings → Help and about (mobile 2.2, a tester's
 * suggestion). What each one does, and the rules it keeps, are in lib/rateShare.ts.
 *
 * Plain English for the founder:
 * - Both act only when tapped. Nothing here pops up, asks "do you like the app?", or offers a reward.
 * - "Rate this app" is drawn only where there is a real place to rate (Android → Google Play).
 *   On iPhone and the web build the row is not there (no App Store listing yet).
 * - When it works we say nothing: the phone can't tell us a rating was left or a message was sent.
 * - When nothing could open, the row itself says so under its title (the same in-row pattern as
 *   "Check for updates"), and a screen reader hears it once. Tapping again tries again.
 *
 * Kept in its own small file so app/settings.tsx only gains one line.
 */
import { useRef, useState } from 'react';
import { sayLater } from '../lib/a11y';
import { openStorePage, rateLinks, RATE_FAILED_LINE, shareApp, SHARE_FAILED_LINE } from '../lib/rateShare';
import { SettingsRow } from './settings';

export function RateShareRows() {
  // The plain "could not open" line under each row; cleared the next time that row works.
  const [rateFailed, setRateFailed] = useState(false);
  const [shareFailed, setShareFailed] = useState(false);
  // One at a time: a quick second tap must not open the store or the share sheet twice.
  const busy = useRef(false);
  // null where there is nowhere to rate (iPhone, web): then the row is not drawn at all.
  const links = rateLinks();

  const rate = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const failed = (await openStorePage(links)) === 'failed';
      setRateFailed(failed);
      if (failed) sayLater(RATE_FAILED_LINE);
    } finally {
      busy.current = false;
    }
  };

  const share = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      // 'shared' and 'dismissed' both mean "nothing to say" (cancel is a normal choice).
      const failed = (await shareApp()) === 'failed';
      setShareFailed(failed);
      if (failed) sayLater(SHARE_FAILED_LINE);
    } finally {
      busy.current = false;
    }
  };

  return (
    <>
      {links && (
        <SettingsRow
          title="Rate this app"
          subtitle={rateFailed ? RATE_FAILED_LINE : undefined}
          accessibilityHint="Opens Google Play"
          onPress={rate}
          // An action, not a door to another screen: no chevron (DESIGN_SYSTEM).
          chevron={false}
        />
      )}
      <SettingsRow
        title="Share this app"
        subtitle={shareFailed ? SHARE_FAILED_LINE : undefined}
        accessibilityHint="Opens your phone’s share options with a link to kaisip.com"
        onPress={share}
        chevron={false}
      />
    </>
  );
}
