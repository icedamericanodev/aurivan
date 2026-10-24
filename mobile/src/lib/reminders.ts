/**
 * Study reminders — LOCAL notifications scheduled on the phone, at the
 * learner's time and days (the rules live in engine/reminders.ts).
 * No server, no push tokens, no personal data leaves the device.
 *
 * Mobile 1.24: the next 7 reminders are scheduled as one-off notifications
 * and re-planned each time the app opens (lib/reminderSync.ts), so they stop
 * on their own after a week away instead of firing forever.
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
import { isStudyReminder, rollingCopy, rollingPlan, type ReminderPrefs, type WaitingReviews } from '../engine/reminders';

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

/** Optional facts for one scheduling pass. All have safe defaults, so older callers work unchanged. */
export interface ScheduleOptions {
  /** The moment to plan from (default: now). Tests pass a fixed one. */
  now?: number;
  /** Today's plan is already cleared: no reminder today. */
  skipToday?: boolean;
  /**
   * The learner's daily minutes. Mobile 1.41: no longer in the words (the
   * reminders offer the short path instead); kept so older callers still work.
   */
  minutes?: number;
  /**
   * Mobile 1.41: what is waiting in spaced review at a moment, so the next
   * reminder can name it ("The 2 you missed are back"). Unset = the plain words.
   */
  waitingFor?: (at: number) => WaitingReviews;
}

/**
 * Replace our reminders with the learner's choice: the next 7, at their time,
 * on their days (engine/reminders.ts rollingPlan). Does NOT ask for
 * permission: Settings asks only when the learner turns reminders on.
 */
export async function scheduleReminders(prefs: ReminderPrefs, certName: string, opts: ScheduleOptions = {}) {
  const N = notifications();
  if (!N) return;
  return oneAtATime(() => replaceOurs(N, prefs, certName, opts));
}

async function replaceOurs(N: NotificationsModule, prefs: ReminderPrefs, certName: string, opts: ScheduleOptions) {
  await ensureAndroidChannel(N);
  await cancelOurs(N);
  const plan = rollingPlan(prefs, opts.now ?? Date.now(), { skipToday: opts.skipToday });
  // Mobile 1.41: each reminder has its own words (engine/reminders.ts slotCopy). Same count, same ids.
  const words = rollingCopy(plan, certName, opts.waitingFor);
  for (const [i, r] of plan.entries()) {
    await N.scheduleNotificationAsync({
      identifier: r.id,
      content: words[i],
      // channelId is ignored on iOS; on Android it files the reminder under "Study reminders".
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(r.at), channelId: REMINDER_CHANNEL_ID },
    });
  }
}

/** Turn study reminders off (ours only). */
export async function cancelReminders() {
  const N = notifications();
  if (N) await oneAtATime(() => cancelOurs(N));
}
