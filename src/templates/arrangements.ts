/**
 * Arranged templates — photos placed as stickers in a shape, each shape
 * with its own gentle motion when the canvas is live:
 *
 *   Ring    evenly round a circle      the ring turns; each photo stays upright
 *   Fan     a hand of cards            each card sways
 *   Deck    a pile of prints           the top print swings out and tucks
 *                                      under, so every photo comes to the top
 *   Float   scattered loosely          each photo bobs on its own
 *
 * Spots are pure (normalised x/y, scale, rotation) so every arrangement is
 * tested and draws the same in the editor, the feed and the export.
 * Motion runs on the UI thread and only on the live canvas (see
 * render/arrangement-motion); the editor and exports stay still.
 */

import { CANVAS_ASPECT } from '@/canvas/geometry';
import type { ArrangedTemplateId, MediaSticker } from '@/canvas/types';

export type Spot = Pick<MediaSticker, 'x' | 'y' | 'scale' | 'rotation'>;

/** How an arrangement moves when live. `group` turns the whole shape; `item` moves each photo on its own. */
export type ArrangementMotion =
  | { kind: 'group'; degreesPerSecond: number }
  | { kind: 'item'; style: 'sway' | 'bob' }
  | { kind: 'deck' };

interface Arrangement {
  name: string;
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

/** Spread in an arc from a point low on the card, each card turned along the arc. */
export function fanSpot(index: number, count: number): Spot {
  const spread = Math.min(80, 18 * Math.max(1, count - 1));
  const degrees = count <= 1 ? 0 : -spread / 2 + (index / (count - 1)) * spread;
  const angle = (degrees * Math.PI) / 180;
  const reach = 0.3;
  return {
    x: 0.5 + reach * Math.sin(angle),
    y: 0.62 - vertical(reach) * Math.cos(angle),
    scale: count <= 4 ? 1.15 : count <= 7 ? 1 : 0.85,
    rotation: degrees,
  };
}

/** A messy pile in the middle: big prints, each nudged and turned a little differently. */
export function stackSpot(index: number): Spot {
  return {
    x: 0.5 + wobble(index, 7) * 0.05,
    y: 0.47 + wobble(index, 11) * 0.03,
    scale: 1.45,
    rotation: wobble(index, 13) * 11,
  };
}

/** Scattered over a loose grid, leaving the lower third for words. */
export function floatSpot(index: number, count: number): Spot {
  const cols = count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: (col + 0.5) / cols + wobble(index, 5) * 0.05,
    y: 0.14 + ((row + 0.5) / rows) * 0.52 + wobble(index, 3) * 0.025,
    scale: cols === 2 ? 1 : 0.8,
    rotation: wobble(index, 9) * 8,
  };
}

export const ARRANGEMENTS: Record<ArrangedTemplateId, Arrangement> = {
  ring: { name: 'Ring', spot: ringSpot, motion: { kind: 'group', degreesPerSecond: 4 } },
  fan: { name: 'Fan', spot: fanSpot, motion: { kind: 'item', style: 'sway' } },
  stack: { name: 'Deck', spot: (i) => stackSpot(i), motion: { kind: 'deck' } },
  float: { name: 'Float', spot: floatSpot, motion: { kind: 'item', style: 'bob' } },
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
export const TEMPLATE_ALIASES: Record<string, ArrangedTemplateId> = { spiral: 'ring' };
