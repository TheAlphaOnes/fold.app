import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { haptic } from '@/services/haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, interpolate, Extrapolation, type SharedValue } from 'react-native-reanimated';

import { useMemoryActions } from '@/hooks/use-memory-actions';
import { useSettingsStore } from '@/hooks/use-settings';
import { MemoryCard } from '@/components/memory-card';
import type { Composition, MediaElement } from '@/types/journal';

export interface CarouselItemProps {
  item: Composition;
  snapInterval: number;
  cardHeight: number;
  itemOffset: number;
  scrollY: SharedValue<number>;
  updatePositions: (id: number, media: MediaElement[]) => void;
  /** Fired when a double tap opens the memory. */
  onOpen?: () => void;
  /** Fired after the card is shared from the hold menu. */
  onShared?: () => void;
}

export const CarouselItem = memo(function CarouselItem({ item, itemOffset, snapInterval, cardHeight, scrollY, updatePositions, onOpen, onShared }: CarouselItemProps) {
  const pressedScale = useSharedValue(1);
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
          <MemoryCard item={item} height={cardHeight} onUpdatePositions={updatePositions} />
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
