/**
 * TodayStage — today's page, inside the guide: the real camera card, live.
 * A shot (or set of shots) opens in the composer; the card marks the step
 * done when it hands them over.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useIsFocused } from 'expo-router';

import type { GuideStageProps } from '@/components/guide/types';
import { TodayCard } from '@/components/home/today-card';
import { useQuickCapture } from '@/hooks/use-quick-capture';
import { useSettingsStore } from '@/hooks/use-settings';

export function TodayStage({ status, area, onSuccess }: GuideStageProps) {
  const focused = useIsFocused();
  const { captureVideo } = useQuickCapture();
  const done = useSettingsStore((s) => s.settings.guideProgress.today);
  useEffect(() => {
    if (done && status === 'active') onSuccess();
  }, [done, status, onSuccess]);

  const width = Math.min(area.width - 48, 360);
  const height = Math.min(area.height - 24, width * 1.45);
  return (
    <View style={styles.root}>
      <TodayCard width={width} height={height} active={focused && status === 'active'} onRecordVideo={captureVideo} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
