/**
 * Moment reminders — one local notification in each moment of the day,
 * asking for a photo of what you're doing. Always on once the system
 * allows notifications; nothing leaves the phone.
 *
 * The schedule is rebuilt from scratch whenever progression refreshes (a
 * save, a delete, the app returning to the foreground), so it skips
 * moments already captured today. Each reminder lands at a different
 * minute every day, inside its moment's window, so it never feels like an
 * alarm. Seven days ahead is 21 notifications, well under iOS's 64 pending.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { MOMENTS, momentAt, type Moment, type MomentId } from '@/constants/progression';
import { addDays, toDayKey } from '@/utils/format-date';

const CHANNEL_ID = 'moments';
const ID_PREFIX = 'moment-';
const DAYS_AHEAD = 7;
const TITLE = 'Fold';

export interface MomentNotificationData {
  kind: 'moment';
  moment: MomentId;
}

export function isMomentNotification(data: unknown): data is MomentNotificationData {
  return typeof data === 'object' && data !== null && (data as { kind?: unknown }).kind === 'moment';
}

/** Shows reminders that arrive while the app is open. Call once at startup. */
export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Moments',
    description: 'A nudge each morning, afternoon and evening',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

function isGranted(permissions: Notifications.NotificationPermissionsStatus): boolean {
  return (
    permissions.granted ||
    permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

/**
 * Asks for notification permission if it has not been decided yet; the
 * system shows its prompt at most once. Resolves whether reminders can show.
 */
export async function requestReminderPermission(): Promise<boolean> {
  try {
    // Android 13+ only shows the prompt once a channel exists.
    await ensureChannel();
    const current = await Notifications.getPermissionsAsync();
    if (isGranted(current)) return true;
    if (!current.canAskAgain) return false;
    return isGranted(await Notifications.requestPermissionsAsync());
  } catch (error) {
    console.error('Failed to request notification permission', error);
    return false;
  }
}

/** A stable pseudo-random minute for this day and moment, inside its nudge window. */
function nudgeTime(day: Date, moment: Moment): Date {
  const seed = `${toDayKey(day)}:${moment.id}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const span = (moment.nudgeToHour - moment.nudgeFromHour) * 60;
  const minute = moment.nudgeFromHour * 60 + (hash % span);
  const at = new Date(day);
  at.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
  return at;
}

async function rebuild(capturedToday: ReadonlySet<MomentId>): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((request) => request.identifier.startsWith(ID_PREFIX))
      .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)),
  );
  if (!isGranted(await Notifications.getPermissionsAsync())) return;
  await ensureChannel();

  const now = Date.now();
  const today = new Date();
  for (let offset = 0; offset < DAYS_AHEAD; offset++) {
    const day = addDays(today, offset);
    for (const moment of MOMENTS) {
      if (offset === 0 && capturedToday.has(moment.id)) continue;
      const at = nudgeTime(day, moment);
      if (at.getTime() <= now) continue;
      const data: MomentNotificationData = { kind: 'moment', moment: moment.id };
      await Notifications.scheduleNotificationAsync({
        identifier: `${ID_PREFIX}${toDayKey(day)}-${moment.id}`,
        content: { title: TITLE, body: moment.nudge, sound: 'default', data: { ...data } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_ID },
      });
    }
  }
}

export type TestNotificationResult = 'scheduled' | 'denied' | 'failed';

/**
 * Sends a real moment reminder a few seconds from now, for checking that
 * notifications arrive (lock the phone or leave the app to see it as a
 * banner). Tapping it opens the camera, like the real ones.
 */
export async function sendTestNotification(delaySeconds = 5): Promise<TestNotificationResult> {
  try {
    if (!(await requestReminderPermission())) return 'denied';
    const moment = momentAt(new Date());
    const data: MomentNotificationData = { kind: 'moment', moment: moment.id };
    await Notifications.scheduleNotificationAsync({
      // Outside ID_PREFIX, so a schedule rebuild never cancels it.
      identifier: `test-${Date.now()}`,
      content: { title: TITLE, body: moment.nudge, sound: 'default', data: { ...data } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: delaySeconds,
        channelId: CHANNEL_ID,
      },
    });
    return 'scheduled';
  } catch (error) {
    console.error('Failed to send a test notification', error);
    return 'failed';
  }
}

let pending: Promise<void> = Promise.resolve();

/** Rebuilds the reminder schedule. Calls run one after another; never throws. */
export function syncMomentReminders(capturedToday: ReadonlySet<MomentId>): Promise<void> {
  pending = pending
    .then(() => rebuild(capturedToday))
    .catch((error) => console.error('Failed to schedule moment reminders', error));
  return pending;
}
