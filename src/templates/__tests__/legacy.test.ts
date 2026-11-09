import { describe, expect, it } from 'vitest';
import { NO_CROP, type CanvasDoc, type Layer } from '@/canvas/types';
import { canvasOf, legacyCanvas } from '@/templates/legacy';
import { stickerFrame } from '@/utils/sticker-layout';
import { audio, composition, emptyDoc, image, video } from './fixtures';

const card = { width: 300, height: 400 };

describe('legacyCanvas: no media', () => {
  it('text only becomes a centred text layer on stripes', () => {
    const doc = legacyCanvas(composition({ textContent: '  hi there ', fontFamily: 'Caveat', fontSize: 30, textColor: '#fff' }), card);
    expect(doc.template).toBe('text');
    expect(doc.background).toEqual({ kind: 'stripes' });
    expect(doc.layers).toHaveLength(1);
    expect(doc.layers[0]).toMatchObject({
      kind: 'text',
      text: 'hi there',
      font: 'Caveat',
      color: '#fff',
      align: 'center',
      x: 0.5,
      y: 0.5,
      size: 30 / 300,
    });
  });

  it('empty or whitespace text gives no layers', () => {
    expect(legacyCanvas(composition({ textContent: '' }), card).layers).toEqual([]);
    expect(legacyCanvas(composition({ textContent: '   \n ' }), card).layers).toEqual([]);
  });

  it('falls back to the default font, no colour and size 21', () => {
    const doc = legacyCanvas(composition({ textContent: 'x', fontFamily: '', fontSize: 0 }), card);
    expect(doc.layers[0]).toMatchObject({ font: 'JetBrainsMono-Regular', color: null, size: 21 / 300 });
  });
});

describe('legacyCanvas: one media', () => {
  it('single image with text is a story with highlighted text near the bottom', () => {
    const doc = legacyCanvas(composition({ textContent: 'trip', mediaElements: [image('i')] }), card);
    expect(doc.template).toBe('story');
    expect(doc.background).toEqual({ kind: 'media', mediaId: 'i', crop: NO_CROP });
    expect(doc.layers).toHaveLength(1);
    expect(doc.layers[0]).toMatchObject({ kind: 'text', style: 'highlight', y: 0.8, text: 'trip' });
  });

  it('single image without text has no layers', () => {
    const doc = legacyCanvas(composition({ mediaElements: [image('i')] }), card);
    expect(doc.layers).toEqual([]);
  });

  it('single video is a story background', () => {
    const doc = legacyCanvas(composition({ mediaElements: [video('v')] }), card);
    expect(doc.template).toBe('story');
    expect(doc.background).toMatchObject({ kind: 'media', mediaId: 'v' });
  });

  it('single audio without text is a centred disc on stripes', () => {
    const doc = legacyCanvas(composition({ mediaElements: [audio('a')] }), card);
    expect(doc.template).toBe('story');
    expect(doc.background).toEqual({ kind: 'stripes' });
    expect(doc.layers).toEqual([expect.objectContaining({ kind: 'audio', mediaId: 'a', x: 0.5, scale: 1.6 })]);
  });

  it('single audio with text adds the text below the disc', () => {
    const doc = legacyCanvas(composition({ textContent: 'song', mediaElements: [audio('a')] }), card);
    expect(doc.layers.map((l) => l.kind)).toEqual(['audio', 'text']);
    expect(doc.layers[1]).toMatchObject({ y: 0.78, style: 'plain' });
  });
});

describe('legacyCanvas: multiple media', () => {
  it('converts pixel top-left to a normalised centre using the sticker frame', () => {
    const m = image('a', { x_pos: 30, y_pos: 40, scale: 2 }); // portrait 90x120 -> 180x240
    const doc = legacyCanvas(composition({ mediaElements: [m, image('b')] }), card);
    const frame = stickerFrame(m);
    const l = doc.layers.find((x) => x.id === 'legacy-a')!;
    expect(l.x).toBeCloseTo((30 + (frame.width * 2) / 2) / 300);
    expect(l.y).toBeCloseTo((40 + (frame.height * 2) / 2) / 400);
    expect(l).toMatchObject({ kind: 'media', mediaId: 'a', shape: 'rounded', scale: 2, rotation: 0 });
  });

  it('uses the landscape frame for wide media and default scale 1', () => {
    const m = image('w', { width: 200, height: 100, x_pos: 0, y_pos: 0 });
    const doc = legacyCanvas(composition({ mediaElements: [m, image('b')] }), card);
    const l = doc.layers.find((x) => x.id === 'legacy-w')!;
    expect(l.x).toBeCloseTo(60 / 300);
    expect(l.y).toBeCloseTo(45 / 400);
    expect(l.scale).toBe(1);
  });

  it('clamps positions into 0..1', () => {
    const doc = legacyCanvas(
      composition({
        mediaElements: [image('far', { x_pos: 5000, y_pos: 5000 }), image('neg', { x_pos: -5000, y_pos: -5000 })],
      }),
      card,
    );
    for (const l of doc.layers) {
      expect(l.x).toBeGreaterThanOrEqual(0);
      expect(l.x).toBeLessThanOrEqual(1);
      expect(l.y).toBeGreaterThanOrEqual(0);
      expect(l.y).toBeLessThanOrEqual(1);
    }
    expect(doc.layers.find((l) => l.id === 'legacy-far')).toMatchObject({ x: 1, y: 1 });
    expect(doc.layers.find((l) => l.id === 'legacy-neg')).toMatchObject({ x: 0, y: 0 });
  });

  it('turns audio into an audio layer and photos into media layers', () => {
    const doc = legacyCanvas(composition({ mediaElements: [image('i'), audio('a', { metadata: { title: 't', artist: 'x', artwork: '' } })] }), card);
    expect(doc.template).toBe('stickers');
    expect(doc.background).toEqual({ kind: 'stripes' });
    expect(doc.layers.map((l) => l.kind).sort()).toEqual(['audio', 'media']);
    expect(doc.layers.find((l) => l.kind === 'audio')).toMatchObject({ mediaId: 'a' });
  });

  it('orders stickers by zIndex (stable, missing = 0) and puts text first', () => {
    const doc = legacyCanvas(
      composition({
        textContent: 'hey',
        mediaElements: [image('top', { zIndex: 5 }), image('low', { zIndex: 1 }), image('none'), image('mid', { zIndex: 3 })],
      }),
      card,
    );
    expect(doc.layers.map((l) => l.id)).toEqual(['legacy-text', 'legacy-none', 'legacy-low', 'legacy-mid', 'legacy-top']);
    expect((doc.layers[0] as Extract<Layer, { kind: 'text' }>).y).toBe(0.5);
  });

  it('does not mutate the memory media order', () => {
    const media = [image('b', { zIndex: 2 }), image('a', { zIndex: 1 })];
    legacyCanvas(composition({ mediaElements: media }), card);
    expect(media.map((m) => m.id)).toEqual(['b', 'a']);
  });
});

describe('canvasOf', () => {
  it('returns the saved layout when present', () => {
    const layout: CanvasDoc = emptyDoc();
    expect(canvasOf(composition({ layout, textContent: 'ignored' }), card)).toBe(layout);
  });

  it('builds a legacy canvas otherwise', () => {
    const memory = composition({ textContent: 'x', mediaElements: [image('i')] });
    expect(canvasOf(memory, card)).toEqual(legacyCanvas(memory, card));
  });
});
