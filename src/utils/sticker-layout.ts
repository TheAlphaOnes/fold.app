/**
 * Sticker layout — arranges a memory's media into a tidy collage on its card.
 *
 * Rules:
 *  - The text (when there is any) keeps a clear band through the middle of
 *    the card, sized from its real font metrics; media goes above and below.
 *  - Each region packs its stickers into centred rows with an alternating
 *    vertical stagger, so it reads as collected, not gridded.
 *  - Fewer stickers are shown larger; when a region cannot fit its stickers
 *    they shrink step by step until nothing overlaps.
 *  - Nothing sits under the timestamp row at the bottom of the card.
 *
 * Positions use the sticker's own coordinate convention (DraggableSticker):
 * x/y are the top-left of the unscaled frame, and scale grows it around its
 * centre — so a visual top-left is converted back before storing.
 */

import type { MediaElement } from '@/types/journal';
import { memoryTextMetrics } from '@/utils/memory-text';

export interface StickerFrame {
  width: number;
  height: number;
}

/** The fixed frame DraggableSticker renders for a media element. */
export function stickerFrame(media: Pick<MediaElement, 'type' | 'metadata' | 'width' | 'height'>): StickerFrame {
  if (media.type === 'audio' && media.metadata) return { width: 140, height: 180 };
  const horizontal = media.width && media.height ? media.width > media.height : false;
  return horizontal ? { width: 120, height: 90 } : { width: 90, height: 120 };
}

export interface LayoutCard {
  width: number;
  height: number;
}

export interface LayoutText {
  content: string;
  fontFamily: string;
  fontSize: number;
}

const EDGE = 18;
const TOP_SAFE = 22;
/** Clearance for the timestamp/location row at the bottom of the card. */
const BOTTOM_SAFE = 58;
const GAP = 12;
const STAGGER = 8;
const TEXT_INSET = 24;
const TEXT_MARGIN = 16;
const MIN_SCALE = 0.55;

/** Starting size by how many stickers share the card. */
function baseScaleFor(count: number): number {
  if (count <= 2) return 1.45;
  if (count <= 4) return 1.2;
  if (count <= 6) return 1.05;
  return 0.95;
}

/** Estimated height of the centred text block, using the card's own metrics. */
function textBandHeight(text: LayoutText | null, card: LayoutCard): number {
  if (!text || !text.content.trim()) return 0;
  const metrics = memoryTextMetrics(text.fontFamily, text.fontSize);
  const usable = card.width - TEXT_INSET * 2;
  // Monospace-ish estimate: average glyph is ~0.6em wide.
  const charsPerLine = Math.max(8, Math.floor(usable / (metrics.fontSize * 0.6)));
  const lines = text.content
    .trim()
    .split('\n')
    .reduce((sum, paragraph) => sum + Math.max(1, Math.ceil(paragraph.length / charsPerLine)), 0);
  const visibleLines = Math.min(lines, 13);
  return visibleLines * metrics.lineHeight + metrics.paddingTop + metrics.paddingBottom + TEXT_MARGIN * 2;
}

interface Placed {
  id: string;
  /** Visual (scaled) top-left. */
  left: number;
  top: number;
  scale: number;
}

/**
 * Pack items into centred rows inside a region. Returns null when they do not
 * fit at this scale.
 */
