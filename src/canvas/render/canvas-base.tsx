/**
 * CanvasBase — everything under the layers: the stripes, a colour, a
 * full-bleed photo/video (Story), or a grid of cells with its decor
 * (film strip margins, polaroid frame).
 */

import React from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';

import type { CanvasDoc, Crop } from '@/canvas/types';
import { MediaFill } from '@/canvas/render/media-fill';
import { StripesSurface } from '@/canvas/render/stripes-surface';
import { SlideshowBase } from '@/canvas/render/slideshow-base';
import { GAP_FRACTION, cellRect, gridLayout, type GridLayout } from '@/templates/grids';
import { gridIdOf } from '@/templates/registry';
import { useTheme } from '@/hooks/use-theme';
import type { MediaElement } from '@/types/journal';

/** Lets the composer draw editable frames in place of the static ones. */
export interface FrameRenderers {
  /** A photo/video frame: the Story background ('background') or a grid cell (its id). */
  frame: (target: string, media: MediaElement, crop: Crop, width: number, height: number, mirrored?: boolean, origin?: { left: number; top: number }) => React.ReactNode;
  /** An empty grid cell. */
  emptyCell?: (cellId: string, width: number, height: number) => React.ReactNode;
}

interface CanvasBaseProps {
  doc: CanvasDoc;
  media: Map<string, MediaElement>;
  width: number;
  height: number;
  playing: boolean;
  muted?: boolean;
  /** A tap on the live card (Slideshow skips ahead). */
  nudge?: number;
  /** Animate the stripes (off for exports and thumbnails). */
  animated: boolean;
  renderers?: FrameRenderers;
}

export function CanvasBase({ doc, media, width, height, playing, muted = true, animated, renderers, nudge = 0 }: CanvasBaseProps) {
  const bg = doc.background;

  if (doc.template === 'slideshow') {
    return <SlideshowBase doc={doc} media={media} width={width} height={height} playing={playing && animated} muted={muted} renderers={renderers} nudge={nudge} />;
  }

  const grid = gridIdOf(doc.template);
  if (grid) {
    return <GridBase doc={doc} layout={gridLayout(grid)} media={media} width={width} height={height} playing={playing} fade={animated} renderers={renderers} />;
  }

  if (bg.kind === 'media') {
    const m = media.get(bg.mediaId);
    if (m) {
      return renderers ? (
        <>{renderers.frame('background', m, bg.crop, width, height)}</>
      ) : (
        <MediaFill media={m} crop={bg.crop} width={width} height={height} playing={playing} muted={muted} fade={animated} />
      );
    }
  }

  if (bg.kind === 'color') {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: bg.color }]} />;
  }

  return <StripesSurface animated={animated} />;
}

function GridBase({
  doc,
  layout,
  media,
  width,
  height,
  playing,
  fade,
  renderers,
}: {
  doc: CanvasDoc;
  layout: GridLayout;
  media: Map<string, MediaElement>;
  width: number;
  height: number;
  playing: boolean;
  fade: boolean;
  renderers?: FrameRenderers;
}) {
  const theme = useTheme();
  const gap = GAP_FRACTION[doc.gap ?? 'none'] * width;
  // Gaps show the card colour; only decor grids (film, polaroid) set their own.
  // Every grid sits on the card: older Film and Polaroid memories stored a
  // black or cream backdrop, which is ignored now.
  const background = theme.backgroundElement;
  const fills = new Map((doc.cells ?? []).map((c) => [c.cellId, c]));

  const frame = layout.decor === 'polaroid';
  const content = (
    <>
      {layout.cells.map((cell) => {
        const fill = fills.get(cell.id);
        const m = fill?.mediaId ? media.get(fill.mediaId) : undefined;
        const { left, top, width: w, height: h } = cellRect(cell, width, height, gap, PixelRatio.roundToNearestPixel);
        return (
          <View key={cell.id} style={[styles.cell, { left, top, width: w, height: h }]}>
            {m ? (
              renderers ? (
                renderers.frame(cell.id, m, fill!.crop, w, h, fill!.mirrored, { left, top })
              ) : (
                <MediaFill media={m} crop={fill!.crop} width={w} height={h} mirrored={fill!.mirrored} playing={playing} fade={fade} />
              )
            ) : (
              <>
                {/* An empty cell is the same striped card as an empty canvas. */}
                <StripesSurface animated={false} />
                {renderers?.emptyCell?.(cell.id, w, h)}
              </>
            )}
          </View>
        );
      })}
    </>
  );

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: background }]} pointerEvents={renderers ? 'box-none' : 'none'}>
      {/* Film's strip margins and the polaroid sit on the striped card. */}
      {(layout.decor === 'film' || layout.decor === 'polaroid') && <StripesSurface animated={false} />}
      {frame ? (
        <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-3deg' }] }]}>
          <View
            style={[
              styles.polaroid,
              {
                left: width * 0.12,
                top: height * 0.17,
                width: width * 0.76,
                height: height * 0.63,
              },
            ]}
          />
          {content}
        </View>
      ) : (
        content
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { position: 'absolute', overflow: 'hidden' },
  polaroid: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
});
