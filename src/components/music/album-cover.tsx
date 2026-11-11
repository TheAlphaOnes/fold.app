/**
 * AlbumCover — a song's artwork as a proper square sleeve: rounded corners,
 * a thin edge and a deep shadow. While the song plays it breathes (a slow
 * lift and settle) instead of spinning; scrubbing tilts it with the drag.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';

interface AlbumCoverProps {
  uri: string;
  size: number;
  playing: boolean;
  /** Degrees from a scrub gesture; tilts the sleeve a little with the drag. */
  scrubOffset?: SharedValue<number>;
}

export function AlbumCover({ uri, size, playing, scrubOffset }: AlbumCoverProps) {
  const reduced = useReducedMotion();
  const breath = useSharedValue(0);
  useEffect(() => {
    if (!playing || reduced) {
      cancelAnimation(breath);
      breath.set(withTiming(0, { duration: 400 }));
      return;
    }
    breath.set(withRepeat(withSequence(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })), -1));
  }, [playing, reduced, breath]);

  const style = useAnimatedStyle(() => {
    const tilt = scrubOffset ? Math.max(-8, Math.min(8, (scrubOffset.get() % 360) / 20)) : 0;
    return {
      transform: [{ translateY: -breath.get() * 6 }, { scale: 1 + breath.get() * 0.015 }, { rotate: `${tilt}deg` }],
    };
  });

  return (
    <Animated.View style={[styles.shadow, { width: size, height: size, borderRadius: size * 0.05 }, style]}>
      <View style={[styles.sleeve, { borderRadius: size * 0.05 }]}>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadow: { shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 22, shadowOffset: { width: 0, height: 14 }, elevation: 12 },
  sleeve: { flex: 1, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: '#FFFFFF33', backgroundColor: '#111' },
});
