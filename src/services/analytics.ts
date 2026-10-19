/**
 * Analytics — the one place Fold talks to PostHog.
 *
 * Every event is declared in `AnalyticsEvents` below, so names and
 * properties are typed at each call site and the whole catalogue reads in
 * one screen. The client is created here, outside React, so stores and
 * services (the journal, ink, reminders) can report too; the provider in
 * the root layout reuses this same instance.
 *
 * Privacy rules, enforced by what the catalogue allows:
 *   - Never the content of a memory: no text, no media, no place names,
 *     no story titles. Only shapes: counts, types, length buckets, times.
 *   - Never the user's name or date of birth; age only as a bracket.
 *   - The person is anonymous. Fold has no accounts and never identifies.
 */

import PostHog from 'posthog-react-native';
import type { MomentId } from '@/constants/progression';

const POSTHOG_KEY = 'phc_AKV5YBb3G838EHFrSUyauGYK6CZYZpNNFsdCdrssx9Uy';
const POSTHOG_HOST = 'https://us.i.posthog.com';

export const posthog = new PostHog(POSTHOG_KEY, {
  host: POSTHOG_HOST,
  // Application Installed / Updated / Opened / Backgrounded: retention and
  // session length come from these without any code of ours.
  captureAppLifecycleEvents: true,
  errorTracking: {
    autocapture: { uncaughtExceptions: true, unhandledRejections: true, console: false },
  },
  // Session replay stays off: it would record private memories on screen.
  enableSessionReplay: false,
});

// ---------------------------------------------------------------------------
// Event catalogue
// ---------------------------------------------------------------------------

/** Where a new memory came from. */
export type CaptureSource = 'compose' | 'camera' | 'voice_hold' | 'share_extension';

export type TextLengthBucket = '0' | '1-40' | '41-200' | '201-1000' | '1000+';

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

export interface MemoryShape {
  content_type: 'text' | 'media' | 'text_media';
  text_length: TextLengthBucket;
  media_count: number;
  photos: number;
  videos: number;
  voice_notes: number;
  songs: number;
  gifs: number;
  has_location: boolean;
  story_count: number;
  font_family: string;
  has_custom_color: boolean;
}

export interface AnalyticsEvents {
  // Onboarding funnel
  onboarding_started: Record<string, never>;
  onboarding_name_entered: Record<string, never>;
  onboarding_completed: { age_range: string | null };

  // Memories
  memory_created: MemoryShape & {
    source: CaptureSource;
    /** Opened from a moment reminder within the last few minutes. */
    via_reminder: boolean;
    reminder_nudge: string | null;
    backdated: boolean;
    moment: MomentId;
    hour_of_day: number;
    weekday: number;
    is_first_memory: boolean;
    is_first_today: boolean;
  };
  memory_edited: MemoryShape;
  memory_create_failed: { source: CaptureSource; error: string };
  memory_opened: { age_days: number };
  memory_deleted: { age_days: number };
  memory_restored: { from: 'single' | 'all' };
  all_memories_cleared: { count: number };
  memory_shared: { method: 'card' | 'raw_media' | 'raw_text' };
  audio_played: { surface: 'card' | 'canvas'; auto_play: boolean };

  // Progress
  ink_earned: { points: number; month_total: number; record: number; is_record_month: boolean; streak: number };
  streak_extended: { streak: number; is_best: boolean };

  // Stories
  story_created: { has_cover: boolean };
  story_deleted: Record<string, never>;
  story_memory_toggled: { added: boolean };

  // Reminders
  notification_permission: { status: NotificationPermission; prompted: boolean };
  startup_permissions: { notifications: boolean; camera: boolean; microphone: boolean; photos: boolean; location: boolean };
  reminder_opened: { moment: MomentId; nudge: string; tone: 'plain' | 'playful' };

  // Field guide
  guide_step_completed: { step: string; completed_count: number };
  guide_reset: Record<string, never>;

  // Settings & support
  setting_changed: { setting: string; value: string | number | boolean };
  feedback_submitted: { text: string; length: TextLengthBucket };
  test_notification_sent: { result: 'scheduled' | 'denied' | 'failed' };
  haptics_test_played: {
    haptics_enabled: boolean;
    /** Android only; null on iOS or builds without the native module. */
    has_vibrator: boolean | null;
    touch_feedback: boolean | null;
    power_save: boolean | null;
    ringer_mode: string | null;
    android_sdk: number | null;
    manufacturer: string | null;
  };
}

export type AnalyticsEvent = keyof AnalyticsEvents;

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/** Sends one event. Never throws: analytics must not break the app. */
export function track<E extends AnalyticsEvent>(event: E, properties: AnalyticsEvents[E]): void {
  try {
    posthog.capture(event, properties as Record<string, string | number | boolean | null>);
  } catch (error) {
    console.error(`Failed to track ${event}`, error);
  }
}

/** A screen view, named by route template ("/memory/[id]") so ids never split a screen. */
export function trackScreen(route: string): void {
  try {
    void posthog.screen(route);
  } catch (error) {
    console.error('Failed to track screen', error);
  }
}

/** Reports a handled error with where it happened. */
export function trackError(error: unknown, context: string): void {
  try {
    posthog.captureException(error, { context });
  } catch (trackingError) {
    console.error('Failed to track error', trackingError);
  }
}

export type PersonProperties = Record<string, string | number | boolean | null>;

/** Describes the anonymous person, for cohorts and retention breakdowns. */
export function setPersonProperties(properties: PersonProperties, once?: PersonProperties): void {
  try {
    // Feature flags are unused; skip their reload on every update.
    posthog.setPersonProperties(properties, once, false);
  } catch (error) {
    console.error('Failed to set person properties', error);
  }
}

/** Attached to every event from now on (device locale and the like). */
export function registerSuperProperties(properties: PersonProperties): void {
  void posthog.register(properties).catch((error) => console.error('Failed to register properties', error));
}

/** Undoes an opt-out an earlier build may have stored on the device. */
export function optInAnalytics(): void {
  void posthog.optIn();
}

// ---------------------------------------------------------------------------
// Reminder attribution
// ---------------------------------------------------------------------------

/** How long after tapping a reminder a saved memory still counts as its result. */
const REMINDER_ATTRIBUTION_MS = 10 * 60 * 1000;
let reminderTap: { nudge: string; at: number } | null = null;

/** Call when a reminder is tapped; the next memory saved soon after credits it. */
export function noteReminderTap(nudge: string): void {
  reminderTap = { nudge, at: Date.now() };
}

/** The reminder behind the memory being saved now, if any. Consumed once. */
export function takeReminderAttribution(): string | null {
  const tap = reminderTap;
  reminderTap = null;
  if (!tap || Date.now() - tap.at > REMINDER_ATTRIBUTION_MS) return null;
  return tap.nudge;
}

// ---------------------------------------------------------------------------
// Shaping helpers — turn content into anonymous shapes
// ---------------------------------------------------------------------------

export function textLengthBucket(length: number): TextLengthBucket {
  if (length === 0) return '0';
  if (length <= 40) return '1-40';
  if (length <= 200) return '41-200';
  if (length <= 1000) return '201-1000';
  return '1000+';
}

/** Whole days between a memory's creation and now. */
export function ageInDays(createdAt: number): number {
  return Math.max(0, Math.floor((Date.now() - createdAt) / 86_400_000));
}
