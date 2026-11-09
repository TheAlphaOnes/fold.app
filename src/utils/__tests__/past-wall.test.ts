import { describe, expect, it } from 'vitest';
import type { Composition, MediaElement } from '@/types/journal';
import { dealColumns, wallPieces } from '@/utils/past-wall';

const photo = (id: string): MediaElement => ({ id, uri: id, type: 'image', x_pos: 0, y_pos: 0 });
const memory = (id: number, photos: string[], text = ''): Composition =>
  ({ id, createdAt: 0, textContent: text, fontFamily: 'x', fontSize: 1, mediaElements: photos.map(photo), storyIds: [] }) as unknown as Composition;

describe('wallPieces', () => {
  it('gives every photo its own tile, alternating between memories', () => {
    const pieces = wallPieces([memory(1, ['a', 'b', 'c']), memory(2, ['d'])]);
    expect(pieces.map((p) => p.media?.id)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('gives a memory without pictures one tile', () => {
    const pieces = wallPieces([memory(1, [], 'words')]);
    expect(pieces).toHaveLength(1);
    expect(pieces[0].media).toBeUndefined();
  });
});

describe('dealColumns', () => {
  const noRepeatsInLoop = (column: string[]) => {
    if (column.length < 2) return true;
    return column.every((x, i) => x !== column[(i + 1) % column.length]);
  };

  it('with few tiles, every column has all of them, starting differently', () => {
    const cols = dealColumns(['a', 'b', 'c', 'd'], 3);
    for (const col of cols) expect([...col].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(new Set(cols.map((c) => c[0])).size).toBe(3);
    for (const col of cols) expect(noRepeatsInLoop(col)).toBe(true);
  });

  it('with plenty of tiles, each shows once', () => {
    const pieces = Array.from({ length: 15 }, (_, i) => `p${i}`);
    const cols = dealColumns(pieces, 3);
    expect(cols.flat().sort()).toEqual([...pieces].sort());
  });

  it('a single tile still fills every column', () => {
    expect(dealColumns(['a'], 3)).toEqual([['a'], ['a'], ['a']]);
  });

  it('nothing to show gives empty columns', () => {
    expect(dealColumns([], 3)).toEqual([[], [], []]);
  });
});
