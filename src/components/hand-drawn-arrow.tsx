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
      {/* 
        A very clean, organic, hand-drawn curved arrow.
        It swoops from the top-left, arcs gently, and points directly down. 
      */}
      <Path
        d="M12 10 Q 35 30, 20 60"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="6 5"
      />
      
      {/* 
        A sharp, solid arrowhead perfectly rooted at 20,60. 
        It has a tiny stem that extends UP to 22,54 to seamlessly catch the last dashed dot.
      */}
      <Path
        d="M22 54 L 20 60 M 13 52 L 20 61 L 27 52"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
