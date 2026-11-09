/** A gallery page with one video: plays (looping) while its page is showing; hold to pause. */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

import { useAudioFocus } from '@/hooks/use-audio-focus';
import type { MediaElement } from '@/types/journal';

interface VideoSlideProps {
  media: MediaElement;
  width: number;
  height: number;
  active: boolean;
}

export function VideoSlide({ media, width, height, active }: VideoSlideProps) {
  const player = useVideoPlayer(media.uri, (p) => {
    p.loop = true;
  });
  const claimAudio = useAudioFocus(() => player.pause());

  useEffect(() => {
    if (active) {
      claimAudio();
      player.play();
    } else {
      player.pause();
    }
  }, [active, player, claimAudio]);

  return (
    <Pressable
      style={[styles.slide, { width, height }]}
      onPressIn={() => {
        if (active) player.pause();
      }}
      onPressOut={() => {
        if (!active) return;
        claimAudio();
        player.play();
      }}
      accessibilityLabel="Video. Hold to pause."
    >
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slide: { justifyContent: 'center', alignItems: 'center' },
});
