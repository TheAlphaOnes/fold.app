/**
 * Canvas geometry: the canvas aspect, safe zones, and snapping. Pure
 * functions, so they can be unit tested and called from worklets.
 */

/** Width / height of every canvas (9:16, like a story). */
export const CANVAS_ASPECT = 9 / 16;

/** Export size for sharing: a full-resolution story frame. */
export const EXPORT_SIZE = { width: 1080, height: 1920 } as const;

/** Bands kept clear of default placements (fractions of canvas height). */
export const SAFE_ZONE = { top: 0.12, bottom: 0.16, side: 0.06 } as const;

/** Distance (normalised) at which a dragged layer snaps to a guide. */
export const SNAP_DISTANCE = 0.018;

export interface Size {
  width: number;
  height: number;
}

/** The largest 9:16 box that fits inside `bounds`. */
export function fitCanvas(bounds: Size): Size {
  const width = Math.min(bounds.width, bounds.height * CANVAS_ASPECT);
  return { width, height: width / CANVAS_ASPECT };
}

export function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

export interface SnapResult {
  x: number;
  y: number;
  snappedX: boolean;
  snappedY: boolean;
}

/** Snaps a normalised centre point to the canvas's vertical/horizontal centre lines. */
export function snapToCentre(x: number, y: number): SnapResult {
  'worklet';
  const snappedX = Math.abs(x - 0.5) < SNAP_DISTANCE;
  const snappedY = Math.abs(y - 0.5) < SNAP_DISTANCE;
  return { x: snappedX ? 0.5 : x, y: snappedY ? 0.5 : y, snappedX, snappedY };
}

/** Degrees from straight (0/90/180/270) within which a twist snaps level. */
export const ROTATION_SNAP = 4;

/** A twist near a right angle settles exactly on it, so straight is easy to hit. */
export function snapRotation(degrees: number): { rotation: number; snapped: boolean } {
  'worklet';
  const nearest = Math.round(degrees / 90) * 90;
  const snapped = Math.abs(degrees - nearest) < ROTATION_SNAP;
  return { rotation: snapped ? nearest : degrees, snapped };
}

/** Short random id for layers and media. */
export function newId(): string {
  return Math.random().toString(36).slice(2, 9);
}
