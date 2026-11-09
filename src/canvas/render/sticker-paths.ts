/**
 * Outlines for the die-cut sticker shapes (heart, star, arch), as SVG path
 * data in a w×h box. Pure, so they're tested and drawn the same in the
 * editor, the feed and the 1080×1920 export.
 */

export type CutShape = 'heart' | 'star' | 'arch';

export const CUT_SHAPES: readonly CutShape[] = ['heart', 'star', 'arch'];

export function isCutShape(shape: string): shape is CutShape {
  return (CUT_SHAPES as readonly string[]).includes(shape);
}

/** Height for a sticker of width w: heart and star are square, the arch is a tall window. */
export function cutHeight(shape: CutShape, w: number): number {
  return shape === 'arch' ? w * 1.3 : w;
}

const n = (v: number) => Math.round(v * 100) / 100;

function heart(w: number, h: number): string {
  const p = (x: number, y: number) => `${n(x * w)} ${n(y * h)}`;
  return [
    `M ${p(0.5, 0.94)}`,
    `C ${p(0.5, 0.94)} ${p(0.03, 0.63)} ${p(0.03, 0.33)}`,
    `C ${p(0.03, 0.14)} ${p(0.18, 0.04)} ${p(0.31, 0.04)}`,
    `C ${p(0.41, 0.04)} ${p(0.47, 0.1)} ${p(0.5, 0.17)}`,
    `C ${p(0.53, 0.1)} ${p(0.59, 0.04)} ${p(0.69, 0.04)}`,
    `C ${p(0.82, 0.04)} ${p(0.97, 0.14)} ${p(0.97, 0.33)}`,
    `C ${p(0.97, 0.63)} ${p(0.5, 0.94)} ${p(0.5, 0.94)}`,
    'Z',
  ].join(' ');
}

function star(w: number, h: number): string {
  const cx = w / 2;
  const cy = h * 0.53;
  const outer = Math.min(w, h) * 0.5;
  const inner = outer * 0.5;
  const points = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return `${n(cx + r * Math.cos(a))} ${n(cy + r * Math.sin(a))}`;
  });
  return `M ${points.join(' L ')} Z`;
}

function arch(w: number, h: number): string {
  const r = w / 2;
  return `M 0 ${n(h)} L 0 ${n(r)} A ${n(r)} ${n(r)} 0 0 1 ${n(w)} ${n(r)} L ${n(w)} ${n(h)} Z`;
}

export function cutPath(shape: CutShape, w: number, h: number): string {
  switch (shape) {
    case 'heart':
      return heart(w, h);
    case 'star':
      return star(w, h);
    case 'arch':
      return arch(w, h);
  }
}
