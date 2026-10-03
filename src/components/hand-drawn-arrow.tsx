import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface HandDrawnArrowProps {
  color?: string;
  width?: number;
  height?: number;
}

export function HandDrawnArrow({ color = "#000000", width = 150, height = 130 }: HandDrawnArrowProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 150 130" fill="none">
      {/* 
        A playful, dynamic, hand-drawn swirly arrow.
        It enters from the top-right, does a loop-de-loop, 
        and drops perfectly straight down to point at the button.
      */}
      <Path
        d="
          M 130 10 
          C 80 -10, 30 30, 40 60 
          C 50 90, 100 80, 90 40 
          C 80 0, 75 90, 75 120
        "
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="7 5"
      />
      
      {/* 
        The solid arrowhead. It includes a 10px solid stem line (M 75 110 L 75 120) 
        that perfectly overlaps the path to completely hide any dash gaps, 
        making it look like the pen pressed firmly at the tip!
      */}
      <Path
        d="M 75 110 L 75 120 M 65 110 L 75 120 L 85 110"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
