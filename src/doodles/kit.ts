/**
 * Doodle kit — the small set of hand-drawing moves every library doodle is
 * written with, so all 366 share one hand.
 *
 * Everything is drawn in a unit box: x and y run from -0.5 to 0.5 around
 * the centre, y pointing down. A line is a flat [x0, y0, x1, y1, …] list,
 * the same shape the doodle engine (`canvas/doodle.ts`) stores pen strokes
 * in, so a library doodle draws, brushes and boils exactly like one drawn
 * by hand in the app. Closed shapes overshoot their start a little, the way
 * a pen does when it closes a loop.
 */

export type Pt = readonly [number, number];
export type Line = number[];

const rad = (deg: number) => (deg * Math.PI) / 180;
const r4 = (v: number) => Math.round(v * 10000) / 10000;

function flat(pts: readonly Pt[]): Line {
  const out: Line = [];
  for (const [x, y] of pts) out.push(r4(x), r4(y));
  return out;
}

/**
 * A smooth line through the points (centripetal Catmull–Rom). `closed`
 * joins the end back to the start and runs a little past it.
 */
export function curve(points: readonly Pt[], closed = false, samples = 6): Line {
  if (points.length < 2) return flat(points);
  const pts = closed ? [...points, points[0]] : [...points];
  const at = (i: number): Pt => {
    if (closed) return points[((i % points.length) + points.length) % points.length];
    return pts[Math.max(0, Math.min(pts.length - 1, i))];
  };
  const out: Pt[] = [];
  const segments = pts.length - 1;
  for (let s = 0; s < segments; s++) {
    const p0 = at(s - 1);
    const p1 = at(s);
    const p2 = at(s + 1);
    const p3 = at(s + 2);
    for (let k = 0; k < samples; k++) out.push(catmull(p0, p1, p2, p3, k / samples));
  }
  if (closed) {
    // The pen runs on past where it started.
    const p0 = at(-1);
    const p3 = at(2);
    for (let k = 0; k <= Math.ceil(samples * 0.4); k++) out.push(catmull(p0, at(0), at(1), p3, k / samples));
  } else {
    out.push(pts[pts.length - 1]);
  }
  return flat(out);
}

function catmull(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
}

/** Straight segments through the points, densified so the pen wobble reads along them. */
export function poly(points: readonly Pt[], closed = false): Line {
  const pts = closed ? [...points, points[0]] : [...points];
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const steps = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.05));
    for (let k = 0; k < steps; k++) out.push([ax + ((bx - ax) * k) / steps, ay + ((by - ay) * k) / steps]);
  }
  out.push(pts[pts.length - 1]);
  return flat(out);
}

/** A straight line. */
export const line = (x1: number, y1: number, x2: number, y2: number): Line => poly([[x1, y1], [x2, y2]]);

/**
 * Part of an ellipse, from `from` degrees through `sweep` degrees (0° points
 * right, 90° down), tilted by `tilt`.
 */
export function arc(cx: number, cy: number, rx: number, ry: number, from: number, sweep: number, tilt = 0): Line {
  const steps = Math.max(4, Math.ceil(Math.abs(sweep) / 12));
  const out: Pt[] = [];
  const ct = Math.cos(rad(tilt));
  const st = Math.sin(rad(tilt));
  for (let k = 0; k <= steps; k++) {
    const a = rad(from + (sweep * k) / steps);
    const x = rx * Math.cos(a);
    const y = ry * Math.sin(a);
    out.push([cx + x * ct - y * st, cy + x * st + y * ct]);
  }
  return flat(out);
}

/** A whole ellipse, closed with a small overshoot, starting at `start` degrees. */
export const oval = (cx: number, cy: number, rx: number, ry: number, tilt = 0, start = -100): Line =>
  arc(cx, cy, rx, ry, start, 375, tilt);

/** A circle, closed with a small overshoot. */
export const circle = (cx: number, cy: number, r: number, start = -100): Line => oval(cx, cy, r, r, 0, start);

/** A single tap of the pen. */
export const dot = (x: number, y: number): Line => [r4(x), r4(y)];

/**
 * A petal: a rounded loop from its base out along `angle` (degrees, 0° right,
 * -90° up), `length` long and `width` wide at its fullest.
 */
export function petal(x: number, y: number, angle: number, length: number, width: number, pointed = false): Line {
  const loop: Pt[] = [
    [0, 0],
    [length * 0.35, -width / 2],
    [length * (pointed ? 0.82 : 0.78), -width * (pointed ? 0.28 : 0.4)],
    [length, 0],
    [length * (pointed ? 0.82 : 0.78), width * (pointed ? 0.28 : 0.4)],
    [length * 0.35, width / 2],
  ];
  return place(curve(loop, true), x, y, angle);
}

