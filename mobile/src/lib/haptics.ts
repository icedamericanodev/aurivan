/**
 * Haptics that respect the learner's Settings toggle (on by default).
 * Every vibration in the app goes through here, never expo-haptics directly,
 * so switching it off in Settings silences all of them.
 * Moments (spec §10.6): select = selection, submit = success/error,
 * plan item done = light impact, daily clearing = success once a day.
 */
import * as Haptics from 'expo-haptics';
import { useSettings } from '../store/settings';

const enabled = () => useSettings.getState().haptics !== false;
const quiet = (p: Promise<void>) => p.catch(() => {}); // web / unsupported devices

export const haptic = {
  selection: () => enabled() && quiet(Haptics.selectionAsync()),
  success: () => enabled() && quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => enabled() && quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  light: () => enabled() && quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
};
