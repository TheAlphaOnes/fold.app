/**
 * Widget photos: copies of journal photos in the shared widgets directory.
 *
 * Widgets can't read the app's sandbox, so every photo a widget shows is
 * resized small and copied into the app group's directory. Copies are named
 * after their source and size, so later syncs reuse them, and each sync
 * sweeps the copies it didn't use.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { resolveDocumentUri } from '@/db/journal-repository';
import { trackError } from '@/services/analytics';

/** A widget never needs more than this; copies stay cheap. */
export const WIDGET_PHOTO_WIDTH = 600;

/** Copies a photo for a widget; resolves to its file:// URI, or '' if the copy failed. */
export type CopyPhoto = (source: string, width?: number) => Promise<string>;

/** Matches the copies this module writes, so the sweep never touches anything else. */
const COPY_NAME = /^w[a-z0-9]+\.jpg$/;

/** A stable file name for a photo's copy, from its source and size. */
function copyNameFor(source: string, width: number): string {
  let hash = 5381;
  const key = `${source}@${width}`;
  for (let i = 0; i < key.length; i++) hash = (hash * 33 + key.charCodeAt(i)) | 0;
  return `w${(hash >>> 0).toString(36)}.jpg`;
}

/**
 * One sync's photo copier. `copy` writes (or reuses) a copy and remembers
 * it; `sweep` then removes every copy this sync didn't ask for.
 */
export function createPhotoCopier(directory: string): { copy: CopyPhoto; sweep: () => Promise<void> } {
  const base = directory.replace(/\/+$/, '');
  const used = new Set<string>();

  const copy: CopyPhoto = async (source, width = WIDGET_PHOTO_WIDTH) => {
    const name = copyNameFor(source, width);
    const dest = `${base}/${name}`;
    try {
      const existing = await FileSystem.getInfoAsync(dest);
      if (!existing.exists) {
        const rendered = await ImageManipulator.manipulate(resolveDocumentUri(source)).resize({ width }).renderAsync();
        const saved = await rendered.saveAsync({ compress: 0.86, format: SaveFormat.JPEG });
        await FileSystem.moveAsync({ from: saved.uri, to: dest });
      }
      used.add(name);
      return dest;
    } catch (error) {
      trackError(error, 'widget_photo_copy');
      return '';
    }
  };

  const sweep = async () => {
    try {
      const entries = await FileSystem.readDirectoryAsync(base);
      const stale = entries.filter((name) => COPY_NAME.test(name) && !used.has(name));
      await Promise.all(stale.map((name) => FileSystem.deleteAsync(`${base}/${name}`, { idempotent: true })));
    } catch (error) {
      trackError(error, 'widget_photo_sweep');
    }
  };

  return { copy, sweep };
}
