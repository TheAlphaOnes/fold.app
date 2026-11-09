/**
 * EditableFrame — a photo/video frame the user can reposition: pinch to
 * zoom, drag to pan (Story background, grid cells). The image can never
 * show a gap: scale stays ≥ 1 and the pan is clamped to the overflow.
 * Commits the crop when the gesture ends.
 *
 * Grid cells also take a tap (fill/replace) and a long press (pick it up to
 * swap with another cell), like Instagram's Layout.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { clamp } from '@/canvas/geometry';
import { MediaFill } from '@/canvas/render/media-fill';
import { NO_CROP, type Crop } from '@/canvas/types';
import type { MediaElement } from '@/types/journal';

const MAX_ZOOM = 4;

interface EditableFrameProps {
  media: MediaElement;
  crop: Crop;
  width: number;
  height: number;
  mirrored?: boolean;
  onCrop: (crop: Crop) => void;
  onTap?: () => void;
  onLongPress?: () => void;
  /** Outline shown while picked up for a swap. */
  highlighted?: boolean;
}

export function EditableFrame({ media, crop, width, height, mirrored, onCrop, onTap, onLongPress, highlighted }: EditableFrameProps) {
  const x = useSharedValue(crop.x);
  const y = useSharedValue(crop.y);
  const scale = useSharedValue(crop.scale);
  const start = useSharedValue({ x: crop.x, y: crop.y, scale: crop.scale });

  useEffect(() => {
    x.set(crop.x);
    y.set(crop.y);
    scale.set(crop.scale);
  }, [crop, x, y, scale]);

  const commit = () => {
    'worklet';
    runOnJS(onCrop)({ x: x.get(), y: y.get(), scale: scale.get() });
  };

  // The farthest the image may slide either way at the current zoom.
  const bound = (s: number) => {
    'worklet';
    return (s - 1) / 2;
  };

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      start.set({ x: x.get(), y: y.get(), scale: scale.get() });
    })
    .onUpdate((e) => {
      const b = bound(scale.get());
      x.set(clamp(start.get().x + e.translationX / width, -b, b));
      y.set(clamp(start.get().y + e.translationY / height, -b, b));
    })
    .onEnd(commit);

  const pinch = Gesture.Pinch()
    .onStart(() => {
      start.set({ x: x.get(), y: y.get(), scale: scale.get() });
    })
    .onUpdate((e) => {
      const s = clamp(start.get().scale * e.scale, 1, MAX_ZOOM);
      scale.set(s);
      const b = bound(s);
      x.set(clamp(x.get(), -b, b));
      y.set(clamp(y.get(), -b, b));
    })
    .onEnd(commit);

  const tap = Gesture.Tap().onEnd(() => {
    if (onTap) runOnJS(onTap)();
  });
  const hold = Gesture.LongPress()
    .minDuration(380)
    .onStart(() => {
      if (onLongPress) runOnJS(onLongPress)();
    });

  const gesture = Gesture.Race(Gesture.Simultaneous(pan, pinch), Gesture.Exclusive(hold, tap));

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() * width }, { translateY: y.get() * height }, { scale: scale.get() }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.frame, { width, height }]} collapsable={false}>
        <Animated.View style={[StyleSheet.absoluteFill, style]}>
          <MediaFill media={media} crop={NO_CROP} width={width} height={height} mirrored={mirrored} />
        </Animated.View>
        {highlighted && <View style={[StyleSheet.absoluteFill, styles.highlight]} pointerEvents="none" />}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden' },
  highlight: { borderWidth: 3, borderColor: '#F27A1A' },
});
