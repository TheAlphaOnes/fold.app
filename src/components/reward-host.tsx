/**
 * RewardHost — plays queued stamps, one at a time, on the home screen.
 * After the very first stamp it offers moment reminders, once.
 *
 * Rewards earned elsewhere (compose, the field guide) wait until home is in
 * view and the save's own card animation has had its turn, so the two never
 * compete. Also keeps progression current across a day change (returning
 * after midnight opens a fresh day) and routes reminder taps to the camera.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';

import { RewardStamp } from '@/components/reward-stamp';
import { useProgressionStore } from '@/hooks/use-progression';
import { useJournalStore } from '@/hooks/use-journal';
import { useSettingsStore } from '@/hooks/use-settings';
import { useMomentReminderTaps } from '@/hooks/use-capture-request';
import { useMomentReminders } from '@/hooks/use-moment-reminders';

/** Lets the new memory's card scroll in and burst before the stamp lands. */
const SETTLE_MS = 1100;

function useProgressionSync() {
  const refresh = useProgressionStore((state) => state.refresh);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);
}

/** Offers reminders the first time a stamp is dismissed, if they are off. */
function useReminderOffer() {
  const { enabled, setEnabled } = useMomentReminders();
  const offered = useSettingsStore((state) => state.settings.reminderOffered);
  const updateSetting = useSettingsStore((state) => state.updateSetting);

  return useCallback(() => {
    if (enabled || offered) return;
    void updateSetting('reminderOffered', true);
    Alert.alert(
      'A nudge, three times a day?',
      "Fold can remind you each morning, afternoon and evening to snap what you're doing. Reminders stay on your phone.",
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Remind me', onPress: () => void setEnabled(true) },
      ],
    );
  }, [enabled, offered, setEnabled, updateSetting]);
}

export function RewardHost() {
  useProgressionSync();
  useMomentReminderTaps();
  const offerReminders = useReminderOffer();

  const reward = useProgressionStore((state) => state.rewards[0]);
  const dismissReward = useProgressionStore((state) => state.dismissReward);
  const appVisible = useJournalStore((state) => state.isAppVisible);
  const quietMode = useSettingsStore((state) => state.settings.quietMode);
  const pathname = usePathname();

  const ready = Boolean(reward) && appVisible && pathname === '/' && !quietMode;
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!ready) {
      setSettled(false);
      return;
    }
    const timer = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [ready, reward?.id]);

  if (!ready || !settled || !reward) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <RewardStamp
        key={reward.id}
        reward={reward}
        onDone={() => {
          dismissReward(reward.id);
          offerReminders();
        }}
      />
    </View>
  );
}
