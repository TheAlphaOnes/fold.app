import { describe, expect, it } from 'vitest';
import { stampOutline } from '@/canvas/render/stamp-outline';

describe('stampOutline', () => {
  const d = stampOutline(100, 80, 3, 9);

  it('cuts the given number of holes along every edge', () => {
    expect(d.match(/A /g)).toHaveLength(9 * 4);
  });

  it('is one closed path starting at the corner', () => {
    expect(d.startsWith('M 0 0')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
  });

  it('bites curve inward (sweep flag 0) and stay on the edges', () => {
    for (const [, x, y] of d.matchAll(/A 3 3 0 0 0 ([\d.]+) ([\d.]+)/g)) {
      const onEdge = Number(x) === 0 || Number(x) === 100 || Number(y) === 0 || Number(y) === 80;
      expect(onEdge).toBe(true);
    }
  });
});
