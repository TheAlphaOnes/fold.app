/**
 * useStartupPermissions — once onboarding is done and the app is on screen,
 * asks for every permission Fold uses, one prompt after another, once.
 */

import { useEffect, useRef } from 'react';

import { useSettingsStore } from '@/hooks/use-settings';
import { useProgressionStore } from '@/hooks/use-progression';
import { requestStartupPermissions } from '@/services/permissions.service';

export function useStartupPermissions(appReady: boolean): void {
  const loading = useSettingsStore((state) => state.loading);
  const hasOnboarded = useSettingsStore((state) => state.settings.hasOnboarded);
  const asked = useSettingsStore((state) => state.settings.startupPermissionsAsked);
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
}
