/**
 * Daily study reminder — a LOCAL notification scheduled on the phone.
 * No server, no push tokens, no personal data leaves the device.
 *
 * WHY THE LIBRARY IS LOADED LAZILY: inside Expo Go on Android, merely
 * importing `expo-notifications` throws ("push notifications were removed
 * from Expo Go"), because a part of the library runs as soon as it loads.
 * A top-level import therefore crashed the whole app on launch. So the
 * library is only loaded where it is supported, and only when first needed.
 * In Expo Go on Android, reminders are simply unavailable; in a real build
 * (EAS / development build) they work normally.
 */
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

/** False only in Expo Go on Android, where the library cannot load. */
export const remindersSupported = !(isRunningInExpoGo() && Platform.OS === 'android');

let cached: NotificationsModule | null = null;
function notifications(): NotificationsModule | null {
  if (!remindersSupported) return null;
  // Lazy require on purpose: a top-level import crashes Expo Go on Android.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  if (!cached) cached = require('expo-notifications') as NotificationsModule;
  return cached;
}

/** Called once at startup: show reminders even while the app is open. */
export function initNotifications() {
  notifications()?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** The Android channel our reminders post to (Settings → Notifications shows its name). */
export const REMINDER_CHANNEL_ID = 'reminders';

/**
 * Android only: make sure the "Study reminders" channel exists.
 * Android 8+ files every notification under a channel the user can mute
 * on its own, and Android 13+ only shows the permission prompt once a
 * channel exists. So we create it BEFORE asking and before scheduling.
 * Safe to call repeatedly: Android keeps the existing channel.
 */
async function ensureAndroidChannel(N: NotificationsModule) {
  if (Platform.OS !== 'android') return;
  await N.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Study reminders',
    importance: N.AndroidImportance.DEFAULT,
  });
}

/** Ask permission (iOS shows a system prompt once). Returns true if allowed. */
export async function ensurePermission(): Promise<boolean> {
  const N = notifications();
  if (!N) return false;
  await ensureAndroidChannel(N);
  const current = await N.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await N.requestPermissionsAsync();
  return asked.granted;
}

/** Replace any existing reminder with one at hour:minute every day. */
export async function scheduleDailyReminder(hour: number, minute: number, certName: string) {
  const N = notifications();
  if (!N) return;
  await ensureAndroidChannel(N);
  await N.cancelAllScheduledNotificationsAsync();
  await N.scheduleNotificationAsync({
    content: {
      title: 'Time for a quick session',
      body: `10 ${certName} questions keep your streak alive. You've got this.`,
    },
    // channelId is ignored on iOS; on Android it files the reminder under "Study reminders".
    trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: REMINDER_CHANNEL_ID },
  });
}

export async function cancelReminders() {
  await notifications()?.cancelAllScheduledNotificationsAsync();
}
