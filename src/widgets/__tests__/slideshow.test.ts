import { describe, expect, it } from 'vitest';
import {
  buildRingTimeline,
  buildRingTiles,
  buildSlideshowTimeline,
  buildWallTiles,
  captionFor,
  shortDate,
  tileHeightFor,
  type MemorySlide,
} from '@/widgets/slideshow';
import { CANVAS_ASPECT, STICKER_BASE_WIDTH } from '@/canvas/geometry';
import { RING_RADIUS } from '@/templates/arrangements';
import type { Composition, MediaElement } from '@/types/journal';

function memory(overrides: Partial<Composition> = {}): Composition {
  return {
    id: 1,
    createdAt: new Date(2026, 10, 12, 9, 0).getTime(),
    textContent: '',
    mediaElements: [],
    ...overrides,
  } as Composition;
}

function photo(id: string, width?: number, height?: number): MediaElement {
  return { id, uri: `file:///photo-${id}.jpg`, type: 'image', x_pos: 0, y_pos: 0, width, height };
}

describe('captionFor', () => {
  it('prefers the place', () => {
    const m = memory({ location: { latitude: 0, longitude: 0, name: 'San Francisco' } });
    expect(captionFor(m)).toBe('San Francisco');
  });

  it('falls back to the words, trimmed to one line', () => {
    const m = memory({ textContent: '  a quiet morning by the water and the light was perfect  ' });
    expect(captionFor(m)).toBe('a quiet morning by the water and the light…');
  });

  it('falls back to the date when there is nothing else', () => {
    expect(captionFor(memory())).toBe("NOV 12 '26");
  });
});

describe('shortDate', () => {
  it('formats the wall label', () => {
    expect(shortDate(new Date(2026, 0, 5).getTime())).toBe("JAN 5 '26");
  });
});

describe('buildSlideshowTimeline', () => {
  it('spaces entries by the step and numbers them', () => {
    const now = new Date(2026, 10, 12, 10, 0);
    const slides: MemorySlide[] = [
      { id: 7, uri: 'file:///a.jpg', caption: 'a' },
      { id: 8, uri: 'file:///b.jpg', caption: 'b' },
    ];
    const timeline = buildSlideshowTimeline(slides, now, 30);
    expect(timeline).toHaveLength(2);
    expect(timeline[0].date.getTime()).toBe(now.getTime());
    expect(timeline[1].date.getTime()).toBe(now.getTime() + 30 * 60_000);
    expect(timeline[0].props).toEqual({ empty: false, id: 7, uri: 'file:///a.jpg', caption: 'a', index: 1, total: 2 });
    expect(timeline[1].props.index).toBe(2);
  });

  it('is empty without slides', () => {
    expect(buildSlideshowTimeline([], new Date())).toEqual([]);
  });
});

describe('tileHeightFor', () => {
  it('clamps a panorama and a portrait to the wall bounds', () => {
    expect(tileHeightFor(photo('wide', 3000, 1000), 150)).toBe(94); // 1.6 clamp
    expect(tileHeightFor(photo('tall', 1000, 3000), 150)).toBe(231); // 0.65 clamp
  });

  it('uses the real aspect inside the bounds', () => {
    expect(tileHeightFor(photo('square', 1000, 1000), 150)).toBe(150);
  });

  it('falls back when the photo has no dimensions', () => {
    expect(tileHeightFor(undefined, 150)).toBe(165);
  });
});

