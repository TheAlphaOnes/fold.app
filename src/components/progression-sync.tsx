/**
 * ProgressionSync — renders nothing. Keeps progression current across a
 * day change (returning after midnight starts a fresh day and a fresh
 * reminder schedule) and turns a tapped moment reminder into the camera.
 */

import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useProgressionStore } from '@/hooks/use-progression';
import { useMomentReminderTaps } from '@/hooks/use-capture-request';

export function ProgressionSync() {
  const refresh = useProgressionStore((state) => state.refresh);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  useMomentReminderTaps();
  return null;
}
