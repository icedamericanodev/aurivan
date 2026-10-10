/**
 * Study reminders — LOCAL notifications scheduled on the phone, at the
 * learner's time and days (the rules live in engine/reminders.ts).
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
import { isStudyReminder, reminderCopy, reminderPlan, type ReminderPrefs } from '../engine/reminders';

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

/**
 * One change at a time. Every schedule/cancel joins this queue, so two
 * quick taps (or a tap and the off switch) can't interleave their
 * list → cancel → schedule steps. Without it both calls could list the same
 * old reminders and BOTH schedule, leaving two reminders on one day, or a
 * reminder left behind after turning reminders off. The last call wins.
 */
let queue: Promise<unknown> = Promise.resolve();
function oneAtATime<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  // Keep the queue going even if a step failed.
  queue = run.catch(() => undefined);
  return run;
}

/**
 * Cancel OUR study reminders only: the ids in engine/reminders.ts, plus the
 * first version's reminder (scheduled without an id; recognised by its
 * title). Never "cancel everything": other notifications are left alone.
 */
async function cancelOurs(N: NotificationsModule) {
  const scheduled = await N.getAllScheduledNotificationsAsync();
  for (const req of scheduled) {
    if (isStudyReminder(req)) await N.cancelScheduledNotificationAsync(req.identifier);
  }
}

/**
 * Replace our reminders with the learner's choice: at most one a day, at
 * their time, on their days (engine/reminders.ts reminderPlan). Does NOT ask
 * for permission: Settings asks only when the learner turns reminders on.
 */
export async function scheduleReminders(prefs: ReminderPrefs, certName: string) {
  const N = notifications();
  if (!N) return;
  return oneAtATime(() => replaceOurs(N, prefs, certName));
}

async function replaceOurs(N: NotificationsModule, prefs: ReminderPrefs, certName: string) {
  await ensureAndroidChannel(N);
  await cancelOurs(N);
  const content = reminderCopy(certName);
  for (const r of reminderPlan(prefs)) {
    await N.scheduleNotificationAsync({
      identifier: r.id,
      content,
      // channelId is ignored on iOS; on Android it files the reminder under "Study reminders".
      trigger:
        r.kind === 'daily'
          ? { type: N.SchedulableTriggerInputTypes.DAILY, hour: r.hour, minute: r.minute, channelId: REMINDER_CHANNEL_ID }
          : { type: N.SchedulableTriggerInputTypes.WEEKLY, weekday: r.weekday, hour: r.hour, minute: r.minute, channelId: REMINDER_CHANNEL_ID },
    });
  }
}

/** Turn study reminders off (ours only). */
export async function cancelReminders() {
  const N = notifications();
  if (N) await oneAtATime(() => cancelOurs(N));
}
