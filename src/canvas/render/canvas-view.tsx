/**
 * CanvasView — draws a memory's canvas, read-only, at any size: the feed
 * card, the full-screen memory, a 1080×1920 export, a thumbnail. Positions
 * are normalised, so the same doc looks the same at every size.
 *
 * The composer draws its own interactive version on top of the same
 * pieces (CanvasBase, layer views, LayerAnchor).
 */

import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { CanvasDoc, Layer } from '@/canvas/types';
import { CanvasBase } from '@/canvas/render/canvas-base';
import { DeckCard, FanCard, MotionGroup, Upright, useDeck } from '@/canvas/render/arrangement-motion';
import {
  AudioStickerView,
  DateStickerView,
  LocationStickerView,
  MediaStickerView,
  TextLayerView,
} from '@/canvas/render/layer-views';
import { ARRANGEMENTS, deckDepth, isArranged } from '@/templates/arrangements';
import type { Composition, MediaElement } from '@/types/journal';

export interface CanvasViewProps {
  doc: CanvasDoc;
  memory: Pick<Composition, 'id' | 'mediaElements' | 'createdAt' | 'location'>;
  width: number;
  height: number;
  /** Videos play and audio can be tapped/auto-played (feed's active card, memory screen). */
  live?: boolean;
  /** Animate the stripes background. */
  animated?: boolean;
  /** Playing videos are silent (the feed); the memory screen plays them with sound. */
  muted?: boolean;
}

/**
 * Side of the invisible box a layer is centred in. A zero-size anchor would
 * squeeze the layer's content to zero width, so the box is big enough for
 * any layer to lay out at its natural size; touches pass through it.
 */
export function anchorBox(width: number, height: number): number {
  return Math.max(width, height) * 2;
}

/** Positions a layer's centre at its normalised point and applies rotation. */
export function LayerAnchor({ layer, width, height, children }: { layer: Layer; width: number; height: number; children: React.ReactNode }) {
  const box = anchorBox(width, height);
  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.anchor,
        { width: box, height: box, left: layer.x * width - box / 2, top: layer.y * height - box / 2, transform: [{ rotate: `${layer.rotation}deg` }] },
      ]}
    >
      {children}
    </View>
  );
}

/** The look of one layer, without positioning. */
export function LayerContent({
  layer,
  media,
  memory,
  width,
  live,
}: {
  layer: Layer;
  media: Map<string, MediaElement>;
  memory: CanvasViewProps['memory'];
  width: number;
  live: boolean;
}) {
  switch (layer.kind) {
    case 'text':
      return <TextLayerView layer={layer} width={width} />;
    case 'media': {
      const m = media.get(layer.mediaId);
      return m ? <MediaStickerView layer={layer} media={m} width={width} /> : null;
    }
    case 'audio': {
      const m = media.get(layer.mediaId);
      return m ? <AudioStickerView layer={layer} media={m} width={width} compositionId={memory.id} interactive={live} /> : null;
    }
    case 'location':
      return memory.location?.name ? <LocationStickerView name={memory.location.name} width={width} scale={layer.scale} /> : null;
    case 'date':
      return <DateStickerView layer={layer} createdAt={memory.createdAt} width={width} />;
  }
}

export const CanvasView = memo(function CanvasView({ doc, memory, width, height, live = false, animated = true, muted = true }: CanvasViewProps) {
  const media = useMemo(() => new Map(memory.mediaElements.map((m) => [m.id, m])), [memory.mediaElements]);

  // Arranged templates (Ring, Fan, Deck) move while this is
  // the live canvas in front; the editor and exports stay still.
  const motion = isArranged(doc.template) ? ARRANGEMENTS[doc.template].motion : null;
  const moving = !!motion && live && animated;
  const inShape = (layer: Layer) => !!motion && layer.kind === 'media' && !!layer.auto;
  const shapeLayers = doc.layers.filter(inShape);
  const deck = useDeck(shapeLayers.length, moving && motion?.kind === 'deck');

  const content = (layer: Layer) => <LayerContent layer={layer} media={media} memory={memory} width={width} live={live} />;
  const anchored = (layer: Layer, children: React.ReactNode) => (
    <LayerAnchor key={layer.id} layer={layer} width={width} height={height}>
      {children}
    </LayerAnchor>
  );
  const loose = doc.layers.filter((l) => !inShape(l)).map((l) => anchored(l, content(l)));

  let shape: React.ReactNode = null;
  if (motion?.kind === 'group') {
    // The shape turns as one; each photo turns back so it stays level.
    shape = (
      <MotionGroup degreesPerSecond={motion.degreesPerSecond} active={moving}>
        {shapeLayers.map((l) => anchored(l, <Upright>{content(l)}</Upright>))}
      </MotionGroup>
    );
  } else if (motion?.kind === 'fan') {
    // The hand gathers to the middle of its cards and fans back out.
    const n = Math.max(1, shapeLayers.length);
    const stack = { x: width / 2, y: (shapeLayers.reduce((sum, l) => sum + l.y, 0) / n) * height };
    shape = shapeLayers.map((l, i) =>
      anchored(
        l,
        <FanCard index={i} at={{ x: l.x * width, y: l.y * height }} stack={stack} rotation={l.rotation} active={moving}>
          {content(l)}
        </FanCard>,
      ),
    );
  } else if (motion?.kind === 'deck') {
    // Drawn back to front in the current flip order; each card eases to its
    // depth, and the print in flight swings out and back.
    const n = shapeLayers.length;
    const order = shapeLayers.map((l, i) => ({ l, i, depth: deckDepth(i, n, deck.step) })).sort((a, b) => b.depth - a.depth);
    shape = order.map(({ l, i, depth }) =>
      anchored(
        l,
        <DeckCard depth={depth} flying={i === deck.swinging} swing={deck.swing} side={deck.side} unit={width}>
          {content(l)}
        </DeckCard>,
      ),
    );
  }

  return (
    <View style={[styles.canvas, { width, height }]}>
      <CanvasBase doc={doc} media={media} width={width} height={height} playing={live} muted={muted} animated={animated} />
      {motion ? (
        <>
          {/* The shape sits under the words and other stickers. */}
          {shape}
          {loose}
        </>
      ) : (
        doc.layers.map((l) => anchored(l, content(l)))
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  canvas: { overflow: 'hidden' },
  // A large box centred on the layer's point; its child centres in it.
  anchor: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
