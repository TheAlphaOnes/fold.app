import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { Hatch } from '@/components/hatch';

interface DoubleDiagonalStripesProps {
  /** Stroke color for the lines */
  color?: string;
  /** Opacity of the entire overlay (0–1) */
  opacity?: number;
  /** Whether to animate the stripes drifting */
  animated?: boolean;
}

/**
 * Double repeating diagonal hatching texture.
 * Features pairs of lines that are close together, followed by a larger gap.
 * When `animated` is true, the stripes slowly drift diagonally.
 */
export function DoubleDiagonalStripes({
  color = '#863800',
  opacity = 0.15,
  animated = false,
}: DoubleDiagonalStripesProps) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      // Slow, continuous diagonal drift — loops forever
      translateX.value = withRepeat(
        withTiming(-15, {
          duration: 4000,
          easing: Easing.linear,
        }),
        -1, // Infinite repeats
        false, // Don't reverse — just loop
      );
    }
  }, [animated, translateX]);

  const driftStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateX.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        animated ? styles.containerAnimated : StyleSheet.absoluteFill,
        { opacity },
        animated ? driftStyle : undefined,
      ]}
      pointerEvents="none"
    >
      {/* Pairs of lines (y = x and y = x - 6) every 15pt. When drifting, the
          container is oversized so no edge is revealed. */}
      <Hatch color={color} strokeWidth={1} period={15} offsets={PAIR} />
    </Animated.View>
  );
}

const PAIR = [0, -6] as const;

const styles = StyleSheet.create({
  containerAnimated: {
    position: 'absolute',
    // Oversized so the drift animation doesn't reveal edges
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
  },
});
