/**
 * ShareIntakeHost — the app's single receiver for shares from other apps
 * (Photos, Chrome, Files), mounted once in the root layout so it is alive
 * whatever route the share's deep link lands on.
 *
 * The iOS share extension opens the app at `fold://dataUrl=…#media`, which
 * is a handoff, not a page: no route matches it (the catch-all route walks
 * the app home), so the files are received here — always mounted, on both
 * platforms and from any screen.
 */

import { useEffect } from 'react';
import { Alert } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import { useShareIntent } from 'expo-share-intent';

import type { MediaKind } from '@/constants/media';
import { setPendingCameraMedia, type PendingMedia } from '@/utils/pending-camera-media';
import { alertElementCap, alertFileTooLarge, copyWithinFileSize, sliceToElementCap } from '@/utils/media-attach';
import { navigate } from '@/utils/navigation';

export function ShareIntakeHost() {
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntent();

  // Handle incoming shared media (e.g. from Photos app, Chrome, Files, etc.)
  useEffect(() => {
    if (error) {
      console.error('Share Intent Error:', error);
      return;
    }

    if (!hasShareIntent) return;

    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (isExpoGo) {
      Alert.alert(
        'Expo Go Limitation',
        'Receiving shared media from other apps requires a development build. It works seamlessly in your final built app.',
        [{ text: 'OK', onPress: () => resetShareIntent() }]
      );
      return;
    }

    // Handle shared files (images, videos, audio, docs)
    if (shareIntent.files && shareIntent.files.length > 0) {
      // Every shared file becomes a sticker on one new memory, up to the
      // card's element cap; files over the size limit are skipped and
      // reported together.
      const { accepted: files, capped } = sliceToElementCap(0, shareIntent.files);
      const oversized: Record<MediaKind, number> = { image: 0, video: 0, audio: 0 };

      Promise.all(
        files.map(async (file, i): Promise<PendingMedia | null> => {
          const mime = file.mimeType || '';
          const kind: MediaKind =
            mime.startsWith('video/') || file.path?.endsWith('.mp4') || file.path?.endsWith('.mov')
              ? 'video'
              : mime.startsWith('audio/')
                ? 'audio'
                : 'image';
          const ext = kind === 'video' ? 'mp4' : kind === 'audio' ? 'm4a' : 'jpg';
          const dest = `${FileSystem.documentDirectory}shared_${Date.now()}_${i}.${ext}`;
          const copied = await copyWithinFileSize({ from: file.path, to: dest, kind });
          if (!copied) {
            oversized[kind] += 1;
            return null;
          }
          return { uri: dest, type: kind, width: file.width ?? undefined, height: file.height ?? undefined };
        }),
      )
        .then((results) => {
          const media = results.filter((m): m is PendingMedia => m !== null);
          resetShareIntent();
          if (capped) alertElementCap();
          for (const kind of ['image', 'video', 'audio'] as MediaKind[]) {
            if (oversized[kind] > 0) alertFileTooLarge(kind, oversized[kind]);
          }
          if (media.length === 0) return;
          setPendingCameraMedia(media);
          navigate.push('/compose');
        })
        .catch((err) => {
          console.error('Failed to copy shared files', err);
          resetShareIntent();
        });
      return;
    }

    // Handle shared text / URL — open compose with the text pre-filled
    if (shareIntent.text || shareIntent.webUrl) {
      const sharedText = shareIntent.webUrl || shareIntent.text || '';
      resetShareIntent();
      navigate.push({ pathname: '/compose', params: { sharedText } });
    }
    // resetShareIntent is left out on purpose: its identity changes every
    // render, so including it would re-run this effect while a share is
    // still being copied and process the files twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShareIntent, shareIntent, error]);

  return null;
}
