/**
 * Grid (collage) layouts as data. Each cell is a rectangle in normalised
 * canvas units (0–1). Adding a layout means adding an entry here.
 *
 * Decor is drawn by the grid renderer: the striped card under the film
 * strip, the polaroid's frame and tilt.
 */

import type { GridLayoutId } from '@/canvas/types';

export interface GridCell {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type GridDecor = 'film' | 'polaroid';

export interface GridLayout {
  id: GridLayoutId;
  name: string;
  cells: GridCell[];
  decor?: GridDecor;
  /** Where a text layer goes by default (normalised centre). */
  textAnchor: { x: number; y: number };
}

const cell = (id: string, x: number, y: number, w: number, h: number): GridCell => ({ id, x, y, w, h });

/**
 * Film: a strip of five frames down the left, inset by a margin on both
 * sides so the card shows round them like a film strip's border, beside
 * two large photos stacked on the right.
 * Frame ids a–d match the old four-frame strip, so saved photos stay put.
 */
export const FILM = {
  /** Width of the strip, including both sprocket margins. */
  strip: 0.46,
  /** The strip's side margin, where the card shows through. */
  margin: 0.035,
  frames: 5,
  /** Space between frames along the strip (fraction of height). */
  spacing: 0.016,
} as const;
const FILM_FRAME_H = (1 - FILM.spacing * (FILM.frames + 1)) / FILM.frames;

export const GRID_LAYOUTS: readonly GridLayout[] = [
  { id: 'duo-stack', name: 'Halves', cells: [cell('a', 0, 0, 1, 0.5), cell('b', 0, 0.5, 1, 0.5)], textAnchor: { x: 0.5, y: 0.5 } },
  { id: 'duo-side', name: 'Split', cells: [cell('a', 0, 0, 0.5, 1), cell('b', 0.5, 0, 0.5, 1)], textAnchor: { x: 0.5, y: 0.82 } },
  {
    id: 'trio-strips',
    name: 'Strips',
    cells: [cell('a', 0, 0, 1, 1 / 3), cell('b', 0, 1 / 3, 1, 1 / 3), cell('c', 0, 2 / 3, 1, 1 / 3)],
    textAnchor: { x: 0.5, y: 0.5 },
  },
  {
    id: 'trio-columns',
    name: 'Columns',
    cells: [cell('a', 0, 0, 1 / 3, 1), cell('b', 1 / 3, 0, 1 / 3, 1), cell('c', 2 / 3, 0, 1 / 3, 1)],
    textAnchor: { x: 0.5, y: 0.82 },
  },
  {
    id: 'hero',
    name: 'Hero',
    cells: [cell('a', 0, 0, 1, 2 / 3), cell('b', 0, 2 / 3, 0.5, 1 / 3), cell('c', 0.5, 2 / 3, 0.5, 1 / 3)],
    textAnchor: { x: 0.5, y: 0.58 },
  },
  {
    id: 'quad',
    name: 'Quad',
    cells: [cell('a', 0, 0, 0.5, 0.5), cell('b', 0.5, 0, 0.5, 0.5), cell('c', 0, 0.5, 0.5, 0.5), cell('d', 0.5, 0.5, 0.5, 0.5)],
    textAnchor: { x: 0.5, y: 0.5 },
  },
  {
    id: 'film',
    name: 'Film',
    decor: 'film',
    cells: [
      ...Array.from({ length: FILM.frames }, (_, i) =>
        cell(String.fromCharCode(97 + i), FILM.margin, FILM.spacing + i * (FILM_FRAME_H + FILM.spacing), FILM.strip - FILM.margin * 2, FILM_FRAME_H),
      ),
      cell('f', FILM.strip, 0, 1 - FILM.strip, 0.5),
      cell('g', FILM.strip, 0.5, 1 - FILM.strip, 0.5),
    ],
    textAnchor: { x: 1 - (1 - FILM.strip) / 2, y: 0.5 },
  },
  {
    // One wide photo on top, four beneath in two rows.
    id: 'feature',
    name: 'Feature',
    cells: [
      cell('a', 0, 0, 1, 0.42),
      cell('b', 0, 0.42, 0.5, 0.29),
      cell('c', 0.5, 0.42, 0.5, 0.29),
      cell('d', 0, 0.71, 0.5, 0.29),
      cell('e', 0.5, 0.71, 0.5, 0.29),
    ],
    textAnchor: { x: 0.5, y: 0.42 },
  },
  {
    id: 'six',
    name: 'Six',
    cells: [0, 1, 2].flatMap((row) =>
      [0, 1].map((col) => cell(`${row}${col}`, col * 0.5, row / 3, 0.5, 1 / 3)),
    ),
    textAnchor: { x: 0.5, y: 0.5 },
  },
  {
    id: 'polaroid',
    name: 'Polaroid',
    decor: 'polaroid',
    // The photo window inside the frame; the frame itself is decor.
    cells: [cell('a', 0.16, 0.2, 0.68, 0.46)],
    textAnchor: { x: 0.5, y: 0.75 },
  },
];

export function gridLayout(id: GridLayoutId): GridLayout {
  return GRID_LAYOUTS.find((layout) => layout.id === id) ?? GRID_LAYOUTS[0];
}

/** The layout that fits N photos best, for picking a template automatically. */
export function gridForCount(count: number): GridLayoutId {
  if (count <= 2) return 'duo-stack';
  if (count === 3) return 'trio-strips';
  if (count === 4) return 'quad';
  if (count === 5) return 'feature';
  return 'six';
}

/** Gap between cells as a fraction of canvas width. */
export const GAP_FRACTION = { none: 0, thin: 0.008, thick: 0.022 } as const;

export interface CellRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * A cell's box on a canvas of the given size. Edges are snapped to device
 * pixels from the cell's start and end (not start + size), so neighbours
 * share the exact same edge and no hairline seam opens between them.
 * `snap` is PixelRatio.roundToNearestPixel in the app.
 */
export function cellRect(cell: GridCell, width: number, height: number, gap: number, snap: (n: number) => number = (n) => n): CellRect {
  const half = gap / 2;
  const left = snap(cell.x * width + half);
  const top = snap(cell.y * height + half);
  const right = snap((cell.x + cell.w) * width - half);
  const bottom = snap((cell.y + cell.h) * height - half);
  return { left, top, width: right - left, height: bottom - top };
}
