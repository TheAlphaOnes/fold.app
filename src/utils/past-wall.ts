/**
 * What the "From your past" wall shows, and in which column.
 *
 * wallPieces: every photo/video of every memory is its own tile (a memory
 * with five photos gives five), taken round-robin across memories so
 * neighbours come from different moments. Memories with no picture give
 * one tile (their words or song).
 *
 * dealColumns: with plenty of tiles, deal them out so each shows once;
 * with only a few, every column runs through all of them from a different
 * starting point, so columns never mirror each other and no tile ever
 * sits on top of itself.
 */

import type { Composition, MediaElement } from '@/types/journal';

export interface WallPiece {
  memory: Composition;
  /** The photo/video this tile shows; none for a words- or song-only memory. */
  media?: MediaElement;
}

/** Below this many tiles per column, columns share the whole set instead of splitting it. */
export const MIN_PER_COLUMN = 4;

const isPicture = (m: MediaElement) => (m.type === 'image' || m.type === 'video') && !m.isGif && !m.isStamp;

export function wallPieces(memories: Composition[]): WallPiece[] {
  const queues = memories.map((memory) => {
    const pictures = memory.mediaElements.filter(isPicture);
    return pictures.length > 0 ? pictures.map((media) => ({ memory, media })) : [{ memory }];
  });
  const pieces: WallPiece[] = [];
  for (let round = 0; queues.some((q) => q.length > round); round++) {
    for (const queue of queues) if (queue[round]) pieces.push(queue[round]);
  }
  return pieces;
}

export function dealColumns<T>(pieces: readonly T[], columns: number, minPerColumn: number = MIN_PER_COLUMN): T[][] {
  const n = pieces.length;
  if (n === 0) return Array.from({ length: columns }, () => []);
  if (n >= columns * minPerColumn) {
    const dealt: T[][] = Array.from({ length: columns }, () => []);
    pieces.forEach((piece, i) => dealt[i % columns].push(piece));
    return dealt;
  }
  // Few tiles: each column is the whole set, rotated to its own start.
  return Array.from({ length: columns }, (_, c) => {
    const offset = Math.round((c * n) / columns) % n;
    return [...pieces.slice(offset), ...pieces.slice(0, offset)];
  });
}
