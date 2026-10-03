import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface HandDrawnArrowProps {
  color?: string;
  width?: number;
  height?: number;
}

export function HandDrawnArrow({ color = "#000000", width = 50, height = 110 }: HandDrawnArrowProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 50 110" fill="none">
      {/* 
        A longer, elegant swoop. 
        Ends with a perfectly vertical tangent so the arrowhead sits naturally.
        pathLength="106" + strokeDasharray="6 4" guarantees it ends exactly on a solid dash.
      */}
      <Path
        d="M25 10 C 55 50, 25 80, 25 100"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="6 4"
        pathLength="106"
      />
      
      {/* 
        A clean, symmetrical arrowhead pointing straight down.
        No extra stems or hacks. 
      */}
      <Path
        d="M16 90 L 25 100 L 34 90"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
