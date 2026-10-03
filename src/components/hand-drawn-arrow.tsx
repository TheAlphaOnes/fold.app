import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface HandDrawnArrowProps {
  color?: string;
  width?: number;
  height?: number;
}

export function HandDrawnArrow({ color = "#000000", width = 40, height = 70 }: HandDrawnArrowProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 40 70" fill="none">
      {/* A slightly wavy, organic line going down */}
      <Path
        d="M20 5 Q 35 25, 18 45 T 20 65"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="6 6"
      />
      {/* The arrowhead at the bottom */}
      <Path
        d="M10 55 Q 20 65, 20 65 Q 28 53, 32 50"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
