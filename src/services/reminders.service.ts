/**
 * Moment reminders — one local notification in each moment of the day,
 * asking for a photo of what you're doing. Always on once the system
 * allows notifications; nothing leaves the phone.
 *
 * The schedule is rebuilt from scratch whenever progression refreshes (a
 * save, a delete, the app returning to the foreground), so it skips
 * moments already captured today. Each reminder lands at a different
 * minute every day inside its moment's window, with wording that rotates,
 * so it never feels like an alarm. Seven days ahead is 21 notifications,
 * well under iOS's 64 pending.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { FoldAlarms } from '../../modules/fold-alarms';
import { MOMENTS, type Moment, type MomentId, type Nudge } from '@/constants/progression';
import { addDays, toDayKey } from '@/utils/format-date';
import { track, trackError, type NotificationPermission } from '@/services/analytics';

/**
 * Android channel settings are fixed once the channel exists, so a change
 * needs a new id. v2 raised importance to HIGH (banner + sound) and added
 * vibration; the old channel is deleted so it leaves the phone's settings.
 */
const CHANNEL_ID = 'moments-v2';
const RETIRED_CHANNEL_IDS = ['moments'];
const VIBRATION_PATTERN = [0, 250, 150, 250];
const ID_PREFIX = 'moment-';
const DAYS_AHEAD = 7;

export interface MomentNotificationData {
  kind: 'moment';
  moment: MomentId;
  /** The wording sent, so a tap can be credited to it. */
  nudge: string;
  tone: Nudge['tone'];
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
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    enableVibrate: true,
    vibrationPattern: VIBRATION_PATTERN,
    lightColor: '#FF4B00',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
  await Promise.all(RETIRED_CHANNEL_IDS.map((id) => Notifications.deleteNotificationChannelAsync(id)));
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
    const granted = isGranted(await Notifications.requestPermissionsAsync());
    track('notification_permission', { status: granted ? 'granted' : 'denied', prompted: true });
    return granted;
  } catch (error) {
    trackError(error, 'notification_permission');
    console.error('Failed to request notification permission', error);
    return false;
  }
}

/** The current permission, without asking. For analytics. */
export async function getNotificationPermission(): Promise<NotificationPermission> {
  const current = await Notifications.getPermissionsAsync();
  if (isGranted(current)) return 'granted';
  return current.canAskAgain ? 'undetermined' : 'denied';
}

/**
 * Whether reminders will land on their minute. On Android 12+ that needs
 * exact alarms; without them the system may hold a reminder for hours or
 * drop it, so a day can pass with fewer than three. Always true on iOS.
 */
export function remindersFireOnTime(): boolean {
  return FoldAlarms?.canScheduleExactAlarms() ?? true;
}

/** Opens Android's "Alarms & reminders" page for Fold. False when there is none. */
export function openReminderTimingSettings(): boolean {
  return FoldAlarms?.openExactAlarmSettings() ?? false;
}

/** A stable pseudo-random number for a seed, so a rebuilt schedule keeps the same picks. */
function hashOf(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (Math.imul(hash, 31) + seed.charCodeAt(i)) >>> 0;
  // Consecutive dates differ by one character, which barely moves the sum
  // above; this finaliser (MurmurHash3's fmix32) spreads that across all bits
  // so neighbouring days land far apart.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

/** This day's minute for the moment, inside its nudge window. */
function nudgeTime(day: Date, moment: Moment): Date {
  const span = (moment.nudgeToHour - moment.nudgeFromHour) * 60;
  const minute = moment.nudgeFromHour * 60 + (hashOf(`${toDayKey(day)}:${moment.id}:time`) % span);
  const at = new Date(day);
  at.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
  return at;
}

/** This day's wording for the moment. */
function nudgeFor(day: Date, moment: Moment): Nudge {
  return moment.nudges[hashOf(`${toDayKey(day)}:${moment.id}:copy`) % moment.nudges.length];
}

function contentFor(moment: Moment, nudge: Nudge): Notifications.NotificationContentInput {
  const data: MomentNotificationData = { kind: 'moment', moment: moment.id, nudge: nudge.title, tone: nudge.tone };
  return {
    title: nudge.title,
    body: nudge.body,
    sound: 'default',
    vibrate: VIBRATION_PATTERN,
    priority: Notifications.AndroidNotificationPriority.HIGH,
    data: { ...data },
  };
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
      await Notifications.scheduleNotificationAsync({
        identifier: `${ID_PREFIX}${toDayKey(day)}-${moment.id}`,
        content: contentFor(moment, nudgeFor(day, moment)),
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_ID },
      });
    }
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
