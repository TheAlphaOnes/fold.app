import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Defs, Pattern, Rect } from 'react-native-svg';

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

  const patternId = `doubleCardStripes-${color.replace('#', '')}-${opacity}`;

  return (
    <Animated.View
      style={[
        animated ? styles.containerAnimated : StyleSheet.absoluteFill,
        { opacity },
        animated ? driftStyle : undefined,
      ]}
      pointerEvents="none"
    >
      <Svg key={patternId} width="120%" height="120%">
        <Defs>
          <Pattern
            id={patternId}
            x="0"
            y="0"
            width="15"
            height="15"
            patternUnits="userSpaceOnUse"
          >
            {/* 
              Using pre-calculated 45-degree paths instead of rotated <Line>s 
              fixes aliasing / stitching artifacts on iOS CoreGraphics.
              Direction is \ (top-left to bottom-right).
              Line 1: y = x, Line 2: y = x - 6.
            */}
            <Path
              d="
                M-2,-2 L17,17
                M13,-2 L17,2
                M-2,13 L2,17
                
                M4,-2 L17,11
                M-2,7 L8,17
              "
              stroke={color}
              strokeWidth="1"
              strokeLinecap="square"
            />
          </Pattern>
        </Defs>
        {/* Draw the pattern oversized to prevent edges from showing during drift */}
        <Rect x="-20%" y="-20%" width="140%" height="140%" fill={`url(#${patternId})`} />
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
