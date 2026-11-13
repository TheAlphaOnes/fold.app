/**
 * DayDoodle — one doodle from the year's library, drawn by the same engine
 * as a doodle drawn in the app: a brush line that traces itself in and then
 * keeps its hand-drawn boil. Still when `moving` is off (big grids, Reduce
 * Motion), which also draws each stroke once instead of in boil frames.
 */

import React, { useMemo } from 'react';

import { DoodleView } from '@/canvas/render/doodle-view';
import type { DoodleLayer } from '@/canvas/types';
import { INKS } from '@/doodles/palette';
import type { LibraryDoodle } from '@/doodles/types';

/** Share of the box the drawing spans, leaving room for the pen and its wobble. */
const DRAWING_SPAN = 0.8;
/** Pen width as a share of the drawing's span, the same weight at every size. */
const PEN = 0.042;

interface DayDoodleProps {
  doodle: LibraryDoodle;
  /** The square it's drawn in, in points. */
  size: number;
  moving?: boolean;
}

export function DayDoodle({ doodle, size, moving = true }: DayDoodleProps) {
  const layer = useMemo<DoodleLayer>(
    () => ({
      id: `day-${doodle.name}`,
      kind: 'doodle',
      x: 0.5,
      y: 0.5,
      scale: DRAWING_SPAN,
      rotation: 0,
      color: null,
      width: PEN,
      strokes: doodle.strokes.map((s) => ({ points: s.points, color: INKS[s.ink] ?? undefined })),
    }),
    [doodle],
  );
  return <DoodleView layer={layer} width={size} moving={moving} />;
}
