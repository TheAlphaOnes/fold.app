import { describe, expect, it } from 'vitest';
import { CUT_SHAPES, cutHeight, cutPath, isCutShape } from '@/canvas/render/sticker-paths';

const coords = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe('sticker cut paths', () => {
  it.each(CUT_SHAPES)('%s is a closed path that stays inside its box', (shape) => {
    const w = 120;
    const h = cutHeight(shape, w);
    const d = cutPath(shape, w, h);
    expect(d.startsWith('M ')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    // Arc flags/radii are small numbers too; every number must fit the box.
    for (const v of coords(d)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(Math.max(w, h));
    }
  });

  it('heart and star are square, the arch is tall', () => {
    expect(cutHeight('heart', 100)).toBe(100);
    expect(cutHeight('star', 100)).toBe(100);
    expect(cutHeight('arch', 100)).toBeGreaterThan(100);
  });

  it('tells cut shapes from frame shapes', () => {
    expect(isCutShape('heart')).toBe(true);
    expect(isCutShape('polaroid')).toBe(false);
  });
});
