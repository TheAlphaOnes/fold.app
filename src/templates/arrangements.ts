/**
 * Arranged templates — photos placed as stickers in a shape, each shape
 * with its own gentle motion when the canvas is live:
 *
 *   Ring    evenly round a circle      the ring turns; each photo stays upright
 *   Fan     a hand of big cards        it closes into a stack and fans back open
 *   Deck    a pile of prints           the top print swings out and tucks
 *                                      under, so every photo comes to the top
 *
 * Spots are pure (normalised x/y, scale, rotation) so every arrangement is
 * tested and draws the same in the editor, the feed and the export.
 * Motion runs on the UI thread and only on the live canvas (see
 * render/arrangement-motion); the editor and exports stay still.
 */

import { CANVAS_ASPECT, STICKER_BASE_WIDTH } from '@/canvas/geometry';
import type { ArrangedTemplateId, MediaSticker, StickerShape } from '@/canvas/types';

export type Spot = Pick<MediaSticker, 'x' | 'y' | 'scale' | 'rotation'>;

/** How an arrangement moves when live. `group` turns the whole shape; `item` moves each photo on its own. */
export type ArrangementMotion =
  | { kind: 'group'; degreesPerSecond: number }
  /** The hand closes into a stack and fans back open, card after card. */
  | { kind: 'fan' }
  | { kind: 'deck' };

interface Arrangement {
  name: string;
  /** Forces every photo into this sticker shape (Fan and Deck use uniform cards). */
  shape?: StickerShape;
  spot: (index: number, count: number) => Spot;
  motion: ArrangementMotion;
}

/** Ring radius, as a fraction of the canvas width. */
export const RING_RADIUS = 0.34;

/** y is a fraction of the 9:16 height: shrink width-based distances so shapes stay round. */
const vertical = (widths: number) => widths * CANVAS_ASPECT;

/** A deterministic wobble in [-1, 1] for photo `i` (the same every render). */
const wobble = (i: number, seed: number) => (((i * seed) % 17) - 8) / 8;

export function ringSpot(index: number, count: number): Spot {
  const angle = -Math.PI / 2 + (index / Math.max(1, count)) * Math.PI * 2;
  // Neighbours just overlap (like the story wheel) and the middle stays open.
  const scale = count <= 4 ? 1.1 : count <= 6 ? 0.95 : count <= 9 ? 0.8 : 0.7;
  return {
    x: 0.5 + RING_RADIUS * Math.cos(angle),
    y: 0.5 + vertical(RING_RADIUS) * Math.sin(angle),
    scale,
    rotation: index % 2 === 0 ? -4 : 4,
  };
}

/** A card's scale for a target width (fraction of the canvas width): cards are portrait prints. */
const cardScale = (widthFraction: number) => widthFraction / STICKER_BASE_WIDTH.portrait;

/**
 * A hand of cards: big prints spread in an arc from a point below the
 * middle, each turned along the arc; fewer cards spread less and are larger.
 */
export function fanSpot(index: number, count: number): Spot {
  // Wide enough to read as a hand, narrow enough that the outer cards stay on the card.
  const spread = Math.min(56, 14 * Math.max(1, count - 1));
  const degrees = count <= 1 ? 0 : -spread / 2 + (index / (count - 1)) * spread;
  const angle = (degrees * Math.PI) / 180;
  const reach = 0.34;
  return {
    x: 0.5 + reach * Math.sin(angle),
    y: 0.5 + vertical(reach) * (1 - Math.cos(angle)) + 0.02,
    scale: cardScale(count <= 3 ? 0.48 : count <= 6 ? 0.42 : 0.38),
    rotation: degrees,
  };
}

/** A pile of big prints in the middle, each turned a little differently. */
export function stackSpot(index: number): Spot {
  return {
    x: 0.5 + wobble(index, 7) * 0.025,
    y: 0.47 + wobble(index, 11) * 0.012,
    scale: cardScale(0.66),
    rotation: wobble(index, 13) * 6,
  };
}

export const ARRANGEMENTS: Record<ArrangedTemplateId, Arrangement> = {
  ring: { name: 'Ring', spot: ringSpot, motion: { kind: 'group', degreesPerSecond: 4 } },
  fan: { name: 'Fan', shape: 'card', spot: fanSpot, motion: { kind: 'fan' } },
  stack: { name: 'Deck', shape: 'card', spot: (i) => stackSpot(i), motion: { kind: 'deck' } },
};

export const ARRANGED_IDS = Object.keys(ARRANGEMENTS) as ArrangedTemplateId[];

export function isArranged(template: string): template is ArrangedTemplateId {
  return template in ARRANGEMENTS;
}

/**
 * Deck order after `step` flips: which card is on top, and each card's
 * depth (0 = top). Card i is drawn i-th, so the last one starts on top;
 * each flip sends the top card to the back and lifts the rest by one.
 */
export function deckDepth(index: number, count: number, step: number): number {
  const startDepth = count - 1 - index;
  return (((startDepth - step) % count) + count) % count;
}

export function deckTop(count: number, step: number): number {
  return count - 1 - (((step % count) + count) % count);
}

/** Retired template ids mapped to what replaced them, so saved memories still open. */
export const TEMPLATE_ALIASES: Record<string, ArrangedTemplateId> = { spiral: 'ring', float: 'fan' };
