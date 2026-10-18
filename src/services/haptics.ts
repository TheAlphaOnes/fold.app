/**
 * Haptics — the one place the app produces touch feedback.
 *
 * Call sites name the *moment* (tap, select, press, thud, toggle, success,
 * warning, error); this module decides how each platform should feel it.
 *
 * Why not expo-haptics' impact/selection on Android: they drive the motor
 * at amplitude 30–70 of 255, which most Android motors barely render, so the
 * app felt flat there. Instead:
 *   - everyday taps use Android's own tuned click effects
 *     (View.performHapticFeedback), the same ones the system UI uses, with
 *     fallbacks for constants older OS versions lack;
 *   - the big moments use short full-strength vibration pulses, so they are
 *     felt even on modest hardware.
 * iOS keeps the Taptic Engine through expo-haptics.
 *
 * Respects the in-app Haptics setting. Never throws.
 */

import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AndroidHaptics } from 'expo-haptics';

import { useSettingsStore } from '@/hooks/use-settings';

const isAndroid = Platform.OS === 'android';
const isIOS = Platform.OS === 'ios';

function enabled(): boolean {
  if (!isAndroid && !isIOS) return false;
  return useSettingsStore.getState().settings.hapticsEnabled;
}

/** Tries each Android system effect in order; ends in a short pulse if none exist. */
function androidEffect(effects: AndroidHaptics[], fallbackPulseMs: number): void {
  const attempt = (index: number) => {
    const effect = effects[index];
    if (!effect) {
      Vibration.vibrate(fallbackPulseMs);
      return;
    }
    Haptics.performAndroidHapticsAsync(effect).catch(() => attempt(index + 1));
  };
  attempt(0);
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
    if (isAndroid) androidEffect([AndroidHaptics.Virtual_Key, AndroidHaptics.Keyboard_Tap], 10);
    else swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },

  /** A selection moving: list ticks, segment changes, scrubbing past items. */
  select(): void {
    if (!enabled()) return;
    if (isAndroid) androidEffect([AndroidHaptics.Segment_Tick, AndroidHaptics.Clock_Tick], 6);
    else swallow(Haptics.selectionAsync());
  },

  /** A deliberate primary press: save, open, confirm a choice. */
  press(): void {
    if (!enabled()) return;
    if (isAndroid) androidEffect([AndroidHaptics.Context_Click, AndroidHaptics.Virtual_Key], 16);
    else swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },

  /** A heavy, physical moment: lifting an item, starting a hold, sharing. */
  thud(): void {
    if (!enabled()) return;
    if (isAndroid) androidPulse([0, 28]);
    else swallow(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
  },

  /** A switch flipping on or off. */
  toggle(on: boolean): void {
    if (!enabled()) return;
    if (isAndroid) {
      androidEffect(
        on ? [AndroidHaptics.Toggle_On, AndroidHaptics.Context_Click] : [AndroidHaptics.Toggle_Off, AndroidHaptics.Virtual_Key],
        12,
      );
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
