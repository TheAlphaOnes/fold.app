import { describe, expect, it } from 'vitest';
import { hatchPath } from '@/utils/hatch';

/** Where each "\" line meets the left edge (y at x = 0). */
const starts = (d: string) => [...d.matchAll(/M0 (-?[\d.]+)/g)].map((m) => Number(m[1]));

describe('hatchPath', () => {
  it('covers the whole box, corner to corner, at any size', () => {
    for (const [w, h] of [[100, 100], [361.7, 643.1], [120, 900], [900, 40]]) {
      const c = starts(hatchPath(w, h, 8));
      // A line crosses the box when -w <= c <= h; the family must span it fully.
      expect(Math.min(...c)).toBeLessThanOrEqual(-w);
      expect(Math.max(...c)).toBeGreaterThanOrEqual(h);
    }
  });

  it('spaces lines one period apart', () => {
    const c = starts(hatchPath(50, 50, 8));
    for (let i = 1; i < c.length; i++) expect(c[i] - c[i - 1]).toBeCloseTo(8);
  });

  it('draws one line per offset per period', () => {
    expect(starts(hatchPath(30, 30, 15, [0, -6])).length).toBe(2 * starts(hatchPath(30, 30, 15)).length);
  });

  it('draws nothing before the size is known', () => {
    expect(hatchPath(0, 200, 8)).toBe('');
  });
});
