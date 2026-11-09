import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Hatch } from '@/components/hatch';

interface DiagonalStripesProps {
  /** Stroke color for the lines */
  color?: string;
  /** Opacity of the entire overlay (0–1) */
  opacity?: number;
  /** Deprecated: the stripes are static. Kept so callers needn't change. */
  animated?: boolean;
}

/** Fold's diagonal hatching: "\" lines every 8pt, edge to edge at any size. */
export function DiagonalStripes({ color = '#863800', opacity = 0.15 }: DiagonalStripesProps) {
  return (
    <View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      <Hatch color={color} strokeWidth={1.5} period={8} />
    </View>
  );
}
