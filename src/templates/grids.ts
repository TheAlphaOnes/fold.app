/**
 * Grid (collage) layouts as data. Each cell is a rectangle in normalised
 * canvas units (0–1). Adding a layout means adding an entry here.
 *
 * Decor is drawn by the grid renderer: the film strip's sprocket holes and
 * date stamp, the diary's striped page, the polaroid's frame and tilt.
 */

import type { GridLayoutId } from '@/canvas/types';

export interface GridCell {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type GridDecor = 'film' | 'diary' | 'polaroid';

export interface GridLayout {
  id: GridLayoutId;
  name: string;
  cells: GridCell[];
  decor?: GridDecor;
  /** Where a text layer goes by default (normalised centre). */
  textAnchor: { x: number; y: number };
}

const cell = (id: string, x: number, y: number, w: number, h: number): GridCell => ({ id, x, y, w, h });

/** Film strip: four frames down a black band, sprocket margins at the sides. */
const FILM_MARGIN = 0.14;
const FILM_FRAME = (1 - 0.06 - 0.03 * 3) / 4;

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
    cells: [0, 1, 2, 3].map((i) =>
      cell(String.fromCharCode(97 + i), FILM_MARGIN, 0.03 + i * (FILM_FRAME + 0.03), 1 - FILM_MARGIN * 2, FILM_FRAME),
    ),
    textAnchor: { x: 0.5, y: 0.5 },
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
    id: 'diary',
    name: 'Diary',
    decor: 'diary',
    cells: [cell('a', 0, 0, 1, 0.58)],
    textAnchor: { x: 0.5, y: 0.78 },
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
  return 'six';
}

/** Gap between cells as a fraction of canvas width. */
export const GAP_FRACTION = { none: 0, thin: 0.008, thick: 0.022 } as const;
