import { describe, expect, it } from 'vitest';
import { NO_CROP, type CanvasDoc, type Layer, type TemplateId } from '@/canvas/types';
import { SAFE_ZONE } from '@/canvas/geometry';
import { gridLayout } from '@/templates/grids';
import {
  baseCandidates,
  placesAll,
  applyTemplate,
  defaultTextSpot,
  gridIdOf,
  isGrid,
  newDoc,
  scatterSticker,
  suggestTemplate,
  templateName,
} from '@/templates/registry';
import { audio, audioLayer, dateLayer, emptyDoc, gif, image, locationLayer, textLayer, video } from './fixtures';

const mediaLayerIds = (doc: CanvasDoc) =>
  doc.layers.filter((l): l is Extract<Layer, { kind: 'media' }> => l.kind === 'media').map((l) => l.mediaId);

describe('suggestTemplate', () => {
  it('suggests text for no visual media', () => {
    expect(suggestTemplate([])).toBe('story');
  });

  it('does not count GIFs or audio as visual', () => {
    expect(suggestTemplate([gif('g'), audio('a')])).toBe('story');
    expect(suggestTemplate([image('i'), gif('g'), audio('a')])).toBe('story');
  });

  it('suggests story for one photo or video', () => {
    expect(suggestTemplate([image('1')])).toBe('story');
    expect(suggestTemplate([video('1')])).toBe('story');
  });

  it.each([
    [2, 'grid:duo-stack'],
    [3, 'grid:trio-strips'],
    [4, 'grid:quad'],
    [5, 'grid:six'],
    [6, 'grid:six'],
  ])('suggests a grid for %i visual media', (n, expected) => {
    const media = Array.from({ length: n }, (_, i) => (i % 2 ? video(`m${i}`) : image(`m${i}`)));
    expect(suggestTemplate(media)).toBe(expected);
  });
});

describe('template id helpers', () => {
  it('isGrid / gridIdOf', () => {
    expect(isGrid('grid:quad')).toBe(true);
    expect(isGrid('story')).toBe(false);
    expect(gridIdOf('grid:hero')).toBe('hero');
    expect(gridIdOf('text')).toBeNull();
  });

  it('templateName', () => {
    expect(templateName('story')).toBe('Canvas');
    expect(templateName('text')).toBe('Text');
    expect(templateName('stickers')).toBe('Stickers');
    expect(templateName('grid:duo-side')).toBe('Split');
    expect(templateName('grid:nope' as TemplateId)).toBe('Canvas');
  });
});

describe('applyTemplate: story and text', () => {
  it('story uses the first visual media as background', () => {
    const media = [audio('a'), gif('g'), video('v'), image('i')];
    const doc = applyTemplate(emptyDoc(), 'story', media);
    expect(doc.template).toBe('story');
    expect(doc.background).toEqual({ kind: 'media', mediaId: 'v', crop: NO_CROP });
  });

  it('story with no visual media falls back to stripes', () => {
    expect(applyTemplate(emptyDoc(), 'story', [audio('a')]).background).toEqual({ kind: 'stripes' });
  });

  it('text always has stripes', () => {
    expect(applyTemplate(emptyDoc(), 'text', [image('i')]).background).toEqual({ kind: 'stripes' });
  });

  it('keeps text, date, location and audio layers when switching', () => {
    const layers = [textLayer(), dateLayer(), locationLayer(), audioLayer()];
    for (const t of ['story', 'text', 'stickers', 'grid:quad'] as TemplateId[]) {
      const doc = applyTemplate(emptyDoc(layers), t, [image('i')]);
      expect(doc.layers.map((l) => l.id)).toEqual(expect.arrayContaining(['t1', 'd1', 'l1', 'au1']));
    }
  });
});

