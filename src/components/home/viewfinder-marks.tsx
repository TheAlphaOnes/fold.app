/**
 * ViewfinderMarks — four corner brackets framing the live picture, the way
 * a rangefinder's frame lines float over the scene.
 *
 * They come in after the iris has mostly opened, each corner on its own
 * slice of the shared progress, so they settle one by one: each draws in
 * from slightly outside its corner and lands at a different moment.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

const INSET = 18;
const ARM = 22;
const STROKE = 2;

type Corner = 'tl' | 'tr' | 'bl' | 'br';
const CORNERS: { corner: Corner; from: number; to: number }[] = [
  { corner: 'tl', from: 0.62, to: 0.86 },
  { corner: 'br', from: 0.68, to: 0.95 },
  { corner: 'tr', from: 0.74, to: 0.92 },
  { corner: 'bl', from: 0.8, to: 1 },
];

function Mark({ corner, from, to, open }: { corner: Corner; from: number; to: number; open: SharedValue<number> }) {
  const top = corner[0] === 't';
  const left = corner[1] === 'l';
  const style = useAnimatedStyle(() => {
    const t = interpolate(open.value, [from, to], [0, 1], Extrapolation.CLAMP);
    const out = (1 - t) * 10;
    return {
      opacity: t,
      transform: [{ translateX: left ? -out : out }, { translateY: top ? -out : out }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.mark,
        top ? { top: INSET, borderTopWidth: STROKE } : { bottom: INSET, borderBottomWidth: STROKE },
        left ? { left: INSET, borderLeftWidth: STROKE } : { right: INSET, borderRightWidth: STROKE },
        style,
      ]}
    />
  );
}

export function ViewfinderMarks({ open }: { open: SharedValue<number> }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {CORNERS.map((c) => (
        <Mark key={c.corner} {...c} open={open} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { position: 'absolute', width: ARM, height: ARM, borderColor: '#FFFFFFD9', borderRadius: 3 },
});
