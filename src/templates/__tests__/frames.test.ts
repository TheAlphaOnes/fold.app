import { describe, expect, it } from 'vitest';
import type { CanvasDoc } from '@/canvas/types';
import { applyTemplate, clearFrame, fillFrame, removeLayerFrom } from '@/templates/registry';
import type { MediaElement } from '@/types/journal';

const image = (id: string): MediaElement => ({ id, uri: `${id}.jpg`, type: 'image', x_pos: 0, y_pos: 0, width: 3, height: 4 });
const blank: CanvasDoc = { version: 1, template: 'story', background: { kind: 'stripes' }, layers: [] };

describe('photo frames', () => {
  it('removing a grid photo empties its cell and drops the photo', () => {
    const media = [image('a'), image('b')];
    const doc = applyTemplate(blank, 'grid:duo-stack', media);
    const out = clearFrame({ doc, media }, doc.cells![0].cellId);
    expect(out.doc.cells![0].mediaId).toBeUndefined();
    expect(out.media.map((m) => m.id)).toEqual(['b']);
  });

  it('removing the full-bleed photo leaves the striped card', () => {
    const media = [image('a')];
    const doc = applyTemplate(blank, 'story', media);
    const out = clearFrame({ doc, media }, 'background');
    expect(out.doc.background).toEqual({ kind: 'stripes' });
    expect(out.media).toEqual([]);
  });

  it('keeps a photo something else still shows', () => {
    const media = [image('a')];
    const base = applyTemplate(blank, 'story', media);
    const doc: CanvasDoc = { ...base, layers: [{ id: 's', kind: 'media', mediaId: 'a', shape: 'heart', x: 0.5, y: 0.5, scale: 1, rotation: 0 }] };
    expect(clearFrame({ doc, media }, 'background').media).toHaveLength(1);
    expect(removeLayerFrom({ doc, media }, 's').media).toHaveLength(1);
  });

  it('replacing swaps the photo and drops the old one', () => {
    const media = [image('a')];
    const doc = applyTemplate(blank, 'story', media);
    const out = fillFrame({ doc, media }, 'background', image('z'));
    expect(out.doc.background).toMatchObject({ kind: 'media', mediaId: 'z' });
    expect(out.media.map((m) => m.id)).toEqual(['z']);
  });

  it('clearing an empty frame changes nothing', () => {
    const state = { doc: blank, media: [] };
    expect(clearFrame(state, 'background')).toBe(state);
  });
});
