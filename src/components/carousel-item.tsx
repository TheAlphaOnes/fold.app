import React, { memo, useRef, useState } from 'react';
import { View, useWindowDimensions, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { Gesture, GestureDetector, Directions } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS, interpolate, Extrapolation, type SharedValue } from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import { MemoryCard } from '@/components/memory-card';
import { LogoUploadFlight } from '@/components/logo-upload-flight';
import type { Composition } from '@/types/journal';

export interface CarouselItemProps {
  item: Composition;
  snapInterval: number;
  cardHeight: number;
  itemOffset: number;
  scrollY: SharedValue<number>;
  updatePositions: (id: number, media: any) => void;
}

export const CarouselItem = memo(function CarouselItem({ item, itemOffset, snapInterval, cardHeight, scrollY, updatePositions }: CarouselItemProps) {
  const pressedScale = useSharedValue(1);
  const hiddenCardRef = useRef<View>(null);
  const [scanKey, setScanKey] = useState(0);
  const { width } = useWindowDimensions();
  const theme = useTheme();
  
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
    router.push(`/memory/${item.id}`);
  };

  const triggerShareFeedback = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setScanKey(prev => prev + 1);
  };

  const captureAndShareCard = async () => {
    try {
      // Wait to let the flight animation resolve upwards
      await new Promise(resolve => setTimeout(resolve, 600));
      const uri = await captureRef(hiddenCardRef, {
        format: 'png',
        quality: 1,
      });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          dialogTitle: 'Share Memory Card',
          mimeType: 'image/png',
        });
      }
    } catch (e) {
      console.error('Failed to capture memory card:', e);
    }
  };

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      pressedScale.value = withSpring(0.96, { damping: 20, stiffness: 300 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onEnd(() => {
      pressedScale.value = withSpring(1, { damping: 20, stiffness: 300 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      runOnJS(navigateToDetail)();
    })
    .onFinalize(() => {
      pressedScale.value = withSpring(1, { damping: 20, stiffness: 300 });
    });

  const longPress = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      pressedScale.value = withSpring(0.96, { damping: 20, stiffness: 300 });
      runOnJS(triggerShareFeedback)();
      runOnJS(captureAndShareCard)();
    })
    .onEnd(() => {
      pressedScale.value = withSpring(1, { damping: 20, stiffness: 300 });
    })
    .onFinalize(() => {
      pressedScale.value = withSpring(1, { damping: 20, stiffness: 300 });
    });

  const flingLeft = Gesture.Fling()
    .direction(Directions.LEFT)
    .onStart(() => {
      pressedScale.value = withSpring(0.96, { damping: 20, stiffness: 300 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onEnd(() => {
      pressedScale.value = withSpring(1, { damping: 20, stiffness: 300 });
      if (item.storyIds && item.storyIds.length > 0) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
        runOnJS(router.push)(`/stories/${item.storyIds[0]}`);
      }
    })
    .onFinalize(() => {
      pressedScale.value = withSpring(1, { damping: 20, stiffness: 300 });
    });

  const composed = Gesture.Exclusive(flingLeft, doubleTap, longPress);

  return (
    <View style={[styles.carouselItem, { height: snapInterval }]}>
      {/* Hidden card for capturing as image */}
      <View style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -100, width, height: cardHeight }}>
        <View 
          ref={hiddenCardRef} 
          collapsable={false} 
          style={{ width: width - 42, height: cardHeight, alignSelf: 'center', justifyContent: 'center' }}
        >
          <MemoryCard 
            item={item} 
            height={cardHeight} 
            onUpdatePositions={() => {}} 
            isExporting={true}
          />
        </View>
      </View>

      <GestureDetector gesture={composed}>
        <Animated.View style={[animatedStyle, { width: '100%' }]}>
          <MemoryCard item={item} height={cardHeight} onUpdatePositions={updatePositions} />
          {scanKey > 0 && <LogoUploadFlight key={`scan-${scanKey}`} color={theme.text} />}
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
