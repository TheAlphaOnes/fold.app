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
        A mix of graceful swirls and sharp angles.
        Comes from off-screen top-right, swoops up and down, zigs right, and drops down.
        pathLength="102" + strokeDasharray="6 6" perfectly mathematicalizes the dashes 
        so the final dash lands exactly solid on the tip (75, 120).
      */}
      <Path
        d="M 140 20 Q 100 -10, 80 40 L 110 50 Q 75 70, 75 120"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray="6 6"
        pathLength="102"
      />
      
      {/* 
        The symmetrical arrowhead perfectly attached to the final solid dash.
      */}
      <Path
        d="M 63 108 L 75 120 L 87 108"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
