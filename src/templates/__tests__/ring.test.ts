import { describe, expect, it } from 'vitest';
import { CANVAS_ASPECT } from '@/canvas/geometry';
import type { CanvasDoc, MediaSticker } from '@/canvas/types';
import { RING_RADIUS, ringSpot } from '@/templates/arrangements';
import { applyTemplate } from '@/templates/registry';
import type { MediaElement } from '@/types/journal';

const image = (id: string): MediaElement => ({ id, uri: id, type: 'image', x_pos: 0, y_pos: 0, width: 3, height: 4 });
const blank: CanvasDoc = { version: 1, template: 'story', background: { kind: 'stripes' }, layers: [] };

describe('ringSpot', () => {
  it('starts at the top centre', () => {
    const s = ringSpot(0, 6);
    expect(s.x).toBeCloseTo(0.5);
    expect(s.y).toBeCloseTo(0.5 - RING_RADIUS * CANVAS_ASPECT);
  });

  it('spaces photos evenly on a round circle', () => {
    for (let i = 0; i < 8; i++) {
      const s = ringSpot(i, 8);
      const r = Math.hypot(s.x - 0.5, (s.y - 0.5) / CANVAS_ASPECT);
      expect(r).toBeCloseTo(RING_RADIUS);
    }
  });

  it('shrinks photos as the ring fills', () => {
    expect(ringSpot(0, 3).scale).toBeGreaterThan(ringSpot(0, 12).scale);
  });
});

describe('Ring template', () => {
  it('puts every photo on the ring on the striped card', () => {
    const doc = applyTemplate(blank, 'ring', [image('a'), image('b'), image('c')]);
    expect(doc.background).toEqual({ kind: 'stripes' });
    const stickers = doc.layers.filter((l): l is MediaSticker => l.kind === 'media');
    expect(stickers.map((s) => s.mediaId)).toEqual(['a', 'b', 'c']);
    expect(stickers.every((s) => s.auto)).toBe(true);
  });

  it('re-spaces the ring when a photo is added, keeping existing stickers', () => {
    const one = applyTemplate(blank, 'ring', [image('a'), image('b')]);
    const two = applyTemplate(one, 'ring', [image('a'), image('b'), image('c')]);
    const a1 = one.layers.find((l) => l.kind === 'media' && l.mediaId === 'a')!;
    const a2 = two.layers.find((l) => l.kind === 'media' && l.mediaId === 'a')!;
    expect(a2.id).toBe(a1.id);
    expect(two.layers.filter((l) => l.kind === 'media')).toHaveLength(3);
  });
});
