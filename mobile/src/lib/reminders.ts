/**
 * Daily study reminder — a LOCAL notification scheduled on the phone.
 * No server, no push tokens, no personal data leaves the device.
 */
import * as Notifications from 'expo-notifications';

/** Ask permission (iOS shows a system prompt once). Returns true if allowed. */
export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Replace any existing reminder with one at hour:minute every day. */
export async function scheduleDailyReminder(hour: number, minute: number, certName: string) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time for a quick session',
      body: `10 ${certName} questions keep your streak alive. You've got this.`,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
}

export async function cancelReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