/** A leaf: a pointed petal with its midrib drawn as a second line. */
export function leaf(x: number, y: number, angle: number, length: number, width: number): Line[] {
  return [petal(x, y, angle, length, width, true), place(curve([[0, 0], [length * 0.5, width * 0.04], [length * 0.85, 0]]), x, y, angle)];
}

/** A spiral, from the centre outward, `turns` times round. */
export function spiral(cx: number, cy: number, r: number, turns: number, start = 0): Line {
  const steps = Math.ceil(turns * 28);
  const out: Pt[] = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const a = rad(start + t * turns * 360);
    out.push([cx + r * t * Math.cos(a), cy + r * t * Math.sin(a)]);
  }
  return flat(out);
}

/** A star with `points` points, `inner` its waist as a share of `r`. */
export function star(cx: number, cy: number, r: number, points = 5, inner = 0.45, tilt = -90): Line {
  const pts: Pt[] = [];
  for (let k = 0; k < points * 2; k++) {
    const a = rad(tilt + (k * 180) / points);
    const rr = k % 2 === 0 ? r : r * inner;
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  return poly(pts, true);
}

/** A heart, `size` tall, centred on (cx, cy). */
export function heart(cx: number, cy: number, size: number): Line {
  const s = size / 2;
  return curve(
    [
      [cx, cy - s * 0.45],
      [cx + s * 0.45, cy - s * 0.95],
      [cx + s * 0.95, cy - s * 0.55],
      [cx + s * 0.6, cy + s * 0.25],
      [cx, cy + s],
      [cx - s * 0.6, cy + s * 0.25],
      [cx - s * 0.95, cy - s * 0.55],
      [cx - s * 0.45, cy - s * 0.95],
    ],
    true,
  );
}

/** A wavy line from one point to another, `waves` crests of height `amp`. */
export function wave(x1: number, y1: number, x2: number, y2: number, amp: number, waves: number): Line {
  const steps = Math.ceil(waves * 10);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const out: Pt[] = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const o = amp * Math.sin(t * waves * Math.PI * 2);
    out.push([x1 + dx * t + nx * o, y1 + dy * t + ny * o]);
  }
  return flat(out);
}

/** A zigzag from one point to another, `teeth` points of height `amp`. */
export function zigzag(x1: number, y1: number, x2: number, y2: number, amp: number, teeth: number): Line {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const pts: Pt[] = [];
  for (let k = 0; k <= teeth * 2; k++) {
    const t = k / (teeth * 2);
    const o = k % 2 === 0 ? 0 : amp;
    pts.push([x1 + dx * t + nx * o, y1 + dy * t + ny * o]);
  }
  return poly(pts);
}

// ─── Moving lines about ──────────────────────────────────────────────────

/** Moves a line drawn around (0, 0) to (x, y), turned by `angle` degrees. */
export function place(l: Line, x: number, y: number, angle = 0): Line {
  const c = Math.cos(rad(angle));
  const s = Math.sin(rad(angle));
  const out: Line = [];
  for (let i = 0; i < l.length; i += 2) out.push(r4(x + l[i] * c - l[i + 1] * s), r4(y + l[i] * s + l[i + 1] * c));
  return out;
}

/** Shifts a line. */
export const shift = (l: Line, dx: number, dy: number): Line => l.map((v, i) => r4(v + (i % 2 === 0 ? dx : dy)));

/** Turns a line about (cx, cy). */
export const turn = (l: Line, angle: number, cx = 0, cy = 0): Line => place(shift(l, -cx, -cy), cx, cy, angle);

/** Mirrors a line left to right about x = `cx`. */
export const mirror = (l: Line, cx = 0): Line => l.map((v, i) => (i % 2 === 0 ? r4(2 * cx - v) : v));

/** Repeats a drawing `count` times round (cx, cy), evenly turned. */
export function around(count: number, cx: number, cy: number, draw: (angle: number) => Line | Line[], offset = 0): Line[] {
  const out: Line[] = [];
  for (let k = 0; k < count; k++) {
    const made = draw(offset + (k * 360) / count);
    if (typeof made[0] === 'number') out.push(made as Line);
    else out.push(...(made as Line[]));
  }
  return out.map((l) => l);
}

/** The points of a regular angle step, for laying things round a centre. */
export const polar = (cx: number, cy: number, r: number, angle: number): Pt => [cx + r * Math.cos(rad(angle)), cy + r * Math.sin(rad(angle))];
