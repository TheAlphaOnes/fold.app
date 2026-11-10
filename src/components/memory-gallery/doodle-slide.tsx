/**
 * A gallery page with one doodle, drawn large in the middle. It draws itself
 * in and boils while its page is in view, like on the live card.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { doodleExtent } from '@/canvas/doodle';
import { DoodleView } from '@/canvas/render/doodle-view';
import type { DoodleLayer } from '@/canvas/types';

interface DoodleSlideProps {
  layer: DoodleLayer;
  width: number;
  height: number;
  active: boolean;
}

/** How much of the page the drawing may fill. */
const FILL_W = 0.8;
const FILL_H = 0.6;

export function DoodleSlide({ layer, width, height, active }: DoodleSlideProps) {
  // DoodleView sizes strokes by a canvas width; pick the one that makes this
  // drawing fill the page, then draw it upright at scale 1.
  const extent = doodleExtent(layer.strokes);
  const canvas = Math.min((width * FILL_W) / Math.max(0.01, extent.x * 2), (height * FILL_H) / Math.max(0.01, extent.y * 2));
  return (
    <View style={[styles.page, { width, height }]}>
      <DoodleView key={active ? 'live' : 'still'} layer={{ ...layer, scale: 1, rotation: 0 }} width={canvas} moving={active} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: 'center', justifyContent: 'center' },
});
