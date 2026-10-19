/**
 * useDeviceTests — the Settings haptics check. Returns a short status line
 * the row shows under its title.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useSettingsStore } from '@/hooks/use-settings';
import { HAPTIC_TEST_STEPS, describeHapticsBlocker, diagnoseHaptics, playHapticTest } from '@/services/haptics';
import { track } from '@/services/analytics';

export function useDeviceTests() {
  const hapticsEnabled = useSettingsStore((state) => state.settings.hapticsEnabled);
  const [hapticStatus, setHapticStatus] = useState<string | null>(null);
  const cancelHaptics = useRef<(() => void) | null>(null);

  useEffect(() => () => cancelHaptics.current?.(), []);

  const testHaptics = useCallback(() => {
    cancelHaptics.current?.();
    cancelHaptics.current = playHapticTest();
    const diagnosis = diagnoseHaptics();
    track('haptics_test_played', {
      haptics_enabled: hapticsEnabled,
      has_vibrator: diagnosis?.hasVibrator ?? null,
      touch_feedback: diagnosis?.touchFeedbackEnabled ?? null,
      predefined_clicks: diagnosis?.predefinedClicks ?? null,
      amplitude_control: diagnosis?.hasAmplitudeControl ?? null,
      power_save: diagnosis?.powerSaveMode ?? null,
      ringer_mode: diagnosis?.ringerMode ?? null,
      android_sdk: diagnosis?.sdk ?? null,
      manufacturer: diagnosis?.manufacturer ?? null,
    });
    // Name what the phone itself is blocking first; it outranks the in-app switch.
    const blocker = diagnosis ? describeHapticsBlocker(diagnosis) : null;
    setHapticStatus(
      blocker ??
        (hapticsEnabled ? HAPTIC_TEST_STEPS.join(' · ') : 'Haptics is off above — only the long buzz plays'),
    );
  }, [hapticsEnabled]);

  return { hapticStatus, testHaptics };
}
