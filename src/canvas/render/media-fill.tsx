/**
 * MediaFill — a photo or video filling a frame (the Story background or a
 * grid cell), framed by its crop: scale ≥ 1 zooms in, x/y pan as fractions
 * of the frame. Videos show their thumbnail unless `playing`, then play
 * muted-or-not in a loop.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';

import type { Crop } from '@/canvas/types';
import { useVideoThumbnail } from '@/hooks/use-video-thumbnail';
import type { MediaElement } from '@/types/journal';

interface MediaFillProps {
  media: MediaElement;
  crop: Crop;
  width: number;
  height: number;
  mirrored?: boolean;
  /** Videos play (looping) instead of showing their thumbnail. */
  playing?: boolean;
  muted?: boolean;
  /** A new photo dissolves in over the old one instead of popping (off for exports, so captures are never mid-fade). */
  fade?: boolean;
}

/** The dissolve used wherever a photo is swapped for another. */
export const PHOTO_DISSOLVE = { duration: 320, effect: 'cross-dissolve' } as const;

export function MediaFill({ media, crop, width, height, mirrored, playing = false, muted = true, fade = false }: MediaFillProps) {
  const transform = [
    { translateX: crop.x * width },
    { translateY: crop.y * height },
    { scale: crop.scale },
    ...(mirrored ? [{ scaleX: -1 }] : []),
  ];

  return (
    <View style={[styles.frame, { width, height }]} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { transform }]}>
        {media.type === 'video' ? (
          playing ? (
            <PlayingVideo uri={media.uri} muted={muted} />
          ) : (
            <VideoThumb uri={media.uri} />
          )
        ) : (
          <Image source={{ uri: media.uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={fade ? PHOTO_DISSOLVE : 0} />
        )}
      </View>
    </View>
  );
}

function VideoThumb({ uri }: { uri: string }) {
  const thumb = useVideoThumbnail(uri);
  if (!thumb) return <View style={[StyleSheet.absoluteFill, styles.placeholder]} />;
  return <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} />;
}

function PlayingVideo({ uri, muted }: { uri: string; muted: boolean }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = muted;
    p.play();
  });
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden' },
  placeholder: { backgroundColor: '#1A1A1A' },
});
