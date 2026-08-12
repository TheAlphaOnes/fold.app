/**
 * Fold — useHaptics hook
 *
 * Wraps expo-haptics with a clean, typed API.
 * Every sound has a visual equivalent — haptics enhance, never communicate alone.
 */

import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Platform } from 'react-native';

type HapticStyle = 'light' | 'medium' | 'heavy' | 'soft' | 'rigid';

const STYLE_MAP: Record<HapticStyle, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
  soft: Haptics.ImpactFeedbackStyle.Soft,
  rigid: Haptics.ImpactFeedbackStyle.Rigid,
};

export type UseHapticsReturn = {
  /** Subtle tap — selection changes, page swipes */
  selection: () => void;
  /** Impact feedback — button presses, toggles */
  impact: (style?: HapticStyle) => void;
  /** Success notification — entry saved */
  success: () => void;
  /** Warning notification — validation issues */
  warning: () => void;
  /** Error notification — failures */
  error: () => void;
};

export function useHaptics(): UseHapticsReturn {
  const selection = useCallback(() => {
    if (Platform.OS === 'web') return;
    Haptics.selectionAsync().catch(() => {});
  }, []);

  const impact = useCallback((style: HapticStyle = 'light') => {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(STYLE_MAP[style]).catch(() => {});
  }, []);

  const success = useCallback(() => {
    if (Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  const warning = useCallback(() => {
    if (Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }, []);

  const error = useCallback(() => {
    if (Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  }, []);

  return { selection, impact, success, warning, error };
}
