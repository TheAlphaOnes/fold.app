/**
 * useDeviceTests — the Settings checks for notifications and haptics. Each
 * returns a short status line the row shows under its title.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';

import { useSettingsStore } from '@/hooks/use-settings';
import { HAPTIC_TEST_STEPS, describeHapticsBlocker, diagnoseHaptics, playHapticTest } from '@/services/haptics';
import { sendTestNotification } from '@/services/reminders.service';
import { track } from '@/services/analytics';

const NOTIFICATION_DELAY_S = 5;

export function useDeviceTests() {
  const hapticsEnabled = useSettingsStore((state) => state.settings.hapticsEnabled);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);
  const [hapticStatus, setHapticStatus] = useState<string | null>(null);
  const cancelHaptics = useRef<(() => void) | null>(null);

  useEffect(() => () => cancelHaptics.current?.(), []);

  const testNotification = useCallback(async () => {
    setNotificationStatus('sending…');
    const result = await sendTestNotification(NOTIFICATION_DELAY_S);
    track('test_notification_sent', { result });
    if (result === 'scheduled') {
      setNotificationStatus(`arrives in ${NOTIFICATION_DELAY_S}s — lock the phone to see it`);
    } else if (result === 'denied') {
      setNotificationStatus('notifications are off for Fold — opening Settings');
      void Linking.openSettings();
    } else {
      setNotificationStatus('could not send — try again');
    }
  }, []);

  const testHaptics = useCallback(() => {
    cancelHaptics.current?.();
    cancelHaptics.current = playHapticTest();
    const diagnosis = diagnoseHaptics();
    track('haptics_test_played', {
      haptics_enabled: hapticsEnabled,
      has_vibrator: diagnosis?.hasVibrator ?? null,
      touch_feedback: diagnosis?.touchFeedbackEnabled ?? null,
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

  return { notificationStatus, hapticStatus, testNotification, testHaptics };
}
