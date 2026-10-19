/**
 * RewardHost — plays queued reward moments, one at a time, on the home screen.
 *
 * Rewards earned elsewhere (compose, the field guide) wait until home is in
 * view and the save's own card animation has had its turn, so the two never
 * compete. Also keeps progression current across a day change: returning to
 * the app after midnight resets today's count.
 */

import React, { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';

import { RewardStamp } from '@/components/reward-stamp';
import { useProgressionStore } from '@/hooks/use-progression';
import { useJournalStore } from '@/hooks/use-journal';
import { useSettingsStore } from '@/hooks/use-settings';

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

export function RewardHost() {
  useProgressionSync();

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
      <RewardStamp key={reward.id} reward={reward} onDone={() => dismissReward(reward.id)} />
    </View>
  );
}
