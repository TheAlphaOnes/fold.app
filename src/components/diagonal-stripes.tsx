import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Line, Defs, Pattern, Rect } from 'react-native-svg';

interface DiagonalStripesProps {
  /** Stroke color for the lines */
  color?: string;
  /** Opacity of the entire overlay (0–1) */
  opacity?: number;
  /** Whether to animate the stripes drifting */
  animated?: boolean;
}

/**
 * Repeating diagonal hatching texture.
 * When `animated` is true, the stripes slowly drift diagonally
 * to give the surface a living, breathing feel.
 */
export function DiagonalStripes({
  color = '#863800',
  opacity = 0.15,
  animated = false,
}: DiagonalStripesProps) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      // Slow, continuous diagonal drift — loops forever
      translateX.value = withRepeat(
        withTiming(-12, {
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
      <Svg width="120%" height="120%">
        <Defs>
          <Pattern
            id="cardStripes"
            x="0"
            y="0"
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-55)"
          >
            <Line
              x1="0"
              y1="0"
              x2="0"
              y2="5"
              stroke={color}
              strokeWidth="1.5"
            />
          </Pattern>
        </Defs>
        <Rect x="-20%" y="-20%" width="140%" height="140%" fill="url(#cardStripes)" />
      </Svg>
    </Animated.View>
  );
}

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
