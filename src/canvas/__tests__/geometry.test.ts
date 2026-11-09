import { describe, expect, it } from 'vitest';
import { CANVAS_ASPECT, EXPORT_SIZE, SNAP_DISTANCE, clamp, fitCanvas, newId, snapRotation, snapToCentre } from '@/canvas/geometry';

describe('constants', () => {
  it('is a 9:16 canvas and the export matches', () => {
    expect(CANVAS_ASPECT).toBeCloseTo(9 / 16);
    expect(EXPORT_SIZE.width / EXPORT_SIZE.height).toBeCloseTo(CANVAS_ASPECT);
  });
});

describe('fitCanvas', () => {
  it('is height-limited in a wide box', () => {
    const s = fitCanvas({ width: 1000, height: 160 });
    expect(s.height).toBeCloseTo(160);
    expect(s.width).toBeCloseTo(90);
  });

  it('is width-limited in a tall box', () => {
    const s = fitCanvas({ width: 90, height: 1000 });
    expect(s.width).toBeCloseTo(90);
    expect(s.height).toBeCloseTo(160);
  });

  it('returns the same size for an exact 9:16 box', () => {
    const s = fitCanvas({ width: 360, height: 640 });
    expect(s.width).toBeCloseTo(360);
    expect(s.height).toBeCloseTo(640);
  });

  it('always keeps the aspect and fits inside the bounds', () => {
    for (const b of [{ width: 390, height: 844 }, { width: 800, height: 600 }, { width: 10, height: 10 }]) {
      const s = fitCanvas(b);
      expect(s.width / s.height).toBeCloseTo(CANVAS_ASPECT);
      expect(s.width).toBeLessThanOrEqual(b.width + 1e-9);
      expect(s.height).toBeLessThanOrEqual(b.height + 1e-9);
    }
  });

  it('handles a zero box', () => {
    expect(fitCanvas({ width: 0, height: 0 })).toEqual({ width: 0, height: 0 });
  });
});

describe('clamp', () => {
  it('passes values inside the range', () => expect(clamp(0.4, 0, 1)).toBe(0.4));
  it('clamps below and above', () => {
    expect(clamp(-3, 0, 1)).toBe(0);
    expect(clamp(7, 0, 1)).toBe(1);
  });
  it('keeps the bounds themselves', () => {
    expect(clamp(0, 0, 1)).toBe(0);
    expect(clamp(1, 0, 1)).toBe(1);
  });
});

describe('snapToCentre', () => {
  it('snaps both axes inside the snap distance', () => {
    expect(snapToCentre(0.5 + SNAP_DISTANCE / 2, 0.5 - SNAP_DISTANCE / 2)).toEqual({
      x: 0.5,
      y: 0.5,
      snappedX: true,
      snappedY: true,
    });
  });

  it('snaps one axis independently', () => {
    expect(snapToCentre(0.505, 0.9)).toEqual({ x: 0.5, y: 0.9, snappedX: true, snappedY: false });
    expect(snapToCentre(0.1, 0.495)).toEqual({ x: 0.1, y: 0.5, snappedX: false, snappedY: true });
  });

  it('does not snap at or beyond the snap distance', () => {
    const r = snapToCentre(0.5 + SNAP_DISTANCE + 0.001, 0.5 - SNAP_DISTANCE - 0.001);
    expect(r.snappedX).toBe(false);
    expect(r.snappedY).toBe(false);
  });
});

describe('newId', () => {
  it('returns a short non-empty alphanumeric string', () => {
    const id = newId();
    expect(id).toMatch(/^[a-z0-9]{1,7}$/);
  });

  it('is practically unique', () => {
    const ids = new Set(Array.from({ length: 2000 }, newId));
    expect(ids.size).toBeGreaterThan(1990);
  });
});

describe('snapRotation', () => {
  it('settles a near-straight twist exactly on straight', () => {
    expect(snapRotation(2.5)).toEqual({ rotation: 0, snapped: true });
    expect(snapRotation(-3)).toEqual({ rotation: -0, snapped: true });
    expect(snapRotation(88)).toEqual({ rotation: 90, snapped: true });
  });

  it('leaves a deliberate angle alone', () => {
    expect(snapRotation(12)).toEqual({ rotation: 12, snapped: false });
    expect(snapRotation(-45)).toEqual({ rotation: -45, snapped: false });
  });
});