describe('applyTemplate: grids', () => {
  it('fills cells in order and leaves extra cells empty', () => {
    const doc = applyTemplate(emptyDoc(), 'grid:quad', [image('a'), image('b'), image('c')]);
    expect(doc.cells?.map((c) => c.cellId)).toEqual(['a', 'b', 'c', 'd']);
    expect(doc.cells?.map((c) => c.mediaId)).toEqual(['a', 'b', 'c', undefined]);
  });

  it('ignores audio/gifs and drops media beyond the cell count', () => {
    const doc = applyTemplate(emptyDoc(), 'grid:duo-stack', [audio('x'), gif('g'), image('a'), image('b'), image('c')]);
    expect(doc.cells?.map((c) => c.mediaId)).toEqual(['a', 'b']);
  });

  it("keeps each cell's photo, crop and mirroring, and fills only empty cells", () => {
    const crop = { x: 0.2, y: -0.1, scale: 1.6 };
    const prev: CanvasDoc = {
      ...emptyDoc(),
      template: 'grid:duo-side',
      cells: [
        { cellId: 'a', mediaId: 'one', crop: NO_CROP },
        { cellId: 'b', mediaId: 'two', crop, mirrored: true },
      ],
    };
    // Media order changed and a photo was added: cells a and b stay put.
    const doc = applyTemplate(prev, 'grid:quad', [image('two'), image('one'), image('new')]);
    expect(doc.cells?.[0]).toMatchObject({ cellId: 'a', mediaId: 'one', crop: NO_CROP });
    expect(doc.cells?.[1]).toMatchObject({ cellId: 'b', mediaId: 'two', crop, mirrored: true });
    expect(doc.cells?.[2]).toMatchObject({ mediaId: 'new', crop: NO_CROP });
    expect(doc.cells?.[3]?.mediaId).toBeUndefined();
  });

  it('sets background and gap from decor', () => {
    expect(applyTemplate(emptyDoc(), 'grid:quad', []).gap).toBe('thin');
    expect(applyTemplate(emptyDoc(), 'grid:film', []).gap).toBe('none');
    expect(applyTemplate(emptyDoc(), 'grid:polaroid', []).background).toEqual({ kind: 'stripes' });
    expect(applyTemplate(emptyDoc(), 'grid:film', []).background).toEqual({ kind: 'color', color: '#0B0B0B' });
    expect(applyTemplate(emptyDoc(), 'grid:quad', []).background).toEqual({ kind: 'stripes' });
  });

  it('keeps an existing gap choice', () => {
    expect(applyTemplate({ ...emptyDoc(), gap: 'thick' }, 'grid:film', []).gap).toBe('thick');
  });
});

describe('applyTemplate: stickers', () => {
  it('turns visual media into media layers', () => {
    const doc = applyTemplate(emptyDoc(), 'stickers', [image('a'), video('b'), gif('g'), audio('au')]);
    expect(mediaLayerIds(doc)).toEqual(['a', 'b']);
    expect(doc.background).toEqual({ kind: 'stripes' });
  });

  it('does not duplicate existing stickers', () => {
    const first = applyTemplate(emptyDoc(), 'stickers', [image('a')]);
    const second = applyTemplate(first, 'stickers', [image('a'), image('b')]);
    expect(mediaLayerIds(second)).toEqual(['a', 'b']);
    expect(second.layers.find((l) => l.kind === 'media' && l.mediaId === 'a')).toBe(
      first.layers.find((l) => l.kind === 'media'),
    );
  });

  it('puts stickers beneath other layers', () => {
    const doc = applyTemplate(emptyDoc([textLayer()]), 'stickers', [image('a')]);
    expect(doc.layers.map((l) => l.kind)).toEqual(['media', 'text']);
  });

  it('stickers -> grid -> stickers does not duplicate stickers', () => {
    const media = [image('a'), image('b')];
    const s1 = applyTemplate(emptyDoc([textLayer()]), 'stickers', media);
    const g = applyTemplate(s1, 'grid:duo-stack', media);
    const s2 = applyTemplate(g, 'stickers', media);
    expect(mediaLayerIds(s2)).toEqual(['a', 'b']);
    expect(s2.layers.filter((l) => l.kind === 'text')).toHaveLength(1);
  });
});

describe('newDoc', () => {
  it('uses the suggested template by default', () => {
    expect(newDoc([]).template).toBe('story');
    expect(newDoc([]).background).toEqual({ kind: 'stripes' });
    expect(newDoc([image('a')]).template).toBe('story');
    expect(newDoc([image('a'), image('b')]).template).toBe('grid:duo-stack');
  });

  it('honours an explicit template and starts with no layers', () => {
    const doc = newDoc([image('a')], 'text');
    expect(doc.template).toBe('text');
    expect(doc.layers).toEqual([]);
    expect(doc.version).toBe(1);
  });
});

