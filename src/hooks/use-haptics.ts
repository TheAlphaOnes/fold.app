/**
 * Fold — useHaptics hook
 *
 * Thin hook over the haptics service for components that prefer a hook.
 * New code can import `haptic` from '@/services/haptics' directly.
 */

import { haptic } from '@/services/haptics';

export type HapticStyle = 'light' | 'medium' | 'heavy';

export type UseHapticsReturn = {
  /** Subtle tick — selection changes, page swipes */
  selection: () => void;
  /** Impact feedback — button presses, drops */
  impact: (style?: HapticStyle) => void;
  success: () => void;
  warning: () => void;
  error: () => void;
};

const impact = (style: HapticStyle = 'light') => {
  if (style === 'heavy') haptic.thud();
  else if (style === 'medium') haptic.press();
  else haptic.tap();
};

const API: UseHapticsReturn = {
  selection: haptic.select,
  impact,
  success: haptic.success,
  warning: haptic.warning,
  error: haptic.error,
};

export function useHaptics(): UseHapticsReturn {
  return API;
}
