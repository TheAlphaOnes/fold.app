/**
 * Getting media into a memory: gallery (multi-select), camera photo/video,
 * GIFs and songs. Each call copies the file into the app's documents (within
 * the size caps) and resolves the new MediaElements; the composer decides
 * where they go on the canvas.
 *
 * Moved out of the old compose screen unchanged in behaviour.
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

import { MAX_MEDIA_ELEMENTS, type MediaKind } from '@/constants/media';
import type { MusicTrack } from '@/hooks/use-music-store';
import { haptic } from '@/services/haptics';
import { awaitCapture } from '@/utils/capture-result';
import { navigate } from '@/utils/navigation';
import type { MediaElement } from '@/types/journal';
import {
  alertElementCap,
  alertFileTooLarge,
  copyWithinFileSize,
  downloadWithinFileSize,
  getHighResArtwork,
  sliceToElementCap,
  verifyFileSize,
} from '@/utils/media-attach';

const rid = () => Math.random().toString(36).substring(2, 9);

function extOf(uri: string, fallback: string): string {
  const match = uri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
  return match ? match[1].toLowerCase() : fallback;
}

function element(partial: Omit<MediaElement, 'id' | 'x_pos' | 'y_pos'>): MediaElement {
  // x/y are the legacy pixel positions; canvases place media by layout instead.
  return { id: rid(), x_pos: 0, y_pos: 0, ...partial };
}

export function useComposeMedia(count: number) {
  const roomLeft = MAX_MEDIA_ELEMENTS - count;

  /**
   * Picks photos/videos, within the memory's media cap. `replacing` picks
   * one to swap in for a photo already there: it frees that photo's slot,
   * so a full memory can still change a photo.
   */
  const pickFromGallery = useCallback(async ({ replacing = false }: { replacing?: boolean } = {}): Promise<MediaElement[]> => {
    const counted = replacing ? count - 1 : count;
    if (MAX_MEDIA_ELEMENTS - counted <= 0) {
      alertElementCap();
      return [];
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: !replacing });
    if (result.canceled) return [];
    const { accepted, capped } = sliceToElementCap(counted, result.assets);
    if (capped) alertElementCap();

    const oversized: Record<MediaKind, number> = { image: 0, video: 0, audio: 0 };
    const added = await Promise.all(
      accepted.map(async (asset) => {
        const kind: MediaKind = asset.type === 'video' ? 'video' : 'image';
        const dest = `${FileSystem.documentDirectory}picked_${Date.now()}_${rid()}.${extOf(asset.uri, kind === 'video' ? 'mp4' : 'jpg')}`;
        const ok = await copyWithinFileSize({ from: asset.uri, to: dest, kind, knownSizeBytes: asset.fileSize });
        if (!ok) {
          oversized[kind] += 1;
          return null;
        }
        return element({ uri: dest, type: kind, width: asset.width, height: asset.height });
      }),
    );
    for (const kind of ['image', 'video'] as MediaKind[]) if (oversized[kind] > 0) alertFileTooLarge(kind, oversized[kind]);
    return added.filter((m): m is MediaElement => m !== null);
  }, [count]);

  /**
   * Opens the app's camera (/capture) in photo or video mode; resolves with
   * whichever was taken, or nothing if it was closed.
   */
  const captureWithCamera = useCallback(async (): Promise<MediaElement[]> => {
    if (roomLeft <= 0) {
      alertElementCap();
      return [];
    }
    const shot = awaitCapture();
    navigate.push('/capture');
    const taken = await shot;
    if (!taken) return [];
    // Removes the file itself when it's over the cap.
    if (!(await verifyFileSize(taken.type, taken.uri))) {
      alertFileTooLarge(taken.type);
      return [];
    }
    return [element({ uri: taken.uri, type: taken.type, width: taken.width, height: taken.height })];
  }, [roomLeft]);

  const downloadGif = useCallback(
    async (gifUrl: string): Promise<MediaElement | null> => {
      if (roomLeft <= 0) {
        alertElementCap();
        return null;
      }
      const dest = `${FileSystem.documentDirectory}klipy_${Date.now()}_${rid()}.${extOf(gifUrl, 'gif')}`;
      try {
        const downloaded = await downloadWithinFileSize({ url: gifUrl, to: dest, kind: 'image' });
        if (!downloaded) {
          alertFileTooLarge('image');
          return null;
        }
        return element({ uri: downloaded, type: 'image', isGif: true, width: 300, height: 300 });
      } catch (error) {
        console.error('Failed to download GIF', error);
        Alert.alert("COULDN'T ADD GIF", 'Check your connection and try again.');
        return null;
      }
    },
    [roomLeft],
  );

  /**
   * A song is attached at once with its remote preview and artwork; `local`
   * resolves to the downloaded copies (or null if the download failed).
   */
  const songFrom = useCallback((track: MusicTrack) => {
    const artwork = getHighResArtwork(track.artworkUrl100) || track.artworkUrl100;
    const media = element({
      uri: track.previewUrl,
      type: 'audio',
      metadata: { title: track.trackName, artist: track.artistName, artwork },
    });
    haptic.success();
    const stamp = Date.now();
    const ext = track.previewUrl.split('?')[0].split('.').pop() || 'm4a';
    const local = Promise.all([
      downloadWithinFileSize({ url: track.previewUrl, to: `${FileSystem.documentDirectory}music_${track.trackId}_${stamp}.${ext}`, kind: 'audio' }),
      downloadWithinFileSize({ url: artwork, to: `${FileSystem.documentDirectory}music_artwork_${track.trackId}_${stamp}.jpg`, kind: 'image' }).catch(() => null),
    ])
      .then(([audio, art]) => (audio ? { uri: audio, artwork: art ?? artwork } : null))
      .catch((error) => {
        console.error('Failed to download song', error);
        return null;
      });
    return { media, local };
  }, []);

  return { roomLeft, pickFromGallery, captureWithCamera, downloadGif, songFrom };
}