function packRegion(
  items: MediaElement[],
  region: { top: number; height: number; width: number },
  scale: number,
): Placed[] | null {
  if (items.length === 0) return [];
  const usableWidth = region.width - EDGE * 2;

  const rows: { items: MediaElement[]; width: number; height: number }[] = [];
  let current = { items: [] as MediaElement[], width: 0, height: 0 };
  for (const item of items) {
    const frame = stickerFrame(item);
    const w = frame.width * scale;
    const h = frame.height * scale;
    if (w > usableWidth) return null;
    const nextWidth = current.items.length === 0 ? w : current.width + GAP + w;
    if (nextWidth > usableWidth && current.items.length > 0) {
      rows.push(current);
      current = { items: [], width: 0, height: 0 };
    }
    current.items.push(item);
    current.width = current.items.length === 1 ? w : current.width + GAP + w;
    current.height = Math.max(current.height, h);
  }
  if (current.items.length > 0) rows.push(current);

  const blockHeight = rows.reduce((sum, row) => sum + row.height, 0) + GAP * (rows.length - 1) + STAGGER;
  if (blockHeight > region.height) return null;

  const placed: Placed[] = [];
  let y = region.top + (region.height - blockHeight) / 2;
  let alternate = 0;
  for (const row of rows) {
    let x = EDGE + (usableWidth - row.width) / 2;
    for (const item of row.items) {
      const frame = stickerFrame(item);
      const w = frame.width * scale;
      const h = frame.height * scale;
      // Alternate a small vertical offset and centre shorter items in the row.
      const stagger = alternate % 2 === 0 ? 0 : STAGGER;
      placed.push({ id: item.id, left: x, top: y + (row.height - h) / 2 + stagger, scale });
      x += w + GAP;
      alternate += 1;
    }
    y += row.height + GAP;
  }
  return placed;
}

/**
 * Returns the media elements with tidy positions and scales. Audio-only
 * voice notes and photos are treated alike; only frame sizes differ.
 */
export function arrangeStickers(
  elements: MediaElement[],
  card: LayoutCard,
  text: LayoutText | null,
): MediaElement[] {
  if (elements.length < 2) return elements; // a single item uses the hero layout

  const contentTop = TOP_SAFE;
  const contentBottom = card.height - BOTTOM_SAFE;
  const band = textBandHeight(text, card);

  // Regions: with text, above and below a centred band; without, the whole card.
  const regions =
    band > 0
      ? (() => {
          const bandTop = Math.max(contentTop, card.height / 2 - band / 2);
          const bandBottom = Math.min(contentBottom, card.height / 2 + band / 2);
          return [
            { top: contentTop, height: Math.max(0, bandTop - contentTop), width: card.width },
            { top: bandBottom, height: Math.max(0, contentBottom - bandBottom), width: card.width },
          ];
        })()
      : [{ top: contentTop, height: contentBottom - contentTop, width: card.width }];

  // Deal stickers between regions in proportion to their height.
  const groups: MediaElement[][] = regions.map(() => []);
  if (regions.length === 1) {
    groups[0] = [...elements];
  } else {
    const totalHeight = regions[0].height + regions[1].height || 1;
    const topShare = Math.round((elements.length * regions[0].height) / totalHeight);
    groups[0] = elements.slice(0, topShare);
    groups[1] = elements.slice(topShare);
  }

  let scale = baseScaleFor(elements.length);
  let placed: Placed[] | null = null;
  while (scale >= MIN_SCALE) {
    const attempt = regions.map((region, index) => packRegion(groups[index], region, scale));
    if (attempt.every((result) => result !== null)) {
      placed = attempt.flat() as Placed[];
      break;
    }
    scale = Math.round((scale - 0.05) * 100) / 100;
  }
  // Too many to fit even at the minimum: fall back to one region over the whole card.
  if (!placed) {
    placed =
      packRegion(elements, { top: contentTop, height: contentBottom - contentTop, width: card.width }, MIN_SCALE) ?? [];
  }

  const byId = new Map(placed.map((p) => [p.id, p]));
  return elements.map((element) => {
    const spot = byId.get(element.id);
    if (!spot) return element;
    const frame = stickerFrame(element);
    // Scaling is about the frame's centre, so the visual box starts at
    // x + w(1 - s)/2. Invert that to get the stored, unscaled top-left.
    return {
      ...element,
      x_pos: Math.round(spot.left + (frame.width * (spot.scale - 1)) / 2),
      y_pos: Math.round(spot.top + (frame.height * (spot.scale - 1)) / 2),
      scale: spot.scale,
    };
  });
}
