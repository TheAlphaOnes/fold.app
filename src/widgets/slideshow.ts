/**
 * Widget snapshots — the three home screen surfaces, derived from the journal.
 *
 * Pure by design: the app turns memories into small, serializable props here,
 * and the widgets' isolated runtimes only render them. Images are copied into
 * the shared widgets directory by the sync layer; these functions decide
 * which memories appear, how they are captioned, and when each surface
 * moves — the slideshow steps through its show, the wall stands still, and
 * the ring turns like the story's own wheel.
 */

import type { Composition, MediaElement } from '@/types/journal';
import { STICKER_BASE_WIDTH } from '@/canvas/geometry';
import { ringSpot } from '@/templates/arrangements';
import { dealColumns, wallPieces, type WallPiece } from '@/utils/past-wall';

/** One slide of the memories widget. */
export interface MemorySlide {
  /** The memory this slide opens. */
  id: number;
  /** file:// URI inside the widgets directory. */
  uri: string;
  /** One quiet line: place, else date, else the words. */
  caption: string;
}

/** Props for one timeline entry of the memories widget. */
export interface SlideshowProps {
  /** True when the journal has no memories yet — the widget waits quietly. */
  empty: boolean;
  id: number;
  uri: string;
  caption: string;
  /** 1-based position in the show. */
  index: number;
  total: number;
}

/** One tile of the waterfall widget. */
export interface WallTile {
  id: number;
  uri: string;
  /** The memory's one quiet line, for tiles without a picture. */
  words?: string;
  /** Tile height in points at the widget's column width. */
  height: number;
  /** 0 or 1 — which column the tile sits in. */
  column: number;
}

/** Props for the waterfall widget. */
export interface WallProps {
  tiles: WallTile[];
}

/** One photo of the ring widget, placed by the story's own ring geometry. */
export interface RingTile {
  /** The memory this photo opens. */
  id: number;
  uri: string;
  /** 0..1 across the widget. */
  x: number;
  /** 0..1 down the widget. */
  y: number;
  /** Photo side as a fraction of the widget's width. */
  size: number;
  /** The story's wobble, degrees. */
  rotation: number;
}

/** Props for one timeline entry of the ring widget. */
export interface RingProps {
  tiles: RingTile[];
  /** How far the whole ring has turned, in degrees. */
  angle: number;
}

/** Turns a media element into the file:// URI of its widget copy — the sync layer's job. */
export type UriResolver = (media: MediaElement) => string;

/** How often the slideshow advances, in minutes. */
export const SLIDE_STEP_MINUTES = 45;

/** How many slides one timeline carries. */
export const SLIDE_COUNT = 8;

/** How many tiles the waterfall shows. */
export const WALL_TILE_COUNT = 6;

/** Column width the tile heights are computed against. */
export const WALL_COLUMN_WIDTH = 150;

/** How many photos the ring carries. */
export const RING_TILE_COUNT = 8;

/** How often the ring turns to its next photo, in minutes. */
export const RING_STEP_MINUTES = 45;

/** How many full turns one pushed ring timeline carries. */
export const RING_REVOLUTIONS = 3;

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** A photo or video that can stand alone as a tile (GIFs and stamps are stickers). */
export function isPicture(media: MediaElement): boolean {
  return (media.type === 'image' || media.type === 'video') && !media.isGif && !media.isStamp;
}

/** The first picture of a memory, if it has one. */
export function pictureOf(memory: Composition): MediaElement | undefined {
  return memory.mediaElements.find(isPicture);
}

/** "NOV 12 '26" — the wall's date label. */
export function shortDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${MONTHS[date.getMonth()]} ${date.getDate()} '${String(date.getFullYear()).slice(2)}`;
}

/**
 * One quiet line for a slide: the place when the memory has one, else the
 * first few words, else the date. Never empty.
 */
export function captionFor(memory: Composition): string {
  const place = memory.location?.name?.trim();
  if (place) return place;
  const words = memory.textContent.trim().replace(/\s+/g, ' ');
  if (words) return words.length > 42 ? `${words.slice(0, 42).trimEnd()}…` : words;
  return shortDate(memory.createdAt);
}

