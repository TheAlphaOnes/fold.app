/**
 * Doodles — pen strokes drawn on the canvas, kept as plain numbers so they
 * draw the same at any size and can be unit tested.
 *
 * A stroke's points are a flat [x0, y0, x1, y1, …] list in canvas-width
 * units, relative to the layer's centre; the layer's own x/y place that
 * centre, so a doodle moves, turns and resizes like any other sticker.
 *
 * The live look is a hand-drawn "boil": each stroke is redrawn in a few
 * slightly different wobbles that swap a few times a second, the way a
 * hand-animated line never sits perfectly still.
 */

import type { DoodleStroke } from '@/canvas/types';

/** How many wobble frames the boil cycles through. */
export const BOIL_FRAMES = 3;

/** Pen widths, as fractions of the canvas width. */
export const PEN_WIDTHS = [0.008, 0.014, 0.024] as const;

/**
 * Turns strokes captured in canvas pixels into a doodle: its centre
 * (normalised, for the layer's x/y) and strokes relative to that centre.
 */
export function toDoodle(strokes: number[][], width: number, height: number): { x: number; y: number; strokes: DoodleStroke[] } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of strokes) {
    for (let i = 0; i < s.length; i += 2) {
      minX = Math.min(minX, s[i]);
      maxX = Math.max(maxX, s[i]);
      minY = Math.min(minY, s[i + 1]);
      maxY = Math.max(maxY, s[i + 1]);
    }
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return {
    x: cx / width,
    y: cy / height,
    strokes: strokes.map((s) => ({ points: s.map((v, i) => round((i % 2 === 0 ? v - cx : v - cy) / width)) })),
  };
}

/** Half the doodle's extent from its centre, in canvas-width units. */
export function doodleExtent(strokes: DoodleStroke[]): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (const s of strokes) {
    for (let i = 0; i < s.points.length; i += 2) {
      x = Math.max(x, Math.abs(s.points[i]));
      y = Math.max(y, Math.abs(s.points[i + 1]));
    }
  }
  return { x, y };
}

/**
 * A stroke nudged for boil frame `frame`: each point drifts by up to `amp`,
 * smoothly along the stroke (so the line wiggles rather than jitters) and
 * differently in each frame. Frame 0 is the stroke as drawn.
 */
export function wobble(points: number[], frame: number, amp: number, seed = 0): number[] {
  if (frame === 0 || amp === 0) return points;
  const phase = frame * 2.39 + seed * 1.13;
  return points.map((v, i) => {
    const k = i >> 1;
    const axis = i % 2;
    return v + amp * Math.sin(k * 0.55 + phase + axis * 1.7) * Math.cos(k * 0.21 + phase * 0.6);
  });
}

/**
 * An SVG path through the points, smoothed with quadratic curves through
 * the midpoints. `unit` scales canvas-width units to pixels and `offset`
 * moves the centre into the drawing box. A single tap draws a dot.
 */
export function strokePath(points: number[], unit: number, offset: { x: number; y: number }): string {
  const px = (i: number) => fmt(points[i] * unit + offset.x);
  const py = (i: number) => fmt(points[i + 1] * unit + offset.y);
  const n = points.length / 2;
  if (n === 0) return '';
  if (n === 1) return `M${px(0)} ${py(0)}l0.01 0`;
  let d = `M${px(0)} ${py(0)}`;
  for (let k = 1; k < n - 1; k++) {
    const i = k * 2;
    const mx = fmt(((points[i] + points[i + 2]) / 2) * unit + offset.x);
    const my = fmt(((points[i + 1] + points[i + 3]) / 2) * unit + offset.y);
    d += `Q${px(i)} ${py(i)} ${mx} ${my}`;
  }
  const last = (n - 1) * 2;
  return `${d}L${px(last)} ${py(last)}`;
}

/** A stroke's length along its points, in canvas-width units. */
export function strokeLength(points: number[]): number {
  let length = 0;
  for (let i = 2; i < points.length; i += 2) length += Math.hypot(points[i] - points[i - 2], points[i + 1] - points[i - 1]);
  return length;
}

const round = (v: number) => Math.round(v * 10000) / 10000;
const fmt = (v: number) => Math.round(v * 10) / 10;

/** Draw-in pacing: ms per canvas width of line (clamped) and the beat between strokes. */
const DRAW_MS_PER_UNIT = 900;
const DRAW_MIN_MS = 160;
const DRAW_MAX_MS = 700;
const DRAW_STAGGER_MS = 70;

/**
 * When each stroke traces itself in, given stroke lengths in canvas-width
 * units: longer lines take longer, and each starts a beat into the one
 * before, so the drawing builds up in overlapping segments.
 */
export function drawInSchedule(lengths: number[]): { delay: number; duration: number }[] {
  const out: { delay: number; duration: number }[] = [];
  let start = 0;
  for (const length of lengths) {
    const duration = Math.min(DRAW_MAX_MS, Math.max(DRAW_MIN_MS, length * DRAW_MS_PER_UNIT));
    out.push({ delay: start, duration });
    start += DRAW_STAGGER_MS + duration * 0.6;
  }
  return out;
}
