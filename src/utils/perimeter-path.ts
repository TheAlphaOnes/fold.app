/**
 * Stretches of a rounded rectangle's outline as SVG paths, measured clockwise
 * from the top centre. Used to split a ring into separately animated segments.
 */

export interface RoundedRect {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

export interface PerimeterSegment {
  d: string;
  /** Drawn length of the path, for stroke-dash draw-on animation. */
  length: number;
}

const SAMPLE_STEP = 2;

export function perimeterLength({ width, height, radius }: RoundedRect): number {
  return 2 * (width - 2 * radius) + 2 * (height - 2 * radius) + 2 * Math.PI * radius;
}

/** The point `distance` along the outline, clockwise from the top centre. */
function pointAt(rect: RoundedRect, distance: number): [number, number] {
  const { x, y, width: w, height: h, radius: r } = rect;
  const quarter = (Math.PI * r) / 2;
  const arc = (cx: number, cy: number, startDeg: number, along: number): [number, number] => {
    const angle = ((startDeg + (along / quarter) * 90) * Math.PI) / 180;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  const total = perimeterLength(rect);
  let d = ((distance % total) + total) % total;
  const runs: { length: number; at: (along: number) => [number, number] }[] = [
    { length: w / 2 - r, at: (a) => [x + w / 2 + a, y] },
    { length: quarter, at: (a) => arc(x + w - r, y + r, -90, a) },
    { length: h - 2 * r, at: (a) => [x + w, y + r + a] },
    { length: quarter, at: (a) => arc(x + w - r, y + h - r, 0, a) },
    { length: w - 2 * r, at: (a) => [x + w - r - a, y + h] },
    { length: quarter, at: (a) => arc(x + r, y + h - r, 90, a) },
    { length: h - 2 * r, at: (a) => [x, y + h - r - a] },
    { length: quarter, at: (a) => arc(x + r, y + r, 180, a) },
    { length: w / 2 - r, at: (a) => [x + r + a, y] },
  ];
  for (const run of runs) {
    if (d <= run.length) return run.at(d);
    d -= run.length;
  }
  return [x + w / 2, y];
}

/** The outline from `from` to `to` (distances along it), as a sampled polyline. */
export function perimeterSegment(rect: RoundedRect, from: number, to: number): PerimeterSegment {
  const points: [number, number][] = [];
  for (let at = from; at < to; at += SAMPLE_STEP) points.push(pointAt(rect, at));
  points.push(pointAt(rect, to));

  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  const d = points
    .map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(2)} ${py.toFixed(2)}`)
    .join(' ');
  return { d, length };
}

/** Splits the outline into `count` equal segments separated by `gap`. One segment is a full loop. */
export function splitPerimeter(rect: RoundedRect, count: number, gap: number): PerimeterSegment[] {
  const total = perimeterLength(rect);
  if (count <= 1) return [perimeterSegment(rect, 0, total)];
  const span = total / count;
  return Array.from({ length: count }, (_, i) =>
    perimeterSegment(rect, i * span + gap / 2, (i + 1) * span - gap / 2),
  );
}
