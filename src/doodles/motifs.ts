/**
 * Motifs — the recurring touches that make the library cute rather than
 * merely drawn: a little face with blush, a sparkle, a flower, a rounded
 * box. Each returns ink groups, ready to spread into `doodle(...)`.
 */

import { arc, around, circle, curve, dot, petal, place, star, type Line } from '@/doodles/kit';
import type { Ink } from '@/doodles/palette';

export type Group = [Ink, ...Line[]];

/** A tiny face: dot eyes, a small smile and rosy cheeks. `s` scales it. */
export function face(cx: number, cy: number, s = 1, ink: Ink = 'ink'): Group[] {
  return [
    [ink, dot(cx - 0.06 * s, cy), dot(cx + 0.06 * s, cy), arc(cx, cy + 0.025 * s, 0.03 * s, 0.025 * s, 20, 140)],
    ['rose', dot(cx - 0.11 * s, cy + 0.045 * s), dot(cx + 0.11 * s, cy + 0.045 * s)],
  ];
}

/** A sleepy face: closed eyes curved down, cheeks. */
export function sleepyFace(cx: number, cy: number, s = 1): Group[] {
  return [
    ['ink', arc(cx - 0.06 * s, cy, 0.03 * s, 0.02 * s, 0, 180), arc(cx + 0.06 * s, cy, 0.03 * s, 0.02 * s, 0, 180)],
    ['rose', dot(cx - 0.11 * s, cy + 0.05 * s), dot(cx + 0.11 * s, cy + 0.05 * s)],
  ];
}

/** A four-point sparkle. */
export const sparkle = (cx: number, cy: number, r = 0.06): Line => star(cx, cy, r, 4, 0.32);

/** A flower head: `n` round petals around a centre. */
export function bloom(cx: number, cy: number, n: number, r: number, ink: Ink, centre: Ink = 'butter', pointed = false): Group[] {
  return [
    [ink, ...around(n, cx, cy, (a) => petal(cx, cy, a, r, r * (pointed ? 0.5 : 0.75), pointed))],
    [centre, circle(cx, cy, r * 0.28)],
  ];
}

/** A rounded rectangle, corner radius `r`. */
export function box(cx: number, cy: number, w: number, h: number, r = 0.06): Line {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = cy - h / 2;
  const y1 = cy + h / 2;
  return curve(
    [
      [x0 + r, y0],
      [x1 - r, y0],
      [x1, y0 + r],
      [x1, y1 - r],
      [x1 - r, y1],
      [x0 + r, y1],
      [x0, y1 - r],
      [x0, y0 + r],
    ],
    true,
    4,
  );
}

/** A gently bent stem from (x1, y1) up to (x2, y2). */
export const stem = (x1: number, y1: number, x2: number, y2: number, bend = 0.04): Line =>
  curve([[x1, y1], [(x1 + x2) / 2 + bend, (y1 + y2) / 2], [x2, y2]]);

/** A small leaf on a stem, at (x, y) pointing along `angle`. */
export const sprig = (x: number, y: number, angle: number, len = 0.16): Line => petal(x, y, angle, len, len * 0.45, true);

/** Whiskers either side of (cx, cy). */
export function whiskers(cx: number, cy: number, w = 0.18): Line[] {
  return [
    curve([[cx - 0.08, cy], [cx - w, cy - 0.03]]),
    curve([[cx - 0.08, cy + 0.03], [cx - w, cy + 0.05]]),
    curve([[cx + 0.08, cy], [cx + w, cy - 0.03]]),
    curve([[cx + 0.08, cy + 0.03], [cx + w, cy + 0.05]]),
  ];
}

/** Turns a whole group of lines about (cx, cy). */
export const turned = (lines: Line[], angle: number, cx = 0, cy = 0): Line[] =>
  lines.map((l) => place(l.map((v, i) => v - (i % 2 === 0 ? cx : cy)), cx, cy, angle));
