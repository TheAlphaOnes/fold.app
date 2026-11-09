import { describe, expect, it } from 'vitest';
import type { CanvasDoc, MediaSticker } from '@/canvas/types';
import { ARRANGED_IDS, ARRANGEMENTS, fanSpot, spiralSpot, stackSpot } from '@/templates/arrangements';
import { BASE_TEMPLATES, applyTemplate } from '@/templates/registry';
import type { MediaElement } from '@/types/journal';

const image = (id: string): MediaElement => ({ id, uri: id, type: 'image', x_pos: 0, y_pos: 0, width: 3, height: 4 });
const blank: CanvasDoc = { version: 1, template: 'story', background: { kind: 'stripes' }, layers: [] };
const photos = (n: number) => Array.from({ length: n }, (_, i) => image(`p${i}`));

describe('arranged templates', () => {
  it.each(ARRANGED_IDS)('%s places every photo on the card, inside the canvas', (id) => {
    for (const n of [1, 3, 6, 12]) {
      const doc = applyTemplate(blank, id, photos(n));
      const stickers = doc.layers.filter((l): l is MediaSticker => l.kind === 'media');
      expect(stickers).toHaveLength(n);
      expect(doc.background).toEqual({ kind: 'stripes' });
      for (const s of stickers) {
        expect(s.x).toBeGreaterThan(0);
        expect(s.x).toBeLessThan(1);
        expect(s.y).toBeGreaterThan(0);
        expect(s.y).toBeLessThan(1);
        expect(s.auto).toBe(true);
      }
    }
  });

  it('are offered in the template list', () => {
    const ids = BASE_TEMPLATES.map((t) => t.id);
    for (const id of ARRANGED_IDS) expect(ids).toContain(id);
  });

  it('spots are deterministic (same layout every render)', () => {
    for (const id of ARRANGED_IDS) expect(ARRANGEMENTS[id].spot(2, 5)).toEqual(ARRANGEMENTS[id].spot(2, 5));
  });

  it('spiral starts in the middle and moves outward, shrinking', () => {
    const first = spiralSpot(0, 8);
    const last = spiralSpot(7, 8);
    expect(Math.hypot(first.x - 0.5, first.y - 0.5)).toBeLessThan(Math.hypot(last.x - 0.5, last.y - 0.5));
    expect(last.scale).toBeLessThan(first.scale);
  });

  it('fan is symmetric about the middle', () => {
    const a = fanSpot(0, 5);
    const b = fanSpot(4, 5);
    expect(a.x + b.x).toBeCloseTo(1);
    expect(a.rotation).toBeCloseTo(-b.rotation);
  });

  it('stack keeps every print near the middle', () => {
    for (let i = 0; i < 10; i++) expect(Math.abs(stackSpot(i).x - 0.5)).toBeLessThanOrEqual(0.05);
  });

  it('ring and spiral turn as a whole; fan, stack and float move each photo', () => {
    expect(ARRANGEMENTS.ring.motion.kind).toBe('group');
    expect(ARRANGEMENTS.spiral.motion.kind).toBe('group');
    expect(ARRANGEMENTS.fan.motion.kind).toBe('item');
    expect(ARRANGEMENTS.float.motion.kind).toBe('item');
  });
});