describe('scatterSticker', () => {
  it('builds a rounded media sticker for the media', () => {
    const l = scatterSticker('m', 0);
    expect(l).toMatchObject({ kind: 'media', mediaId: 'm', shape: 'rounded', scale: 1 });
    expect(l.id).toBeTruthy();
  });

  it('keeps every spot inside the canvas and cycles after six', () => {
    for (let i = 0; i < 12; i++) {
      const l = scatterSticker('m', i);
      expect(l.x).toBeGreaterThan(0);
      expect(l.x).toBeLessThan(1);
      expect(l.y).toBeGreaterThan(0);
      expect(l.y).toBeLessThan(1);
    }
    const a = scatterSticker('m', 1);
    const b = scatterSticker('m', 7);
    expect([b.x, b.y, b.rotation]).toEqual([a.x, a.y, a.rotation]);
  });

  it('gives neighbouring stickers different spots', () => {
    const spots = new Set(Array.from({ length: 6 }, (_, i) => `${scatterSticker('m', i).x},${scatterSticker('m', i).y}`));
    expect(spots.size).toBe(6);
  });
});

describe('defaultTextSpot', () => {
  it('uses the grid text anchor', () => {
    expect(defaultTextSpot({ template: 'grid:hero', background: { kind: 'stripes' } })).toEqual(gridLayout('hero').textAnchor);
  });

  it('captions a full-bleed photo above the bottom safe zone', () => {
    const spot = defaultTextSpot({ template: 'story', background: { kind: 'media', mediaId: 'a', crop: { x: 0, y: 0, scale: 1 } } });
    expect(spot.x).toBe(0.5);
    expect(spot.y).toBeLessThan(1 - SAFE_ZONE.bottom);
  });

  it('centres text on a blank card, text and stickers', () => {
    expect(defaultTextSpot({ template: 'story', background: { kind: 'stripes' } })).toEqual({ x: 0.5, y: 0.5 });
    expect(defaultTextSpot({ template: 'text', background: { kind: 'stripes' } })).toEqual({ x: 0.5, y: 0.5 });
    expect(defaultTextSpot({ template: 'stickers', background: { kind: 'stripes' } })).toEqual({ x: 0.5, y: 0.5 });
  });
});


describe('photo placement rules', () => {
  const userSticker = (mediaId: string): Layer => ({ id: `s-${mediaId}`, kind: 'media', mediaId, shape: 'rounded', x: 0.5, y: 0.5, scale: 1, rotation: 0 });

  it("doesn't reuse a user's photo sticker as base media", () => {
    const doc = { ...emptyDoc(), layers: [userSticker('st')] };
    expect(baseCandidates(doc, [image('st'), image('bg')]).map((m) => m.id)).toEqual(['bg']);
    const story = applyTemplate(doc, 'story', [image('st'), image('bg')]);
    expect(story.background).toMatchObject({ kind: 'media', mediaId: 'bg' });
    expect(story.layers.some((l) => l.kind === 'media' && l.mediaId === 'st')).toBe(true);
  });

  it("hands the Stickers template's own stickers back to the base when leaving it", () => {
    const media = [image('a'), image('b')];
    const stickers = applyTemplate(emptyDoc(), 'stickers', media);
    expect(stickers.layers.filter((l) => l.kind === 'media' && l.auto)).toHaveLength(2);
    const grid = applyTemplate(stickers, 'grid:duo-stack', media);
    expect(grid.cells?.map((c) => c.mediaId)).toEqual(['a', 'b']);
    expect(grid.layers.some((l) => l.kind === 'media')).toBe(false);
  });

  it('keeps the Story background and its framing while that photo is still there', () => {
    const crop = { x: 0.1, y: 0, scale: 1.4 };
    const prev: CanvasDoc = { ...emptyDoc(), template: 'story', background: { kind: 'media', mediaId: 'b', crop } };
    const doc = applyTemplate(prev, 'story', [image('a'), image('b')]);
    expect(doc.background).toEqual({ kind: 'media', mediaId: 'b', crop });
  });

  it('placesAll is false when a template has no room for a photo', () => {
    const media = [image('a'), image('b')];
    expect(placesAll(applyTemplate(emptyDoc(), 'text', media), media)).toBe(false);
    expect(placesAll(applyTemplate(emptyDoc(), 'story', media), media)).toBe(false);
    expect(placesAll(applyTemplate(emptyDoc(), 'grid:duo-stack', media), media)).toBe(true);
    expect(placesAll(applyTemplate(emptyDoc(), 'stickers', media), media)).toBe(true);
  });
});
