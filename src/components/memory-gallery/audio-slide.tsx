/**
 * A gallery page with a song or voice note: a song shows its album cover
 * (breathing while it plays), a voice note a spinning record; drag around the record to scrub (20° = 1 second), and the
 * title, artist and time sit underneath.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';

import { VinylRecord } from '@/components/vinyl-record';
import { AlbumCover } from '@/components/music/album-cover';
import { useAudioFocus } from '@/hooks/use-audio-focus';
import { useTheme } from '@/hooks/use-theme';
import type { MediaElement } from '@/types/journal';
import { formatMillis } from '@/utils/format-date';
import { getHighResArtwork } from '@/utils/media-attach';

const RECORD = 320;
const COVER = 280;
const DEGREES_PER_SECOND = 20;

interface AudioSlideProps {
  media: MediaElement;
  width: number;
  height: number;
  active: boolean;
}

export function AudioSlide({ media, width, height, active }: AudioSlideProps) {
  const theme = useTheme();
  const player = useAudioPlayer(media.uri);
  const status = useAudioPlayerStatus(player);
  const [scrubbing, setScrubbing] = useState(false);
  const claimAudio = useAudioFocus(() => player.pause());

  // Scrub state, on the UI thread.
  const startSeconds = useSharedValue(0);
  const rotation = useSharedValue(0);
  const startRotation = useSharedValue(0);
  const lastAngle = useSharedValue(0);
  const turned = useSharedValue(0);

  const seekTo = (seconds: number) => {
    try {
      player.seekTo(seconds);
    } catch {
      // Released mid-scrub; the next page owns playback now.
    }
  };

  // Loops: back to the start whenever it finishes while its page is showing.
  useEffect(() => {
    if (!status.didJustFinish || !active) return;
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // Released between finishing and replaying; nothing to loop.
    }
  }, [status.didJustFinish, active, player]);

  useEffect(() => {
    if (!status.isLoaded) return;
    try {
      if (active && !scrubbing) {
        claimAudio();
        player.play();
      } else {
        player.pause();
      }
    } catch {
      // The player was released mid-call (page unmounting); nothing to undo.
    }
  }, [active, scrubbing, status.isLoaded, player, claimAudio]);

  const duration = status.duration;
  const artwork = getHighResArtwork(media.metadata?.artwork);
  const scrub = Gesture.Pan()
    .onStart((e) => {
      runOnJS(setScrubbing)(true);
      startSeconds.set(status.currentTime);
      startRotation.set(rotation.get());
      lastAngle.set(Math.atan2(e.y - RECORD / 2, e.x - RECORD / 2));
      turned.set(0);
    })
    .onUpdate((e) => {
      const angle = Math.atan2(e.y - RECORD / 2, e.x - RECORD / 2);
      let diff = angle - lastAngle.get();
      // Crossing ±π is a small step, not a full turn back.
      if (diff > Math.PI) diff -= 2 * Math.PI;
      if (diff < -Math.PI) diff += 2 * Math.PI;
      turned.set(turned.get() + diff);
      lastAngle.set(angle);
      const degrees = (turned.get() * 180) / Math.PI;
      rotation.set(startRotation.get() + degrees);
      const target = Math.max(0, Math.min(startSeconds.get() + degrees / DEGREES_PER_SECOND, duration));
      runOnJS(seekTo)(target);
    })
    .onEnd(() => {
      runOnJS(setScrubbing)(false);
    });

  return (
    <View style={[styles.slide, { width, height }]}>
      <GestureDetector gesture={scrub}>
        <View>
          {/* A song shows its album cover; a voice note keeps the record. */}
          {artwork ? (
            <AlbumCover uri={artwork} size={COVER} playing={active && !scrubbing} scrubOffset={rotation} />
          ) : (
            <VinylRecord size={RECORD} isRecording={false} isPlaying={active && !scrubbing} scrubOffset={rotation} />
          )}
        </View>
      </GestureDetector>
      {media.metadata ? (
        <View style={styles.meta}>
          <Text style={[styles.title, { color: theme.text }]}>{media.metadata.title}</Text>
          <Text style={[styles.artist, { color: theme.textMuted }]}>{media.metadata.artist}</Text>
        </View>
      ) : null}
      <Text style={[styles.time, { color: theme.textMuted, marginTop: media.metadata ? 32 : 24 }]}>
        {formatMillis(status.currentTime * 1000)} / {formatMillis(status.duration * 1000)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { justifyContent: 'center', alignItems: 'center' },
  meta: { alignItems: 'center', marginTop: 40, paddingHorizontal: 32 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  artist: { fontSize: 16, fontWeight: '500', marginTop: 6, textAlign: 'center' },
  time: { fontSize: 14, fontWeight: '500', letterSpacing: 1 },
});
