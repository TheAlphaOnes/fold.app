/**
 * CanvasBase — everything under the layers: the stripes, a colour, a
 * full-bleed photo/video (Story), or a grid of cells with its decor
 * (film strip, diary's striped page, polaroid frame).
 */

import React from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';

import { DiagonalStripes } from '@/components/diagonal-stripes';
import type { CanvasDoc, Crop } from '@/canvas/types';
import { MediaFill } from '@/canvas/render/media-fill';
import { GAP_FRACTION, cellRect, gridLayout, type GridLayout } from '@/templates/grids';
import { gridIdOf } from '@/templates/registry';
import { useTheme } from '@/hooks/use-theme';
import type { MediaElement } from '@/types/journal';

/** Lets the composer draw editable frames in place of the static ones. */
export interface FrameRenderers {
  /** A photo/video frame: the Story background ('background') or a grid cell (its id). */
  frame: (target: string, media: MediaElement, crop: Crop, width: number, height: number, mirrored?: boolean) => React.ReactNode;
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
  /** Animate the stripes (off for exports and thumbnails). */
  animated: boolean;
  renderers?: FrameRenderers;
}

/** Fold's card surface: the diagonal stripes on the card colour. */
function StripesSurface({ animated }: { animated: boolean }) {
  const theme = useTheme();
  const isDark = theme.background !== '#FFFFFF';
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.backgroundElement }]} pointerEvents="none">
      <DiagonalStripes color={isDark ? theme.border : '#D0D0D0'} opacity={isDark ? 0.12 : 0.5} animated={animated} />
    </View>
  );
}

export function CanvasBase({ doc, media, width, height, playing, muted = true, animated, renderers }: CanvasBaseProps) {
  const bg = doc.background;

  const grid = gridIdOf(doc.template);
  if (grid) {
    return <GridBase doc={doc} layout={gridLayout(grid)} media={media} width={width} height={height} playing={playing} renderers={renderers} />;
  }

  if (bg.kind === 'media') {
    const m = media.get(bg.mediaId);
    if (m) {
      return renderers ? (
        <>{renderers.frame('background', m, bg.crop, width, height)}</>
      ) : (
        <MediaFill media={m} crop={bg.crop} width={width} height={height} playing={playing} muted={muted} />
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
  renderers,
}: {
  doc: CanvasDoc;
  layout: GridLayout;
  media: Map<string, MediaElement>;
  width: number;
  height: number;
  playing: boolean;
  renderers?: FrameRenderers;
}) {
  const theme = useTheme();
  const gap = GAP_FRACTION[doc.gap ?? 'none'] * width;
  // Gaps show the card colour; only decor grids (film, polaroid) set their own.
  const background = doc.background.kind === 'color' ? doc.background.color : theme.backgroundElement;
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
                renderers.frame(cell.id, m, fill!.crop, w, h, fill!.mirrored)
              ) : (
                <MediaFill media={m} crop={fill!.crop} width={w} height={h} mirrored={fill!.mirrored} playing={playing} />
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
      {layout.decor === 'film' && <FilmDecor width={width} height={height} />}
      {/* The diary's page under the photo is the app's own striped card. */}
      {layout.decor === 'diary' && <StripesSurface animated={false} />}
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

/** Sprocket holes down both edges of a black film strip. */
function FilmDecor({ width, height }: { width: number; height: number }) {
  const hole = width * 0.045;
  const count = Math.floor(height / (hole * 2.2));
  const holes = Array.from({ length: count }, (_, i) => i * (height / count) + hole * 0.6);
  return (
    <>
      {[width * 0.045, width - width * 0.045 - hole].map((left) =>
        holes.map((top) => (
          <View key={`${left}-${top}`} style={[styles.sprocket, { left, top, width: hole, height: hole * 1.3 }]} />
        )),
      )}
    </>
  );
}

const styles = StyleSheet.create({
  cell: { position: 'absolute', overflow: 'hidden' },
  sprocket: { position: 'absolute', borderRadius: 3, backgroundColor: '#F4F1EA', opacity: 0.85 },
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
