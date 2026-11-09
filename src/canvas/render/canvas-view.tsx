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
import { MotionGroup, MotionItem } from '@/canvas/render/arrangement-motion';
import {
  AudioStickerView,
  DateStickerView,
  LocationStickerView,
  MediaStickerView,
  TextLayerView,
} from '@/canvas/render/layer-views';
import { ARRANGEMENTS, isArranged } from '@/templates/arrangements';
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

  // Arranged templates (Ring, Spiral, Fan, Stack, Float) move gently while
  // this is the live canvas in front; editor and exports stay still.
  const motion = isArranged(doc.template) ? ARRANGEMENTS[doc.template].motion : null;
  const moving = !!motion && live && animated;
  const inShape = (layer: Layer) => !!motion && layer.kind === 'media' && !!layer.auto;
  const shapeLayers = doc.layers.filter(inShape);

  const drawLayer = (layer: Layer, index: number) => (
    <LayerAnchor key={layer.id} layer={layer} width={width} height={height}>
      {motion?.kind === 'item' && inShape(layer) ? (
        <MotionItem motion={motion.style} index={index} unit={width} active={moving}>
          <LayerContent layer={layer} media={media} memory={memory} width={width} live={live} />
        </MotionItem>
      ) : (
        <LayerContent layer={layer} media={media} memory={memory} width={width} live={live} />
      )}
    </LayerAnchor>
  );

  return (
    <View style={[styles.canvas, { width, height }]}>
      <CanvasBase doc={doc} media={media} width={width} height={height} playing={live} muted={muted} animated={animated} />
      {motion?.kind === 'group' ? (
        <>
          {/* The shape turns as one, under the words and stickers. */}
          <MotionGroup degreesPerSecond={motion.degreesPerSecond} active={moving}>
            {shapeLayers.map(drawLayer)}
          </MotionGroup>
          {doc.layers.filter((l) => !inShape(l)).map((l) => drawLayer(l, 0))}
        </>
      ) : (
        doc.layers.map((layer) => drawLayer(layer, shapeLayers.indexOf(layer)))
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
