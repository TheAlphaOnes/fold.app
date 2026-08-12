import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
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
 * Uses a rotated oversized container and translates by exactly the pattern width
 * to achieve a seamless infinite loop without out-of-bounds drift.
 */
export function DiagonalStripes({
  color = '#863800',
  opacity = 0.15,
  animated = false,
}: DiagonalStripesProps) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      // Loop perfectly over the exact pattern width (5px)
      // Moving 5 pixels over 500ms gives a nice subtle scrolling speed.
      translateX.value = withRepeat(
        withTiming(-5, {
          duration: 1000,
          easing: Easing.linear,
        }),
        -1, // infinite
        false // no reverse, continuous forward motion
      );
    } else {
      translateX.value = 0;
    }
  }, [animated, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: '-55deg' },
      { translateX: translateX.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id="cardStripes"
            x="0"
            y="0"
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
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
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#cardStripes)" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    // Oversized to ensure the rotated edges don't clip the card bounds
    width: '250%',
    height: '250%',
    top: '-75%',
    left: '-75%',
  },
});