/**
 * The slideshow's timeline: one entry per slide, `SLIDE_STEP_MINUTES` apart,
 * starting now. WidgetKit advances through them on its own and cross-fades
 * every change, so the show keeps moving even when the app never opens.
 */
export function buildSlideshowTimeline(
  slides: readonly MemorySlide[],
  now: Date,
  stepMinutes: number = SLIDE_STEP_MINUTES,
): { date: Date; props: SlideshowProps }[] {
  return slides.map((slide, index) => ({
    date: new Date(now.getTime() + index * stepMinutes * 60_000),
    props: {
      empty: false,
      id: slide.id,
      uri: slide.uri,
      caption: slide.caption,
      index: index + 1,
      total: slides.length,
    },
  }));
}

/**
 * Tile height for a photo at a column width, clamped so a panorama and a
 * portrait both stay readable — the same bounds the profile wall uses.
 */
export function tileHeightFor(media: MediaElement | undefined, width: number): number {
  if (media?.width && media?.height) {
    const aspect = Math.min(1.6, Math.max(0.65, media.width / media.height));
    return Math.round(width / aspect);
  }
  return Math.round(width * 1.1);
}

/**
 * The waterfall's tiles: memories dealt into two columns (the profile's own
 * `dealColumns`), flattened with their column and height so the widget can
 * lay them out without any logic of its own.
 */
export function buildWallTiles(
  memories: readonly Composition[],
  width: number = WALL_COLUMN_WIDTH,
  columns: number = 2,
  limit: number = WALL_TILE_COUNT,
  resolveUri: UriResolver = () => '',
): WallTile[] {
  const dealt = dealColumns(wallPieces([...memories]), columns);
  const tiles: WallTile[] = [];
  const perColumn = Math.ceil(limit / columns);
  dealt.forEach((column, columnIndex) => {
    column.slice(0, perColumn).forEach(({ memory, media }) => {
      tiles.push({
        id: memory.id,
        uri: media ? resolveUri(media) : '',
        // A memory with no picture still takes its place on the wall, its
        // words standing in for the photo — like the profile's own wall.
        words: media ? undefined : captionFor(memory),
        height: tileHeightFor(media, width),
        column: columnIndex,
      });
    });
  });
  return tiles;
}

/**
 * The ring's photos: the story's own `ringSpot` geometry — the same circle,
 * radius and wobble a saved Ring memory uses — flattened to what a widget
 * needs. `size` is a fraction of the widget's width (the sticker base the
 * story scales by), so every family renders the same ring at its own scale.
 * Words-only memories have nothing to pin to the wheel and are skipped.
 */
export function buildRingTiles(
  memories: readonly Composition[],
  count: number = RING_TILE_COUNT,
  resolveUri: UriResolver = () => '',
): RingTile[] {
  const pieces = wallPieces([...memories])
    .filter((piece): piece is WallPiece & { media: MediaElement } => piece.media !== undefined)
    .slice(0, count);
  return pieces.map(({ memory, media }, index) => {
    const spot = ringSpot(index, pieces.length);
    return {
      id: memory.id,
      uri: resolveUri(media),
      x: spot.x,
      y: spot.y,
      size: spot.scale * STICKER_BASE_WIDTH.portrait,
      rotation: spot.rotation,
    };
  });
}

/**
 * The ring's timeline: one entry per slot of the wheel, each turn stepping
 * the group by exactly one photo, for `RING_REVOLUTIONS` full turns. Every
 * cross-fade lands with a photo at the top, so the ring reads as the wheel
 * drifting to its next memory — the story's slow turn, stilled into widget
 * time.
 */
export function buildRingTimeline(
  tiles: readonly RingTile[],
  now: Date,
  stepMinutes: number = RING_STEP_MINUTES,
  revolutions: number = RING_REVOLUTIONS,
): { date: Date; props: RingProps }[] {
  if (tiles.length === 0) return [];
  const turn = 360 / tiles.length;
  const steps = tiles.length * revolutions;
  return Array.from({ length: steps }, (_, index) => ({
    date: new Date(now.getTime() + index * stepMinutes * 60_000),
    props: { tiles: [...tiles], angle: (index * turn) % 360 },
  }));
}
