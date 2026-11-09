/**
 * Canvas model — a memory as a finished, story-style canvas.
 *
 * Every position and size is normalised: x/y are fractions (0–1) of the
 * canvas width/height, sizes are fractions of the canvas width. A canvas
 * therefore draws the same at any size (feed card, full screen, 1080×1920
 * export) and on any phone.
 *
 * The media files themselves stay in Composition.mediaElements; the canvas
 * refers to them by id.
 */

export type GridLayoutId =
  | 'duo-stack'
  | 'duo-side'
  | 'trio-strips'
  | 'trio-columns'
  | 'hero'
  | 'quad'
  | 'film'
  | 'six'
  | 'diary'
  | 'polaroid';

export type TemplateId = 'story' | 'text' | 'stickers' | 'ring' | `grid:${GridLayoutId}`;

/** Pan/zoom of media inside its frame. x/y: offset as a fraction of the frame; scale ≥ 1. */
export interface Crop {
  x: number;
  y: number;
  scale: number;
}

export type Background =
  /** Fold's animated diagonal stripes on the card colour. */
  | { kind: 'stripes' }
  | { kind: 'color'; color: string }
  /** A photo or video filling the canvas (Story). */
  | { kind: 'media'; mediaId: string; crop: Crop };

export interface CellFill {
  cellId: string;
  mediaId?: string;
  crop: Crop;
  mirrored?: boolean;
}

export type GapSize = 'none' | 'thin' | 'thick';

interface LayerBase {
  id: string;
  /** Centre of the layer, normalised. */
  x: number;
  y: number;
  /** Multiplier on the layer's base size. */
  scale: number;
  /** Degrees. */
  rotation: number;
}

export type TextStyle = 'plain' | 'highlight';
export type TextAlign = 'left' | 'center' | 'right';

export interface TextLayer extends LayerBase {
  kind: 'text';
  text: string;
  font: string;
  /** Hex ink, or null for the theme's text colour. */
  color: string | null;
  align: TextAlign;
  style: TextStyle;
  /** Font size as a fraction of canvas width (0.06 ≈ 23pt on a 390pt card). */
  size: number;
}

export type StickerShape = 'rounded' | 'square' | 'circle' | 'polaroid' | 'stamp' | 'tape' | 'heart' | 'star' | 'arch';

export interface MediaSticker extends LayerBase {
  kind: 'media';
  mediaId: string;
  shape: StickerShape;
  /**
   * Placed by the Stickers template itself (every photo becomes a sticker
   * there). Leaving that template hands these photos back to the base;
   * stickers the user added from the sticker sheet stay put.
   */
  auto?: boolean;
}

/** A song or voice note, drawn as a disc you can tap to play. */
export interface AudioSticker extends LayerBase {
  kind: 'audio';
  mediaId: string;
}

export interface LocationSticker extends LayerBase {
  kind: 'location';
}

export type DateStickerStyle = 'stamp' | 'mono';

export interface DateSticker extends LayerBase {
  kind: 'date';
  style: DateStickerStyle;
}

export type Layer = TextLayer | MediaSticker | AudioSticker | LocationSticker | DateSticker;

export interface CanvasDoc {
  version: 1;
  template: TemplateId;
  background: Background;
  /** Grid templates: what fills each cell. */
  cells?: CellFill[];
  gap?: GapSize;
  /** Painted in array order: last is on top. */
  layers: Layer[];
}

export const NO_CROP: Crop = { x: 0, y: 0, scale: 1 };
