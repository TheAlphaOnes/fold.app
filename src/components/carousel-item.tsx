import React, { memo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { router, useIsFocused } from 'expo-router';
import { haptic } from '@/services/haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, interpolate, Extrapolation, type SharedValue } from 'react-native-reanimated';

import { useMemoryActions } from '@/hooks/use-memory-actions';
import { useSettingsStore } from '@/hooks/use-settings';
import { MemoryCanvasCard } from '@/components/memory-canvas-card';
import { useJournalStore } from '@/hooks/use-journal';
import type { Composition } from '@/types/journal';

export interface CarouselItemProps {
  item: Composition;
  snapInterval: number;
  cardHeight: number;
  itemOffset: number;
  scrollY: SharedValue<number>;
  /** Fired when a double tap opens the memory. */
  onOpen?: () => void;
  /** Fired after the card is shared from the hold menu. */
  onShared?: () => void;
}

export const CarouselItem = memo(function CarouselItem({ item, itemOffset, snapInterval, cardHeight, scrollY, onOpen, onShared }: CarouselItemProps) {
  const pressedScale = useSharedValue(1);
  const { width } = useWindowDimensions();
  // The card in focus plays its video and may auto-play its song, and only
  // while its screen is in front (not under an open memory or compose).
  const isActive = useJournalStore((s) => s.activeCompositionId === item.id);
  const isFocused = useIsFocused();
  const live = isActive && isFocused;
  const completeGuideStep = useSettingsStore((s) => s.completeGuideStep);
  
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      itemOffset - (snapInterval * 2),
      itemOffset - snapInterval,
      itemOffset,
      itemOffset + snapInterval,
      itemOffset + (snapInterval * 2),
    ];

    const scrollScale = interpolate(
      scrollY.value,
      inputRange,
      [0.92, 0.95, 1, 0.95, 0.92],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale: scrollScale * pressedScale.value }],
    };
  });

  const navigateToDetail = () => {
    completeGuideStep('inspect');
    onOpen?.();
    router.push(`/memory/${item.id}`);
  };

  const openMenu = () => {
    haptic.thud();
    useMemoryActions.getState().open(item, { cardHeight, onShared });
  };

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      pressedScale.value = withTiming(0.96, { duration: 150 });
      runOnJS(haptic.tap)();
    })
    .onEnd(() => {
      pressedScale.value = withTiming(1, { duration: 150 });
      runOnJS(haptic.press)();
      runOnJS(navigateToDetail)();
    })
    .onFinalize(() => {
      pressedScale.value = withTiming(1, { duration: 150 });
    });

  const longPress = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      pressedScale.value = withTiming(0.96, { duration: 150 });
      runOnJS(openMenu)();
    })
    .onEnd(() => {
      pressedScale.value = withTiming(1, { duration: 150 });
    })
    .onFinalize(() => {
      pressedScale.value = withTiming(1, { duration: 150 });
    });

  const composed = Gesture.Exclusive(doubleTap, longPress);

  return (
    <View style={[styles.carouselItem, { height: snapInterval }]}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[animatedStyle, { width: '100%' }]}>
          <MemoryCanvasCard item={item} width={width - 42} height={cardHeight} live={live} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

const styles = StyleSheet.create({
  carouselItem: {
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: 21,
  },
});
