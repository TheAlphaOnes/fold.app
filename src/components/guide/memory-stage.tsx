/**
 * MemoryStage — REVISIT chapter (open · share).
 *
 * Renders the user's own newest memory through the same CarouselItem the home
 * feed uses, so the double tap and the hold-to-print are the real gestures
 * with the real outcomes. "Open" counts once the user returns from the
 * memory; "share" counts once the share sheet closes.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from 'expo-router';
import { useSharedValue } from 'react-native-reanimated';

import { CarouselItem } from '@/components/carousel-item';
import { GestureHint } from '@/components/guide/gesture-hint';
import { GuideEmptyNote } from '@/components/guide/guide-empty-note';
import { useFullCardSize } from '@/components/guide/fitted-memory-card';
import type { GuideStageProps, LatestMemory } from '@/components/guide/types';
import { useJournalStore } from '@/hooks/use-journal';

const STAGE_PADDING = 16;

interface MemoryStageProps extends GuideStageProps {
  latest: LatestMemory;
}

export function MemoryStage({ step, status, area, latest, onSuccess, onGoToStep }: MemoryStageProps) {
  const full = useFullCardSize();
  const updatePositions = useJournalStore((state) => state.updatePositions);
  // CarouselItem scales with feed scroll; a single resting card sits at offset 0.
  const restingScroll = useSharedValue(0);
  const isActive = status === 'active';

  const pendingOpen = useRef(false);

  const handleOpen = useCallback(() => {
    if (step.id === 'open' && isActive) pendingOpen.current = true;
  }, [step.id, isActive]);

  const handleShared = useCallback(() => {
    if (step.id === 'share' && isActive) onSuccess();
  }, [step.id, isActive, onSuccess]);

  // The success beat plays when the user comes back from the opened memory.
  // A navigation 'focus' listener fires only on a real return, unlike
  // useFocusEffect, which also re-runs whenever its callback changes.
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);
  const navigation = useNavigation();
  useEffect(() => {
    return navigation.addListener('focus', () => {
      if (!pendingOpen.current) return;
      pendingOpen.current = false;
      onSuccessRef.current();
    });
  }, [navigation]);

  if (!latest.loaded) return null;

  if (!latest.memory) {
    return (
      <GuideEmptyNote
        message={'nothing to open yet.\nmake a memory first.'}
        actionLabel="WRITE ONE NOW"
        onAction={() => onGoToStep('write')}
      />
    );
  }

  const cardHeight = Math.max(240, Math.min(full.height, area.height - STAGE_PADDING * 2));

  return (
    <View style={styles.container}>
      <View style={{ height: cardHeight, width: '100%' }}>
        <CarouselItem
          item={latest.memory}
          itemOffset={0}
          snapInterval={cardHeight}
          cardHeight={cardHeight}
          scrollY={restingScroll}
          updatePositions={updatePositions}
          onOpen={handleOpen}
          onShared={handleShared}
        />
        <GestureHint gesture={step.gesture} visible={isActive} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
});
