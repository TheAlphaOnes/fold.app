import { useState, useEffect } from 'react';
import * as VideoThumbnails from 'expo-video-thumbnails';

/**
 * Generates a thumbnail URI from a video file path.
 * Returns null while loading or on failure.
 */
export function useVideoThumbnail(videoUri: string | undefined): string | null {
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);

  useEffect(() => {
    if (!videoUri) {
      setThumbnailUri(null);
      return;
    }

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

        if (!cancelled) {
          setThumbnailUri(uri);
        }
      } catch (error) {
        console.warn('Video thumbnail generation failed:', error);
        if (!cancelled) {
          setThumbnailUri(null);
        }
      }
    };

    generate();

    return () => {
      cancelled = true;
    };
  }, [videoUri]);

  return thumbnailUri;
}
