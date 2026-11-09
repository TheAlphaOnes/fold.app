import { useState, useEffect } from 'react';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system/legacy';

import { readCache, writeCache } from '@/db/cache-repository';

/**
 * Module-level cache of generated thumbnails, keyed by video URI.
 * Toggling story view modes remounts every node; without this cache each
 * remount re-runs the native thumbnail generation. Requests already in
 * flight are shared too, so two views asking at once decode one frame.
 */
const thumbnailCache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

/**
 * Thumbnails also survive relaunches: each is copied into the app's own
 * folder (the system cache folder can be cleared) and the video → thumbnail
 * index is kept in app_cache, loaded once at startup.
 */
const INDEX_KEY = 'video-thumbs:v1';
const THUMB_DIR = `${FileSystem.documentDirectory}thumbs/`;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function saveIndexSoon(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    writeCache(INDEX_KEY, Object.fromEntries(thumbnailCache)).catch((error) =>
      console.warn('Failed to save thumbnail index', error),
    );
  }, 800);
}

/** Loads the saved thumbnails, skipping any whose file is gone. Call once at startup. */
export async function loadThumbnailIndex(): Promise<void> {
  const index = await readCache<Record<string, string>>(INDEX_KEY);
  if (!index) return;
  const entries = await Promise.all(
    Object.entries(index).map(async ([video, thumb]) => ((await FileSystem.getInfoAsync(thumb)).exists ? [video, thumb] : null)),
  );
  for (const entry of entries) if (entry && !thumbnailCache.has(entry[0])) thumbnailCache.set(entry[0], entry[1]);
}

/** Moves a freshly generated thumbnail into the app's folder; falls back to where it is. */
async function keep(tempUri: string): Promise<string> {
  try {
    await FileSystem.makeDirectoryAsync(THUMB_DIR, { intermediates: true });
    const dest = `${THUMB_DIR}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    await FileSystem.moveAsync({ from: tempUri, to: dest });
    return dest;
  } catch {
    return tempUri;
  }
}

function thumbnailFor(videoUri: string): Promise<string> {
  const inFlight = pending.get(videoUri);
  if (inFlight) return inFlight;
  // expo-video-thumbnails expects a file:// URI.
  const fileUri = videoUri.startsWith('file://') ? videoUri : `file://${videoUri}`;
  const request = VideoThumbnails.getThumbnailAsync(fileUri, {
    time: 500, // 500ms into the video for a meaningful frame
    quality: 0.7,
  })
    .then(({ uri }) => keep(uri))
    .then((uri) => {
      thumbnailCache.set(videoUri, uri);
      saveIndexSoon();
      return uri;
    })
    .finally(() => pending.delete(videoUri));
  pending.set(videoUri, request);
  return request;
}

/**
 * Generates a thumbnail URI from a video file path.
 * Returns null while loading or on failure.
 */
export function useVideoThumbnail(videoUri: string | undefined): string | null {
  // State is only written from the async generation callback; the current
  // value is derived against videoUri so prop changes never need a
  // synchronous setState inside the effect body.
  const [generated, setGenerated] = useState<{ source: string; uri: string } | null>(null);

  useEffect(() => {
    // A cached thumbnail is read below; generating it again decoded a video
    // frame every time a view (the feed backdrop, above all) came back to it.
    if (!videoUri || thumbnailCache.has(videoUri)) return;

    let cancelled = false;
    thumbnailFor(videoUri)
      .then((uri) => {
        if (!cancelled) setGenerated({ source: videoUri, uri });
      })
      .catch((error) => console.warn('Video thumbnail generation failed:', error));

    return () => {
      cancelled = true;
    };
  }, [videoUri]);

  const cached = videoUri ? thumbnailCache.get(videoUri) : undefined;
  if (cached) return cached;
  if (generated && generated.source === videoUri) return generated.uri;
  return null;
}
