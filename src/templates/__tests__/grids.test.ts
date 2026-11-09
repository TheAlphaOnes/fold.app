import { describe, expect, it } from 'vitest';
import { GRID_LAYOUTS, gridForCount, gridLayout, type GridCell } from '@/templates/grids';

const EPS = 1e-9;
const overlap = (a: GridCell, b: GridCell) =>
  a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS;

describe('GRID_LAYOUTS', () => {
  it('has unique layout ids', () => {
    expect(new Set(GRID_LAYOUTS.map((l) => l.id)).size).toBe(GRID_LAYOUTS.length);
  });

  describe.each(GRID_LAYOUTS.map((l) => [l.id, l] as const))('%s', (_id, layout) => {
    it('has at least one cell with unique ids', () => {
      expect(layout.cells.length).toBeGreaterThan(0);
      expect(new Set(layout.cells.map((c) => c.id)).size).toBe(layout.cells.length);
    });

    it('keeps every cell inside the canvas with positive size', () => {
      for (const c of layout.cells) {
        expect(c.w).toBeGreaterThan(0);
        expect(c.h).toBeGreaterThan(0);
        expect(c.x).toBeGreaterThanOrEqual(-EPS);
        expect(c.y).toBeGreaterThanOrEqual(-EPS);
        expect(c.x + c.w).toBeLessThanOrEqual(1 + EPS);
        expect(c.y + c.h).toBeLessThanOrEqual(1 + EPS);
      }
    });

    it('has a text anchor inside the canvas', () => {
      expect(layout.textAnchor.x).toBeGreaterThanOrEqual(0);
      expect(layout.textAnchor.x).toBeLessThanOrEqual(1);
      expect(layout.textAnchor.y).toBeGreaterThanOrEqual(0);
      expect(layout.textAnchor.y).toBeLessThanOrEqual(1);
    });

    if (!layout.decor) {
      it('tiles the canvas without overlapping', () => {
        for (let i = 0; i < layout.cells.length; i++)
          for (let j = i + 1; j < layout.cells.length; j++)
            expect(overlap(layout.cells[i], layout.cells[j])).toBe(false);
        const area = layout.cells.reduce((s, c) => s + c.w * c.h, 0);
        expect(area).toBeCloseTo(1, 6);
      });
    } else {
      it('has non-overlapping cells (decor layouts need not tile)', () => {
        for (let i = 0; i < layout.cells.length; i++)
          for (let j = i + 1; j < layout.cells.length; j++)
            expect(overlap(layout.cells[i], layout.cells[j])).toBe(false);
      });
    }
  });
});

describe('gridLayout', () => {
  it('finds a layout by id', () => {
    expect(gridLayout('quad').cells).toHaveLength(4);
    expect(gridLayout('six').cells).toHaveLength(6);
  });

  it('falls back to the first layout for an unknown id', () => {
    // @ts-expect-error deliberately invalid id
    expect(gridLayout('nope')).toBe(GRID_LAYOUTS[0]);
  });
});

describe('gridForCount', () => {
  it.each([
    [0, 'duo-stack'],
    [1, 'duo-stack'],
    [2, 'duo-stack'],
    [3, 'trio-strips'],
    [4, 'quad'],
    [5, 'six'],
    [6, 'six'],
    [7, 'six'],
    [8, 'six'],
  ])('%i photos -> %s', (count, id) => {
    expect(gridForCount(count)).toBe(id);
  });

  it('always names a real layout', () => {
    for (let n = 0; n <= 8; n++) expect(GRID_LAYOUTS.some((l) => l.id === gridForCount(n))).toBe(true);
  });
});
