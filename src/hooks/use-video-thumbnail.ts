import { useState, useEffect } from 'react';
import * as VideoThumbnails from 'expo-video-thumbnails';

/**
 * Module-level cache of generated thumbnails, keyed by video URI.
 * Toggling story view modes remounts every node; without this cache each
 * remount re-runs the native thumbnail generation.
 */
const thumbnailCache = new Map<string, string>();

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
    if (!videoUri) return;

    let cancelled = false;

    const generate = async () => {
      try {
        // Strip file:// prefix if present — expo-video-thumbnails works with filesystem paths
        const cleanUri = videoUri.startsWith('file://')
          ? videoUri
          : `file://${videoUri}`;

        const { uri } = await VideoThumbnails.getThumbnailAsync(cleanUri, {
          time: 500, // 500ms into the video for a meaningful frame
          quality: 0.7,
        });

        thumbnailCache.set(videoUri, uri);
        if (!cancelled) {
          setGenerated({ source: videoUri, uri });
        }
      } catch (error) {
        console.warn('Video thumbnail generation failed:', error);
      }
    };

    generate();

    return () => {
      cancelled = true;
    };
  }, [videoUri]);

  const cached = videoUri ? thumbnailCache.get(videoUri) : undefined;
  if (cached) return cached;
  if (generated && generated.source === videoUri) return generated.uri;
  return null;
}
