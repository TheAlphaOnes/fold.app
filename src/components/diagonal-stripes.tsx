import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Line, Defs, Pattern, Rect } from 'react-native-svg';

interface DiagonalStripesProps {
  /** Stroke color for the lines */
  color?: string;
  /** Opacity of the entire overlay (0–1) */
  opacity?: number;
  /** Whether to animate the stripes drifting (deprecated, kept for compat) */
  animated?: boolean;
}

/**
 * Repeating diagonal hatching texture.
 * Rendered as a completely static overlay for maximum performance and stability.
 */
export function DiagonalStripes({
  color = '#863800',
  opacity = 0.15,
  animated = false,
}: DiagonalStripesProps) {
  return (
    <View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      <Svg width="100%" height="100%">
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
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#cardStripes)" />
      </Svg>
    </View>
  );
}
