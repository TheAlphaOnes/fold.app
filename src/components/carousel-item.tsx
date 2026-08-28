import React, { memo, useRef, useState } from 'react';
import { View, useWindowDimensions, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { Gesture, GestureDetector, Directions } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, interpolate, Extrapolation, type SharedValue } from 'react-native-reanimated';

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

  const [isSharing, setIsSharing] = useState(false);

  const triggerShareFeedback = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setScanKey(prev => prev + 1);
  };

  const captureAndShareCard = async () => {
    setIsSharing(true);
    try {
      // Wait to let the flight animation completely finish before freezing JS thread (700ms delay + 1000ms duration)
      await new Promise(resolve => setTimeout(resolve, 1750));
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
    } finally {
      setIsSharing(false);
    }
  };

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      pressedScale.value = withTiming(0.96, { duration: 150 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onEnd(() => {
      pressedScale.value = withTiming(1, { duration: 150 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      runOnJS(navigateToDetail)();
    })
    .onFinalize(() => {
      pressedScale.value = withTiming(1, { duration: 150 });
    });

  const longPress = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      pressedScale.value = withTiming(0.96, { duration: 150 });
      runOnJS(triggerShareFeedback)();
      runOnJS(captureAndShareCard)();
    })
    .onEnd(() => {
      pressedScale.value = withTiming(1, { duration: 150 });
    })
    .onFinalize(() => {
      pressedScale.value = withTiming(1, { duration: 150 });
    });

  const swipeLeft = Gesture.Pan()
    // Require 30px of leftward movement before claiming the gesture
    .activeOffsetX([-30, 0])
    // If the user moves 20px vertically first, fail this gesture so the FlatList can scroll normally
    .failOffsetY([-20, 20])
    .onStart(() => {
      pressedScale.value = withTiming(0.96, { duration: 150 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onEnd((e) => {
      pressedScale.value = withTiming(1, { duration: 150 });
      
      // Only trigger if they swiped significantly left or flicked it fast
      if (e.translationX < -40 || e.velocityX < -500) {
        if (item.storyIds && item.storyIds.length > 0) {
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
          runOnJS(router.push)(`/stories/${item.storyIds[0]}`);
        }
      }
    })
    .onFinalize(() => {
      pressedScale.value = withTiming(1, { duration: 150 });
    });

  const composed = Gesture.Exclusive(swipeLeft, doubleTap, longPress);

  return (
    <View style={[styles.carouselItem, { height: snapInterval }]}>
      {/* Hidden card for capturing as image */}
      {isSharing && (
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
      )}

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