describe('buildWallTiles', () => {
  it('deals photos into two columns and respects the limit', () => {
    const memories = [
      memory({ id: 1, mediaElements: [photo('a', 1000, 1000)] }),
      memory({ id: 2, mediaElements: [photo('b', 1000, 2000)] }),
      memory({ id: 3, mediaElements: [photo('c', 2000, 1000)] }),
      memory({ id: 4, mediaElements: [photo('d', 1000, 1000)] }),
    ];
    const tiles = buildWallTiles(memories, 150, 2, 4);
    expect(tiles).toHaveLength(4);
    expect(tiles.filter((t) => t.column === 0)).toHaveLength(2);
    expect(tiles.filter((t) => t.column === 1)).toHaveLength(2);
    expect(tiles.every((t) => t.height > 0)).toBe(true);
  });

  it('resolves each tile picture through the sync resolver', () => {
    const memories = [memory({ id: 1, mediaElements: [photo('a', 1000, 1000)] })];
    const tiles = buildWallTiles(memories, 150, 2, 6, (m) => `file:///widget-${m.id}.jpg`);
    expect(tiles[0].uri).toBe('file:///widget-a.jpg');
  });

  it('is empty without memories', () => {
    expect(buildWallTiles([])).toEqual([]);
  });

  it('gives a words-only memory a tile of its own', () => {
    const memories = [
      memory({ id: 1, mediaElements: [photo('a', 1000, 1000)] }),
      memory({ id: 2, textContent: 'a night market in bangkok' }),
    ];
    const tiles = buildWallTiles(memories, 150, 2, 6);
    const wordsTile = tiles.find((tile) => tile.id === 2);
    expect(wordsTile?.uri).toBe('');
    expect(wordsTile?.words).toBe('a night market in bangkok');
    expect(wordsTile?.height).toBeGreaterThan(0);
  });
});

describe('buildRingTiles', () => {
  it('places photos with the story ring geometry and the sticker sizing', () => {
    const memories = [
      memory({ id: 1, mediaElements: [photo('a')] }),
      memory({ id: 2, mediaElements: [photo('b')] }),
      memory({ id: 3, mediaElements: [photo('c')] }),
    ];
    const tiles = buildRingTiles(memories, 3, (m) => m.uri);
    expect(tiles).toHaveLength(3);
    // The first photo sits at the top of the circle (the angle starts at -90°).
    expect(tiles[0].x).toBeCloseTo(0.5, 5);
    expect(tiles[0].y).toBeCloseTo(0.5 - RING_RADIUS * CANVAS_ASPECT, 5);
    // Three photos use the story's largest ring scale, on the sticker base.
    expect(tiles[0].size).toBeCloseTo(1.1 * STICKER_BASE_WIDTH.portrait, 5);
    expect(tiles[0].uri).toBe('file:///photo-a.jpg');
    expect(tiles.map((t) => t.rotation)).toEqual([-4, 4, -4]);
  });

  it('caps the count and skips memories without a picture', () => {
    const memories = [
      memory({ id: 1, mediaElements: [photo('a')] }),
      memory({ id: 2, textContent: 'words only' }),
      memory({ id: 3, mediaElements: [photo('c')] }),
    ];
    const tiles = buildRingTiles(memories, 8);
    expect(tiles).toHaveLength(2);
    expect(tiles.every((t) => t.id !== 2)).toBe(true);
  });

  it('is empty without pictures', () => {
    expect(buildRingTiles([memory({ textContent: 'words' })])).toEqual([]);
  });
});

describe('buildRingTimeline', () => {
  const tiles = buildRingTiles(
    ['a', 'b', 'c', 'd'].map((id, i) => memory({ id: i + 1, mediaElements: [photo(id)] })),
    4,
  );

  it('turns one slot per entry and spaces the entries', () => {
    const now = new Date(2026, 10, 12, 10, 0);
    const timeline = buildRingTimeline(tiles, now, 30, 1);
    expect(timeline).toHaveLength(4);
    expect(timeline[0].props.angle).toBe(0);
    expect(timeline[1].props.angle).toBe(90);
    expect(timeline[3].props.angle).toBe(270);
    expect(timeline[1].date.getTime()).toBe(now.getTime() + 30 * 60_000);
    expect(timeline.every((entry) => entry.props.tiles.length === 4)).toBe(true);
  });

  it('keeps turning through the configured revolutions and wraps the angle', () => {
    const timeline = buildRingTimeline(tiles, new Date(), 30, 2);
    expect(timeline).toHaveLength(8);
    expect(timeline[4].props.angle).toBe(0);
    expect(timeline[5].props.angle).toBe(90);
  });

  it('is empty without tiles', () => {
    expect(buildRingTimeline([], new Date())).toEqual([]);
  });
});
