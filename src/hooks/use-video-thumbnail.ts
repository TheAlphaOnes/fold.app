import { useState, useEffect } from 'react';
import * as VideoThumbnails from 'expo-video-thumbnails';

/**
 * Module-level cache of generated thumbnails, keyed by video URI.
 * Toggling story view modes remounts every node; without this cache each
 * remount re-runs the native thumbnail generation. Requests already in
 * flight are shared too, so two views asking at once decode one frame.
 */
const thumbnailCache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

function thumbnailFor(videoUri: string): Promise<string> {
  const inFlight = pending.get(videoUri);
  if (inFlight) return inFlight;
  // expo-video-thumbnails expects a file:// URI.
  const fileUri = videoUri.startsWith('file://') ? videoUri : `file://${videoUri}`;
  const request = VideoThumbnails.getThumbnailAsync(fileUri, {
    time: 500, // 500ms into the video for a meaningful frame
    quality: 0.7,
  })
    .then(({ uri }) => {
      thumbnailCache.set(videoUri, uri);
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
