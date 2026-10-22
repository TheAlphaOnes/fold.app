/**
 * MusicDisc — a song on the story wheel: a picture disc whose whole face is
 * the album art, with faint grooves and a spindle hole, turning slowly.
 *
 * Motion on separate clocks: the disc spins steadily, while a soft sheen
 * drifts across it at its own slower pace, so it never looks like a static
 * rotated image.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Music2 } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';

const SPIN_MS = 9000;
const GROOVES = [0.92, 0.8, 0.68, 0.56];

export function MusicDisc({ size, artwork }: { size: number; artwork?: string }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();

  const spin = useSharedValue(0);
  const sheen = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    spin.value = withRepeat(withTiming(360, { duration: SPIN_MS, easing: Easing.linear }), -1, false);
    sheen.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 3400, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(spin);
      cancelAnimation(sheen);
    };
  }, [reduceMotion, spin, sheen]);

  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotateZ: `${spin.value}deg` }] }));
  const sheenStyle = useAnimatedStyle(() => ({ opacity: 0.06 + sheen.value * 0.12 }));

  const hole = size * 0.12;

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={[
          styles.disc,
          { width: size, height: size, borderRadius: size / 2, borderColor: theme.border, backgroundColor: theme.backgroundElement },
          spinStyle,
        ]}
      >
        {artwork ? (
          <Image source={{ uri: artwork }} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} />
        ) : (
          <View style={styles.fallback}>
            <Music2 size={size * 0.28} color={theme.textMuted} strokeWidth={1.5} />
          </View>
        )}

        {GROOVES.map((ratio) => (
          <View
            key={ratio}
            pointerEvents="none"
            style={[
              styles.groove,
              {
                width: size * ratio,
                height: size * ratio,
                borderRadius: (size * ratio) / 2,
                top: (size * (1 - ratio)) / 2,
                left: (size * (1 - ratio)) / 2,
              },
            ]}
          />
        ))}

        {/* Sheen on one half, so it reads as light catching a turning disc. */}
        <Animated.View pointerEvents="none" style={[styles.sheen, { borderTopLeftRadius: size / 2, borderTopRightRadius: size / 2 }, sheenStyle]} />
      </Animated.View>

      <View
        pointerEvents="none"
        style={[
          styles.hole,
          {
            width: hole,
            height: hole,
            borderRadius: hole / 2,
            top: (size - hole) / 2,
            left: (size - hole) / 2,
            backgroundColor: theme.background,
            borderColor: theme.border,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  fallback: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groove: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.22)',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: '#FFFFFF',
  },
  hole: {
    position: 'absolute',
    borderWidth: 1,
  },
});
