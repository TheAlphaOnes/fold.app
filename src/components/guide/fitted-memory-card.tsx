import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { MemoryCard } from '@/components/memory-card';
import type { StageArea } from '@/components/guide/types';
import type { Composition } from '@/types/journal';

const CARD_INSET = 42; // MemoryCard derives its width from the window minus this gutter.
const noop = () => {};

/** The card's resting size on the home feed, so previews keep the real aspect. */
export function useFullCardSize() {
  const { width, height } = useWindowDimensions();
  return { width: width - CARD_INSET, height: Math.min(width * 1.618, height * 0.78) };
}

interface FittedMemoryCardProps {
  memory: Composition;
  area: StageArea;
  /** Upper bound on the scale, for previews that should read as a thumbnail. */
  maxScale?: number;
}

/**
 * A read-only memory card scaled down to fit `area`, keeping the exact layout
 * the home feed renders. The card is laid out at full size and scaled as one
 * unit, so text, stickers and badges stay proportional. Not interactive.
 */
export function FittedMemoryCard({ memory, area, maxScale = 1 }: FittedMemoryCardProps) {
  const full = useFullCardSize();
  const scale = Math.max(0.1, Math.min(maxScale, area.width / full.width, area.height / full.height));
  const boxWidth = full.width * scale;
  const boxHeight = full.height * scale;

  return (
    <View style={{ width: boxWidth, height: boxHeight }} pointerEvents="none">
      <View
        style={[
          styles.fullSize,
          {
            width: full.width,
            height: full.height,
            left: (boxWidth - full.width) / 2,
            top: (boxHeight - full.height) / 2,
            transform: [{ scale }],
          },
        ]}
      >
        <MemoryCard item={memory} height={full.height} onUpdatePositions={noop} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullSize: {
    position: 'absolute',
  },
});
