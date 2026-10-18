/**
 * Media storage — owns the files Fold copies into its documents directory.
 *
 * Memories reference media by file URI; deleting a memory's row leaves those
 * files behind unless this service removes them. A file is only deleted when
 * nothing in the database still points at it.
 */

import * as FileSystem from 'expo-file-system/legacy';

import { isMediaFileReferenced } from '@/db/journal-repository';
import type { MediaElement } from '@/types/journal';

function isAppOwned(uri: string | undefined): uri is string {
  const base = FileSystem.documentDirectory;
  return !!uri && !!base && uri.startsWith(base);
}

/** Local files a set of media elements own: the media itself and any downloaded artwork. */
export function ownedMediaFiles(elements: MediaElement[]): string[] {
  const files = new Set<string>();
  for (const element of elements) {
    if (isAppOwned(element.uri)) files.add(element.uri);
    if (isAppOwned(element.metadata?.artwork)) files.add(element.metadata.artwork);
  }
  return [...files];
}

/**
 * Deletes each file unless a remaining memory or story still uses it.
 * Never throws: a file that cannot be removed is logged and skipped, since a
 * leftover file is harmless while a failed delete flow is not.
 */
export async function deleteOrphanedMediaFiles(uris: string[]): Promise<void> {
  for (const uri of uris) {
    const fileName = uri.split('/').pop();
    if (!fileName) continue;
    try {
      if (await isMediaFileReferenced(fileName)) continue;
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (error) {
      console.error('Failed to remove media file', uri, error);
    }
  }
}
