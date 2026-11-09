import { describe, expect, it } from 'vitest';
import type { CanvasDoc, MediaSticker } from '@/canvas/types';
import { ARRANGED_IDS, ARRANGEMENTS, deckDepth, deckTop, fanSpot, stackSpot } from '@/templates/arrangements';
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

  it('fan is symmetric about the middle', () => {
    const a = fanSpot(0, 5);
    const b = fanSpot(4, 5);
    expect(a.x + b.x).toBeCloseTo(1);
    expect(a.rotation).toBeCloseTo(-b.rotation);
  });

  it('stack keeps every print near the middle', () => {
    for (let i = 0; i < 10; i++) expect(Math.abs(stackSpot(i).x - 0.5)).toBeLessThanOrEqual(0.05);
  });

  it('ring turns as a whole, deck flips, fan opens and closes', () => {
    expect(ARRANGEMENTS.ring.motion.kind).toBe('group');
    expect(ARRANGEMENTS.stack.motion.kind).toBe('deck');
    expect(ARRANGEMENTS.fan.motion.kind).toBe('fan');
  });

  it('fan and deck use big uniform cards, sized to the canvas', async () => {
    const { STICKER_BASE_WIDTH } = await import('@/canvas/geometry');
    for (const id of ['fan', 'stack'] as const) {
      const doc = applyTemplate(blank, id, photos(5));
      const cards = doc.layers.filter((l): l is MediaSticker => l.kind === 'media');
      expect(cards.every((c) => c.shape === 'card')).toBe(true);
      // At least ~40% of the canvas width each: a hand / pile, not thumbnails.
      for (const c of cards) expect(c.scale * STICKER_BASE_WIDTH.portrait).toBeGreaterThanOrEqual(0.38);
    }
  });

  it('a photo placed as a sticker joins the shape', () => {
    const base = applyTemplate(blank, 'story', []);
    const withSticker: CanvasDoc = { ...base, layers: [{ id: 's', kind: 'media', mediaId: 'p0', shape: 'heart', x: 0.1, y: 0.1, scale: 1, rotation: 0 }] };
    const doc = applyTemplate(withSticker, 'ring', photos(3));
    const stickers = doc.layers.filter((l): l is MediaSticker => l.kind === 'media');
    expect(stickers).toHaveLength(3);
    const adopted = stickers.find((l) => l.mediaId === 'p0')!;
    expect(adopted.id).toBe('s');
    expect(adopted.shape).toBe('heart');
    expect(adopted.auto).toBe(true);
  });
});

describe('deck', () => {
  it('starts with the last card on top', () => {
    expect(deckTop(4, 0)).toBe(3);
    expect(deckDepth(3, 4, 0)).toBe(0);
    expect(deckDepth(0, 4, 0)).toBe(3);
  });

  it('each flip sends the top card to the back and lifts the rest', () => {
    expect(deckTop(4, 1)).toBe(2);
    expect(deckDepth(3, 4, 1)).toBe(3);
    expect(deckDepth(2, 4, 1)).toBe(0);
  });

  it('comes back round after a full pass, every card having been on top', () => {
    const tops = Array.from({ length: 4 }, (_, s) => deckTop(4, s));
    expect([...tops].sort()).toEqual([0, 1, 2, 3]);
    expect(deckTop(4, 4)).toBe(deckTop(4, 0));
  });
});

describe('slideshow', () => {
  it('makes every photo a slide, in order, on the striped card', () => {
    const doc = applyTemplate(blank, 'slideshow', photos(3));
    expect(doc.cells?.map((c) => c.mediaId)).toEqual(['p0', 'p1', 'p2']);
    expect(doc.background).toEqual({ kind: 'stripes' });
  });

  it('keeps a photo framing from the Canvas background', () => {
    const story = { ...applyTemplate(blank, 'story', photos(1)), background: { kind: 'media' as const, mediaId: 'p0', crop: { x: 0.1, y: 0, scale: 1.4 } } };
    const doc = applyTemplate(story, 'slideshow', photos(1));
    expect(doc.cells?.[0].crop).toEqual({ x: 0.1, y: 0, scale: 1.4 });
  });

  it('retired templates open as what replaced them', async () => {
    const { canvasOf } = await import('@/templates/legacy');
    const open = (template: string) => canvasOf({ layout: { ...blank, template } as unknown as CanvasDoc, mediaElements: [] } as never, { width: 300, height: 500 }).template;
    expect(open('spiral')).toBe('ring');
    expect(open('float')).toBe('fan');
  });
});
