/**
 * CanvasBase — everything under the layers: the stripes, a colour, a
 * full-bleed photo/video (Story), or a grid of cells with its decor
 * (film strip, diary page, polaroid frame).
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { DiagonalStripes } from '@/components/diagonal-stripes';
import type { CanvasDoc, Crop } from '@/canvas/types';
import { MediaFill } from '@/canvas/render/media-fill';
import { GAP_FRACTION, gridLayout, type GridLayout } from '@/templates/grids';
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
  /** Animate the stripes (off for exports and thumbnails). */
  animated: boolean;
  renderers?: FrameRenderers;
}

export function CanvasBase({ doc, media, width, height, playing, animated, renderers }: CanvasBaseProps) {
  const theme = useTheme();
  const isDark = theme.background !== '#FFFFFF';
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
        <MediaFill media={m} crop={bg.crop} width={width} height={height} playing={playing} muted={false} />
      );
    }
  }

  if (bg.kind === 'color') {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: bg.color }]} />;
  }

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.backgroundElement }]} pointerEvents="none">
      <DiagonalStripes color={isDark ? theme.border : '#D0D0D0'} opacity={isDark ? 0.12 : 0.5} animated={animated} />
    </View>
  );
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
  const background = doc.background.kind === 'color' ? doc.background.color : '#0B0B0B';
  const fills = new Map((doc.cells ?? []).map((c) => [c.cellId, c]));

  const frame = layout.decor === 'polaroid';
  const content = (
    <>
      {layout.cells.map((cell) => {
        const fill = fills.get(cell.id);
        const m = fill?.mediaId ? media.get(fill.mediaId) : undefined;
        const left = cell.x * width + gap / 2;
        const top = cell.y * height + gap / 2;
        const w = cell.w * width - gap;
        const h = cell.h * height - gap;
        return (
          <View key={cell.id} style={[styles.cell, { left, top, width: w, height: h, backgroundColor: theme.backgroundElement }]}>
            {m ? (
              renderers ? (
                renderers.frame(cell.id, m, fill!.crop, w, h, fill!.mirrored)
              ) : (
                <MediaFill media={m} crop={fill!.crop} width={w} height={h} mirrored={fill!.mirrored} playing={playing} />
              )
            ) : (
              <>
                <DiagonalStripes color={theme.border} opacity={0.35} />
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
      {layout.decor === 'diary' && <DiaryDecor width={width} height={height} />}
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

/** A ruled page under the photo. */
function DiaryDecor({ width, height }: { width: number; height: number }) {
  const top = height * 0.6;
  const line = height * 0.05;
  const lines = Math.floor((height - top) / line);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F4F1EA' }]}>
      {Array.from({ length: lines }, (_, i) => (
        <View key={i} style={[styles.rule, { top: top + (i + 1) * line, left: width * 0.08, right: width * 0.08 }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { position: 'absolute', overflow: 'hidden' },
  sprocket: { position: 'absolute', borderRadius: 3, backgroundColor: '#F4F1EA', opacity: 0.85 },
  rule: { position: 'absolute', height: StyleSheet.hairlineWidth, backgroundColor: '#C9C2B4' },
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
