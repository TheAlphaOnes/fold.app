/**
 * useMomentReminders — turning the three daily nudges on and off, shared by
 * Settings and the one-time offer after the first stamp.
 */

import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';

import { useSettingsStore } from '@/hooks/use-settings';
import { useProgressionStore } from '@/hooks/use-progression';
import { requestReminderPermission } from '@/services/reminders.service';

export function useMomentReminders() {
  const enabled = useSettingsStore((state) => state.settings.momentReminders);
  const updateSetting = useSettingsStore((state) => state.updateSetting);

  /** Resolves whether reminders ended up in the requested state. */
  const setEnabled = useCallback(
    async (next: boolean): Promise<boolean> => {
      if (next && !(await requestReminderPermission())) {
        Alert.alert(
          'Notifications are off',
          'Allow notifications for Fold in Settings to get a nudge each morning, afternoon and evening.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => void Linking.openSettings() },
          ],
        );
        return false;
      }
      const saved = await updateSetting('momentReminders', next);
      // A refresh rebuilds the schedule from today's moments.
      if (saved) await useProgressionStore.getState().refresh();
      return saved;
    },
    [updateSetting],
  );

  return { enabled, setEnabled };
}
