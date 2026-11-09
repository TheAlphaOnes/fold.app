/**
 * Hatch — fills its box with diagonal lines drawn for its measured size,
 * so the texture always reaches every edge, whatever the box grows to.
 * The shared engine behind DiagonalStripes and DoubleDiagonalStripes.
 */

import React, { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { hatchPath } from '@/utils/hatch';

interface HatchProps {
  color: string;
  strokeWidth: number;
  period: number;
  offsets?: readonly number[];
  style?: StyleProp<ViewStyle>;
}

export function Hatch({ color, strokeWidth, period, offsets, style }: HatchProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.width || height !== size.height) setSize({ width, height });
  };

  return (
    <View style={style ?? StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
      {size.width > 0 && size.height > 0 && (
        <Svg width={size.width} height={size.height}>
          <Path d={hatchPath(size.width, size.height, period, offsets)} stroke={color} strokeWidth={strokeWidth} strokeLinecap="square" />
        </Svg>
      )}
    </View>
  );
}
