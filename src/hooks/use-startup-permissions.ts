/**
 * useStartupPermissions — once onboarding is done and the app is on screen,
 * asks for every permission Fold uses, one prompt after another, once.
 *
 * Then, on Android 12+, if reminders are allowed but exact alarms are not,
 * asks once to turn on "Alarms & reminders": without it Android may hold
 * reminders back for hours or drop them. This second ask also reaches
 * people who installed before it existed.
 */

import { useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { useSettingsStore } from '@/hooks/use-settings';
import { useProgressionStore } from '@/hooks/use-progression';
import { requestStartupPermissions } from '@/services/permissions.service';
import { openReminderTimingSettings, remindersFireOnTime } from '@/services/reminders.service';

export function useStartupPermissions(appReady: boolean): void {
  const loading = useSettingsStore((state) => state.loading);
  const hasOnboarded = useSettingsStore((state) => state.settings.hasOnboarded);
  const asked = useSettingsStore((state) => state.settings.startupPermissionsAsked);
  const exactAsked = useSettingsStore((state) => state.settings.exactRemindersAsked);
  const runningRef = useRef(false);

  useEffect(() => {
    if (!appReady || loading || !hasOnboarded || asked || runningRef.current) return;
    runningRef.current = true;

    void (async () => {
      const { updateSetting, settings } = useSettingsStore.getState();
      const result = await requestStartupPermissions();
      await updateSetting('startupPermissionsAsked', true);
      // Allowing location here is the user saying yes to tagging memories with it.
      if (result.locationNewlyGranted && !settings.autoLocationTagging) {
        await updateSetting('autoLocationTagging', true);
      }
      // Notifications may have just been allowed: schedule today's moments now.
      if (result.notifications) await useProgressionStore.getState().refresh();
    })();
  }, [appReady, loading, hasOnboarded, asked]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !appReady || loading || !asked || exactAsked) return;

    void (async () => {
      const { granted } = await Notifications.getPermissionsAsync();
      // Nothing to time if reminders are off, and nothing to ask if they're already exact.
      if (!granted || remindersFireOnTime()) return;
      await useSettingsStore.getState().updateSetting('exactRemindersAsked', true);
      Alert.alert(
        'Get reminders on time',
        'Turn on “Alarms & reminders” for Fold, so your three nudges arrive each day instead of being held back by Android.',
        [
          { text: 'Not now', style: 'cancel' },
          // Returning to the app refreshes progression, which reschedules
          // the reminders, now as exact alarms.
          { text: 'Turn on', onPress: () => openReminderTimingSettings() },
        ],
      );
    })();
  }, [appReady, loading, asked, exactAsked]);
}
