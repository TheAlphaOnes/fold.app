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
      {/* A smooth, organic curve going down */}
      <Path
        d="M25 10 Q 35 35, 20 60"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="5 5"
      />
      {/* The arrowhead perfectly attached at 20,60 */}
      <Path
        d="M12 50 L 20 60 L 28 50"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
