/**
 * Haptics — the one place the app produces touch feedback.
 *
 * Call sites name the *moment* (tap, select, press, thud, toggle, success,
 * warning, error); this module decides how each platform should feel it.
 *
 * Android goes through Fold's own native module (modules/fold-haptics).
 * React Native's Vibration and expo-haptics vibrate without a usage, which
 * Android 13+ files under "media vibration" — off on many phones — so
 * nothing was felt. The module labels every effect as touch feedback and
 * uses the system's tuned click effects. Builds made before the module
 * existed fall back to plain vibration pulses.
 * iOS keeps the Taptic Engine through expo-haptics.
 *
 * Respects the in-app Haptics setting. Never throws.
 */

import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

import { FoldHaptics, type FoldHapticKind, type HapticsDiagnosis } from '../../modules/fold-haptics';
import { useSettingsStore } from '@/hooks/use-settings';

const isAndroid = Platform.OS === 'android';
const isIOS = Platform.OS === 'ios';

function enabled(): boolean {
  if (!isAndroid && !isIOS) return false;
  return useSettingsStore.getState().settings.hapticsEnabled;
}

/**
 * One Android effect. `fallback` is [wait, buzz, wait, buzz, ...] in ms,
 * only used when the native module is missing (an older build).
 */
function android(kind: FoldHapticKind, fallback: number[]): void {
  try {
    if (FoldHaptics) FoldHaptics.play(kind);
    else Vibration.vibrate(fallback);
  } catch (error) {
    console.error(`Failed to play haptic "${kind}"`, error);
  }
}

function swallow(promise: Promise<void>): void {
  promise.catch(() => {});
}

export const haptic = {
  /** A light UI tap: chips, icon buttons, navigation. */
  tap(): void {
    if (!enabled()) return;
    if (isAndroid) android('tap', [0, 12]);
    else swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },

  /** A selection moving: list ticks, segment changes, scrubbing past items. */
  select(): void {
    if (!enabled()) return;
    if (isAndroid) android('select', [0, 10]);
    else swallow(Haptics.selectionAsync());
  },

  /** A deliberate primary press: save, open, confirm a choice. */
  press(): void {
    if (!enabled()) return;
    if (isAndroid) android('press', [0, 20]);
    else swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },

  /** A heavy, physical moment: lifting an item, starting a hold, sharing. */
  thud(): void {
    if (!enabled()) return;
    if (isAndroid) android('thud', [0, 35]);
    else swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
  },

  /** A switch flipping on or off. */
  toggle(on: boolean): void {
    if (!enabled()) return;
    if (isAndroid) android(on ? 'toggleOn' : 'toggleOff', on ? [0, 18] : [0, 12]);
    else swallow(Haptics.impactAsync(on ? Haptics.ImpactFeedbackStyle.Rigid : Haptics.ImpactFeedbackStyle.Soft));
  },

  /** Something worked: a memory saved, a step completed. */
  success(): void {
    if (!enabled()) return;
    if (isAndroid) android('success', [0, 14, 70, 26]);
    else swallow(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },

  /** A gentle correction: wrong gesture, missing permission. */
  warning(): void {
    if (!enabled()) return;
    if (isAndroid) android('warning', [0, 22, 90, 22]);
    else swallow(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },

  /** A failure the user must notice. */
  error(): void {
    if (!enabled()) return;
    if (isAndroid) android('error', [0, 30, 60, 30, 60, 30]);
    else swallow(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
} as const;

/** The steps of the Settings haptics test, in the order they play. */
export const HAPTIC_TEST_STEPS = ['long buzz', 'tap', 'press', 'thud', 'success'] as const;
const HAPTIC_TEST_GAP_MS = 700;

/**
 * Plays a long buzz, then the app's own patterns one by one, for checking
 * feedback on a device. The long buzz ignores the in-app Haptics switch.
 * Returns a cancel function.
 */
export function playHapticTest(): () => void {
  const steps: (() => void)[] = [
    () =>
      isAndroid
        ? android('test', [0, 400])
        : swallow(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
    haptic.tap,
    haptic.press,
    haptic.thud,
    haptic.success,
  ];
  const timers = steps.map((step, i) => setTimeout(step, i * HAPTIC_TEST_GAP_MS));
  return () => timers.forEach(clearTimeout);
}

/** Android phone state that blocks or allows vibration; null elsewhere or on older builds. */
export function diagnoseHaptics(): HapticsDiagnosis | null {
  try {
    return FoldHaptics?.diagnose() ?? null;
  } catch (error) {
    console.error('Failed to diagnose haptics', error);
    return null;
  }
}

/** The most likely reason vibration is not felt, in plain words; null when nothing blocks it. */
export function describeHapticsBlocker(diagnosis: HapticsDiagnosis): string | null {
  if (!diagnosis.hasVibrator) return 'this phone reports no vibration motor';
  if (diagnosis.powerSaveMode) return 'Battery Saver is on — it blocks vibration';
  if (!diagnosis.touchFeedbackEnabled) return 'Touch feedback is off in your phone’s Sound & vibration settings';
  return null;
}
