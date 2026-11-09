import { describe, expect, it } from 'vitest';
import { cellRect, gridLayout } from '@/templates/grids';

const snap = (n: number) => Math.round(n * 3) / 3; // a 3x screen

describe('cellRect', () => {
  it('neighbouring cells share an edge exactly, with no gap', () => {
    for (const id of ['duo-stack', 'trio-strips', 'quad', 'six', 'feature', 'film'] as const) {
      const rects = gridLayout(id).cells.map((c) => cellRect(c, 361.7, 643.1, 0, snap));
      for (const a of rects)
        for (const b of rects) {
          if (a === b) continue;
          const touchesX = Math.abs(a.left + a.width - b.left) < 1e-9;
          const nearX = Math.abs(a.left + a.width - b.left) < 1;
          expect(nearX ? touchesX : true).toBe(true);
          const touchesY = Math.abs(a.top + a.height - b.top) < 1e-9;
          const nearY = Math.abs(a.top + a.height - b.top) < 1;
          expect(nearY ? touchesY : true).toBe(true);
        }
    }
  });

  it('covers the canvas edge to edge without a gap', () => {
    const rects = gridLayout('quad').cells.map((c) => cellRect(c, 361.7, 643.1, 0, snap));
    expect(Math.min(...rects.map((r) => r.left))).toBe(0);
    expect(Math.max(...rects.map((r) => r.left + r.width))).toBeCloseTo(snap(361.7));
  });

  it('a gap insets each side by half', () => {
    const r = cellRect({ id: 'a', x: 0, y: 0, w: 1, h: 1 }, 100, 200, 4);
    expect(r).toEqual({ left: 2, top: 2, width: 96, height: 196 });
  });
});
