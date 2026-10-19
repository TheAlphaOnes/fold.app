/**
 * Haptics — the one place the app produces touch feedback.
 *
 * Call sites name the *moment* (tap, select, press, thud, toggle, success,
 * warning, error); this module decides how each platform should feel it.
 *
 * Android uses direct vibration pulses at the motor's full default strength.
 * expo-haptics' impact/selection drive it at amplitude 30–70 of 255 (barely
 * perceptible), and the system click effects (performHapticFeedback) are
 * skipped silently when the phone's touch-feedback setting is off or by
 * some OEMs — so nothing was felt. Pulses are kept at 10ms or longer, since
 * many motors do not fire shorter ones. They still respect the phone's
 * vibration settings and the in-app Haptics switch.
 * iOS keeps the Taptic Engine through expo-haptics.
 *
 * Respects the in-app Haptics setting. Never throws.
 */

import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useSettingsStore } from '@/hooks/use-settings';

const isAndroid = Platform.OS === 'android';
const isIOS = Platform.OS === 'ios';

function enabled(): boolean {
  if (!isAndroid && !isIOS) return false;
  return useSettingsStore.getState().settings.hapticsEnabled;
}

/** Pattern: [wait, buzz, wait, buzz, ...] in ms, at the motor's default (full) strength. */
function androidPulse(pattern: number[]): void {
  Vibration.vibrate(pattern);
}

function swallow(promise: Promise<void>): void {
  promise.catch(() => {});
}

export const haptic = {
  /** A light UI tap: chips, icon buttons, navigation. */
  tap(): void {
    if (!enabled()) return;
    if (isAndroid) androidPulse([0, 12]);
    else swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },

  /** A selection moving: list ticks, segment changes, scrubbing past items. */
  select(): void {
    if (!enabled()) return;
    if (isAndroid) androidPulse([0, 10]);
    else swallow(Haptics.selectionAsync());
  },

  /** A deliberate primary press: save, open, confirm a choice. */
  press(): void {
    if (!enabled()) return;
    if (isAndroid) androidPulse([0, 20]);
    else swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },

  /** A heavy, physical moment: lifting an item, starting a hold, sharing. */
  thud(): void {
    if (!enabled()) return;
    if (isAndroid) androidPulse([0, 35]);
    else swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
  },

  /** A switch flipping on or off. */
  toggle(on: boolean): void {
    if (!enabled()) return;
    if (isAndroid) {
      // On: a firm click; off: a lighter one.
      androidPulse(on ? [0, 18] : [0, 12]);
    } else {
      swallow(Haptics.impactAsync(on ? Haptics.ImpactFeedbackStyle.Rigid : Haptics.ImpactFeedbackStyle.Soft));
    }
  },

  /** Something worked: a memory saved, a step completed. */
  success(): void {
    if (!enabled()) return;
    if (isAndroid) androidPulse([0, 14, 70, 26]);
    else swallow(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },

  /** A gentle correction: wrong gesture, missing permission. */
  warning(): void {
    if (!enabled()) return;
    if (isAndroid) androidPulse([0, 22, 90, 22]);
    else swallow(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },

  /** A failure the user must notice. */
  error(): void {
    if (!enabled()) return;
    if (isAndroid) androidPulse([0, 30, 60, 30, 60, 30]);
    else swallow(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
} as const;

/** The steps of the Settings haptics test, in the order they play. */
export const HAPTIC_TEST_STEPS = ['long buzz', 'tap', 'press', 'thud', 'success'] as const;
const HAPTIC_TEST_GAP_MS = 700;

/**
 * Plays a long buzz, then the app's own patterns one by one, for checking
 * feedback on a device. The long buzz ignores the in-app Haptics switch: if
 * it is felt but the rest are not, the motor works and the short pulses are
 * the problem; if nothing is felt, the phone's vibration settings (or Do
 * Not Disturb) are blocking it. Returns a cancel function.
 */
export function playHapticTest(): () => void {
  const steps: (() => void)[] = [
    () => (isAndroid ? Vibration.vibrate(400) : swallow(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))),
    haptic.tap,
    haptic.press,
    haptic.thud,
    haptic.success,
  ];
  const timers = steps.map((step, i) => setTimeout(step, i * HAPTIC_TEST_GAP_MS));
  return () => timers.forEach(clearTimeout);
}
