import { describe, expect, it } from 'vitest';
import { brushStrands, doodleExtent, drawInSchedule, strokeLength, offsetLine, strokePath, toDoodle, trim, wobble } from '@/canvas/doodle';

describe('toDoodle', () => {
  it('centres strokes on their bounds, in canvas-width units', () => {
    const d = toDoodle([[100, 200, 300, 400]], 400, 800);
    expect(d.x).toBeCloseTo(0.5);
    expect(d.y).toBeCloseTo(0.375);
    expect(d.strokes[0].points).toEqual([-0.25, -0.25, 0.25, 0.25]);
    expect(doodleExtent(d.strokes)).toEqual({ x: 0.25, y: 0.25 });
  });
});

describe('wobble', () => {
  it('leaves frame 0 as drawn and moves other frames a little', () => {
    const pts = [0, 0, 0.1, 0.1, 0.2, 0];
    expect(wobble(pts, 0, 0.01)).toBe(pts);
    const moved = wobble(pts, 1, 0.01);
    expect(moved).not.toEqual(pts);
    moved.forEach((v, i) => expect(Math.abs(v - pts[i])).toBeLessThanOrEqual(0.01));
  });
  it('differs between frames', () => {
    const pts = [0, 0, 0.1, 0.1, 0.2, 0];
    expect(wobble(pts, 1, 0.01)).not.toEqual(wobble(pts, 2, 0.01));
  });
});

describe('strokePath', () => {
  it('draws a dot for one point and a smoothed curve for more', () => {
    expect(strokePath([0, 0], 100, { x: 10, y: 10 })).toBe('M10 10l0.01 0');
    expect(strokePath([0, 0, 0.1, 0, 0.2, 0.1], 100, { x: 0, y: 0 })).toBe('M0 0Q10 0 15 5L20 10');
  });
});

describe('drawInSchedule', () => {
  it('staggers strokes and scales duration with length, clamped', () => {
    const s = drawInSchedule([0, 0.5, 10]);
    expect(s[0]).toEqual({ delay: 0, duration: 160 });
    expect(s[1].delay).toBeGreaterThan(0);
    expect(s[1].duration).toBe(450);
    expect(s[2].duration).toBe(700);
    expect(s[2].delay).toBeGreaterThan(s[1].delay);
  });
  it('measures length along points', () => {
    expect(strokeLength([0, 0, 3, 4])).toBe(5);
  });
});

describe('brush', () => {
  const line = Array.from({ length: 20 }, (_, k) => [k * 0.01, 0]).flat();
  it('builds a main line and two fainter, thinner strands', () => {
    const s = brushStrands(line, 0.02);
    expect(s).toHaveLength(3);
    expect(s[0]).toMatchObject({ width: 1, opacity: 1 });
    expect(s[1].width).toBeLessThan(1);
    expect(s[2].opacity).toBeLessThan(1);
  });
  it('offsets along the normal and trims ends', () => {
    expect(offsetLine([0, 0, 1, 0], 0.1)).toEqual([0, 0.1, 1, 0.1]);
    expect(trim(line, 0.1, 0.1).length).toBe(32);
  });
});
