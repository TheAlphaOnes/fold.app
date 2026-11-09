/**
 * A gallery page with one photo, whole (contain). Pinch to zoom; once
 * zoomed, drag to look around. At 1x the pan stays off, so a sideways
 * swipe still turns the page.
 */

import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MediaElement } from '@/types/journal';

const SNAP_BACK = 1.05;

export function PhotoSlide({ media, width, height }: { media: MediaElement; width: number; height: number }) {
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const offset = useSharedValue({ x: 0, y: 0 });
  const savedOffset = useSharedValue({ x: 0, y: 0 });
  const [zoomed, setZoomed] = useState(false);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.set(Math.max(1, savedScale.get() * e.scale));
    })
    .onEnd(() => {
      if (scale.get() <= SNAP_BACK) {
        scale.set(withTiming(1, { duration: 150 }));
        savedScale.set(1);
        offset.set(withTiming({ x: 0, y: 0 }, { duration: 150 }));
        savedOffset.set({ x: 0, y: 0 });
        runOnJS(setZoomed)(false);
      } else {
        savedScale.set(scale.get());
        runOnJS(setZoomed)(true);
      }
    });

  const pan = Gesture.Pan()
    .enabled(zoomed)
    .onUpdate((e) => {
      offset.set({ x: savedOffset.get().x + e.translationX, y: savedOffset.get().y + e.translationY });
    })
    .onEnd(() => {
      savedOffset.set(offset.get());
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.get().x }, { translateY: offset.get().y }, { scale: scale.get() }],
  }));

  return (
    <View style={{ width, height, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}>
      <GestureDetector gesture={Gesture.Simultaneous(pinch, pan)}>
        <Animated.View style={[styles.fill, style]}>
          <Image source={{ uri: media.uri }} style={styles.fill} contentFit="contain" />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
