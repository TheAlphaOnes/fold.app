/**
 * FadedEdges — feathers a full-bleed page into the background around it,
 * so it has no hard frame: each edge dissolves into `color` on a soft
 * curve, deeper at the top and bottom than at the sides, like a print
 * whose edges were left to fade.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

interface FadedEdgesProps {
  width: number;
  height: number;
  color: string;
}

/** An eased ramp (more stops than two, so the fade has no visible band). */
const RAMP = [
  [0, 1],
  [0.25, 0.82],
  [0.5, 0.5],
  [0.75, 0.18],
  [1, 0],
] as const;

function Ramp({ id, x2, y2, color }: { id: string; x2: string; y2: string; color: string }) {
  return (
    <LinearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
      {RAMP.map(([offset, opacity]) => (
        <Stop key={offset} offset={offset} stopColor={color} stopOpacity={opacity} />
      ))}
    </LinearGradient>
  );
}

export function FadedEdges({ width, height, color }: FadedEdgesProps) {
  const v = Math.round(height * 0.14);
  const h = Math.round(width * 0.1);
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Ramp id="down" x2="0" y2="1" color={color} />
        <Ramp id="right" x2="1" y2="0" color={color} />
      </Defs>
      <Rect x={0} y={0} width={width} height={v} fill="url(#down)" />
      <Rect x={0} y={height - v} width={width} height={v} fill="url(#down)" transform={`rotate(180 ${width / 2} ${height - v / 2})`} />
      <Rect x={0} y={0} width={h} height={height} fill="url(#right)" />
      <Rect x={width - h} y={0} width={h} height={height} fill="url(#right)" transform={`rotate(180 ${width - h / 2} ${height / 2})`} />
    </Svg>
  );
}
