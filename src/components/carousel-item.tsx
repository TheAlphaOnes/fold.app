import React, { memo, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useIsFocused } from 'expo-router';
import { haptic } from '@/services/haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, interpolate, Extrapolation, type SharedValue } from 'react-native-reanimated';

import { useMemoryActions } from '@/hooks/use-memory-actions';
import { useSettingsStore } from '@/hooks/use-settings';
import { MemoryCanvasCard } from '@/components/memory-canvas-card';
import { useJournalStore } from '@/hooks/use-journal';
import type { Composition } from '@/types/journal';
import { isAnimatedTemplate } from '@/templates/arrangements';
import { navigate } from '@/utils/navigation';

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
    navigate.push(`/memory/${item.id}`);
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

  // A single tap plays with an animated template (next photo, spin, fan);
  // it waits out a double tap, which still opens the memory.
  const [nudge, setNudge] = useState(0);
  const animated = live && isAnimatedTemplate(item.layout?.template);
  const playWithCard = () => {
    haptic.select();
    setNudge((n) => n + 1);
  };
  const singleTap = Gesture.Tap()
    .enabled(animated)
    .maxDuration(250)
    .onEnd((_e, success) => {
      if (success) runOnJS(playWithCard)();
    });

  const composed = Gesture.Exclusive(doubleTap, longPress, singleTap);

  return (
    <View style={[styles.carouselItem, { height: snapInterval }]}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[animatedStyle, { width: '100%' }]}>
          <MemoryCanvasCard item={item} width={width - 42} height={cardHeight} live={live} nudge={nudge} />
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
