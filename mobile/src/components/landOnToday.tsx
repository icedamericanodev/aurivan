/**
 * A screen that shows nothing and sends the learner to Today (release bug hunt round 1).
 *
 * Used by app/+not-found.tsx (a link to a screen the app does not have, such as
 * kaisip://course) and app/_sitemap.tsx (Expo Router's built-in list of every
 * screen file). Without them Expo Router shows its developer "Unmatched Route"
 * page, whose "Sitemap" link lists internal screen names.
 *
 * A learner who has not finished onboarding goes to "/" (app/index.tsx sends
 * them to onboarding). Runs on first focus, like app/play.tsx: in Expo SDK 58
 * the router is not ready on mount.
 */
import { router } from 'expo-router';
import { View } from 'react-native';
import { openTab } from '../lib/actions';
import { useOnceOnFocus } from '../lib/useOnceOnFocus';
import { useSettings } from '../store/settings';
import { useTheme } from '../theme/useTheme';

export function LandOnToday({ testID }: { testID: string }) {
  const { c } = useTheme();
  useOnceOnFocus(() => {
    if (useSettings.getState().onboarded) openTab('/home');
    else router.replace('/');
  });
  return <View accessible={false} testID={testID} style={{ flex: 1, backgroundColor: c.bg }} />;
}
