/**
 * Recently Deleted — the bin memories wait in before they are gone for good.
 *
 * Deleting a memory only stamps it with deleted_at: it vanishes from every
 * feed but keeps its rows, story links and files, so it can be restored
 * exactly. After TRASH_DAYS it is purged — the row, its story links and any
 * media file nothing else still uses.
 */

import {
  deleteComposition,
  getTrashedBefore,
  getTrashedCompositions,
} from '@/db/journal-repository';
import { deleteOrphanedMediaFiles, ownedMediaFiles } from '@/services/media-storage.service';
import type { Composition } from '@/types/journal';

export const TRASH_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days until a binned memory is purged (0 on its last day). */
export function daysLeftInTrash(deletedAt: number, now: number = Date.now()): number {
  const elapsed = Math.floor((now - deletedAt) / DAY_MS);
  return Math.max(0, TRASH_DAYS - elapsed);
}

/** Permanently remove memories: rows first, then any files left unreferenced. */
export async function purgeMemories(memories: Composition[]): Promise<void> {
  if (memories.length === 0) return;
  for (const memory of memories) {
    await deleteComposition(memory.id);
  }
  // Files are checked after every row is gone, so shared files are only
  // removed once no remaining (or still-binned) memory uses them.
  await deleteOrphanedMediaFiles(ownedMediaFiles(memories.flatMap((m) => m.mediaElements)));
}

/** Purge everything that has been in the bin longer than TRASH_DAYS. */
export async function purgeExpiredTrash(now: number = Date.now()): Promise<number> {
  const expired = await getTrashedBefore(now - TRASH_DAYS * DAY_MS);
  await purgeMemories(expired);
  return expired.length;
}

/** Permanently delete everything in the bin. */
export async function emptyTrash(): Promise<void> {
  await purgeMemories(await getTrashedCompositions());
}
