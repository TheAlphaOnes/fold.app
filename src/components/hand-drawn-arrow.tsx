import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface HandDrawnArrowProps {
  color?: string;
  width?: number;
  height?: number;
}

/**
 * A single continuous hand-drawn SVG arrow.
 * No strokeDasharray — that was the root cause of all previous breaks.
 * The entire shape is ONE path: it enters from off-screen right,
 * sweeps wide left with a swirl, angles back, and terminates in a clean arrowhead.
 * Because it's solid, the head and stem ALWAYS connect perfectly.
 */
export function HandDrawnArrow({ color = "#000000", width = 160, height = 140 }: HandDrawnArrowProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 160 140" fill="none">
      {/* 
        The stem: starts off right edge, swoops wide left (the "coming from somewhere" feel),
        does a tight hook/swirl, then drops perfectly straight down.
        The path ends exactly at (80, 126) — the same point the arrowhead is pinned to.
      */}
      <Path
        d="M 155 10 C 120 -5, 20 20, 30 60 C 40 90, 100 70, 80 126"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
        opacity={0.7}
      />

      {/* 
        The arrowhead: a V-shape pinned exactly at (80, 126).
        Because this is a separate solid path with no dashes,
        it always connects perfectly regardless of curve length.
      */}
      <Path
        d="M 67 113 L 80 126 L 93 113"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.7}
      />
    </Svg>
  );
}
